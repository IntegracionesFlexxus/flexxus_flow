/**
 * Contact Role Repository
 * Data access layer for contact role management
 */

import { injectable, inject, optional } from 'inversify';
import { CRMBaseRepository } from './CRMBaseRepository';
import { TYPES } from '@/container/types';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { Logger } from 'winston';
// TODO: Create missing types file
// import { ContactRole } from '../types/contact.types';

@injectable()
export class ContactRoleRepository extends CRMBaseRepository<any> {
  constructor(
    @inject(TYPES.SharedConnection) db: IDatabaseConnection,
    @inject(TYPES.Logger) @optional() logger?: Logger
  ) {
    super('contact_roles', db, logger);
    this.schema = 'public'; // Sprint 17 uses public schema

    this.allowedFields = new Set([
      'id', 'company_id', 'contact_id', 'account_id', 'role_type',
      'decision_authority', 'influence_level', 'engagement_level',
      'is_primary', 'department', 'reports_to', 'start_date', 'end_date',
      'notes', 'metadata', 'created_at', 'updated_at', 'created_by', 'updated_by'
    ]);
  }

  /**
   * Get contact roles by contact
   */
  async getContactRoles(
    companyId: number,
    contactId: number
  ): Promise<any[]> {
    const query = `
      SELECT
        cr.*,
        a.name as account_name,
        rt.name as role_type_name
      FROM ${this.schema}.${this.tableName} cr
      LEFT JOIN ${this.schema}.accounts a ON cr.account_id = a.id
      LEFT JOIN ${this.schema}.role_types rt ON cr.role_type = rt.code
      WHERE cr.company_id = $1 AND cr.contact_id = $2
        AND (cr.end_date IS NULL OR cr.end_date > CURRENT_DATE)
      ORDER BY cr.is_primary DESC, cr.influence_level DESC
    `;

    const result = await this.db.query(query, [companyId, contactId]);
    return result.rows;
  }

  /**
   * Get contact roles by account
   */
  async getAccountContactRoles(
    companyId: number,
    accountId: number
  ): Promise<any[]> {
    const query = `
      SELECT
        cr.*,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.title as contact_title
      FROM ${this.schema}.${this.tableName} cr
      JOIN ${this.schema}.contacts c ON cr.contact_id = c.id
      WHERE cr.company_id = $1 AND cr.account_id = $2
        AND (cr.end_date IS NULL OR cr.end_date > CURRENT_DATE)
      ORDER BY cr.decision_authority DESC, cr.influence_level DESC
    `;

    const result = await this.db.query(query, [companyId, accountId]);
    return result.rows;
  }

  /**
   * Get buying committee by opportunity
   */
  async getBuyingCommitteeByOpportunity(
    companyId: number,
    opportunityId: number
  ): Promise<any> {
    const query = `
      SELECT
        bc.*,
        o.name as opportunity_name,
        a.name as account_name,
        COUNT(bcm.id) as member_count
      FROM ${this.schema}.buying_committees bc
      JOIN ${this.schema}.opportunities o ON bc.opportunity_id = o.id
      JOIN ${this.schema}.accounts a ON o.account_id = a.id
      LEFT JOIN ${this.schema}.buying_committee_members bcm ON bc.id = bcm.committee_id
      WHERE bc.company_id = $1 AND bc.opportunity_id = $2
      GROUP BY bc.id, o.name, a.name
    `;

    const result = await this.db.query(query, [companyId, opportunityId]);
    return result.rows[0] || null;
  }

  /**
   * Get buying committee members
   */
  async getBuyingCommitteeMembers(
    companyId: number,
    committeeId: number
  ): Promise<any[]> {
    const query = `
      SELECT
        bcm.*,
        c.first_name,
        c.last_name,
        c.email,
        c.title,
        cr.role_type,
        cr.decision_authority,
        cr.influence_level
      FROM ${this.schema}.buying_committee_members bcm
      JOIN ${this.schema}.contacts c ON bcm.contact_id = c.id
      LEFT JOIN ${this.schema}.contact_roles cr ON c.id = cr.contact_id
        AND cr.account_id = (
          SELECT o.account_id
          FROM ${this.schema}.buying_committees bc
          JOIN ${this.schema}.opportunities o ON bc.opportunity_id = o.id
          WHERE bc.id = $2
        )
      WHERE bcm.company_id = $1 AND bcm.committee_id = $2
      ORDER BY bcm.role_in_committee, cr.influence_level DESC
    `;

    const result = await this.db.query(query, [companyId, committeeId]);
    return result.rows;
  }

  /**
   * Create buying committee
   */
  async createBuyingCommittee(
    companyId: number,
    data: any
  ): Promise<any> {
    const query = `
      INSERT INTO ${this.schema}.buying_committees (
        company_id, opportunity_id, name, status, decision_criteria,
        budget_range, timeline, metadata, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      companyId,
      data.opportunity_id,
      data.name,
      data.status || 'forming',
      JSON.stringify(data.decision_criteria || {}),
      data.budget_range,
      data.timeline,
      JSON.stringify(data.metadata || {}),
      data.created_by
    ]);

    return result.rows[0];
  }

  /**
   * Add member to buying committee
   */
  async addMemberToCommittee(
    companyId: number,
    committeeId: number,
    data: any
  ): Promise<any> {
    const query = `
      INSERT INTO ${this.schema}.buying_committee_members (
        company_id, committee_id, contact_id, role_in_committee,
        influence_score, engagement_status, notes, added_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      companyId,
      committeeId,
      data.contact_id,
      data.role_in_committee,
      data.influence_score || 5,
      data.engagement_status || 'not_engaged',
      data.notes,
      data.added_by
    ]);

    return result.rows[0];
  }

  /**
   * Get influence map for account
   */
  async getInfluenceMap(
    companyId: number,
    accountId: number
  ): Promise<any> {
    const query = `
      WITH influence_data AS (
        SELECT
          c.id as contact_id,
          c.first_name,
          c.last_name,
          c.title,
          cr.role_type,
          cr.decision_authority,
          cr.influence_level,
          cr.department,
          cr.reports_to,
          COUNT(DISTINCT bcm.committee_id) as committee_count,
          AVG(bcm.influence_score) as avg_committee_influence
        FROM ${this.schema}.contacts c
        JOIN ${this.schema}.contact_roles cr ON c.id = cr.contact_id
        LEFT JOIN ${this.schema}.buying_committee_members bcm ON c.id = bcm.contact_id
        WHERE c.company_id = $1 AND cr.account_id = $2
          AND (cr.end_date IS NULL OR cr.end_date > CURRENT_DATE)
        GROUP BY c.id, c.first_name, c.last_name, c.title,
                 cr.role_type, cr.decision_authority, cr.influence_level,
                 cr.department, cr.reports_to
      )
      SELECT
        *,
        (decision_authority * 0.4 + influence_level * 0.3 +
         COALESCE(avg_committee_influence, 5) * 0.3) as overall_influence
      FROM influence_data
      ORDER BY overall_influence DESC
    `;

    const result = await this.db.query(query, [companyId, accountId]);
    return this.buildInfluenceHierarchy(result.rows);
  }

  /**
   * Get role effectiveness metrics
   */
  async getRoleEffectivenessMetrics(
    companyId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const query = `
      SELECT
        cr.role_type,
        COUNT(DISTINCT cr.contact_id) as contact_count,
        AVG(cr.influence_level) as avg_influence,
        AVG(cr.decision_authority) as avg_authority,
        COUNT(DISTINCT bcm.committee_id) as committees_involved,
        COUNT(DISTINCT o.id) as opportunities_influenced,
        COUNT(DISTINCT CASE WHEN o.stage = 'closed_won' THEN o.id END) as won_deals,
        SUM(CASE WHEN o.stage = 'closed_won' THEN o.expected_revenue ELSE 0 END) as revenue_influenced
      FROM ${this.schema}.contact_roles cr
      LEFT JOIN ${this.schema}.buying_committee_members bcm ON cr.contact_id = bcm.contact_id
      LEFT JOIN ${this.schema}.buying_committees bc ON bcm.committee_id = bc.id
      LEFT JOIN ${this.schema}.opportunities o ON bc.opportunity_id = o.id
        AND ($2::timestamp IS NULL OR o.closed_at >= $2)
        AND ($3::timestamp IS NULL OR o.closed_at <= $3)
      WHERE cr.company_id = $1
      GROUP BY cr.role_type
      ORDER BY revenue_influenced DESC
    `;

    const result = await this.db.query(query, [
      companyId,
      startDate || null,
      endDate || null
    ]);

    return result.rows;
  }

  /**
   * Analyze contact influence
   */
  async analyzeContactInfluence(
    companyId: number,
    contactId: number
  ): Promise<any> {
    const query = `
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        cr.influence_level,
        cr.decision_authority,
        cr.engagement_level,
        COUNT(DISTINCT bcm.committee_id) as committees,
        COUNT(DISTINCT o.id) as opportunities,
        COUNT(DISTINCT CASE WHEN o.stage = 'closed_won' THEN o.id END) as won_deals,
        COUNT(DISTINCT CASE WHEN o.stage = 'closed_lost' THEN o.id END) as lost_deals,
        SUM(CASE WHEN o.stage = 'closed_won' THEN o.expected_revenue ELSE 0 END) as revenue_influenced,
        AVG(CASE WHEN o.stage IN ('closed_won', 'closed_lost')
            THEN EXTRACT(EPOCH FROM (o.closed_at - o.created_at)) / 86400
            ELSE NULL END) as avg_deal_cycle_days
      FROM ${this.schema}.contacts c
      LEFT JOIN ${this.schema}.contact_roles cr ON c.id = cr.contact_id
      LEFT JOIN ${this.schema}.buying_committee_members bcm ON c.id = bcm.contact_id
      LEFT JOIN ${this.schema}.buying_committees bc ON bcm.committee_id = bc.id
      LEFT JOIN ${this.schema}.opportunities o ON bc.opportunity_id = o.id
      WHERE c.company_id = $1 AND c.id = $2
      GROUP BY c.id, c.first_name, c.last_name,
               cr.influence_level, cr.decision_authority, cr.engagement_level
    `;

    const result = await this.db.query(query, [companyId, contactId]);
    return result.rows[0] || null;
  }

  /**
   * Build influence hierarchy
   */
  private buildInfluenceHierarchy(contacts: any[]): any {
    const hierarchy: any = {
      executives: [],
      decision_makers: [],
      influencers: [],
      users: [],
      unknown: []
    };

    contacts.forEach(contact => {
      if (contact.decision_authority >= 9) {
        hierarchy.executives.push(contact);
      } else if (contact.decision_authority >= 7) {
        hierarchy.decision_makers.push(contact);
      } else if (contact.influence_level >= 6) {
        hierarchy.influencers.push(contact);
      } else if (contact.role_type === 'user') {
        hierarchy.users.push(contact);
      } else {
        hierarchy.unknown.push(contact);
      }
    });

    return {
      hierarchy,
      stats: {
        total_contacts: contacts.length,
        avg_influence: contacts.reduce((sum, c) => sum + c.overall_influence, 0) / contacts.length,
        departments: [...new Set(contacts.map(c => c.department).filter(Boolean))]
      }
    };
  }
}