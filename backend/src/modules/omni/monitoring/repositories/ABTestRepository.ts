/**
 * A/B Test Repository - Sprint 12 Fase 4
 * Data access layer for A/B testing of ML models
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { TestStatus, TestVariant } from '../../types/monitoring.types';

export interface IABTest {
  id: string;
  tenant_id: string;
  test_name: string;
  description?: string;
  control_deployment_id: string;
  variant_deployments: Record<string, string>; // variant_name -> deployment_id
  traffic_split: Record<string, number>; // variant_name -> percentage
  success_metrics: string[];
  test_status: TestStatus;
  started_at?: Date;
  ended_at?: Date;
  created_by?: string;
  created_at: Date;
  metadata?: Record<string, any>;
}

export interface IABTestResult {
  id: string;
  test_id: string;
  tenant_id: string;
  variant: TestVariant;
  deployment_id: string;
  metric_name: string;
  metric_value: number;
  sample_size: number;
  confidence_interval?: {
    lower: number;
    upper: number;
    confidence_level: number;
  };
  recorded_at: Date;
}

@injectable()
export class ABTestRepository {
  constructor(
    @inject(TYPES.OmniConnection)
    private db: Pool
  ) {}

  // ==================== A/B Test CRUD ====================

  async createTest(
    tenantId: string,
    testName: string,
    controlDeploymentId: string,
    variantDeployments: Record<string, string>,
    trafficSplit: Record<string, number>,
    successMetrics: string[],
    options?: {
      description?: string;
      createdBy?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<IABTest> {
    const query = `
      INSERT INTO ab_tests (
        tenant_id, test_name, description, control_deployment_id,
        variant_deployments, traffic_split, success_metrics,
        created_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      tenantId,
      testName,
      options?.description,
      controlDeploymentId,
      JSON.stringify(variantDeployments),
      JSON.stringify(trafficSplit),
      JSON.stringify(successMetrics),
      options?.createdBy,
      options?.metadata ? JSON.stringify(options.metadata) : null
    ];

    const result = await this.db.query(query, values);
    return this.mapToTest(result.rows[0]);
  }

  async findById(id: string, tenantId: string): Promise<IABTest | null> {
    const query = 'SELECT * FROM ab_tests WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return result.rows[0] ? this.mapToTest(result.rows[0]) : null;
  }

  async findAll(tenantId: string, limit: number = 100): Promise<IABTest[]> {
    const query = `
      SELECT * FROM ab_tests
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await this.db.query(query, [tenantId, limit]);
    return result.rows.map(row => this.mapToTest(row));
  }

  async findByStatus(
    status: TestStatus,
    tenantId: string,
    limit: number = 100
  ): Promise<IABTest[]> {
    const query = `
      SELECT * FROM ab_tests
      WHERE test_status = $1 AND tenant_id = $2
      ORDER BY created_at DESC
      LIMIT $3
    `;
    const result = await this.db.query(query, [status, tenantId, limit]);
    return result.rows.map(row => this.mapToTest(row));
  }

  async startTest(id: string, tenantId: string): Promise<void> {
    const query = `
      UPDATE ab_tests
      SET test_status = 'running', started_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
    `;
    await this.db.query(query, [id, tenantId]);
  }

  async endTest(id: string, tenantId: string): Promise<void> {
    const query = `
      UPDATE ab_tests
      SET test_status = 'completed', ended_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
    `;
    await this.db.query(query, [id, tenantId]);
  }

  async deleteTest(id: string, tenantId: string): Promise<void> {
    // Delete results first
    await this.db.query('DELETE FROM ab_test_results WHERE test_id = $1 AND tenant_id = $2', [
      id,
      tenantId
    ]);

    // Delete test
    await this.db.query('DELETE FROM ab_tests WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
  }

  // ==================== A/B Test Results ====================

  async recordResult(
    testId: string,
    tenantId: string,
    variant: TestVariant,
    deploymentId: string,
    metricName: string,
    metricValue: number,
    sampleSize: number,
    confidenceInterval?: {
      lower: number;
      upper: number;
      confidence_level: number;
    }
  ): Promise<IABTestResult> {
    const query = `
      INSERT INTO ab_test_results (
        test_id, tenant_id, variant, deployment_id, metric_name,
        metric_value, sample_size, confidence_interval
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      testId,
      tenantId,
      variant,
      deploymentId,
      metricName,
      metricValue,
      sampleSize,
      confidenceInterval ? JSON.stringify(confidenceInterval) : null
    ];

    const result = await this.db.query(query, values);
    return this.mapToResult(result.rows[0]);
  }

  async findResultsByTestId(testId: string, tenantId: string): Promise<IABTestResult[]> {
    const query = `
      SELECT * FROM ab_test_results
      WHERE test_id = $1 AND tenant_id = $2
      ORDER BY recorded_at DESC
    `;
    const result = await this.db.query(query, [testId, tenantId]);
    return result.rows.map(row => this.mapToResult(row));
  }

  async findResultsByVariant(
    testId: string,
    variant: TestVariant,
    tenantId: string
  ): Promise<IABTestResult[]> {
    const query = `
      SELECT * FROM ab_test_results
      WHERE test_id = $1 AND variant = $2 AND tenant_id = $3
      ORDER BY recorded_at DESC
    `;
    const result = await this.db.query(query, [testId, variant, tenantId]);
    return result.rows.map(row => this.mapToResult(row));
  }

  async getAggregatedResults(
    testId: string,
    tenantId: string
  ): Promise<
    Array<{
      variant: string;
      metric_name: string;
      avg_value: number;
      total_samples: number;
    }>
  > {
    const query = `
      SELECT
        variant,
        metric_name,
        AVG(metric_value) as avg_value,
        SUM(sample_size) as total_samples
      FROM ab_test_results
      WHERE test_id = $1 AND tenant_id = $2
      GROUP BY variant, metric_name
      ORDER BY variant, metric_name
    `;

    const result = await this.db.query(query, [testId, tenantId]);

    return result.rows.map(row => ({
      variant: row.variant,
      metric_name: row.metric_name,
      avg_value: parseFloat(row.avg_value),
      total_samples: parseInt(row.total_samples)
    }));
  }

  // ==================== Private Mappers ====================

  private mapToTest(row: any): IABTest {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      test_name: row.test_name,
      description: row.description,
      control_deployment_id: row.control_deployment_id,
      variant_deployments: row.variant_deployments || {},
      traffic_split: row.traffic_split || {},
      success_metrics: row.success_metrics || [],
      test_status: row.test_status,
      started_at: row.started_at,
      ended_at: row.ended_at,
      created_by: row.created_by,
      created_at: row.created_at,
      metadata: row.metadata
    };
  }

  private mapToResult(row: any): IABTestResult {
    return {
      id: row.id,
      test_id: row.test_id,
      tenant_id: row.tenant_id,
      variant: row.variant,
      deployment_id: row.deployment_id,
      metric_name: row.metric_name,
      metric_value: parseFloat(row.metric_value),
      sample_size: row.sample_size,
      confidence_interval: row.confidence_interval,
      recorded_at: row.recorded_at
    };
  }
}
