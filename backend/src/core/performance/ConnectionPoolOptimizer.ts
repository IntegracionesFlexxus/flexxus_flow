/**
 * Connection Pool Optimizer Implementation
 * Sprint 4 - Performance Optimization
 * Optimización avanzada del pool de conexiones existente
 */
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import {
  IConnectionPoolOptimizer,
  PoolOptimizationConfig
} from './interfaces/IPerformanceOptimizer';
import winston from 'winston';
interface PoolMetrics {
  totalConnections: number;
  idleConnections: number;
  waitingRequests: number;
  avgWaitTime: number;
  avgConnectionTime: number;
  connectionErrors: number;
  timeouts: number;
  utilizationPercent: number;
}
interface CircuitBreakerState {
  isOpen: boolean;
  failures: number;
  lastFailureTime: Date | null;
  successCount: number;
}
@injectable()
export class ConnectionPoolOptimizer implements IConnectionPoolOptimizer {
  private logger: winston.Logger;
  private databaseConnections: Map<string, IDatabaseConnection> = new Map();
  private poolMetrics: Map<string, PoolMetrics[]> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private metricsInterval: NodeJS.Timeout | null = null;
  // Circuit breaker configuration
  private readonly FAILURE_THRESHOLD = 5;
  private readonly SUCCESS_THRESHOLD = 3;
  private readonly TIMEOUT_DURATION = 30000; // 30 seconds
  private readonly RESET_TIMEOUT = 60000; // 1 minute
  constructor(
    @inject(TYPES.Logger) logger: winston.Logger,
    @inject(TYPES.SharedConnection) sharedDb: IDatabaseConnection,
    @inject(TYPES.OmniConnection) omniDb: IDatabaseConnection,
    @inject(TYPES.CrmConnection) crmDb: IDatabaseConnection,
    @inject(TYPES.WorkflowConnection) workflowDb: IDatabaseConnection,
    @inject(TYPES.AnalyticsConnection) analyticsDb: IDatabaseConnection
  ) {
    this.logger = logger;
    this.databaseConnections.set('shared', sharedDb);
    this.databaseConnections.set('omni', omniDb);
    this.databaseConnections.set('crm', crmDb);
    this.databaseConnections.set('workflow', workflowDb);
    this.databaseConnections.set('analytics', analyticsDb);
    // Initialize circuit breakers
    for (const [name] of this.databaseConnections) {
      this.circuitBreakers.set(name, {
        isOpen: false,
        failures: 0,
        lastFailureTime: null,
        successCount: 0
      });
    }
    // Start metrics collection
    this.startMetricsCollection();
  }
  /**
   * Analizar uso del pool
   */
  async analyzePoolUsage(database: string): Promise<PoolOptimizationConfig> {
    const connection = this.getConnection(database);
    const metrics = await this.collectPoolMetrics(database);
    // Analyze historical metrics
    const historicalMetrics = this.poolMetrics.get(database) || [];
    historicalMetrics.push(metrics);
    // Keep only last 100 metrics
    if (historicalMetrics.length > 100) {
      historicalMetrics.shift();
    }
    this.poolMetrics.set(database, historicalMetrics);
    // Calculate averages
    const avgUtilization = this.calculateAverage(
      historicalMetrics.map(m => m.utilizationPercent)
    );
    const avgWaitTime = this.calculateAverage(
      historicalMetrics.map(m => m.avgWaitTime)
    );
    // Get current pool configuration
    const currentConfig = (connection as any).getPoolStatus();
    // Calculate recommended size based on utilization
    const recommendedSize = this.calculateOptimalPoolSize(
      currentConfig.total,
      avgUtilization,
      avgWaitTime,
      metrics.waitingRequests
    );
    // Calculate timeouts
    const idleTimeout = this.calculateIdleTimeout(avgUtilization);
    const connectionTimeout = this.calculateConnectionTimeout(avgWaitTime);
    return {
      database,
      currentSize: currentConfig.total,
      recommendedSize,
      idleTimeout,
      connectionTimeout,
      statementTimeout: avgWaitTime > 5000 ? 30000 : 60000,
      queryTimeout: avgWaitTime > 10000 ? 60000 : 120000
    };
  }
  /**
   * Optimizar tamaño del pool
   */
  async optimizePoolSize(database: string): Promise<void> {
    const config = await this.analyzePoolUsage(database);
    const connection = this.getConnection(database);
    try {
      // Get the underlying pool
      const pool = (connection as any).pool;
      if (!pool) {
        throw new Error('Pool not accessible');
      }
      // Adjust pool size dynamically
      if (config.recommendedSize !== config.currentSize) {
        // PostgreSQL pg module doesn't support dynamic pool resizing
        // Log recommendation instead
        this.logger.info(
          `Pool size recommendation for ${database}: ` +
          `current=${config.currentSize}, recommended=${config.recommendedSize}`
        );
        // Store recommendation for next restart
        await this.storePoolRecommendation(database, config);
      }
      // Apply timeout adjustments
      await this.adjustTimeouts(database, {
        idleTimeout: config.idleTimeout,
        connectionTimeout: config.connectionTimeout,
        statementTimeout: config.statementTimeout,
        queryTimeout: config.queryTimeout
      });
    } catch (error) {
      this.logger.error(`Failed to optimize pool size for ${database}:`, error);
      throw error;
    }
  }
  /**
   * Obtener métricas del pool
   */
  async getPoolMetrics(database: string): Promise<any> {
    const connection = this.getConnection(database);
    const metrics = await this.collectPoolMetrics(database);
    const historicalMetrics = this.poolMetrics.get(database) || [];
    // Get circuit breaker status
    const circuitBreaker = this.circuitBreakers.get(database);
    return {
      current: metrics,
      historical: historicalMetrics.slice(-20), // Last 20 metrics
      poolStatus: (connection as any).getPoolStatus(),
      circuitBreaker: {
        status: circuitBreaker?.isOpen ? 'open' : 'closed',
        failures: circuitBreaker?.failures || 0,
        lastFailure: circuitBreaker?.lastFailureTime
      },
      recommendations: await this.generateRecommendations(database, metrics)
    };
  }
  /**
   * Ajustar timeouts
   */
  async adjustTimeouts(
    database: string,
    config: Partial<PoolOptimizationConfig>
  ): Promise<void> {
    const connection = this.getConnection(database);
    try {
      // Set statement timeout for all new connections
      if (config.statementTimeout) {
        await connection.query(
          `ALTER DATABASE ${database} SET statement_timeout = ${config.statementTimeout}`,
          []
        );
      }
      // Set idle in transaction timeout
      if (config.idleTimeout) {
        await connection.query(
          `ALTER DATABASE ${database} SET idle_in_transaction_session_timeout = ${config.idleTimeout}`,
          []
        );
      }
      // Log the changes
      this.logger.info(`Timeouts adjusted for ${database}:`, config);
    } catch (error) {
      this.logger.error(`Failed to adjust timeouts for ${database}:`, error);
      throw error;
    }
  }
  /**
   * Implementar circuit breaker
   */
  async implementCircuitBreaker(database: string): Promise<void> {
    const breaker = this.circuitBreakers.get(database);
    if (!breaker) {
      throw new Error(`Circuit breaker not found for ${database}`);
    }
    // Wrap database connection methods
    const connection = this.getConnection(database);
    const originalQuery = connection.query.bind(connection);
    // Override query method with circuit breaker logic
    connection.query = async (text: string, params?: any[]): Promise<any> => {
      // Check if circuit is open
      if (breaker.isOpen) {
        // Check if enough time has passed to attempt reset
        if (breaker.lastFailureTime && 
            Date.now() - breaker.lastFailureTime.getTime() > this.RESET_TIMEOUT) {
          breaker.isOpen = false;
          breaker.successCount = 0;
          this.logger.info(`Circuit breaker for ${database} attempting reset`);
        } else {
          throw new Error(`Circuit breaker is open for ${database}`);
        }
      }
      try {
        // Execute query with timeout
        const result = await Promise.race([
          originalQuery(text, params),
          this.timeout(this.TIMEOUT_DURATION)
        ]);
        // Success - update circuit breaker state
        if (breaker.failures > 0) {
          breaker.successCount++;
          if (breaker.successCount >= this.SUCCESS_THRESHOLD) {
            breaker.failures = 0;
            breaker.successCount = 0;
            this.logger.info(`Circuit breaker for ${database} reset after successful queries`);
          }
        }
        return result;
      } catch (error) {
        // Failure - update circuit breaker state
        breaker.failures++;
        breaker.lastFailureTime = new Date();
        breaker.successCount = 0;
        if (breaker.failures >= this.FAILURE_THRESHOLD) {
          breaker.isOpen = true;
          this.logger.error(
            `Circuit breaker opened for ${database} after ${breaker.failures} failures`
          );
        }
        throw error;
      }
    };
    this.logger.info(`Circuit breaker implemented for ${database}`);
  }
  /**
   * Collect pool metrics
   */
  private async collectPoolMetrics(database: string): Promise<PoolMetrics> {
    const connection = this.getConnection(database);
    const poolStatus = (connection as any).getPoolStatus();
    // Query database for connection statistics
    try {
      const stats = await connection.query<any>(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE wait_event_type = 'Client') as waiting_clients,
          avg(EXTRACT(EPOCH FROM (now() - backend_start))) as avg_connection_age
        FROM pg_stat_activity
        WHERE datname = $1
      `, [database]);
      const connectionStats = stats[0] || {};
      return {
        totalConnections: poolStatus.total,
        idleConnections: poolStatus.idle,
        waitingRequests: poolStatus.waiting,
        avgWaitTime: 0, // Would need to track this separately
        avgConnectionTime: connectionStats.avg_connection_age || 0,
        connectionErrors: 0, // Would need to track this separately
        timeouts: 0, // Would need to track this separately
        utilizationPercent: (poolStatus.total - poolStatus.idle) / poolStatus.total * 100
      };
    } catch (error) {
      // Return pool status only if query fails
      return {
        totalConnections: poolStatus.total,
        idleConnections: poolStatus.idle,
        waitingRequests: poolStatus.waiting,
        avgWaitTime: 0,
        avgConnectionTime: 0,
        connectionErrors: 0,
        timeouts: 0,
        utilizationPercent: (poolStatus.total - poolStatus.idle) / poolStatus.total * 100
      };
    }
  }
  /**
   * Calculate optimal pool size
   */
  private calculateOptimalPoolSize(
    currentSize: number,
    avgUtilization: number,
    avgWaitTime: number,
    waitingRequests: number
  ): number {
    let recommendedSize = currentSize;
    // If utilization is consistently high, increase pool size
    if (avgUtilization > 80) {
      recommendedSize = Math.min(currentSize * 1.5, 100); // Cap at 100
    }
    // If utilization is consistently low, decrease pool size
    else if (avgUtilization < 30 && currentSize > 10) {
      recommendedSize = Math.max(currentSize * 0.7, 10); // Minimum 10
    }
    // If there are waiting requests, increase pool size
    if (waitingRequests > 0) {
      recommendedSize = Math.min(recommendedSize + waitingRequests, 100);
    }
    // If wait time is high, increase pool size
    if (avgWaitTime > 1000) {
      recommendedSize = Math.min(recommendedSize * 1.2, 100);
    }
    return Math.round(recommendedSize);
  }
  /**
   * Calculate idle timeout
   */
  private calculateIdleTimeout(avgUtilization: number): number {
    // Higher utilization = shorter idle timeout
    if (avgUtilization > 70) {
      return 10000; // 10 seconds
    } else if (avgUtilization > 50) {
      return 30000; // 30 seconds
    } else {
      return 60000; // 1 minute
    }
  }
  /**
   * Calculate connection timeout
   */
  private calculateConnectionTimeout(avgWaitTime: number): number {
    // Base timeout on average wait time
    if (avgWaitTime > 5000) {
      return 10000; // 10 seconds
    } else if (avgWaitTime > 1000) {
      return 5000; // 5 seconds
    } else {
      return 3000; // 3 seconds
    }
  }
  /**
   * Generate recommendations
   */
  private async generateRecommendations(
    database: string,
    metrics: PoolMetrics
  ): Promise<string[]> {
    const recommendations: string[] = [];
    if (metrics.utilizationPercent > 80) {
      recommendations.push('Pool utilization is high. Consider increasing pool size.');
    }
    if (metrics.utilizationPercent < 20) {
      recommendations.push('Pool utilization is low. Consider decreasing pool size to save resources.');
    }
    if (metrics.waitingRequests > 5) {
      recommendations.push(`${metrics.waitingRequests} requests are waiting. Increase pool size or optimize queries.`);
    }
    if (metrics.avgWaitTime > 5000) {
      recommendations.push('Average wait time is high. Consider increasing pool size or connection timeout.');
    }
    if (metrics.connectionErrors > 0) {
      recommendations.push('Connection errors detected. Check database health and network connectivity.');
    }
    const breaker = this.circuitBreakers.get(database);
    if (breaker?.isOpen) {
      recommendations.push('Circuit breaker is open. Database may be experiencing issues.');
    }
    return recommendations;
  }
  /**
   * Store pool recommendation for next restart
   */
  private async storePoolRecommendation(
    database: string,
    config: PoolOptimizationConfig
  ): Promise<void> {
    // Store in database or configuration file
    // This would be used on next application restart
    try {
      const connection = this.getConnection('shared');
      await connection.query(`
        INSERT INTO pool_recommendations (database_name, recommended_size, recommended_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (database_name)
        DO UPDATE SET 
          recommended_size = $2,
          recommended_at = NOW()
      `, [database, config.recommendedSize]);
    } catch (error) {
      // If table doesn't exist, create it
      try {
        const connection = this.getConnection('shared');
        await connection.query(`
          CREATE TABLE IF NOT EXISTS pool_recommendations (
            database_name VARCHAR(100) PRIMARY KEY,
            recommended_size INTEGER,
            recommended_at TIMESTAMP DEFAULT NOW()
          )
        `, []);
        // Retry insert
        await connection.query(`
          INSERT INTO pool_recommendations (database_name, recommended_size)
          VALUES ($1, $2)
        `, [database, config.recommendedSize]);
      } catch (createError) {
        this.logger.error('Failed to store pool recommendation:', createError);
      }
    }
  }
  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    // Collect metrics every 30 seconds
    this.metricsInterval = setInterval(async () => {
      for (const [database] of this.databaseConnections) {
        try {
          const metrics = await this.collectPoolMetrics(database);
          // Store metrics
          const historicalMetrics = this.poolMetrics.get(database) || [];
          historicalMetrics.push(metrics);
          // Keep only last 100 metrics
          if (historicalMetrics.length > 100) {
            historicalMetrics.shift();
          }
          this.poolMetrics.set(database, historicalMetrics);
        } catch (error) {
          this.logger.error(`Failed to collect metrics for ${database}:`, error);
        }
      }
    }, 30000);
  }
  /**
   * Stop metrics collection
   */
  public stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }
  /**
   * Timeout helper
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), ms);
    });
  }
  /**
   * Calculate average
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
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
  /**
   * Cleanup on destroy
   */
  public destroy(): void {
    this.stopMetricsCollection();
  }
}
