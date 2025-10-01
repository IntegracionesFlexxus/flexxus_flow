/**
 * DashboardService - Sprint 13
 * Service for dashboard and widget management
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import type {
  Dashboard,
  Widget,
  CreateDashboardDto,
  UpdateDashboardDto,
  CreateWidgetDto,
  UpdateWidgetDto,
  DashboardData,
  LayoutConfig
} from '../types/analytics.types';

@injectable()
export class DashboardService {
  constructor(
    @inject(TYPES.AnalyticsDashboardRepository) private dashboardRepo: DashboardRepository,
    @inject(TYPES.WidgetRepository) private widgetRepo: WidgetRepository,
    @inject(TYPES.WidgetDataService) private widgetDataService: WidgetDataService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Create a new dashboard
   */
  async createDashboard(
    data: CreateDashboardDto,
    companyId: number,
    userId: number
  ): Promise<Dashboard> {
    try {
      this.logger.info('Creating dashboard', { name: data.name, companyId, userId });

      const dashboard = await this.dashboardRepo.create(data, companyId, userId);

      this.logger.info('Dashboard created', { dashboardId: dashboard.id });

      return dashboard;
    } catch (error) {
      this.logger.error('Error creating dashboard', { error, data });
      throw new Error(`Failed to create dashboard: ${error.message}`);
    }
  }

  /**
   * Get dashboard by ID with widgets
   */
  async getDashboard(id: number, companyId: number): Promise<Dashboard | null> {
    try {
      this.logger.info('Getting dashboard', { id, companyId });

      const dashboard = await this.dashboardRepo.findById(id, companyId);

      if (!dashboard) {
        return null;
      }

      // Load widgets
      const widgets = await this.dashboardRepo.getWidgets(id, companyId);
      dashboard.widgets = widgets;

      // Increment view count
      await this.dashboardRepo.incrementViewCount(id);

      return dashboard;
    } catch (error) {
      this.logger.error('Error getting dashboard', { error, id });
      throw new Error(`Failed to get dashboard: ${error.message}`);
    }
  }

  /**
   * Get dashboard data (with widget data loaded)
   */
  async getDashboardData(id: number, companyId: number): Promise<DashboardData | null> {
    try {
      this.logger.info('Getting dashboard data', { id, companyId });

      const dashboard = await this.getDashboard(id, companyId);

      if (!dashboard) {
        return null;
      }

      // Load data for each widget
      const widgetData: Record<number, any> = {};

      for (const widget of dashboard.widgets as Widget[]) {
        try {
          const data = await this.widgetDataService.getWidgetData(widget, companyId);
          widgetData[widget.id] = data;
        } catch (error) {
          this.logger.warn('Error loading widget data', {
            error,
            widgetId: widget.id
          });
          widgetData[widget.id] = { error: error.message };
        }
      }

      return {
        dashboard,
        widgetData,
        loadedAt: new Date()
      };
    } catch (error) {
      this.logger.error('Error getting dashboard data', { error, id });
      throw new Error(`Failed to get dashboard data: ${error.message}`);
    }
  }

  /**
   * Get all dashboards for a company
   */
  async getDashboardsByCompany(companyId: number, userId?: number): Promise<Dashboard[]> {
    try {
      this.logger.info('Getting dashboards by company', { companyId, userId });

      return await this.dashboardRepo.findByCompany(companyId, userId);
    } catch (error) {
      this.logger.error('Error getting dashboards', { error, companyId });
      throw new Error(`Failed to get dashboards: ${error.message}`);
    }
  }

  /**
   * Update dashboard
   */
  async updateDashboard(
    id: number,
    data: UpdateDashboardDto,
    companyId: number
  ): Promise<Dashboard> {
    try {
      this.logger.info('Updating dashboard', { id, companyId });

      const dashboard = await this.dashboardRepo.update(id, data, companyId);

      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      return dashboard;
    } catch (error) {
      this.logger.error('Error updating dashboard', { error, id });
      throw new Error(`Failed to update dashboard: ${error.message}`);
    }
  }

  /**
   * Delete dashboard (soft delete)
   */
  async deleteDashboard(id: number, companyId: number): Promise<void> {
    try {
      this.logger.info('Deleting dashboard', { id, companyId });

      await this.dashboardRepo.delete(id, companyId);

      this.logger.info('Dashboard deleted', { id });
    } catch (error) {
      this.logger.error('Error deleting dashboard', { error, id });
      throw new Error(`Failed to delete dashboard: ${error.message}`);
    }
  }

  /**
   * Update dashboard layout
   */
  async updateLayout(id: number, layout: LayoutConfig, companyId: number): Promise<Dashboard> {
    try {
      this.logger.info('Updating dashboard layout', { id, companyId });

      const dashboard = await this.dashboardRepo.updateLayout(id, layout, companyId);

      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      return dashboard;
    } catch (error) {
      this.logger.error('Error updating layout', { error, id });
      throw new Error(`Failed to update layout: ${error.message}`);
    }
  }

  /**
   * Add widget to dashboard
   */
  async addWidget(
    dashboardId: number,
    widgetData: CreateWidgetDto,
    companyId: number
  ): Promise<Widget> {
    try {
      this.logger.info('Adding widget to dashboard', { dashboardId, companyId });

      const widget = await this.dashboardRepo.createWidget(dashboardId, widgetData, companyId);

      this.logger.info('Widget added', { widgetId: widget.id, dashboardId });

      return widget;
    } catch (error) {
      this.logger.error('Error adding widget', { error, dashboardId });
      throw new Error(`Failed to add widget: ${error.message}`);
    }
  }

  /**
   * Update widget
   */
  async updateWidget(
    id: number,
    data: UpdateWidgetDto,
    companyId: number
  ): Promise<Widget> {
    try {
      this.logger.info('Updating widget', { id, companyId });

      const widget = await this.dashboardRepo.updateWidget(id, data, companyId);

      if (!widget) {
        throw new Error('Widget not found');
      }

      return widget;
    } catch (error) {
      this.logger.error('Error updating widget', { error, id });
      throw new Error(`Failed to update widget: ${error.message}`);
    }
  }

  /**
   * Delete widget
   */
  async deleteWidget(id: number, companyId: number): Promise<void> {
    try {
      this.logger.info('Deleting widget', { id, companyId });

      await this.dashboardRepo.deleteWidget(id, companyId);

      this.logger.info('Widget deleted', { id });
    } catch (error) {
      this.logger.error('Error deleting widget', { error, id });
      throw new Error(`Failed to delete widget: ${error.message}`);
    }
  }

  /**
   * Clone dashboard
   */
  async cloneDashboard(
    id: number,
    companyId: number,
    userId: number,
    newName?: string
  ): Promise<Dashboard> {
    try {
      this.logger.info('Cloning dashboard', { id, companyId });

      // Get original dashboard with widgets
      const original = await this.getDashboard(id, companyId);

      if (!original) {
        throw new Error('Dashboard not found');
      }

      // Create new dashboard
      const clonedData: CreateDashboardDto = {
        name: newName || `${original.name} (Copy)`,
        description: original.description,
        type: original.type,
        layoutConfig: original.layoutConfig,
        filters: original.filters,
        refreshIntervalSeconds: original.refreshIntervalSeconds,
        isPublic: false
      };

      const cloned = await this.createDashboard(clonedData, companyId, userId);

      // Clone widgets
      for (const widget of original.widgets as Widget[]) {
        const widgetData: CreateWidgetDto = {
          widgetType: widget.widgetType,
          title: widget.title,
          dataSource: widget.dataSource,
          positionX: widget.positionX,
          positionY: widget.positionY,
          width: widget.width,
          height: widget.height,
          query: widget.query,
          metrics: widget.metrics,
          dimensions: widget.dimensions,
          filters: widget.filters,
          chartType: widget.chartType,
          chartConfig: widget.chartConfig,
          colorScheme: widget.colorScheme,
          cacheEnabled: widget.cacheEnabled,
          cacheTtlSeconds: widget.cacheTtlSeconds
        };

        await this.addWidget(cloned.id, widgetData, companyId);
      }

      return cloned;
    } catch (error) {
      this.logger.error('Error cloning dashboard', { error, id });
      throw new Error(`Failed to clone dashboard: ${error.message}`);
    }
  }

  /**
   * Refresh widget cache
   */
  async refreshWidgetCache(widgetId: number, companyId: number): Promise<void> {
    try {
      this.logger.info('Refreshing widget cache', { widgetId });

      const widget = await this.widgetRepo.findById(widgetId);

      if (!widget) {
        throw new Error('Widget not found');
      }

      const data = await this.widgetDataService.getWidgetData(widget, companyId);

      await this.dashboardRepo.updateCache(
        widgetId,
        data,
        widget.cacheTtlSeconds
      );

      this.logger.info('Widget cache refreshed', { widgetId });
    } catch (error) {
      this.logger.error('Error refreshing widget cache', { error, widgetId });
      throw new Error(`Failed to refresh widget cache: ${error.message}`);
    }
  }
}

interface DashboardRepository {
  create(data: CreateDashboardDto, companyId: number, userId: number): Promise<Dashboard>;
  findById(id: number, companyId: number): Promise<Dashboard | null>;
  findByCompany(companyId: number, userId?: number): Promise<Dashboard[]>;
  update(id: number, data: UpdateDashboardDto, companyId: number): Promise<Dashboard | null>;
  delete(id: number, companyId: number): Promise<void>;
  getWidgets(dashboardId: number, companyId: number): Promise<Widget[]>;
  updateLayout(dashboardId: number, layout: LayoutConfig, companyId: number): Promise<Dashboard | null>;
  incrementViewCount(dashboardId: number): Promise<void>;
  createWidget(dashboardId: number, data: CreateWidgetDto, companyId: number): Promise<Widget>;
  updateWidget(id: number, data: UpdateWidgetDto, companyId: number): Promise<Widget | null>;
  deleteWidget(id: number, companyId: number): Promise<void>;
  updateCache(widgetId: number, cachedData: any, ttl: number): Promise<void>;
}

interface WidgetRepository {
  findById(id: number): Promise<Widget | null>;
}

interface WidgetDataService {
  getWidgetData(widget: Widget, companyId: number): Promise<any>;
}

interface Logger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}
