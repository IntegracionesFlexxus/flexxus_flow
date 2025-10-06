/**
 * Index Analyzer Implementation
 * Sprint 4 - Performance Optimization
 * Análisis y optimización de índices de base de datos
 */
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import {
  IIndexAnalyzer,
  IndexAnalysisParams,
  IndexAnalysisResult,
  IndexInfo,
  IndexDuplicate,
  MissingIndex,
  IndexRecommendation
} from './interfaces/IPerformanceOptimizer';
import winston from 'winston';
@injectable()
export class IndexAnalyzer implements IIndexAnalyzer {
  private logger: winston.Logger;
  private databaseConnections: Map<string, IDatabaseConnection> = new Map();
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
  }
  /**
   * Analizar índices de una base de datos
   */
  async analyzeIndexes(params: IndexAnalysisParams): Promise<IndexAnalysisResult> {
    const connection = this.getConnection(params.database);
    try {
      // Get all indexes
      const existingIndexes = await this.getAllIndexes(connection, params.tables);
      // Find unused indexes
      const unusedIndexes = params.includeUnused 
        ? await this.findUnusedIndexes(params.database, 30)
        : [];
      // Find duplicate indexes
      const duplicateIndexes = params.includeDuplicates
        ? await this.findDuplicateIndexes(params.database)
        : [];
      // Find missing indexes
      const missingIndexes = params.includeMissing
        ? await this.findMissingIndexes(connection, params.tables || [])
        : [];
      // Generate recommendations
      const recommendations = this.generateRecommendations(
        existingIndexes,
        unusedIndexes,
        duplicateIndexes,
        missingIndexes
      );
      // Calculate total size
      const totalIndexSize = existingIndexes.reduce((sum, idx) => sum + idx.size, 0);
      // Calculate potential savings
      const potentialSavings = unusedIndexes.reduce((sum, idx) => sum + idx.size, 0) +
        duplicateIndexes.reduce((sum, dup) => 
          sum + dup.indexes.slice(1).reduce((s, idx) => s + idx.size, 0), 0);
      return {
        database: params.database,
        existingIndexes,
        unusedIndexes,
        duplicateIndexes,
        missingIndexes,
        recommendations,
        totalIndexSize,
        potentialSavings
      };
    } catch (error) {
      this.logger.error('Index analysis failed:', error);
      throw error;
    }
  }
  /**
   * Encontrar índices no utilizados
   */
  async findUnusedIndexes(database: string, days: number): Promise<IndexInfo[]> {
    const connection = this.getConnection(database);
    try {
      const unusedIndexes = await connection.query<any>(`
        SELECT 
          s.schemaname,
          s.tablename,
          s.indexname,
          s.idx_scan as scans,
          pg_relation_size(s.indexrelid) as size,
          i.indisunique as is_unique,
          i.indisprimary as is_primary,
          array_agg(a.attname ORDER BY a.attnum) as columns
        FROM pg_stat_user_indexes s
        JOIN pg_index i ON s.indexrelid = i.indexrelid
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE s.idx_scan = 0
          AND s.indexrelid != 0
          AND NOT i.indisprimary
          AND s.schemaname NOT IN ('pg_catalog', 'information_schema')
        GROUP BY s.schemaname, s.tablename, s.indexname, s.idx_scan, 
                 s.indexrelid, i.indisunique, i.indisprimary
        ORDER BY pg_relation_size(s.indexrelid) DESC
      `, []);
      return unusedIndexes.rows.map(idx => ({
        tableName: idx.tablename,
        indexName: idx.indexname,
        columns: idx.columns,
        type: 'btree', // Default, would need more logic for other types
        size: idx.size,
        scans: idx.scans,
        efficiency: 0,
        isUnique: idx.is_unique,
        isPrimary: idx.is_primary
      }));
    } catch (error) {
      this.logger.error('Failed to find unused indexes:', error);
      return [];
    }
  }
  /**
   * Encontrar índices duplicados
   */
  async findDuplicateIndexes(database: string): Promise<IndexDuplicate[]> {
    const connection = this.getConnection(database);
    try {
      const duplicates = await connection.query<any>(`
        WITH index_info AS (
          SELECT
            n.nspname AS schema_name,
            t.relname AS table_name,
            i.relname AS index_name,
            array_agg(a.attname ORDER BY a.attnum) AS columns,
            pg_relation_size(i.oid) AS size,
            idx.indisunique AS is_unique,
            idx.indisprimary AS is_primary
          FROM pg_index idx
          JOIN pg_class i ON i.oid = idx.indexrelid
          JOIN pg_class t ON t.oid = idx.indrelid
          JOIN pg_namespace n ON n.oid = t.relnamespace
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(idx.indkey)
          WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
          GROUP BY n.nspname, t.relname, i.relname, i.oid, idx.indisunique, idx.indisprimary
        )
        SELECT 
          table_name,
          array_agg(index_name) AS duplicate_indexes,
          columns,
          SUM(size) AS total_size
        FROM index_info
        GROUP BY table_name, columns::text
        HAVING COUNT(*) > 1
        ORDER BY total_size DESC
      `, []);
      const result: IndexDuplicate[] = [];
      for (const dup of duplicates.rows) {
        const indexes: IndexInfo[] = dup.duplicate_indexes.map((name: string) => ({
          tableName: dup.table_name,
          indexName: name,
          columns: dup.columns,
          type: 'btree',
          size: dup.total_size / dup.duplicate_indexes.length,
          scans: 0,
          efficiency: 0,
          isUnique: false,
          isPrimary: false
        }));
        result.push({
          table: dup.table_name,
          indexes,
          reason: 'Multiple indexes on same columns',
          recommendation: `Keep the most efficient index and drop the others`
        });
      }
      return result;
    } catch (error) {
      this.logger.error('Failed to find duplicate indexes:', error);
      return [];
    }
  }
  /**
   * Sugerir índices basado en queries
   */
  async suggestIndexes(table: string, queries: string[]): Promise<MissingIndex[]> {
    const suggestions: MissingIndex[] = [];
    const analyzedColumns = new Set<string>();
    for (const query of queries) {
      // Extract WHERE clause columns
      const whereColumns = this.extractWhereColumns(query, table);
      // Extract JOIN columns
      const joinColumns = this.extractJoinColumns(query, table);
      // Extract ORDER BY columns
      const orderByColumns = this.extractOrderByColumns(query, table);
      // Combine all columns
      const allColumns = [...whereColumns, ...joinColumns, ...orderByColumns];
      if (allColumns.length > 0 && !analyzedColumns.has(allColumns.join(','))) {
        analyzedColumns.add(allColumns.join(','));
        suggestions.push({
          table,
          columns: allColumns,
          reason: this.generateIndexReason(whereColumns, joinColumns, orderByColumns),
          estimatedImprovement: this.estimateImprovement(allColumns.length),
          createStatement: `CREATE INDEX idx_${table}_${allColumns.join('_')} ON ${table}(${allColumns.join(', ')});`
        });
      }
    }
    return suggestions;
  }
  /**
   * Calcular eficiencia de índices
   */
  async calculateIndexEfficiency(database: string): Promise<Map<string, number>> {
    const connection = this.getConnection(database);
    const efficiencyMap = new Map<string, number>();
    try {
      const indexStats = await connection.query<any>(`
        SELECT 
          indexrelname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch,
          CASE 
            WHEN idx_tup_fetch > 0 THEN 
              (idx_tup_read::float / idx_tup_fetch) * 100
            ELSE 0
          END as efficiency
        FROM pg_stat_user_indexes
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      `, []);
      for (const stat of indexStats.rows) {
        efficiencyMap.set(stat.indexrelname, stat.efficiency);
      }
      return efficiencyMap;
    } catch (error) {
      this.logger.error('Failed to calculate index efficiency:', error);
      return efficiencyMap;
    }
  }
  /**
   * Reconstruir un índice
   */
  async rebuildIndex(database: string, indexName: string): Promise<boolean> {
    const connection = this.getConnection(database);
    try {
      // Use REINDEX for PostgreSQL
      await connection.query(`REINDEX INDEX ${indexName}`, []);
      this.logger.info(`Index ${indexName} rebuilt successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to rebuild index ${indexName}:`, error);
      return false;
    }
  }
  /**
   * Obtener todos los índices
   */
  private async getAllIndexes(
    connection: IDatabaseConnection,
    tables?: string[]
  ): Promise<IndexInfo[]> {
    try {
      let query = `
        SELECT 
          t.relname as table_name,
          i.relname as index_name,
          array_agg(a.attname ORDER BY a.attnum) as columns,
          am.amname as index_type,
          pg_relation_size(i.oid) as size,
          COALESCE(s.idx_scan, 0) as scans,
          idx.indisunique as is_unique,
          idx.indisprimary as is_primary
        FROM pg_index idx
        JOIN pg_class i ON i.oid = idx.indexrelid
        JOIN pg_class t ON t.oid = idx.indrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(idx.indkey)
        JOIN pg_am am ON am.oid = i.relam
        LEFT JOIN pg_stat_user_indexes s ON s.indexrelid = i.oid
        WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
      `;
      if (tables && tables.length > 0) {
        query += ` AND t.relname IN (${tables.map(t => `'${t}'`).join(',')})`;
      }
      query += `
        GROUP BY t.relname, i.relname, am.amname, i.oid, s.idx_scan, 
                 idx.indisunique, idx.indisprimary
        ORDER BY t.relname, i.relname
      `;
      const indexes = await connection.query<any>(query, []);
      const efficiencyMap = await this.calculateIndexEfficiency('shared');
      return indexes.rows.map(idx => ({
        tableName: idx.table_name,
        indexName: idx.index_name,
        columns: idx.columns,
        type: idx.index_type,
        size: idx.size,
        scans: idx.scans,
        efficiency: efficiencyMap.get(idx.index_name) || 0,
        isUnique: idx.is_unique,
        isPrimary: idx.is_primary
      }));
    } catch (error) {
      this.logger.error('Failed to get all indexes:', error);
      return [];
    }
  }
  /**
   * Encontrar índices faltantes
   */
  private async findMissingIndexes(
    connection: IDatabaseConnection,
    tables: string[]
  ): Promise<MissingIndex[]> {
    const missingIndexes: MissingIndex[] = [];
    try {
      // Check for foreign keys without indexes
      const fkWithoutIndex = await connection.query<any>(`
        SELECT 
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND NOT EXISTS (
            SELECT 1
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            JOIN pg_class c ON c.oid = i.indrelid
            WHERE c.relname = tc.table_name AND a.attname = kcu.column_name
          )
      `, []);
      for (const fk of fkWithoutIndex.rows) {
        missingIndexes.push({
          table: fk.table_name,
          columns: [fk.column_name],
          reason: `Foreign key without index to ${fk.foreign_table_name}(${fk.foreign_column_name})`,
          estimatedImprovement: 50,
          createStatement: `CREATE INDEX idx_${fk.table_name}_${fk.column_name} ON ${fk.table_name}(${fk.column_name});`
        });
      }
      // Check for large tables without primary key
      const tablesWithoutPK = await connection.query<any>(`
        SELECT 
          t.relname as table_name,
          pg_relation_size(t.oid) as size,
          (SELECT COUNT(*) FROM t.relname) as row_count
        FROM pg_class t
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE t.relkind = 'r'
          AND n.nspname NOT IN ('pg_catalog', 'information_schema')
          AND NOT EXISTS (
            SELECT 1
            FROM pg_index i
            WHERE i.indrelid = t.oid AND i.indisprimary
          )
          AND pg_relation_size(t.oid) > 1000000
      `, []);
      for (const table of tablesWithoutPK.rows) {
        missingIndexes.push({
          table: table.table_name,
          columns: ['id'],
          reason: 'Large table without primary key',
          estimatedImprovement: 80,
          createStatement: `ALTER TABLE ${table.table_name} ADD PRIMARY KEY (id);`
        });
      }
      return missingIndexes;
    } catch (error) {
      this.logger.error('Failed to find missing indexes:', error);
      return [];
    }
  }
  /**
   * Generar recomendaciones
   */
  private generateRecommendations(
    existing: IndexInfo[],
    unused: IndexInfo[],
    duplicates: IndexDuplicate[],
    missing: MissingIndex[]
  ): IndexRecommendation[] {
    const recommendations: IndexRecommendation[] = [];
    // Recommend dropping unused indexes
    for (const idx of unused) {
      if (!idx.isPrimary && !idx.isUnique) {
        recommendations.push({
          action: 'drop',
          table: idx.tableName,
          indexName: idx.indexName,
          reason: 'Index has not been used in the last 30 days',
          sql: `DROP INDEX ${idx.indexName};`,
          priority: 'medium'
        });
      }
    }
    // Recommend removing duplicates
    for (const dup of duplicates) {
      const [keep, ...drop] = dup.indexes.sort((a, b) => b.scans - a.scans);
      for (const idx of drop) {
        recommendations.push({
          action: 'drop',
          table: idx.tableName,
          indexName: idx.indexName,
          reason: `Duplicate of ${keep.indexName}`,
          sql: `DROP INDEX ${idx.indexName};`,
          priority: 'high'
        });
      }
    }
    // Recommend creating missing indexes
    for (const idx of missing) {
      recommendations.push({
        action: 'create',
        table: idx.table,
        columns: idx.columns,
        reason: idx.reason,
        sql: idx.createStatement,
        priority: idx.estimatedImprovement > 60 ? 'high' : 'medium'
      });
    }
    // Recommend rebuilding fragmented indexes
    const fragmented = existing.filter(idx => idx.efficiency < 50 && idx.scans > 1000);
    for (const idx of fragmented) {
      recommendations.push({
        action: 'rebuild',
        table: idx.tableName,
        indexName: idx.indexName,
        reason: `Index efficiency is ${idx.efficiency.toFixed(1)}%`,
        sql: `REINDEX INDEX ${idx.indexName};`,
        priority: 'low'
      });
    }
    return recommendations;
  }
  /**
   * Extract columns from WHERE clause
   */
  private extractWhereColumns(query: string, table: string): string[] {
    const columns: string[] = [];
    const whereRegex = new RegExp(`WHERE.*?${table}\\.(\\w+)`, 'gi');
    let match;
    while ((match = whereRegex.exec(query)) !== null) {
      columns.push(match[1]);
    }
    return [...new Set(columns)];
  }
  /**
   * Extract columns from JOIN clause
   */
  private extractJoinColumns(query: string, table: string): string[] {
    const columns: string[] = [];
    const joinRegex = new RegExp(`JOIN.*?ON.*?${table}\\.(\\w+)`, 'gi');
    let match;
    while ((match = joinRegex.exec(query)) !== null) {
      columns.push(match[1]);
    }
    return [...new Set(columns)];
  }
  /**
   * Extract columns from ORDER BY clause
   */
  private extractOrderByColumns(query: string, table: string): string[] {
    const columns: string[] = [];
    const orderByRegex = new RegExp(`ORDER BY.*?${table}\\.(\\w+)`, 'gi');
    let match;
    while ((match = orderByRegex.exec(query)) !== null) {
      columns.push(match[1]);
    }
    return [...new Set(columns)];
  }
  /**
   * Generate reason for index
   */
  private generateIndexReason(
    whereColumns: string[],
    joinColumns: string[],
    orderByColumns: string[]
  ): string {
    const reasons: string[] = [];
    if (whereColumns.length > 0) {
      reasons.push(`WHERE clause on ${whereColumns.join(', ')}`);
    }
    if (joinColumns.length > 0) {
      reasons.push(`JOIN on ${joinColumns.join(', ')}`);
    }
    if (orderByColumns.length > 0) {
      reasons.push(`ORDER BY ${orderByColumns.join(', ')}`);
    }
    return reasons.join('; ');
  }
  /**
   * Estimate improvement percentage
   */
  private estimateImprovement(columnCount: number): number {
    // Simple heuristic: more columns = potentially higher improvement
    return Math.min(90, 30 + (columnCount * 20));
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
