/**
 * DataLoader - Sprint 13
 * Loads transformed data into target tables for ETL pipelines
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';

interface LoadResult {
  recordsLoaded: number;
  recordsFailed: number;
  metadata: {
    targetTable: string;
    loadStrategy: LoadStrategy;
    executionTimeMs: number;
    errors: LoadError[];
  };
}

interface LoadError {
  recordIndex: number;
  record: any;
  error: string;
}

type LoadStrategy = 'insert' | 'upsert' | 'replace' | 'append' | 'truncate-insert';

interface LoadConfig {
  strategy?: LoadStrategy;
  batchSize?: number;
  conflictColumns?: string[];
  updateColumns?: string[];
  validateBeforeLoad?: boolean;
  continueOnError?: boolean;
}

@injectable()
export class DataLoader {
  private readonly DEFAULT_BATCH_SIZE = 1000;

  constructor(
    @inject(TYPES.DatabaseConnection) private db: Pool,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Load data into target table
   */
  async load(
    data: any[],
    targetTable: string,
    companyId: number | undefined,
    signal: AbortSignal,
    config: LoadConfig = {}
  ): Promise<LoadResult> {
    const startTime = Date.now();
    const strategy = config.strategy || 'insert';
    const batchSize = config.batchSize || this.DEFAULT_BATCH_SIZE;
    const errors: LoadError[] = [];

    try {
      this.logger.info('Starting data load', {
        targetTable,
        recordCount: data.length,
        strategy,
        batchSize
      });

      if (data.length === 0) {
        return {
          recordsLoaded: 0,
          recordsFailed: 0,
          metadata: {
            targetTable,
            loadStrategy: strategy,
            executionTimeMs: Date.now() - startTime,
            errors: []
          }
        };
      }

      // Validate data before loading if requested
      if (config.validateBeforeLoad) {
        const validation = this.validateData(data, targetTable);
        if (!validation.valid) {
          throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
        }
      }

      let recordsLoaded = 0;

      // Execute loading strategy
      switch (strategy) {
        case 'insert':
          recordsLoaded = await this.loadInsert(data, targetTable, companyId, batchSize, signal, config, errors);
          break;

        case 'upsert':
          recordsLoaded = await this.loadUpsert(
            data,
            targetTable,
            companyId,
            config.conflictColumns || ['id'],
            config.updateColumns,
            batchSize,
            signal,
            config,
            errors
          );
          break;

        case 'replace':
          recordsLoaded = await this.loadReplace(data, targetTable, companyId, signal);
          break;

        case 'truncate-insert':
          recordsLoaded = await this.loadTruncateInsert(data, targetTable, companyId, batchSize, signal, config, errors);
          break;

        case 'append':
        default:
          recordsLoaded = await this.loadInsert(data, targetTable, companyId, batchSize, signal, config, errors);
          break;
      }

      const executionTimeMs = Date.now() - startTime;

      this.logger.info('Data load completed', {
        targetTable,
        recordsLoaded,
        recordsFailed: errors.length,
        executionTimeMs
      });

      return {
        recordsLoaded,
        recordsFailed: errors.length,
        metadata: {
          targetTable,
          loadStrategy: strategy,
          executionTimeMs,
          errors: errors.slice(0, 100) // Limit error log
        }
      };
    } catch (error) {
      this.logger.error('Data load failed', { error, targetTable });
      throw new Error(`Data load failed: ${error.message}`);
    }
  }

  /**
   * Load using INSERT strategy
   */
  private async loadInsert(
    data: any[],
    targetTable: string,
    companyId: number | undefined,
    batchSize: number,
    signal: AbortSignal,
    config: LoadConfig,
    errors: LoadError[]
  ): Promise<number> {
    let recordsLoaded = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      if (signal.aborted) {
        throw new Error('Load operation cancelled');
      }

      const batch = data.slice(i, i + batchSize);

      try {
        const inserted = await this.insertBatch(batch, targetTable, companyId);
        recordsLoaded += inserted;
      } catch (error) {
        if (config.continueOnError) {
          // Try inserting records one by one
          for (let j = 0; j < batch.length; j++) {
            try {
              await this.insertBatch([batch[j]], targetTable, companyId);
              recordsLoaded++;
            } catch (recordError) {
              errors.push({
                recordIndex: i + j,
                record: batch[j],
                error: recordError.message
              });
            }
          }
        } else {
          throw error;
        }
      }
    }

    return recordsLoaded;
  }

  /**
   * Load using UPSERT strategy
   */
  private async loadUpsert(
    data: any[],
    targetTable: string,
    companyId: number | undefined,
    conflictColumns: string[],
    updateColumns: string[] | undefined,
    batchSize: number,
    signal: AbortSignal,
    config: LoadConfig,
    errors: LoadError[]
  ): Promise<number> {
    let recordsLoaded = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      if (signal.aborted) {
        throw new Error('Load operation cancelled');
      }

      const batch = data.slice(i, i + batchSize);

      try {
        const upserted = await this.upsertBatch(
          batch,
          targetTable,
          companyId,
          conflictColumns,
          updateColumns
        );
        recordsLoaded += upserted;
      } catch (error) {
        if (config.continueOnError) {
          for (let j = 0; j < batch.length; j++) {
            try {
              await this.upsertBatch([batch[j]], targetTable, companyId, conflictColumns, updateColumns);
              recordsLoaded++;
            } catch (recordError) {
              errors.push({
                recordIndex: i + j,
                record: batch[j],
                error: recordError.message
              });
            }
          }
        } else {
          throw error;
        }
      }
    }

    return recordsLoaded;
  }

  /**
   * Load using REPLACE strategy (delete all + insert)
   */
  private async loadReplace(
    data: any[],
    targetTable: string,
    companyId: number | undefined,
    signal: AbortSignal
  ): Promise<number> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Delete existing records
      if (companyId !== undefined) {
        await client.query(`DELETE FROM ${targetTable} WHERE company_id = $1`, [companyId]);
      } else {
        await client.query(`DELETE FROM ${targetTable}`);
      }

      if (signal.aborted) {
        await client.query('ROLLBACK');
        throw new Error('Load operation cancelled');
      }

      // Insert new records
      let recordsLoaded = 0;
      for (const record of data) {
        await this.insertRecord(client, record, targetTable, companyId);
        recordsLoaded++;
      }

      await client.query('COMMIT');

      return recordsLoaded;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Load using TRUNCATE-INSERT strategy
   */
  private async loadTruncateInsert(
    data: any[],
    targetTable: string,
    companyId: number | undefined,
    batchSize: number,
    signal: AbortSignal,
    config: LoadConfig,
    errors: LoadError[]
  ): Promise<number> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Truncate table
      if (companyId !== undefined) {
        await client.query(`DELETE FROM ${targetTable} WHERE company_id = $1`, [companyId]);
      } else {
        await client.query(`TRUNCATE TABLE ${targetTable}`);
      }

      await client.query('COMMIT');

      if (signal.aborted) {
        throw new Error('Load operation cancelled');
      }

      // Insert new records
      return await this.loadInsert(data, targetTable, companyId, batchSize, signal, config, errors);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Insert batch of records
   */
  private async insertBatch(
    batch: any[],
    targetTable: string,
    companyId: number | undefined
  ): Promise<number> {
    if (batch.length === 0) return 0;

    // Get columns from first record
    const record = batch[0];
    const columns = Object.keys(record);

    // Add company_id if provided
    if (companyId !== undefined && !columns.includes('company_id')) {
      columns.push('company_id');
    }

    // Build INSERT query
    const placeholders: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const item of batch) {
      const rowPlaceholders: string[] = [];

      for (const column of columns) {
        rowPlaceholders.push(`$${paramIndex}`);
        values.push(column === 'company_id' && companyId !== undefined ? companyId : item[column]);
        paramIndex++;
      }

      placeholders.push(`(${rowPlaceholders.join(', ')})`);
    }

    const query = `
      INSERT INTO ${targetTable} (${columns.join(', ')})
      VALUES ${placeholders.join(', ')}
    `;

    await this.db.query(query, values);

    return batch.length;
  }

  /**
   * Upsert batch of records
   */
  private async upsertBatch(
    batch: any[],
    targetTable: string,
    companyId: number | undefined,
    conflictColumns: string[],
    updateColumns?: string[]
  ): Promise<number> {
    if (batch.length === 0) return 0;

    // Get columns from first record
    const record = batch[0];
    const columns = Object.keys(record);

    // Add company_id if provided
    if (companyId !== undefined && !columns.includes('company_id')) {
      columns.push('company_id');
    }

    // Build INSERT query with ON CONFLICT
    const placeholders: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const item of batch) {
      const rowPlaceholders: string[] = [];

      for (const column of columns) {
        rowPlaceholders.push(`$${paramIndex}`);
        values.push(column === 'company_id' && companyId !== undefined ? companyId : item[column]);
        paramIndex++;
      }

      placeholders.push(`(${rowPlaceholders.join(', ')})`);
    }

    // Determine which columns to update on conflict
    const columnsToUpdate = updateColumns || columns.filter(col => !conflictColumns.includes(col));

    const updateClause = columnsToUpdate
      .map(col => `${col} = EXCLUDED.${col}`)
      .join(', ');

    const query = `
      INSERT INTO ${targetTable} (${columns.join(', ')})
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (${conflictColumns.join(', ')})
      DO UPDATE SET ${updateClause}
    `;

    await this.db.query(query, values);

    return batch.length;
  }

  /**
   * Insert single record using client
   */
  private async insertRecord(
    client: PoolClient,
    record: any,
    targetTable: string,
    companyId: number | undefined
  ): Promise<void> {
    const columns = Object.keys(record);

    if (companyId !== undefined && !columns.includes('company_id')) {
      columns.push('company_id');
    }

    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const values = columns.map(col =>
      col === 'company_id' && companyId !== undefined ? companyId : record[col]
    );

    const query = `
      INSERT INTO ${targetTable} (${columns.join(', ')})
      VALUES (${placeholders})
    `;

    await client.query(query, values);
  }

  /**
   * Validate data before loading
   */
  private validateData(data: any[], targetTable: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.length === 0) {
      errors.push('No data to load');
      return { valid: false, errors };
    }

    // Check if all records have the same structure
    const firstRecordKeys = Object.keys(data[0]).sort();

    for (let i = 1; i < data.length; i++) {
      const recordKeys = Object.keys(data[i]).sort();

      if (JSON.stringify(recordKeys) !== JSON.stringify(firstRecordKeys)) {
        errors.push(`Record ${i} has different structure than first record`);
      }
    }

    // Check for required fields (basic validation)
    // In production, this would validate against table schema
    const requiredFields = ['id', 'created_at', 'updated_at'];

    for (let i = 0; i < Math.min(data.length, 10); i++) {
      for (const field of requiredFields) {
        if (!(field in data[i]) && field !== 'id') {
          // id might be auto-generated
          errors.push(`Record ${i} missing required field: ${field}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Bulk delete records
   */
  async bulkDelete(
    targetTable: string,
    whereClause: string,
    params: any[]
  ): Promise<number> {
    try {
      const query = `DELETE FROM ${targetTable} WHERE ${whereClause}`;

      const result = await this.db.query(query, params);

      this.logger.info('Bulk delete completed', {
        targetTable,
        deletedCount: result.rowCount
      });

      return result.rowCount || 0;
    } catch (error) {
      this.logger.error('Bulk delete failed', { error, targetTable });
      throw error;
    }
  }

  /**
   * Bulk update records
   */
  async bulkUpdate(
    targetTable: string,
    updates: Record<string, any>,
    whereClause: string,
    params: any[]
  ): Promise<number> {
    try {
      const setClause = Object.keys(updates)
        .map((key, index) => `${key} = $${params.length + index + 1}`)
        .join(', ');

      const allParams = [...params, ...Object.values(updates)];

      const query = `
        UPDATE ${targetTable}
        SET ${setClause}
        WHERE ${whereClause}
      `;

      const result = await this.db.query(query, allParams);

      this.logger.info('Bulk update completed', {
        targetTable,
        updatedCount: result.rowCount
      });

      return result.rowCount || 0;
    } catch (error) {
      this.logger.error('Bulk update failed', { error, targetTable });
      throw error;
    }
  }

  /**
   * Get load statistics
   */
  async getLoadStatistics(targetTable: string, companyId?: number): Promise<{
    totalRecords: number;
    lastLoadedAt?: Date;
    tableSize: string;
  }> {
    try {
      // Count records
      const countQuery = companyId !== undefined
        ? `SELECT COUNT(*) as count FROM ${targetTable} WHERE company_id = $1`
        : `SELECT COUNT(*) as count FROM ${targetTable}`;

      const countParams = companyId !== undefined ? [companyId] : [];
      const countResult = await this.db.query(countQuery, countParams);

      // Get table size
      const sizeQuery = `
        SELECT pg_size_pretty(pg_total_relation_size($1)) as size
      `;
      const sizeResult = await this.db.query(sizeQuery, [targetTable]);

      return {
        totalRecords: parseInt(countResult.rows[0].count, 10),
        tableSize: sizeResult.rows[0]?.size || 'Unknown'
      };
    } catch (error) {
      this.logger.error('Error getting load statistics', { error, targetTable });
      return {
        totalRecords: 0,
        tableSize: 'Unknown'
      };
    }
  }
}

interface Pool {
  query(sql: string, params?: any[]): Promise<{ rows: any[]; rowCount?: number }>;
  connect(): Promise<PoolClient>;
}

interface PoolClient {
  query(sql: string, params?: any[]): Promise<{ rows: any[]; rowCount?: number }>;
  release(): void;
}

interface Logger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}
