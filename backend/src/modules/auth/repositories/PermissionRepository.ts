/**
 * Permission Repository Implementation
 * Sprint 3 - Backend Team
 * Implementación del repositorio de permisos
 */
import { injectable, inject } from 'inversify';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { IPermissionRepository } from '@/modules/auth/interfaces/IPermissionRepository';
import { TYPES } from '@/container/types';
@injectable()
export class PermissionRepository implements IPermissionRepository {
  constructor(
    @inject(TYPES.SharedConnection) private readonly db: IDatabaseConnection
  ) {}
  // ==================== OPERACIONES BÁSICAS CRUD ====================
  async create(permissionData: {
    name: string;
    description?: string;
    resource: string;
    action: string;
    conditions?: Record<string, any>;
    status: string;
  }): Promise<any> {
    const query = `
      INSERT INTO permissions (name, description, resource, action, conditions, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      permissionData.name,
      permissionData.description || null,
      permissionData.resource,
      permissionData.action,
      permissionData.conditions ? JSON.stringify(permissionData.conditions) : null,
      permissionData.status
    ];
    const result = await this.db.query(query, values);
    return result.rows[0];
  }
  async findById(permissionId: string): Promise<any | null> {
    const query = `
      SELECT * FROM permissions 
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const result = await this.db.query(query, [permissionId]);
    return result.rows[0] || null;
  }
  async findByName(name: string): Promise<any | null> {
    const query = `
      SELECT * FROM permissions 
      WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL
    `;
    const result = await this.db.query(query, [name]);
    return result.rows[0] || null;
  }
  async findByIds(permissionIds: string[]): Promise<any[]> {
    if (!permissionIds.length) return [];
    const query = `
      SELECT * FROM permissions 
      WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL
    `;
    const result = await this.db.query(query, [permissionIds]);
    return result.rows;
  }
  async findAll(filters?: { status?: string; resource?: string }): Promise<any[]> {
    const conditions = ['deleted_at IS NULL'];
    const values = [];
    let paramCount = 1;
    if (filters?.status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(filters.status);
    }
    if (filters?.resource) {
      conditions.push(`resource = $${paramCount++}`);
      values.push(filters.resource);
    }
    const query = `
      SELECT * FROM permissions 
      WHERE ${conditions.join(' AND ')}
      ORDER BY resource, action
    `;
    const result = await this.db.query(query, values);
    return result.rows;
  }
  async update(permissionId: string, updates: {
    name?: string;
    description?: string;
    conditions?: Record<string, any>;
  }): Promise<any | null> {
    const setClause = [];
    const values = [];
    let paramCount = 1;
    if (updates.name !== undefined) {
      setClause.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      setClause.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }
    if (updates.conditions !== undefined) {
      setClause.push(`conditions = $${paramCount++}`);
      values.push(JSON.stringify(updates.conditions));
    }
    if (!setClause.length) return this.findById(permissionId);
    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(permissionId);
    const query = `
      UPDATE permissions 
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount} AND deleted_at IS NULL
      RETURNING *
    `;
    const result = await this.db.query(query, values);
    return result.rows[0] || null;
  }
  async delete(permissionId: string): Promise<boolean> {
    const query = `
      UPDATE permissions 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `;
    const result = await this.db.query(query, [permissionId]);
    return result.rowCount > 0;
  }
  // ==================== OPERACIONES ESPECÍFICAS DE NEGOCIO ====================
  async getUserPermissions(userId: string): Promise<any[]> {
    const query = `
      SELECT DISTINCT p.*
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      INNER JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = $1
      AND p.deleted_at IS NULL
      ORDER BY p.resource, p.action
    `;
    const result = await this.db.query(query, [userId]);
    return result.rows;
  }
  async findByResource(resource: string): Promise<any[]> {
    const query = `
      SELECT * FROM permissions 
      WHERE resource = $1 AND deleted_at IS NULL
      ORDER BY action
    `;
    const result = await this.db.query(query, [resource]);
    return result.rows;
  }
  async findByResourceAndAction(resource: string, action: string): Promise<any[]> {
    const query = `
      SELECT * FROM permissions 
      WHERE resource = $1 AND action = $2 AND deleted_at IS NULL
    `;
    const result = await this.db.query(query, [resource, action]);
    return result.rows;
  }
  async exists(name: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM permissions 
        WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL
      ) as exists
    `;
    const result = await this.db.query(query, [name]);
    return result.rows[0]?.exists || false;
  }
  async count(filters?: { status?: string; resource?: string }): Promise<number> {
    const conditions = ['deleted_at IS NULL'];
    const values = [];
    let paramCount = 1;
    if (filters?.status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(filters.status);
    }
    if (filters?.resource) {
      conditions.push(`resource = $${paramCount++}`);
      values.push(filters.resource);
    }
    const query = `
      SELECT COUNT(*) as count 
      FROM permissions 
      WHERE ${conditions.join(' AND ')}
    `;
    const result = await this.db.query(query, values);
    return parseInt(result.rows[0]?.count || '0', 10);
  }
  async findByUserId(userId: string, companyId?: string): Promise<any[]> {
    const query = `
      SELECT DISTINCT p.*
      FROM permissions p
      INNER JOIN user_permissions up ON p.id = up.permission_id
      WHERE up.user_id = $1
      ${companyId ? 'AND up.company_id = $2' : ''}
      AND p.deleted_at IS NULL
      AND up.deleted_at IS NULL
      ORDER BY p.resource, p.action
    `;
    const values = companyId ? [userId, companyId] : [userId];
    try {
      const result = await this.db.query(query, values);
      return result.rows || [];
    } catch (error) {
      console.warn('Table user_permissions might not exist:', error.message);
      return [];
    }
  }

  async findDeniedByUserId(userId: string, companyId?: string): Promise<any[]> {
    const query = `
      SELECT DISTINCT p.*
      FROM permissions p
      INNER JOIN user_permission_denials upd ON p.id = upd.permission_id
      WHERE upd.user_id = $1
      ${companyId ? 'AND upd.company_id = $2' : ''}
      AND p.deleted_at IS NULL
      AND upd.deleted_at IS NULL
      ORDER BY p.resource, p.action
    `;
    const values = companyId ? [userId, companyId] : [userId];
    try {
      const result = await this.db.query(query, values);
      return result.rows || [];
    } catch (error) {
      console.warn('Table user_permission_denials might not exist:', error.message);
      return [];
    }
  }

  async findByModule(module: string): Promise<any[]> {
    const query = `
      SELECT * FROM permissions 
      WHERE module = $1 AND deleted_at IS NULL
      ORDER BY category, action
    `;
    try {
      const result = await this.db.query(query, [module]);
      return result.rows || [];
    } catch (error) {
      console.warn('Error finding permissions by module:', error.message);
      return [];
    }
  }

  async grantToUser(data: {
    userId: string;
    permissionId: string;
    companyId: string;
    grantedBy: string;
    conditions?: any;
    grantedAt: Date;
  }): Promise<void> {
    const query = `
      INSERT INTO user_permissions (user_id, permission_id, company_id, granted_by, conditions, granted_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, permission_id, company_id) DO NOTHING
    `;
    const values = [
      data.userId,
      data.permissionId,
      data.companyId,
      data.grantedBy,
      data.conditions ? JSON.stringify(data.conditions) : null,
      data.grantedAt
    ];
    try {
      await this.db.query(query, values);
    } catch (error) {
      console.warn('Error granting permission to user:', error.message);
    }
  }

  async revokeFromUser(userId: string, permissionId: string, companyId: string): Promise<void> {
    const query = `
      UPDATE user_permissions 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE user_id = $1 AND permission_id = $2 AND company_id = $3 AND deleted_at IS NULL
    `;
    try {
      await this.db.query(query, [userId, permissionId, companyId]);
    } catch (error) {
      console.warn('Error revoking permission from user:', error.message);
    }
  }

  async findUserPermission(userId: string, permissionId: string, companyId: string): Promise<any | null> {
    const query = `
      SELECT * FROM user_permissions 
      WHERE user_id = $1 AND permission_id = $2 AND company_id = $3 AND deleted_at IS NULL
    `;
    try {
      const result = await this.db.query(query, [userId, permissionId, companyId]);
      return result.rows[0] || null;
    } catch (error) {
      console.warn('Error finding user permission:', error.message);
      return null;
    }
  }
}
