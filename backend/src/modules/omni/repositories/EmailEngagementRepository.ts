/**
 * Email Engagement Repository
 * Sprint N+3: Landing Pages & Email Engagement
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';

export interface IEmailCampaign {
  campaign_id: string;
  company_id: number;
  name: string;
  subject?: string;
  campaign_type: string;
  html_content?: string;
  text_content?: string;
  from_email: string;
  from_name?: string;
  reply_to_email?: string;
  status: string;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  unsubscribed_count: number;
  scheduled_at?: Date;
  sent_at?: Date;
  created_at: Date;
  updated_at: Date;
  created_by?: number;
  settings?: any;
}

export interface IEmailEngagementEvent {
  event_id?: number;
  campaign_id?: string;
  company_id: number;
  contact_email: string;
  contact_id?: string;
  event_type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed' | 'spam_report';
  event_action?: string;
  link_url?: string;
  link_id?: string;
  user_agent?: string;
  ip_address?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  bounce_type?: string;
  bounce_reason?: string;
  occurred_at: Date;
  crm_lead_id?: number;
}

export interface IEmailContactScore {
  contact_email: string;
  company_id: number;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  emails_bounced: number;
  engagement_score: number;
  open_rate?: number;
  click_rate?: number;
  first_sent_at?: Date;
  last_opened_at?: Date;
  last_clicked_at?: Date;
  last_engagement_at?: Date;
  is_active: boolean;
  is_unsubscribed: boolean;
  unsubscribed_at?: Date;
  updated_at: Date;
}

@injectable()
export class EmailEngagementRepository {
  constructor(
    @inject(TYPES.DatabasePool) private db: Pool,
    @inject(TYPES.Logger) private logger: any
  ) {}

  /**
   * Get campaign by ID
   */
  async findCampaignById(campaignId: string, companyId: number): Promise<IEmailCampaign | null> {
    const query = `
      SELECT * FROM omni_email_campaigns
      WHERE campaign_id = $1 AND company_id = $2
    `;

    const result = await this.db.query(query, [campaignId, companyId]);
    return result.rows[0] || null;
  }

  /**
   * Get all campaigns for a company
   */
  async findCampaignsByCompany(companyId: number, status?: string): Promise<IEmailCampaign[]> {
    let query = `
      SELECT * FROM omni_email_campaigns
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
   * Create campaign
   */
  async createCampaign(data: Partial<IEmailCampaign>): Promise<IEmailCampaign> {
    const query = `
      INSERT INTO omni_email_campaigns (
        campaign_id, company_id, name, subject, campaign_type,
        html_content, text_content, from_email, from_name, reply_to_email,
        status, settings, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const campaignId = data.campaign_id || `camp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const result = await this.db.query(query, [
      campaignId,
      data.company_id,
      data.name,
      data.subject,
      data.campaign_type || 'marketing',
      data.html_content,
      data.text_content,
      data.from_email,
      data.from_name,
      data.reply_to_email,
      data.status || 'draft',
      data.settings ? JSON.stringify(data.settings) : null,
      data.created_by
    ]);

    return result.rows[0];
  }

  /**
   * Track engagement event
   */
  async trackEvent(data: Partial<IEmailEngagementEvent>): Promise<IEmailEngagementEvent> {
    const query = `
      INSERT INTO omni_email_engagement_events (
        campaign_id, company_id, contact_email, contact_id, event_type, event_action,
        link_url, link_id, user_agent, ip_address, device_type, browser, os,
        country, city, bounce_type, bounce_reason, occurred_at, crm_lead_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      data.campaign_id,
      data.company_id,
      data.contact_email,
      data.contact_id,
      data.event_type,
      data.event_action,
      data.link_url,
      data.link_id,
      data.user_agent,
      data.ip_address,
      data.device_type,
      data.browser,
      data.os,
      data.country,
      data.city,
      data.bounce_type,
      data.bounce_reason,
      data.occurred_at || new Date(),
      data.crm_lead_id
    ]);

    this.logger.info('Email engagement event tracked', {
      contactEmail: data.contact_email,
      eventType: data.event_type,
      campaignId: data.campaign_id
    });

    return result.rows[0];
  }

  /**
   * Get engagement events by email
   */
  async findEventsByEmail(
    email: string,
    companyId: number,
    eventType?: string,
    limit: number = 100
  ): Promise<IEmailEngagementEvent[]> {
    let query = `
      SELECT * FROM omni_email_engagement_events
      WHERE contact_email = $1 AND company_id = $2
    `;
    const params: any[] = [email, companyId];

    if (eventType) {
      query += ` AND event_type = $3`;
      params.push(eventType);
    }

    query += ` ORDER BY occurred_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Get engagement events by campaign
   */
  async findEventsByCampaign(
    campaignId: string,
    companyId: number,
    eventType?: string,
    limit: number = 1000
  ): Promise<IEmailEngagementEvent[]> {
    let query = `
      SELECT * FROM omni_email_engagement_events
      WHERE campaign_id = $1 AND company_id = $2
    `;
    const params: any[] = [campaignId, companyId];

    if (eventType) {
      query += ` AND event_type = $3`;
      params.push(eventType);
    }

    query += ` ORDER BY occurred_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Get recent engagement events
   */
  async findRecentEvents(
    companyId: number,
    since?: Date,
    limit: number = 100
  ): Promise<IEmailEngagementEvent[]> {
    let query = `
      SELECT * FROM omni_email_engagement_events
      WHERE company_id = $1
    `;
    const params: any[] = [companyId];

    if (since) {
      query += ` AND occurred_at >= $2`;
      params.push(since);
    }

    query += ` ORDER BY occurred_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Get contact score
   */
  async findContactScore(email: string, companyId: number): Promise<IEmailContactScore | null> {
    const query = `
      SELECT * FROM omni_email_contact_scores
      WHERE contact_email = $1 AND company_id = $2
    `;

    const result = await this.db.query(query, [email, companyId]);
    return result.rows[0] || null;
  }

  /**
   * Get top engaged contacts
   */
  async findTopEngagedContacts(companyId: number, limit: number = 50): Promise<IEmailContactScore[]> {
    const query = `
      SELECT * FROM omni_email_contact_scores
      WHERE company_id = $1 AND is_active = true AND is_unsubscribed = false
      ORDER BY engagement_score DESC, last_engagement_at DESC
      LIMIT $2
    `;

    const result = await this.db.query(query, [companyId, limit]);
    return result.rows;
  }

  /**
   * Get campaign performance summary
   */
  async getCampaignPerformance(campaignId: string, companyId: number): Promise<any> {
    const query = `
      SELECT * FROM omni_email_campaign_performance
      WHERE campaign_id = $1 AND company_id = $2
    `;

    const result = await this.db.query(query, [campaignId, companyId]);
    return result.rows[0];
  }

  /**
   * Get engagement summary by email
   */
  async getEmailEngagementSummary(email: string, companyId: number): Promise<any> {
    const query = `
      SELECT
        contact_email,
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE event_type = 'opened') as opens,
        COUNT(*) FILTER (WHERE event_type = 'clicked') as clicks,
        COUNT(DISTINCT campaign_id) as campaigns_received,
        MAX(occurred_at) as last_engagement,
        MIN(occurred_at) as first_engagement
      FROM omni_email_engagement_events
      WHERE contact_email = $1 AND company_id = $2
      GROUP BY contact_email
    `;

    const result = await this.db.query(query, [email, companyId]);
    return result.rows[0];
  }
}
