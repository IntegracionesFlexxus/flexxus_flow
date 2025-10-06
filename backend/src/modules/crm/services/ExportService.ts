import { injectable, inject } from 'inversify';
import { TYPES } from '../../../container/types';
import { ExportRepository, DataExport } from '../repositories/ExportRepository';
import { IntegrationLogRepository, IntegrationLog } from '../repositories/IntegrationLogRepository';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import * as archiver from 'archiver';

export interface ExportRequest {
  company_id: number;
  entity_type: string;
  filters?: any;
  columns?: string[];
  format: 'csv' | 'excel' | 'json' | 'pdf';
  user_id: number;
}

export interface ExportStatus {
  exportId: number;
  status: string;
  progress?: number;
  downloadUrl?: string;
  error?: string;
}

@injectable()
export class ExportService {
  private exportDir = process.env.EXPORT_DIR || '/tmp/exports';

  constructor(
    @inject(TYPES.CRMExportRepository) private exportRepository: ExportRepository,
    @inject(TYPES.CRMIntegrationLogRepository) private integrationLogRepository: IntegrationLogRepository,
    @inject(TYPES.CrmConnection) private pool: Pool
  ) {
    // Ensure export directory exists
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  async createExport(request: ExportRequest): Promise<DataExport> {
    // Validate export request
    this.validateExportRequest(request);

    // Create export record
    const exportRecord = await this.exportRepository.create({
      company_id: request.company_id,
      export_name: `${request.entity_type}_export_${Date.now()}`,
      export_type: request.format,
      entity_type: request.entity_type,
      filters: request.filters,
      columns: request.columns,
      created_by: request.user_id
    });

    // Start export process asynchronously
    this.processExport(exportRecord, request).catch(error => {
      console.error(`Export ${exportRecord.id} failed:`, error);
    });

    return exportRecord;
  }

  async getExport(exportId: number): Promise<DataExport | null> {
    return await this.exportRepository.findById(exportId);
  }

  async getCompanyExports(companyId: number, status?: string): Promise<DataExport[]> {
    return await this.exportRepository.findByCompany(companyId, status);
  }

  async getUserExports(companyId: number, userId: number): Promise<DataExport[]> {
    return await this.exportRepository.findByUser(companyId, userId);
  }

  async getExportStatus(exportId: number): Promise<ExportStatus> {
    const exportRecord = await this.exportRepository.findById(exportId);
    if (!exportRecord) {
      throw new Error('Export not found');
    }

    return {
      exportId: exportRecord.id!,
      status: exportRecord.status!,
      progress: this.calculateProgress(exportRecord),
      downloadUrl: exportRecord.status === 'completed' ? `/api/exports/${exportRecord.id}/download` : undefined,
      error: exportRecord.error_message
    };
  }

  async downloadExport(exportId: number): Promise<{ filePath: string; filename: string }> {
    const exportRecord = await this.exportRepository.findById(exportId);
    if (!exportRecord) {
      throw new Error('Export not found');
    }

    if (exportRecord.status !== 'completed') {
      throw new Error('Export is not ready for download');
    }

    if (!exportRecord.file_path || !fs.existsSync(exportRecord.file_path)) {
      throw new Error('Export file not found');
    }

    // Check if expired
    if (exportRecord.expires_at && new Date(exportRecord.expires_at) < new Date()) {
      throw new Error('Export has expired');
    }

    // Increment download count
    await this.exportRepository.incrementDownloadCount(exportId);

    const filename = `${exportRecord.export_name}.${exportRecord.export_type}`;
    return {
      filePath: exportRecord.file_path,
      filename
    };
  }

  async cancelExport(exportId: number): Promise<boolean> {
    const exportRecord = await this.exportRepository.findById(exportId);
    if (!exportRecord) {
      throw new Error('Export not found');
    }

    if (exportRecord.status !== 'pending' && exportRecord.status !== 'processing') {
      throw new Error('Cannot cancel export in current status');
    }

    await this.exportRepository.updateStatus(exportId, 'failed', {
      error_message: 'Export cancelled by user'
    });

    return true;
  }

  async retryExport(exportId: number): Promise<DataExport> {
    const exportRecord = await this.exportRepository.findById(exportId);
    if (!exportRecord) {
      throw new Error('Export not found');
    }

    if (exportRecord.status !== 'failed') {
      throw new Error('Can only retry failed exports');
    }

    // Reset status to pending
    await this.exportRepository.updateStatus(exportId, 'pending');

    // Restart export process
    const request: ExportRequest = {
      company_id: exportRecord.company_id,
      entity_type: exportRecord.entity_type,
      filters: exportRecord.filters,
      columns: exportRecord.columns,
      format: exportRecord.export_type,
      user_id: exportRecord.created_by!
    };

    this.processExport(exportRecord, request).catch(error => {
      console.error(`Export retry ${exportRecord.id} failed:`, error);
    });

    return exportRecord;
  }

  private async processExport(exportRecord: DataExport, request: ExportRequest): Promise<void> {
    const startTime = Date.now();

    try {
      // Update status to processing
      await this.exportRepository.updateStatus(exportRecord.id!, 'processing', {
        started_at: new Date()
      });

      // Log the export start
      await this.integrationLogRepository.create({
        company_id: request.company_id,
        integration_type: 'data_export',
        operation: 'export',
        entity_type: request.entity_type,
        request_data: request,
        status: 'processing',
        initiated_by: request.user_id
      });

      // Fetch data based on entity type
      const data = await this.fetchEntityData(request);

      // Generate file based on format
      const { filePath, fileSize } = await this.generateExportFile(
        data,
        request,
        exportRecord.id!
      );

      // Update export record with success
      await this.exportRepository.updateStatus(exportRecord.id!, 'completed', {
        row_count: data.length,
        file_path: filePath,
        file_size: fileSize,
        completed_at: new Date(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      // Log successful export
      await this.integrationLogRepository.create({
        company_id: request.company_id,
        integration_type: 'data_export',
        operation: 'export',
        entity_type: request.entity_type,
        entity_id: exportRecord.id,
        records_affected: data.length,
        request_data: request,
        response_data: { file_path: filePath, file_size: fileSize },
        status: 'completed',
        duration_ms: Date.now() - startTime,
        initiated_by: request.user_id
      });

    } catch (error) {
      // Update export record with failure
      await this.exportRepository.updateStatus(exportRecord.id!, 'failed', {
        error_message: (error as Error).message
      });

      // Log failed export
      await this.integrationLogRepository.create({
        company_id: request.company_id,
        integration_type: 'data_export',
        operation: 'export',
        entity_type: request.entity_type,
        entity_id: exportRecord.id,
        request_data: request,
        status: 'failed',
        error_code: 'EXPORT_FAILED',
        error_message: (error as Error).message,
        duration_ms: Date.now() - startTime,
        initiated_by: request.user_id
      });

      throw error;
    }
  }

  private async fetchEntityData(request: ExportRequest): Promise<any[]> {
    let query: string;
    const values: any[] = [request.company_id];

    switch (request.entity_type) {
      case 'leads':
        query = this.buildLeadsExportQuery(request, values);
        break;
      case 'opportunities':
        query = this.buildOpportunitiesExportQuery(request, values);
        break;
      case 'accounts':
        query = this.buildAccountsExportQuery(request, values);
        break;
      case 'contacts':
        query = this.buildContactsExportQuery(request, values);
        break;
      case 'activities':
        query = this.buildActivitiesExportQuery(request, values);
        break;
      default:
        throw new Error(`Unsupported entity type: ${request.entity_type}`);
    }

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  private buildLeadsExportQuery(request: ExportRequest, values: any[]): string {
    const columns = request.columns?.length
      ? request.columns.join(', ')
      : 'id, name, email, phone, company, status, source, score, created_at';

    let query = `SELECT ${columns} FROM leads WHERE company_id = $1`;

    if (request.filters?.status) {
      values.push(request.filters.status);
      query += ` AND status = $${values.length}`;
    }

    if (request.filters?.source) {
      values.push(request.filters.source);
      query += ` AND source = $${values.length}`;
    }

    if (request.filters?.startDate && request.filters?.endDate) {
      values.push(request.filters.startDate, request.filters.endDate);
      query += ` AND created_at BETWEEN $${values.length - 1} AND $${values.length}`;
    }

    query += ' ORDER BY created_at DESC';
    return query;
  }

  private buildOpportunitiesExportQuery(request: ExportRequest, values: any[]): string {
    const columns = request.columns?.length
      ? request.columns.join(', ')
      : 'id, name, amount, stage, status, probability, close_date, account_id, created_at';

    let query = `SELECT ${columns} FROM opportunities WHERE company_id = $1`;

    if (request.filters?.status) {
      values.push(request.filters.status);
      query += ` AND status = $${values.length}`;
    }

    if (request.filters?.stage) {
      values.push(request.filters.stage);
      query += ` AND stage = $${values.length}`;
    }

    if (request.filters?.minAmount && request.filters?.maxAmount) {
      values.push(request.filters.minAmount, request.filters.maxAmount);
      query += ` AND amount BETWEEN $${values.length - 1} AND $${values.length}`;
    }

    query += ' ORDER BY created_at DESC';
    return query;
  }

  private buildAccountsExportQuery(request: ExportRequest, values: any[]): string {
    const columns = request.columns?.length
      ? request.columns.join(', ')
      : 'id, name, type, industry, annual_revenue, employees, website, created_at';

    let query = `SELECT ${columns} FROM accounts WHERE company_id = $1`;

    if (request.filters?.type) {
      values.push(request.filters.type);
      query += ` AND type = $${values.length}`;
    }

    if (request.filters?.industry) {
      values.push(request.filters.industry);
      query += ` AND industry = $${values.length}`;
    }

    query += ' ORDER BY name';
    return query;
  }

  private buildContactsExportQuery(request: ExportRequest, values: any[]): string {
    const columns = request.columns?.length
      ? request.columns.join(', ')
      : 'id, first_name, last_name, email, phone, title, account_id, created_at';

    let query = `SELECT ${columns} FROM contacts WHERE company_id = $1`;

    if (request.filters?.accountId) {
      values.push(request.filters.accountId);
      query += ` AND account_id = $${values.length}`;
    }

    query += ' ORDER BY last_name, first_name';
    return query;
  }

  private buildActivitiesExportQuery(request: ExportRequest, values: any[]): string {
    const columns = request.columns?.length
      ? request.columns.join(', ')
      : 'id, subject, type, status, due_date, assigned_to, related_to, created_at';

    let query = `SELECT ${columns} FROM activities WHERE company_id = $1`;

    if (request.filters?.status) {
      values.push(request.filters.status);
      query += ` AND status = $${values.length}`;
    }

    if (request.filters?.type) {
      values.push(request.filters.type);
      query += ` AND type = $${values.length}`;
    }

    if (request.filters?.assignedTo) {
      values.push(request.filters.assignedTo);
      query += ` AND assigned_to = $${values.length}`;
    }

    query += ' ORDER BY due_date DESC';
    return query;
  }

  private async generateExportFile(
    data: any[],
    request: ExportRequest,
    exportId: number
  ): Promise<{ filePath: string; fileSize: number }> {
    const filename = `export_${exportId}.${request.format}`;
    const filePath = path.join(this.exportDir, filename);

    let fileSize: number;

    switch (request.format) {
      case 'csv':
        const csvContent = this.generateCSV(data);
        fs.writeFileSync(filePath, csvContent);
        fileSize = Buffer.byteLength(csvContent);
        break;

      case 'excel':
        await this.generateExcel(data, filePath);
        fileSize = fs.statSync(filePath).size;
        break;

      case 'json':
        const jsonContent = JSON.stringify(data, null, 2);
        fs.writeFileSync(filePath, jsonContent);
        fileSize = Buffer.byteLength(jsonContent);
        break;

      case 'pdf':
        await this.generatePDF(data, request.entity_type, filePath);
        fileSize = fs.statSync(filePath).size;
        break;

      default:
        throw new Error(`Unsupported format: ${request.format}`);
    }

    return { filePath, fileSize };
  }

  private generateCSV(data: any[]): string {
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
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  private async generateExcel(data: any[], filePath: string): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Export');

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
        let maxLength = 0;
        column.eachCell?.({ includeEmpty: false }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 50);
      });
    }

    await workbook.xlsx.writeFile(filePath);
  }

  private async generatePDF(data: any[], entityType: string, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Add title
      doc.fontSize(20).text(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Export`, {
        align: 'center'
      });
      doc.moveDown();

      // Add export date
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, {
        align: 'right'
      });
      doc.moveDown();

      // Add data
      if (data && data.length > 0) {
        doc.fontSize(10);

        // For PDF, we'll create a simplified view
        data.forEach((row, index) => {
          if (index > 0) {
            doc.moveDown(0.5);
          }

          // Display key fields only for readability
          const displayFields = Object.entries(row)
            .filter(([key, value]) => value !== null && value !== undefined)
            .slice(0, 5); // Limit to 5 fields per record

          displayFields.forEach(([key, value]) => {
            doc.text(`${key}: ${value}`);
          });

          // Add separator between records
          if (index < data.length - 1) {
            doc.moveDown(0.5);
            doc.text('---');
          }
        });
      } else {
        doc.text('No data to export');
      }

      doc.end();

      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

  async cleanupExpiredExports(): Promise<number> {
    // Mark expired exports
    const expiredCount = await this.exportRepository.cleanupExpired();

    // Delete old export files
    const exports = await this.exportRepository.findByCompany(0); // Get all expired exports

    for (const exportRecord of exports) {
      if (exportRecord.status === 'expired' && exportRecord.file_path) {
        try {
          if (fs.existsSync(exportRecord.file_path)) {
            fs.unlinkSync(exportRecord.file_path);
          }
        } catch (error) {
          console.error(`Failed to delete export file ${exportRecord.file_path}:`, error);
        }
      }
    }

    return expiredCount;
  }

  async getExportStatistics(companyId: number): Promise<any> {
    return await this.exportRepository.getExportStatistics(companyId);
  }

  private calculateProgress(exportRecord: DataExport): number {
    switch (exportRecord.status) {
      case 'pending':
        return 0;
      case 'processing':
        return 50;
      case 'completed':
        return 100;
      case 'failed':
      case 'expired':
        return 0;
      default:
        return 0;
    }
  }

  private validateExportRequest(request: ExportRequest): void {
    if (!request.entity_type) {
      throw new Error('Entity type is required');
    }

    if (!request.format) {
      throw new Error('Export format is required');
    }

    const validFormats = ['csv', 'excel', 'json', 'pdf'];
    if (!validFormats.includes(request.format)) {
      throw new Error(`Invalid export format: ${request.format}`);
    }

    const validEntities = ['leads', 'opportunities', 'accounts', 'contacts', 'activities'];
    if (!validEntities.includes(request.entity_type)) {
      throw new Error(`Invalid entity type: ${request.entity_type}`);
    }
  }
}