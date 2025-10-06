/**
 * Lead Management Controller
 * Handles HTTP requests for lead management operations
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { LeadRepository } from '../repositories/LeadRepository';
import { ScoringEngineService } from '../lead-management/scoring/services/ScoringEngineService';
import { AssignmentRuleEngine } from '../lead-management/assignment/services/AssignmentRuleEngine';
import { DuplicateDetectorService } from '../lead-management/duplicate/services/DuplicateDetectorService';
import { OmniChannelIntegrationService } from '../lead-management/capture/services/OmniChannelIntegrationService';

@injectable()
export class LeadManagementController {
  constructor(
    @inject(TYPES.LeadRepository) private leadRepo: LeadRepository,
    @inject(TYPES.ScoringEngineService) private scoringService: ScoringEngineService,
    @inject(TYPES.AssignmentRuleEngine) private assignmentService: AssignmentRuleEngine,
    @inject(TYPES.DuplicateDetectorService) private duplicateService: DuplicateDetectorService,
    @inject(TYPES.OmniChannelIntegrationService) private omniChannelService: OmniChannelIntegrationService,
    @inject(TYPES.Logger) private logger: any
  ) {}

  /**
   * Calculate lead score
   * POST /api/crm/leads/:leadId/score
   */
  async calculateScore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { leadId } = req.params;
      const { companyId } = req.user as any;

      const score = await this.scoringService.calculateLeadScore(parseInt(leadId));

      res.json({
        success: true,
        data: score
      });
    } catch (error) {
      this.logger.error('Error calculating lead score', { error });
      next(error);
    }
  }

  /**
   * Bulk calculate scores
   * POST /api/crm/leads/bulk-score
   */
  async bulkCalculateScores(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { leadIds } = req.body;
      const { companyId } = req.user as any;

      if (!Array.isArray(leadIds) || leadIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid lead IDs array'
        });
        return;
      }

      const scores = await this.scoringService.bulkCalculateScores(leadIds);

      res.json({
        success: true,
        data: scores
      });
    } catch (error) {
      this.logger.error('Error bulk calculating scores', { error });
      next(error);
    }
  }

  /**
   * Get current lead score
   * GET /api/crm/leads/:leadId/score
   */
  async getScore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { leadId } = req.params;
      const { companyId } = req.user as any;

      // Get lead with current score from database
      const lead = await this.leadRepo.findById(parseInt(leadId), companyId);

      if (!lead) {
        res.status(404).json({
          success: false,
          error: 'Lead not found'
        });
        return;
      }

      // Get scoring history
      const query = `
        SELECT * FROM public.lead_scoring_history
        WHERE lead_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const result = await (this.leadRepo as any).db.query(query, [leadId]);

      res.json({
        success: true,
        data: {
          currentScore: lead.score || 0,
          history: result.rows[0] || null
        }
      });
    } catch (error) {
      this.logger.error('Error getting lead score', { error });
      next(error);
    }
  }

  /**
   * Assign lead
   * POST /api/crm/leads/:leadId/assign
   */
  async assignLead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { leadId } = req.params;
      const { assigneeId } = req.body;
      const { companyId } = req.user as any;

      const assignment = await this.assignmentService.assignLead(
        parseInt(leadId),
        companyId,
        assigneeId ? parseInt(assigneeId) : undefined
      );

      res.json({
        success: true,
        data: assignment
      });
    } catch (error) {
      this.logger.error('Error assigning lead', { error });
      next(error);
    }
  }

  /**
   * Auto-assign unassigned leads
   * POST /api/crm/leads/auto-assign
   */
  async autoAssignLeads(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit = 100 } = req.body;
      const { companyId } = req.user as any;

      const assignments = await this.assignmentService.autoAssignUnassignedLeads(
        companyId,
        limit
      );

      res.json({
        success: true,
        data: {
          assigned: assignments.length,
          assignments
        }
      });
    } catch (error) {
      this.logger.error('Error auto-assigning leads', { error });
      next(error);
    }
  }

  /**
   * Get assignment rules
   * GET /api/crm/assignment/rules
   */
  async getAssignmentRules(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyId } = req.user as any;

      const rules = await this.assignmentService.getAssignmentRules(companyId);

      res.json({
        success: true,
        data: rules
      });
    } catch (error) {
      this.logger.error('Error getting assignment rules', { error });
      next(error);
    }
  }

  /**
   * Create assignment rule
   * POST /api/crm/assignment/rules
   */
  async createAssignmentRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyId } = req.user as any;
      const ruleData = req.body;

      const rule = await this.assignmentService.createAssignmentRule(ruleData, companyId);

      res.status(201).json({
        success: true,
        data: rule
      });
    } catch (error) {
      this.logger.error('Error creating assignment rule', { error });
      next(error);
    }
  }

  /**
   * Update assignment rule
   * PUT /api/crm/assignment/rules/:ruleId
   */
  async updateAssignmentRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ruleId } = req.params;
      const { companyId } = req.user as any;
      const updates = req.body;

      const rule = await this.assignmentService.updateAssignmentRule(
        parseInt(ruleId),
        updates,
        companyId
      );

      res.json({
        success: true,
        data: rule
      });
    } catch (error) {
      this.logger.error('Error updating assignment rule', { error });
      next(error);
    }
  }

  /**
   * Check SLA compliance
   * GET /api/crm/assignment/sla-compliance
   */
  async checkSLACompliance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyId } = req.user as any;

      const compliance = await this.assignmentService.checkSLACompliance(companyId);

      res.json({
        success: true,
        data: compliance
      });
    } catch (error) {
      this.logger.error('Error checking SLA compliance', { error });
      next(error);
    }
  }

  /**
   * Find duplicates
   * GET /api/crm/leads/:leadId/duplicates
   */
  async findDuplicates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { leadId } = req.params;
      const { companyId } = req.user as any;

      const duplicates = await this.duplicateService.findDuplicates(
        parseInt(leadId),
        companyId
      );

      res.json({
        success: true,
        data: duplicates
      });
    } catch (error) {
      this.logger.error('Error finding duplicates', { error });
      next(error);
    }
  }

  /**
   * Merge duplicates
   * POST /api/crm/leads/:leadId/merge
   */
  async mergeDuplicates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { leadId } = req.params;
      const { duplicateIds, strategy = { keepField: 'highest_score', preserveHistory: true, mergeCustomFields: true } } = req.body;
      const { companyId, id: userId } = req.user as any;

      if (!Array.isArray(duplicateIds) || duplicateIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid duplicate IDs array'
        });
        return;
      }

      await this.duplicateService.mergeDuplicates(
        parseInt(leadId),
        duplicateIds.map(id => parseInt(id)),
        strategy,
        companyId,
        userId
      );

      res.json({
        success: true,
        message: 'Leads merged successfully'
      });
    } catch (error) {
      this.logger.error('Error merging duplicates', { error });
      next(error);
    }
  }

  /**
   * Auto-merge high confidence duplicates
   * POST /api/crm/leads/auto-merge-duplicates
   */
  async autoMergeDuplicates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyId, id: userId } = req.user as any;

      const mergedCount = await this.duplicateService.autoMergeHighConfidenceDuplicates(
        companyId,
        userId
      );

      res.json({
        success: true,
        data: {
          mergedCount,
          message: `Successfully merged ${mergedCount} duplicate lead pairs`
        }
      });
    } catch (error) {
      this.logger.error('Error auto-merging duplicates', { error });
      next(error);
    }
  }

  /**
   * Find all duplicate groups
   * GET /api/crm/leads/duplicate-groups
   */
  async findAllDuplicateGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyId } = req.user as any;

      const groups = await this.duplicateService.findAllDuplicateGroups(companyId);

      res.json({
        success: true,
        data: groups
      });
    } catch (error) {
      this.logger.error('Error finding duplicate groups', { error });
      next(error);
    }
  }

  /**
   * Handle OmniChannel webhook - Form Submitted
   * POST /api/crm/webhooks/omnichannel/form-submitted
   */
  async handleOmniChannelFormSubmitted(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const webhookData = req.body;

      // TODO: Validate webhook signature when omnichannel provides it

      await this.omniChannelService.handleFormSubmission(webhookData);

      res.json({
        success: true,
        message: 'Form submission processed'
      });
    } catch (error) {
      this.logger.error('Error handling form submission webhook', { error });
      next(error);
    }
  }

  /**
   * Handle OmniChannel webhook - Chat Qualified
   * POST /api/crm/webhooks/omnichannel/chat-qualified
   */
  async handleOmniChannelChatQualified(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const webhookData = req.body;

      // TODO: Validate webhook signature when omnichannel provides it

      await this.omniChannelService.handleQualifiedConversation(webhookData);

      res.json({
        success: true,
        message: 'Qualified conversation processed'
      });
    } catch (error) {
      this.logger.error('Error handling chat qualified webhook', { error });
      next(error);
    }
  }

  /**
   * Handle OmniChannel webhook - Email Engaged
   * POST /api/crm/webhooks/omnichannel/email-engaged
   */
  async handleOmniChannelEmailEngaged(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const webhookData = req.body;

      // TODO: Validate webhook signature when omnichannel provides it

      await this.omniChannelService.handleEmailEngagement(webhookData);

      res.json({
        success: true,
        message: 'Email engagement processed'
      });
    } catch (error) {
      this.logger.error('Error handling email engaged webhook', { error });
      next(error);
    }
  }
}