/**
 * INotificationRepository Interface
 * Sprint 3 - Notification Center
 * Define contrato para persistencia de notificaciones
 */

import { 
  NotificationRequest, 
  NotificationResponse, 
  NotificationType,
  NotificationStatus,
  NotificationPriority 
} from '@/modules/notifications/services/NotificationService';

export interface NotificationEntity {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  priority: NotificationPriority;
  category?: string;
  
  // Relaciones
  userId?: string;
  companyId?: string;
  createdBy?: string;
  
  // Estado
  read: boolean;
  readAt?: Date;
  archived: boolean;
  
  // Metadata
  data?: Record<string, any>;
  actions?: Array<{
    label: string;
    action: string;
    payload?: any;
  }>;
  expiresAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationFilter {
  userId?: string;
  companyId?: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  category?: string;
  read?: boolean;
  archived?: boolean;
  fromDate?: Date;
  toDate?: Date;
  search?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
}

export interface INotificationRepository {
  // CRUD básico
  create(notification: Partial<NotificationEntity>): Promise<NotificationEntity>;
  findById(id: string): Promise<NotificationEntity | null>;
  findAll(filter: NotificationFilter, pagination?: { page: number; limit: number }): Promise<{
    data: NotificationEntity[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  update(id: string, data: Partial<NotificationEntity>): Promise<NotificationEntity>;
  delete(id: string): Promise<boolean>;
  
  // Operaciones específicas
  markAsRead(id: string, userId: string): Promise<boolean>;
  markAllAsRead(userId: string, companyId?: string): Promise<number>;
  markAsArchived(id: string, userId: string): Promise<boolean>;
  deleteAll(userId: string, companyId?: string): Promise<number>;
  
  // Estadísticas
  getStats(userId: string, companyId?: string): Promise<NotificationStats>;
  countUnread(userId: string, companyId?: string): Promise<number>;
  
  // Bulk operations
  createBulk(notifications: Partial<NotificationEntity>[]): Promise<NotificationEntity[]>;
  deleteExpired(): Promise<number>;
}