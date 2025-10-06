/**
 * InvitationRepository Implementation - Sprint 3
 * Siguiendo lineamientos nivel 2: Repositorio para invitaciones
 * SOLID: SRP (solo maneja persistencia de invitaciones), DIP (implementa interfaz)
 */
import { injectable, inject } from 'inversify';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { TYPES } from '@/container/types';
import { 
  IInvitationRepository, 
  InvitationData, 
  InvitationUpdateData, 
  InvitationFilters,
  InvitationStatsResponse
} from '@/modules/auth/interfaces/IInvitationRepository';
import { Logger } from 'winston';
@injectable()
export class InvitationRepository implements IInvitationRepository {
  constructor(
    @inject(TYPES.SharedConnection) private db: IDatabaseConnection,
    @inject(TYPES.Logger) private logger: Logger
  ) {}
  /**
   * Generar token seguro para invitación
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
  /**
   * Crear nueva invitación
   */
  async create(invitationData: InvitationData): Promise<any> {
    const client = await this.db.getClient();
    try {
      const id = uuidv4();
      const token = invitationData.token || this.generateToken();
      const query = `
        INSERT INTO invitations (
          id, email, company_id, role_id, invited_by, 
          permissions, personal_message, token, expires_at, 
          status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `;
      const values = [
        id,
        invitationData.email.toLowerCase(),
        invitationData.companyId,
        invitationData.roleId,
        invitationData.invitedBy,
        invitationData.permissions ? JSON.stringify(invitationData.permissions) : null,
        invitationData.personalMessage,
        token,
        invitationData.expiresAt,
        invitationData.status || 'pending'
      ];
      const result = await client.query(query, values);
      this.logger.info('Invitation created', { 
        invitationId: id, 
        email: invitationData.email,
        companyId: invitationData.companyId 
      });
      return this.mapToInvitation(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating invitation', error);
      throw error;
    } finally {
      client.release();
    }
  }
  /**
   * Buscar invitación por ID
   */
  async findById(invitationId: string): Promise<any | null> {
    const query = `
      SELECT i.*, 
        c.name as company_name,
        r.name as role_name,
        u.first_name || ' ' || u.last_name as invited_by_name
      FROM invitations i
      LEFT JOIN companies c ON i.company_id = c.id
      LEFT JOIN roles r ON i.role_id = r.id
      LEFT JOIN users u ON i.invited_by = u.id
      WHERE i.id = $1 AND i.deleted_at IS NULL
    `;
    const result = await this.db.query(query, [invitationId]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapToInvitation(result.rows[0]);
  }
  /**
   * Buscar invitación por token
   */
  async findByToken(token: string): Promise<any | null> {
    const query = `
      SELECT i.*, 
        c.name as company_name,
        r.name as role_name,
        u.first_name || ' ' || u.last_name as invited_by_name
      FROM invitations i
      LEFT JOIN companies c ON i.company_id = c.id
      LEFT JOIN roles r ON i.role_id = r.id
      LEFT JOIN users u ON i.invited_by = u.id
      WHERE i.token = $1 AND i.deleted_at IS NULL
    `;
    const result = await this.db.query(query, [token]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapToInvitation(result.rows[0]);
  }
  /**
   * Actualizar invitación
   */
  async update(invitationId: string, updates: InvitationUpdateData): Promise<any | null> {
    const client = await this.db.getClient();
    try {
      const updateFields = [];
      const values = [];
      let valueIndex = 1;
      Object.keys(updates).forEach(key => {
        if (updates[key as keyof InvitationUpdateData] !== undefined) {
          updateFields.push(`${this.camelToSnake(key)} = $${valueIndex}`);
          values.push(updates[key as keyof InvitationUpdateData]);
          valueIndex++;
        }
      });
      if (updateFields.length === 0) {
        return this.findById(invitationId);
      }
      updateFields.push(`updated_at = NOW()`);
      values.push(invitationId);
      const query = `
        UPDATE invitations
        SET ${updateFields.join(', ')}
        WHERE id = $${valueIndex} AND deleted_at IS NULL
        RETURNING *
      `;
      const result = await client.query(query, values);
      if (result.rows.length === 0) {
        return null;
      }
      this.logger.info('Invitation updated', { invitationId, updates });
      return this.mapToInvitation(result.rows[0]);
    } catch (error) {
      this.logger.error('Error updating invitation', error);
      throw error;
    } finally {
      client.release();
    }
  }
  /**
   * Actualizar estado de invitación
   */
  async updateStatus(
    invitationId: string, 
    status: string, 
    additionalData?: Record<string, any>
  ): Promise<void> {
    const updates: InvitationUpdateData = { status };
    // Agregar campos adicionales según el estado
    switch (status) {
      case 'accepted':
        updates.acceptedAt = new Date();
        if (additionalData?.acceptedBy) {
          updates.acceptedBy = additionalData.acceptedBy;
        }
        break;
      case 'rejected':
        updates.rejectedAt = new Date();
        if (additionalData?.rejectionReason) {
          updates.rejectionReason = additionalData.rejectionReason;
        }
        break;
      case 'cancelled':
        updates.cancelledAt = new Date();
        if (additionalData?.cancelledBy) {
          updates.cancelledBy = additionalData.cancelledBy;
        }
        break;
    }
    await this.update(invitationId, updates);
  }
  /**
   * Eliminar invitación (soft delete)
   */
  async delete(invitationId: string): Promise<boolean> {
    const query = `
      UPDATE invitations
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `;
    const result = await this.db.query(query, [invitationId]);
    if (result.rows.length > 0) {
      this.logger.info('Invitation deleted', { invitationId });
      return true;
    }
    return false;
  }
  /**
   * Buscar invitaciones por email
   */
  async findByEmail(email: string): Promise<any[]> {
    const query = `
      SELECT i.*, 
        c.name as company_name,
        r.name as role_name
      FROM invitations i
      LEFT JOIN companies c ON i.company_id = c.id
      LEFT JOIN roles r ON i.role_id = r.id
      WHERE LOWER(i.email) = LOWER($1) AND i.deleted_at IS NULL
      ORDER BY i.created_at DESC
    `;
    const result = await this.db.query(query, [email]);
    return result.rows.map(row => this.mapToInvitation(row));
  }
  /**
   * Buscar invitación pendiente por email y empresa
   */
  async findPendingByEmail(email: string, companyId: string): Promise<any | null> {
    const query = `
      SELECT * FROM invitations
      WHERE LOWER(email) = LOWER($1) 
        AND company_id = $2 
        AND status = 'pending'
        AND expires_at > NOW()
        AND deleted_at IS NULL
      LIMIT 1
    `;
    const result = await this.db.query(query, [email, companyId]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapToInvitation(result.rows[0]);
  }
  /**
   * Buscar invitaciones por empresa con filtros y paginación
   */
  async findByCompany(
    companyId: string,
    filters?: InvitationFilters
  ): Promise<{ invitations: any[]; total: number }> {
    const whereConditions = ['i.company_id = $1', 'i.deleted_at IS NULL'];
    const values: any[] = [companyId];
    let valueIndex = 2;
    // Aplicar filtros
    if (filters?.status) {
      whereConditions.push(`i.status = $${valueIndex}`);
      values.push(filters.status);
      valueIndex++;
    }
    if (filters?.roleId) {
      whereConditions.push(`i.role_id = $${valueIndex}`);
      values.push(filters.roleId);
      valueIndex++;
    }
    if (filters?.invitedBy) {
      whereConditions.push(`i.invited_by = $${valueIndex}`);
      values.push(filters.invitedBy);
      valueIndex++;
    }
    if (filters?.startDate) {
      whereConditions.push(`i.created_at >= $${valueIndex}`);
      values.push(filters.startDate);
      valueIndex++;
    }
    if (filters?.endDate) {
      whereConditions.push(`i.created_at <= $${valueIndex}`);
      values.push(filters.endDate);
      valueIndex++;
    }
    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM invitations i
      WHERE ${whereConditions.join(' AND ')}
    `;
    const countResult = await this.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);
    // Query principal con paginación
    let mainQuery = `
      SELECT i.*, 
        c.name as company_name,
        r.name as role_name,
        u.first_name || ' ' || u.last_name as invited_by_name
      FROM invitations i
      LEFT JOIN companies c ON i.company_id = c.id
      LEFT JOIN roles r ON i.role_id = r.id
      LEFT JOIN users u ON i.invited_by = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY i.created_at DESC
    `;
    if (filters?.limit) {
      mainQuery += ` LIMIT $${valueIndex}`;
      values.push(filters.limit);
      valueIndex++;
    }
    if (filters?.offset) {
      mainQuery += ` OFFSET $${valueIndex}`;
      values.push(filters.offset);
    }
    const result = await this.db.query(mainQuery, values);
    return {
      invitations: result.rows.map(row => this.mapToInvitation(row)),
      total
    };
  }
  /**
   * Expirar invitaciones vencidas automáticamente
   */
  async expireOldInvitations(): Promise<number> {
    const query = `
      UPDATE invitations
      SET status = 'expired', updated_at = NOW()
      WHERE status = 'pending' 
        AND expires_at < NOW()
        AND deleted_at IS NULL
      RETURNING id
    `;
    const result = await this.db.query(query);
    const count = result.rowCount || 0;
    if (count > 0) {
      this.logger.info(`Expired ${count} invitations`);
    }
    return count;
  }
  /**
   * Obtener estadísticas de invitaciones
   */
  async getStats(
    companyId?: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<InvitationStatsResponse> {
    const whereConditions = ['deleted_at IS NULL'];
    const values: any[] = [];
    let valueIndex = 1;
    if (companyId) {
      whereConditions.push(`company_id = $${valueIndex}`);
      values.push(companyId);
      valueIndex++;
    }
    if (dateRange) {
      whereConditions.push(`created_at >= $${valueIndex}`);
      values.push(dateRange.startDate);
      valueIndex++;
      whereConditions.push(`created_at <= $${valueIndex}`);
      values.push(dateRange.endDate);
      valueIndex++;
    }
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND(COUNT(CASE WHEN status = 'accepted' THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2)
          ELSE 0
        END as acceptance_rate,
        AVG(
          CASE 
            WHEN status = 'accepted' AND accepted_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (accepted_at - created_at)) / 3600
            ELSE NULL
          END
        ) as average_acceptance_time
      FROM invitations
      WHERE ${whereConditions.join(' AND ')}
    `;
    const result = await this.db.query(query, values);
    const stats = result.rows[0];
    return {
      total: parseInt(stats.total, 10) || 0,
      pending: parseInt(stats.pending, 10) || 0,
      accepted: parseInt(stats.accepted, 10) || 0,
      expired: parseInt(stats.expired, 10) || 0,
      cancelled: parseInt(stats.cancelled, 10) || 0,
      rejected: parseInt(stats.rejected, 10) || 0,
      acceptanceRate: parseFloat(stats.acceptance_rate) || 0,
      averageAcceptanceTime: stats.average_acceptance_time ?
        parseFloat(stats.average_acceptance_time) : undefined
    };
  }
  /**
   * Verificar si un usuario puede ser invitado
   */
  async canInviteUser(email: string, companyId: string): Promise<{
    canInvite: boolean;
    reason?: string;
    existingStatus?: string;
  }> {
    // Verificar si ya existe un usuario con ese email en la empresa
    const userQuery = `
      SELECT u.id 
      FROM users u
      JOIN user_companies uc ON u.id = uc.user_id
      WHERE LOWER(u.email) = LOWER($1) AND uc.company_id = $2
      LIMIT 1
    `;
    const userResult = await this.db.query(userQuery, [email, companyId]);
    if (userResult.rows.length > 0) {
      return {
        canInvite: false,
        reason: 'User already exists in company'
      };
    }
    // Verificar invitaciones pendientes
    const pendingInvitation = await this.findPendingByEmail(email, companyId);
    if (pendingInvitation) {
      return {
        canInvite: false,
        reason: 'Pending invitation exists',
        existingStatus: 'pending'
      };
    }
    return { canInvite: true };
  }
  /**
   * Limpiar invitaciones antiguas
   */
  async cleanupOldInvitations(olderThanDays: number): Promise<number> {
    const query = `
      DELETE FROM invitations
      WHERE created_at < NOW() - INTERVAL '${olderThanDays} days'
        AND status IN ('expired', 'rejected', 'cancelled')
      RETURNING id
    `;
    const result = await this.db.query(query);
    const count = result.rowCount || 0;
    if (count > 0) {
      this.logger.info(`Cleaned up ${count} old invitations`);
    }
    return count;
  }
  // Métodos restantes de la interfaz...
  async findByInviter(invitedBy: string, companyId?: string, filters?: InvitationFilters): Promise<any[]> {
    const whereConditions = ['i.invited_by = $1', 'i.deleted_at IS NULL'];
    const values: any[] = [invitedBy];
    if (companyId) {
      whereConditions.push('i.company_id = $2');
      values.push(companyId);
    }
    const query = `
      SELECT i.* FROM invitations i
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY i.created_at DESC
    `;
    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapToInvitation(row));
  }
  async findByRole(roleId: string, companyId?: string, filters?: InvitationFilters): Promise<any[]> {
    const whereConditions = ['i.role_id = $1', 'i.deleted_at IS NULL'];
    const values: any[] = [roleId];
    if (companyId) {
      whereConditions.push('i.company_id = $2');
      values.push(companyId);
    }
    const query = `
      SELECT i.* FROM invitations i
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY i.created_at DESC
    `;
    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapToInvitation(row));
  }
  async findByStatus(status: string, companyId?: string, limit?: number, offset?: number): Promise<any[]> {
    let query = `
      SELECT i.* FROM invitations i
      WHERE i.status = $1 AND i.deleted_at IS NULL
    `;
    const values: any[] = [status];
    if (companyId) {
      query += ' AND i.company_id = $2';
      values.push(companyId);
    }
    query += ' ORDER BY i.created_at DESC';
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    if (offset) {
      query += ` OFFSET ${offset}`;
    }
    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapToInvitation(row));
  }
  async getExpiringInvitations(withinHours: number): Promise<any[]> {
    const query = `
      SELECT i.* FROM invitations i
      WHERE i.status = 'pending' 
        AND i.expires_at <= NOW() + INTERVAL '${withinHours} hours'
        AND i.expires_at > NOW()
        AND i.deleted_at IS NULL
      ORDER BY i.expires_at ASC
    `;
    const result = await this.db.query(query);
    return result.rows.map(row => this.mapToInvitation(row));
  }
  async getConversionMetrics(companyId?: string, dateRange?: { startDate: Date; endDate: Date }): Promise<any> {
    // Implementación de métricas de conversión
    const stats = await this.getStats(companyId, dateRange);
    return {
      totalInvitations: stats.total,
      acceptedInvitations: stats.accepted,
      conversionRate: stats.acceptanceRate,
      averageAcceptanceTime: stats.averageAcceptanceTime || 0,
      conversionByRole: [] // Se implementaría con query adicional
    };
  }
  async getTrends(companyId?: string, period: 'daily' | 'weekly' | 'monthly' = 'daily', days: number = 30): Promise<any[]> {
    // Implementación simplificada - se expandiría según necesidad
    return [];
  }
  async getFullDetails(invitationId: string): Promise<any> {
    return this.findById(invitationId);
  }
  async getUserInvitationHistory(email: string): Promise<any[]> {
    return this.findByEmail(email);
  }
  async count(filters?: Partial<InvitationFilters & { companyId: string }>): Promise<number> {
    const whereConditions = ['deleted_at IS NULL'];
    const values: any[] = [];
    if (filters?.companyId) {
      whereConditions.push(`company_id = $${values.length + 1}`);
      values.push(filters.companyId);
    }
    const query = `
      SELECT COUNT(*) as total FROM invitations
      WHERE ${whereConditions.join(' AND ')}
    `;
    const result = await this.db.query(query, values);
    return parseInt(result.rows[0].total);
  }
  async findWithPagination(filters: InvitationFilters & { companyId: string }): Promise<any> {
    const result = await this.findByCompany(filters.companyId, filters);
    const page = Math.floor((filters.offset || 0) / (filters.limit || 10)) + 1;
    const totalPages = Math.ceil(result.total / (filters.limit || 10));
    return {
      invitations: result.invitations,
      total: result.total,
      page,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }
  async getPendingSummaryByRole(companyId: string): Promise<any[]> {
    const query = `
      SELECT 
        r.id as role_id,
        r.name as role_name,
        COUNT(CASE WHEN i.status = 'pending' THEN 1 END) as pending_count,
        COUNT(*) as total_invitations,
        MIN(CASE WHEN i.status = 'pending' THEN i.created_at END) as oldest_pending
      FROM roles r
      LEFT JOIN invitations i ON r.id = i.role_id 
        AND i.company_id = $1 
        AND i.deleted_at IS NULL
      WHERE r.company_id = $1 OR r.is_system = true
      GROUP BY r.id, r.name
      HAVING COUNT(CASE WHEN i.status = 'pending' THEN 1 END) > 0
      ORDER BY pending_count DESC
    `;
    const result = await this.db.query(query, [companyId]);
    return result.rows.map(row => ({
      roleId: row.role_id,
      roleName: row.role_name,
      pendingCount: parseInt(row.pending_count),
      totalInvitations: parseInt(row.total_invitations),
      oldestPending: row.oldest_pending
    }));
  }
  /**
   * Mapear resultado de DB a objeto Invitation
   */
  private mapToInvitation(row: any): any {
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      companyId: row.company_id,
      companyName: row.company_name,
      roleId: row.role_id,
      roleName: row.role_name,
      invitedBy: row.invited_by,
      invitedByName: row.invited_by_name,
      permissions: row.permissions ? JSON.parse(row.permissions) : null,
      personalMessage: row.personal_message,
      token: row.token,
      expiresAt: row.expires_at,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      acceptedAt: row.accepted_at,
      acceptedBy: row.accepted_by,
      rejectedAt: row.rejected_at,
      rejectionReason: row.rejection_reason,
      cancelledAt: row.cancelled_at,
      cancelledBy: row.cancelled_by,
      resentAt: row.resent_at,
      resentBy: row.resent_by
    };
  }
  /**
   * Convertir camelCase a snake_case
   */
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
