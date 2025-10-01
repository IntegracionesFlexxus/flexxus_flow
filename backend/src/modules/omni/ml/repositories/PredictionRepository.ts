/**
 * Prediction Repository - Sprint 12
 * Data access layer for ML predictions
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { IMLPrediction, CreatePredictionDTO, IBatchPredictionJob } from '../../interfaces/IPrediction';

@injectable()
export class PredictionRepository {
  constructor(
    @inject(TYPES.OmniConnection)
    private db: Pool
  ) {}

  async create(
    tenantId: string,
    deploymentId: string,
    inputFeatures: Record<string, any>,
    predictionResult: Record<string, any>,
    confidenceScore?: number,
    processingTimeMs?: number,
    modelVersion?: string
  ): Promise<IMLPrediction> {
    const query = `
      INSERT INTO ml_predictions (
        tenant_id, deployment_id, input_features, prediction_result,
        confidence_score, processing_time_ms, model_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      tenantId,
      deploymentId,
      JSON.stringify(inputFeatures),
      JSON.stringify(predictionResult),
      confidenceScore,
      processingTimeMs,
      modelVersion
    ];

    const result = await this.db.query(query, values);
    return this.mapToPrediction(result.rows[0]);
  }

  async findById(id: string, tenantId: string): Promise<IMLPrediction | null> {
    const query = 'SELECT * FROM ml_predictions WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return result.rows[0] ? this.mapToPrediction(result.rows[0]) : null;
  }

  async findByDeploymentId(
    deploymentId: string,
    tenantId: string,
    limit: number = 100
  ): Promise<IMLPrediction[]> {
    const query = `
      SELECT * FROM ml_predictions
      WHERE deployment_id = $1 AND tenant_id = $2
      ORDER BY created_at DESC
      LIMIT $3
    `;
    const result = await this.db.query(query, [deploymentId, tenantId, limit]);
    return result.rows.map(row => this.mapToPrediction(row));
  }

  async getAverageConfidence(deploymentId: string, tenantId: string): Promise<number> {
    const query = `
      SELECT AVG(confidence_score) as avg_confidence
      FROM ml_predictions
      WHERE deployment_id = $1 AND tenant_id = $2
        AND confidence_score IS NOT NULL
    `;
    const result = await this.db.query(query, [deploymentId, tenantId]);
    return parseFloat(result.rows[0]?.avg_confidence || '0');
  }

  async getAverageProcessingTime(deploymentId: string, tenantId: string): Promise<number> {
    const query = `
      SELECT AVG(processing_time_ms) as avg_time
      FROM ml_predictions
      WHERE deployment_id = $1 AND tenant_id = $2
        AND processing_time_ms IS NOT NULL
    `;
    const result = await this.db.query(query, [deploymentId, tenantId]);
    return parseFloat(result.rows[0]?.avg_time || '0');
  }

  async countPredictions(deploymentId: string, tenantId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as total
      FROM ml_predictions
      WHERE deployment_id = $1 AND tenant_id = $2
    `;
    const result = await this.db.query(query, [deploymentId, tenantId]);
    return parseInt(result.rows[0]?.total || '0');
  }

  private mapToPrediction(row: any): IMLPrediction {
    return {
      id: row.id,
      deployment_id: row.deployment_id,
      request_id: row.request_id,
      input_features: row.input_features || {},
      prediction_result: row.prediction_result || {},
      confidence_score: row.confidence_score ? parseFloat(row.confidence_score) : undefined,
      processing_time_ms: row.processing_time_ms,
      model_version: row.model_version,
      tenant_id: row.tenant_id,
      created_at: row.created_at
    };
  }
}
