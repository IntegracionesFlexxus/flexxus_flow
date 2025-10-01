/**
 * @deprecated Sprint 19 - Usar implementación Sprint 20 cuando esté disponible
 * Este archivo será eliminado en futuras versiones
 * Nota: ApprovalService aún no tiene implementación en Sprint 20
 *
 * Approval Workflow Service - Sprint 19
 * Manages quote approval workflows and processes
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';

export interface ApprovalStep {
  step_id?: number;
  company_id: number;
  workflow_id: number;
  step_name: string;
  step_order: number;
  approver_type: 'user' | 'role' | 'amount_based' | 'percentage_based';
  approver_config: any;
  is_required: boolean;
  auto_approve_conditions?: any;
  rejection_action: 'restart' | 'previous_step' | 'terminate';
}

export interface ApprovalWorkflow {
  workflow_id?: number;
  company_id: number;
  workflow_name: string;
  description?: string;
  entity_type: 'quote' | 'discount' | 'pricing_rule';
  trigger_conditions: any;
  is_active: boolean;
  steps: ApprovalStep[];
}

export interface ApprovalRequest {
  approval_id?: number;
  company_id: number;
  workflow_id: number;
  entity_type: string;
  entity_id: number;
  requested_by: number;
  current_step: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: any;
  due_date?: Date;
}

export interface ApprovalHistory {
  history_id?: number;
  approval_id: number;
  step_id: number;
  approver_id: number;
  action: 'approved' | 'rejected' | 'delegated' | 'auto_approved';
  comments?: string;
  decision_date?: Date;
}

export interface ApprovalNotification {
  notification_id?: number;
  approval_id: number;
  recipient_id: number;
  notification_type: 'approval_request' | 'approval_reminder' | 'decision_made' | 'escalation';
  is_read: boolean;
  sent_at?: Date;
}

@injectable()
export class ApprovalWorkflowService {
  constructor(
    @inject(TYPES.CrmConnection) private pool: Pool,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Create approval workflow
   */
  async createWorkflow(workflow: ApprovalWorkflow): Promise<ApprovalWorkflow> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Create workflow
      const workflowQuery = `
        INSERT INTO approval_workflows (
          company_id, workflow_name, description, entity_type,
          trigger_conditions, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const workflowResult = await client.query(workflowQuery, [
        workflow.company_id,
        workflow.workflow_name,
        workflow.description,
        workflow.entity_type,
        JSON.stringify(workflow.trigger_conditions),
        workflow.is_active
      ]);

      const createdWorkflow = workflowResult.rows[0];

      // Create workflow steps
      const createdSteps: ApprovalStep[] = [];
      for (const step of workflow.steps) {
        const stepQuery = `
          INSERT INTO approval_steps (
            company_id, workflow_id, step_name, step_order,
            approver_type, approver_config, is_required,
            auto_approve_conditions, rejection_action
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `;

        const stepResult = await client.query(stepQuery, [
          workflow.company_id,
          createdWorkflow.workflow_id,
          step.step_name,
          step.step_order,
          step.approver_type,
          JSON.stringify(step.approver_config),
          step.is_required,
          JSON.stringify(step.auto_approve_conditions || {}),
          step.rejection_action
        ]);

        createdSteps.push(stepResult.rows[0]);
      }

      await client.query('COMMIT');

      this.logger.info('Approval workflow created', {
        workflow_id: createdWorkflow.workflow_id,
        steps_count: createdSteps.length
      });

      return {
        ...createdWorkflow,
        steps: createdSteps
      };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating approval workflow', { error, workflow });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Submit entity for approval
   */
  async submitForApproval(
    company_id: number,
    entity_type: string,
    entity_id: number,
    requested_by: number,
    metadata?: any
  ): Promise<ApprovalRequest> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Find applicable workflow
      const workflow = await this.findApplicableWorkflow(company_id, entity_type, entity_id, metadata);
      if (!workflow) {
        throw new Error(`No applicable workflow found for ${entity_type}`);
      }

      // Check if approval already exists
      const existingQuery = `
        SELECT * FROM approval_requests
        WHERE entity_type = $1 AND entity_id = $2 AND status = 'pending'
      `;
      const existingResult = await client.query(existingQuery, [entity_type, entity_id]);

      if (existingResult.rows.length > 0) {
        throw new Error('Entity already has pending approval request');
      }

      // Calculate priority and due date
      const priority = this.calculatePriority(metadata);
      const dueDate = this.calculateDueDate(priority);

      // Create approval request
      const requestQuery = `
        INSERT INTO approval_requests (
          company_id, workflow_id, entity_type, entity_id,
          requested_by, current_step, status, priority,
          metadata, due_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const requestResult = await client.query(requestQuery, [
        company_id,
        workflow.workflow_id,
        entity_type,
        entity_id,
        requested_by,
        1, // Start at first step
        'pending',
        priority,
        JSON.stringify(metadata || {}),
        dueDate
      ]);

      const approvalRequest = requestResult.rows[0];

      // Send notifications for first step
      await this.sendStepNotifications(approvalRequest.approval_id, 1);

      await client.query('COMMIT');

      this.logger.info('Approval request submitted', {
        approval_id: approvalRequest.approval_id,
        entity_type,
        entity_id
      });

      return approvalRequest;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error submitting for approval', { error, entity_type, entity_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Process approval decision
   */
  async processApproval(
    approval_id: number,
    approver_id: number,
    action: 'approved' | 'rejected' | 'delegated',
    comments?: string,
    delegate_to?: number
  ): Promise<ApprovalRequest> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get approval request
      const requestQuery = `
        SELECT ar.*, aw.workflow_name
        FROM approval_requests ar
        JOIN approval_workflows aw ON ar.workflow_id = aw.workflow_id
        WHERE ar.approval_id = $1
      `;

      const requestResult = await client.query(requestQuery, [approval_id]);
      if (requestResult.rows.length === 0) {
        throw new Error('Approval request not found');
      }

      const approvalRequest = requestResult.rows[0];

      if (approvalRequest.status !== 'pending') {
        throw new Error('Approval request is not pending');
      }

      // Verify approver has permission for current step
      const canApprove = await this.canUserApprove(approver_id, approval_id, approvalRequest.current_step);
      if (!canApprove && action !== 'delegated') {
        throw new Error('User does not have permission to approve this step');
      }

      // Record decision in history
      const historyQuery = `
        INSERT INTO approval_history (
          approval_id, step_id, approver_id, action, comments, decision_date
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `;

      await client.query(historyQuery, [
        approval_id,
        approvalRequest.current_step,
        approver_id,
        action,
        comments
      ]);

      let newStatus = approvalRequest.status;
      let newStep = approvalRequest.current_step;

      if (action === 'approved') {
        // Check if this was the last step
        const nextStepQuery = `
          SELECT * FROM approval_steps
          WHERE workflow_id = $1 AND step_order > $2
          ORDER BY step_order
          LIMIT 1
        `;

        const nextStepResult = await client.query(nextStepQuery, [
          approvalRequest.workflow_id,
          approvalRequest.current_step
        ]);

        if (nextStepResult.rows.length === 0) {
          // Final approval
          newStatus = 'approved';
          await this.executeApprovalActions(approvalRequest);
        } else {
          // Move to next step
          newStep = nextStepResult.rows[0].step_order;
          await this.sendStepNotifications(approval_id, newStep);
        }

      } else if (action === 'rejected') {
        newStatus = 'rejected';
        await this.executeRejectionActions(approvalRequest);

      } else if (action === 'delegated' && delegate_to) {
        // Handle delegation logic
        await this.createDelegation(approval_id, approver_id, delegate_to);
      }

      // Update approval request
      const updateQuery = `
        UPDATE approval_requests
        SET status = $2, current_step = $3, updated_at = NOW()
        WHERE approval_id = $1
        RETURNING *
      `;

      const updatedResult = await client.query(updateQuery, [approval_id, newStatus, newStep]);

      await client.query('COMMIT');

      this.logger.info('Approval decision processed', {
        approval_id,
        action,
        new_status: newStatus,
        new_step: newStep
      });

      return updatedResult.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error processing approval', { error, approval_id, action });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get pending approvals for user
   */
  async getPendingApprovals(
    user_id: number,
    company_id: number,
    limit = 20,
    offset = 0
  ): Promise<{ data: ApprovalRequest[]; total: number }> {
    const client = await this.pool.connect();

    try {
      // Get approvals where user can approve current step
      const query = `
        SELECT DISTINCT
          ar.*,
          aw.workflow_name,
          as_step.step_name,
          CASE
            WHEN ar.entity_type = 'quote' THEN q.quote_name
            ELSE ar.entity_type || ' #' || ar.entity_id
          END as entity_name
        FROM approval_requests ar
        JOIN approval_workflows aw ON ar.workflow_id = aw.workflow_id
        JOIN approval_steps as_step ON aw.workflow_id = as_step.workflow_id
          AND ar.current_step = as_step.step_order
        LEFT JOIN quotes q ON ar.entity_type = 'quote' AND ar.entity_id = q.quote_id
        WHERE ar.company_id = $1
          AND ar.status = 'pending'
          AND (
            -- Direct user assignment
            (as_step.approver_type = 'user' AND as_step.approver_config->>'user_id' = $2::text)
            OR
            -- Role-based assignment (would need role checking logic)
            (as_step.approver_type = 'role' AND EXISTS (
              SELECT 1 FROM user_roles ur
              WHERE ur.user_id = $2
              AND ur.role_name = as_step.approver_config->>'role_name'
            ))
          )
        ORDER BY ar.priority DESC, ar.created_at ASC
        LIMIT $3 OFFSET $4
      `;

      const dataResult = await client.query(query, [company_id, user_id.toString(), limit, offset]);

      // Count total
      const countQuery = `
        SELECT COUNT(DISTINCT ar.approval_id)
        FROM approval_requests ar
        JOIN approval_workflows aw ON ar.workflow_id = aw.workflow_id
        JOIN approval_steps as_step ON aw.workflow_id = as_step.workflow_id
          AND ar.current_step = as_step.step_order
        WHERE ar.company_id = $1
          AND ar.status = 'pending'
          AND (
            (as_step.approver_type = 'user' AND as_step.approver_config->>'user_id' = $2::text)
            OR
            (as_step.approver_type = 'role' AND EXISTS (
              SELECT 1 FROM user_roles ur
              WHERE ur.user_id = $2
              AND ur.role_name = as_step.approver_config->>'role_name'
            ))
          )
      `;

      const countResult = await client.query(countQuery, [company_id, user_id.toString()]);

      return {
        data: dataResult.rows,
        total: parseInt(countResult.rows[0].count)
      };

    } catch (error) {
      this.logger.error('Error getting pending approvals', { error, user_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get approval history
   */
  async getApprovalHistory(approval_id: number): Promise<ApprovalHistory[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          ah.*,
          as_step.step_name,
          u.first_name || ' ' || u.last_name as approver_name
        FROM approval_history ah
        JOIN approval_steps as_step ON ah.step_id = as_step.step_id
        LEFT JOIN users u ON ah.approver_id = u.user_id
        WHERE ah.approval_id = $1
        ORDER BY ah.decision_date DESC
      `;

      const result = await client.query(query, [approval_id]);
      return result.rows;

    } catch (error) {
      this.logger.error('Error getting approval history', { error, approval_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cancel approval request
   */
  async cancelApproval(approval_id: number, cancelled_by: number, reason?: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Update status
      const updateQuery = `
        UPDATE approval_requests
        SET status = 'cancelled', updated_at = NOW()
        WHERE approval_id = $1 AND status = 'pending'
        RETURNING *
      `;

      const result = await client.query(updateQuery, [approval_id]);

      if (result.rows.length === 0) {
        throw new Error('Approval request not found or not pending');
      }

      // Record cancellation in history
      const historyQuery = `
        INSERT INTO approval_history (
          approval_id, step_id, approver_id, action, comments, decision_date
        ) VALUES ($1, $2, $3, 'cancelled', $4, NOW())
      `;

      await client.query(historyQuery, [
        approval_id,
        result.rows[0].current_step,
        cancelled_by,
        reason || 'Approval cancelled'
      ]);

      await client.query('COMMIT');

      this.logger.info('Approval cancelled', { approval_id, cancelled_by });

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error cancelling approval', { error, approval_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Auto-approve based on conditions
   */
  async processAutoApprovals(): Promise<number> {
    const client = await this.pool.connect();
    let processedCount = 0;

    try {
      // Get pending approvals with auto-approve conditions
      const query = `
        SELECT ar.*, as_step.auto_approve_conditions
        FROM approval_requests ar
        JOIN approval_steps as_step ON ar.workflow_id = as_step.workflow_id
          AND ar.current_step = as_step.step_order
        WHERE ar.status = 'pending'
          AND as_step.auto_approve_conditions IS NOT NULL
          AND as_step.auto_approve_conditions != '{}'::jsonb
      `;

      const result = await client.query(query);

      for (const approval of result.rows) {
        const shouldAutoApprove = await this.evaluateAutoApproveConditions(
          approval,
          approval.auto_approve_conditions
        );

        if (shouldAutoApprove) {
          await this.processApproval(
            approval.approval_id,
            0, // System user
            'approved',
            'Auto-approved based on conditions'
          );
          processedCount++;
        }
      }

      this.logger.info('Auto-approval processing completed', { processedCount });
      return processedCount;

    } catch (error) {
      this.logger.error('Error processing auto-approvals', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find applicable workflow for entity
   */
  private async findApplicableWorkflow(
    company_id: number,
    entity_type: string,
    entity_id: number,
    metadata?: any
  ): Promise<ApprovalWorkflow | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT * FROM approval_workflows
        WHERE company_id = $1
          AND entity_type = $2
          AND is_active = true
        ORDER BY workflow_id
      `;

      const result = await client.query(query, [company_id, entity_type]);

      // For now, return first matching workflow
      // TODO: Implement condition evaluation for trigger_conditions
      return result.rows[0] || null;

    } catch (error) {
      this.logger.error('Error finding applicable workflow', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if user can approve current step
   */
  private async canUserApprove(
    user_id: number,
    approval_id: number,
    step_order: number
  ): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT as_step.approver_type, as_step.approver_config
        FROM approval_requests ar
        JOIN approval_steps as_step ON ar.workflow_id = as_step.workflow_id
          AND $3 = as_step.step_order
        WHERE ar.approval_id = $1
      `;

      const result = await client.query(query, [approval_id, user_id, step_order]);

      if (result.rows.length === 0) {
        return false;
      }

      const step = result.rows[0];

      if (step.approver_type === 'user') {
        return step.approver_config.user_id === user_id.toString();
      }

      // TODO: Implement role-based and other approval types
      return false;

    } catch (error) {
      this.logger.error('Error checking approval permission', { error });
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Send notifications for approval step
   */
  private async sendStepNotifications(approval_id: number, step_order: number): Promise<void> {
    // TODO: Implement notification logic
    this.logger.info('Sending step notifications', { approval_id, step_order });
  }

  /**
   * Execute approval actions
   */
  private async executeApprovalActions(approvalRequest: any): Promise<void> {
    // TODO: Implement approval actions (e.g., activate quote, apply pricing rule)
    this.logger.info('Executing approval actions', { approval_id: approvalRequest.approval_id });
  }

  /**
   * Execute rejection actions
   */
  private async executeRejectionActions(approvalRequest: any): Promise<void> {
    // TODO: Implement rejection actions
    this.logger.info('Executing rejection actions', { approval_id: approvalRequest.approval_id });
  }

  /**
   * Create delegation record
   */
  private async createDelegation(
    approval_id: number,
    delegator_id: number,
    delegate_to: number
  ): Promise<void> {
    // TODO: Implement delegation logic
    this.logger.info('Creating delegation', { approval_id, delegator_id, delegate_to });
  }

  /**
   * Calculate priority based on metadata
   */
  private calculatePriority(metadata?: any): 'low' | 'medium' | 'high' | 'urgent' {
    if (!metadata) return 'medium';

    // Example priority logic
    if (metadata.amount > 100000) return 'urgent';
    if (metadata.amount > 50000) return 'high';
    if (metadata.amount > 10000) return 'medium';
    return 'low';
  }

  /**
   * Calculate due date based on priority
   */
  private calculateDueDate(priority: string): Date {
    const now = new Date();
    const hoursToAdd = {
      'urgent': 4,
      'high': 24,
      'medium': 72,
      'low': 168
    }[priority] || 72;

    return new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
  }

  /**
   * Evaluate auto-approve conditions
   */
  private async evaluateAutoApproveConditions(
    approval: any,
    conditions: any
  ): Promise<boolean> {
    // TODO: Implement condition evaluation logic
    return false;
  }
}