// UserCompanyRepository - Refactored from UserRepository
// Single Responsibility: Manage user-company relationships
import { injectable, inject } from 'inversify';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
export interface IUserCompanyRelation {
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
export interface ICompanyWithRole {
  companyId: string;
  name: string;
  role: string;
  roleId: string;
  isDefault: boolean;
  status: string;
  joinedAt: Date;
}
export interface IUserInCompany {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  emailVerified: boolean;
  role: string;
  roleId: string;
  joinedAt: Date;
  lastActiveAt?: Date;
}
export interface IUserCompanyRepository {
  // User's companies management
  getUserCompanies(userId: string): Promise<ICompanyWithRole[]>;
  getDefaultCompany(userId: string): Promise<ICompanyWithRole | null>;
  setDefaultCompany(userId: string, companyId: string): Promise<void>;
  // Company's users management
  getUsersInCompany(companyId: string, options?: {
    offset?: number;
    limit?: number;
    search?: string;
    roleId?: string;
    status?: string;
  }): Promise<IUserInCompany[]>;
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
  getUserCompanyRelation(userId: string, companyId: string): Promise<IUserCompanyRelation | null>;
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
  async getUserCompanies(userId: string): Promise<ICompanyWithRole[]> {
    try {
      const query = `
        SELECT
          c.id as company_id,
          c.name,
          COALESCE(r.code, uc.role) as role,
          COALESCE(ur.role_id::text, uc.role) as role_id,
          uc.is_default,
          uc.status,
          uc.created_at as joined_at
        FROM ${this.tableName} uc
        INNER JOIN companies c ON uc.company_id = c.id
        LEFT JOIN user_roles ur ON ur.user_id = uc.user_id AND ur.company_id = uc.company_id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE uc.user_id = $1
          AND c.deleted_at IS NULL
        ORDER BY uc.is_default DESC, c.name ASC
      `;
      const result = await this.db.query<any>(query, [userId]);
      return result.rows.map(row => ({
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
  async getDefaultCompany(userId: string): Promise<ICompanyWithRole | null> {
    const query = `
      SELECT
        c.id as company_id,
        c.name,
        COALESCE(r.code, uc.role) as role,
        COALESCE(ur.role_id::text, uc.role) as role_id,
        uc.is_default,
        uc.status,
        uc.created_at as joined_at
      FROM ${this.tableName} uc
      INNER JOIN companies c ON uc.company_id = c.id
      LEFT JOIN user_roles ur ON ur.user_id = uc.user_id AND ur.company_id = uc.company_id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE uc.user_id = $1
        AND uc.is_default = true
        AND c.deleted_at IS NULL
      LIMIT 1
    `;
    const result = await this.db.query<any>(query, [userId]);
    if (result.rows.length === 0) {
      return null;
    }
    const row = result.rows[0];
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
    await this.db.transaction(async (trx) => {
      // Remove default flag from all user's companies
      await trx.query(
        `UPDATE ${this.tableName} 
         SET is_default = false, updated_at = NOW()
         WHERE user_id = $1 AND deleted_at IS NULL`,
        [userId]
      );
      // Set new default company
      await trx.query(
        `UPDATE ${this.tableName}
         SET is_default = true, updated_at = NOW()
         WHERE user_id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [userId, companyId]
      );
    });
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
  }): Promise<IUserInCompany[]> {
    interface IUserQueryResult {
      user_id: string;
      email: string;
      first_name: string;
      last_name: string;
      phone?: string;
      avatar?: string;
      status: string;
      email_verified_at?: Date;
      role: string;
      role_id: string;
      joined_at: Date;
      last_active_at?: Date;
    }
    let query = `
      SELECT
        u.id as user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.avatar,
        u.status,
        u.email_verified_at,
        COALESCE(r.code, uc.role) as role,
        COALESCE(ur.role_id::text, uc.role) as role_id,
        uc.created_at as joined_at,
        u.last_login_at as last_active_at
      FROM ${this.tableName} uc
      INNER JOIN users u ON uc.user_id = u.id
      LEFT JOIN user_roles ur ON ur.user_id = uc.user_id AND ur.company_id = uc.company_id
      LEFT JOIN roles r ON r.id = ur.role_id
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
    const result = await this.db.query<IUserQueryResult>(query, params);
    return result.rows.map(row => ({
      userId: row.user_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      avatar: row.avatar,
      status: row.status,
      emailVerified: !!row.email_verified_at,
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
    return parseInt(result.rows[0]?.count || '0', 10);
  }
  /**
   * Add a user to a company with a specific role
   */
  async addUserToCompany(userId: string, companyId: string, roleIdOrName: string, options?: {
    isDefault?: boolean;
    permissions?: string[];
  }): Promise<void> {
    await this.db.transaction(async (trx) => {
      // First, determine if we have a role ID (UUID) or role name
      let roleId: string;
      let roleName: string;
      
      // Check if it's a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUUID = uuidRegex.test(roleIdOrName);
      
      if (isUUID) {
        // It's a UUID, get the role name
        const roleQuery = `SELECT id, name FROM roles WHERE id = $1`;
        const roleResult = await trx.query(roleQuery, [roleIdOrName]);

        // Handle both possible result structures (rows array or full result object)
        const rows = roleResult.rows || roleResult;

        if (!rows || rows.length === 0) {
          throw new Error(`Role with ID ${roleIdOrName} not found`);
        }
        roleId = rows[0].id;
        roleName = rows[0].name;
      } else {
        // It's a role name, get or create the role ID
        const roleQuery = `SELECT id, name FROM roles WHERE LOWER(name) = LOWER($1)`;
        const roleResult = await trx.query(roleQuery, [roleIdOrName]);

        // Handle both possible result structures (rows array or full result object)
        const rows = roleResult.rows || roleResult;

        this.logger?.debug('Role query result:', {
          roleIdOrName,
          rowsLength: rows?.length,
          firstRow: rows?.[0]
        });

        if (!rows || rows.length === 0) {
          // Create a new role if it doesn't exist
          const createRoleQuery = `
            INSERT INTO roles (id, name, description, is_system_role, status, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, false, 'active', NOW(), NOW())
            RETURNING id, name
          `;
          const newRoleResult = await trx.query(
            createRoleQuery,
            [roleIdOrName, `${roleIdOrName} role`]
          );

          // Handle both possible result structures
          const newRows = newRoleResult.rows || newRoleResult;
          if (!newRows || newRows.length === 0) {
            throw new Error(`Failed to create role ${roleIdOrName}`);
          }
          roleId = newRows[0].id;
          roleName = newRows[0].name;
        } else {
          roleId = rows[0].id;
          roleName = rows[0].name;
        }
      }
      
      // Insert or update user_companies
      const ucQuery = `
        INSERT INTO ${this.tableName} (
          id, user_id, company_id, role, 
          is_default, status, permissions, 
          created_at, updated_at
        ) 
        VALUES (
          gen_random_uuid(), $1, $2, $3,
          $4, 'active', $5,
          NOW(), NOW()
        )
        ON CONFLICT (user_id, company_id) 
        DO UPDATE SET 
          role = EXCLUDED.role,
          permissions = EXCLUDED.permissions,
          status = 'active',
          updated_at = NOW()
      `;
      await trx.query(ucQuery, [
        userId,
        companyId,
        roleName,
        options?.isDefault || false,
        options?.permissions || []
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
      await trx.query(urQuery, [userId, companyId, roleId]);
    });
  }
  /**
   * Remove a user from a company (soft delete)
   */
  async removeUserFromCompany(userId: string, companyId: string): Promise<void> {
    this.logger?.debug('[UserCompanyRepository.removeUserFromCompany] START', {
      userId,
      companyId,
      timestamp: new Date().toISOString()
    });

    await this.db.transaction(async (trx) => {
      this.logger?.debug('[UserCompanyRepository.removeUserFromCompany] Transaction started');

      // Soft delete from user_companies
      const ucQuery = `
        UPDATE ${this.tableName}
        SET status = 'inactive',
            updated_at = NOW()
        WHERE user_id = $1
          AND company_id = $2
               `;

      this.logger?.debug('[UserCompanyRepository.removeUserFromCompany] Executing user_companies update', {
        query: 'UPDATE user_companies SET status=inactive...',
        params: [userId, companyId]
      });

      const ucResult = await trx.query(ucQuery, [userId, companyId]);

      this.logger?.debug('[UserCompanyRepository.removeUserFromCompany] user_companies update result', {
        rowCount: ucResult.rowCount || (ucResult as any).affectedRows || 'unknown'
      });

      // Delete from user_roles
      const urQuery = `
        DELETE FROM user_roles
        WHERE user_id = $1 AND company_id = $2
      `;

      this.logger?.debug('[UserCompanyRepository.removeUserFromCompany] Executing user_roles delete', {
        query: 'DELETE FROM user_roles...',
        params: [userId, companyId]
      });

      const urResult = await trx.query(urQuery, [userId, companyId]);

      this.logger?.debug('[UserCompanyRepository.removeUserFromCompany] user_roles delete result', {
        rowCount: urResult.rowCount || (urResult as any).affectedRows || 'unknown'
      });
    });

    this.logger?.debug('[UserCompanyRepository.removeUserFromCompany] COMPLETED SUCCESSFULLY');
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
    return result.rows[0].exists;
  }
  /**
   * Get the full relationship details between a user and company
   */
  async getUserCompanyRelation(userId: string, companyId: string): Promise<IUserCompanyRelation | null> {
    const query = `
      SELECT
        uc.user_id,
        uc.company_id,
        COALESCE(ur.role_id::text, uc.role) as role_id,
        COALESCE(r.code, uc.role) as role,
        uc.is_default,
        uc.status,
        uc.permissions,
        uc.created_at,
        uc.updated_at
      FROM ${this.tableName} uc
      LEFT JOIN user_roles ur ON ur.user_id = uc.user_id AND ur.company_id = uc.company_id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE uc.user_id = $1
        AND uc.company_id = $2
    `;
    const result = await this.db.query<any>(query, [userId, companyId]);
    if (result.rows.length === 0) {
      return null;
    }
    const row = result.rows[0];
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
    this.logger?.debug('[UserCompanyRepository.getUserRoleInCompany] START', {
      userId,
      companyId
    });

    const query = `
      SELECT
        COALESCE(ur.role_id::text, uc.role) as role_id,
        COALESCE(r.code, uc.role) as role
      FROM ${this.tableName} uc
      LEFT JOIN user_roles ur ON ur.user_id = uc.user_id AND ur.company_id = uc.company_id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE uc.user_id = $1
        AND uc.company_id = $2
        AND uc.status = 'active'
    `;

    try {
      const result = await this.db.query<{ role_id: string; role: string }>(query, [userId, companyId]);

      this.logger?.debug('[UserCompanyRepository.getUserRoleInCompany] Query result', {
        userId,
        companyId,
        resultCount: result.rows.length,
        result: result.rows.length > 0 ? result.rows[0] : null
      });

      if (result.rows.length === 0) {
        this.logger?.info('[UserCompanyRepository.getUserRoleInCompany] No active role found', {
          userId,
          companyId,
          message: 'User not found in company or status is not active'
        });
        return null;
      }

      const roleData = {
        roleId: result.rows[0].role_id,
        role: result.rows[0].role
      };

      this.logger?.info('[UserCompanyRepository.getUserRoleInCompany] Role found', {
        userId,
        companyId,
        roleData
      });

      return roleData;
    } catch (error) {
      this.logger?.error('[UserCompanyRepository.getUserRoleInCompany] ERROR', {
        userId,
        companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
  /**
   * Update user's role in a company
   * Acepta UUID, name o code (auto-detección)
   */
  async updateUserRoleInCompany(userId: string, companyId: string, newRoleId: string): Promise<void> {
    await this.db.transaction(async (trx) => {
      // Auto-detectar si es UUID o name/code
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUUID = uuidRegex.test(newRoleId);

      let resolvedRoleId: string;
      let resolvedRoleName: string;

      if (isUUID) {
        // Es UUID directo
        const roleQuery = await trx.query(
          `SELECT id, name FROM roles WHERE id = $1`,
          [newRoleId]
        );
        if (roleQuery.rows.length === 0) {
          throw new Error(`Role with ID ${newRoleId} not found`);
        }
        resolvedRoleId = roleQuery.rows[0].id;
        resolvedRoleName = roleQuery.rows[0].name;
      } else {
        // Es name o code, buscar el UUID
        const roleQuery = await trx.query(
          `SELECT id, name FROM roles
           WHERE LOWER(name) = LOWER($1)
              OR LOWER(code) = LOWER($1)
           LIMIT 1`,
          [newRoleId]
        );
        if (roleQuery.rows.length === 0) {
          throw new Error(`Role '${newRoleId}' not found`);
        }
        resolvedRoleId = roleQuery.rows[0].id;
        resolvedRoleName = roleQuery.rows[0].name;
      }

      // Update user_companies (guardar name)
      const ucQuery = `
        UPDATE ${this.tableName}
        SET
          role = $3,
          updated_at = NOW()
        WHERE user_id = $1
          AND company_id = $2
      `;
      await trx.query(ucQuery, [userId, companyId, resolvedRoleName]);

      // Update user_roles (guardar UUID)
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
      await trx.query(urQuery, [userId, companyId, resolvedRoleId]);
    });
  }
}