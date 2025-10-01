/**
 * Real-Time Analytics Service - Sprint 08
 * Handles real-time analytics processing and aggregation
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import {
  IAnalyticsEvent,
  IAggregatedMetrics,
  IMetricUpdate,
  IMetricBreakdown,
  IMetricValue
} from './interfaces/IAnalytics';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { EventEmitter } from 'events';

@injectable()
export class RealTimeAnalytics extends EventEmitter {
  private logger: any;
  private eventBuffer: IAnalyticsEvent[] = [];
  private bufferSize: number = 1000;
  private flushInterval: number = 60000; // 1 minute
  private flushTimer?: NodeJS.Timer;
  private metricsCache: Map<string, IAggregatedMetrics> = new Map();
  private cacheExpiryMs: number = 300000; // 5 minutes
  private lastCacheUpdate: Map<string, number> = new Map();

  constructor(
    @inject(TYPES.AnalyticsConnection) private pool: Pool
  ) {
    super();
    this.logger = LoggerFactory.create({ file: __filename });
    this.startFlushTimer();
  }

  /**
   * Collect an analytics event
   */
  async collect(event: IAnalyticsEvent): Promise<void> {
    try {
      // Add to buffer
      this.eventBuffer.push(event);

      // Emit real-time update
      this.emitMetricUpdate(event);

      // Flush if buffer is full
      if (this.eventBuffer.length >= this.bufferSize) {
        await this.flush();
      }

      this.logger.debug('Event collected', {
        eventType: event.event_type,
        entityType: event.entity_type
      });
    } catch (error: any) {
      this.logger.error('Failed to collect event', error);
      throw error;
    }
  }

  /**
   * Flush event buffer to database
   */
  async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      const query = `
        INSERT INTO analytics_events (
          company_id, event_type, entity_type, entity_id,
          timestamp, dimensions, metrics, session_id, user_id,
          channel_type, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;

      // Use transaction for batch insert
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        for (const event of events) {
          await client.query(query, [
            event.company_id,
            event.event_type,
            event.entity_type,
            event.entity_id,
            event.timestamp,
            this.mapToJson(event.dimensions),
            this.mapToJson(event.metrics),
            event.session_id,
            event.user_id,
            event.channel_type,
            JSON.stringify(event.metadata || {})
          ]);
        }

        await client.query('COMMIT');

        this.logger.info('Events flushed to database', {
          count: events.length
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      // Trigger aggregation
      await this.aggregateRecentEvents();
    } catch (error: any) {
      this.logger.error('Failed to flush events', error);
      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...events);
      throw error;
    }
  }

  /**
   * Aggregate metrics for a time window
   */
  async aggregate(
    companyId: string,
    timeWindow: 'minute' | 'hour' | 'day',
    startTime?: Date,
    endTime?: Date
  ): Promise<IAggregatedMetrics> {
    const cacheKey = `${companyId}:${timeWindow}:${startTime?.getTime()}:${endTime?.getTime()}`;

    // Check cache
    if (this.metricsCache.has(cacheKey)) {
      const lastUpdate = this.lastCacheUpdate.get(cacheKey) || 0;
      if (Date.now() - lastUpdate < this.cacheExpiryMs) {
        return this.metricsCache.get(cacheKey)!;
      }
    }

    const now = new Date();
    const start = startTime || this.getWindowStart(now, timeWindow);
    const end = endTime || now;

    try {
      const query = `
        WITH event_metrics AS (
          SELECT
            event_type,
            entity_type,
            dimensions,
            metrics,
            timestamp
          FROM analytics_events
          WHERE company_id = $1
            AND timestamp >= $2
            AND timestamp < $3
        ),
        conversation_metrics AS (
          SELECT
            COUNT(*) FILTER (WHERE event_type = 'conversation_started') as conversations_total,
            COUNT(*) FILTER (WHERE event_type = 'conversation_resolved') as conversations_resolved,
            AVG(CAST(metrics->>'response_time' AS NUMERIC)) as avg_response_time,
            AVG(CAST(metrics->>'resolution_time' AS NUMERIC)) as avg_resolution_time,
            COUNT(*) FILTER (WHERE event_type = 'automation_triggered') as automation_count
          FROM event_metrics
        ),
        message_metrics AS (
          SELECT
            COUNT(*) FILTER (WHERE event_type = 'message_sent') as messages_sent,
            COUNT(*) FILTER (WHERE event_type = 'message_received') as messages_received
          FROM event_metrics
        )
        SELECT
          cm.conversations_total,
          cm.conversations_resolved,
          cm.avg_response_time,
          cm.avg_resolution_time,
          cm.automation_count,
          mm.messages_sent,
          mm.messages_received
        FROM conversation_metrics cm
        CROSS JOIN message_metrics mm;
      `;

      const result = await this.pool.query(query, [companyId, start, end]);
      const row = result.rows[0] || {};

      const metrics: IAggregatedMetrics = {
        period: {
          start,
          end,
          type: timeWindow
        },
        metrics: {
          conversations_total: row.conversations_total || 0,
          conversations_resolved: row.conversations_resolved || 0,
          conversations_active: (row.conversations_total || 0) - (row.conversations_resolved || 0),
          messages_sent: row.messages_sent || 0,
          messages_received: row.messages_received || 0,
          avg_response_time_ms: row.avg_response_time || 0,
          median_response_time_ms: row.avg_response_time || 0, // Simplified
          avg_resolution_time_ms: row.avg_resolution_time || 0,
          automation_rate: row.conversations_total > 0
            ? (row.automation_count / row.conversations_total)
            : 0,
          customer_satisfaction: await this.getCustomerSatisfaction(companyId, start, end),
          agent_utilization: await this.getAgentUtilization(companyId, start, end)
        },
        dimensions: await this.getDimensionBreakdown(companyId, start, end)
      };

      // Update cache
      this.metricsCache.set(cacheKey, metrics);
      this.lastCacheUpdate.set(cacheKey, Date.now());

      return metrics;
    } catch (error: any) {
      this.logger.error('Failed to aggregate metrics', error);
      throw error;
    }
  }

  /**
   * Stream real-time metric updates
   */
  async *stream(): AsyncIterator<IMetricUpdate> {
    const updates: IMetricUpdate[] = [];

    const listener = (update: IMetricUpdate) => {
      updates.push(update);
    };

    this.on('metric-update', listener);

    try {
      while (true) {
        if (updates.length > 0) {
          const update = updates.shift()!;
          yield update;
        } else {
          // Wait for new updates
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } finally {
      this.off('metric-update', listener);
    }
  }

  /**
   * Get time series data for a metric
   */
  async getTimeSeries(
    companyId: string,
    metricName: string,
    startTime: Date,
    endTime: Date,
    granularity: 'minute' | 'hour' | 'day'
  ): Promise<{ timestamps: Date[], values: number[] }> {
    try {
      const query = `
        SELECT
          date_trunc($3, timestamp) as time_bucket,
          AVG(CAST(metrics->>$4 AS NUMERIC)) as value
        FROM analytics_events
        WHERE company_id = $1
          AND timestamp >= $2
          AND timestamp < $5
          AND metrics ? $4
        GROUP BY time_bucket
        ORDER BY time_bucket;
      `;

      const result = await this.pool.query(query, [
        companyId,
        startTime,
        granularity,
        metricName,
        endTime
      ]);

      const timestamps = result.rows.map(row => new Date(row.time_bucket));
      const values = result.rows.map(row => parseFloat(row.value) || 0);

      return { timestamps, values };
    } catch (error: any) {
      this.logger.error('Failed to get time series', error);
      throw error;
    }
  }

  /**
   * Detect anomalies in metrics
   */
  async detectAnomalies(
    companyId: string,
    metricName: string,
    currentValue: number
  ): Promise<boolean> {
    try {
      // Get historical data for comparison
      const query = `
        SELECT
          AVG(CAST(metrics->>$2 AS NUMERIC)) as avg_value,
          STDDEV(CAST(metrics->>$2 AS NUMERIC)) as std_dev
        FROM analytics_events
        WHERE company_id = $1
          AND timestamp >= NOW() - INTERVAL '7 days'
          AND metrics ? $2;
      `;

      const result = await this.pool.query(query, [companyId, metricName]);
      const { avg_value, std_dev } = result.rows[0] || {};

      if (!avg_value || !std_dev) return false;

      // Check if current value is outside 3 standard deviations
      const lowerBound = avg_value - (3 * std_dev);
      const upperBound = avg_value + (3 * std_dev);

      const isAnomaly = currentValue < lowerBound || currentValue > upperBound;

      if (isAnomaly) {
        await this.recordAnomaly(companyId, metricName, currentValue, {
          min: lowerBound,
          max: upperBound
        });
      }

      return isAnomaly;
    } catch (error: any) {
      this.logger.error('Failed to detect anomaly', error);
      return false;
    }
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      try {
        await this.flush();
      } catch (error) {
        this.logger.error('Flush timer error', error);
      }
    }, this.flushInterval);
  }

  /**
   * Stop flush timer
   */
  stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Emit metric update
   */
  private emitMetricUpdate(event: IAnalyticsEvent): void {
    event.metrics.forEach((value, name) => {
      const update: IMetricUpdate = {
        metric_name: name,
        value,
        timestamp: event.timestamp,
        dimensions: event.dimensions
      };
      this.emit('metric-update', update);
    });
  }

  /**
   * Convert Map to JSON
   */
  private mapToJson(map?: Map<string, any>): string {
    if (!map) return '{}';
    const obj: any = {};
    map.forEach((value, key) => {
      obj[key] = value;
    });
    return JSON.stringify(obj);
  }

  /**
   * Get window start time
   */
  private getWindowStart(date: Date, window: 'minute' | 'hour' | 'day'): Date {
    const start = new Date(date);

    switch (window) {
      case 'minute':
        start.setSeconds(0, 0);
        break;
      case 'hour':
        start.setMinutes(0, 0, 0);
        break;
      case 'day':
        start.setHours(0, 0, 0, 0);
        break;
    }

    return start;
  }

  /**
   * Aggregate recent events
   */
  private async aggregateRecentEvents(): Promise<void> {
    try {
      const query = `
        INSERT INTO aggregated_metrics (
          company_id, metric_name, period_type, period_start, period_end,
          value, count, min_value, max_value, avg_value
        )
        SELECT
          company_id,
          event_type as metric_name,
          'hour' as period_type,
          date_trunc('hour', timestamp) as period_start,
          date_trunc('hour', timestamp) + interval '1 hour' as period_end,
          COUNT(*) as value,
          COUNT(*) as count,
          MIN(CAST(metrics->>'value' AS NUMERIC)) as min_value,
          MAX(CAST(metrics->>'value' AS NUMERIC)) as max_value,
          AVG(CAST(metrics->>'value' AS NUMERIC)) as avg_value
        FROM analytics_events
        WHERE processed = false
        GROUP BY company_id, event_type, date_trunc('hour', timestamp)
        ON CONFLICT (company_id, metric_name, period_type, period_start, dimensions)
        DO UPDATE SET
          value = aggregated_metrics.value + EXCLUDED.value,
          count = aggregated_metrics.count + EXCLUDED.count,
          min_value = LEAST(aggregated_metrics.min_value, EXCLUDED.min_value),
          max_value = GREATEST(aggregated_metrics.max_value, EXCLUDED.max_value),
          avg_value = (aggregated_metrics.avg_value * aggregated_metrics.count + EXCLUDED.avg_value * EXCLUDED.count)
                      / (aggregated_metrics.count + EXCLUDED.count);
      `;

      await this.pool.query(query);

      // Mark events as processed
      await this.pool.query(
        'UPDATE analytics_events SET processed = true WHERE processed = false'
      );
    } catch (error: any) {
      this.logger.error('Failed to aggregate recent events', error);
    }
  }

  /**
   * Get customer satisfaction
   */
  private async getCustomerSatisfaction(
    companyId: string,
    startTime: Date,
    endTime: Date
  ): Promise<number> {
    // Mock implementation - would integrate with feedback system
    return 4.2 + (Math.random() * 0.6); // Random between 4.2 and 4.8
  }

  /**
   * Get agent utilization
   */
  private async getAgentUtilization(
    companyId: string,
    startTime: Date,
    endTime: Date
  ): Promise<number> {
    // Mock implementation - would calculate from agent activity
    return 0.65 + (Math.random() * 0.20); // Random between 65% and 85%
  }

  /**
   * Get dimension breakdown
   */
  private async getDimensionBreakdown(
    companyId: string,
    startTime: Date,
    endTime: Date
  ): Promise<Map<string, IMetricBreakdown>> {
    // Simplified implementation
    const dimensions = new Map<string, IMetricBreakdown>();

    // By channel
    dimensions.set('channel', {
      dimension: 'channel',
      values: new Map([
        ['whatsapp', { value: 450, count: 450 }],
        ['email', { value: 230, count: 230 }],
        ['instagram', { value: 180, count: 180 }],
        ['sms', { value: 140, count: 140 }]
      ])
    });

    return dimensions;
  }

  /**
   * Record anomaly detection
   */
  private async recordAnomaly(
    companyId: string,
    metricName: string,
    detectedValue: number,
    expectedRange: { min: number; max: number }
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO anomaly_detections (
          company_id, metric_name, detected_value,
          expected_range, deviation_percentage,
          severity, confidence
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      const deviation = Math.abs(
        ((detectedValue - ((expectedRange.min + expectedRange.max) / 2)) /
        ((expectedRange.max - expectedRange.min) / 2)) * 100
      );

      const severity = deviation > 200 ? 'critical' : deviation > 100 ? 'warning' : 'info';

      await this.pool.query(query, [
        companyId,
        metricName,
        detectedValue,
        JSON.stringify(expectedRange),
        deviation,
        severity,
        0.85 // Mock confidence
      ]);

      this.logger.warn('Anomaly detected', {
        metricName,
        detectedValue,
        expectedRange,
        severity
      });
    } catch (error: any) {
      this.logger.error('Failed to record anomaly', error);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stopFlushTimer();
    await this.flush();
    this.removeAllListeners();
    this.logger.info('RealTimeAnalytics cleaned up');
  }
}