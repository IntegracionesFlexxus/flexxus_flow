/**
 * Notification Routes
 * Sprint 3 - Notification Center
 * Rutas REST para gestión de notificaciones
 */

import { Router } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { NotificationController } from '@/modules/notifications/controllers/NotificationController';
import { authMiddleware } from '@/modules/auth/middleware/authMiddleware';
import { rateLimiter } from '@/shared/middleware/rateLimiter';
import { validation } from '@/shared/middleware/validation';
import { body, query, param } from 'express-validator';

const router = Router();
const notificationController = container.get<NotificationController>(TYPES.NotificationController);

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

// Aplicar rate limiting
const notificationLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests
  message: 'Too many notification requests'
});

/**
 * GET /api/notifications
 * Listar notificaciones con paginación y filtros
 */
router.get(
  '/',
  notificationLimiter,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('type').optional().isString(),
    query('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
    query('category').optional().isString(),
    query('read').optional().isBoolean(),
    query('archived').optional().isBoolean(),
    query('fromDate').optional().isISO8601(),
    query('toDate').optional().isISO8601(),
    query('search').optional().isString().trim()
  ],
  validation,
  notificationController.getNotifications
);

/**
 * GET /api/notifications/stats
 * Obtener estadísticas
 */
router.get(
  '/stats',
  notificationLimiter,
  notificationController.getStats
);

/**
 * GET /api/notifications/unread-count
 * Obtener contador de no leídas
 */
router.get(
  '/unread-count',
  notificationLimiter,
  notificationController.getUnreadCount
);

/**
 * GET /api/notifications/preferences
 * Obtener preferencias de notificación
 */
router.get(
  '/preferences',
  notificationLimiter,
  notificationController.getPreferences
);

/**
 * PUT /api/notifications/preferences
 * Actualizar preferencias
 */
router.put(
  '/preferences',
  notificationLimiter,
  [
    body('enabled').optional().isBoolean(),
    body('sound').optional().isBoolean(),
    body('vibrate').optional().isBoolean(),
    body('desktop').optional().isBoolean(),
    body('categories').optional().isObject(),
    body('priorities').optional().isArray(),
    body('quietHours').optional().isObject()
  ],
  validation,
  notificationController.updatePreferences
);

/**
 * GET /api/notifications/:id
 * Obtener notificación específica
 */
router.get(
  '/:id',
  notificationLimiter,
  [
    param('id').isUUID()
  ],
  validation,
  notificationController.getNotificationById
);

/**
 * POST /api/notifications
 * Crear nueva notificación (requiere permisos especiales)
 */
router.post(
  '/',
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10, // Límite más estricto para creación
    message: 'Too many notification creation requests'
  }),
  [
    body('type').isString().notEmpty(),
    body('title').optional().isString(),
    body('message').isString().notEmpty(),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
    body('category').optional().isString(),
    body('recipients').optional().isArray(),
    body('data').optional().isObject(),
    body('actions').optional().isArray(),
    body('expiresAt').optional().isISO8601()
  ],
  validation,
  notificationController.createNotification
);

/**
 * PATCH /api/notifications/:id/read
 * Marcar como leída
 */
router.patch(
  '/:id/read',
  notificationLimiter,
  [
    param('id').isUUID()
  ],
  validation,
  notificationController.markAsRead
);

/**
 * PATCH /api/notifications/read-all
 * Marcar todas como leídas
 */
router.patch(
  '/read-all',
  notificationLimiter,
  notificationController.markAllAsRead
);

/**
 * POST /api/notifications/:id/archive
 * Archivar notificación
 */
router.post(
  '/:id/archive',
  notificationLimiter,
  [
    param('id').isUUID()
  ],
  validation,
  notificationController.archiveNotification
);

/**
 * DELETE /api/notifications/:id
 * Eliminar notificación
 */
router.delete(
  '/:id',
  notificationLimiter,
  [
    param('id').isUUID()
  ],
  validation,
  notificationController.deleteNotification
);

/**
 * DELETE /api/notifications/all
 * Eliminar todas las notificaciones
 */
router.delete(
  '/all',
  rateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5, // Máximo 5 veces por hora
    message: 'Too many delete all requests'
  }),
  notificationController.deleteAllNotifications
);

export default router;