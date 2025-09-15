/**
 * Base Repository Pattern - PostgreSQL
 * Implementación base mejorada para operaciones CRUD con SQL parametrizado
 */
import { injectable, unmanaged, inject, optional } from 'inversify';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
export interface BaseEntity {
  id: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}
export interface QueryOptions {
  transaction?: any;
  skipLog?: boolean;
}
export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
@injectable()
export abstract class BaseRepository<T extends BaseEntity> {
  protected tableName: string;
  protected db: IDatabaseConnection;
  protected logger?: Logger;
  protected cache: Map<string, { data: any; expiry: number }> = new Map();
  protected readonly cacheTTL = 300000; // 5 minutes default
  // Whitelist of allowed fields for each table (override in child classes)
  protected allowedFields: Set<string> = new Set([
    'id', 'created_at', 'updated_at', 'deleted_at'
  ]);
  constructor(
    @unmanaged() tableName: string,
    @unmanaged() db: IDatabaseConnection,
    @inject(TYPES.Logger) @optional() logger?: Logger
  ) {
    this.tableName = tableName;
    this.db = db;
    this.logger = logger;
    // Log repository initialization
    this.logger?.debug(`${this.constructor.name} initialized`, {
      table: tableName
    });
  }
  // ==================== VALIDACIÓN DE PARÁMETROS ====================
  /**
   * Valida que los parámetros SQL sean seguros
   */
  protected validateParams(params: any[]): void {
    params.forEach((param, index) => {
      if (param === undefined) {
        throw new Error(`Parameter at index ${index} is undefined`);
      }
    });
  }
  /**
   * Valida que el nombre de campo sea seguro (previene SQL injection)
   */
  protected validateFieldName(field: string): void {
    // First check format
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
      throw new Error(`Invalid field name format: ${field}`);
    }
    // Then check whitelist
    if (!this.allowedFields.has(field)) {
      throw new Error(`Field not allowed: ${field}. Allowed fields: ${Array.from(this.allowedFields).join(', ')}`);
    }
  }
  /**
   * Valida múltiples nombres de campo
   */
  protected validateFieldNames(fields: string[]): void {
    fields.forEach(field => this.validateFieldName(field));
  }
  // ==================== CACHE SIMPLE ====================
  /**
   * Obtener del cache
   */
  protected getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      this.logger?.debug('Cache hit', { key });
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }
  /**
   * Guardar en cache
   */
  protected setCache(key: string, data: any, ttl: number = this.cacheTTL): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
    this.logger?.debug('Cache set', { key, ttl });
  }
  /**
   * Limpiar cache
   */
  protected clearCache(): void {
    this.cache.clear();
    this.logger?.debug('Cache cleared');
  }
  /**
   * Invalidar cache por patrón
   */
  protected invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.clearCache();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
  // ==================== OPERACIONES CRUD ====================
  /**
   * Buscar por ID con cache
   */
  async findById(id: string, options?: QueryOptions): Promise<T | null> {
    this.validateParams([id]);
    // Check cache first
    const cacheKey = `${this.tableName}:id:${id}`;
    const cached = this.getFromCache(cacheKey);
    if (cached !== null) {
      return cached;
    }
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE id = $1 AND deleted_at IS NULL
    `;
    try {
      const results = await this.db.query<T>(query, [id], options?.transaction);
      const result = results.length > 0 ? results[0] : null;
      // Cache the result
      if (result) {
        this.setCache(cacheKey, result);
      }
      if (!options?.skipLog) {
        this.logger?.debug(`${this.tableName}.findById`, { id, found: !!result });
      }
      return result;
    } catch (error) {
      this.logger?.error(`Error in ${this.tableName}.findById`, { id, error });
      throw error;
    }
  }
  /**
   * Buscar todos con paginación
   */
  async findAll(limit: number = 100, offset: number = 0, options?: QueryOptions): Promise<T[]> {
    this.validateParams([limit, offset]);
    const cacheKey = `${this.tableName}:all:${limit}:${offset}`;
    const cached = this.getFromCache(cacheKey);
    if (cached !== null) {
      return cached;
    }
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE deleted_at IS NULL 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    try {
      const results = await this.db.query<T>(query, [limit, offset], options?.transaction);
      // Cache the results
      this.setCache(cacheKey, results);
      if (!options?.skipLog) {
        this.logger?.debug(`${this.tableName}.findAll`, { limit, offset, count: results.length });
      }
      return results;
    } catch (error) {
      this.logger?.error(`Error in ${this.tableName}.findAll`, { limit, offset, error });
      throw error;
    }
  }
  /**
   * Buscar por campo específico
   */
  async findByField(field: string, value: any, options?: QueryOptions): Promise<T[]> {
    this.validateFieldName(field);
    this.validateParams([value]);
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE ${field} = $1 AND deleted_at IS NULL
    `;
    try {
      const results = await this.db.query<T>(query, [value], options?.transaction);
      if (!options?.skipLog) {
        this.logger?.debug(`${this.tableName}.findByField`, { field, value, count: results.length });
      }
      return results;
    } catch (error) {
      this.logger?.error(`Error in ${this.tableName}.findByField`, { field, value, error });
      throw error;
    }
  }
  /**
   * Buscar uno por campo
   */
  async findOneByField(field: string, value: any, options?: QueryOptions): Promise<T | null> {
    const results = await this.findByField(field, value, options);
    return results.length > 0 ? results[0] : null;
  }
  /**
   * Crear nuevo registro
   */
  async create(data: Partial<T>, options?: QueryOptions): Promise<T> {
    // Generar ID si no existe
    if (!data.id) {
      data.id = uuidv4();
    }
    // Agregar timestamps
    const now = new Date();
    data.created_at = now;
    data.updated_at = now;
    const fields = Object.keys(data);
    const values = Object.values(data);
    
    // Filter out undefined values
    const filteredData: any = {};
    fields.forEach((field, index) => {
      if (values[index] !== undefined) {
        filteredData[field] = values[index];
      }
    });
    
    const finalFields = Object.keys(filteredData);
    const finalValues = Object.values(filteredData);
    const placeholders = finalFields.map((_, i) => `$${i + 1}`).join(', ');
    
    // Validate field names to prevent SQL injection
    this.validateFieldNames(finalFields);
    this.validateParams(finalValues);
    
    // Debug logging
    if (this.tableName === 'users') {
      this.logger?.debug(`Creating user record`, {
        fields: finalFields,
        valueTypes: finalValues.map(v => typeof v)
      });
    }
    
    const query = `
      INSERT INTO ${this.tableName} (${finalFields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    try {
      const results = await this.db.query<T>(query, finalValues, options?.transaction);
      // Invalidate cache
      this.invalidateCache();
      this.logger?.info(`Created in ${this.tableName}`, { id: filteredData.id });
      return results[0];
    } catch (error) {
      this.logger?.error(`Error creating in ${this.tableName}`, { 
        fields: finalFields,
        error 
      });
      throw error;
    }
  }
  /**
   * Actualizar registro
   */
  async update(id: string, data: Partial<T>, options?: QueryOptions): Promise<T | null> {
    this.validateParams([id]);
    // Remover campos que no deben actualizarse
    delete data.id;
    delete data.created_at;
    // Actualizar timestamp
    data.updated_at = new Date();
    const fields = Object.keys(data);
    if (fields.length === 0) {
      return this.findById(id, options);
    }
    // Validate field names to prevent SQL injection
    this.validateFieldNames(fields);
    const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
    const values = [id, ...Object.values(data)];
    this.validateParams(values);
    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;
    try {
      const results = await this.db.query<T>(query, values, options?.transaction);
      // Invalidate cache
      this.invalidateCache(id);
      this.logger?.info(`Updated in ${this.tableName}`, { id, fields: fields.length });
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      this.logger?.error(`Error updating in ${this.tableName}`, { id, data, error });
      throw error;
    }
  }
  /**
   * Delete (alias for softDelete - default behavior)
   */
  async delete(id: string, options?: QueryOptions): Promise<boolean> {
    return this.softDelete(id, options);
  }

  /**
   * Soft delete
   */
  async softDelete(id: string, options?: QueryOptions): Promise<boolean> {
    this.validateParams([id]);
    const query = `
      UPDATE ${this.tableName}
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `;
    try {
      const results = await this.db.query(query, [id], options?.transaction);
      const success = results.length > 0;
      if (success) {
        // Invalidate cache
        this.invalidateCache(id);
        this.logger?.info(`Soft deleted in ${this.tableName}`, { id });
      }
      return success;
    } catch (error) {
      this.logger?.error(`Error soft deleting in ${this.tableName}`, { id, error });
      throw error;
    }
  }
  /**
   * Hard delete (usar con precaución)
   */
  async hardDelete(id: string, options?: QueryOptions): Promise<boolean> {
    this.validateParams([id]);
    const query = `
      DELETE FROM ${this.tableName}
      WHERE id = $1
      RETURNING id
    `;
    try {
      const results = await this.db.query(query, [id], options?.transaction);
      const success = results.length > 0;
      if (success) {
        // Invalidate cache
        this.invalidateCache(id);
        this.logger?.warn(`Hard deleted in ${this.tableName}`, { id });
      }
      return success;
    } catch (error) {
      this.logger?.error(`Error hard deleting in ${this.tableName}`, { id, error });
      throw error;
    }
  }
  /**
   * Restaurar registro eliminado
   */
  async restore(id: string, options?: QueryOptions): Promise<boolean> {
    this.validateParams([id]);
    const query = `
      UPDATE ${this.tableName}
      SET deleted_at = NULL, updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NOT NULL
      RETURNING id
    `;
    try {
      const results = await this.db.query(query, [id], options?.transaction);
      const success = results.length > 0;
      if (success) {
        // Invalidate cache
        this.invalidateCache(id);
        this.logger?.info(`Restored in ${this.tableName}`, { id });
      }
      return success;
    } catch (error) {
      this.logger?.error(`Error restoring in ${this.tableName}`, { id, error });
      throw error;
    }
  }
  // ==================== OPERACIONES AVANZADAS ====================
  /**
   * Contar registros
   */
  async count(whereClause?: string, params?: any[], options?: QueryOptions): Promise<number> {
    if (params) {
      this.validateParams(params);
    }
    let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE deleted_at IS NULL`;
    if (whereClause) {
      // Validar que whereClause no contenga inyección SQL
      if (whereClause.includes(';') || whereClause.includes('--')) {
        throw new Error('Invalid WHERE clause');
      }
      query += ` AND ${whereClause}`;
    }
    try {
      const results = await this.db.query<{ count: string }>(
        query, 
        params || [], 
        options?.transaction
      );
      const count = parseInt(results[0].count, 10);
      if (!options?.skipLog) {
        this.logger?.debug(`${this.tableName}.count`, { whereClause, count });
      }
      return count;
    } catch (error) {
      this.logger?.error(`Error counting in ${this.tableName}`, { whereClause, error });
      throw error;
    }
  }
  /**
   * Verificar si existe
   */
  async exists(id: string, options?: QueryOptions): Promise<boolean> {
    this.validateParams([id]);
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM ${this.tableName}
        WHERE id = $1 AND deleted_at IS NULL
      ) as exists
    `;
    try {
      const results = await this.db.query<{ exists: boolean }>(
        query, 
        [id], 
        options?.transaction
      );
      return results[0].exists;
    } catch (error) {
      this.logger?.error(`Error checking existence in ${this.tableName}`, { id, error });
      throw error;
    }
  }
  /**
   * Crear múltiples registros (batch)
   */
  async batchCreate(items: Partial<T>[], options?: QueryOptions): Promise<T[]> {
    if (items.length === 0) return [];
    const now = new Date();
    const processedItems = items.map(item => ({
      ...item,
      id: item.id || uuidv4(),
      created_at: now,
      updated_at: now
    }));
    const fields = Object.keys(processedItems[0]);
    // Validate field names to prevent SQL injection
    this.validateFieldNames(fields);
    const values: any[] = [];
    const valueStrings: string[] = [];
    processedItems.forEach((item, index) => {
      const itemValues = fields.map(field => (item as any)[field]);
      values.push(...itemValues);
      const placeholders = fields.map((_, fieldIndex) => 
        `$${index * fields.length + fieldIndex + 1}`
      ).join(', ');
      valueStrings.push(`(${placeholders})`);
    });
    this.validateParams(values);
    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES ${valueStrings.join(', ')}
      RETURNING *
    `;
    try {
      const results = await this.db.query<T>(query, values, options?.transaction);
      // Invalidate cache
      this.clearCache();
      this.logger?.info(`Batch created in ${this.tableName}`, { count: items.length });
      return results;
    } catch (error) {
      this.logger?.error(`Error batch creating in ${this.tableName}`, { count: items.length, error });
      throw error;
    }
  }
  /**
   * Buscar con paginación y filtros
   */
  async findPaginated(options: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    where?: string;
    params?: any[];
  }, queryOptions?: QueryOptions): Promise<PaginationResult<T>> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'DESC';
    // Validar campo de ordenamiento
    this.validateFieldName(sortBy);
    let whereClause = 'deleted_at IS NULL';
    if (options.where) {
      // Validar WHERE clause
      if (options.where.includes(';') || options.where.includes('--')) {
        throw new Error('Invalid WHERE clause');
      }
      whereClause += ` AND ${options.where}`;
    }
    if (options.params) {
      this.validateParams(options.params);
    }
    try {
      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${whereClause}`;
      const countResult = await this.db.query<{ count: string }>(
        countQuery, 
        options.params || [], 
        queryOptions?.transaction
      );
      const total = parseInt(countResult[0].count, 10);
      // Get paginated data
      const dataQuery = `
        SELECT * FROM ${this.tableName}
        WHERE ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${(options.params?.length || 0) + 1} 
        OFFSET $${(options.params?.length || 0) + 2}
      `;
      const params = [...(options.params || []), limit, offset];
      const data = await this.db.query<T>(dataQuery, params, queryOptions?.transaction);
      const totalPages = Math.ceil(total / limit);
      this.logger?.debug(`${this.tableName}.findPaginated`, { 
        page, 
        limit, 
        total, 
        returned: data.length 
      });
      return {
        data,
        total,
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };
    } catch (error) {
      this.logger?.error(`Error in paginated find for ${this.tableName}`, { options, error });
      throw error;
    }
  }
  /**
   * Ejecutar query personalizada con validación
   */
  async executeQuery<R = any>(query: string, params: any[], options?: QueryOptions): Promise<R[]> {
    // Validación básica de seguridad
    if (query.toLowerCase().includes('drop') || query.toLowerCase().includes('truncate')) {
      throw new Error('Dangerous operation not allowed');
    }
    this.validateParams(params);
    try {
      const results = await this.db.query<R>(query, params, options?.transaction);
      if (!options?.skipLog) {
        this.logger?.debug(`Custom query on ${this.tableName}`, { 
          query: query.substring(0, 100), 
          paramCount: params.length 
        });
      }
      return results;
    } catch (error) {
      this.logger?.error(`Error executing custom query on ${this.tableName}`, { query, error });
      throw error;
    }
  }
  /**
   * Ejecutar en transacción
   */
  async transaction<R>(
    callback: (trx: any) => Promise<R>
  ): Promise<R> {
    return this.db.transaction(callback);
  }
}
