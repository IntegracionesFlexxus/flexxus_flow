/**
 * Audit Repository Interface
 * Sprint 3 - Backend Team
 * Definición de contrato para repositorio de auditoría siguiendo principios SOLID
 */
export interface AuditLogData {
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
export interface IAuditRepository {
  // ==================== OPERACIONES BÁSICAS CRUD ====================
  /**
   * Crear registro de auditoría
   */
  create(auditData: AuditLogData): Promise<any>;
  /**
   * Crear múltiples registros de auditoría en batch
   */
  createBatch(auditData: AuditLogData[]): Promise<any[]>;
  /**
   * Buscar registro por ID
   */
  findById(auditId: string): Promise<any | null>;
  // ==================== CONSULTAS ESPECÍFICAS ====================
  /**
   * Buscar registros con filtros y paginación
   */
  findWithFilters(filters: AuditQueryFilters): Promise<{
    logs: any[];
    total: number;
  }>;
  /**
   * Buscar registros por entidad específica
   */
  findByEntity(
    entityType: string, 
    entityId: string, 
    limit?: number
  ): Promise<any[]>;
  /**
   * Buscar registros por usuario
   */
  findByUser(
    userId: string,
    companyId?: string,
    limit?: number,
    offset?: number
  ): Promise<any[]>;
  /**
   * Buscar registros por acción
   */
  findByAction(
    action: string,
    companyId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]>;
  /**
   * Buscar registros por empresa
   */
  findByCompany(
    companyId: string,
    startDate?: Date,
    endDate?: Date,
    limit?: number,
    offset?: number
  ): Promise<any[]>;
  /**
   * Buscar registros por rango de fechas
   */
  findByDateRange(
    startDate: Date,
    endDate: Date,
    filters?: Partial<AuditQueryFilters>
  ): Promise<any[]>;
  // ==================== ANALYTICS Y REPORTES ====================
  /**
   * Generar analytics de auditoría
   */
  getAnalytics(request: AuditAnalyticsRequest): Promise<AuditAnalyticsResponse>;
  /**
   * Obtener estadísticas de actividad por período
   */
  getActivityStats(
    startDate: Date,
    endDate: Date,
    companyId?: string
  ): Promise<{
    totalEvents: number;
    uniqueUsers: number;
    topActions: Array<{ action: string; count: number }>;
    dailyActivity: Array<{ date: string; count: number }>;
  }>;
  /**
   * Obtener resumen de actividad de usuario
   */
  getUserActivitySummary(
    userId: string,
    companyId?: string,
    days?: number
  ): Promise<{
    totalActions: number;
    lastActivity: Date | null;
    topActions: Array<{ action: string; count: number }>;
    activityByDay: Array<{ date: string; count: number }>;
  }>;
  // ==================== MANTENIMIENTO Y LIMPIEZA ====================
  /**
   * Contar registros por filtros
   */
  count(filters?: Partial<AuditQueryFilters>): Promise<number>;
  /**
   * Eliminar registros antiguos (data retention)
   */
  deleteOldRecords(
    olderThanDays: number,
    companyId?: string
  ): Promise<number>;
  /**
   * Archivar registros antiguos
   */
  archiveOldRecords(
    olderThanDays: number,
    companyId?: string
  ): Promise<number>;
  /**
   * Optimizar índices y performance
   */
  optimizeIndexes(): Promise<void>;
  // ==================== CONSULTAS ESPECIALIZADAS ====================
  /**
   * Buscar patrones sospechosos
   */
  findSuspiciousPatterns(
    companyId?: string,
    timeWindowHours?: number
  ): Promise<{
    multipleFailedLogins: any[];
    outsideHoursActivity: any[];
    rapidActions: any[];
    unusualLocations: any[];
  }>;
  /**
   * Obtener trail completo de una entidad
   */
  getEntityTimeline(
    entityType: string,
    entityId: string
  ): Promise<any[]>;
  /**
   * Buscar eventos relacionados
   */
  findRelatedEvents(
    auditId: string,
    timeWindowMinutes?: number
  ): Promise<any[]>;
  /**
   * Exportar datos para compliance
   */
  exportForCompliance(
    startDate: Date,
    endDate: Date,
    companyId?: string,
    format?: 'json' | 'csv'
  ): Promise<any[]>;
}
