/**
 * Forecast Repository - Sprint 12 Fase 3
 * Data access layer for demand forecasting
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';

export interface IDemandForecast {
  id: string;
  tenant_id: string;
  resource_type: string;
  forecast_horizon: number;
  forecasted_demand: number;
  confidence_interval?: { lower: number; upper: number; confidence_level: number };
  seasonal_factors?: Record<string, any>;
  trend_factors?: Record<string, any>;
  external_factors?: Record<string, any>;
  model_version?: string;
  forecasted_at: Date;
  forecast_for: Date;
  actual_demand?: number;
  accuracy_score?: number;
}

@injectable()
export class ForecastRepository {
  constructor(
    @inject(TYPES.OmniConnection)
    private db: Pool
  ) {}

  async create(
    tenantId: string,
    resourceType: string,
    forecastHorizon: number,
    forecastedDemand: number,
    forecastFor: Date,
    options?: {
      confidenceInterval?: { lower: number; upper: number };
      seasonalFactors?: Record<string, any>;
      trendFactors?: Record<string, any>;
      externalFactors?: Record<string, any>;
      modelVersion?: string;
    }
  ): Promise<IDemandForecast> {
    const query = `
      INSERT INTO demand_forecasts (
        tenant_id, resource_type, forecast_horizon, forecasted_demand,
        confidence_interval, seasonal_factors, trend_factors,
        external_factors, model_version, forecast_for
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      tenantId,
      resourceType,
      forecastHorizon,
      forecastedDemand,
      options?.confidenceInterval ? JSON.stringify(options.confidenceInterval) : null,
      options?.seasonalFactors ? JSON.stringify(options.seasonalFactors) : null,
      options?.trendFactors ? JSON.stringify(options.trendFactors) : null,
      options?.externalFactors ? JSON.stringify(options.externalFactors) : null,
      options?.modelVersion,
      forecastFor
    ];

    const result = await this.db.query(query, values);
    return this.mapToForecast(result.rows[0]);
  }

  async findByResourceType(
    resourceType: string,
    tenantId: string,
    limit: number = 100
  ): Promise<IDemandForecast[]> {
    const query = `
      SELECT * FROM demand_forecasts
      WHERE resource_type = $1 AND tenant_id = $2
      ORDER BY forecasted_at DESC
      LIMIT $3
    `;
    const result = await this.db.query(query, [resourceType, tenantId, limit]);
    return result.rows.map(row => this.mapToForecast(row));
  }

  async findByHorizon(
    horizon: number,
    tenantId: string,
    limit: number = 100
  ): Promise<IDemandForecast[]> {
    const query = `
      SELECT * FROM demand_forecasts
      WHERE forecast_horizon = $1 AND tenant_id = $2
      ORDER BY forecasted_at DESC
      LIMIT $3
    `;
    const result = await this.db.query(query, [horizon, tenantId, limit]);
    return result.rows.map(row => this.mapToForecast(row));
  }

  async recordActualDemand(id: string, tenantId: string, actualDemand: number): Promise<void> {
    const query = `
      UPDATE demand_forecasts
      SET actual_demand = $1
      WHERE id = $2 AND tenant_id = $3
    `;
    await this.db.query(query, [actualDemand, id, tenantId]);
  }

  async calculateAccuracy(id: string, tenantId: string): Promise<number> {
    const query = `
      SELECT forecasted_demand, actual_demand
      FROM demand_forecasts
      WHERE id = $1 AND tenant_id = $2
    `;
    const result = await this.db.query(query, [id, tenantId]);

    if (!result.rows[0] || !result.rows[0].actual_demand) {
      return 0;
    }

    const forecasted = parseFloat(result.rows[0].forecasted_demand);
    const actual = parseFloat(result.rows[0].actual_demand);

    // Calculate accuracy as 1 - MAPE (Mean Absolute Percentage Error)
    const accuracy = 1 - Math.abs((actual - forecasted) / actual);

    // Update accuracy in database
    const updateQuery = `
      UPDATE demand_forecasts
      SET accuracy_score = $1
      WHERE id = $2 AND tenant_id = $3
    `;
    await this.db.query(updateQuery, [accuracy, id, tenantId]);

    return accuracy;
  }

  private mapToForecast(row: any): IDemandForecast {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      resource_type: row.resource_type,
      forecast_horizon: row.forecast_horizon,
      forecasted_demand: parseFloat(row.forecasted_demand),
      confidence_interval: row.confidence_interval,
      seasonal_factors: row.seasonal_factors,
      trend_factors: row.trend_factors,
      external_factors: row.external_factors,
      model_version: row.model_version,
      forecasted_at: row.forecasted_at,
      forecast_for: row.forecast_for,
      actual_demand: row.actual_demand ? parseFloat(row.actual_demand) : undefined,
      accuracy_score: row.accuracy_score ? parseFloat(row.accuracy_score) : undefined
    };
  }
}
