import { Router } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { RoleController } from '@/modules/roles/controllers/RoleController';
import { authenticateToken, requirePermission } from '@/shared/middleware/auth';
const router = Router();
// Obtener controller del container (si está registrado)
// Si no está registrado, crear una instancia directa
let roleController: RoleController;
try {
  roleController = container.get<RoleController>(TYPES.RoleController);
} catch {
  // Si no está en el container, crear instancia temporal
  const logger = container.get<any>(TYPES.Logger);
  const roleService = container.get<any>(TYPES.RoleService);
  roleController = new RoleController(roleService, logger);
}
// Todas las rutas requieren autenticación
router.use(authenticateToken);
// Rutas de roles
router.get('/', roleController.list.bind(roleController));
router.get('/system', roleController.getSystemRoles.bind(roleController));
router.get('/company', roleController.getCompanyRoles.bind(roleController));
router.get('/permissions', roleController.getAllPermissions.bind(roleController));
router.get('/:id', roleController.getById.bind(roleController));
router.post('/', requirePermission('roles:create'), roleController.create.bind(roleController));
router.put('/:id', requirePermission('roles:update'), roleController.update.bind(roleController));
router.delete('/:id', requirePermission('roles:delete'), roleController.delete.bind(roleController));
// Rutas de permisos
router.get('/:id/permissions', roleController.getRolePermissions.bind(roleController));
router.post('/:id/permissions', requirePermission('roles:manage'), roleController.assignPermissions.bind(roleController));
// Rutas de gestión de usuarios con rol
router.get('/:id/users', roleController.getRoleUsers.bind(roleController));
router.post('/:id/users/:userId', requirePermission('roles:manage'), roleController.assignRoleToUser.bind(roleController));
router.delete('/:id/users/:userId', requirePermission('roles:manage'), roleController.removeRoleFromUser.bind(roleController));

// Endpoint temporal para inicializar permisos (solo desarrollo)
if (process.env.NODE_ENV === 'development') {
  router.post('/init-permissions', async (req, res, next) => {
    try {
      const permissionService = container.get(TYPES.PermissionService);
      await permissionService.initializeDefaultPermissions();

      res.json({
        success: true,
        message: 'Default permissions initialized successfully'
      });
    } catch (error) {
      next(error);
    }
  });
}

export default router;
