/**
 * Demand Forecasting Service - Sprint 12 Fase 3
 * Business logic for forecasting resource demand and workload
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { ForecastRepository, IDemandForecast } from './ForecastRepository';
import { FeatureStoreService } from '../../ml/services/FeatureStoreService';
import { PredictionService } from '../../ml/services/PredictionService';
import { Logger } from '@/utils/logger';

interface TimeSeriesData {
  timestamp: Date;
  value: number;
}

interface ForecastOptions {
  horizon: number; // Days to forecast
  confidenceLevel?: number;
  deploymentId?: string;
  includeSeasonality?: boolean;
  includeTrend?: boolean;
  externalFactors?: Record<string, any>;
}

@injectable()
export class DemandForecastingService {
  constructor(
    @inject(TYPES.ForecastRepository)
    private forecastRepo: ForecastRepository,

    @inject(TYPES.FeatureStoreService)
    private featureStoreService: FeatureStoreService,

    @inject(TYPES.PredictionService)
    private predictionService: PredictionService,

    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  /**
   * Forecast demand for a specific resource type
   */
  async forecastDemand(
    resourceType: string,
    tenantId: string,
    options: ForecastOptions
  ): Promise<IDemandForecast[]> {
    try {
      // Get historical demand data
      const historicalData = await this.getHistoricalDemand(resourceType, tenantId);

      const forecasts: IDemandForecast[] = [];

      for (let day = 1; day <= options.horizon; day++) {
        const forecastFor = new Date();
        forecastFor.setDate(forecastFor.getDate() + day);

        let forecastedDemand: number;
        let confidenceInterval: { lower: number; upper: number } | undefined;
        let seasonalFactors: Record<string, any> | undefined;
        let trendFactors: Record<string, any> | undefined;
        let modelVersion: string;

        if (options.deploymentId) {
          // Use ML model for forecasting
          const mlForecast = await this.forecastWithML(
            options.deploymentId,
            historicalData,
            day,
            tenantId,
            options
          );

          forecastedDemand = mlForecast.value;
          confidenceInterval = mlForecast.confidenceInterval;
          seasonalFactors = mlForecast.seasonalFactors;
          trendFactors = mlForecast.trendFactors;
          modelVersion = options.deploymentId;
        } else {
          // Use statistical time series methods
          const statisticalForecast = this.forecastWithTimeSeries(
            historicalData,
            day,
            options
          );

          forecastedDemand = statisticalForecast.value;
          confidenceInterval = statisticalForecast.confidenceInterval;
          seasonalFactors = statisticalForecast.seasonalFactors;
          trendFactors = statisticalForecast.trendFactors;
          modelVersion = 'statistical-timeseries-v1';
        }

        const forecast = await this.forecastRepo.create(
          tenantId,
          resourceType,
          day,
          forecastedDemand,
          forecastFor,
          {
            confidenceInterval: confidenceInterval
              ? { ...confidenceInterval, confidence_level: options.confidenceLevel || 0.95 }
              : undefined,
            seasonalFactors,
            trendFactors,
            externalFactors: options.externalFactors,
            modelVersion
          }
        );

        forecasts.push(forecast);
      }

      return forecasts;
    } catch (error) {
      this.logger.error('Error forecasting demand', { resourceType, tenantId, error });
      throw new Error('Failed to forecast demand');
    }
  }

  /**
   * Get forecasts for a resource type
   */
  async getForecastsByResourceType(
    resourceType: string,
    tenantId: string,
    limit?: number
  ): Promise<IDemandForecast[]> {
    try {
      return await this.forecastRepo.findByResourceType(resourceType, tenantId, limit);
    } catch (error) {
      this.logger.error('Error getting forecasts', { resourceType, tenantId, error });
      throw new Error('Failed to get forecasts');
    }
  }

  /**
   * Record actual demand for accuracy tracking
   */
  async recordActualDemand(
    forecastId: string,
    tenantId: string,
    actualDemand: number
  ): Promise<number> {
    try {
      await this.forecastRepo.recordActualDemand(forecastId, tenantId, actualDemand);
      return await this.forecastRepo.calculateAccuracy(forecastId, tenantId);
    } catch (error) {
      this.logger.error('Error recording actual demand', { forecastId, tenantId, error });
      throw new Error('Failed to record actual demand');
    }
  }

  /**
   * Get forecast accuracy metrics
   */
  async getForecastAccuracy(
    resourceType: string,
    tenantId: string
  ): Promise<{ averageAccuracy: number; forecastCount: number }> {
    try {
      const forecasts = await this.forecastRepo.findByResourceType(resourceType, tenantId, 100);

      const forecastsWithAccuracy = forecasts.filter(f => f.accuracy_score !== undefined);

      if (forecastsWithAccuracy.length === 0) {
        return { averageAccuracy: 0, forecastCount: 0 };
      }

      const totalAccuracy = forecastsWithAccuracy.reduce(
        (sum, f) => sum + (f.accuracy_score || 0),
        0
      );

      return {
        averageAccuracy: totalAccuracy / forecastsWithAccuracy.length,
        forecastCount: forecastsWithAccuracy.length
      };
    } catch (error) {
      this.logger.error('Error getting forecast accuracy', { resourceType, tenantId, error });
      throw new Error('Failed to get forecast accuracy');
    }
  }

  // ==================== Private Forecasting Methods ====================

  /**
   * Get historical demand data
   */
  private async getHistoricalDemand(
    resourceType: string,
    tenantId: string
  ): Promise<TimeSeriesData[]> {
    try {
      const features = await this.featureStoreService.getFeatures(
        tenantId,
        'demand_history',
        resourceType
      );

      const historicalValues = features.feature_values.demand_history as any[] || [];

      return historicalValues.map((item: any) => ({
        timestamp: new Date(item.timestamp),
        value: item.value
      }));
    } catch (error) {
      // If no historical data, return empty array
      return [];
    }
  }

  /**
   * Forecast using ML model
   */
  private async forecastWithML(
    deploymentId: string,
    historicalData: TimeSeriesData[],
    horizon: number,
    tenantId: string,
    options: ForecastOptions
  ): Promise<any> {
    const features = this.prepareMLFeatures(historicalData, horizon, options);

    const prediction = await this.predictionService.predict(
      deploymentId,
      features,
      tenantId
    );

    return {
      value: prediction.prediction_value as number,
      confidenceInterval: this.calculateConfidenceInterval(
        prediction.prediction_value as number,
        prediction.confidence_score || 0.8,
        options.confidenceLevel || 0.95
      ),
      seasonalFactors: features.seasonal_features,
      trendFactors: features.trend_features
    };
  }

  /**
   * Forecast using statistical time series methods
   */
  private forecastWithTimeSeries(
    historicalData: TimeSeriesData[],
    horizon: number,
    options: ForecastOptions
  ): any {
    if (historicalData.length === 0) {
      return {
        value: 0,
        confidenceInterval: { lower: 0, upper: 0 },
        seasonalFactors: {},
        trendFactors: {}
      };
    }

    const values = historicalData.map(d => d.value);

    // Calculate trend
    const trend = options.includeTrend !== false
      ? this.calculateLinearTrend(values)
      : { slope: 0, intercept: values[values.length - 1] || 0 };

    // Calculate seasonality (weekly pattern)
    const seasonality = options.includeSeasonality !== false
      ? this.calculateSeasonality(values, 7)
      : Array(7).fill(1);

    // Forecast value
    const trendValue = trend.slope * (values.length + horizon) + trend.intercept;
    const seasonalIndex = seasonality[horizon % seasonality.length];
    const forecastedValue = Math.max(0, trendValue * seasonalIndex);

    // Calculate confidence interval
    const residuals = this.calculateResiduals(values, trend, seasonality);
    const stdDev = this.calculateStdDev(residuals);
    const confidenceInterval = this.calculateConfidenceInterval(
      forecastedValue,
      0.8,
      options.confidenceLevel || 0.95,
      stdDev
    );

    return {
      value: Math.round(forecastedValue * 100) / 100,
      confidenceInterval,
      seasonalFactors: {
        pattern: seasonality,
        period: 7,
        index: seasonalIndex
      },
      trendFactors: {
        slope: trend.slope,
        intercept: trend.intercept
      }
    };
  }

  /**
   * Prepare features for ML forecasting
   */
  private prepareMLFeatures(
    historicalData: TimeSeriesData[],
    horizon: number,
    options: ForecastOptions
  ): Record<string, any> {
    const values = historicalData.map(d => d.value);

    const features: Record<string, any> = {
      horizon,
      lag_1: values[values.length - 1] || 0,
      lag_7: values[values.length - 7] || 0,
      lag_30: values[values.length - 30] || 0,
      rolling_avg_7: this.calculateMovingAverage(values, 7),
      rolling_avg_30: this.calculateMovingAverage(values, 30)
    };

    if (options.includeSeasonality !== false) {
      const seasonality = this.calculateSeasonality(values, 7);
      features.seasonal_features = {
        weekly_pattern: seasonality,
        seasonal_index: seasonality[horizon % seasonality.length]
      };
    }

    if (options.includeTrend !== false) {
      const trend = this.calculateLinearTrend(values);
      features.trend_features = {
        slope: trend.slope,
        intercept: trend.intercept
      };
    }

    if (options.externalFactors) {
      features.external_factors = options.externalFactors;
    }

    return features;
  }

  /**
   * Calculate linear trend
   */
  private calculateLinearTrend(values: number[]): { slope: number; intercept: number } {
    if (values.length < 2) {
      return { slope: 0, intercept: values[0] || 0 };
    }

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  /**
   * Calculate seasonality pattern
   */
  private calculateSeasonality(values: number[], period: number): number[] {
    if (values.length < period * 2) {
      return Array(period).fill(1);
    }

    const seasonalSums = Array(period).fill(0);
    const seasonalCounts = Array(period).fill(0);

    values.forEach((value, index) => {
      const seasonalIndex = index % period;
      seasonalSums[seasonalIndex] += value;
      seasonalCounts[seasonalIndex]++;
    });

    const overallAverage = values.reduce((a, b) => a + b, 0) / values.length;

    return seasonalSums.map((sum, i) => {
      const seasonalAverage = sum / seasonalCounts[i];
      return seasonalAverage / overallAverage || 1;
    });
  }

  /**
   * Calculate moving average
   */
  private calculateMovingAverage(values: number[], window: number): number {
    if (values.length < window) {
      return values.reduce((a, b) => a + b, 0) / values.length || 0;
    }

    const recentValues = values.slice(-window);
    return recentValues.reduce((a, b) => a + b, 0) / window;
  }

  /**
   * Calculate residuals
   */
  private calculateResiduals(
    values: number[],
    trend: { slope: number; intercept: number },
    seasonality: number[]
  ): number[] {
    return values.map((value, i) => {
      const trendValue = trend.slope * i + trend.intercept;
      const seasonalIndex = seasonality[i % seasonality.length];
      const expected = trendValue * seasonalIndex;
      return value - expected;
    });
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate confidence interval
   */
  private calculateConfidenceInterval(
    forecastValue: number,
    confidence: number,
    confidenceLevel: number = 0.95,
    stdDev?: number
  ): { lower: number; upper: number } {
    // Z-score for 95% confidence level ≈ 1.96
    const zScore = confidenceLevel === 0.95 ? 1.96 : 2.58; // 99% ≈ 2.58

    const margin = stdDev
      ? zScore * stdDev
      : forecastValue * (1 - confidence) * zScore;

    return {
      lower: Math.max(0, forecastValue - margin),
      upper: forecastValue + margin
    };
  }
}
