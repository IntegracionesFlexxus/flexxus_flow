/**
 * Contact Repository
 * Manages contact data operations with CRM database
 */

import { injectable, inject } from 'inversify';
import { CRMBaseRepository } from './CRMBaseRepository';
import {
  Contact,
  ContactCreateDTO,
  ContactUpdateDTO,
  ContactFilter,
  ContactWithDetails
} from '../types/contact.types';
import { TYPES } from '@/container/types';

@injectable()
export class ContactRepository extends CRMBaseRepository<Contact> {
  constructor(
    @inject(TYPES.CRMDatabaseConnection) db: any,
    @inject(TYPES.Logger) logger?: any
  ) {
    super('contacts', db, logger);

    // Define allowed fields for this entity
    this.allowedFields = new Set([
      'id', 'company_id', 'account_id', 'first_name', 'last_name', 'email',
      'phone', 'mobile', 'job_title', 'department', 'reports_to_id',
      'mailing_street', 'mailing_city_id', 'mailing_postal_code',
      'other_street', 'other_city_id', 'other_postal_code',
      'birthdate', 'assistant_name', 'assistant_phone', 'lead_source_id',
      'is_primary', 'do_not_call', 'do_not_email', 'preferred_contact_method',
      'description', 'tags', 'custom_fields', 'created_at', 'updated_at',
      'created_by', 'updated_by'
    ]);
  }

  /**
   * Find contact by email
   */
  async findByEmail(email: string, companyId: number): Promise<Contact | null> {
    const query = `
      SELECT c.*,
             a.name as account_name,
             ls.name as lead_source_name
      FROM ${this.getFullTableName()} c
      LEFT JOIN public.accounts a ON c.account_id = a.id
      LEFT JOIN public.lead_sources ls ON c.lead_source_id = ls.id
      WHERE c.email = $1 AND c.company_id = $2
    `;

    try {
      const result = await this.db.query(query, [email, companyId]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger?.error('Error finding contact by email', { error, email, companyId });
      throw error;
    }
  }

  /**
   * Get contact with all details
   */
  async getContactWithDetails(id: number, companyId: number): Promise<ContactWithDetails | null> {
    const query = `
      SELECT
        c.*,
        a.name as account_name,
        a.type as account_type,
        rt.first_name || ' ' || rt.last_name as reports_to_name,
        ls.name as lead_source_name,
        mc.name as mailing_city_name,
        oc.name as other_city_name
      FROM ${this.getFullTableName()} c
      LEFT JOIN public.accounts a ON c.account_id = a.id
      LEFT JOIN public.contacts rt ON c.reports_to_id = rt.id
      LEFT JOIN public.lead_sources ls ON c.lead_source_id = ls.id
      LEFT JOIN public.cities mc ON c.mailing_city_id = mc.id
      LEFT JOIN public.cities oc ON c.other_city_id = oc.id
      WHERE c.id = $1 AND c.company_id = $2
    `;

    try {
      const result = await this.db.query(query, [id, companyId]);
      if (!result.rows[0]) return null;

      const contact = result.rows[0];

      // Get related opportunities
      const opportunitiesQuery = `
        SELECT o.id, o.name, o.amount, o.stage_id, o.close_date, o.status
        FROM public.opportunities o
        WHERE o.primary_contact_id = $1 AND o.company_id = $2
        ORDER BY o.created_at DESC
        LIMIT 5
      `;
      const opportunitiesResult = await this.db.query(opportunitiesQuery, [id, companyId]);
      contact.opportunities = opportunitiesResult.rows;

      // Get recent activities
      const activitiesQuery = `
        SELECT a.id, a.type, a.subject, a.due_date, a.status
        FROM public.activities a
        WHERE a.contact_id = $1 AND a.company_id = $2
        ORDER BY a.due_date DESC
        LIMIT 5
      `;
      const activitiesResult = await this.db.query(activitiesQuery, [id, companyId]);
      contact.activities = activitiesResult.rows;

      return contact;
    } catch (error) {
      this.logger?.error('Error getting contact details', { error, id, companyId });
      throw error;
    }
  }

  /**
   * Find contacts by account
   */
  async findByAccount(accountId: number, companyId: number): Promise<Contact[]> {
    const query = `
      SELECT c.*
      FROM ${this.getFullTableName()} c
      WHERE c.account_id = $1 AND c.company_id = $2
      ORDER BY c.is_primary DESC, c.created_at ASC
    `;

    try {
      const result = await this.db.query(query, [accountId, companyId]);
      return result.rows;
    } catch (error) {
      this.logger?.error('Error finding contacts by account', { error, accountId, companyId });
      throw error;
    }
  }

  /**
   * Find contacts with filters
   */
  async findWithFilters(companyId: number, filters: ContactFilter): Promise<Contact[]> {
    let query = `
      SELECT c.* FROM ${this.getFullTableName()} c
      WHERE c.company_id = $1
    `;

    const params: any[] = [companyId];
    let paramIndex = 2;

    // Apply filters
    if (filters.account_id) {
      query += ` AND c.account_id = $${paramIndex}`;
      params.push(filters.account_id);
      paramIndex++;
    }

    if (filters.is_primary !== undefined) {
      query += ` AND c.is_primary = $${paramIndex}`;
      params.push(filters.is_primary);
      paramIndex++;
    }

    if (filters.department) {
      query += ` AND c.department ILIKE $${paramIndex}`;
      params.push(`%${filters.department}%`);
      paramIndex++;
    }

    if (filters.job_title) {
      query += ` AND c.job_title ILIKE $${paramIndex}`;
      params.push(`%${filters.job_title}%`);
      paramIndex++;
    }

    if (filters.lead_source_id) {
      query += ` AND c.lead_source_id = $${paramIndex}`;
      params.push(filters.lead_source_id);
      paramIndex++;
    }

    if (filters.do_not_call !== undefined) {
      query += ` AND c.do_not_call = $${paramIndex}`;
      params.push(filters.do_not_call);
      paramIndex++;
    }

    if (filters.do_not_email !== undefined) {
      query += ` AND c.do_not_email = $${paramIndex}`;
      params.push(filters.do_not_email);
      paramIndex++;
    }

    // Search
    if (filters.search) {
      query += ` AND (
        c.first_name ILIKE $${paramIndex} OR
        c.last_name ILIKE $${paramIndex} OR
        c.email ILIKE $${paramIndex} OR
        c.phone ILIKE $${paramIndex} OR
        c.mobile ILIKE $${paramIndex}
      )`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      query += ` AND c.tags && $${paramIndex}::text[]`;
      params.push(filters.tags);
      paramIndex++;
    }

    // Ordering
    const orderBy = filters.orderBy || 'created_at';
    const orderDirection = filters.orderDirection || 'DESC';
    query += ` ORDER BY c.${orderBy} ${orderDirection}`;

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
      this.logger?.error('Error finding contacts with filters', { error, companyId, filters });
      throw error;
    }
  }

  /**
   * Count contacts with filters
   */
  async countWithFilters(companyId: number, filters: ContactFilter): Promise<number> {
    let query = `
      SELECT COUNT(*) as total
      FROM ${this.getFullTableName()} c
      WHERE c.company_id = $1
    `;

    const params: any[] = [companyId];
    let paramIndex = 2;

    // Apply same filters as findWithFilters (excluding pagination)
    if (filters.account_id) {
      query += ` AND c.account_id = $${paramIndex}`;
      params.push(filters.account_id);
      paramIndex++;
    }

    if (filters.is_primary !== undefined) {
      query += ` AND c.is_primary = $${paramIndex}`;
      params.push(filters.is_primary);
      paramIndex++;
    }

    if (filters.department) {
      query += ` AND c.department ILIKE $${paramIndex}`;
      params.push(`%${filters.department}%`);
      paramIndex++;
    }

    if (filters.search) {
      query += ` AND (
        c.first_name ILIKE $${paramIndex} OR
        c.last_name ILIKE $${paramIndex} OR
        c.email ILIKE $${paramIndex}
      )`;
      params.push(`%${filters.search}%`);
    }

    try {
      const result = await this.db.query(query, params);
      return parseInt(result.rows[0].total);
    } catch (error) {
      this.logger?.error('Error counting contacts', { error, companyId, filters });
      throw error;
    }
  }

  /**
   * Set primary contact for account
   */
  async setPrimaryContact(contactId: number, accountId: number, companyId: number): Promise<boolean> {
    const client = await this.db.getClient();

    try {
      await client.query('BEGIN');

      // Remove primary flag from all contacts of the account
      const resetQuery = `
        UPDATE ${this.getFullTableName()}
        SET is_primary = false, updated_at = NOW()
        WHERE account_id = $1 AND company_id = $2
      `;
      await client.query(resetQuery, [accountId, companyId]);

      // Set the new primary contact
      const setPrimaryQuery = `
        UPDATE ${this.getFullTableName()}
        SET is_primary = true, updated_at = NOW()
        WHERE id = $1 AND account_id = $2 AND company_id = $3
      `;
      const result = await client.query(setPrimaryQuery, [contactId, accountId, companyId]);

      await client.query('COMMIT');
      return result.rowCount > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger?.error('Error setting primary contact', { error, contactId, accountId, companyId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get contact hierarchy (reports-to chain)
   */
  async getContactHierarchy(contactId: number, companyId: number): Promise<Contact[]> {
    const query = `
      WITH RECURSIVE contact_hierarchy AS (
        SELECT *, 0 as level
        FROM public.contacts
        WHERE id = $1 AND company_id = $2

        UNION ALL

        SELECT c.*, ch.level + 1
        FROM public.contacts c
        JOIN contact_hierarchy ch ON c.id = ch.reports_to_id
        WHERE c.company_id = $2
      )
      SELECT * FROM contact_hierarchy
      ORDER BY level
    `;

    try {
      const result = await this.db.query(query, [contactId, companyId]);
      return result.rows;
    } catch (error) {
      this.logger?.error('Error getting contact hierarchy', { error, contactId, companyId });
      throw error;
    }
  }

  /**
   * Find duplicate contacts
   */
  async findDuplicates(email: string, companyId: number, excludeId?: number): Promise<Contact[]> {
    let query = `
      SELECT * FROM ${this.getFullTableName()}
      WHERE email = $1 AND company_id = $2
    `;

    const params: any[] = [email, companyId];

    if (excludeId) {
      query += ` AND id != $3`;
      params.push(excludeId);
    }

    query += ` ORDER BY created_at ASC`;

    try {
      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger?.error('Error finding duplicate contacts', { error, email, companyId });
      throw error;
    }
  }

  /**
   * Get birthday contacts
   */
  async getBirthdayContacts(companyId: number, daysAhead: number = 7): Promise<Contact[]> {
    const query = `
      SELECT * FROM ${this.getFullTableName()}
      WHERE company_id = $1
        AND birthdate IS NOT NULL
        AND EXTRACT(DOY FROM birthdate) BETWEEN
            EXTRACT(DOY FROM CURRENT_DATE) AND
            EXTRACT(DOY FROM CURRENT_DATE + INTERVAL '${daysAhead} days')
      ORDER BY EXTRACT(DOY FROM birthdate)
    `;

    try {
      const result = await this.db.query(query, [companyId]);
      return result.rows;
    } catch (error) {
      this.logger?.error('Error getting birthday contacts', { error, companyId, daysAhead });
      throw error;
    }
  }
}