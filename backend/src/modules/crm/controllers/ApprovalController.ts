/**
 * @deprecated Sprint 19 - Usar implementación Sprint 20 cuando esté disponible
 * Este archivo será eliminado en futuras versiones
 * Nota: ApprovalService aún no tiene implementación en Sprint 20
 *
 * Approval Controller - Sprint 19
 * REST API endpoints for approval workflow management
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
import Joi from 'joi';
import { ApprovalRepository } from '../repositories/ApprovalRepository';
import { QuoteBuilderService } from '../services/QuoteBuilderService';

// Validation schemas
const workflowSchema = Joi.object({
  workflow_name: Joi.string().required().max(100),
  entity_type: Joi.string().valid('quote', 'order', 'contract', 'expense').required(),
  description: Joi.string().max(500),
  conditions: Joi.object({
    min_amount: Joi.number().min(0),
    max_amount: Joi.number().min(0),
    discount_threshold: Joi.number().min(0).max(100),
    payment_terms: Joi.array().items(Joi.string()),
    product_categories: Joi.array().items(Joi.number().integer().positive()),
    customer_segments: Joi.array().items(Joi.string()),
    custom_conditions: Joi.object()
  }),
  stages: Joi.array().items(Joi.object({
    stage_name: Joi.string().required().max(100),
    stage_order: Joi.number().integer().min(1).required(),
    approvers: Joi.array().items(Joi.object({
      approver_type: Joi.string().valid('user', 'role', 'dynamic').required(),
      approver_id: Joi.number().integer().positive(),
      approver_role: Joi.string(),
      dynamic_rule: Joi.string()
    })).min(1).required(),
    approval_type: Joi.string().valid('any', 'all', 'threshold').required(),
    threshold_count: Joi.number().integer().min(1),
    sla_hours: Joi.number().integer().min(1),
    escalation_user_id: Joi.number().integer().positive()
  })).min(1).required(),
  is_active: Joi.boolean().default(true),
  metadata: Joi.object()
});

const approvalDecisionSchema = Joi.object({
  decision: Joi.string().valid('approve', 'reject', 'request_changes').required(),
  comments: Joi.string().required().max(1000),
  conditions: Joi.array().items(Joi.object({
    condition_type: Joi.string().required(),
    condition_value: Joi.string().required()
  })),
  attachments: Joi.array().items(Joi.object({
    file_name: Joi.string().required(),
    file_url: Joi.string().uri().required(),
    file_type: Joi.string()
  }))
});

const delegationSchema = Joi.object({
  delegate_to_user_id: Joi.number().integer().positive().required(),
  reason: Joi.string().max(500),
  delegation_start: Joi.date(),
  delegation_end: Joi.date()
});

@injectable()
export class ApprovalController {
  constructor(
    @inject(TYPES.ApprovalRepository) private approvalRepository: ApprovalRepository,
    @inject(TYPES.QuoteBuilderService) private quoteService: QuoteBuilderService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Get all approval workflows
   * GET /api/crm/approvals/workflows
   */
  async getWorkflows(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.company_id;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const entity_type = req.query.entity_type as string;
      const is_active = req.query.is_active === 'false' ? false : true;

      const workflows = await this.approvalRepository.getWorkflows(company_id, {
        entity_type,
        is_active
      });

      res.json({
        success: true,
        data: workflows
      });

    } catch (error) {
      this.logger.error('Error getting workflows', { error });
      res.status(500).json({ error: 'Failed to get workflows' });
    }
  }

  /**
   * Get workflow by ID
   * GET /api/crm/approvals/workflows/:id
   */
  async getWorkflowById(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.company_id;
      const workflow_id = Number(req.params.id);

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const workflow = await this.approvalRepository.getWorkflowById(
        workflow_id,
        company_id
      );

      if (!workflow) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }

      res.json({
        success: true,
        data: workflow
      });

    } catch (error) {
      this.logger.error('Error getting workflow', { error });
      res.status(500).json({ error: 'Failed to get workflow' });
    }
  }

  /**
   * Create approval workflow
   * POST /api/crm/approvals/workflows
   */
  async createWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.company_id;
      const user_id = req.user?.user_id;

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = workflowSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const workflow = await this.approvalRepository.createWorkflow({
        ...value,
        company_id,
        created_by: user_id
      });

      res.status(201).json({
        success: true,
        data: workflow,
        message: 'Workflow created successfully'
      });

    } catch (error) {
      this.logger.error('Error creating workflow', { error });
      res.status(500).json({ error: 'Failed to create workflow' });
    }
  }

  /**
   * Update approval workflow
   * PUT /api/crm/approvals/workflows/:id
   */
  async updateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.company_id;
      const workflow_id = Number(req.params.id);

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = workflowSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const workflow = await this.approvalRepository.updateWorkflow(
        workflow_id,
        value,
        company_id
      );

      res.json({
        success: true,
        data: workflow,
        message: 'Workflow updated successfully'
      });

    } catch (error) {
      this.logger.error('Error updating workflow', { error });
      res.status(500).json({ error: 'Failed to update workflow' });
    }
  }

  /**
   * Delete approval workflow
   * DELETE /api/crm/approvals/workflows/:id
   */
  async deleteWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.company_id;
      const workflow_id = Number(req.params.id);

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      await this.approvalRepository.deleteWorkflow(workflow_id, company_id);

      res.json({
        success: true,
        message: 'Workflow deleted successfully'
      });

    } catch (error) {
      this.logger.error('Error deleting workflow', { error });
      res.status(500).json({ error: 'Failed to delete workflow' });
    }
  }

  /**
   * Get pending approvals for current user
   * GET /api/crm/approvals/pending
   */
  async getPendingApprovals(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.company_id;
      const user_id = req.user?.user_id;

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const entity_type = req.query.entity_type as string;
      const page = Number(req.query.page) || 1;
      const page_size = Number(req.query.page_size) || 20;

      const approvals = await this.approvalRepository.getPendingApprovals(
        user_id,
        company_id,
        entity_type
      );

      // Pagination
      const start = (page - 1) * page_size;
      const end = start + page_size;
      const paginated = approvals.slice(start, end);

      res.json({
        success: true,
        data: paginated,
        pagination: {
          page,
          page_size,
          total_count: approvals.length,
          total_pages: Math.ceil(approvals.length / page_size)
        }
      });

    } catch (error) {
      this.logger.error('Error getting pending approvals', { error });
      res.status(500).json({ error: 'Failed to get pending approvals' });
    }
  }

  /**
   * Get approval process details
   * GET /api/crm/approvals/processes/:id
   */
  async getApprovalProcess(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.company_id;
      const process_id = Number(req.params.id);

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const process = await this.approvalRepository.getProcessById(
        process_id,
        company_id
      );

      if (!process) {
        res.status(404).json({ error: 'Approval process not found' });
        return;
      }

      res.json({
        success: true,
        data: process
      });

    } catch (error) {
      this.logger.error('Error getting approval process', { error });
      res.status(500).json({ error: 'Failed to get approval process' });
    }
  }

  /**
   * Submit approval decision
   * POST /api/crm/approvals/processes/:id/decision
   */
  async submitApprovalDecision(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.company_id;
      const user_id = req.user?.user_id;
      const process_id = Number(req.params.id);

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = approvalDecisionSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const result = await this.approvalRepository.submitDecision(
        process_id,
        user_id,
        value.decision,
        value.comments,
        value.conditions,
        value.attachments
      );

      // If this is a quote approval, update the quote status
      if (result.entity_type === 'quote' && result.entity_id) {
        if (value.decision === 'approve' && result.status === 'approved') {
          await this.quoteService.updateQuoteStatus(
            result.entity_id,
            'approved',
            user_id
          );
        } else if (value.decision === 'reject') {
          await this.quoteService.updateQuoteStatus(
            result.entity_id,
            'rejected',
            user_id
          );
        }
      }

      res.json({
        success: true,
        data: result,
        message: `Decision submitted successfully: ${value.decision}`
      });

    } catch (error: any) {
      this.logger.error('Error submitting approval decision', { error });

      if (error.message?.includes('not authorized')) {
        res.status(403).json({ error: 'Not authorized to approve this request' });
      } else {
        res.status(500).json({ error: 'Failed to submit approval decision' });
      }
    }
  }

  /**
   * Delegate approval
   * POST /api/crm/approvals/processes/:id/delegate
   */
  async delegateApproval(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.company_id;
      const user_id = req.user?.user_id;
      const process_id = Number(req.params.id);

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = delegationSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      await this.approvalRepository.delegateApproval(
        process_id,
        user_id,
        value.delegate_to_user_id,
        value.reason,
        value.delegation_start,
        value.delegation_end
      );

      res.json({
        success: true,
        message: 'Approval delegated successfully'
      });

    } catch (error: any) {
      this.logger.error('Error delegating approval', { error });

      if (error.message?.includes('not authorized')) {
        res.status(403).json({ error: 'Not authorized to delegate this approval' });
      } else {
        res.status(500).json({ error: 'Failed to delegate approval' });
      }
    }
  }

  /**
   * Recall approval request
   * POST /api/crm/approvals/processes/:id/recall
   */
  async recallApprovalRequest(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.company_id;
      const user_id = req.user?.user_id;
      const process_id = Number(req.params.id);

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const recallSchema = Joi.object({
        reason: Joi.string().required().max(500)
      });

      const { error, value } = recallSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      await this.approvalRepository.recallApproval(
        process_id,
        user_id,
        value.reason
      );

      res.json({
        success: true,
        message: 'Approval request recalled successfully'
      });

    } catch (error: any) {
      this.logger.error('Error recalling approval', { error });

      if (error.message?.includes('not authorized')) {
        res.status(403).json({ error: 'Not authorized to recall this approval' });
      } else if (error.message?.includes('cannot recall')) {
        res.status(400).json({ error: 'Approval cannot be recalled in current state' });
      } else {
        res.status(500).json({ error: 'Failed to recall approval request' });
      }
    }
  }

  /**
   * Get approval history
   * GET /api/crm/approvals/history
   */
  async getApprovalHistory(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.company_id;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const entity_type = req.query.entity_type as string;
      const entity_id = req.query.entity_id ? Number(req.query.entity_id) : undefined;
      const user_id = req.query.user_id ? Number(req.query.user_id) : undefined;
      const start_date = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
      const end_date = req.query.end_date ? new Date(req.query.end_date as string) : undefined;

      const history = await this.approvalRepository.getApprovalHistory(
        company_id,
        {
          entity_type,
          entity_id,
          user_id,
          start_date,
          end_date
        }
      );

      res.json({
        success: true,
        data: history
      });

    } catch (error) {
      this.logger.error('Error getting approval history', { error });
      res.status(500).json({ error: 'Failed to get approval history' });
    }
  }

  /**
   * Get approval analytics
   * GET /api/crm/approvals/analytics
   */
  async getApprovalAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.company_id;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const period = (req.query.period as 'day' | 'week' | 'month' | 'quarter') || 'month';
      const entity_type = req.query.entity_type as string;

      const analytics = await this.approvalRepository.getApprovalAnalytics(
        company_id,
        period,
        entity_type
      );

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      this.logger.error('Error getting approval analytics', { error });
      res.status(500).json({ error: 'Failed to get approval analytics' });
    }
  }

  /**
   * Escalate approval
   * POST /api/crm/approvals/processes/:id/escalate
   */
  async escalateApproval(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.company_id;
      const process_id = Number(req.params.id);

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const escalationSchema = Joi.object({
        reason: Joi.string().required().max(500),
        escalate_to_user_id: Joi.number().integer().positive()
      });

      const { error, value } = escalationSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      await this.approvalRepository.escalateApproval(
        process_id,
        value.reason,
        value.escalate_to_user_id
      );

      res.json({
        success: true,
        message: 'Approval escalated successfully'
      });

    } catch (error) {
      this.logger.error('Error escalating approval', { error });
      res.status(500).json({ error: 'Failed to escalate approval' });
    }
  }

  /**
   * Bulk approve/reject
   * POST /api/crm/approvals/bulk-decision
   */
  async submitBulkDecision(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.company_id;
      const user_id = req.user?.user_id;

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const bulkDecisionSchema = Joi.object({
        process_ids: Joi.array().items(Joi.number().integer().positive()).min(1).max(50).required(),
        decision: Joi.string().valid('approve', 'reject').required(),
        comments: Joi.string().required().max(1000)
      });

      const { error, value } = bulkDecisionSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const results = [];
      const errors = [];

      for (const process_id of value.process_ids) {
        try {
          const result = await this.approvalRepository.submitDecision(
            process_id,
            user_id,
            value.decision,
            value.comments
          );
          results.push({ process_id, success: true, result });
        } catch (err: any) {
          errors.push({ process_id, error: err.message });
        }
      }

      res.json({
        success: errors.length === 0,
        data: {
          successful: results,
          failed: errors
        },
        message: `Processed ${results.length} approvals successfully, ${errors.length} failed`
      });

    } catch (error) {
      this.logger.error('Error processing bulk decisions', { error });
      res.status(500).json({ error: 'Failed to process bulk decisions' });
    }
  }
}