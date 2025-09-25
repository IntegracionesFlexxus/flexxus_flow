/**
 * Approval Repository - Sprint 19
 * Handles approval workflows and processes
 */

import { injectable, inject } from 'inversify';
import { Pool, PoolClient } from 'pg';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
import { CRMBaseRepository } from './CRMBaseRepository';

export interface ApprovalWorkflow {
  workflow_id?: number;
  company_id: number;
  workflow_name: string;
  description?: string;
  entity_type: string;
  workflow_type?: WorkflowType;
  trigger_conditions?: any;
  auto_approve_conditions?: any;
  auto_approve_below_amount?: number;
  escalation_enabled?: boolean;
  escalation_hours?: number;
  is_active?: boolean;
  is_default?: boolean;
  priority?: number;
  metadata?: any;
  created_at?: Date;
  updated_at?: Date;
  created_by?: number;
  updated_by?: number;
}

export interface WorkflowStep {
  step_id?: number;
  workflow_id: number;
  step_number: number;
  step_name: string;
  description?: string;
  step_type?: StepType;
  approval_type?: ApprovalType;
  required_approvals?: number;
  approver_users?: number[];
  approver_roles?: string[];
  approver_groups?: string[];
  skip_conditions?: any;
  approval_conditions?: any;
  time_limit_hours?: number;
  reminder_hours?: number;
  on_approve_actions?: any;
  on_reject_actions?: any;
  on_timeout_actions?: any;
  is_active?: boolean;
  metadata?: any;
}

export interface ApprovalProcess {
  process_id?: number;
  workflow_id: number;
  company_id: number;
  entity_type: string;
  entity_id: number;
  entity_reference?: string;
  process_number?: string;
  title?: string;
  description?: string;
  current_step_number?: number;
  status?: ProcessStatus;
  requested_by: number;
  requested_at?: Date;
  request_comments?: string;
  priority?: ProcessPriority;
  completed_at?: Date;
  completed_by?: number;
  completion_comments?: string;
  escalated?: boolean;
  escalated_at?: Date;
  escalated_to?: number;
  context_data?: any;
  metadata?: any;
  created_at?: Date;
  updated_at?: Date;
}

export interface ApprovalDecision {
  decision_id?: number;
  process_id: number;
  process_step_id: number;
  decision: DecisionType;
  comments?: string;
  conditions_applied?: any;
  approver_id: number;
  approver_name?: string;
  approver_role?: string;
  delegated_from?: number;
  delegation_reason?: string;
  attachment_urls?: string[];
  metadata?: any;
  decided_at?: Date;
  ip_address?: string;
  user_agent?: string;
}

export type WorkflowType = 'sequential' | 'parallel' | 'custom';
export type StepType = 'approval' | 'notification' | 'condition';
export type ApprovalType = 'any' | 'all' | 'threshold' | 'specific';
export type ProcessStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled' | 'expired';
export type ProcessPriority = 'low' | 'normal' | 'high' | 'urgent';
export type DecisionType = 'approved' | 'rejected' | 'returned' | 'delegated';

@injectable()
export class ApprovalRepository extends CRMBaseRepository {
  constructor(
    @inject(TYPES.DatabasePool) pool: Pool,
    @inject(TYPES.Logger) logger: Logger
  ) {
    super(pool, logger);
  }

  /**
   * Create an approval workflow
   */
  async createWorkflow(workflow: ApprovalWorkflow, userId?: number): Promise<ApprovalWorkflow> {
    const query = `
      INSERT INTO approval_workflows (
        company_id, workflow_name, description, entity_type, workflow_type,
        trigger_conditions, auto_approve_conditions, auto_approve_below_amount,
        escalation_enabled, escalation_hours, is_active, is_default,
        priority, metadata, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      workflow.company_id,
      workflow.workflow_name,
      workflow.description,
      workflow.entity_type,
      workflow.workflow_type || 'sequential',
      JSON.stringify(workflow.trigger_conditions || {}),
      JSON.stringify(workflow.auto_approve_conditions || {}),
      workflow.auto_approve_below_amount,
      workflow.escalation_enabled ?? true,
      workflow.escalation_hours || 48,
      workflow.is_active ?? true,
      workflow.is_default || false,
      workflow.priority || 0,
      JSON.stringify(workflow.metadata || {}),
      userId || workflow.created_by,
      userId || workflow.updated_by
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Add step to workflow
   */
  async addWorkflowStep(step: WorkflowStep): Promise<WorkflowStep> {
    const query = `
      INSERT INTO approval_workflow_steps (
        workflow_id, step_number, step_name, description, step_type,
        approval_type, required_approvals, approver_users, approver_roles,
        approver_groups, skip_conditions, approval_conditions,
        time_limit_hours, reminder_hours, on_approve_actions,
        on_reject_actions, on_timeout_actions, is_active, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;

    const values = [
      step.workflow_id,
      step.step_number,
      step.step_name,
      step.description,
      step.step_type || 'approval',
      step.approval_type || 'any',
      step.required_approvals || 1,
      step.approver_users || [],
      step.approver_roles || [],
      step.approver_groups || [],
      JSON.stringify(step.skip_conditions || {}),
      JSON.stringify(step.approval_conditions || {}),
      step.time_limit_hours,
      step.reminder_hours,
      JSON.stringify(step.on_approve_actions || {}),
      JSON.stringify(step.on_reject_actions || {}),
      JSON.stringify(step.on_timeout_actions || {}),
      step.is_active ?? true,
      JSON.stringify(step.metadata || {})
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get workflow by criteria
   */
  async getWorkflow(criteria: {
    workflow_id?: number;
    company_id?: number;
    entity_type?: string;
    is_default?: boolean;
    is_active?: boolean;
  }): Promise<ApprovalWorkflow | null> {
    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (criteria.workflow_id) {
      conditions.push(`workflow_id = $${paramCount}`);
      params.push(criteria.workflow_id);
      paramCount++;
    }

    if (criteria.company_id) {
      conditions.push(`company_id = $${paramCount}`);
      params.push(criteria.company_id);
      paramCount++;
    }

    if (criteria.entity_type) {
      conditions.push(`entity_type = $${paramCount}`);
      params.push(criteria.entity_type);
      paramCount++;
    }

    if (criteria.is_default !== undefined) {
      conditions.push(`is_default = $${paramCount}`);
      params.push(criteria.is_default);
      paramCount++;
    }

    if (criteria.is_active !== undefined) {
      conditions.push(`is_active = $${paramCount}`);
      params.push(criteria.is_active);
      paramCount++;
    }

    const query = `
      SELECT * FROM approval_workflows
      WHERE ${conditions.join(' AND ')}
      ORDER BY priority DESC, workflow_id
      LIMIT 1
    `;

    const result = await this.pool.query(query, params);
    return result.rows[0] || null;
  }

  /**
   * Get workflow steps
   */
  async getWorkflowSteps(workflowId: number): Promise<WorkflowStep[]> {
    const result = await this.pool.query(
      `SELECT * FROM approval_workflow_steps
       WHERE workflow_id = $1 AND is_active = true
       ORDER BY step_number`,
      [workflowId]
    );

    return result.rows;
  }

  /**
   * Initiate approval process
   */
  async initiateApprovalProcess(
    process: ApprovalProcess,
    client?: PoolClient
  ): Promise<ApprovalProcess> {
    const queryClient = client || await this.pool.connect();

    try {
      if (!client) await queryClient.query('BEGIN');

      // Generate process number
      const processNumber = await this.generateProcessNumber(process.company_id, queryClient);

      // Create the process
      const processQuery = `
        INSERT INTO approval_processes (
          workflow_id, company_id, entity_type, entity_id, entity_reference,
          process_number, title, description, current_step_number, status,
          requested_by, request_comments, priority, context_data, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const processValues = [
        process.workflow_id,
        process.company_id,
        process.entity_type,
        process.entity_id,
        process.entity_reference,
        processNumber,
        process.title,
        process.description,
        1, // Start with step 1
        'in_progress',
        process.requested_by,
        process.request_comments,
        process.priority || 'normal',
        JSON.stringify(process.context_data || {}),
        JSON.stringify(process.metadata || {})
      ];

      const processResult = await queryClient.query(processQuery, processValues);
      const newProcess = processResult.rows[0];

      // Create process steps based on workflow
      const workflowSteps = await this.getWorkflowSteps(process.workflow_id);

      for (const workflowStep of workflowSteps) {
        const stepStatus = workflowStep.step_number === 1 ? 'in_progress' : 'pending';

        const stepQuery = `
          INSERT INTO approval_process_steps (
            process_id, workflow_step_id, step_number, step_name,
            status, approvals_required, approvals_received
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        await queryClient.query(stepQuery, [
          newProcess.process_id,
          workflowStep.step_id,
          workflowStep.step_number,
          workflowStep.step_name,
          stepStatus,
          workflowStep.required_approvals || 1,
          0
        ]);

        // Send notifications for first step
        if (workflowStep.step_number === 1) {
          await this.sendApprovalNotifications(
            newProcess.process_id,
            workflowStep,
            'approval_request',
            queryClient
          );
        }
      }

      if (!client) await queryClient.query('COMMIT');
      return newProcess;

    } catch (error) {
      if (!client) await queryClient.query('ROLLBACK');
      throw error;
    } finally {
      if (!client) queryClient.release();
    }
  }

  /**
   * Generate process number
   */
  private async generateProcessNumber(companyId: number, client: PoolClient): Promise<string> {
    const result = await client.query(
      `SELECT COUNT(*) + 1 as next_number
       FROM approval_processes
       WHERE company_id = $1
       AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [companyId]
    );

    const year = new Date().getFullYear();
    const number = String(result.rows[0].next_number).padStart(6, '0');
    return `APR-${year}-${number}`;
  }

  /**
   * Get active processes for user
   */
  async getActiveProcesses(userId: number): Promise<ApprovalProcess[]> {
    const query = `
      SELECT DISTINCT p.*
      FROM approval_processes p
      INNER JOIN approval_process_steps ps ON p.process_id = ps.process_id
      INNER JOIN approval_workflow_steps ws ON ps.workflow_step_id = ws.step_id
      WHERE ps.status = 'in_progress'
        AND p.status = 'in_progress'
        AND (
          $1 = ANY(ws.approver_users)
          OR EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = $1
            AND ur.role_name = ANY(ws.approver_roles)
          )
        )
      ORDER BY
        CASE p.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
        END,
        p.created_at
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Record approval decision
   */
  async recordDecision(decision: ApprovalDecision): Promise<ApprovalDecision> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Insert decision
      const decisionQuery = `
        INSERT INTO approval_decisions (
          process_id, process_step_id, decision, comments,
          conditions_applied, approver_id, approver_name, approver_role,
          delegated_from, delegation_reason, attachment_urls, metadata,
          ip_address, user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const decisionValues = [
        decision.process_id,
        decision.process_step_id,
        decision.decision,
        decision.comments,
        JSON.stringify(decision.conditions_applied || {}),
        decision.approver_id,
        decision.approver_name,
        decision.approver_role,
        decision.delegated_from,
        decision.delegation_reason,
        decision.attachment_urls || [],
        JSON.stringify(decision.metadata || {}),
        decision.ip_address,
        decision.user_agent
      ];

      const decisionResult = await client.query(decisionQuery, decisionValues);
      const newDecision = decisionResult.rows[0];

      // Update process step
      const stepUpdateQuery = `
        UPDATE approval_process_steps
        SET approvals_received = approvals_received + 1,
            status = CASE
              WHEN $1 = 'approved' AND approvals_received + 1 >= approvals_required THEN 'approved'
              WHEN $1 = 'rejected' THEN 'rejected'
              ELSE status
            END,
            completed_at = CASE
              WHEN $1 IN ('approved', 'rejected') THEN CURRENT_TIMESTAMP
              ELSE completed_at
            END
        WHERE process_step_id = $2
        RETURNING *
      `;

      const stepResult = await client.query(stepUpdateQuery, [
        decision.decision,
        decision.process_step_id
      ]);

      const updatedStep = stepResult.rows[0];

      // If step is completed, handle process progression
      if (updatedStep.status === 'approved') {
        await this.progressToNextStep(decision.process_id, client);
      } else if (updatedStep.status === 'rejected') {
        await this.rejectProcess(decision.process_id, decision.approver_id, client);
      }

      await client.query('COMMIT');
      return newDecision;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Progress to next step
   */
  private async progressToNextStep(processId: number, client: PoolClient): Promise<void> {
    // Get current process state
    const processResult = await client.query(
      `SELECT * FROM approval_processes WHERE process_id = $1`,
      [processId]
    );

    const process = processResult.rows[0];
    const nextStepNumber = process.current_step_number + 1;

    // Check if there's a next step
    const nextStepResult = await client.query(
      `SELECT ps.*, ws.*
       FROM approval_process_steps ps
       INNER JOIN approval_workflow_steps ws ON ps.workflow_step_id = ws.step_id
       WHERE ps.process_id = $1 AND ps.step_number = $2`,
      [processId, nextStepNumber]
    );

    if (nextStepResult.rows.length > 0) {
      // Activate next step
      await client.query(
        `UPDATE approval_process_steps
         SET status = 'in_progress', started_at = CURRENT_TIMESTAMP
         WHERE process_id = $1 AND step_number = $2`,
        [processId, nextStepNumber]
      );

      // Update process
      await client.query(
        `UPDATE approval_processes
         SET current_step_number = $1
         WHERE process_id = $2`,
        [nextStepNumber, processId]
      );

      // Send notifications
      await this.sendApprovalNotifications(
        processId,
        nextStepResult.rows[0],
        'approval_request',
        client
      );
    } else {
      // All steps completed - approve process
      await client.query(
        `UPDATE approval_processes
         SET status = 'approved',
             completed_at = CURRENT_TIMESTAMP
         WHERE process_id = $1`,
        [processId]
      );

      // Send completion notification
      await this.sendCompletionNotification(processId, 'approved', client);
    }
  }

  /**
   * Reject process
   */
  private async rejectProcess(
    processId: number,
    rejectedBy: number,
    client: PoolClient
  ): Promise<void> {
    await client.query(
      `UPDATE approval_processes
       SET status = 'rejected',
           completed_at = CURRENT_TIMESTAMP,
           completed_by = $2
       WHERE process_id = $1`,
      [processId, rejectedBy]
    );

    // Update remaining steps
    await client.query(
      `UPDATE approval_process_steps
       SET status = 'skipped'
       WHERE process_id = $1 AND status = 'pending'`,
      [processId]
    );

    // Send rejection notification
    await this.sendCompletionNotification(processId, 'rejected', client);
  }

  /**
   * Send approval notifications
   */
  private async sendApprovalNotifications(
    processId: number,
    workflowStep: any,
    notificationType: string,
    client: PoolClient
  ): Promise<void> {
    const recipients = [
      ...(workflowStep.approver_users || []),
      // Add users from roles and groups
    ];

    for (const recipientId of recipients) {
      const query = `
        INSERT INTO approval_notifications (
          process_id, recipient_id, notification_type,
          subject, message, channel, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      await client.query(query, [
        processId,
        recipientId,
        notificationType,
        `Approval Required: ${workflowStep.step_name}`,
        `You have a pending approval request for ${workflowStep.step_name}`,
        'email',
        'pending'
      ]);
    }
  }

  /**
   * Send completion notification
   */
  private async sendCompletionNotification(
    processId: number,
    status: string,
    client: PoolClient
  ): Promise<void> {
    // Get process details
    const result = await client.query(
      `SELECT * FROM approval_processes WHERE process_id = $1`,
      [processId]
    );

    const process = result.rows[0];

    const query = `
      INSERT INTO approval_notifications (
        process_id, recipient_id, notification_type,
        subject, message, channel, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await client.query(query, [
      processId,
      process.requested_by,
      'completion',
      `Approval Process ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      `Your approval request has been ${status}`,
      'email',
      'pending'
    ]);
  }

  /**
   * Get approval history for entity
   */
  async getApprovalHistory(entityType: string, entityId: number): Promise<ApprovalProcess[]> {
    const result = await this.pool.query(
      `SELECT * FROM approval_processes
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC`,
      [entityType, entityId]
    );

    return result.rows;
  }

  /**
   * Check if entity requires approval
   */
  async requiresApproval(
    entityType: string,
    companyId: number,
    context: any
  ): Promise<{ required: boolean; workflow?: ApprovalWorkflow }> {
    // Get applicable workflows
    const workflows = await this.pool.query(
      `SELECT * FROM approval_workflows
       WHERE company_id = $1
         AND entity_type = $2
         AND is_active = true
       ORDER BY priority DESC`,
      [companyId, entityType]
    );

    for (const workflow of workflows.rows) {
      const conditions = JSON.parse(workflow.trigger_conditions || '{}');

      if (this.evaluateConditions(conditions, context)) {
        // Check auto-approval conditions
        const autoApproveConditions = JSON.parse(workflow.auto_approve_conditions || '{}');

        if (workflow.auto_approve_below_amount && context.amount) {
          if (context.amount < workflow.auto_approve_below_amount) {
            return { required: false };
          }
        }

        if (this.evaluateConditions(autoApproveConditions, context)) {
          return { required: false };
        }

        return { required: true, workflow };
      }
    }

    return { required: false };
  }

  /**
   * Evaluate conditions
   */
  private evaluateConditions(conditions: any, context: any): boolean {
    if (!conditions || Object.keys(conditions).length === 0) {
      return true;
    }

    // Implement condition evaluation logic
    // This is a simplified version - extend as needed
    for (const [field, condition] of Object.entries(conditions)) {
      const contextValue = context[field];

      if (typeof condition === 'object' && condition !== null) {
        const { operator, value } = condition as any;

        switch (operator) {
          case 'gte':
            if (!(contextValue >= value)) return false;
            break;
          case 'gt':
            if (!(contextValue > value)) return false;
            break;
          case 'lte':
            if (!(contextValue <= value)) return false;
            break;
          case 'lt':
            if (!(contextValue < value)) return false;
            break;
          case 'eq':
            if (contextValue !== value) return false;
            break;
          case 'ne':
            if (contextValue === value) return false;
            break;
          case 'in':
            if (!Array.isArray(value) || !value.includes(contextValue)) return false;
            break;
        }
      } else {
        if (contextValue !== condition) return false;
      }
    }

    return true;
  }
}