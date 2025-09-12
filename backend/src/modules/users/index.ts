import { Router } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { UserController } from '@/modules/users/controllers/UserController';
import { authenticateToken, requirePermission } from '@/shared/middleware/auth';
const router = Router();
// Obtener controller del container (si está registrado)
// Si no está registrado, crear una instancia directa
let userController: UserController;
try {
  userController = container.get<UserController>(TYPES.UserController);
} catch {
  // Si no está en el container, crear instancia temporal
  const logger = container.get<any>(TYPES.Logger);
  const userService = container.get<any>(TYPES.UserService);
  userController = new UserController(userService, logger);
}
// Todas las rutas requieren autenticación
router.use(authenticateToken);
// Rutas de usuarios
router.get('/', userController.getAllUsers.bind(userController));
router.get('/profile', userController.getProfile.bind(userController));
router.get('/company/:companyId', userController.getUsersByCompany.bind(userController));
router.get('/:id', userController.getUserById.bind(userController));
router.post('/', requirePermission('users:create'), userController.createUser.bind(userController));
router.put('/profile', userController.updateProfile.bind(userController));
router.put('/:id', requirePermission('users:update'), userController.updateUser.bind(userController));
router.delete('/:id', requirePermission('users:delete'), userController.deleteUser.bind(userController));
// Rutas de gestión multi-empresa
router.post('/:id/companies', requirePermission('users:manage'), userController.assignToCompany.bind(userController));
router.delete('/:id/companies/:companyId', requirePermission('users:manage'), userController.removeFromCompany.bind(userController));
export default router;
