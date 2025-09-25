/**
 * Task Automation Repository
 * Manages task automation rules and execution data operations
 */

import { injectable, inject } from 'inversify';
import { CRMBaseRepository } from './CRMBaseRepository';
import { TYPES } from '@/container/types';

export interface TaskAutomationRule {
  id?: number;
  company_id: number;
  name: string;
  description?: string;
  trigger_type: 'event_created' | 'status_change' | 'due_date' | 'assignment' | 'custom';
  trigger_conditions: any;
  action_type: 'create_task' | 'update_task' | 'send_notification' | 'create_activity';
  action_config: any;
  is_active?: boolean;
  priority?: number;
  run_once?: boolean;
  last_triggered_at?: Date;
  trigger_count?: number;
  error_count?: number;
  last_error?: string;
  created_by?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface TaskAutomationExecution {
  id?: number;
  rule_id: number;
  company_id: number;
  trigger_entity_type?: string;
  trigger_entity_id?: number;
  execution_status: 'success' | 'failure' | 'skipped';
  execution_details?: any;
  error_message?: string;
  executed_at?: Date;
}

@injectable()
export class TaskAutomationRepository extends CRMBaseRepository<TaskAutomationRule> {
  constructor(
    @inject(TYPES.CRMDatabaseConnection) db: any,
    @inject(TYPES.Logger) logger?: any
  ) {
    super('task_automation_rules', db, logger);

    // Define allowed fields for this entity
    this.allowedFields = new Set([
      'id', 'company_id', 'name', 'description', 'trigger_type',
      'trigger_conditions', 'action_type', 'action_config', 'is_active',
      'priority', 'run_once', 'last_triggered_at', 'trigger_count',
      'error_count', 'last_error', 'created_by', 'created_at', 'updated_at'
    ]);
  }

  /**
   * Get all active rules for a company
   */
  async getActiveRules(companyId: number, triggerType?: string): Promise<TaskAutomationRule[]> {
    const conditions: any = {
      company_id: companyId,
      is_active: true
    };

    if (triggerType) {
      conditions.trigger_type = triggerType;
    }

    return this.findMany(conditions, {
      orderBy: 'priority DESC, created_at ASC'
    });
  }

  /**
   * Get rules that match a specific trigger
   */
  async getMatchingRules(
    companyId: number,
    triggerType: string,
    entityData: any
  ): Promise<TaskAutomationRule[]> {
    const query = `
      SELECT *
      FROM ${this.getFullTableName()}
      WHERE company_id = $1
        AND trigger_type = $2
        AND is_active = true
        AND (
          run_once = false
          OR id NOT IN (
            SELECT rule_id
            FROM task_automation_executions
            WHERE trigger_entity_type = $3
              AND trigger_entity_id = $4
              AND execution_status = 'success'
          )
        )
      ORDER BY priority DESC, created_at ASC
    `;

    const result = await this.db.query(query, [
      companyId,
      triggerType,
      entityData.type || null,
      entityData.id || null
    ]);

    return result.rows;
  }

  /**
   * Log rule execution
   */
  async logExecution(execution: TaskAutomationExecution): Promise<void> {
    const query = `
      INSERT INTO task_automation_executions
      (rule_id, company_id, trigger_entity_type, trigger_entity_id,
       execution_status, execution_details, error_message, executed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id
    `;

    try {
      const result = await this.db.query(query, [
        execution.rule_id,
        execution.company_id,
        execution.trigger_entity_type || null,
        execution.trigger_entity_id || null,
        execution.execution_status,
        JSON.stringify(execution.execution_details || {}),
        execution.error_message || null
      ]);

      this.logger?.debug(`Logged execution ${result.rows[0].id} for rule ${execution.rule_id}`);
    } catch (error) {
      this.logger?.error('Error logging automation execution:', error);
      throw error;
    }
  }

  /**
   * Update rule statistics after execution
   */
  async updateRuleStatistics(
    ruleId: number,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    const updates: any = {
      last_triggered_at: new Date(),
      updated_at: new Date()
    };

    if (success) {
      updates.trigger_count = this.db.raw('COALESCE(trigger_count, 0) + 1');
    } else {
      updates.error_count = this.db.raw('COALESCE(error_count, 0) + 1');
      if (errorMessage) {
        updates.last_error = errorMessage;
      }
    }

    // Use raw SQL for increment operations
    const query = `
      UPDATE ${this.getFullTableName()}
      SET
        last_triggered_at = NOW(),
        trigger_count = ${success ? 'COALESCE(trigger_count, 0) + 1' : 'trigger_count'},
        error_count = ${!success ? 'COALESCE(error_count, 0) + 1' : 'error_count'},
        ${errorMessage ? `last_error = '${errorMessage.replace(/'/g, "''")}',` : ''}
        updated_at = NOW()
      WHERE id = $1
    `;

    await this.db.query(query, [ruleId]);
    this.logger?.debug(`Updated statistics for rule ${ruleId}: success=${success}`);
  }

  /**
   * Get execution history for a rule
   */
  async getExecutionHistory(
    ruleId: number,
    limit: number = 100
  ): Promise<TaskAutomationExecution[]> {
    const query = `
      SELECT *
      FROM task_automation_executions
      WHERE rule_id = $1
      ORDER BY executed_at DESC
      LIMIT $2
    `;

    const result = await this.db.query(query, [ruleId, limit]);
    return result.rows;
  }

  /**
   * Get execution statistics
   */
  async getExecutionStatistics(companyId: number, days: number = 30): Promise<any> {
    const query = `
      SELECT
        r.id as rule_id,
        r.name as rule_name,
        r.trigger_type,
        COUNT(e.id) as total_executions,
        COUNT(CASE WHEN e.execution_status = 'success' THEN 1 END) as successful_executions,
        COUNT(CASE WHEN e.execution_status = 'failure' THEN 1 END) as failed_executions,
        COUNT(CASE WHEN e.execution_status = 'skipped' THEN 1 END) as skipped_executions,
        MAX(e.executed_at) as last_execution
      FROM ${this.getFullTableName()} r
      LEFT JOIN task_automation_executions e ON r.id = e.rule_id
        AND e.executed_at >= NOW() - INTERVAL '${days} days'
      WHERE r.company_id = $1
      GROUP BY r.id, r.name, r.trigger_type
      ORDER BY total_executions DESC
    `;

    const result = await this.db.query(query, [companyId]);
    return result.rows;
  }

  /**
   * Clean up old execution logs
   */
  async cleanupExecutionLogs(daysToKeep: number = 90): Promise<number> {
    const query = `
      DELETE FROM task_automation_executions
      WHERE executed_at < NOW() - INTERVAL '${daysToKeep} days'
    `;

    const result = await this.db.query(query);
    const deletedCount = result.rowCount || 0;

    this.logger?.info(`Cleaned up ${deletedCount} old execution logs`);
    return deletedCount;
  }

  /**
   * Clone an automation rule
   */
  async cloneRule(ruleId: number, newName: string, userId: number): Promise<TaskAutomationRule> {
    const original = await this.findById(ruleId);
    if (!original) {
      throw new Error('Rule not found');
    }

    const cloned = {
      ...original,
      id: undefined,
      name: newName,
      is_active: false, // Start cloned rules as inactive
      trigger_count: 0,
      error_count: 0,
      last_triggered_at: undefined,
      last_error: undefined,
      created_by: userId,
      created_at: undefined,
      updated_at: undefined
    };

    return this.create(cloned);
  }
}