/**
 * RBAC Helpers - Sprint 3
 * Funciones auxiliares para el sistema de roles y permisos
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */
import { createHash } from 'crypto';
import { Logger } from 'winston';
// Types
export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  category?: string;
}
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  priority?: number;
  isSystem?: boolean;
  companyId?: string;
}
export interface PermissionCheck {
  hasPermission: boolean;
  source?: 'direct' | 'role' | 'wildcard' | 'inherited';
  matchedPermission?: string;
  role?: string;
}
export interface EffectivePermissions {
  permissions: string[];
  sources: Record<string, string>;
  roles: string[];
  wildcards: string[];
}
/**
 * RBAC Helper Functions
 * Funciones de utilidad para el sistema RBAC
 */
export class RBACHelpers {
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static permissionCache = new Map<string, { data: any; expires: number }>();
  /**
   * Check if a permission matches a pattern (including wildcards)
   */
  static matchesPermission(permission: string, pattern: string): boolean {
    // Exact match
    if (permission === pattern) return true;
    // Super admin wildcard
    if (pattern === '*') return true;
    // Resource wildcard: resource.*
    if (pattern.endsWith('.*')) {
      const resource = pattern.slice(0, -2);
      return permission.startsWith(`${resource}.`);
    }
    // Action wildcard: *.action
    if (pattern.startsWith('*.')) {
      const action = pattern.slice(2);
      return permission.endsWith(`.${action}`);
    }
    return false;
  }
  /**
   * Check if user has a specific permission
   */
  static checkPermission(
    userPermissions: string[],
    requiredPermission: string
  ): PermissionCheck {
    // Direct permission match
    if (userPermissions.includes(requiredPermission)) {
      return {
        hasPermission: true,
        source: 'direct',
        matchedPermission: requiredPermission
      };
    }
    // Check wildcard permissions
    for (const userPerm of userPermissions) {
      if (this.matchesPermission(requiredPermission, userPerm)) {
        return {
          hasPermission: true,
          source: 'wildcard',
          matchedPermission: userPerm
        };
      }
    }
    return { hasPermission: false };
  }
  /**
   * Check multiple permissions with AND/OR logic
   */
  static checkMultiplePermissions(
    userPermissions: string[],
    requiredPermissions: string[],
    mode: 'all' | 'any' = 'all'
  ): boolean {
    if (mode === 'all') {
      return requiredPermissions.every(perm =>
        this.checkPermission(userPermissions, perm).hasPermission
      );
    } else {
      return requiredPermissions.some(perm =>
        this.checkPermission(userPermissions, perm).hasPermission
      );
    }
  }
  /**
   * Get effective permissions from roles
   */
  static getEffectivePermissions(
    roles: Role[],
    directPermissions: string[] = []
  ): EffectivePermissions {
    const permissions = new Set<string>(directPermissions);
    const sources: Record<string, string> = {};
    const roleNames: string[] = [];
    const wildcards = new Set<string>();
    // Add direct permissions
    directPermissions.forEach(perm => {
      sources[perm] = 'direct';
    });
    // Process roles by priority (lower number = higher priority)
    const sortedRoles = [...roles].sort((a, b) => 
      (a.priority || 100) - (b.priority || 100)
    );
    for (const role of sortedRoles) {
      roleNames.push(role.name);
      for (const perm of role.permissions) {
        permissions.add(perm);
        if (!sources[perm]) {
          sources[perm] = `role:${role.name}`;
        }
        if (perm.includes('*')) {
          wildcards.add(perm);
        }
      }
    }
    return {
      permissions: Array.from(permissions),
      sources,
      roles: roleNames,
      wildcards: Array.from(wildcards)
    };
  }
  /**
   * Expand wildcard permissions to actual permissions
   */
  static expandWildcards(
    wildcardPermission: string,
    availablePermissions: Permission[]
  ): string[] {
    const expanded: string[] = [];
    if (wildcardPermission === '*') {
      return availablePermissions.map(p => p.name);
    }
    if (wildcardPermission.endsWith('.*')) {
      const resource = wildcardPermission.slice(0, -2);
      return availablePermissions
        .filter(p => p.resource === resource)
        .map(p => p.name);
    }
    if (wildcardPermission.startsWith('*.')) {
      const action = wildcardPermission.slice(2);
      return availablePermissions
        .filter(p => p.action === action)
        .map(p => p.name);
    }
    return expanded;
  }
  /**
   * Validate role hierarchy
   * Check if source role can modify target role
   */
  static canModifyRole(
    sourceRole: Role | undefined,
    targetRole: Role,
    isSuperAdmin: boolean = false
  ): boolean {
    // Super admin can modify any role
    if (isSuperAdmin) return true;
    // System roles cannot be modified
    if (targetRole.isSystem) return false;
    // No source role means no permission
    if (!sourceRole) return false;
    // Check priority (lower number = higher rank)
    const sourcePriority = sourceRole.priority || 100;
    const targetPriority = targetRole.priority || 100;
    return sourcePriority < targetPriority;
  }
  /**
   * Filter permissions by resource
   */
  static filterPermissionsByResource(
    permissions: Permission[],
    resource: string
  ): Permission[] {
    return permissions.filter(p => p.resource === resource);
  }
  /**
   * Filter permissions by action
   */
  static filterPermissionsByAction(
    permissions: Permission[],
    action: string
  ): Permission[] {
    return permissions.filter(p => p.action === action);
  }
  /**
   * Group permissions by resource
   */
  static groupPermissionsByResource(
    permissions: Permission[]
  ): Record<string, Permission[]> {
    return permissions.reduce((acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);
  }
  /**
   * Group permissions by category
   */
  static groupPermissionsByCategory(
    permissions: Permission[]
  ): Record<string, Permission[]> {
    return permissions.reduce((acc, perm) => {
      const category = perm.category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);
  }
  /**
   * Create permission matrix for roles
   */
  static createPermissionMatrix(
    roles: Role[],
    permissions: Permission[]
  ): Record<string, Record<string, boolean>> {
    const matrix: Record<string, Record<string, boolean>> = {};
    for (const role of roles) {
      matrix[role.id] = {};
      for (const permission of permissions) {
        matrix[role.id][permission.id] = role.permissions.includes(permission.name);
      }
    }
    return matrix;
  }
  /**
   * Calculate permission hash for caching
   */
  static calculatePermissionHash(permissions: string[]): string {
    const sorted = [...permissions].sort().join(',');
    return createHash('sha256').update(sorted).digest('hex');
  }
  /**
   * Cache permission check result
   */
  static cachePermissionResult(
    key: string,
    result: any,
    ttl: number = this.CACHE_TTL
  ): void {
    this.permissionCache.set(key, {
      data: result,
      expires: Date.now() + ttl
    });
  }
  /**
   * Get cached permission result
   */
  static getCachedPermissionResult(key: string): any | null {
    const cached = this.permissionCache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expires) {
      this.permissionCache.delete(key);
      return null;
    }
    return cached.data;
  }
  /**
   * Clear permission cache
   */
  static clearPermissionCache(): void {
    this.permissionCache.clear();
  }
  /**
   * Clean expired cache entries
   */
  static cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.permissionCache.entries()) {
      if (now > value.expires) {
        this.permissionCache.delete(key);
      }
    }
  }
  /**
   * Validate permission name format
   */
  static isValidPermissionName(name: string): boolean {
    return /^[a-z]+\.[a-z_*]+$/.test(name);
  }
  /**
   * Validate role name format
   */
  static isValidRoleName(name: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(name);
  }
  /**
   * Parse permission name into resource and action
   */
  static parsePermissionName(name: string): { resource: string; action: string } | null {
    const parts = name.split('.');
    if (parts.length !== 2) return null;
    return {
      resource: parts[0],
      action: parts[1]
    };
  }
  /**
   * Build permission name from resource and action
   */
  static buildPermissionName(resource: string, action: string): string {
    return `${resource}.${action}`;
  }
  /**
   * Get permission display name
   */
  static getPermissionDisplayName(permission: string): string {
    const parsed = this.parsePermissionName(permission);
    if (!parsed) return permission;
    const resourceDisplay = parsed.resource
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    const actionDisplay = parsed.action === '*' 
      ? 'All'
      : parsed.action.charAt(0).toUpperCase() + parsed.action.slice(1);
    return `${actionDisplay} ${resourceDisplay}`;
  }
  /**
   * Get role badge color based on priority
   */
  static getRoleBadgeColor(priority?: number): string {
    if (!priority) return 'gray';
    if (priority <= 10) return 'red';      // Admin roles
    if (priority <= 50) return 'orange';   // Manager roles
    if (priority <= 100) return 'blue';    // Regular roles
    return 'gray'; // Low priority roles
  }
  /**
   * Sort roles by hierarchy
   */
  static sortRolesByHierarchy(roles: Role[]): Role[] {
    return [...roles].sort((a, b) => {
      // System roles first
      if (a.isSystem && !b.isSystem) return -1;
      if (!a.isSystem && b.isSystem) return 1;
      // Then by priority
      const aPriority = a.priority || 100;
      const bPriority = b.priority || 100;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      // Finally by name
      return a.name.localeCompare(b.name);
    });
  }
  /**
   * Check if permission is a wildcard
   */
  static isWildcardPermission(permission: string): boolean {
    return permission.includes('*');
  }
  /**
   * Get permission scope level
   */
  static getPermissionScope(permission: string): 'global' | 'resource' | 'action' {
    if (permission === '*') return 'global';
    if (permission.endsWith('.*')) return 'resource';
    if (permission.startsWith('*.')) return 'action';
    return 'action';
  }
  /**
   * Merge multiple permission sets
   */
  static mergePermissions(...permissionSets: string[][]): string[] {
    const merged = new Set<string>();
    for (const set of permissionSets) {
      for (const perm of set) {
        merged.add(perm);
      }
    }
    return Array.from(merged).sort();
  }
  /**
   * Calculate permission difference
   */
  static getPermissionDifference(
    current: string[],
    target: string[]
  ): { additions: string[]; removals: string[] } {
    const currentSet = new Set(current);
    const targetSet = new Set(target);
    const additions = target.filter(p => !currentSet.has(p));
    const removals = current.filter(p => !targetSet.has(p));
    return { additions, removals };
  }
}
// Singleton instance for caching
let cleanupInterval: NodeJS.Timeout;
/**
 * Initialize RBAC helpers
 */
export function initializeRBACHelpers(logger?: Logger): void {
  // Clean expired cache every minute
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  cleanupInterval = setInterval(() => {
    RBACHelpers.cleanExpiredCache();
    logger?.debug('RBAC cache cleanup completed');
  }, 60 * 1000);
  logger?.info('RBAC helpers initialized');
}
/**
 * Shutdown RBAC helpers
 */
export function shutdownRBACHelpers(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  RBACHelpers.clearPermissionCache();
}
export default RBACHelpers;
