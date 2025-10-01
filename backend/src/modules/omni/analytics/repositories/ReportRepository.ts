/**
 * ReportRepository - Sprint 13
 * Repository for CRUD operations on reports and report executions
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import type { Pool } from 'pg';
import {
  Report,
  ReportExecution,
  CreateReportDto,
  UpdateReportDto,
  CreateEtlExecutionDto,
  UpdateEtlExecutionDto
} from '../types/analytics.types';

@injectable()
export class ReportRepository {
  constructor(
    @inject(TYPES.DatabaseConnection) private db: Pool,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Create a new report
   */
  async create(data: CreateReportDto, companyId: number, userId: number): Promise<Report> {
    try {
      const query = `
        INSERT INTO reports (
          company_id, name, description, report_type, data_sources,
          parameters, filters, groupings, sortings, output_format,
          include_charts, include_summary, branding_config, recipients, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const values = [
        companyId,
        data.name,
        data.description || null,
        data.reportType,
        JSON.stringify(data.dataSources),
        JSON.stringify(data.parameters || {}),
        JSON.stringify(data.filters || {}),
        JSON.stringify(data.groupings || {}),
        JSON.stringify(data.sortings || {}),
        data.outputFormat,
        data.includeCharts !== false,
        data.includeSummary !== false,
        JSON.stringify(data.brandingConfig || {}),
        JSON.stringify(data.recipients || []),
        userId
      ];

      const result = await this.db.query(query, values);

      this.logger.info('Report created', { reportId: result.rows[0].id, companyId });

      return this.mapRowToReport(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating report', { error, data, companyId });
      throw new Error(`Failed to create report: ${error.message}`);
    }
  }

  /**
   * Find report by ID
   */
  async findById(id: number, companyId: number): Promise<Report | null> {
    try {
      const query = `
        SELECT * FROM reports
        WHERE id = $1 AND company_id = $2
      `;

      const result = await this.db.query(query, [id, companyId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToReport(result.rows[0]);
    } catch (error) {
      this.logger.error('Error finding report by ID', { error, id, companyId });
      throw new Error(`Failed to find report: ${error.message}`);
    }
  }

  /**
   * Find all scheduled reports
   */
  async findScheduled(companyId?: number): Promise<Report[]> {
    try {
      let query = `
        SELECT * FROM reports
        WHERE is_scheduled = true
          AND is_active = true
          AND next_run_at <= CURRENT_TIMESTAMP
      `;

      const params: any[] = [];

      if (companyId) {
        query += ` AND company_id = $1`;
        params.push(companyId);
      }

      query += ` ORDER BY next_run_at ASC`;

      const result = await this.db.query(query, params);

      return result.rows.map(row => this.mapRowToReport(row));
    } catch (error) {
      this.logger.error('Error finding scheduled reports', { error, companyId });
      throw new Error(`Failed to find scheduled reports: ${error.message}`);
    }
  }

  /**
   * Find all reports for a company
   */
  async findByCompany(companyId: number): Promise<Report[]> {
    try {
      const query = `
        SELECT * FROM reports
        WHERE company_id = $1 AND is_active = true
        ORDER BY created_at DESC
      `;

      const result = await this.db.query(query, [companyId]);

      return result.rows.map(row => this.mapRowToReport(row));
    } catch (error) {
      this.logger.error('Error finding reports by company', { error, companyId });
      throw new Error(`Failed to find reports: ${error.message}`);
    }
  }

  /**
   * Update report
   */
  async update(id: number, data: UpdateReportDto, companyId: number): Promise<Report> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }
      if (data.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }
      if (data.reportType !== undefined) {
        updateFields.push(`report_type = $${paramIndex++}`);
        values.push(data.reportType);
      }
      if (data.dataSources !== undefined) {
        updateFields.push(`data_sources = $${paramIndex++}`);
        values.push(JSON.stringify(data.dataSources));
      }
      if (data.parameters !== undefined) {
        updateFields.push(`parameters = $${paramIndex++}`);
        values.push(JSON.stringify(data.parameters));
      }
      if (data.filters !== undefined) {
        updateFields.push(`filters = $${paramIndex++}`);
        values.push(JSON.stringify(data.filters));
      }
      if (data.outputFormat !== undefined) {
        updateFields.push(`output_format = $${paramIndex++}`);
        values.push(data.outputFormat);
      }
      if (data.includeCharts !== undefined) {
        updateFields.push(`include_charts = $${paramIndex++}`);
        values.push(data.includeCharts);
      }
      if (data.brandingConfig !== undefined) {
        updateFields.push(`branding_config = $${paramIndex++}`);
        values.push(JSON.stringify(data.brandingConfig));
      }
      if (data.recipients !== undefined) {
        updateFields.push(`recipients = $${paramIndex++}`);
        values.push(JSON.stringify(data.recipients));
      }
      if (data.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        values.push(data.isActive);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id, companyId);

      const query = `
        UPDATE reports
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex++} AND company_id = $${paramIndex++}
        RETURNING *
      `;

      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`Report ${id} not found`);
      }

      this.logger.info('Report updated', { reportId: id, companyId });

      return this.mapRowToReport(result.rows[0]);
    } catch (error) {
      this.logger.error('Error updating report', { error, id, data, companyId });
      throw new Error(`Failed to update report: ${error.message}`);
    }
  }

  /**
   * Update report schedule
   */
  async updateSchedule(id: number, scheduleCron: string, nextRunAt: Date, companyId: number): Promise<void> {
    try {
      const query = `
        UPDATE reports
        SET is_scheduled = true,
            schedule_cron = $1,
            next_run_at = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND company_id = $4
      `;

      const result = await this.db.query(query, [scheduleCron, nextRunAt, id, companyId]);

      if (result.rowCount === 0) {
        throw new Error(`Report ${id} not found`);
      }

      this.logger.info('Report schedule updated', { reportId: id, scheduleCron });
    } catch (error) {
      this.logger.error('Error updating report schedule', { error, id, companyId });
      throw new Error(`Failed to update schedule: ${error.message}`);
    }
  }

  /**
   * Cancel report schedule
   */
  async cancelSchedule(id: number, companyId: number): Promise<void> {
    try {
      const query = `
        UPDATE reports
        SET is_scheduled = false,
            schedule_cron = NULL,
            next_run_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND company_id = $2
      `;

      const result = await this.db.query(query, [id, companyId]);

      if (result.rowCount === 0) {
        throw new Error(`Report ${id} not found`);
      }

      this.logger.info('Report schedule cancelled', { reportId: id, companyId });
    } catch (error) {
      this.logger.error('Error cancelling report schedule', { error, id, companyId });
      throw new Error(`Failed to cancel schedule: ${error.message}`);
    }
  }

  /**
   * Create report execution record
   */
  async createExecution(data: CreateEtlExecutionDto & { reportId: number }): Promise<ReportExecution> {
    try {
      const query = `
        INSERT INTO report_executions (
          report_id, execution_id, status, started_at
        )
        VALUES ($1, gen_random_uuid(), $2, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const values = [data.reportId, data.status];

      const result = await this.db.query(query, values);

      this.logger.info('Report execution created', { executionId: result.rows[0].execution_id });

      return this.mapRowToExecution(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating report execution', { error, data });
      throw new Error(`Failed to create execution: ${error.message}`);
    }
  }

  /**
   * Update report execution
   */
  async updateExecution(executionId: number, data: UpdateEtlExecutionDto): Promise<ReportExecution> {
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
      if (data.errorMessage !== undefined) {
        updateFields.push(`error_message = $${paramIndex++}`);
        values.push(data.errorMessage);
      }
      if (data.errorDetails !== undefined) {
        updateFields.push(`error_details = $${paramIndex++}`);
        values.push(JSON.stringify(data.errorDetails));
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(executionId);

      const query = `
        UPDATE report_executions
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
      this.logger.error('Error updating report execution', { error, executionId, data });
      throw new Error(`Failed to update execution: ${error.message}`);
    }
  }

  /**
   * Update execution file info
   */
  async updateExecutionFile(
    executionId: number,
    filePath: string,
    fileSizeBytes: number,
    pageCount?: number,
    rowCount?: number
  ): Promise<void> {
    try {
      const query = `
        UPDATE report_executions
        SET file_path = $1,
            file_size_bytes = $2,
            page_count = $3,
            row_count = $4
        WHERE id = $5
      `;

      await this.db.query(query, [filePath, fileSizeBytes, pageCount, rowCount, executionId]);
    } catch (error) {
      this.logger.error('Error updating execution file info', { error, executionId });
      throw new Error(`Failed to update file info: ${error.message}`);
    }
  }

  /**
   * Get execution history for a report
   */
  async getExecutionHistory(reportId: number, companyId: number, limit: number = 20): Promise<ReportExecution[]> {
    try {
      const query = `
        SELECT e.* FROM report_executions e
        INNER JOIN reports r ON e.report_id = r.id
        WHERE e.report_id = $1 AND r.company_id = $2
        ORDER BY e.started_at DESC
        LIMIT $3
      `;

      const result = await this.db.query(query, [reportId, companyId, limit]);

      return result.rows.map(row => this.mapRowToExecution(row));
    } catch (error) {
      this.logger.error('Error getting execution history', { error, reportId, companyId });
      throw new Error(`Failed to get execution history: ${error.message}`);
    }
  }

  /**
   * Update last generated timestamp
   */
  async updateLastGenerated(reportId: number): Promise<void> {
    try {
      const query = `
        UPDATE reports
        SET last_generated_at = CURRENT_TIMESTAMP,
            generation_count = generation_count + 1
        WHERE id = $1
      `;

      await this.db.query(query, [reportId]);
    } catch (error) {
      this.logger.error('Error updating last generated', { error, reportId });
      // Don't throw - this is not critical
    }
  }

  /**
   * Map database row to Report object
   */
  private mapRowToReport(row: any): Report {
    return {
      id: row.id,
      companyId: row.company_id,
      name: row.name,
      description: row.description,
      reportType: row.report_type,
      templateId: row.template_id,
      dataSources: typeof row.data_sources === 'string' ? JSON.parse(row.data_sources) : row.data_sources,
      parameters: typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters,
      filters: typeof row.filters === 'string' ? JSON.parse(row.filters) : row.filters,
      groupings: typeof row.groupings === 'string' ? JSON.parse(row.groupings) : row.groupings,
      sortings: typeof row.sortings === 'string' ? JSON.parse(row.sortings) : row.sortings,
      outputFormat: row.output_format,
      includeCharts: row.include_charts,
      includeSummary: row.include_summary,
      brandingConfig: typeof row.branding_config === 'string' ? JSON.parse(row.branding_config) : row.branding_config,
      isScheduled: row.is_scheduled,
      scheduleCron: row.schedule_cron,
      nextRunAt: row.next_run_at,
      recipients: typeof row.recipients === 'string' ? JSON.parse(row.recipients) : row.recipients,
      isActive: row.is_active,
      lastGeneratedAt: row.last_generated_at,
      generationCount: row.generation_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    };
  }

  /**
   * Map database row to ReportExecution object
   */
  private mapRowToExecution(row: any): ReportExecution {
    return {
      id: row.id,
      reportId: row.report_id,
      executionId: row.execution_id,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationSeconds: row.duration_seconds,
      filePath: row.file_path,
      fileSizeBytes: row.file_size_bytes,
      pageCount: row.page_count,
      rowCount: row.row_count,
      sentTo: typeof row.sent_to === 'string' ? JSON.parse(row.sent_to) : row.sent_to,
      deliveryStatus: typeof row.delivery_status === 'string' ? JSON.parse(row.delivery_status) : row.delivery_status,
      errorMessage: row.error_message,
      errorDetails: typeof row.error_details === 'string' ? JSON.parse(row.error_details) : row.error_details,
      createdAt: row.created_at,
      createdBy: row.created_by
    };
  }
}

interface Logger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
}
