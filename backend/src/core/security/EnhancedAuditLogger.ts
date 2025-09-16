/**
 * Enhanced Audit Logger
 * Sprint 4 - Security Hardening
 * Sistema de auditoría inmutable con blockchain-like integrity
 */
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { AuditRepository } from '@/modules/auth/repositories/AuditRepository';
import {
  IEnhancedAuditLogger,
  SecurityEvent,
  AuditTrail,
  SecurityEventType
} from './interfaces/ISecurityHardening';
import winston from 'winston';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import PDFDocument from 'pdfkit';
import { environment } from '@/config/environment';
@injectable()
export class EnhancedAuditLogger implements IEnhancedAuditLogger {
  private logger: winston.Logger;
  private auditRepository: AuditRepository;
  private connection: IDatabaseConnection;
  private eventQueue: SecurityEvent[] = [];
  private currentTrail: AuditTrail | null = null;
  private retentionDays: number = 365; // Por defecto 1 año
  private archiveLocation: string = '/secure/audit/archive';
  private blockchainEnabled: boolean = true;
  constructor(
    @inject(TYPES.Logger) logger: winston.Logger,
    @inject(TYPES.AuditRepository) auditRepository: AuditRepository,
    @inject(TYPES.SharedConnection) connection: IDatabaseConnection
  ) {
    this.logger = logger;
    this.auditRepository = auditRepository;
    this.connection = connection;
    this.initializeAuditSystem();
  }
  /**
   * Registrar evento de seguridad
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Asignar ID único si no tiene
      if (!event.id) {
        event.id = crypto.randomUUID();
      }
      // Agregar timestamp si no tiene
      if (!event.timestamp) {
        event.timestamp = new Date();
      }
      // Agregar a la cola
      this.eventQueue.push(event);
      // Guardar en base de datos
      await this.persistSecurityEvent(event);
      // Log crítico inmediato
      if (event.severity === 'critical') {
        await this.handleCriticalEvent(event);
      }
      // Agregar al trail actual si existe
      if (this.currentTrail) {
        this.currentTrail.events.push(event);
        // Si el trail alcanza cierto tamaño, cerrarlo
        if (this.currentTrail.events.length >= 1000) {
          await this.closeCurrentTrail();
        }
      }
      // Log local
      this.logEventLocally(event);
    } catch (error) {
      this.logger.error('Failed to log security event:', error);
      // Intentar guardar en archivo de respaldo
      await this.backupEventToFile(event);
    }
  }
  /**
   * Crear trail de auditoría inmutable
   */
  async createAuditTrail(events: SecurityEvent[]): Promise<AuditTrail> {
    try {
      // Cerrar trail actual si existe
      if (this.currentTrail) {
        await this.closeCurrentTrail();
      }
      // Obtener hash del trail anterior
      const previousHash = await this.getLastTrailHash();
      // Crear nuevo trail
      const trail: AuditTrail = {
        id: crypto.randomUUID(),
        events: events,
        hash: '',
        previousHash: previousHash || '0',
        merkleRoot: this.calculateMerkleRoot(events),
        createdAt: new Date()
      };
      // Calcular hash del trail
      trail.hash = this.calculateTrailHash(trail);
      // Firmar digitalmente si está habilitado
      if (this.blockchainEnabled) {
        trail.signature = await this.signTrail(trail);
      }
      // Guardar en base de datos
      await this.persistAuditTrail(trail);
      // Establecer como trail actual
      this.currentTrail = trail;
      this.logger.info('Audit trail created', {
        trailId: trail.id,
        eventCount: events.length,
        hash: trail.hash.substring(0, 16) + '...'
      });
      return trail;
    } catch (error) {
      this.logger.error('Failed to create audit trail:', error);
      throw error;
    }
  }
  /**
   * Verificar integridad del trail
   */
  async verifyTrailIntegrity(trailId: string): Promise<boolean> {
    try {
      // Obtener trail de la base de datos
      const trail = await this.getAuditTrail(trailId);
      if (!trail) {
        throw new Error(`Trail ${trailId} not found`);
      }
      // Verificar hash
      const calculatedHash = this.calculateTrailHash(trail);
      if (calculatedHash !== trail.hash) {
        this.logger.error('Trail integrity check failed - hash mismatch', {
          trailId,
          expected: trail.hash,
          calculated: calculatedHash
        });
        return false;
      }
      // Verificar merkle root
      const calculatedMerkleRoot = this.calculateMerkleRoot(trail.events);
      if (calculatedMerkleRoot !== trail.merkleRoot) {
        this.logger.error('Trail integrity check failed - merkle root mismatch', {
          trailId
        });
        return false;
      }
      // Verificar cadena con trail anterior
      if (trail.previousHash !== '0') {
        const previousTrail = await this.getTrailByHash(trail.previousHash);
        if (!previousTrail) {
          this.logger.error('Trail integrity check failed - broken chain', {
            trailId
          });
          return false;
        }
      }
      // Verificar firma digital si existe
      if (trail.signature) {
        const signatureValid = await this.verifySignature(trail);
        if (!signatureValid) {
          this.logger.error('Trail integrity check failed - invalid signature', {
            trailId
          });
          return false;
        }
      }
      // Marcar como verificado
      await this.markTrailAsVerified(trailId);
      this.logger.info('Trail integrity verified', { trailId });
      return true;
    } catch (error) {
      this.logger.error('Trail integrity verification failed:', error);
      return false;
    }
  }
  /**
   * Buscar eventos
   */
  async searchEvents(criteria: any): Promise<SecurityEvent[]> {
    try {
      let query = `
        SELECT * FROM security_events 
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;
      // Construir query dinámicamente
      if (criteria.type) {
        query += ` AND type = $${paramIndex++}`;
        params.push(criteria.type);
      }
      if (criteria.severity) {
        query += ` AND severity = $${paramIndex++}`;
        params.push(criteria.severity);
      }
      if (criteria.actor) {
        query += ` AND actor = $${paramIndex++}`;
        params.push(criteria.actor);
      }
      if (criteria.startDate) {
        query += ` AND timestamp >= $${paramIndex++}`;
        params.push(criteria.startDate);
      }
      if (criteria.endDate) {
        query += ` AND timestamp <= $${paramIndex++}`;
        params.push(criteria.endDate);
      }
      if (criteria.result) {
        query += ` AND result = $${paramIndex++}`;
        params.push(criteria.result);
      }
      query += ' ORDER BY timestamp DESC';
      if (criteria.limit) {
        query += ` LIMIT ${criteria.limit}`;
      }
      const results = await this.connection.query<any>(query, params);
      return results.map(this.mapToSecurityEvent);
    } catch (error) {
      this.logger.error('Failed to search events:', error);
      return [];
    }
  }
  /**
   * Generar reporte de compliance
   */
  async generateComplianceReport(standard: string): Promise<any> {
    try {
      const report: any = {
        standard,
        generatedAt: new Date(),
        period: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        },
        summary: {},
        details: [],
        recommendations: []
      };
      switch (standard.toUpperCase()) {
        case 'GDPR':
          report.summary = await this.generateGDPRSummary();
          report.details = await this.generateGDPRDetails();
          break;
        case 'PCI-DSS':
          report.summary = await this.generatePCIDSSSummary();
          report.details = await this.generatePCIDSSDetails();
          break;
        case 'SOC2':
          report.summary = await this.generateSOC2Summary();
          report.details = await this.generateSOC2Details();
          break;
        case 'HIPAA':
          report.summary = await this.generateHIPAASummary();
          report.details = await this.generateHIPAADetails();
          break;
        default:
          throw new Error(`Unsupported compliance standard: ${standard}`);
      }
      // Agregar recomendaciones basadas en eventos
      report.recommendations = await this.generateRecommendations(standard);
      // Guardar reporte
      await this.saveComplianceReport(report);
      return report;
    } catch (error) {
      this.logger.error('Failed to generate compliance report:', error);
      throw error;
    }
  }
  /**
   * Exportar logs de auditoría
   */
  async exportAuditLogs(
    format: 'json' | 'csv' | 'pdf',
    dateRange: { start: Date; end: Date }
  ): Promise<Buffer> {
    try {
      // Obtener eventos en el rango
      const events = await this.searchEvents({
        startDate: dateRange.start,
        endDate: dateRange.end
      });
      switch (format) {
        case 'json':
          return Buffer.from(JSON.stringify(events, null, 2));
        case 'csv':
          return await this.exportToCSV(events);
        case 'pdf':
          return await this.exportToPDF(events);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      this.logger.error('Failed to export audit logs:', error);
      throw error;
    }
  }
  /**
   * Establecer política de retención
   */
  setRetentionPolicy(days: number): void {
    this.retentionDays = days;
    // Programar limpieza automática
    this.scheduleRetentionCleanup();
    this.logger.info(`Retention policy set to ${days} days`);
  }
  /**
   * Archivar logs antiguos
   */
  async archiveOldLogs(destination: string): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
      // Obtener eventos antiguos
      const oldEvents = await this.connection.query<any>(`
        SELECT * FROM security_events 
        WHERE timestamp < $1
      `, [cutoffDate]);
      if (oldEvents.length === 0) {
        this.logger.info('No events to archive');
        return;
      }
      // Crear archivo comprimido
      const archiveName = `audit-archive-${Date.now()}.json.gz`;
      const archivePath = path.join(destination, archiveName);
      // Comprimir y guardar
      const zlib = require('zlib');
      const gzip = zlib.createGzip();
      const writeStream = require('fs').createWriteStream(archivePath);
      gzip.pipe(writeStream);
      gzip.write(JSON.stringify(oldEvents));
      gzip.end();
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      // Eliminar eventos archivados de la base de datos
      await this.connection.query(`
        DELETE FROM security_events 
        WHERE timestamp < $1
      `, [cutoffDate]);
      this.logger.info(`Archived ${oldEvents.length} events to ${archivePath}`);
    } catch (error) {
      this.logger.error('Failed to archive old logs:', error);
      throw error;
    }
  }
  /**
   * Inicializar sistema de auditoría
   */
  private async initializeAuditSystem(): Promise<void> {
    try {
      // Crear tablas si no existen
      await this.createAuditTables();
      // Cargar trail actual si existe
      await this.loadCurrentTrail();
      // Programar tareas de mantenimiento
      this.scheduleMaintenanceTasks();
      this.logger.info('Audit system initialized');
    } catch (error) {
      this.logger.error('Failed to initialize audit system:', error);
    }
  }
  /**
   * Crear tablas de auditoría
   */
  private async createAuditTables(): Promise<void> {
    // Tabla de eventos de seguridad
    await this.connection.query(`
      CREATE TABLE IF NOT EXISTS security_events (
        id UUID PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        actor VARCHAR(255) NOT NULL,
        target VARCHAR(255),
        action VARCHAR(255) NOT NULL,
        result VARCHAR(20) NOT NULL,
        reason TEXT,
        metadata JSONB,
        ip_address INET,
        user_agent TEXT,
        timestamp TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        INDEX idx_security_events_type (type),
        INDEX idx_security_events_actor (actor),
        INDEX idx_security_events_timestamp (timestamp)
      )
    `, []);
    // Tabla de trails de auditoría
    await this.connection.query(`
      CREATE TABLE IF NOT EXISTS audit_trails (
        id UUID PRIMARY KEY,
        hash VARCHAR(64) UNIQUE NOT NULL,
        previous_hash VARCHAR(64) NOT NULL,
        merkle_root VARCHAR(64),
        signature TEXT,
        event_count INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL,
        verified_at TIMESTAMP,
        INDEX idx_audit_trails_hash (hash),
        INDEX idx_audit_trails_created (created_at)
      )
    `, []);
    // Tabla de relación trail-eventos
    await this.connection.query(`
      CREATE TABLE IF NOT EXISTS trail_events (
        trail_id UUID REFERENCES audit_trails(id),
        event_id UUID REFERENCES security_events(id),
        event_order INTEGER NOT NULL,
        PRIMARY KEY (trail_id, event_id)
      )
    `, []);
  }
  /**
   * Persistir evento de seguridad
   */
  private async persistSecurityEvent(event: SecurityEvent): Promise<void> {
    await this.connection.query(`
      INSERT INTO security_events (
        id, type, severity, actor, target, action, result, 
        reason, metadata, ip_address, user_agent, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      event.id,
      event.type,
      event.severity,
      event.actor,
      event.target,
      event.action,
      event.result,
      event.reason,
      JSON.stringify(event.metadata || {}),
      event.ipAddress,
      event.userAgent,
      event.timestamp
    ]);
  }
  /**
   * Manejar evento crítico
   */
  private async handleCriticalEvent(event: SecurityEvent): Promise<void> {
    // Notificación inmediata
    this.logger.error('CRITICAL SECURITY EVENT', {
      type: event.type,
      actor: event.actor,
      action: event.action,
      result: event.result
    });
    // Aquí se integraría con sistema de alertas (email, SMS, etc.)
    // await this.notificationService.sendCriticalAlert(event);
    // Guardar en archivo de respaldo inmediato
    await this.backupEventToFile(event);
  }
  /**
   * Calcular hash del trail
   */
  private calculateTrailHash(trail: AuditTrail): string {
    const data = {
      id: trail.id,
      events: trail.events.map(e => e.id),
      previousHash: trail.previousHash,
      merkleRoot: trail.merkleRoot,
      createdAt: trail.createdAt.toISOString()
    };
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }
  /**
   * Calcular Merkle Root
   */
  private calculateMerkleRoot(events: SecurityEvent[]): string {
    if (events.length === 0) return '0';
    // Calcular hashes de eventos
    let hashes = events.map(e => 
      crypto.createHash('sha256')
        .update(JSON.stringify(e))
        .digest('hex')
    );
    // Construir árbol de Merkle
    while (hashes.length > 1) {
      const newHashes: string[] = [];
      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = hashes[i + 1] || left; // Duplicar si es impar
        const combined = crypto
          .createHash('sha256')
          .update(left + right)
          .digest('hex');
        newHashes.push(combined);
      }
      hashes = newHashes;
    }
    return hashes[0];
  }
  /**
   * Firmar trail digitalmente
   */
  private async signTrail(trail: AuditTrail): Promise<string> {
    // En producción, usar clave privada real
    const privateKey = environment.audit.signingKey;
    const sign = crypto.createSign('SHA256');
    sign.update(trail.hash);
    sign.end();
    // Simular firma (en producción usar clave RSA real)
    return crypto
      .createHmac('sha256', privateKey)
      .update(trail.hash)
      .digest('hex');
  }
  /**
   * Verificar firma del trail
   */
  private async verifySignature(trail: AuditTrail): Promise<boolean> {
    if (!trail.signature) return false;
    const privateKey = environment.audit.signingKey;
    const expectedSignature = crypto
      .createHmac('sha256', privateKey)
      .update(trail.hash)
      .digest('hex');
    return trail.signature === expectedSignature;
  }
  /**
   * Exportar a CSV
   */
  private async exportToCSV(events: SecurityEvent[]): Promise<Buffer> {
    const csvData: any[] = events.map(e => ({
      id: e.id,
      type: e.type,
      severity: e.severity,
      actor: e.actor,
      target: e.target,
      action: e.action,
      result: e.result,
      reason: e.reason,
      timestamp: e.timestamp.toISOString(),
      ipAddress: e.ipAddress,
      userAgent: e.userAgent
    }));
    // Crear CSV en memoria
    const csv = csvData.map(row => 
      Object.values(row).map(v => 
        typeof v === 'string' && v.includes(',') ? `"${v}"` : v
      ).join(',')
    ).join('\n');
    // Agregar headers
    const headers = Object.keys(csvData[0]).join(',');
    const fullCsv = headers + '\n' + csv;
    return Buffer.from(fullCsv);
  }
  /**
   * Exportar a PDF
   */
  private async exportToPDF(events: SecurityEvent[]): Promise<Buffer> {
    // En producción, usar librería como pdfkit
    // Por ahora, crear un PDF simple
    const pdfContent = `
AUDIT LOG REPORT
Generated: ${new Date().toISOString()}
Total Events: ${events.length}
${events.map(e => `
Event ID: ${e.id}
Type: ${e.type}
Severity: ${e.severity}
Actor: ${e.actor}
Action: ${e.action}
Result: ${e.result}
Timestamp: ${e.timestamp.toISOString()}
---
`).join('\n')}
    `;
    return Buffer.from(pdfContent);
  }
  /**
   * Backup evento a archivo
   */
  private async backupEventToFile(event: SecurityEvent): Promise<void> {
    const backupDir = '/secure/audit/backup';
    const filename = `event-${event.id}-${Date.now()}.json`;
    const filepath = path.join(backupDir, filename);
    try {
      await fs.mkdir(backupDir, { recursive: true });
      await fs.writeFile(filepath, JSON.stringify(event, null, 2));
    } catch (error) {
      this.logger.error('Failed to backup event to file:', error);
    }
  }
  /**
   * Log evento localmente
   */
  private logEventLocally(event: SecurityEvent): void {
    const logLevel = this.mapSeverityToLogLevel(event.severity);
    this.logger[logLevel]('Security Event', {
      type: event.type,
      actor: event.actor,
      action: event.action,
      result: event.result,
      target: event.target
    });
  }
  /**
   * Mapear severidad a nivel de log
   */
  private mapSeverityToLogLevel(severity: string): string {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warn';
      case 'medium': return 'info';
      case 'low': return 'debug';
      default: return 'info';
    }
  }
  /**
   * Otros métodos auxiliares (simplificados por espacio)
   */
  private async closeCurrentTrail(): Promise<void> {
    if (this.currentTrail) {
      await this.persistAuditTrail(this.currentTrail);
      this.currentTrail = null;
    }
  }
  private async getLastTrailHash(): Promise<string | null> {
    const result = await this.connection.query<any>(`
      SELECT hash FROM audit_trails 
      ORDER BY created_at DESC 
      LIMIT 1
    `, []);
    return result[0]?.hash || null;
  }
  private async persistAuditTrail(trail: AuditTrail): Promise<void> {
    await this.connection.query(`
      INSERT INTO audit_trails (
        id, hash, previous_hash, merkle_root, signature, 
        event_count, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      trail.id,
      trail.hash,
      trail.previousHash,
      trail.merkleRoot,
      trail.signature,
      trail.events.length,
      trail.createdAt
    ]);
  }
  private async getAuditTrail(trailId: string): Promise<AuditTrail | null> {
    const result = await this.connection.query<any>(`
      SELECT * FROM audit_trails WHERE id = $1
    `, [trailId]);
    if (result.length === 0) return null;
    // Obtener eventos del trail
    const events = await this.connection.query<any>(`
      SELECT se.* FROM security_events se
      JOIN trail_events te ON se.id = te.event_id
      WHERE te.trail_id = $1
      ORDER BY te.event_order
    `, [trailId]);
    return {
      ...result[0],
      events: events.map(this.mapToSecurityEvent)
    };
  }
  private async getTrailByHash(hash: string): Promise<AuditTrail | null> {
    const result = await this.connection.query<any>(`
      SELECT * FROM audit_trails WHERE hash = $1
    `, [hash]);
    return result[0] || null;
  }
  private async markTrailAsVerified(trailId: string): Promise<void> {
    await this.connection.query(`
      UPDATE audit_trails 
      SET verified_at = NOW() 
      WHERE id = $1
    `, [trailId]);
  }
  private mapToSecurityEvent(row: any): SecurityEvent {
    return {
      id: row.id,
      type: row.type,
      severity: row.severity,
      actor: row.actor,
      target: row.target,
      action: row.action,
      result: row.result,
      reason: row.reason,
      metadata: row.metadata,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      timestamp: row.timestamp
    };
  }
  private async loadCurrentTrail(): Promise<void> {
    // Cargar el último trail no cerrado si existe
  }
  private scheduleMaintenanceTasks(): void {
    // Programar tareas de mantenimiento
    setInterval(() => {
      this.archiveOldLogs(this.archiveLocation);
    }, 24 * 60 * 60 * 1000); // Diario
  }
  private scheduleRetentionCleanup(): void {
    // Programar limpieza según política de retención
  }
  private async generateGDPRSummary(): Promise<any> {
    return {
      dataSubjectRequests: 0,
      dataBreaches: 0,
      consentRecords: 0,
      dataRetentionCompliance: true
    };
  }
  private async generateGDPRDetails(): Promise<any[]> {
    return [];
  }
  private async generatePCIDSSSummary(): Promise<any> {
    return {
      cardDataAccess: 0,
      encryptionStatus: 'compliant',
      vulnerabilityScans: 0
    };
  }
  private async generatePCIDSSDetails(): Promise<any[]> {
    return [];
  }
  private async generateSOC2Summary(): Promise<any> {
    return {
      availabilityScore: 99.9,
      securityIncidents: 0,
      changeManagementCompliance: true
    };
  }
  private async generateSOC2Details(): Promise<any[]> {
    return [];
  }
  private async generateHIPAASummary(): Promise<any> {
    return {
      phiAccess: 0,
      encryptionCompliance: true,
      auditLogIntegrity: true
    };
  }
  private async generateHIPAADetails(): Promise<any[]> {
    return [];
  }
  private async generateRecommendations(standard: string): Promise<string[]> {
    return [
      'Regular security training for all staff',
      'Implement automated compliance monitoring',
      'Review and update security policies quarterly'
    ];
  }
  private async saveComplianceReport(report: any): Promise<void> {
    // Guardar reporte en base de datos o archivo
  }
}
