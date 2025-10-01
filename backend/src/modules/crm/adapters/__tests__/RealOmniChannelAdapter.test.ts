/**
 * RealOmniChannelAdapter Unit Tests
 * Sprint N+2 - Testing & Integration
 */

import { RealOmniChannelAdapter } from '../RealOmniChannelAdapter';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

describe('RealOmniChannelAdapter', () => {
  let adapter: RealOmniChannelAdapter;
  let mockAxios: MockAdapter;

  beforeEach(() => {
    // Reset environment variables
    process.env.OMNI_API_BASE_URL = 'http://test-api.com';
    process.env.OMNI_API_TIMEOUT = '5000';
    process.env.OMNI_API_RETRIES = '2';

    adapter = new RealOmniChannelAdapter(mockLogger);

    // Mock axios after adapter initialization
    mockAxios = new MockAdapter((adapter as any).httpClient);

    // Clear mock calls
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('Constructor & Configuration', () => {
    it('should initialize with environment variables', () => {
      expect((adapter as any).config.baseUrl).toBe('http://test-api.com');
      expect((adapter as any).config.timeout).toBe(5000);
      expect((adapter as any).config.retries).toBe(2);
    });

    it('should use default config when env vars not set', () => {
      delete process.env.OMNI_API_BASE_URL;
      delete process.env.OMNI_API_TIMEOUT;
      delete process.env.OMNI_API_RETRIES;

      const defaultAdapter = new RealOmniChannelAdapter(mockLogger);

      expect((defaultAdapter as any).config.baseUrl).toBe('http://localhost:3000');
      expect((defaultAdapter as any).config.timeout).toBe(10000);
      expect((defaultAdapter as any).config.retries).toBe(3);
    });

    it('should log initialization', () => {
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[RealOmniChannelAdapter] Initialized',
        { baseUrl: 'http://test-api.com' }
      );
    });
  });

  describe('getConversation', () => {
    const mockConversation = {
      id: 'conv_123',
      customerId: 'cust_456',
      customerEmail: 'test@example.com',
      messages: [
        { content: 'Hello', sender: 'customer', timestamp: new Date() }
      ],
      metadata: {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        email: 'test@example.com'
      },
      qualified: true,
      createdAt: new Date()
    };

    it('should successfully fetch conversation', async () => {
      mockAxios.onGet('/api/omni/crm-integration/conversations/conv_123').reply(200, {
        success: true,
        data: mockConversation
      });

      const result = await adapter.getConversation('conv_123');

      expect(result).toEqual(mockConversation);
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[RealOmniChannelAdapter] Getting conversation',
        { conversationId: 'conv_123' }
      );
    });

    it('should return null when conversation not found (404)', async () => {
      mockAxios.onGet('/api/omni/crm-integration/conversations/conv_999').reply(404);

      const result = await adapter.getConversation('conv_999');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Conversation not found',
        { conversationId: 'conv_999' }
      );
    });

    it('should return null when response is not successful', async () => {
      mockAxios.onGet('/api/omni/crm-integration/conversations/conv_123').reply(200, {
        success: false,
        data: null
      });

      const result = await adapter.getConversation('conv_123');

      expect(result).toBeNull();
    });

    it('should throw error on network failure', async () => {
      mockAxios.onGet('/api/omni/crm-integration/conversations/conv_123').networkError();

      await expect(adapter.getConversation('conv_123')).rejects.toThrow('Failed to get conversation');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should retry on 500 errors', async () => {
      mockAxios
        .onGet('/api/omni/crm-integration/conversations/conv_123')
        .replyOnce(500)
        .onGet('/api/omni/crm-integration/conversations/conv_123')
        .replyOnce(500)
        .onGet('/api/omni/crm-integration/conversations/conv_123')
        .reply(200, { success: true, data: mockConversation });

      const result = await adapter.getConversation('conv_123');

      expect(result).toEqual(mockConversation);
      expect(mockLogger.warn).toHaveBeenCalled(); // Retry warnings
    });
  });

  describe('getQualifiedConversations', () => {
    const mockConversations = [
      {
        id: 'conv_1',
        customerId: 'cust_1',
        customerEmail: 'user1@test.com',
        qualified: true,
        createdAt: new Date()
      },
      {
        id: 'conv_2',
        customerId: 'cust_2',
        customerEmail: 'user2@test.com',
        qualified: true,
        createdAt: new Date()
      }
    ];

    it('should fetch qualified conversations without date filter', async () => {
      mockAxios
        .onGet('/api/omni/crm-integration/conversations/qualified')
        .reply(200, { success: true, data: mockConversations });

      const result = await adapter.getQualifiedConversations();

      expect(result).toEqual(mockConversations);
      expect(result).toHaveLength(2);
    });

    it('should fetch qualified conversations with date filter', async () => {
      const since = new Date('2024-01-01');

      mockAxios
        .onGet('/api/omni/crm-integration/conversations/qualified', {
          params: { since: since.toISOString() }
        })
        .reply(200, { success: true, data: mockConversations });

      const result = await adapter.getQualifiedConversations(since);

      expect(result).toEqual(mockConversations);
    });

    it('should return empty array on error', async () => {
      mockAxios
        .onGet('/api/omni/crm-integration/conversations/qualified')
        .reply(500);

      const result = await adapter.getQualifiedConversations();

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting qualified conversations',
        expect.any(Object)
      );
    });

    it('should handle null data in response', async () => {
      mockAxios
        .onGet('/api/omni/crm-integration/conversations/qualified')
        .reply(200, { success: true, data: null });

      const result = await adapter.getQualifiedConversations();

      expect(result).toEqual([]);
    });
  });

  describe('linkConversationToLead', () => {
    it('should successfully link conversation to lead', async () => {
      mockAxios
        .onPost('/api/omni/crm-integration/conversations/conv_123/link', { leadId: 456 })
        .reply(200, { success: true });

      await expect(
        adapter.linkConversationToLead('conv_123', 456)
      ).resolves.not.toThrow();

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[RealOmniChannelAdapter] Linking conversation to lead',
        { conversationId: 'conv_123', leadId: 456 }
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully linked conversation to lead',
        { conversationId: 'conv_123', leadId: 456 }
      );
    });

    it('should not throw on linking error (graceful degradation)', async () => {
      mockAxios
        .onPost('/api/omni/crm-integration/conversations/conv_123/link')
        .reply(500);

      await expect(
        adapter.linkConversationToLead('conv_123', 456)
      ).resolves.not.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error linking conversation to lead',
        expect.any(Object)
      );
    });
  });

  describe('getLandingPageSubmission', () => {
    it('should return null when not implemented (501)', async () => {
      mockAxios
        .onGet('/api/omni/crm-integration/submissions/sub_123')
        .reply(501);

      const result = await adapter.getLandingPageSubmission('sub_123');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Landing page submissions not yet implemented in Omni module'
      );
    });

    it('should return null when submission not found (404)', async () => {
      mockAxios
        .onGet('/api/omni/crm-integration/submissions/sub_999')
        .reply(404);

      const result = await adapter.getLandingPageSubmission('sub_999');

      expect(result).toBeNull();
    });

    it('should return submission when implemented', async () => {
      const mockSubmission = {
        id: 'sub_123',
        landingPageId: 'lp_456',
        formData: { email: 'test@example.com' },
        submittedAt: new Date()
      };

      mockAxios
        .onGet('/api/omni/crm-integration/submissions/sub_123')
        .reply(200, { success: true, data: mockSubmission });

      const result = await adapter.getLandingPageSubmission('sub_123');

      expect(result).toEqual(mockSubmission);
    });
  });

  describe('getRecentSubmissions', () => {
    it('should return empty array when not implemented (501)', async () => {
      mockAxios
        .onGet('/api/omni/crm-integration/submissions')
        .reply(501);

      const result = await adapter.getRecentSubmissions();

      expect(result).toEqual([]);
    });

    it('should return submissions with date filter', async () => {
      const since = new Date('2024-01-01');
      const mockSubmissions = [
        { id: 'sub_1', formData: { email: 'user1@test.com' } },
        { id: 'sub_2', formData: { email: 'user2@test.com' } }
      ];

      mockAxios
        .onGet('/api/omni/crm-integration/submissions', {
          params: { since: since.toISOString() }
        })
        .reply(200, { success: true, data: mockSubmissions });

      const result = await adapter.getRecentSubmissions(since);

      expect(result).toEqual(mockSubmissions);
    });
  });

  describe('getEmailEngagements', () => {
    it('should return empty array when not implemented (501)', async () => {
      mockAxios
        .onGet('/api/omni/crm-integration/email-engagements')
        .reply(501);

      const result = await adapter.getEmailEngagements('test@example.com');

      expect(result).toEqual([]);
    });

    it('should fetch email engagements when implemented', async () => {
      const mockEngagements = [
        {
          contactEmail: 'test@example.com',
          campaignId: 'camp_1',
          action: 'open' as const,
          timestamp: new Date()
        }
      ];

      mockAxios
        .onGet('/api/omni/crm-integration/email-engagements', {
          params: { email: 'test@example.com' }
        })
        .reply(200, { success: true, data: mockEngagements });

      const result = await adapter.getEmailEngagements('test@example.com');

      expect(result).toEqual(mockEngagements);
    });
  });

  describe('trackEmailEngagement', () => {
    const mockEngagement = {
      contactEmail: 'test@example.com',
      campaignId: 'camp_123',
      action: 'click' as const,
      linkUrl: 'https://example.com',
      timestamp: new Date()
    };

    it('should not throw when not implemented (501)', async () => {
      mockAxios
        .onPost('/api/omni/crm-integration/email-engagements')
        .reply(501);

      await expect(
        adapter.trackEmailEngagement(mockEngagement)
      ).resolves.not.toThrow();

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should track engagement successfully', async () => {
      mockAxios
        .onPost('/api/omni/crm-integration/email-engagements', mockEngagement)
        .reply(200, { success: true });

      await expect(
        adapter.trackEmailEngagement(mockEngagement)
      ).resolves.not.toThrow();

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[RealOmniChannelAdapter] Tracking email engagement',
        { email: 'test@example.com', action: 'click' }
      );
    });

    it('should not throw on tracking error', async () => {
      mockAxios
        .onPost('/api/omni/crm-integration/email-engagements')
        .reply(500);

      await expect(
        adapter.trackEmailEngagement(mockEngagement)
      ).resolves.not.toThrow();

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Event Subscription', () => {
    it('should add event subscriber', () => {
      const handler = jest.fn();

      adapter.subscribeToEvents(handler);

      expect((adapter as any).eventSubscribers).toHaveLength(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[RealOmniChannelAdapter] Event subscriber added',
        { totalSubscribers: 1 }
      );
    });

    it('should support multiple subscribers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      adapter.subscribeToEvents(handler1);
      adapter.subscribeToEvents(handler2);

      expect((adapter as any).eventSubscribers).toHaveLength(2);
    });

    it('should unsubscribe all subscribers', () => {
      const handler = jest.fn();

      adapter.subscribeToEvents(handler);
      expect((adapter as any).eventSubscribers).toHaveLength(1);

      adapter.unsubscribeFromEvents();
      expect((adapter as any).eventSubscribers).toHaveLength(0);
    });

    it('should emit events to all subscribers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      adapter.subscribeToEvents(handler1);
      adapter.subscribeToEvents(handler2);

      const mockEvent = {
        type: 'conversation.qualified' as const,
        data: { conversationId: 'conv_123' },
        timestamp: new Date(),
        companyId: 1
      };

      (adapter as any).emitEvent(mockEvent);

      expect(handler1).toHaveBeenCalledWith(mockEvent);
      expect(handler2).toHaveBeenCalledWith(mockEvent);
    });

    it('should handle subscriber errors gracefully', () => {
      const errorHandler = jest.fn(() => {
        throw new Error('Subscriber error');
      });
      const goodHandler = jest.fn();

      adapter.subscribeToEvents(errorHandler);
      adapter.subscribeToEvents(goodHandler);

      const mockEvent = {
        type: 'conversation.qualified' as const,
        data: {},
        timestamp: new Date(),
        companyId: 1
      };

      (adapter as any).emitEvent(mockEvent);

      expect(errorHandler).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return true when Omni module is healthy', async () => {
      mockAxios.onGet('/api/omni/health').reply(200, { status: 'healthy' });

      const result = await adapter.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when Omni module is unhealthy', async () => {
      mockAxios.onGet('/api/omni/health').reply(200, { status: 'unhealthy' });

      const result = await adapter.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockAxios.onGet('/api/omni/health').networkError();

      const result = await adapter.healthCheck();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Omni module health check failed',
        expect.any(Object)
      );
    });

    it('should timeout after 5 seconds', async () => {
      mockAxios.onGet('/api/omni/health').timeout();

      const result = await adapter.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('Retry Logic', () => {
    it('should identify retryable errors correctly', () => {
      const networkError = { code: 'ECONNABORTED' };
      const timeoutError = { code: 'ETIMEDOUT' };
      const serverError = { response: { status: 500 } };
      const clientError = { response: { status: 400 } };

      expect((adapter as any).isRetryableError(networkError)).toBe(true);
      expect((adapter as any).isRetryableError(timeoutError)).toBe(true);
      expect((adapter as any).isRetryableError(serverError)).toBe(true);
      expect((adapter as any).isRetryableError(clientError)).toBe(false);
    });

    it('should retry with exponential backoff', async () => {
      const sleepSpy = jest.spyOn(adapter as any, 'sleep');

      mockAxios
        .onGet('/api/omni/crm-integration/conversations/conv_123')
        .replyOnce(500)
        .onGet('/api/omni/crm-integration/conversations/conv_123')
        .reply(200, { success: true, data: { id: 'conv_123' } });

      await adapter.getConversation('conv_123');

      // Should have slept with exponential backoff: 2^1 * 1000 = 2000ms
      expect(sleepSpy).toHaveBeenCalledWith(2000);
    });
  });
});
