/**
 * Feature Flag Analytics Service - Sprint 3
 * Servicio especializado para analytics y métricas de feature flags
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import { TYPES } from '@/container/types';
import { ICacheService } from '@/shared/interfaces/ICacheService';
import { FeatureFlagContext, EvaluationResult, AnalyticsData } from '@/modules/feature-flags/services/EnhancedFeatureFlagService';
export interface AnalyticsEvent {
  type: 'evaluation' | 'cache_hit' | 'cache_miss' | 'error' | 'rule_match' | 'variation_served';
  flagName: string;
  timestamp: number;
  context: FeatureFlagContext;
  data: Record<string, any>;
}
export interface MetricsSummary {
  totalEvaluations: number;
  uniqueUsers: number;
  cacheHitRate: number;
  averageResponseTime: number;
  errorRate: number;
  topFlags: Array<{ name: string; evaluations: number }>;
  flagsByEnvironment: Record<string, number>;
  evaluationTrends: Array<{ timestamp: number; evaluations: number; errors: number }>;
}
export interface PerformanceMetrics {
  avgEvaluationTime: number;
  p95EvaluationTime: number;
  p99EvaluationTime: number;
  cacheHitRate: number;
  errorRate: number;
  throughput: number; // evaluations per second
}
export interface UserSegmentAnalytics {
  segment: string;
  totalEvaluations: number;
  uniqueUsers: number;
  enabledRate: number;
  topVariations: Array<{ variation: string; count: number; percentage: number }>;
}
export interface FlagHealth {
  flagName: string;
  environment: string;
  status: 'healthy' | 'warning' | 'critical';
  metrics: {
    evaluations: number;
    errors: number;
    errorRate: number;
    cacheHitRate: number;
    avgResponseTime: number;
  };
  issues: string[];
  recommendations: string[];
}
@injectable()
export class FeatureFlagAnalyticsService extends EventEmitter {
  private readonly ANALYTICS_PREFIX = 'ff_analytics:';
  private readonly METRICS_PREFIX = 'ff_metrics:';
  private readonly AGGREGATION_WINDOW = 5 * 60 * 1000; // 5 minutes
  private readonly RETENTION_DAYS = 30;
  // In-memory buffers for real-time analytics
  private eventBuffer: AnalyticsEvent[] = [];
  private readonly BUFFER_SIZE = 1000;
  private readonly FLUSH_INTERVAL = 30 * 1000; // 30 seconds
  // Performance tracking
  private performanceMetrics = new Map<string, number[]>(); // flagName -> response times
  private readonly PERFORMANCE_SAMPLE_SIZE = 1000;
  constructor(
    @inject(TYPES.CacheService) private cacheService: ICacheService,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    super();
    this.startPeriodicFlush();
    this.startMetricsAggregation();
  }
  /**
   * Record a feature flag evaluation event
   */
  async recordEvaluation(
    flagName: string,
    context: FeatureFlagContext,
    result: EvaluationResult
  ): Promise<void> {
    const event: AnalyticsEvent = {
      type: 'evaluation',
      flagName,
      timestamp: Date.now(),
      context,
      data: {
        enabled: result.enabled,
        variation: result.variation,
        value: result.value,
        reason: result.reason,
        evaluationTime: result.evaluationTime,
        cacheHit: result.cacheHit,
        ruleMatches: result.ruleMatches
      }
    };
    await this.addEvent(event);
    this.recordPerformanceMetric(flagName, result.evaluationTime);
    // Emit for real-time consumers
    this.emit('evaluationRecorded', event);
  }
  /**
   * Record a cache hit event
   */
  async recordCacheHit(flagName: string, context: FeatureFlagContext, responseTime: number): Promise<void> {
    const event: AnalyticsEvent = {
      type: 'cache_hit',
      flagName,
      timestamp: Date.now(),
      context,
      data: { responseTime }
    };
    await this.addEvent(event);
    this.emit('cacheHit', event);
  }
  /**
   * Record a cache miss event
   */
  async recordCacheMiss(flagName: string, context: FeatureFlagContext, responseTime: number): Promise<void> {
    const event: AnalyticsEvent = {
      type: 'cache_miss',
      flagName,
      timestamp: Date.now(),
      context,
      data: { responseTime }
    };
    await this.addEvent(event);
    this.emit('cacheMiss', event);
  }
  /**
   * Record an error event
   */
  async recordError(flagName: string, context: FeatureFlagContext, error: Error): Promise<void> {
    const event: AnalyticsEvent = {
      type: 'error',
      flagName,
      timestamp: Date.now(),
      context,
      data: {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5), // Truncate stack trace
        name: error.name
      }
    };
    await this.addEvent(event);
    this.emit('errorRecorded', event);
  }
  /**
   * Get analytics for specific flags
   */
  async getAnalytics(
    flagNames?: string[],
    startDate?: Date,
    endDate?: Date,
    environment?: string
  ): Promise<AnalyticsData[]> {
    try {
      const analytics: AnalyticsData[] = [];
      const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24h
      const end = endDate || new Date();
      // Get cached analytics if available
      for (const flagName of flagNames || await this.getAllFlagNames()) {
        const cacheKey = this.buildAnalyticsCacheKey(flagName, environment, start, end);
        let flagAnalytics = await this.cacheService.get<AnalyticsData>(cacheKey);
        if (!flagAnalytics) {
          flagAnalytics = await this.calculateAnalytics(flagName, start, end, environment);
          // Cache for 5 minutes
          await this.cacheService.set(cacheKey, flagAnalytics, 5 * 60 * 1000);
        }
        if (flagAnalytics) {
          analytics.push(flagAnalytics);
        }
      }
      return analytics;
    } catch (error) {
      this.logger.error('Analytics retrieval failed', { error, flagNames, startDate, endDate });
      return [];
    }
  }
  /**
   * Get performance metrics for flags
   */
  async getPerformanceMetrics(flagName?: string): Promise<PerformanceMetrics | Record<string, PerformanceMetrics>> {
    try {
      if (flagName) {
        return await this.calculatePerformanceMetrics(flagName);
      }
      const allMetrics: Record<string, PerformanceMetrics> = {};
      const flagNames = await this.getAllFlagNames();
      for (const name of flagNames) {
        allMetrics[name] = await this.calculatePerformanceMetrics(name);
      }
      return allMetrics;
    } catch (error) {
      this.logger.error('Performance metrics calculation failed', { error, flagName });
      return flagName ? this.getEmptyPerformanceMetrics() : {};
    }
  }
  /**
   * Get user segment analytics
   */
  async getUserSegmentAnalytics(
    flagName: string,
    segments: string[],
    startDate?: Date,
    endDate?: Date
  ): Promise<UserSegmentAnalytics[]> {
    try {
      const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
      const end = endDate || new Date();
      const events = await this.getEventsByFlag(flagName, start, end);
      const segmentAnalytics: UserSegmentAnalytics[] = [];
      for (const segment of segments) {
        const segmentEvents = events.filter(event => this.matchesSegment(event, segment));
        const uniqueUsers = new Set(segmentEvents.map(e => e.context.userId)).size;
        const totalEvaluations = segmentEvents.length;
        const enabledEvaluations = segmentEvents.filter(e => e.data.enabled).length;
        const enabledRate = totalEvaluations > 0 ? enabledEvaluations / totalEvaluations : 0;
        // Count variations
        const variationCounts = new Map<string, number>();
        segmentEvents.forEach(event => {
          if (event.data.variation) {
            variationCounts.set(event.data.variation, (variationCounts.get(event.data.variation) || 0) + 1);
          }
        });
        const topVariations = Array.from(variationCounts.entries())
          .map(([variation, count]) => ({
            variation,
            count,
            percentage: totalEvaluations > 0 ? (count / totalEvaluations) * 100 : 0
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        segmentAnalytics.push({
          segment,
          totalEvaluations,
          uniqueUsers,
          enabledRate,
          topVariations
        });
      }
      return segmentAnalytics;
    } catch (error) {
      this.logger.error('User segment analytics calculation failed', { error, flagName, segments });
      return [];
    }
  }
  /**
   * Get flag health status
   */
  async getFlagHealth(flagName: string, environment?: string): Promise<FlagHealth> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 60 * 60 * 1000); // Last hour
      const events = await this.getEventsByFlag(flagName, startDate, endDate);
      const evaluations = events.filter(e => e.type === 'evaluation').length;
      const errors = events.filter(e => e.type === 'error').length;
      const cacheHits = events.filter(e => e.type === 'cache_hit').length;
      const cacheMisses = events.filter(e => e.type === 'cache_miss').length;
      const errorRate = evaluations > 0 ? errors / evaluations : 0;
      const cacheHitRate = (cacheHits + cacheMisses) > 0 ? cacheHits / (cacheHits + cacheMisses) : 0;
      const responseTimes = this.performanceMetrics.get(flagName) || [];
      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0;
      const issues: string[] = [];
      const recommendations: string[] = [];
      let status: FlagHealth['status'] = 'healthy';
      // Health checks
      if (errorRate > 0.05) { // > 5% error rate
        status = 'critical';
        issues.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
        recommendations.push('Review flag configuration and rules');
      } else if (errorRate > 0.01) { // > 1% error rate
        status = 'warning';
        issues.push(`Elevated error rate: ${(errorRate * 100).toFixed(1)}%`);
      }
      if (cacheHitRate < 0.8 && evaluations > 100) { // < 80% cache hit rate with significant traffic
        status = status === 'critical' ? 'critical' : 'warning';
        issues.push(`Low cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%`);
        recommendations.push('Review cache TTL settings');
      }
      if (avgResponseTime > 100) { // > 100ms average response time
        if (status === 'healthy') status = 'warning';
        issues.push(`High response time: ${avgResponseTime.toFixed(1)}ms`);
        recommendations.push('Consider optimizing rule complexity');
      }
      if (evaluations === 0) {
        status = 'warning';
        issues.push('No evaluations in the last hour');
        recommendations.push('Verify flag is being used as expected');
      }
      return {
        flagName,
        environment: environment || 'unknown',
        status,
        metrics: {
          evaluations,
          errors,
          errorRate,
          cacheHitRate,
          avgResponseTime
        },
        issues,
        recommendations
      };
    } catch (error) {
      this.logger.error('Flag health calculation failed', { error, flagName });
      return {
        flagName,
        environment: environment || 'unknown',
        status: 'critical',
        metrics: { evaluations: 0, errors: 0, errorRate: 0, cacheHitRate: 0, avgResponseTime: 0 },
        issues: ['Health check failed'],
        recommendations: ['Check system logs for errors']
      };
    }
  }
  /**
   * Get overall system metrics summary
   */
  async getMetricsSummary(environment?: string): Promise<MetricsSummary> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24h
      const allEvents = await this.getAllEvents(startDate, endDate, environment);
      const evaluationEvents = allEvents.filter(e => e.type === 'evaluation');
      const uniqueUsers = new Set(evaluationEvents.map(e => e.context.userId)).size;
      const cacheHits = allEvents.filter(e => e.type === 'cache_hit').length;
      const cacheMisses = allEvents.filter(e => e.type === 'cache_miss').length;
      const errors = allEvents.filter(e => e.type === 'error').length;
      const cacheHitRate = (cacheHits + cacheMisses) > 0 ? cacheHits / (cacheHits + cacheMisses) : 0;
      const errorRate = evaluationEvents.length > 0 ? errors / evaluationEvents.length : 0;
      const responseTimes = evaluationEvents.map(e => e.data.evaluationTime).filter(t => t);
      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0;
      // Top flags by evaluation count
      const flagCounts = new Map<string, number>();
      evaluationEvents.forEach(e => {
        flagCounts.set(e.flagName, (flagCounts.get(e.flagName) || 0) + 1);
      });
      const topFlags = Array.from(flagCounts.entries())
        .map(([name, evaluations]) => ({ name, evaluations }))
        .sort((a, b) => b.evaluations - a.evaluations)
        .slice(0, 10);
      // Flags by environment
      const environmentCounts = new Map<string, number>();
      evaluationEvents.forEach(e => {
        const env = e.context.environment || 'unknown';
        environmentCounts.set(env, (environmentCounts.get(env) || 0) + 1);
      });
      const flagsByEnvironment = Object.fromEntries(environmentCounts);
      // Evaluation trends (hourly)
      const evaluationTrends = this.calculateTrends(allEvents, 'hour');
      return {
        totalEvaluations: evaluationEvents.length,
        uniqueUsers,
        cacheHitRate,
        averageResponseTime,
        errorRate,
        topFlags,
        flagsByEnvironment,
        evaluationTrends
      };
    } catch (error) {
      this.logger.error('Metrics summary calculation failed', { error });
      return this.getEmptyMetricsSummary();
    }
  }
  // Private helper methods
  private async addEvent(event: AnalyticsEvent): Promise<void> {
    this.eventBuffer.push(event);
    if (this.eventBuffer.length >= this.BUFFER_SIZE) {
      await this.flushEvents();
    }
  }
  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;
    try {
      const events = [...this.eventBuffer];
      this.eventBuffer = [];
      // Store events in cache with time-based keys for efficient retrieval
      const eventsByMinute = new Map<string, AnalyticsEvent[]>();
      events.forEach(event => {
        const minute = Math.floor(event.timestamp / (60 * 1000)) * (60 * 1000);
        const key = `${this.ANALYTICS_PREFIX}${minute}`;
        if (!eventsByMinute.has(key)) {
          eventsByMinute.set(key, []);
        }
        eventsByMinute.get(key)!.push(event);
      });
      // Store each minute's events
      for (const [key, minuteEvents] of eventsByMinute) {
        const existing = await this.cacheService.get<AnalyticsEvent[]>(key) || [];
        const merged = [...existing, ...minuteEvents];
        // Set TTL based on retention period
        const ttl = this.RETENTION_DAYS * 24 * 60 * 60 * 1000;
        await this.cacheService.set(key, merged, ttl);
      }
      this.logger.debug('Analytics events flushed', { eventCount: events.length });
    } catch (error) {
      this.logger.error('Failed to flush analytics events', { error });
      // Re-add events to buffer to retry
      this.eventBuffer.unshift(...this.eventBuffer);
    }
  }
  private recordPerformanceMetric(flagName: string, responseTime: number): void {
    if (!this.performanceMetrics.has(flagName)) {
      this.performanceMetrics.set(flagName, []);
    }
    const times = this.performanceMetrics.get(flagName)!;
    times.push(responseTime);
    // Keep only recent samples
    if (times.length > this.PERFORMANCE_SAMPLE_SIZE) {
      times.shift();
    }
  }
  private async calculateAnalytics(
    flagName: string,
    startDate: Date,
    endDate: Date,
    environment?: string
  ): Promise<AnalyticsData> {
    const events = await this.getEventsByFlag(flagName, startDate, endDate, environment);
    const evaluationEvents = events.filter(e => e.type === 'evaluation');
    const uniqueUsers = new Set(evaluationEvents.map(e => e.context.userId)).size;
    const cacheHits = events.filter(e => e.type === 'cache_hit').length;
    const cacheMisses = events.filter(e => e.type === 'cache_miss').length;
    const errors = events.filter(e => e.type === 'error').length;
    const variations: Record<string, number> = {};
    const ruleMatches: Record<string, number> = {};
    evaluationEvents.forEach(event => {
      if (event.data.variation) {
        variations[event.data.variation] = (variations[event.data.variation] || 0) + 1;
      }
      if (event.data.ruleMatches) {
        event.data.ruleMatches.forEach((match: any) => {
          if (match.matched) {
            ruleMatches[match.ruleName] = (ruleMatches[match.ruleName] || 0) + 1;
          }
        });
      }
    });
    const responseTimes = evaluationEvents.map(e => e.data.evaluationTime).filter(t => t);
    const averageEvaluationTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    const cacheHitRate = (cacheHits + cacheMisses) > 0 ? cacheHits / (cacheHits + cacheMisses) : 0;
    const errorRate = evaluationEvents.length > 0 ? errors / evaluationEvents.length : 0;
    return {
      flagName,
      evaluations: evaluationEvents.length,
      uniqueUsers,
      variations,
      ruleMatches,
      averageEvaluationTime,
      cacheHitRate,
      errorRate,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    };
  }
  private async calculatePerformanceMetrics(flagName: string): Promise<PerformanceMetrics> {
    const times = this.performanceMetrics.get(flagName) || [];
    if (times.length === 0) {
      return this.getEmptyPerformanceMetrics();
    }
    const sorted = [...times].sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    return {
      avgEvaluationTime: avg,
      p95EvaluationTime: sorted[p95Index] || 0,
      p99EvaluationTime: sorted[p99Index] || 0,
      cacheHitRate: 0, // Would need to be calculated from events
      errorRate: 0, // Would need to be calculated from events
      throughput: times.length / 3600 // Rough throughput estimate
    };
  }
  private async getEventsByFlag(
    flagName: string,
    startDate: Date,
    endDate: Date,
    environment?: string
  ): Promise<AnalyticsEvent[]> {
    const events: AnalyticsEvent[] = [];
    const startMinute = Math.floor(startDate.getTime() / (60 * 1000)) * (60 * 1000);
    const endMinute = Math.floor(endDate.getTime() / (60 * 1000)) * (60 * 1000);
    for (let minute = startMinute; minute <= endMinute; minute += 60 * 1000) {
      const key = `${this.ANALYTICS_PREFIX}${minute}`;
      const minuteEvents = await this.cacheService.get<AnalyticsEvent[]>(key) || [];
      const filteredEvents = minuteEvents.filter(event => {
        const matchesFlag = event.flagName === flagName;
        const matchesTime = event.timestamp >= startDate.getTime() && event.timestamp <= endDate.getTime();
        const matchesEnvironment = !environment || event.context.environment === environment;
        return matchesFlag && matchesTime && matchesEnvironment;
      });
      events.push(...filteredEvents);
    }
    return events;
  }
  private async getAllEvents(
    startDate: Date,
    endDate: Date,
    environment?: string
  ): Promise<AnalyticsEvent[]> {
    const events: AnalyticsEvent[] = [];
    const startMinute = Math.floor(startDate.getTime() / (60 * 1000)) * (60 * 1000);
    const endMinute = Math.floor(endDate.getTime() / (60 * 1000)) * (60 * 1000);
    for (let minute = startMinute; minute <= endMinute; minute += 60 * 1000) {
      const key = `${this.ANALYTICS_PREFIX}${minute}`;
      const minuteEvents = await this.cacheService.get<AnalyticsEvent[]>(key) || [];
      const filteredEvents = minuteEvents.filter(event => {
        const matchesTime = event.timestamp >= startDate.getTime() && event.timestamp <= endDate.getTime();
        const matchesEnvironment = !environment || event.context.environment === environment;
        return matchesTime && matchesEnvironment;
      });
      events.push(...filteredEvents);
    }
    return events;
  }
  private async getAllFlagNames(): Promise<string[]> {
    // This would typically come from the flag repository
    // For now, we'll extract from recent events
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    const events = await this.getAllEvents(startDate, endDate);
    return Array.from(new Set(events.map(e => e.flagName)));
  }
  private matchesSegment(event: AnalyticsEvent, segment: string): boolean {
    // Implement segment matching logic based on your segmentation strategy
    // This is a simple example
    return event.context.userRole === segment || 
           event.context.userAttributes?.segment === segment;
  }
  private calculateTrends(events: AnalyticsEvent[], granularity: 'hour' | 'day'): Array<{ timestamp: number; evaluations: number; errors: number }> {
    const windowSize = granularity === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const trends = new Map<number, { evaluations: number; errors: number }>();
    events.forEach(event => {
      const window = Math.floor(event.timestamp / windowSize) * windowSize;
      if (!trends.has(window)) {
        trends.set(window, { evaluations: 0, errors: 0 });
      }
      const trend = trends.get(window)!;
      if (event.type === 'evaluation') {
        trend.evaluations++;
      } else if (event.type === 'error') {
        trend.errors++;
      }
    });
    return Array.from(trends.entries())
      .map(([timestamp, data]) => ({ timestamp, ...data }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }
  private buildAnalyticsCacheKey(flagName: string, environment?: string, startDate?: Date, endDate?: Date): string {
    const parts = [
      'analytics',
      flagName,
      environment || 'all',
      startDate?.getTime() || 'all',
      endDate?.getTime() || 'all'
    ];
    return parts.join(':');
  }
  private getEmptyPerformanceMetrics(): PerformanceMetrics {
    return {
      avgEvaluationTime: 0,
      p95EvaluationTime: 0,
      p99EvaluationTime: 0,
      cacheHitRate: 0,
      errorRate: 0,
      throughput: 0
    };
  }
  private getEmptyMetricsSummary(): MetricsSummary {
    return {
      totalEvaluations: 0,
      uniqueUsers: 0,
      cacheHitRate: 0,
      averageResponseTime: 0,
      errorRate: 0,
      topFlags: [],
      flagsByEnvironment: {},
      evaluationTrends: []
    };
  }
  private startPeriodicFlush(): void {
    setInterval(() => {
      this.flushEvents().catch(error => {
        this.logger.error('Periodic flush failed', { error });
      });
    }, this.FLUSH_INTERVAL);
  }
  private startMetricsAggregation(): void {
    // Aggregate metrics every 5 minutes
    setInterval(() => {
      this.aggregateMetrics().catch(error => {
        this.logger.error('Metrics aggregation failed', { error });
      });
    }, this.AGGREGATION_WINDOW);
  }
  private async aggregateMetrics(): Promise<void> {
    try {
      // This would aggregate raw events into summary metrics
      // and store them for faster retrieval
      this.logger.debug('Metrics aggregation completed');
    } catch (error) {
      this.logger.error('Metrics aggregation error', { error });
    }
  }
}
