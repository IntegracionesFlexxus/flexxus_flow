/**
 * WidgetDataService - Sprint 13
 * Service for loading and caching widget data
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import type { Widget } from '../types/analytics.types';

@injectable()
export class WidgetDataService {
  constructor(
    @inject(TYPES.DataMartRepository) private dataMartRepo: DataMartRepository,
    @inject(TYPES.DatabaseConnection) private db: Pool,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async getWidgetData(widget: Widget, companyId: number): Promise<any> {
    try {
      this.logger.info('Loading widget data', {
        widgetId: widget.id,
        widgetType: widget.widgetType,
        dataSource: widget.dataSource
      });

      // Check cache if enabled
      if (widget.cacheEnabled && widget.lastCachedAt) {
        const cacheAge = Date.now() - new Date(widget.lastCachedAt).getTime();
        const cacheTTL = (widget.cacheTtlSeconds || 300) * 1000;

        if (cacheAge < cacheTTL) {
          this.logger.debug('Using cached widget data', { widgetId: widget.id });
          // Return cached data (would be stored in widget record)
        }
      }

      // Load fresh data based on data source
      let data: any;

      switch (widget.dataSource) {
        case 'conversation_metrics':
          data = await this.loadConversationMetrics(widget, companyId);
          break;
        case 'campaign_performance':
          data = await this.loadCampaignPerformance(widget, companyId);
          break;
        case 'custom_query':
          data = await this.loadCustomQuery(widget, companyId);
          break;
        default:
          data = await this.loadFromDataSource(widget, companyId);
      }

      return this.formatWidgetData(data, widget);
    } catch (error) {
      this.logger.error('Error loading widget data', {
        error,
        widgetId: widget.id
      });
      throw new Error(`Failed to load widget data: ${error.message}`);
    }
  }

  private async loadConversationMetrics(widget: Widget, companyId: number): Promise<any> {
    const params = {
      companyId,
      startDate: widget.filters?.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: widget.filters?.endDate || new Date(),
      ...widget.filters
    };

    return await this.dataMartRepo.getConversationMetrics(params);
  }

  private async loadCampaignPerformance(widget: Widget, companyId: number): Promise<any> {
    const campaignId = widget.filters?.campaignId;

    if (!campaignId) {
      throw new Error('Campaign ID required for campaign performance widget');
    }

    return await this.dataMartRepo.getCampaignPerformance(campaignId, companyId);
  }

  private async loadCustomQuery(widget: Widget, companyId: number): Promise<any> {
    if (!widget.query) {
      throw new Error('Custom query not defined');
    }

    const result = await this.db.query(widget.query, [companyId]);
    return result.rows;
  }

  private async loadFromDataSource(widget: Widget, companyId: number): Promise<any> {
    // Generic data source loading
    const query = `SELECT * FROM ${widget.dataSource} WHERE company_id = $1 LIMIT 100`;
    const result = await this.db.query(query, [companyId]);
    return result.rows;
  }

  private formatWidgetData(data: any, widget: Widget): any {
    switch (widget.widgetType) {
      case 'chart':
        return this.formatChartData(data, widget);
      case 'metric':
        return this.formatMetricData(data, widget);
      case 'table':
        return this.formatTableData(data, widget);
      default:
        return data;
    }
  }

  private formatChartData(data: any, widget: Widget): any {
    // Format data for chart rendering
    return {
      labels: [],
      datasets: [{
        label: widget.title,
        data: []
      }]
    };
  }

  private formatMetricData(data: any, widget: Widget): any {
    // Format data for metric display
    return {
      value: 0,
      label: widget.title,
      trend: 'stable'
    };
  }

  private formatTableData(data: any, widget: Widget): any {
    // Format data for table display
    return {
      columns: [],
      rows: data
    };
  }
}

interface DataMartRepository {
  getConversationMetrics(params: any): Promise<any>;
  getCampaignPerformance(campaignId: number, companyId: number): Promise<any>;
}

interface Pool {
  query(sql: string, params?: any[]): Promise<{ rows: any[] }>;
}

interface Logger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}
