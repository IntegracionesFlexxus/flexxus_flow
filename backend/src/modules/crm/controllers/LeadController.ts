/**
 * Lead Controller
 * HTTP endpoints for lead management
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { ILeadService } from '../interfaces/ILeadService';
import { TYPES } from '@/container/types';
import { AppError } from '@/shared/errors/AppError';

@injectable()
export class LeadController {
  constructor(
    @inject(TYPES.LeadService) private leadService: ILeadService,
    @inject(TYPES.Logger) private logger?: any
  ) {}

  /**
   * Create a new lead
   * POST /api/crm/leads
   */
  async createLead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;

      const leadData = {
        ...req.body,
        company_id: companyId
      };

      const lead = await this.leadService.createLead(leadData, userId);

      res.status(201).json({
        success: true,
        data: lead,
        message: 'Lead created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all leads with filters
   * GET /api/crm/leads
   */
  async getLeads(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const filters = {
        ...req.query,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      const result = await this.leadService.listLeads(companyId, filters);

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
   * Get lead by ID
   * GET /api/crm/leads/:id
   */
  async getLeadById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const leadId = parseInt(req.params.id);

      const lead = await this.leadService.getLeadById(leadId, companyId);

      if (!lead) {
        throw new AppError('Lead not found', 404);
      }

      res.json({
        success: true,
        data: lead
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update lead
   * PUT /api/crm/leads/:id
   */
  async updateLead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const leadId = parseInt(req.params.id);

      const lead = await this.leadService.updateLead(leadId, companyId, req.body, userId);

      if (!lead) {
        throw new AppError('Lead not found', 404);
      }

      res.json({
        success: true,
        data: lead,
        message: 'Lead updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete lead
   * DELETE /api/crm/leads/:id
   */
  async deleteLead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const leadId = parseInt(req.params.id);

      const deleted = await this.leadService.deleteLead(leadId, companyId, userId);

      if (!deleted) {
        throw new AppError('Lead not found', 404);
      }

      res.json({
        success: true,
        message: 'Lead deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Qualify lead
   * POST /api/crm/leads/:id/qualify
   */
  async qualifyLead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const leadId = parseInt(req.params.id);

      const lead = await this.leadService.qualifyLead(leadId, companyId, userId);

      res.json({
        success: true,
        data: lead,
        message: 'Lead qualified successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Convert lead
   * POST /api/crm/leads/:id/convert
   */
  async convertLead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const leadId = parseInt(req.params.id);

      const conversionData = {
        createAccount: req.body.createAccount !== false,
        accountName: req.body.accountName,
        existingAccountId: req.body.existingAccountId,
        createOpportunity: req.body.createOpportunity === true,
        opportunityName: req.body.opportunityName,
        amount: req.body.amount,
        closeDate: req.body.closeDate ? new Date(req.body.closeDate) : undefined,
        stageId: req.body.stageId
      };

      const result = await this.leadService.convertLead(leadId, companyId, conversionData, userId);

      res.json({
        success: true,
        data: result,
        message: 'Lead converted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update lead score
   * POST /api/crm/leads/:id/score
   */
  async updateLeadScore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const leadId = parseInt(req.params.id);

      const score = await this.leadService.updateLeadScore(leadId, companyId);

      res.json({
        success: true,
        data: { score },
        message: 'Lead score updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk update lead scores
   * POST /api/crm/leads/score/bulk
   */
  async bulkUpdateScores(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;

      const updatedCount = await this.leadService.bulkUpdateScores(companyId);

      res.json({
        success: true,
        data: { updatedCount },
        message: `Updated scores for ${updatedCount} leads`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign lead
   * POST /api/crm/leads/:id/assign
   */
  async assignLead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const leadId = parseInt(req.params.id);
      const { assignedTo } = req.body;

      if (!assignedTo) {
        throw new AppError('Assigned user ID is required', 400);
      }

      const lead = await this.leadService.assignLead(leadId, companyId, assignedTo, userId);

      res.json({
        success: true,
        data: lead,
        message: 'Lead assigned successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Find duplicate leads
   * GET /api/crm/leads/duplicates
   */
  async findDuplicates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const { email } = req.query;

      if (!email) {
        throw new AppError('Email is required to find duplicates', 400);
      }

      const duplicates = await this.leadService.findDuplicates(email as string, companyId);

      res.json({
        success: true,
        data: duplicates
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Merge leads
   * POST /api/crm/leads/merge
   */
  async mergeLeads(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const { primaryLeadId, duplicateLeadIds } = req.body;

      if (!primaryLeadId || !duplicateLeadIds || !Array.isArray(duplicateLeadIds)) {
        throw new AppError('Primary lead ID and duplicate lead IDs are required', 400);
      }

      const lead = await this.leadService.mergeLeads(
        primaryLeadId,
        duplicateLeadIds,
        companyId,
        userId
      );

      res.json({
        success: true,
        data: lead,
        message: 'Leads merged successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get lead metrics
   * GET /api/crm/leads/metrics
   */
  async getLeadMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const { startDate, endDate } = req.query;

      const dateRange = startDate && endDate
        ? { start: new Date(startDate as string), end: new Date(endDate as string) }
        : undefined;

      const metrics = await this.leadService.getLeadMetrics(companyId, dateRange);

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      next(error);
    }
  }
}