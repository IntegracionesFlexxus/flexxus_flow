/**
 * Role Controller
 * Sprint 3 - Backend Team
 * Controlador REST para gestión completa de roles
 */

import type { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';

import { TYPES } from '@/container/types';
import { IRoleService } from '@/modules/auth/interfaces/IRoleService';
import {
  createRoleSchema,
  updateRoleSchema,
  assignPermissionsSchema,
  roleFiltersSchema,
  assignRoleToUserSchema,
} from '@/modules/auth/validators/roleValidators';
import { validateData } from '@/shared/validators/validator';

import type { AuthRequest } from '@/modules/auth/middleware/auth';

@injectable()
export class RoleController {
  constructor(@inject(TYPES.RoleService) private roleService: IRoleService) {}

  // ==================== OPERACIONES CRUD ====================

  /**
   * POST /api/v1/roles
   * Crear un nuevo rol
   */
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleData = validateData(createRoleSchema, req.body);
      const userId = req.user!.id;
      const companyId = req.user!.companyId || roleData.companyId;
      const dataToCreate = { ...roleData, companyId };

      const role = await this.roleService.createRole(dataToCreate, userId);

      res.status(201).json({
        success: true,
        data: role,
        message: 'Role created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/roles/:id
   * Obtener un rol por ID
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleId = req.params.id;
      const role = await this.roleService.getRoleById(roleId);

      res.json({
        success: true,
        data: role,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/roles/:id
   * Actualizar un rol
   */
  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleId = req.params.id;
      const updateData = validateData(updateRoleSchema, req.body);
      const userId = req.user!.id;

      const role = await this.roleService.updateRole(roleId, updateData, userId);

      res.json({
        success: true,
        data: role,
        message: 'Role updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/roles/:id
   * Eliminar un rol
   */
  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleId = req.params.id;
      const userId = req.user!.id;

      await this.roleService.deleteRole(roleId, userId);

      res.json({
        success: true,
        message: 'Role deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== CONSULTAS Y LISTADOS ====================

  /**
   * GET /api/v1/roles
   * Obtener lista de roles con filtros y paginación
   */
  async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = validateData(roleFiltersSchema, {
        ...req.query,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      });

      // Si no se especifica companyId, usar el del usuario actual
      if (!filters.companyId && req.user?.companyId) {
        filters.companyId = req.user.companyId;
      }

      const result = await this.roleService.getRoles(filters);

      res.json({
        success: true,
        data: result.roles,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          pages: result.pages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/roles/company/:companyId
   * Obtener roles de una empresa
   */
  async getCompanyRoles(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Obtener companyId de query params o del usuario autenticado
      const companyId = (req.query.companyId as string) || req.user?.companyId;

      if (!companyId) {
        throw new Error('Company ID is required');
      }

      const roles = await this.roleService.getCompanyRoles(companyId);

      res.json({
        success: true,
        data: roles,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/roles/system
   * Obtener roles del sistema
   */
  async getSystemRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles = await this.roleService.getSystemRoles();

      res.json({
        success: true,
        data: roles,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== GESTIÓN DE PERMISOS ====================

  /**
   * POST /api/v1/roles/:id/permissions
   * Asignar permisos a un rol
   */
  async assignPermissions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleId = req.params.id;
      const assignData = validateData(assignPermissionsSchema, {
        ...req.body,
        roleId,
      });
      const userId = req.user!.id;

      await this.roleService.assignPermissions(assignData, userId);

      res.json({
        success: true,
        message: `Permissions ${assignData.mode}d successfully`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/roles/:id/permissions
   * Obtener permisos de un rol
   */
  async getRolePermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleId = req.params.id;
      const permissions = await this.roleService.getRolePermissions(roleId);

      res.json({
        success: true,
        data: permissions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/roles/permissions
   * Obtener todos los permisos disponibles
   */
  async getAllPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const permissions = await this.roleService.getAllPermissions();

      res.json({
        success: true,
        data: permissions,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== GESTIÓN DE USUARIOS ====================

  /**
   * GET /api/v1/roles/:id/users
   * Obtener usuarios con un rol específico
   */
  async getRoleUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleId = req.params.id;
      const companyId = (req.query.companyId as string) || req.user?.companyId;

      const users = await this.roleService.getRoleUsers(roleId, companyId);

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/roles/assign-to-user
   * Asignar rol a usuario
   */
  async assignRoleToUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const assignData = validateData(assignRoleToUserSchema, req.body);
      const assignedBy = req.user!.id;
      const companyId = assignData.companyId || req.user!.companyId;

      await this.roleService.assignRoleToUser(
        assignData.userId,
        assignData.roleId,
        companyId,
        assignedBy
      );

      res.json({
        success: true,
        message: 'Role assigned to user successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/roles/remove-from-user
   * Remover rol de usuario
   */
  async removeRoleFromUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, roleId, companyId } = req.body;
      const removedBy = req.user!.id;
      const targetCompanyId = companyId || req.user!.companyId;

      await this.roleService.removeRoleFromUser(userId, roleId, targetCompanyId, removedBy);

      res.json({
        success: true,
        message: 'Role removed from user successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/roles/user/:userId
   * Obtener roles de un usuario
   */
  async getUserRoles(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      const companyId = (req.query.companyId as string) || req.user?.companyId;

      const roles = await this.roleService.getUserRoles(userId, companyId);

      res.json({
        success: true,
        data: roles,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== VALIDACIONES ====================

  /**
   * POST /api/v1/roles/validate-name
   * Validar disponibilidad de nombre de rol
   */
  async validateName(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, companyId, excludeId } = req.body;
      const targetCompanyId = companyId || req.user?.companyId;

      const isValid = await this.roleService.validateRoleName(name, targetCompanyId, excludeId);

      res.json({
        success: true,
        data: {
          name,
          isValid,
          message: isValid ? 'Name is available' : 'Name is already taken',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/roles/:id/can-delete
   * Verificar si un rol puede ser eliminado
   */
  async canDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleId = req.params.id;
      const canDelete = await this.roleService.canDeleteRole(roleId);

      res.json({
        success: true,
        data: {
          canDelete,
          message: canDelete
            ? 'Role can be deleted'
            : 'Role cannot be deleted (system role or has users assigned)',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== OPERACIONES EN LOTE ====================

  /**
   * POST /api/v1/roles/:id/clone
   * Clonar un rol
   */
  async clone(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleId = req.params.id;
      const { name, companyId } = req.body;
      const clonedBy = req.user!.id;
      const targetCompanyId = companyId || req.user?.companyId;

      const clonedRole = await this.roleService.cloneRole(roleId, name, targetCompanyId, clonedBy);

      res.status(201).json({
        success: true,
        data: clonedRole,
        message: 'Role cloned successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/roles/import
   * Importar roles desde template
   */
  async importFromTemplate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { templateName, companyId } = req.body;
      const importedBy = req.user!.id;
      const targetCompanyId = companyId || req.user!.companyId;

      const importedRoles = await this.roleService.importRolesFromTemplate(
        templateName,
        targetCompanyId,
        importedBy
      );

      res.status(201).json({
        success: true,
        data: importedRoles,
        message: `Successfully imported ${importedRoles.length} roles from template`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/roles/export
   * Exportar configuración de roles
   */
  async export(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req.query.companyId as string) || req.user?.companyId;
      const exportData = await this.roleService.exportRoles(companyId);

      res.json({
        success: true,
        data: exportData,
      });
    } catch (error) {
      next(error);
    }
  }
}
