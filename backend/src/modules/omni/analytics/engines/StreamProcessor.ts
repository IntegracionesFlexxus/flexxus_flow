/**
 * StreamProcessor - Sprint 13
 * Real-time analytics event processing with WebSocket integration
 */

import { injectable, inject } from 'inversify';
import { EventEmitter } from 'events';
import { TYPES } from '@/container/types';

interface AnalyticsEvent {
  eventType: string;
  companyId: number;
  userId?: number;
  customerId?: number;
  conversationId?: number;
  channel?: string;
  timestamp: Date;
  data: Record<string, any>;
}

interface RealTimeMetrics {
  activeConversations: number;
  avgResponseTime: number;
  conversationsPerHour: number;
  agentsOnline: number;
  queueSize: number;
  satisfactionScore?: number;
  timestamp: Date;
}

interface MetricBuffer {
  events: AnalyticsEvent[];
  lastFlush: Date;
  metrics: Partial<RealTimeMetrics>;
}

interface AnomalyDetection {
  detected: boolean;
  metric: string;
  currentValue: number;
  expectedValue: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high';
}

@injectable()
export class StreamProcessor extends EventEmitter {
  private metricsBuffer: Map<string, MetricBuffer> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL_MS = 10000; // 10 seconds
  private readonly BUFFER_SIZE_LIMIT = 1000;

  constructor(
    @inject(TYPES.WebSocketService) private websocket: WebSocketService,
    @inject(TYPES.DataMartRepository) private dataMart: DataMartRepository,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    super();
    this.startFlushTimer();
  }

  /**
   * Process incoming analytics event
   */
  async processEvent(event: AnalyticsEvent): Promise<void> {
    try {
      this.logger.info('Processing analytics event', {
        eventType: event.eventType,
        companyId: event.companyId
      });

      // Calculate real-time metrics from event
      const metrics = await this.calculateRealTimeMetrics(event);

      // Buffer metrics for batch processing
      this.bufferMetrics(event.companyId, { event, metrics });

      // Emit real-time update via WebSocket
      this.emitRealTimeUpdate(event.companyId, metrics);

      // Detect anomalies
      const anomalies = await this.detectAnomalies(event, metrics);
      if (anomalies.detected) {
        this.emit('anomaly-detected', { event, anomalies });
        this.logger.warn('Anomaly detected', { anomalies });
      }

      // Emit event processed
      this.emit('event-processed', { event, metrics });
    } catch (error) {
      this.logger.error('Error processing event', { error, event });
      this.emit('event-error', { error, event });
    }
  }

  /**
   * Calculate real-time metrics from event
   */
  async calculateRealTimeMetrics(event: AnalyticsEvent): Promise<RealTimeMetrics> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get buffered events for the company
      const bufferKey = `company:${event.companyId}`;
      const buffer = this.metricsBuffer.get(bufferKey);
      const recentEvents = buffer?.events.filter(e =>
        new Date(e.timestamp) >= oneHourAgo
      ) || [];

      // Calculate metrics based on event type and recent events
      const metrics: RealTimeMetrics = {
        activeConversations: this.countActiveConversations(recentEvents),
        avgResponseTime: this.calculateAvgResponseTime(recentEvents),
        conversationsPerHour: recentEvents.filter(e =>
          e.eventType === 'conversation_started'
        ).length,
        agentsOnline: this.countOnlineAgents(recentEvents),
        queueSize: this.calculateQueueSize(recentEvents),
        timestamp: now
      };

      // Add satisfaction score if available
      const satisfactionEvents = recentEvents.filter(e =>
        e.eventType === 'satisfaction_rated'
      );
      if (satisfactionEvents.length > 0) {
        const scores = satisfactionEvents.map(e => e.data.score || 0);
        metrics.satisfactionScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      }

      return metrics;
    } catch (error) {
      this.logger.error('Error calculating real-time metrics', { error });
      return {
        activeConversations: 0,
        avgResponseTime: 0,
        conversationsPerHour: 0,
        agentsOnline: 0,
        queueSize: 0,
        timestamp: new Date()
      };
    }
  }

  /**
   * Buffer metrics in memory for batch processing
   */
  bufferMetrics(companyId: number, data: { event: AnalyticsEvent; metrics: RealTimeMetrics }): void {
    try {
      const key = `company:${companyId}`;

      let buffer = this.metricsBuffer.get(key);

      if (!buffer) {
        buffer = {
          events: [],
          lastFlush: new Date(),
          metrics: {}
        };
        this.metricsBuffer.set(key, buffer);
      }

      // Add event to buffer
      buffer.events.push(data.event);

      // Update aggregated metrics
      buffer.metrics = data.metrics;

      // Trim buffer if it exceeds size limit
      if (buffer.events.length > this.BUFFER_SIZE_LIMIT) {
        buffer.events = buffer.events.slice(-this.BUFFER_SIZE_LIMIT);
        this.logger.warn('Buffer size limit exceeded, trimming old events', {
          companyId,
          bufferSize: buffer.events.length
        });
      }
    } catch (error) {
      this.logger.error('Error buffering metrics', { error, companyId });
    }
  }

  /**
   * Flush buffered metrics to database
   */
  async flushMetrics(key: string): Promise<void> {
    try {
      const buffer = this.metricsBuffer.get(key);

      if (!buffer || buffer.events.length === 0) {
        return;
      }

      this.logger.info('Flushing metrics to database', {
        key,
        eventCount: buffer.events.length
      });

      // Extract company ID from key
      const companyId = parseInt(key.split(':')[1]);

      // Aggregate events by type
      const eventsByType = this.aggregateEventsByType(buffer.events);

      // Persist aggregated metrics to database
      // This would call DataMartRepository methods to insert/update metrics
      for (const [eventType, events] of Object.entries(eventsByType)) {
        await this.persistEventMetrics(companyId, eventType, events);
      }

      // Update last flush time
      buffer.lastFlush = new Date();

      // Clear processed events (keep last 100 for trend calculation)
      buffer.events = buffer.events.slice(-100);

      this.emit('metrics-flushed', { key, timestamp: buffer.lastFlush });
    } catch (error) {
      this.logger.error('Error flushing metrics', { error, key });
      this.emit('flush-error', { error, key });
    }
  }

  /**
   * Emit real-time update via WebSocket
   */
  emitRealTimeUpdate(companyId: number, metrics: RealTimeMetrics): void {
    try {
      const room = `company:${companyId}:analytics`;

      this.websocket.emitToRoom(room, 'analytics:realtime', {
        companyId,
        metrics,
        timestamp: new Date()
      });

      this.logger.debug('Real-time update emitted', { companyId, room });
    } catch (error) {
      this.logger.error('Error emitting real-time update', { error, companyId });
    }
  }

  /**
   * Detect anomalies in metrics using threshold-based detection
   */
  async detectAnomalies(
    event: AnalyticsEvent,
    metrics: RealTimeMetrics
  ): Promise<AnomalyDetection> {
    try {
      // Get historical baseline for comparison
      const baseline = await this.getMetricsBaseline(event.companyId);

      // Check each metric against baseline
      const anomalies: AnomalyDetection[] = [];

      // Response time anomaly
      if (baseline.avgResponseTime > 0) {
        const deviation = Math.abs(metrics.avgResponseTime - baseline.avgResponseTime);
        const threshold = baseline.avgResponseTime * 0.5; // 50% deviation

        if (deviation > threshold) {
          anomalies.push({
            detected: true,
            metric: 'avgResponseTime',
            currentValue: metrics.avgResponseTime,
            expectedValue: baseline.avgResponseTime,
            threshold,
            severity: this.calculateSeverity(deviation, threshold)
          });
        }
      }

      // Queue size anomaly
      if (baseline.queueSize !== undefined && baseline.queueSize > 0) {
        const deviation = Math.abs(metrics.queueSize - baseline.queueSize);
        const threshold = baseline.queueSize * 2; // 200% increase

        if (metrics.queueSize > threshold) {
          anomalies.push({
            detected: true,
            metric: 'queueSize',
            currentValue: metrics.queueSize,
            expectedValue: baseline.queueSize,
            threshold,
            severity: 'high'
          });
        }
      }

      // Return first detected anomaly or no anomaly
      return anomalies.length > 0
        ? anomalies[0]
        : { detected: false, metric: '', currentValue: 0, expectedValue: 0, threshold: 0, severity: 'low' };
    } catch (error) {
      this.logger.error('Error detecting anomalies', { error });
      return { detected: false, metric: '', currentValue: 0, expectedValue: 0, threshold: 0, severity: 'low' };
    }
  }

  /**
   * Start automatic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = setInterval(() => {
      this.flushAllBuffers();
    }, this.FLUSH_INTERVAL_MS);

    this.logger.info('Flush timer started', { intervalMs: this.FLUSH_INTERVAL_MS });
  }

  /**
   * Flush all buffered metrics
   */
  private async flushAllBuffers(): Promise<void> {
    const keys = Array.from(this.metricsBuffer.keys());

    for (const key of keys) {
      await this.flushMetrics(key);
    }
  }

  /**
   * Count active conversations from events
   */
  private countActiveConversations(events: AnalyticsEvent[]): number {
    const conversationIds = new Set<number>();

    for (const event of events) {
      if (event.conversationId && event.eventType !== 'conversation_closed') {
        conversationIds.add(event.conversationId);
      }
    }

    return conversationIds.size;
  }

  /**
   * Calculate average response time from events
   */
  private calculateAvgResponseTime(events: AnalyticsEvent[]): number {
    const responseEvents = events.filter(e =>
      e.eventType === 'message_sent' && e.data.responseTimeMs
    );

    if (responseEvents.length === 0) return 0;

    const totalResponseTime = responseEvents.reduce((sum, e) =>
      sum + (e.data.responseTimeMs || 0), 0
    );

    return Math.round(totalResponseTime / responseEvents.length);
  }

  /**
   * Count online agents from events
   */
  private countOnlineAgents(events: AnalyticsEvent[]): number {
    const agentIds = new Set<number>();

    for (const event of events) {
      if (event.userId && (event.eventType === 'agent_online' || event.eventType === 'message_sent')) {
        agentIds.add(event.userId);
      }
    }

    return agentIds.size;
  }

  /**
   * Calculate queue size from events
   */
  private calculateQueueSize(events: AnalyticsEvent[]): number {
    let queueSize = 0;

    for (const event of events) {
      if (event.eventType === 'conversation_queued') {
        queueSize++;
      } else if (event.eventType === 'conversation_assigned') {
        queueSize = Math.max(0, queueSize - 1);
      }
    }

    return queueSize;
  }

  /**
   * Aggregate events by type
   */
  private aggregateEventsByType(events: AnalyticsEvent[]): Record<string, AnalyticsEvent[]> {
    const aggregated: Record<string, AnalyticsEvent[]> = {};

    for (const event of events) {
      if (!aggregated[event.eventType]) {
        aggregated[event.eventType] = [];
      }
      aggregated[event.eventType].push(event);
    }

    return aggregated;
  }

  /**
   * Persist event metrics to database
   */
  private async persistEventMetrics(
    companyId: number,
    eventType: string,
    events: AnalyticsEvent[]
  ): Promise<void> {
    try {
      // This is a simplified implementation
      // In production, this would call specific DataMartRepository methods
      this.logger.debug('Persisting event metrics', {
        companyId,
        eventType,
        count: events.length
      });

      // Example: Update conversation metrics data mart
      // await this.dataMart.updateConversationMetrics(companyId, { ... });
    } catch (error) {
      this.logger.error('Error persisting event metrics', { error, companyId, eventType });
    }
  }

  /**
   * Get metrics baseline for anomaly detection
   */
  private async getMetricsBaseline(companyId: number): Promise<Partial<RealTimeMetrics>> {
    try {
      // In production, this would query historical averages from data mart
      // For now, return default baseline
      return {
        avgResponseTime: 5000, // 5 seconds
        queueSize: 5,
        conversationsPerHour: 50
      };
    } catch (error) {
      this.logger.error('Error getting metrics baseline', { error, companyId });
      return {};
    }
  }

  /**
   * Calculate anomaly severity
   */
  private calculateSeverity(deviation: number, threshold: number): 'low' | 'medium' | 'high' {
    const ratio = deviation / threshold;

    if (ratio > 2) return 'high';
    if (ratio > 1.5) return 'medium';
    return 'low';
  }

  /**
   * Stop flush timer (for cleanup)
   */
  stopFlushTimer(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
      this.logger.info('Flush timer stopped');
    }
  }

  /**
   * Get buffer statistics
   */
  getBufferStats(): Record<string, { eventCount: number; lastFlush: Date }> {
    const stats: Record<string, { eventCount: number; lastFlush: Date }> = {};

    for (const [key, buffer] of this.metricsBuffer.entries()) {
      stats[key] = {
        eventCount: buffer.events.length,
        lastFlush: buffer.lastFlush
      };
    }

    return stats;
  }
}

interface WebSocketService {
  emitToRoom(room: string, event: string, data: any): void;
}

interface DataMartRepository {
  // Interface placeholder - actual methods defined in DataMartRepository
}

interface Logger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}
