import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '../../../container/types';

export interface KpiDefinition {
  id?: number;
  company_id: number;
  name: string;
  category?: 'sales' | 'marketing' | 'service' | 'operational' | 'financial';
  calculation_type?: 'count' | 'sum' | 'average' | 'percentage' | 'ratio' | 'custom';
  formula?: string;
  target_value?: number;
  threshold_warning?: number;
  threshold_critical?: number;
  comparison_period?: string;
  unit?: string;
  is_higher_better?: boolean;
  refresh_frequency?: string;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface KpiSnapshot {
  id?: number;
  kpi_id: number;
  company_id: number;
  snapshot_date: Date;
  value: number;
  target_value?: number;
  previous_value?: number;
  change_percentage?: number;
  status?: 'excellent' | 'good' | 'warning' | 'critical';
  calculation_details?: any;
  created_at?: Date;
}

@injectable()
export class KpiRepository {
  constructor(
    @inject(TYPES.DatabasePool) private pool: Pool
  ) {}

  async create(kpi: KpiDefinition): Promise<KpiDefinition> {
    const query = `
      INSERT INTO kpi_definitions (
        company_id, name, category, calculation_type, formula,
        target_value, threshold_warning, threshold_critical,
        comparison_period, unit, is_higher_better, refresh_frequency, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      kpi.company_id,
      kpi.name,
      kpi.category,
      kpi.calculation_type,
      kpi.formula,
      kpi.target_value,
      kpi.threshold_warning,
      kpi.threshold_critical,
      kpi.comparison_period || 'month',
      kpi.unit,
      kpi.is_higher_better !== false,
      kpi.refresh_frequency || 'daily',
      kpi.is_active !== false
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findById(id: number): Promise<KpiDefinition | null> {
    const query = 'SELECT * FROM kpi_definitions WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async findByCompany(companyId: number): Promise<KpiDefinition[]> {
    const query = `
      SELECT * FROM kpi_definitions 
      WHERE company_id = $1 AND is_active = true
      ORDER BY category, name
    `;
    const result = await this.pool.query(query, [companyId]);
    return result.rows;
  }

  async findByCategory(companyId: number, category: string): Promise<KpiDefinition[]> {
    const query = `
      SELECT * FROM kpi_definitions 
      WHERE company_id = $1 AND category = $2 AND is_active = true
      ORDER BY name
    `;
    const result = await this.pool.query(query, [companyId, category]);
    return result.rows;
  }

  async update(id: number, updates: Partial<KpiDefinition>): Promise<KpiDefinition | null> {
    const allowedFields = [
      'name', 'category', 'calculation_type', 'formula',
      'target_value', 'threshold_warning', 'threshold_critical',
      'comparison_period', 'unit', 'is_higher_better', 
      'refresh_frequency', 'is_active'
    ];

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const field of allowedFields) {
      if (field in updates) {
        updateFields.push(`${field} = $${paramCount}`);
        values.push((updates as any)[field]);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE kpi_definitions 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async delete(id: number): Promise<boolean> {
    const query = 'DELETE FROM kpi_definitions WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async createSnapshot(snapshot: KpiSnapshot): Promise<KpiSnapshot> {
    const query = `
      INSERT INTO kpi_snapshots (
        kpi_id, company_id, snapshot_date, value,
        target_value, previous_value, change_percentage,
        status, calculation_details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (kpi_id, snapshot_date) 
      DO UPDATE SET 
        value = EXCLUDED.value,
        target_value = EXCLUDED.target_value,
        previous_value = EXCLUDED.previous_value,
        change_percentage = EXCLUDED.change_percentage,
        status = EXCLUDED.status,
        calculation_details = EXCLUDED.calculation_details
      RETURNING *
    `;

    const values = [
      snapshot.kpi_id,
      snapshot.company_id,
      snapshot.snapshot_date,
      snapshot.value,
      snapshot.target_value,
      snapshot.previous_value,
      snapshot.change_percentage,
      snapshot.status,
      JSON.stringify(snapshot.calculation_details || {})
    ];

    const result = await this.pool.query(query, values);
    return this.mapToKpiSnapshot(result.rows[0]);
  }

  async getSnapshots(
    kpiId: number, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<KpiSnapshot[]> {
    let query = `
      SELECT * FROM kpi_snapshots 
      WHERE kpi_id = $1
    `;
    const values: any[] = [kpiId];

    if (startDate && endDate) {
      query += ` AND snapshot_date BETWEEN $2 AND $3`;
      values.push(startDate, endDate);
    } else if (startDate) {
      query += ` AND snapshot_date >= $2`;
      values.push(startDate);
    } else if (endDate) {
      query += ` AND snapshot_date <= $2`;
      values.push(endDate);
    }

    query += ` ORDER BY snapshot_date DESC`;

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.mapToKpiSnapshot(row));
  }

  async getLatestSnapshot(kpiId: number): Promise<KpiSnapshot | null> {
    const query = `
      SELECT * FROM kpi_snapshots 
      WHERE kpi_id = $1 
      ORDER BY snapshot_date DESC 
      LIMIT 1
    `;
    const result = await this.pool.query(query, [kpiId]);
    return result.rows.length > 0 ? this.mapToKpiSnapshot(result.rows[0]) : null;
  }

  async getCompanySnapshots(
    companyId: number,
    date?: Date
  ): Promise<any[]> {
    const query = `
      SELECT 
        kd.*,
        ks.value,
        ks.target_value,
        ks.previous_value,
        ks.change_percentage,
        ks.status,
        ks.snapshot_date
      FROM kpi_definitions kd
      LEFT JOIN LATERAL (
        SELECT * FROM kpi_snapshots
        WHERE kpi_id = kd.id
        ${date ? 'AND snapshot_date = $2' : ''}
        ORDER BY snapshot_date DESC
        LIMIT 1
      ) ks ON true
      WHERE kd.company_id = $1 AND kd.is_active = true
      ORDER BY kd.category, kd.name
    `;

    const values = date ? [companyId, date] : [companyId];
    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async calculateKpiValue(kpiId: number): Promise<number> {
    // Get KPI definition
    const kpi = await this.findById(kpiId);
    if (!kpi) {
      throw new Error('KPI not found');
    }

    let value = 0;

    // Execute calculation based on type
    switch (kpi.calculation_type) {
      case 'count':
        value = await this.calculateCountKpi(kpi);
        break;
      case 'sum':
        value = await this.calculateSumKpi(kpi);
        break;
      case 'average':
        value = await this.calculateAverageKpi(kpi);
        break;
      case 'percentage':
        value = await this.calculatePercentageKpi(kpi);
        break;
      case 'ratio':
        value = await this.calculateRatioKpi(kpi);
        break;
      case 'custom':
        value = await this.calculateCustomKpi(kpi);
        break;
      default:
        throw new Error(`Unknown calculation type: ${kpi.calculation_type}`);
    }

    return value;
  }

  private async calculateCountKpi(kpi: KpiDefinition): Promise<number> {
    // Example: Count total opportunities
    const query = `
      SELECT COUNT(*) as value
      FROM opportunities
      WHERE company_id = $1
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `;
    const result = await this.pool.query(query, [kpi.company_id]);
    return parseFloat(result.rows[0].value);
  }

  private async calculateSumKpi(kpi: KpiDefinition): Promise<number> {
    // Example: Sum of won opportunities
    const query = `
      SELECT COALESCE(SUM(amount), 0) as value
      FROM opportunities
      WHERE company_id = $1
      AND status = 'won'
      AND updated_at >= DATE_TRUNC('month', CURRENT_DATE)
    `;
    const result = await this.pool.query(query, [kpi.company_id]);
    return parseFloat(result.rows[0].value);
  }

  private async calculateAverageKpi(kpi: KpiDefinition): Promise<number> {
    // Example: Average deal size
    const query = `
      SELECT COALESCE(AVG(amount), 0) as value
      FROM opportunities
      WHERE company_id = $1
      AND status = 'won'
      AND updated_at >= DATE_TRUNC('month', CURRENT_DATE)
    `;
    const result = await this.pool.query(query, [kpi.company_id]);
    return parseFloat(result.rows[0].value);
  }

  private async calculatePercentageKpi(kpi: KpiDefinition): Promise<number> {
    // Example: Win rate
    const query = `
      SELECT 
        CASE 
          WHEN COUNT(*) = 0 THEN 0
          ELSE COUNT(CASE WHEN status = 'won' THEN 1 END)::float / COUNT(*) * 100
        END as value
      FROM opportunities
      WHERE company_id = $1
      AND status IN ('won', 'lost')
      AND updated_at >= DATE_TRUNC('month', CURRENT_DATE)
    `;
    const result = await this.pool.query(query, [kpi.company_id]);
    return parseFloat(result.rows[0].value);
  }

  private async calculateRatioKpi(kpi: KpiDefinition): Promise<number> {
    // Example: Lead to opportunity ratio
    const query = `
      WITH counts AS (
        SELECT 
          (SELECT COUNT(*) FROM leads WHERE company_id = $1 
           AND created_at >= DATE_TRUNC('month', CURRENT_DATE)) as lead_count,
          (SELECT COUNT(*) FROM opportunities WHERE company_id = $1
           AND created_at >= DATE_TRUNC('month', CURRENT_DATE)) as opp_count
      )
      SELECT 
        CASE 
          WHEN lead_count = 0 THEN 0
          ELSE opp_count::float / lead_count
        END as value
      FROM counts
    `;
    const result = await this.pool.query(query, [kpi.company_id]);
    return parseFloat(result.rows[0].value);
  }

  private async calculateCustomKpi(kpi: KpiDefinition): Promise<number> {
    // Execute custom formula/query
    if (!kpi.formula) {
      throw new Error('Custom KPI requires a formula');
    }

    // Security: Validate and sanitize the formula
    // This is a simplified example - in production, use a proper formula parser
    const query = kpi.formula.replace('${company_id}', kpi.company_id.toString());
    const result = await this.pool.query(query);
    return parseFloat(result.rows[0].value || 0);
  }

  async evaluateKpiStatus(
    value: number,
    kpi: KpiDefinition
  ): Promise<'excellent' | 'good' | 'warning' | 'critical'> {
    const { target_value, threshold_warning, threshold_critical, is_higher_better } = kpi;

    if (!target_value) return 'good';

    const percentage = (value / target_value) * 100;

    if (is_higher_better) {
      if (percentage >= 100) return 'excellent';
      if (percentage >= (threshold_warning || 80)) return 'good';
      if (percentage >= (threshold_critical || 60)) return 'warning';
      return 'critical';
    } else {
      if (percentage <= 100) return 'excellent';
      if (percentage <= (threshold_warning || 120)) return 'good';
      if (percentage <= (threshold_critical || 140)) return 'warning';
      return 'critical';
    }
  }

  private mapToKpiSnapshot(row: any): KpiSnapshot {
    return {
      id: row.id,
      kpi_id: row.kpi_id,
      company_id: row.company_id,
      snapshot_date: row.snapshot_date,
      value: parseFloat(row.value),
      target_value: row.target_value ? parseFloat(row.target_value) : undefined,
      previous_value: row.previous_value ? parseFloat(row.previous_value) : undefined,
      change_percentage: row.change_percentage ? parseFloat(row.change_percentage) : undefined,
      status: row.status,
      calculation_details: typeof row.calculation_details === 'string' ? 
        JSON.parse(row.calculation_details) : row.calculation_details,
      created_at: row.created_at
    };
  }
}