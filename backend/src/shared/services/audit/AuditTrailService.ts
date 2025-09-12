/**
 * Audit Trail Service - Sprint 2
 * Siguiendo lineamientos nivel 2: servicio para generar audit trails automáticos
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { AuditRepository, AuditLog, AuditContext } from '@/shared/services/audit/AuditService';
import { AuditEventType } from '@/config/audit';
import { StructuredLogger } from '@/shared/services/audit/StructuredLogger';

export interface AuditTrailEntry {
  id: string;
  timestamp: Date;
  type: AuditEventType;
  action: string;
  severity: string;
  userId?: string;
  details: string;
  context: {
    endpoint?: string;
    method?: string;
    ip?: string;
    userAgent?: string;
  };
}

export interface AuditTrailFilter {
  userId?: string;
  companyId?: string;
  startDate?: Date;
  endDate?: Date;
  types?: AuditEventType[];
  actions?: string[];
  severities?: string[];
  endpoints?: string[];
  limit?: number;
  offset?: number;
}

export interface AuditTrailReport {
  entries: AuditTrailEntry[];
  totalCount: number;
  summary: {
    totalEvents: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    byAction: Record<string, number>;
    dateRange: {
      start: Date;
      end: Date;
    };
  };
  filters: AuditTrailFilter;
  generatedAt: Date;
  generatedBy?: string;
}

@injectable()
export class AuditTrailService {
  constructor(
    @inject(TYPES.AuditRepository) private auditRepository: AuditRepository,
    @inject(TYPES.StructuredLogger) private logger: StructuredLogger
  ) {}

  /**
   * Generar audit trail para un usuario específico
   */
  async generateUserAuditTrail(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      types?: AuditEventType[];
      limit?: number;
      includeDetails?: boolean;
    } = {}
  ): Promise<AuditTrailReport> {
    try {
      const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 días por defecto
      const endDate = options.endDate || new Date();
      const limit = options.limit || 1000;

      // Obtener logs de auditoría
      const auditLogs = await this.auditRepository.getAuditTrailForUser(userId, {
        startDate,
        endDate,
        types: options.types,
        limit
      });

      // Convertir a formato de audit trail
      const entries = auditLogs.map(log => this.auditLogToTrailEntry(log, options.includeDetails));

      // Generar estadísticas
      const summary = this.generateSummary(auditLogs, startDate, endDate);

      const report: AuditTrailReport = {
        entries,
        totalCount: auditLogs.length,
        summary,
        filters: {
          userId,
          startDate,
          endDate,
          types: options.types,
          limit
        },
        generatedAt: new Date()
      };

      this.logger.info('User audit trail generated', {
        userId,
        entryCount: entries.length,
        dateRange: { startDate, endDate },
        types: options.types
      });

      return report;
    } catch (error) {
      this.logger.logError(error, 'Failed to generate user audit trail', {
        userId,
        options
      });
      throw error;
    }
  }

  /**
   * Generar audit trail para una empresa
   */
  async generateCompanyAuditTrail(
    companyId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      types?: AuditEventType[];
      userIds?: string[];
      limit?: number;
      includeDetails?: boolean;
    } = {}
  ): Promise<AuditTrailReport> {
    try {
      const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = options.endDate || new Date();

      const filter: AuditTrailFilter = {
        companyId,
        startDate,
        endDate,
        types: options.types,
        limit: options.limit || 5000
      };

      const auditLogs = await this.auditRepository.findByContext({
        companyId
      }, filter.limit);

      // Filtrar por fechas y otros criterios
      const filteredLogs = this.applyFilters(auditLogs, filter);

      const entries = filteredLogs.map(log => this.auditLogToTrailEntry(log, options.includeDetails));
      const summary = this.generateSummary(filteredLogs, startDate, endDate);

      const report: AuditTrailReport = {
        entries,
        totalCount: filteredLogs.length,
        summary,
        filters: filter,
        generatedAt: new Date()
      };

      this.logger.info('Company audit trail generated', {
        companyId,
        entryCount: entries.length,
        dateRange: { startDate, endDate },
        types: options.types
      });

      return report;
    } catch (error) {
      this.logger.logError(error, 'Failed to generate company audit trail', {
        companyId,
        options
      });
      throw error;
    }
  }

  /**
   * Generar audit trail por actividad específica
   */
  async generateActivityAuditTrail(
    filter: AuditTrailFilter
  ): Promise<AuditTrailReport> {
    try {
      let auditLogs: AuditLog[] = [];

      // Buscar por diferentes criterios
      if (filter.startDate && filter.endDate) {
        auditLogs = await this.auditRepository.findByTimeRange(
          filter.startDate,
          filter.endDate,
          filter.limit || 1000
        );
      } else if (filter.types && filter.types.length > 0) {
        // Buscar por tipo principal y combinar resultados
        const typePromises = filter.types.map(type => 
          this.auditRepository.findByType(type, Math.floor((filter.limit || 1000) / filter.types.length))
        );
        const typeResults = await Promise.all(typePromises);
        auditLogs = typeResults.flat();
      } else {
        // Buscar por contexto general
        const context: Partial<AuditContext> = {};
        if (filter.userId) context.userId = filter.userId;
        if (filter.companyId) context.companyId = filter.companyId;

        auditLogs = await this.auditRepository.findByContext(context, filter.limit || 1000);
      }

      // Aplicar filtros adicionales
      const filteredLogs = this.applyFilters(auditLogs, filter);

      const entries = filteredLogs.map(log => this.auditLogToTrailEntry(log, true));
      const summary = this.generateSummary(
        filteredLogs,
        filter.startDate || new Date(Math.min(...filteredLogs.map(l => l.createdAt.getTime()))),
        filter.endDate || new Date(Math.max(...filteredLogs.map(l => l.createdAt.getTime())))
      );

      const report: AuditTrailReport = {
        entries,
        totalCount: filteredLogs.length,
        summary,
        filters: filter,
        generatedAt: new Date()
      };

      this.logger.info('Activity audit trail generated', {
        entryCount: entries.length,
        filters: filter
      });

      return report;
    } catch (error) {
      this.logger.logError(error, 'Failed to generate activity audit trail', {
        filter
      });
      throw error;
    }
  }

  /**
   * Generar audit trail de eventos críticos
   */
  async generateCriticalEventsTrail(
    hours: number = 24,
    includeDetails: boolean = true
  ): Promise<AuditTrailReport> {
    try {
      const auditLogs = await this.auditRepository.findRecentCritical(hours, 500);

      const entries = auditLogs.map(log => this.auditLogToTrailEntry(log, includeDetails));
      const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      const endDate = new Date();
      const summary = this.generateSummary(auditLogs, startDate, endDate);

      const report: AuditTrailReport = {
        entries,
        totalCount: auditLogs.length,
        summary,
        filters: {
          severities: ['critical'],
          startDate,
          endDate,
          limit: 500
        },
        generatedAt: new Date()
      };

      this.logger.info('Critical events audit trail generated', {
        entryCount: entries.length,
        hours,
        criticalEvents: auditLogs.length
      });

      return report;
    } catch (error) {
      this.logger.logError(error, 'Failed to generate critical events trail', {
        hours
      });
      throw error;
    }
  }

  /**
   * Exportar audit trail a diferentes formatos
   */
  async exportAuditTrail(
    report: AuditTrailReport,
    format: 'json' | 'csv' | 'xml' = 'json'
  ): Promise<{ content: string; contentType: string; filename: string }> {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      let content: string;
      let contentType: string;
      let filename: string;

      switch (format) {
        case 'csv':
          content = this.exportToCsv(report);
          contentType = 'text/csv';
          filename = `audit-trail-${timestamp}.csv`;
          break;

        case 'xml':
          content = this.exportToXml(report);
          contentType = 'application/xml';
          filename = `audit-trail-${timestamp}.xml`;
          break;

        case 'json':
        default:
          content = JSON.stringify(report, null, 2);
          contentType = 'application/json';
          filename = `audit-trail-${timestamp}.json`;
          break;
      }

      this.logger.info('Audit trail exported', {
        format,
        entryCount: report.entries.length,
        filename
      });

      return { content, contentType, filename };
    } catch (error) {
      this.logger.logError(error, 'Failed to export audit trail', {
        format,
        entryCount: report.entries.length
      });
      throw error;
    }
  }

  /**
   * Métodos privados
   */
  private auditLogToTrailEntry(log: AuditLog, includeDetails: boolean = true): AuditTrailEntry {
    return {
      id: log.id,
      timestamp: log.createdAt,
      type: log.type,
      action: log.action,
      severity: log.severity,
      userId: log.userId,
      details: this.formatDetails(log, includeDetails),
      context: {
        endpoint: log.endpoint,
        method: log.method,
        ip: log.ip,
        userAgent: log.userAgent
      }
    };
  }

  private formatDetails(log: AuditLog, includeDetails: boolean): string {
    if (!includeDetails) {
      return `${log.type}: ${log.action}`;
    }

    const parts: string[] = [];

    if (log.details) {
      parts.push(`Details: ${JSON.stringify(log.details)}`);
    }

    if (log.error) {
      parts.push(`Error: ${log.error.message}`);
    }

    if (log.performance) {
      parts.push(`Performance: ${log.performance.duration}ms`);
    }

    return parts.join(' | ') || `${log.type}: ${log.action}`;
  }

  private generateSummary(logs: AuditLog[], startDate: Date, endDate: Date) {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byAction: Record<string, number> = {};

    logs.forEach(log => {
      byType[log.type] = (byType[log.type] || 0) + 1;
      bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;
      byAction[log.action] = (byAction[log.action] || 0) + 1;
    });

    return {
      totalEvents: logs.length,
      byType,
      bySeverity,
      byAction,
      dateRange: {
        start: startDate,
        end: endDate
      }
    };
  }

  private applyFilters(logs: AuditLog[], filter: AuditTrailFilter): AuditLog[] {
    return logs.filter(log => {
      // Filtro por fecha
      if (filter.startDate && log.createdAt < filter.startDate) return false;
      if (filter.endDate && log.createdAt > filter.endDate) return false;

      // Filtro por tipo
      if (filter.types && filter.types.length > 0 && !filter.types.includes(log.type)) return false;

      // Filtro por acción
      if (filter.actions && filter.actions.length > 0 && !filter.actions.includes(log.action)) return false;

      // Filtro por severidad
      if (filter.severities && filter.severities.length > 0 && !filter.severities.includes(log.severity)) return false;

      // Filtro por endpoint
      if (filter.endpoints && filter.endpoints.length > 0) {
        if (!log.endpoint || !filter.endpoints.some(endpoint => log.endpoint?.includes(endpoint))) {
          return false;
        }
      }

      return true;
    });
  }

  private exportToCsv(report: AuditTrailReport): string {
    const headers = ['ID', 'Timestamp', 'Type', 'Action', 'Severity', 'User ID', 'Endpoint', 'Method', 'IP', 'Details'];
    const rows = report.entries.map(entry => [
      entry.id,
      entry.timestamp.toISOString(),
      entry.type,
      entry.action,
      entry.severity,
      entry.userId || '',
      entry.context.endpoint || '',
      entry.context.method || '',
      entry.context.ip || '',
      `"${entry.details.replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  private exportToXml(report: AuditTrailReport): string {
    const entries = report.entries.map(entry => `
    <entry>
      <id>${entry.id}</id>
      <timestamp>${entry.timestamp.toISOString()}</timestamp>
      <type>${entry.type}</type>
      <action>${entry.action}</action>
      <severity>${entry.severity}</severity>
      <userId>${entry.userId || ''}</userId>
      <endpoint>${entry.context.endpoint || ''}</endpoint>
      <method>${entry.context.method || ''}</method>
      <ip>${entry.context.ip || ''}</ip>
      <details><![CDATA[${entry.details}]]></details>
    </entry>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<auditTrail>
  <metadata>
    <totalCount>${report.totalCount}</totalCount>
    <generatedAt>${report.generatedAt.toISOString()}</generatedAt>
  </metadata>
  <entries>${entries}
  </entries>
</auditTrail>`;
  }
}
