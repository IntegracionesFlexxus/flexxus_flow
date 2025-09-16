import { Router } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { UserController } from '@/modules/users/controllers/UserController';
import { authenticateToken, requireRole } from '@/shared/middleware/auth';
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
// Middleware para logging de rutas
router.use((req, res, next) => {
  console.log('\n🚦 [Backend UserRoutes] Request received');
  console.log('  Path:', req.path);
  console.log('  Method:', req.method);
  console.log('  Headers:', {
    authorization: req.headers.authorization ? 'Present' : 'Missing',
    'x-company-id': req.headers['x-company-id']
  });
  next();
});

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Logging después de autenticación
router.use((req, res, next) => {
  console.log('🔓 [Backend UserRoutes] After authentication');
  console.log('  User:', req.user);
  next();
});

// Rutas de usuarios
router.get('/', userController.getAllUsers.bind(userController));
router.get('/profile', userController.getProfile.bind(userController));
router.get('/company/:companyId', userController.getUsersByCompany.bind(userController));
router.get('/:id', userController.getUserById.bind(userController));

// CREATE USER ROUTE - con logging específico
router.post('/', (req, res, next) => {
  console.log('\n📝 [Backend UserRoutes] POST /users - Before requireRole');
  console.log('  User context:', req.user);
  console.log('  Body:', req.body);
  next();
}, requireRole(['admin', 'manager']), userController.createUser.bind(userController));
router.put('/profile', userController.updateProfile.bind(userController));
router.put('/:id', requireRole(['admin', 'manager']), userController.updateUser.bind(userController));
router.delete('/:id', requireRole(['admin']), userController.deleteUser.bind(userController));
// Rutas de gestión multi-empresa
router.post('/:id/companies', requireRole(['admin']), userController.assignToCompany.bind(userController));
router.delete('/:id/companies/:companyId', requireRole(['admin']), userController.removeFromCompany.bind(userController));
export default router;
