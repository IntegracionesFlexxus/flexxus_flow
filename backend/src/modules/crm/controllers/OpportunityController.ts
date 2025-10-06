/**
 * Opportunity Controller
 * HTTP endpoints for opportunity management
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { IOpportunityService } from '../interfaces/IOpportunityService';
import { OpportunityFilter } from '../types/opportunity.types';
import { TYPES } from '@/container/types';
import { AppError, ErrorCode } from '@/shared/errors/AppError';

@injectable()
export class OpportunityController {
  constructor(
    @inject(TYPES.OpportunityService) private opportunityService: IOpportunityService,
    @inject(TYPES.Logger) private logger?: any
  ) {}

  /**
   * Create a new opportunity
   * POST /api/crm/opportunities
   */
  async createOpportunity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;

      const opportunityData = {
        ...req.body,
        company_id: companyId
      };

      const opportunity = await this.opportunityService.createOpportunity(opportunityData, userId);

      res.status(201).json({
        success: true,
        data: opportunity,
        message: 'Opportunity created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all opportunities with filters
   * GET /api/crm/opportunities
   */
  async getOpportunities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const filters = {
        ...req.query,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      const result = await this.opportunityService.listOpportunities(companyId, filters);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get opportunity by ID
   * GET /api/crm/opportunities/:id
   */
  async getOpportunityById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const opportunityId = parseInt(req.params.id);

      const opportunity = await this.opportunityService.getOpportunityById(opportunityId, companyId);

      if (!opportunity) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Opportunity not found', 404);
      }

      res.json({
        success: true,
        data: opportunity
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update opportunity
   * PUT /api/crm/opportunities/:id
   */
  async updateOpportunity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const opportunityId = parseInt(req.params.id);

      const opportunity = await this.opportunityService.updateOpportunity(
        opportunityId,
        companyId,
        req.body,
        userId
      );

      if (!opportunity) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Opportunity not found', 404);
      }

      res.json({
        success: true,
        data: opportunity,
        message: 'Opportunity updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete opportunity
   * DELETE /api/crm/opportunities/:id
   */
  async deleteOpportunity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const opportunityId = parseInt(req.params.id);

      const deleted = await this.opportunityService.deleteOpportunity(opportunityId, companyId, userId);

      if (!deleted) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Opportunity not found', 404);
      }

      res.json({
        success: true,
        message: 'Opportunity deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update opportunity stage
   * PUT /api/crm/opportunities/:id/stage
   */
  async updateStage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const opportunityId = parseInt(req.params.id);

      const result = await this.opportunityService.updateStage(
        opportunityId,
        companyId,
        req.body,
        userId
      );

      res.json({
        success: result,
        message: 'Opportunity stage updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark opportunity as won
   * POST /api/crm/opportunities/:id/won
   */
  async markAsWon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const opportunityId = parseInt(req.params.id);

      const opportunity = await this.opportunityService.markAsWon(opportunityId, companyId, userId);

      res.json({
        success: true,
        data: opportunity,
        message: 'Opportunity marked as won'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark opportunity as lost
   * POST /api/crm/opportunities/:id/lost
   */
  async markAsLost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const opportunityId = parseInt(req.params.id);
      const { lostReason } = req.body;

      if (!lostReason) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Lost reason is required', 400);
      }

      const opportunity = await this.opportunityService.markAsLost(
        opportunityId,
        companyId,
        lostReason,
        userId
      );

      res.json({
        success: true,
        data: opportunity,
        message: 'Opportunity marked as lost'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get complete pipeline data
   * GET /api/crm/opportunities/pipeline
   */
  async getPipeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;

      // Construir filtros desde query params
      const filters: OpportunityFilter = {
        owner_id: req.query.owner_id ? parseInt(req.query.owner_id as string) : undefined,
        status: req.query.status as any,
        stage_id: req.query.stage_id ? parseInt(req.query.stage_id as string) : undefined,
        type: req.query.type as any,
        search: req.query.search as string,
        minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
        maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 100 // Mayor límite para pipeline
      };

      const pipelineData = await this.opportunityService.getPipeline(companyId, filters);

      res.json({
        success: true,
        data: pipelineData
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pipeline metrics only
   * GET /api/crm/opportunities/pipeline/metrics
   */
  async getPipelineMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const ownerId = req.query.ownerId ? parseInt(req.query.ownerId as string) : undefined;

      const metrics = await this.opportunityService.getPipelineMetrics(companyId, ownerId);

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get forecast data
   * GET /api/crm/opportunities/forecast
   */
  async getForecastData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const period = (req.query.period as string) || 'current_quarter';

      const forecast = await this.opportunityService.getForecastData(companyId, period);

      res.json({
        success: true,
        data: forecast
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get win/loss analysis
   * GET /api/crm/opportunities/analysis/win-loss
   */
  async getWinLossAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const period = (req.query.period as string) || 'current_quarter';

      const analysis = await this.opportunityService.getWinLossAnalysis(companyId, period);

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clone opportunity
   * POST /api/crm/opportunities/:id/clone
   */
  async cloneOpportunity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const opportunityId = parseInt(req.params.id);

      const opportunity = await this.opportunityService.cloneOpportunity(
        opportunityId,
        companyId,
        userId
      );

      res.json({
        success: true,
        data: opportunity,
        message: 'Opportunity cloned successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate weighted value
   * GET /api/crm/opportunities/:id/weighted-value
   */
  async calculateWeightedValue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const opportunityId = parseInt(req.params.id);

      const value = await this.opportunityService.calculateWeightedValue(opportunityId, companyId);

      res.json({
        success: true,
        data: { weightedValue: value }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get opportunity timeline/history
   * GET /api/crm/opportunities/:id/timeline
   */
  async getTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const opportunityId = parseInt(req.params.id);
      const { startDate, endDate, eventTypes } = req.query;

      // Get opportunity to verify it exists and belongs to company
      const opportunity = await this.opportunityService.getOpportunityById(opportunityId, companyId);

      if (!opportunity) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Opportunity not found', 404);
      }

      // Build timeline data
      const timeline = {
        opportunityId,
        opportunityName: opportunity.name,
        events: [
          {
            id: 1,
            type: 'created',
            description: 'Opportunity created',
            date: opportunity.created_at,
            user: opportunity.created_by,
            details: {
              initialStage: opportunity.stage,
              initialAmount: opportunity.amount
            }
          },
          {
            id: 2,
            type: 'stage_changed',
            description: `Stage changed to ${opportunity.stage}`,
            date: opportunity.updated_at || opportunity.created_at,
            user: opportunity.updated_by || opportunity.created_by,
            details: {
              newStage: opportunity.stage,
              probability: opportunity.probability
            }
          }
        ],
        summary: {
          totalEvents: 2,
          lastActivity: opportunity.updated_at || opportunity.created_at,
          daysInPipeline: Math.floor(
            (new Date().getTime() - new Date(opportunity.created_at).getTime()) / (1000 * 60 * 60 * 24)
          )
        }
      };

      // Filter by date range if provided
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate as string) : new Date('1900-01-01');
        const end = endDate ? new Date(endDate as string) : new Date();

        timeline.events = timeline.events.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= start && eventDate <= end;
        });
      }

      // Filter by event types if provided
      if (eventTypes) {
        const types = (eventTypes as string).split(',');
        timeline.events = timeline.events.filter(event => types.includes(event.type));
      }

      res.json({
        success: true,
        data: timeline
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk create opportunities
   * POST /api/crm/opportunities/bulk
   */
  async bulkCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const { opportunities } = req.body;

      const results = await this.opportunityService.bulkCreate(
        opportunities,
        companyId,
        userId
      );

      res.status(201).json({
        success: true,
        data: results,
        message: `${results.length} opportunities created successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk update opportunities
   * PUT /api/crm/opportunities/bulk
   */
  async bulkUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const { updates } = req.body;

      const results = await this.opportunityService.bulkUpdate(
        updates,
        companyId,
        userId
      );

      res.json({
        success: true,
        data: results,
        message: `${results.success} opportunities updated, ${results.failed} failed`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk delete opportunities
   * DELETE /api/crm/opportunities/bulk
   */
  async bulkDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const { ids } = req.body;

      const results = await this.opportunityService.bulkDelete(
        ids,
        companyId,
        userId
      );

      res.json({
        success: true,
        data: results,
        message: `${results.success} opportunities deleted, ${results.failed} failed`
      });
    } catch (error) {
      next(error);
    }
  }
}