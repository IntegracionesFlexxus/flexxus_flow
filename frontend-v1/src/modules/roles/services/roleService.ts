/**
 * RoleService - Sprint 3
 * Servicio avanzado para gestión de roles y permisos
 * Implementación con principios SOLID y Clean Code
 */

import { BaseService, PaginationParams, FilterParams, ApiError } from '@/shared/services/BaseService';

/**
 * Permission types
 */
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'execute' | 'approve' | 'export' | 'import';
export type PermissionResource = string;
export type PermissionScope = 'own' | 'team' | 'department' | 'company' | 'global';

/**
 * Permission interface
 */
export interface Permission {
  id: string;
  name: string;
  code: string;
  description?: string;
  module: string;
  resource: PermissionResource;
  actions: PermissionAction[];
  scope?: PermissionScope;
  dependencies?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role interface
 */
export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  level: number;
  isSystem: boolean;
  isDefault: boolean;
  permissions: Permission[];
  permissionIds: string[];
  inheritsFrom?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  userCount?: number;
}

/**
 * Permission group
 */
export interface PermissionGroup {
  id: string;
  name: string;
  description?: string;
  module: string;
  permissions: Permission[];
  icon?: string;
  order: number;
}

/**
 * Permission policy
 */
export interface PermissionPolicy {
  id: string;
  name: string;
  description?: string;
  rules: PolicyRule[];
  priority: number;
  enabled: boolean;
  appliesTo: {
    roles?: string[];
    users?: string[];
    departments?: string[];
  };
}

/**
 * Policy rule
 */
export interface PolicyRule {
  id: string;
  resource: string;
  actions: PermissionAction[];
  conditions?: PolicyCondition[];
  effect: 'allow' | 'deny';
}

/**
 * Policy condition
 */
export interface PolicyCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

/**
 * Role assignment
 */
export interface RoleAssignment {
  id: string;
  roleId: string;
  role?: Role;
  userId: string;
  companyId: string;
  departmentId?: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
  conditions?: Record<string, any>;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions?: string[];
  missingPermissions?: string[];
  appliedPolicies?: string[];
}

/**
 * Role template
 */
export interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  permissions: string[];
  suggestedFor: string[];
  popularity: number;
}

/**
 * Role filters
 */
export interface RoleFilters extends FilterParams {
  isSystem?: boolean;
  hasPermission?: string[];
  level?: number[];
  module?: string[];
}

/**
 * Permission filters
 */
export interface PermissionFilters extends FilterParams {
  module?: string[];
  resource?: string[];
  action?: PermissionAction[];
  scope?: PermissionScope[];
}

/**
 * Create role data
 */
export interface CreateRoleData {
  name: string;
  code: string;
  description?: string;
  level?: number;
  permissionIds: string[];
  inheritsFrom?: string[];
  metadata?: Record<string, any>;
}

/**
 * Update role data
 */
export interface UpdateRoleData {
  name?: string;
  description?: string;
  level?: number;
  permissionIds?: string[];
  inheritsFrom?: string[];
  metadata?: Record<string, any>;
}

/**
 * Permission matrix
 */
export interface PermissionMatrix {
  roles: Role[];
  permissions: Permission[];
  matrix: Record<string, Record<string, boolean>>;
}

/**
 * RoleService
 * Principios aplicados:
 * - S: Responsabilidad única de gestión de roles y permisos
 * - O: Extensible con nuevas funcionalidades
 * - L: Sustituible por cualquier implementación de BaseService
 * - I: Interface segregada con métodos específicos
 * - D: Depende de abstracciones (BaseService)
 */
export class RoleService extends BaseService {
  private static instance: RoleService;
  private permissionCache: Map<string, Permission> = new Map();
  private roleCache: Map<string, Role> = new Map();
  
  private constructor() {
    super('/roles');  // baseURL ya incluye /api/v1
  }

  /**
   * Singleton pattern
   */
  public static getInstance(): RoleService {
    if (!RoleService.instance) {
      RoleService.instance = new RoleService();
    }
    return RoleService.instance;
  }

  // ==================== Role Management ====================

  /**
   * Get roles with filtering
   */
  async getRoles(
    params?: PaginationParams & RoleFilters,
    options = { cache: true, cacheTime: 300000 }
  ): Promise<{
    roles: Role[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Llamar al endpoint correcto del backend
    const response = await this.get<{
      success: boolean;
      data: any[];
      pagination?: {
        total: number;
        page: number;
        limit: number;
        pages: number;
      };
    }>('/', { ...options, params });

    // Adaptar formato del backend al esperado por el frontend
    const rolesData = response.data || [];
    const pagination = response.pagination || {
      total: rolesData.length,
      page: params?.page || 1,
      limit: params?.limit || rolesData.length,
      pages: 1
    };

    // Normalizar roles del backend
    const roles = rolesData.map(role => ({
      ...role,
      isSystem: role.isSystem ?? role.isSystemRole ?? role.is_system_role,
      isSystemRole: role.isSystemRole ?? role.isSystem ?? role.is_system_role,
      companyId: role.companyId ?? role.company_id,
      userCount: role.user_count ? parseInt(role.user_count) : (role.userCount || 0),
      permissionIds: role.permissions?.map((p: any) => p.id) || []
    }));

    // Update cache
    roles.forEach(role => {
      this.roleCache.set(role.id, role);
    });

    return {
      roles,
      total: pagination.total,
      page: pagination.page,
      totalPages: pagination.pages
    };
  }

  /**
   * Get role by ID
   */
  async getRoleById(
    roleId: string,
    options = { cache: true, cacheTime: 300000 }
  ): Promise<Role> {
    // Check cache first
    if (this.roleCache.has(roleId) && options.cache) {
      return this.roleCache.get(roleId)!;
    }

    const response = await this.get<{ success: boolean; data: any }>(`/${roleId}`, options);
    const roleData = response.data || response;

    // Normalizar rol del backend
    const role = {
      ...roleData,
      isSystem: roleData.isSystem ?? roleData.isSystemRole ?? roleData.is_system_role,
      isSystemRole: roleData.isSystemRole ?? roleData.isSystem ?? roleData.is_system_role,
      companyId: roleData.companyId ?? roleData.company_id,
      userCount: roleData.user_count ? parseInt(roleData.user_count) : (roleData.userCount || 0),
      permissionIds: roleData.permissions?.map((p: any) => p.id) || []
    };

    this.roleCache.set(roleId, role);
    return role;
  }

  /**
   * Get role by code
   */
  async getRoleByCode(
    code: string,
    options = { cache: true, cacheTime: 300000 }
  ): Promise<Role> {
    return this.get<Role>(`/code/${code}`, options);
  }

  /**
   * Get system roles
   */
  async getSystemRoles(options = { cache: true, cacheTime: 300000 }): Promise<Role[]> {

    try {
      const response = await this.get<{ success: boolean; data: any[] }>('/system', options);

      const rolesData = response.data || response || [];

      // Normalizar roles del backend
      const roles = rolesData.map(role => ({
        ...role,
        isSystem: role.isSystem ?? role.isSystemRole ?? role.is_system_role ?? true,
        isSystemRole: role.isSystemRole ?? role.isSystem ?? role.is_system_role ?? true,
        companyId: role.companyId ?? role.company_id,
        userCount: role.user_count ? parseInt(role.user_count) : (role.userCount || 0),
        permissionIds: role.permissions?.map((p: any) => p.id) || [],
        code: role.code || role.name?.toLowerCase().replace(/\s+/g, '_'),
        level: role.level || 1,
        isDefault: role.isDefault ?? false,
        isActive: role.status === 'active'
      }));


      // Update cache
      roles.forEach(role => {
        this.roleCache.set(role.id, role);
      });

      return roles;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get company roles
   */
  async getCompanyRoles(companyId: string, options = { cache: true, cacheTime: 300000 }): Promise<Role[]> {

    try {
      // El endpoint es /company con companyId como query param
      const response = await this.get<{ success: boolean; data: any[] }>('/company', {
        ...options,
        params: { companyId }
      });

      const rolesData = response.data || response || [];

      // Normalizar roles del backend
      const roles = rolesData.map(role => ({
        ...role,
        isSystem: role.isSystem ?? role.isSystemRole ?? role.is_system_role ?? false,
        isSystemRole: role.isSystemRole ?? role.isSystem ?? role.is_system_role ?? false,
        companyId: role.companyId ?? role.company_id,
        userCount: role.user_count ? parseInt(role.user_count) : (role.userCount || 0),
        permissionIds: role.permissions?.map((p: any) => p.id) || [],
        code: role.code || role.name?.toLowerCase().replace(/\s+/g, '_'),
        level: role.level || 1,
        isDefault: role.isDefault ?? false,
        isActive: role.status === 'active'
      }));


      // Update cache
      roles.forEach(role => {
        this.roleCache.set(role.id, role);
      });

      return roles;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get role stats for a company
   */
  async getRoleStats(companyId: string): Promise<{
    usersPerRole: Record<string, number>;
    totalUsers: number;
    totalRoles: number;
  }> {

    try {
      // Obtener todos los roles con sus usuarios
      const roles = await this.getRoles({ companyId } as any);

      const usersPerRole: Record<string, number> = {};
      let totalUsers = 0;

      roles.roles.forEach(role => {
        const userCount = typeof role.userCount === 'string' ? parseInt(role.userCount) : (role.userCount || 0);
        usersPerRole[role.id] = userCount;
        totalUsers += userCount;
      });

      const stats = {
        usersPerRole,
        totalUsers,
        totalRoles: roles.total
      };


      return stats;
    } catch (error) {
      // Return default stats on error
      return {
        usersPerRole: {},
        totalUsers: 0,
        totalRoles: 0
      };
    }
  }

  /**
   * Get all permissions
   */
  async getAllPermissions(options = { cache: true, cacheTime: 3600000 }): Promise<Permission[]> {

    try {
      // El endpoint correcto es /permissions (sin /all)
      const response = await this.get<{ success: boolean; data: any[] }>('/permissions', options);

      const permissionsData = response.data || response || [];

      // Normalizar permisos del backend
      const permissions = permissionsData.map(perm => ({
        id: perm.id,
        name: perm.name,
        code: perm.code || perm.name?.toLowerCase().replace(/\s+/g, '_'),
        description: perm.description,
        module: perm.module || 'general',
        resource: perm.resource,
        actions: perm.actions || [],
        scope: perm.scope,
        dependencies: perm.dependencies,
        metadata: perm.metadata,
        createdAt: perm.created_at || perm.createdAt,
        updatedAt: perm.updated_at || perm.updatedAt,
        displayName: perm.displayName || perm.display_name || perm.name
      }));


      // Update cache
      permissions.forEach(permission => {
        this.permissionCache.set(permission.id, permission);
      });

      return permissions;
    } catch (error) {
      // Return empty array on error instead of throwing
      return [];
    }
  }

  /**
   * Create new role
   */
  async createRole(data: CreateRoleData): Promise<Role> {
    const role = await this.post<Role>('/', data);
    this.roleCache.set(role.id, role);
    this.clearCache();
    return role;
  }

  /**
   * Update role
   */
  async updateRole(roleId: string, updates: UpdateRoleData): Promise<Role> {
    const role = await this.patch<Role>(`/${roleId}`, updates);
    this.roleCache.set(roleId, role);
    this.clearCache();
    return role;
  }

  /**
   * Delete role
   */
  async deleteRole(roleId: string): Promise<void> {
    await this.delete(`/${roleId}`);
    this.roleCache.delete(roleId);
    this.clearCache();
  }

  /**
   * Clone role
   */
  async cloneRole(
    roleId: string,
    name: string,
    companyId?: string
  ): Promise<Role> {

    try {
      const data = {
        name,
        companyId
      };

      const response = await this.post<{ success: boolean; data: any }>(`/${roleId}/clone`, data);

      const roleData = response.data || response;
      const role = {
        ...roleData,
        isSystem: roleData.isSystem ?? roleData.isSystemRole ?? roleData.is_system_role,
        isSystemRole: roleData.isSystemRole ?? roleData.isSystem ?? roleData.is_system_role,
        companyId: roleData.companyId ?? roleData.company_id,
        userCount: roleData.user_count ? parseInt(roleData.user_count) : (roleData.userCount || 0),
        permissionIds: roleData.permissions?.map((p: any) => p.id) || [],
        code: roleData.code || roleData.name?.toLowerCase().replace(/\s+/g, '_'),
        level: roleData.level || 1,
        isDefault: roleData.isDefault ?? false,
        isActive: roleData.status === 'active'
      };

      this.roleCache.set(role.id, role);
      return role;
    } catch (error) {
      throw error;
    }
  }

  // ==================== Permission Management ====================

  /**
   * Get all permissions
   */
  async getPermissions(
    params?: PermissionFilters,
    options = { cache: true, cacheTime: 3600000 }
  ): Promise<Permission[]> {

    try {
      const response = await this.get<{ success: boolean; data: Permission[] }>('/permissions', {
        ...options,
        params
      });


      const permissions = response.data || response || [];

      // Update cache
      permissions.forEach(permission => {
        this.permissionCache.set(permission.id, permission);
      });

      return permissions;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get permission by ID
   */
  async getPermissionById(
    permissionId: string,
    options = { cache: true }
  ): Promise<Permission> {
    // Check cache first
    if (this.permissionCache.has(permissionId) && options.cache) {
      return this.permissionCache.get(permissionId)!;
    }
    
    const permission = await this.get<Permission>(`/permissions/${permissionId}`, options);
    this.permissionCache.set(permissionId, permission);
    return permission;
  }

  /**
   * Get permissions grouped by module
   */
  async getPermissionGroups(): Promise<PermissionGroup[]> {
    return this.get<PermissionGroup[]>('/permissions/grouped', {
      cache: true,
      cacheTime: 3600000
    });
  }

  /**
   * Update role permissions
   */
  async updateRolePermissions(
    roleId: string,
    permissionIds: string[]
  ): Promise<Role> {
    const role = await this.patch<Role>(`/${roleId}/permissions`, {
      permissionIds
    });
    this.roleCache.set(roleId, role);
    this.clearCache();
    return role;
  }

  /**
   * Add permissions to role
   */
  async addPermissionsToRole(
    roleId: string,
    permissionIds: string[]
  ): Promise<Role> {
    const role = await this.post<Role>(`/${roleId}/permissions/add`, {
      permissionIds
    });
    this.roleCache.set(roleId, role);
    this.clearCache();
    return role;
  }

  /**
   * Remove permissions from role
   */
  async removePermissionsFromRole(
    roleId: string,
    permissionIds: string[]
  ): Promise<Role> {
    const role = await this.post<Role>(`/${roleId}/permissions/remove`, {
      permissionIds
    });
    this.roleCache.set(roleId, role);
    this.clearCache();
    return role;
  }

  // ==================== Permission Checking ====================

  /**
   * Check if user has permission
   */
  async checkPermission(
    userId: string,
    permission: string,
    resource?: string,
    context?: Record<string, any>
  ): Promise<PermissionCheckResult> {
    return this.post<PermissionCheckResult>('/check-permission', {
      userId,
      permission,
      resource,
      context
    });
  }

  /**
   * Check multiple permissions
   */
  async checkPermissions(
    userId: string,
    permissions: Array<{
      permission: string;
      resource?: string;
    }>
  ): Promise<Record<string, PermissionCheckResult>> {
    return this.post('/check-permissions', {
      userId,
      permissions
    });
  }

  /**
   * Get user effective permissions
   */
  async getUserEffectivePermissions(
    userId: string,
    companyId?: string
  ): Promise<{
    direct: Permission[];
    fromRoles: Permission[];
    fromPolicies: Permission[];
    effective: Permission[];
  }> {
    return this.get(`/users/${userId}/effective-permissions`, {
      params: { companyId },
      cache: true,
      cacheTime: 60000
    });
  }

  // ==================== Role Assignments ====================

  /**
   * Get role assignments for user
   */
  async getUserRoleAssignments(
    userId: string,
    companyId?: string
  ): Promise<RoleAssignment[]> {
    return this.get<RoleAssignment[]>(`/users/${userId}/assignments`, {
      params: { companyId },
      cache: true
    });
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(
    data: {
      roleId: string;
      userId: string;
      companyId: string;
      departmentId?: string;
      expiresAt?: Date;
      conditions?: Record<string, any>;
    }
  ): Promise<RoleAssignment> {
    const assignment = await this.post<RoleAssignment>('/assignments', data);
    this.clearCache();
    return assignment;
  }

  /**
   * Revoke role from user
   */
  async revokeRoleFromUser(assignmentId: string): Promise<void> {
    await this.delete(`/assignments/${assignmentId}`);
    this.clearCache();
  }

  /**
   * Bulk assign roles
   */
  async bulkAssignRoles(
    assignments: Array<{
      roleId: string;
      userId: string;
      companyId: string;
    }>
  ): Promise<{
    success: RoleAssignment[];
    failed: Array<{
      userId: string;
      error: string;
    }>;
  }> {
    return this.post('/assignments/bulk', { assignments });
  }

  // ==================== Policies ====================

  /**
   * Get permission policies
   */
  async getPolicies(
    filters?: {
      enabled?: boolean;
      appliesTo?: string;
    }
  ): Promise<PermissionPolicy[]> {
    return this.get<PermissionPolicy[]>('/policies', {
      params: filters,
      cache: true,
      cacheTime: 300000
    });
  }

  /**
   * Get policy by ID
   */
  async getPolicyById(policyId: string): Promise<PermissionPolicy> {
    return this.get<PermissionPolicy>(`/policies/${policyId}`, {
      cache: true
    });
  }

  /**
   * Create permission policy
   */
  async createPolicy(data: Omit<PermissionPolicy, 'id'>): Promise<PermissionPolicy> {
    const policy = await this.post<PermissionPolicy>('/policies', data);
    this.clearCache();
    return policy;
  }

  /**
   * Update permission policy
   */
  async updatePolicy(
    policyId: string,
    updates: Partial<PermissionPolicy>
  ): Promise<PermissionPolicy> {
    const policy = await this.patch<PermissionPolicy>(`/policies/${policyId}`, updates);
    this.clearCache();
    return policy;
  }

  /**
   * Delete permission policy
   */
  async deletePolicy(policyId: string): Promise<void> {
    await this.delete(`/policies/${policyId}`);
    this.clearCache();
  }

  /**
   * Evaluate policies for user
   */
  async evaluatePolicies(
    userId: string,
    resource: string,
    action: PermissionAction,
    context?: Record<string, any>
  ): Promise<{
    allowed: boolean;
    appliedPolicies: PermissionPolicy[];
    explanation: string[];
  }> {
    return this.post('/policies/evaluate', {
      userId,
      resource,
      action,
      context
    });
  }

  // ==================== Templates ====================

  /**
   * Get role templates
   */
  async getRoleTemplates(category?: string): Promise<RoleTemplate[]> {
    return this.get<RoleTemplate[]>('/templates', {
      params: { category },
      cache: true,
      cacheTime: 3600000
    });
  }

  /**
   * Create role from template
   */
  async createRoleFromTemplate(
    templateId: string,
    data: {
      name: string;
      code: string;
      description?: string;
    }
  ): Promise<Role> {
    const role = await this.post<Role>(`/templates/${templateId}/create`, data);
    this.roleCache.set(role.id, role);
    return role;
  }

  // ==================== Analytics ====================

  /**
   * Get permission matrix
   */
  async getPermissionMatrix(
    roleIds?: string[],
    moduleFilter?: string
  ): Promise<PermissionMatrix> {
    return this.get<PermissionMatrix>('/matrix', {
      params: { roleIds, moduleFilter },
      cache: true,
      cacheTime: 300000
    });
  }

  /**
   * Get role usage statistics
   */
  async getRoleStatistics(roleId: string): Promise<{
    userCount: number;
    departmentCount: number;
    lastAssigned: Date;
    mostUsedPermissions: Array<{
      permission: Permission;
      usageCount: number;
    }>;
    assignmentTrend: Array<{
      date: string;
      count: number;
    }>;
  }> {
    return this.get(`/${roleId}/statistics`, {
      cache: true,
      cacheTime: 300000
    });
  }

  /**
   * Get permission usage
   */
  async getPermissionUsage(permissionId: string): Promise<{
    roles: Role[];
    users: number;
    lastUsed: Date;
    frequency: number;
  }> {
    return this.get(`/permissions/${permissionId}/usage`, {
      cache: true,
      cacheTime: 300000
    });
  }

  // ==================== Import/Export ====================

  /**
   * Export roles
   */
  async exportRoles(
    companyId: string,
    format: 'json' | 'csv' | 'yaml' = 'json'
  ): Promise<any> {

    try {
      const response = await this.get(`/export?companyId=${companyId}&format=${format}`, {
        cache: false
      });


      return JSON.stringify(response, null, 2);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Import roles
   */
  async importRoles(
    companyId: string,
    file: File,
    options?: {
      overwrite?: boolean;
      validateOnly?: boolean;
    }
  ): Promise<{
    imported: number;
    skipped: number;
    errors?: Array<{
      line: number;
      error: string;
    }>;
  }> {

    try {
      const result = await this.uploadFile(`/import?companyId=${companyId}`, file, options);

      return {
        imported: result.imported || 0,
        skipped: result.skipped || result.updated || 0,
        errors: result.errors
      };
    } catch (error) {
      throw error;
    }
  }

  // ==================== Utility Methods ====================

  /**
   * Validate role name
   */
  async validateRoleName(
    name: string,
    excludeId?: string
  ): Promise<{
    valid: boolean;
    message?: string;
  }> {
    return this.get('/validate-name', {
      params: { name, excludeId }
    });
  }

  /**
   * Get permission dependencies
   */
  async getPermissionDependencies(
    permissionIds: string[]
  ): Promise<{
    required: Permission[];
    optional: Permission[];
    conflicts: Permission[];
  }> {
    return this.post('/permissions/dependencies', { permissionIds });
  }

  /**
   * Suggest permissions for role
   */
  async suggestPermissions(
    roleId: string,
    based_on?: 'similar_roles' | 'user_behavior' | 'industry_standards'
  ): Promise<Permission[]> {
    return this.get<Permission[]>(`/${roleId}/suggestions`, {
      params: { based_on },
      cache: true
    });
  }

  /**
   * Clear role cache
   */
  clearRoleCache(): void {
    this.roleCache.clear();
    this.permissionCache.clear();
    this.clearCache();
  }
}

// Export singleton instance
export const roleService = RoleService.getInstance();