/**
 * Invitation Repository Interface
 * Sprint 3 - Backend Team
 * Definición de contrato para repositorio de invitaciones siguiendo principios SOLID
 */
export interface InvitationData {
  email: string;
  companyId: string;
  roleId: string;
  invitedBy: string;
  permissions?: string[];
  personalMessage?: string;
  token: string;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled' | 'rejected';
}
export interface InvitationUpdateData {
  token?: string;
  expiresAt?: Date;
  status?: string;
  acceptedAt?: Date;
  acceptedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  resentAt?: Date;
  resentBy?: string;
}
export interface InvitationFilters {
  status?: string;
  roleId?: string;
  invitedBy?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
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
export interface IInvitationRepository {
  // ==================== OPERACIONES BÁSICAS CRUD ====================
  /**
   * Crear nueva invitación
   */
  create(invitationData: InvitationData): Promise<any>;
  /**
   * Buscar invitación por ID
   */
  findById(invitationId: string): Promise<any | null>;
  /**
   * Buscar invitación por token
   */
  findByToken(token: string): Promise<any | null>;
  /**
   * Actualizar invitación
   */
  update(invitationId: string, updates: InvitationUpdateData): Promise<any | null>;
  /**
   * Actualizar estado de invitación
   */
  updateStatus(
    invitationId: string, 
    status: string, 
    additionalData?: Record<string, any>
  ): Promise<void>;
  /**
   * Eliminar invitación (soft delete)
   */
  delete(invitationId: string): Promise<boolean>;
  // ==================== CONSULTAS ESPECÍFICAS ====================
  /**
   * Buscar invitaciones por email
   */
  findByEmail(email: string): Promise<any[]>;
  /**
   * Buscar invitación pendiente por email y empresa
   */
  findPendingByEmail(email: string, companyId: string): Promise<any | null>;
  /**
   * Buscar invitaciones por empresa
   */
  findByCompany(
    companyId: string,
    filters?: InvitationFilters
  ): Promise<{
    invitations: any[];
    total: number;
  }>;
  /**
   * Buscar invitaciones por usuario invitador
   */
  findByInviter(
    invitedBy: string,
    companyId?: string,
    filters?: InvitationFilters
  ): Promise<any[]>;
  /**
   * Buscar invitaciones por rol
   */
  findByRole(
    roleId: string,
    companyId?: string,
    filters?: InvitationFilters
  ): Promise<any[]>;
  /**
   * Buscar invitaciones por estado
   */
  findByStatus(
    status: string,
    companyId?: string,
    limit?: number,
    offset?: number
  ): Promise<any[]>;
  // ==================== OPERACIONES DE MANTENIMIENTO ====================
  /**
   * Expirar invitaciones vencidas automáticamente
   */
  expireOldInvitations(): Promise<number>;
  /**
   * Limpiar invitaciones antiguas
   */
  cleanupOldInvitations(olderThanDays: number): Promise<number>;
  /**
   * Obtener invitaciones próximas a expirar
   */
  getExpiringInvitations(withinHours: number): Promise<any[]>;
  // ==================== ESTADÍSTICAS Y ANALYTICS ====================
  /**
   * Obtener estadísticas de invitaciones
   */
  getStats(
    companyId?: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<InvitationStatsResponse>;
  /**
   * Obtener métricas de conversión
   */
  getConversionMetrics(
    companyId?: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<{
    totalInvitations: number;
    acceptedInvitations: number;
    conversionRate: number;
    averageAcceptanceTime: number;
    conversionByRole: Array<{
      roleId: string;
      roleName: string;
      invitations: number;
      accepted: number;
      conversionRate: number;
    }>;
  }>;
  /**
   * Obtener tendencias de invitaciones
   */
  getTrends(
    companyId?: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    days: number = 30
  ): Promise<Array<{
    date: string;
    invitations: number;
    accepted: number;
    pending: number;
    expired: number;
  }>>;
  // ==================== CONSULTAS AVANZADAS ====================
  /**
   * Obtener detalles completos de invitación con relaciones
   */
  getFullDetails(invitationId: string): Promise<{
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
    status: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    acceptedAt?: Date;
    rejectedAt?: Date;
    cancelledAt?: Date;
    resentAt?: Date;
  }>;
  /**
   * Verificar si un usuario puede ser invitado
   */
  canInviteUser(email: string, companyId: string): Promise<{
    canInvite: boolean;
    reason?: string;
    existingStatus?: string;
  }>;
  /**
   * Obtener historial de invitaciones de un usuario
   */
  getUserInvitationHistory(email: string): Promise<any[]>;
  /**
   * Contar invitaciones por filtros
   */
  count(filters?: Partial<InvitationFilters & { companyId: string }>): Promise<number>;
  /**
   * Buscar invitaciones con paginación avanzada
   */
  findWithPagination(filters: InvitationFilters & { companyId: string }): Promise<{
    invitations: any[];
    total: number;
    page: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }>;
  /**
   * Obtener resumen de invitaciones pendientes por rol
   */
  getPendingSummaryByRole(companyId: string): Promise<Array<{
    roleId: string;
    roleName: string;
    pendingCount: number;
    totalInvitations: number;
    oldestPending?: Date;
  }>>;
}
