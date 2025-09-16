/**
 * RBAC Validators - Sprint 3
 * Validadores para el sistema de roles y permisos
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */
import { body, param, query, ValidationChain } from 'express-validator';
/**
 * Role Validators
 * Validación de datos para operaciones con roles
 */
export const roleValidators = {
  /**
   * Validación para crear rol
   */
  createRole: [
    body('name')
      .trim()
      .notEmpty().withMessage('Role name is required')
      .isLength({ min: 3, max: 50 }).withMessage('Role name must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Role name can only contain alphanumeric characters, hyphens and underscores')
      .custom(async (value, { req }) => {
        // Check if role name already exists (would be implemented with service)
        const normalizedName = value.toLowerCase();
        if (['admin', 'super_admin', 'root'].includes(normalizedName)) {
          throw new Error('Reserved role name');
        }
        return true;
      }),
    body('description')
      .trim()
      .notEmpty().withMessage('Description is required')
      .isLength({ min: 10, max: 200 }).withMessage('Description must be between 10 and 200 characters'),
    body('permissions')
      .optional()
      .isArray().withMessage('Permissions must be an array')
      .custom((permissions) => {
        if (!Array.isArray(permissions)) return false;
        return permissions.every(p => typeof p === 'string' && p.length > 0);
      }).withMessage('Invalid permission format'),
    body('priority')
      .optional()
      .isInt({ min: 0, max: 999 }).withMessage('Priority must be between 0 and 999'),
    body('companyId')
      .optional()
      .isUUID().withMessage('Invalid company ID')
  ],
  /**
   * Validación para actualizar rol
   */
  updateRole: [
    param('id')
      .isUUID().withMessage('Invalid role ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 }).withMessage('Role name must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Invalid role name format'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 10, max: 200 }).withMessage('Description must be between 10 and 200 characters'),
    body('permissions')
      .optional()
      .isArray().withMessage('Permissions must be an array')
      .custom((permissions) => {
        if (!Array.isArray(permissions)) return false;
        return permissions.every(p => typeof p === 'string' && p.length > 0);
      }).withMessage('Invalid permission format'),
    body('priority')
      .optional()
      .isInt({ min: 0, max: 999 }).withMessage('Priority must be between 0 and 999')
  ],
  /**
   * Validación para eliminar rol
   */
  deleteRole: [
    param('id')
      .isUUID().withMessage('Invalid role ID')
  ],
  /**
   * Validación para asignar rol a usuario
   */
  assignRole: [
    body('userId')
      .isUUID().withMessage('Invalid user ID'),
    body('roleId')
      .isUUID().withMessage('Invalid role ID'),
    body('companyId')
      .optional()
      .isUUID().withMessage('Invalid company ID'),
    body('expiresAt')
      .optional()
      .isISO8601().withMessage('Invalid expiration date format')
      .custom((value) => {
        if (value && new Date(value) <= new Date()) {
          throw new Error('Expiration date must be in the future');
        }
        return true;
      })
  ],
  /**
   * Validación para búsqueda de roles
   */
  getRoles: [
    query('search')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Search term too long'),
    query('isSystem')
      .optional()
      .isBoolean().withMessage('isSystem must be a boolean'),
    query('companyId')
      .optional()
      .isUUID().withMessage('Invalid company ID'),
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ]
};
/**
 * Permission Validators
 * Validación de datos para operaciones con permisos
 */
export const permissionValidators = {
  /**
   * Validación para crear permiso
   */
  createPermission: [
    body('name')
      .trim()
      .notEmpty().withMessage('Permission name is required')
      .matches(/^[a-z]+\.[a-z_]+$/).withMessage('Permission must follow format: resource.action (e.g., users.create)')
      .custom((value) => {
        const [resource, action] = value.split('.');
        const validActions = ['create', 'read', 'update', 'delete', 'list', 'manage', 'export', 'import'];
        if (!validActions.includes(action) && action !== '*') {
          throw new Error(`Invalid action. Must be one of: ${validActions.join(', ')} or *`);
        }
        return true;
      }),
    body('description')
      .trim()
      .notEmpty().withMessage('Description is required')
      .isLength({ min: 10, max: 200 }).withMessage('Description must be between 10 and 200 characters'),
    body('resource')
      .trim()
      .notEmpty().withMessage('Resource is required')
      .matches(/^[a-z_]+$/).withMessage('Resource must be lowercase with underscores'),
    body('action')
      .trim()
      .notEmpty().withMessage('Action is required')
      .matches(/^[a-z_*]+$/).withMessage('Action must be lowercase with underscores or *'),
    body('category')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('Category must be between 2 and 50 characters')
  ],
  /**
   * Validación para verificar permiso
   */
  checkPermission: [
    body('permission')
      .trim()
      .notEmpty().withMessage('Permission is required')
      .matches(/^[a-z]+\.[a-z_*]+$/).withMessage('Invalid permission format'),
    body('userId')
      .optional()
      .isUUID().withMessage('Invalid user ID'),
    body('companyId')
      .optional()
      .isUUID().withMessage('Invalid company ID')
  ],
  /**
   * Validación para asignar permisos a rol
   */
  assignPermissionsToRole: [
    param('roleId')
      .isUUID().withMessage('Invalid role ID'),
    body('permissions')
      .isArray({ min: 1 }).withMessage('At least one permission is required')
      .custom((permissions) => {
        return permissions.every(p => 
          typeof p === 'string' && 
          /^[a-z]+\.[a-z_*]+$/.test(p)
        );
      }).withMessage('Invalid permission format in array')
  ],
  /**
   * Validación para obtener matriz de permisos
   */
  getPermissionMatrix: [
    query('roleIds')
      .optional()
      .custom((value) => {
        if (!value) return true;
        const ids = Array.isArray(value) ? value : [value];
        return ids.every(id => /^[0-9a-f-]{36}$/i.test(id));
      }).withMessage('Invalid role IDs'),
    query('companyId')
      .optional()
      .isUUID().withMessage('Invalid company ID')
  ],
  /**
   * Validación para búsqueda de permisos
   */
  getPermissions: [
    query('search')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Search term too long'),
    query('resource')
      .optional()
      .matches(/^[a-z_]+$/).withMessage('Invalid resource format'),
    query('action')
      .optional()
      .matches(/^[a-z_*]+$/).withMessage('Invalid action format'),
    query('category')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('Category too long')
  ]
};
/**
 * RBAC General Validators
 * Validadores generales del sistema RBAC
 */
export const rbacValidators = {
  /**
   * Validación para auditoría RBAC
   */
  auditLog: [
    query('entityType')
      .optional()
      .isIn(['role', 'permission', 'assignment']).withMessage('Invalid entity type'),
    query('action')
      .optional()
      .isIn(['create', 'update', 'delete', 'assign', 'revoke']).withMessage('Invalid action'),
    query('userId')
      .optional()
      .isUUID().withMessage('Invalid user ID'),
    query('startDate')
      .optional()
      .isISO8601().withMessage('Invalid start date format'),
    query('endDate')
      .optional()
      .isISO8601().withMessage('Invalid end date format')
      .custom((value, { req }) => {
        if (value && req.query?.startDate) {
          return new Date(value) >= new Date(req.query.startDate);
        }
        return true;
      }).withMessage('End date must be after start date')
  ],
  /**
   * Validación para importar configuración RBAC
   */
  importRBAC: [
    body('roles')
      .optional()
      .isArray().withMessage('Roles must be an array'),
    body('permissions')
      .optional()
      .isArray().withMessage('Permissions must be an array'),
    body('overwrite')
      .optional()
      .isBoolean().withMessage('Overwrite must be a boolean'),
    body('dryRun')
      .optional()
      .isBoolean().withMessage('Dry run must be a boolean')
  ],
  /**
   * Validación para exportar configuración RBAC
   */
  exportRBAC: [
    query('includeRoles')
      .optional()
      .isBoolean().withMessage('includeRoles must be a boolean'),
    query('includePermissions')
      .optional()
      .isBoolean().withMessage('includePermissions must be a boolean'),
    query('includeAssignments')
      .optional()
      .isBoolean().withMessage('includeAssignments must be a boolean'),
    query('companyId')
      .optional()
      .isUUID().withMessage('Invalid company ID')
  ]
};
/**
 * Helper para validación de wildcards en permisos
 */
export const validatePermissionWildcard = (permission: string): boolean => {
  // Validate wildcard patterns
  const validPatterns = [
    /^[a-z]+\.\*$/,           // resource.*
    /^\*\.[a-z]+$/,           // *.action
    /^\*$/,                   // * (super admin)
    /^[a-z]+\.[a-z_]+$/       // resource.action
  ];
  return validPatterns.some(pattern => pattern.test(permission));
};
/**
 * Helper para expandir wildcards en permisos
 */
export const expandPermissionWildcard = (
  permission: string, 
  availablePermissions: string[]
): string[] => {
  if (permission === '*') {
    return availablePermissions;
  }
  if (permission.includes('*')) {
    const [resource, action] = permission.split('.');
    if (resource === '*' && action !== '*') {
      // *.action - all resources with specific action
      return availablePermissions.filter(p => p.endsWith(`.${action}`));
    }
    if (resource !== '*' && action === '*') {
      // resource.* - all actions for specific resource
      return availablePermissions.filter(p => p.startsWith(`${resource}.`));
    }
  }
  // No wildcard, return as is if it exists
  return availablePermissions.includes(permission) ? [permission] : [];
};
/**
 * Helper para verificar jerarquía de roles
 */
export const checkRoleHierarchy = (
  userRole: { priority: number },
  targetRole: { priority: number }
): boolean => {
  // Lower priority number = higher rank
  return userRole.priority <= targetRole.priority;
};
/**
 * Helper para sanitizar nombre de rol
 */
export const sanitizeRoleName = (name: string): string => {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 50);
};
/**
 * Helper para sanitizar nombre de permiso
 */
export const sanitizePermissionName = (name: string): string => {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z.*]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
};
/**
 * Helper para validar formato de recurso
 */
export const validateResourceFormat = (resource: string): boolean => {
  return /^[a-z][a-z_]*[a-z]$/.test(resource);
};
/**
 * Helper para validar formato de acción
 */
export const validateActionFormat = (action: string): boolean => {
  const validActions = [
    'create', 'read', 'update', 'delete', 
    'list', 'manage', 'export', 'import',
    'approve', 'reject', 'assign', 'revoke'
  ];
  return action === '*' || validActions.includes(action);
};
export default {
  roleValidators,
  permissionValidators,
  rbacValidators,
  validatePermissionWildcard,
  expandPermissionWildcard,
  checkRoleHierarchy,
  sanitizeRoleName,
  sanitizePermissionName,
  validateResourceFormat,
  validateActionFormat
};
