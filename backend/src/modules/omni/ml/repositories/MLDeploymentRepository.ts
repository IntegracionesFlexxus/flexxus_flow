/**
 * ML Deployment Repository - Sprint 12
 * Data access layer for ML deployments
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { IMLDeployment, CreateMLDeploymentDTO, UpdateMLDeploymentDTO } from '../../interfaces/IMLDeployment';
import { DeploymentStatus, HealthStatus } from '../../types/ml.types';

@injectable()
export class MLDeploymentRepository {
  constructor(
    @inject(TYPES.OmniConnection)
    private db: Pool
  ) {}

  async create(tenantId: string, data: CreateMLDeploymentDTO, createdBy?: string): Promise<IMLDeployment> {
    const query = `
      INSERT INTO ml_deployments (
        tenant_id, model_id, deployment_name, environment, deployment_config,
        resource_allocation, traffic_percentage, auto_scaling_config, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      tenantId,
      data.model_id,
      data.deployment_name,
      data.environment,
      JSON.stringify(data.deployment_config || {}),
      JSON.stringify(data.resource_allocation || {}),
      data.traffic_percentage || 100,
      JSON.stringify(data.auto_scaling_config || {}),
      createdBy
    ];

    const result = await this.db.query(query, values);
    return this.mapToDeployment(result.rows[0]);
  }

  async findById(id: string, tenantId: string): Promise<IMLDeployment | null> {
    const query = 'SELECT * FROM ml_deployments WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return result.rows[0] ? this.mapToDeployment(result.rows[0]) : null;
  }

  async findByModelId(modelId: string, tenantId: string): Promise<IMLDeployment[]> {
    const query = `
      SELECT * FROM ml_deployments
      WHERE model_id = $1 AND tenant_id = $2
      ORDER BY deployed_at DESC
    `;
    const result = await this.db.query(query, [modelId, tenantId]);
    return result.rows.map(row => this.mapToDeployment(row));
  }

  async findAll(tenantId: string, filters?: { status?: DeploymentStatus; environment?: string }): Promise<IMLDeployment[]> {
    let query = 'SELECT * FROM ml_deployments WHERE tenant_id = $1';
    const values: any[] = [tenantId];
    let paramIndex = 2;

    if (filters?.status) {
      query += ` AND status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }

    if (filters?.environment) {
      query += ` AND environment = $${paramIndex}`;
      values.push(filters.environment);
      paramIndex++;
    }

    query += ' ORDER BY deployed_at DESC';

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapToDeployment(row));
  }

  async update(id: string, tenantId: string, data: UpdateMLDeploymentDTO): Promise<IMLDeployment | null> {
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

    values.push(id, tenantId);

    const query = `
      UPDATE ml_deployments
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0] ? this.mapToDeployment(result.rows[0]) : null;
  }

  async updateHealthStatus(id: string, tenantId: string, healthStatus: HealthStatus): Promise<void> {
    const query = `
      UPDATE ml_deployments
      SET health_status = $1, last_health_check = CURRENT_TIMESTAMP
      WHERE id = $2 AND tenant_id = $3
    `;
    await this.db.query(query, [healthStatus, id, tenantId]);
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const query = 'DELETE FROM ml_deployments WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapToDeployment(row: any): IMLDeployment {
    return {
      id: row.id,
      model_id: row.model_id,
      deployment_name: row.deployment_name,
      environment: row.environment,
      endpoint_url: row.endpoint_url,
      deployment_config: row.deployment_config || {},
      resource_allocation: row.resource_allocation || {},
      status: row.status,
      health_status: row.health_status,
      traffic_percentage: parseFloat(row.traffic_percentage),
      auto_scaling_config: row.auto_scaling_config || {},
      deployed_at: row.deployed_at,
      last_health_check: row.last_health_check,
      tenant_id: row.tenant_id,
      created_by: row.created_by
    };
  }
}
