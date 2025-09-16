/**
 * Role Repository Interface
 * Sprint 3 - Backend Team
 * Definición de contrato para repositorio de roles siguiendo principios SOLID
 */
export interface IRoleRepository {
  // ==================== OPERACIONES BÁSICAS CRUD ====================
  /**
   * Crear nuevo rol
   */
  create(roleData: {
    name: string;
    description?: string;
    companyId?: string;
    isSystemRole: boolean;
    status: string;
  }): Promise<any>;
  /**
   * Buscar rol por ID
   */
  findById(roleId: string): Promise<any | null>;
  /**
   * Buscar rol por nombre en contexto específico
   */
  findByName(name: string, companyId?: string): Promise<any | null>;
  /**
   * Buscar múltiples roles por IDs
   */
  findByIds(roleIds: string[]): Promise<any[]>;
  /**
   * Actualizar rol
   */
  update(roleId: string, updates: {
    name?: string;
    description?: string;
  }): Promise<any | null>;
  /**
   * Eliminar rol (soft delete)
   */
  delete(roleId: string): Promise<boolean>;
  // ==================== OPERACIONES ESPECÍFICAS DE EMPRESA ====================
  /**
   * Buscar roles de una empresa específica
   */
  findByCompany(companyId: string): Promise<any[]>;
  /**
   * Buscar roles del sistema (no asociados a empresa)
   */
  findSystemRoles(): Promise<any[]>;
  // ==================== GESTIÓN DE PERMISOS DE ROLES ====================
  /**
   * Asignar permisos a un rol
   * Reemplaza todos los permisos existentes
   */
  assignPermissions(roleId: string, permissionIds: string[]): Promise<void>;
  /**
   * Agregar permisos a un rol (sin reemplazar existentes)
   */
  addPermissions(roleId: string, permissionIds: string[]): Promise<void>;
  /**
   * Remover permisos de un rol
   */
  removePermissions(roleId: string, permissionIds: string[]): Promise<void>;
  /**
   * Obtener todos los permisos de un rol
   */
  getRolePermissions(roleId: string): Promise<any[]>;
  /**
   * Verificar si un rol tiene un permiso específico
   */
  hasPermission(roleId: string, permissionId: string): Promise<boolean>;
  // ==================== OPERACIONES ESPECÍFICAS DE USUARIOS ====================
  /**
   * Obtener usuarios que tienen un rol específico
   */
  getUsersByRole(roleId: string): Promise<any[]>;
  /**
   * Obtener roles de un usuario en una empresa
   */
  getUserRoles(userId: string, companyId?: string): Promise<any[]>;
  /**
   * Asignar rol a usuario
   */
  assignRoleToUser(userId: string, roleId: string, companyId?: string): Promise<void>;
  /**
   * Remover rol de usuario
   */
  removeRoleFromUser(userId: string, roleId: string, companyId?: string): Promise<void>;
  /**
   * Obtener rol actual de un usuario en una empresa
   */
  getUserRole(userId: string, companyId: string): Promise<string | null>;
  /**
   * Actualizar rol de usuario en una empresa
   */
  updateUserRole(userId: string, companyId: string, newRoleId: string): Promise<void>;
  // ==================== OPERACIONES DE CONSULTA ====================
  /**
   * Verificar si existe un rol
   */
  exists(name: string, companyId?: string): Promise<boolean>;
  /**
   * Contar roles por filtros
   */
  count(filters?: { 
    companyId?: string; 
    isSystemRole?: boolean; 
    status?: string 
  }): Promise<number>;
  /**
   * Buscar roles con paginación
   */
  findWithPagination(filters?: {
    companyId?: string;
    isSystemRole?: boolean;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    roles: any[];
    total: number;
    page: number;
    limit: number;
  }>;
}
