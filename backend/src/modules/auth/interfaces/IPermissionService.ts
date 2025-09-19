/**
 * Permission Service Interface
 * FASE 1 - Interfaz para gestión correcta de permisos
 */

export interface UserRoleInfo {
  role: 'super_admin' | 'admin' | 'user';
  companyId: string | null;
  permissions: string[];
  isSuperAdmin: boolean;
}

export interface IPermissionService {
  // ==================== VERIFICACIONES BÁSICAS ====================

  /**
   * Verificar si un usuario es SuperAdmin
   */
  isSuperAdmin(userId: string): Promise<boolean>;

  /**
   * Obtener información completa del rol del usuario
   */
  getUserRoleInfo(userId: string): Promise<UserRoleInfo>;

  /**
   * Obtener rol básico del usuario
   */
  getUserRole(userId: string): Promise<'super_admin' | 'admin' | 'user'>;

  // ==================== GESTIÓN DE PERMISOS ====================

  /**
   * Verificar si un usuario tiene un permiso específico
   * SuperAdmin: siempre true
   * Admin/User: verificar en BD según empresa
   */
  hasPermission(userId: string, permission: string, companyId?: string): Promise<boolean>;

  /**
   * Obtener todos los permisos de un usuario
   * SuperAdmin: ['*'] (permisos ilimitados)
   * Admin/User: permisos específicos de BD
   */
  getUserPermissions(userId: string, companyId?: string): Promise<string[]>;

  // ==================== VALIDACIONES DE GESTIÓN ====================

  /**
   * Verificar si un usuario puede gestionar a otro usuario
   * SuperAdmin: puede gestionar a cualquiera
   * Admin: solo users de su empresa (no otros admins)
   * User: no puede gestionar a nadie
   */
  canManageUser(managerId: string, targetUserId: string): Promise<boolean>;

  /**
   * Verificar si un usuario puede modificar un rol
   * SuperAdmin: puede modificar cualquier rol
   * Admin: NO puede modificar roles
   * User: NO puede modificar roles
   */
  canModifyRole(userId: string, roleId: string): Promise<boolean>;

  /**
   * Verificar si un usuario puede acceder a una empresa
   * SuperAdmin: puede acceder a cualquier empresa
   * Admin/User: solo su empresa asignada
   */
  canAccessCompany(userId: string, companyId: string): Promise<boolean>;

  // ==================== VALIDACIONES ESPECÍFICAS ====================

  /**
   * Verificar si un usuario puede crear otros usuarios
   * SuperAdmin: puede crear cualquier tipo
   * Admin: solo puede crear users en su empresa
   * User: no puede crear usuarios
   */
  canCreateUser(creatorId: string, targetRole: 'admin' | 'user', companyId: string): Promise<boolean>;

  /**
   * Verificar si un usuario puede asignar permisos
   * SuperAdmin: puede asignar cualquier permiso
   * Admin: solo puede asignar permisos a users de su empresa
   * User: no puede asignar permisos
   */
  canAssignPermissions(assignerId: string, targetUserId: string): Promise<boolean>;
}