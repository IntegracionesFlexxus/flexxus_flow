/**
 * Tipos unificados de Role
 * Compatible con backend (flexxus_shared) y servicios frontend
 * Creado para resolver incompatibilidades entre módulos
 */

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  status?: string;
  conditions?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Interfaz base de Role compatible con ambos servicios
 */
export interface BaseRole {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;

  // Campos del backend (snake_case)
  company_id?: string | null;
  is_system_role?: boolean;
  user_count?: string | number;

  // Campos de frontend (camelCase) - Compatibilidad
  companyId?: string | null;
  isSystem?: boolean;
  isSystemRole?: boolean;
  isDefault?: boolean;
  status?: string;
  userCount?: number;

  // Campos adicionales del servicio avanzado
  code?: string;
  level?: number;
  permissionIds?: string[];
  inheritsFrom?: string[];
  metadata?: Record<string, any>;

  // Campos de usuario que creó/modificó
  createdBy?: string;
  updatedBy?: string;
  lastModified?: Date;
}

/**
 * Adaptador para normalizar roles del backend al formato unificado
 * Convierte snake_case a camelCase y maneja tipos
 */
export function normalizeRole(role: any): BaseRole {
  // Parsear user_count si viene como string
  const userCount = role.user_count
    ? (typeof role.user_count === 'string' ? parseInt(role.user_count, 10) : role.user_count)
    : (role.userCount || 0);

  // Normalizar campo de sistema (3 posibles nombres)
  const isSystemRole = role.isSystemRole ?? role.isSystem ?? role.is_system_role ?? false;

  // Normalizar company_id
  const companyId = role.companyId ?? role.company_id ?? null;

  return {
    ...role,
    // IDs y nombres básicos
    id: role.id,
    name: role.name,
    description: role.description || undefined,

    // Permisos
    permissions: Array.isArray(role.permissions) ? role.permissions : [],
    permissionIds: role.permissionIds || role.permissions?.map((p: any) => p.id) || [],

    // Fechas
    createdAt: role.createdAt ? new Date(role.createdAt) : new Date(role.created_at),
    updatedAt: role.updatedAt ? new Date(role.updatedAt) : new Date(role.updated_at),
    lastModified: role.lastModified ? new Date(role.lastModified) : new Date(role.updated_at || role.updatedAt),

    // Campos normalizados (ambos formatos)
    companyId,
    company_id: companyId,

    isSystemRole,
    isSystem: isSystemRole,
    is_system_role: isSystemRole,

    userCount,
    user_count: userCount,

    // Estado y otros
    status: role.status || 'active',
    isDefault: role.isDefault ?? role.is_default ?? false,

    // Campos opcionales
    code: role.code,
    level: role.level,
    inheritsFrom: role.inheritsFrom,
    metadata: role.metadata,
    createdBy: role.createdBy || role.created_by,
    updatedBy: role.updatedBy || role.updated_by
  };
}

/**
 * Adaptador para convertir del formato frontend al backend
 * Convierte camelCase a snake_case para enviar al API
 */
export function toBackendRole(role: Partial<BaseRole>): any {
  return {
    name: role.name,
    description: role.description,
    company_id: role.companyId || role.company_id,
    is_system_role: role.isSystemRole || role.isSystem || role.is_system_role,
    status: role.status,
    permissions: role.permissionIds || role.permissions?.map(p => p.id) || []
  };
}

/**
 * Helper para verificar si un rol es del sistema
 */
export function isSystemRole(role: BaseRole): boolean {
  return role.isSystemRole || role.isSystem || role.is_system_role || false;
}

/**
 * Helper para obtener el nombre para mostrar
 */
export function getRoleDisplayName(role: BaseRole): string {
  return role.name;
}

/**
 * Helper para obtener el count de usuarios
 */
export function getRoleUserCount(role: BaseRole): number {
  if (typeof role.user_count === 'string') {
    return parseInt(role.user_count, 10) || 0;
  }
  return role.userCount || role.user_count || 0;
}

/**
 * Type guard para verificar si un objeto es un Role válido
 */
export function isValidRole(obj: any): obj is BaseRole {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.permissions)
  );
}

/**
 * Filtros para búsqueda de roles
 */
export interface RoleFilters {
  search?: string;
  isSystem?: boolean;
  companyId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * Respuesta paginada de roles
 */
export interface RolePaginatedResponse {
  roles: BaseRole[];
  total: number;
  page: number;
  limit?: number;
  pages?: number;
  totalPages?: number;
}
