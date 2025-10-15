/**
 * Audit Service
 * Sprint 3 - Backend Team
 * ImplementaciÃ³n siguiendo lineamientos Nivel 2: SOLID, Clean Code, InversiÃ³n de Dependencias
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { IAuditRepository } from '@/shared/interfaces/repositories/IAuditRepository';

// DTOs siguiendo principio de responsabilidad Ãºnica
export interface AuditLogRequest {
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  companyId?: string;
  description?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface AuditLogResponse {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  companyId?: string;
  description?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  timestamp: Date;
  createdAt: Date;
}

export interface AuditQueryFilters {
  userId?: string;
  companyId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditAnalyticsRequest {
  companyId?: string;
  startDate: Date;
  endDate: Date;
  groupBy?: 'action' | 'entityType' | 'user' | 'day';
}

export interface AuditAnalyticsResponse {
  period: {
    start: Date;
    end: Date;
  };
  totalEvents: number;
  topActions: Array<{
    action: string;
    count: number;
    percentage: number;
  }>;
  topUsers: Array<{
    userId: string;
    userName?: string;
    count: number;
    percentage: number;
  }>;
  entityBreakdown: Array<{
    entityType: string;
    count: number;
    percentage: number;
  }>;
  timeline?: Array<{
    date: string;
    count: number;
  }>;
}

/**
 * AuditService implementa trazabilidad completa del sistema
 * Principios SOLID aplicados:
 * - S: Responsabilidad Ãºnica para gestiÃ³n de auditorÃ­a
 * - O: Abierto para extensiÃ³n (nuevos tipos de eventos) cerrado para modificaciÃ³n
 * - L: Sustituible por cualquier implementaciÃ³n que respete la interfaz
 * - I: SegregaciÃ³n de interfaces (especÃ­fica para auditorÃ­a)
 * - D: InversiÃ³n de dependencias (inyecciÃ³n de dependencias)
 */
@injectable()
export class AuditService {
  constructor(
    @inject(TYPES.AuditRepository) private auditRepository: IAuditRepository,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Registrar actividad en el sistema
   * Clean Code: funciÃ³n con responsabilidad Ãºnica y nombre descriptivo
   */
  async logActivity(request: AuditLogRequest): Promise<AuditLogResponse> {
    try {

      // Enriquecer con timestamp
      const auditData = {
        ...request,
        timestamp: new Date(),
        // Sanitizar metadata para evitar informaciÃ³n sensible
        metadata: this.sanitizeMetadata(request.metadata)
      };


      // Persistir el evento de auditorÃ­a
      const auditLog = await this.auditRepository.create(auditData);

      // Log estructurado para observabilidad
      this.logger.info('Evento de auditorÃ­a registrado', {
        auditId: auditLog.id,
        action: request.action,
        entityType: request.entityType,
        entityId: request.entityId,
        userId: request.userId,
        companyId: request.companyId
      });

      const response = this.mapToResponse(auditLog);

      return response;
    } catch (error) {

      this.logger.error('Error al registrar evento de auditorÃ­a', {
        error: error instanceof Error ? error.message : 'Unknown',
        request: {
          ...request,
          metadata: request.metadata ? 'presente' : 'ausente'
        }
      });
      throw error;
    }
  }

  /**
   * Registrar mÃºltiples actividades en batch
   * OptimizaciÃ³n para operaciones masivas
   */
  async logBatchActivities(requests: AuditLogRequest[]): Promise<AuditLogResponse[]> {
    try {
      const enrichedRequests = requests.map(request => ({
        ...request,
        timestamp: new Date(),
        metadata: this.sanitizeMetadata(request.metadata)
      }));

      const auditLogs = await this.auditRepository.createBatch(enrichedRequests);

      this.logger.info('Eventos de auditorÃ­a en batch registrados', {
        count: requests.length
      });

      return auditLogs.map(log => this.mapToResponse(log));
    } catch (error) {
      this.logger.error('Error al registrar eventos en batch', {
        error: error.message,
        count: requests.length
      });
      throw error;
    }
  }

  /**
   * Obtener historial de auditorÃ­a con filtros
   */
  async getAuditHistory(filters: AuditQueryFilters): Promise<{
    logs: AuditLogResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const result = await this.auditRepository.findWithFilters(filters);

      this.logger.debug('Historial de auditorÃ­a consultado', {
        filters,
        resultCount: result.logs.length,
        total: result.total
      });

      return {
        logs: result.logs.map(log => this.mapToResponse(log)),
        total: result.total,
        page: Math.floor((filters.offset || 0) / (filters.limit || 10)) + 1,
        limit: filters.limit || 10
      };
    } catch (error) {
      this.logger.error('Error al obtener historial de auditorÃ­a', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Obtener eventos de auditorÃ­a para una entidad especÃ­fica
   */
  async getEntityAuditTrail(
    entityType: string,
    entityId: string,
    limit?: number
  ): Promise<AuditLogResponse[]> {
    try {
      const logs = await this.auditRepository.findByEntity(entityType, entityId, limit);

      this.logger.debug('Trail de auditorÃ­a de entidad consultado', {
        entityType,
        entityId,
        count: logs.length
      });

      return logs.map(log => this.mapToResponse(log));
    } catch (error) {
      this.logger.error('Error al obtener trail de auditorÃ­a de entidad', {
        error: error.message,
        entityType,
        entityId
      });
      throw error;
    }
  }

  /**
   * Obtener actividad de un usuario especÃ­fico
   */
  async getUserActivity(
    userId: string,
    companyId?: string,
    filters?: Partial<AuditQueryFilters>
  ): Promise<AuditLogResponse[]> {
    try {
      const queryFilters: AuditQueryFilters = {
        ...filters,
        userId,
        companyId
      };

      const result = await this.auditRepository.findWithFilters(queryFilters);

      this.logger.debug('Actividad de usuario consultada', {
        userId,
        companyId,
        count: result.logs.length
      });

      return result.logs.map(log => this.mapToResponse(log));
    } catch (error) {
      this.logger.error('Error al obtener actividad de usuario', {
        error: error.message,
        userId,
        companyId
      });
      throw error;
    }
  }

  /**
   * Generar analytics de auditorÃ­a
   */
  async getAuditAnalytics(request: AuditAnalyticsRequest): Promise<AuditAnalyticsResponse> {
    try {
      const analytics = await this.auditRepository.getAnalytics(request);

      this.logger.debug('Analytics de auditorÃ­a generados', {
        request,
        totalEvents: analytics.totalEvents
      });

      return analytics;
    } catch (error) {
      this.logger.error('Error al generar analytics de auditorÃ­a', {
        error: error.message,
        request
      });
      throw error;
    }
  }

  /**
   * Detectar actividad sospechosa
   * ImplementaciÃ³n bÃ¡sica - se puede extender con ML
   */
  async detectSuspiciousActivity(
    companyId?: string,
    timeWindowHours: number = 24
  ): Promise<Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    events: AuditLogResponse[];
  }>> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - timeWindowHours);

      const logs = await this.auditRepository.findWithFilters({
        companyId,
        startDate,
        endDate,
        limit: 10000 // Analizar Ãºltimos 10k eventos
      });

      const suspiciousActivities = this.analyzeSuspiciousPatterns(logs.logs);

      this.logger.info('AnÃ¡lisis de actividad sospechosa completado', {
        companyId,
        timeWindowHours,
        eventsAnalyzed: logs.logs.length,
        suspiciousActivitiesFound: suspiciousActivities.length
      });

      return suspiciousActivities;
    } catch (error) {
      this.logger.error('Error al detectar actividad sospechosa', {
        error: error.message,
        companyId,
        timeWindowHours
      });
      throw error;
    }
  }

  /**
   * Exportar logs de auditorÃ­a
   */
  async exportAuditLogs(
    filters: AuditQueryFilters,
    format: 'csv' | 'json' | 'xlsx' = 'csv'
  ): Promise<{ id: string; data: Buffer; recordCount: number; contentType: string }> {
    try {
      const result = await this.auditRepository.findWithFilters({
        ...filters,
        limit: 100000 // Límite alto para exportación
      });

      const exportData = result.logs.map(log => this.mapToResponse(log));

      // Generar export según formato
      let exportBuffer: Buffer;
      switch (format) {
        case 'json':
          exportBuffer = Buffer.from(JSON.stringify(exportData, null, 2));
          break;
        case 'csv':
          exportBuffer = this.generateCSVExport(exportData);
          break;
        case 'xlsx':
          exportBuffer = await this.generateXLSXExport(exportData);
          break;
        default:
          throw new Error('Formato de exportación no soportado');
      }

      this.logger.info('Export de auditoría generado', {
        format,
        recordCount: exportData.length,
        sizeBytes: exportBuffer.length
      });

      return {
        id: `audit_export_${Date.now()}`,
        data: exportBuffer,
        recordCount: exportData.length,
        contentType: this.getContentTypeForFormat(format)
      };
    } catch (error) {
      this.logger.error('Error al exportar logs de auditorÃ­a', {
        error: error.message,
        filters,
        format
      });
      throw error;
    }
  }

    /**
   * Obtener estadísticas agregadas de auditoría
   */
  async getAuditStatistics(
    companyId: string | undefined,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalEvents: number;
    uniqueUsers: number;
    topActions: Array<{ action: string; count: number }>;
    dailyActivity: Array<{ date: string; count: number }>;
  }> {
    return this.auditRepository.getActivityStats(startDate, endDate, companyId);
  }
// ==================== MÃ‰TODOS PRIVADOS ====================

  /**
   * Sanitizar metadata para remover informaciÃ³n sensible
   */
  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) {
      return undefined;
    }

    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'creditCard', 'ssn'];
    const sanitized = { ...metadata };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Mapear entidad a DTO de respuesta
   */
  private mapToResponse(auditLog: any): AuditLogResponse {
    return {
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      userId: auditLog.userId,
      companyId: auditLog.companyId,
      description: auditLog.description,
      metadata: auditLog.metadata,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      sessionId: auditLog.sessionId,
      timestamp: auditLog.timestamp,
      createdAt: auditLog.createdAt
    };
  }

  /**
   * Analizar patrones sospechosos bÃ¡sicos
   */
  private analyzeSuspiciousPatterns(logs: any[]): Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    events: AuditLogResponse[];
  }> {
    const suspicious: any[] = [];

    // Detectar mÃºltiples intentos de login fallidos
    const failedLogins = logs.filter(log => log.action === 'login_failed');
    const loginAttemptsByUser = this.groupBy(failedLogins, 'userId');

    for (const [userId, attempts] of Object.entries(loginAttemptsByUser)) {
      if ((attempts as any[]).length >= 5) {
        suspicious.push({
          type: 'multiple_failed_logins',
          description: `Usuario ${userId} con ${(attempts as any[]).length} intentos de login fallidos`,
          severity: 'high' as const,
          events: (attempts as any[]).map(log => this.mapToResponse(log))
        });
      }
    }

    // Detectar actividad fuera de horario
    const outsideHours = logs.filter(log => {
      const hour = new Date(log.timestamp).getHours();
      return hour < 6 || hour > 22; // Fuera de 6 AM - 10 PM
    });

    if (outsideHours.length > 10) {
      suspicious.push({
        type: 'activity_outside_hours',
        description: `${outsideHours.length} eventos fuera de horario laboral`,
        severity: 'medium' as const,
        events: outsideHours.slice(0, 20).map(log => this.mapToResponse(log))
      });
    }

    return suspicious;
  }

  /**
   * Agrupar elementos por una propiedad
   */
  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const value = String(item[key]);
      return {
        ...groups,
        [value]: [...(groups[value] || []), item]
      };
    }, {} as Record<string, T[]>);
  }

  /**
   * Generar export CSV
   */
    private getContentTypeForFormat(format: 'csv' | 'json' | 'xlsx'): string {
    switch (format) {
      case 'json':
        return 'application/json';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      default:
        return 'text/csv';
    }
  }
private generateCSVExport(data: AuditLogResponse[]): Buffer {
    if (data.length === 0) {
      return Buffer.from('');
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(record => 
      Object.values(record).map(value => 
        typeof value === 'object' ? JSON.stringify(value) : String(value)
      ).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    return Buffer.from(csv);
  }

  /**
   * Generar export XLSX (implementaciÃ³n bÃ¡sica)
   */
  private async generateXLSXExport(data: AuditLogResponse[]): Promise<Buffer> {
    // ImplementaciÃ³n bÃ¡sica - en producciÃ³n usar librerÃ­a como xlsx
    const json = JSON.stringify(data, null, 2);
    return Buffer.from(json);
  }
}






