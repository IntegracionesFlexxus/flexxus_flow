/**
 * CRM Base Repository Pattern - PostgreSQL
 * Extendido de BaseRepository para manejar:
 * - IDs numéricos (SERIAL) en lugar de UUIDs
 * - Schema 'crm' en todas las queries
 * - Multi-tenancy con company_id
 */

import { injectable, unmanaged, inject, optional } from 'inversify';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';

export interface CRMBaseEntity {
  id?: number; // Optional para inserciones (SERIAL lo genera)
  company_id: number;
  created_at?: Date;
  updated_at?: Date;
  created_by?: number;
  updated_by?: number;
}

export interface CRMQueryOptions {
  transaction?: any;
  skipLog?: boolean;
  includeDeleted?: boolean;
}

export interface CRMPaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

@injectable()
export abstract class CRMBaseRepository<T extends CRMBaseEntity> {
  protected tableName: string;
  protected schema: string = 'public';
  protected db: IDatabaseConnection;
  protected logger?: Logger;
  protected cache: Map<string, { data: any; expiry: number }> = new Map();
  protected readonly cacheTTL = 300000; // 5 minutes

  // Whitelist of allowed fields for each table (override in child classes)
  protected allowedFields: Set<string> = new Set([
    'id', 'company_id', 'created_at', 'updated_at', 'created_by', 'updated_by'
  ]);

  constructor(
    @unmanaged() tableName: string,
    @unmanaged() db: IDatabaseConnection,
    @inject(TYPES.Logger) @optional() logger?: Logger
  ) {
    this.tableName = tableName;
    this.db = db;
    this.logger = logger;
    
    this.logger?.debug(`${this.constructor.name} initialized`, {
      table: `${this.schema}.${tableName}`
    });
  }

  /**
   * Get full table name with schema
   */
  protected getFullTableName(): string {
    return `${this.schema}.${this.tableName}`;
  }

  /**
   * Find by ID - returns single record
   */
  async findById(id: number, companyId: string, options?: CRMQueryOptions): Promise<T | null> {
    const cacheKey = `${this.tableName}:${id}:${companyId}`;
    
    // Check cache
    const cached = this.getCached(cacheKey);
    if (cached && !options?.skipLog) {
      return cached;
    }

    const query = `
      SELECT * FROM ${this.getFullTableName()}
      WHERE id = $1 AND company_id = $2
    `;

    try {
      const result = await this.db.query(query, [id, companyId]);
      
      if (result.rows[0]) {
        this.setCached(cacheKey, result.rows[0]);
        return result.rows[0] as T;
      }
      
      return null;
    } catch (error) {
      this.logger?.error(`Error finding ${this.tableName} by id`, { error, id, companyId });
      throw error;
    }
  }

  /**
   * Find all records for a company
   */
  async findAll(companyId: string, options?: CRMQueryOptions): Promise<T[]> {
    const query = `
      SELECT * FROM ${this.getFullTableName()}
      WHERE company_id = $1
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.db.query(query, [companyId]);
      return result.rows as T[];
    } catch (error) {
      this.logger?.error(`Error finding all ${this.tableName}`, { error, companyId });
      throw error;
    }
  }

  /**
   * Create new record - NO ID generation (PostgreSQL SERIAL handles it)
   */
  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>, userId?: number | string): Promise<T> {
    const fields = Object.keys(data).filter(key => this.allowedFields.has(key));
    const values = fields.map(key => (data as any)[key]);

    // Add audit fields only if userId is a number
    if (userId && typeof userId === 'number') {
      fields.push('created_by', 'updated_by');
      values.push(userId, userId);
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const fieldList = fields.join(', ');

    const query = `
      INSERT INTO ${this.getFullTableName()} (${fieldList})
      VALUES (${placeholders})
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, values);
      const created = result.rows[0] as T;

      // Clear cache for this company
      this.clearCompanyCache(String(created.company_id));

      this.logger?.info(`Created ${this.tableName}`, { id: created.id, companyId: created.company_id });
      return created;
    } catch (error) {
      this.logger?.error(`Error creating ${this.tableName}`, { error, data });
      throw error;
    }
  }

  /**
   * Update existing record
   */
  async update(
    id: number,
    companyId: string,
    data: Partial<Omit<T, 'id' | 'company_id' | 'created_at' | 'created_by'>>,
    userId?: number | string
  ): Promise<T | null> {
    const fields = Object.keys(data).filter(key => this.allowedFields.has(key));
    const values = fields.map(key => (data as any)[key]);

    // Add updated_by only if userId is a number
    if (userId && typeof userId === 'number') {
      fields.push('updated_by');
      values.push(userId);
    }
    
    // Always update updated_at
    fields.push('updated_at');
    values.push(new Date());

    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    values.push(id, companyId); // Add WHERE parameters

    const query = `
      UPDATE ${this.getFullTableName()}
      SET ${setClause}
      WHERE id = $${values.length - 1} AND company_id = $${values.length}
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, values);
      
      if (result.rows[0]) {
        const updated = result.rows[0] as T;
        
        // Clear cache
        this.clearCached(`${this.tableName}:${id}:${companyId}`);
        this.clearCompanyCache(companyId);
        
        this.logger?.info(`Updated ${this.tableName}`, { id, companyId });
        return updated;
      }
      
      return null;
    } catch (error) {
      this.logger?.error(`Error updating ${this.tableName}`, { error, id, companyId });
      throw error;
    }
  }

  /**
   * Soft delete record
   */
  async delete(id: number, companyId: string, userId?: number | string): Promise<boolean> {
    const query = `
      DELETE FROM ${this.getFullTableName()}
      WHERE id = $1 AND company_id = $2
      RETURNING id
    `;

    try {
      const result = await this.db.query(query, [id, companyId]);
      
      if (result.rows.length > 0) {
        // Clear cache
        this.clearCached(`${this.tableName}:${id}:${companyId}`);
        this.clearCompanyCache(companyId);
        
        this.logger?.info(`Deleted ${this.tableName}`, { id, companyId });
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger?.error(`Error deleting ${this.tableName}`, { error, id, companyId });
      throw error;
    }
  }

  /**
   * Find with pagination
   */
  async findPaginated(
    companyId: string,
    page: number = 1,
    limit: number = 10,
    filters?: any,
    orderBy?: string
  ): Promise<CRMPaginationResult<T>> {
    const offset = (page - 1) * limit;
    const order = orderBy || 'created_at DESC';

    // Build WHERE clause
    const whereConditions = ['company_id = $1'];
    const params: any[] = [companyId];
    let paramIndex = 2;

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (this.allowedFields.has(key) && value !== undefined && value !== null) {
          whereConditions.push(`${key} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      });
    }

    const whereClause = whereConditions.join(' AND ');

    // Count total records
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ${this.getFullTableName()}
      WHERE ${whereClause}
    `;

    // Get paginated data
    const limitParamIndex = paramIndex;
    const offsetParamIndex = paramIndex + 1;
    params.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM ${this.getFullTableName()}
      WHERE ${whereClause}
      ORDER BY ${order}
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    try {
      const [countResult, dataResult] = await Promise.all([
        this.db.query(countQuery, params.slice(0, -2)),
        this.db.query(dataQuery, params)
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      return {
        data: dataResult.rows as T[],
        total,
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };
    } catch (error) {
      this.logger?.error(`Error in paginated query for ${this.tableName}`, { error });
      throw error;
    }
  }

  /**
   * Execute custom query
   */
  async query(sql: string, params: any[] = []): Promise<any> {
    try {
      const result = await this.db.query(sql, params);
      return result.rows;
    } catch (error) {
      this.logger?.error('Error executing custom query', { error, sql });
      throw error;
    }
  }

  /**
   * Get database client for transactions
   */
  async getClient(): Promise<any> {
    return this.db.getClient();
  }

  // Cache management
  protected getCached(key: string): any {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  protected setCached(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.cacheTTL
    });
  }

  protected clearCached(key: string): void {
    this.cache.delete(key);
  }

  protected clearCompanyCache(companyId: string): void {
    // Clear all cache entries for this company
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(`:${companyId}`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}