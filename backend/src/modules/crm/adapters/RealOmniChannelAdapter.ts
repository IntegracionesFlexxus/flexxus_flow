/**
 * Real OmniChannel Adapter
 * Implements real integration with Omni Module APIs
 * Sprint N+1 - CRM-Omni Integration
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import axios, { AxiosInstance } from 'axios';
import { io, Socket } from 'socket.io-client';
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
  enableWebSocket?: boolean;
  webSocketPath?: string;
}

@injectable()
export class RealOmniChannelAdapter implements IOmniChannelAdapter {
  private httpClient: AxiosInstance;
  private eventSubscribers: Array<(event: IOmniChannelEvent) => void> = [];
  private config: IOmniApiConfig;
  private wsClient: Socket | null = null;
  private isWsConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(
    @inject(TYPES.Logger) private logger: any
  ) {
    // Load config from environment or defaults
    this.config = {
      baseUrl: process.env.OMNI_API_BASE_URL || 'http://localhost:3000',
      timeout: parseInt(process.env.OMNI_API_TIMEOUT || '10000'),
      retries: parseInt(process.env.OMNI_API_RETRIES || '3'),
      enableWebSocket: process.env.OMNI_WEBSOCKET_ENABLED === 'true',
      webSocketPath: process.env.OMNI_WEBSOCKET_PATH || '/omni'
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
      baseUrl: this.config.baseUrl,
      webSocketEnabled: this.config.enableWebSocket
    });

    // Initialize WebSocket if enabled
    if (this.config.enableWebSocket) {
      this.initializeWebSocket();
    }
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
   * Initialize WebSocket connection
   */
  private initializeWebSocket(): void {
    try {
      this.logger.info('[RealOmniChannelAdapter] Initializing WebSocket connection', {
        baseUrl: this.config.baseUrl,
        path: this.config.webSocketPath
      });

      // Create WebSocket client
      this.wsClient = io(this.config.baseUrl, {
        path: this.config.webSocketPath,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
        auth: {
          // TODO: Add proper authentication token
          token: process.env.OMNI_WS_AUTH_TOKEN || 'crm-integration',
          companyId: 'system', // System-wide events
          userId: 'crm-adapter'
        }
      });

      // Register WebSocket event handlers
      this.registerWebSocketHandlers();

    } catch (error: any) {
      this.logger.error('Failed to initialize WebSocket', { error: error.message });
    }
  }

  /**
   * Register WebSocket event handlers
   */
  private registerWebSocketHandlers(): void {
    if (!this.wsClient) return;

    // Connection events
    this.wsClient.on('connect', () => {
      this.isWsConnected = true;
      this.reconnectAttempts = 0;
      this.logger.info('[RealOmniChannelAdapter] WebSocket connected', {
        socketId: this.wsClient?.id
      });

      // Subscribe to CRM-relevant events
      this.wsClient?.emit('crm:subscribe', {
        events: ['conversation.qualified', 'form.submitted', 'email.engaged']
      });
    });

    this.wsClient.on('disconnect', (reason: string) => {
      this.isWsConnected = false;
      this.logger.warn('[RealOmniChannelAdapter] WebSocket disconnected', { reason });
    });

    this.wsClient.on('connect_error', (error: Error) => {
      this.reconnectAttempts++;
      this.logger.error('[RealOmniChannelAdapter] WebSocket connection error', {
        error: error.message,
        attempt: this.reconnectAttempts
      });
    });

    // CRM Integration Events
    this.wsClient.on('crm:conversation_qualified', (data: any) => {
      this.logger.info('[RealOmniChannelAdapter] Received conversation qualified event', {
        conversationId: data.conversationId
      });

      this.emitEvent({
        type: 'conversation.qualified',
        data: {
          conversationId: data.conversationId,
          companyId: data.companyId
        },
        timestamp: new Date(),
        companyId: data.companyId
      });
    });

    this.wsClient.on('crm:form_submitted', (data: any) => {
      this.logger.info('[RealOmniChannelAdapter] Received form submission event', {
        submissionId: data.submissionId
      });

      this.emitEvent({
        type: 'form.submitted',
        data: {
          submissionId: data.submissionId,
          companyId: data.companyId
        },
        timestamp: new Date(),
        companyId: data.companyId
      });
    });

    this.wsClient.on('crm:email_engaged', (data: any) => {
      this.logger.info('[RealOmniChannelAdapter] Received email engagement event', {
        contactEmail: data.contactEmail,
        action: data.action
      });

      this.emitEvent({
        type: 'email.engaged',
        data: {
          contactEmail: data.contactEmail,
          campaignId: data.campaignId,
          action: data.action,
          linkUrl: data.linkUrl,
          companyId: data.companyId
        },
        timestamp: new Date(),
        companyId: data.companyId
      });
    });

    // Health check response
    this.wsClient.on('pong', () => {
      this.logger.debug('[RealOmniChannelAdapter] WebSocket pong received');
    });
  }

  /**
   * Subscribe to omnichannel events
   */
  subscribeToEvents(eventHandler: (event: IOmniChannelEvent) => void): void {
    this.eventSubscribers.push(eventHandler);
    this.logger.info('[RealOmniChannelAdapter] Event subscriber added', {
      totalSubscribers: this.eventSubscribers.length
    });

    // If WebSocket is not enabled, log warning
    if (!this.config.enableWebSocket) {
      this.logger.warn('[RealOmniChannelAdapter] WebSocket is disabled - real-time events will not be received');
      this.logger.warn('[RealOmniChannelAdapter] Set OMNI_WEBSOCKET_ENABLED=true to enable real-time events');
    }
  }

  /**
   * Unsubscribe from omnichannel events
   */
  unsubscribeFromEvents(): void {
    this.eventSubscribers = [];
    this.logger.info('[RealOmniChannelAdapter] All event subscribers removed');

    // Disconnect WebSocket if connected
    if (this.wsClient && this.isWsConnected) {
      this.wsClient.emit('crm:unsubscribe');
      this.wsClient.disconnect();
      this.wsClient = null;
      this.isWsConnected = false;
      this.logger.info('[RealOmniChannelAdapter] WebSocket disconnected');
    }
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
