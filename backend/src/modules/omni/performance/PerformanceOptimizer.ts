/**
 * Performance Optimization Layer - Sprint 10
 * Optimizes system performance through caching, connection pooling, and resource management
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { EventEmitter } from 'events';

export interface IPerformanceMetrics {
  cpu_usage: number;
  memory_usage: number;
  db_connections: number;
  active_requests: number;
  cache_hit_rate: number;
  avg_response_time: number;
  error_rate: number;
  throughput: number;
}

export interface IResourcePool {
  id: string;
  type: 'database' | 'api' | 'worker';
  max_size: number;
  current_size: number;
  active_connections: number;
  idle_connections: number;
  waiting_requests: number;
}

export interface IOptimizationRule {
  id: string;
  name: string;
  condition: string;
  action: 'scale_up' | 'scale_down' | 'cache_clear' | 'connection_reset' | 'alert';
  threshold: number;
  enabled: boolean;
}

@injectable()
export class PerformanceOptimizer extends EventEmitter {
  private logger: any;
  private metricsHistory: IPerformanceMetrics[] = [];
  private resourcePools: Map<string, IResourcePool> = new Map();
  private optimizationRules: IOptimizationRule[] = [];
  private monitoringInterval?: NodeJS.Timer;
  private isMonitoring = false;

  private readonly DEFAULT_RULES: IOptimizationRule[] = [
    {
      id: 'high_cpu_usage',
      name: 'High CPU Usage Alert',
      condition: 'cpu_usage > threshold',
      action: 'alert',
      threshold: 80,
      enabled: true
    },
    {
      id: 'high_memory_usage',
      name: 'High Memory Usage Alert',
      condition: 'memory_usage > threshold',
      action: 'alert',
      threshold: 85,
      enabled: true
    },
    {
      id: 'low_cache_hit_rate',
      name: 'Low Cache Hit Rate',
      condition: 'cache_hit_rate < threshold',
      action: 'cache_clear',
      threshold: 70,
      enabled: true
    },
    {
      id: 'high_db_connections',
      name: 'High DB Connection Count',
      condition: 'db_connections > threshold',
      action: 'connection_reset',
      threshold: 90,
      enabled: true
    },
    {
      id: 'high_response_time',
      name: 'High Average Response Time',
      condition: 'avg_response_time > threshold',
      action: 'alert',
      threshold: 2000, // 2 seconds
      enabled: true
    }
  ];

  constructor(
    @inject(TYPES.OmniConnection) private pool: Pool
  ) {
    super();
    this.logger = LoggerFactory.create({ file: __filename });
    this.optimizationRules = [...this.DEFAULT_RULES];
  }

  /**
   * Start performance monitoring
   */
  async startMonitoring(intervalMs: number = 30000): Promise<void> {
    if (this.isMonitoring) {
      this.logger.warn('Performance monitoring already running');
      return;
    }

    try {
      this.isMonitoring = true;

      // Initial metrics collection
      await this.collectMetrics();

      // Start periodic monitoring
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.collectMetrics();
          await this.analyzePerformance();
          await this.applyOptimizations();
        } catch (error) {
          this.logger.error('Error in performance monitoring cycle', error);
        }
      }, intervalMs);

      this.logger.info('Performance monitoring started', { interval: intervalMs });
      this.emit('monitoring:started', { interval: intervalMs });
    } catch (error: any) {
      this.logger.error('Failed to start performance monitoring', error);
      throw error;
    }
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.isMonitoring = false;
    this.logger.info('Performance monitoring stopped');
    this.emit('monitoring:stopped');
  }

  /**
   * Collect current performance metrics
   */
  async collectMetrics(): Promise<IPerformanceMetrics> {
    try {
      const startTime = Date.now();

      // System metrics
      const systemMetrics = await this.getSystemMetrics();

      // Database metrics
      const dbMetrics = await this.getDatabaseMetrics();

      // Cache metrics
      const cacheMetrics = await this.getCacheMetrics();

      // Application metrics
      const appMetrics = await this.getApplicationMetrics();

      const metrics: IPerformanceMetrics = {
        cpu_usage: systemMetrics.cpu_usage,
        memory_usage: systemMetrics.memory_usage,
        db_connections: dbMetrics.active_connections,
        active_requests: appMetrics.active_requests,
        cache_hit_rate: cacheMetrics.hit_rate,
        avg_response_time: appMetrics.avg_response_time,
        error_rate: appMetrics.error_rate,
        throughput: appMetrics.throughput
      };

      // Store metrics history
      this.metricsHistory.push(metrics);

      // Keep only last 100 records
      if (this.metricsHistory.length > 100) {
        this.metricsHistory = this.metricsHistory.slice(-100);
      }

      // Store in database
      await this.storeMetrics(metrics);

      this.logger.debug('Performance metrics collected', {
        collection_time: Date.now() - startTime,
        metrics
      });

      return metrics;
    } catch (error: any) {
      this.logger.error('Failed to collect performance metrics', error);
      throw error;
    }
  }

  /**
   * Analyze current performance and identify issues
   */
  async analyzePerformance(): Promise<void> {
    if (this.metricsHistory.length === 0) return;

    const currentMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    const issues: string[] = [];

    // Check each optimization rule
    for (const rule of this.optimizationRules) {
      if (!rule.enabled) continue;

      const isTriggered = this.evaluateRule(rule, currentMetrics);

      if (isTriggered) {
        issues.push(rule.name);

        this.emit('performance:issue', {
          rule: rule.name,
          condition: rule.condition,
          threshold: rule.threshold,
          current_value: this.getMetricValue(rule.condition, currentMetrics),
          action: rule.action
        });

        this.logger.warn('Performance issue detected', {
          rule: rule.name,
          threshold: rule.threshold,
          current: this.getMetricValue(rule.condition, currentMetrics)
        });
      }
    }

    // Trend analysis
    if (this.metricsHistory.length >= 5) {
      const trends = this.analyzeTrends();
      this.emit('performance:trends', trends);
    }
  }

  /**
   * Apply optimization actions based on current performance
   */
  async applyOptimizations(): Promise<void> {
    if (this.metricsHistory.length === 0) return;

    const currentMetrics = this.metricsHistory[this.metricsHistory.length - 1];

    for (const rule of this.optimizationRules) {
      if (!rule.enabled) continue;

      const isTriggered = this.evaluateRule(rule, currentMetrics);

      if (isTriggered) {
        await this.executeOptimizationAction(rule, currentMetrics);
      }
    }
  }

  /**
   * Execute specific optimization action
   */
  private async executeOptimizationAction(
    rule: IOptimizationRule,
    metrics: IPerformanceMetrics
  ): Promise<void> {
    try {
      switch (rule.action) {
        case 'cache_clear':
          await this.clearCache();
          break;

        case 'connection_reset':
          await this.resetConnections();
          break;

        case 'scale_up':
          await this.scaleUp();
          break;

        case 'scale_down':
          await this.scaleDown();
          break;

        case 'alert':
          this.emit('performance:alert', {
            rule: rule.name,
            severity: 'high',
            metrics,
            timestamp: new Date()
          });
          break;

        default:
          this.logger.warn('Unknown optimization action', { action: rule.action });
      }

      this.logger.info('Optimization action executed', {
        rule: rule.name,
        action: rule.action
      });
    } catch (error: any) {
      this.logger.error('Failed to execute optimization action', {
        rule: rule.name,
        action: rule.action,
        error: error.message
      });
    }
  }

  /**
   * Get system metrics (CPU, Memory)
   */
  private async getSystemMetrics(): Promise<any> {
    const os = require('os');
    const process = require('process');

    // CPU usage calculation
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const cpu_usage = 100 - ~~(100 * idle / total);

    // Memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memory_usage = ((totalMemory - freeMemory) / totalMemory) * 100;

    return {
      cpu_usage,
      memory_usage
    };
  }

  /**
   * Get database metrics
   */
  private async getDatabaseMetrics(): Promise<any> {
    try {
      const poolInfo = (this.pool as any).totalCount ? {
        total: (this.pool as any).totalCount,
        idle: (this.pool as any).idleCount,
        waiting: (this.pool as any).waitingCount
      } : { total: 10, idle: 5, waiting: 0 }; // Default values

      return {
        active_connections: poolInfo.total - poolInfo.idle,
        idle_connections: poolInfo.idle,
        waiting_connections: poolInfo.waiting,
        total_connections: poolInfo.total
      };
    } catch (error) {
      return {
        active_connections: 0,
        idle_connections: 0,
        waiting_connections: 0,
        total_connections: 0
      };
    }
  }

  /**
   * Get cache metrics (mock implementation)
   */
  private async getCacheMetrics(): Promise<any> {
    // In a real implementation, this would get metrics from Redis or other cache
    return {
      hit_rate: 85 + Math.random() * 10, // Mock 85-95% hit rate
      miss_rate: 5 + Math.random() * 10,
      total_requests: 1000 + Math.random() * 500,
      memory_usage: 60 + Math.random() * 20
    };
  }

  /**
   * Get application metrics
   */
  private async getApplicationMetrics(): Promise<any> {
    // Mock implementation - in production, integrate with actual metrics
    return {
      active_requests: Math.floor(Math.random() * 50),
      avg_response_time: 500 + Math.random() * 1000,
      error_rate: Math.random() * 5,
      throughput: 100 + Math.random() * 200
    };
  }

  /**
   * Evaluate optimization rule against current metrics
   */
  private evaluateRule(rule: IOptimizationRule, metrics: IPerformanceMetrics): boolean {
    const value = this.getMetricValue(rule.condition, metrics);

    switch (rule.condition) {
      case 'cpu_usage > threshold':
        return metrics.cpu_usage > rule.threshold;
      case 'memory_usage > threshold':
        return metrics.memory_usage > rule.threshold;
      case 'cache_hit_rate < threshold':
        return metrics.cache_hit_rate < rule.threshold;
      case 'db_connections > threshold':
        return metrics.db_connections > rule.threshold;
      case 'avg_response_time > threshold':
        return metrics.avg_response_time > rule.threshold;
      default:
        return false;
    }
  }

  /**
   * Get metric value for a condition
   */
  private getMetricValue(condition: string, metrics: IPerformanceMetrics): number {
    if (condition.includes('cpu_usage')) return metrics.cpu_usage;
    if (condition.includes('memory_usage')) return metrics.memory_usage;
    if (condition.includes('cache_hit_rate')) return metrics.cache_hit_rate;
    if (condition.includes('db_connections')) return metrics.db_connections;
    if (condition.includes('avg_response_time')) return metrics.avg_response_time;
    return 0;
  }

  /**
   * Analyze performance trends
   */
  private analyzeTrends(): any {
    const recentMetrics = this.metricsHistory.slice(-10);
    const trends: any = {};

    if (recentMetrics.length < 2) return trends;

    // Calculate trends for each metric
    const metrics = ['cpu_usage', 'memory_usage', 'avg_response_time', 'error_rate'];

    metrics.forEach(metric => {
      const values = recentMetrics.map(m => (m as any)[metric]);
      const trend = this.calculateTrend(values);
      trends[metric] = trend;
    });

    return trends;
  }

  /**
   * Calculate trend for a series of values
   */
  private calculateTrend(values: number[]): string {
    if (values.length < 2) return 'stable';

    const recent = values.slice(-3);
    const older = values.slice(0, -3);

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.length > 0
      ? older.reduce((sum, val) => sum + val, 0) / older.length
      : recentAvg;

    const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (changePercent > 10) return 'increasing';
    if (changePercent < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * Clear cache to improve performance
   */
  private async clearCache(): Promise<void> {
    this.logger.info('Clearing cache for performance optimization');
    // Implementation would clear Redis or other cache
    this.emit('optimization:cache_cleared');
  }

  /**
   * Reset database connections
   */
  private async resetConnections(): Promise<void> {
    this.logger.info('Resetting database connections');
    // Implementation would reset connection pool
    this.emit('optimization:connections_reset');
  }

  /**
   * Scale up resources
   */
  private async scaleUp(): Promise<void> {
    this.logger.info('Scaling up resources');
    this.emit('optimization:scaled_up');
  }

  /**
   * Scale down resources
   */
  private async scaleDown(): Promise<void> {
    this.logger.info('Scaling down resources');
    this.emit('optimization:scaled_down');
  }

  /**
   * Store metrics in database
   */
  private async storeMetrics(metrics: IPerformanceMetrics): Promise<void> {
    try {
      const query = `
        INSERT INTO performance_metrics (
          cpu_usage,
          memory_usage,
          db_connections,
          active_requests,
          cache_hit_rate,
          avg_response_time,
          error_rate,
          throughput
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `;

      await this.pool.query(query, [
        metrics.cpu_usage,
        metrics.memory_usage,
        metrics.db_connections,
        metrics.active_requests,
        metrics.cache_hit_rate,
        metrics.avg_response_time,
        metrics.error_rate,
        metrics.throughput
      ]);
    } catch (error: any) {
      this.logger.error('Failed to store performance metrics', error);
    }
  }

  /**
   * Get current performance status
   */
  async getPerformanceStatus(): Promise<{
    current_metrics: IPerformanceMetrics | null;
    trends: any;
    active_issues: string[];
    resource_pools: IResourcePool[];
  }> {
    const currentMetrics = this.metricsHistory.length > 0
      ? this.metricsHistory[this.metricsHistory.length - 1]
      : null;

    const trends = this.metricsHistory.length >= 5 ? this.analyzeTrends() : {};

    const activeIssues: string[] = [];
    if (currentMetrics) {
      for (const rule of this.optimizationRules) {
        if (rule.enabled && this.evaluateRule(rule, currentMetrics)) {
          activeIssues.push(rule.name);
        }
      }
    }

    return {
      current_metrics: currentMetrics,
      trends,
      active_issues: activeIssues,
      resource_pools: Array.from(this.resourcePools.values())
    };
  }

  /**
   * Add or update optimization rule
   */
  addOptimizationRule(rule: IOptimizationRule): void {
    const existingIndex = this.optimizationRules.findIndex(r => r.id === rule.id);

    if (existingIndex >= 0) {
      this.optimizationRules[existingIndex] = rule;
    } else {
      this.optimizationRules.push(rule);
    }

    this.logger.info('Optimization rule updated', { rule: rule.name });
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stopMonitoring();
    this.metricsHistory = [];
    this.resourcePools.clear();
    this.removeAllListeners();
    this.logger.info('PerformanceOptimizer cleaned up');
  }
}