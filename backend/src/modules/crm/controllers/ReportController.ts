import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../../container/types';
import { ReportService } from '../services/ReportService';

@injectable()
export class ReportController {
  constructor(
    @inject(TYPES.CRMReportService) private reportService: ReportService
  ) {}

  /**
   * Create a new report
   */
  async createReport(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId || 1;
      const userId = req.user?.id || 1;

      const reportData = {
        ...req.body,
        company_id: companyId,
        created_by: userId
      };

      const report = await this.reportService.createReport(reportData);

      res.status(201).json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get all reports
   */
  async getReports(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId || 1;
      const { type } = req.query;

      const reports = type
        ? await this.reportService.getReportsByType(companyId, type as string)
        : await this.reportService.getCompanyReports(companyId);

      res.json({
        success: true,
        data: reports
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get report by ID
   */
  async getReport(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId || 1;
      const { reportId } = req.params;

      const report = await this.reportService.getReport(parseInt(reportId), companyId);

      if (!report) {
        res.status(404).json({
          success: false,
          error: 'Report not found'
        });
        return;
      }

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Update report
   */
  async updateReport(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId || 1;
      const { reportId } = req.params;

      const report = await this.reportService.updateReport(
        parseInt(reportId),
        companyId,
        req.body
      );

      if (!report) {
        res.status(404).json({
          success: false,
          error: 'Report not found'
        });
        return;
      }

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Delete report
   */
  async deleteReport(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId || 1;
      const { reportId } = req.params;

      const deleted = await this.reportService.deleteReport(
        parseInt(reportId),
        companyId
      );

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Report not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Report deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Execute report
   */
  async executeReport(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId || 1;
      const { reportId } = req.params;
      const { filters, format = 'json' } = req.body;

      const data = await this.reportService.executeReport(
        parseInt(reportId),
        companyId,
        filters,
        format as 'json' | 'csv' | 'excel' | 'pdf'
      );

      // For non-JSON formats, set appropriate headers
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="report_${reportId}.csv"`);
        res.send(data);
        return;
      }

      if (format === 'excel' || format === 'pdf') {
        const contentType = format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf';
        const extension = format === 'excel' ? 'xlsx' : 'pdf';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="report_${reportId}.${extension}"`);
        res.send(data);
        return;
      }

      res.json({
        success: true,
        data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Schedule report
   */
  async scheduleReport(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId || 1;
      const { reportId } = req.params;
      const schedule = req.body;

      const report = await this.reportService.scheduleReport(
        parseInt(reportId),
        companyId,
        schedule
      );

      if (!report) {
        res.status(404).json({
          success: false,
          error: 'Report not found'
        });
        return;
      }

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Export report
   */
  async exportReport(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId || 1;
      const userId = req.user?.id || 1;
      const { reportId } = req.params;
      const { format = 'csv' } = req.query;

      const exportInfo = await this.reportService.generateReportExport(
        parseInt(reportId),
        companyId,
        userId,
        format as 'csv' | 'excel' | 'pdf'
      );

      res.json({
        success: true,
        data: exportInfo
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Clone report
   */
  async cloneReport(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId || 1;
      const { reportId } = req.params;
      const { name } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: 'New report name is required'
        });
        return;
      }

      const clonedReport = await this.reportService.cloneReport(
        parseInt(reportId),
        companyId,
        name
      );

      res.status(201).json({
        success: true,
        data: clonedReport
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get report metrics
   */
  async getReportMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;

      const metrics = await this.reportService.getReportMetrics(parseInt(reportId));

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }
}