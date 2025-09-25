/**
 * Account Repository
 * Manages account data operations with CRM database
 */

import { injectable, inject } from 'inversify';
import { CRMBaseRepository } from './CRMBaseRepository';
import {
  Account,
  AccountCreateDTO,
  AccountUpdateDTO,
  AccountFilter,
  AccountWithDetails,
  AccountHierarchy,
  AccountMetrics
} from '../types/account.types';
import { TYPES } from '@/container/types';

@injectable()
export class AccountRepository extends CRMBaseRepository<Account> {
  constructor(
    @inject(TYPES.CRMDatabaseConnection) db: any,
    @inject(TYPES.Logger) logger?: any
  ) {
    super('accounts', db, logger);

    // Define allowed fields for this entity
    this.allowedFields = new Set([
      'id', 'company_id', 'name', 'account_number', 'type', 'industry_id',
      'vat_condition_id', 'cuit', 'website', 'annual_revenue', 'employee_count',
      'parent_account_id', 'billing_street', 'billing_city_id', 'billing_postal_code',
      'shipping_street', 'shipping_city_id', 'shipping_postal_code',
      'phone', 'fax', 'email', 'owner_id', 'rating', 'sla_type',
      'sla_expiration_date', 'status', 'description', 'tags', 'custom_fields',
      'created_at', 'updated_at', 'created_by', 'updated_by'
    ]);
  }

  /**
   * Find account by CUIT
   */
  async findByCUIT(cuit: string, companyId: string): Promise<Account | null> {
    const query = `
      SELECT a.*,
             i.name as industry_name,
             vc.name as vat_condition_name
             -- u.name as owner_name -- Users table is in different database
      FROM ${this.getFullTableName()} a
      LEFT JOIN public.industries i ON a.industry_id = i.id
      LEFT JOIN public.vat_conditions vc ON a.vat_condition_id = vc.id
      -- LEFT JOIN public.users u ON a.owner_id = u.id
      WHERE a.cuit = $1 AND a.company_id = $2
    `;

    try {
      const result = await this.db.query(query, [cuit, companyId]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger?.error('Error finding account by CUIT', { error, cuit, companyId });
      throw error;
    }
  }

  /**
   * Get account with all details
   */
  async getAccountWithDetails(id: number, companyId: string): Promise<AccountWithDetails | null> {
    const query = `
      SELECT
        a.*,
        i.name as industry_name,
        vc.name as vat_condition_name,
        p.name as parent_account_name,
        -- u.name as owner_name, -- Users table is in different database
        bc.name as billing_city_name,
        sc.name as shipping_city_name,
        COALESCE(
          (SELECT SUM(amount)
           FROM public.opportunities
           WHERE account_id = a.id AND status = 'won'),
          0
        ) as total_opportunity_value
      FROM ${this.getFullTableName()} a
      LEFT JOIN public.industries i ON a.industry_id = i.id
      LEFT JOIN public.vat_conditions vc ON a.vat_condition_id = vc.id
      LEFT JOIN public.accounts p ON a.parent_account_id = p.id
      -- Users table is in flexxus_shared, not flexxus_crm
      -- LEFT JOIN public.users u ON a.owner_id = u.id
      LEFT JOIN public.cities bc ON a.billing_city_id = bc.id
      LEFT JOIN public.cities sc ON a.shipping_city_id = sc.id
      WHERE a.id = $1 AND a.company_id = $2
    `;

    try {
      const result = await this.db.query(query, [id, companyId]);
      if (!result.rows[0]) return null;

      const account = result.rows[0];

      // Get related contacts
      // Note: contacts table doesn't have account_id or job_title columns in current schema
      const contactsQuery = `
        SELECT id, first_name, last_name, email, phone, status
        FROM public.contacts
        WHERE company_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `;
      const contactsResult = await this.db.query(contactsQuery, [companyId]);
      account.contacts = contactsResult.rows;

      // Get related opportunities
      const opportunitiesQuery = `
        SELECT o.id, o.name, o.amount, o.stage_id, o.close_date, o.status
        FROM public.opportunities o
        WHERE o.account_id = $1 AND o.company_id = $2
        ORDER BY o.created_at DESC
        LIMIT 10
      `;
      const opportunitiesResult = await this.db.query(opportunitiesQuery, [id, companyId]);
      account.opportunities = opportunitiesResult.rows;

      return account;
    } catch (error) {
      this.logger?.error('Error getting account details', { error, id, companyId });
      throw error;
    }
  }

  /**
   * Find accounts with filters
   */
  async findWithFilters(companyId: string, filters: AccountFilter): Promise<Account[]> {
    let query = `
      SELECT a.* FROM ${this.getFullTableName()} a
      WHERE a.company_id = $1
    `;

    const params: any[] = [companyId];
    let paramIndex = 2;

    // Apply filters
    if (filters.type) {
      query += ` AND a.type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.rating) {
      query += ` AND a.rating = $${paramIndex}`;
      params.push(filters.rating);
      paramIndex++;
    }

    if (filters.industry_id) {
      query += ` AND a.industry_id = $${paramIndex}`;
      params.push(filters.industry_id);
      paramIndex++;
    }

    if (filters.vat_condition_id) {
      query += ` AND a.vat_condition_id = $${paramIndex}`;
      params.push(filters.vat_condition_id);
      paramIndex++;
    }

    if (filters.owner_id) {
      query += ` AND a.owner_id = $${paramIndex}`;
      params.push(filters.owner_id);
      paramIndex++;
    }

    if (filters.parent_account_id !== undefined) {
      if (filters.parent_account_id === null) {
        query += ` AND a.parent_account_id IS NULL`;
      } else {
        query += ` AND a.parent_account_id = $${paramIndex}`;
        params.push(filters.parent_account_id);
        paramIndex++;
      }
    }

    if (filters.minRevenue !== undefined) {
      query += ` AND a.annual_revenue >= $${paramIndex}`;
      params.push(filters.minRevenue);
      paramIndex++;
    }

    if (filters.maxRevenue !== undefined) {
      query += ` AND a.annual_revenue <= $${paramIndex}`;
      params.push(filters.maxRevenue);
      paramIndex++;
    }

    if (filters.minEmployees !== undefined) {
      query += ` AND a.employee_count >= $${paramIndex}`;
      params.push(filters.minEmployees);
      paramIndex++;
    }

    if (filters.maxEmployees !== undefined) {
      query += ` AND a.employee_count <= $${paramIndex}`;
      params.push(filters.maxEmployees);
      paramIndex++;
    }

    // Search
    if (filters.search) {
      query += ` AND (
        a.name ILIKE $${paramIndex} OR
        a.cuit ILIKE $${paramIndex} OR
        a.email ILIKE $${paramIndex} OR
        a.website ILIKE $${paramIndex}
      )`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      query += ` AND a.tags && $${paramIndex}::text[]`;
      params.push(filters.tags);
      paramIndex++;
    }

    // Ordering
    const orderBy = filters.orderBy || 'created_at';
    const orderDirection = filters.orderDirection || 'DESC';
    query += ` ORDER BY a.${orderBy} ${orderDirection}`;

    // Pagination
    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;

      if (filters.page && filters.page > 1) {
        const offset = (filters.page - 1) * filters.limit;
        query += ` OFFSET $${paramIndex}`;
        params.push(offset);
      }
    }

    try {
      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger?.error('Error finding accounts with filters', { error, companyId, filters });
      throw error;
    }
  }

  /**
   * Count accounts with filters
   */
  async countWithFilters(companyId: string, filters: AccountFilter): Promise<number> {
    let query = `
      SELECT COUNT(*) as total FROM ${this.getFullTableName()} a
      WHERE a.company_id = $1
    `;

    const params: any[] = [companyId];
    let paramIndex = 2;

    // Apply the same filters as findWithFilters
    if (filters.type) {
      query += ` AND a.type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.rating) {
      query += ` AND a.rating = $${paramIndex}`;
      params.push(filters.rating);
      paramIndex++;
    }

    if (filters.industry_id) {
      query += ` AND a.industry_id = $${paramIndex}`;
      params.push(filters.industry_id);
      paramIndex++;
    }

    if (filters.search) {
      query += ` AND (
        a.name ILIKE $${paramIndex} OR
        a.cuit ILIKE $${paramIndex} OR
        a.email ILIKE $${paramIndex}
      )`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    try {
      const result = await this.db.query(query, params);
      return parseInt(result.rows[0]?.total || 0);
    } catch (error) {
      this.logger?.error('Error counting accounts with filters', { error, companyId, filters });
      throw error;
    }
  }

  /**
   * Get account hierarchy
   */
  async getAccountHierarchy(rootAccountId: number, companyId: string): Promise<AccountHierarchy | null> {
    const query = `
      WITH RECURSIVE account_tree AS (
        SELECT *, 0 as level
        FROM public.accounts
        WHERE id = $1 AND company_id = $2

        UNION ALL

        SELECT a.*, at.level + 1
        FROM public.accounts a
        JOIN account_tree at ON a.parent_account_id = at.id
        WHERE a.company_id = $2
      )
      SELECT * FROM account_tree
      ORDER BY level, name
    `;

    try {
      const result = await this.db.query(query, [rootAccountId, companyId]);
      if (result.rows.length === 0) return null;

      // Build hierarchy tree
      const accountsMap = new Map<number, AccountHierarchy>();
      const rootAccount = result.rows[0];

      result.rows.forEach(row => {
        accountsMap.set(row.id, { ...row, children: [] });
      });

      result.rows.forEach(row => {
        if (row.parent_account_id && accountsMap.has(row.parent_account_id)) {
          const parent = accountsMap.get(row.parent_account_id)!;
          const child = accountsMap.get(row.id)!;
          parent.children.push(child);
        }
      });

      return accountsMap.get(rootAccountId) || null;
    } catch (error) {
      this.logger?.error('Error getting account hierarchy', { error, rootAccountId, companyId });
      throw error;
    }
  }

  /**
   * Get account metrics
   */
  async getAccountMetrics(companyId: string): Promise<AccountMetrics> {
    const metricsQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN type = 'customer' THEN 1 END) as customer_count,
        COUNT(CASE WHEN type = 'prospect' THEN 1 END) as prospect_count,
        COUNT(CASE WHEN type = 'partner' THEN 1 END) as partner_count,
        COUNT(CASE WHEN type = 'competitor' THEN 1 END) as competitor_count,
        COUNT(CASE WHEN type = 'vendor' THEN 1 END) as vendor_count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN rating = 'hot' THEN 1 END) as hot_count,
        COUNT(CASE WHEN rating = 'warm' THEN 1 END) as warm_count,
        COUNT(CASE WHEN rating = 'cold' THEN 1 END) as cold_count,
        SUM(annual_revenue) as total_revenue,
        AVG(annual_revenue) as average_revenue
      FROM ${this.getFullTableName()}
      WHERE company_id = $1
    `;

    const topAccountsQuery = `
      SELECT
        a.id,
        a.name,
        a.annual_revenue as revenue,
        COUNT(o.id) as opportunity_count
      FROM ${this.getFullTableName()} a
      LEFT JOIN public.opportunities o ON a.id = o.account_id
      WHERE a.company_id = $1
      GROUP BY a.id, a.name, a.annual_revenue
      ORDER BY a.annual_revenue DESC NULLS LAST
      LIMIT 10
    `;

    try {
      const [metricsResult, topAccountsResult] = await Promise.all([
        this.db.query(metricsQuery, [companyId]),
        this.db.query(topAccountsQuery, [companyId])
      ]);

      const metrics = metricsResult.rows[0];

      return {
        total: parseInt(metrics.total) || 0,
        byType: {
          customer: parseInt(metrics.customer_count) || 0,
          prospect: parseInt(metrics.prospect_count) || 0,
          partner: parseInt(metrics.partner_count) || 0,
          competitor: parseInt(metrics.competitor_count) || 0,
          vendor: parseInt(metrics.vendor_count) || 0
        },
        byStatus: {
          active: parseInt(metrics.active_count) || 0,
          inactive: parseInt(metrics.inactive_count) || 0,
          pending: parseInt(metrics.pending_count) || 0
        },
        byRating: {
          hot: parseInt(metrics.hot_count) || 0,
          warm: parseInt(metrics.warm_count) || 0,
          cold: parseInt(metrics.cold_count) || 0
        },
        totalRevenue: parseFloat(metrics.total_revenue) || 0,
        averageRevenue: parseFloat(metrics.average_revenue) || 0,
        topAccounts: topAccountsResult.rows
      };
    } catch (error) {
      this.logger?.error('Error getting account metrics', { error, companyId });
      throw error;
    }
  }

  /**
   * Update account SLA expiration
   */
  async updateSLAExpiration(accountId: number, companyId: string, expirationDate: Date): Promise<boolean> {
    const query = `
      UPDATE ${this.getFullTableName()}
      SET sla_expiration_date = $3,
          updated_at = NOW()
      WHERE id = $1 AND company_id = $2
    `;

    try {
      const result = await this.db.query(query, [accountId, companyId, expirationDate]);
      return result.rowCount > 0;
    } catch (error) {
      this.logger?.error('Error updating SLA expiration', { error, accountId, companyId });
      throw error;
    }
  }

  /**
   * Find duplicate accounts by name or CUIT
   */
  async findDuplicates(name: string, cuit: string | null, companyId: string, excludeId?: number): Promise<Account[]> {
    let query = `
      SELECT * FROM ${this.getFullTableName()}
      WHERE company_id = $1 AND (
        name ILIKE $2
    `;

    const params: any[] = [companyId, `%${name}%`];
    let paramIndex = 3;

    if (cuit) {
      query += ` OR cuit = $${paramIndex}`;
      params.push(cuit);
      paramIndex++;
    }

    query += `)`;

    if (excludeId) {
      query += ` AND id != $${paramIndex}`;
      params.push(excludeId);
    }

    query += ` ORDER BY created_at ASC`;

    try {
      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger?.error('Error finding duplicate accounts', { error, name, cuit, companyId });
      throw error;
    }
  }
}