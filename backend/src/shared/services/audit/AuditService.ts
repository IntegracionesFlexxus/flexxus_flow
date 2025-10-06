/**
 * Audit Service
 * Sprint 3 - Backend Team
 * Implementación siguiendo lineamientos Nivel 2: SOLID, Clean Code, Inversión de Dependencias
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { IAuditRepository } from '@/shared/interfaces/repositories/IAuditRepository';

// DTOs siguiendo principio de responsabilidad única
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
 * - S: Responsabilidad única para gestión de auditoría
 * - O: Abierto para extensión (nuevos tipos de eventos) cerrado para modificación
 * - L: Sustituible por cualquier implementación que respete la interfaz
 * - I: Segregación de interfaces (específica para auditoría)
 * - D: Inversión de dependencias (inyección de dependencias)
 */
@injectable()
export class AuditService {
  constructor(
    @inject(TYPES.AuditRepository) private auditRepository: IAuditRepository,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Registrar actividad en el sistema
   * Clean Code: función con responsabilidad única y nombre descriptivo
   */
  async logActivity(request: AuditLogRequest): Promise<AuditLogResponse> {
    try {
      console.log('🟡 [AuditService.logActivity] START');
      console.log('🟡 [AuditService.logActivity] request:', JSON.stringify(request, null, 2));

      // Enriquecer con timestamp
      const auditData = {
        ...request,
        timestamp: new Date(),
        // Sanitizar metadata para evitar información sensible
        metadata: this.sanitizeMetadata(request.metadata)
      };

      console.log('🟡 [AuditService.logActivity] auditData:', JSON.stringify(auditData, null, 2));
      console.log('🟡 [AuditService.logActivity] companyId type:', typeof auditData.companyId);

      // Persistir el evento de auditoría
      console.log('🟡 [AuditService.logActivity] Creating audit log...');
      const auditLog = await this.auditRepository.create(auditData);
      console.log('🟡 [AuditService.logActivity] auditLog created:', JSON.stringify(auditLog, null, 2));

      // Log estructurado para observabilidad
      this.logger.info('Evento de auditoría registrado', {
        auditId: auditLog.id,
        action: request.action,
        entityType: request.entityType,
        entityId: request.entityId,
        userId: request.userId,
        companyId: request.companyId
      });

      const response = this.mapToResponse(auditLog);
      console.log('🟡 [AuditService.logActivity] response:', JSON.stringify(response, null, 2));

      return response;
    } catch (error) {
      console.error('🔴 [AuditService.logActivity] ERROR:', error);
      console.error('🔴 [AuditService.logActivity] ERROR message:', error instanceof Error ? error.message : 'Unknown');
      console.error('🔴 [AuditService.logActivity] ERROR stack:', error instanceof Error ? error.stack : 'No stack');

      this.logger.error('Error al registrar evento de auditoría', {
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
   * Registrar múltiples actividades en batch
   * Optimización para operaciones masivas
   */
  async logBatchActivities(requests: AuditLogRequest[]): Promise<AuditLogResponse[]> {
    try {
      const enrichedRequests = requests.map(request => ({
        ...request,
        timestamp: new Date(),
        metadata: this.sanitizeMetadata(request.metadata)
      }));

      const auditLogs = await this.auditRepository.createBatch(enrichedRequests);

      this.logger.info('Eventos de auditoría en batch registrados', {
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
   * Obtener historial de auditoría con filtros
   */
  async getAuditHistory(filters: AuditQueryFilters): Promise<{
    logs: AuditLogResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const result = await this.auditRepository.findWithFilters(filters);

      this.logger.debug('Historial de auditoría consultado', {
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
      this.logger.error('Error al obtener historial de auditoría', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Obtener eventos de auditoría para una entidad específica
   */
  async getEntityAuditTrail(
    entityType: string,
    entityId: string,
    limit?: number
  ): Promise<AuditLogResponse[]> {
    try {
      const logs = await this.auditRepository.findByEntity(entityType, entityId, limit);

      this.logger.debug('Trail de auditoría de entidad consultado', {
        entityType,
        entityId,
        count: logs.length
      });

      return logs.map(log => this.mapToResponse(log));
    } catch (error) {
      this.logger.error('Error al obtener trail de auditoría de entidad', {
        error: error.message,
        entityType,
        entityId
      });
      throw error;
    }
  }

  /**
   * Obtener actividad de un usuario específico
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
   * Generar analytics de auditoría
   */
  async getAuditAnalytics(request: AuditAnalyticsRequest): Promise<AuditAnalyticsResponse> {
    try {
      const analytics = await this.auditRepository.getAnalytics(request);

      this.logger.debug('Analytics de auditoría generados', {
        request,
        totalEvents: analytics.totalEvents
      });

      return analytics;
    } catch (error) {
      this.logger.error('Error al generar analytics de auditoría', {
        error: error.message,
        request
      });
      throw error;
    }
  }

  /**
   * Detectar actividad sospechosa
   * Implementación básica - se puede extender con ML
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
        limit: 10000 // Analizar últimos 10k eventos
      });

      const suspiciousActivities = this.analyzeSuspiciousPatterns(logs.logs);

      this.logger.info('Análisis de actividad sospechosa completado', {
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
   * Exportar logs de auditoría
   */
  async exportAuditLogs(
    filters: AuditQueryFilters,
    format: 'csv' | 'json' | 'xlsx' = 'csv'
  ): Promise<Buffer> {
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

      return exportBuffer;
    } catch (error) {
      this.logger.error('Error al exportar logs de auditoría', {
        error: error.message,
        filters,
        format
      });
      throw error;
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Sanitizar metadata para remover información sensible
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
   * Analizar patrones sospechosos básicos
   */
  private analyzeSuspiciousPatterns(logs: any[]): Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    events: AuditLogResponse[];
  }> {
    const suspicious: any[] = [];

    // Detectar múltiples intentos de login fallidos
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
   * Generar export XLSX (implementación básica)
   */
  private async generateXLSXExport(data: AuditLogResponse[]): Promise<Buffer> {
    // Implementación básica - en producción usar librería como xlsx
    const json = JSON.stringify(data, null, 2);
    return Buffer.from(json);
  }
}
