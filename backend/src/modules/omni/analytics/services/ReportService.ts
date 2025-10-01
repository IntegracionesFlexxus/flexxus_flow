/**
 * ReportService - Sprint 13
 * Service for report generation and scheduling
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import type {
  Report,
  CreateReportDto,
  UpdateReportDto,
  ReportExecution,
  GeneratedReport
} from '../types/analytics.types';

@injectable()
export class ReportService {
  constructor(
    @inject(TYPES.AnalyticsReportRepository) private reportRepo: ReportRepository,
    @inject(TYPES.ReportGenerator) private generator: ReportGenerator,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Create a new report definition
   */
  async createReport(
    data: CreateReportDto,
    companyId: number,
    userId: number
  ): Promise<Report> {
    try {
      this.logger.info('Creating report', { name: data.name, companyId });

      const report = await this.reportRepo.create(data, companyId, userId);

      this.logger.info('Report created', { reportId: report.id });

      return report;
    } catch (error) {
      this.logger.error('Error creating report', { error, data });
      throw new Error(`Failed to create report: ${error.message}`);
    }
  }

  /**
   * Get report by ID
   */
  async getReport(id: number, companyId: number): Promise<Report | null> {
    try {
      return await this.reportRepo.findById(id, companyId);
    } catch (error) {
      this.logger.error('Error getting report', { error, id });
      throw new Error(`Failed to get report: ${error.message}`);
    }
  }

  /**
   * Get all reports for company
   */
  async getReportsByCompany(companyId: number): Promise<Report[]> {
    try {
      return await this.reportRepo.findByCompany(companyId);
    } catch (error) {
      this.logger.error('Error getting reports', { error, companyId });
      throw new Error(`Failed to get reports: ${error.message}`);
    }
  }

  /**
   * Update report
   */
  async updateReport(
    id: number,
    data: UpdateReportDto,
    companyId: number
  ): Promise<Report> {
    try {
      this.logger.info('Updating report', { id, companyId });

      const report = await this.reportRepo.update(id, data, companyId);

      if (!report) {
        throw new Error('Report not found');
      }

      return report;
    } catch (error) {
      this.logger.error('Error updating report', { error, id });
      throw new Error(`Failed to update report: ${error.message}`);
    }
  }

  /**
   * Generate report now
   */
  async generateReport(id: number, companyId: number): Promise<GeneratedReport> {
    try {
      this.logger.info('Generating report', { id, companyId });

      const report = await this.reportRepo.findById(id, companyId);

      if (!report) {
        throw new Error('Report not found');
      }

      // Create execution record
      const execution = await this.reportRepo.createExecution({
        reportId: id,
        status: 'running',
        startedAt: new Date()
      });

      try {
        // Generate report
        const generated = await this.generator.generateReport(
          report,
          companyId,
          execution.id!
        );

        // Update execution record
        await this.reportRepo.updateExecution(execution.id!, {
          status: 'success',
          completedAt: new Date()
        });

        // Update report file info
        await this.reportRepo.updateExecutionFile(
          execution.id!,
          generated.filePath,
          generated.fileSize,
          generated.pageCount,
          generated.rowCount
        );

        // Update last generated timestamp
        await this.reportRepo.updateLastGenerated(id);

        this.logger.info('Report generated successfully', {
          reportId: id,
          executionId: execution.id
        });

        return generated;
      } catch (error) {
        // Update execution with error
        await this.reportRepo.updateExecution(execution.id!, {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: error.message
        });

        throw error;
      }
    } catch (error) {
      this.logger.error('Error generating report', { error, id });
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }

  /**
   * Schedule report generation
   */
  async scheduleReport(
    id: number,
    scheduleCron: string,
    recipients: Array<{ email: string; name?: string }>,
    companyId: number
  ): Promise<Report> {
    try {
      this.logger.info('Scheduling report', { id, scheduleCron, companyId });

      const nextRunAt = this.calculateNextRun(scheduleCron);

      const report = await this.reportRepo.updateSchedule(
        id,
        scheduleCron,
        nextRunAt,
        companyId
      );

      if (!report) {
        throw new Error('Report not found');
      }

      // In production, this would integrate with a job queue (Bull)
      this.logger.info('Report scheduled', {
        reportId: id,
        nextRunAt
      });

      return report;
    } catch (error) {
      this.logger.error('Error scheduling report', { error, id });
      throw new Error(`Failed to schedule report: ${error.message}`);
    }
  }

  /**
   * Cancel report schedule
   */
  async cancelSchedule(id: number, companyId: number): Promise<Report> {
    try {
      this.logger.info('Cancelling report schedule', { id, companyId });

      const report = await this.reportRepo.cancelSchedule(id, companyId);

      if (!report) {
        throw new Error('Report not found');
      }

      return report;
    } catch (error) {
      this.logger.error('Error cancelling schedule', { error, id });
      throw new Error(`Failed to cancel schedule: ${error.message}`);
    }
  }

  /**
   * Get report execution history
   */
  async getExecutionHistory(
    reportId: number,
    companyId: number,
    limit: number = 10
  ): Promise<ReportExecution[]> {
    try {
      return await this.reportRepo.getExecutionHistory(reportId, companyId, limit);
    } catch (error) {
      this.logger.error('Error getting execution history', { error, reportId });
      throw new Error(`Failed to get execution history: ${error.message}`);
    }
  }

  /**
   * Delete report
   */
  async deleteReport(id: number, companyId: number): Promise<void> {
    try {
      this.logger.info('Deleting report', { id, companyId });

      await this.reportRepo.update(id, { isActive: false }, companyId);

      this.logger.info('Report deleted', { id });
    } catch (error) {
      this.logger.error('Error deleting report', { error, id });
      throw new Error(`Failed to delete report: ${error.message}`);
    }
  }

  /**
   * Calculate next run time from cron expression
   */
  private calculateNextRun(cronExpression: string): Date {
    // Simplified - in production use a cron library
    const now = new Date();
    return new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
  }
}

interface ReportRepository {
  create(data: CreateReportDto, companyId: number, userId: number): Promise<Report>;
  findById(id: number, companyId: number): Promise<Report | null>;
  findByCompany(companyId: number): Promise<Report[]>;
  update(id: number, data: UpdateReportDto, companyId: number): Promise<Report | null>;
  updateSchedule(id: number, scheduleCron: string, nextRunAt: Date, companyId: number): Promise<Report | null>;
  cancelSchedule(id: number, companyId: number): Promise<Report | null>;
  createExecution(data: Partial<ReportExecution>): Promise<ReportExecution>;
  updateExecution(executionId: number, data: Partial<ReportExecution>): Promise<void>;
  updateExecutionFile(executionId: number, filePath: string, size: number, pageCount?: number, rowCount?: number): Promise<void>;
  getExecutionHistory(reportId: number, companyId: number, limit: number): Promise<ReportExecution[]>;
  updateLastGenerated(reportId: number): Promise<void>;
}

interface ReportGenerator {
  generateReport(report: Report, companyId: number, executionId: number): Promise<GeneratedReport>;
}

interface Logger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
}
