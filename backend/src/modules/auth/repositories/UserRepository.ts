// UserRepository - Refactored following SRP
// Single Responsibility: Basic user CRUD operations
import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/shared/database/repositories/BaseRepository';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { IUserRepository } from '@/shared/interfaces/repositories/IUserRepository';
import { User } from '@/modules/auth/types/auth.types';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
export interface CreateUserDto {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
}
export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  status?: 'active' | 'inactive' | 'suspended';
}
/**
 * UserRepository - Handles only basic user CRUD operations
 * Follows Single Responsibility Principle
 */
@injectable()
export class UserRepository extends BaseRepository<User> implements IUserRepository {
  constructor(
    @inject(TYPES.SharedConnection) db: IDatabaseConnection,
    @inject(TYPES.Logger) logger?: Logger
  ) {
    super('users', db, logger);
    // Define allowed fields for users table
    this.allowedFields = new Set([
      'id', 'email', 'password_hash', 'first_name', 'last_name',
      'avatar', 'phone', 'status', 'email_verified_at',
      'last_login_at', 'created_at', 'updated_at', 'deleted_at'
    ]);
  }
  /**
   * Find user by email address
   */
  async findByEmail(email: string): Promise<User | null> {
    return await this.findOneByField('email', email.toLowerCase());
  }
  /**
   * Check if user exists by email
   */
  async exists(email: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM ${this.tableName}
        WHERE email = $1 AND deleted_at IS NULL
      ) as exists
    `;
    const results = await this.db.query<{ exists: boolean }>(query, [email.toLowerCase()]);
    return results[0].exists;
  }
  /**
   * Create a new user
   * @override to handle email normalization
   */
  async create(data: CreateUserDto): Promise<User> {
    const userData = {
      ...data,
      email: data.email.toLowerCase(),
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    };
    return super.create(userData as Partial<User>);
  }
  /**
   * Update user information
   */
  async update(id: string, data: UpdateUserDto): Promise<User | null> {
    const updateData = {
      ...data,
      updated_at: new Date()
    };
    return super.update(id, updateData as Partial<User>);
  }
  /**
   * Update user status
   */
  async updateStatus(userId: string, status: 'active' | 'inactive' | 'suspended'): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET status = $2, updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
    `;
    await this.db.query(query, [userId, status]);
  }
  /**
   * Soft delete user
   * @override to use soft delete
   */
  async delete(id: string): Promise<boolean> {
    return await this.softDelete(id);
  }
  /**
   * Count total users with optional filters
   */
  async count(filters?: {
    status?: string;
    emailVerified?: boolean;
  }): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE deleted_at IS NULL`;
    const params: any[] = [];
    let paramCount = 1;
    if (filters?.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }
    if (filters?.emailVerified !== undefined) {
      if (filters.emailVerified) {
        query += ` AND email_verified_at IS NOT NULL`;
      } else {
        query += ` AND email_verified_at IS NULL`;
      }
    }
    const results = await this.db.query<{ count: string }>(query, params);
    return parseInt(results[0].count, 10);
  }
  /**
   * Get users with pagination
   */
  async findAll(options?: {
    offset?: number;
    limit?: number;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
  }): Promise<User[]> {
    let query = `
      SELECT * FROM ${this.tableName}
      WHERE deleted_at IS NULL
    `;
    // Add ordering
    const orderBy = options?.orderBy || 'created_at';
    const orderDirection = options?.orderDirection || 'DESC';
    if (this.allowedFields.has(orderBy)) {
      query += ` ORDER BY ${orderBy} ${orderDirection}`;
    } else {
      query += ` ORDER BY created_at DESC`;
    }
    const params: any[] = [];
    let paramCount = 1;
    // Add pagination
    if (options?.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(options.limit);
      paramCount++;
    }
    if (options?.offset) {
      query += ` OFFSET $${paramCount}`;
      params.push(options.offset);
    }
    return await this.db.query<User>(query, params);
  }
  /**
   * Search users by name or email
   */
  async search(searchTerm: string, limit: number = 10): Promise<User[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE deleted_at IS NULL
        AND (
          LOWER(email) LIKE $1 OR
          LOWER(first_name) LIKE $1 OR
          LOWER(last_name) LIKE $1 OR
          LOWER(CONCAT(first_name, ' ', last_name)) LIKE $1
        )
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const searchPattern = `%${searchTerm.toLowerCase()}%`;
    return await this.db.query<User>(query, [searchPattern, limit]);
  }
  /**
   * Get recently active users
   */
  async getRecentlyActive(limit: number = 10): Promise<User[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE deleted_at IS NULL
        AND last_login_at IS NOT NULL
      ORDER BY last_login_at DESC
      LIMIT $1
    `;
    return await this.db.query<User>(query, [limit]);
  }
  /**
   * Get users created in a date range
   */
  async getCreatedBetween(startDate: Date, endDate: Date): Promise<User[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE deleted_at IS NULL
        AND created_at >= $1
        AND created_at <= $2
      ORDER BY created_at DESC
    `;
    return await this.db.query<User>(query, [startDate, endDate]);
  }
}
