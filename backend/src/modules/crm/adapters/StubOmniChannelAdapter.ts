/**
 * Stub Implementation of OmniChannel Adapter
 * TODO: OMNICHANNEL - Replace with ApiOmniChannelAdapter when ready
 * This stub logs all calls but returns empty data
 */

import { injectable } from 'inversify';
import {
  IOmniChannelAdapter,
  IConversation,
  ILandingPageSubmission,
  IEmailEngagement,
  IOmniChannelEvent
} from './IOmniChannelAdapter';
import { Pool } from 'pg';

@injectable()
export class StubOmniChannelAdapter implements IOmniChannelAdapter {
  constructor(private db: Pool) {}

  async getConversation(conversationId: string): Promise<IConversation | null> {
    await this.logCall('getConversation', { conversationId });
    // TODO: OMNICHANNEL - Implement actual API call
    return null;
  }

  async getQualifiedConversations(since?: Date): Promise<IConversation[]> {
    await this.logCall('getQualifiedConversations', { since });
    // TODO: OMNICHANNEL - Implement actual API call
    return [];
  }

  async linkConversationToLead(conversationId: string, leadId: number): Promise<void> {
    await this.logCall('linkConversationToLead', { conversationId, leadId });
    // Save to pending sync table
    await this.db.query(
      `INSERT INTO pending_omnichannel_sync
       (action, entity_type, entity_id, data, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      ['link_conversation', 'lead', leadId, JSON.stringify({ conversationId })]
    );
    // TODO: OMNICHANNEL - Implement actual API call
  }

  async getLandingPageSubmission(submissionId: string): Promise<ILandingPageSubmission | null> {
    await this.logCall('getLandingPageSubmission', { submissionId });
    // TODO: OMNICHANNEL - Implement actual API call
    return null;
  }

  async getRecentSubmissions(since?: Date): Promise<ILandingPageSubmission[]> {
    await this.logCall('getRecentSubmissions', { since });
    // TODO: OMNICHANNEL - Implement actual API call
    return [];
  }

  async getEmailEngagements(email: string): Promise<IEmailEngagement[]> {
    await this.logCall('getEmailEngagements', { email });
    // TODO: OMNICHANNEL - Implement actual API call
    return [];
  }

  async trackEmailEngagement(engagement: IEmailEngagement): Promise<void> {
    await this.logCall('trackEmailEngagement', engagement);
    // Save to pending sync table
    await this.db.query(
      `INSERT INTO pending_omnichannel_sync
       (action, entity_type, entity_id, data, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      ['track_engagement', 'email', null, JSON.stringify(engagement)]
    );
    // TODO: OMNICHANNEL - Implement actual API call
  }

  subscribeToEvents(eventHandler: (event: IOmniChannelEvent) => void): void {
    console.log('[StubOmniChannelAdapter] Event subscription requested but not implemented');
    // TODO: OMNICHANNEL - Implement actual event subscription
  }

  unsubscribeFromEvents(): void {
    console.log('[StubOmniChannelAdapter] Event unsubscription requested but not implemented');
    // TODO: OMNICHANNEL - Implement actual event unsubscription
  }

  private async logCall(method: string, params: any): Promise<void> {
    console.log(`[StubOmniChannelAdapter] Called: ${method}`, params);

    // Log to database for tracking
    try {
      await this.db.query(
        `INSERT INTO pending_omnichannel_sync
         (action, entity_type, data, created_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [`stub_call_${method}`, 'adapter', JSON.stringify(params)]
      );
    } catch (error) {
      console.error('Failed to log stub call:', error);
    }
  }
}