/**
 * Notification API Service
 * Sprint 3 - Notification Center
 * Servicio para comunicación con backend de notificaciones
 */

import { api } from '@/shared/services/api';
import { NotificationData } from './notificationService';

export interface NotificationApiResponse {
  data: NotificationData[];
  total: number;
  page: number;
  totalPages: number;
}

export interface NotificationPreferencesApi {
  enabled: boolean;
  sound: boolean;
  vibrate: boolean;
  desktop: boolean;
  categories: Record<string, boolean>;
  priorities: string[];
  quietHours?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
}

class NotificationApiService {
  private readonly baseUrl = '/api/notifications';

  /**
   * Obtener notificaciones con paginación
   */
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    type?: string;
    priority?: string;
    category?: string;
    read?: boolean;
    archived?: boolean;
    search?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<NotificationApiResponse> {
    const response = await api.get(this.baseUrl, { params });
    return response.data;
  }

  /**
   * Obtener una notificación específica
   */
  async getNotificationById(id: string): Promise<NotificationData> {
    const response = await api.get(`${this.baseUrl}/${id}`);
    return response.data.data;
  }

  /**
   * Crear nueva notificación (admin only)
   */
  async createNotification(notification: Partial<NotificationData>): Promise<NotificationData> {
    const response = await api.post(this.baseUrl, notification);
    return response.data.data;
  }

  /**
   * Marcar como leída
   */
  async markAsRead(id: string): Promise<void> {
    await api.patch(`${this.baseUrl}/${id}/read`);
  }

  /**
   * Marcar todas como leídas
   */
  async markAllAsRead(): Promise<{ count: number }> {
    const response = await api.patch(`${this.baseUrl}/read-all`);
    return response.data.data;
  }

  /**
   * Archivar notificación
   */
  async archiveNotification(id: string): Promise<void> {
    await api.post(`${this.baseUrl}/${id}/archive`);
  }

  /**
   * Eliminar notificación
   */
  async deleteNotification(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Eliminar todas las notificaciones
   */
  async deleteAllNotifications(): Promise<{ count: number }> {
    const response = await api.delete(`${this.baseUrl}/all`);
    return response.data.data;
  }

  /**
   * Obtener estadísticas
   */
  async getStats(): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const response = await api.get(`${this.baseUrl}/stats`);
    return response.data.data;
  }

  /**
   * Obtener contador de no leídas
   */
  async getUnreadCount(): Promise<number> {
    const response = await api.get(`${this.baseUrl}/unread-count`);
    return response.data.data.count;
  }

  /**
   * Obtener preferencias
   */
  async getPreferences(): Promise<NotificationPreferencesApi> {
    const response = await api.get(`${this.baseUrl}/preferences`);
    return response.data.data;
  }

  /**
   * Actualizar preferencias
   */
  async updatePreferences(preferences: Partial<NotificationPreferencesApi>): Promise<NotificationPreferencesApi> {
    const response = await api.put(`${this.baseUrl}/preferences`, preferences);
    return response.data.data;
  }

  /**
   * Sincronizar con servidor
   */
  async sync(lastSync?: Date): Promise<{
    notifications: NotificationData[];
    deleted: string[];
    updated: NotificationData[];
  }> {
    try {
      // Obtener notificaciones recientes
      const response = await this.getNotifications({
        fromDate: lastSync,
        limit: 100
      });

      return {
        notifications: response.data,
        deleted: [], // TODO: Implementar tracking de eliminados
        updated: [] // TODO: Implementar tracking de actualizados
      };
    } catch (error) {
      console.error('Error syncing notifications:', error);
      throw error;
    }
  }
}

export const notificationApiService = new NotificationApiService();