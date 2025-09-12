import { Router } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { AuthController } from '@/modules/auth/controllers/AuthController';
const router = Router();
// Obtener controller del container
const authController = container.get<AuthController>(TYPES.AuthController);
// Rutas de autenticación
router.post('/login', authController.login.bind(authController));
router.post('/logout', authController.logout.bind(authController));
router.post('/refresh', authController.refreshToken.bind(authController));
router.post('/register', authController.register.bind(authController));
router.post('/forgot-password', authController.forgotPassword.bind(authController));
router.post('/reset-password', authController.resetPassword.bind(authController));
router.post('/verify-email', authController.verifyEmail.bind(authController));
router.post('/change-password', authController.changePassword.bind(authController));
router.get('/me', authController.getCurrentUser.bind(authController));
// Endpoint de prueba del módulo
router.get('/status', (req, res) => {
  res.json({ 
    module: 'auth', 
    status: 'active',
    message: 'Módulo de autenticación funcionando'
  });
});
export default router;
