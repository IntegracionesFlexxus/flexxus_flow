/**
 * DataExtractor - Sprint 13
 * Extracts data from source tables for ETL pipelines
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';

interface EtlPipeline {
  id: number;
  pipelineName: string;
  sourceTables: string[];
  companyId?: number;
  config?: {
    extractionConfig?: ExtractionConfig;
    filters?: Record<string, any>;
    dateRange?: { startDate: string; endDate: string };
  };
}

interface ExtractionConfig {
  columns?: string[];
  joins?: JoinConfig[];
  where?: WhereCondition[];
  orderBy?: string[];
  limit?: number;
  offset?: number;
  incremental?: boolean;
  incrementalColumn?: string;
  incrementalValue?: any;
}

interface JoinConfig {
  table: string;
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  on: string;
}

interface WhereCondition {
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'IN' | 'LIKE' | 'IS NULL' | 'IS NOT NULL';
  value?: any;
}

interface ExtractionResult {
  data: any[];
  recordCount: number;
  metadata: {
    sourceTables: string[];
    executionTimeMs: number;
    columnsExtracted: string[];
    filters: Record<string, any>;
    incremental: boolean;
  };
}

@injectable()
export class DataExtractor {
  constructor(
    @inject(TYPES.DatabaseConnection) private db: Pool,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Extract data from source tables
   */
  async extract(pipeline: EtlPipeline, signal: AbortSignal): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      this.logger.info('Starting data extraction', {
        pipelineId: pipeline.id,
        sourceTables: pipeline.sourceTables
      });

      const config = pipeline.config?.extractionConfig || {};
      const results: any[] = [];
      let totalRecords = 0;

      // Extract from each source table
      for (const table of pipeline.sourceTables) {
        if (signal.aborted) {
          throw new Error('Extraction cancelled');
        }

        const tableData = await this.extractFromTable(
          table,
          config,
          pipeline.companyId,
          pipeline.config?.filters,
          pipeline.config?.dateRange
        );

        results.push(...tableData);
        totalRecords += tableData.length;

        this.logger.debug('Extracted from table', {
          table,
          recordCount: tableData.length
        });
      }

      const executionTimeMs = Date.now() - startTime;

      this.logger.info('Data extraction completed', {
        pipelineId: pipeline.id,
        recordCount: totalRecords,
        executionTimeMs
      });

      return {
        data: results,
        recordCount: totalRecords,
        metadata: {
          sourceTables: pipeline.sourceTables,
          executionTimeMs,
          columnsExtracted: config.columns || ['*'],
          filters: pipeline.config?.filters || {},
          incremental: config.incremental || false
        }
      };
    } catch (error) {
      this.logger.error('Data extraction failed', {
        error,
        pipelineId: pipeline.id
      });
      throw new Error(`Data extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract data from a single table
   */
  private async extractFromTable(
    table: string,
    config: ExtractionConfig,
    companyId?: number,
    filters?: Record<string, any>,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<any[]> {
    try {
      // Build SELECT clause
      const columns = config.columns?.join(', ') || '*';

      // Build JOIN clauses
      let joinClause = '';
      if (config.joins && config.joins.length > 0) {
        joinClause = config.joins
          .map(join => `${join.type} JOIN ${join.table} ON ${join.on}`)
          .join(' ');
      }

      // Build WHERE clause
      const whereConditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Add multi-tenancy filter
      if (companyId !== undefined) {
        whereConditions.push(`${table}.company_id = $${paramIndex}`);
        params.push(companyId);
        paramIndex++;
      }

      // Add custom where conditions from config
      if (config.where && config.where.length > 0) {
        for (const condition of config.where) {
          const clause = this.buildWhereClause(condition, paramIndex, table);
          whereConditions.push(clause.condition);
          if (clause.value !== undefined) {
            params.push(clause.value);
            paramIndex++;
          }
        }
      }

      // Add filters from pipeline config
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (value !== null && value !== undefined) {
            whereConditions.push(`${table}.${key} = $${paramIndex}`);
            params.push(value);
            paramIndex++;
          }
        }
      }

      // Add date range filter
      if (dateRange) {
        whereConditions.push(`${table}.created_at >= $${paramIndex}`);
        params.push(dateRange.startDate);
        paramIndex++;

        whereConditions.push(`${table}.created_at <= $${paramIndex}`);
        params.push(dateRange.endDate);
        paramIndex++;
      }

      // Add incremental extraction filter
      if (config.incremental && config.incrementalColumn && config.incrementalValue) {
        whereConditions.push(`${table}.${config.incrementalColumn} > $${paramIndex}`);
        params.push(config.incrementalValue);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Build ORDER BY clause
      const orderByClause = config.orderBy && config.orderBy.length > 0
        ? `ORDER BY ${config.orderBy.join(', ')}`
        : '';

      // Build LIMIT and OFFSET clauses
      let limitClause = '';
      if (config.limit) {
        limitClause = `LIMIT ${config.limit}`;
        if (config.offset) {
          limitClause += ` OFFSET ${config.offset}`;
        }
      }

      // Build complete query
      const query = `
        SELECT ${columns}
        FROM ${table}
        ${joinClause}
        ${whereClause}
        ${orderByClause}
        ${limitClause}
      `.trim();

      this.logger.debug('Executing extraction query', {
        table,
        query: query.substring(0, 200) + '...',
        paramCount: params.length
      });

      // Execute query
      const result = await this.db.query(query, params);

      return result.rows;
    } catch (error) {
      this.logger.error('Error extracting from table', { error, table });
      throw error;
    }
  }

  /**
   * Build WHERE clause condition
   */
  private buildWhereClause(
    condition: WhereCondition,
    paramIndex: number,
    tablePrefix: string
  ): { condition: string; value?: any } {
    const column = `${tablePrefix}.${condition.column}`;

    switch (condition.operator) {
      case 'IS NULL':
        return { condition: `${column} IS NULL` };

      case 'IS NOT NULL':
        return { condition: `${column} IS NOT NULL` };

      case 'IN':
        if (Array.isArray(condition.value)) {
          const placeholders = condition.value
            .map((_, i) => `$${paramIndex + i}`)
            .join(', ');
          return {
            condition: `${column} IN (${placeholders})`,
            value: condition.value
          };
        }
        return { condition: `${column} IN ($${paramIndex})`, value: condition.value };

      case 'LIKE':
        return { condition: `${column} LIKE $${paramIndex}`, value: condition.value };

      default:
        return {
          condition: `${column} ${condition.operator} $${paramIndex}`,
          value: condition.value
        };
    }
  }

  /**
   * Extract with pagination
   */
  async extractWithPagination(
    pipeline: EtlPipeline,
    pageSize: number,
    signal: AbortSignal
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    const allData: any[] = [];
    let offset = 0;
    let hasMore = true;

    try {
      this.logger.info('Starting paginated extraction', {
        pipelineId: pipeline.id,
        pageSize
      });

      while (hasMore && !signal.aborted) {
        // Create config with pagination
        const paginatedConfig: ExtractionConfig = {
          ...pipeline.config?.extractionConfig,
          limit: pageSize,
          offset
        };

        const paginatedPipeline = {
          ...pipeline,
          config: {
            ...pipeline.config,
            extractionConfig: paginatedConfig
          }
        };

        // Extract page
        const pageResult = await this.extract(paginatedPipeline, signal);
        allData.push(...pageResult.data);

        // Check if there are more pages
        hasMore = pageResult.data.length === pageSize;
        offset += pageSize;

        this.logger.debug('Extracted page', {
          pageNumber: Math.floor(offset / pageSize),
          recordCount: pageResult.data.length,
          totalRecords: allData.length
        });
      }

      const executionTimeMs = Date.now() - startTime;

      return {
        data: allData,
        recordCount: allData.length,
        metadata: {
          sourceTables: pipeline.sourceTables,
          executionTimeMs,
          columnsExtracted: pipeline.config?.extractionConfig?.columns || ['*'],
          filters: pipeline.config?.filters || {},
          incremental: pipeline.config?.extractionConfig?.incremental || false
        }
      };
    } catch (error) {
      this.logger.error('Paginated extraction failed', { error });
      throw error;
    }
  }

  /**
   * Extract incremental data (only new/modified records)
   */
  async extractIncremental(
    pipeline: EtlPipeline,
    lastExtractedValue: any,
    incrementalColumn: string = 'updated_at',
    signal: AbortSignal
  ): Promise<ExtractionResult> {
    try {
      this.logger.info('Starting incremental extraction', {
        pipelineId: pipeline.id,
        incrementalColumn,
        lastExtractedValue
      });

      // Update config with incremental settings
      const incrementalPipeline = {
        ...pipeline,
        config: {
          ...pipeline.config,
          extractionConfig: {
            ...pipeline.config?.extractionConfig,
            incremental: true,
            incrementalColumn,
            incrementalValue: lastExtractedValue
          }
        }
      };

      const result = await this.extract(incrementalPipeline, signal);

      this.logger.info('Incremental extraction completed', {
        pipelineId: pipeline.id,
        newRecords: result.recordCount
      });

      return result;
    } catch (error) {
      this.logger.error('Incremental extraction failed', { error });
      throw error;
    }
  }

  /**
   * Extract with custom SQL query
   */
  async extractCustomQuery(
    query: string,
    params: any[],
    signal: AbortSignal
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      this.logger.info('Executing custom extraction query');

      if (signal.aborted) {
        throw new Error('Extraction cancelled');
      }

      const result = await this.db.query(query, params);

      const executionTimeMs = Date.now() - startTime;

      return {
        data: result.rows,
        recordCount: result.rows.length,
        metadata: {
          sourceTables: ['custom_query'],
          executionTimeMs,
          columnsExtracted: result.rows.length > 0 ? Object.keys(result.rows[0]) : [],
          filters: {},
          incremental: false
        }
      };
    } catch (error) {
      this.logger.error('Custom query extraction failed', { error });
      throw error;
    }
  }

  /**
   * Validate extraction config
   */
  validateConfig(config: ExtractionConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate joins
    if (config.joins) {
      for (const join of config.joins) {
        if (!join.table || !join.on) {
          errors.push(`Invalid join configuration: missing table or on clause`);
        }

        if (!['INNER', 'LEFT', 'RIGHT', 'FULL'].includes(join.type)) {
          errors.push(`Invalid join type: ${join.type}`);
        }
      }
    }

    // Validate where conditions
    if (config.where) {
      for (const condition of config.where) {
        if (!condition.column || !condition.operator) {
          errors.push(`Invalid where condition: missing column or operator`);
        }

        const validOperators = ['=', '!=', '>', '<', '>=', '<=', 'IN', 'LIKE', 'IS NULL', 'IS NOT NULL'];
        if (!validOperators.includes(condition.operator)) {
          errors.push(`Invalid operator: ${condition.operator}`);
        }
      }
    }

    // Validate incremental config
    if (config.incremental) {
      if (!config.incrementalColumn) {
        errors.push('Incremental extraction requires incrementalColumn');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

interface Pool {
  query(sql: string, params?: any[]): Promise<{ rows: any[] }>;
}

interface Logger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}
