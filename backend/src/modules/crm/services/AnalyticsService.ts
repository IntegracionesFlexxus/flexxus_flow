import { injectable, inject } from 'inversify';
import { TYPES } from '../../../container/types';
import { ReportRepository } from '../repositories/ReportRepository';
import { KpiRepository } from '../repositories/KpiRepository';
import { DashboardRepository } from '../repositories/DashboardRepository';
import { Pool } from 'pg';

export interface AnalyticsMetrics {
  salesMetrics: {
    totalRevenue: number;
    averageDealSize: number;
    winRate: number;
    salesCycle: number;
  };
  leadMetrics: {
    totalLeads: number;
    conversionRate: number;
    averageScore: number;
    topSources: Array<{ source: string; count: number }>;
  };
  activityMetrics: {
    totalActivities: number;
    completionRate: number;
    overdueCount: number;
    upcomingCount: number;
  };
  pipelineMetrics: {
    totalValue: number;
    weightedValue: number;
    stageDistribution: Array<{ stage: string; count: number; value: number }>;
    forecast: number;
  };
}

export interface TrendData {
  period: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercentage?: number;
}

@injectable()
export class AnalyticsService {
  constructor(
    @inject(TYPES.CRMReportRepository) private reportRepository: ReportRepository,
    @inject(TYPES.CRMKpiRepository) private kpiRepository: KpiRepository,
    @inject(TYPES.CRMDashboardRepository) private dashboardRepository: DashboardRepository,
    @inject(TYPES.CrmConnection) private pool: Pool
  ) {}

  async getCompanyMetrics(companyId: number): Promise<AnalyticsMetrics> {
    const [salesMetrics, leadMetrics, activityMetrics, pipelineMetrics] = await Promise.all([
      this.getSalesMetrics(companyId),
      this.getLeadMetrics(companyId),
      this.getActivityMetrics(companyId),
      this.getPipelineMetrics(companyId)
    ]);

    return {
      salesMetrics,
      leadMetrics,
      activityMetrics,
      pipelineMetrics
    };
  }

  private async getSalesMetrics(companyId: number): Promise<any> {
    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'won' THEN amount ELSE 0 END), 0) as total_revenue,
        COALESCE(AVG(CASE WHEN status = 'won' THEN amount END), 0) as average_deal_size,
        CASE 
          WHEN COUNT(CASE WHEN status IN ('won', 'lost') THEN 1 END) = 0 THEN 0
          ELSE COUNT(CASE WHEN status = 'won' THEN 1 END)::float / 
               COUNT(CASE WHEN status IN ('won', 'lost') THEN 1 END) * 100
        END as win_rate,
        COALESCE(AVG(
          CASE WHEN status = 'won' 
          THEN EXTRACT(EPOCH FROM (updated_at - created_at))/86400 
          END
        ), 0) as sales_cycle
      FROM opportunities
      WHERE company_id = $1
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `;

    const result = await this.pool.query(query, [companyId]);
    return {
      totalRevenue: parseFloat(result.rows[0].total_revenue),
      averageDealSize: parseFloat(result.rows[0].average_deal_size),
      winRate: parseFloat(result.rows[0].win_rate),
      salesCycle: parseFloat(result.rows[0].sales_cycle)
    };
  }

  private async getLeadMetrics(companyId: number): Promise<any> {
    const query = `
      WITH lead_stats AS (
        SELECT 
          COUNT(*) as total_leads,
          COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads,
          AVG(score) as average_score
        FROM leads
        WHERE company_id = $1
        AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
      ),
      top_sources AS (
        SELECT 
          source,
          COUNT(*) as count
        FROM leads
        WHERE company_id = $1
        AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY source
        ORDER BY count DESC
        LIMIT 5
      )
      SELECT 
        ls.*,
        CASE 
          WHEN ls.total_leads = 0 THEN 0
          ELSE ls.converted_leads::float / ls.total_leads * 100
        END as conversion_rate,
        COALESCE(json_agg(
          json_build_object('source', ts.source, 'count', ts.count)
        ) FILTER (WHERE ts.source IS NOT NULL), '[]'::json) as top_sources
      FROM lead_stats ls
      CROSS JOIN top_sources ts
      GROUP BY ls.total_leads, ls.converted_leads, ls.average_score
    `;

    const result = await this.pool.query(query, [companyId]);
    const row = result.rows[0];
    
    return {
      totalLeads: parseInt(row.total_leads),
      conversionRate: parseFloat(row.conversion_rate),
      averageScore: parseFloat(row.average_score || 0),
      topSources: row.top_sources
    };
  }

  private async getActivityMetrics(companyId: number): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_activities,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_activities,
        COUNT(CASE WHEN status = 'pending' AND due_date < CURRENT_DATE THEN 1 END) as overdue_count,
        COUNT(CASE WHEN status = 'pending' AND due_date >= CURRENT_DATE THEN 1 END) as upcoming_count
      FROM activities
      WHERE company_id = $1
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `;

    const result = await this.pool.query(query, [companyId]);
    const row = result.rows[0];

    return {
      totalActivities: parseInt(row.total_activities),
      completionRate: row.total_activities > 0 ? 
        (parseInt(row.completed_activities) / parseInt(row.total_activities)) * 100 : 0,
      overdueCount: parseInt(row.overdue_count),
      upcomingCount: parseInt(row.upcoming_count)
    };
  }

  private async getPipelineMetrics(companyId: number): Promise<any> {
    const query = `
      WITH pipeline_data AS (
        SELECT 
          stage,
          COUNT(*) as count,
          SUM(amount) as value,
          SUM(amount * probability / 100) as weighted_value
        FROM opportunities
        WHERE company_id = $1
        AND status = 'open'
        GROUP BY stage
      )
      SELECT 
        COALESCE(SUM(value), 0) as total_value,
        COALESCE(SUM(weighted_value), 0) as weighted_value,
        COALESCE(SUM(weighted_value) * 1.1, 0) as forecast,
        json_agg(
          json_build_object(
            'stage', stage,
            'count', count,
            'value', value
          )
        ) as stage_distribution
      FROM pipeline_data
    `;

    const result = await this.pool.query(query, [companyId]);
    const row = result.rows[0];

    return {
      totalValue: parseFloat(row.total_value),
      weightedValue: parseFloat(row.weighted_value),
      stageDistribution: row.stage_distribution || [],
      forecast: parseFloat(row.forecast)
    };
  }

  async getRevenueTrend(
    companyId: number,
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' = 'monthly',
    startDate?: Date,
    endDate?: Date
  ): Promise<TrendData[]> {
    const periodFormat = {
      daily: 'YYYY-MM-DD',
      weekly: 'IYYY-IW',
      monthly: 'YYYY-MM',
      quarterly: 'YYYY-Q'
    }[period];

    const query = `
      WITH revenue_data AS (
        SELECT 
          TO_CHAR(DATE_TRUNC('${period === 'weekly' ? 'week' : period}', updated_at), '${periodFormat}') as period,
          SUM(amount) as value
        FROM opportunities
        WHERE company_id = $1
        AND status = 'won'
        ${startDate ? 'AND updated_at >= $2' : ''}
        ${endDate ? `AND updated_at <= $${startDate ? '3' : '2'}` : ''}
        GROUP BY period
        ORDER BY period
      )
      SELECT 
        period,
        value,
        LAG(value) OVER (ORDER BY period) as previous_value,
        value - LAG(value) OVER (ORDER BY period) as change,
        CASE 
          WHEN LAG(value) OVER (ORDER BY period) > 0
          THEN ((value - LAG(value) OVER (ORDER BY period)) / LAG(value) OVER (ORDER BY period)) * 100
          ELSE 0
        END as change_percentage
      FROM revenue_data
      ORDER BY period DESC
      LIMIT 12
    `;

    const values: any[] = [companyId];
    if (startDate) values.push(startDate);
    if (endDate) values.push(endDate);

    const result = await this.pool.query(query, values);
    return result.rows.map(row => ({
      period: row.period,
      value: parseFloat(row.value),
      previousValue: row.previous_value ? parseFloat(row.previous_value) : undefined,
      change: row.change ? parseFloat(row.change) : undefined,
      changePercentage: row.change_percentage ? parseFloat(row.change_percentage) : undefined
    }));
  }

  async getConversionFunnel(companyId: number): Promise<any[]> {
    const query = `
      WITH funnel_stages AS (
        SELECT 'Visitors' as stage, 1 as stage_order, 
               (SELECT COUNT(*) FROM lead_sources WHERE company_id = $1) as count
        UNION ALL
        SELECT 'Leads' as stage, 2 as stage_order,
               (SELECT COUNT(*) FROM leads WHERE company_id = $1) as count
        UNION ALL
        SELECT 'Qualified' as stage, 3 as stage_order,
               (SELECT COUNT(*) FROM leads WHERE company_id = $1 AND status = 'qualified') as count
        UNION ALL
        SELECT 'Opportunities' as stage, 4 as stage_order,
               (SELECT COUNT(*) FROM opportunities WHERE company_id = $1) as count
        UNION ALL
        SELECT 'Proposals' as stage, 5 as stage_order,
               (SELECT COUNT(*) FROM opportunities WHERE company_id = $1 AND stage IN ('proposal', 'negotiation')) as count
        UNION ALL
        SELECT 'Won' as stage, 6 as stage_order,
               (SELECT COUNT(*) FROM opportunities WHERE company_id = $1 AND status = 'won') as count
      )
      SELECT 
        stage,
        count,
        LAG(count) OVER (ORDER BY stage_order) as previous_count,
        CASE 
          WHEN LAG(count) OVER (ORDER BY stage_order) > 0
          THEN count::float / LAG(count) OVER (ORDER BY stage_order) * 100
          ELSE 100
        END as conversion_rate,
        count::float / FIRST_VALUE(count) OVER (ORDER BY stage_order) * 100 as percentage_of_total
      FROM funnel_stages
      ORDER BY stage_order
    `;

    const result = await this.pool.query(query, [companyId]);
    return result.rows;
  }

  async getTopPerformers(
    companyId: number,
    metric: 'revenue' | 'deals' | 'activities' = 'revenue',
    limit: number = 10
  ): Promise<any[]> {
    let query: string;

    switch (metric) {
      case 'revenue':
        query = `
          SELECT 
            u.id as user_id,
            u.name as user_name,
            COUNT(o.id) as deal_count,
            SUM(o.amount) as total_revenue,
            AVG(o.amount) as avg_deal_size
          FROM opportunities o
          JOIN users u ON o.assigned_to = u.id
          WHERE o.company_id = $1
          AND o.status = 'won'
          AND o.updated_at >= DATE_TRUNC('month', CURRENT_DATE)
          GROUP BY u.id, u.name
          ORDER BY total_revenue DESC
          LIMIT $2
        `;
        break;

      case 'deals':
        query = `
          SELECT 
            u.id as user_id,
            u.name as user_name,
            COUNT(o.id) as deal_count,
            COUNT(CASE WHEN o.status = 'won' THEN 1 END) as won_deals,
            COUNT(CASE WHEN o.status = 'won' THEN 1 END)::float / COUNT(*) * 100 as win_rate
          FROM opportunities o
          JOIN users u ON o.assigned_to = u.id
          WHERE o.company_id = $1
          AND o.created_at >= DATE_TRUNC('month', CURRENT_DATE)
          GROUP BY u.id, u.name
          ORDER BY deal_count DESC
          LIMIT $2
        `;
        break;

      case 'activities':
        query = `
          SELECT 
            u.id as user_id,
            u.name as user_name,
            COUNT(a.id) as total_activities,
            COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_activities,
            COUNT(CASE WHEN a.status = 'completed' THEN 1 END)::float / COUNT(*) * 100 as completion_rate
          FROM activities a
          JOIN users u ON a.assigned_to = u.id
          WHERE a.company_id = $1
          AND a.created_at >= DATE_TRUNC('month', CURRENT_DATE)
          GROUP BY u.id, u.name
          ORDER BY total_activities DESC
          LIMIT $2
        `;
        break;
    }

    const result = await this.pool.query(query, [companyId, limit]);
    return result.rows;
  }

  async getPerformanceComparison(
    companyId: number,
    currentPeriod: { start: Date; end: Date },
    previousPeriod: { start: Date; end: Date }
  ): Promise<any> {
    const metricsQuery = `
      WITH current_period AS (
        SELECT 
          COUNT(DISTINCT o.id) as opportunities,
          SUM(CASE WHEN o.status = 'won' THEN o.amount ELSE 0 END) as revenue,
          COUNT(DISTINCT CASE WHEN o.status = 'won' THEN o.id END) as won_deals,
          COUNT(DISTINCT l.id) as leads,
          COUNT(DISTINCT a.id) as activities
        FROM opportunities o
        FULL OUTER JOIN leads l ON l.company_id = o.company_id
        FULL OUTER JOIN activities a ON a.company_id = o.company_id
        WHERE o.company_id = $1
        AND (
          (o.created_at BETWEEN $2 AND $3) OR
          (l.created_at BETWEEN $2 AND $3) OR
          (a.created_at BETWEEN $2 AND $3)
        )
      ),
      previous_period AS (
        SELECT 
          COUNT(DISTINCT o.id) as opportunities,
          SUM(CASE WHEN o.status = 'won' THEN o.amount ELSE 0 END) as revenue,
          COUNT(DISTINCT CASE WHEN o.status = 'won' THEN o.id END) as won_deals,
          COUNT(DISTINCT l.id) as leads,
          COUNT(DISTINCT a.id) as activities
        FROM opportunities o
        FULL OUTER JOIN leads l ON l.company_id = o.company_id
        FULL OUTER JOIN activities a ON a.company_id = o.company_id
        WHERE o.company_id = $1
        AND (
          (o.created_at BETWEEN $4 AND $5) OR
          (l.created_at BETWEEN $4 AND $5) OR
          (a.created_at BETWEEN $4 AND $5)
        )
      )
      SELECT 
        cp.*,
        pp.opportunities as prev_opportunities,
        pp.revenue as prev_revenue,
        pp.won_deals as prev_won_deals,
        pp.leads as prev_leads,
        pp.activities as prev_activities
      FROM current_period cp, previous_period pp
    `;

    const result = await this.pool.query(metricsQuery, [
      companyId,
      currentPeriod.start,
      currentPeriod.end,
      previousPeriod.start,
      previousPeriod.end
    ]);

    const data = result.rows[0];
    
    return {
      current: {
        opportunities: parseInt(data.opportunities),
        revenue: parseFloat(data.revenue),
        wonDeals: parseInt(data.won_deals),
        leads: parseInt(data.leads),
        activities: parseInt(data.activities)
      },
      previous: {
        opportunities: parseInt(data.prev_opportunities),
        revenue: parseFloat(data.prev_revenue),
        wonDeals: parseInt(data.prev_won_deals),
        leads: parseInt(data.prev_leads),
        activities: parseInt(data.prev_activities)
      },
      changes: {
        opportunities: this.calculateChange(data.opportunities, data.prev_opportunities),
        revenue: this.calculateChange(data.revenue, data.prev_revenue),
        wonDeals: this.calculateChange(data.won_deals, data.prev_won_deals),
        leads: this.calculateChange(data.leads, data.prev_leads),
        activities: this.calculateChange(data.activities, data.prev_activities)
      }
    };
  }

  private calculateChange(current: number, previous: number): any {
    const diff = current - previous;
    const percentage = previous > 0 ? (diff / previous) * 100 : 0;
    
    return {
      absolute: diff,
      percentage: percentage,
      trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable'
    };
  }

  async getSalesForecast(
    companyId: number,
    months: number = 3
  ): Promise<any> {
    const query = `
      SELECT * FROM calculate_sales_forecast($1, $2)
    `;

    const result = await this.pool.query(query, [companyId, months]);
    return result.rows;
  }

  async getCampaignROI(
    companyId: number,
    campaignId?: number
  ): Promise<any> {
    const query = campaignId
      ? `SELECT * FROM calculate_campaign_roi($1, $2)`
      : `
        SELECT 
          c.id as campaign_id,
          c.name as campaign_name,
          calculate_campaign_roi($1, c.id) as roi
        FROM campaigns c
        WHERE c.company_id = $1
      `;

    const values = campaignId ? [companyId, campaignId] : [companyId];
    const result = await this.pool.query(query, values);
    return campaignId ? result.rows[0] : result.rows;
  }
}