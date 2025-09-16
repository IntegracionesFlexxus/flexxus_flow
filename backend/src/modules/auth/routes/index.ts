// Auth Routes - Sprint 1 con estructura Nivel 2
// Organización clara de rutas con middleware
import { Router } from 'express';
import { container } from '@/container/container';
import { AuthController } from '@/modules/auth/controllers/AuthController';
import { TYPES } from '@/container/types';
import { authenticateToken } from '@/shared/middleware/auth';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
// Validation is handled by class-validator in the controllers

// Logger instance
const logger = LoggerFactory.create({ file: __filename });

/**
 * Configuración de rutas del módulo Auth
 * Clean Code: Agrupación lógica de rutas relacionadas
 */
const router = Router();
// Function wrapper para evitar problemas de inicialización circular
const withAuthController = (method: keyof AuthController) => {
  return async (req: any, res: any, next: any) => {
    logger.info('withAuthController called for method:', method);
    try {
      logger.info('Getting AuthController from container for method:', method);
      // Verificar cada dependencia individualmente
      try {
        const authService = container.get(TYPES.AuthService);
        logger.info('AuthService:', !!authService);
      } catch (e) {
        logger.error('Failed to get AuthService:', e);
      }
      try {
        const sessionService = container.get(TYPES.SessionService);
        logger.info('SessionService:', !!sessionService);
      } catch (e) {
        logger.error('Failed to get SessionService:', e);
      }
      try {
        const jwtService = container.get(TYPES.JwtService);
        logger.info('JwtService:', !!jwtService);
      } catch (e) {
        logger.error('Failed to get JwtService:', e);
      }
      const authController = container.get<AuthController>(TYPES.AuthController);
      logger.info('AuthController obtained:', !!authController);
      await (authController[method] as any).call(authController, req, res, next);
    } catch (error) {
      logger.error('Error in withAuthController:', error);
      next(error);
    }
  };
};
// ========== Rutas públicas (sin autenticación) ==========
/**
 * POST /api/v1/auth/login
 * Login de usuario
 */
router.post(
  '/login',
  withAuthController('login')
);
/**
 * POST /api/v1/auth/register
 * Registro de nuevo usuario
 */
router.post(
  '/register',
  withAuthController('register')
);
/**
 * POST /api/v1/auth/refresh
 * Refrescar token de acceso
 */
router.post(
  '/refresh',
  withAuthController('refreshToken')
);
/**
 * POST /api/v1/auth/forgot-password
 * Solicitar recuperación de contraseña
 */
router.post(
  '/forgot-password',
  withAuthController('forgotPassword')
);
/**
 * POST /api/v1/auth/reset-password
 * Resetear contraseña con token
 */
router.post(
  '/reset-password',
  withAuthController('resetPassword')
);
/**
 * POST /api/v1/auth/verify-token
 * Verificar validez de token (para servicios externos)
 */
router.post(
  '/verify-token',
  withAuthController('verifyToken')
);
// ========== Rutas protegidas (requieren autenticación) ==========
/**
 * GET /api/v1/auth/me
 * Obtener información del usuario actual
 */
router.get(
  '/me',
  authenticateToken,
  withAuthController('getCurrentUser')
);
/**
 * POST /api/v1/auth/logout
 * Cerrar sesión
 */
router.post(
  '/logout',
  authenticateToken,
  withAuthController('logout')
);
/**
 * PUT /api/v1/auth/change-password
 * Cambiar contraseña
 */
router.put(
  '/change-password',
  authenticateToken,
  withAuthController('changePassword')
);
/**
 * POST /api/v1/auth/switch-company
 * Cambiar empresa activa
 */
router.post(
  '/switch-company',
  authenticateToken,
  withAuthController('switchCompany')
);
/**
 * GET /api/v1/auth/companies
 * Obtener empresas del usuario
 */
router.get(
  '/companies',
  authenticateToken,
  withAuthController('getUserCompanies')
);
export default router;
