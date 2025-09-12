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
    super('/api/v1/roles');
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
    const result = await this.getPaginated<Role>('/list', params, options);
    
    // Update cache
    result.items.forEach(role => {
      this.roleCache.set(role.id, role);
    });
    
    return {
      roles: result.items,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages
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
    
    const role = await this.get<Role>(`/${roleId}`, options);
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
    data: {
      name: string;
      code: string;
      description?: string;
    }
  ): Promise<Role> {
    const role = await this.post<Role>(`/${roleId}/clone`, data);
    this.roleCache.set(role.id, role);
    return role;
  }

  // ==================== Permission Management ====================

  /**
   * Get all permissions
   */
  async getPermissions(
    params?: PermissionFilters,
    options = { cache: true, cacheTime: 3600000 }
  ): Promise<Permission[]> {
    const permissions = await this.get<Permission[]>('/permissions', {
      ...options,
      params
    });
    
    // Update cache
    permissions.forEach(permission => {
      this.permissionCache.set(permission.id, permission);
    });
    
    return permissions;
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
    format: 'json' | 'csv' | 'yaml',
    roleIds?: string[]
  ): Promise<void> {
    const params = roleIds ? `?roleIds=${roleIds.join(',')}` : '';
    await this.downloadFile(`/export/${format}${params}`, `roles.${format}`);
  }

  /**
   * Import roles
   */
  async importRoles(
    file: File,
    options?: {
      overwrite?: boolean;
      validateOnly?: boolean;
    }
  ): Promise<{
    imported: number;
    updated: number;
    errors?: Array<{
      line: number;
      error: string;
    }>;
  }> {
    return this.uploadFile('/import', file, options);
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