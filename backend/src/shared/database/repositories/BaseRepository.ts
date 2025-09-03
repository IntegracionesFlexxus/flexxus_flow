// Base Repository Pattern - Sprint 1
// Implementación base para operaciones CRUD comunes

import { injectable, unmanaged } from 'inversify';
import { IDatabaseConnection } from '../interfaces/IDatabaseConnection';
import { v4 as uuidv4 } from 'uuid';

export interface BaseEntity {
  id: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

@injectable()
export abstract class BaseRepository<T extends BaseEntity> {
  protected tableName: string;
  protected db: IDatabaseConnection;

  constructor(
    @unmanaged() tableName: string,
    @unmanaged() db: IDatabaseConnection
  ) {
    this.tableName = tableName;
    this.db = db;
  }

  // Find by ID
  async findById(id: string): Promise<T | null> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const results = await this.db.query<T>(query, [id]);
    return results.length > 0 ? results[0] : null;
  }

  // Find all (con paginación básica)
  async findAll(limit: number = 100, offset: number = 0): Promise<T[]> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE deleted_at IS NULL 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    return await this.db.query<T>(query, [limit, offset]);
  }

  // Find by field
  async findByField(field: string, value: any): Promise<T[]> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE ${field} = $1 AND deleted_at IS NULL
    `;
    return await this.db.query<T>(query, [value]);
  }

  // Find one by field
  async findOneByField(field: string, value: any): Promise<T | null> {
    const results = await this.findByField(field, value);
    return results.length > 0 ? results[0] : null;
  }

  // Create
  async create(data: Partial<T>): Promise<T> {
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
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const results = await this.db.query<T>(query, values);
    return results[0];
  }

  // Update
  async update(id: string, data: Partial<T>): Promise<T | null> {
    // Remover campos que no deben actualizarse
    delete data.id;
    delete data.created_at;
    
    // Actualizar timestamp
    data.updated_at = new Date();

    const fields = Object.keys(data);
    if (fields.length === 0) {
      return this.findById(id);
    }

    const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
    const values = [id, ...Object.values(data)];

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;

    const results = await this.db.query<T>(query, values);
    return results.length > 0 ? results[0] : null;
  }

  // Soft delete
  async softDelete(id: string): Promise<boolean> {
    const query = `
      UPDATE ${this.tableName}
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `;

    const results = await this.db.query(query, [id]);
    return results.length > 0;
  }

  // Hard delete (usar con precaución)
  async hardDelete(id: string): Promise<boolean> {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE id = $1
      RETURNING id
    `;

    const results = await this.db.query(query, [id]);
    return results.length > 0;
  }

  // Count
  async count(whereClause?: string, params?: any[]): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE deleted_at IS NULL`;
    
    if (whereClause) {
      query += ` AND ${whereClause}`;
    }

    const results = await this.db.query<{ count: string }>(query, params);
    return parseInt(results[0].count, 10);
  }

  // Exists
  async exists(id: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM ${this.tableName}
        WHERE id = $1 AND deleted_at IS NULL
      ) as exists
    `;

    const results = await this.db.query<{ exists: boolean }>(query, [id]);
    return results[0].exists;
  }

  // Batch create (para seeding o importaciones)
  async batchCreate(items: Partial<T>[]): Promise<T[]> {
    if (items.length === 0) return [];

    const now = new Date();
    const processedItems = items.map(item => ({
      ...item,
      id: item.id || uuidv4(),
      created_at: now,
      updated_at: now
    }));

    const fields = Object.keys(processedItems[0]);
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

    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES ${valueStrings.join(', ')}
      RETURNING *
    `;

    return await this.db.query<T>(query, values);
  }

  // Find with pagination and sorting
  async findPaginated(options: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    where?: string;
    params?: any[];
  }): Promise<{ data: T[]; total: number; page: number; totalPages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'DESC';

    let whereClause = 'deleted_at IS NULL';
    if (options.where) {
      whereClause += ` AND ${options.where}`;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${whereClause}`;
    const countResult = await this.db.query<{ count: string }>(countQuery, options.params);
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
    const data = await this.db.query<T>(dataQuery, params);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
}