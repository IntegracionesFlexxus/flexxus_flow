/**
 * CalculationEngine - Sprint 13
 * Engine for calculating metrics, KPIs, trends, and statistical analysis
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import {
  TrendData,
  ComparisonData,
  EnhancedMetrics,
  EnhanceOptions
} from '../types/analytics.types';

@injectable()
export class CalculationEngine {
  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Calculate ROI (Return on Investment)
   */
  calculateROI(cost: number, revenue: number): number {
    if (cost === 0) return 0;
    return ((revenue - cost) / cost) * 100;
  }

  /**
   * Calculate ROAS (Return on Ad Spend)
   */
  calculateROAS(cost: number, revenue: number): number {
    if (cost === 0) return 0;
    return revenue / cost;
  }

  /**
   * Calculate Customer Lifetime Value (simplified version)
   */
  async calculateLifetimeValue(customerId: number): Promise<number> {
    try {
      // Simplified calculation: avg purchase value * purchase frequency * customer lifespan
      // In real implementation, query customer purchase history
      const avgPurchaseValue = 100; // TODO: Calculate from actual data
      const purchaseFrequency = 12; // purchases per year
      const customerLifespan = 3; // years

      return avgPurchaseValue * purchaseFrequency * customerLifespan;
    } catch (error) {
      this.logger.error('Error calculating lifetime value', { error, customerId });
      return 0;
    }
  }

  /**
   * Calculate Engagement Score (0-100)
   */
  async calculateEngagementScore(customerId: number): Promise<number> {
    try {
      // Engagement score based on:
      // - Interaction frequency (40%)
      // - Recency of interactions (30%)
      // - Variety of channels used (20%)
      // - Response rate (10%)

      // TODO: Query actual customer data
      const interactionScore = 75;
      const recencyScore = 80;
      const channelVarietyScore = 60;
      const responseScore = 90;

      const score =
        (interactionScore * 0.4) +
        (recencyScore * 0.3) +
        (channelVarietyScore * 0.2) +
        (responseScore * 0.1);

      return Math.round(Math.min(100, Math.max(0, score)));
    } catch (error) {
      this.logger.error('Error calculating engagement score', { error, customerId });
      return 0;
    }
  }

  /**
   * Calculate trend from time series data
   */
  calculateTrend(values: number[], period: string): TrendData {
    try {
      if (values.length < 2) {
        return {
          direction: 'stable',
          changePercentage: 0,
          changeAbsolute: 0,
          previousValue: 0,
          currentValue: values[0] || 0
        };
      }

      const currentValue = values[values.length - 1];
      const previousValue = values[values.length - 2];
      const changeAbsolute = currentValue - previousValue;
      const changePercentage = previousValue !== 0
        ? (changeAbsolute / previousValue) * 100
        : 0;

      let direction: 'up' | 'down' | 'stable';
      if (Math.abs(changePercentage) < 1) {
        direction = 'stable';
      } else if (changePercentage > 0) {
        direction = 'up';
      } else {
        direction = 'down';
      }

      return {
        direction,
        changePercentage: Math.round(changePercentage * 100) / 100,
        changeAbsolute: Math.round(changeAbsolute * 100) / 100,
        previousValue,
        currentValue,
        sparkline: values.slice(-10) // Last 10 values for sparkline
      };
    } catch (error) {
      this.logger.error('Error calculating trend', { error });
      return {
        direction: 'stable',
        changePercentage: 0,
        changeAbsolute: 0,
        previousValue: 0,
        currentValue: 0
      };
    }
  }

  /**
   * Calculate Simple Moving Average
   */
  calculateMovingAverage(values: number[], windowSize: number): number[] {
    if (values.length < windowSize) return values;

    const result: number[] = [];

    for (let i = windowSize - 1; i < values.length; i++) {
      const window = values.slice(i - windowSize + 1, i + 1);
      const average = window.reduce((sum, val) => sum + val, 0) / windowSize;
      result.push(average);
    }

    return result;
  }

  /**
   * Calculate Growth Rate
   */
  calculateGrowthRate(oldValue: number, newValue: number): number {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Calculate Percentile
   */
  calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);

    if (Number.isInteger(index)) {
      return sorted[index];
    }

    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Calculate Standard Deviation
   */
  calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

    return Math.sqrt(variance);
  }

  /**
   * Calculate Median
   */
  calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
  }

  /**
   * Enhance metrics with trends and comparisons
   */
  enhanceMetrics(metrics: any, options: EnhanceOptions): EnhancedMetrics {
    try {
      const enhanced: EnhancedMetrics = {
        current: metrics
      };

      // Calculate trends if requested
      if (options.calculateTrends && metrics.historicalValues) {
        enhanced.trend = this.calculateTrend(metrics.historicalValues, 'day');
      }

      // Calculate comparisons if requested
      if (options.calculateComparisons && options.comparisonPeriod) {
        // TODO: Fetch comparison period data
        enhanced.comparison = {
          previousPeriod: {},
          currentPeriod: metrics,
          changes: {}
        };
      }

      // Calculate projections if requested
      if (options.calculateProjections && metrics.historicalValues) {
        enhanced.projections = this.calculateProjections(metrics.historicalValues);
      }

      return enhanced;
    } catch (error) {
      this.logger.error('Error enhancing metrics', { error });
      return { current: metrics };
    }
  }

  /**
   * Calculate comparisons between periods
   */
  calculateComparisons(current: any, previous: any): ComparisonData {
    try {
      const changes: Record<string, { absolute: number; percentage: number }> = {};

      // Compare numeric values
      for (const key in current) {
        if (typeof current[key] === 'number' && typeof previous[key] === 'number') {
          const absolute = current[key] - previous[key];
          const percentage = previous[key] !== 0
            ? (absolute / previous[key]) * 100
            : 0;

          changes[key] = {
            absolute: Math.round(absolute * 100) / 100,
            percentage: Math.round(percentage * 100) / 100
          };
        }
      }

      return {
        previousPeriod: previous,
        currentPeriod: current,
        changes
      };
    } catch (error) {
      this.logger.error('Error calculating comparisons', { error });
      return {
        previousPeriod: previous,
        currentPeriod: current,
        changes: {}
      };
    }
  }

  /**
   * Calculate simple linear projections
   */
  private calculateProjections(historicalValues: number[]): number[] {
    if (historicalValues.length < 3) return [];

    try {
      // Simple linear regression for projection
      const n = historicalValues.length;
      const xValues = Array.from({ length: n }, (_, i) => i);

      // Calculate slope and intercept
      const sumX = xValues.reduce((sum, x) => sum + x, 0);
      const sumY = historicalValues.reduce((sum, y) => sum + y, 0);
      const sumXY = xValues.reduce((sum, x, i) => sum + x * historicalValues[i], 0);
      const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Project next 3-5 periods
      const projectionCount = Math.min(5, Math.ceil(n * 0.3));
      const projections: number[] = [];

      for (let i = 1; i <= projectionCount; i++) {
        const x = n + i - 1;
        const projection = slope * x + intercept;
        projections.push(Math.max(0, Math.round(projection * 100) / 100));
      }

      return projections;
    } catch (error) {
      this.logger.error('Error calculating projections', { error });
      return [];
    }
  }

  /**
   * Calculate conversion rate
   */
  calculateConversionRate(converted: number, total: number): number {
    if (total === 0) return 0;
    return (converted / total) * 100;
  }

  /**
   * Calculate churn rate
   */
  calculateChurnRate(churned: number, total: number): number {
    if (total === 0) return 0;
    return (churned / total) * 100;
  }

  /**
   * Calculate average
   */
  calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate sum
   */
  calculateSum(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0);
  }

  /**
   * Calculate min
   */
  calculateMin(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.min(...values);
  }

  /**
   * Calculate max
   */
  calculateMax(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.max(...values);
  }

  /**
   * Calculate compound annual growth rate (CAGR)
   */
  calculateCAGR(beginningValue: number, endingValue: number, years: number): number {
    if (beginningValue === 0 || years === 0) return 0;
    return (Math.pow(endingValue / beginningValue, 1 / years) - 1) * 100;
  }

  /**
   * Calculate correlation coefficient between two series
   */
  calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const meanX = this.calculateAverage(x);
    const meanY = this.calculateAverage(y);

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      numerator += diffX * diffY;
      denomX += diffX * diffX;
      denomY += diffY * diffY;
    }

    if (denomX === 0 || denomY === 0) return 0;

    return numerator / Math.sqrt(denomX * denomY);
  }
}

interface Logger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
}
