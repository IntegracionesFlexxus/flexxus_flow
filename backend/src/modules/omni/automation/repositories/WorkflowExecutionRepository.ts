/**
 * Workflow Execution Repository - Sprint 12 Fase 2
 * Data access layer for workflow executions
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { IWorkflowExecution } from '../../interfaces/IAIWorkflow';
import { WorkflowExecutionResult } from '../../types/workflow-ai.types';

@injectable()
export class WorkflowExecutionRepository {
  constructor(
    @inject(TYPES.OmniConnection)
    private db: Pool
  ) {}

  async create(
    workflowId: string,
    triggerData: Record<string, any>,
    executionPath: any[],
    decisionsMade: Record<string, any>,
    actionsTaken: Record<string, any>,
    executionResult: WorkflowExecutionResult,
    tenantId: string,
    executionTimeMs?: number,
    errorDetails?: string
  ): Promise<IWorkflowExecution> {
    const query = `
      INSERT INTO workflow_executions (
        workflow_id, trigger_data, execution_path, decisions_made,
        actions_taken, execution_result, execution_time_ms,
        error_details, tenant_id, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      workflowId,
      JSON.stringify(triggerData),
      JSON.stringify(executionPath),
      JSON.stringify(decisionsMade),
      JSON.stringify(actionsTaken),
      executionResult,
      executionTimeMs,
      errorDetails,
      tenantId
    ];

    const result = await this.db.query(query, values);
    return this.mapToExecution(result.rows[0]);
  }

  async findById(id: string, tenantId: string): Promise<IWorkflowExecution | null> {
    const query = 'SELECT * FROM workflow_executions WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return result.rows[0] ? this.mapToExecution(result.rows[0]) : null;
  }

  async findByWorkflowId(
    workflowId: string,
    tenantId: string,
    limit: number = 100
  ): Promise<IWorkflowExecution[]> {
    const query = `
      SELECT * FROM workflow_executions
      WHERE workflow_id = $1 AND tenant_id = $2
      ORDER BY started_at DESC
      LIMIT $3
    `;
    const result = await this.db.query(query, [workflowId, tenantId, limit]);
    return result.rows.map(row => this.mapToExecution(row));
  }

  async findByStatus(
    executionResult: WorkflowExecutionResult,
    tenantId: string,
    limit: number = 100
  ): Promise<IWorkflowExecution[]> {
    const query = `
      SELECT * FROM workflow_executions
      WHERE execution_result = $1 AND tenant_id = $2
      ORDER BY started_at DESC
      LIMIT $3
    `;
    const result = await this.db.query(query, [executionResult, tenantId, limit]);
    return result.rows.map(row => this.mapToExecution(row));
  }

  async getExecutionStats(workflowId: string, tenantId: string): Promise<any> {
    const query = `
      SELECT
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE execution_result = 'success') as successful,
        COUNT(*) FILTER (WHERE execution_result = 'failed') as failed,
        COUNT(*) FILTER (WHERE execution_result = 'partial_success') as partial_success,
        COUNT(*) FILTER (WHERE execution_result = 'timeout') as timeout,
        AVG(execution_time_ms) as avg_execution_time_ms,
        MIN(execution_time_ms) as min_execution_time_ms,
        MAX(execution_time_ms) as max_execution_time_ms
      FROM workflow_executions
      WHERE workflow_id = $1 AND tenant_id = $2
    `;

    const result = await this.db.query(query, [workflowId, tenantId]);
    const row = result.rows[0];

    return {
      total_executions: parseInt(row.total_executions || '0'),
      successful: parseInt(row.successful || '0'),
      failed: parseInt(row.failed || '0'),
      partial_success: parseInt(row.partial_success || '0'),
      timeout: parseInt(row.timeout || '0'),
      success_rate: row.total_executions > 0
        ? (parseInt(row.successful) / parseInt(row.total_executions)) * 100
        : 0,
      avg_execution_time_ms: row.avg_execution_time_ms ? parseFloat(row.avg_execution_time_ms) : 0,
      min_execution_time_ms: row.min_execution_time_ms,
      max_execution_time_ms: row.max_execution_time_ms
    };
  }

  async getRecentExecutions(tenantId: string, limit: number = 50): Promise<IWorkflowExecution[]> {
    const query = `
      SELECT * FROM workflow_executions
      WHERE tenant_id = $1
      ORDER BY started_at DESC
      LIMIT $2
    `;
    const result = await this.db.query(query, [tenantId, limit]);
    return result.rows.map(row => this.mapToExecution(row));
  }

  private mapToExecution(row: any): IWorkflowExecution {
    return {
      id: row.id,
      workflow_id: row.workflow_id,
      trigger_data: row.trigger_data || {},
      execution_path: row.execution_path || [],
      decisions_made: row.decisions_made || {},
      actions_taken: row.actions_taken || {},
      execution_result: row.execution_result,
      execution_time_ms: row.execution_time_ms,
      error_details: row.error_details,
      tenant_id: row.tenant_id,
      started_at: row.started_at,
      completed_at: row.completed_at
    };
  }
}
