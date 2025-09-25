/**
 * Lead Repository
 * Manages lead data operations with CRM database
 */

import { injectable, inject } from 'inversify';
import { CRMBaseRepository } from './CRMBaseRepository';
import { Lead, LeadCreateDTO, LeadUpdateDTO, LeadFilter, LeadWithDetails } from '../types/lead.types';
import { TYPES } from '@/container/types';

@injectable()
export class LeadRepository extends CRMBaseRepository<Lead> {
  constructor(
    @inject(TYPES.CRMDatabaseConnection) db: any,
    @inject(TYPES.Logger) logger?: any
  ) {
    super('leads', db, logger);
    
    // Define allowed fields for this entity
    this.allowedFields = new Set([
      'id', 'company_id', 'first_name', 'last_name', 'email', 'phone', 'mobile',
      'company_name', 'job_title', 'industry_id', 'website', 'street', 'city_id',
      'postal_code', 'budget', 'authority_level', 'need_description', 'timeline',
      'source_id', 'status', 'score', 'assigned_to', 'converted_at',
      'converted_to_account_id', 'converted_to_contact_id', 'converted_to_opportunity_id',
      'do_not_call', 'do_not_email', 'preferred_contact_method', 'notes', 'tags',
      'custom_fields', 'created_at', 'updated_at', 'created_by', 'updated_by'
    ]);
  }

  /**
   * Find lead by email
   */
  async findByEmail(email: string, companyId: number): Promise<Lead | null> {
    const query = `
      SELECT l.*, 
             i.name as industry_name,
             ls.name as source_name,
             u.name as assigned_to_name
      FROM ${this.getFullTableName()} l
      LEFT JOIN public.industries i ON l.industry_id = i.id
      LEFT JOIN public.lead_sources ls ON l.source_id = ls.id
      LEFT JOIN public.users u ON l.assigned_to = u.id
      WHERE l.email = $1 AND l.company_id = $2
    `;
    
    try {
      const result = await this.db.query(query, [email, companyId]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger?.error('Error finding lead by email', { error, email, companyId });
      throw error;
    }
  }

  /**
   * Find qualified leads
   */
  async findQualifiedLeads(companyId: number, filters?: LeadFilter): Promise<Lead[]> {
    let query = `
      SELECT l.* FROM ${this.getFullTableName()} l
      WHERE l.company_id = $1
        AND l.status IN ('qualified', 'contacted')
        AND l.score >= 50
    `;
    
    const params: any[] = [companyId];
    let paramIndex = 2;
    
    if (filters?.timeline) {
      query += ` AND l.timeline = $${paramIndex}`;
      params.push(filters.timeline);
      paramIndex++;
    }
    
    if (filters?.minBudget) {
      query += ` AND l.budget >= $${paramIndex}`;
      params.push(filters.minBudget);
      paramIndex++;
    }

    if (filters?.authority_level) {
      query += ` AND l.authority_level = $${paramIndex}`;
      params.push(filters.authority_level);
      paramIndex++;
    }
    
    query += ` ORDER BY l.score DESC, l.created_at DESC`;
    
    if (filters?.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
    }
    
    try {
      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger?.error('Error finding qualified leads', { error, companyId, filters });
      throw error;
    }
  }

  /**
   * Get lead with all details
   */
  async getLeadWithDetails(id: number, companyId: number): Promise<LeadWithDetails | null> {
    const query = `
      SELECT 
        l.*,
        i.name as industry_name,
        ls.name as source_name,
        c.name as city_name,
        r.name as region_name,
        u.name as assigned_to_name
      FROM ${this.getFullTableName()} l
      LEFT JOIN public.industries i ON l.industry_id = i.id
      LEFT JOIN public.lead_sources ls ON l.source_id = ls.id
      LEFT JOIN public.cities c ON l.city_id = c.id
      LEFT JOIN public.regions r ON c.region_id = r.id
      LEFT JOIN public.users u ON l.assigned_to = u.id
      WHERE l.id = $1 AND l.company_id = $2
    `;

    try {
      const result = await this.db.query(query, [id, companyId]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger?.error('Error getting lead details', { error, id, companyId });
      throw error;
    }
  }

  /**
   * Convert lead
   */
  async convertLead(
    leadId: number,
    companyId: number,
    accountId: number,
    contactId: number,
    opportunityId?: number,
    userId?: number
  ): Promise<void> {
    const query = `
      UPDATE ${this.getFullTableName()}
      SET status = 'converted',
          converted_at = NOW(),
          converted_to_account_id = $3,
          converted_to_contact_id = $4,
          converted_to_opportunity_id = $5,
          updated_at = NOW(),
          updated_by = $6
      WHERE id = $1 AND company_id = $2
    `;
    
    try {
      await this.db.query(query, [leadId, companyId, accountId, contactId, opportunityId, userId]);
      this.logger?.info('Lead converted', { leadId, companyId, accountId, contactId, opportunityId });
    } catch (error) {
      this.logger?.error('Error converting lead', { error, leadId, companyId });
      throw error;
    }
  }

  /**
   * Update lead score using PostgreSQL function
   */
  async updateLeadScore(leadId: number): Promise<number> {
    const query = `SELECT public.calculate_lead_score($1) as score`;
    
    try {
      const result = await this.db.query(query, [leadId]);
      return result.rows[0].score;
    } catch (error) {
      this.logger?.error('Error updating lead score', { error, leadId });
      throw error;
    }
  }

  /**
   * Find leads with filters
   */
  async findWithFilters(companyId: number, filters: LeadFilter): Promise<Lead[]> {
    let query = `
      SELECT l.* FROM ${this.getFullTableName()} l
      WHERE l.company_id = $1
    `;
    
    const params: any[] = [companyId];
    let paramIndex = 2;

    // Apply filters
    if (filters.status) {
      query += ` AND l.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.minScore !== undefined) {
      query += ` AND l.score >= $${paramIndex}`;
      params.push(filters.minScore);
      paramIndex++;
    }

    if (filters.maxScore !== undefined) {
      query += ` AND l.score <= $${paramIndex}`;
      params.push(filters.maxScore);
      paramIndex++;
    }

    if (filters.assigned_to) {
      query += ` AND l.assigned_to = $${paramIndex}`;
      params.push(filters.assigned_to);
      paramIndex++;
    }

    if (filters.source_id) {
      query += ` AND l.source_id = $${paramIndex}`;
      params.push(filters.source_id);
      paramIndex++;
    }

    if (filters.converted !== undefined) {
      if (filters.converted) {
        query += ` AND l.status = 'converted'`;
      } else {
        query += ` AND l.status != 'converted'`;
      }
    }

    // Search
    if (filters.search) {
      query += ` AND (
        l.first_name ILIKE $${paramIndex} OR
        l.last_name ILIKE $${paramIndex} OR
        l.email ILIKE $${paramIndex} OR
        l.company_name ILIKE $${paramIndex}
      )`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Ordering
    const orderBy = filters.orderBy || 'created_at';
    const orderDirection = filters.orderDirection || 'DESC';
    query += ` ORDER BY l.${orderBy} ${orderDirection}`;

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
      this.logger?.error('Error finding leads with filters', { error, companyId, filters });
      throw error;
    }
  }

  /**
   * Count leads with filters
   */
  async countWithFilters(companyId: number, filters: LeadFilter): Promise<number> {
    let query = `
      SELECT COUNT(*) as total
      FROM ${this.getFullTableName()} l
      WHERE l.company_id = $1
    `;
    
    const params: any[] = [companyId];
    let paramIndex = 2;

    // Apply same filters as findWithFilters (excluding pagination)
    if (filters.status) {
      query += ` AND l.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.minScore !== undefined) {
      query += ` AND l.score >= $${paramIndex}`;
      params.push(filters.minScore);
      paramIndex++;
    }

    if (filters.assigned_to) {
      query += ` AND l.assigned_to = $${paramIndex}`;
      params.push(filters.assigned_to);
      paramIndex++;
    }

    if (filters.search) {
      query += ` AND (
        l.first_name ILIKE $${paramIndex} OR
        l.last_name ILIKE $${paramIndex} OR
        l.email ILIKE $${paramIndex} OR
        l.company_name ILIKE $${paramIndex}
      )`;
      params.push(`%${filters.search}%`);
    }

    try {
      const result = await this.db.query(query, params);
      return parseInt(result.rows[0].total);
    } catch (error) {
      this.logger?.error('Error counting leads', { error, companyId, filters });
      throw error;
    }
  }

  /**
   * Find duplicate leads by email
   */
  async findDuplicates(email: string, companyId: number, excludeId?: number): Promise<Lead[]> {
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
      this.logger?.error('Error finding duplicate leads', { error, email, companyId });
      throw error;
    }
  }
}