/**
 * NotificationRepository Implementation
 * Sprint 3 - Notification Center
 * Implementación de persistencia usando TypeORM
 */

import { injectable, inject } from 'inversify';
import { Repository, LessThan, MoreThan, Between, Like, In } from 'typeorm';
import { TYPES } from '@/container/types';
import { DatabaseConnection } from '@/shared/database/connections/DatabaseConnection';
import { BaseRepository } from '@/shared/database/repositories/BaseRepository';
import { INotificationRepository, NotificationEntity, NotificationFilter, NotificationStats } from '@/modules/notifications/interfaces/INotificationRepository';
import { Logger } from 'winston';

@injectable()
export class NotificationRepository extends BaseRepository<NotificationEntity> implements INotificationRepository {
  protected repository!: Repository<NotificationEntity>;

  constructor(
    @inject(TYPES.DatabaseConnection) databaseConnection: DatabaseConnection,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    super(databaseConnection as any, 'notifications' as any);
    // TODO: Initialize TypeORM repository when TypeORM is properly configured
    // this.repository = databaseConnection.getRepository(NotificationEntity);
  }

  /**
   * Crear nueva notificación
   */
  async create(notification: Partial<NotificationEntity>): Promise<NotificationEntity> {
    try {
      const entity = this.repository.create({
        ...notification,
        read: false,
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      const saved = await this.repository.save(entity);
      this.logger.info('Notification created', { id: saved.id, type: saved.type });
      
      return saved;
    } catch (error) {
      this.logger.error('Error creating notification', error);
      throw error;
    }
  }

  /**
   * Buscar notificación por ID
   */
  async findById(id: string): Promise<NotificationEntity | null> {
    try {
      return await this.repository.findOne({ where: { id } });
    } catch (error) {
      this.logger.error('Error finding notification by id', { id, error });
      throw error;
    }
  }

  /**
   * Buscar todas las notificaciones con filtros
   */
  async findAll(
    filter: NotificationFilter, 
    pagination = { page: 1, limit: 20 }
  ): Promise<{
    data: NotificationEntity[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const query = this.repository.createQueryBuilder('notification');

      // Aplicar filtros
      if (filter.userId) {
        query.andWhere('notification.userId = :userId', { userId: filter.userId });
      }
      
      if (filter.companyId) {
        query.andWhere('notification.companyId = :companyId', { companyId: filter.companyId });
      }
      
      if (filter.type) {
        query.andWhere('notification.type = :type', { type: filter.type });
      }
      
      if (filter.priority) {
        query.andWhere('notification.priority = :priority', { priority: filter.priority });
      }
      
      if (filter.category) {
        query.andWhere('notification.category = :category', { category: filter.category });
      }
      
      if (filter.read !== undefined) {
        query.andWhere('notification.read = :read', { read: filter.read });
      }
      
      if (filter.archived !== undefined) {
        query.andWhere('notification.archived = :archived', { archived: filter.archived });
      }
      
      if (filter.fromDate) {
        query.andWhere('notification.createdAt >= :fromDate', { fromDate: filter.fromDate });
      }
      
      if (filter.toDate) {
        query.andWhere('notification.createdAt <= :toDate', { toDate: filter.toDate });
      }
      
      if (filter.search) {
        query.andWhere(
          '(notification.title ILIKE :search OR notification.message ILIKE :search)',
          { search: `%${filter.search}%` }
        );
      }

      // Excluir expiradas
      query.andWhere('(notification.expiresAt IS NULL OR notification.expiresAt > :now)', { now: new Date() });

      // Ordenar por fecha descendente
      query.orderBy('notification.createdAt', 'DESC');

      // Paginación
      const skip = (pagination.page - 1) * pagination.limit;
      query.skip(skip).take(pagination.limit);

      // Ejecutar query
      const [data, total] = await query.getManyAndCount();

      return {
        data,
        total,
        page: pagination.page,
        totalPages: Math.ceil(total / pagination.limit)
      };
    } catch (error) {
      this.logger.error('Error finding notifications', { filter, error });
      throw error;
    }
  }

  /**
   * Actualizar notificación
   */
  async update(id: string, data: Partial<NotificationEntity>): Promise<NotificationEntity> {
    try {
      await this.repository.update(id, {
        ...data,
        updatedAt: new Date()
      });
      
      const updated = await this.findById(id);
      if (!updated) {
        throw new Error(`Notification ${id} not found`);
      }
      
      return updated;
    } catch (error) {
      this.logger.error('Error updating notification', { id, error });
      throw error;
    }
  }

  /**
   * Eliminar notificación
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.repository.delete(id);
      return result.affected ? result.affected > 0 : false;
    } catch (error) {
      this.logger.error('Error deleting notification', { id, error });
      throw error;
    }
  }

  /**
   * Marcar como leída
   */
  async markAsRead(id: string, userId: string): Promise<boolean> {
    try {
      const result = await this.repository.update(
        { id, userId },
        { 
          read: true, 
          readAt: new Date(),
          updatedAt: new Date()
        }
      );
      
      return result.affected ? result.affected > 0 : false;
    } catch (error) {
      this.logger.error('Error marking notification as read', { id, userId, error });
      throw error;
    }
  }

  /**
   * Marcar todas como leídas
   */
  async markAllAsRead(userId: string, companyId?: string): Promise<number> {
    try {
      const where: any = { userId, read: false };
      if (companyId) {
        where.companyId = companyId;
      }
      
      const result = await this.repository.update(
        where,
        { 
          read: true, 
          readAt: new Date(),
          updatedAt: new Date()
        }
      );
      
      return result.affected || 0;
    } catch (error) {
      this.logger.error('Error marking all notifications as read', { userId, companyId, error });
      throw error;
    }
  }

  /**
   * Marcar como archivada
   */
  async markAsArchived(id: string, userId: string): Promise<boolean> {
    try {
      const result = await this.repository.update(
        { id, userId },
        { 
          archived: true,
          updatedAt: new Date()
        }
      );
      
      return result.affected ? result.affected > 0 : false;
    } catch (error) {
      this.logger.error('Error archiving notification', { id, userId, error });
      throw error;
    }
  }

  /**
   * Eliminar todas las notificaciones de un usuario
   */
  async deleteAll(userId: string, companyId?: string): Promise<number> {
    try {
      const where: any = { userId };
      if (companyId) {
        where.companyId = companyId;
      }
      
      const result = await this.repository.delete(where);
      return result.affected || 0;
    } catch (error) {
      this.logger.error('Error deleting all notifications', { userId, companyId, error });
      throw error;
    }
  }

  /**
   * Obtener estadísticas
   */
  async getStats(userId: string, companyId?: string): Promise<NotificationStats> {
    try {
      const query = this.repository.createQueryBuilder('notification');
      
      query.where('notification.userId = :userId', { userId });
      
      if (companyId) {
        query.andWhere('notification.companyId = :companyId', { companyId });
      }
      
      query.andWhere('notification.archived = false');
      query.andWhere('(notification.expiresAt IS NULL OR notification.expiresAt > :now)', { now: new Date() });

      // Total y no leídas
      query.select('COUNT(*)', 'total');
      query.addSelect('SUM(CASE WHEN notification.read = false THEN 1 ELSE 0 END)', 'unread');
      
      // Por tipo
      query.addSelect(`
        jsonb_object_agg(
          DISTINCT notification.type,
          (SELECT COUNT(*) FROM notifications n WHERE n.type = notification.type AND n.userId = :userId)
        ) as byType
      `);
      
      // Por categoría
      query.addSelect(`
        jsonb_object_agg(
          DISTINCT notification.category,
          (SELECT COUNT(*) FROM notifications n WHERE n.category = notification.category AND n.userId = :userId)
        ) FILTER (WHERE notification.category IS NOT NULL) as byCategory
      `);
      
      // Por prioridad
      query.addSelect(`
        jsonb_object_agg(
          DISTINCT notification.priority,
          (SELECT COUNT(*) FROM notifications n WHERE n.priority = notification.priority AND n.userId = :userId)
        ) as byPriority
      `);

      const result = await query.getRawOne();

      return {
        total: parseInt(result.total, 10) || 0,
        unread: parseInt(result.unread, 10) || 0,
        byType: result.byType || {},
        byCategory: result.byCategory || {},
        byPriority: result.byPriority || {}
      };
    } catch (error) {
      this.logger.error('Error getting notification stats', { userId, companyId, error });
      throw error;
    }
  }

  /**
   * Contar no leídas
   */
  async countUnread(userId: string, companyId?: string): Promise<number> {
    try {
      const where: any = { userId, read: false, archived: false };
      if (companyId) {
        where.companyId = companyId;
      }
      
      return await this.repository.count({ where });
    } catch (error) {
      this.logger.error('Error counting unread notifications', { userId, companyId, error });
      throw error;
    }
  }

  /**
   * Crear notificaciones en lote
   */
  async createBulk(notifications: Partial<NotificationEntity>[]): Promise<NotificationEntity[]> {
    try {
      const entities = notifications.map(n => this.repository.create({
        ...n,
        read: false,
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      const saved = await this.repository.save(entities);
      this.logger.info('Bulk notifications created', { count: saved.length });
      
      return saved;
    } catch (error) {
      this.logger.error('Error creating bulk notifications', error);
      throw error;
    }
  }

  /**
   * Eliminar notificaciones expiradas
   */
  async deleteExpired(): Promise<number> {
    try {
      const result = await this.repository.delete({
        expiresAt: LessThan(new Date())
      });
      
      const affected = result.affected || 0;
      if (affected > 0) {
        this.logger.info('Expired notifications deleted', { count: affected });
      }
      
      return affected;
    } catch (error) {
      this.logger.error('Error deleting expired notifications', error);
      throw error;
    }
  }
}