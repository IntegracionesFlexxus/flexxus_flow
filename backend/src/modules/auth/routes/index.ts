// Auth Routes - Sprint 1 con estructura Nivel 2
// Organización clara de rutas con middleware

import { Router } from 'express';
import { container } from '../../../container/container';
import { AuthController } from '../controllers/AuthController';
import { TYPES } from '../../../container/types';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../../../shared/middleware/validateRequest';
import { 
  loginValidation, 
  registerValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  switchCompanyValidation
} from '../validators/authValidators';

/**
 * Configuración de rutas del módulo Auth
 * Clean Code: Agrupación lógica de rutas relacionadas
 */
const router = Router();
const authController = container.get<AuthController>(TYPES.AuthController);

// ========== Rutas públicas (sin autenticación) ==========

/**
 * POST /api/v1/auth/login
 * Login de usuario
 */
router.post(
  '/login',
  loginValidation,
  validateRequest,
  authController.login.bind(authController)
);

/**
 * POST /api/v1/auth/register
 * Registro de nuevo usuario
 */
router.post(
  '/register',
  registerValidation,
  validateRequest,
  authController.register.bind(authController)
);

/**
 * POST /api/v1/auth/refresh
 * Refrescar token de acceso
 */
router.post(
  '/refresh',
  authController.refreshToken.bind(authController)
);

/**
 * POST /api/v1/auth/forgot-password
 * Solicitar recuperación de contraseña
 */
router.post(
  '/forgot-password',
  forgotPasswordValidation,
  validateRequest,
  authController.forgotPassword.bind(authController)
);

/**
 * POST /api/v1/auth/reset-password
 * Resetear contraseña con token
 */
router.post(
  '/reset-password',
  resetPasswordValidation,
  validateRequest,
  authController.resetPassword.bind(authController)
);

/**
 * POST /api/v1/auth/verify-token
 * Verificar validez de token (para servicios externos)
 */
router.post(
  '/verify-token',
  authController.verifyToken.bind(authController)
);

// ========== Rutas protegidas (requieren autenticación) ==========

/**
 * GET /api/v1/auth/me
 * Obtener información del usuario actual
 */
router.get(
  '/me',
  authMiddleware,
  authController.getCurrentUser.bind(authController)
);

/**
 * POST /api/v1/auth/logout
 * Cerrar sesión
 */
router.post(
  '/logout',
  authMiddleware,
  authController.logout.bind(authController)
);

/**
 * PUT /api/v1/auth/change-password
 * Cambiar contraseña
 */
router.put(
  '/change-password',
  authMiddleware,
  changePasswordValidation,
  validateRequest,
  authController.changePassword.bind(authController)
);

/**
 * POST /api/v1/auth/switch-company
 * Cambiar empresa activa
 */
router.post(
  '/switch-company',
  authMiddleware,
  switchCompanyValidation,
  validateRequest,
  authController.switchCompany.bind(authController)
);

/**
 * GET /api/v1/auth/companies
 * Obtener empresas del usuario
 */
router.get(
  '/companies',
  authMiddleware,
  authController.getUserCompanies.bind(authController)
);

export default router;