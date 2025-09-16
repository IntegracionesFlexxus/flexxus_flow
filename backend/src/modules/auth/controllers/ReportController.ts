/**
 * Report Controller - Sprint 3
 * APIs de auditoría y reporting
 * Implementación siguiendo lineamientos Nivel 2: SOLID, Clean Code
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { ReportService } from '@/modules/reports/services/ReportService';
import { AuditService } from '@/shared/services/audit/AuditService';
import { requirePermission } from '@/shared/middleware/auth';

export interface ReportRequest {
  type: 'user_activity' | 'security' | 'permissions' | 'invitations' | 'login_history' | 'audit_trail';
  startDate: Date;
  endDate: Date;
  companyId?: string;
  userId?: string;
  format?: 'json' | 'csv' | 'pdf' | 'excel';
  filters?: Record<string, any>;
}

export interface AuditLogQuery {
  companyId?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@injectable()
export class ReportController {
  constructor(
    @inject(TYPES.ReportService) private reportService: ReportService,
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Obtener log de auditoría
   * GET /api/audit/logs
   */
  getAuditLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const query: AuditLogQuery = {
        companyId: req.user.companyId,
        userId: req.query.userId as string,
        action: req.query.action as string,
        entityType: req.query.entityType as string,
        entityId: req.query.entityId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        severity: req.query.severity as any,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
      };

      const result = await this.auditService.getAuditLogs(query);

      res.status(200).json({
        success: true,
        data: {
          logs: result.logs,
          pagination: {
            total: result.total,
            page: query.page,
            limit: query.limit,
            totalPages: Math.ceil(result.total / query.limit)
          }
        }
      });

    } catch (error) {
      this.logger.error('Error al obtener logs de auditoría', {
        error: error.message,
        userId: req.user?.id,
        query: req.query
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Generar reporte
   * POST /api/reports/generate
   */
  generateReport = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const reportRequest: ReportRequest = {
        type: req.body.type,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        companyId: req.body.companyId || req.user.companyId,
        userId: req.body.userId,
        format: req.body.format || 'json',
        filters: req.body.filters || {}
      };

      // Validar fechas
      if (reportRequest.startDate > reportRequest.endDate) {
        res.status(400).json({
          success: false,
          message: 'Start date must be before end date'
        });
        return;
      }

      // Validar rango máximo (90 días)
      const daysDiff = Math.ceil(
        (reportRequest.endDate.getTime() - reportRequest.startDate.getTime()) / 
        (1000 * 60 * 60 * 24)
      );

      if (daysDiff > 90) {
        res.status(400).json({
          success: false,
          message: 'Maximum report range is 90 days'
        });
        return;
      }

      // Generar reporte
      const report = await this.reportService.generateReport(reportRequest, req.user.id);

      // Auditar generación de reporte
      await this.auditService.logActivity({
        action: 'report_generated',
        entityType: 'report',
        entityId: report.id,
        userId: req.user.id,
        companyId: req.user.companyId,
        description: `Reporte generado: ${reportRequest.type}`,
        metadata: {
          type: reportRequest.type,
          format: reportRequest.format,
          dateRange: {
            start: reportRequest.startDate,
            end: reportRequest.endDate
          }
        }
      });

      this.logger.info('Reporte generado exitosamente', {
        reportId: report.id,
        type: reportRequest.type,
        userId: req.user.id,
        companyId: reportRequest.companyId
      });

      // Si el formato no es JSON, enviar como descarga
      if (reportRequest.format !== 'json') {
        res.setHeader('Content-Type', report.contentType);
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${report.filename}"`
        );
        res.send(report.data);
      } else {
        res.status(200).json({
          success: true,
          data: {
            report: report.data,
            metadata: {
              id: report.id,
              type: report.type,
              generatedAt: report.generatedAt,
              generatedBy: req.user.id,
              rowCount: report.rowCount
            }
          }
        });
      }

    } catch (error) {
      this.logger.error('Error al generar reporte', {
        error: error.message,
        userId: req.user?.id,
        reportType: req.body.type
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Obtener reportes disponibles
   * GET /api/reports/available
   */
  getAvailableReports = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const reports = await this.reportService.getAvailableReports(
        req.user.id,
        req.user.companyId,
        req.user.role
      );

      res.status(200).json({
        success: true,
        data: {
          reports
        }
      });

    } catch (error) {
      this.logger.error('Error al obtener reportes disponibles', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Obtener historial de reportes generados
   * GET /api/reports/history
   */
  getReportHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const history = await this.reportService.getUserReportHistory(
        req.user.id,
        req.user.companyId,
        { page, limit }
      );

      res.status(200).json({
        success: true,
        data: {
          reports: history.reports,
          pagination: {
            total: history.total,
            page,
            limit,
            totalPages: Math.ceil(history.total / limit)
          }
        }
      });

    } catch (error) {
      this.logger.error('Error al obtener historial de reportes', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Descargar reporte previamente generado
   * GET /api/reports/:id/download
   */
  downloadReport = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const reportId = req.params.id;

      const report = await this.reportService.getReport(
        reportId,
        req.user.id,
        req.user.companyId
      );

      if (!report) {
        res.status(404).json({
          success: false,
          message: 'Report not found or access denied'
        });
        return;
      }

      // Auditar descarga
      await this.auditService.logActivity({
        action: 'report_downloaded',
        entityType: 'report',
        entityId: reportId,
        userId: req.user.id,
        companyId: req.user.companyId,
        description: 'Reporte descargado'
      });

      res.setHeader('Content-Type', report.contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${report.filename}"`
      );
      res.send(report.data);

    } catch (error) {
      this.logger.error('Error al descargar reporte', {
        error: error.message,
        userId: req.user?.id,
        reportId: req.params.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Programar reporte periódico
   * POST /api/reports/schedule
   */
  scheduleReport = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const schedule = await this.reportService.scheduleReport({
        type: req.body.type,
        frequency: req.body.frequency, // 'daily', 'weekly', 'monthly'
        time: req.body.time,
        dayOfWeek: req.body.dayOfWeek,
        dayOfMonth: req.body.dayOfMonth,
        format: req.body.format || 'pdf',
        recipients: req.body.recipients || [req.user.email],
        filters: req.body.filters || {},
        userId: req.user.id,
        companyId: req.user.companyId
      });

      await this.auditService.logActivity({
        action: 'report_scheduled',
        entityType: 'scheduled_report',
        entityId: schedule.id,
        userId: req.user.id,
        companyId: req.user.companyId,
        description: `Reporte programado: ${req.body.type}`,
        metadata: {
          type: req.body.type,
          frequency: req.body.frequency
        }
      });

      res.status(201).json({
        success: true,
        message: 'Report scheduled successfully',
        data: {
          schedule
        }
      });

    } catch (error) {
      this.logger.error('Error al programar reporte', {
        error: error.message,
        userId: req.user?.id,
        type: req.body.type
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Obtener estadísticas de auditoría
   * GET /api/audit/stats
   */
  getAuditStats = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Últimos 30 días

      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();

      const stats = await this.auditService.getAuditStatistics(
        req.user.companyId,
        startDate,
        endDate
      );

      res.status(200).json({
        success: true,
        data: {
          stats
        }
      });

    } catch (error) {
      this.logger.error('Error al obtener estadísticas de auditoría', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Exportar logs de auditoría
   * POST /api/audit/export
   */
  exportAuditLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const exportRequest = {
        companyId: req.user.companyId,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        format: req.body.format || 'csv',
        filters: req.body.filters || {}
      };

      const exportData = await this.auditService.exportAuditLogs(
        exportRequest,
        req.user.id
      );

      // Auditar exportación
      await this.auditService.logActivity({
        action: 'audit_logs_exported',
        entityType: 'audit_export',
        entityId: exportData.id,
        userId: req.user.id,
        companyId: req.user.companyId,
        description: 'Logs de auditoría exportados',
        metadata: {
          format: exportRequest.format,
          recordCount: exportData.recordCount,
          dateRange: {
            start: exportRequest.startDate,
            end: exportRequest.endDate
          }
        }
      });

      res.setHeader('Content-Type', exportData.contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="audit_logs_${Date.now()}.${exportRequest.format}"`
      );
      res.send(exportData.data);

    } catch (error) {
      this.logger.error('Error al exportar logs de auditoría', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
}
