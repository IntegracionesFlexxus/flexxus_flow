/**
 * Role and Permission Types - Centralized Export
 * Sprint 3 - Refactorización de tipos duplicados
 *
 * Este archivo sirve como punto de entrada único para todos los tipos
 * relacionados con roles y permisos en el sistema.
 *
 * @module modules/roles/types
 */

// ==================== Tipos Principales ====================

export type {
  Role,
  Permission,
  PermissionGroup,
  PermissionPolicy,
  PolicyRule,
  PolicyCondition,
  RoleAssignment,
  RoleTemplate,
  PermissionCheckResult,
  PermissionMatrix
} from '../services/roleService';

// ==================== Tipos Auxiliares ====================

export type {
  PermissionAction,
  PermissionResource,
  PermissionScope,
  RoleFilters,
  PermissionFilters
} from '../services/roleService';

// ==================== Enums ====================

export { PermissionCategory } from '../services/roleService';

// ==================== Servicio ====================

export { RoleService } from '../services/roleService';

// ==================== Re-exports para compatibilidad ====================

/**
 * Alias para compatibilidad con código existente
 * @deprecated Importar directamente desde '@/modules/roles/types'
 */
export type { Role as RoleType } from '../services/roleService';

/**
 * Alias para compatibilidad con código existente
 * @deprecated Importar directamente desde '@/modules/roles/types'
 */
export type { Permission as PermissionType } from '../services/roleService';
