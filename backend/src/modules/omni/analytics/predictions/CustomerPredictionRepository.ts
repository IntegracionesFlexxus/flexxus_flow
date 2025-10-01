/**
 * Customer Prediction Repository - Sprint 12 Fase 3
 * Data access layer for customer behavior predictions
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { BehaviorPredictionType } from '../../types/prediction.types';

export interface ICustomerPrediction {
  id: string;
  customer_id: string;
  tenant_id: string;
  prediction_type: BehaviorPredictionType;
  prediction_value: Record<string, any>;
  confidence_score: number;
  prediction_horizon?: number;
  features_used: Record<string, any>;
  model_version?: string;
  predicted_at: Date;
  expires_at?: Date;
  actual_outcome?: Record<string, any>;
  outcome_recorded_at?: Date;
}

@injectable()
export class CustomerPredictionRepository {
  constructor(
    @inject(TYPES.OmniConnection)
    private db: Pool
  ) {}

  async create(
    customerId: string,
    tenantId: string,
    predictionType: BehaviorPredictionType,
    predictionValue: Record<string, any>,
    confidenceScore: number,
    featuresUsed: Record<string, any>,
    options?: {
      predictionHorizon?: number;
      modelVersion?: string;
      expiresAt?: Date;
    }
  ): Promise<ICustomerPrediction> {
    const query = `
      INSERT INTO customer_behavior_predictions (
        customer_id, tenant_id, prediction_type, prediction_value,
        confidence_score, prediction_horizon, features_used,
        model_version, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      customerId,
      tenantId,
      predictionType,
      JSON.stringify(predictionValue),
      confidenceScore,
      options?.predictionHorizon,
      JSON.stringify(featuresUsed),
      options?.modelVersion,
      options?.expiresAt
    ];

    const result = await this.db.query(query, values);
    return this.mapToPrediction(result.rows[0]);
  }

  async findByCustomerId(customerId: string, tenantId: string): Promise<ICustomerPrediction[]> {
    const query = `
      SELECT * FROM customer_behavior_predictions
      WHERE customer_id = $1 AND tenant_id = $2
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY predicted_at DESC
    `;
    const result = await this.db.query(query, [customerId, tenantId]);
    return result.rows.map(row => this.mapToPrediction(row));
  }

  async findByPredictionType(
    predictionType: BehaviorPredictionType,
    tenantId: string,
    limit: number = 100
  ): Promise<ICustomerPrediction[]> {
    const query = `
      SELECT * FROM customer_behavior_predictions
      WHERE prediction_type = $1 AND tenant_id = $2
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY predicted_at DESC
      LIMIT $3
    `;
    const result = await this.db.query(query, [predictionType, tenantId, limit]);
    return result.rows.map(row => this.mapToPrediction(row));
  }

  async findExpiring(tenantId: string, hoursThreshold: number = 24): Promise<ICustomerPrediction[]> {
    const query = `
      SELECT * FROM customer_behavior_predictions
      WHERE tenant_id = $1
        AND expires_at IS NOT NULL
        AND expires_at <= CURRENT_TIMESTAMP + INTERVAL '${hoursThreshold} hours'
        AND expires_at > CURRENT_TIMESTAMP
      ORDER BY expires_at ASC
    `;
    const result = await this.db.query(query, [tenantId]);
    return result.rows.map(row => this.mapToPrediction(row));
  }

  async recordActualOutcome(
    id: string,
    tenantId: string,
    actualOutcome: Record<string, any>
  ): Promise<void> {
    const query = `
      UPDATE customer_behavior_predictions
      SET actual_outcome = $1, outcome_recorded_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND tenant_id = $3
    `;
    await this.db.query(query, [JSON.stringify(actualOutcome), id, tenantId]);
  }

  private mapToPrediction(row: any): ICustomerPrediction {
    return {
      id: row.id,
      customer_id: row.customer_id,
      tenant_id: row.tenant_id,
      prediction_type: row.prediction_type,
      prediction_value: row.prediction_value || {},
      confidence_score: parseFloat(row.confidence_score),
      prediction_horizon: row.prediction_horizon,
      features_used: row.features_used || {},
      model_version: row.model_version,
      predicted_at: row.predicted_at,
      expires_at: row.expires_at,
      actual_outcome: row.actual_outcome,
      outcome_recorded_at: row.outcome_recorded_at
    };
  }
}
