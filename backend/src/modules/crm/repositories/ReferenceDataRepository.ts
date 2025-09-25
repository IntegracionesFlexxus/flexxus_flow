/**
 * Reference Data Repository
 * Manages CRM reference data (industries, lead sources, sales stages, etc.)
 */

import { injectable, inject } from 'inversify';
import { CRMBaseRepository } from './CRMBaseRepository';
import { TYPES } from '@/container/types';

@injectable()
export class ReferenceDataRepository extends CRMBaseRepository<any> {
  constructor(
    @inject(TYPES.CRMDatabaseConnection) db: any,
    @inject(TYPES.Logger) logger?: any
  ) {
    super('', db, logger); // No default table
  }

  /**
   * Get all industries
   */
  async getIndustries(companyId?: number): Promise<any[]> {
    const query = `
      SELECT * FROM public.industries
      WHERE is_active = true
      ${companyId ? 'AND (company_id IS NULL OR company_id = $1)' : ''}
      ORDER BY name
    `;

    const params = companyId ? [companyId] : [];
    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Get all lead sources
   */
  async getLeadSources(companyId?: number): Promise<any[]> {
    const query = `
      SELECT * FROM public.lead_sources
      WHERE is_active = true
      ${companyId ? 'AND (company_id IS NULL OR company_id = $1)' : ''}
      ORDER BY name
    `;

    const params = companyId ? [companyId] : [];
    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Get all sales stages
   */
  async getSalesStages(companyId: number): Promise<any[]> {
    const query = `
      SELECT * FROM public.sales_stages
      WHERE company_id = $1 AND is_active = true
      ORDER BY order_position
    `;

    const result = await this.db.query(query, [companyId]);
    return result.rows;
  }

  /**
   * Get all VAT conditions
   */
  async getVatConditions(): Promise<any[]> {
    const query = `
      SELECT * FROM public.vat_conditions
      WHERE is_active = true
      ORDER BY name
    `;

    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Get all cities with regions
   */
  async getCitiesWithRegions(regionId?: number): Promise<any[]> {
    let query = `
      SELECT c.*, r.name as region_name
      FROM public.cities c
      JOIN public.regions r ON c.region_id = r.id
      WHERE c.is_active = true
    `;

    const params: any[] = [];

    if (regionId) {
      query += ` AND c.region_id = $1`;
      params.push(regionId);
    }

    query += ` ORDER BY c.name`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Get all regions
   */
  async getRegions(): Promise<any[]> {
    const query = `
      SELECT * FROM public.regions
      WHERE is_active = true
      ORDER BY name
    `;

    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Get all activity types
   */
  async getActivityTypes(companyId?: number): Promise<any[]> {
    const query = `
      SELECT DISTINCT type as value,
        CASE type
          WHEN 'task' THEN 'Task'
          WHEN 'call' THEN 'Call'
          WHEN 'meeting' THEN 'Meeting'
          WHEN 'email' THEN 'Email'
          ELSE type
        END as label
      FROM public.activities
      ${companyId ? 'WHERE company_id = $1' : ''}
      ORDER BY label
    `;

    const params = companyId ? [companyId] : [];
    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Get all product categories
   */
  async getProductCategories(companyId: number): Promise<any[]> {
    const query = `
      SELECT * FROM public.product_categories
      WHERE company_id = $1 AND is_active = true
      ORDER BY name
    `;

    const result = await this.db.query(query, [companyId]);
    return result.rows;
  }

  /**
   * Get forecast categories
   */
  async getForecastCategories(): Promise<any[]> {
    return [
      { value: 'pipeline', label: 'Pipeline' },
      { value: 'best_case', label: 'Best Case' },
      { value: 'commit', label: 'Commit' },
      { value: 'closed', label: 'Closed' }
    ];
  }

  /**
   * Get opportunity types
   */
  async getOpportunityTypes(): Promise<any[]> {
    return [
      { value: 'new_business', label: 'New Business' },
      { value: 'existing_business', label: 'Existing Business' },
      { value: 'renewal', label: 'Renewal' }
    ];
  }

  /**
   * Get account types
   */
  async getAccountTypes(): Promise<any[]> {
    return [
      { value: 'customer', label: 'Customer' },
      { value: 'prospect', label: 'Prospect' },
      { value: 'partner', label: 'Partner' },
      { value: 'competitor', label: 'Competitor' },
      { value: 'vendor', label: 'Vendor' },
      { value: 'other', label: 'Other' }
    ];
  }

  /**
   * Get account ratings
   */
  async getAccountRatings(): Promise<any[]> {
    return [
      { value: 'hot', label: 'Hot' },
      { value: 'warm', label: 'Warm' },
      { value: 'cold', label: 'Cold' }
    ];
  }

  /**
   * Get authority levels
   */
  async getAuthorityLevels(): Promise<any[]> {
    return [
      { value: 'decision_maker', label: 'Decision Maker' },
      { value: 'influencer', label: 'Influencer' },
      { value: 'evaluator', label: 'Evaluator' },
      { value: 'user', label: 'User' },
      { value: 'unknown', label: 'Unknown' }
    ];
  }

  /**
   * Get timeline options
   */
  async getTimelines(): Promise<any[]> {
    return [
      { value: 'immediate', label: 'Immediate' },
      { value: 'this_quarter', label: 'This Quarter' },
      { value: 'next_quarter', label: 'Next Quarter' },
      { value: 'this_year', label: 'This Year' },
      { value: 'next_year', label: 'Next Year' },
      { value: 'unknown', label: 'Unknown' }
    ];
  }

  /**
   * Get lead statuses
   */
  async getLeadStatuses(): Promise<any[]> {
    return [
      { value: 'new', label: 'New' },
      { value: 'contacted', label: 'Contacted' },
      { value: 'qualified', label: 'Qualified' },
      { value: 'disqualified', label: 'Disqualified' },
      { value: 'converted', label: 'Converted' }
    ];
  }

  /**
   * Get activity priorities
   */
  async getActivityPriorities(): Promise<any[]> {
    return [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'urgent', label: 'Urgent' }
    ];
  }

  /**
   * Get activity statuses
   */
  async getActivityStatuses(): Promise<any[]> {
    return [
      { value: 'pending', label: 'Pending' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' }
    ];
  }

  /**
   * Create or update reference data
   */
  async upsertReferenceData(
    table: string,
    data: any,
    uniqueField: string = 'name'
  ): Promise<any> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
    const updateSet = fields
      .filter(f => f !== uniqueField)
      .map(f => `${f} = EXCLUDED.${f}`)
      .join(', ');

    const query = `
      INSERT INTO public.${table} (${fields.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (${uniqueField}) DO UPDATE
      SET ${updateSet}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get all reference data for CRM
   */
  async getAllReferenceData(companyId: number): Promise<any> {
    const [
      industries,
      leadSources,
      salesStages,
      vatConditions,
      regions,
      productCategories,
      forecastCategories,
      opportunityTypes,
      accountTypes,
      accountRatings,
      authorityLevels,
      timelines,
      leadStatuses,
      activityPriorities,
      activityStatuses,
      activityTypes
    ] = await Promise.all([
      this.getIndustries(companyId),
      this.getLeadSources(companyId),
      this.getSalesStages(companyId),
      this.getVatConditions(),
      this.getRegions(),
      this.getProductCategories(companyId),
      this.getForecastCategories(),
      this.getOpportunityTypes(),
      this.getAccountTypes(),
      this.getAccountRatings(),
      this.getAuthorityLevels(),
      this.getTimelines(),
      this.getLeadStatuses(),
      this.getActivityPriorities(),
      this.getActivityStatuses(),
      this.getActivityTypes(companyId)
    ]);

    return {
      industries,
      leadSources,
      salesStages,
      vatConditions,
      regions,
      productCategories,
      forecastCategories,
      opportunityTypes,
      accountTypes,
      accountRatings,
      authorityLevels,
      timelines,
      leadStatuses,
      activityPriorities,
      activityStatuses,
      activityTypes
    };
  }
}