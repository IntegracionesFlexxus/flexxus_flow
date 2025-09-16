/**
 * Invitation System Service
 * Sprint 3 - Backend Team
 * Implementación siguiendo lineamientos Nivel 2: SOLID, Clean Code, Inversión de Dependencias
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import crypto from 'crypto';
import { TYPES } from '@/container/types';
import { IInvitationRepository } from '@/modules/invitations/interfaces/IInvitationRepository';
import { IUserRepository } from '@/shared/interfaces/repositories/IUserRepository';
import { ICompanyRepository } from '@/shared/interfaces/repositories/ICompanyRepository';
import { IRoleRepository } from '@/modules/invitations/interfaces/IRoleRepository';
import { AuditService } from '@/modules/invitations/services/AuditService';
import { EmailService } from '@/modules/invitations/services/EmailService';
import { environment } from '@/config/environment';

// DTOs siguiendo principio de responsabilidad única
export interface CreateInvitationRequest {
  email: string;
  companyId: string;
  roleId: string;
  invitedBy: string;
  permissions?: string[];
  personalMessage?: string;
  expirationDays?: number;
}

export interface InvitationResponse {
  id: string;
  email: string;
  companyId: string;
  companyName: string;
  roleId: string;
  roleName: string;
  invitedBy: string;
  invitedByName: string;
  permissions?: string[];
  personalMessage?: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled' | 'rejected';
  token: string;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt?: Date;
}

export interface AcceptInvitationRequest {
  token: string;
  userRegistrationData?: {
    firstName: string;
    lastName: string;
    password: string;
    timezone?: string;
    language?: string;
  };
}

export interface BulkInvitationRequest {
  companyId: string;
  roleId: string;
  invitedBy: string;
  invitations: Array<{
    email: string;
    personalMessage?: string;
  }>;
  permissions?: string[];
  expirationDays?: number;
}

export interface InvitationStatsResponse {
  total: number;
  pending: number;
  accepted: number;
  expired: number;
  cancelled: number;
  rejected: number;
  acceptanceRate: number;
  averageAcceptanceTime?: number;
}

/**
 * InvitationService implementa sistema completo de invitaciones
 * Principios SOLID aplicados:
 * - S: Responsabilidad única para gestión de invitaciones
 * - O: Abierto para extensión (nuevos tipos de invitación) cerrado para modificación
 * - L: Sustituible por cualquier implementación que respete la interfaz
 * - I: Segregación de interfaces (específica para invitaciones)
 * - D: Inversión de dependencias (inyección de dependencias)
 */
@injectable()
export class InvitationService {
  private readonly defaultExpirationDays = 7;
  private readonly maxBulkInvitations = 100;

  constructor(
    @inject(TYPES.InvitationRepository) private invitationRepository: IInvitationRepository,
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.CompanyRepository) private companyRepository: ICompanyRepository,
    @inject(TYPES.RoleRepository) private roleRepository: IRoleRepository,
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.EmailService) private emailService: EmailService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Crear nueva invitación
   * Clean Code: función con responsabilidad única y nombre descriptivo
   */
  async createInvitation(
    invitationData: CreateInvitationRequest
  ): Promise<InvitationResponse> {
    try {
      // Validaciones previas
      await this.validateInvitationRequest(invitationData);

      // Verificar si ya existe una invitación pendiente
      await this.checkExistingPendingInvitation(
        invitationData.email, 
        invitationData.companyId
      );

      // Generar token seguro
      const token = this.generateInvitationToken();

      // Calcular fecha de expiración
      const expirationDays = invitationData.expirationDays || this.defaultExpirationDays;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expirationDays);

      // Crear invitación
      const invitation = await this.invitationRepository.create({
        email: invitationData.email.toLowerCase().trim(),
        companyId: invitationData.companyId,
        roleId: invitationData.roleId,
        invitedBy: invitationData.invitedBy,
        permissions: invitationData.permissions || [],
        personalMessage: invitationData.personalMessage,
        token,
        expiresAt,
        status: 'pending'
      });

      // Enviar email de invitación
      await this.sendInvitationEmail(invitation);

      // Auditoría automática
      await this.auditService.logActivity({
        action: 'invitation_created',
        entityType: 'invitation',
        entityId: invitation.id,
        userId: invitationData.invitedBy,
        companyId: invitationData.companyId,
        description: `Invitación enviada a: ${invitationData.email}`,
        metadata: { 
          email: invitationData.email,
          roleId: invitationData.roleId,
          expiresAt: expiresAt.toISOString()
        }
      });

      this.logger.info('Invitación creada exitosamente', {
        invitationId: invitation.id,
        email: invitationData.email,
        companyId: invitationData.companyId,
        roleId: invitationData.roleId,
        invitedBy: invitationData.invitedBy
      });

      return await this.getInvitationDetails(invitation.id);
    } catch (error) {
      this.logger.error('Error al crear invitación', {
        error: error.message,
        invitationData: {
          ...invitationData,
          personalMessage: invitationData.personalMessage ? 'presente' : 'ausente'
        }
      });
      throw error;
    }
  }

  /**
   * Crear múltiples invitaciones en batch
   */
  async createBulkInvitations(
    bulkRequest: BulkInvitationRequest
  ): Promise<{
    successful: InvitationResponse[];
    failed: Array<{
      email: string;
      error: string;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    try {
      if (bulkRequest.invitations.length > this.maxBulkInvitations) {
        throw new Error(`No se pueden crear más de ${this.maxBulkInvitations} invitaciones a la vez`);
      }

      const successful: InvitationResponse[] = [];
      const failed: Array<{ email: string; error: string }> = [];

      // Procesar cada invitación individualmente
      for (const invitation of bulkRequest.invitations) {
        try {
          const invitationRequest: CreateInvitationRequest = {
            email: invitation.email,
            companyId: bulkRequest.companyId,
            roleId: bulkRequest.roleId,
            invitedBy: bulkRequest.invitedBy,
            permissions: bulkRequest.permissions,
            personalMessage: invitation.personalMessage,
            expirationDays: bulkRequest.expirationDays
          };

          const createdInvitation = await this.createInvitation(invitationRequest);
          successful.push(createdInvitation);
        } catch (error) {
          failed.push({
            email: invitation.email,
            error: error.message
          });
        }
      }

      // Auditoría del batch
      await this.auditService.logActivity({
        action: 'bulk_invitations_created',
        entityType: 'invitation',
        entityId: 'bulk',
        userId: bulkRequest.invitedBy,
        companyId: bulkRequest.companyId,
        description: `Invitaciones masivas: ${successful.length} exitosas, ${failed.length} fallidas`,
        metadata: {
          total: bulkRequest.invitations.length,
          successful: successful.length,
          failed: failed.length,
          roleId: bulkRequest.roleId
        }
      });

      this.logger.info('Invitaciones masivas procesadas', {
        total: bulkRequest.invitations.length,
        successful: successful.length,
        failed: failed.length,
        companyId: bulkRequest.companyId,
        roleId: bulkRequest.roleId
      });

      return {
        successful,
        failed,
        summary: {
          total: bulkRequest.invitations.length,
          successful: successful.length,
          failed: failed.length
        }
      };
    } catch (error) {
      this.logger.error('Error en invitaciones masivas', {
        error: error.message,
        bulkRequest: {
          ...bulkRequest,
          invitations: `${bulkRequest.invitations.length} invitaciones`
        }
      });
      throw error;
    }
  }

  /**
   * Aceptar invitación
   */
  async acceptInvitation(
    acceptRequest: AcceptInvitationRequest
  ): Promise<{
    user: any;
    invitation: InvitationResponse;
    isNewUser: boolean;
  }> {
    try {
      // Buscar y validar invitación
      const invitation = await this.validateInvitationToken(acceptRequest.token);

      // Verificar si el usuario ya existe
      let user = await this.userRepository.findByEmail(invitation.email);
      let isNewUser = false;

      if (!user) {
        // Crear nuevo usuario si no existe
        if (!acceptRequest.userRegistrationData) {
          throw new Error('Datos de registro requeridos para nuevo usuario');
        }

        user = await this.userRepository.create({
          email: invitation.email,
          firstName: acceptRequest.userRegistrationData.firstName,
          lastName: acceptRequest.userRegistrationData.lastName,
          passwordHash: acceptRequest.userRegistrationData.password, // Se hasheará en el repository
          timezone: acceptRequest.userRegistrationData.timezone || 'America/Argentina/Buenos_Aires',
          language: acceptRequest.userRegistrationData.language || 'es',
          status: 'active',
          emailVerified: true // Email verificado al aceptar invitación
        });

        isNewUser = true;
      }

      // Agregar usuario a la empresa con el rol especificado
      await this.userRepository.addToCompany(
        user.id,
        invitation.companyId,
        invitation.roleId,
        invitation.permissions
      );

      // Marcar invitación como aceptada
      await this.invitationRepository.updateStatus(
        invitation.id,
        'accepted',
        { acceptedAt: new Date(), acceptedBy: user.id }
      );

      // Auditoría
      await this.auditService.logActivity({
        action: 'invitation_accepted',
        entityType: 'invitation',
        entityId: invitation.id,
        userId: user.id,
        companyId: invitation.companyId,
        description: `Invitación aceptada por: ${invitation.email}`,
        metadata: {
          isNewUser,
          roleId: invitation.roleId,
          invitedBy: invitation.invitedBy
        }
      });

      // Enviar email de bienvenida
      await this.sendWelcomeEmail(user, invitation);

      this.logger.info('Invitación aceptada exitosamente', {
        invitationId: invitation.id,
        userId: user.id,
        email: invitation.email,
        companyId: invitation.companyId,
        isNewUser
      });

      return {
        user,
        invitation: await this.getInvitationDetails(invitation.id),
        isNewUser
      };
    } catch (error) {
      this.logger.error('Error al aceptar invitación', {
        error: error.message,
        token: acceptRequest.token ? 'presente' : 'ausente'
      });
      throw error;
    }
  }

  /**
   * Rechazar invitación
   */
  async rejectInvitation(token: string, reason?: string): Promise<void> {
    try {
      const invitation = await this.validateInvitationToken(token);

      await this.invitationRepository.updateStatus(
        invitation.id,
        'rejected',
        { rejectedAt: new Date(), rejectionReason: reason }
      );

      // Auditoría
      await this.auditService.logActivity({
        action: 'invitation_rejected',
        entityType: 'invitation',
        entityId: invitation.id,
        companyId: invitation.companyId,
        description: `Invitación rechazada: ${invitation.email}`,
        metadata: { reason }
      });

      this.logger.info('Invitación rechazada', {
        invitationId: invitation.id,
        email: invitation.email,
        reason
      });
    } catch (error) {
      this.logger.error('Error al rechazar invitación', {
        error: error.message,
        token: token ? 'presente' : 'ausente'
      });
      throw error;
    }
  }

  /**
   * Cancelar invitación
   */
  async cancelInvitation(invitationId: string, cancelledBy: string): Promise<void> {
    try {
      const invitation = await this.invitationRepository.findById(invitationId);
      if (!invitation) {
        throw new Error('Invitación no encontrada');
      }

      if (invitation.status !== 'pending') {
        throw new Error('Solo se pueden cancelar invitaciones pendientes');
      }

      await this.invitationRepository.updateStatus(
        invitationId,
        'cancelled',
        { cancelledAt: new Date(), cancelledBy }
      );

      // Auditoría
      await this.auditService.logActivity({
        action: 'invitation_cancelled',
        entityType: 'invitation',
        entityId: invitationId,
        userId: cancelledBy,
        companyId: invitation.companyId,
        description: `Invitación cancelada: ${invitation.email}`,
        metadata: { originalInvitedBy: invitation.invitedBy }
      });

      this.logger.info('Invitación cancelada', {
        invitationId,
        email: invitation.email,
        cancelledBy
      });
    } catch (error) {
      this.logger.error('Error al cancelar invitación', {
        error: error.message,
        invitationId,
        cancelledBy
      });
      throw error;
    }
  }

  /**
   * Reenviar invitación
   */
  async resendInvitation(invitationId: string, resentBy: string): Promise<InvitationResponse> {
    try {
      const invitation = await this.invitationRepository.findById(invitationId);
      if (!invitation) {
        throw new Error('Invitación no encontrada');
      }

      if (invitation.status !== 'pending' && invitation.status !== 'expired') {
        throw new Error('Solo se pueden reenviar invitaciones pendientes o expiradas');
      }

      // Generar nuevo token y extender expiración
      const newToken = this.generateInvitationToken();
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + this.defaultExpirationDays);

      await this.invitationRepository.update(invitationId, {
        token: newToken,
        expiresAt: newExpiresAt,
        status: 'pending',
        resentAt: new Date(),
        resentBy
      });

      const updatedInvitation = await this.getInvitationDetails(invitationId);

      // Enviar nuevo email
      await this.sendInvitationEmail(updatedInvitation, true);

      // Auditoría
      await this.auditService.logActivity({
        action: 'invitation_resent',
        entityType: 'invitation',
        entityId: invitationId,
        userId: resentBy,
        companyId: invitation.companyId,
        description: `Invitación reenviada a: ${invitation.email}`,
        metadata: { originalInvitedBy: invitation.invitedBy }
      });

      this.logger.info('Invitación reenviada', {
        invitationId,
        email: invitation.email,
        resentBy
      });

      return updatedInvitation;
    } catch (error) {
      this.logger.error('Error al reenviar invitación', {
        error: error.message,
        invitationId,
        resentBy
      });
      throw error;
    }
  }

  /**
   * Obtener invitaciones de una empresa
   */
  async getCompanyInvitations(
    companyId: string,
    filters?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    invitations: InvitationResponse[];
    total: number;
  }> {
    try {
      const result = await this.invitationRepository.findByCompany(companyId, filters);

      const invitations = await Promise.all(
        result.invitations.map(inv => this.getInvitationDetails(inv.id))
      );

      return {
        invitations,
        total: result.total
      };
    } catch (error) {
      this.logger.error('Error al obtener invitaciones de empresa', {
        error: error.message,
        companyId,
        filters
      });
      throw error;
    }
  }

  /**
   * Obtener estadísticas de invitaciones
   */
  async getInvitationStats(
    companyId?: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<InvitationStatsResponse> {
    try {
      const stats = await this.invitationRepository.getStats(companyId, dateRange);

      this.logger.debug('Estadísticas de invitación consultadas', {
        companyId,
        dateRange,
        total: stats.total
      });

      return stats;
    } catch (error) {
      this.logger.error('Error al obtener estadísticas de invitación', {
        error: error.message,
        companyId,
        dateRange
      });
      throw error;
    }
  }

  /**
   * Expirar invitaciones vencidas (tarea programada)
   */
  async expireOldInvitations(): Promise<number> {
    try {
      const expiredCount = await this.invitationRepository.expireOldInvitations();

      this.logger.info('Invitaciones expiradas automáticamente', {
        count: expiredCount
      });

      return expiredCount;
    } catch (error) {
      this.logger.error('Error al expirar invitaciones automáticamente', {
        error: error.message
      });
      throw error;
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Validar datos de invitación
   */
  private async validateInvitationRequest(data: CreateInvitationRequest): Promise<void> {
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('Email inválido');
    }

    // Verificar que la empresa exista
    const company = await this.companyRepository.findById(data.companyId);
    if (!company) {
      throw new Error('Empresa no encontrada');
    }

    // Verificar que el rol exista
    const role = await this.roleRepository.findById(data.roleId);
    if (!role) {
      throw new Error('Rol no encontrado');
    }

    // Verificar que el invitador pertenezca a la empresa
    const inviterBelongs = await this.userRepository.belongsToCompany(
      data.invitedBy,
      data.companyId
    );
    if (!inviterBelongs) {
      throw new Error('El usuario no tiene permisos para invitar a esta empresa');
    }
  }

  /**
   * Verificar invitaciones pendientes existentes
   */
  private async checkExistingPendingInvitation(
    email: string,
    companyId: string
  ): Promise<void> {
    const existing = await this.invitationRepository.findPendingByEmail(email, companyId);
    if (existing) {
      throw new Error('Ya existe una invitación pendiente para este email en esta empresa');
    }
  }

  /**
   * Generar token seguro para invitación
   */
  private generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validar token de invitación
   */
  private async validateInvitationToken(token: string): Promise<any> {
    const invitation = await this.invitationRepository.findByToken(token);
    if (!invitation) {
      throw new Error('Token de invitación inválido');
    }

    if (invitation.status !== 'pending') {
      throw new Error('La invitación ya no está disponible');
    }

    if (new Date() > invitation.expiresAt) {
      // Marcar como expirada automáticamente
      await this.invitationRepository.updateStatus(invitation.id, 'expired');
      throw new Error('La invitación ha expirado');
    }

    return invitation;
  }

  /**
   * Obtener detalles completos de invitación
   */
  private async getInvitationDetails(invitationId: string): Promise<InvitationResponse> {
    return await this.invitationRepository.getFullDetails(invitationId);
  }

  /**
   * Enviar email de invitación
   */
  private async sendInvitationEmail(invitation: any, isResend: boolean = false): Promise<void> {
    try {
      await this.emailService.sendInvitationEmail({
        to: invitation.email,
        companyName: invitation.companyName,
        roleName: invitation.roleName,
        invitedByName: invitation.invitedByName,
        personalMessage: invitation.personalMessage,
        invitationUrl: `${environment.frontend}/invitation/${invitation.token}`,
        expiresAt: invitation.expiresAt,
        isResend
      });
    } catch (error) {
      this.logger.error('Error al enviar email de invitación', {
        error: error.message,
        invitationId: invitation.id,
        email: invitation.email
      });
      // No fallar la invitación por problemas de email
    }
  }

  /**
   * Enviar email de bienvenida
   */
  private async sendWelcomeEmail(user: any, invitation: any): Promise<void> {
    try {
      await this.emailService.sendWelcomeEmail({
        to: user.email,
        firstName: user.firstName,
        companyName: invitation.companyName,
        roleName: invitation.roleName,
        dashboardUrl: `${environment.frontend}/dashboard`
      });
    } catch (error) {
      this.logger.error('Error al enviar email de bienvenida', {
        error: error.message,
        userId: user.id,
        email: user.email
      });
      // No fallar el proceso por problemas de email
    }
  }
}
