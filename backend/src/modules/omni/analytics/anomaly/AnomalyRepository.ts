/**
 * Anomaly Repository - Sprint 12 Fase 3
 * Data access layer for anomaly detection
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { AnomalyType, AnomalySeverity } from '../../types/prediction.types';

export interface IAnomaly {
  id: string;
  entity_type: string;
  entity_id: string;
  anomaly_type: AnomalyType;
  anomaly_score: number;
  severity: AnomalySeverity;
  description?: string;
  features: Record<string, any>;
  detection_model?: string;
  detected_at: Date;
  acknowledged_at?: Date;
  resolved_at?: Date;
  false_positive?: boolean;
  tenant_id: string;
}

@injectable()
export class AnomalyRepository {
  constructor(
    @inject(TYPES.OmniConnection)
    private db: Pool
  ) {}

  async create(
    entityType: string,
    entityId: string,
    anomalyType: AnomalyType,
    anomalyScore: number,
    severity: AnomalySeverity,
    features: Record<string, any>,
    tenantId: string,
    options?: {
      description?: string;
      detectionModel?: string;
    }
  ): Promise<IAnomaly> {
    const query = `
      INSERT INTO anomaly_detections (
        entity_type, entity_id, anomaly_type, anomaly_score,
        severity, description, features, detection_model, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      entityType,
      entityId,
      anomalyType,
      anomalyScore,
      severity,
      options?.description,
      JSON.stringify(features),
      options?.detectionModel,
      tenantId
    ];

    const result = await this.db.query(query, values);
    return this.mapToAnomaly(result.rows[0]);
  }

  async findById(id: string, tenantId: string): Promise<IAnomaly | null> {
    const query = 'SELECT * FROM anomaly_detections WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return result.rows[0] ? this.mapToAnomaly(result.rows[0]) : null;
  }

  async findByEntityType(
    entityType: string,
    tenantId: string,
    limit: number = 100
  ): Promise<IAnomaly[]> {
    const query = `
      SELECT * FROM anomaly_detections
      WHERE entity_type = $1 AND tenant_id = $2
      ORDER BY detected_at DESC
      LIMIT $3
    `;
    const result = await this.db.query(query, [entityType, tenantId, limit]);
    return result.rows.map(row => this.mapToAnomaly(row));
  }

  async findBySeverity(
    severity: AnomalySeverity,
    tenantId: string,
    limit: number = 100
  ): Promise<IAnomaly[]> {
    const query = `
      SELECT * FROM anomaly_detections
      WHERE severity = $1 AND tenant_id = $2
        AND resolved_at IS NULL
      ORDER BY detected_at DESC
      LIMIT $3
    `;
    const result = await this.db.query(query, [severity, tenantId, limit]);
    return result.rows.map(row => this.mapToAnomaly(row));
  }

  async findUnresolved(tenantId: string, limit: number = 100): Promise<IAnomaly[]> {
    const query = `
      SELECT * FROM anomaly_detections
      WHERE tenant_id = $1 AND resolved_at IS NULL AND false_positive IS NOT true
      ORDER BY severity DESC, detected_at DESC
      LIMIT $2
    `;
    const result = await this.db.query(query, [tenantId, limit]);
    return result.rows.map(row => this.mapToAnomaly(row));
  }

  async acknowledge(id: string, tenantId: string): Promise<void> {
    const query = `
      UPDATE anomaly_detections
      SET acknowledged_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
    `;
    await this.db.query(query, [id, tenantId]);
  }

  async resolve(id: string, tenantId: string, isFalsePositive: boolean = false): Promise<void> {
    const query = `
      UPDATE anomaly_detections
      SET resolved_at = CURRENT_TIMESTAMP, false_positive = $1
      WHERE id = $2 AND tenant_id = $3
    `;
    await this.db.query(query, [isFalsePositive, id, tenantId]);
  }

  private mapToAnomaly(row: any): IAnomaly {
    return {
      id: row.id,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      anomaly_type: row.anomaly_type,
      anomaly_score: parseFloat(row.anomaly_score),
      severity: row.severity,
      description: row.description,
      features: row.features || {},
      detection_model: row.detection_model,
      detected_at: row.detected_at,
      acknowledged_at: row.acknowledged_at,
      resolved_at: row.resolved_at,
      false_positive: row.false_positive,
      tenant_id: row.tenant_id
    };
  }
}
