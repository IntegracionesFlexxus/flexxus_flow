/**
 * Permission Service - FASE 3
 * Implementación simplificada para la nueva estructura de roles
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IPermissionService, UserRoleInfo } from '@/modules/auth/interfaces/IPermissionService';
import { IUserRepository } from '@/modules/auth/interfaces/IUserRepository';
import { IRoleRepository } from '@/modules/auth/interfaces/IRoleRepository';
import { Logger } from 'winston';

@injectable()
export class PermissionServiceNew implements IPermissionService {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.RoleRepository) private roleRepository: IRoleRepository,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  // ==================== VERIFICACIONES BÁSICAS ====================

  async isSuperAdmin(userId: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findById(userId);
      return user?.role === 'super_admin';
    } catch (error) {
      this.logger.error('Error checking if user is SuperAdmin:', error);
      return false;
    }
  }

  async getUserRoleInfo(userId: string): Promise<UserRoleInfo> {
    try {
      // PASO 1: Verificar campo directo users.role (para super_admin)
      const user = await this.userRepository.findById(userId);
      if (user?.role === 'super_admin') {
        return {
          role: 'super_admin',
          companyId: null,
          permissions: ['*'],
          isSuperAdmin: true
        };
      }

      // PASO 2: Buscar en user_roles (para admin/user)
      const userRoleAssignments = await this.roleRepository.getUserRoles(userId);

      if (userRoleAssignments.length === 0) {
        throw new Error('User has no roles assigned');
      }

      const roleAssignment = userRoleAssignments[0];
      const roleName = roleAssignment.name?.toLowerCase();

      if (!['admin', 'user'].includes(roleName)) {
        throw new Error('Invalid role assigned to user');
      }

      // Obtener permisos específicos del rol
      const permissions = await this.roleRepository.getRolePermissions(roleAssignment.id);
      const permissionNames = permissions.map(p => p.name);

      return {
        role: roleName as 'admin' | 'user',
        companyId: roleAssignment.company_id,
        permissions: permissionNames,
        isSuperAdmin: false
      };

    } catch (error) {
      this.logger.error('Error getting user role info:', error);
      throw error;
    }
  }

  async getUserRole(userId: string): Promise<'super_admin' | 'admin' | 'user'> {
    const roleInfo = await this.getUserRoleInfo(userId);
    return roleInfo.role;
  }

  // ==================== GESTIÓN DE PERMISOS ====================

  async hasPermission(userId: string, permission: string, companyId?: string): Promise<boolean> {
    try {
      const roleInfo = await this.getUserRoleInfo(userId);

      // SuperAdmin: siempre tiene todos los permisos
      if (roleInfo.isSuperAdmin) {
        return true;
      }

      // Admin/User: verificar permisos específicos
      if (companyId && roleInfo.companyId !== companyId) {
        return false; // No puede acceder a otra empresa
      }

      // Verificar si tiene el permiso específico o un permiso wildcard
      return this.checkPermissionMatch(roleInfo.permissions, permission);

    } catch (error) {
      this.logger.error('Error checking permission:', error);
      return false;
    }
  }

  async getUserPermissions(userId: string, companyId?: string): Promise<string[]> {
    try {
      const roleInfo = await this.getUserRoleInfo(userId);

      // SuperAdmin: permisos ilimitados
      if (roleInfo.isSuperAdmin) {
        return ['*'];
      }

      // Admin/User: verificar empresa
      if (companyId && roleInfo.companyId !== companyId) {
        return []; // No permisos en otra empresa
      }

      return roleInfo.permissions;

    } catch (error) {
      this.logger.error('Error getting user permissions:', error);
      return [];
    }
  }

  // ==================== VALIDACIONES DE GESTIÓN ====================

  async canManageUser(managerId: string, targetUserId: string): Promise<boolean> {
    try {
      const managerInfo = await this.getUserRoleInfo(managerId);

      // SuperAdmin: puede gestionar a cualquiera
      if (managerInfo.isSuperAdmin) {
        return true;
      }

      // User: no puede gestionar a nadie
      if (managerInfo.role === 'user') {
        return false;
      }

      // Admin: solo puede gestionar users de su empresa
      if (managerInfo.role === 'admin') {
        const targetInfo = await this.getUserRoleInfo(targetUserId);

        // No puede gestionar a otros admins o superadmins
        if (targetInfo.role !== 'user') {
          return false;
        }

        // Debe ser de la misma empresa
        return managerInfo.companyId === targetInfo.companyId;
      }

      return false;

    } catch (error) {
      this.logger.error('Error checking user management permission:', error);
      return false;
    }
  }

  async canModifyRole(userId: string, roleId: string): Promise<boolean> {
    try {
      const userInfo = await this.getUserRoleInfo(userId);

      // Solo SuperAdmin puede modificar roles
      return userInfo.isSuperAdmin;

    } catch (error) {
      this.logger.error('Error checking role modification permission:', error);
      return false;
    }
  }

  async canAccessCompany(userId: string, companyId: string): Promise<boolean> {
    try {
      const roleInfo = await this.getUserRoleInfo(userId);

      // SuperAdmin: puede acceder a cualquier empresa
      if (roleInfo.isSuperAdmin) {
        return true;
      }

      // Admin/User: solo su empresa asignada
      return roleInfo.companyId === companyId;

    } catch (error) {
      this.logger.error('Error checking company access:', error);
      return false;
    }
  }

  // ==================== VALIDACIONES ESPECÍFICAS ====================

  async canCreateUser(creatorId: string, targetRole: 'admin' | 'user', companyId: string): Promise<boolean> {
    try {
      const creatorInfo = await this.getUserRoleInfo(creatorId);

      // SuperAdmin: puede crear cualquier tipo de usuario
      if (creatorInfo.isSuperAdmin) {
        return true;
      }

      // User: no puede crear usuarios
      if (creatorInfo.role === 'user') {
        return false;
      }

      // Admin: solo puede crear users (no otros admins) en su empresa
      if (creatorInfo.role === 'admin') {
        if (targetRole !== 'user') {
          return false; // No puede crear otros admins
        }
        return creatorInfo.companyId === companyId; // Solo en su empresa
      }

      return false;

    } catch (error) {
      this.logger.error('Error checking user creation permission:', error);
      return false;
    }
  }

  async canAssignPermissions(assignerId: string, targetUserId: string): Promise<boolean> {
    try {
      const assignerInfo = await this.getUserRoleInfo(assignerId);

      // SuperAdmin: puede asignar cualquier permiso
      if (assignerInfo.isSuperAdmin) {
        return true;
      }

      // User: no puede asignar permisos
      if (assignerInfo.role === 'user') {
        return false;
      }

      // Admin: solo puede asignar permisos a users de su empresa
      if (assignerInfo.role === 'admin') {
        const targetInfo = await this.getUserRoleInfo(targetUserId);

        // Solo a users, no a otros admins
        if (targetInfo.role !== 'user') {
          return false;
        }

        // Misma empresa
        return assignerInfo.companyId === targetInfo.companyId;
      }

      return false;

    } catch (error) {
      this.logger.error('Error checking permission assignment:', error);
      return false;
    }
  }

  // ==================== MÉTODOS AUXILIARES ====================

  /**
   * Verificar si un conjunto de permisos incluye el permiso solicitado
   * Soporta wildcards y permisos jerárquicos
   */
  private checkPermissionMatch(userPermissions: string[], requestedPermission: string): boolean {
    // Permiso exacto
    if (userPermissions.includes(requestedPermission)) {
      return true;
    }

    // Permiso wildcard completo
    if (userPermissions.includes('*')) {
      return true;
    }

    // Permisos wildcard por módulo (ej: users.*)
    const permissionParts = requestedPermission.split('.');

    for (let i = permissionParts.length - 1; i >= 0; i--) {
      const wildcardPermission = permissionParts.slice(0, i + 1).join('.') + '.*';
      if (userPermissions.includes(wildcardPermission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validar si el usuario puede realizar una acción específica
   */
  async validateAction(userId: string, action: string, resource: string, companyId?: string): Promise<boolean> {
    const permission = `${resource}.${action}`;
    return this.hasPermission(userId, permission, companyId);
  }

  /**
   * Obtener resumen de capacidades del usuario
   */
  async getUserCapabilities(userId: string): Promise<{
    role: string;
    canManageUsers: boolean;
    canManageRoles: boolean;
    canAccessAllCompanies: boolean;
    companyId: string | null;
    permissions: string[];
  }> {
    try {
      const roleInfo = await this.getUserRoleInfo(userId);

      return {
        role: roleInfo.role,
        canManageUsers: roleInfo.isSuperAdmin || roleInfo.role === 'admin',
        canManageRoles: roleInfo.isSuperAdmin,
        canAccessAllCompanies: roleInfo.isSuperAdmin,
        companyId: roleInfo.companyId,
        permissions: roleInfo.permissions
      };

    } catch (error) {
      this.logger.error('Error getting user capabilities:', error);
      return {
        role: 'user',
        canManageUsers: false,
        canManageRoles: false,
        canAccessAllCompanies: false,
        companyId: null,
        permissions: []
      };
    }
  }
}