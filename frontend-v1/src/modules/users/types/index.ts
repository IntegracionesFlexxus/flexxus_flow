/**
 * User Types - Sprint 3
 * Definición de tipos para el módulo de usuarios
 * Siguiendo principio de responsabilidad única y segregación de interfaces
 */

// Tipos base de usuario
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  timezone?: string;
  language?: string;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  companyId: string;
}

// Estado de usuario
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}

// Roles del sistema
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  COMPANY_ADMIN = 'company_admin',
  COMPANY_MANAGER = 'company_manager',
  COMPANY_USER = 'company_user',
  COMPANY_VIEWER = 'company_viewer'
}

// DTOs para crear/editar usuarios
export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  password?: string;
  phone?: string;
  sendInvitation?: boolean;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  phone?: string;
  status?: UserStatus;
  avatar?: string;
  timezone?: string;
  language?: string;
}

// Invitación de usuario
export interface UserInvitation {
  id: string;
  email: string;
  companyId: string;
  companyName: string;
  roleId: string;
  roleName: string;
  invitedBy: string;
  invitedByName: string;
  personalMessage?: string;
  status: InvitationStatus;
  token?: string;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt?: Date;
}

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected'
}

// Request para invitar usuarios
export interface InviteUserRequest {
  email: string;
  roleId: string;
  personalMessage?: string;
  expirationDays?: number;
  permissions?: string[];
}

// Bulk invitation
export interface BulkInviteRequest {
  invitations: Array<{
    email: string;
    roleId: string;
    personalMessage?: string;
  }>;
  defaultRoleId?: string;
  expirationDays?: number;
}

// Permisos
export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
  category: PermissionCategory;
}

export enum PermissionCategory {
  USER_MANAGEMENT = 'user_management',
  ROLE_MANAGEMENT = 'role_management',
  COMPANY_MANAGEMENT = 'company_management',
  SYSTEM = 'system',
  REPORTING = 'reporting',
  BILLING = 'billing'
}

// Rol con permisos
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystemRole: boolean;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Filtros y paginación
export interface UserFilters {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  companyId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Actividad de usuario
export interface UserActivity {
  userId: string;
  lastLoginAt?: Date;
  totalSessions: number;
  activeSessions: number;
  recentActivity: ActivityLog[];
}

export interface ActivityLog {
  id: string;
  action: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// Respuestas del servicio
export interface UserResponse {
  user: User;
  permissions?: Permission[];
  companies?: UserCompany[];
}

export interface UserCompany {
  id: string;
  name: string;
  role: string;
  permissions?: string[];
  isDefault: boolean;
  status: string;
}

// Estado del formulario
export interface UserFormState {
  isLoading: boolean;
  error: string | null;
  validationErrors: Record<string, string>;
}

// Eventos de usuario para notificaciones
export interface UserEvent {
  type: UserEventType;
  userId: string;
  data: any;
  timestamp: Date;
}

export enum UserEventType {
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_INVITED = 'user_invited',
  INVITATION_ACCEPTED = 'invitation_accepted',
  INVITATION_REJECTED = 'invitation_rejected',
  ROLE_CHANGED = 'role_changed',
  PERMISSIONS_UPDATED = 'permissions_updated'
}