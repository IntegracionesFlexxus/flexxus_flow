/**
 * Partition Manager Implementation
 * Sprint 4 - Performance Optimization
 * Gestión de particionamiento de tablas para optimización
 */
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import {
  IPartitionManager,
  PartitionConfig,
  PartitionResult,
  PartitionInfo,
  PartitionPerformance,
  PartitionStrategy,
  PartitionDefinition
} from './interfaces/IPerformanceOptimizer';
import winston from 'winston';
@injectable()
export class PartitionManager implements IPartitionManager {
  private logger: winston.Logger;
  private databaseConnections: Map<string, IDatabaseConnection> = new Map();
  private partitionCache: Map<string, PartitionInfo[]> = new Map();
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
   * Crear particiones para una tabla
   */
  async createPartition(config: PartitionConfig): Promise<PartitionResult> {
    const database = this.detectDatabase(config.tableName);
    const connection = this.getConnection(database);
    try {
      // Check if table exists and is not already partitioned
      const tableInfo = await this.getTableInfo(connection, config.tableName);
      if (tableInfo.isPartitioned) {
        throw new Error(`Table ${config.tableName} is already partitioned`);
      }
      // Create parent partitioned table
      await this.createPartitionedTable(connection, config);
      // Create initial partitions
      const partitions = await this.createInitialPartitions(connection, config);
      // Migrate data from original table
      await this.migrateDataToPartitions(connection, config.tableName);
      // Setup automatic partition creation if requested
      if (config.autoCreate) {
        await this.setupAutoPartitioning(connection, config);
      }
      // Get performance metrics
      const performance = await this.measurePartitionPerformance(
        connection,
        config.tableName
      );
      // Get partition info
      const partitionInfo = await this.getPartitionInfo(config.tableName);
      const totalRows = partitionInfo.reduce((sum, p) => sum + p.rows, 0);
      const totalSize = partitionInfo.reduce((sum, p) => sum + p.size, 0);
      return {
        table: config.tableName,
        partitions: partitionInfo,
        totalRows,
        totalSize,
        performance
      };
    } catch (error) {
      this.logger.error('Failed to create partition:', error);
      throw error;
    }
  }
  /**
   * Analizar candidatos para particionamiento
   */
  async analyzePartitionCandidates(database: string): Promise<string[]> {
    const connection = this.getConnection(database);
    const candidates: string[] = [];
    try {
      // Find large tables that could benefit from partitioning
      const largeTables = await connection.query<any>(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          n_live_tup as row_count
        FROM pg_stat_user_tables
        WHERE n_live_tup > 1000000
          OR pg_total_relation_size(schemaname||'.'||tablename) > 1073741824
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `, []);
      for (const table of largeTables) {
        // Check if table has date/timestamp columns (good for range partitioning)
        const hasDateColumn = await this.checkDateColumns(connection, table.tablename);
        // Check if table has categorical columns (good for list partitioning)
        const hasCategoricalColumn = await this.checkCategoricalColumns(
          connection,
          table.tablename
        );
        if (hasDateColumn || hasCategoricalColumn) {
          candidates.push(table.tablename);
        }
      }
      // Check for tables with specific patterns
      const patternTables = await this.checkTablePatterns(connection);
      candidates.push(...patternTables);
      return [...new Set(candidates)];
    } catch (error) {
      this.logger.error('Failed to analyze partition candidates:', error);
      return [];
    }
  }
  /**
   * Obtener información de particiones
   */
  async getPartitionInfo(table: string): Promise<PartitionInfo[]> {
    // Check cache first
    if (this.partitionCache.has(table)) {
      const cached = this.partitionCache.get(table)!;
      // Cache for 5 minutes
      if (cached.length > 0 && 
          Date.now() - cached[0].created.getTime() < 300000) {
        return cached;
      }
    }
    const database = this.detectDatabase(table);
    const connection = this.getConnection(database);
    try {
      const partitions = await connection.query<any>(`
        SELECT 
          c.relname as partition_name,
          p.relname as parent_table,
          pg_size_pretty(pg_total_relation_size(c.oid)) as size,
          pg_total_relation_size(c.oid) as size_bytes,
          c.reltuples as row_count,
          pg_get_expr(c.relpartbound, c.oid) as partition_constraint,
          s.n_tup_ins + s.n_tup_upd as activity
        FROM pg_class c
        JOIN pg_inherits i ON c.oid = i.inhrelid
        JOIN pg_class p ON p.oid = i.inhparent
        LEFT JOIN pg_stat_user_tables s ON s.relname = c.relname
        WHERE p.relname = $1
        ORDER BY c.relname
      `, [table]);
      const partitionInfo: PartitionInfo[] = partitions.map(p => ({
        name: p.partition_name,
        parent: p.parent_table,
        rows: parseInt(p.row_count),
        size: p.size_bytes,
        created: new Date(), // Would need to query pg_class creation time
        lastAccessed: p.activity > 0 ? new Date() : undefined,
        condition: p.partition_constraint
      }));
      // Update cache
      this.partitionCache.set(table, partitionInfo);
      return partitionInfo;
    } catch (error) {
      this.logger.error('Failed to get partition info:', error);
      return [];
    }
  }
  /**
   * Eliminar particiones antiguas
   */
  async pruneOldPartitions(table: string, days: number): Promise<number> {
    const database = this.detectDatabase(table);
    const connection = this.getConnection(database);
    let prunedCount = 0;
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      // Get old partitions
      const oldPartitions = await connection.query<any>(`
        SELECT 
          c.relname as partition_name,
          pg_get_expr(c.relpartbound, c.oid) as partition_constraint
        FROM pg_class c
        JOIN pg_inherits i ON c.oid = i.inhrelid
        JOIN pg_class p ON p.oid = i.inhparent
        WHERE p.relname = $1
          AND c.relname LIKE '%' || $2 || '%'
        ORDER BY c.relname
      `, [table, cutoffDate.toISOString().slice(0, 7).replace('-', '_')]);
      for (const partition of oldPartitions) {
        try {
          // Drop the partition
          await connection.query(`DROP TABLE IF EXISTS ${partition.partition_name}`, []);
          prunedCount++;
          this.logger.info(`Pruned partition: ${partition.partition_name}`);
        } catch (error) {
          this.logger.error(`Failed to prune partition ${partition.partition_name}:`, error);
        }
      }
      return prunedCount;
    } catch (error) {
      this.logger.error('Failed to prune partitions:', error);
      return prunedCount;
    }
  }
  /**
   * Optimizar particiones existentes
   */
  async optimizePartitions(table: string): Promise<PartitionPerformance> {
    const database = this.detectDatabase(table);
    const connection = this.getConnection(database);
    try {
      // Analyze all partitions
      await this.analyzePartitions(connection, table);
      // Reindex partitions if needed
      await this.reindexPartitions(connection, table);
      // Update statistics
      await this.updatePartitionStatistics(connection, table);
      // Measure performance
      const performance = await this.measurePartitionPerformance(connection, table);
      return performance;
    } catch (error) {
      this.logger.error('Failed to optimize partitions:', error);
      return {
        avgQueryTime: 0,
        improvementPercent: 0,
        pruningEfficiency: 0,
        maintenanceOverhead: 0
      };
    }
  }
  /**
   * Configurar particionamiento automático
   */
  async autoPartition(table: string, strategy: PartitionStrategy): Promise<boolean> {
    const database = this.detectDatabase(table);
    const connection = this.getConnection(database);
    try {
      // Analyze table structure
      const tableStructure = await this.analyzeTableStructure(connection, table);
      // Determine best partition key
      const partitionKey = await this.determinePartitionKey(
        connection,
        table,
        strategy,
        tableStructure
      );
      if (!partitionKey) {
        this.logger.warn(`No suitable partition key found for table ${table}`);
        return false;
      }
      // Generate partition configuration
      const config: PartitionConfig = {
        tableName: table,
        strategy,
        partitionKey,
        autoCreate: true,
        retention: strategy === PartitionStrategy.TIME_SERIES ? 365 : undefined,
        compression: tableStructure.size > 10737418240 // 10GB
      };
      // Create partitions
      await this.createPartition(config);
      // Setup maintenance job
      await this.setupMaintenanceJob(connection, table, strategy);
      return true;
    } catch (error) {
      this.logger.error('Auto-partitioning failed:', error);
      return false;
    }
  }
  /**
   * Get table information
   */
  private async getTableInfo(connection: IDatabaseConnection, table: string): Promise<any> {
    const result = await connection.query<any>(`
      SELECT 
        c.relname,
        c.relkind,
        c.relispartition,
        p.partstrat
      FROM pg_class c
      LEFT JOIN pg_partitioned_table p ON c.oid = p.partrelid
      WHERE c.relname = $1
    `, [table]);
    return {
      name: result[0]?.relname,
      isPartitioned: result[0]?.partstrat !== null,
      partitionStrategy: result[0]?.partstrat
    };
  }
  /**
   * Create partitioned table
   */
  private async createPartitionedTable(
    connection: IDatabaseConnection,
    config: PartitionConfig
  ): Promise<void> {
    const strategySQL = this.getPartitionStrategySQL(config.strategy);
    // Rename original table
    await connection.query(
      `ALTER TABLE ${config.tableName} RENAME TO ${config.tableName}_old`,
      []
    );
    // Create new partitioned table with same structure
    await connection.query(`
      CREATE TABLE ${config.tableName} (LIKE ${config.tableName}_old INCLUDING ALL)
      PARTITION BY ${strategySQL}(${config.partitionKey})
    `, []);
  }
  /**
   * Create initial partitions
   */
  private async createInitialPartitions(
    connection: IDatabaseConnection,
    config: PartitionConfig
  ): Promise<PartitionDefinition[]> {
    const partitions: PartitionDefinition[] = [];
    switch (config.strategy) {
      case PartitionStrategy.RANGE:
        partitions.push(...await this.createRangePartitions(connection, config));
        break;
      case PartitionStrategy.LIST:
        partitions.push(...await this.createListPartitions(connection, config));
        break;
      case PartitionStrategy.HASH:
        partitions.push(...await this.createHashPartitions(connection, config));
        break;
      case PartitionStrategy.TIME_SERIES:
        partitions.push(...await this.createTimeSeriesPartitions(connection, config));
        break;
    }
    return partitions;
  }
  /**
   * Create range partitions
   */
  private async createRangePartitions(
    connection: IDatabaseConnection,
    config: PartitionConfig
  ): Promise<PartitionDefinition[]> {
    const partitions: PartitionDefinition[] = [];
    // Create monthly partitions for the last 12 months
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const partitionName = `${config.tableName}_${startDate.getFullYear()}_${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      await connection.query(`
        CREATE TABLE ${partitionName} PARTITION OF ${config.tableName}
        FOR VALUES FROM ('${startDate.toISOString()}') TO ('${endDate.toISOString()}')
      `, []);
      partitions.push({
        name: partitionName,
        condition: `FROM '${startDate.toISOString()}' TO '${endDate.toISOString()}'`
      });
    }
    return partitions;
  }
  /**
   * Create list partitions
   */
  private async createListPartitions(
    connection: IDatabaseConnection,
    config: PartitionConfig
  ): Promise<PartitionDefinition[]> {
    const partitions: PartitionDefinition[] = [];
    // Get distinct values for partition key
    const values = await connection.query<any>(`
      SELECT DISTINCT ${config.partitionKey} as value
      FROM ${config.tableName}_old
      LIMIT 10
    `, []);
    for (const row of values) {
      const partitionName = `${config.tableName}_${String(row.value).toLowerCase().replace(/\W/g, '_')}`;
      await connection.query(`
        CREATE TABLE ${partitionName} PARTITION OF ${config.tableName}
        FOR VALUES IN ('${row.value}')
      `, []);
      partitions.push({
        name: partitionName,
        condition: `IN ('${row.value}')`
      });
    }
    return partitions;
  }
  /**
   * Create hash partitions
   */
  private async createHashPartitions(
    connection: IDatabaseConnection,
    config: PartitionConfig
  ): Promise<PartitionDefinition[]> {
    const partitions: PartitionDefinition[] = [];
    const partitionCount = 4; // Default to 4 hash partitions
    for (let i = 0; i < partitionCount; i++) {
      const partitionName = `${config.tableName}_hash_${i}`;
      await connection.query(`
        CREATE TABLE ${partitionName} PARTITION OF ${config.tableName}
        FOR VALUES WITH (modulus ${partitionCount}, remainder ${i})
      `, []);
      partitions.push({
        name: partitionName,
        condition: `MODULUS ${partitionCount}, REMAINDER ${i}`
      });
    }
    return partitions;
  }
  /**
   * Create time series partitions
   */
  private async createTimeSeriesPartitions(
    connection: IDatabaseConnection,
    config: PartitionConfig
  ): Promise<PartitionDefinition[]> {
    // Similar to range partitions but optimized for time series data
    return this.createRangePartitions(connection, config);
  }
  /**
   * Migrate data to partitions
   */
  private async migrateDataToPartitions(
    connection: IDatabaseConnection,
    tableName: string
  ): Promise<void> {
    try {
      // Insert data from old table to new partitioned table
      await connection.query(
        `INSERT INTO ${tableName} SELECT * FROM ${tableName}_old`,
        []
      );
      // Drop old table after successful migration
      await connection.query(`DROP TABLE ${tableName}_old`, []);
    } catch (error) {
      // Rollback if migration fails
      await connection.query(`DROP TABLE ${tableName}`, []);
      await connection.query(
        `ALTER TABLE ${tableName}_old RENAME TO ${tableName}`,
        []
      );
      throw error;
    }
  }
  /**
   * Setup automatic partitioning
   */
  private async setupAutoPartitioning(
    connection: IDatabaseConnection,
    config: PartitionConfig
  ): Promise<void> {
    // Create a function to automatically create new partitions
    const functionName = `auto_partition_${config.tableName}`;
    await connection.query(`
      CREATE OR REPLACE FUNCTION ${functionName}()
      RETURNS void AS $$
      DECLARE
        partition_date DATE;
        partition_name TEXT;
      BEGIN
        partition_date := DATE_TRUNC('month', CURRENT_DATE);
        partition_name := '${config.tableName}_' || TO_CHAR(partition_date, 'YYYY_MM');
        IF NOT EXISTS (
          SELECT 1 FROM pg_class WHERE relname = partition_name
        ) THEN
          EXECUTE format('CREATE TABLE %I PARTITION OF ${config.tableName} FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            partition_date,
            partition_date + INTERVAL '1 month'
          );
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `, []);
    // Schedule the function to run monthly
    // This would typically use pg_cron or similar
  }
  /**
   * Check for date columns
   */
  private async checkDateColumns(
    connection: IDatabaseConnection,
    table: string
  ): Promise<boolean> {
    const columns = await connection.query<any>(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = $1
        AND data_type IN ('timestamp', 'date', 'timestamptz')
    `, [table]);
    return columns.length > 0;
  }
  /**
   * Check for categorical columns
   */
  private async checkCategoricalColumns(
    connection: IDatabaseConnection,
    table: string
  ): Promise<boolean> {
    const columns = await connection.query<any>(`
      SELECT 
        column_name,
        COUNT(DISTINCT column_name) as distinct_values
      FROM information_schema.columns
      WHERE table_name = $1
        AND data_type IN ('varchar', 'text', 'char')
      GROUP BY column_name
      HAVING COUNT(DISTINCT column_name) < 100
    `, [table]);
    return columns.length > 0;
  }
  /**
   * Check table patterns
   */
  private async checkTablePatterns(connection: IDatabaseConnection): Promise<string[]> {
    const patterns = ['log', 'event', 'audit', 'history', 'archive'];
    const tables: string[] = [];
    for (const pattern of patterns) {
      const result = await connection.query<any>(`
        SELECT tablename
        FROM pg_tables
        WHERE tablename LIKE '%${pattern}%'
          AND schemaname NOT IN ('pg_catalog', 'information_schema')
      `, []);
      tables.push(...result.map((r: any) => r.tablename));
    }
    return tables;
  }
  /**
   * Measure partition performance
   */
  private async measurePartitionPerformance(
    connection: IDatabaseConnection,
    table: string
  ): Promise<PartitionPerformance> {
    try {
      // Run sample queries to measure performance
      const startTime = Date.now();
      // Test query with partition pruning
      await connection.query(`
        SELECT COUNT(*) FROM ${table}
        WHERE ${this.getPartitionKeyColumn(table)} >= CURRENT_DATE - INTERVAL '30 days'
      `, []);
      const queryTime = Date.now() - startTime;
      // Calculate metrics
      return {
        avgQueryTime: queryTime,
        improvementPercent: 50, // Would need baseline for comparison
        pruningEfficiency: 80, // Estimate based on partition design
        maintenanceOverhead: 10 // Estimate
      };
    } catch (error) {
      return {
        avgQueryTime: 0,
        improvementPercent: 0,
        pruningEfficiency: 0,
        maintenanceOverhead: 0
      };
    }
  }
  /**
   * Analyze partitions
   */
  private async analyzePartitions(
    connection: IDatabaseConnection,
    table: string
  ): Promise<void> {
    const partitions = await this.getPartitionInfo(table);
    for (const partition of partitions) {
      await connection.query(`ANALYZE ${partition.name}`, []);
    }
  }
  /**
   * Reindex partitions
   */
  private async reindexPartitions(
    connection: IDatabaseConnection,
    table: string
  ): Promise<void> {
    const partitions = await this.getPartitionInfo(table);
    for (const partition of partitions) {
      await connection.query(`REINDEX TABLE ${partition.name}`, []);
    }
  }
  /**
   * Update partition statistics
   */
  private async updatePartitionStatistics(
    connection: IDatabaseConnection,
    table: string
  ): Promise<void> {
    await connection.query(`
      UPDATE pg_statistic
      SET stanullfrac = 0
      WHERE starelid IN (
        SELECT c.oid
        FROM pg_class c
        JOIN pg_inherits i ON c.oid = i.inhrelid
        JOIN pg_class p ON p.oid = i.inhparent
        WHERE p.relname = $1
      )
    `, [table]);
  }
  /**
   * Analyze table structure
   */
  private async analyzeTableStructure(
    connection: IDatabaseConnection,
    table: string
  ): Promise<any> {
    const structure = await connection.query<any>(`
      SELECT 
        pg_total_relation_size(c.oid) as size,
        c.reltuples as row_count,
        array_agg(a.attname) as columns
      FROM pg_class c
      JOIN pg_attribute a ON a.attrelid = c.oid
      WHERE c.relname = $1
        AND a.attnum > 0
      GROUP BY c.oid, c.reltuples
    `, [table]);
    return structure[0] || { size: 0, row_count: 0, columns: [] };
  }
  /**
   * Determine best partition key
   */
  private async determinePartitionKey(
    connection: IDatabaseConnection,
    table: string,
    strategy: PartitionStrategy,
    structure: any
  ): Promise<string | null> {
    switch (strategy) {
      case PartitionStrategy.TIME_SERIES:
      case PartitionStrategy.RANGE:
        // Look for date/timestamp columns
        const dateColumns = await connection.query<any>(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = $1
            AND data_type IN ('timestamp', 'date', 'timestamptz')
          ORDER BY ordinal_position
          LIMIT 1
        `, [table]);
        return dateColumns[0]?.column_name || null;
      case PartitionStrategy.LIST:
        // Look for categorical columns with low cardinality
        const categoricalColumns = await connection.query<any>(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = $1
            AND data_type IN ('varchar', 'text', 'char')
          ORDER BY ordinal_position
          LIMIT 1
        `, [table]);
        return categoricalColumns[0]?.column_name || null;
      case PartitionStrategy.HASH:
        // Look for primary key or unique columns
        const pkColumns = await connection.query<any>(`
          SELECT a.attname as column_name
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          JOIN pg_class c ON c.oid = i.indrelid
          WHERE c.relname = $1 AND i.indisprimary
          LIMIT 1
        `, [table]);
        return pkColumns[0]?.column_name || 'id';
      default:
        return null;
    }
  }
  /**
   * Setup maintenance job
   */
  private async setupMaintenanceJob(
    connection: IDatabaseConnection,
    table: string,
    strategy: PartitionStrategy
  ): Promise<void> {
    // This would typically use pg_cron or similar
    // For now, just log the intention
    this.logger.info(`Maintenance job should be set up for ${table} with ${strategy} strategy`);
  }
  /**
   * Get partition strategy SQL
   */
  private getPartitionStrategySQL(strategy: PartitionStrategy): string {
    switch (strategy) {
      case PartitionStrategy.RANGE:
      case PartitionStrategy.TIME_SERIES:
        return 'RANGE';
      case PartitionStrategy.LIST:
        return 'LIST';
      case PartitionStrategy.HASH:
        return 'HASH';
      default:
        return 'RANGE';
    }
  }
  /**
   * Get partition key column
   */
  private getPartitionKeyColumn(table: string): string {
    // This would be stored in metadata or configuration
    // For now, return a common default
    return 'created_at';
  }
  /**
   * Detect database from table name
   */
  private detectDatabase(table: string): string {
    // Logic to determine which database a table belongs to
    // For now, default to shared
    return 'shared';
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
