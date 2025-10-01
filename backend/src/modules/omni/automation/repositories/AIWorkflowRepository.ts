/**
 * AI Workflow Repository - Sprint 12 Fase 2
 * Data access layer for AI workflows
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { IAIWorkflow, CreateAIWorkflowDTO, UpdateAIWorkflowDTO } from '../../interfaces/IAIWorkflow';
import { WorkflowStatus } from '../../types/workflow-ai.types';

@injectable()
export class AIWorkflowRepository {
  constructor(
    @inject(TYPES.OmniConnection)
    private db: Pool
  ) {}

  async create(tenantId: string, data: CreateAIWorkflowDTO, createdBy?: string): Promise<IAIWorkflow> {
    const query = `
      INSERT INTO ai_workflows (
        tenant_id, workflow_name, description, trigger_conditions,
        decision_tree, actions, ml_models_used, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      tenantId,
      data.workflow_name,
      data.description,
      JSON.stringify(data.trigger_conditions),
      JSON.stringify(data.decision_tree),
      JSON.stringify(data.actions),
      data.ml_models_used || [],
      createdBy
    ];

    const result = await this.db.query(query, values);
    return this.mapToWorkflow(result.rows[0]);
  }

  async findById(id: string, tenantId: string): Promise<IAIWorkflow | null> {
    const query = 'SELECT * FROM ai_workflows WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return result.rows[0] ? this.mapToWorkflow(result.rows[0]) : null;
  }

  async findAll(tenantId: string, filters?: { status?: WorkflowStatus }): Promise<IAIWorkflow[]> {
    let query = 'SELECT * FROM ai_workflows WHERE tenant_id = $1';
    const values: any[] = [tenantId];
    let paramIndex = 2;

    if (filters?.status) {
      query += ` AND status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapToWorkflow(row));
  }

  async findByStatus(status: WorkflowStatus, tenantId: string): Promise<IAIWorkflow[]> {
    const query = `
      SELECT * FROM ai_workflows
      WHERE status = $1 AND tenant_id = $2
      ORDER BY created_at DESC
    `;
    const result = await this.db.query(query, [status, tenantId]);
    return result.rows.map(row => this.mapToWorkflow(row));
  }

  async update(id: string, tenantId: string, data: UpdateAIWorkflowDTO): Promise<IAIWorkflow | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        if (typeof value === 'object' && !Array.isArray(value)) {
          values.push(JSON.stringify(value));
        } else if (Array.isArray(value)) {
          values.push(value);
        } else {
          values.push(value);
        }
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.findById(id, tenantId);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, tenantId);

    const query = `
      UPDATE ai_workflows
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0] ? this.mapToWorkflow(result.rows[0]) : null;
  }

  async updateStatus(id: string, tenantId: string, status: WorkflowStatus): Promise<void> {
    const query = `
      UPDATE ai_workflows
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND tenant_id = $3
    `;
    await this.db.query(query, [status, id, tenantId]);
  }

  async updateStatistics(
    id: string,
    tenantId: string,
    stats: { executionCount?: number; successRate?: number; avgExecutionTimeMs?: number }
  ): Promise<void> {
    const query = `
      UPDATE ai_workflows
      SET
        execution_count = COALESCE($1, execution_count),
        success_rate = COALESCE($2, success_rate),
        avg_execution_time_ms = COALESCE($3, avg_execution_time_ms),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND tenant_id = $5
    `;
    await this.db.query(query, [
      stats.executionCount,
      stats.successRate,
      stats.avgExecutionTimeMs,
      id,
      tenantId
    ]);
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const query = 'DELETE FROM ai_workflows WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapToWorkflow(row: any): IAIWorkflow {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      workflow_name: row.workflow_name,
      description: row.description,
      trigger_conditions: row.trigger_conditions,
      decision_tree: row.decision_tree,
      actions: row.actions,
      ml_models_used: row.ml_models_used || [],
      status: row.status,
      execution_count: row.execution_count,
      success_rate: row.success_rate ? parseFloat(row.success_rate) : undefined,
      avg_execution_time_ms: row.avg_execution_time_ms,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
