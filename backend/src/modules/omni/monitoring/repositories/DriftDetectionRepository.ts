/**
 * Drift Detection Repository - Sprint 12 Fase 4
 * Data access layer for data and concept drift detection
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { DriftType, DriftSeverity } from '../../types/monitoring.types';

export interface IDriftDetection {
  id: string;
  tenant_id: string;
  deployment_id: string;
  drift_type: DriftType;
  drift_severity: DriftSeverity;
  drift_score: number;
  affected_features?: string[];
  statistical_tests?: Record<string, any>;
  baseline_period?: {
    start: Date;
    end: Date;
  };
  detection_period?: {
    start: Date;
    end: Date;
  };
  detected_at: Date;
  acknowledged_at?: Date;
  resolved_at?: Date;
  metadata?: Record<string, any>;
}

@injectable()
export class DriftDetectionRepository {
  constructor(
    @inject(TYPES.OmniConnection)
    private db: Pool
  ) {}

  async create(
    tenantId: string,
    deploymentId: string,
    driftType: DriftType,
    driftSeverity: DriftSeverity,
    driftScore: number,
    options?: {
      affectedFeatures?: string[];
      statisticalTests?: Record<string, any>;
      baselinePeriod?: { start: Date; end: Date };
      detectionPeriod?: { start: Date; end: Date };
      metadata?: Record<string, any>;
    }
  ): Promise<IDriftDetection> {
    const query = `
      INSERT INTO drift_detection (
        tenant_id, deployment_id, drift_type, drift_severity, drift_score,
        affected_features, statistical_tests, baseline_period,
        detection_period, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      tenantId,
      deploymentId,
      driftType,
      driftSeverity,
      driftScore,
      options?.affectedFeatures ? JSON.stringify(options.affectedFeatures) : null,
      options?.statisticalTests ? JSON.stringify(options.statisticalTests) : null,
      options?.baselinePeriod ? JSON.stringify(options.baselinePeriod) : null,
      options?.detectionPeriod ? JSON.stringify(options.detectionPeriod) : null,
      options?.metadata ? JSON.stringify(options.metadata) : null
    ];

    const result = await this.db.query(query, values);
    return this.mapToDrift(result.rows[0]);
  }

  async findById(id: string, tenantId: string): Promise<IDriftDetection | null> {
    const query = 'SELECT * FROM drift_detection WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return result.rows[0] ? this.mapToDrift(result.rows[0]) : null;
  }

  async findByDeploymentId(
    deploymentId: string,
    tenantId: string,
    limit: number = 100
  ): Promise<IDriftDetection[]> {
    const query = `
      SELECT * FROM drift_detection
      WHERE deployment_id = $1 AND tenant_id = $2
      ORDER BY detected_at DESC
      LIMIT $3
    `;
    const result = await this.db.query(query, [deploymentId, tenantId, limit]);
    return result.rows.map(row => this.mapToDrift(row));
  }

  async findUnresolved(
    tenantId: string,
    deploymentId?: string
  ): Promise<IDriftDetection[]> {
    let query = `
      SELECT * FROM drift_detection
      WHERE tenant_id = $1 AND resolved_at IS NULL
    `;

    const params: any[] = [tenantId];

    if (deploymentId) {
      query += ` AND deployment_id = $2`;
      params.push(deploymentId);
    }

    query += ` ORDER BY drift_severity DESC, detected_at DESC`;

    const result = await this.db.query(query, params);
    return result.rows.map(row => this.mapToDrift(row));
  }

  async findBySeverity(
    severity: DriftSeverity,
    tenantId: string,
    limit: number = 100
  ): Promise<IDriftDetection[]> {
    const query = `
      SELECT * FROM drift_detection
      WHERE drift_severity = $1 AND tenant_id = $2
        AND resolved_at IS NULL
      ORDER BY detected_at DESC
      LIMIT $3
    `;
    const result = await this.db.query(query, [severity, tenantId, limit]);
    return result.rows.map(row => this.mapToDrift(row));
  }

  async findByDriftType(
    driftType: DriftType,
    tenantId: string,
    limit: number = 100
  ): Promise<IDriftDetection[]> {
    const query = `
      SELECT * FROM drift_detection
      WHERE drift_type = $1 AND tenant_id = $2
      ORDER BY detected_at DESC
      LIMIT $3
    `;
    const result = await this.db.query(query, [driftType, tenantId, limit]);
    return result.rows.map(row => this.mapToDrift(row));
  }

  async acknowledge(id: string, tenantId: string): Promise<void> {
    const query = `
      UPDATE drift_detection
      SET acknowledged_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
    `;
    await this.db.query(query, [id, tenantId]);
  }

  async resolve(id: string, tenantId: string): Promise<void> {
    const query = `
      UPDATE drift_detection
      SET resolved_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
    `;
    await this.db.query(query, [id, tenantId]);
  }

  private mapToDrift(row: any): IDriftDetection {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      deployment_id: row.deployment_id,
      drift_type: row.drift_type,
      drift_severity: row.drift_severity,
      drift_score: parseFloat(row.drift_score),
      affected_features: row.affected_features,
      statistical_tests: row.statistical_tests,
      baseline_period: row.baseline_period,
      detection_period: row.detection_period,
      detected_at: row.detected_at,
      acknowledged_at: row.acknowledged_at,
      resolved_at: row.resolved_at,
      metadata: row.metadata
    };
  }
}
