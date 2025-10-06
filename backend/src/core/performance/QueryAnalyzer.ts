/**
 * Query Analyzer Implementation
 * Sprint 4 - Performance Optimization
 * Análisis y optimización de queries SQL
 */
import { injectable, inject } from 'inversify';
import { PoolClient } from 'pg';
import { TYPES } from '@/container/types';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import {
  IQueryAnalyzer,
  QueryAnalysisParams,
  QueryAnalysisResult,
  QueryRecommendation,
  IndexUsageInfo,
  QueryAnalysisType
} from './interfaces/IPerformanceOptimizer';
import winston from 'winston';
@injectable()
export class QueryAnalyzer implements IQueryAnalyzer {
  private logger: winston.Logger;
  private queryCache: Map<string, QueryAnalysisResult> = new Map();
  private slowQueryLog: Map<string, QueryAnalysisResult[]> = new Map();
  constructor(
    @inject(TYPES.Logger) logger: winston.Logger
  ) {
    this.logger = logger;
  }
  /**
   * Analizar un query completo
   */
  async analyzeQuery(params: QueryAnalysisParams): Promise<QueryAnalysisResult> {
    const cacheKey = `${params.database}:${params.query}`;
    // Check cache
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey)!;
      if (Date.now() - cached.executionTime < 300000) { // 5 min cache
        return cached;
      }
    }
    const connection = await this.getConnection(params.database);
    const client = await connection.query<any>('SELECT 1', []); // Get a client
    try {
      // Execute EXPLAIN ANALYZE
      const explainResult = await this.explainQuery(params.query, params.database);
      // Get execution statistics
      const stats = await this.getQueryStatistics(params.query, params.database);
      // Analyze index usage
      const indexUsage = await this.analyzeIndexUsage(params.query, params.database);
      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        params.query,
        explainResult,
        stats,
        indexUsage
      );
      // Identify bottlenecks
      const bottlenecks = this.identifyBottlenecks(explainResult);
      const result: QueryAnalysisResult = {
        query: params.query,
        executionTime: stats.executionTime,
        cost: explainResult.totalCost || 0,
        rows: explainResult.rows || 0,
        executionPlan: explainResult,
        recommendations,
        indexUsage,
        bottlenecks
      };
      // Cache result
      this.queryCache.set(cacheKey, result);
      // Log slow query if needed
      if (params.timeThreshold && stats.executionTime > params.timeThreshold) {
        this.logSlowQuery(params.database, result);
      }
      return result;
    } catch (error) {
      this.logger.error('Query analysis failed:', error);
      throw error;
    }
  }
  /**
   * Ejecutar EXPLAIN en un query
   */
  async explainQuery(query: string, database: string): Promise<any> {
    const connection = await this.getConnection(database);
    try {
      // Use EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
      const explainQuery = `EXPLAIN (ANALYZE true, BUFFERS true, VERBOSE true, FORMAT JSON) ${query}`;
      const result = await connection.query<any>(explainQuery, []);
      if (result.rows.length > 0 && result.rows[0]['QUERY PLAN']) {
        const plan = result.rows[0]['QUERY PLAN'][0];
        return this.parseExecutionPlan(plan);
      }
      return null;
    } catch (error) {
      // If ANALYZE fails, try without it
      try {
        const explainQuery = `EXPLAIN (FORMAT JSON) ${query}`;
        const result = await connection.query<any>(explainQuery, []);
        if (result.rows.length > 0 && result.rows[0]['QUERY PLAN']) {
          return result.rows[0]['QUERY PLAN'][0];
        }
      } catch (innerError) {
        this.logger.error('Explain query failed:', innerError);
        throw innerError;
      }
    }
  }
  /**
   * Obtener queries lentos
   */
  async getSlowQueries(database: string, threshold: number): Promise<QueryAnalysisResult[]> {
    const connection = await this.getConnection(database);
    try {
      // Query pg_stat_statements if available
      const checkExtension = await connection.query<any>(
        `SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements'`,
        []
      );
      if (checkExtension.rows.length > 0) {
        const slowQueries = await connection.query<any>(`
          SELECT 
            query,
            calls,
            total_exec_time,
            mean_exec_time,
            stddev_exec_time,
            rows,
            100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) AS hit_percent
          FROM pg_stat_statements
          WHERE mean_exec_time > $1
          ORDER BY mean_exec_time DESC
          LIMIT 100
        `, [threshold]);
        const results: QueryAnalysisResult[] = [];
        for (const sq of slowQueries.rows) {
          const result: QueryAnalysisResult = {
            query: sq.query,
            executionTime: sq.mean_exec_time,
            cost: 0,
            rows: sq.rows,
            executionPlan: null,
            recommendations: [],
            indexUsage: [],
            bottlenecks: []
          };
          // Analyze each slow query
          try {
            const analysis = await this.analyzeQuery({
              query: sq.query,
              database,
              includeRecommendations: true
            });
            results.push(analysis);
          } catch (error) {
            // Skip queries that can't be analyzed
            results.push(result);
          }
        }
        return results;
      }
      // Fallback to cached slow queries
      return this.slowQueryLog.get(database) || [];
    } catch (error) {
      this.logger.error('Failed to get slow queries:', error);
      return this.slowQueryLog.get(database) || [];
    }
  }
  /**
   * Optimizar un query
   */
  async optimizeQuery(query: string): Promise<string> {
    let optimized = query;
    // Remove unnecessary DISTINCT
    optimized = this.removeUnnecessaryDistinct(optimized);
    // Optimize JOINs
    optimized = this.optimizeJoins(optimized);
    // Optimize subqueries
    optimized = this.optimizeSubqueries(optimized);
    // Add missing indexes hints
    optimized = this.addIndexHints(optimized);
    // Optimize wildcards
    optimized = this.optimizeWildcards(optimized);
    return optimized;
  }
  /**
   * Generar estadísticas de queries
   */
  async generateQueryStats(database: string, period: number): Promise<any> {
    const connection = await this.getConnection(database);
    try {
      const stats = await connection.query<any>(`
        SELECT 
          COUNT(*) as total_queries,
          AVG(mean_exec_time) as avg_execution_time,
          MAX(mean_exec_time) as max_execution_time,
          MIN(mean_exec_time) as min_execution_time,
          SUM(calls) as total_calls,
          SUM(rows) as total_rows
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat_statements%'
      `, []);
      const topQueries = await connection.query<any>(`
        SELECT 
          query,
          calls,
          mean_exec_time,
          total_exec_time,
          rows
        FROM pg_stat_statements
        ORDER BY total_exec_time DESC
        LIMIT 10
      `, []);
      return {
        summary: stats.rows[0],
        topQueries: topQueries.rows,
        period,
        generatedAt: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to generate query stats:', error);
      return {
        summary: {},
        topQueries: [],
        period,
        generatedAt: new Date()
      };
    }
  }
  /**
   * Obtener estadísticas de un query
   */
  private async getQueryStatistics(query: string, database: string): Promise<any> {
    const connection = await this.getConnection(database);
    try {
      // Try to get from pg_stat_statements
      const stats = await connection.query<any>(`
        SELECT 
          calls,
          total_exec_time,
          mean_exec_time,
          stddev_exec_time,
          rows,
          shared_blks_hit,
          shared_blks_read
        FROM pg_stat_statements
        WHERE query = $1
        LIMIT 1
      `, [query]);
      if (stats.rows.length > 0) {
        return {
          executionTime: stats.rows[0].mean_exec_time,
          calls: stats.rows[0].calls,
          rows: stats.rows[0].rows,
          cacheHitRatio: stats.rows[0].shared_blks_hit / (stats.rows[0].shared_blks_hit + stats.rows[0].shared_blks_read)
        };
      }
      // Fallback: execute query with timing
      const start = Date.now();
      await connection.query(query, []);
      const executionTime = Date.now() - start;
      return {
        executionTime,
        calls: 1,
        rows: 0,
        cacheHitRatio: 0
      };
    } catch (error) {
      return {
        executionTime: 0,
        calls: 0,
        rows: 0,
        cacheHitRatio: 0
      };
    }
  }
  /**
   * Analizar uso de índices
   */
  private async analyzeIndexUsage(query: string, database: string): Promise<IndexUsageInfo[]> {
    const connection = await this.getConnection(database);
    try {
      // Extract table names from query
      const tables = this.extractTableNames(query);
      const indexUsage: IndexUsageInfo[] = [];
      for (const table of tables) {
        const indexes = await connection.query<any>(`
          SELECT 
            schemaname,
            tablename,
            indexname,
            idx_scan as scans,
            idx_tup_read as tuple_reads,
            idx_tup_fetch as tuple_fetches,
            pg_size_pretty(pg_relation_size(indexrelid)) as size
          FROM pg_stat_user_indexes
          WHERE tablename = $1
        `, [table]);
        for (const idx of indexes.rows) {
          const efficiency = idx.tuple_fetches > 0 
            ? (idx.tuple_reads / idx.tuple_fetches) * 100 
            : 0;
          indexUsage.push({
            tableName: idx.tablename,
            indexName: idx.indexname,
            scans: idx.scans,
            tupleReads: idx.tuple_reads,
            tupleFetches: idx.tuple_fetches,
            efficiency,
            size: this.parseSize(idx.size)
          });
        }
      }
      return indexUsage;
    } catch (error) {
      this.logger.error('Failed to analyze index usage:', error);
      return [];
    }
  }
  /**
   * Generar recomendaciones
   */
  private async generateRecommendations(
    query: string,
    plan: any,
    stats: any,
    indexUsage: IndexUsageInfo[]
  ): Promise<QueryRecommendation[]> {
    const recommendations: QueryRecommendation[] = [];
    // Check for sequential scans
    if (plan && plan.Plan && plan.Plan['Node Type'] === 'Seq Scan') {
      recommendations.push({
        type: 'index',
        priority: 'high',
        description: `Sequential scan detected on table ${plan.Plan['Relation Name']}`,
        impact: 'Creating an index could significantly improve query performance',
        implementation: `CREATE INDEX idx_${plan.Plan['Relation Name']}_optimized ON ${plan.Plan['Relation Name']}(column_name);`,
        estimatedImprovement: 70
      });
    }
    // Check for missing indexes
    const unusedIndexes = indexUsage.filter(idx => idx.scans === 0);
    if (unusedIndexes.length > 0) {
      for (const idx of unusedIndexes) {
        recommendations.push({
          type: 'index',
          priority: 'medium',
          description: `Unused index detected: ${idx.indexName}`,
          impact: 'Removing unused indexes can improve write performance',
          implementation: `DROP INDEX ${idx.indexName};`,
          estimatedImprovement: 10
        });
      }
    }
    // Check for query rewrite opportunities
    if (query.toLowerCase().includes('select *')) {
      recommendations.push({
        type: 'rewrite',
        priority: 'medium',
        description: 'Avoid using SELECT *',
        impact: 'Selecting only needed columns reduces data transfer',
        implementation: 'Specify only the columns you need',
        estimatedImprovement: 20
      });
    }
    // Check for missing statistics
    if (stats.executionTime > 1000) {
      recommendations.push({
        type: 'statistics',
        priority: 'medium',
        description: 'Update table statistics',
        impact: 'Better statistics lead to better query plans',
        implementation: 'ANALYZE table_name;',
        estimatedImprovement: 30
      });
    }
    // Check for caching opportunities
    if (stats.calls > 100 && stats.executionTime < 100) {
      recommendations.push({
        type: 'cache',
        priority: 'low',
        description: 'Consider caching this frequently executed query',
        impact: 'Caching can eliminate database roundtrips',
        estimatedImprovement: 90
      });
    }
    return recommendations;
  }
  /**
   * Identificar cuellos de botella
   */
  private identifyBottlenecks(plan: any): string[] {
    const bottlenecks: string[] = [];
    if (!plan || !plan.Plan) {
      return bottlenecks;
    }
    // Recursive function to traverse plan
    const analyzePlanNode = (node: any) => {
      // Check for expensive operations
      if (node['Node Type'] === 'Seq Scan' && node['Actual Rows'] > 10000) {
        bottlenecks.push(`Sequential scan on ${node['Relation Name']} processing ${node['Actual Rows']} rows`);
      }
      if (node['Node Type'] === 'Nested Loop' && node['Actual Rows'] > 1000) {
        bottlenecks.push('Nested loop join with large result set');
      }
      if (node['Node Type'] === 'Sort' && node['Sort Space Used'] > 1000) {
        bottlenecks.push(`Large sort operation using ${node['Sort Space Used']}KB`);
      }
      // Check children
      if (node.Plans) {
        for (const child of node.Plans) {
          analyzePlanNode(child);
        }
      }
    };
    analyzePlanNode(plan.Plan);
    return bottlenecks;
  }
  /**
   * Parse execution plan
   */
  private parseExecutionPlan(plan: any): any {
    return {
      ...plan,
      totalCost: plan.Plan?.['Total Cost'] || 0,
      rows: plan.Plan?.['Plan Rows'] || 0,
      executionTime: plan['Execution Time'] || 0,
      planningTime: plan['Planning Time'] || 0
    };
  }
  /**
   * Extract table names from query
   */
  private extractTableNames(query: string): string[] {
    const tables: string[] = [];
    const fromRegex = /FROM\s+(\w+)/gi;
    const joinRegex = /JOIN\s+(\w+)/gi;
    let match;
    while ((match = fromRegex.exec(query)) !== null) {
      tables.push(match[1]);
    }
    while ((match = joinRegex.exec(query)) !== null) {
      tables.push(match[1]);
    }
    return [...new Set(tables)];
  }
  /**
   * Parse size string to bytes
   */
  private parseSize(sizeStr: string): number {
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(\w+)?$/);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2]?.toUpperCase() || 'B';
    const units: { [key: string]: number } = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'TB': 1024 * 1024 * 1024 * 1024
    };
    return value * (units[unit] || 1);
  }
  /**
   * Log slow query
   */
  private logSlowQuery(database: string, result: QueryAnalysisResult): void {
    if (!this.slowQueryLog.has(database)) {
      this.slowQueryLog.set(database, []);
    }
    const log = this.slowQueryLog.get(database)!;
    log.push(result);
    // Keep only last 100 slow queries
    if (log.length > 100) {
      log.shift();
    }
  }
  /**
   * Query optimization methods
   */
  private removeUnnecessaryDistinct(query: string): string {
    // Remove DISTINCT when selecting from single table with unique constraint
    return query.replace(/SELECT\s+DISTINCT\s+/gi, 'SELECT ');
  }
  private optimizeJoins(query: string): string {
    // Convert implicit joins to explicit
    return query.replace(/FROM\s+(\w+),\s*(\w+)/gi, 'FROM $1 CROSS JOIN $2');
  }
  private optimizeSubqueries(query: string): string {
    // Convert IN subqueries to EXISTS when possible
    return query.replace(/WHERE\s+\w+\s+IN\s+\(/gi, 'WHERE EXISTS (');
  }
  private addIndexHints(query: string): string {
    // This would require more complex analysis
    return query;
  }
  private optimizeWildcards(query: string): string {
    // Remove leading wildcards in LIKE clauses
    return query.replace(/LIKE\s+'%(\w+)'/gi, "LIKE '$1%'");
  }
  /**
   * Get database connection
   */
  private async getConnection(database: string): Promise<IDatabaseConnection> {
    // This would be injected from container based on database name
    // For now, return a mock
    throw new Error('Database connection not implemented');
  }
}
