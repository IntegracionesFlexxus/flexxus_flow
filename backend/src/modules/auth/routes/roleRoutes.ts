/**
 * Role Routes
 * Sprint 3 - Backend Team
 * Definición de rutas para gestión de roles
 */

import { Router } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { RoleController } from '@/modules/auth/controllers/RoleController';
import { authenticateToken as authenticate, createAuthorizationMiddleware } from '@/shared/middleware/auth';
import { rateLimiter } from '@/shared/middleware/rateLimiter';

const router = Router();
const roleController = container.get<RoleController>(TYPES.RoleController);

// Get authorization middleware
const { requirePermission: authorize } = createAuthorizationMiddleware(container);

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// ==================== OPERACIONES CRUD ====================

/**
 * Crear nuevo rol
 * Requiere permiso: roles:create
 */
router.post(
  '/',
  authorize('roles:create'),
  rateLimiter({ windowMs: 60000, max: 10 }),
  roleController.create.bind(roleController)
);

/**
 * Obtener rol por ID
 * Requiere permiso: roles:read
 */
router.get(
  '/:id',
  authorize('roles:read'),
  roleController.getById.bind(roleController)
);

/**
 * Actualizar rol
 * Requiere permiso: roles:update
 */
router.put(
  '/:id',
  authorize('roles:update'),
  rateLimiter({ windowMs: 60000, max: 20 }),
  roleController.update.bind(roleController)
);

/**
 * Eliminar rol
 * Requiere permiso: roles:delete
 */
router.delete(
  '/:id',
  authorize('roles:delete'),
  rateLimiter({ windowMs: 60000, max: 5 }),
  roleController.delete.bind(roleController)
);

// ==================== CONSULTAS Y LISTADOS ====================

/**
 * Listar roles con filtros
 * Requiere permiso: roles:read
 */
router.get(
  '/',
  authorize('roles:read'),
  roleController.list.bind(roleController)
);

/**
 * Obtener roles de empresa
 * Requiere permiso: roles:read
 */
router.get(
  '/company/:companyId',
  authorize('roles:read'),
  roleController.getCompanyRoles.bind(roleController)
);

/**
 * Obtener roles del sistema
 * Requiere permiso: roles:read o ser administrador del sistema
 */
router.get(
  '/system/all',
  authorize(['roles:read', 'system:admin']),
  roleController.getSystemRoles.bind(roleController)
);

// ==================== GESTIÓN DE PERMISOS ====================

/**
 * Obtener todos los permisos disponibles
 * Requiere permiso: permissions:read
 */
router.get(
  '/permissions/all',
  authorize('permissions:read'),
  roleController.getAllPermissions.bind(roleController)
);

/**
 * Asignar permisos a rol
 * Requiere permiso: roles:permissions:manage
 */
router.post(
  '/:id/permissions',
  authorize('roles:permissions:manage'),
  rateLimiter({ windowMs: 60000, max: 10 }),
  roleController.assignPermissions.bind(roleController)
);

/**
 * Obtener permisos de un rol
 * Requiere permiso: roles:read
 */
router.get(
  '/:id/permissions',
  authorize('roles:read'),
  roleController.getRolePermissions.bind(roleController)
);

// ==================== GESTIÓN DE USUARIOS ====================

/**
 * Obtener usuarios con un rol
 * Requiere permiso: roles:users:read
 */
router.get(
  '/:id/users',
  authorize('roles:users:read'),
  roleController.getRoleUsers.bind(roleController)
);

/**
 * Asignar rol a usuario
 * Requiere permiso: users:roles:assign
 */
router.post(
  '/assign-to-user',
  authorize('users:roles:assign'),
  rateLimiter({ windowMs: 60000, max: 20 }),
  roleController.assignRoleToUser.bind(roleController)
);

/**
 * Remover rol de usuario
 * Requiere permiso: users:roles:remove
 */
router.post(
  '/remove-from-user',
  authorize('users:roles:remove'),
  rateLimiter({ windowMs: 60000, max: 20 }),
  roleController.removeRoleFromUser.bind(roleController)
);

/**
 * Obtener roles de un usuario
 * Requiere permiso: users:roles:read
 */
router.get(
  '/user/:userId',
  authorize('users:roles:read'),
  roleController.getUserRoles.bind(roleController)
);

// ==================== VALIDACIONES ====================

/**
 * Validar disponibilidad de nombre
 * Requiere permiso: roles:read
 */
router.post(
  '/validate-name',
  authorize('roles:read'),
  rateLimiter({ windowMs: 60000, max: 30 }),
  roleController.validateName.bind(roleController)
);

/**
 * Verificar si rol puede ser eliminado
 * Requiere permiso: roles:read
 */
router.get(
  '/:id/can-delete',
  authorize('roles:read'),
  roleController.canDelete.bind(roleController)
);

// ==================== OPERACIONES EN LOTE ====================

/**
 * Clonar rol
 * Requiere permiso: roles:clone
 */
router.post(
  '/:id/clone',
  authorize('roles:clone'),
  rateLimiter({ windowMs: 60000, max: 5 }),
  roleController.clone.bind(roleController)
);

/**
 * Importar roles desde template
 * Requiere permiso: roles:import
 */
router.post(
  '/import/template',
  authorize('roles:import'),
  rateLimiter({ windowMs: 60000, max: 3 }),
  roleController.importFromTemplate.bind(roleController)
);

/**
 * Exportar configuración de roles
 * Requiere permiso: roles:export
 */
router.get(
  '/export/configuration',
  authorize('roles:export'),
  roleController.export.bind(roleController)
);

export default router;
