/**
 * Role Service - Sprint 3
 * Servicio para gestión de roles y permisos
 * Implementación con patrón Singleton
 */

import { api } from '@/shared/services/api';
import type { Role, Permission, PermissionCategory } from '@modules/users/types';

interface RoleRequest {
  name: string;
  description?: string;
  permissions: string[];
}


/**
 * RoleService
 * Gestión de roles y permisos RBAC
 */
class RoleService {
  private static instance: RoleService;
  private readonly baseUrl = '/roles';
  private readonly permissionsUrl = '/roles/permissions';

  private constructor() {}

  public static getInstance(): RoleService {
    if (!RoleService.instance) {
      RoleService.instance = new RoleService();
    }
    return RoleService.instance;
  }

  // ==================== ROLES ====================

  /**
   * Obtener roles de la empresa
   */
  async getCompanyRoles(_companyId: string): Promise<Role[]> {
    const response = await api.get<{ success: boolean; data: Role[] }>(
      `${this.baseUrl}/company`
    );
    return response.data.data;
  }

  /**
   * Obtener roles del sistema
   */
  async getSystemRoles(): Promise<Role[]> {
    const response = await api.get<{ success: boolean; data: Role[] }>(
      `${this.baseUrl}/system`
    );
    return response.data.data;
  }

  /**
   * Obtener rol por ID
   */
  async getRoleById(roleId: string): Promise<Role> {
    const response = await api.get<Role>(
      `${this.baseUrl}/${roleId}`
    );
    return response.data;
  }

  /**
   * Crear nuevo rol
   */
  async createRole(
    companyId: string,
    role: RoleRequest
  ): Promise<Role> {
    const response = await api.post<Role>(
      `${this.baseUrl}/company/${companyId}`,
      role
    );
    return response.data;
  }

  /**
   * Actualizar rol
   */
  async updateRole(
    roleId: string,
    updates: Partial<RoleRequest>
  ): Promise<Role> {
    const response = await api.put<Role>(
      `${this.baseUrl}/${roleId}`,
      updates
    );
    return response.data;
  }

  /**
   * Eliminar rol
   */
  async deleteRole(roleId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${roleId}`);
  }

  /**
   * Asignar rol a usuario
   */
  async assignRoleToUser(
    userId: string,
    roleId: string
  ): Promise<void> {
    await api.post(
      `${this.baseUrl}/${roleId}/users/${userId}`
    );
  }

  /**
   * Remover rol de usuario
   */
  async removeRoleFromUser(
    userId: string,
    roleId: string
  ): Promise<void> {
    await api.delete(
      `${this.baseUrl}/${roleId}/users/${userId}`
    );
  }

  /**
   * Clonar rol
   */
  async cloneRole(
    roleId: string,
    newName: string,
    companyId?: string
  ): Promise<Role> {
    const response = await api.post<Role>(
      `${this.baseUrl}/${roleId}/clone`,
      { name: newName, companyId }
    );
    return response.data;
  }

  // ==================== PERMISOS ====================

  /**
   * Obtener todos los permisos disponibles
   */
  async getAllPermissions(): Promise<Permission[]> {
    const response = await api.get<{ success: boolean; data: Permission[] }>(
      this.permissionsUrl
    );
    return response.data.data;
  }

  /**
   * Obtener permisos por categoría
   */
  async getPermissionsByCategory(
    category: PermissionCategory
  ): Promise<Permission[]> {
    const response = await api.get<Permission[]>(
      `${this.permissionsUrl}/category/${category}`
    );
    return response.data;
  }

  /**
   * Obtener permisos de un usuario
   */
  async getUserPermissions(
    userId: string,
    companyId?: string
  ): Promise<Permission[]> {
    const params = companyId ? `?companyId=${companyId}` : '';
    const response = await api.get<Permission[]>(
      `${this.permissionsUrl}/user/${userId}${params}`
    );
    return response.data;
  }

  /**
   * Actualizar permisos de usuario (permisos directos)
   */
  async updateUserPermissions(
    userId: string,
    permissions: string[]
  ): Promise<void> {
    await api.put(
      `${this.permissionsUrl}/user/${userId}`,
      { permissions }
    );
  }

  /**
   * Verificar si usuario tiene permiso específico
   */
  async checkUserPermission(
    userId: string,
    permission: string,
    resource?: string
  ): Promise<boolean> {
    const params = new URLSearchParams();
    params.append('permission', permission);
    if (resource) params.append('resource', resource);

    const response = await api.get<boolean>(
      `${this.permissionsUrl}/user/${userId}/check?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Obtener permisos efectivos (rol + directos)
   */
  async getEffectivePermissions(
    userId: string,
    companyId: string
  ): Promise<{
    fromRole: Permission[];
    direct: Permission[];
    effective: Permission[];
  }> {
    const response = await api.get(
      `${this.permissionsUrl}/user/${userId}/effective?companyId=${companyId}`
    );
    return response.data;
  }

  // ==================== UTILIDADES ====================

  /**
   * Buscar roles por nombre
   */
  async searchRoles(
    query: string,
    companyId?: string
  ): Promise<Role[]> {
    const params = companyId ? `&companyId=${companyId}` : '';
    const response = await api.get<Role[]>(
      `${this.baseUrl}/search?q=${encodeURIComponent(query)}${params}`
    );
    return response.data;
  }

  /**
   * Obtener estadísticas de roles
   */
  async getRoleStats(companyId: string): Promise<{
    totalRoles: number;
    systemRoles: number;
    customRoles: number;
    usersPerRole: Record<string, number>;
    mostUsedPermissions: Array<{
      permission: string;
      count: number;
    }>;
  }> {
    const response = await api.get(
      `${this.baseUrl}/company/${companyId}/stats`
    );
    return response.data;
  }

  /**
   * Validar nombre de rol único
   */
  async validateRoleName(
    name: string,
    companyId?: string
  ): Promise<boolean> {
    const params = companyId ? `?companyId=${companyId}` : '';
    const response = await api.get<boolean>(
      `${this.baseUrl}/validate-name/${encodeURIComponent(name)}${params}`
    );
    return response.data;
  }

  /**
   * Exportar configuración de roles
   */
  async exportRoles(companyId: string): Promise<string> {
    const response = await api.get<string>(
      `${this.baseUrl}/company/${companyId}/export`,
      { responseType: 'blob' as any }
    );
    return response.data;
  }

  /**
   * Importar configuración de roles
   */
  async importRoles(
    companyId: string,
    file: File
  ): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
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
}

// Exportar instancia única
export const roleService = RoleService.getInstance();