import { injectable, inject } from 'inversify';
import { TYPES } from '../../../container/types';
import {
  DashboardRepository,
  DashboardConfiguration,
  DashboardWidget
} from '../repositories/DashboardRepository';
import { KpiRepository } from '../repositories/KpiRepository';
import { ReportRepository } from '../repositories/ReportRepository';
import { AnalyticsService } from './AnalyticsService';
import { Pool } from 'pg';

export interface WidgetData {
  widgetId: number;
  type: string;
  title: string;
  data: any;
  lastUpdated: Date;
}

@injectable()
export class DashboardService {
  private widgetDataCache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(
    @inject(TYPES.DashboardRepository) private dashboardRepository: DashboardRepository,
    @inject(TYPES.KpiRepository) private kpiRepository: KpiRepository,
    @inject(TYPES.ReportRepository) private reportRepository: ReportRepository,
    @inject(TYPES.AnalyticsService) private analyticsService: AnalyticsService,
    @inject(TYPES.DatabasePool) private pool: Pool
  ) {}

  async createDashboard(dashboard: DashboardConfiguration): Promise<DashboardConfiguration> {
    // Validate dashboard configuration
    this.validateDashboardConfig(dashboard);

    // Create the dashboard
    return await this.dashboardRepository.createDashboard(dashboard);
  }

  async getDashboard(dashboardId: number): Promise<DashboardConfiguration | null> {
    return await this.dashboardRepository.findDashboardById(dashboardId);
  }

  async getCompanyDashboards(companyId: number): Promise<DashboardConfiguration[]> {
    return await this.dashboardRepository.findDashboardsByCompany(companyId);
  }

  async getUserDashboards(companyId: number, userId: number): Promise<DashboardConfiguration[]> {
    return await this.dashboardRepository.findDashboardsByUser(companyId, userId);
  }

  async getDefaultDashboard(companyId: number): Promise<DashboardConfiguration | null> {
    return await this.dashboardRepository.getDefaultDashboard(companyId);
  }

  async updateDashboard(
    dashboardId: number,
    updates: Partial<DashboardConfiguration>
  ): Promise<DashboardConfiguration | null> {
    // Validate updates if configuration is being changed
    if (updates.widgets || updates.filters) {
      this.validateDashboardConfig(updates as DashboardConfiguration);
    }

    // If setting as default, unset other defaults
    if (updates.is_default) {
      const dashboard = await this.dashboardRepository.findDashboardById(dashboardId);
      if (dashboard) {
        await this.unsetDefaultDashboards(dashboard.company_id, dashboardId);
      }
    }

    return await this.dashboardRepository.updateDashboard(dashboardId, updates);
  }

  async deleteDashboard(dashboardId: number): Promise<boolean> {
    return await this.dashboardRepository.deleteDashboard(dashboardId);
  }

  async addWidget(widget: DashboardWidget): Promise<DashboardWidget> {
    // Validate widget configuration
    this.validateWidgetConfig(widget);

    return await this.dashboardRepository.createWidget(widget);
  }

  async getWidget(widgetId: number): Promise<DashboardWidget | null> {
    return await this.dashboardRepository.findWidgetById(widgetId);
  }

  async getDashboardWidgets(dashboardId: number): Promise<DashboardWidget[]> {
    return await this.dashboardRepository.findWidgetsByDashboard(dashboardId);
  }

  async updateWidget(
    widgetId: number,
    updates: Partial<DashboardWidget>
  ): Promise<DashboardWidget | null> {
    // Validate updates if configuration is being changed
    if (updates.query_config || updates.visualization_config) {
      this.validateWidgetConfig(updates as DashboardWidget);
    }

    return await this.dashboardRepository.updateWidget(widgetId, updates);
  }

  async deleteWidget(widgetId: number): Promise<boolean> {
    return await this.dashboardRepository.deleteWidget(widgetId);
  }

  async updateWidgetPositions(
    widgets: Array<{ id: number; position_x: number; position_y: number }>
  ): Promise<void> {
    await this.dashboardRepository.updateWidgetPositions(widgets);
  }

  async getDashboardWithData(
    dashboardId: number,
    filters?: any
  ): Promise<any> {
    const dashboard = await this.dashboardRepository.getDashboardWithWidgets(dashboardId);
    if (!dashboard) {
      return null;
    }

    // Merge dashboard filters with provided filters
    const combinedFilters = {
      ...dashboard.filters,
      ...filters
    };

    // Load data for each widget
    const widgetsWithData = await Promise.all(
      dashboard.widgets.map(async (widget: DashboardWidget) => {
        const data = await this.getWidgetData(widget, combinedFilters);
        return {
          ...widget,
          data
        };
      })
    );

    return {
      ...dashboard,
      widgets: widgetsWithData,
      lastRefreshed: new Date()
    };
  }

  async getWidgetData(widget: DashboardWidget, filters?: any): Promise<any> {
    const cacheKey = `${widget.id}_${JSON.stringify(filters)}`;

    // Check cache
    const cached = this.widgetDataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    let data: any;

    switch (widget.widget_type) {
      case 'kpi':
        data = await this.getKpiWidgetData(widget, filters);
        break;
      case 'chart':
        data = await this.getChartWidgetData(widget, filters);
        break;
      case 'table':
        data = await this.getTableWidgetData(widget, filters);
        break;
      case 'metric':
        data = await this.getMetricWidgetData(widget, filters);
        break;
      case 'report':
        data = await this.getReportWidgetData(widget, filters);
        break;
      default:
        data = await this.getCustomWidgetData(widget, filters);
    }

    // Cache the result
    this.widgetDataCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  private async getKpiWidgetData(widget: DashboardWidget, filters?: any): Promise<any> {
    const config = widget.query_config;
    if (!config?.kpi_id) {
      return null;
    }

    const kpi = await this.kpiRepository.findById(config.kpi_id);
    const snapshot = await this.kpiRepository.getLatestSnapshot(config.kpi_id);

    return {
      kpi,
      snapshot,
      trend: await this.kpiRepository.getSnapshots(
        config.kpi_id,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      )
    };
  }

  private async getChartWidgetData(widget: DashboardWidget, filters?: any): Promise<any> {
    const config = widget.query_config;

    switch (config?.chart_type) {
      case 'revenue_trend':
        return await this.analyticsService.getRevenueTrend(
          config.company_id,
          config.period || 'monthly',
          filters?.startDate,
          filters?.endDate
        );

      case 'conversion_funnel':
        return await this.analyticsService.getConversionFunnel(config.company_id);

      case 'pipeline_distribution':
        const metrics = await this.analyticsService.getCompanyMetrics(config.company_id);
        return metrics.pipelineMetrics.stageDistribution;

      default:
        return await this.executeCustomQuery(config.query, filters);
    }
  }

  private async getTableWidgetData(widget: DashboardWidget, filters?: any): Promise<any> {
    const config = widget.query_config;

    if (config?.report_id) {
      const report = await this.reportRepository.findById(config.report_id, config.company_id);
      if (report) {
        return await this.reportRepository.executeReport({
          reportId: config.report_id,
          filters
        });
      }
    }

    return await this.executeCustomQuery(config.query, filters);
  }

  private async getMetricWidgetData(widget: DashboardWidget, filters?: any): Promise<any> {
    const config = widget.query_config;

    switch (config?.metric_type) {
      case 'total_revenue':
        const salesMetrics = await this.analyticsService.getCompanyMetrics(config.company_id);
        return {
          value: salesMetrics.salesMetrics.totalRevenue,
          change: await this.calculateMetricChange(config.company_id, 'revenue')
        };

      case 'win_rate':
        const winRateMetrics = await this.analyticsService.getCompanyMetrics(config.company_id);
        return {
          value: winRateMetrics.salesMetrics.winRate,
          change: await this.calculateMetricChange(config.company_id, 'win_rate')
        };

      case 'active_deals':
        const query = `
          SELECT COUNT(*) as value
          FROM opportunities
          WHERE company_id = $1 AND status = 'open'
        `;
        const result = await this.pool.query(query, [config.company_id]);
        return {
          value: parseInt(result.rows[0].value),
          change: 0
        };

      default:
        return await this.executeCustomQuery(config.query, filters);
    }
  }

  private async getReportWidgetData(widget: DashboardWidget, filters?: any): Promise<any> {
    const config = widget.query_config;

    if (!config?.report_id) {
      return null;
    }

    return await this.reportRepository.executeReport({
      reportId: config.report_id,
      filters
    });
  }

  private async getCustomWidgetData(widget: DashboardWidget, filters?: any): Promise<any> {
    const config = widget.query_config;

    if (config?.custom_query) {
      return await this.executeCustomQuery(config.custom_query, filters);
    }

    return null;
  }

  private async executeCustomQuery(query: string, filters?: any): Promise<any> {
    if (!query) return null;

    // Apply filters to query (simplified version)
    let processedQuery = query;
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        processedQuery = processedQuery.replace(`{{${key}}}`, value as string);
      });
    }

    try {
      const result = await this.pool.query(processedQuery);
      return result.rows;
    } catch (error) {
      console.error('Custom query execution failed:', error);
      return null;
    }
  }

  private async calculateMetricChange(companyId: number, metric: string): Promise<number> {
    const currentMonth = new Date();
    const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);

    let query: string;
    switch (metric) {
      case 'revenue':
        query = `
          SELECT
            SUM(CASE WHEN DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', CURRENT_DATE)
                     AND status = 'won' THEN amount ELSE 0 END) as current,
            SUM(CASE WHEN DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', $2::date)
                     AND status = 'won' THEN amount ELSE 0 END) as previous
          FROM opportunities
          WHERE company_id = $1
        `;
        break;

      case 'win_rate':
        query = `
          SELECT
            (COUNT(CASE WHEN DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', CURRENT_DATE)
                        AND status = 'won' THEN 1 END)::float /
             NULLIF(COUNT(CASE WHEN DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', CURRENT_DATE)
                               AND status IN ('won', 'lost') THEN 1 END), 0)) * 100 as current,
            (COUNT(CASE WHEN DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', $2::date)
                        AND status = 'won' THEN 1 END)::float /
             NULLIF(COUNT(CASE WHEN DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', $2::date)
                               AND status IN ('won', 'lost') THEN 1 END), 0)) * 100 as previous
          FROM opportunities
          WHERE company_id = $1
        `;
        break;

      default:
        return 0;
    }

    const result = await this.pool.query(query, [companyId, lastMonth]);
    const current = parseFloat(result.rows[0].current || 0);
    const previous = parseFloat(result.rows[0].previous || 0);

    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  async cloneDashboard(
    dashboardId: number,
    newName: string,
    userId?: number
  ): Promise<DashboardConfiguration> {
    return await this.dashboardRepository.cloneDashboard(dashboardId, newName, userId);
  }

  async setDefaultDashboard(dashboardId: number): Promise<DashboardConfiguration | null> {
    const dashboard = await this.dashboardRepository.findDashboardById(dashboardId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    // Unset other defaults
    await this.unsetDefaultDashboards(dashboard.company_id, dashboardId);

    // Set this as default
    return await this.dashboardRepository.updateDashboard(dashboardId, {
      is_default: true
    });
  }

  private async unsetDefaultDashboards(companyId: number, exceptId?: number): Promise<void> {
    const dashboards = await this.dashboardRepository.findDashboardsByCompany(companyId);

    for (const dashboard of dashboards) {
      if (dashboard.id !== exceptId && dashboard.is_default) {
        await this.dashboardRepository.updateDashboard(dashboard.id!, {
          is_default: false
        });
      }
    }
  }

  private validateDashboardConfig(dashboard: DashboardConfiguration): void {
    if (!dashboard.name || dashboard.name.trim() === '') {
      throw new Error('Dashboard name is required');
    }

    if (dashboard.refresh_interval && dashboard.refresh_interval < 60) {
      throw new Error('Refresh interval must be at least 60 seconds');
    }
  }

  private validateWidgetConfig(widget: DashboardWidget): void {
    if (!widget.widget_type) {
      throw new Error('Widget type is required');
    }

    if (!widget.dashboard_id) {
      throw new Error('Dashboard ID is required');
    }

    if (widget.width && (widget.width < 1 || widget.width > 12)) {
      throw new Error('Widget width must be between 1 and 12');
    }

    if (widget.height && (widget.height < 1 || widget.height > 12)) {
      throw new Error('Widget height must be between 1 and 12');
    }
  }

  clearCache(): void {
    this.widgetDataCache.clear();
  }
}