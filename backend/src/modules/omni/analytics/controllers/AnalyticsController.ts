/**
 * AnalyticsController - Sprint 13
 * HTTP controller for analytics endpoints
 */

import { injectable, inject } from 'inversify';
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { TYPES } from '@/container/types';

@injectable()
export class AnalyticsController {
  constructor(
    @inject(TYPES.OmniAnalyticsService) private analyticsService: AnalyticsService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async getConversationMetrics(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const companyId = req.user?.companyId;
      const params = {
        companyId,
        startDate: new Date(req.query.startDate as string),
        endDate: new Date(req.query.endDate as string),
        channels: req.query.channels as string[] | undefined,
        agentIds: req.query.agentIds as string[] | undefined,
        groupBy: req.query.groupBy as string | undefined
      };

      const enhance = req.query.enhance === 'true';

      const metrics = await this.analyticsService.getConversationMetrics(params, enhance);

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      this.logger.error('Error in getConversationMetrics', { error });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getCampaignMetrics(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const campaignId = parseInt(req.params.campaignId);
      const companyId = req.user?.companyId;

      const analytics = await this.analyticsService.getCampaignAnalytics(campaignId, companyId);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      this.logger.error('Error in getCampaignMetrics', { error });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getCustomerMetrics(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const customerId = parseInt(req.params.customerId);
      const companyId = req.user?.companyId;

      const analytics = await this.analyticsService.getCustomerAnalytics(customerId, companyId);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      this.logger.error('Error in getCustomerMetrics', { error });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getRealTimeMetrics(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;

      const metrics = await this.analyticsService.getRealTimeMetrics(companyId);

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      this.logger.error('Error in getRealTimeMetrics', { error });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getChannelComparison(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);

      const comparison = await this.analyticsService.getChannelComparison(
        companyId,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: comparison
      });
    } catch (error) {
      this.logger.error('Error in getChannelComparison', { error });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

interface AnalyticsService {
  getConversationMetrics(params: any, enhance: boolean): Promise<any>;
  getCampaignAnalytics(campaignId: number, companyId: number): Promise<any>;
  getCustomerAnalytics(customerId: number, companyId: number): Promise<any>;
  getRealTimeMetrics(companyId: number): Promise<any>;
  getChannelComparison(companyId: number, startDate: Date, endDate: Date): Promise<any>;
}

interface Logger {
  error(message: string, meta?: any): void;
}
