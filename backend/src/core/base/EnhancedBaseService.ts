/**
 * Enhanced Base Service
 * Sprint 4 - Extensión del BaseService con operaciones CRUD completas
 */
import { injectable } from 'inversify';
import { BaseService, ServiceContext, ServiceResult, PaginationOptions, PaginatedResult } from './BaseService';
import { BaseRepository, BaseEntity } from '@/shared/database/repositories/BaseRepository';
export interface FindOptions {
  where?: Record<string, any>;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
  include?: string[];
  select?: string[];
}
export interface BulkOperationResult<T> {
  success: T[];
  failed: Array<{ data: Partial<T>; error: string }>;
  total: number;
}
export interface AggregationResult {
  _id: any;
  count?: number;
  sum?: number;
  avg?: number;
  min?: any;
  max?: any;
}
@injectable()
export abstract class EnhancedBaseService<T extends BaseEntity> extends BaseService<T> {
  protected repository: BaseRepository<T>;
  /**
   * Create a new entity
   */
  async create(data: Partial<T>, context?: ServiceContext): Promise<ServiceResult<T>> {
    return this.executeOperation('create', async () => {
      // Set context if provided
      if (context) {
        this.setContext(context);
      }
      // Validate data
      await this.validateCreateData(data);
      // Apply business rules
      const processedData = await this.beforeCreate(data);
      // Create in repository
      const entity = await this.repository.create(processedData);
      // Post-create hooks
      await this.afterCreate(entity);
      // Invalidate related cache
      await this.invalidateCache([`list:*`, `count:*`]);
      return entity;
    });
  }
  /**
   * Find entity by ID
   */
  async findById(id: string, context?: ServiceContext): Promise<ServiceResult<T | null>> {
    return this.executeOperation('findById', async () => {
      if (context) {
        this.setContext(context);
      }
      // Try to get from cache
      const cacheKey = `entity:${id}`;
      const cached = await this.getFromCacheOrExecute(
        cacheKey,
        async () => this.repository.findById(id),
        300 // 5 minutes cache
      );
      return cached;
    });
  }
  /**
   * Find one entity by criteria
   */
  async findOne(criteria: Record<string, any>, context?: ServiceContext): Promise<ServiceResult<T | null>> {
    return this.executeOperation('findOne', async () => {
      if (context) {
        this.setContext(context);
      }
      // Build cache key from criteria
      const cacheKey = `findOne:${JSON.stringify(criteria)}`;
      const entity = await this.getFromCacheOrExecute(
        cacheKey,
        async () => {
          // Use first matching field for simple queries
          const field = Object.keys(criteria)[0];
          const value = criteria[field];
          return this.repository.findOneByField(field, value);
        },
        300
      );
      return entity;
    });
  }
  /**
   * Find all entities with options
   */
  async findAll(options?: FindOptions, context?: ServiceContext): Promise<ServiceResult<T[]>> {
    return this.executeOperation('findAll', async () => {
      if (context) {
        this.setContext(context);
      }
      const limit = options?.limit || 100;
      const offset = options?.offset || 0;
      // Build cache key
      const cacheKey = `list:${JSON.stringify(options || {})}`;
      const entities = await this.getFromCacheOrExecute(
        cacheKey,
        async () => this.repository.findAll(limit, offset),
        60 // 1 minute cache for lists
      );
      return entities;
    });
  }
  /**
   * Find with pagination
   */
  async findPaginated(
    options: PaginationOptions & FindOptions,
    context?: ServiceContext
  ): Promise<ServiceResult<PaginatedResult<T>>> {
    return this.executeOperation('findPaginated', async () => {
      if (context) {
        this.setContext(context);
      }
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;
      // Get data and count in parallel
      const [entities, total] = await Promise.all([
        this.repository.findAll(limit, offset),
        this.repository.count()
      ]);
      return this.paginate(entities, total, { page, limit });
    });
  }
  /**
   * Update entity
   */
  async update(id: string, data: Partial<T>, context?: ServiceContext): Promise<ServiceResult<T>> {
    return this.executeOperation('update', async () => {
      if (context) {
        this.setContext(context);
      }
      // Check if exists
      const existing = await this.repository.findById(id);
      if (!existing) {
        throw new Error(`Entity with id ${id} not found`);
      }
      // Validate update data
      await this.validateUpdateData(data, existing);
      // Apply business rules
      const processedData = await this.beforeUpdate(data, existing);
      // Update in repository
      const updated = await this.repository.update(id, processedData);
      if (!updated) {
        throw new Error(`Failed to update entity with id ${id}`);
      }
      // Post-update hooks
      await this.afterUpdate(updated, existing);
      // Invalidate cache
      await this.invalidateCache([
        `entity:${id}`,
        `list:*`,
        `findOne:*`
      ]);
      return updated;
    });
  }
  /**
   * Delete entity (soft delete by default)
   */
  async delete(id: string, context?: ServiceContext): Promise<ServiceResult<boolean>> {
    return this.executeOperation('delete', async () => {
      if (context) {
        this.setContext(context);
      }
      // Check if exists
      const existing = await this.repository.findById(id);
      if (!existing) {
        throw new Error(`Entity with id ${id} not found`);
      }
      // Apply business rules
      await this.beforeDelete(existing);
      // Soft delete
      const deleted = await this.repository.softDelete(id);
      // Post-delete hooks
      if (deleted) {
        await this.afterDelete(existing);
        // Invalidate cache
        await this.invalidateCache([
          `entity:${id}`,
          `list:*`,
          `count:*`,
          `findOne:*`
        ]);
      }
      return deleted;
    });
  }
  /**
   * Restore soft-deleted entity
   */
  async restore(id: string, context?: ServiceContext): Promise<ServiceResult<T>> {
    return this.executeOperation('restore', async () => {
      if (context) {
        this.setContext(context);
      }
      // Custom restore logic - needs to be implemented in repository
      const query = `
        UPDATE ${this.repository['tableName']}
        SET deleted_at = NULL, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      const results = await this.repository['db'].query<T>(query, [id]);
      if (results.rows.length === 0) {
        throw new Error(`Entity with id ${id} not found or not deleted`);
      }
      const restored = results.rows[0];
      // Post-restore hooks
      await this.afterRestore(restored);
      // Invalidate cache
      await this.invalidateCache([
        `entity:${id}`,
        `list:*`,
        `count:*`
      ]);
      return restored;
    });
  }
  /**
   * Create multiple entities
   */
  async createMany(
    data: Partial<T>[],
    context?: ServiceContext
  ): Promise<ServiceResult<BulkOperationResult<T>>> {
    return this.executeOperation('createMany', async () => {
      if (context) {
        this.setContext(context);
      }
      const result: BulkOperationResult<T> = {
        success: [],
        failed: [],
        total: data.length
      };
      // Process in batches
      const batchSize = 100;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (item) => {
            try {
              // Validate each item
              await this.validateCreateData(item);
              const processedData = await this.beforeCreate(item);
              const entity = await this.repository.create(processedData);
              result.success.push(entity);
            } catch (error) {
              result.failed.push({
                data: item,
                error: error.message
              });
            }
          })
        );
      }
      // Invalidate cache after bulk operation
      if (result.success.length > 0) {
        await this.invalidateCache([`list:*`, `count:*`]);
      }
      return result;
    });
  }
  /**
   * Update multiple entities
   */
  async updateMany(
    criteria: Record<string, any>,
    data: Partial<T>,
    context?: ServiceContext
  ): Promise<ServiceResult<number>> {
    return this.executeOperation('updateMany', async () => {
      if (context) {
        this.setContext(context);
      }
      // Build WHERE clause from criteria
      const whereClause = Object.entries(criteria)
        .map(([key, value], index) => `${key} = $${index + 1}`)
        .join(' AND ');
      const values = Object.values(criteria);
      // Get entities to update
      const query = `
        SELECT * FROM ${this.repository['tableName']}
        WHERE ${whereClause} AND deleted_at IS NULL
      `;
      const entities = await this.repository['db'].query<T>(query, values);
      // Update each entity
      let updatedCount = 0;
      for (const entity of entities.rows) {
        try {
          await this.validateUpdateData(data, entity);
          const processedData = await this.beforeUpdate(data, entity);
          const updated = await this.repository.update(entity.id, processedData);
          if (updated) {
            updatedCount++;
            await this.afterUpdate(updated, entity);
          }
        } catch (error) {
          this.logger.warn(`Failed to update entity ${entity.id}:`, error);
        }
      }
      // Invalidate cache
      if (updatedCount > 0) {
        await this.invalidateCache(['entity:*', 'list:*', 'findOne:*']);
      }
      return updatedCount;
    });
  }
  /**
   * Delete multiple entities
   */
  async deleteMany(
    criteria: Record<string, any>,
    context?: ServiceContext
  ): Promise<ServiceResult<number>> {
    return this.executeOperation('deleteMany', async () => {
      if (context) {
        this.setContext(context);
      }
      // Build WHERE clause
      const whereClause = Object.entries(criteria)
        .map(([key, value], index) => `${key} = $${index + 1}`)
        .join(' AND ');
      const values = Object.values(criteria);
      // Get entities to delete
      const query = `
        SELECT id FROM ${this.repository['tableName']}
        WHERE ${whereClause} AND deleted_at IS NULL
      `;
      const entities = await this.repository['db'].query<{ id: string }>(query, values);
      // Delete each entity
      let deletedCount = 0;
      for (const entity of entities.rows) {
        const deleted = await this.repository.softDelete(entity.id);
        if (deleted) {
          deletedCount++;
        }
      }
      // Invalidate cache
      if (deletedCount > 0) {
        await this.invalidateCache(['entity:*', 'list:*', 'count:*', 'findOne:*']);
      }
      return deletedCount;
    });
  }
  /**
   * Count entities
   */
  async count(criteria?: Record<string, any>, context?: ServiceContext): Promise<ServiceResult<number>> {
    return this.executeOperation('count', async () => {
      if (context) {
        this.setContext(context);
      }
      const cacheKey = `count:${JSON.stringify(criteria || {})}`;
      const count = await this.getFromCacheOrExecute(
        cacheKey,
        async () => {
          if (!criteria || Object.keys(criteria).length === 0) {
            return this.repository.count();
          }
          const whereClause = Object.entries(criteria)
            .map(([key], index) => `${key} = $${index + 1}`)
            .join(' AND ');
          return this.repository.count(whereClause, Object.values(criteria));
        },
        300
      );
      return count;
    });
  }
  /**
   * Check if entity exists
   */
  async exists(criteria: Record<string, any>, context?: ServiceContext): Promise<ServiceResult<boolean>> {
    return this.executeOperation('exists', async () => {
      if (context) {
        this.setContext(context);
      }
      const result = await this.count(criteria);
      return result.data! > 0;
    });
  }
  /**
   * Get distinct values for a field
   */
  async distinct(
    field: string,
    criteria?: Record<string, any>,
    context?: ServiceContext
  ): Promise<ServiceResult<any[]>> {
    return this.executeOperation('distinct', async () => {
      if (context) {
        this.setContext(context);
      }
      let query = `
        SELECT DISTINCT ${field} 
        FROM ${this.repository['tableName']}
        WHERE deleted_at IS NULL
      `;
      const values: any[] = [];
      if (criteria && Object.keys(criteria).length > 0) {
        const whereClause = Object.entries(criteria)
          .map(([key], index) => {
            values.push(criteria[key]);
            return `${key} = $${index + 1}`;
          })
          .join(' AND ');
        query += ` AND ${whereClause}`;
      }
      const results = await this.repository['db'].query<any>(query, values);
      return results.rows.map(r => r[field]);
    });
  }
  // Hook methods to be overridden by child classes
  protected async validateCreateData(data: Partial<T>): Promise<void> {
    // Override in child class for custom validation
  }
  protected async validateUpdateData(data: Partial<T>, existing: T): Promise<void> {
    // Override in child class for custom validation
  }
  protected async beforeCreate(data: Partial<T>): Promise<Partial<T>> {
    // Override in child class for pre-create processing
    return data;
  }
  protected async afterCreate(entity: T): Promise<void> {
    // Override in child class for post-create actions
  }
  protected async beforeUpdate(data: Partial<T>, existing: T): Promise<Partial<T>> {
    // Override in child class for pre-update processing
    return data;
  }
  protected async afterUpdate(updated: T, previous: T): Promise<void> {
    // Override in child class for post-update actions
  }
  protected async beforeDelete(entity: T): Promise<void> {
    // Override in child class for pre-delete validation
  }
  protected async afterDelete(entity: T): Promise<void> {
    // Override in child class for post-delete actions
  }
  protected async afterRestore(entity: T): Promise<void> {
    // Override in child class for post-restore actions
  }
}
