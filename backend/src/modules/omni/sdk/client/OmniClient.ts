/**
 * Omni SDK Client - Sprint 09
 * Client library for external developers
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { EventEmitter } from 'events';

export interface OmniClientConfig {
  apiKey: string;
  baseUrl: string;
  timeout?: number;
  maxRetries?: number;
  debug?: boolean;
}

export interface ConversationFilter {
  status?: 'active' | 'resolved' | 'pending';
  channel?: string;
  customer_id?: string;
  agent_id?: string;
  date_from?: Date;
  date_to?: Date;
  limit?: number;
  offset?: number;
}

export interface SendMessageInput {
  conversation_id: string;
  content: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'document';
  metadata?: Record<string, any>;
  attachments?: Attachment[];
}

export interface Attachment {
  url: string;
  type: string;
  name?: string;
  size?: number;
}

export interface Conversation {
  id: string;
  customer_id: string;
  channel: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, any>;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  direction: 'inbound' | 'outbound';
  status: string;
  created_at: Date;
  metadata?: Record<string, any>;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  metadata?: Record<string, any>;
}

export interface Integration {
  id: string;
  provider: string;
  type: string;
  name: string;
  status: string;
  last_sync_at?: Date;
  is_active: boolean;
}

export interface IntegrationInput {
  provider: string;
  type: string;
  name: string;
  config: Record<string, any>;
  mappings?: Record<string, any>;
}

export interface SyncResult {
  success: boolean;
  records_synced: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  errors?: any[];
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export class OmniClient extends EventEmitter {
  private client: AxiosInstance;
  private apiKey: string;
  private debug: boolean;
  private maxRetries: number;

  constructor(config: OmniClientConfig) {
    super();
    
    this.apiKey = config.apiKey;
    this.debug = config.debug || false;
    this.maxRetries = config.maxRetries || 3;
    
    // Create axios instance
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        'User-Agent': 'OmniClient/1.0.0'
      }
    });
    
    // Add request interceptor for debugging
    if (this.debug) {
      this.client.interceptors.request.use(
        (config) => {
          this.emit('debug', {
            stage: 'request',
            method: config.method?.toUpperCase(),
            url: config.url,
            data: config.data
          });
          return config;
        },
        (error) => {
          this.emit('debug', {
            stage: 'request-error',
            message: error.message,
            stack: error.stack
          });
          return Promise.reject(error);
        }
      );
    }
    
    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        if (this.debug) {
          this.emit('debug', {
            stage: 'response',
            status: response.status,
            url: response.config?.url,
            data: response.data
          });
        }
        return response;
      },
      async (error) => {
        if (this.debug) {
          this.emit('debug', {
            stage: 'response-error',
            status: error.response?.status,
            url: error.config?.url,
            data: error.response?.data,
            message: error.message
          });
        }
        
        // Retry logic
        const config = error.config as AxiosRequestConfig & { __retryCount?: number };
        if (!config || !config.__retryCount) {
          config.__retryCount = 0;
        }
        
        if (config.__retryCount < this.maxRetries) {
          if (this.isRetryableError(error)) {
            config.__retryCount++;
            
            // Exponential backoff
            const delay = Math.pow(2, config.__retryCount) * 1000;
            await this.sleep(delay);
            
            return this.client(config);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  // ==================== Conversations ====================

  /**
   * List conversations
   */
  async listConversations(filters?: ConversationFilter): Promise<PaginatedResponse<Conversation>> {
    const response = await this.client.get('/api/v2/conversations', {
      params: filters
    });
    return response.data;
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(id: string): Promise<Conversation> {
    const response = await this.client.get(`/api/v2/conversations/${id}`);
    return response.data;
  }

  /**
   * Create a new conversation
   */
  async createConversation(data: {
    customer_id: string;
    channel: string;
    metadata?: Record<string, any>;
  }): Promise<Conversation> {
    const response = await this.client.post('/api/v2/conversations', data);
    return response.data;
  }

  /**
   * Update conversation status
   */
  async updateConversationStatus(
    id: string,
    status: 'active' | 'resolved' | 'pending'
  ): Promise<Conversation> {
    const response = await this.client.patch(`/api/v2/conversations/${id}`, {
      status
    });
    return response.data;
  }

  /**
   * Assign conversation to agent
   */
  async assignConversation(id: string, agentId: string): Promise<Conversation> {
    const response = await this.client.post(`/api/v2/conversations/${id}/assign`, {
      agent_id: agentId
    });
    return response.data;
  }

  // ==================== Messages ====================

  /**
   * Send a message
   */
  async sendMessage(input: SendMessageInput): Promise<Message> {
    const response = await this.client.post('/api/v2/messages', input);
    return response.data;
  }

  /**
   * List messages in a conversation
   */
  async listMessages(
    conversationId: string,
    limit = 50,
    offset = 0
  ): Promise<PaginatedResponse<Message>> {
    const response = await this.client.get(`/api/v2/conversations/${conversationId}/messages`, {
      params: { limit, offset }
    });
    return response.data;
  }

  /**
   * Get a message by ID
   */
  async getMessage(id: string): Promise<Message> {
    const response = await this.client.get(`/api/v2/messages/${id}`);
    return response.data;
  }

  /**
   * Update message status
   */
  async updateMessageStatus(
    id: string,
    status: 'sent' | 'delivered' | 'read' | 'failed'
  ): Promise<Message> {
    const response = await this.client.patch(`/api/v2/messages/${id}`, {
      status
    });
    return response.data;
  }

  // ==================== Customers ====================

  /**
   * List customers
   */
  async listCustomers(
    search?: string,
    limit = 50,
    offset = 0
  ): Promise<PaginatedResponse<Customer>> {
    const response = await this.client.get('/api/v2/customers', {
      params: { search, limit, offset }
    });
    return response.data;
  }

  /**
   * Get a customer by ID
   */
  async getCustomer(id: string): Promise<Customer> {
    const response = await this.client.get(`/api/v2/customers/${id}`);
    return response.data;
  }

  /**
   * Create a customer
   */
  async createCustomer(data: {
    name: string;
    email?: string;
    phone?: string;
    metadata?: Record<string, any>;
  }): Promise<Customer> {
    const response = await this.client.post('/api/v2/customers', data);
    return response.data;
  }

  /**
   * Update a customer
   */
  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const response = await this.client.patch(`/api/v2/customers/${id}`, data);
    return response.data;
  }

  // ==================== Integrations ====================

  /**
   * List integrations
   */
  async listIntegrations(): Promise<Integration[]> {
    const response = await this.client.get('/api/v2/integrations');
    return response.data;
  }

  /**
   * Get an integration by ID
   */
  async getIntegration(id: string): Promise<Integration> {
    const response = await this.client.get(`/api/v2/integrations/${id}`);
    return response.data;
  }

  /**
   * Create an integration
   */
  async createIntegration(input: IntegrationInput): Promise<Integration> {
    const response = await this.client.post('/api/v2/integrations', input);
    return response.data;
  }

  /**
   * Update an integration
   */
  async updateIntegration(
    id: string,
    data: Partial<IntegrationInput>
  ): Promise<Integration> {
    const response = await this.client.patch(`/api/v2/integrations/${id}`, data);
    return response.data;
  }

  /**
   * Delete an integration
   */
  async deleteIntegration(id: string): Promise<void> {
    await this.client.delete(`/api/v2/integrations/${id}`);
  }

  /**
   * Sync an integration
   */
  async syncIntegration(
    id: string,
    options?: {
      entity_types?: string[];
      since?: Date;
      until?: Date;
    }
  ): Promise<SyncResult> {
    const response = await this.client.post(`/api/v2/integrations/${id}/sync`, options);
    return response.data;
  }

  /**
   * Test integration connection
   */
  async testIntegrationConnection(id: string): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    const response = await this.client.post(`/api/v2/integrations/${id}/test`);
    return response.data;
  }

  // ==================== Webhooks ====================

  /**
   * Subscribe to webhook events
   */
  async subscribeWebhook(
    events: string[],
    url: string,
    secret?: string
  ): Promise<WebhookEndpoint> {
    const response = await this.client.post('/api/v2/webhooks', {
      events,
      url,
      secret
    });
    return response.data;
  }

  /**
   * List webhook endpoints
   */
  async listWebhooks(): Promise<WebhookEndpoint[]> {
    const response = await this.client.get('/api/v2/webhooks');
    return response.data;
  }

  /**
   * Update webhook endpoint
   */
  async updateWebhook(
    id: string,
    data: {
      events?: string[];
      url?: string;
      is_active?: boolean;
    }
  ): Promise<WebhookEndpoint> {
    const response = await this.client.patch(`/api/v2/webhooks/${id}`, data);
    return response.data;
  }

  /**
   * Delete webhook endpoint
   */
  async deleteWebhook(id: string): Promise<void> {
    await this.client.delete(`/api/v2/webhooks/${id}`);
  }

  // ==================== Analytics ====================

  /**
   * Get analytics metrics
   */
  async getMetrics(
    timeWindow: 'hour' | 'day' | 'week' | 'month',
    startTime?: Date,
    endTime?: Date
  ): Promise<any> {
    const response = await this.client.get('/api/v2/analytics/metrics', {
      params: {
        timeWindow,
        startTime: startTime?.toISOString(),
        endTime: endTime?.toISOString()
      }
    });
    return response.data;
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<any> {
    const response = await this.client.get('/api/v2/analytics/conversations', {
      params: { period }
    });
    return response.data;
  }

  // ==================== Real-time Events ====================

  /**
   * Connect to real-time events via WebSocket
   */
  connectWebSocket(options?: {
    reconnect?: boolean;
    events?: string[];
  }): WebSocket {
    const wsUrl = this.client.defaults.baseURL?.replace('http', 'ws') + '/ws';
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      // Authenticate with API key
      ws.send(JSON.stringify({
        type: 'auth',
        api_key: this.apiKey,
        events: options?.events
      }));
      
      this.emit('connected');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type, data.payload);
      } catch (error) {
        if (this.debug) {
          this.emit('debug', {
            stage: 'websocket-message-error',
            message: error.message,
            stack: error.stack
          });
        }
      }
    };
    
    ws.onerror = (error) => {
      this.emit('error', error);
    };
    
    ws.onclose = () => {
      this.emit('disconnected');
      
      if (options?.reconnect !== false) {
        // Reconnect after 5 seconds
        setTimeout(() => {
          this.connectWebSocket(options);
        }, 5000);
      }
    };
    
    return ws;
  }

  // ==================== Utilities ====================

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error.response) {
      // Network error
      return true;
    }
    
    const status = error.response.status;
    return status === 429 || status === 503 || status === 504;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set custom header
   */
  setHeader(key: string, value: string): void {
    this.client.defaults.headers.common[key] = value;
  }

  /**
   * Remove custom header
   */
  removeHeader(key: string): void {
    delete this.client.defaults.headers.common[key];
  }

  /**
   * Get current API key
   */
  getApiKey(): string {
    return this.apiKey;
  }

  /**
   * Update API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.client.defaults.headers.common['X-API-Key'] = apiKey;
  }
}
