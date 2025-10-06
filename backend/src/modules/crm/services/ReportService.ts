import { injectable, inject } from 'inversify';
import { TYPES } from '../../../container/types';
import { ReportRepository, ReportDefinition, ReportExecution } from '../repositories/ReportRepository';
import { ExportRepository } from '../repositories/ExportRepository';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';

@injectable()
export class ReportService {
  constructor(
    @inject(TYPES.CRMReportRepository) private reportRepository: ReportRepository,
    @inject(TYPES.CRMExportRepository) private exportRepository: ExportRepository
  ) {}

  async createReport(report: ReportDefinition): Promise<ReportDefinition> {
    // Validate report configuration
    this.validateReportConfig(report);

    // Create the report definition
    return await this.reportRepository.create(report);
  }

  async getReport(reportId: number, companyId: number): Promise<ReportDefinition | null> {
    return await this.reportRepository.findById(reportId, companyId);
  }

  async getCompanyReports(companyId: number): Promise<ReportDefinition[]> {
    return await this.reportRepository.findByCompany(companyId);
  }

  async getReportsByType(companyId: number, reportType: string): Promise<ReportDefinition[]> {
    return await this.reportRepository.findByType(companyId, reportType);
  }

  async updateReport(
    reportId: number,
    companyId: number,
    updates: Partial<ReportDefinition>
  ): Promise<ReportDefinition | null> {
    // Validate updates if query config is being changed
    if (updates.query_config) {
      this.validateReportConfig(updates as ReportDefinition);
    }

    return await this.reportRepository.update(reportId, companyId, updates);
  }

  async deleteReport(reportId: number, companyId: number): Promise<boolean> {
    return await this.reportRepository.delete(reportId, companyId);
  }

  async executeReport(
    reportId: number,
    companyId: number,
    filters?: any,
    format: 'json' | 'csv' | 'excel' | 'pdf' = 'json'
  ): Promise<any> {
    // Get report definition
    const report = await this.reportRepository.findById(reportId, companyId);
    if (!report) {
      throw new Error('Report not found');
    }

    // Execute the report query
    const execution: ReportExecution = {
      reportId,
      filters,
      format
    };

    const data = await this.reportRepository.executeReport(execution);

    // Format the data based on requested format
    switch (format) {
      case 'csv':
        return this.formatAsCSV(data);
      case 'excel':
        return await this.formatAsExcel(data, report);
      case 'pdf':
        return await this.formatAsPDF(data, report);
      default:
        return data;
    }
  }

  async scheduleReport(
    reportId: number,
    companyId: number,
    schedule: {
      frequency: 'daily' | 'weekly' | 'monthly';
      time?: string;
      dayOfWeek?: number;
      dayOfMonth?: number;
      recipients?: string[];
    }
  ): Promise<ReportDefinition | null> {
    // Update report with schedule configuration
    return await this.reportRepository.update(reportId, companyId, {
      schedule_config: schedule
    });
  }

  async generateReportExport(
    reportId: number,
    companyId: number,
    userId: number,
    format: 'csv' | 'excel' | 'pdf'
  ): Promise<any> {
    // Create export record
    const exportRecord = await this.exportRepository.create({
      company_id: companyId,
      export_name: `Report_${reportId}_${Date.now()}`,
      export_type: format as any,
      entity_type: 'report',
      created_by: userId
    });

    try {
      // Update status to processing
      await this.exportRepository.updateStatus(exportRecord.id!, 'processing', {
        started_at: new Date()
      });

      // Execute report
      const report = await this.reportRepository.findById(reportId, companyId);
      if (!report) {
        throw new Error('Report not found');
      }

      const data = await this.reportRepository.executeReport({ reportId });

      // Generate file based on format
      let filePath: string;
      let fileSize: number;

      switch (format) {
        case 'csv':
          const csvContent = this.formatAsCSV(data);
          filePath = path.join('/tmp', `report_${exportRecord.id}.csv`);
          fs.writeFileSync(filePath, csvContent);
          fileSize = Buffer.byteLength(csvContent);
          break;

        case 'excel':
          filePath = path.join('/tmp', `report_${exportRecord.id}.xlsx`);
          await this.generateExcelFile(data, report, filePath);
          fileSize = fs.statSync(filePath).size;
          break;

        case 'pdf':
          filePath = path.join('/tmp', `report_${exportRecord.id}.pdf`);
          await this.generatePDFFile(data, report, filePath);
          fileSize = fs.statSync(filePath).size;
          break;

        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Update export record with file info
      await this.exportRepository.updateStatus(exportRecord.id!, 'completed', {
        row_count: data.length,
        file_path: filePath,
        file_size: fileSize,
        completed_at: new Date(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      return {
        exportId: exportRecord.id,
        filePath,
        fileSize,
        downloadUrl: `/api/exports/${exportRecord.id}/download`
      };

    } catch (error) {
      // Update export record with error
      await this.exportRepository.updateStatus(exportRecord.id!, 'failed', {
        error_message: (error as Error).message
      });
      throw error;
    }
  }

  async cloneReport(
    reportId: number,
    companyId: number,
    newName: string
  ): Promise<ReportDefinition> {
    const originalReport = await this.reportRepository.findById(reportId, companyId);
    if (!originalReport) {
      throw new Error('Report not found');
    }

    const clonedReport: ReportDefinition = {
      ...originalReport,
      id: undefined,
      name: newName,
      is_public: false,
      created_at: undefined,
      updated_at: undefined
    };

    return await this.reportRepository.create(clonedReport);
  }

  async getReportMetrics(reportId: number): Promise<any> {
    return await this.reportRepository.getReportMetrics(reportId);
  }

  private validateReportConfig(report: ReportDefinition): void {
    if (!report.name || report.name.trim() === '') {
      throw new Error('Report name is required');
    }

    if (!report.report_type) {
      throw new Error('Report type is required');
    }

    if (!report.query_config) {
      throw new Error('Query configuration is required');
    }

    // Validate based on report type
    switch (report.report_type) {
      case 'sales_performance':
      case 'lead_analysis':
      case 'activity_summary':
      case 'pipeline_forecast':
      case 'conversion_funnel':
        if (!report.query_config.companyId) {
          throw new Error('Company ID is required in query configuration');
        }
        break;
      case 'custom':
        if (!report.query_config.customQuery) {
          throw new Error('Custom query is required for custom reports');
        }
        break;
    }
  }

  private formatAsCSV(data: any[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  private async formatAsExcel(data: any[], report: ReportDefinition): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(report.name);

    if (data && data.length > 0) {
      // Add headers
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);

      // Style headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add data rows
      data.forEach(row => {
        const values = headers.map(header => row[header]);
        worksheet.addRow(values);
      });

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = 15;
      });
    }

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  private async formatAsPDF(data: any[], report: ReportDefinition): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Add title
      doc.fontSize(20).text(report.name, { align: 'center' });
      doc.moveDown();

      // Add description if available
      if (report.description) {
        doc.fontSize(12).text(report.description, { align: 'left' });
        doc.moveDown();
      }

      // Add data as table
      if (data && data.length > 0) {
        const headers = Object.keys(data[0]);

        // Simple table rendering
        doc.fontSize(10);
        data.forEach((row, index) => {
          if (index === 0) {
            // Headers
            doc.font('Helvetica-Bold');
            doc.text(headers.join(' | '));
            doc.font('Helvetica');
            doc.moveDown(0.5);
          }

          const values = headers.map(h => row[h] || '');
          doc.text(values.join(' | '));
        });
      }

      doc.end();
    });
  }

  private async generateExcelFile(data: any[], report: ReportDefinition, filePath: string): Promise<void> {
    const buffer = await this.formatAsExcel(data, report);
    fs.writeFileSync(filePath, buffer);
  }

  private async generatePDFFile(data: any[], report: ReportDefinition, filePath: string): Promise<void> {
    const buffer = await this.formatAsPDF(data, report);
    fs.writeFileSync(filePath, buffer);
  }
}