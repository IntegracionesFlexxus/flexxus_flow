import { injectable, inject } from 'inversify';
import { TYPES } from '../../../container/types';
import { KpiRepository, KpiDefinition, KpiSnapshot } from '../repositories/KpiRepository';
import { Pool } from 'pg';
import * as cron from 'node-cron';

@injectable()
export class KpiService {
  private scheduledTasks: Map<number, cron.ScheduledTask> = new Map();

  constructor(
    @inject(TYPES.CRMKpiRepository) private kpiRepository: KpiRepository,
    @inject(TYPES.CrmConnection) private pool: Pool
  ) {}

  async createKpi(kpi: KpiDefinition): Promise<KpiDefinition> {
    // Validate KPI configuration
    this.validateKpiConfig(kpi);

    // Create the KPI definition
    const createdKpi = await this.kpiRepository.create(kpi);

    // Schedule automatic calculation if needed
    if (createdKpi.refresh_frequency && createdKpi.is_active) {
      this.scheduleKpiCalculation(createdKpi);
    }

    return createdKpi;
  }

  async getKpi(kpiId: number): Promise<KpiDefinition | null> {
    return await this.kpiRepository.findById(kpiId);
  }

  async getCompanyKpis(companyId: number): Promise<KpiDefinition[]> {
    return await this.kpiRepository.findByCompany(companyId);
  }

  async getKpisByCategory(companyId: number, category: string): Promise<KpiDefinition[]> {
    return await this.kpiRepository.findByCategory(companyId, category);
  }

  async updateKpi(kpiId: number, updates: Partial<KpiDefinition>): Promise<KpiDefinition | null> {
    // Validate updates if calculation config is being changed
    if (updates.formula || updates.calculation_type) {
      this.validateKpiConfig(updates as KpiDefinition);
    }

    const updatedKpi = await this.kpiRepository.update(kpiId, updates);

    if (updatedKpi) {
      // Reschedule if refresh frequency changed
      if (updates.refresh_frequency || updates.is_active !== undefined) {
        this.cancelKpiSchedule(kpiId);
        if (updatedKpi.refresh_frequency && updatedKpi.is_active) {
          this.scheduleKpiCalculation(updatedKpi);
        }
      }
    }

    return updatedKpi;
  }

  async deleteKpi(kpiId: number): Promise<boolean> {
    // Cancel any scheduled tasks
    this.cancelKpiSchedule(kpiId);

    return await this.kpiRepository.delete(kpiId);
  }

  async calculateKpiValue(kpiId: number): Promise<KpiSnapshot> {
    const kpi = await this.kpiRepository.findById(kpiId);
    if (!kpi) {
      throw new Error('KPI not found');
    }

    // Calculate the current value
    const value = await this.kpiRepository.calculateKpiValue(kpiId);

    // Get the previous snapshot for comparison
    const previousSnapshot = await this.kpiRepository.getLatestSnapshot(kpiId);

    // Evaluate status based on thresholds
    const status = await this.kpiRepository.evaluateKpiStatus(value, kpi);

    // Calculate change percentage
    let changePercentage = 0;
    if (previousSnapshot && previousSnapshot.value) {
      changePercentage = ((value - previousSnapshot.value) / previousSnapshot.value) * 100;
    }

    // Create new snapshot
    const snapshot: KpiSnapshot = {
      kpi_id: kpiId,
      company_id: kpi.company_id,
      snapshot_date: new Date(),
      value,
      target_value: kpi.target_value,
      previous_value: previousSnapshot?.value,
      change_percentage: changePercentage,
      status,
      calculation_details: {
        calculation_type: kpi.calculation_type,
        formula: kpi.formula,
        timestamp: new Date()
      }
    };

    return await this.kpiRepository.createSnapshot(snapshot);
  }

  async getKpiSnapshots(
    kpiId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<KpiSnapshot[]> {
    return await this.kpiRepository.getSnapshots(kpiId, startDate, endDate);
  }

  async getLatestSnapshot(kpiId: number): Promise<KpiSnapshot | null> {
    return await this.kpiRepository.getLatestSnapshot(kpiId);
  }

  async getCompanyKpiDashboard(companyId: number, date?: Date): Promise<any[]> {
    const kpis = await this.kpiRepository.getCompanySnapshots(companyId, date);

    // Group by category and calculate aggregates
    const dashboard = kpis.reduce((acc, kpi) => {
      const category = kpi.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = {
          category,
          kpis: [],
          summary: {
            total: 0,
            excellent: 0,
            good: 0,
            warning: 0,
            critical: 0
          }
        };
      }

      acc[category].kpis.push({
        id: kpi.id,
        name: kpi.name,
        value: kpi.value,
        target: kpi.target_value,
        status: kpi.status,
        change: kpi.change_percentage,
        unit: kpi.unit
      });

      acc[category].summary.total++;
      if (kpi.status) {
        acc[category].summary[kpi.status]++;
      }

      return acc;
    }, {} as any);

    return Object.values(dashboard);
  }

  async calculateAllCompanyKpis(companyId: number): Promise<void> {
    const kpis = await this.kpiRepository.findByCompany(companyId);

    // Calculate all KPIs in parallel
    await Promise.all(
      kpis.map(kpi => this.calculateKpiValue(kpi.id!).catch(error => {
        console.error(`Failed to calculate KPI ${kpi.id}: ${error.message}`);
      }))
    );
  }

  async getKpiTrends(
    kpiId: number,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    days: number = 30
  ): Promise<any[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const snapshots = await this.kpiRepository.getSnapshots(kpiId, startDate, endDate);

    // Group snapshots by period
    const grouped = this.groupSnapshotsByPeriod(snapshots, period);

    return Object.entries(grouped).map(([period, data]) => ({
      period,
      value: data.value,
      target: data.target,
      status: data.status,
      trend: this.calculateTrend(data.values)
    }));
  }

  async compareKpis(
    kpiIds: number[],
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const comparison: any = {};

    for (const kpiId of kpiIds) {
      const kpi = await this.kpiRepository.findById(kpiId);
      if (!kpi) continue;

      const snapshots = await this.kpiRepository.getSnapshots(kpiId, startDate, endDate);

      comparison[kpiId] = {
        kpi,
        snapshots,
        summary: {
          average: this.calculateAverage(snapshots.map(s => s.value)),
          min: Math.min(...snapshots.map(s => s.value)),
          max: Math.max(...snapshots.map(s => s.value)),
          latest: snapshots[0]?.value,
          trend: this.calculateTrend(snapshots.map(s => s.value))
        }
      };
    }

    return comparison;
  }

  async createKpiAlert(
    kpiId: number,
    alertConfig: {
      threshold_type: 'above' | 'below';
      threshold_value: number;
      notification_channels: string[];
      recipients: any[];
    }
  ): Promise<any> {
    // This would integrate with the alert system
    // For now, we'll just store the alert configuration with the KPI
    const kpi = await this.kpiRepository.findById(kpiId);
    if (!kpi) {
      throw new Error('KPI not found');
    }

    // Create alert rule in alert_rules table
    const query = `
      INSERT INTO alert_rules (
        company_id, name, kpi_id, condition_type, condition_config,
        notification_channels, recipients
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      kpi.company_id,
      `Alert for ${kpi.name}`,
      kpiId,
      'threshold',
      JSON.stringify({
        threshold_type: alertConfig.threshold_type,
        threshold_value: alertConfig.threshold_value
      }),
      alertConfig.notification_channels,
      JSON.stringify(alertConfig.recipients)
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  private validateKpiConfig(kpi: KpiDefinition): void {
    if (!kpi.name || kpi.name.trim() === '') {
      throw new Error('KPI name is required');
    }

    if (!kpi.calculation_type) {
      throw new Error('Calculation type is required');
    }

    if (kpi.calculation_type === 'custom' && !kpi.formula) {
      throw new Error('Formula is required for custom KPIs');
    }

    if (kpi.target_value && kpi.target_value < 0) {
      throw new Error('Target value must be positive');
    }

    if (kpi.threshold_warning && kpi.threshold_critical) {
      if (kpi.is_higher_better) {
        if (kpi.threshold_warning < kpi.threshold_critical) {
          throw new Error('Warning threshold must be higher than critical for "higher is better" KPIs');
        }
      } else {
        if (kpi.threshold_warning > kpi.threshold_critical) {
          throw new Error('Warning threshold must be lower than critical for "lower is better" KPIs');
        }
      }
    }
  }

  private scheduleKpiCalculation(kpi: KpiDefinition): void {
    if (!kpi.id || !kpi.refresh_frequency) return;

    let cronSchedule: string;

    switch (kpi.refresh_frequency) {
      case 'hourly':
        cronSchedule = '0 * * * *';
        break;
      case 'daily':
        cronSchedule = '0 0 * * *';
        break;
      case 'weekly':
        cronSchedule = '0 0 * * 0';
        break;
      case 'monthly':
        cronSchedule = '0 0 1 * *';
        break;
      default:
        return;
    }

    const task = cron.schedule(cronSchedule, async () => {
      try {
        await this.calculateKpiValue(kpi.id!);
      } catch (error) {
        console.error(`Failed to calculate scheduled KPI ${kpi.id}: ${(error as Error).message}`);
      }
    });

    this.scheduledTasks.set(kpi.id, task);
    task.start();
  }

  private cancelKpiSchedule(kpiId: number): void {
    const task = this.scheduledTasks.get(kpiId);
    if (task) {
      task.stop();
      this.scheduledTasks.delete(kpiId);
    }
  }

  private groupSnapshotsByPeriod(
    snapshots: KpiSnapshot[],
    period: 'daily' | 'weekly' | 'monthly'
  ): any {
    const grouped: any = {};

    snapshots.forEach(snapshot => {
      let periodKey: string;
      const date = new Date(snapshot.snapshot_date);

      switch (period) {
        case 'daily':
          periodKey = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const week = this.getWeekNumber(date);
          periodKey = `${date.getFullYear()}-W${week}`;
          break;
        case 'monthly':
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      if (!grouped[periodKey]) {
        grouped[periodKey] = {
          values: [],
          value: 0,
          target: snapshot.target_value,
          status: snapshot.status
        };
      }

      grouped[periodKey].values.push(snapshot.value);
      grouped[periodKey].value = this.calculateAverage(grouped[periodKey].values);
    });

    return grouped;
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateTrend(values: number[]): 'up' | 'down' | 'stable' {
    if (values.length < 2) return 'stable';

    const recent = values.slice(0, Math.ceil(values.length / 2));
    const older = values.slice(Math.ceil(values.length / 2));

    const recentAvg = this.calculateAverage(recent);
    const olderAvg = this.calculateAverage(older);

    const diff = recentAvg - olderAvg;
    const threshold = olderAvg * 0.05; // 5% threshold for stability

    if (Math.abs(diff) < threshold) return 'stable';
    return diff > 0 ? 'up' : 'down';
  }

  async cleanup(): Promise<void> {
    // Stop all scheduled tasks
    this.scheduledTasks.forEach(task => task.stop());
    this.scheduledTasks.clear();
  }
}