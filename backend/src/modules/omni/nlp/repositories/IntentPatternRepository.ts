/**
 * Intent Pattern Repository - Sprint 12
 * Data access layer for intent patterns
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { IIntentPattern } from '../../interfaces/INLPModel';
import { PatternType } from '../../types/nlp.types';

@injectable()
export class IntentPatternRepository {
  constructor(
    @inject(TYPES.OmniConnection)
    private db: Pool
  ) {}

  async create(
    tenantId: string,
    intentName: string,
    pattern: string,
    patternType: PatternType,
    options?: {
      confidenceThreshold?: number;
      trainingExamples?: string[];
    }
  ): Promise<IIntentPattern> {
    const query = `
      INSERT INTO intent_patterns (
        tenant_id, intent_name, pattern, pattern_type,
        confidence_threshold, training_examples
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      tenantId,
      intentName,
      pattern,
      patternType,
      options?.confidenceThreshold || 0.8,
      JSON.stringify(options?.trainingExamples || [])
    ];

    const result = await this.db.query(query, values);
    return this.mapToPattern(result.rows[0]);
  }

  async findById(id: string, tenantId: string): Promise<IIntentPattern | null> {
    const query = 'SELECT * FROM intent_patterns WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return result.rows[0] ? this.mapToPattern(result.rows[0]) : null;
  }

  async findByIntent(intentName: string, tenantId: string): Promise<IIntentPattern[]> {
    const query = `
      SELECT * FROM intent_patterns
      WHERE intent_name = $1 AND tenant_id = $2 AND is_active = true
      ORDER BY created_at DESC
    `;
    const result = await this.db.query(query, [intentName, tenantId]);
    return result.rows.map(row => this.mapToPattern(row));
  }

  async findAll(tenantId: string, activeOnly: boolean = true): Promise<IIntentPattern[]> {
    let query = 'SELECT * FROM intent_patterns WHERE tenant_id = $1';

    if (activeOnly) {
      query += ' AND is_active = true';
    }

    query += ' ORDER BY intent_name, created_at DESC';

    const result = await this.db.query(query, [tenantId]);
    return result.rows.map(row => this.mapToPattern(row));
  }

  async update(id: string, tenantId: string, data: Partial<IIntentPattern>): Promise<IIntentPattern | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'tenant_id') {
        fields.push(`${key} = $${paramIndex}`);
        if (Array.isArray(value)) {
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
      UPDATE intent_patterns
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0] ? this.mapToPattern(result.rows[0]) : null;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const query = 'DELETE FROM intent_patterns WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapToPattern(row: any): IIntentPattern {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      intent_name: row.intent_name,
      pattern: row.pattern,
      pattern_type: row.pattern_type,
      confidence_threshold: parseFloat(row.confidence_threshold),
      training_examples: row.training_examples || [],
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
