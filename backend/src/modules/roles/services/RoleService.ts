/**
 * Role Service Implementation
 * Sprint 3 - Backend Team
 * Servicio de gestión de roles con lógica de negocio y validaciones
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { 
  IRoleService, 
  CreateRoleDto, 
  UpdateRoleDto, 
  RoleDto, 
  PermissionDto, 
  RolePaginationDto,
  RoleFiltersDto,
  AssignPermissionsDto
} from '@/modules/auth/interfaces/IRoleService';
import { IRoleRepository } from '@/modules/auth/interfaces/IRoleRepository';
import { IPermissionRepository } from '@/modules/auth/interfaces/IPermissionRepository';
import { AuditService } from '@/shared/services/audit/AuditService';
import { CacheService } from '@/shared/services/cache/CacheService';
import { AppError, ErrorCode } from '@/shared/errors/AppError';

@injectable()
export class RoleService implements IRoleService {
  private readonly CACHE_TTL = 15 * 60; // 15 minutos
  private readonly CACHE_PREFIX = 'role:';

  constructor(
    @inject(TYPES.RoleRepository) private roleRepository: IRoleRepository,
    @inject(TYPES.PermissionRepository) private permissionRepository: IPermissionRepository,
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.CacheService) private cacheService: CacheService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  // ==================== OPERACIONES CRUD ====================

  async createRole(data: CreateRoleDto, createdBy: string): Promise<RoleDto> {
    try {

      // Validar nombre único
      const exists = await this.roleRepository.exists(data.name, data.companyId);

      if (exists) {
        throw new AppError(ErrorCode.RESOURCE_ALREADY_EXISTS, 'Role with this name already exists', 409);
      }

      // Crear el rol
      const roleCreateData = {
        name: data.name,
        description: data.description,
        companyId: data.companyId,
        isSystemRole: false,
        status: 'active'
      };

      const role = await this.roleRepository.create(roleCreateData);

      // Asignar permisos si se especifican
      if (data.permissions && data.permissions.length > 0) {
        await this.roleRepository.assignPermissions(role.id, data.permissions);
      }

      // Registrar en auditoría
      await this.auditService.logActivity({
        action: 'role_created',
        entityType: 'role',
        entityId: role.id,
        userId: createdBy,
        companyId: data.companyId,
        description: `Role "${data.name}" created`,
        metadata: { roleName: data.name }
      });

      this.logger.info('Role created successfully', {
        roleId: role.id,
        name: data.name,
        createdBy
      });

      const formattedRole = this.formatRole(role);

      return formattedRole;
    } catch (error) {

      this.logger.error('Error creating role', {
        error: error instanceof Error ? error.message : 'Unknown error',
        data,
        createdBy
      });
      throw error;
    }
  }

  async getRoleById(roleId: string): Promise<RoleDto> {
    // Intentar obtener desde caché
    const cacheKey = `${this.CACHE_PREFIX}${roleId}`;
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return JSON.parse(String(cached));
    }

    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Role not found', 404);
    }

    // Obtener permisos del rol
    const permissions = await this.roleRepository.getRolePermissions(roleId);
    const formattedRole = this.formatRole(role, permissions);

    // Guardar en caché
    await this.cacheService.set(
      cacheKey, 
      JSON.stringify(formattedRole), 
      this.CACHE_TTL
    );

    return formattedRole;
  }

  async getRolesByIds(roleIds: string[]): Promise<RoleDto[]> {
    if (!roleIds.length) return [];

    const roles = await this.roleRepository.findByIds(roleIds);

    // Obtener permisos para cada rol
    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        const permissions = await this.roleRepository.getRolePermissions(role.id);
        return this.formatRole(role, permissions);
      })
    );

    return rolesWithPermissions;
  }

  async updateRole(roleId: string, data: UpdateRoleDto, updatedBy: string): Promise<RoleDto> {
    try {
      // Verificar que el rol existe
      const existingRole = await this.roleRepository.findById(roleId);
      if (!existingRole) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Role not found', 404);
      }

      // Verificar que no es un rol del sistema
      if (existingRole.is_system_role) {
        throw new AppError(ErrorCode.FORBIDDEN, 'System roles cannot be modified', 403);
      }

      // Validar nombre único si se está cambiando
      if (data.name && data.name !== existingRole.name) {
        const exists = await this.roleRepository.exists(data.name, existingRole.company_id);
        if (exists) {
          throw new AppError(ErrorCode.RESOURCE_ALREADY_EXISTS, 'Role with this name already exists', 409);
        }
      }

      // Actualizar el rol
      const updatedRole = await this.roleRepository.update(roleId, {
        name: data.name,
        description: data.description
      });

      // Actualizar permisos si se especifican
      if (data.permissions !== undefined) {
        await this.roleRepository.assignPermissions(roleId, data.permissions);
      }

      // Invalidar caché
      await this.invalidateRoleCache(roleId);

      // Registrar en auditoría
      const changes = this.getChangedFields(existingRole, data);
      if (changes.length > 0) {
        await this.auditService.logActivity({
          action: 'role_updated',
          entityType: 'role',
          entityId: roleId,
          userId: updatedBy,
          companyId: existingRole.company_id,
          description: `Role "${existingRole.name}" updated: ${changes.join(', ')}`,
          metadata: { changes: data, changedFields: changes }
        });
      }

      this.logger.info('Role updated successfully', {
        roleId,
        updatedBy,
        changes
      });

      return this.getRoleById(roleId);
    } catch (error) {
      this.logger.error('Error updating role', {
        error: error.message,
        roleId,
        data,
        updatedBy
      });
      throw error;
    }
  }

  async deleteRole(roleId: string, deletedBy: string): Promise<void> {
    try {
      const role = await this.roleRepository.findById(roleId);
      if (!role) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Role not found', 404);
      }

      // Verificar que no es un rol del sistema
      if (role.is_system_role) {
        throw new AppError(ErrorCode.FORBIDDEN, 'System roles cannot be deleted', 403);
      }

      // Verificar que no hay usuarios asignados
      const users = await this.roleRepository.getUsersByRole(roleId);
      if (users.length > 0) {
        throw new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, 'Cannot delete role with assigned users', 400);
      }

      // Eliminar el rol (soft delete)
      const deleted = await this.roleRepository.delete(roleId);
      if (!deleted) {
        throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to delete role', 500);
      }

      // Invalidar caché
      await this.invalidateRoleCache(roleId);

      // Registrar en auditoría
      await this.auditService.logActivity({
        action: 'role_deleted',
        entityType: 'role',
        entityId: roleId,
        userId: deletedBy,
        companyId: role.company_id,
        description: `Role "${role.name}" deleted`,
        metadata: { roleName: role.name }
      });

      this.logger.info('Role deleted successfully', {
        roleId,
        roleName: role.name,
        deletedBy
      });
    } catch (error) {
      this.logger.error('Error deleting role', {
        error: error.message,
        roleId,
        deletedBy
      });
      throw error;
    }
  }

  // ==================== CONSULTAS Y LISTADOS ====================

  async getRoles(filters: RoleFiltersDto): Promise<RolePaginationDto> {
    const result = await this.roleRepository.findWithPagination({
      companyId: filters.companyId,
      isSystemRole: filters.isSystemRole,
      status: filters.status,
      page: filters.page || 1,
      limit: filters.limit || 10
    });

    this.logger.info('Fetching roles with filters', {
      rolesCount: result.roles?.length,
      total: result.total,
      page: result.page,
      limit: result.limit
    });

    // Formatear roles y obtener permisos
    const formattedRoles = await Promise.all(
      result.roles.map(async (role) => {
        const permissions = await this.roleRepository.getRolePermissions(role.id);
        return this.formatRole(role, permissions);
      })
    );


    const finalResult = {
      roles: formattedRoles,
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: Math.ceil(result.total / result.limit)
    };


    return finalResult;
  }

  async getCompanyRoles(companyId: string): Promise<RoleDto[]> {

    const roles = await this.roleRepository.findByCompany(companyId);


    const formattedRoles = await Promise.all(
      roles.map(async (role) => {
        const permissions = await this.roleRepository.getRolePermissions(role.id);
        return this.formatRole(role, permissions);
      })
    );


    return formattedRoles;
  }

  async getSystemRoles(): Promise<RoleDto[]> {

    const roles = await this.roleRepository.findSystemRoles();


    const formattedRoles = await Promise.all(
      roles.map(async (role) => {
        const permissions = await this.roleRepository.getRolePermissions(role.id);
        return this.formatRole(role, permissions);
      })
    );


    return formattedRoles;
  }

  async getRoleByName(name: string, companyId?: string): Promise<RoleDto | null> {
    const role = await this.roleRepository.findByName(name, companyId);
    if (!role) return null;

    const permissions = await this.roleRepository.getRolePermissions(role.id);
    return this.formatRole(role, permissions);
  }

  // ==================== GESTIÓN DE PERMISOS ====================

  async assignPermissions(data: AssignPermissionsDto, assignedBy: string): Promise<void> {
    try {
      const role = await this.roleRepository.findById(data.roleId);
      if (!role) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Role not found', 404);
      }

      // Verificar que los permisos existen
      const permissions = await this.permissionRepository.findByIds(data.permissionIds);
      if (permissions.length !== data.permissionIds.length) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Some permissions were not found', 400);
      }

      // Aplicar permisos según el modo
      switch (data.mode) {
        case 'replace':
          await this.roleRepository.assignPermissions(data.roleId, data.permissionIds);
          break;
        case 'add':
          await this.roleRepository.addPermissions(data.roleId, data.permissionIds);
          break;
        case 'remove':
          await this.roleRepository.removePermissions(data.roleId, data.permissionIds);
          break;
      }

      // Invalidar caché
      await this.invalidateRoleCache(data.roleId);

      // Registrar en auditoría
      await this.auditService.logActivity({
        action: 'role_permissions_updated',
        entityType: 'role',
        entityId: data.roleId,
        userId: assignedBy,
        companyId: role.company_id,
        description: `Permissions ${data.mode}d for role "${role.name}"`,
        metadata: { 
          mode: data.mode,
          permissionCount: data.permissionIds.length 
        }
      });

      this.logger.info('Role permissions updated', {
        roleId: data.roleId,
        mode: data.mode,
        permissionCount: data.permissionIds.length,
        assignedBy
      });
    } catch (error) {
      this.logger.error('Error assigning permissions', {
        error: error.message,
        data,
        assignedBy
      });
      throw error;
    }
  }

  async getRolePermissions(roleId: string): Promise<PermissionDto[]> {
    const permissions = await this.roleRepository.getRolePermissions(roleId);
    return permissions.map(this.formatPermission);
  }

  async hasPermission(roleId: string, permission: string): Promise<boolean> {
    // Buscar el permiso por nombre o por combinación resource:action
    const [resource, action] = permission.split(':');
    const permissions = await this.permissionRepository.findByResourceAndAction(resource, action);

    if (!permissions || permissions.length === 0) {
      return false;
    }

    return this.roleRepository.hasPermission(roleId, permissions[0].id);
  }

  async getAllPermissions(): Promise<PermissionDto[]> {
    const permissions = await this.permissionRepository.findAll();
    return permissions.map(this.formatPermission);
  }

  // ==================== GESTIÓN DE USUARIOS ====================

  async getRoleUsers(roleId: string, companyId?: string): Promise<any[]> {
    return this.roleRepository.getUsersByRole(roleId);
  }

  async assignRoleToUser(
    userId: string, 
    roleId: string, 
    companyId: string, 
    assignedBy: string
  ): Promise<void> {
    try {
      // Verificar que el rol existe
      const role = await this.roleRepository.findById(roleId);
      if (!role) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Role not found', 404);
      }

      // Verificar que el rol pertenece a la empresa o es del sistema
      if (!role.is_system_role && role.company_id !== companyId) {
        throw new AppError(ErrorCode.FORBIDDEN, 'Role does not belong to this company', 403);
      }

      // Asignar el rol
      await this.roleRepository.assignRoleToUser(userId, roleId, companyId);

      // Registrar en auditoría
      await this.auditService.logActivity({
        action: 'user_role_assigned',
        entityType: 'user',
        entityId: userId,
        userId: assignedBy,
        companyId,
        description: `Role "${role.name}" assigned to user`,
        metadata: { roleId, roleName: role.name }
      });

      this.logger.info('Role assigned to user', {
        userId,
        roleId,
        companyId,
        assignedBy
      });
    } catch (error) {
      this.logger.error('Error assigning role to user', {
        error: error.message,
        userId,
        roleId,
        companyId,
        assignedBy
      });
      throw error;
    }
  }

  async removeRoleFromUser(
    userId: string, 
    roleId: string, 
    companyId: string, 
    removedBy: string
  ): Promise<void> {
    try {
      const role = await this.roleRepository.findById(roleId);
      if (!role) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Role not found', 404);
      }

      await this.roleRepository.removeRoleFromUser(userId, roleId, companyId);

      // Registrar en auditoría
      await this.auditService.logActivity({
        action: 'user_role_removed',
        entityType: 'user',
        entityId: userId,
        userId: removedBy,
        companyId,
        description: `Role "${role.name}" removed from user`,
        metadata: { roleId, roleName: role.name }
      });

      this.logger.info('Role removed from user', {
        userId,
        roleId,
        companyId,
        removedBy
      });
    } catch (error) {
      this.logger.error('Error removing role from user', {
        error: error.message,
        userId,
        roleId,
        companyId,
        removedBy
      });
      throw error;
    }
  }

  async getUserRoles(userId: string, companyId?: string): Promise<RoleDto[]> {
    const roles = await this.roleRepository.getUserRoles(userId, companyId);

    return Promise.all(
      roles.map(async (role) => {
        const permissions = await this.roleRepository.getRolePermissions(role.id);
        return this.formatRole(role, permissions);
      })
    );
  }

  // ==================== VALIDACIONES ====================

  async validateRoleName(name: string, companyId?: string, excludeId?: string): Promise<boolean> {
    const existingRole = await this.roleRepository.findByName(name, companyId);

    if (!existingRole) return true;
    if (excludeId && existingRole.id === excludeId) return true;

    return false;
  }

  async canDeleteRole(roleId: string): Promise<boolean> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) return false;

    // No se pueden eliminar roles del sistema
    if (role.is_system_role) return false;

    // No se pueden eliminar roles con usuarios asignados
    const users = await this.roleRepository.getUsersByRole(roleId);
    if (users.length > 0) return false;

    return true;
  }

  async isSystemRole(roleId: string): Promise<boolean> {
    const role = await this.roleRepository.findById(roleId);
    return role?.is_system_role || false;
  }

  // ==================== OPERACIONES EN LOTE ====================

  async cloneRole(
    roleId: string, 
    newName: string, 
    companyId?: string, 
    clonedBy?: string
  ): Promise<RoleDto> {
    try {
      // Obtener rol original
      const originalRole = await this.getRoleById(roleId);
      if (!originalRole) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Role to clone not found', 404);
      }

      // Crear nuevo rol
      const clonedRole = await this.createRole({
        name: newName,
        description: `Clone of ${originalRole.name}`,
        companyId: companyId || originalRole.companyId,
        permissions: originalRole.permissions?.map(p => p.id)
      }, clonedBy || 'system');

      this.logger.info('Role cloned successfully', {
        originalRoleId: roleId,
        clonedRoleId: clonedRole.id,
        newName,
        clonedBy
      });

      return clonedRole;
    } catch (error) {
      this.logger.error('Error cloning role', {
        error: error.message,
        roleId,
        newName,
        clonedBy
      });
      throw error;
    }
  }

  async importRolesFromTemplate(
    templateName: string, 
    companyId: string, 
    importedBy: string
  ): Promise<RoleDto[]> {
    try {
      // Definir templates predefinidos
      const templates: Record<string, Array<{ name: string; description: string; permissions?: string[] }>> = {
        basic: [
          { name: 'Admin', description: 'Full access to all features' },
          { name: 'Manager', description: 'Access to management features' },
          { name: 'Agent', description: 'Access to operational features' },
          { name: 'Viewer', description: 'Read-only access' }
        ],
        enterprise: [
          { name: 'Super Admin', description: 'Complete system control' },
          { name: 'Admin', description: 'Full access within company' },
          { name: 'Department Manager', description: 'Manage department resources' },
          { name: 'Team Lead', description: 'Manage team operations' },
          { name: 'Senior Agent', description: 'Advanced operational features' },
          { name: 'Agent', description: 'Standard operational features' },
          { name: 'Junior Agent', description: 'Basic operational features' },
          { name: 'Auditor', description: 'Read and audit access' }
        ]
      };

      const template = templates[templateName];
      if (!template) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, `Template "${templateName}" not found`, 404);
      }

      // Crear roles desde template
      const importedRoles = await Promise.all(
        template.map(roleData => 
          this.createRole({
            ...roleData,
            companyId
          }, importedBy)
        )
      );

      this.logger.info('Roles imported from template', {
        templateName,
        companyId,
        rolesCount: importedRoles.length,
        importedBy
      });

      return importedRoles;
    } catch (error) {
      this.logger.error('Error importing roles from template', {
        error: error.message,
        templateName,
        companyId,
        importedBy
      });
      throw error;
    }
  }

  async exportRoles(companyId?: string): Promise<any> {
    const roles = companyId 
      ? await this.getCompanyRoles(companyId)
      : await this.getSystemRoles();

    return {
      exportDate: new Date(),
      companyId,
      rolesCount: roles.length,
      roles: roles.map(role => ({
        name: role.name,
        description: role.description,
        isSystemRole: role.isSystemRole,
        permissions: role.permissions?.map(p => ({
          resource: p.resource,
          action: p.action
        }))
      }))
    };
  }

  // ==================== MÉTODOS AUXILIARES ====================

  private formatRole(role: any, permissions?: any[]): RoleDto {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      companyId: role.company_id,
      isSystemRole: role.is_system_role,
      status: role.status,
      permissions: permissions?.map(this.formatPermission),
      userCount: role.user_count || 0,
      createdAt: role.created_at,
      updatedAt: role.updated_at
    };
  }

  private formatPermission(permission: any): PermissionDto {
    return {
      id: permission.id,
      name: permission.name,
      resource: permission.resource,
      action: permission.action,
      description: permission.description
    };
  }

  private getChangedFields(original: any, updates: UpdateRoleDto): string[] {
    const changes: string[] = [];

    if (updates.name && updates.name !== original.name) {
      changes.push('name');
    }

    if (updates.description !== undefined && updates.description !== original.description) {
      changes.push('description');
    }

    if (updates.permissions !== undefined) {
      changes.push('permissions');
    }

    return changes;
  }

  private async invalidateRoleCache(roleId: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${roleId}`;
    await this.cacheService.delete(cacheKey);
  }
}
