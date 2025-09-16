/**
 * User Service - Sprint 3
 * Siguiendo lineamientos nivel 2: Servicio para gestión de usuarios
 * SOLID: Responsabilidad única (gestión de usuarios), DIP (depende de apiClient)
 */

import { api } from '@/shared/services/api';
import { Permission } from './roleService';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: string;
  roleId: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  emailVerified: boolean;
  phoneNumber?: string;
  phoneVerified?: boolean;
  companyId: string;
  department?: string;
  position?: string;
  lastLoginAt?: Date;
  lastActivityAt?: Date;
  preferences?: UserPreferences;
  permissions?: Permission[];
  customPermissions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
    sms?: boolean;
  };
  dashboard?: {
    layout?: string;
    widgets?: string[];
    defaultView?: string;
  };
  accessibility?: {
    highContrast?: boolean;
    fontSize?: 'small' | 'medium' | 'large';
    reducedMotion?: boolean;
  };
}

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  companyId: string;
  department?: string;
  position?: string;
  phoneNumber?: string;
  sendInvitation?: boolean;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  roleId?: string;
  status?: string;
  department?: string;
  position?: string;
  phoneNumber?: string;
  avatar?: string;
}

export interface UpdatePermissionsData {
  roleId?: string;
  customPermissions?: string[];
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  isCurrentSession: boolean;
  lastActivity: Date;
  expiresAt: Date;
  createdAt: Date;
}

export interface BulkUserOperation {
  userIds: string[];
  operation: 'activate' | 'deactivate' | 'delete' | 'changeRole' | 'sendEmail';
  data?: any;
}

export interface UserFilter {
  status?: string[];
  roleIds?: string[];
  departments?: string[];
  searchTerm?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
  hasCustomPermissions?: boolean;
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
  pages: number;
}

class UserService {
  private readonly basePath = '/users';

  /**
   * Obtener usuarios de la empresa con filtros y paginación
   * @param companyId ID de la empresa
   * @param filters Filtros opcionales
   * @param pagination Parámetros de paginación
   */
  async getCompanyUsers(
    companyId: string,
    filters?: UserFilter,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<User> | User[]> {
    const params = {
      companyId,
      ...filters,
      ...pagination
    };
    
    const response = await api.get<PaginatedResponse<User> | User[]>(
      `/companies/${companyId}/users`,
      { params }
    );
    return response.data;
  }

  /**
   * Obtener un usuario específico
   * @param userId ID del usuario
   */
  async getUser(userId: string): Promise<User> {
    const response = await api.get<User>(`${this.basePath}/${userId}`);
    return response.data;
  }

  /**
   * Crear un nuevo usuario
   * @param companyId ID de la empresa
   * @param userData Datos del nuevo usuario
   */
  async createUser(companyId: string, userData: CreateUserData): Promise<User> {
    // Agregar el companyId al userData
    const dataWithCompany = {
      ...userData,
      companyId
    };
    const response = await api.post<User>(this.basePath, dataWithCompany);
    return response.data;
  }

  /**
   * Actualizar un usuario existente
   * @param userId ID del usuario
   * @param userData Datos a actualizar
   */
  async updateUser(userId: string, userData: UpdateUserData): Promise<User> {
    const response = await api.patch<User>(`${this.basePath}/${userId}`, userData);
    return response.data;
  }

  /**
   * Eliminar un usuario
   * @param userId ID del usuario
   */
  async deleteUser(userId: string): Promise<void> {
    await api.delete(`${this.basePath}/${userId}`);
  }

  /**
   * Obtener permisos del usuario
   * @param userId ID del usuario
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const response = await api.get<Permission[]>(`${this.basePath}/${userId}/permissions`);
    return response.data;
  }

  /**
   * Actualizar permisos del usuario
   * @param userId ID del usuario
   * @param data Datos de permisos
   */
  async updateUserPermissions(userId: string, data: UpdatePermissionsData): Promise<void> {
    await api.patch(`${this.basePath}/${userId}/permissions`, data);
  }

  /**
   * Cambiar contraseña del usuario
   * @param userId ID del usuario
   * @param currentPassword Contraseña actual
   * @param newPassword Nueva contraseña
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    await api.post(`${this.basePath}/${userId}/change-password`, {
      currentPassword,
      newPassword
    });
  }

  /**
   * Resetear contraseña del usuario (admin)
   * @param userId ID del usuario
   */
  async resetPassword(userId: string): Promise<{ temporaryPassword: string }> {
    const response = await api.post<{ temporaryPassword: string }>(
      `${this.basePath}/${userId}/reset-password`
    );
    return response.data;
  }

  /**
   * Actualizar preferencias del usuario
   * @param userId ID del usuario
   * @param preferences Preferencias a actualizar
   */
  async updatePreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    const response = await api.patch<UserPreferences>(
      `${this.basePath}/${userId}/preferences`,
      preferences
    );
    return response.data;
  }

  /**
   * Obtener actividad del usuario
   * @param userId ID del usuario
   * @param limit Límite de resultados
   */
  async getUserActivity(userId: string, limit = 50): Promise<UserActivity[]> {
    const response = await api.get<UserActivity[]>(
      `${this.basePath}/${userId}/activity`,
      { params: { limit } }
    );
    return response.data;
  }

  /**
   * Obtener sesiones activas del usuario
   * @param userId ID del usuario
   */
  async getUserSessions(userId: string): Promise<UserSession[]> {
    const response = await api.get<UserSession[]>(`${this.basePath}/${userId}/sessions`);
    return response.data;
  }

  /**
   * Terminar una sesión específica
   * @param userId ID del usuario
   * @param sessionId ID de la sesión
   */
  async terminateSession(userId: string, sessionId: string): Promise<void> {
    await api.delete(`${this.basePath}/${userId}/sessions/${sessionId}`);
  }

  /**
   * Terminar todas las sesiones del usuario
   * @param userId ID del usuario
   */
  async terminateAllSessions(userId: string): Promise<void> {
    await api.delete(`${this.basePath}/${userId}/sessions`);
  }

  /**
   * Cambiar empresa del usuario
   * @param companyId ID de la nueva empresa
   */
  async switchCompany(companyId: string): Promise<{ token: string; user: User }> {
    const response = await api.post<{ token: string; user: User }>(
      '/auth/switch-company',
      { companyId }
    );
    return response.data;
  }

  /**
   * Subir avatar del usuario
   * @param userId ID del usuario
   * @param file Archivo de imagen
   */
  async uploadAvatar(userId: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await api.post<{ url: string }>(
      `${this.basePath}/${userId}/avatar`,
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
   * Operación masiva en usuarios
   * @param operation Operación a realizar
   */
  async bulkOperation(operation: BulkUserOperation): Promise<{ success: number; failed: number; errors?: any[] }> {
    const response = await api.post<{ success: number; failed: number; errors?: any[] }>(
      `${this.basePath}/bulk`,
      operation
    );
    return response.data;
  }

  /**
   * Exportar usuarios a CSV
   * @param companyId ID de la empresa
   * @param filters Filtros opcionales
   */
  async exportUsers(companyId: string, filters?: UserFilter): Promise<Blob> {
    const response = await api.get(
      `/companies/${companyId}/users/export`,
      {
        params: filters,
        responseType: 'blob'
      }
    );
    return response.data;
  }

  /**
   * Importar usuarios desde CSV
   * @param companyId ID de la empresa
   * @param file Archivo CSV
   */
  async importUsers(companyId: string, file: File): Promise<{ imported: number; failed: number; errors?: any[] }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<{ imported: number; failed: number; errors?: any[] }>(
      `/companies/${companyId}/users/import`,
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
   * Verificar disponibilidad de email
   * @param email Email a verificar
   */
  async checkEmailAvailability(email: string): Promise<{ available: boolean }> {
    const response = await api.post<{ available: boolean }>(
      `${this.basePath}/check-email`,
      { email }
    );
    return response.data;
  }

  /**
   * Obtener estadísticas de usuarios
   * @param companyId ID de la empresa
   */
  async getUserStats(companyId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    pending: number;
    byRole: Record<string, number>;
    byDepartment: Record<string, number>;
    recentlyActive: number;
  }> {
    const response = await api.get(`/companies/${companyId}/users/stats`);
    return response.data;
  }
}

// Singleton instance - siguiendo patrón de Nivel 2
export const userService = new UserService();