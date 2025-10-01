/**
 * Analytics Controller - Sprint 08
 * REST API endpoints for analytics and metrics
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { RealTimeAnalytics } from '../analytics/RealTimeAnalytics';
import { ReportingService } from '../reporting/ReportingService';
import { DashboardService } from '../dashboard/DashboardService';
import { KPIService } from '../kpi/KPIService';
import { PredictionEngine } from '../predictions/PredictionEngine';
import { DataPipeline } from '../pipeline/DataPipeline';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

@injectable()
export class AnalyticsController {
  private logger: any;

  constructor(
    @inject(TYPES.RealTimeAnalytics) private analytics: RealTimeAnalytics,
    @inject(TYPES.ReportingService) private reporting: ReportingService,
    @inject(TYPES.OmniDashboardServiceLegacy) private dashboards: DashboardService,
    @inject(TYPES.KPIService) private kpis: KPIService,
    @inject(TYPES.PredictionEngine) private predictions: PredictionEngine,
    @inject(TYPES.DataPipeline) private pipeline: DataPipeline
  ) {
    this.logger = LoggerFactory.create({ file: __filename });
  }

  /**
   * Collect analytics event
   */
  async collectEvent(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const event = {
        ...req.body,
        company_id: companyId,
        user_id: req.user?.id,
        timestamp: new Date()
      };

      await this.analytics.collect(event);
      
      res.status(201).json({
        success: true,
        message: 'Event collected successfully'
      });
    } catch (error: any) {
      this.logger.error('Failed to collect event', error);
      res.status(500).json({
        success: false,
        error: 'Failed to collect event'
      });
    }
  }

  /**
   * Get aggregated metrics
   */
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const { timeWindow = 'hour', startTime, endTime } = req.query;

      const metrics = await this.analytics.aggregate(
        companyId,
        timeWindow as any,
        startTime ? new Date(startTime as string) : undefined,
        endTime ? new Date(endTime as string) : undefined
      );

      res.json({
        success: true,
        data: metrics
      });
    } catch (error: any) {
      this.logger.error('Failed to get metrics', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get metrics'
      });
    }
  }

  /**
   * Get time series data
   */
  async getTimeSeries(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const { metric, startTime, endTime, granularity = 'hour' } = req.query;

      if (!metric) {
        res.status(400).json({
          success: false,
          error: 'Metric name is required'
        });
        return;
      }

      const timeSeries = await this.analytics.getTimeSeries(
        companyId,
        metric as string,
        new Date(startTime as string),
        new Date(endTime as string),
        granularity as any
      );

      res.json({
        success: true,
        data: timeSeries
      });
    } catch (error: any) {
      this.logger.error('Failed to get time series', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get time series'
      });
    }
  }

  /**
   * Create report
   */
  async createReport(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const report = await this.reporting.createReport(companyId, req.body);

      res.status(201).json({
        success: true,
        data: report
      });
    } catch (error: any) {
      this.logger.error('Failed to create report', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create report'
      });
    }
  }

  /**
   * Generate report
   */
  async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const { format = 'json', parameters } = req.body;

      const result = await this.reporting.generate(
        reportId,
        format as any,
        parameters
      );

      if (format === 'pdf' || format === 'excel') {
        res.setHeader('Content-Type', 
          format === 'pdf' ? 'application/pdf' : 'application/vnd.ms-excel');
        res.setHeader('Content-Disposition', 
          `attachment; filename="report-${reportId}.${format === 'pdf' ? 'pdf' : 'xlsx'}"`);
        res.send(result.content);
      } else {
        res.json({
          success: true,
          data: result
        });
      }
    } catch (error: any) {
      this.logger.error('Failed to generate report', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate report'
      });
    }
  }

  /**
   * Schedule report
   */
  async scheduleReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const schedule = await this.reporting.schedule(reportId, req.body);

      res.json({
        success: true,
        data: schedule
      });
    } catch (error: any) {
      this.logger.error('Failed to schedule report', error);
      res.status(500).json({
        success: false,
        error: 'Failed to schedule report'
      });
    }
  }

  /**
   * Create dashboard
   */
  async createDashboard(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const dashboard = await this.dashboards.createDashboard(companyId, req.body);

      res.status(201).json({
        success: true,
        data: dashboard
      });
    } catch (error: any) {
      this.logger.error('Failed to create dashboard', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create dashboard'
      });
    }
  }

  /**
   * Get dashboard
   */
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { dashboardId } = req.params;
      const dashboard = await this.dashboards.getDashboard(dashboardId);

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error: any) {
      this.logger.error('Failed to get dashboard', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard'
      });
    }
  }

  /**
   * Add widget to dashboard
   */
  async addWidget(req: Request, res: Response): Promise<void> {
    try {
      const { dashboardId } = req.params;
      const widget = await this.dashboards.addWidget(dashboardId, req.body);

      res.status(201).json({
        success: true,
        data: widget
      });
    } catch (error: any) {
      this.logger.error('Failed to add widget', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add widget'
      });
    }
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const { dashboardId } = req.params;
      const data = await this.dashboards.getDashboard(dashboardId, companyId);

      res.json({
        success: true,
        data
      });
    } catch (error: any) {
      this.logger.error('Failed to get dashboard data', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard data'
      });
    }
  }

  /**
   * Create KPI
   */
  async createKPI(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const kpi = await this.kpis.createKPI(companyId, req.body);

      res.status(201).json({
        success: true,
        data: kpi
      });
    } catch (error: any) {
      this.logger.error('Failed to create KPI', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create KPI'
      });
    }
  }

  /**
   * Get KPIs
   */
  async getKPIs(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const { category, isActive = true } = req.query;

      const kpis = await this.kpis.getKPIs(
        companyId,
        category as string,
        isActive === 'true'
      );

      res.json({
        success: true,
        data: kpis
      });
    } catch (error: any) {
      this.logger.error('Failed to get KPIs', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get KPIs'
      });
    }
  }

  /**
   * Calculate KPI
   */
  async calculateKPI(req: Request, res: Response): Promise<void> {
    try {
      const { kpiId } = req.params;
      const calculation = await this.kpis.calculate(kpiId);

      res.json({
        success: true,
        data: calculation
      });
    } catch (error: any) {
      this.logger.error('Failed to calculate KPI', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate KPI'
      });
    }
  }

  /**
   * Set KPI goal
   */
  async setKPIGoal(req: Request, res: Response): Promise<void> {
    try {
      const { kpiId } = req.params;
      const goal = await this.kpis.setGoal(kpiId, req.body);

      res.json({
        success: true,
        data: goal
      });
    } catch (error: any) {
      this.logger.error('Failed to set KPI goal', error);
      res.status(500).json({
        success: false,
        error: 'Failed to set KPI goal'
      });
    }
  }

  /**
   * Get KPI history
   */
  async getKPIHistory(req: Request, res: Response): Promise<void> {
    try {
      const { kpiId } = req.params;
      const { startDate, endDate, limit = 100 } = req.query;

      const history = await this.kpis.getHistory(
        kpiId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: history
      });
    } catch (error: any) {
      this.logger.error('Failed to get KPI history', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get KPI history'
      });
    }
  }

  /**
   * Compare KPIs
   */
  async compareKPIs(req: Request, res: Response): Promise<void> {
    try {
      const { kpiIds, period = 'month' } = req.body;

      const comparison = await this.kpis.compare(kpiIds, period as any);

      res.json({
        success: true,
        data: comparison
      });
    } catch (error: any) {
      this.logger.error('Failed to compare KPIs', error);
      res.status(500).json({
        success: false,
        error: 'Failed to compare KPIs'
      });
    }
  }

  /**
   * Get prediction
   */
  async getPrediction(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const { modelType, inputData } = req.body;

      const prediction = await this.predictions.predict(
        companyId,
        modelType,
        inputData
      );

      res.json({
        success: true,
        data: prediction
      });
    } catch (error: any) {
      this.logger.error('Failed to get prediction', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get prediction'
      });
    }
  }

  /**
   * Get recommendations
   */
  async getRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const { area = 'all' } = req.query;

      const recommendations = await this.predictions.recommend(
        companyId,
        area as any
      );

      res.json({
        success: true,
        data: recommendations
      });
    } catch (error: any) {
      this.logger.error('Failed to get recommendations', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get recommendations'
      });
    }
  }

  /**
   * Create pipeline
   */
  async createPipeline(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const pipeline = await this.pipeline.createPipeline(companyId, req.body);

      res.status(201).json({
        success: true,
        data: pipeline
      });
    } catch (error: any) {
      this.logger.error('Failed to create pipeline', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create pipeline'
      });
    }
  }

  /**
   * Execute pipeline
   */
  async executePipeline(req: Request, res: Response): Promise<void> {
    try {
      const { pipelineId } = req.params;
      const { parameters } = req.body;

      const execution = await this.pipeline.execute(pipelineId, parameters);

      res.json({
        success: true,
        data: execution
      });
    } catch (error: any) {
      this.logger.error('Failed to execute pipeline', error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute pipeline'
      });
    }
  }
}