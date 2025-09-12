// UserCompanyRepository - Refactored from UserRepository
// Single Responsibility: Manage user-company relationships
import { injectable, inject } from 'inversify';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
export interface UserCompanyRelation {
  userId: string;
  companyId: string;
  roleId: string;
  role?: string;
  isDefault: boolean;
  status: 'active' | 'inactive' | 'pending';
  permissions?: string[];
  createdAt: Date;
  updatedAt: Date;
}
export interface CompanyWithRole {
  companyId: string;
  name: string;
  role: string;
  roleId: string;
  isDefault: boolean;
  status: string;
  joinedAt: Date;
}
export interface UserInCompany {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleId: string;
  joinedAt: Date;
  lastActiveAt?: Date;
}
export interface IUserCompanyRepository {
  // User's companies management
  getUserCompanies(userId: string): Promise<CompanyWithRole[]>;
  getDefaultCompany(userId: string): Promise<CompanyWithRole | null>;
  setDefaultCompany(userId: string, companyId: string): Promise<void>;
  // Company's users management
  getUsersInCompany(companyId: string, options?: {
    offset?: number;
    limit?: number;
    search?: string;
    roleId?: string;
    status?: string;
  }): Promise<UserInCompany[]>;
  countUsersInCompany(companyId: string, options?: {
    search?: string;
    roleId?: string;
    status?: string;
  }): Promise<number>;
  // Relationship management
  addUserToCompany(userId: string, companyId: string, roleId: string, options?: {
    isDefault?: boolean;
    permissions?: string[];
  }): Promise<void>;
  removeUserFromCompany(userId: string, companyId: string): Promise<void>;
  updateUserCompanyStatus(userId: string, companyId: string, status: 'active' | 'inactive' | 'pending'): Promise<void>;
  // Validation
  isUserInCompany(userId: string, companyId: string): Promise<boolean>;
  getUserCompanyRelation(userId: string, companyId: string): Promise<UserCompanyRelation | null>;
  // Role management in company context
  getUserRoleInCompany(userId: string, companyId: string): Promise<{ roleId: string; role: string } | null>;
  updateUserRoleInCompany(userId: string, companyId: string, newRoleId: string): Promise<void>;
}
@injectable()
export class UserCompanyRepository implements IUserCompanyRepository {
  private readonly tableName = 'user_companies';
  private readonly allowedFields: Set<string>;
  constructor(
    @inject(TYPES.SharedConnection) private readonly db: IDatabaseConnection,
    @inject(TYPES.Logger) private readonly logger?: Logger
  ) {
    // Define allowed fields for SQL injection prevention
    this.allowedFields = new Set([
      'id', 'user_id', 'company_id', 'role',
      'is_default', 'status', 'permissions',
      'created_at', 'updated_at'
    ]);
  }
  /**
   * Get all companies a user belongs to
   */
  async getUserCompanies(userId: string): Promise<CompanyWithRole[]> {
    try {
      const query = `
        SELECT 
          c.id as company_id,
          c.name,
          uc.role,
          COALESCE(ur.role_id::text, uc.role) as role_id,
          uc.is_default,
          uc.status,
          uc.created_at as joined_at
        FROM ${this.tableName} uc
        INNER JOIN companies c ON uc.company_id = c.id
        LEFT JOIN user_roles ur ON ur.user_id = uc.user_id AND ur.company_id = uc.company_id
        WHERE uc.user_id = $1 
          AND c.deleted_at IS NULL
        ORDER BY uc.is_default DESC, c.name ASC
      `;
      const result = await this.db.query<any>(query, [userId]);
      return result.map(row => ({
        companyId: row.company_id,
        name: row.name,
        role: row.role,
        roleId: row.role_id,
        isDefault: row.is_default,
        status: row.status,
        joinedAt: row.joined_at
      }));
    } catch (error) {
      this.logger?.error('Error getting user companies', { userId, error });
      throw error;
    }
  }
  /**
   * Get user's default company
   */
  async getDefaultCompany(userId: string): Promise<CompanyWithRole | null> {
    const query = `
      SELECT 
        c.id as company_id,
        c.name,
        uc.role,
        COALESCE(ur.role_id::text, uc.role) as role_id,
        uc.is_default,
        uc.status,
        uc.created_at as joined_at
      FROM ${this.tableName} uc
      INNER JOIN companies c ON uc.company_id = c.id
      LEFT JOIN user_roles ur ON ur.user_id = uc.user_id AND ur.company_id = uc.company_id
      WHERE uc.user_id = $1 
        AND uc.is_default = true
        AND c.deleted_at IS NULL
      LIMIT 1
    `;
    const result = await this.db.query<any>(query, [userId]);
    if (result.length === 0) {
      return null;
    }
    const row = result[0];
    return {
      companyId: row.company_id,
      name: row.name,
      role: row.role,
      roleId: row.role_id,
      isDefault: row.is_default,
      status: row.status,
      joinedAt: row.joined_at
    };
  }
  /**
   * Set user's default company
   */
  async setDefaultCompany(userId: string, companyId: string): Promise<void> {
    const connection = await this.db.getConnection();
    try {
      await connection.query('BEGIN');
      // Remove default flag from all user's companies
      await connection.query(
        `UPDATE ${this.tableName} 
         SET is_default = false, updated_at = NOW()
         WHERE user_id = $1 AND deleted_at IS NULL`,
        [userId]
      );
      // Set new default company
      await connection.query(
        `UPDATE ${this.tableName}
         SET is_default = true, updated_at = NOW()
         WHERE user_id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [userId, companyId]
      );
      await connection.query('COMMIT');
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }
  /**
   * Get all users in a company with filtering and pagination
   */
  async getUsersInCompany(companyId: string, options?: {
    offset?: number;
    limit?: number;
    search?: string;
    roleId?: string;
    status?: string;
  }): Promise<UserInCompany[]> {
    let query = `
      SELECT 
        u.id as user_id,
        u.email,
        u.first_name,
        u.last_name,
        uc.role,
        COALESCE(ur.role_id::text, uc.role) as role_id,
        uc.created_at as joined_at,
        u.last_login_at as last_active_at
      FROM ${this.tableName} uc
      INNER JOIN users u ON uc.user_id = u.id
      LEFT JOIN user_roles ur ON ur.user_id = uc.user_id AND ur.company_id = uc.company_id
      WHERE uc.company_id = $1
        AND u.deleted_at IS NULL
    `;
    const params: any[] = [companyId];
    let paramCount = 2;
    // Add status filter
    if (options?.status) {
      query += ` AND uc.status = $${paramCount}`;
      params.push(options.status);
      paramCount++;
    } else {
      query += ` AND uc.status = 'active'`;
    }
    // Add search filter
    if (options?.search) {
      query += ` AND (
        LOWER(u.email) LIKE $${paramCount} OR 
        LOWER(u.first_name) LIKE $${paramCount} OR 
        LOWER(u.last_name) LIKE $${paramCount}
      )`;
      params.push(`%${options.search.toLowerCase()}%`);
      paramCount++;
    }
    // Add role filter
    if (options?.roleId) {
      query += ` AND (ur.role_id::text = $${paramCount} OR uc.role = $${paramCount})`;
      params.push(options.roleId);
      paramCount++;
    }
    query += ` ORDER BY uc.created_at DESC`;
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
    const result = await this.db.query<any>(query, params);
    return result.map(row => ({
      userId: row.user_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      roleId: row.role_id,
      joinedAt: row.joined_at,
      lastActiveAt: row.last_active_at
    }));
  }
  /**
   * Count users in a company with filters
   */
  async countUsersInCompany(companyId: string, options?: {
    search?: string;
    roleId?: string;
    status?: string;
  }): Promise<number> {
    let query = `
      SELECT COUNT(DISTINCT uc.user_id) as count
      FROM ${this.tableName} uc
      INNER JOIN users u ON uc.user_id = u.id
      LEFT JOIN user_roles ur ON ur.user_id = uc.user_id AND ur.company_id = uc.company_id
      WHERE uc.company_id = $1
        AND u.deleted_at IS NULL
    `;
    const params: any[] = [companyId];
    let paramCount = 2;
    // Add status filter
    if (options?.status) {
      query += ` AND uc.status = $${paramCount}`;
      params.push(options.status);
      paramCount++;
    } else {
      query += ` AND uc.status = 'active'`;
    }
    // Add search filter
    if (options?.search) {
      query += ` AND (
        LOWER(u.email) LIKE $${paramCount} OR 
        LOWER(u.first_name) LIKE $${paramCount} OR 
        LOWER(u.last_name) LIKE $${paramCount}
      )`;
      params.push(`%${options.search.toLowerCase()}%`);
      paramCount++;
    }
    // Add role filter
    if (options?.roleId) {
      query += ` AND (ur.role_id::text = $${paramCount} OR uc.role = $${paramCount})`;
      params.push(options.roleId);
      paramCount++;
    }
    const result = await this.db.query<{ count: string }>(query, params);
    return parseInt(result[0]?.count || '0', 10);
  }
  /**
   * Add a user to a company with a specific role
   */
  async addUserToCompany(userId: string, companyId: string, roleId: string, options?: {
    isDefault?: boolean;
    permissions?: string[];
  }): Promise<void> {
    const connection = await this.db.getConnection();
    try {
      await connection.query('BEGIN');
      
      // Insert or update user_companies
      const ucQuery = `
        INSERT INTO ${this.tableName} (
          id, user_id, company_id, role, 
          is_default, status, permissions, 
          created_at, updated_at
        ) 
        SELECT 
          gen_random_uuid(), $1, $2, r.name,
          $3, 'active', $4,
          NOW(), NOW()
        FROM roles r
        WHERE r.id = $5
        ON CONFLICT (user_id, company_id) 
        DO UPDATE SET 
          role = EXCLUDED.role,
          permissions = EXCLUDED.permissions,
          status = 'active',
          updated_at = NOW()
      `;
      await connection.query(ucQuery, [
        userId,
        companyId,
        options?.isDefault || false,
        options?.permissions || [],
        roleId
      ]);
      
      // Insert or update user_roles
      const urQuery = `
        INSERT INTO user_roles (
          user_id, company_id, role_id, 
          created_at, updated_at
        ) VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (user_id, company_id) 
        DO UPDATE SET 
          role_id = EXCLUDED.role_id,
          updated_at = NOW()
      `;
      await connection.query(urQuery, [userId, companyId, roleId]);
      
      await connection.query('COMMIT');
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }
  /**
   * Remove a user from a company (soft delete)
   */
  async removeUserFromCompany(userId: string, companyId: string): Promise<void> {
    const connection = await this.db.getConnection();
    try {
      await connection.query('BEGIN');
      
      // Soft delete from user_companies
      const ucQuery = `
        UPDATE ${this.tableName}
        SET status = 'inactive',
            updated_at = NOW()
        WHERE user_id = $1 
          AND company_id = $2 
               `;
      await connection.query(ucQuery, [userId, companyId]);
      
      // Delete from user_roles
      const urQuery = `
        DELETE FROM user_roles
        WHERE user_id = $1 AND company_id = $2
      `;
      await connection.query(urQuery, [userId, companyId]);
      
      await connection.query('COMMIT');
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }
  /**
   * Update user's status in a company
   */
  async updateUserCompanyStatus(
    userId: string, 
    companyId: string, 
    status: 'active' | 'inactive' | 'pending'
  ): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET status = $3, updated_at = NOW()
      WHERE user_id = $1 
        AND company_id = $2 
           `;
    await this.db.query(query, [userId, companyId, status]);
  }
  /**
   * Check if a user belongs to a company
   */
  async isUserInCompany(userId: string, companyId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM ${this.tableName}
        WHERE user_id = $1 
          AND company_id = $2 
          AND status = 'active'
               ) as exists
    `;
    const result = await this.db.query<{ exists: boolean }>(query, [userId, companyId]);
    return result[0].exists;
  }
  /**
   * Get the full relationship details between a user and company
   */
  async getUserCompanyRelation(userId: string, companyId: string): Promise<UserCompanyRelation | null> {
    const query = `
      SELECT 
        uc.user_id,
        uc.company_id,
        COALESCE(ur.role_id::text, uc.role) as role_id,
        uc.role,
        uc.is_default,
        uc.status,
        uc.permissions,
        uc.created_at,
        uc.updated_at
      FROM ${this.tableName} uc
      LEFT JOIN user_roles ur ON ur.user_id = uc.user_id AND ur.company_id = uc.company_id
      WHERE uc.user_id = $1 
        AND uc.company_id = $2 
    `;
    const result = await this.db.query<any>(query, [userId, companyId]);
    if (result.length === 0) {
      return null;
    }
    const row = result[0];
    return {
      userId: row.user_id,
      companyId: row.company_id,
      roleId: row.role_id,
      role: row.role,
      isDefault: row.is_default,
      status: row.status,
      permissions: row.permissions,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  /**
   * Get user's role in a specific company
   */
  async getUserRoleInCompany(userId: string, companyId: string): Promise<{ roleId: string; role: string } | null> {
    const query = `
      SELECT 
        COALESCE(ur.role_id::text, uc.role) as role_id,
        uc.role
      FROM ${this.tableName} uc
      LEFT JOIN user_roles ur ON ur.user_id = uc.user_id AND ur.company_id = uc.company_id
      WHERE uc.user_id = $1 
        AND uc.company_id = $2 
        AND uc.status = 'active'
    `;
    const result = await this.db.query<{ role_id: string; role: string }>(query, [userId, companyId]);
    if (result.length === 0) {
      return null;
    }
    return {
      roleId: result[0].role_id,
      role: result[0].role
    };
  }
  /**
   * Update user's role in a company
   */
  async updateUserRoleInCompany(userId: string, companyId: string, newRoleId: string): Promise<void> {
    const connection = await this.db.getConnection();
    try {
      await connection.query('BEGIN');
      
      // Update user_companies
      const ucQuery = `
        UPDATE ${this.tableName} uc
        SET 
          role = (SELECT name FROM roles WHERE id = $3),
          updated_at = NOW()
        WHERE uc.user_id = $1 
          AND uc.company_id = $2 
      `;
      await connection.query(ucQuery, [userId, companyId, newRoleId]);
      
      // Update or insert user_roles
      const urQuery = `
        INSERT INTO user_roles (
          user_id, company_id, role_id, 
          created_at, updated_at
        ) VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (user_id, company_id) 
        DO UPDATE SET 
          role_id = EXCLUDED.role_id,
          updated_at = NOW()
      `;
      await connection.query(urQuery, [userId, companyId, newRoleId]);
      
      await connection.query('COMMIT');
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }
}