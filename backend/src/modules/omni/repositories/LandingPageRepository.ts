/**
 * Landing Page Repository
 * Sprint N+3: Landing Pages & Email Engagement
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';

export interface ILandingPage {
  landing_page_id: string;
  company_id: number;
  name: string;
  url: string;
  page_type: string;
  form_fields: any[];
  settings: any;
  status: string;
  views_count: number;
  submissions_count: number;
  default_utm?: any;
  created_at: Date;
  updated_at: Date;
  created_by?: number;
}

export interface ILandingPageSubmission {
  submission_id: string;
  landing_page_id: string;
  company_id: number;
  form_data: any;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company_name?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer_url?: string;
  landing_url?: string;
  user_agent?: string;
  ip_address?: string;
  status: string;
  crm_lead_id?: number;
  submitted_at: Date;
  processed_at?: Date;
}

@injectable()
export class LandingPageRepository {
  constructor(
    @inject(TYPES.DatabasePool) private db: Pool,
    @inject(TYPES.Logger) private logger: any
  ) {}

  /**
   * Get landing page by ID
   */
  async findById(landingPageId: string, companyId: number): Promise<ILandingPage | null> {
    const query = `
      SELECT * FROM omni_landing_pages
      WHERE landing_page_id = $1 AND company_id = $2
    `;

    const result = await this.db.query(query, [landingPageId, companyId]);
    return result.rows[0] || null;
  }

  /**
   * Get all landing pages for a company
   */
  async findByCompany(companyId: number, status?: string): Promise<ILandingPage[]> {
    let query = `
      SELECT * FROM omni_landing_pages
      WHERE company_id = $1
    `;
    const params: any[] = [companyId];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Create landing page
   */
  async create(data: Partial<ILandingPage>): Promise<ILandingPage> {
    const query = `
      INSERT INTO omni_landing_pages (
        landing_page_id, company_id, name, url, page_type,
        form_fields, settings, status, default_utm, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const landingPageId = data.landing_page_id || `lp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const result = await this.db.query(query, [
      landingPageId,
      data.company_id,
      data.name,
      data.url,
      data.page_type || 'lead_capture',
      JSON.stringify(data.form_fields || []),
      JSON.stringify(data.settings || {}),
      data.status || 'active',
      data.default_utm ? JSON.stringify(data.default_utm) : null,
      data.created_by
    ]);

    return result.rows[0];
  }

  /**
   * Get submission by ID
   */
  async findSubmissionById(submissionId: string, companyId: number): Promise<ILandingPageSubmission | null> {
    const query = `
      SELECT * FROM omni_landing_page_submissions
      WHERE submission_id = $1 AND company_id = $2
    `;

    const result = await this.db.query(query, [submissionId, companyId]);
    return result.rows[0] || null;
  }

  /**
   * Get recent submissions
   */
  async findRecentSubmissions(
    companyId: number,
    since?: Date,
    limit: number = 50
  ): Promise<ILandingPageSubmission[]> {
    let query = `
      SELECT * FROM omni_landing_page_submissions
      WHERE company_id = $1
    `;
    const params: any[] = [companyId];

    if (since) {
      query += ` AND submitted_at >= $2`;
      params.push(since);
    }

    query += ` ORDER BY submitted_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Get submissions by landing page
   */
  async findSubmissionsByLandingPage(
    landingPageId: string,
    companyId: number,
    limit: number = 100
  ): Promise<ILandingPageSubmission[]> {
    const query = `
      SELECT * FROM omni_landing_page_submissions
      WHERE landing_page_id = $1 AND company_id = $2
      ORDER BY submitted_at DESC
      LIMIT $3
    `;

    const result = await this.db.query(query, [landingPageId, companyId, limit]);
    return result.rows;
  }

  /**
   * Create submission
   */
  async createSubmission(data: Partial<ILandingPageSubmission>): Promise<ILandingPageSubmission> {
    const query = `
      INSERT INTO omni_landing_page_submissions (
        submission_id, landing_page_id, company_id, form_data,
        email, first_name, last_name, phone, company_name,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        referrer_url, landing_url, user_agent, ip_address, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;

    const submissionId = data.submission_id || `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const result = await this.db.query(query, [
      submissionId,
      data.landing_page_id,
      data.company_id,
      JSON.stringify(data.form_data || {}),
      data.email,
      data.first_name,
      data.last_name,
      data.phone,
      data.company_name,
      data.utm_source,
      data.utm_medium,
      data.utm_campaign,
      data.utm_term,
      data.utm_content,
      data.referrer_url,
      data.landing_url,
      data.user_agent,
      data.ip_address,
      data.status || 'new'
    ]);

    this.logger.info('Landing page submission created', {
      submissionId,
      landingPageId: data.landing_page_id,
      email: data.email
    });

    return result.rows[0];
  }

  /**
   * Update submission status
   */
  async updateSubmissionStatus(
    submissionId: string,
    status: string,
    crmLeadId?: number
  ): Promise<void> {
    const query = `
      UPDATE omni_landing_page_submissions
      SET status = $1,
          crm_lead_id = $2,
          processed_at = CASE WHEN $1 = 'crm_synced' THEN CURRENT_TIMESTAMP ELSE processed_at END
      WHERE submission_id = $3
    `;

    await this.db.query(query, [status, crmLeadId, submissionId]);

    this.logger.info('Submission status updated', {
      submissionId,
      status,
      crmLeadId
    });
  }

  /**
   * Get landing page stats
   */
  async getStats(landingPageId: string, companyId: number): Promise<any> {
    const query = `
      SELECT
        COUNT(*) as total_submissions,
        COUNT(*) FILTER (WHERE status = 'crm_synced') as synced_to_crm,
        COUNT(DISTINCT email) as unique_emails,
        COUNT(*) FILTER (WHERE submitted_at >= CURRENT_DATE - INTERVAL '7 days') as submissions_last_7d,
        COUNT(*) FILTER (WHERE submitted_at >= CURRENT_DATE - INTERVAL '30 days') as submissions_last_30d
      FROM omni_landing_page_submissions
      WHERE landing_page_id = $1 AND company_id = $2
    `;

    const result = await this.db.query(query, [landingPageId, companyId]);
    return result.rows[0];
  }
}
