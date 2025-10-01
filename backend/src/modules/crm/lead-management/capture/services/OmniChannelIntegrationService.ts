/**
 * OmniChannel Integration Service
 * Handles lead capture from omnichannel sources
 * Sprint N+1: Real API integration implemented
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import { LeadRepository } from '../../../repositories/LeadRepository';
import { IOmniChannelAdapter, IOmniChannelEvent } from '../../../adapters/IOmniChannelAdapter';
import { omniChannelConfig, getOmniChannelAdapterType } from '../../../config/omnichannel.config';
import { MockOmniChannelAdapter } from '../../../adapters/MockOmniChannelAdapter';
import { StubOmniChannelAdapter } from '../../../adapters/StubOmniChannelAdapter';
import { RealOmniChannelAdapter } from '../../../adapters/RealOmniChannelAdapter';
import { EventEmitter } from 'events';

@injectable()
export class OmniChannelIntegrationService {
  private adapter: IOmniChannelAdapter;
  private eventBus: EventEmitter;

  constructor(
    @inject(TYPES.LeadRepository) private leadRepo: LeadRepository,
    @inject(TYPES.DatabasePool) private db: Pool,
    @inject(TYPES.EventEmitter) eventBus: EventEmitter,
    @inject(TYPES.Logger) private logger: any
  ) {
    this.eventBus = eventBus;
    this.initializeAdapter();
    this.setupEventListeners();
  }

  private initializeAdapter(): void {
    const adapterType = getOmniChannelAdapterType();

    // Sprint N+1: Real API integration implemented
    switch (adapterType) {
      case 'mock':
        this.adapter = new MockOmniChannelAdapter();
        this.logger.info('[OmniChannelIntegration] Using MOCK adapter for development');
        break;
      case 'stub':
        this.adapter = new StubOmniChannelAdapter(this.db);
        this.logger.info('[OmniChannelIntegration] Using STUB adapter - logging only');
        break;
      case 'api':
        // Sprint N+1: Real adapter implemented!
        this.adapter = new RealOmniChannelAdapter(this.logger);
        this.logger.info('[OmniChannelIntegration] Using REAL API adapter - connected to Omni module');
        break;
      default:
        // Default to API adapter in production
        this.adapter = new RealOmniChannelAdapter(this.logger);
        this.logger.info('[OmniChannelIntegration] Using REAL API adapter (default)');
    }
  }

  private setupEventListeners(): void {
    // Subscribe to omnichannel events
    // TODO: OMNICHANNEL - These will be real EventBus subscriptions
    this.adapter.subscribeToEvents((event: IOmniChannelEvent) => {
      this.handleOmniChannelEvent(event);
    });

    // Internal event listeners (these work now)
    this.eventBus.on('lead.manual_capture', this.handleManualCapture.bind(this));
    this.eventBus.on('lead.import', this.handleBulkImport.bind(this));
  }

  private async handleOmniChannelEvent(event: IOmniChannelEvent): Promise<void> {
    console.log('[OmniChannelIntegration] Received event:', event.type);

    // TODO: OMNICHANNEL - Process real events when available
    switch (event.type) {
      case 'conversation.qualified':
        await this.handleQualifiedConversation(event.data);
        break;
      case 'form.submitted':
        await this.handleFormSubmission(event.data);
        break;
      case 'email.engaged':
        await this.handleEmailEngagement(event.data);
        break;
      default:
        console.log('[OmniChannelIntegration] Unknown event type:', event.type);
    }
  }

  async handleQualifiedConversation(data: any): Promise<void> {
    try {
      // TODO: OMNICHANNEL - Get real conversation data
      const conversation = await this.adapter.getConversation(data.conversationId);

      if (!conversation) {
        console.log('[OmniChannelIntegration] Conversation not found, queuing for sync');
        await this.queueForSync('get_conversation', 'conversation', null, data);
        return;
      }

      // Check if lead already exists
      const existingLead = await this.findExistingLead(conversation.customerEmail, data.companyId);

      if (existingLead) {
        // Update engagement
        await this.updateLeadEngagement(existingLead.id, {
          source: 'conversation',
          conversationId: conversation.id
        });

        // Link conversation to lead
        // TODO: OMNICHANNEL - This will actually link when module is ready
        await this.adapter.linkConversationToLead(conversation.id, existingLead.id);
      } else {
        // Create new lead from conversation
        const leadData = this.extractLeadFromConversation(conversation);
        const lead = await this.createLeadWithTracking(
          {
            ...leadData,
            company_id: data.companyId,
            source_verified: false, // Will be true when omnichannel confirms
            manual_entry: false,
            omnichannel_data: { conversationId: conversation.id }
          },
          'conversation'
        );

        // Queue for verification
        await this.queueForSync('verify_lead_source', 'lead', lead.id, {
          conversationId: conversation.id
        });
      }
    } catch (error) {
      console.error('[OmniChannelIntegration] Error handling conversation:', error);
      await this.queueForSync('process_conversation', 'conversation', null, data);
    }
  }

  async handleFormSubmission(data: any): Promise<void> {
    try {
      // TODO: OMNICHANNEL - Get real form submission data
      const submission = await this.adapter.getLandingPageSubmission(data.submissionId);

      if (!submission) {
        console.log('[OmniChannelIntegration] Form submission not found, queuing for sync');
        await this.queueForSync('get_form_submission', 'form', null, data);
        return;
      }

      const leadData = {
        first_name: submission.formData.firstName,
        last_name: submission.formData.lastName,
        email: submission.formData.email,
        phone: submission.formData.phone,
        company_name: submission.formData.company,
        job_title: submission.formData.jobTitle,
        budget: submission.formData.budget,
        timeline: submission.formData.timeline,
        need_description: submission.formData.needs,
        company_id: data.companyId,
        source_verified: false,
        manual_entry: false,
        omnichannel_data: {
          landingPageId: submission.landingPageId,
          utm: submission.utm,
          referrer: submission.referrer
        }
      };

      // Create lead with UTM tracking
      const lead = await this.createLeadWithTracking(leadData, 'landing_page');

      // Save UTM params separately
      if (submission.utm) {
        await this.saveUTMTracking(lead.id, submission.utm, submission.referrer);
      }

      // Queue for verification
      await this.queueForSync('verify_lead_source', 'lead', lead.id, {
        submissionId: submission.id
      });

      // Emit event for scoring
      this.eventBus.emit('lead.created', {
        leadId: lead.id,
        source: 'landing_page',
        formData: submission.formData
      });

    } catch (error) {
      console.error('[OmniChannelIntegration] Error handling form submission:', error);
      await this.queueForSync('process_form_submission', 'form', null, data);
    }
  }

  async handleEmailEngagement(data: any): Promise<void> {
    try {
      const { contactEmail, campaignId, action, linkUrl } = data;

      // Find or create lead
      let lead = await this.leadRepo.findByEmail(contactEmail, data.companyId);

      if (!lead) {
        // Create minimal lead
        lead = await this.leadRepo.create({
          email: contactEmail,
          company_id: data.companyId,
          status: 'new',
          source_verified: false,
          manual_entry: false,
          omnichannel_data: { campaignId, firstAction: action }
        });
      }

      // Track engagement
      await this.trackEngagement(lead.id, {
        event_type: action,
        channel: 'email',
        campaign_id: campaignId,
        content_id: linkUrl,
        score_impact: this.calculateEngagementScore(action)
      });

      // Queue sync
      await this.queueForSync('sync_email_engagement', 'lead', lead.id, {
        engagement: data
      });

    } catch (error) {
      console.error('[OmniChannelIntegration] Error handling email engagement:', error);
    }
  }

  private async handleManualCapture(data: any): Promise<void> {
    // Fallback for manual lead entry
    const lead = await this.leadRepo.create({
      ...data,
      source_verified: false,
      manual_entry: true
    });

    // Queue for potential omnichannel matching
    await this.queueForSync('match_manual_lead', 'lead', lead.id, {
      email: data.email,
      phone: data.phone
    });

    this.eventBus.emit('lead.created', {
      leadId: lead.id,
      source: 'manual',
      manual: true
    });
  }

  private async handleBulkImport(data: any): Promise<void> {
    const { leads, companyId, userId } = data;
    const results = [];

    for (const leadData of leads) {
      try {
        const lead = await this.leadRepo.create({
          ...leadData,
          company_id: companyId,
          created_by: userId,
          source_verified: false,
          manual_entry: true
        });

        results.push({ success: true, leadId: lead.id });

        // Queue for matching
        await this.queueForSync('match_imported_lead', 'lead', lead.id, {
          email: leadData.email
        });

      } catch (error) {
        results.push({ success: false, error: error.message, data: leadData });
      }
    }

    this.eventBus.emit('leads.bulk_import_complete', { results, count: results.length });
  }

  private extractLeadFromConversation(conversation: any): any {
    return {
      email: conversation.customerEmail || conversation.metadata?.email,
      first_name: conversation.metadata?.firstName,
      last_name: conversation.metadata?.lastName,
      phone: conversation.metadata?.phone,
      company_name: conversation.metadata?.company,
      need_description: conversation.messages?.map((m: any) => m.content).join(' ').slice(0, 500)
    };
  }

  private async findExistingLead(email: string, companyId: number): Promise<any> {
    if (!email) return null;
    return this.leadRepo.findByEmail(email, companyId);
  }

  private async createLeadWithTracking(leadData: any, source: string): Promise<any> {
    // Add source information
    const sourceId = await this.getSourceId(source);
    const enrichedData = {
      ...leadData,
      source_id: sourceId,
      status: 'new',
      score: 0
    };

    return this.leadRepo.create(enrichedData);
  }

  private async updateLeadEngagement(leadId: number, engagement: any): Promise<void> {
    const query = `
      INSERT INTO lead_engagement_events
      (lead_id, event_type, channel, event_action, occurred_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `;

    await this.db.query(query, [
      leadId,
      'conversation',
      engagement.source,
      JSON.stringify(engagement)
    ]);
  }

  private async trackEngagement(leadId: number, engagement: any): Promise<void> {
    const query = `
      INSERT INTO lead_engagement_events
      (lead_id, event_type, event_category, channel, campaign_id,
       content_id, score_impact, occurred_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    `;

    await this.db.query(query, [
      leadId,
      engagement.event_type,
      engagement.event_category || 'interaction',
      engagement.channel,
      engagement.campaign_id,
      engagement.content_id,
      engagement.score_impact || 0
    ]);
  }

  private async saveUTMTracking(leadId: number, utm: any, referrer?: string): Promise<void> {
    const query = `
      INSERT INTO lead_source_tracking
      (lead_id, utm_source, utm_medium, utm_campaign, utm_term,
       utm_content, referrer_url, tracked_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    `;

    await this.db.query(query, [
      leadId,
      utm.source,
      utm.medium,
      utm.campaign,
      utm.term,
      utm.content,
      referrer
    ]);
  }

  private calculateEngagementScore(action: string): number {
    const scores: Record<string, number> = {
      'email_open': 5,
      'link_click': 10,
      'form_submit': 20,
      'download': 15,
      'video_watch': 12,
      'page_visit': 3,
      'reply': 25,
      'meeting_scheduled': 30
    };

    return scores[action] || 1;
  }

  private async getSourceId(sourceName: string): Promise<number | null> {
    // This would normally look up the source from a sources table
    // For now, return null and let the database handle it
    return null;
  }

  private async queueForSync(
    action: string,
    entityType: string,
    entityId: number | null,
    data: any
  ): Promise<void> {
    const query = `
      INSERT INTO pending_omnichannel_sync
      (action, entity_type, entity_id, data, company_id, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `;

    await this.db.query(query, [
      action,
      entityType,
      entityId,
      JSON.stringify(data),
      data.companyId || null
    ]);
  }
}