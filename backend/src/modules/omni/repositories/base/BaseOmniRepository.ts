/**
 * BaseOmniRepository - Sprint 05
 * Base repository for all Omni module repositories with multi-tenancy support
 */

import { Pool, QueryResult } from 'pg';
import { injectable } from 'inversify';
import { dbPools } from '@/shared/database';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface BaseEntity {
  id: string;
  company_id: string;
  created_at: Date;
  updated_at: Date;
}

@injectable()
export abstract class BaseOmniRepository<T extends BaseEntity> {
  protected pool: Pool;
  protected logger: any;
  protected abstract tableName: string;

  constructor() {
    this.pool = dbPools.omni;
    this.logger = LoggerFactory.create({
      file: __filename,
      context: this.constructor.name
    });
  }

  /**
   * Execute a query with automatic company_id filtering
   */
  protected async executeQuery(
    query: string,
    params: any[] = [],
    companyId?: string
  ): Promise<QueryResult> {
    try {
      // Company_id filtering is done in the SQL queries themselves
      const result = await this.pool.query(query, params);
      this.logger.debug(`Query executed: ${query.substring(0, 100)}...`, {
        rowCount: result.rowCount
      });
      return result;
    } catch (error) {
      this.logger.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Get all records for a company with optional filters
   */
  async findAll(
    companyId: string,
    filters: Record<string, any> = {},
    options: QueryOptions = {}
  ): Promise<T[]> {
    const conditions = ['company_id = $1'];
    const params = [companyId];
    let paramCount = 1;

    // Build filter conditions
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        paramCount++;
        conditions.push(`${key} = $${paramCount}`);
        params.push(value);
      }
    });

    // Build query
    let query = `
      SELECT * FROM ${this.tableName}
      WHERE ${conditions.join(' AND ')}
    `;

    // Add ordering
    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'ASC'}`;
    } else {
      query += ' ORDER BY created_at DESC';
    }

    // Add pagination
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }

    const result = await this.executeQuery(query, params, companyId);
    return result.rows as T[];
  }

  /**
   * Find a single record by ID with company validation
   */
  async findById(id: string, companyId: string): Promise<T | null> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE id = $1 AND company_id = $2
    `;

    const result = await this.executeQuery(query, [id, companyId], companyId);
    return result.rows[0] as T || null;
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>, companyId: string): Promise<T> {
    const entries = Object.entries(data || {}).filter(([key, value]) => key !== 'company_id' && value !== undefined);
    const fields = entries.map(([key]) => key);
    const values = entries.map(([, value]) => value);

    const columns = ['company_id', ...fields];
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.executeQuery(query, [companyId, ...values], companyId);
    this.logger.info(`Created ${this.tableName} record`, { id: result.rows[0].id });
    return result.rows[0] as T;
  }

  /**
   * Update a record
   */
  async update(id: string, data: Partial<T>, companyId: string): Promise<T | null> {
    const fields = Object.keys(data);
    const values = Object.values(data);

    if (fields.length === 0) {
      return this.findById(id, companyId);
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 3}`).join(', ');

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND company_id = $2
      RETURNING *
    `;

    const result = await this.executeQuery(query, [id, companyId, ...values], companyId);

    if (result.rowCount === 0) {
      this.logger.warn(`Update failed: ${this.tableName} not found`, { id, companyId });
      return null;
    }

    this.logger.info(`Updated ${this.tableName} record`, { id });
    return result.rows[0] as T;
  }

  /**
   * Delete a record (soft or hard delete based on table structure)
   */
  async delete(id: string, companyId: string): Promise<boolean> {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE id = $1 AND company_id = $2
    `;

    const result = await this.executeQuery(query, [id, companyId], companyId);

    if (result.rowCount === 0) {
      this.logger.warn(`Delete failed: ${this.tableName} not found`, { id, companyId });
      return false;
    }

    this.logger.info(`Deleted ${this.tableName} record`, { id });
    return true;
  }

  /**
   * Count records with optional filters
   */
  async count(companyId: string, filters: Record<string, any> = {}): Promise<number> {
    const conditions = ['company_id = $1'];
    const params = [companyId];
    let paramCount = 1;

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        paramCount++;
        conditions.push(`${key} = $${paramCount}`);
        params.push(value);
      }
    });

    const query = `
      SELECT COUNT(*) as count FROM ${this.tableName}
      WHERE ${conditions.join(' AND ')}
    `;

    const result = await this.executeQuery(query, params, companyId);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Check if a record exists
   */
  async exists(id: string, companyId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM ${this.tableName}
        WHERE id = $1 AND company_id = $2
      ) as exists
    `;

    const result = await this.executeQuery(query, [id, companyId], companyId);
    return result.rows[0].exists;
  }

  /**
   * Execute a raw query (use with caution - ensure company_id filtering)
   */
  async rawQuery(query: string, params: any[], companyId: string): Promise<any[]> {
    const result = await this.executeQuery(query, params, companyId);
    return result.rows;
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<any> {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return client;
  }

  /**
   * Commit a transaction
   */
  async commitTransaction(client: any): Promise<void> {
    await client.query('COMMIT');
    client.release();
  }

  /**
   * Rollback a transaction
   */
  async rollbackTransaction(client: any): Promise<void> {
    await client.query('ROLLBACK');
    client.release();
  }
}
