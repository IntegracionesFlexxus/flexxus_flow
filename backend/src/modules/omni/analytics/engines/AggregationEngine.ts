/**
 * AggregationEngine - Sprint 13
 * Engine for data aggregation by time periods and dimensions
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';

interface AggregatedData {
  period: Date | string;
  value: number;
  count?: number;
  metadata?: Record<string, any>;
}

interface GroupedData {
  [key: string]: any[];
}

interface RollupConfig {
  dimensions: string[];
  metrics: Array<{
    field: string;
    aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
  }>;
}

interface PivotConfig {
  rows: string[];
  columns: string[];
  values: string[];
  aggregation: 'sum' | 'avg' | 'count';
}

@injectable()
export class AggregationEngine {
  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Aggregate data by hour
   */
  aggregateByHour(data: any[], metric: string): AggregatedData[] {
    try {
      return this.aggregateByTimePeriod(data, metric, 'hour');
    } catch (error) {
      this.logger.error('Error aggregating by hour', { error, metric });
      return [];
    }
  }

  /**
   * Aggregate data by day
   */
  aggregateByDay(data: any[], metric: string): AggregatedData[] {
    try {
      return this.aggregateByTimePeriod(data, metric, 'day');
    } catch (error) {
      this.logger.error('Error aggregating by day', { error, metric });
      return [];
    }
  }

  /**
   * Aggregate data by week
   */
  aggregateByWeek(data: any[], metric: string): AggregatedData[] {
    try {
      return this.aggregateByTimePeriod(data, metric, 'week');
    } catch (error) {
      this.logger.error('Error aggregating by week', { error, metric });
      return [];
    }
  }

  /**
   * Aggregate data by month
   */
  aggregateByMonth(data: any[], metric: string): AggregatedData[] {
    try {
      return this.aggregateByTimePeriod(data, metric, 'month');
    } catch (error) {
      this.logger.error('Error aggregating by month', { error, metric });
      return [];
    }
  }

  /**
   * Aggregate data by quarter
   */
  aggregateByQuarter(data: any[], metric: string): AggregatedData[] {
    try {
      return this.aggregateByTimePeriod(data, metric, 'quarter');
    } catch (error) {
      this.logger.error('Error aggregating by quarter', { error, metric });
      return [];
    }
  }

  /**
   * Group data by dimension
   */
  groupByDimension(data: any[], dimension: string): GroupedData {
    try {
      const grouped: GroupedData = {};

      for (const item of data) {
        const key = item[dimension] || 'unknown';
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(item);
      }

      return grouped;
    } catch (error) {
      this.logger.error('Error grouping by dimension', { error, dimension });
      return {};
    }
  }

  /**
   * Rollup data with aggregations
   */
  rollupData(data: any[], rollupConfig: RollupConfig): any[] {
    try {
      // Group by dimensions
      const groups = this.groupByMultipleDimensions(data, rollupConfig.dimensions);

      // Aggregate each group
      const results: any[] = [];

      for (const [key, items] of Object.entries(groups)) {
        const result: any = {};

        // Add dimension values
        const dimensionValues = key.split('|');
        rollupConfig.dimensions.forEach((dim, index) => {
          result[dim] = dimensionValues[index];
        });

        // Calculate aggregations
        for (const metric of rollupConfig.metrics) {
          const values = items.map(item => parseFloat(item[metric.field]) || 0);

          switch (metric.aggregation) {
            case 'sum':
              result[metric.field] = values.reduce((sum, val) => sum + val, 0);
              break;
            case 'avg':
              result[metric.field] = values.length > 0
                ? values.reduce((sum, val) => sum + val, 0) / values.length
                : 0;
              break;
            case 'count':
              result[metric.field] = values.length;
              break;
            case 'min':
              result[metric.field] = values.length > 0 ? Math.min(...values) : 0;
              break;
            case 'max':
              result[metric.field] = values.length > 0 ? Math.max(...values) : 0;
              break;
          }
        }

        results.push(result);
      }

      return results;
    } catch (error) {
      this.logger.error('Error rolling up data', { error });
      return [];
    }
  }

  /**
   * Pivot data
   */
  pivotData(data: any[], pivotConfig: PivotConfig): any[] {
    try {
      const pivoted: Record<string, any> = {};

      for (const item of data) {
        // Build row key
        const rowKey = pivotConfig.rows.map(r => item[r]).join('|');

        // Build column key
        const colKey = pivotConfig.columns.map(c => item[c]).join('|');

        // Initialize row if not exists
        if (!pivoted[rowKey]) {
          pivoted[rowKey] = {};
          pivotConfig.rows.forEach(r => {
            pivoted[rowKey][r] = item[r];
          });
        }

        // Aggregate values
        for (const valueField of pivotConfig.values) {
          const key = `${colKey}_${valueField}`;
          const value = parseFloat(item[valueField]) || 0;

          if (!pivoted[rowKey][key]) {
            pivoted[rowKey][key] = 0;
          }

          switch (pivotConfig.aggregation) {
            case 'sum':
              pivoted[rowKey][key] += value;
              break;
            case 'avg':
              // For average, we need to track count
              if (!pivoted[rowKey][`${key}_count`]) {
                pivoted[rowKey][`${key}_count`] = 0;
              }
              pivoted[rowKey][key] += value;
              pivoted[rowKey][`${key}_count`]++;
              break;
            case 'count':
              pivoted[rowKey][key]++;
              break;
          }
        }
      }

      // Convert to array and calculate averages if needed
      const results = Object.values(pivoted);

      if (pivotConfig.aggregation === 'avg') {
        for (const result of results) {
          for (const key in result) {
            if (key.endsWith('_count')) {
              const valueKey = key.replace('_count', '');
              if (result[key] > 0) {
                result[valueKey] = result[valueKey] / result[key];
              }
              delete result[key];
            }
          }
        }
      }

      return results;
    } catch (error) {
      this.logger.error('Error pivoting data', { error });
      return [];
    }
  }

  /**
   * Aggregate by multiple dimensions
   */
  aggregateByDimensions(
    data: any[],
    dimensions: string[],
    metric: string,
    aggregation: 'sum' | 'avg' | 'count' = 'sum'
  ): any[] {
    try {
      const groups = this.groupByMultipleDimensions(data, dimensions);
      const results: any[] = [];

      for (const [key, items] of Object.entries(groups)) {
        const result: any = {};

        // Add dimension values
        const dimensionValues = key.split('|');
        dimensions.forEach((dim, index) => {
          result[dim] = dimensionValues[index];
        });

        // Calculate aggregation
        const values = items.map(item => parseFloat(item[metric]) || 0);

        switch (aggregation) {
          case 'sum':
            result[metric] = values.reduce((sum, val) => sum + val, 0);
            break;
          case 'avg':
            result[metric] = values.length > 0
              ? values.reduce((sum, val) => sum + val, 0) / values.length
              : 0;
            break;
          case 'count':
            result[metric] = values.length;
            break;
        }

        result.count = items.length;
        results.push(result);
      }

      return results;
    } catch (error) {
      this.logger.error('Error aggregating by dimensions', { error });
      return [];
    }
  }

  /**
   * Calculate running totals
   */
  calculateRunningTotals(data: any[], metric: string): any[] {
    try {
      let runningTotal = 0;

      return data.map(item => ({
        ...item,
        [`${metric}_running_total`]: (runningTotal += parseFloat(item[metric]) || 0)
      }));
    } catch (error) {
      this.logger.error('Error calculating running totals', { error });
      return data;
    }
  }

  /**
   * Calculate moving averages
   */
  calculateMovingAverages(data: any[], metric: string, window: number): any[] {
    try {
      const result: any[] = [];

      for (let i = 0; i < data.length; i++) {
        const windowData = data.slice(Math.max(0, i - window + 1), i + 1);
        const values = windowData.map(item => parseFloat(item[metric]) || 0);
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;

        result.push({
          ...data[i],
          [`${metric}_ma${window}`]: Math.round(average * 100) / 100
        });
      }

      return result;
    } catch (error) {
      this.logger.error('Error calculating moving averages', { error });
      return data;
    }
  }

  /**
   * Private: Aggregate by time period
   */
  private aggregateByTimePeriod(
    data: any[],
    metric: string,
    period: 'hour' | 'day' | 'week' | 'month' | 'quarter'
  ): AggregatedData[] {
    const grouped = new Map<string, number[]>();

    for (const item of data) {
      const timestamp = new Date(item.timestamp || item.date || item.created_at);
      const key = this.getTimePeriodKey(timestamp, period);

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }

      const value = parseFloat(item[metric]) || 0;
      grouped.get(key)!.push(value);
    }

    const results: AggregatedData[] = [];

    for (const [key, values] of grouped.entries()) {
      results.push({
        period: key,
        value: values.reduce((sum, val) => sum + val, 0),
        count: values.length,
        metadata: {
          average: values.reduce((sum, val) => sum + val, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values)
        }
      });
    }

    return results.sort((a, b) => a.period.toString().localeCompare(b.period.toString()));
  }

  /**
   * Private: Get time period key
   */
  private getTimePeriodKey(date: Date, period: 'hour' | 'day' | 'week' | 'month' | 'quarter'): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');

    switch (period) {
      case 'hour':
        return `${year}-${month}-${day} ${hour}:00`;
      case 'day':
        return `${year}-${month}-${day}`;
      case 'week':
        const weekNum = this.getWeekNumber(date);
        return `${year}-W${String(weekNum).padStart(2, '0')}`;
      case 'month':
        return `${year}-${month}`;
      case 'quarter':
        const quarter = Math.floor((date.getMonth() / 3)) + 1;
        return `${year}-Q${quarter}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }

  /**
   * Private: Get week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Private: Group by multiple dimensions
   */
  private groupByMultipleDimensions(data: any[], dimensions: string[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    for (const item of data) {
      const key = dimensions.map(dim => item[dim] || 'unknown').join('|');

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(item);
    }

    return grouped;
  }
}

interface Logger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
}
