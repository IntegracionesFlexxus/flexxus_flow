/**
 * NotificationWebSocketService
 * Sprint 3 - Notification Center
 * Extiende NotificationService con capacidades WebSocket
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
import { IWebSocketServer } from '@/modules/websocket/interfaces/IWebSocketServer';
import { INotificationRepository, NotificationEntity } from '@/modules/notifications/interfaces/INotificationRepository';
import { NotificationEvents } from '../../../../shared/websocket-events';

export interface NotificationWebSocketEvent {
  type: 'new' | 'updated' | 'deleted' | 'bulk';
  userId: string;
  companyId?: string;
  data: any;
}

@injectable()
export class NotificationWebSocketService {
  constructor(
    @inject(TYPES.WebSocketServer) private wsServer: IWebSocketServer,
    @inject(TYPES.NotificationRepository) private notificationRepository: INotificationRepository,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Emitir nueva notificación a usuario(s)
   */
  async emitNewNotification(notification: NotificationEntity): Promise<void> {
    try {
      if (!notification.userId) {
        this.logger.warn('Cannot emit notification without userId');
        return;
      }

      // Emitir a la room del usuario
      const event = {
        type: NotificationEvents.NEW,
        data: this.sanitizeNotification(notification)
      };

      // Emitir al usuario específico
      await this.wsServer.emitToUser(notification.userId, event);

      // Si es de empresa, emitir también a la room de la empresa
      if (notification.companyId) {
        await this.wsServer.emitToCompany(notification.companyId, event);
      }

      this.logger.debug('Notification emitted via WebSocket', {
        notificationId: notification.id,
        userId: notification.userId,
        companyId: notification.companyId
      });
    } catch (error) {
      this.logger.error('Error emitting notification via WebSocket', {
        error: error.message,
        notificationId: notification.id
      });
    }
  }

  /**
   * Emitir actualización de notificación
   */
  async emitNotificationUpdate(userId: string, update: any): Promise<void> {
    try {
      const event = {
        type: NotificationEvents.UPDATED,
        data: update
      };

      await this.wsServer.emitToUser(userId, event);

      this.logger.debug('Notification update emitted', {
        userId,
        update
      });
    } catch (error) {
      this.logger.error('Error emitting notification update', {
        error: error.message,
        userId,
        update
      });
    }
  }

  /**
   * Emitir eliminación de notificación
   */
  async emitNotificationDeletion(userId: string, notificationId: string): Promise<void> {
    try {
      const event = {
        type: NotificationEvents.DELETED,
        data: { id: notificationId }
      };

      await this.wsServer.emitToUser(userId, event);

      this.logger.debug('Notification deletion emitted', {
        userId,
        notificationId
      });
    } catch (error) {
      this.logger.error('Error emitting notification deletion', {
        error: error.message,
        userId,
        notificationId
      });
    }
  }

  /**
   * Emitir múltiples notificaciones (bulk)
   */
  async emitBulkNotifications(userId: string, notifications: NotificationEntity[]): Promise<void> {
    try {
      const event = {
        type: NotificationEvents.BULK,
        data: notifications.map(n => this.sanitizeNotification(n))
      };

      await this.wsServer.emitToUser(userId, event);

      this.logger.debug('Bulk notifications emitted', {
        userId,
        count: notifications.length
      });
    } catch (error) {
      this.logger.error('Error emitting bulk notifications', {
        error: error.message,
        userId,
        count: notifications.length
      });
    }
  }

  /**
   * Emitir contador de no leídas actualizado
   */
  async emitUnreadCount(userId: string, companyId?: string): Promise<void> {
    try {
      const count = await this.notificationRepository.countUnread(userId, companyId);

      const event = {
        type: NotificationEvents.UNREAD_COUNT,
        data: { count }
      };

      await this.wsServer.emitToUser(userId, event);

      this.logger.debug('Unread count emitted', {
        userId,
        count
      });
    } catch (error) {
      this.logger.error('Error emitting unread count', {
        error: error.message,
        userId
      });
    }
  }

  /**
   * Suscribir usuario a notificaciones
   */
  async subscribeUserToNotifications(socketId: string, userId: string, companyId?: string): Promise<void> {
    try {
      // Unir a room del usuario
      await this.wsServer.joinRoom(socketId, `user:${userId}`);

      // Unir a room de la empresa si aplica
      if (companyId) {
        await this.wsServer.joinRoom(socketId, `company:${companyId}`);
      }

      // Unir a room general de notificaciones
      await this.wsServer.joinRoom(socketId, 'notifications');

      // Enviar notificaciones no leídas iniciales
      const unreadNotifications = await this.notificationRepository.findAll(
        { userId, read: false, archived: false },
        { page: 1, limit: 50 }
      );

      if (unreadNotifications.data.length > 0) {
        await this.emitBulkNotifications(userId, unreadNotifications.data);
      }

      // Enviar contador inicial
      await this.emitUnreadCount(userId, companyId);

      this.logger.info('User subscribed to notifications', {
        socketId,
        userId,
        companyId
      });
    } catch (error) {
      this.logger.error('Error subscribing user to notifications', {
        error: error.message,
        socketId,
        userId
      });
    }
  }

  /**
   * Desuscribir usuario de notificaciones
   */
  async unsubscribeUserFromNotifications(socketId: string, userId: string, companyId?: string): Promise<void> {
    try {
      // Salir de room del usuario
      await this.wsServer.leaveRoom(socketId, `user:${userId}`);

      // Salir de room de la empresa si aplica
      if (companyId) {
        await this.wsServer.leaveRoom(socketId, `company:${companyId}`);
      }

      // Salir de room general
      await this.wsServer.leaveRoom(socketId, 'notifications');

      this.logger.info('User unsubscribed from notifications', {
        socketId,
        userId,
        companyId
      });
    } catch (error) {
      this.logger.error('Error unsubscribing user from notifications', {
        error: error.message,
        socketId,
        userId
      });
    }
  }

  /**
   * Manejar eventos de socket para notificaciones
   */
  setupSocketHandlers(socket: any): void {
    // Suscribirse a notificaciones
    socket.on('notifications:subscribe', async () => {
      const userId = socket.userId;
      const companyId = socket.companyId;
      
      if (userId) {
        await this.subscribeUserToNotifications(socket.id, userId, companyId);
      }
    });

    // Desuscribirse de notificaciones
    socket.on('notifications:unsubscribe', async () => {
      const userId = socket.userId;
      const companyId = socket.companyId;
      
      if (userId) {
        await this.unsubscribeUserFromNotifications(socket.id, userId, companyId);
      }
    });

    // Marcar como leída
    socket.on('notification:mark-read', async (notificationId: string) => {
      const userId = socket.userId;
      
      if (userId && notificationId) {
        const success = await this.notificationRepository.markAsRead(notificationId, userId);
        
        if (success) {
          // Emitir actualización a todos los dispositivos del usuario
          await this.emitNotificationUpdate(userId, { id: notificationId, read: true });
          await this.emitUnreadCount(userId, socket.companyId);
        }
      }
    });

    // Marcar todas como leídas
    socket.on('notifications:mark-all-read', async () => {
      const userId = socket.userId;
      const companyId = socket.companyId;
      
      if (userId) {
        const count = await this.notificationRepository.markAllAsRead(userId, companyId);
        
        if (count > 0) {
          // Emitir actualización
          await this.emitNotificationUpdate(userId, { allRead: true });
          await this.emitUnreadCount(userId, companyId);
        }
      }
    });

    // Eliminar notificación
    socket.on('notification:delete', async (notificationId: string) => {
      const userId = socket.userId;
      
      if (userId && notificationId) {
        // Verificar permisos
        const notification = await this.notificationRepository.findById(notificationId);
        
        if (notification && notification.userId === userId) {
          const success = await this.notificationRepository.delete(notificationId);
          
          if (success) {
            await this.emitNotificationDeletion(userId, notificationId);
            await this.emitUnreadCount(userId, socket.companyId);
          }
        }
      }
    });
  }

  /**
   * Sanitizar notificación para envío por WebSocket
   */
  private sanitizeNotification(notification: NotificationEntity): any {
    const { ...sanitized } = notification;
    
    // Remover campos sensibles si los hay
    delete sanitized.createdBy;
    
    return sanitized;
  }
}