/**
 * Report Service - Sprint 3
 * Servicio de generación de reportes y análisis
 * Implementación siguiendo lineamientos Nivel 2: SOLID, Clean Code, Patrón Factory
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { IReportRepository } from '@/modules/reports/interfaces/IReportRepository';
import { IUserRepository } from '@/shared/interfaces/repositories/IUserRepository';
import { IAuditRepository } from '@/modules/reports/interfaces/IAuditRepository';
import { ICacheService } from '@/interfaces/IServices';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

// DTOs y tipos
export interface ReportDefinition {
  id: string;
  type: string;
  name: string;
  description: string;
  category: string;
  requiredPermissions: string[];
  allowedRoles: string[];
  parameters: ReportParameter[];
  dataSource: string;
  template?: string;
}

export interface ReportParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array';
  required: boolean;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}

export interface GeneratedReport {
  id: string;
  type: string;
  format: string;
  data: any;
  contentType: string;
  filename: string;
  rowCount?: number;
  generatedAt: Date;
  generatedBy: string;
  companyId: string;
  metadata?: Record<string, any>;
}

export interface ReportSchedule {
  id: string;
  type: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  format: string;
  recipients: string[];
  filters: Record<string, any>;
  userId: string;
  companyId: string;
  isActive: boolean;
  lastExecutedAt?: Date;
  nextExecutionAt: Date;
}

// Estrategias de generación de reportes (Patrón Strategy)
abstract class ReportGenerator {
  abstract generate(data: any[], options: any): Promise<any>;
  abstract getContentType(): string;
  abstract getExtension(): string;
}

class JSONReportGenerator extends ReportGenerator {
  async generate(data: any[], options: any): Promise<any> {
    return JSON.stringify(data, null, 2);
  }

  getContentType(): string {
    return 'application/json';
  }

  getExtension(): string {
    return 'json';
  }
}

class CSVReportGenerator extends ReportGenerator {
  async generate(data: any[], options: any): Promise<string> {
    if (data.length === 0) {
      return '';
    }

    const fields = options.fields || Object.keys(data[0]);
    const parser = new Parser({ fields });
    return parser.parse(data);
  }

  getContentType(): string {
    return 'text/csv';
  }

  getExtension(): string {
    return 'csv';
  }
}

class PDFReportGenerator extends ReportGenerator {
  async generate(data: any[], options: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Título del reporte
      doc.fontSize(20).text(options.title || 'Report', 50, 50);
      doc.moveDown();

      // Metadatos
      if (options.metadata) {
        doc.fontSize(12);
        Object.entries(options.metadata).forEach(([key, value]) => {
          doc.text(`${key}: ${value}`);
        });
        doc.moveDown();
      }

      // Datos en formato tabla
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        let y = doc.y;

        // Headers
        doc.fontSize(10).font('Helvetica-Bold');
        headers.forEach((header, i) => {
          doc.text(header, 50 + (i * 100), y, { width: 95, align: 'left' });
        });

        doc.moveDown();
        y = doc.y;

        // Datos
        doc.font('Helvetica').fontSize(9);
        data.slice(0, 50).forEach((row, rowIndex) => { // Limitar a 50 filas para PDF
          headers.forEach((header, i) => {
            const value = String(row[header] || '');
            doc.text(value, 50 + (i * 100), y + (rowIndex * 15), { width: 95, align: 'left' });
          });
        });

        if (data.length > 50) {
          doc.moveDown();
          doc.text(`... y ${data.length - 50} filas más`);
        }
      }

      // Footer
      doc.fontSize(8).text(
        `Generado: ${new Date().toLocaleString()}`,
        50,
        doc.page.height - 50
      );

      doc.end();
    });
  }

  getContentType(): string {
    return 'application/pdf';
  }

  getExtension(): string {
    return 'pdf';
  }
}

class ExcelReportGenerator extends ReportGenerator {
  async generate(data: any[], options: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(options.sheetName || 'Report');

    if (data.length > 0) {
      // Headers
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);

      // Estilo para headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Datos
      data.forEach(row => {
        const values = headers.map(header => row[header]);
        worksheet.addRow(values);
      });

      // Ajustar ancho de columnas
      headers.forEach((header, index) => {
        const column = worksheet.getColumn(index + 1);
        column.width = Math.min(50, Math.max(10, header.length + 5));
      });

      // Agregar filtros
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: headers.length }
      };
    }

    // Agregar hoja de metadatos
    if (options.metadata) {
      const metaSheet = workbook.addWorksheet('Metadata');
      Object.entries(options.metadata).forEach(([key, value], index) => {
        metaSheet.addRow([key, value]);
      });
    }

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  getContentType(): string {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }

  getExtension(): string {
    return 'xlsx';
  }
}

/**
 * ReportService implementa generación y gestión de reportes
 * Principios SOLID aplicados:
 * - S: Responsabilidad única para generación de reportes
 * - O: Abierto para extensión (nuevos formatos) cerrado para modificación
 * - L: Generadores sustituibles
 * - I: Interfaces segregadas para cada tipo de reporte
 * - D: Inversión de dependencias
 */
@injectable()
export class ReportService {
  private readonly CACHE_TTL = 600; // 10 minutos
  private readonly CACHE_PREFIX = 'reports:';
  private readonly generators: Map<string, ReportGenerator> = new Map();
  private readonly reportDefinitions: Map<string, ReportDefinition> = new Map();

  constructor(
    @inject(TYPES.ReportRepository) private reportRepository: IReportRepository,
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.AuditRepository) private auditRepository: IAuditRepository,
    @inject(TYPES.CacheService) private cacheService: ICacheService,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.initializeGenerators();
    this.initializeReportDefinitions();
  }

  /**
   * Generar reporte
   * Patrón Factory Method para crear diferentes tipos de reportes
   */
  async generateReport(
    request: any,
    userId: string
  ): Promise<GeneratedReport> {
    try {
      // Obtener definición del reporte
      const definition = this.reportDefinitions.get(request.type);
      if (!definition) {
        throw new Error(`Tipo de reporte '${request.type}' no soportado`);
      }

      // Validar permisos
      await this.validateReportAccess(definition, userId, request.companyId);

      // Obtener datos según el tipo de reporte
      const data = await this.fetchReportData(request);

      // Generar reporte en el formato solicitado
      const generator = this.generators.get(request.format);
      if (!generator) {
        throw new Error(`Formato '${request.format}' no soportado`);
      }

      const reportContent = await generator.generate(data, {
        title: definition.name,
        metadata: {
          'Tipo': definition.name,
          'Generado por': userId,
          'Fecha': new Date().toISOString(),
          'Registros': data.length,
          'Periodo': `${request.startDate.toISOString()} - ${request.endDate.toISOString()}`
        },
        ...request.options
      });

      // Guardar reporte generado
      const report: GeneratedReport = {
        id: this.generateReportId(),
        type: request.type,
        format: request.format,
        data: reportContent,
        contentType: generator.getContentType(),
        filename: `${request.type}_${Date.now()}.${generator.getExtension()}`,
        rowCount: data.length,
        generatedAt: new Date(),
        generatedBy: userId,
        companyId: request.companyId,
        metadata: {
          filters: request.filters,
          dateRange: {
            start: request.startDate,
            end: request.endDate
          }
        }
      };

      // Guardar en repositorio
      await this.reportRepository.save(report);

      // Cachear si es pequeño
      if (data.length < 1000) {
        const cacheKey = `${this.CACHE_PREFIX}${report.id}`;
        await this.cacheService.set(cacheKey, report, this.CACHE_TTL);
      }

      this.logger.info('Reporte generado exitosamente', {
        reportId: report.id,
        type: request.type,
        format: request.format,
        rowCount: data.length,
        userId
      });

      return report;
    } catch (error) {
      this.logger.error('Error al generar reporte', {
        error: error.message,
        request,
        userId
      });
      throw error;
    }
  }

  /**
   * Obtener datos del reporte según tipo
   * Patrón Strategy para diferentes fuentes de datos
   */
  private async fetchReportData(request: any): Promise<any[]> {
    switch (request.type) {
      case 'user_activity':
        return await this.getUserActivityData(request);

      case 'security':
        return await this.getSecurityData(request);

      case 'permissions':
        return await this.getPermissionsData(request);

      case 'invitations':
        return await this.getInvitationsData(request);

      case 'login_history':
        return await this.getLoginHistoryData(request);

      case 'audit_trail':
        return await this.getAuditTrailData(request);

      default:
        throw new Error(`Tipo de reporte '${request.type}' no implementado`);
    }
  }

  private async getUserActivityData(request: any): Promise<any[]> {
    const users = await this.userRepository.findByCompany(request.companyId, {
      includeActivity: true,
      startDate: request.startDate,
      endDate: request.endDate
    });

    return users.map(user => ({
      userId: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      status: user.status,
      lastLogin: user.lastLoginAt,
      totalSessions: user.sessionCount,
      activeSessions: user.activeSessionCount,
      createdAt: user.createdAt
    }));
  }

  private async getSecurityData(request: any): Promise<any[]> {
    const securityEvents = await this.auditRepository.getSecurityEvents({
      companyId: request.companyId,
      startDate: request.startDate,
      endDate: request.endDate,
      ...request.filters
    });

    return securityEvents.map(event => ({
      eventId: event.id,
      timestamp: event.createdAt,
      userId: event.userId,
      userEmail: event.userEmail,
      action: event.action,
      severity: event.severity,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      description: event.description,
      metadata: JSON.stringify(event.metadata)
    }));
  }

  private async getPermissionsData(request: any): Promise<any[]> {
    const permissions = await this.reportRepository.getPermissionsReport({
      companyId: request.companyId,
      userId: request.userId,
      ...request.filters
    });

    return permissions.map(perm => ({
      userId: perm.userId,
      userEmail: perm.userEmail,
      role: perm.roleName,
      permission: perm.permissionName,
      resource: perm.resource,
      action: perm.action,
      grantedAt: perm.grantedAt,
      grantedBy: perm.grantedBy
    }));
  }

  private async getInvitationsData(request: any): Promise<any[]> {
    const invitations = await this.reportRepository.getInvitationsReport({
      companyId: request.companyId,
      startDate: request.startDate,
      endDate: request.endDate,
      ...request.filters
    });

    return invitations.map(inv => ({
      invitationId: inv.id,
      email: inv.email,
      role: inv.roleName,
      status: inv.status,
      invitedBy: inv.invitedByEmail,
      invitedAt: inv.createdAt,
      acceptedAt: inv.acceptedAt,
      expiresAt: inv.expiresAt
    }));
  }

  private async getLoginHistoryData(request: any): Promise<any[]> {
    const sessions = await this.reportRepository.getLoginHistory({
      companyId: request.companyId,
      userId: request.userId,
      startDate: request.startDate,
      endDate: request.endDate,
      ...request.filters
    });

    return sessions.map(session => ({
      sessionId: session.id,
      userId: session.userId,
      userEmail: session.userEmail,
      loginAt: session.createdAt,
      logoutAt: session.endedAt,
      duration: session.duration,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      status: session.status
    }));
  }

  private async getAuditTrailData(request: any): Promise<any[]> {
    const logs = await this.auditRepository.findAll({
      companyId: request.companyId,
      startDate: request.startDate,
      endDate: request.endDate,
      ...request.filters
    });

    return logs.map(log => ({
      logId: log.id,
      timestamp: log.createdAt,
      userId: log.userId,
      userEmail: log.userEmail,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      description: log.description,
      ipAddress: log.ipAddress,
      metadata: JSON.stringify(log.metadata)
    }));
  }

  /**
   * Obtener reportes disponibles para el usuario
   */
  async getAvailableReports(
    userId: string,
    companyId: string,
    userRole: string
  ): Promise<ReportDefinition[]> {
    const availableReports: ReportDefinition[] = [];

    for (const [_, definition] of this.reportDefinitions) {
      // Verificar si el usuario tiene acceso al reporte
      if (definition.allowedRoles.includes(userRole) ||
          definition.allowedRoles.includes('*')) {
        availableReports.push(definition);
      }
    }

    return availableReports;
  }

  /**
   * Obtener historial de reportes del usuario
   */
  async getUserReportHistory(
    userId: string,
    companyId: string,
    options: { page: number; limit: number }
  ): Promise<{ reports: any[]; total: number }> {
    return await this.reportRepository.getUserHistory(
      userId,
      companyId,
      options
    );
  }

  /**
   * Obtener reporte previamente generado
   */
  async getReport(
    reportId: string,
    userId: string,
    companyId: string
  ): Promise<GeneratedReport | null> {
    // Intentar obtener del cache
    const cacheKey = `${this.CACHE_PREFIX}${reportId}`;
    const cached = await this.cacheService.get<GeneratedReport>(cacheKey);
    if (cached) {
      return cached;
    }

    // Obtener del repositorio
    const report = await this.reportRepository.findById(reportId);

    // Verificar acceso
    if (!report || 
        (report.companyId !== companyId && report.generatedBy !== userId)) {
      return null;
    }

    return report;
  }

  /**
   * Programar reporte periódico
   */
  async scheduleReport(schedule: any): Promise<ReportSchedule> {
    const nextExecution = this.calculateNextExecution(
      schedule.frequency,
      schedule.time,
      schedule.dayOfWeek,
      schedule.dayOfMonth
    );

    const scheduledReport: ReportSchedule = {
      id: this.generateScheduleId(),
      ...schedule,
      isActive: true,
      nextExecutionAt: nextExecution
    };

    await this.reportRepository.saveSchedule(scheduledReport);

    this.logger.info('Reporte programado', {
      scheduleId: scheduledReport.id,
      type: schedule.type,
      frequency: schedule.frequency,
      nextExecution
    });

    return scheduledReport;
  }

  // Métodos privados auxiliares

  private initializeGenerators(): void {
    this.generators.set('json', new JSONReportGenerator());
    this.generators.set('csv', new CSVReportGenerator());
    this.generators.set('pdf', new PDFReportGenerator());
    this.generators.set('excel', new ExcelReportGenerator());
  }

  private initializeReportDefinitions(): void {
    // Definir reportes disponibles
    const reports: ReportDefinition[] = [
      {
        id: 'user_activity',
        type: 'user_activity',
        name: 'Actividad de Usuarios',
        description: 'Reporte de actividad y sesiones de usuarios',
        category: 'users',
        requiredPermissions: ['report:view'],
        allowedRoles: ['admin', 'manager'],
        parameters: [
          { name: 'startDate', type: 'date', required: true },
          { name: 'endDate', type: 'date', required: true },
          { name: 'userId', type: 'string', required: false }
        ],
        dataSource: 'users'
      },
      {
        id: 'security',
        type: 'security',
        name: 'Eventos de Seguridad',
        description: 'Reporte de eventos y alertas de seguridad',
        category: 'security',
        requiredPermissions: ['audit:view'],
        allowedRoles: ['admin'],
        parameters: [
          { name: 'startDate', type: 'date', required: true },
          { name: 'endDate', type: 'date', required: true },
          { name: 'severity', type: 'string', required: false }
        ],
        dataSource: 'audit'
      },
      {
        id: 'permissions',
        type: 'permissions',
        name: 'Permisos y Roles',
        description: 'Reporte de permisos asignados a usuarios',
        category: 'access',
        requiredPermissions: ['role:view', 'permission:view'],
        allowedRoles: ['admin'],
        parameters: [
          { name: 'userId', type: 'string', required: false },
          { name: 'roleId', type: 'string', required: false }
        ],
        dataSource: 'permissions'
      },
      {
        id: 'invitations',
        type: 'invitations',
        name: 'Invitaciones',
        description: 'Reporte de invitaciones enviadas y su estado',
        category: 'users',
        requiredPermissions: ['invitation:view'],
        allowedRoles: ['admin', 'manager'],
        parameters: [
          { name: 'startDate', type: 'date', required: true },
          { name: 'endDate', type: 'date', required: true },
          { name: 'status', type: 'string', required: false }
        ],
        dataSource: 'invitations'
      },
      {
        id: 'login_history',
        type: 'login_history',
        name: 'Historial de Accesos',
        description: 'Reporte de inicios de sesión y duración',
        category: 'security',
        requiredPermissions: ['audit:view'],
        allowedRoles: ['admin', 'manager'],
        parameters: [
          { name: 'startDate', type: 'date', required: true },
          { name: 'endDate', type: 'date', required: true },
          { name: 'userId', type: 'string', required: false }
        ],
        dataSource: 'sessions'
      },
      {
        id: 'audit_trail',
        type: 'audit_trail',
        name: 'Pista de Auditoría',
        description: 'Registro completo de actividades del sistema',
        category: 'audit',
        requiredPermissions: ['audit:view', 'audit:export'],
        allowedRoles: ['admin'],
        parameters: [
          { name: 'startDate', type: 'date', required: true },
          { name: 'endDate', type: 'date', required: true },
          { name: 'action', type: 'string', required: false },
          { name: 'entityType', type: 'string', required: false }
        ],
        dataSource: 'audit'
      }
    ];

    reports.forEach(report => {
      this.reportDefinitions.set(report.id, report);
    });
  }

  private async validateReportAccess(
    definition: ReportDefinition,
    userId: string,
    companyId: string
  ): Promise<void> {
    // Aquí se validarían permisos específicos
    // Por ahora, validación básica
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    if (!definition.allowedRoles.includes(user.role) && 
        !definition.allowedRoles.includes('*')) {
      throw new Error('No tienes permisos para generar este reporte');
    }
  }

  private calculateNextExecution(
    frequency: string,
    time?: string,
    dayOfWeek?: number,
    dayOfMonth?: number
  ): Date {
    const now = new Date();
    const next = new Date();

    // Establecer hora si se proporciona
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      next.setHours(hours, minutes, 0, 0);
    }

    switch (frequency) {
      case 'daily':
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        break;

      case 'weekly':
        const targetDay = dayOfWeek || 1; // Lunes por defecto
        const currentDay = next.getDay();
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        next.setDate(next.getDate() + (daysUntilTarget || 7));
        break;

      case 'monthly':
        const targetDate = dayOfMonth || 1;
        next.setDate(targetDate);
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
        }
        break;

      case 'quarterly':
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3 + 3;
        next.setMonth(quarterMonth, 1);
        if (next <= now) {
          next.setMonth(next.getMonth() + 3);
        }
        break;

      case 'yearly':
        next.setFullYear(next.getFullYear() + 1, 0, 1);
        break;
    }

    return next;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateScheduleId(): string {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
