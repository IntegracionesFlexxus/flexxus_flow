import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../../container/types';
import { AnalyticsService } from '../services/AnalyticsService';
import { KpiService } from '../services/KpiService';
import { DashboardService } from '../services/DashboardService';

@injectable()
export class AnalyticsController {
  constructor(
    @inject(TYPES.AnalyticsService) private analyticsService: AnalyticsService,
    @inject(TYPES.KpiService) private kpiService: KpiService,
    @inject(TYPES.DashboardService) private dashboardService: DashboardService
  ) {}

  /**
   * Get company-wide analytics metrics
   */
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId || 1;
      const metrics = await this.analyticsService.getCompanyMetrics(companyId);

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get revenue trend data
   */
  async getRevenueTrend(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId || 1;
      const { period = 'monthly', startDate, endDate } = req.query;

      const trend = await this.analyticsService.getRevenueTrend(
        companyId,
        period as 'daily' | 'weekly' | 'monthly' | 'quarterly',
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: trend
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get conversion funnel data
   */
  async getConversionFunnel(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId || 1;
      const funnel = await this.analyticsService.getConversionFunnel(companyId);

      res.json({
        success: true,
        data: funnel
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get top performers
   */
  async getTopPerformers(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId || 1;
      const { metric = 'revenue', limit = '10' } = req.query;

      const performers = await this.analyticsService.getTopPerformers(
        companyId,
        metric as 'revenue' | 'deals' | 'activities',
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: performers
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Compare performance across periods
   */
  async comparePerformance(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId || 1;
      const { currentStart, currentEnd, previousStart, previousEnd } = req.query;

      if (!currentStart || !currentEnd || !previousStart || !previousEnd) {
        res.status(400).json({
          success: false,
          error: 'All period dates are required'
        });
        return;
      }

      const comparison = await this.analyticsService.getPerformanceComparison(
        companyId,
        {
          start: new Date(currentStart as string),
          end: new Date(currentEnd as string)
        },
        {
          start: new Date(previousStart as string),
          end: new Date(previousEnd as string)
        }
      );

      res.json({
        success: true,
        data: comparison
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get sales forecast
   */
  async getSalesForecast(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId || 1;
      const { months = '3' } = req.query;

      const forecast = await this.analyticsService.getSalesForecast(
        companyId,
        parseInt(months as string)
      );

      res.json({
        success: true,
        data: forecast
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get campaign ROI
   */
  async getCampaignROI(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId || 1;
      const { campaignId } = req.query;

      const roi = await this.analyticsService.getCampaignROI(
        companyId,
        campaignId ? parseInt(campaignId as string) : undefined
      );

      res.json({
        success: true,
        data: roi
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get all KPIs for the company
   */
  async getKpis(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId || 1;
      const { category } = req.query;

      const kpis = category
        ? await this.kpiService.getKpisByCategory(companyId, category as string)
        : await this.kpiService.getCompanyKpis(companyId);

      res.json({
        success: true,
        data: kpis
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get KPI dashboard
   */
  async getKpiDashboard(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId || 1;
      const { date } = req.query;

      const dashboard = await this.kpiService.getCompanyKpiDashboard(
        companyId,
        date ? new Date(date as string) : undefined
      );

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Calculate KPI value
   */
  async calculateKpi(req: Request, res: Response): Promise<void> {
    try {
      const { kpiId } = req.params;

      const snapshot = await this.kpiService.calculateKpiValue(parseInt(kpiId));

      res.json({
        success: true,
        data: snapshot
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get KPI trends
   */
  async getKpiTrends(req: Request, res: Response): Promise<void> {
    try {
      const { kpiId } = req.params;
      const { period = 'daily', days = '30' } = req.query;

      const trends = await this.kpiService.getKpiTrends(
        parseInt(kpiId),
        period as 'daily' | 'weekly' | 'monthly',
        parseInt(days as string)
      );

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get user dashboards
   */
  async getDashboards(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId || 1;
      const userId = req.user?.id || 1;

      const dashboards = await this.dashboardService.getUserDashboards(companyId, userId);

      res.json({
        success: true,
        data: dashboards
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get dashboard with data
   */
  async getDashboardWithData(req: Request, res: Response): Promise<void> {
    try {
      const { dashboardId } = req.params;
      const filters = req.query.filters ? JSON.parse(req.query.filters as string) : undefined;

      const dashboard = await this.dashboardService.getDashboardWithData(
        parseInt(dashboardId),
        filters
      );

      if (!dashboard) {
        res.status(404).json({
          success: false,
          error: 'Dashboard not found'
        });
        return;
      }

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Create a new dashboard
   */
  async createDashboard(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId || 1;
      const userId = req.user?.id || 1;

      const dashboardData = {
        ...req.body,
        company_id: companyId,
        user_id: userId
      };

      const dashboard = await this.dashboardService.createDashboard(dashboardData);

      res.status(201).json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Update dashboard
   */
  async updateDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { dashboardId } = req.params;

      const dashboard = await this.dashboardService.updateDashboard(
        parseInt(dashboardId),
        req.body
      );

      if (!dashboard) {
        res.status(404).json({
          success: false,
          error: 'Dashboard not found'
        });
        return;
      }

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { dashboardId } = req.params;

      const deleted = await this.dashboardService.deleteDashboard(parseInt(dashboardId));

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Dashboard not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Dashboard deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Clone dashboard
   */
  async cloneDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { dashboardId } = req.params;
      const { name } = req.body;
      const userId = req.user?.id || 1;

      if (!name) {
        res.status(400).json({
          success: false,
          error: 'New dashboard name is required'
        });
        return;
      }

      const cloned = await this.dashboardService.cloneDashboard(
        parseInt(dashboardId),
        name,
        userId
      );

      res.status(201).json({
        success: true,
        data: cloned
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Add widget to dashboard
   */
  async addWidget(req: Request, res: Response): Promise<void> {
    try {
      const { dashboardId } = req.params;

      const widgetData = {
        ...req.body,
        dashboard_id: parseInt(dashboardId)
      };

      const widget = await this.dashboardService.addWidget(widgetData);

      res.status(201).json({
        success: true,
        data: widget
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Update widget
   */
  async updateWidget(req: Request, res: Response): Promise<void> {
    try {
      const { widgetId } = req.params;

      const widget = await this.dashboardService.updateWidget(
        parseInt(widgetId),
        req.body
      );

      if (!widget) {
        res.status(404).json({
          success: false,
          error: 'Widget not found'
        });
        return;
      }

      res.json({
        success: true,
        data: widget
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Delete widget
   */
  async deleteWidget(req: Request, res: Response): Promise<void> {
    try {
      const { widgetId } = req.params;

      const deleted = await this.dashboardService.deleteWidget(parseInt(widgetId));

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Widget not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Widget deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }
}