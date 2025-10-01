/**
 * Dashboard Service - Sprint 08
 * Manages dashboards and widgets for analytics visualization
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { WebSocketHandler } from '../websocket/OmniWebSocketHandler';
import { RealTimeAnalytics } from '../analytics/RealTimeAnalytics';

export interface IDashboard {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  category?: string;
  layout: ILayoutConfig;
  widgets: IWidget[];
  filters: IDashboardFilter[];
  theme?: ITheme;
  refresh_interval: number;
  is_default?: boolean;
  is_public?: boolean;
  is_template?: boolean;
  shared_with?: string[];
  tags?: string[];
  created_by?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface ILayoutConfig {
  type: 'grid' | 'flex' | 'masonry';
  columns: number;
  rows: number;
  gap?: number;
  responsive?: boolean;
}

export interface IWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'map' | 'timeline' | 'alert' | 'text' | 'image' | 'custom';
  title: string;
  subtitle?: string;
  data_source: IDataSource;
  visualization: IVisualization;
  position: { x: number; y: number; width: number; height: number };
  refresh_interval?: number;
  cache_ttl?: number;
  interactions?: IWidgetInteraction[];
  styling?: any;
  is_visible?: boolean;
  order_index?: number;
}

export interface IDataSource {
  type: 'query' | 'api' | 'realtime' | 'cached' | 'static';
  source: string;
  parameters?: Map<string, any>;
  aggregation?: IAggregationConfig;
  filters?: any[];
}

export interface IVisualization {
  type: 'line' | 'bar' | 'pie' | 'donut' | 'heatmap' | 'scatter' | 'area' | 'gauge' | 'number' | 'table';
  config: any;
  colors?: string[];
  legend?: boolean;
  animations?: boolean;
}

export interface IDashboardFilter {
  field: string;
  operator: string;
  value: any;
  label?: string;
}

export interface ITheme {
  primary_color?: string;
  background?: string;
  dark_mode?: boolean;
  font_family?: string;
}

export interface IWidgetInteraction {
  type: 'click' | 'hover' | 'drill_down';
  action: string;
  target?: string;
  parameters?: any;
}

export interface IAggregationConfig {
  type: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'median';
  field: string;
  group_by?: string[];
}

interface IWidgetData {
  widget_id: string;
  data: any;
  timestamp: Date;
  cached_until?: Date;
}

@injectable()
export class DashboardService {
  private logger: any;
  private widgetDataCache: Map<string, IWidgetData> = new Map();
  private dashboardCache: Map<string, IDashboard> = new Map();
  private updateIntervals: Map<string, NodeJS.Timer> = new Map();

  constructor(
    @inject(TYPES.AnalyticsConnection) private pool: Pool,
    @inject(TYPES.OmniWebSocketHandler) private wsHandler: WebSocketHandler,
    @inject(TYPES.OmniRealTimeAnalytics) private analytics: RealTimeAnalytics
  ) {
    this.logger = LoggerFactory.create({ file: __filename });
    this.setupRealtimeUpdates();
  }

  /**
   * Create a new dashboard
   */
  async createDashboard(data: Partial<IDashboard>, companyId: string): Promise<IDashboard> {
    try {
      const query = `
        INSERT INTO dashboards (
          company_id, name, description, category, layout,
          widgets, filters, theme, refresh_interval,
          is_default, is_public, is_template, shared_with, tags, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *;
      `;

      const params = [
        companyId,
        data.name,
        data.description,
        data.category,
        JSON.stringify(data.layout || { type: 'grid', columns: 12, rows: 8 }),
        JSON.stringify(data.widgets || []),
        JSON.stringify(data.filters || []),
        JSON.stringify(data.theme || {}),
        data.refresh_interval || 60,
        data.is_default || false,
        data.is_public || false,
        data.is_template || false,
        JSON.stringify(data.shared_with || []),
        JSON.stringify(data.tags || []),
        data.created_by
      ];

      const result = await this.pool.query(query, params);
      const dashboard = this.mapToDashboard(result.rows[0]);

      // Start auto-refresh if needed
      if (dashboard.refresh_interval > 0) {
        this.startAutoRefresh(dashboard);
      }

      this.logger.info('Dashboard created', {
        dashboardId: dashboard.id,
        companyId
      });

      return dashboard;
    } catch (error: any) {
      this.logger.error('Failed to create dashboard', error);
      throw error;
    }
  }

  /**
   * Get dashboard by ID
   */
  async getDashboard(dashboardId: string, companyId: string): Promise<IDashboard | null> {
    // Check cache
    if (this.dashboardCache.has(dashboardId)) {
      return this.dashboardCache.get(dashboardId)!;
    }

    try {
      const query = `
        SELECT * FROM dashboards
        WHERE id = $1 AND company_id = $2;
      `;

      const result = await this.pool.query(query, [dashboardId, companyId]);

      if (result.rows.length === 0) {
        return null;
      }

      const dashboard = this.mapToDashboard(result.rows[0]);

      // Load widgets
      dashboard.widgets = await this.loadWidgets(dashboardId, companyId);

      // Cache dashboard
      this.dashboardCache.set(dashboardId, dashboard);

      return dashboard;
    } catch (error: any) {
      this.logger.error('Failed to get dashboard', error);
      throw error;
    }
  }

  /**
   * Update dashboard
   */
  async updateDashboard(
    dashboardId: string,
    updates: Partial<IDashboard>,
    companyId: string
  ): Promise<IDashboard> {
    try {
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        params.push(updates.name);
      }

      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        params.push(updates.description);
      }

      if (updates.layout !== undefined) {
        updateFields.push(`layout = $${paramIndex++}`);
        params.push(JSON.stringify(updates.layout));
      }

      if (updates.filters !== undefined) {
        updateFields.push(`filters = $${paramIndex++}`);
        params.push(JSON.stringify(updates.filters));
      }

      if (updates.theme !== undefined) {
        updateFields.push(`theme = $${paramIndex++}`);
        params.push(JSON.stringify(updates.theme));
      }

      if (updates.refresh_interval !== undefined) {
        updateFields.push(`refresh_interval = $${paramIndex++}`);
        params.push(updates.refresh_interval);
      }

      params.push(dashboardId, companyId);

      const query = `
        UPDATE dashboards
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1}
        RETURNING *;
      `;

      const result = await this.pool.query(query, params);
      const dashboard = this.mapToDashboard(result.rows[0]);

      // Clear cache
      this.dashboardCache.delete(dashboardId);

      // Update auto-refresh
      if (updates.refresh_interval !== undefined) {
        this.stopAutoRefresh(dashboardId);
        if (updates.refresh_interval > 0) {
          this.startAutoRefresh(dashboard);
        }
      }

      // Emit update event
      this.wsHandler.emitDashboardUpdate(dashboardId, {
        type: 'dashboard_updated',
        dashboard
      });

      return dashboard;
    } catch (error: any) {
      this.logger.error('Failed to update dashboard', error);
      throw error;
    }
  }

  /**
   * Add widget to dashboard
   */
  async addWidget(
    dashboardId: string,
    widget: IWidget,
    companyId: string
  ): Promise<IWidget> {
    try {
      const query = `
        INSERT INTO widgets (
          company_id, dashboard_id, type, title, subtitle,
          data_source, visualization, position, refresh_interval,
          cache_ttl, interactions, styling, is_visible, order_index
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *;
      `;

      const params = [
        companyId,
        dashboardId,
        widget.type,
        widget.title,
        widget.subtitle,
        JSON.stringify(widget.data_source),
        JSON.stringify(widget.visualization),
        JSON.stringify(widget.position),
        widget.refresh_interval,
        widget.cache_ttl || 60,
        JSON.stringify(widget.interactions || []),
        JSON.stringify(widget.styling || {}),
        widget.is_visible !== false,
        widget.order_index || 0
      ];

      const result = await this.pool.query(query, params);
      const newWidget = this.mapToWidget(result.rows[0]);

      // Load initial data
      await this.loadWidgetData(newWidget, companyId);

      // Clear dashboard cache
      this.dashboardCache.delete(dashboardId);

      // Emit widget added event
      this.wsHandler.emitDashboardUpdate(dashboardId, {
        type: 'widget_added',
        widget: newWidget
      });

      return newWidget;
    } catch (error: any) {
      this.logger.error('Failed to add widget', error);
      throw error;
    }
  }

  /**
   * Update widget
   */
  async updateWidget(
    dashboardId: string,
    widgetId: string,
    updates: Partial<IWidget>,
    companyId: string
  ): Promise<IWidget> {
    try {
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (updates.title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        params.push(updates.title);
      }

      if (updates.data_source !== undefined) {
        updateFields.push(`data_source = $${paramIndex++}`);
        params.push(JSON.stringify(updates.data_source));
      }

      if (updates.visualization !== undefined) {
        updateFields.push(`visualization = $${paramIndex++}`);
        params.push(JSON.stringify(updates.visualization));
      }

      if (updates.position !== undefined) {
        updateFields.push(`position = $${paramIndex++}`);
        params.push(JSON.stringify(updates.position));
      }

      params.push(widgetId, dashboardId, companyId);

      const query = `
        UPDATE widgets
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex} AND dashboard_id = $${paramIndex + 1} AND company_id = $${paramIndex + 2}
        RETURNING *;
      `;

      const result = await this.pool.query(query, params);
      const widget = this.mapToWidget(result.rows[0]);

      // Clear widget data cache
      this.widgetDataCache.delete(widgetId);

      // Reload widget data
      await this.loadWidgetData(widget, companyId);

      // Emit widget update event
      this.wsHandler.emitDashboardUpdate(dashboardId, {
        type: 'widget_updated',
        widget
      });

      return widget;
    } catch (error: any) {
      this.logger.error('Failed to update widget', error);
      throw error;
    }
  }

  /**
   * Delete widget
   */
  async deleteWidget(
    dashboardId: string,
    widgetId: string,
    companyId: string
  ): Promise<boolean> {
    try {
      const query = `
        DELETE FROM widgets
        WHERE id = $1 AND dashboard_id = $2 AND company_id = $3;
      `;

      const result = await this.pool.query(query, [widgetId, dashboardId, companyId]);

      if (result.rowCount > 0) {
        // Clear caches
        this.widgetDataCache.delete(widgetId);
        this.dashboardCache.delete(dashboardId);

        // Emit widget removed event
        this.wsHandler.emitDashboardUpdate(dashboardId, {
          type: 'widget_removed',
          widgetId
        });

        return true;
      }

      return false;
    } catch (error: any) {
      this.logger.error('Failed to delete widget', error);
      throw error;
    }
  }

  /**
   * Get widget data
   */
  async getWidgetData(widgetId: string, companyId: string): Promise<any> {
    // Check cache
    const cached = this.widgetDataCache.get(widgetId);
    if (cached && cached.cached_until && cached.cached_until > new Date()) {
      return cached.data;
    }

    try {
      // Get widget configuration
      const widgetQuery = `
        SELECT * FROM widgets
        WHERE id = $1 AND company_id = $2;
      `;

      const widgetResult = await this.pool.query(widgetQuery, [widgetId, companyId]);

      if (widgetResult.rows.length === 0) {
        throw new Error(`Widget not found: ${widgetId}`);
      }

      const widget = this.mapToWidget(widgetResult.rows[0]);

      // Load widget data based on source type
      const data = await this.loadWidgetData(widget, companyId);

      return data;
    } catch (error: any) {
      this.logger.error('Failed to get widget data', error);
      throw error;
    }
  }

  /**
   * Load widgets for a dashboard
   */
  private async loadWidgets(dashboardId: string, companyId: string): Promise<IWidget[]> {
    const query = `
      SELECT * FROM widgets
      WHERE dashboard_id = $1 AND company_id = $2
      ORDER BY order_index, created_at;
    `;

    const result = await this.pool.query(query, [dashboardId, companyId]);
    return result.rows.map(row => this.mapToWidget(row));
  }

  /**
   * Load widget data
   */
  private async loadWidgetData(widget: IWidget, companyId: string): Promise<any> {
    let data: any;

    switch (widget.data_source.type) {
      case 'realtime':
        data = await this.loadRealtimeData(widget, companyId);
        break;

      case 'query':
        data = await this.loadQueryData(widget, companyId);
        break;

      case 'cached':
        data = await this.loadCachedData(widget, companyId);
        break;

      case 'static':
        data = widget.data_source.parameters;
        break;

      default:
        data = {};
    }

    // Cache data
    this.widgetDataCache.set(widget.id, {
      widget_id: widget.id,
      data,
      timestamp: new Date(),
      cached_until: new Date(Date.now() + (widget.cache_ttl || 60) * 1000)
    });

    return data;
  }

  /**
   * Load realtime data
   */
  private async loadRealtimeData(widget: IWidget, companyId: string): Promise<any> {
    const metrics = await this.analytics.aggregate(companyId, 'hour');

    // Extract specific metric based on widget source
    const metricName = widget.data_source.source;
    const metricValue = (metrics.metrics as any)[metricName] || 0;

    return {
      value: metricValue,
      timestamp: new Date(),
      trend: this.calculateTrend(metricValue)
    };
  }

  /**
   * Load query data
   */
  private async loadQueryData(widget: IWidget, companyId: string): Promise<any> {
    // Execute custom query (simplified for security)
    const query = widget.data_source.source;
    const params = Array.from(widget.data_source.parameters?.values() || []);

    try {
      const result = await this.pool.query(query, [companyId, ...params]);
      return result.rows;
    } catch (error: any) {
      this.logger.error('Failed to execute widget query', error);
      return [];
    }
  }

  /**
   * Load cached data
   */
  private async loadCachedData(widget: IWidget, companyId: string): Promise<any> {
    // Check if we have cached data
    const cached = this.widgetDataCache.get(widget.id);
    if (cached && cached.cached_until && cached.cached_until > new Date()) {
      return cached.data;
    }

    // Otherwise load fresh data
    return this.loadQueryData(widget, companyId);
  }

  /**
   * Calculate trend
   */
  private calculateTrend(currentValue: number): string {
    // Mock trend calculation
    const random = Math.random();
    if (random < 0.33) return 'up';
    if (random < 0.67) return 'down';
    return 'stable';
  }

  /**
   * Setup realtime updates
   */
  private setupRealtimeUpdates(): void {
    // Subscribe to analytics events
    this.analytics.on('metric-update', (update) => {
      // Find widgets that use this metric
      this.widgetDataCache.forEach((cached, widgetId) => {
        // Emit update to relevant dashboards
        this.wsHandler.emitDashboardUpdate('', {
          type: 'widget_data_update',
          widgetId,
          data: update
        });
      });
    });
  }

  /**
   * Start auto-refresh for dashboard
   */
  private startAutoRefresh(dashboard: IDashboard): void {
    if (dashboard.refresh_interval <= 0) return;

    const interval = setInterval(async () => {
      try {
        // Refresh all widgets
        for (const widget of dashboard.widgets) {
          const data = await this.loadWidgetData(widget, dashboard.company_id);

          // Emit update
          this.wsHandler.emitDashboardUpdate(dashboard.id, {
            type: 'widget_data_refresh',
            widgetId: widget.id,
            data
          });
        }
      } catch (error) {
        this.logger.error('Auto-refresh error', error);
      }
    }, dashboard.refresh_interval * 1000);

    this.updateIntervals.set(dashboard.id, interval);
  }

  /**
   * Stop auto-refresh
   */
  private stopAutoRefresh(dashboardId: string): void {
    const interval = this.updateIntervals.get(dashboardId);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(dashboardId);
    }
  }

  /**
   * Map database row to Dashboard
   */
  private mapToDashboard(row: any): IDashboard {
    return {
      id: row.id,
      company_id: row.company_id,
      name: row.name,
      description: row.description,
      category: row.category,
      layout: row.layout,
      widgets: row.widgets || [],
      filters: row.filters || [],
      theme: row.theme,
      refresh_interval: row.refresh_interval,
      is_default: row.is_default,
      is_public: row.is_public,
      is_template: row.is_template,
      shared_with: row.shared_with,
      tags: row.tags,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Map database row to Widget
   */
  private mapToWidget(row: any): IWidget {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      subtitle: row.subtitle,
      data_source: row.data_source,
      visualization: row.visualization,
      position: row.position,
      refresh_interval: row.refresh_interval,
      cache_ttl: row.cache_ttl,
      interactions: row.interactions,
      styling: row.styling,
      is_visible: row.is_visible,
      order_index: row.order_index
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Stop all auto-refresh intervals
    this.updateIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.updateIntervals.clear();

    // Clear caches
    this.widgetDataCache.clear();
    this.dashboardCache.clear();

    this.logger.info('DashboardService cleaned up');
  }
}