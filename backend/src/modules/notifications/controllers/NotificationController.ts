/**
 * NotificationController
 * Sprint 3 - Notification Center
 * Controlador REST para gestión de notificaciones
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
import { BaseController } from '@/shared/controllers/BaseController';
import { asyncHandler } from '@/shared/middleware/errorHandler';
import { NotificationService } from '@/modules/notifications/services/NotificationService';
import { INotificationRepository, NotificationFilter } from '@/modules/notifications/interfaces/INotificationRepository';
import { ValidationError } from '@/shared/errors/AppError';

@injectable()
export class NotificationController extends BaseController {
  constructor(
    @inject(TYPES.Logger) logger: Logger,
    @inject(TYPES.NotificationService) private notificationService: NotificationService,
    @inject(TYPES.NotificationRepository) private notificationRepository: INotificationRepository
  ) {
    super(logger);
  }

  /**
   * GET /api/notifications
   * Listar notificaciones con paginación y filtros
   */
  getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const companyId = req.user?.companyId;
    
    if (!userId) {
      throw new ValidationError('User ID required');
    }

    // Parsear query params
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    
    const filter: NotificationFilter = {
      userId,
      companyId,
      type: req.query.type as any,
      priority: req.query.priority as any,
      category: req.query.category as string,
      read: req.query.read === 'true' ? true : req.query.read === 'false' ? false : undefined,
      archived: req.query.archived === 'true',
      search: req.query.search as string
    };

    // Fechas
    if (req.query.fromDate) {
      filter.fromDate = new Date(req.query.fromDate as string);
    }
    if (req.query.toDate) {
      filter.toDate = new Date(req.query.toDate as string);
    }

    const result = await this.notificationRepository.findAll(filter, { page, limit });
    
    this.sendSuccess(res, result, 'Notifications retrieved successfully');
  });

  /**
   * GET /api/notifications/:id
   * Obtener una notificación específica
   */
  getNotificationById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    const notification = await this.notificationRepository.findById(id);
    
    if (!notification) {
      return this.sendError(res, 'Notification not found', 404);
    }

    // Verificar permisos
    if (notification.userId !== userId) {
      return this.sendError(res, 'Unauthorized', 403);
    }

    this.sendSuccess(res, notification, 'Notification retrieved successfully');
  });

  /**
   * POST /api/notifications
   * Crear nueva notificación (admin only)
   */
  createNotification = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const companyId = req.user?.companyId;

    // Validar permisos (solo admin o sistema)
    if (!req.user?.permissions?.includes('notifications.create')) {
      return this.sendError(res, 'Insufficient permissions', 403);
    }

    const notificationData = {
      ...req.body,
      createdBy: userId,
      companyId: companyId || req.body.companyId
    };

    // Usar NotificationService para crear y enviar
    const response = await this.notificationService.send(notificationData);
    
    this.sendSuccess(res, response, 'Notification created successfully', 201);
  });

  /**
   * PATCH /api/notifications/:id/read
   * Marcar notificación como leída
   */
  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User ID required');
    }

    const success = await this.notificationRepository.markAsRead(id, userId);
    
    if (!success) {
      return this.sendError(res, 'Notification not found or already read', 404);
    }

    // Emitir evento WebSocket
    await this.notificationService.emitNotificationUpdate(userId, { id, read: true });

    this.sendSuccess(res, { id, read: true }, 'Notification marked as read');
  });

  /**
   * PATCH /api/notifications/read-all
   * Marcar todas las notificaciones como leídas
   */
  markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const companyId = req.user?.companyId;

    if (!userId) {
      throw new ValidationError('User ID required');
    }

    const count = await this.notificationRepository.markAllAsRead(userId, companyId);
    
    // Emitir evento WebSocket
    await this.notificationService.emitNotificationUpdate(userId, { allRead: true });

    this.sendSuccess(res, { count }, `${count} notifications marked as read`);
  });

  /**
   * DELETE /api/notifications/:id
   * Eliminar una notificación
   */
  deleteNotification = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    // Verificar que la notificación pertenece al usuario
    const notification = await this.notificationRepository.findById(id);
    
    if (!notification) {
      return this.sendError(res, 'Notification not found', 404);
    }

    if (notification.userId !== userId) {
      return this.sendError(res, 'Unauthorized', 403);
    }

    const success = await this.notificationRepository.delete(id);
    
    if (!success) {
      return this.sendError(res, 'Failed to delete notification', 500);
    }

    // Emitir evento WebSocket
    await this.notificationService.emitNotificationUpdate(userId, { id, deleted: true });

    this.sendSuccess(res, { id }, 'Notification deleted successfully');
  });

  /**
   * DELETE /api/notifications/all
   * Eliminar todas las notificaciones
   */
  deleteAllNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const companyId = req.user?.companyId;

    if (!userId) {
      throw new ValidationError('User ID required');
    }

    const count = await this.notificationRepository.deleteAll(userId, companyId);
    
    // Emitir evento WebSocket
    await this.notificationService.emitNotificationUpdate(userId, { allDeleted: true });

    this.sendSuccess(res, { count }, `${count} notifications deleted`);
  });

  /**
   * GET /api/notifications/stats
   * Obtener estadísticas de notificaciones
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const companyId = req.user?.companyId;

    if (!userId) {
      throw new ValidationError('User ID required');
    }

    const stats = await this.notificationRepository.getStats(userId, companyId);
    
    this.sendSuccess(res, stats, 'Statistics retrieved successfully');
  });

  /**
   * GET /api/notifications/unread-count
   * Obtener contador de no leídas
   */
  getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const companyId = req.user?.companyId;

    if (!userId) {
      throw new ValidationError('User ID required');
    }

    const count = await this.notificationRepository.countUnread(userId, companyId);
    
    this.sendSuccess(res, { count }, 'Unread count retrieved successfully');
  });

  /**
   * GET /api/notifications/preferences
   * Obtener preferencias de notificación
   */
  getPreferences = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User ID required');
    }

    // TODO: Implementar con UserPreferencesService cuando esté disponible
    const preferences = await this.notificationService.getUserPreferences(userId);
    
    this.sendSuccess(res, preferences, 'Preferences retrieved successfully');
  });

  /**
   * PUT /api/notifications/preferences
   * Actualizar preferencias de notificación
   */
  updatePreferences = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User ID required');
    }

    // TODO: Implementar con UserPreferencesService cuando esté disponible
    const preferences = await this.notificationService.updateUserPreferences(userId, req.body);
    
    this.sendSuccess(res, preferences, 'Preferences updated successfully');
  });

  /**
   * POST /api/notifications/:id/archive
   * Archivar notificación
   */
  archiveNotification = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User ID required');
    }

    const success = await this.notificationRepository.markAsArchived(id, userId);
    
    if (!success) {
      return this.sendError(res, 'Notification not found', 404);
    }

    // Emitir evento WebSocket
    await this.notificationService.emitNotificationUpdate(userId, { id, archived: true });

    this.sendSuccess(res, { id, archived: true }, 'Notification archived successfully');
  });
}