/**
 * EtlPipelineRepository - Sprint 13
 * Repository for ETL pipeline management
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import type { Pool } from 'pg';
import {
  EtlPipeline,
  EtlExecution,
  CreatePipelineDto,
  UpdatePipelineDto,
  CreateEtlExecutionDto,
  UpdateEtlExecutionDto
} from '../types/analytics.types';

@injectable()
export class EtlPipelineRepository {
  constructor(
    @inject(TYPES.DatabaseConnection) private db: Pool,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Create ETL pipeline
   */
  async create(data: CreatePipelineDto, companyId?: number): Promise<EtlPipeline> {
    try {
      const query = `
        INSERT INTO etl_pipelines (
          company_id, pipeline_name, pipeline_type, source_tables, target_table,
          schedule_cron, priority, timeout_minutes, retry_count
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [
        companyId || null,
        data.pipelineName,
        data.pipelineType,
        data.sourceTables,
        data.targetTable,
        data.scheduleCron || null,
        data.priority || 5,
        data.timeoutMinutes || 30,
        data.retryCount || 3
      ];

      const result = await this.db.query(query, values);

      this.logger.info('ETL pipeline created', { pipelineId: result.rows[0].id });

      return this.mapRowToPipeline(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating ETL pipeline', { error, data });
      throw new Error(`Failed to create ETL pipeline: ${error.message}`);
    }
  }

  /**
   * Find pipeline by ID
   */
  async findById(id: number): Promise<EtlPipeline | null> {
    try {
      const query = `SELECT * FROM etl_pipelines WHERE id = $1`;
      const result = await this.db.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToPipeline(result.rows[0]);
    } catch (error) {
      this.logger.error('Error finding pipeline by ID', { error, id });
      throw new Error(`Failed to find pipeline: ${error.message}`);
    }
  }

  /**
   * Get active pipelines
   */
  async getActivePipelines(companyId?: number): Promise<EtlPipeline[]> {
    try {
      let query = `
        SELECT * FROM etl_pipelines
        WHERE is_active = true
      `;

      const params: any[] = [];

      if (companyId) {
        query += ` AND (company_id = $1 OR company_id IS NULL)`;
        params.push(companyId);
      }

      query += ` ORDER BY priority DESC, pipeline_name`;

      const result = await this.db.query(query, params);

      return result.rows.map(row => this.mapRowToPipeline(row));
    } catch (error) {
      this.logger.error('Error getting active pipelines', { error, companyId });
      throw new Error(`Failed to get active pipelines: ${error.message}`);
    }
  }

  /**
   * Update pipeline
   */
  async update(id: number, data: UpdatePipelineDto): Promise<EtlPipeline> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.pipelineName !== undefined) {
        updateFields.push(`pipeline_name = $${paramIndex++}`);
        values.push(data.pipelineName);
      }
      if (data.sourceTables !== undefined) {
        updateFields.push(`source_tables = $${paramIndex++}`);
        values.push(data.sourceTables);
      }
      if (data.targetTable !== undefined) {
        updateFields.push(`target_table = $${paramIndex++}`);
        values.push(data.targetTable);
      }
      if (data.scheduleCron !== undefined) {
        updateFields.push(`schedule_cron = $${paramIndex++}`);
        values.push(data.scheduleCron);
      }
      if (data.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        values.push(data.isActive);
      }
      if (data.priority !== undefined) {
        updateFields.push(`priority = $${paramIndex++}`);
        values.push(data.priority);
      }
      if (data.timeoutMinutes !== undefined) {
        updateFields.push(`timeout_minutes = $${paramIndex++}`);
        values.push(data.timeoutMinutes);
      }
      if (data.retryCount !== undefined) {
        updateFields.push(`retry_count = $${paramIndex++}`);
        values.push(data.retryCount);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE etl_pipelines
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex++}
        RETURNING *
      `;

      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`Pipeline ${id} not found`);
      }

      this.logger.info('ETL pipeline updated', { pipelineId: id });

      return this.mapRowToPipeline(result.rows[0]);
    } catch (error) {
      this.logger.error('Error updating pipeline', { error, id, data });
      throw new Error(`Failed to update pipeline: ${error.message}`);
    }
  }

  /**
   * Update last run info
   */
  async updateLastRun(pipelineId: number, success: boolean, error?: string): Promise<void> {
    try {
      const query = `
        UPDATE etl_pipelines
        SET last_run_at = CURRENT_TIMESTAMP,
            ${success ? 'last_success_at = CURRENT_TIMESTAMP, success_count = success_count + 1' : 'last_error_at = CURRENT_TIMESTAMP, last_error_message = $2'},
            run_count = run_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      const values = success ? [pipelineId] : [pipelineId, error];

      await this.db.query(query, values);
    } catch (err) {
      this.logger.error('Error updating last run', { error: err, pipelineId });
      // Don't throw - this is not critical
    }
  }

  /**
   * Create execution record
   */
  async createExecution(data: CreateEtlExecutionDto): Promise<EtlExecution> {
    try {
      const query = `
        INSERT INTO etl_executions (
          pipeline_id, execution_id, status, started_at
        )
        VALUES ($1, gen_random_uuid(), $2, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const result = await this.db.query(query, [data.pipelineId, data.status]);

      this.logger.info('ETL execution created', { executionId: result.rows[0].execution_id });

      return this.mapRowToExecution(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating ETL execution', { error, data });
      throw new Error(`Failed to create execution: ${error.message}`);
    }
  }

  /**
   * Update execution
   */
  async updateExecution(executionId: number, data: UpdateEtlExecutionDto): Promise<EtlExecution> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(data.status);
      }
      if (data.completedAt !== undefined) {
        updateFields.push(`completed_at = $${paramIndex++}`);
        values.push(data.completedAt);
      }
      if (data.durationSeconds !== undefined) {
        updateFields.push(`duration_seconds = $${paramIndex++}`);
        values.push(data.durationSeconds);
      }
      if (data.recordsProcessed !== undefined) {
        updateFields.push(`records_processed = $${paramIndex++}`);
        values.push(data.recordsProcessed);
      }
      if (data.recordsInserted !== undefined) {
        updateFields.push(`records_inserted = $${paramIndex++}`);
        values.push(data.recordsInserted);
      }
      if (data.recordsUpdated !== undefined) {
        updateFields.push(`records_updated = $${paramIndex++}`);
        values.push(data.recordsUpdated);
      }
      if (data.recordsDeleted !== undefined) {
        updateFields.push(`records_deleted = $${paramIndex++}`);
        values.push(data.recordsDeleted);
      }
      if (data.recordsFailed !== undefined) {
        updateFields.push(`records_failed = $${paramIndex++}`);
        values.push(data.recordsFailed);
      }
      if (data.errorMessage !== undefined) {
        updateFields.push(`error_message = $${paramIndex++}`);
        values.push(data.errorMessage);
      }
      if (data.errorDetails !== undefined) {
        updateFields.push(`error_details = $${paramIndex++}`);
        values.push(JSON.stringify(data.errorDetails));
      }
      if (data.executionLog !== undefined) {
        updateFields.push(`execution_log = $${paramIndex++}`);
        values.push(data.executionLog);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(executionId);

      const query = `
        UPDATE etl_executions
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex++}
        RETURNING *
      `;

      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`Execution ${executionId} not found`);
      }

      return this.mapRowToExecution(result.rows[0]);
    } catch (error) {
      this.logger.error('Error updating ETL execution', { error, executionId, data });
      throw new Error(`Failed to update execution: ${error.message}`);
    }
  }

  /**
   * Get execution history
   */
  async getExecutionHistory(pipelineId: number, limit: number = 20): Promise<EtlExecution[]> {
    try {
      const query = `
        SELECT * FROM etl_executions
        WHERE pipeline_id = $1
        ORDER BY started_at DESC
        LIMIT $2
      `;

      const result = await this.db.query(query, [pipelineId, limit]);

      return result.rows.map(row => this.mapRowToExecution(row));
    } catch (error) {
      this.logger.error('Error getting execution history', { error, pipelineId });
      throw new Error(`Failed to get execution history: ${error.message}`);
    }
  }

  /**
   * Map database row to EtlPipeline object
   */
  private mapRowToPipeline(row: any): EtlPipeline {
    return {
      id: row.id,
      companyId: row.company_id,
      pipelineName: row.pipeline_name,
      pipelineType: row.pipeline_type,
      sourceTables: row.source_tables,
      targetTable: row.target_table,
      scheduleCron: row.schedule_cron,
      isActive: row.is_active,
      priority: row.priority,
      timeoutMinutes: row.timeout_minutes,
      retryCount: row.retry_count,
      lastRunAt: row.last_run_at,
      lastSuccessAt: row.last_success_at,
      lastErrorAt: row.last_error_at,
      lastErrorMessage: row.last_error_message,
      runCount: row.run_count,
      successCount: row.success_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Map database row to EtlExecution object
   */
  private mapRowToExecution(row: any): EtlExecution {
    return {
      id: row.id,
      pipelineId: row.pipeline_id,
      executionId: row.execution_id,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationSeconds: row.duration_seconds,
      recordsProcessed: row.records_processed,
      recordsInserted: row.records_inserted,
      recordsUpdated: row.records_updated,
      recordsDeleted: row.records_deleted,
      recordsFailed: row.records_failed,
      errorMessage: row.error_message,
      errorDetails: typeof row.error_details === 'string' ? JSON.parse(row.error_details) : row.error_details,
      executionLog: row.execution_log,
      createdAt: row.created_at
    };
  }
}

interface Logger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
}
