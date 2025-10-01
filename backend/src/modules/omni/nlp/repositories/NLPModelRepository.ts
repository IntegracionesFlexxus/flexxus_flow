/**
 * NLP Model Repository - Sprint 12
 * Data access layer for NLP models
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { INLPModel, CreateNLPModelDTO, UpdateNLPModelDTO } from '../../interfaces/INLPModel';

@injectable()
export class NLPModelRepository {
  constructor(
    @inject(TYPES.OmniConnection)
    private db: Pool
  ) {}

  async create(tenantId: string, data: CreateNLPModelDTO): Promise<INLPModel> {
    const query = `
      INSERT INTO nlp_models (
        tenant_id, model_name, model_type, language, provider, model_config
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      tenantId,
      data.model_name,
      data.model_type,
      data.language || 'en',
      data.provider,
      JSON.stringify(data.model_config || {})
    ];

    const result = await this.db.query(query, values);
    return this.mapToModel(result.rows[0]);
  }

  async findById(id: string, tenantId: string): Promise<INLPModel | null> {
    const query = 'SELECT * FROM nlp_models WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return result.rows[0] ? this.mapToModel(result.rows[0]) : null;
  }

  async findByType(modelType: string, tenantId: string): Promise<INLPModel[]> {
    const query = `
      SELECT * FROM nlp_models
      WHERE model_type = $1 AND tenant_id = $2 AND is_active = true
      ORDER BY created_at DESC
    `;
    const result = await this.db.query(query, [modelType, tenantId]);
    return result.rows.map(row => this.mapToModel(row));
  }

  async findAll(tenantId: string): Promise<INLPModel[]> {
    const query = 'SELECT * FROM nlp_models WHERE tenant_id = $1 ORDER BY created_at DESC';
    const result = await this.db.query(query, [tenantId]);
    return result.rows.map(row => this.mapToModel(row));
  }

  async update(id: string, tenantId: string, data: UpdateNLPModelDTO): Promise<INLPModel | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
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
      UPDATE nlp_models
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0] ? this.mapToModel(result.rows[0]) : null;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const query = 'DELETE FROM nlp_models WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapToModel(row: any): INLPModel {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      model_name: row.model_name,
      model_type: row.model_type,
      language: row.language,
      provider: row.provider,
      model_config: row.model_config || {},
      performance_metrics: row.performance_metrics || {},
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
