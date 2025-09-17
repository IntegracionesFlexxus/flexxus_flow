/**
 * Permission Service - Sprint 3
 * Servicio completo de gestión de permisos para RBAC
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { IPermissionRepository } from '@/modules/auth/interfaces/IPermissionRepository';
import { IRoleRepository } from '@/modules/auth/interfaces/IRoleRepository';
import { IUserRepository } from '@/shared/interfaces/repositories/IUserRepository';
import { IAuditRepository } from '@/shared/interfaces/repositories/IAuditRepository';
import { CacheService } from '@/shared/services/cache/CacheService';
import { AppError } from '@/shared/errors/AppError';

export interface Permission {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  module: string;
  category: string;
  resource: string;
  action: string;
  scope?: 'global' | 'company' | 'team' | 'self';
  isDangerous: boolean;
  requiresMfa: boolean;
  requiredPlan?: string[];
  dependencies?: string[];
  conflicts?: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionCategory {
  name: string;
  displayName: string;
  description: string;
  icon?: string;
  permissions: Permission[];
}

export interface PermissionModule {
  name: string;
  displayName: string;
  description: string;
  categories: PermissionCategory[];
}

export interface UserPermission {
  userId: string;
  companyId: string;
  permissions: string[];
  rolePermissions: string[];
  directPermissions: string[];
  deniedPermissions: string[];
  effectivePermissions: string[];
}

export interface PermissionCheck {
  hasPermission: boolean;
  source?: 'role' | 'direct' | 'inherited';
  requiresMfa?: boolean;
  scope?: string;
  conditions?: any;
}

export interface PermissionMatrix {
  roles: Array<{
    id: string;
    name: string;
    permissions: string[];
  }>;
  permissions: Array<{
    id: string;
    name: string;
    module: string;
    category: string;
  }>;
  matrix: Record<string, Record<string, boolean>>;
}

/**
 * PermissionService - Gestión completa de permisos RBAC
 * Implementa principios SOLID:
 * - S: Responsabilidad única de gestión de permisos
 * - O: Abierto para extensión (nuevos tipos de permisos)
 * - L: Sustituible por cualquier implementación
 * - I: Segregación de interfaces específicas
 * - D: Inversión de dependencias via inyección
 */
@injectable()
export class PermissionService {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_PREFIX = 'permission:';

  // Permission templates for common actions
  private readonly PERMISSION_TEMPLATES = {
    crud: ['create', 'read', 'update', 'delete'],
    management: ['create', 'read', 'update', 'delete', 'export', 'import'],
    readonly: ['read', 'export'],
    admin: ['create', 'read', 'update', 'delete', 'export', 'import', 'configure']
  };

  constructor(
    @inject(TYPES.PermissionRepository) private permissionRepository: IPermissionRepository,
    @inject(TYPES.RoleRepository) private roleRepository: IRoleRepository,
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.AuditRepository) private auditRepository: IAuditRepository,
    @inject(TYPES.CacheService) private cacheService: CacheService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Get all permissions
   * Clean Code: Simple method with single responsibility
   */
  async getAllPermissions(): Promise<Permission[]> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}all`;

      // Check cache
      const cached = await this.cacheService.get<Permission[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from repository
      const permissions = await this.permissionRepository.findAll();

      // Cache result
      await this.cacheService.set(cacheKey, permissions, this.CACHE_TTL);

      return permissions;
    } catch (error) {
      this.logger.error('Error getting all permissions', { error: error.message });
      throw error;
    }
  }

  /**
   * Get permissions by module
   * Pattern: Strategy pattern for module-specific permissions
   */
  async getPermissionsByModule(module: string): Promise<PermissionModule> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}module:${module}`;

      // Check cache
      const cached = await this.cacheService.get<PermissionModule>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get permissions for module
      const permissions = await this.permissionRepository.findByModule(module);

      // Group by category
      const categoriesMap = new Map<string, PermissionCategory>();

      permissions.forEach(permission => {
        if (!categoriesMap.has(permission.category)) {
          categoriesMap.set(permission.category, {
            name: permission.category,
            displayName: this.formatCategoryName(permission.category),
            description: `Permissions for ${permission.category}`,
            permissions: []
          });
        }

        categoriesMap.get(permission.category)!.permissions.push(permission);
      });

      const result: PermissionModule = {
        name: module,
        displayName: this.formatModuleName(module),
        description: `Permissions for ${module} module`,
        categories: Array.from(categoriesMap.values())
      };

      // Cache result
      await this.cacheService.set(cacheKey, result, this.CACHE_TTL);

      return result;
    } catch (error) {
      this.logger.error('Error getting module permissions', { error: error.message, module });
      throw error;
    }
  }

  /**
   * Get user permissions
   * Complex permission resolution with inheritance
   */
  async getUserPermissions(userId: string, companyId?: string): Promise<Permission[]> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}user:${userId}:${companyId || 'all'}`;

      // Check cache
      const cached = await this.cacheService.get<Permission[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get user's roles - ensure it returns an array
      const userRoles = (await this.roleRepository.getUserRoles(userId, companyId)) || [];

      // Get permissions from roles
      const rolePermissions = new Set<string>();
      for (const role of userRoles) {
        try {
          const permissions = (await this.roleRepository.getRolePermissions(role.id)) || [];
          permissions.forEach(p => {
            if (p && p.id) {
              rolePermissions.add(p.id);
            }
          });
        } catch (roleError) {
          this.logger.warn('Error getting role permissions', { 
            roleId: role.id, 
            error: roleError.message 
          });
        }
      }

      // Get direct permissions - ensure it returns an array
      const directPermissions = (await this.permissionRepository.findByUserId(userId, companyId)) || [];

      // Get denied permissions (overrides) - ensure it returns an array
      const deniedPermissions = (await this.permissionRepository.findDeniedByUserId(userId, companyId)) || [];
      const deniedIds = new Set(deniedPermissions.map(p => p && p.id).filter(Boolean));

      // Combine permissions (role + direct - denied)
      const effectivePermissionIds = new Set<string>();

      // Add role permissions
      rolePermissions.forEach(id => {
        if (id && !deniedIds.has(id)) {
          effectivePermissionIds.add(id);
        }
      });

      // Add direct permissions
      directPermissions.forEach(p => {
        if (p && p.id && !deniedIds.has(p.id)) {
          effectivePermissionIds.add(p.id);
        }
      });

      // Get full permission objects - ensure it returns an array
      const permissionIds = Array.from(effectivePermissionIds);
      const permissions = permissionIds.length > 0 
        ? (await this.permissionRepository.findByIds(permissionIds)) || []
        : [];

      // Cache result
      await this.cacheService.set(cacheKey, permissions, this.CACHE_TTL);

      this.logger.debug('User permissions calculated', {
        userId,
        companyId,
        roleCount: userRoles.length,
        permissionCount: permissions.length,
        rolePermissionCount: rolePermissions.size,
        directPermissionCount: directPermissions.length,
        deniedPermissionCount: deniedPermissions.length
      });

      return permissions;
    } catch (error) {
      this.logger.error('Error getting user permissions', { 
        error: error.message, 
        stack: error.stack,
        userId, 
        companyId 
      });
      
      // Return empty array instead of throwing to prevent login failure
      return [];
    }
  }

  /**
   * Check if user has permission
   * Supports wildcard and hierarchical permissions
   */
  async checkPermission(userId: string, permission: string, companyId?: string): Promise<PermissionCheck> {
    try {
      // Get user permissions
      const userPermissions = await this.getUserPermissions(userId, companyId);

      // Check for super admin permission
      if (userPermissions.some(p => p.name === '*' || p.name === 'admin.*')) {
        return {
          hasPermission: true,
          source: 'role'
        };
      }

      // Check exact match
      const exactMatch = userPermissions.find(p => p.name === permission);
      if (exactMatch) {
        return {
          hasPermission: true,
          source: 'role',
          requiresMfa: exactMatch.requiresMfa,
          scope: exactMatch.scope
        };
      }

      // Check wildcard permissions
      const hasWildcardPermission = this.checkWildcardPermission(userPermissions, permission);
      if (hasWildcardPermission) {
        return {
          hasPermission: true,
          source: 'role'
        };
      }

      // Check hierarchical permissions
      const hasHierarchicalPermission = this.checkHierarchicalPermission(userPermissions, permission);
      if (hasHierarchicalPermission) {
        return {
          hasPermission: true,
          source: 'inherited'
        };
      }

      return {
        hasPermission: false
      };
    } catch (error) {
      this.logger.error('Error checking permission', { error: error.message, userId, permission });
      return { hasPermission: false };
    }
  }

  /**
   * Check multiple permissions
   * Batch permission checking for efficiency
   */
  async checkPermissions(
    userId: string, 
    permissions: string[], 
    companyId?: string,
    mode: 'all' | 'any' = 'all'
  ): Promise<Record<string, PermissionCheck>> {
    try {
      const userPermissions = await this.getUserPermissions(userId, companyId);
      const results: Record<string, PermissionCheck> = {};

      for (const permission of permissions) {
        const check = await this.checkPermission(userId, permission, companyId);
        results[permission] = check;
      }

      return results;
    } catch (error) {
      this.logger.error('Error checking permissions', { error: error.message, userId, permissions });
      throw error;
    }
  }

  /**
   * Grant permission to user
   */
  async grantPermissionToUser(
    userId: string, 
    permissionId: string, 
    companyId: string,
    grantedBy: string,
    conditions?: any
  ): Promise<void> {
    try {
      // Validate permission exists
      const permission = await this.permissionRepository.findById(permissionId);
      if (!permission) {
        throw new AppError('Permission not found', 404);
      }

      // Check if already granted
      const existing = await this.permissionRepository.findUserPermission(userId, permissionId, companyId);
      if (existing) {
        throw new AppError('Permission already granted', 400);
      }

      // Grant permission
      await this.permissionRepository.grantToUser({
        userId,
        permissionId,
        companyId,
        grantedBy,
        conditions,
        grantedAt: new Date()
      });

      // Clear cache
      await this.clearUserPermissionCache(userId, companyId);

      // Audit log
      await this.auditRepository.logActivity({
        userId: grantedBy,
        companyId,
        action: 'permission_granted',
        entityType: 'user',
        entityId: userId,
        description: `Granted permission "${permission.displayName}" to user`,
        metadata: {
          permissionId,
          permissionName: permission.name,
          conditions
        }
      });

      this.logger.info('Permission granted to user', {
        userId,
        permissionId,
        companyId,
        grantedBy
      });
    } catch (error) {
      this.logger.error('Error granting permission', { error: error.message, userId, permissionId });
      throw error;
    }
  }

  /**
   * Revoke permission from user
   */
  async revokePermissionFromUser(
    userId: string, 
    permissionId: string, 
    companyId: string,
    revokedBy: string
  ): Promise<void> {
    try {
      const permission = await this.permissionRepository.findById(permissionId);
      if (!permission) {
        throw new AppError('Permission not found', 404);
      }

      // Revoke permission
      await this.permissionRepository.revokeFromUser(userId, permissionId, companyId);

      // Clear cache
      await this.clearUserPermissionCache(userId, companyId);

      // Audit log
      await this.auditRepository.logActivity({
        userId: revokedBy,
        companyId,
        action: 'permission_revoked',
        entityType: 'user',
        entityId: userId,
        description: `Revoked permission "${permission.displayName}" from user`,
        metadata: {
          permissionId,
          permissionName: permission.name
        }
      });

      this.logger.info('Permission revoked from user', {
        userId,
        permissionId,
        companyId,
        revokedBy
      });
    } catch (error) {
      this.logger.error('Error revoking permission', { error: error.message, userId, permissionId });
      throw error;
    }
  }

  /**
   * Get permission matrix for roles
   * Useful for UI permission management
   */
  async getPermissionMatrix(companyId?: string): Promise<PermissionMatrix> {
    try {
      // Get all roles
      const roles = companyId 
        ? await this.roleRepository.findByCompany(companyId)
        : await this.roleRepository.findSystemRoles();

      // Get all permissions
      const permissions = await this.getAllPermissions();

      // Build matrix
      const matrix: Record<string, Record<string, boolean>> = {};

      for (const role of roles) {
        matrix[role.id] = {};
        const rolePermissions = await this.roleRepository.getRolePermissions(role.id);
        const rolePermissionIds = new Set(rolePermissions.map(p => p.id));

        for (const permission of permissions) {
          matrix[role.id][permission.id] = rolePermissionIds.has(permission.id);
        }
      }

      return {
        roles: roles.map(r => ({
          id: r.id,
          name: r.name,
          permissions: []
        })),
        permissions: permissions.map(p => ({
          id: p.id,
          name: p.name,
          module: p.module,
          category: p.category
        })),
        matrix
      };
    } catch (error) {
      this.logger.error('Error getting permission matrix', { error: error.message, companyId });
      throw error;
    }
  }

  /**
   * Create custom permission
   */
  async createPermission(data: {
    name: string;
    displayName: string;
    description?: string;
    module: string;
    category: string;
    resource: string;
    action: string;
    scope?: string;
    isDangerous?: boolean;
    requiresMfa?: boolean;
  }, createdBy: string): Promise<Permission> {
    try {
      // Validate unique name
      const existing = await this.permissionRepository.findByName(data.name);
      if (existing) {
        throw new AppError('Permission name already exists', 400);
      }

      // Create permission
      const permission = await this.permissionRepository.create({
        ...data,
        isDangerous: data.isDangerous || false,
        requiresMfa: data.requiresMfa || false,
        active: true
      });

      // Clear cache
      await this.clearPermissionCache();

      // Audit log
      await this.auditRepository.logActivity({
        userId: createdBy,
        action: 'permission_created',
        entityType: 'permission',
        entityId: permission.id,
        description: `Created permission "${data.displayName}"`,
        metadata: data
      });

      this.logger.info('Permission created', {
        permissionId: permission.id,
        name: data.name,
        createdBy
      });

      return permission;
    } catch (error) {
      this.logger.error('Error creating permission', { error: error.message, data });
      throw error;
    }
  }

  /**
   * Initialize default permissions
   * Called during system setup
   */
  async initializeDefaultPermissions(): Promise<void> {
    try {
      const modules = ['dashboard', 'auth', 'users', 'companies', 'crm', 'omni', 'workflow', 'analytics', 'admin'];
      const resources = {
        dashboard: ['dashboard'],
        auth: ['session', 'profile', 'password'],
        users: ['user', 'role', 'permission', 'companies'],
        companies: ['company', 'settings', 'billing'],
        crm: ['contact', 'lead', 'opportunity', 'account', 'companies'],
        omni: ['conversation', 'channel', 'queue', 'agent'],
        workflow: ['workflow', 'task', 'automation'],
        analytics: ['report', 'dashboard', 'metric'],
        admin: ['users', 'roles', 'companies', 'features', 'access']
      };

      for (const module of modules) {
        const moduleResources = resources[module] || [];

        for (const resource of moduleResources) {
          // Determinar acciones según el módulo y recurso
          let actions: string[];

          if (module === 'dashboard') {
            actions = ['view'];
          } else if (module === 'admin') {
            actions = ['access', 'view', 'create', 'update', 'delete'];
          } else if (module === 'auth') {
            actions = ['read', 'update'];
          } else if (resource === 'companies' && module === 'users') {
            actions = ['manage']; // Permiso especial para gestionar empresas de usuarios
          } else {
            actions = this.PERMISSION_TEMPLATES.management;
          }

          for (const action of actions) {
            const name = `${module}.${resource}.${action}`;

            // Check if permission exists
            const existing = await this.permissionRepository.findByName(name);
            if (!existing) {
              await this.permissionRepository.create({
                name,
                displayName: `${this.capitalize(action)} ${this.capitalize(resource)}`,
                description: `Permission to ${action} ${resource} in ${module} module`,
                module,
                category: resource,
                resource,
                action,
                scope: module === 'admin' || (module === 'users' && resource === 'companies') ? 'global' : 'company',
                isDangerous: action === 'delete' || (module === 'admin' && resource === 'companies'),
                requiresMfa: action === 'delete' && (module === 'admin' || resource === 'companies'),
                active: true
              });
            }
          }
        }
      }

      this.logger.info('Default permissions initialized');
    } catch (error) {
      this.logger.error('Error initializing default permissions', { error: error.message });
      throw error;
    }
  }

  // ========== Private helper methods ==========

  /**
   * Check wildcard permission
   */
  private checkWildcardPermission(userPermissions: Permission[], permission: string): boolean {
    const permissionParts = permission.split('.');

    for (const userPerm of userPermissions) {
      if (!userPerm.name.includes('*')) continue;

      const pattern = userPerm.name.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);

      if (regex.test(permission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check hierarchical permission
   */
  private checkHierarchicalPermission(userPermissions: Permission[], permission: string): boolean {
    const parts = permission.split('.');

    // Check for parent permissions
    for (let i = parts.length - 1; i > 0; i--) {
      const parentPermission = parts.slice(0, i).join('.') + '.*';
      if (userPermissions.some(p => p.name === parentPermission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Clear permission cache
   */
  private async clearPermissionCache(): Promise<void> {
    await this.cacheService.deletePattern(`${this.CACHE_PREFIX}*`);
  }

  /**
   * Clear user permission cache
   */
  private async clearUserPermissionCache(userId: string, companyId?: string): Promise<void> {
    await this.cacheService.delete(`${this.CACHE_PREFIX}user:${userId}:${companyId || 'all'}`);
  }

  /**
   * Format module name for display
   */
  private formatModuleName(module: string): string {
    const moduleNames = {
      auth: 'Authentication',
      users: 'User Management',
      companies: 'Company Management',
      crm: 'CRM',
      omni: 'Omnichannel',
      workflow: 'Workflow',
      analytics: 'Analytics'
    };

    return moduleNames[module] || this.capitalize(module);
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(category: string): string {
    return category.split('_').map(this.capitalize).join(' ');
  }

  /**
   * Capitalize string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
