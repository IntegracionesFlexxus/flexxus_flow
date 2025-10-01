/**
 * ReportController - Sprint 13
 */

import { injectable, inject } from 'inversify';
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { TYPES } from '@/container/types';

@injectable()
export class ReportController {
  constructor(
    @inject(TYPES.AnalyticsReportService) private reportService: ReportService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async createReport(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const companyId = req.user?.companyId;
      const userId = req.user?.id;

      const report = await this.reportService.createReport(req.body, companyId, userId);

      res.status(201).json({ success: true, data: report });
    } catch (error) {
      this.logger.error('Error creating report', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getReport(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const companyId = req.user?.companyId;

      const report = await this.reportService.getReport(id, companyId);

      if (!report) {
        res.status(404).json({ success: false, error: 'Report not found' });
        return;
      }

      res.json({ success: true, data: report });
    } catch (error) {
      this.logger.error('Error getting report', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getReports(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;

      const reports = await this.reportService.getReportsByCompany(companyId);

      res.json({ success: true, data: reports });
    } catch (error) {
      this.logger.error('Error getting reports', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateReport(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const id = parseInt(req.params.id);
      const companyId = req.user?.companyId;

      const report = await this.reportService.updateReport(id, req.body, companyId);

      res.json({ success: true, data: report });
    } catch (error) {
      this.logger.error('Error updating report', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteReport(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const companyId = req.user?.companyId;

      await this.reportService.deleteReport(id, companyId);

      res.json({ success: true, message: 'Report deleted' });
    } catch (error) {
      this.logger.error('Error deleting report', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const companyId = req.user?.companyId;

      const generated = await this.reportService.generateReport(id, companyId);

      res.json({ success: true, data: generated });
    } catch (error) {
      this.logger.error('Error generating report', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async scheduleReport(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const id = parseInt(req.params.id);
      const companyId = req.user?.companyId;
      const { scheduleCron, recipients } = req.body;

      const report = await this.reportService.scheduleReport(id, scheduleCron, recipients, companyId);

      res.json({ success: true, data: report });
    } catch (error) {
      this.logger.error('Error scheduling report', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async cancelSchedule(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const companyId = req.user?.companyId;

      const report = await this.reportService.cancelSchedule(id, companyId);

      res.json({ success: true, data: report });
    } catch (error) {
      this.logger.error('Error cancelling schedule', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getExecutions(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const companyId = req.user?.companyId;
      const limit = parseInt(req.query.limit as string) || 10;

      const executions = await this.reportService.getExecutionHistory(id, companyId, limit);

      res.json({ success: true, data: executions });
    } catch (error) {
      this.logger.error('Error getting executions', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

interface ReportService {
  createReport(data: any, companyId: number, userId: number): Promise<any>;
  getReport(id: number, companyId: number): Promise<any>;
  getReportsByCompany(companyId: number): Promise<any[]>;
  updateReport(id: number, data: any, companyId: number): Promise<any>;
  deleteReport(id: number, companyId: number): Promise<void>;
  generateReport(id: number, companyId: number): Promise<any>;
  scheduleReport(id: number, cron: string, recipients: any[], companyId: number): Promise<any>;
  cancelSchedule(id: number, companyId: number): Promise<any>;
  getExecutionHistory(id: number, companyId: number, limit: number): Promise<any[]>;
}

interface Logger {
  error(message: string, meta?: any): void;
}
