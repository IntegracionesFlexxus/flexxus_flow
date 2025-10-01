/**
 * ML Model Repository - Sprint 12
 * Data access layer for ML models
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { IMLModel, CreateMLModelDTO, UpdateMLModelDTO } from '../../interfaces/IMLModel';
import { MLModelStatus } from '../../types/ml.types';

@injectable()
export class MLModelRepository {
  constructor(
    @inject(TYPES.OmniConnection)
    private db: Pool
  ) {}

  async create(tenantId: string, data: CreateMLModelDTO, createdBy?: string): Promise<IMLModel> {
    const query = `
      INSERT INTO ml_models (
        tenant_id, name, display_name, description, model_type, framework,
        version, configuration, hyperparameters, training_data_info, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      tenantId,
      data.name,
      data.display_name,
      data.description,
      data.model_type,
      data.framework,
      data.version,
      JSON.stringify(data.configuration || {}),
      JSON.stringify(data.hyperparameters || {}),
      JSON.stringify(data.training_data_info || {}),
      createdBy
    ];

    const result = await this.db.query(query, values);
    return this.mapToModel(result.rows[0]);
  }

  async findById(id: string, tenantId: string): Promise<IMLModel | null> {
    const query = 'SELECT * FROM ml_models WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return result.rows[0] ? this.mapToModel(result.rows[0]) : null;
  }

  async findAll(tenantId: string, filters?: { status?: MLModelStatus; model_type?: string }): Promise<IMLModel[]> {
    let query = 'SELECT * FROM ml_models WHERE tenant_id = $1';
    const values: any[] = [tenantId];
    let paramIndex = 2;

    if (filters?.status) {
      query += ` AND status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }

    if (filters?.model_type) {
      query += ` AND model_type = $${paramIndex}`;
      values.push(filters.model_type);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapToModel(row));
  }

  async update(id: string, tenantId: string, data: UpdateMLModelDTO): Promise<IMLModel | null> {
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
      UPDATE ml_models
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0] ? this.mapToModel(result.rows[0]) : null;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const query = 'DELETE FROM ml_models WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return (result.rowCount ?? 0) > 0;
  }

  async updatePerformanceMetrics(id: string, tenantId: string, metrics: Record<string, any>): Promise<void> {
    const query = `
      UPDATE ml_models
      SET performance_metrics = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND tenant_id = $3
    `;
    await this.db.query(query, [JSON.stringify(metrics), id, tenantId]);
  }

  async updateStatus(id: string, tenantId: string, status: MLModelStatus): Promise<void> {
    const query = `
      UPDATE ml_models
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND tenant_id = $3
    `;
    await this.db.query(query, [status, id, tenantId]);
  }

  private mapToModel(row: any): IMLModel {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      name: row.name,
      display_name: row.display_name,
      description: row.description,
      model_type: row.model_type,
      framework: row.framework,
      version: row.version,
      status: row.status,
      configuration: row.configuration || {},
      hyperparameters: row.hyperparameters || {},
      performance_metrics: row.performance_metrics || {},
      model_artifacts_path: row.model_artifacts_path,
      model_size_bytes: row.model_size_bytes,
      training_data_info: row.training_data_info || {},
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deployed_at: row.deployed_at,
      retired_at: row.retired_at
    };
  }
}
