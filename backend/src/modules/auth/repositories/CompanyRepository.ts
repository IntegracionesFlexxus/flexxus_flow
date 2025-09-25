// Company Repository Implementation - Sprint 1
import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/shared/database/repositories/BaseRepository';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { ICompanyRepository } from '@/shared/interfaces/repositories/ICompanyRepository';
import { Company, UserCompany } from '@/modules/auth/types/auth.types';
import { TYPES } from '@/container/types';
import { v4 as uuidv4 } from 'uuid';
@injectable()
export class CompanyRepository extends BaseRepository<Company> implements ICompanyRepository {
  constructor(
    @inject(TYPES.SharedConnection) db: IDatabaseConnection
  ) {
    super('companies', db);
    // Define allowed fields for companies table to prevent SQL injection
    this.allowedFields = new Set([
      'id', 'name', 'tax_id', 'address', 'phone', 
      'email', 'website', 'logo', 'plan', 'status',
      'settings', 'metadata', 'subscription_ends_at',
      'created_at', 'updated_at', 'deleted_at'
    ]);
  }
  async findByTaxId(taxId: string): Promise<Company | null> {
    return await this.findOneByField('tax_id', taxId);
  }
  async addUserToCompany(userId: string, companyId: string, role: string): Promise<UserCompany> {
    const query = `
      INSERT INTO user_companies (
        id, user_id, company_id, role, is_default, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, NOW(), NOW()
      )
      ON CONFLICT (user_id, company_id) 
      DO UPDATE SET 
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *
    `;
    const id = uuidv4();
    const results = await this.db.query<UserCompany>(query, [
      id,
      userId,
      companyId,
      role,
      false, // is_default
      'active' // status
    ]);
    return results[0];
  }
  async removeUserFromCompany(userId: string, companyId: string): Promise<boolean> {
    const query = `
      UPDATE user_companies
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE user_id = $1 AND company_id = $2 AND deleted_at IS NULL
      RETURNING id
    `;
    const results = await this.db.query(query, [userId, companyId]);
    return results.length > 0;
  }
  async getUserCompanies(userId: string): Promise<UserCompany[]> {
    const query = `
      SELECT uc.*, c.name as company_name, c.plan, c.status as company_status
      FROM user_companies uc
      INNER JOIN companies c ON c.id = uc.company_id
      WHERE uc.user_id = $1 
        AND uc.deleted_at IS NULL 
        AND c.deleted_at IS NULL
      ORDER BY uc.is_default DESC, uc.created_at DESC
    `;
    return await this.db.query<UserCompany>(query, [userId]);
  }
  async getCompanyUsers(companyId: string): Promise<UserCompany[]> {
    const query = `
      SELECT uc.*, u.email, u.first_name, u.last_name, u.status as user_status
      FROM user_companies uc
      INNER JOIN users u ON u.id = uc.user_id
      WHERE uc.company_id = $1 
        AND uc.deleted_at IS NULL 
        AND u.deleted_at IS NULL
      ORDER BY uc.role ASC, uc.created_at DESC
    `;
    return await this.db.query<UserCompany>(query, [companyId]);
  }
  async setDefaultCompany(userId: string, companyId: string): Promise<void> {
    // Transaction to ensure only one default company
    await this.db.transaction(async (client) => {
      // First, remove default from all user companies
      await client.query(
        `UPDATE user_companies 
         SET is_default = false, updated_at = NOW()
         WHERE user_id = $1 AND deleted_at IS NULL`,
        [userId]
      );
      // Then set the new default
      await client.query(
        `UPDATE user_companies 
         SET is_default = true, updated_at = NOW()
         WHERE user_id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [userId, companyId]
      );
    });
  }
  async getUserCompany(userId: string, companyId: string): Promise<UserCompany | null> {
    const query = `
      SELECT * FROM user_companies
      WHERE user_id = $1 AND company_id = $2 AND deleted_at IS NULL
    `;
    const results = await this.db.query<UserCompany>(query, [userId, companyId]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Find multiple companies by IDs - BATCH FETCHING
   * @param ids Array of company IDs (UUIDs) to fetch
   * @returns Array of companies found
   */
  async findByIds(ids: string[]): Promise<Company[]> {
    if (ids.length === 0) return [];

    const query = `
      SELECT * FROM ${this.tableName}
      WHERE id = ANY($1::uuid[])
        AND deleted_at IS NULL
    `;

    try {
      return await this.db.query<Company>(query, [ids]);
    } catch (error) {
      this.logger?.error('Error fetching companies by IDs', { error, ids });
      return [];
    }
  }

  /**
   * Find companies basic info by IDs - OPTIMIZED FOR CROSS-DATABASE
   * @param ids Array of company IDs to fetch
   * @returns Array of companies with basic info only
   */
  async findBasicInfoByIds(ids: string[]): Promise<any[]> {
    if (ids.length === 0) return [];

    const query = `
      SELECT
        id,
        name,
        industry,
        size,
        status
      FROM ${this.tableName}
      WHERE id = ANY($1::uuid[])
        AND deleted_at IS NULL
    `;

    try {
      return await this.db.query(query, [ids]);
    } catch (error) {
      this.logger?.error('Error fetching companies basic info by IDs', { error, ids });
      return [];
    }
  }

  /**
   * Get active company IDs for cache warming
   * @param limit Maximum number of IDs to return
   * @returns Array of active company IDs
   */
  async getActiveCompanyIds(limit: number = 500): Promise<string[]> {
    const query = `
      SELECT id FROM ${this.tableName}
      WHERE status = 'active'
        AND deleted_at IS NULL
      LIMIT $1
    `;

    try {
      const results = await this.db.query<{ id: string }>(query, [limit]);
      return results.map(row => row.id);
    } catch (error) {
      this.logger?.error('Error fetching active company IDs', { error });
      return [];
    }
  }
}
