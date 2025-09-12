/**
 * Notification WebSocket Integration
 * Sprint 3 - Notification Center
 * Integración de notificaciones con Socket.io
 */

import { SocketService } from '@/services/socket.service';
import { notificationService, NotificationData } from './notificationService';
import { notificationApiService } from './notificationApiService';
import { NotificationEvents, PresenceEvents } from '../../../shared/websocket-events';

export class NotificationWebSocketIntegration {
  private static instance: NotificationWebSocketIntegration;
  private socketService: SocketService;
  private isSubscribed = false;
  private userId?: string;
  private companyId?: string;

  private constructor() {
    this.socketService = SocketService.getInstance();
  }

  static getInstance(): NotificationWebSocketIntegration {
    if (!NotificationWebSocketIntegration.instance) {
      NotificationWebSocketIntegration.instance = new NotificationWebSocketIntegration();
    }
    return NotificationWebSocketIntegration.instance;
  }

  /**
   * Inicializar integración con WebSocket
   */
  async initialize(token: string, userId: string, companyId?: string): Promise<void> {
    this.userId = userId;
    this.companyId = companyId;

    try {
      // Conectar Socket.io si no está conectado
      if (!this.socketService.getIsConnected()) {
        await this.socketService.connect({
          url: import.meta.env.VITE_WS_URL || 'http://localhost:3001',
          auth: { token, userId, companyId }
        });
      }

      // Configurar listeners
      this.setupListeners();

      // Suscribirse a notificaciones
      await this.subscribe();

      console.log('Notification Socket.io integration initialized');
    } catch (error) {
      console.error('Error initializing notification Socket.io:', error);
      throw error;
    }
  }

  /**
   * Configurar listeners de eventos
   */
  private setupListeners(): void {
    // Nueva notificación
    this.socketService.on(NotificationEvents.NEW, (data: NotificationData) => {
      console.log('New notification received:', data);
      
      // Agregar a notificationService local
      notificationService.create({
        ...data,
        source: 'server'
      });
    });

    // Notificación actualizada
    this.socketService.on(NotificationEvents.UPDATED, (data: any) => {
      console.log('Notification updated:', data);
      
      if (data.id && data.read !== undefined) {
        // Actualizar estado local
        const notifications = notificationService.getHistory();
        const notification = notifications.find(n => n.id === data.id);
        
        if (notification) {
          notification.read = data.read;
          if (data.read && !notification.readAt) {
            notification.readAt = new Date();
          }
          notificationService.updateNotification(notification);
        }
      }
      
      if (data.allRead) {
        // Marcar todas como leídas
        notificationService.markAllAsRead();
      }
    });

    // Notificación eliminada
    this.socketService.on(NotificationEvents.DELETED, (data: { id: string }) => {
      console.log('Notification deleted:', data.id);
      notificationService.remove(data.id);
    });

    // Notificaciones en lote
    this.socketService.on(NotificationEvents.BULK, (data: NotificationData[]) => {
      console.log('Bulk notifications received:', data.length);
      
      // Agregar todas al servicio local
      data.forEach(notification => {
        notificationService.create({
          ...notification,
          source: 'server'
        });
      });
    });

    // Contador de no leídas actualizado
    this.socketService.on(NotificationEvents.UNREAD_COUNT, (data: { count: number }) => {
      console.log('Unread count updated:', data.count);
      
      // Emitir evento para actualizar UI
      notificationService.emit('unread-count-updated', data.count);
    });

    // Conexión establecida
    this.socketService.on('connect', () => {
      console.log('WebSocket connected for notifications');
      
      // Re-suscribirse si es necesario
      if (!this.isSubscribed && this.userId) {
        this.subscribe();
      }
    });

    // Desconexión
    this.socketService.on('disconnect', () => {
      console.log('WebSocket disconnected for notifications');
      this.isSubscribed = false;
    });

    // Error
    this.socketService.on('error', (error: any) => {
      console.error('WebSocket error for notifications:', error);
    });
  }

  /**
   * Suscribirse a notificaciones
   */
  private async subscribe(): Promise<void> {
    if (this.isSubscribed) {
      return;
    }

    try {
      // Enviar evento de suscripción
      this.socketService.emit('notifications:subscribe', {
        userId: this.userId,
        companyId: this.companyId
      });

      this.isSubscribed = true;
      console.log('Subscribed to notifications');

      // Sincronizar con servidor
      await this.syncWithServer();
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      throw error;
    }
  }

  /**
   * Desuscribirse de notificaciones
   */
  unsubscribe(): void {
    if (!this.isSubscribed) {
      return;
    }

    this.socketService.emit('notifications:unsubscribe', {
      userId: this.userId,
      companyId: this.companyId
    });

    this.isSubscribed = false;
    console.log('Unsubscribed from notifications');
  }

  /**
   * Sincronizar con servidor
   */
  private async syncWithServer(): Promise<void> {
    try {
      // Obtener última sincronización
      const lastSync = localStorage.getItem('notifications_last_sync');
      const lastSyncDate = lastSync ? new Date(lastSync) : undefined;

      // Sincronizar con API
      const syncData = await notificationApiService.sync(lastSyncDate);

      // Procesar notificaciones nuevas
      if (syncData.notifications.length > 0) {
        console.log(`Syncing ${syncData.notifications.length} notifications from server`);
        
        syncData.notifications.forEach(notification => {
          // Verificar si ya existe localmente
          const exists = notificationService.getHistory()
            .some(n => n.id === notification.id);
          
          if (!exists) {
            notificationService.create({
              ...notification,
              source: 'server'
            });
          }
        });
      }

      // Actualizar timestamp de sincronización
      localStorage.setItem('notifications_last_sync', new Date().toISOString());
    } catch (error) {
      console.error('Error syncing with server:', error);
    }
  }

  /**
   * Enviar acción al servidor
   */
  sendAction(action: string, data: any): void {
    if (!this.isSubscribed) {
      console.warn('Not subscribed to notifications');
      return;
    }

    this.socketService.emit(action, data);
  }

  /**
   * Marcar como leída vía WebSocket
   */
  markAsRead(notificationId: string): void {
    this.sendAction(NotificationEvents.MARK_READ, notificationId);
  }

  /**
   * Marcar todas como leídas vía WebSocket
   */
  markAllAsRead(): void {
    this.sendAction(NotificationEvents.MARK_ALL_READ, {});
  }

  /**
   * Eliminar notificación vía WebSocket
   */
  deleteNotification(notificationId: string): void {
    this.sendAction(NotificationEvents.DELETE, notificationId);
  }

  /**
   * Desconectar y limpiar
   */
  disconnect(): void {
    this.unsubscribe();
    
    // Remover listeners
    this.socketService.off(NotificationEvents.NEW);
    this.socketService.off(NotificationEvents.UPDATED);
    this.socketService.off(NotificationEvents.DELETED);
    this.socketService.off('notifications:bulk');
    this.socketService.off('notifications:unread-count');
    
    console.log('Notification WebSocket integration disconnected');
  }

  /**
   * Verificar si está conectado
   */
  isConnected(): boolean {
    return this.socketService.isConnected() && this.isSubscribed;
  }
}

export const notificationWSIntegration = NotificationWebSocketIntegration.getInstance();