/**
 * Role Service - Sprint 3
 * Siguiendo lineamientos nivel 2: Servicio para gestión de roles y permisos
 * SOLID: Responsabilidad única (gestión de roles), DIP (depende de apiClient)
 */

import { api } from '@/shared/services/api';

export interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string;
  module: string;
  category: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: Permission[];
  isSystem?: boolean;
  companyId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateRoleData {
  name: string;
  displayName: string;
  description: string;
  permissionIds: string[];
  companyId?: string;
}

export interface UpdateRoleData {
  displayName?: string;
  description?: string;
  permissionIds?: string[];
}

class RoleService {
  private readonly basePath = '/roles';
  private readonly permissionsPath = '/permissions';

  /**
   * Obtener todos los roles disponibles
   * @param companyId ID de la empresa (opcional) o objeto de filtros
   */
  async getRoles(companyId?: string | any): Promise<Role[]> {
    try {
      // Si recibe un objeto de filtros (algunos componentes lo hacen)
      if (typeof companyId === 'object' && companyId !== null) {
        const response = await api.get<any>(this.basePath, { params: companyId });
        
        // Debug en desarrollo
        if (import.meta.env.DEV) {
          console.log('[RoleService] Response with filters:', response.data);
        }
        
        // Respuesta con paginación { success, data: [...], pagination }
        if (response.data?.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
        
        // Respuesta directa como array
        if (Array.isArray(response.data)) {
          return response.data;
        }
        
        return [];
      }
      
      // Si recibe solo companyId string o undefined
      const params = companyId ? { companyId } : undefined;
      const response = await api.get<any>(this.basePath, { params });
      
      // Debug en desarrollo
      if (import.meta.env.DEV) {
        console.log('[RoleService] Response:', response.data);
      }
      
      // Manejar diferentes formatos de respuesta
      
      // 1. Respuesta directa como array
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      // 2. Respuesta con estructura { success, data: [...] }
      if (response.data?.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      
      // 3. Respuesta con estructura { success, data: { roles: [...] } }
      if (response.data?.data?.roles && Array.isArray(response.data.data.roles)) {
        return response.data.data.roles;
      }
      
      // 4. Respuesta con estructura { roles: [...] }
      if (response.data?.roles && Array.isArray(response.data.roles)) {
        return response.data.roles;
      }
      
      console.warn('[RoleService] Unexpected response format:', response.data);
      return [];
      
    } catch (error) {
      console.error('[RoleService] Error fetching roles:', error);
      throw error;
    }
  }

  /**
   * Obtener un rol específico por ID
   * @param roleId ID del rol
   */
  async getRole(roleId: string): Promise<Role> {
    const response = await api.get<Role>(`${this.basePath}/${roleId}`);
    return response.data;
  }

  /**
   * Crear un nuevo rol
   * @param roleData Datos del nuevo rol
   */
  async createRole(roleData: CreateRoleData): Promise<Role> {
    const response = await api.post<Role>(this.basePath, roleData);
    return response.data;
  }

  /**
   * Actualizar un rol existente
   * @param roleId ID del rol
   * @param roleData Datos a actualizar
   */
  async updateRole(roleId: string, roleData: UpdateRoleData): Promise<Role> {
    const response = await api.patch<Role>(`${this.basePath}/${roleId}`, roleData);
    return response.data;
  }

  /**
   * Eliminar un rol
   * @param roleId ID del rol
   */
  async deleteRole(roleId: string): Promise<void> {
    await api.delete(`${this.basePath}/${roleId}`);
  }

  /**
   * Obtener todos los permisos disponibles
   */
  async getPermissions(): Promise<Permission[]> {
    const response = await api.get<Permission[]>(this.permissionsPath);
    return response.data;
  }

  /**
   * Obtener permisos agrupados por módulo
   */
  async getPermissionsByModule(): Promise<Record<string, Permission[]>> {
    const permissions = await this.getPermissions();
    return this.groupPermissionsByModule(permissions);
  }

  /**
   * Asignar permisos a un rol
   * @param roleId ID del rol
   * @param permissionIds IDs de los permisos a asignar
   */
  async assignPermissions(roleId: string, permissionIds: string[]): Promise<Role> {
    const response = await api.post<Role>(
      `${this.basePath}/${roleId}/permissions`,
      { permissionIds }
    );
    return response.data;
  }

  /**
   * Remover permisos de un rol
   * @param roleId ID del rol
   * @param permissionIds IDs de los permisos a remover
   */
  async removePermissions(roleId: string, permissionIds: string[]): Promise<Role> {
    const response = await api.delete<Role>(
      `${this.basePath}/${roleId}/permissions`,
      { data: { permissionIds } }
    );
    return response.data;
  }

  /**
   * Duplicar un rol existente
   * @param roleId ID del rol a duplicar
   * @param newName Nombre para el nuevo rol
   */
  async duplicateRole(roleId: string, newName: string): Promise<Role> {
    const response = await api.post<Role>(
      `${this.basePath}/${roleId}/duplicate`,
      { name: newName }
    );
    return response.data;
  }

  /**
   * Helper: Agrupar permisos por módulo
   */
  private groupPermissionsByModule(permissions: Permission[]): Record<string, Permission[]> {
    return permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  }
}

// Singleton instance - siguiendo patrón de Nivel 2
export const roleService = new RoleService();