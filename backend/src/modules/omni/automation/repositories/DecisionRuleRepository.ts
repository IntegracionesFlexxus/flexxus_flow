/**
 * Decision Rule Repository - Sprint 12 Fase 2
 * Data access layer for decision rules
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { IDecisionRule } from '../../interfaces/IAIWorkflow';
import { DecisionRuleType } from '../../types/workflow-ai.types';

@injectable()
export class DecisionRuleRepository {
  constructor(
    @inject(TYPES.OmniConnection)
    private db: Pool
  ) {}

  async create(
    tenantId: string,
    ruleName: string,
    ruleType: DecisionRuleType,
    conditions: any,
    actions: any[],
    options?: {
      mlModelId?: string;
      confidenceThreshold?: number;
      priority?: number;
    }
  ): Promise<IDecisionRule> {
    const query = `
      INSERT INTO decision_rules (
        tenant_id, rule_name, rule_type, conditions, ml_model_id,
        confidence_threshold, actions, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      tenantId,
      ruleName,
      ruleType,
      JSON.stringify(conditions),
      options?.mlModelId,
      options?.confidenceThreshold || 0.8,
      JSON.stringify(actions),
      options?.priority || 1
    ];

    const result = await this.db.query(query, values);
    return this.mapToRule(result.rows[0]);
  }

  async findById(id: string, tenantId: string): Promise<IDecisionRule | null> {
    const query = 'SELECT * FROM decision_rules WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return result.rows[0] ? this.mapToRule(result.rows[0]) : null;
  }

  async findAll(tenantId: string, activeOnly: boolean = true): Promise<IDecisionRule[]> {
    let query = 'SELECT * FROM decision_rules WHERE tenant_id = $1';

    if (activeOnly) {
      query += ' AND is_active = true';
    }

    query += ' ORDER BY priority DESC, created_at DESC';

    const result = await this.db.query(query, [tenantId]);
    return result.rows.map(row => this.mapToRule(row));
  }

  async findByRuleType(
    ruleType: DecisionRuleType,
    tenantId: string,
    activeOnly: boolean = true
  ): Promise<IDecisionRule[]> {
    let query = 'SELECT * FROM decision_rules WHERE rule_type = $1 AND tenant_id = $2';

    if (activeOnly) {
      query += ' AND is_active = true';
    }

    query += ' ORDER BY priority DESC, created_at DESC';

    const result = await this.db.query(query, [ruleType, tenantId]);
    return result.rows.map(row => this.mapToRule(row));
  }

  async findActive(tenantId: string): Promise<IDecisionRule[]> {
    const query = `
      SELECT * FROM decision_rules
      WHERE tenant_id = $1 AND is_active = true
      ORDER BY priority DESC, created_at DESC
    `;
    const result = await this.db.query(query, [tenantId]);
    return result.rows.map(row => this.mapToRule(row));
  }

  async update(id: string, tenantId: string, data: Partial<IDecisionRule>): Promise<IDecisionRule | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'tenant_id') {
        fields.push(`${key} = $${paramIndex}`);
        if (typeof value === 'object') {
          values.push(JSON.stringify(value));
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
      UPDATE decision_rules
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0] ? this.mapToRule(result.rows[0]) : null;
  }

  async updateStatistics(
    id: string,
    tenantId: string,
    stats: { executionCount?: number; successRate?: number }
  ): Promise<void> {
    const query = `
      UPDATE decision_rules
      SET
        execution_count = COALESCE($1, execution_count),
        success_rate = COALESCE($2, success_rate),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND tenant_id = $4
    `;
    await this.db.query(query, [
      stats.executionCount,
      stats.successRate,
      id,
      tenantId
    ]);
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const query = 'DELETE FROM decision_rules WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return (result.rowCount ?? 0) > 0;
  }

  async activate(id: string, tenantId: string): Promise<void> {
    const query = `
      UPDATE decision_rules
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
    `;
    await this.db.query(query, [id, tenantId]);
  }

  async deactivate(id: string, tenantId: string): Promise<void> {
    const query = `
      UPDATE decision_rules
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
    `;
    await this.db.query(query, [id, tenantId]);
  }

  private mapToRule(row: any): IDecisionRule {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      rule_name: row.rule_name,
      rule_type: row.rule_type,
      conditions: row.conditions,
      ml_model_id: row.ml_model_id,
      confidence_threshold: parseFloat(row.confidence_threshold),
      actions: row.actions,
      priority: row.priority,
      is_active: row.is_active,
      execution_count: row.execution_count,
      success_rate: row.success_rate ? parseFloat(row.success_rate) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
