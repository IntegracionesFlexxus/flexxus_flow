/**
 * CRM-Omni Integration Tests
 * Sprint N+2 - Testing & Integration
 *
 * These tests verify the end-to-end flow between CRM and Omni modules
 */

import { OmniChannelIntegrationService } from '../../lead-management/capture/services/OmniChannelIntegrationService';
import { RealOmniChannelAdapter } from '../../adapters/RealOmniChannelAdapter';
import { LeadRepository } from '../../repositories/LeadRepository';
import { EventEmitter } from 'events';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

describe('CRM-Omni Integration Tests', () => {
  let integrationService: OmniChannelIntegrationService;
  let mockLeadRepo: jest.Mocked<LeadRepository>;
  let mockDb: any;
  let eventBus: EventEmitter;
  let mockLogger: any;
  let mockAxios: MockAdapter;

  beforeEach(() => {
    // Mock dependencies
    mockLeadRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn()
    } as any;

    mockDb = {
      query: jest.fn()
    };

    eventBus = new EventEmitter();

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    // Set environment for API adapter
    process.env.OMNICHANNEL_ADAPTER_TYPE = 'api';
    process.env.OMNI_API_BASE_URL = 'http://test-omni.com';

    // Create integration service
    integrationService = new OmniChannelIntegrationService(
      mockLeadRepo,
      mockDb,
      eventBus,
      mockLogger
    );

    // Mock HTTP client
    const adapter = (integrationService as any).adapter as RealOmniChannelAdapter;
    mockAxios = new MockAdapter((adapter as any).httpClient);
  });

  afterEach(() => {
    mockAxios.restore();
    jest.clearAllMocks();
  });

  describe('Lead Capture from Qualified Conversation', () => {
    const mockConversation = {
      id: 'conv_qualified_123',
      customerId: 'cust_456',
      customerEmail: 'john.doe@example.com',
      messages: [
        {
          content: 'I am interested in your product',
          sender: 'customer',
          timestamp: new Date('2024-01-15T10:00:00Z')
        },
        {
          content: 'Great! Let me help you',
          sender: 'agent',
          timestamp: new Date('2024-01-15T10:01:00Z')
        }
      ],
      metadata: {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        company: 'Acme Corp',
        email: 'john.doe@example.com'
      },
      qualified: true,
      createdAt: new Date('2024-01-15T10:00:00Z')
    };

    it('should create new lead from qualified conversation', async () => {
      // Mock: Conversation exists in Omni
      mockAxios
        .onGet('/api/omni/crm-integration/conversations/conv_qualified_123')
        .reply(200, { success: true, data: mockConversation });

      // Mock: No existing lead with this email
      mockLeadRepo.findByEmail.mockResolvedValue(null);

      // Mock: Lead creation
      const mockCreatedLead = {
        id: 789,
        email: 'john.doe@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+1234567890',
        company_name: 'Acme Corp',
        status: 'new',
        source: 'conversation',
        created_at: new Date()
      };
      mockLeadRepo.create.mockResolvedValue(mockCreatedLead);

      // Mock: Link conversation to lead
      mockAxios
        .onPost('/api/omni/crm-integration/conversations/conv_qualified_123/link', {
          leadId: 789
        })
        .reply(200, { success: true });

      // Mock database queries for tracking
      mockDb.query.mockResolvedValue({ rows: [] });

      // Execute
      await integrationService.handleQualifiedConversation({
        conversationId: 'conv_qualified_123',
        companyId: 1
      });

      // Assertions
      expect(mockLeadRepo.findByEmail).toHaveBeenCalledWith('john.doe@example.com', 1);
      expect(mockLeadRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john.doe@example.com',
          first_name: 'John',
          last_name: 'Doe',
          phone: '+1234567890',
          company_name: 'Acme Corp',
          company_id: 1,
          source_verified: false,
          manual_entry: false
        })
      );

      // Verify linking call was made
      const linkRequests = mockAxios.history.post.filter(
        req => req.url?.includes('/link')
      );
      expect(linkRequests).toHaveLength(1);
      expect(JSON.parse(linkRequests[0].data)).toEqual({ leadId: 789 });
    });

    it('should update existing lead engagement instead of creating duplicate', async () => {
      mockAxios
        .onGet('/api/omni/crm-integration/conversations/conv_qualified_123')
        .reply(200, { success: true, data: mockConversation });

      // Mock: Existing lead found
      const existingLead = {
        id: 999,
        email: 'john.doe@example.com',
        first_name: 'John',
        last_name: 'Doe',
        status: 'contacted'
      };
      mockLeadRepo.findByEmail.mockResolvedValue(existingLead);

      mockAxios
        .onPost('/api/omni/crm-integration/conversations/conv_qualified_123/link', {
          leadId: 999
        })
        .reply(200, { success: true });

      mockDb.query.mockResolvedValue({ rows: [] });

      await integrationService.handleQualifiedConversation({
        conversationId: 'conv_qualified_123',
        companyId: 1
      });

      // Should NOT create new lead
      expect(mockLeadRepo.create).not.toHaveBeenCalled();

      // Should update engagement
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO lead_engagement_events'),
        expect.any(Array)
      );

      // Should link conversation
      expect(mockAxios.history.post).toHaveLength(1);
    });

    it('should queue for sync when conversation not found', async () => {
      mockAxios
        .onGet('/api/omni/crm-integration/conversations/conv_notfound')
        .reply(404);

      mockDb.query.mockResolvedValue({ rows: [] });

      await integrationService.handleQualifiedConversation({
        conversationId: 'conv_notfound',
        companyId: 1
      });

      // Should queue for sync
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO pending_omnichannel_sync'),
        expect.arrayContaining(['get_conversation', 'conversation'])
      );

      // Should NOT create lead
      expect(mockLeadRepo.create).not.toHaveBeenCalled();
    });

    it('should handle Omni API errors gracefully', async () => {
      mockAxios
        .onGet('/api/omni/crm-integration/conversations/conv_error')
        .reply(500, { error: 'Internal server error' });

      mockDb.query.mockResolvedValue({ rows: [] });

      // Should not throw
      await expect(
        integrationService.handleQualifiedConversation({
          conversationId: 'conv_error',
          companyId: 1
        })
      ).resolves.not.toThrow();

      // Should queue for retry
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO pending_omnichannel_sync'),
        expect.any(Array)
      );
    });
  });

  describe('Landing Page Form Submission', () => {
    const mockSubmission = {
      id: 'sub_landing_456',
      landingPageId: 'lp_product_demo',
      formData: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@company.com',
        phone: '+9876543210',
        company: 'Tech Startup Inc',
        jobTitle: 'CTO',
        budget: 50000,
        timeline: 'Q2 2024',
        needs: 'Need CRM solution for 50+ users'
      },
      utm: {
        source: 'google',
        medium: 'cpc',
        campaign: 'product-demo-2024',
        term: 'crm software',
        content: 'ad-variant-a'
      },
      referrer: 'https://google.com/search',
      submittedAt: new Date('2024-01-20T14:30:00Z')
    };

    it('should create lead from landing page submission with UTM tracking', async () => {
      mockAxios
        .onGet('/api/omni/crm-integration/submissions/sub_landing_456')
        .reply(200, { success: true, data: mockSubmission });

      mockLeadRepo.findByEmail.mockResolvedValue(null);

      const mockCreatedLead = {
        id: 888,
        email: 'jane.smith@company.com',
        first_name: 'Jane',
        last_name: 'Smith'
      };
      mockLeadRepo.create.mockResolvedValue(mockCreatedLead);
      mockDb.query.mockResolvedValue({ rows: [] });

      await integrationService.handleFormSubmission({
        submissionId: 'sub_landing_456',
        companyId: 1
      });

      expect(mockLeadRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'jane.smith@company.com',
          first_name: 'Jane',
          last_name: 'Smith',
          phone: '+9876543210',
          company_name: 'Tech Startup Inc',
          job_title: 'CTO',
          budget: 50000,
          timeline: 'Q2 2024',
          need_description: 'Need CRM solution for 50+ users',
          source_verified: false,
          manual_entry: false
        })
      );

      // Verify UTM tracking was saved
      const utmCalls = mockDb.query.mock.calls.filter(call =>
        call[0].includes('INSERT INTO lead_source_tracking')
      );
      expect(utmCalls).toHaveLength(1);
      expect(utmCalls[0][1]).toEqual(
        expect.arrayContaining([
          888, // lead_id
          'google', // utm_source
          'cpc', // utm_medium
          'product-demo-2024', // utm_campaign
          'crm software', // utm_term
          'ad-variant-a', // utm_content
          'https://google.com/search' // referrer
        ])
      );
    });

    it('should handle 501 Not Implemented gracefully', async () => {
      mockAxios
        .onGet('/api/omni/crm-integration/submissions/sub_notimpl')
        .reply(501, { success: false, message: 'Not yet implemented' });

      mockDb.query.mockResolvedValue({ rows: [] });

      await expect(
        integrationService.handleFormSubmission({
          submissionId: 'sub_notimpl',
          companyId: 1
        })
      ).resolves.not.toThrow();

      expect(mockLeadRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('Email Engagement Tracking', () => {
    it('should track email engagement for existing lead', async () => {
      const existingLead = {
        id: 777,
        email: 'subscriber@example.com',
        first_name: 'Subscriber'
      };
      mockLeadRepo.findByEmail.mockResolvedValue(existingLead);
      mockDb.query.mockResolvedValue({ rows: [] });

      await integrationService.handleEmailEngagement({
        contactEmail: 'subscriber@example.com',
        campaignId: 'campaign_newsletter_jan',
        action: 'open',
        companyId: 1
      });

      // Should NOT create new lead
      expect(mockLeadRepo.create).not.toHaveBeenCalled();

      // Should track engagement
      const engagementCalls = mockDb.query.mock.calls.filter(call =>
        call[0].includes('INSERT INTO lead_engagement_events')
      );
      expect(engagementCalls).toHaveLength(1);
      expect(engagementCalls[0][1]).toEqual(
        expect.arrayContaining([
          777, // lead_id
          'open', // event_type
          expect.anything(), // event_category
          'email', // channel
          'campaign_newsletter_jan', // campaign_id
          expect.any(Number) // score_impact
        ])
      );
    });

    it('should create minimal lead if not exists', async () => {
      mockLeadRepo.findByEmail.mockResolvedValue(null);

      const mockMinimalLead = {
        id: 555,
        email: 'newsubscriber@example.com',
        status: 'new'
      };
      mockLeadRepo.create.mockResolvedValue(mockMinimalLead);
      mockDb.query.mockResolvedValue({ rows: [] });

      await integrationService.handleEmailEngagement({
        contactEmail: 'newsubscriber@example.com',
        campaignId: 'campaign_webinar',
        action: 'click',
        linkUrl: 'https://example.com/webinar',
        companyId: 1
      });

      expect(mockLeadRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newsubscriber@example.com',
          company_id: 1,
          status: 'new',
          source_verified: false,
          manual_entry: false
        })
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO lead_engagement_events'),
        expect.any(Array)
      );
    });

    it('should calculate correct engagement scores', async () => {
      const existingLead = { id: 111, email: 'test@example.com' };
      mockLeadRepo.findByEmail.mockResolvedValue(existingLead);
      mockDb.query.mockResolvedValue({ rows: [] });

      const testCases = [
        { action: 'open', expectedScore: 5 },
        { action: 'click', expectedScore: 10 },
        { action: 'reply', expectedScore: 25 },
        { action: 'unsubscribe', expectedScore: 1 }
      ];

      for (const testCase of testCases) {
        await integrationService.handleEmailEngagement({
          contactEmail: 'test@example.com',
          campaignId: 'test_campaign',
          action: testCase.action as any,
          companyId: 1
        });
      }

      const engagementCalls = mockDb.query.mock.calls.filter(call =>
        call[0].includes('INSERT INTO lead_engagement_events')
      );

      expect(engagementCalls).toHaveLength(testCases.length);

      testCases.forEach((testCase, index) => {
        const scoreParam = engagementCalls[index][1][6]; // score_impact parameter
        expect(scoreParam).toBe(testCase.expectedScore);
      });
    });
  });

  describe('Event-Driven Integration', () => {
    it('should handle event bus events for manual lead capture', async () => {
      const mockLead = {
        id: 222,
        email: 'manual@example.com',
        first_name: 'Manual',
        last_name: 'Entry'
      };
      mockLeadRepo.create.mockResolvedValue(mockLead);
      mockDb.query.mockResolvedValue({ rows: [] });

      // Emit manual capture event
      eventBus.emit('lead.manual_capture', {
        email: 'manual@example.com',
        first_name: 'Manual',
        last_name: 'Entry',
        company_id: 1
      });

      // Wait for async handler
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLeadRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'manual@example.com',
          source_verified: false,
          manual_entry: true
        })
      );

      // Should queue for matching
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO pending_omnichannel_sync'),
        expect.arrayContaining(['match_manual_lead'])
      );
    });

    it('should process bulk import events', async () => {
      const importLeads = [
        { email: 'bulk1@example.com', first_name: 'Bulk', last_name: 'One' },
        { email: 'bulk2@example.com', first_name: 'Bulk', last_name: 'Two' },
        { email: 'bulk3@example.com', first_name: 'Bulk', last_name: 'Three' }
      ];

      mockLeadRepo.create
        .mockResolvedValueOnce({ id: 301, ...importLeads[0] })
        .mockResolvedValueOnce({ id: 302, ...importLeads[1] })
        .mockResolvedValueOnce({ id: 303, ...importLeads[2] });

      mockDb.query.mockResolvedValue({ rows: [] });

      // Emit bulk import event
      eventBus.emit('lead.import', {
        leads: importLeads,
        companyId: 1,
        userId: 99
      });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockLeadRepo.create).toHaveBeenCalledTimes(3);

      // Should queue all for matching
      const matchingCalls = mockDb.query.mock.calls.filter(call =>
        call[0].includes('INSERT INTO pending_omnichannel_sync') &&
        call[1].includes('match_imported_lead')
      );
      expect(matchingCalls).toHaveLength(3);
    });
  });

  describe('Error Recovery & Resilience', () => {
    it('should recover from transient network errors', async () => {
      const mockConversation = {
        id: 'conv_retry',
        customerEmail: 'retry@example.com',
        qualified: true,
        metadata: { email: 'retry@example.com' }
      };

      // First two attempts fail, third succeeds
      mockAxios
        .onGet('/api/omni/crm-integration/conversations/conv_retry')
        .replyOnce(500)
        .onGet('/api/omni/crm-integration/conversations/conv_retry')
        .replyOnce(503)
        .onGet('/api/omni/crm-integration/conversations/conv_retry')
        .reply(200, { success: true, data: mockConversation });

      mockLeadRepo.findByEmail.mockResolvedValue(null);
      mockLeadRepo.create.mockResolvedValue({ id: 444, email: 'retry@example.com' });
      mockDb.query.mockResolvedValue({ rows: [] });
      mockAxios.onPost().reply(200, { success: true });

      await integrationService.handleQualifiedConversation({
        conversationId: 'conv_retry',
        companyId: 1
      });

      // Should eventually succeed
      expect(mockLeadRepo.create).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled(); // Retry warnings
    });

    it('should continue processing even if linking fails', async () => {
      const mockConversation = {
        id: 'conv_link_fail',
        customerEmail: 'linkfail@example.com',
        qualified: true,
        metadata: { email: 'linkfail@example.com' }
      };

      mockAxios
        .onGet('/api/omni/crm-integration/conversations/conv_link_fail')
        .reply(200, { success: true, data: mockConversation });

      mockLeadRepo.findByEmail.mockResolvedValue(null);
      mockLeadRepo.create.mockResolvedValue({ id: 666, email: 'linkfail@example.com' });
      mockDb.query.mockResolvedValue({ rows: [] });

      // Linking fails
      mockAxios
        .onPost('/api/omni/crm-integration/conversations/conv_link_fail/link')
        .reply(500);

      // Should not throw - graceful degradation
      await expect(
        integrationService.handleQualifiedConversation({
          conversationId: 'conv_link_fail',
          companyId: 1
        })
      ).resolves.not.toThrow();

      // Lead should still be created
      expect(mockLeadRepo.create).toHaveBeenCalled();

      // Error should be logged but not thrown
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
