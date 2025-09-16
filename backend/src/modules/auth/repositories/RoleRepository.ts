/**
 * Role Repository Implementation
 * Sprint 3 - Backend Team
 * Implementación del repositorio de roles extendiendo BaseRepository
 */
import { injectable, inject, optional } from 'inversify';
import { BaseRepository } from '@/shared/database/repositories/BaseRepository';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { IRoleRepository } from '@/modules/auth/interfaces/IRoleRepository';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
interface Role {
  id: string;
  name: string;
  description?: string;
  company_id?: string;
  is_system_role: boolean;
  status: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}
@injectable()
export class RoleRepository extends BaseRepository<Role> implements IRoleRepository {
  constructor(
    @inject(TYPES.SharedConnection) db: IDatabaseConnection,
    @inject(TYPES.Logger) @optional() logger?: Logger
  ) {
    super('roles', db, logger);
    // Define allowed fields for roles table to prevent SQL injection
    this.allowedFields = new Set([
      'id', 'name', 'description', 'company_id', 
      'is_system_role', 'status', 
      'created_at', 'updated_at', 'deleted_at'
    ]);
  }
  // ==================== OPERACIONES BÁSICAS CRUD ====================
  async create(roleData: {
    name: string;
    description?: string;
    companyId?: string;
    isSystemRole: boolean;
    status: string;
  }): Promise<any> {
    const data = {
      name: roleData.name,
      description: roleData.description || null,
      company_id: roleData.companyId || null,
      is_system_role: roleData.isSystemRole,
      status: roleData.status
    };
    return super.create(data);
  }
  async findById(roleId: string): Promise<any | null> {
    const query = `
      SELECT r.*, 
             COUNT(DISTINCT ur.user_id) as user_count
      FROM ${this.tableName} r
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      WHERE r.id = $1 AND r.deleted_at IS NULL
      GROUP BY r.id
    `;
    const result = await this.executeQuery(query, [roleId]);
    return result[0] || null;
  }
  async findByName(name: string, companyId?: string): Promise<any | null> {
    const conditions = ['LOWER(name) = LOWER($1)', 'deleted_at IS NULL'];
    const params = [name];
    if (companyId !== undefined) {
      conditions.push('($2::uuid IS NULL OR company_id = $2)');
      params.push(companyId || null);
    }
    const result = await this.findWhere(conditions, params);
    return result[0] || null;
  }
  async findByIds(roleIds: string[]): Promise<any[]> {
    if (!roleIds.length) return [];
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE id = ANY($1::uuid[]) 
      AND deleted_at IS NULL
    `;
    return this.executeQuery(query, [roleIds]);
  }
  async update(roleId: string, updates: {
    name?: string;
    description?: string;
  }): Promise<any | null> {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (!Object.keys(updateData).length) {
      return this.findById(roleId);
    }
    return super.update(roleId, updateData);
  }
  // delete method inherited from BaseRepository (soft delete)
  // ==================== OPERACIONES ESPECÍFICAS DE EMPRESA ====================
  async findByCompany(companyId: string): Promise<any[]> {
    const query = `
      SELECT r.*, 
             COUNT(DISTINCT ur.user_id) as user_count
      FROM ${this.tableName} r
      LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.company_id = $1
      WHERE (r.company_id = $1 OR r.is_system_role = true)
      AND r.deleted_at IS NULL
      GROUP BY r.id
      ORDER BY r.is_system_role DESC, r.name ASC
    `;
    return this.executeQuery(query, [companyId]);
  }
  async findSystemRoles(): Promise<any[]> {
    const query = `
      SELECT r.*, 
             COUNT(DISTINCT ur.user_id) as user_count
      FROM ${this.tableName} r
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      WHERE r.is_system_role = true
      AND r.deleted_at IS NULL
      GROUP BY r.id
      ORDER BY r.name ASC
    `;
    return this.executeQuery(query);
  }
  // ==================== GESTIÓN DE PERMISOS DE ROLES ====================
  async assignPermissions(roleId: string, permissionIds: string[]): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      // Eliminar permisos existentes
      await client.query(
        'DELETE FROM role_permissions WHERE role_id = $1',
        [roleId]
      );
      // Insertar nuevos permisos
      if (permissionIds.length > 0) {
        const values = permissionIds.map((permId, idx) => 
          `($1, $${idx + 2})`
        ).join(', ');
        const query = `
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ${values}
        `;
        await client.query(query, [roleId, ...permissionIds]);
      }
      await client.query('COMMIT');
      // Clear cache for this role
      this.clearCachePattern(`role:${roleId}:*`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async addPermissions(roleId: string, permissionIds: string[]): Promise<void> {
    if (!permissionIds.length) return;
    const values = permissionIds.map((permId, idx) => 
      `($1, $${idx + 2})`
    ).join(', ');
    const query = `
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES ${values}
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `;
    await this.executeQuery(query, [roleId, ...permissionIds]);
    this.clearCachePattern(`role:${roleId}:permissions`);
  }
  async removePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    if (!permissionIds.length) return;
    const query = `
      DELETE FROM role_permissions 
      WHERE role_id = $1 AND permission_id = ANY($2::uuid[])
    `;
    await this.executeQuery(query, [roleId, permissionIds]);
    this.clearCachePattern(`role:${roleId}:permissions`);
  }
  async getRolePermissions(roleId: string): Promise<any[]> {
    const cacheKey = `role:${roleId}:permissions`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    const query = `
      SELECT p.* 
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.resource, p.action
    `;
    const result = await this.executeQuery(query, [roleId]);
    this.setCache(cacheKey, result, 300); // Cache for 5 minutes
    return result;
  }
  async hasPermission(roleId: string, permissionId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM role_permissions 
        WHERE role_id = $1 AND permission_id = $2
      ) as has_permission
    `;
    const result = await this.executeQuery<{ has_permission: boolean }>(query, [roleId, permissionId]);
    return result[0]?.has_permission || false;
  }
  // ==================== OPERACIONES ESPECÍFICAS DE USUARIOS ====================
  async getUsersByRole(roleId: string): Promise<any[]> {
    const query = `
      SELECT u.*, ur.company_id, c.name as company_name
      FROM users u
      INNER JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN companies c ON ur.company_id = c.id
      WHERE ur.role_id = $1 AND u.deleted_at IS NULL
      ORDER BY u.first_name, u.last_name
    `;
    return this.executeQuery(query, [roleId]);
  }
  async getUserRoles(userId: string, companyId?: string): Promise<any[]> {
    const conditions = ['ur.user_id = $1', 'r.deleted_at IS NULL'];
    const params: any[] = [userId];
    if (companyId) {
      conditions.push('ur.company_id = $2');
      params.push(companyId);
    }
    const query = `
      SELECT r.*, ur.company_id
      FROM ${this.tableName} r
      INNER JOIN user_roles ur ON r.id = ur.role_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY r.name
    `;
    return this.executeQuery(query, params);
  }
  async assignRoleToUser(userId: string, roleId: string, companyId?: string): Promise<void> {
    const query = `
      INSERT INTO user_roles (user_id, role_id, company_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, company_id) 
      DO UPDATE SET role_id = EXCLUDED.role_id, updated_at = CURRENT_TIMESTAMP
    `;
    await this.executeQuery(query, [userId, roleId, companyId || null]);
    this.clearCachePattern(`user:${userId}:roles`);
  }
  async removeRoleFromUser(userId: string, roleId: string, companyId?: string): Promise<void> {
    const conditions = ['user_id = $1', 'role_id = $2'];
    const params: any[] = [userId, roleId];
    if (companyId !== undefined) {
      conditions.push('($3::uuid IS NULL OR company_id = $3)');
      params.push(companyId || null);
    }
    const query = `
      DELETE FROM user_roles 
      WHERE ${conditions.join(' AND ')}
    `;
    await this.executeQuery(query, params);
    this.clearCachePattern(`user:${userId}:roles`);
  }
  async getUserRole(userId: string, companyId: string): Promise<string | null> {
    const query = `
      SELECT role_id 
      FROM user_roles 
      WHERE user_id = $1 AND company_id = $2
    `;
    const result = await this.executeQuery<{ role_id: string }>(query, [userId, companyId]);
    return result[0]?.role_id || null;
  }
  async updateUserRole(userId: string, companyId: string, newRoleId: string): Promise<void> {
    const query = `
      UPDATE user_roles 
      SET role_id = $3, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND company_id = $2
    `;
    await this.executeQuery(query, [userId, companyId, newRoleId]);
    this.clearCache(`user:${userId}:roles`);
  }
  // ==================== OPERACIONES DE CONSULTA ====================
  async exists(name: string, companyId?: string): Promise<boolean> {
    const conditions = ['LOWER(name) = LOWER($1)', 'deleted_at IS NULL'];
    const params: any[] = [name];
    if (companyId !== undefined) {
      conditions.push('($2::uuid IS NULL OR company_id = $2)');
      params.push(companyId || null);
    }
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM ${this.tableName}
        WHERE ${conditions.join(' AND ')}
      ) as exists
    `;
    const result = await this.executeQuery<{ exists: boolean }>(query, params);
    return result[0]?.exists || false;
  }
  async count(filters?: { 
    companyId?: string; 
    isSystemRole?: boolean; 
    status?: string 
  }): Promise<number> {
    const conditions = ['deleted_at IS NULL'];
    const params: any[] = [];
    let paramCount = 1;
    if (filters?.companyId) {
      conditions.push(`(company_id = $${paramCount++} OR is_system_role = true)`);
      params.push(filters.companyId);
    }
    if (filters?.isSystemRole !== undefined) {
      conditions.push(`is_system_role = $${paramCount++}`);
      params.push(filters.isSystemRole);
    }
    if (filters?.status) {
      conditions.push(`status = $${paramCount++}`);
      params.push(filters.status);
    }
    const query = `
      SELECT COUNT(*) as count 
      FROM ${this.tableName}
      WHERE ${conditions.join(' AND ')}
    `;
    const result = await this.executeQuery<{ count: string }>(query, params);
    return parseInt(result[0]?.count || '0', 10);
  }
  async findWithPagination(filters?: {
    companyId?: string;
    isSystemRole?: boolean;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    roles: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const offset = (page - 1) * limit;
    const conditions = ['r.deleted_at IS NULL'];
    const params: any[] = [];
    let paramCount = 1;
    if (filters?.companyId) {
      conditions.push(`(r.company_id = $${paramCount++} OR r.is_system_role = true)`);
      params.push(filters.companyId);
    }
    if (filters?.isSystemRole !== undefined) {
      conditions.push(`r.is_system_role = $${paramCount++}`);
      params.push(filters.isSystemRole);
    }
    if (filters?.status) {
      conditions.push(`r.status = $${paramCount++}`);
      params.push(filters.status);
    }
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM ${this.tableName} r 
      WHERE ${conditions.join(' AND ')}
    `;
    const dataQuery = `
      SELECT r.*, 
             COUNT(DISTINCT ur.user_id) as user_count
      FROM ${this.tableName} r
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY r.id
      ORDER BY r.is_system_role DESC, r.name ASC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;
    const countParams = [...params];
    params.push(limit, offset);
    const [countResult, dataResult] = await Promise.all([
      this.executeQuery<{ total: string }>(countQuery, countParams),
      this.executeQuery(dataQuery, params)
    ]);
    return {
      roles: dataResult,
      total: parseInt(countResult[0]?.total || '0', 10),
      page,
      limit
    };
  }
  // Helper method to clear cache by pattern
  protected clearCachePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    const regex = new RegExp(pattern.replace('*', '.*'));
    keys.forEach(key => {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    });
  }
}
