/**
 * Real OmniChannel Adapter
 * Implements real integration with Omni Module APIs
 * Sprint N+1 - CRM-Omni Integration
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import axios, { AxiosInstance } from 'axios';
import {
  IOmniChannelAdapter,
  IConversation,
  ILandingPageSubmission,
  IEmailEngagement,
  IOmniChannelEvent
} from './IOmniChannelAdapter';

export interface IOmniApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

@injectable()
export class RealOmniChannelAdapter implements IOmniChannelAdapter {
  private httpClient: AxiosInstance;
  private eventSubscribers: Array<(event: IOmniChannelEvent) => void> = [];
  private config: IOmniApiConfig;

  constructor(
    @inject(TYPES.Logger) private logger: any
  ) {
    // Load config from environment or defaults
    this.config = {
      baseUrl: process.env.OMNI_API_BASE_URL || 'http://localhost:3000',
      timeout: parseInt(process.env.OMNI_API_TIMEOUT || '10000'),
      retries: parseInt(process.env.OMNI_API_RETRIES || '3')
    };

    // Initialize HTTP client
    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Client': 'CRM-Module'
      }
    });

    // Add request interceptor for auth token
    this.httpClient.interceptors.request.use((config) => {
      // TODO: Add auth token from context
      // const token = getAuthToken();
      // if (token) {
      //   config.headers.Authorization = `Bearer ${token}`;
      // }
      return config;
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        this.logger.error('OmniChannel API Error:', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        });

        // Retry logic for network errors
        if (error.config && !error.config.__retryCount) {
          error.config.__retryCount = 0;
        }

        if (
          error.config &&
          error.config.__retryCount < this.config.retries &&
          this.isRetryableError(error)
        ) {
          error.config.__retryCount += 1;
          this.logger.warn('Retrying request', {
            attempt: error.config.__retryCount,
            url: error.config.url
          });

          // Exponential backoff
          const delay = Math.pow(2, error.config.__retryCount) * 1000;
          await this.sleep(delay);

          return this.httpClient(error.config);
        }

        throw error;
      }
    );

    this.logger.info('[RealOmniChannelAdapter] Initialized', {
      baseUrl: this.config.baseUrl
    });
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string): Promise<IConversation | null> {
    try {
      this.logger.info('[RealOmniChannelAdapter] Getting conversation', { conversationId });

      const response = await this.httpClient.get(
        `/api/omni/crm-integration/conversations/${conversationId}`
      );

      if (response.data.success) {
        return response.data.data;
      }

      return null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        this.logger.warn('Conversation not found', { conversationId });
        return null;
      }

      this.logger.error('Error getting conversation', { conversationId, error: error.message });
      throw new Error(`Failed to get conversation: ${error.message}`);
    }
  }

  /**
   * Get qualified conversations ready for lead capture
   */
  async getQualifiedConversations(since?: Date): Promise<IConversation[]> {
    try {
      this.logger.info('[RealOmniChannelAdapter] Getting qualified conversations', { since });

      const params: any = {};
      if (since) {
        params.since = since.toISOString();
      }

      const response = await this.httpClient.get(
        '/api/omni/crm-integration/conversations/qualified',
        { params }
      );

      if (response.data.success) {
        return response.data.data || [];
      }

      return [];
    } catch (error: any) {
      this.logger.error('Error getting qualified conversations', { error: error.message });
      return []; // Return empty array on error to not break lead capture
    }
  }

  /**
   * Link conversation to CRM lead
   */
  async linkConversationToLead(conversationId: string, leadId: number): Promise<void> {
    try {
      this.logger.info('[RealOmniChannelAdapter] Linking conversation to lead', {
        conversationId,
        leadId
      });

      await this.httpClient.post(
        `/api/omni/crm-integration/conversations/${conversationId}/link`,
        { leadId }
      );

      this.logger.info('Successfully linked conversation to lead', { conversationId, leadId });
    } catch (error: any) {
      this.logger.error('Error linking conversation to lead', {
        conversationId,
        leadId,
        error: error.message
      });
      // Don't throw - linking is not critical, just log the error
    }
  }

  /**
   * Get landing page submission by ID
   */
  async getLandingPageSubmission(submissionId: string): Promise<ILandingPageSubmission | null> {
    try {
      this.logger.info('[RealOmniChannelAdapter] Getting landing page submission', { submissionId });

      const response = await this.httpClient.get(
        `/api/omni/crm-integration/submissions/${submissionId}`
      );

      if (response.data.success) {
        return response.data.data;
      }

      return null;
    } catch (error: any) {
      if (error.response?.status === 501) {
        this.logger.warn('Landing page submissions not yet implemented in Omni module');
        return null;
      }

      if (error.response?.status === 404) {
        this.logger.warn('Submission not found', { submissionId });
        return null;
      }

      this.logger.error('Error getting submission', { submissionId, error: error.message });
      return null;
    }
  }

  /**
   * Get recent landing page submissions
   */
  async getRecentSubmissions(since?: Date): Promise<ILandingPageSubmission[]> {
    try {
      this.logger.info('[RealOmniChannelAdapter] Getting recent submissions', { since });

      const params: any = {};
      if (since) {
        params.since = since.toISOString();
      }

      const response = await this.httpClient.get(
        '/api/omni/crm-integration/submissions',
        { params }
      );

      if (response.data.success) {
        return response.data.data || [];
      }

      return [];
    } catch (error: any) {
      if (error.response?.status === 501) {
        this.logger.warn('Landing page submissions not yet implemented in Omni module');
        return [];
      }

      this.logger.error('Error getting recent submissions', { error: error.message });
      return [];
    }
  }

  /**
   * Get email engagements for a contact
   */
  async getEmailEngagements(email: string): Promise<IEmailEngagement[]> {
    try {
      this.logger.info('[RealOmniChannelAdapter] Getting email engagements', { email });

      const response = await this.httpClient.get(
        '/api/omni/crm-integration/email-engagements',
        { params: { email } }
      );

      if (response.data.success) {
        return response.data.data || [];
      }

      return [];
    } catch (error: any) {
      if (error.response?.status === 501) {
        this.logger.warn('Email engagement tracking not yet implemented in Omni module');
        return [];
      }

      this.logger.error('Error getting email engagements', { email, error: error.message });
      return [];
    }
  }

  /**
   * Track email engagement event
   */
  async trackEmailEngagement(engagement: IEmailEngagement): Promise<void> {
    try {
      this.logger.info('[RealOmniChannelAdapter] Tracking email engagement', {
        email: engagement.contactEmail,
        action: engagement.action
      });

      await this.httpClient.post(
        '/api/omni/crm-integration/email-engagements',
        engagement
      );
    } catch (error: any) {
      if (error.response?.status === 501) {
        this.logger.warn('Email engagement tracking not yet implemented in Omni module');
        return;
      }

      this.logger.error('Error tracking email engagement', {
        engagement,
        error: error.message
      });
      // Don't throw - tracking is not critical
    }
  }

  /**
   * Subscribe to omnichannel events
   */
  subscribeToEvents(eventHandler: (event: IOmniChannelEvent) => void): void {
    this.eventSubscribers.push(eventHandler);
    this.logger.info('[RealOmniChannelAdapter] Event subscriber added', {
      totalSubscribers: this.eventSubscribers.length
    });

    // TODO: Implement WebSocket or polling mechanism for real-time events
    // For now, events will be polled or pushed via other mechanisms
  }

  /**
   * Unsubscribe from omnichannel events
   */
  unsubscribeFromEvents(): void {
    this.eventSubscribers = [];
    this.logger.info('[RealOmniChannelAdapter] All event subscribers removed');
  }

  /**
   * Emit event to all subscribers
   * (Called internally or from polling/webhook handlers)
   */
  private emitEvent(event: IOmniChannelEvent): void {
    this.logger.debug('[RealOmniChannelAdapter] Emitting event', { type: event.type });

    for (const subscriber of this.eventSubscribers) {
      try {
        subscriber(event);
      } catch (error: any) {
        this.logger.error('Error in event subscriber', {
          eventType: event.type,
          error: error.message
        });
      }
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Retry on network errors or 5xx errors
    return (
      !error.response ||
      error.response.status >= 500 ||
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT'
    );
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Health check - verify connection to Omni module
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/api/omni/health', {
        timeout: 5000
      });

      return response.data.status === 'healthy';
    } catch (error) {
      this.logger.error('Omni module health check failed', { error });
      return false;
    }
  }
}
