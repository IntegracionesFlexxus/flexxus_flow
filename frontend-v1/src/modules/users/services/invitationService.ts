/**
 * Invitation Service - Sprint 3
 * Servicio para gestión de invitaciones
 * Implementación con patrón Singleton y principios SOLID
 */

import { api } from '@/shared/services/api';
import type {
  UserInvitation,
  InviteUserRequest,
  BulkInviteRequest,
  InvitationStatus
} from '@modules/users/types';

interface InvitationResponse {
  invitation: UserInvitation;
}

interface BulkInvitationResponse {
  successful: UserInvitation[];
  failed: Array<{
    email: string;
    error: string;
  }>;
}

interface InvitationStats {
  total: number;
  pending: number;
  accepted: number;
  expired: number;
  cancelled: number;
  acceptanceRate: number;
}

/**
 * InvitationService
 * Gestión completa de invitaciones de usuarios
 * Principio SRP: Responsabilidad única para invitaciones
 */
class InvitationService {
  private static instance: InvitationService;
  private readonly baseUrl = '/invitations';

  private constructor() {}

  /**
   * Obtener instancia única
   */
  public static getInstance(): InvitationService {
    if (!InvitationService.instance) {
      InvitationService.instance = new InvitationService();
    }
    return InvitationService.instance;
  }

  /**
   * Invitar un usuario
   */
  async inviteUser(
    companyId: string,
    invitation: InviteUserRequest
  ): Promise<UserInvitation> {
    const response = await api.post<InvitationResponse>(
      `${this.baseUrl}/company/${companyId}`,
      invitation
    );
    return response.data.invitation;
  }

  /**
   * Invitar múltiples usuarios
   * Patrón Factory para creación masiva
   */
  async bulkInvite(
    companyId: string,
    request: BulkInviteRequest
  ): Promise<BulkInvitationResponse> {
    const response = await api.post<BulkInvitationResponse>(
      `${this.baseUrl}/company/${companyId}/bulk`,
      request
    );
    return response.data;
  }

  /**
   * Obtener invitaciones de la empresa
   */
  async getCompanyInvitations(
    companyId: string,
    status?: InvitationStatus
  ): Promise<UserInvitation[]> {
    const params = status ? `?status=${status}` : '';
    const response = await api.get<{ invitations: UserInvitation[] }>(
      `${this.baseUrl}/company/${companyId}${params}`
    );
    return response.data.invitations;
  }

  /**
   * Obtener invitación por ID
   */
  async getInvitationById(invitationId: string): Promise<UserInvitation> {
    const response = await api.get<InvitationResponse>(
      `${this.baseUrl}/${invitationId}`
    );
    return response.data.invitation;
  }

  /**
   * Reenviar invitación
   */
  async resendInvitation(invitationId: string): Promise<void> {
    await api.post(`${this.baseUrl}/${invitationId}/resend`);
  }

  /**
   * Cancelar invitación
   */
  async cancelInvitation(invitationId: string): Promise<void> {
    await api.post(`${this.baseUrl}/${invitationId}/cancel`);
  }

  /**
   * Aceptar invitación
   */
  async acceptInvitation(
    token: string,
    userData?: {
      firstName: string;
      lastName: string;
      password: string;
    }
  ): Promise<{ user: any; token: string }> {
    const response = await api.post(
      `${this.baseUrl}/accept`,
      { token, userData }
    );
    return response.data;
  }

  /**
   * Rechazar invitación
   */
  async rejectInvitation(token: string): Promise<void> {
    await api.post(`${this.baseUrl}/reject`, { token });
  }

  /**
   * Validar token de invitación
   */
  async validateInvitationToken(token: string): Promise<{
    valid: boolean;
    invitation?: UserInvitation;
    error?: string;
  }> {
    try {
      const response = await api.get(
        `${this.baseUrl}/validate/${token}`
      );
      return response.data;
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.data?.message || 'Token inválido'
      };
    }
  }

  /**
   * Extender expiración de invitación
   */
  async extendInvitation(
    invitationId: string,
    days: number
  ): Promise<UserInvitation> {
    const response = await api.post<InvitationResponse>(
      `${this.baseUrl}/${invitationId}/extend`,
      { days }
    );
    return response.data.invitation;
  }

  /**
   * Obtener estadísticas de invitaciones
   */
  async getInvitationStats(companyId: string): Promise<InvitationStats> {
    const response = await api.get<InvitationStats>(
      `${this.baseUrl}/company/${companyId}/stats`
    );
    return response.data;
  }

  /**
   * Buscar invitaciones por email
   */
  async searchInvitations(
    companyId: string,
    email: string
  ): Promise<UserInvitation[]> {
    const response = await api.get<{ invitations: UserInvitation[] }>(
      `${this.baseUrl}/company/${companyId}/search?email=${encodeURIComponent(email)}`
    );
    return response.data.invitations;
  }

  /**
   * Verificar si un email tiene invitación pendiente
   */
  async checkPendingInvitation(
    companyId: string,
    email: string
  ): Promise<boolean> {
    const response = await api.get<{ hasPending: boolean }>(
      `${this.baseUrl}/company/${companyId}/check-pending/${encodeURIComponent(email)}`
    );
    return response.data.hasPending;
  }

  /**
   * Obtener historial de invitaciones de un usuario
   */
  async getUserInvitationHistory(
    companyId: string,
    userId: string
  ): Promise<UserInvitation[]> {
    const response = await api.get<{ invitations: UserInvitation[] }>(
      `${this.baseUrl}/company/${companyId}/user/${userId}/history`
    );
    return response.data.invitations;
  }

  /**
   * Reenviar todas las invitaciones pendientes
   * Útil para recordatorios masivos
   */
  async resendAllPending(companyId: string): Promise<{
    successful: number;
    failed: number;
  }> {
    const response = await api.post(
      `${this.baseUrl}/company/${companyId}/resend-all`
    );
    return response.data;
  }

  /**
   * Limpiar invitaciones expiradas
   */
  async cleanupExpired(companyId: string): Promise<{
    deleted: number;
  }> {
    const response = await api.delete(
      `${this.baseUrl}/company/${companyId}/cleanup`
    );
    return response.data;
  }
}

// Exportar instancia única
export const invitationService = InvitationService.getInstance();