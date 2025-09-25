/**
 * Mock Implementation of OmniChannel Adapter
 * TODO: OMNICHANNEL - Remove when real integration is available
 * This mock provides fake data for development and testing
 */

import { injectable } from 'inversify';
import {
  IOmniChannelAdapter,
  IConversation,
  ILandingPageSubmission,
  IEmailEngagement,
  IOmniChannelEvent
} from './IOmniChannelAdapter';

@injectable()
export class MockOmniChannelAdapter implements IOmniChannelAdapter {
  private eventHandlers: Array<(event: IOmniChannelEvent) => void> = [];
  private mockConversations: Map<string, IConversation> = new Map();
  private mockSubmissions: Map<string, ILandingPageSubmission> = new Map();

  constructor() {
    this.initializeMockData();
    // TODO: OMNICHANNEL - Remove mock data generation
    this.simulateEvents();
  }

  private initializeMockData(): void {
    // Create some mock conversations
    this.mockConversations.set('conv-001', {
      id: 'conv-001',
      customerEmail: 'john.doe@techcorp.com',
      messages: [
        {
          content: 'Hi, I need information about your enterprise plan',
          sender: 'customer',
          timestamp: new Date('2024-01-15T10:00:00Z')
        },
        {
          content: 'Sure, I can help you with that. What specific features are you looking for?',
          sender: 'agent',
          timestamp: new Date('2024-01-15T10:02:00Z')
        },
        {
          content: 'We need API access and custom integrations',
          sender: 'customer',
          timestamp: new Date('2024-01-15T10:05:00Z')
        }
      ],
      metadata: {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1-555-0123',
        company: 'TechCorp Inc.',
        email: 'john.doe@techcorp.com'
      },
      qualified: true,
      createdAt: new Date('2024-01-15T10:00:00Z')
    });

    // Create mock landing page submissions
    this.mockSubmissions.set('sub-001', {
      id: 'sub-001',
      landingPageId: 'lp-enterprise',
      formData: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@innovate.io',
        phone: '+1-555-0456',
        company: 'Innovate Solutions',
        jobTitle: 'CTO',
        budget: 50000,
        timeline: 'immediate',
        needs: 'Looking for a comprehensive CRM solution with automation capabilities'
      },
      utm: {
        source: 'google',
        medium: 'cpc',
        campaign: 'enterprise-q1-2024',
        term: 'crm software',
        content: 'header-cta'
      },
      referrer: 'https://www.google.com',
      submittedAt: new Date('2024-01-15T14:30:00Z')
    });
  }

  async getConversation(conversationId: string): Promise<IConversation | null> {
    console.log(`[MockOmniChannelAdapter] Getting conversation: ${conversationId}`);
    // TODO: OMNICHANNEL - Replace with actual API call
    return this.mockConversations.get(conversationId) || null;
  }

  async getQualifiedConversations(since?: Date): Promise<IConversation[]> {
    console.log('[MockOmniChannelAdapter] Getting qualified conversations');
    // TODO: OMNICHANNEL - Replace with actual API call
    const conversations = Array.from(this.mockConversations.values());

    if (since) {
      return conversations.filter(conv =>
        conv.qualified && conv.createdAt >= since
      );
    }

    return conversations.filter(conv => conv.qualified);
  }

  async linkConversationToLead(conversationId: string, leadId: number): Promise<void> {
    console.log(`[MockOmniChannelAdapter] Linking conversation ${conversationId} to lead ${leadId}`);
    // TODO: OMNICHANNEL - Implement actual linking logic
    // For now, just log the action
  }

  async getLandingPageSubmission(submissionId: string): Promise<ILandingPageSubmission | null> {
    console.log(`[MockOmniChannelAdapter] Getting submission: ${submissionId}`);
    // TODO: OMNICHANNEL - Replace with actual API call
    return this.mockSubmissions.get(submissionId) || null;
  }

  async getRecentSubmissions(since?: Date): Promise<ILandingPageSubmission[]> {
    console.log('[MockOmniChannelAdapter] Getting recent submissions');
    // TODO: OMNICHANNEL - Replace with actual API call
    const submissions = Array.from(this.mockSubmissions.values());

    if (since) {
      return submissions.filter(sub => sub.submittedAt >= since);
    }

    return submissions;
  }

  async getEmailEngagements(email: string): Promise<IEmailEngagement[]> {
    console.log(`[MockOmniChannelAdapter] Getting email engagements for: ${email}`);
    // TODO: OMNICHANNEL - Replace with actual API call

    // Return mock engagement data
    return [
      {
        contactEmail: email,
        campaignId: 'camp-001',
        action: 'open',
        timestamp: new Date('2024-01-14T09:00:00Z')
      },
      {
        contactEmail: email,
        campaignId: 'camp-001',
        action: 'click',
        linkUrl: 'https://example.com/demo',
        timestamp: new Date('2024-01-14T09:05:00Z')
      }
    ];
  }

  async trackEmailEngagement(engagement: IEmailEngagement): Promise<void> {
    console.log('[MockOmniChannelAdapter] Tracking email engagement:', engagement);
    // TODO: OMNICHANNEL - Implement actual tracking
  }

  subscribeToEvents(eventHandler: (event: IOmniChannelEvent) => void): void {
    console.log('[MockOmniChannelAdapter] Subscribing to events');
    // TODO: OMNICHANNEL - Replace with actual event subscription
    this.eventHandlers.push(eventHandler);
  }

  unsubscribeFromEvents(): void {
    console.log('[MockOmniChannelAdapter] Unsubscribing from events');
    // TODO: OMNICHANNEL - Replace with actual event unsubscription
    this.eventHandlers = [];
  }

  private simulateEvents(): void {
    // TODO: OMNICHANNEL - Remove this simulation
    // Simulate random events for testing
    setInterval(() => {
      if (this.eventHandlers.length === 0) return;

      const eventTypes = ['conversation.qualified', 'form.submitted', 'email.engaged'] as const;
      const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

      const mockEvent: IOmniChannelEvent = {
        type: randomType,
        data: this.getMockEventData(randomType),
        timestamp: new Date(),
        companyId: 1
      };

      this.eventHandlers.forEach(handler => handler(mockEvent));
    }, 30000); // Every 30 seconds
  }

  private getMockEventData(type: string): any {
    switch (type) {
      case 'conversation.qualified':
        return {
          conversationId: 'conv-' + Date.now(),
          customerId: 'cust-' + Math.random().toString(36).substr(2, 9)
        };
      case 'form.submitted':
        return {
          submissionId: 'sub-' + Date.now(),
          landingPageId: 'lp-' + Math.random().toString(36).substr(2, 9)
        };
      case 'email.engaged':
        return {
          email: `user${Math.floor(Math.random() * 100)}@example.com`,
          action: 'click',
          campaignId: 'camp-' + Math.random().toString(36).substr(2, 9)
        };
      default:
        return {};
    }
  }
}