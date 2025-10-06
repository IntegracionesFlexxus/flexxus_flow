import { injectable, inject } from 'inversify';
import { Pool, QueryResult } from 'pg';
import { TYPES } from '../../../container/types';

export interface ReportDefinition {
  id?: number;
  company_id: number;
  name: string;
  description?: string;
  report_type: 'lead_analysis' | 'sales_performance' | 'activity_summary' | 
               'pipeline_forecast' | 'conversion_funnel' | 'custom';
  query_config: any;
  filters?: any;
  columns?: any[];
  grouping?: any[];
  sorting?: any[];
  visualization_type?: string;
  visualization_config?: any;
  schedule_config?: any;
  is_public?: boolean;
  is_active?: boolean;
  created_by?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface ReportExecution {
  reportId: number;
  filters?: any;
  parameters?: any;
  format?: 'json' | 'csv' | 'excel';
}

@injectable()
export class ReportRepository {
  constructor(
    @inject(TYPES.CrmConnection) private pool: Pool
  ) {}

  async create(report: ReportDefinition): Promise<ReportDefinition> {
    const query = `
      INSERT INTO report_definitions (
        company_id, name, description, report_type, query_config,
        filters, columns, grouping, sorting, visualization_type,
        visualization_config, schedule_config, is_public, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      report.company_id,
      report.name,
      report.description,
      report.report_type,
      JSON.stringify(report.query_config),
      JSON.stringify(report.filters || {}),
      JSON.stringify(report.columns || []),
      JSON.stringify(report.grouping || []),
      JSON.stringify(report.sorting || []),
      report.visualization_type,
      JSON.stringify(report.visualization_config || {}),
      JSON.stringify(report.schedule_config || {}),
      report.is_public || false,
      report.is_active !== false,
      report.created_by
    ];

    const result = await this.pool.query(query, values);
    return this.mapToReportDefinition(result.rows[0]);
  }

  async findById(id: number, companyId: number): Promise<ReportDefinition | null> {
    const query = `
      SELECT * FROM report_definitions 
      WHERE id = $1 AND company_id = $2
    `;

    const result = await this.pool.query(query, [id, companyId]);
    return result.rows.length > 0 ? this.mapToReportDefinition(result.rows[0]) : null;
  }

  async findByCompany(companyId: number): Promise<ReportDefinition[]> {
    const query = `
      SELECT * FROM report_definitions 
      WHERE company_id = $1 AND is_active = true
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [companyId]);
    return result.rows.map(row => this.mapToReportDefinition(row));
  }

  async findByType(companyId: number, reportType: string): Promise<ReportDefinition[]> {
    const query = `
      SELECT * FROM report_definitions 
      WHERE company_id = $1 AND report_type = $2 AND is_active = true
      ORDER BY name
    `;

    const result = await this.pool.query(query, [companyId, reportType]);
    return result.rows.map(row => this.mapToReportDefinition(row));
  }

  async update(id: number, companyId: number, updates: Partial<ReportDefinition>): Promise<ReportDefinition | null> {
    const allowedFields = [
      'name', 'description', 'query_config', 'filters', 'columns',
      'grouping', 'sorting', 'visualization_type', 'visualization_config',
      'schedule_config', 'is_public', 'is_active'
    ];

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const field of allowedFields) {
      if (field in updates) {
        let value = (updates as any)[field];
        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }
        updateFields.push(`${field} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      return this.findById(id, companyId);
    }

    values.push(id, companyId);
    const query = `
      UPDATE report_definitions 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount} AND company_id = $${paramCount + 1}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.mapToReportDefinition(result.rows[0]) : null;
  }

  async delete(id: number, companyId: number): Promise<boolean> {
    const query = `
      DELETE FROM report_definitions 
      WHERE id = $1 AND company_id = $2
    `;

    const result = await this.pool.query(query, [id, companyId]);
    return result.rowCount > 0;
  }

  async executeReport(execution: ReportExecution): Promise<any[]> {
    // Get report definition
    const reportQuery = `
      SELECT * FROM report_definitions 
      WHERE id = $1 AND is_active = true
    `;
    
    const reportResult = await this.pool.query(reportQuery, [execution.reportId]);
    if (reportResult.rows.length === 0) {
      throw new Error('Report not found');
    }

    const report = this.mapToReportDefinition(reportResult.rows[0]);
    
    // Build and execute dynamic query based on report configuration
    const query = this.buildReportQuery(report, execution.filters);
    const result = await this.pool.query(query);
    
    return result.rows;
  }

  async getReportMetrics(reportId: number): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as execution_count,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds,
        MAX(created_at) as last_executed
      FROM data_exports
      WHERE export_name LIKE 'Report_%' || $1 || '%'
    `;

    const result = await this.pool.query(query, [reportId]);
    return result.rows[0];
  }

  private buildReportQuery(report: ReportDefinition, additionalFilters?: any): string {
    const config = report.query_config;
    let query = '';

    switch (report.report_type) {
      case 'sales_performance':
        query = this.buildSalesPerformanceQuery(config, additionalFilters);
        break;
      case 'lead_analysis':
        query = this.buildLeadAnalysisQuery(config, additionalFilters);
        break;
      case 'activity_summary':
        query = this.buildActivitySummaryQuery(config, additionalFilters);
        break;
      case 'pipeline_forecast':
        query = this.buildPipelineForecastQuery(config, additionalFilters);
        break;
      case 'conversion_funnel':
        query = this.buildConversionFunnelQuery(config, additionalFilters);
        break;
      default:
        query = config.customQuery || 'SELECT 1';
    }

    return query;
  }

  private buildSalesPerformanceQuery(config: any, filters?: any): string {
    const dateFilter = filters?.dateRange ? 
      `AND o.created_at BETWEEN '${filters.dateRange.start}' AND '${filters.dateRange.end}'` : '';
    
    return `
      SELECT 
        DATE_TRUNC('${config.period || 'month'}', o.created_at) as period,
        COUNT(*) as total_deals,
        SUM(o.amount) as total_value,
        AVG(o.amount) as avg_deal_size,
        COUNT(CASE WHEN o.status = 'won' THEN 1 END) as won_deals,
        SUM(CASE WHEN o.status = 'won' THEN o.amount ELSE 0 END) as revenue
      FROM opportunities o
      WHERE o.company_id = ${config.companyId}
      ${dateFilter}
      GROUP BY period
      ORDER BY period DESC
    `;
  }

  private buildLeadAnalysisQuery(config: any, filters?: any): string {
    const statusFilter = filters?.status ? 
      `AND l.status = '${filters.status}'` : '';
    
    return `
      SELECT 
        l.source,
        COUNT(*) as lead_count,
        AVG(l.score) as avg_score,
        COUNT(CASE WHEN l.status = 'qualified' THEN 1 END) as qualified_count,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_count
      FROM leads l
      WHERE l.company_id = ${config.companyId}
      ${statusFilter}
      GROUP BY l.source
      ORDER BY lead_count DESC
    `;
  }

  private buildActivitySummaryQuery(config: any, filters?: any): string {
    const userFilter = filters?.userId ? 
      `AND a.assigned_to = ${filters.userId}` : '';
    
    return `
      SELECT 
        a.type,
        COUNT(*) as total_activities,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending,
        AVG(CASE WHEN a.status = 'completed' 
          THEN EXTRACT(EPOCH FROM (a.updated_at - a.created_at))/3600 
          END) as avg_completion_hours
      FROM activities a
      WHERE a.company_id = ${config.companyId}
      ${userFilter}
      GROUP BY a.type
      ORDER BY total_activities DESC
    `;
  }

  private buildPipelineForecastQuery(config: any, filters?: any): string {
    return `
      SELECT 
        o.stage,
        COUNT(*) as opportunity_count,
        SUM(o.amount) as total_value,
        SUM(o.amount * o.probability / 100) as weighted_value,
        AVG(o.probability) as avg_probability,
        AVG(EXTRACT(EPOCH FROM (NOW() - o.created_at))/86400) as avg_age_days
      FROM opportunities o
      WHERE o.company_id = ${config.companyId}
      AND o.status = 'open'
      GROUP BY o.stage
      ORDER BY avg_probability DESC
    `;
  }

  private buildConversionFunnelQuery(config: any, filters?: any): string {
    return `
      WITH funnel_data AS (
        SELECT 
          'Leads' as stage,
          1 as stage_order,
          COUNT(*) as count
        FROM leads
        WHERE company_id = ${config.companyId}
        
        UNION ALL
        
        SELECT 
          'Qualified' as stage,
          2 as stage_order,
          COUNT(*) as count
        FROM leads
        WHERE company_id = ${config.companyId}
        AND status = 'qualified'
        
        UNION ALL
        
        SELECT 
          'Opportunities' as stage,
          3 as stage_order,
          COUNT(*) as count
        FROM opportunities
        WHERE company_id = ${config.companyId}
        
        UNION ALL
        
        SELECT 
          'Won' as stage,
          4 as stage_order,
          COUNT(*) as count
        FROM opportunities
        WHERE company_id = ${config.companyId}
        AND status = 'won'
      )
      SELECT 
        stage,
        count,
        LAG(count) OVER (ORDER BY stage_order) as previous_count,
        CASE 
          WHEN LAG(count) OVER (ORDER BY stage_order) > 0 
          THEN count::float / LAG(count) OVER (ORDER BY stage_order) * 100
          ELSE 100 
        END as conversion_rate
      FROM funnel_data
      ORDER BY stage_order
    `;
  }

  private mapToReportDefinition(row: any): ReportDefinition {
    return {
      id: row.id,
      company_id: row.company_id,
      name: row.name,
      description: row.description,
      report_type: row.report_type,
      query_config: typeof row.query_config === 'string' ? JSON.parse(row.query_config) : row.query_config,
      filters: typeof row.filters === 'string' ? JSON.parse(row.filters) : row.filters,
      columns: typeof row.columns === 'string' ? JSON.parse(row.columns) : row.columns,
      grouping: typeof row.grouping === 'string' ? JSON.parse(row.grouping) : row.grouping,
      sorting: typeof row.sorting === 'string' ? JSON.parse(row.sorting) : row.sorting,
      visualization_type: row.visualization_type,
      visualization_config: typeof row.visualization_config === 'string' ? 
        JSON.parse(row.visualization_config) : row.visualization_config,
      schedule_config: typeof row.schedule_config === 'string' ? 
        JSON.parse(row.schedule_config) : row.schedule_config,
      is_public: row.is_public,
      is_active: row.is_active,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}