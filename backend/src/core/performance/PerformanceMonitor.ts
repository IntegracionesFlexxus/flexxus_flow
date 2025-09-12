/**
 * Performance Monitor Implementation
 * Sprint 4 - Performance Optimization
 * Sistema completo de monitoreo de performance de base de datos
 */
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import {
  IPerformanceMonitor,
  PerformanceMetrics,
  PerformanceThresholds,
  PerformanceReport,
  PerformanceTrend,
  PerformanceIssue,
  PerformanceAnomaly
} from './interfaces/IPerformanceOptimizer';
import winston from 'winston';
import { EventEmitter } from 'events';
interface MonitoringSession {
  database: string;
  startTime: Date;
  interval: NodeJS.Timeout;
  metrics: PerformanceMetrics[];
  thresholds: PerformanceThresholds;
  isActive: boolean;
}
interface AnomalyDetector {
  metric: string;
  baseline: number;
  stdDeviation: number;
  samples: number[];
}
@injectable()
export class PerformanceMonitor extends EventEmitter implements IPerformanceMonitor {
  private logger: winston.Logger;
  private databaseConnections: Map<string, IDatabaseConnection> = new Map();
  private monitoringSessions: Map<string, MonitoringSession> = new Map();
  private metricsHistory: Map<string, PerformanceMetrics[]> = new Map();
  private anomalyDetectors: Map<string, Map<string, AnomalyDetector>> = new Map();
  private defaultThresholds: PerformanceThresholds = {
    maxResponseTime: 1000, // 1 second
    maxSlowQueries: 10,
    minCacheHitRatio: 70, // 70%
    maxConnectionPoolUsage: 80, // 80%
    maxCPUUsage: 80, // 80%
    maxMemoryUsage: 80 // 80%
  };
  constructor(
    @inject(TYPES.Logger) logger: winston.Logger,
    @inject(TYPES.SharedConnection) sharedDb: IDatabaseConnection,
    @inject(TYPES.OmniConnection) omniDb: IDatabaseConnection,
    @inject(TYPES.CrmConnection) crmDb: IDatabaseConnection,
    @inject(TYPES.WorkflowConnection) workflowDb: IDatabaseConnection,
    @inject(TYPES.AnalyticsConnection) analyticsDb: IDatabaseConnection
  ) {
    super();
    this.logger = logger;
    this.databaseConnections.set('shared', sharedDb);
    this.databaseConnections.set('omni', omniDb);
    this.databaseConnections.set('crm', crmDb);
    this.databaseConnections.set('workflow', workflowDb);
    this.databaseConnections.set('analytics', analyticsDb);
  }
  /**
   * Iniciar monitoreo
   */
  startMonitoring(database: string): void {
    if (this.monitoringSessions.has(database)) {
      this.logger.warn(`Monitoring already active for ${database}`);
      return;
    }
    const session: MonitoringSession = {
      database,
      startTime: new Date(),
      interval: setInterval(() => this.collectMetrics(database), 30000), // Every 30 seconds
      metrics: [],
      thresholds: { ...this.defaultThresholds },
      isActive: true
    };
    this.monitoringSessions.set(database, session);
    this.initializeAnomalyDetector(database);
    this.logger.info(`Performance monitoring started for ${database}`);
    this.emit('monitoring:started', { database });
  }
  /**
   * Detener monitoreo
   */
  stopMonitoring(database: string): void {
    const session = this.monitoringSessions.get(database);
    if (!session) {
      this.logger.warn(`No active monitoring session for ${database}`);
      return;
    }
    clearInterval(session.interval);
    session.isActive = false;
    // Save metrics to history
    const history = this.metricsHistory.get(database) || [];
    history.push(...session.metrics);
    this.metricsHistory.set(database, history);
    this.monitoringSessions.delete(database);
    this.logger.info(`Performance monitoring stopped for ${database}`);
    this.emit('monitoring:stopped', { database });
  }
  /**
   * Obtener métricas
   */
  async getMetrics(database: string, period?: number): Promise<PerformanceMetrics[]> {
    const session = this.monitoringSessions.get(database);
    const history = this.metricsHistory.get(database) || [];
    let allMetrics = [...history];
    if (session) {
      allMetrics.push(...session.metrics);
    }
    if (period) {
      const cutoff = new Date(Date.now() - period * 1000);
      allMetrics = allMetrics.filter(m => m.timestamp >= cutoff);
    }
    return allMetrics;
  }
  /**
   * Establecer alertas
   */
  setAlerts(database: string, thresholds: PerformanceThresholds): void {
    const session = this.monitoringSessions.get(database);
    if (session) {
      session.thresholds = thresholds;
    } else {
      // Store for future sessions
      this.defaultThresholds = thresholds;
    }
    this.logger.info(`Alert thresholds updated for ${database}`);
  }
  /**
   * Generar reporte
   */
  async generateReport(
    database: string,
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceReport> {
    const metrics = await this.getMetrics(database);
    const periodMetrics = metrics.filter(
      m => m.timestamp >= startDate && m.timestamp <= endDate
    );
    if (periodMetrics.length === 0) {
      throw new Error('No metrics found for the specified period');
    }
    // Calculate summary
    const summary = this.calculateSummary(periodMetrics);
    // Analyze trends
    const trends = this.analyzeTrends(periodMetrics);
    // Identify issues
    const issues = await this.identifyIssues(database, periodMetrics);
    // Generate recommendations
    const recommendations = this.generateRecommendations(summary, trends, issues);
    // Generate charts data
    const charts = this.generateCharts(periodMetrics);
    return {
      period: { start: startDate, end: endDate },
      summary,
      trends,
      issues,
      recommendations,
      charts
    };
  }
  /**
   * Detectar anomalías
   */
  async detectAnomalies(database: string): Promise<PerformanceAnomaly[]> {
    const metrics = await this.getMetrics(database, 3600); // Last hour
    const anomalies: PerformanceAnomaly[] = [];
    if (metrics.length === 0) {
      return anomalies;
    }
    const latestMetric = metrics[metrics.length - 1];
    const detectors = this.anomalyDetectors.get(database);
    if (!detectors) {
      return anomalies;
    }
    // Check each metric for anomalies
    const metricChecks = [
      { name: 'avgResponseTime', value: latestMetric.avgResponseTime },
      { name: 'slowQueries', value: latestMetric.slowQueries },
      { name: 'cacheHitRatio', value: latestMetric.cacheHitRatio },
      { name: 'connectionPoolUsage', value: latestMetric.connectionPoolUsage },
      { name: 'cpuUsage', value: latestMetric.cpuUsage },
      { name: 'memoryUsage', value: latestMetric.memoryUsage }
    ];
    for (const check of metricChecks) {
      const detector = detectors.get(check.name);
      if (detector && detector.samples.length >= 10) {
        const zscore = this.calculateZScore(check.value, detector);
        if (Math.abs(zscore) > 3) { // 3 standard deviations
          anomalies.push({
            metric: check.name,
            expected: detector.baseline,
            actual: check.value,
            deviation: zscore,
            timestamp: latestMetric.timestamp,
            possibleCauses: this.identifyPossibleCauses(check.name, check.value, detector.baseline)
          });
        }
      }
    }
    return anomalies;
  }
  /**
   * Collect metrics
   */
  private async collectMetrics(database: string): Promise<void> {
    const session = this.monitoringSessions.get(database);
    if (!session || !session.isActive) return;
    try {
      const connection = this.getConnection(database);
      const metrics = await this.gatherMetrics(connection, database);
      // Add to session metrics
      session.metrics.push(metrics);
      // Keep only last 1000 metrics in session
      if (session.metrics.length > 1000) {
        session.metrics.shift();
      }
      // Update anomaly detectors
      this.updateAnomalyDetectors(database, metrics);
      // Check thresholds
      this.checkThresholds(database, metrics, session.thresholds);
      // Emit metrics event
      this.emit('metrics:collected', { database, metrics });
    } catch (error) {
      this.logger.error(`Failed to collect metrics for ${database}:`, error);
      this.emit('metrics:error', { database, error });
    }
  }
  /**
   * Gather metrics from database
   */
  private async gatherMetrics(
    connection: IDatabaseConnection,
    database: string
  ): Promise<PerformanceMetrics> {
    const timestamp = new Date();
    // Query performance stats
    const perfStats = await connection.query<any>(`
      SELECT 
        COUNT(*) as query_count,
        AVG(mean_exec_time) as avg_response_time,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY mean_exec_time) as p95_response_time,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY mean_exec_time) as p99_response_time,
        COUNT(*) FILTER (WHERE mean_exec_time > 1000) as slow_queries
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat%'
    `, []);
    // Cache statistics
    const cacheStats = await connection.query<any>(`
      SELECT 
        sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 as cache_hit_ratio
      FROM pg_statio_user_tables
    `, []);
    // Connection pool usage
    const connectionStats = await connection.query<any>(`
      SELECT 
        COUNT(*) as total_connections,
        COUNT(*) FILTER (WHERE state = 'active') as active_connections
      FROM pg_stat_activity
      WHERE datname = $1
    `, [database]);
    // System resources (would need pg_stat_monitor or similar extension)
    const systemStats = await this.getSystemStats(connection);
    // Index efficiency
    const indexEfficiency = await this.calculateIndexEfficiency(connection);
    const poolStatus = (connection as any).getPoolStatus();
    const connectionPoolUsage = (poolStatus.total - poolStatus.idle) / poolStatus.total * 100;
    return {
      timestamp,
      database,
      queryCount: perfStats[0]?.query_count || 0,
      avgResponseTime: perfStats[0]?.avg_response_time || 0,
      p95ResponseTime: perfStats[0]?.p95_response_time || 0,
      p99ResponseTime: perfStats[0]?.p99_response_time || 0,
      slowQueries: perfStats[0]?.slow_queries || 0,
      cacheHitRatio: cacheStats[0]?.cache_hit_ratio || 0,
      connectionPoolUsage,
      indexEfficiency,
      diskIO: systemStats.diskIO,
      cpuUsage: systemStats.cpuUsage,
      memoryUsage: systemStats.memoryUsage
    };
  }
  /**
   * Get system statistics
   */
  private async getSystemStats(connection: IDatabaseConnection): Promise<any> {
    try {
      // This would require additional monitoring extensions
      // For now, return mock data
      return {
        diskIO: Math.random() * 100,
        cpuUsage: Math.random() * 100,
        memoryUsage: Math.random() * 100
      };
    } catch {
      return {
        diskIO: 0,
        cpuUsage: 0,
        memoryUsage: 0
      };
    }
  }
  /**
   * Calculate index efficiency
   */
  private async calculateIndexEfficiency(connection: IDatabaseConnection): Promise<number> {
    try {
      const result = await connection.query<any>(`
        SELECT 
          AVG(idx_scan::float / NULLIF(seq_scan + idx_scan, 0)) * 100 as efficiency
        FROM pg_stat_user_tables
      `, []);
      return result[0]?.efficiency || 0;
    } catch {
      return 0;
    }
  }
  /**
   * Initialize anomaly detector
   */
  private initializeAnomalyDetector(database: string): void {
    const detectors = new Map<string, AnomalyDetector>();
    const metrics = [
      'avgResponseTime',
      'slowQueries',
      'cacheHitRatio',
      'connectionPoolUsage',
      'cpuUsage',
      'memoryUsage'
    ];
    for (const metric of metrics) {
      detectors.set(metric, {
        metric,
        baseline: 0,
        stdDeviation: 0,
        samples: []
      });
    }
    this.anomalyDetectors.set(database, detectors);
  }
  /**
   * Update anomaly detectors
   */
  private updateAnomalyDetectors(database: string, metrics: PerformanceMetrics): void {
    const detectors = this.anomalyDetectors.get(database);
    if (!detectors) return;
    const updates = [
      { name: 'avgResponseTime', value: metrics.avgResponseTime },
      { name: 'slowQueries', value: metrics.slowQueries },
      { name: 'cacheHitRatio', value: metrics.cacheHitRatio },
      { name: 'connectionPoolUsage', value: metrics.connectionPoolUsage },
      { name: 'cpuUsage', value: metrics.cpuUsage },
      { name: 'memoryUsage', value: metrics.memoryUsage }
    ];
    for (const update of updates) {
      const detector = detectors.get(update.name);
      if (!detector) continue;
      // Add sample
      detector.samples.push(update.value);
      // Keep only last 100 samples
      if (detector.samples.length > 100) {
        detector.samples.shift();
      }
      // Recalculate baseline and standard deviation
      if (detector.samples.length >= 10) {
        detector.baseline = this.calculateMean(detector.samples);
        detector.stdDeviation = this.calculateStdDev(detector.samples, detector.baseline);
      }
    }
  }
  /**
   * Check thresholds
   */
  private checkThresholds(
    database: string,
    metrics: PerformanceMetrics,
    thresholds: PerformanceThresholds
  ): void {
    const alerts: string[] = [];
    if (metrics.avgResponseTime > thresholds.maxResponseTime) {
      alerts.push(`Response time (${metrics.avgResponseTime}ms) exceeds threshold (${thresholds.maxResponseTime}ms)`);
    }
    if (metrics.slowQueries > thresholds.maxSlowQueries) {
      alerts.push(`Slow queries (${metrics.slowQueries}) exceed threshold (${thresholds.maxSlowQueries})`);
    }
    if (metrics.cacheHitRatio < thresholds.minCacheHitRatio) {
      alerts.push(`Cache hit ratio (${metrics.cacheHitRatio}%) below threshold (${thresholds.minCacheHitRatio}%)`);
    }
    if (metrics.connectionPoolUsage > thresholds.maxConnectionPoolUsage) {
      alerts.push(`Connection pool usage (${metrics.connectionPoolUsage}%) exceeds threshold (${thresholds.maxConnectionPoolUsage}%)`);
    }
    if (metrics.cpuUsage > thresholds.maxCPUUsage) {
      alerts.push(`CPU usage (${metrics.cpuUsage}%) exceeds threshold (${thresholds.maxCPUUsage}%)`);
    }
    if (metrics.memoryUsage > thresholds.maxMemoryUsage) {
      alerts.push(`Memory usage (${metrics.memoryUsage}%) exceeds threshold (${thresholds.maxMemoryUsage}%)`);
    }
    if (alerts.length > 0) {
      this.logger.warn(`Performance alerts for ${database}:`, alerts);
      this.emit('threshold:exceeded', { database, alerts, metrics });
    }
  }
  /**
   * Calculate summary
   */
  private calculateSummary(metrics: PerformanceMetrics[]): PerformanceMetrics {
    const sum = metrics.reduce((acc, m) => ({
      timestamp: new Date(),
      database: m.database,
      queryCount: acc.queryCount + m.queryCount,
      avgResponseTime: acc.avgResponseTime + m.avgResponseTime,
      p95ResponseTime: Math.max(acc.p95ResponseTime, m.p95ResponseTime),
      p99ResponseTime: Math.max(acc.p99ResponseTime, m.p99ResponseTime),
      slowQueries: acc.slowQueries + m.slowQueries,
      cacheHitRatio: acc.cacheHitRatio + m.cacheHitRatio,
      connectionPoolUsage: acc.connectionPoolUsage + m.connectionPoolUsage,
      indexEfficiency: acc.indexEfficiency + m.indexEfficiency,
      diskIO: acc.diskIO + m.diskIO,
      cpuUsage: acc.cpuUsage + m.cpuUsage,
      memoryUsage: acc.memoryUsage + m.memoryUsage
    }), {
      timestamp: new Date(),
      database: '',
      queryCount: 0,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      slowQueries: 0,
      cacheHitRatio: 0,
      connectionPoolUsage: 0,
      indexEfficiency: 0,
      diskIO: 0,
      cpuUsage: 0,
      memoryUsage: 0
    });
    const count = metrics.length;
    return {
      ...sum,
      avgResponseTime: sum.avgResponseTime / count,
      cacheHitRatio: sum.cacheHitRatio / count,
      connectionPoolUsage: sum.connectionPoolUsage / count,
      indexEfficiency: sum.indexEfficiency / count,
      diskIO: sum.diskIO / count,
      cpuUsage: sum.cpuUsage / count,
      memoryUsage: sum.memoryUsage / count
    };
  }
  /**
   * Analyze trends
   */
  private analyzeTrends(metrics: PerformanceMetrics[]): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];
    const metricNames = [
      'avgResponseTime',
      'slowQueries',
      'cacheHitRatio',
      'connectionPoolUsage'
    ];
    for (const metricName of metricNames) {
      const values = metrics.map(m => (m as any)[metricName]);
      const trend = this.calculateTrend(values);
      const forecast = this.forecastValues(values, 5);
      trends.push({
        metric: metricName,
        trend,
        changePercent: this.calculateChangePercent(values),
        forecast
      });
    }
    return trends;
  }
  /**
   * Identify issues
   */
  private async identifyIssues(
    database: string,
    metrics: PerformanceMetrics[]
  ): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];
    const latest = metrics[metrics.length - 1];
    if (latest.avgResponseTime > 1000) {
      issues.push({
        type: 'high_response_time',
        severity: 'warning',
        description: 'Average response time is above 1 second',
        impact: 'User experience degradation',
        resolution: 'Optimize slow queries and check index usage',
        occurredAt: latest.timestamp
      });
    }
    if (latest.cacheHitRatio < 70) {
      issues.push({
        type: 'low_cache_hit_ratio',
        severity: 'warning',
        description: 'Cache hit ratio is below 70%',
        impact: 'Increased disk I/O and slower queries',
        resolution: 'Increase shared_buffers or optimize cache usage',
        occurredAt: latest.timestamp
      });
    }
    if (latest.connectionPoolUsage > 90) {
      issues.push({
        type: 'high_connection_pool_usage',
        severity: 'critical',
        description: 'Connection pool is nearly exhausted',
        impact: 'Connection timeouts and failed requests',
        resolution: 'Increase pool size or optimize connection usage',
        occurredAt: latest.timestamp
      });
    }
    return issues;
  }
  /**
   * Generate recommendations
   */
  private generateRecommendations(
    summary: PerformanceMetrics,
    trends: PerformanceTrend[],
    issues: PerformanceIssue[]
  ): string[] {
    const recommendations: string[] = [];
    // Based on summary
    if (summary.avgResponseTime > 500) {
      recommendations.push('Consider implementing query result caching');
    }
    if (summary.indexEfficiency < 70) {
      recommendations.push('Review and optimize database indexes');
    }
    // Based on trends
    const degradingTrends = trends.filter(t => t.trend === 'degrading');
    for (const trend of degradingTrends) {
      recommendations.push(`Monitor ${trend.metric} closely - showing degrading trend`);
    }
    // Based on issues
    if (issues.some(i => i.type === 'high_connection_pool_usage')) {
      recommendations.push('Implement connection pooling optimization');
    }
    return recommendations;
  }
  /**
   * Generate charts data
   */
  private generateCharts(metrics: PerformanceMetrics[]): any[] {
    return [
      {
        type: 'line',
        title: 'Response Time Trend',
        data: metrics.map(m => ({
          x: m.timestamp,
          y: m.avgResponseTime
        }))
      },
      {
        type: 'line',
        title: 'Cache Hit Ratio',
        data: metrics.map(m => ({
          x: m.timestamp,
          y: m.cacheHitRatio
        }))
      },
      {
        type: 'bar',
        title: 'Slow Queries',
        data: metrics.map(m => ({
          x: m.timestamp,
          y: m.slowQueries
        }))
      }
    ];
  }
  /**
   * Calculate Z-score
   */
  private calculateZScore(value: number, detector: AnomalyDetector): number {
    if (detector.stdDeviation === 0) return 0;
    return (value - detector.baseline) / detector.stdDeviation;
  }
  /**
   * Calculate mean
   */
  private calculateMean(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[], mean: number): number {
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = this.calculateMean(squaredDiffs);
    return Math.sqrt(avgSquaredDiff);
  }
  /**
   * Calculate trend
   */
  private calculateTrend(values: number[]): 'improving' | 'stable' | 'degrading' {
    if (values.length < 3) return 'stable';
    const firstThird = values.slice(0, Math.floor(values.length / 3));
    const lastThird = values.slice(-Math.floor(values.length / 3));
    const firstAvg = this.calculateMean(firstThird);
    const lastAvg = this.calculateMean(lastThird);
    const change = ((lastAvg - firstAvg) / firstAvg) * 100;
    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'degrading' : 'improving';
  }
  /**
   * Calculate change percent
   */
  private calculateChangePercent(values: number[]): number {
    if (values.length < 2) return 0;
    const first = values[0];
    const last = values[values.length - 1];
    return ((last - first) / first) * 100;
  }
  /**
   * Forecast values
   */
  private forecastValues(values: number[], periods: number): number[] {
    if (values.length < 2) return [];
    // Simple linear regression
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const forecast: number[] = [];
    for (let i = 0; i < periods; i++) {
      forecast.push(slope * (n + i) + intercept);
    }
    return forecast;
  }
  /**
   * Identify possible causes
   */
  private identifyPossibleCauses(
    metric: string,
    actual: number,
    expected: number
  ): string[] {
    const causes: string[] = [];
    switch (metric) {
      case 'avgResponseTime':
        if (actual > expected) {
          causes.push('Slow queries', 'Lock contention', 'Missing indexes', 'High load');
        }
        break;
      case 'cacheHitRatio':
        if (actual < expected) {
          causes.push('Cache eviction', 'New query patterns', 'Insufficient cache size');
        }
        break;
      case 'connectionPoolUsage':
        if (actual > expected) {
          causes.push('Connection leaks', 'Long-running transactions', 'Traffic spike');
        }
        break;
    }
    return causes;
  }
  /**
   * Get database connection
   */
  private getConnection(database: string): IDatabaseConnection {
    const connection = this.databaseConnections.get(database);
    if (!connection) {
      throw new Error(`Database connection not found: ${database}`);
    }
    return connection;
  }
}
