/**
 * KPI Service - Sprint 08
 * Handles KPI tracking, calculation, and goal management
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import {
  IKPI,
  IKPIGoal,
  IKPIHistory,
  IKPICalculation,
  IKPIAlert
} from './interfaces/IKPI';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { EventEmitter } from 'events';
import { RealTimeAnalytics } from '../analytics/RealTimeAnalytics';

@injectable()
export class KPIService extends EventEmitter {
  private logger: any;
  private kpiCache: Map<string, IKPI> = new Map();
  private calculationInterval: number = 300000; // 5 minutes
  private calculationTimer?: NodeJS.Timer;
  private alertThresholds: Map<string, number> = new Map();

  constructor(
    @inject(TYPES.AnalyticsConnection) private pool: Pool,
    @inject(TYPES.RealTimeAnalytics) private analytics: RealTimeAnalytics
  ) {
    super();
    this.logger = LoggerFactory.create({ file: __filename });
    this.startCalculationTimer();
    this.loadKPIs();
  }

  /**
   * Create a new KPI
   */
  async createKPI(companyId: string, kpi: Partial<IKPI>): Promise<IKPI> {
    try {
      const query = `
        INSERT INTO kpis (
          company_id, name, description, type, formula,
          target_value, current_value, unit, frequency,
          category, data_source, is_active, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        ) RETURNING *;
      `;

      const result = await this.pool.query(query, [
        companyId,
        kpi.name,
        kpi.description,
        kpi.type || 'calculated',
        kpi.formula || '',
        kpi.target_value || 0,
        kpi.current_value || 0,
        kpi.unit || 'number',
        kpi.frequency || 'daily',
        kpi.category || 'operational',
        kpi.data_source || 'analytics',
        kpi.is_active !== false,
        JSON.stringify(kpi.metadata || {})
      ]);

      const newKPI = this.mapRowToKPI(result.rows[0]);
      this.kpiCache.set(newKPI.id, newKPI);

      this.logger.info('KPI created', { id: newKPI.id, name: newKPI.name });
      return newKPI;
    } catch (error: any) {
      this.logger.error('Failed to create KPI', error);
      throw error;
    }
  }

  /**
   * Get KPIs for a company
   */
  async getKPIs(
    companyId: string,
    category?: string,
    isActive: boolean = true
  ): Promise<IKPI[]> {
    try {
      let query = `
        SELECT * FROM kpis
        WHERE company_id = $1 AND is_active = $2
      `;
      const params: any[] = [companyId, isActive];

      if (category) {
        query += ' AND category = $3';
        params.push(category);
      }

      query += ' ORDER BY priority DESC, name ASC;';

      const result = await this.pool.query(query, params);
      return result.rows.map(row => this.mapRowToKPI(row));
    } catch (error: any) {
      this.logger.error('Failed to get KPIs', error);
      throw error;
    }
  }

  /**
   * Calculate KPI value
   */
  async calculate(kpiId: string): Promise<IKPICalculation> {
    try {
      const kpi = await this.getKPIById(kpiId);
      if (!kpi) throw new Error(`KPI ${kpiId} not found`);

      let value: number = 0;
      let breakdown: any = {};

      switch (kpi.type) {
        case 'metric':
          value = await this.calculateMetricKPI(kpi);
          break;
        case 'calculated':
          value = await this.calculateFormulaKPI(kpi);
          break;
        case 'aggregated':
          const result = await this.calculateAggregatedKPI(kpi);
          value = result.value;
          breakdown = result.breakdown;
          break;
        case 'composite':
          value = await this.calculateCompositeKPI(kpi);
          break;
        default:
          throw new Error(`Unknown KPI type: ${kpi.type}`);
      }

      // Update current value
      await this.updateKPIValue(kpiId, value);

      // Record history
      await this.recordHistory(kpiId, value, breakdown);

      // Check for alerts
      await this.checkAlerts(kpi, value);

      const calculation: IKPICalculation = {
        kpi_id: kpiId,
        value,
        timestamp: new Date(),
        breakdown,
        trend: await this.calculateTrend(kpiId),
        goal_progress: kpi.target_value ? (value / kpi.target_value) : 0
      };

      this.emit('kpi-calculated', calculation);
      return calculation;
    } catch (error: any) {
      this.logger.error('Failed to calculate KPI', error);
      throw error;
    }
  }

  /**
   * Set KPI goal
   */
  async setGoal(
    kpiId: string,
    goal: Partial<IKPIGoal>
  ): Promise<IKPIGoal> {
    try {
      const query = `
        UPDATE kpis SET
          target_value = $2,
          target_date = $3,
          metadata = metadata || $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *;
      `;

      const goalMetadata = {
        goal_description: goal.description,
        goal_strategy: goal.strategy,
        goal_milestones: goal.milestones || []
      };

      const result = await this.pool.query(query, [
        kpiId,
        goal.target_value,
        goal.target_date,
        JSON.stringify(goalMetadata)
      ]);

      const kpi = this.mapRowToKPI(result.rows[0]);
      this.kpiCache.set(kpiId, kpi);

      return {
        kpi_id: kpiId,
        target_value: goal.target_value!,
        target_date: goal.target_date!,
        current_value: kpi.current_value,
        progress_percentage: (kpi.current_value / goal.target_value!) * 100,
        is_achieved: kpi.current_value >= goal.target_value!,
        description: goal.description,
        strategy: goal.strategy,
        milestones: goal.milestones
      };
    } catch (error: any) {
      this.logger.error('Failed to set KPI goal', error);
      throw error;
    }
  }

  /**
   * Get KPI history
   */
  async getHistory(
    kpiId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<IKPIHistory[]> {
    try {
      let query = `
        SELECT * FROM kpi_history
        WHERE kpi_id = $1
      `;
      const params: any[] = [kpiId];

      if (startDate) {
        query += ` AND timestamp >= $${params.length + 1}`;
        params.push(startDate);
      }

      if (endDate) {
        query += ` AND timestamp <= $${params.length + 1}`;
        params.push(endDate);
      }

      query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1};`;
      params.push(limit);

      const result = await this.pool.query(query, params);

      return result.rows.map(row => ({
        id: row.id,
        kpi_id: row.kpi_id,
        value: parseFloat(row.value),
        timestamp: new Date(row.timestamp),
        breakdown: row.breakdown,
        metadata: row.metadata
      }));
    } catch (error: any) {
      this.logger.error('Failed to get KPI history', error);
      throw error;
    }
  }

  /**
   * Get KPI comparison
   */
  async compare(
    kpiIds: string[],
    period: 'day' | 'week' | 'month' | 'quarter' | 'year'
  ): Promise<any> {
    try {
      const comparisons = [];

      for (const kpiId of kpiIds) {
        const kpi = await this.getKPIById(kpiId);
        if (!kpi) continue;

        const history = await this.getHistory(
          kpiId,
          this.getPeriodStart(period),
          new Date()
        );

        comparisons.push({
          kpi_id: kpiId,
          name: kpi.name,
          current_value: kpi.current_value,
          target_value: kpi.target_value,
          unit: kpi.unit,
          history: history.map(h => ({
            timestamp: h.timestamp,
            value: h.value
          })),
          trend: await this.calculateTrend(kpiId),
          achievement_rate: kpi.target_value
            ? (kpi.current_value / kpi.target_value) * 100
            : 0
        });
      }

      return {
        period,
        comparisons,
        summary: this.generateComparisonSummary(comparisons)
      };
    } catch (error: any) {
      this.logger.error('Failed to compare KPIs', error);
      throw error;
    }
  }

  /**
   * Calculate metric-based KPI
   */
  private async calculateMetricKPI(kpi: IKPI): Promise<number> {
    const metrics = await this.analytics.aggregate(
      kpi.company_id,
      'day',
      this.getPeriodStart('day'),
      new Date()
    );

    const metricName = kpi.formula || kpi.name.toLowerCase().replace(/ /g, '_');
    return (metrics.metrics as any)[metricName] || 0;
  }

  /**
   * Calculate formula-based KPI
   */
  private async calculateFormulaKPI(kpi: IKPI): Promise<number> {
    // Parse and evaluate formula
    // This is a simplified implementation
    const formula = kpi.formula || '0';
    
    // Get variables from analytics
    const metrics = await this.analytics.aggregate(
      kpi.company_id,
      'day',
      this.getPeriodStart('day'),
      new Date()
    );

    // Replace variables in formula
    let evaluableFormula = formula;
    Object.keys(metrics.metrics).forEach(key => {
      const value = (metrics.metrics as any)[key];
      evaluableFormula = evaluableFormula.replace(
        new RegExp(`\\b${key}\\b`, 'g'),
        value.toString()
      );
    });

    // Safely evaluate formula
    try {
      return this.safeEval(evaluableFormula);
    } catch (error) {
      this.logger.error('Formula evaluation failed', { formula, error });
      return 0;
    }
  }

  /**
   * Calculate aggregated KPI
   */
  private async calculateAggregatedKPI(
    kpi: IKPI
  ): Promise<{ value: number; breakdown: any }> {
    const query = kpi.metadata?.query || `
      SELECT COUNT(*) as value FROM analytics_events
      WHERE company_id = $1 AND timestamp >= $2
    `;

    const result = await this.pool.query(query, [
      kpi.company_id,
      this.getPeriodStart(kpi.frequency as any)
    ]);

    return {
      value: parseFloat(result.rows[0]?.value || 0),
      breakdown: result.rows[0] || {}
    };
  }

  /**
   * Calculate composite KPI
   */
  private async calculateCompositeKPI(kpi: IKPI): Promise<number> {
    const componentKPIs = kpi.metadata?.components || [];
    const weights = kpi.metadata?.weights || {};
    let totalValue = 0;
    let totalWeight = 0;

    for (const componentId of componentKPIs) {
      const component = await this.getKPIById(componentId);
      if (component) {
        const weight = weights[componentId] || 1;
        totalValue += component.current_value * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? totalValue / totalWeight : 0;
  }

  /**
   * Update KPI value
   */
  private async updateKPIValue(kpiId: string, value: number): Promise<void> {
    const query = `
      UPDATE kpis SET
        current_value = $2,
        last_calculated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `;

    await this.pool.query(query, [kpiId, value]);

    // Update cache
    const kpi = this.kpiCache.get(kpiId);
    if (kpi) {
      kpi.current_value = value;
      kpi.last_calculated_at = new Date();
    }
  }

  /**
   * Record KPI history
   */
  private async recordHistory(
    kpiId: string,
    value: number,
    breakdown: any
  ): Promise<void> {
    const query = `
      INSERT INTO kpi_history (
        kpi_id, value, timestamp, breakdown, metadata
      ) VALUES ($1, $2, $3, $4, $5);
    `;

    await this.pool.query(query, [
      kpiId,
      value,
      new Date(),
      JSON.stringify(breakdown),
      JSON.stringify({ source: 'calculated' })
    ]);
  }

  /**
   * Check alerts
   */
  private async checkAlerts(kpi: IKPI, value: number): Promise<void> {
    const alerts: IKPIAlert[] = [];

    // Check target threshold
    if (kpi.target_value) {
      const achievement = (value / kpi.target_value) * 100;
      
      if (achievement < 50) {
        alerts.push({
          kpi_id: kpi.id,
          type: 'critical',
          message: `KPI ${kpi.name} is critically below target (${achievement.toFixed(1)}%)`,
          threshold: kpi.target_value,
          actual_value: value,
          timestamp: new Date()
        });
      } else if (achievement < 80) {
        alerts.push({
          kpi_id: kpi.id,
          type: 'warning',
          message: `KPI ${kpi.name} is below target (${achievement.toFixed(1)}%)`,
          threshold: kpi.target_value,
          actual_value: value,
          timestamp: new Date()
        });
      } else if (achievement >= 100) {
        alerts.push({
          kpi_id: kpi.id,
          type: 'success',
          message: `KPI ${kpi.name} has achieved its target!`,
          threshold: kpi.target_value,
          actual_value: value,
          timestamp: new Date()
        });
      }
    }

    // Check custom thresholds
    const customThreshold = this.alertThresholds.get(kpi.id);
    if (customThreshold && value < customThreshold) {
      alerts.push({
        kpi_id: kpi.id,
        type: 'warning',
        message: `KPI ${kpi.name} is below alert threshold`,
        threshold: customThreshold,
        actual_value: value,
        timestamp: new Date()
      });
    }

    // Emit alerts
    alerts.forEach(alert => {
      this.emit('kpi-alert', alert);
      this.logger.warn('KPI alert triggered', alert);
    });
  }

  /**
   * Calculate trend
   */
  private async calculateTrend(kpiId: string): Promise<string> {
    const history = await this.getHistory(
      kpiId,
      this.getPeriodStart('week'),
      new Date(),
      10
    );

    if (history.length < 2) return 'stable';

    const recent = history.slice(0, 5);
    const previous = history.slice(5);

    const recentAvg = recent.reduce((sum, h) => sum + h.value, 0) / recent.length;
    const previousAvg = previous.reduce((sum, h) => sum + h.value, 0) / previous.length || recentAvg;

    const change = ((recentAvg - previousAvg) / previousAvg) * 100;

    if (change > 5) return 'improving';
    if (change < -5) return 'declining';
    return 'stable';
  }

  /**
   * Get KPI by ID
   */
  private async getKPIById(kpiId: string): Promise<IKPI | null> {
    if (this.kpiCache.has(kpiId)) {
      return this.kpiCache.get(kpiId)!;
    }

    const query = 'SELECT * FROM kpis WHERE id = $1;';
    const result = await this.pool.query(query, [kpiId]);

    if (result.rows.length === 0) return null;

    const kpi = this.mapRowToKPI(result.rows[0]);
    this.kpiCache.set(kpiId, kpi);
    return kpi;
  }

  /**
   * Map database row to KPI
   */
  private mapRowToKPI(row: any): IKPI {
    return {
      id: row.id,
      company_id: row.company_id,
      name: row.name,
      description: row.description,
      type: row.type,
      formula: row.formula,
      target_value: parseFloat(row.target_value),
      current_value: parseFloat(row.current_value),
      unit: row.unit,
      frequency: row.frequency,
      category: row.category,
      data_source: row.data_source,
      is_active: row.is_active,
      priority: row.priority,
      target_date: row.target_date ? new Date(row.target_date) : undefined,
      last_calculated_at: row.last_calculated_at ? new Date(row.last_calculated_at) : undefined,
      metadata: row.metadata,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Get period start date
   */
  private getPeriodStart(period: 'day' | 'week' | 'month' | 'quarter' | 'year'): Date {
    const now = new Date();
    const start = new Date(now);

    switch (period) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
    }

    return start;
  }

  /**
   * Generate comparison summary
   */
  private generateComparisonSummary(comparisons: any[]): any {
    const totalKPIs = comparisons.length;
    const achievingTarget = comparisons.filter(c => c.achievement_rate >= 100).length;
    const improving = comparisons.filter(c => c.trend === 'improving').length;
    const declining = comparisons.filter(c => c.trend === 'declining').length;

    return {
      total_kpis: totalKPIs,
      achieving_target: achievingTarget,
      improving: improving,
      declining: declining,
      stable: totalKPIs - improving - declining,
      overall_achievement: comparisons.reduce((sum, c) => sum + c.achievement_rate, 0) / totalKPIs
    };
  }

  /**
   * Safe evaluate formula
   */
  private safeEval(formula: string): number {
    // Remove any potentially dangerous characters
    const safe = formula.replace(/[^0-9+\-*/().\s]/g, '');
    
    try {
      // Use Function constructor instead of eval for better security
      const result = new Function('return ' + safe)();
      return typeof result === 'number' ? result : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Load KPIs into cache
   */
  private async loadKPIs(): Promise<void> {
    try {
      const query = 'SELECT * FROM kpis WHERE is_active = true;';
      const result = await this.pool.query(query);

      result.rows.forEach(row => {
        const kpi = this.mapRowToKPI(row);
        this.kpiCache.set(kpi.id, kpi);
      });

      this.logger.info('KPIs loaded into cache', { count: this.kpiCache.size });
    } catch (error: any) {
      this.logger.error('Failed to load KPIs', error);
    }
  }

  /**
   * Start calculation timer
   */
  private startCalculationTimer(): void {
    this.calculationTimer = setInterval(async () => {
      try {
        for (const [kpiId, kpi] of this.kpiCache) {
          if (kpi.is_active) {
            await this.calculate(kpiId);
          }
        }
      } catch (error) {
        this.logger.error('Calculation timer error', error);
      }
    }, this.calculationInterval);
  }

  /**
   * Stop calculation timer
   */
  stopCalculationTimer(): void {
    if (this.calculationTimer) {
      clearInterval(this.calculationTimer);
      this.calculationTimer = undefined;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stopCalculationTimer();
    this.removeAllListeners();
    this.kpiCache.clear();
    this.logger.info('KPIService cleaned up');
  }
}