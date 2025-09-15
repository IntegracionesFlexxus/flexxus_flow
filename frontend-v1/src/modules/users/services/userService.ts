/**
 * User Service - Sprint 3
 * Servicio para gestión de usuarios
 * Implementación siguiendo patrones Singleton y Adapter
 */

import { api } from '@/shared/services/api';
import type { 
  User, 
  CreateUserRequest, 
  UpdateUserRequest, 
  UserFilters, 
  PaginationParams, 
  PaginatedResponse,
  UserActivity,
  UserCompany
} from '@modules/users/types';

/**
 * UserService
 * Patrón Singleton para gestión de usuarios
 * Principio DIP: Depende de la abstracción apiClient
 */
class UserService {
  private static instance: UserService;
  private readonly baseUrl = '/users';

  private constructor() {}

  /**
   * Obtener instancia única del servicio
   */
  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Obtener usuarios de la empresa
   * Clean Code: función pura sin efectos secundarios
   */
  async getCompanyUsers(
    companyId: string, 
    filters?: UserFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<User>> {
    const params = new URLSearchParams();
    
    // Agregar filtros
    if (filters) {
      if (filters.search) params.append('search', filters.search);
      if (filters.role) params.append('role', filters.role);
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
    }
    
    // Agregar paginación
    if (pagination) {
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      if (pagination.sortBy) params.append('sortBy', pagination.sortBy);
      if (pagination.sortOrder) params.append('sortOrder', pagination.sortOrder);
    }
    
    const response = await api.get<PaginatedResponse<User>>(
      `${this.baseUrl}/company/${companyId}?${params.toString()}`
    );
    
    return response.data;
  }

  /**
   * Obtener usuario por ID
   */
  async getUserById(userId: string): Promise<User> {
    const response = await api.get<{ user: User }>(
      `${this.baseUrl}/${userId}`
    );
    return response.data.user;
  }

  /**
   * Crear nuevo usuario
   * Patrón Factory Method implícito en la creación
   */
  async createUser(
    companyId: string,
    userData: CreateUserRequest
  ): Promise<User> {
    console.log('🚀 [Frontend UserService] Creating user:', { companyId, userData });
    console.log('🔐 [Frontend UserService] Current token:', localStorage.getItem('auth_access_token')?.substring(0, 50) + '...');
    console.log('📡 [Frontend UserService] API Base URL:', api.defaults.baseURL);
    console.log('📝 [Frontend UserService] Request URL:', `${this.baseUrl}`);
    console.log('📦 [Frontend UserService] Request body:', userData);
    
    try {
      // Backend expects POST /api/v1/users and infers companyId from the authenticated user
      console.log('🌐 [Frontend UserService] Making POST request to:', `${this.baseUrl}`);
      const response = await api.post<{ user: User }>(
        `${this.baseUrl}`,
        userData
      );
      console.log('✅ [Frontend UserService] Response received:', response);
      
      console.log('✅ [Frontend] User created successfully:', response.data);
      return response.data.user;
    } catch (error) {
      console.error('❌ [Frontend] Error creating user:', error);
      throw error;
    }
  }

  /**
   * Actualizar usuario
   */
  async updateUser(
    userId: string,
    updates: UpdateUserRequest
  ): Promise<User> {
    const response = await api.put<{ user: User }>(
      `${this.baseUrl}/${userId}`,
      updates
    );
    return response.data.user;
  }

  /**
   * Eliminar usuario
   */
  async deleteUser(userId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${userId}`);
  }

  /**
   * Activar/Desactivar usuario
   */
  async toggleUserStatus(
    userId: string, 
    isActive: boolean
  ): Promise<User> {
    const response = await api.patch<{ user: User }>(
      `${this.baseUrl}/${userId}/status`,
      { isActive }
    );
    return response.data.user;
  }

  /**
   * Cambiar rol de usuario
   */
  async changeUserRole(
    userId: string,
    roleId: string
  ): Promise<User> {
    const response = await api.put<{ user: User }>(
      `${this.baseUrl}/${userId}/role`,
      { roleId }
    );
    return response.data.user;
  }

  /**
   * Obtener actividad del usuario
   */
  async getUserActivity(userId: string): Promise<UserActivity> {
    const response = await api.get<{ activity: UserActivity }>(
      `${this.baseUrl}/${userId}/activity`
    );
    return response.data.activity;
  }

  /**
   * Obtener empresas del usuario
   */
  async getUserCompanies(userId: string): Promise<UserCompany[]> {
    const response = await api.get<{ companies: UserCompany[] }>(
      `${this.baseUrl}/${userId}/companies`
    );
    return response.data.companies;
  }

  /**
   * Agregar usuario a empresa
   */
  async addUserToCompany(
    userId: string,
    companyId: string,
    roleId: string
  ): Promise<void> {
    await api.post(
      `${this.baseUrl}/${userId}/companies`,
      { companyId, roleId }
    );
  }

  /**
   * Remover usuario de empresa
   */
  async removeUserFromCompany(
    userId: string,
    companyId: string
  ): Promise<void> {
    await api.delete(
      `${this.baseUrl}/${userId}/companies/${companyId}`
    );
  }

  /**
   * Restablecer contraseña de usuario
   */
  async resetUserPassword(userId: string): Promise<void> {
    await api.post(`${this.baseUrl}/${userId}/reset-password`);
  }

  /**
   * Verificar email de usuario
   */
  async verifyUserEmail(userId: string, token: string): Promise<void> {
    await api.post(
      `${this.baseUrl}/${userId}/verify-email`,
      { token }
    );
  }

  /**
   * Exportar usuarios a CSV
   */
  async exportUsers(
    companyId: string,
    filters?: UserFilters
  ): Promise<string> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.search) params.append('search', filters.search);
      if (filters.role) params.append('role', filters.role);
      if (filters.status) params.append('status', filters.status);
    }
    
    const response = await api.get<string>(
      `${this.baseUrl}/company/${companyId}/export?${params.toString()}`,
      { responseType: 'blob' as any }
    );
    
    return response.data;
  }

  /**
   * Importar usuarios desde CSV
   */
  async importUsers(
    companyId: string,
    file: File
  ): Promise<{ successful: number; failed: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(
      `${this.baseUrl}/company/${companyId}/import`,
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
   * Búsqueda de usuarios por email
   * Útil para autocompletado
   */
  async searchUsersByEmail(
    companyId: string,
    query: string
  ): Promise<User[]> {
    const response = await api.get<{ users: User[] }>(
      `${this.baseUrl}/company/${companyId}/search?email=${encodeURIComponent(query)}`
    );
    return response.data.users;
  }

  /**
   * Validar disponibilidad de email
   */
  async checkEmailAvailability(
    email: string,
    companyId?: string
  ): Promise<boolean> {
    const params = companyId ? `?companyId=${companyId}` : '';
    const response = await api.get<{ available: boolean }>(
      `${this.baseUrl}/check-email/${encodeURIComponent(email)}${params}`
    );
    return response.data.available;
  }

  /**
   * Obtener estadísticas de usuarios
   */
  async getUserStats(companyId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    pending: number;
    byRole: Record<string, number>;
    recentlyAdded: number;
    lastWeekLogins: number;
  }> {
    const response = await api.get(
      `${this.baseUrl}/company/${companyId}/stats`
    );
    return response.data;
  }
}

// Exportar instancia única (Patrón Singleton)
export const userService = UserService.getInstance();