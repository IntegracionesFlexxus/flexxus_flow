/**
 * Permission Repository Interface
 * Sprint 3 - Backend Team
 * Definición de contrato para repositorio de permisos siguiendo principios SOLID
 */
export interface IPermissionRepository {
  // ==================== OPERACIONES BÁSICAS CRUD ====================
  /**
   * Crear nuevo permiso
   */
  create(permissionData: {
    name: string;
    description?: string;
    resource: string;
    action: string;
    conditions?: Record<string, any>;
    status: string;
  }): Promise<any>;
  /**
   * Buscar permiso por ID
   */
  findById(permissionId: string): Promise<any | null>;
  /**
   * Buscar permiso por nombre
   */
  findByName(name: string): Promise<any | null>;
  /**
   * Buscar múltiples permisos por IDs
   */
  findByIds(permissionIds: string[]): Promise<any[]>;
  /**
   * Listar todos los permisos con filtros opcionales
   */
  findAll(filters?: { status?: string; resource?: string }): Promise<any[]>;
  /**
   * Actualizar permiso
   */
  update(permissionId: string, updates: {
    name?: string;
    description?: string;
    conditions?: Record<string, any>;
  }): Promise<any | null>;
  /**
   * Eliminar permiso (soft delete)
   */
  delete(permissionId: string): Promise<boolean>;
  // ==================== OPERACIONES ESPECÍFICAS DE NEGOCIO ====================
  /**
   * Obtener todos los permisos de un usuario
   * Incluye permisos de roles del sistema y de empresa
   */
  getUserPermissions(userId: string): Promise<any[]>;
  /**
   * Buscar permisos por recurso
   */
  findByResource(resource: string): Promise<any[]>;
  /**
   * Buscar permisos por recurso y acción
   */
  findByResourceAndAction(resource: string, action: string): Promise<any[]>;
  /**
   * Verificar si existe un permiso específico
   */
  exists(name: string): Promise<boolean>;
  /**
   * Contar permisos por filtros
   */
  count(filters?: { status?: string; resource?: string }): Promise<number>;
  /**
   * Buscar permisos directos de un usuario
   */
  findByUserId(userId: string, companyId?: string): Promise<any[]>;
  /**
   * Buscar permisos denegados de un usuario
   */
  findDeniedByUserId(userId: string, companyId?: string): Promise<any[]>;
  /**
   * Buscar permisos por módulo
   */
  findByModule(module: string): Promise<any[]>;
  /**
   * Otorgar permiso a usuario
   */
  grantToUser(data: {
    userId: string;
    permissionId: string;
    companyId: string;
    grantedBy: string;
    conditions?: any;
    grantedAt: Date;
  }): Promise<void>;
  /**
   * Revocar permiso de usuario
   */
  revokeFromUser(userId: string, permissionId: string, companyId: string): Promise<void>;
  /**
   * Buscar permiso específico de usuario
   */
  findUserPermission(userId: string, permissionId: string, companyId: string): Promise<any | null>;
}
