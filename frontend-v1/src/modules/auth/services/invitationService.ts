/**
 * Invitation Service - Sprint 3
 * Siguiendo lineamientos nivel 2: Servicio para gestión de invitaciones
 * SOLID: Responsabilidad única (gestión de invitaciones), DIP (depende de apiClient)
 */

import { api } from '@/shared/services/api';

export interface Invitation {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleName: string;
  companyId: string;
  companyName: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  token?: string;
  expiresAt: Date;
  acceptedAt?: Date;
  invitedById: string;
  invitedByName: string;
  invitedAt: Date;
  welcomeMessage?: string;
  customPermissions?: string[];
  metadata?: Record<string, any>;
  resendCount?: number;
  lastResentAt?: Date;
}

export interface SendInvitationData {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  welcomeMessage?: string;
  expiryDays?: number;
  customPermissions?: string[];
  department?: string;
  position?: string;
  skipEmailNotification?: boolean;
}

export interface BulkInvitationData {
  invitations: SendInvitationData[];
  defaultRoleId?: string;
  defaultExpiryDays?: number;
  defaultWelcomeMessage?: string;
}

export interface AcceptInvitationData {
  password: string;
  phoneNumber?: string;
  preferences?: {
    language?: string;
    timezone?: string;
    notifications?: {
      email?: boolean;
      push?: boolean;
    };
  };
}

export interface InvitationFilter {
  status?: ('pending' | 'accepted' | 'expired' | 'cancelled')[];
  roleIds?: string[];
  invitedByIds?: string[];
  searchTerm?: string;
  invitedAfter?: Date;
  invitedBefore?: Date;
  expiringBefore?: Date;
}

export interface InvitationStats {
  total: number;
  pending: number;
  accepted: number;
  expired: number;
  cancelled: number;
  acceptanceRate: number;
  averageTimeToAccept: number;
  byRole: Record<string, number>;
  recentActivity: {
    sent: number;
    accepted: number;
    expired: number;
  };
}

export interface InvitationTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  body: string;
  variables: string[];
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class InvitationService {
  private readonly basePath = '/invitations';

  /**
   * Obtener invitaciones de la empresa
   * @param companyId ID de la empresa
   * @param filters Filtros opcionales
   */
  async getCompanyInvitations(companyId: string, filters?: InvitationFilter): Promise<Invitation[]> {
    const response = await api.get<Invitation[]>(
      `/companies/${companyId}/invitations`,
      { params: filters }
    );
    return response.data;
  }

  /**
   * Obtener una invitación específica
   * @param invitationId ID de la invitación
   */
  async getInvitation(invitationId: string): Promise<Invitation> {
    const response = await api.get<Invitation>(`${this.basePath}/${invitationId}`);
    return response.data;
  }

  /**
   * Enviar una invitación
   * @param companyId ID de la empresa
   * @param data Datos de la invitación
   */
  async sendInvitation(companyId: string, data: SendInvitationData): Promise<Invitation> {
    const response = await api.post<Invitation>(
      `/companies/${companyId}/invitations`,
      data
    );
    return response.data;
  }

  /**
   * Enviar invitaciones masivas
   * @param companyId ID de la empresa
   * @param data Datos de las invitaciones
   */
  async sendBulkInvitations(companyId: string, data: BulkInvitationData): Promise<{
    sent: Invitation[];
    failed: { email: string; error: string }[];
  }> {
    const response = await api.post<{
      sent: Invitation[];
      failed: { email: string; error: string }[];
    }>(
      `/companies/${companyId}/invitations/bulk`,
      data
    );
    return response.data;
  }

  /**
   * Reenviar una invitación
   * @param invitationId ID de la invitación
   */
  async resendInvitation(invitationId: string): Promise<void> {
    await api.post(`${this.basePath}/${invitationId}/resend`);
  }

  /**
   * Cancelar una invitación
   * @param invitationId ID de la invitación
   */
  async cancelInvitation(invitationId: string): Promise<void> {
    await api.delete(`${this.basePath}/${invitationId}`);
  }

  /**
   * Cancelar múltiples invitaciones
   * @param invitationIds IDs de las invitaciones
   */
  async cancelMultipleInvitations(invitationIds: string[]): Promise<{
    cancelled: number;
    failed: number;
  }> {
    const response = await api.post<{
      cancelled: number;
      failed: number;
    }>(`${this.basePath}/cancel-multiple`, { invitationIds });
    return response.data;
  }

  /**
   * Aceptar una invitación
   * @param token Token de invitación
   * @param userData Datos del usuario
   */
  async acceptInvitation(token: string, userData: AcceptInvitationData): Promise<{
    user: any;
    token: string;
    company: any;
  }> {
    const response = await api.post<{
      user: any;
      token: string;
      company: any;
    }>(`${this.basePath}/accept/${token}`, userData);
    return response.data;
  }

  /**
   * Validar token de invitación
   * @param token Token a validar
   */
  async validateInvitationToken(token: string): Promise<{
    valid: boolean;
    invitation?: Invitation;
    error?: string;
  }> {
    const response = await api.get<{
      valid: boolean;
      invitation?: Invitation;
      error?: string;
    }>(`${this.basePath}/validate/${token}`);
    return response.data;
  }

  /**
   * Extender expiración de invitación
   * @param invitationId ID de la invitación
   * @param days Días adicionales
   */
  async extendInvitation(invitationId: string, days: number): Promise<Invitation> {
    const response = await api.patch<Invitation>(
      `${this.basePath}/${invitationId}/extend`,
      { days }
    );
    return response.data;
  }

  /**
   * Obtener estadísticas de invitaciones
   * @param companyId ID de la empresa
   */
  async getInvitationStats(companyId: string): Promise<InvitationStats> {
    const response = await api.get<InvitationStats>(
      `/companies/${companyId}/invitations/stats`
    );
    return response.data;
  }

  /**
   * Obtener plantillas de invitación
   * @param companyId ID de la empresa
   */
  async getInvitationTemplates(companyId: string): Promise<InvitationTemplate[]> {
    const response = await api.get<InvitationTemplate[]>(
      `/companies/${companyId}/invitation-templates`
    );
    return response.data;
  }

  /**
   * Crear plantilla de invitación
   * @param companyId ID de la empresa
   * @param template Datos de la plantilla
   */
  async createInvitationTemplate(
    companyId: string,
    template: Omit<InvitationTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<InvitationTemplate> {
    const response = await api.post<InvitationTemplate>(
      `/companies/${companyId}/invitation-templates`,
      template
    );
    return response.data;
  }

  /**
   * Actualizar plantilla de invitación
   * @param templateId ID de la plantilla
   * @param updates Actualizaciones
   */
  async updateInvitationTemplate(
    templateId: string,
    updates: Partial<Omit<InvitationTemplate, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<InvitationTemplate> {
    const response = await api.patch<InvitationTemplate>(
      `/invitation-templates/${templateId}`,
      updates
    );
    return response.data;
  }

  /**
   * Eliminar plantilla de invitación
   * @param templateId ID de la plantilla
   */
  async deleteInvitationTemplate(templateId: string): Promise<void> {
    await api.delete(`/invitation-templates/${templateId}`);
  }

  /**
   * Previsualizar email de invitación
   * @param companyId ID de la empresa
   * @param data Datos de la invitación
   */
  async previewInvitationEmail(companyId: string, data: {
    templateId?: string;
    welcomeMessage?: string;
    recipientData: {
      email: string;
      firstName: string;
      lastName: string;
      roleName: string;
    };
  }): Promise<{
    subject: string;
    htmlBody: string;
    textBody: string;
  }> {
    const response = await api.post<{
      subject: string;
      htmlBody: string;
      textBody: string;
    }>(
      `/companies/${companyId}/invitations/preview`,
      data
    );
    return response.data;
  }

  /**
   * Exportar invitaciones a CSV
   * @param companyId ID de la empresa
   * @param filters Filtros opcionales
   */
  async exportInvitations(companyId: string, filters?: InvitationFilter): Promise<Blob> {
    const response = await api.get(
      `/companies/${companyId}/invitations/export`,
      {
        params: filters,
        responseType: 'blob'
      }
    );
    return response.data;
  }

  /**
   * Importar invitaciones desde CSV
   * @param companyId ID de la empresa
   * @param file Archivo CSV
   */
  async importInvitations(companyId: string, file: File): Promise<{
    imported: number;
    failed: number;
    errors?: { row: number; email: string; error: string }[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<{
      imported: number;
      failed: number;
      errors?: { row: number; email: string; error: string }[];
    }>(
      `/companies/${companyId}/invitations/import`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  }

  /**
   * Obtener historial de una invitación
   * @param invitationId ID de la invitación
   */
  async getInvitationHistory(invitationId: string): Promise<{
    events: {
      type: string;
      timestamp: Date;
      actor?: string;
      details?: any;
    }[];
  }> {
    const response = await api.get<{
      events: {
        type: string;
        timestamp: Date;
        actor?: string;
        details?: any;
      }[];
    }>(`${this.basePath}/${invitationId}/history`);
    return response.data;
  }
}

// Singleton instance - siguiendo patrón de Nivel 2
export const invitationService = new InvitationService();