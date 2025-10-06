/**
 * Audit Repository Implementation - PostgreSQL
 * Implementación para audit logging con PostgreSQL
 */
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { IAuditRepository } from '@/shared/interfaces/repositories/IAuditRepository';
export interface AuditLog {
  id?: string;
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
  createdAt?: Date;
}
@injectable()
export class AuditRepository implements IAuditRepository {
  constructor(
    @inject(TYPES.SharedConnection) private db: IDatabaseConnection,
    @inject(TYPES.Logger) private logger: Logger
  ) {}
  async create(auditLog: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    try {
      console.log('🟠 [AuditRepository.create] START');
      console.log('🟠 [AuditRepository.create] auditLog:', JSON.stringify(auditLog, null, 2));
      console.log('🟠 [AuditRepository.create] companyId:', auditLog.companyId);
      console.log('🟠 [AuditRepository.create] companyId type:', typeof auditLog.companyId);
      console.log('🟠 [AuditRepository.create] companyId value:', JSON.stringify(auditLog.companyId));

      const query = `
        INSERT INTO audit_logs (
          action, entity_type, entity_id, user_id, company_id,
          description, metadata, ip_address, user_agent, session_id,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING *
      `;

      const companyIdValue = auditLog.companyId || null;
      console.log('🟠 [AuditRepository.create] companyIdValue:', companyIdValue);
      console.log('🟠 [AuditRepository.create] companyIdValue type:', typeof companyIdValue);

      let metadataString: string;
      try {
        metadataString = JSON.stringify(auditLog.metadata || {});
        console.log('🟠 [AuditRepository.create] metadataString:', metadataString);
      } catch (jsonError) {
        console.error('🔴 [AuditRepository.create] Error stringifying metadata:', jsonError);
        throw jsonError;
      }

      const params = [
        auditLog.action,
        auditLog.entityType,
        auditLog.entityId,
        auditLog.userId || null,
        companyIdValue,
        auditLog.description || null,
        metadataString,
        auditLog.ipAddress || null,
        auditLog.userAgent || null,
        auditLog.sessionId || null
      ];

      console.log('🟠 [AuditRepository.create] params:', JSON.stringify(params, null, 2));
      console.log('🟠 [AuditRepository.create] Executing query...');

      const result = await this.db.query<AuditLog>(query, params);

      console.log('🟠 [AuditRepository.create] result:', JSON.stringify(result.rows[0], null, 2));

      return result.rows[0];
    } catch (error) {
      console.error('🔴 [AuditRepository.create] ERROR:', error);
      console.error('🔴 [AuditRepository.create] ERROR message:', error instanceof Error ? error.message : 'Unknown');
      console.error('🔴 [AuditRepository.create] ERROR stack:', error instanceof Error ? error.stack : 'No stack');

      this.logger.error('Error creating audit log:', error);
      throw error;
    }
  }
  async findById(id: string): Promise<AuditLog | null> {
    try {
      const query = 'SELECT * FROM audit_logs WHERE id = $1';
      const result = await this.db.query<AuditLog>(query, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      this.logger.error('Error finding audit log by id:', error);
      throw error;
    }
  }
  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    try {
      const query = `
        SELECT * FROM audit_logs
        WHERE entity_type = $1 AND entity_id = $2
        ORDER BY created_at DESC
      `;
      const result = await this.db.query<AuditLog>(query, [entityType, entityId]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error finding audit logs by entity:', error);
      throw error;
    }
  }
  async findByUser(userId: string, limit: number = 100): Promise<AuditLog[]> {
    try {
      const query = `
        SELECT * FROM audit_logs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      const result = await this.db.query<AuditLog>(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error finding audit logs by user:', error);
      throw error;
    }
  }
  async findByCompany(companyId: string, limit: number = 100): Promise<AuditLog[]> {
    try {
      const query = `
        SELECT * FROM audit_logs
        WHERE company_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      const result = await this.db.query<AuditLog>(query, [companyId, limit]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error finding audit logs by company:', error);
      throw error;
    }
  }
  async findByDateRange(startDate: Date, endDate: Date, filters?: any): Promise<AuditLog[]> {
    try {
      let query = `
        SELECT * FROM audit_logs 
        WHERE created_at >= $1 AND created_at <= $2
      `;
      const params: any[] = [startDate, endDate];
      let paramIndex = 3;
      if (filters) {
        if (filters.userId) {
          query += ` AND user_id = $${paramIndex++}`;
          params.push(filters.userId);
        }
        if (filters.companyId) {
          query += ` AND company_id = $${paramIndex++}`;
          params.push(filters.companyId);
        }
        if (filters.action) {
          query += ` AND action = $${paramIndex++}`;
          params.push(filters.action);
        }
        if (filters.entityType) {
          query += ` AND entity_type = $${paramIndex++}`;
          params.push(filters.entityType);
        }
      }
      query += ' ORDER BY created_at DESC';
      const result = await this.db.query<AuditLog>(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error('Error finding audit logs by date range:', error);
      throw error;
    }
  }
  async deleteOldLogs(daysToKeep: number): Promise<number> {
    try {
      // Validate input to prevent SQL injection
      const safeDays = parseInt(daysToKeep.toString(), 10);
      if (isNaN(safeDays) || safeDays < 0 || safeDays > 3650) {
        throw new Error('Invalid days value: must be between 0 and 3650');
      }
      // Use parameterized query to prevent SQL injection
      const query = `
        DELETE FROM audit_logs 
        WHERE created_at < NOW() - INTERVAL '1 day' * $1
      `;
      const result = await this.db.query(query, [safeDays]);
      return result.rows.length;
    } catch (error) {
      this.logger.error('Error deleting old audit logs:', error);
      throw error;
    }
  }
}
