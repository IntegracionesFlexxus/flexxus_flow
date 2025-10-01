/**
 * Model Monitoring Repository - Sprint 12 Fase 4
 * Data access layer for ML model performance monitoring
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';

export interface IModelMetrics {
  id: string;
  tenant_id: string;
  deployment_id: string;
  metric_timestamp: Date;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
  auc_roc?: number;
  latency_ms?: number;
  throughput_rps?: number;
  error_rate?: number;
  custom_metrics?: Record<string, number>;
  sample_size?: number;
  created_at: Date;
}

@injectable()
export class ModelMonitoringRepository {
  constructor(
    @inject(TYPES.OmniConnection)
    private db: Pool
  ) {}

  async recordMetrics(
    tenantId: string,
    deploymentId: string,
    metrics: {
      accuracy?: number;
      precision?: number;
      recall?: number;
      f1Score?: number;
      aucRoc?: number;
      latencyMs?: number;
      throughputRps?: number;
      errorRate?: number;
      customMetrics?: Record<string, number>;
      sampleSize?: number;
    }
  ): Promise<IModelMetrics> {
    const query = `
      INSERT INTO model_performance_metrics (
        tenant_id, deployment_id, accuracy, precision, recall,
        f1_score, auc_roc, latency_ms, throughput_rps, error_rate,
        custom_metrics, sample_size
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      tenantId,
      deploymentId,
      metrics.accuracy,
      metrics.precision,
      metrics.recall,
      metrics.f1Score,
      metrics.aucRoc,
      metrics.latencyMs,
      metrics.throughputRps,
      metrics.errorRate,
      metrics.customMetrics ? JSON.stringify(metrics.customMetrics) : null,
      metrics.sampleSize
    ];

    const result = await this.db.query(query, values);
    return this.mapToMetrics(result.rows[0]);
  }

  async findByDeploymentId(
    deploymentId: string,
    tenantId: string,
    limit: number = 100
  ): Promise<IModelMetrics[]> {
    const query = `
      SELECT * FROM model_performance_metrics
      WHERE deployment_id = $1 AND tenant_id = $2
      ORDER BY metric_timestamp DESC
      LIMIT $3
    `;
    const result = await this.db.query(query, [deploymentId, tenantId, limit]);
    return result.rows.map(row => this.mapToMetrics(row));
  }

  async findByDateRange(
    deploymentId: string,
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IModelMetrics[]> {
    const query = `
      SELECT * FROM model_performance_metrics
      WHERE deployment_id = $1 AND tenant_id = $2
        AND metric_timestamp BETWEEN $3 AND $4
      ORDER BY metric_timestamp ASC
    `;
    const result = await this.db.query(query, [deploymentId, tenantId, startDate, endDate]);
    return result.rows.map(row => this.mapToMetrics(row));
  }

  async getAverageMetrics(
    deploymentId: string,
    tenantId: string,
    hours: number = 24
  ): Promise<Partial<IModelMetrics>> {
    const query = `
      SELECT
        AVG(accuracy) as avg_accuracy,
        AVG(precision) as avg_precision,
        AVG(recall) as avg_recall,
        AVG(f1_score) as avg_f1_score,
        AVG(auc_roc) as avg_auc_roc,
        AVG(latency_ms) as avg_latency_ms,
        AVG(throughput_rps) as avg_throughput_rps,
        AVG(error_rate) as avg_error_rate,
        COUNT(*) as metric_count
      FROM model_performance_metrics
      WHERE deployment_id = $1 AND tenant_id = $2
        AND metric_timestamp >= CURRENT_TIMESTAMP - INTERVAL '${hours} hours'
    `;

    const result = await this.db.query(query, [deploymentId, tenantId]);
    const row = result.rows[0];

    return {
      accuracy: row.avg_accuracy ? parseFloat(row.avg_accuracy) : undefined,
      precision: row.avg_precision ? parseFloat(row.avg_precision) : undefined,
      recall: row.avg_recall ? parseFloat(row.avg_recall) : undefined,
      f1_score: row.avg_f1_score ? parseFloat(row.avg_f1_score) : undefined,
      auc_roc: row.avg_auc_roc ? parseFloat(row.avg_auc_roc) : undefined,
      latency_ms: row.avg_latency_ms ? parseFloat(row.avg_latency_ms) : undefined,
      throughput_rps: row.avg_throughput_rps ? parseFloat(row.avg_throughput_rps) : undefined,
      error_rate: row.avg_error_rate ? parseFloat(row.avg_error_rate) : undefined
    };
  }

  async getLatestMetrics(
    deploymentId: string,
    tenantId: string
  ): Promise<IModelMetrics | null> {
    const query = `
      SELECT * FROM model_performance_metrics
      WHERE deployment_id = $1 AND tenant_id = $2
      ORDER BY metric_timestamp DESC
      LIMIT 1
    `;
    const result = await this.db.query(query, [deploymentId, tenantId]);
    return result.rows[0] ? this.mapToMetrics(result.rows[0]) : null;
  }

  private mapToMetrics(row: any): IModelMetrics {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      deployment_id: row.deployment_id,
      metric_timestamp: row.metric_timestamp,
      accuracy: row.accuracy ? parseFloat(row.accuracy) : undefined,
      precision: row.precision ? parseFloat(row.precision) : undefined,
      recall: row.recall ? parseFloat(row.recall) : undefined,
      f1_score: row.f1_score ? parseFloat(row.f1_score) : undefined,
      auc_roc: row.auc_roc ? parseFloat(row.auc_roc) : undefined,
      latency_ms: row.latency_ms ? parseFloat(row.latency_ms) : undefined,
      throughput_rps: row.throughput_rps ? parseFloat(row.throughput_rps) : undefined,
      error_rate: row.error_rate ? parseFloat(row.error_rate) : undefined,
      custom_metrics: row.custom_metrics,
      sample_size: row.sample_size,
      created_at: row.created_at
    };
  }
}
