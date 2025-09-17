/**
 * Role Service Interface
 * Sprint 3 - Backend Team
 * Contrato de servicio para gestión de roles siguiendo principios SOLID
 */
export interface CreateRoleDto {
  name: string;
  description?: string;
  companyId?: string;
  permissions?: string[];
}
export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissions?: string[];
}
export interface RoleDto {
  id: string;
  name: string;
  description?: string;
  companyId?: string;
  isSystemRole: boolean;
  status: string;
  permissions?: PermissionDto[];
  userCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
export interface PermissionDto {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}
export interface RolePaginationDto {
  roles: RoleDto[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
export interface RoleFiltersDto {
  companyId?: string;
  isSystemRole?: boolean;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}
export interface AssignPermissionsDto {
  roleId: string;
  permissionIds: string[];
  mode: 'replace' | 'add' | 'remove';
}
export interface IRoleService {
  // ==================== OPERACIONES CRUD ====================
  /**
   * Crear un nuevo rol
   */
  createRole(data: CreateRoleDto, createdBy: string): Promise<RoleDto>;
  /**
   * Obtener un rol por ID
   */
  getRoleById(roleId: string): Promise<RoleDto>;
  /**
   * Obtener múltiples roles por IDs
   */
  getRolesByIds(roleIds: string[]): Promise<RoleDto[]>;
  /**
   * Actualizar un rol
   */
  updateRole(roleId: string, data: UpdateRoleDto, updatedBy: string): Promise<RoleDto>;
  /**
   * Eliminar un rol
   */
  deleteRole(roleId: string, deletedBy: string): Promise<void>;
  // ==================== CONSULTAS Y LISTADOS ====================
  /**
   * Obtener roles con filtros y paginación
   */
  getRoles(filters: RoleFiltersDto): Promise<RolePaginationDto>;
  /**
   * Obtener roles de una empresa
   */
  getCompanyRoles(companyId: string): Promise<RoleDto[]>;
  /**
   * Obtener roles del sistema
   */
  getSystemRoles(): Promise<RoleDto[]>;
  /**
   * Buscar rol por nombre
   */
  getRoleByName(name: string, companyId?: string): Promise<RoleDto | null>;
  // ==================== GESTIÓN DE PERMISOS ====================
  /**
   * Asignar permisos a un rol
   */
  assignPermissions(data: AssignPermissionsDto, assignedBy: string): Promise<void>;
  /**
   * Obtener permisos de un rol
   */
  getRolePermissions(roleId: string): Promise<PermissionDto[]>;
  /**
   * Verificar si un rol tiene un permiso específico
   */
  hasPermission(roleId: string, permission: string): Promise<boolean>;
  /**
   * Obtener todos los permisos disponibles
   */
  getAllPermissions(): Promise<PermissionDto[]>;
  // ==================== GESTIÓN DE USUARIOS ====================
  /**
   * Obtener usuarios con un rol específico
   */
  getRoleUsers(roleId: string, companyId?: string): Promise<any[]>;
  /**
   * Asignar rol a usuario
   */
  assignRoleToUser(userId: string, roleId: string, companyId: string, assignedBy: string): Promise<void>;
  /**
   * Remover rol de usuario
   */
  removeRoleFromUser(userId: string, roleId: string, companyId: string, removedBy: string): Promise<void>;
  /**
   * Obtener roles de un usuario
   */
  getUserRoles(userId: string, companyId?: string): Promise<RoleDto[]>;
  // ==================== VALIDACIONES ====================
  /**
   * Validar si se puede crear un rol con el nombre dado
   */
  validateRoleName(name: string, companyId?: string, excludeId?: string): Promise<boolean>;
  /**
   * Validar si un rol puede ser eliminado
   */
  canDeleteRole(roleId: string): Promise<boolean>;
  /**
   * Validar si un rol es del sistema
   */
  isSystemRole(roleId: string): Promise<boolean>;
  // ==================== OPERACIONES EN LOTE ====================
  /**
   * Clonar un rol
   */
  cloneRole(roleId: string, newName: string, companyId?: string, clonedBy?: string): Promise<RoleDto>;
  /**
   * Importar roles desde plantilla
   */
  importRolesFromTemplate(templateName: string, companyId: string, importedBy: string): Promise<RoleDto[]>;
  /**
   * Exportar configuración de roles
   */
  exportRoles(companyId?: string): Promise<any>;
}
