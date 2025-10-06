/**
 * Auto Response Service - Sprint 07
 * Handles automatic responses based on triggers
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { MessageService } from '../services';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { AutoResponseRepository } from './AutoResponseRepository';
import { KeywordMatcher } from './KeywordMatcher';
import { ScheduleManager } from './ScheduleManager';

export interface IAutoResponse {
  id: string;
  company_id: string;
  name: string;
  channel_type?: string;
  trigger_type: 'keyword' | 'welcome' | 'away' | 'schedule' | 'timeout';
  triggers: ITrigger[];
  response_template_id?: string;
  response_content?: string;
  response_type?: string;
  delay_ms?: number;
  max_uses_per_conversation?: number;
  cooldown_minutes?: number;
  is_active: boolean;
  use_count?: number;
  last_used_at?: Date;
  metadata?: any;
}

export interface ITrigger {
  type: 'keyword' | 'time' | 'event' | 'condition';
  value: any;
  options?: {
    case_sensitive?: boolean;
    exact_match?: boolean;
    regex?: boolean;
  };
}

interface IResponseTracker {
  conversationId: string;
  responseId: string;
  count: number;
  lastUsed: Date;
}

@injectable()
export class AutoResponseService {
  private logger: any;
  private responseTracker: Map<string, IResponseTracker[]> = new Map();
  private responseCache: Map<string, IAutoResponse[]> = new Map();
  private cacheExpiryMs: number = 300000; // 5 minutes
  private lastCacheUpdate: Map<string, number> = new Map();

  constructor(
    @inject(TYPES.OmniAutoResponseRepository) private autoResponseRepository: AutoResponseRepository,
    @inject(TYPES.OmniMessageService) private messageService: MessageService,
    @inject(TYPES.OmniKeywordMatcher) private keywordMatcher: KeywordMatcher,
    @inject(TYPES.OmniScheduleManager) private scheduleManager: ScheduleManager
  ) {
    this.logger = LoggerFactory.create({ file: __filename });
  }

  /**
   * Process message for auto-responses
   */
  async processMessage(message: any, conversation: any, companyId: string): Promise<any[]> {
    const responses: any[] = [];

    try {
      // Get applicable auto-responses
      const autoResponses = await this.getApplicableResponses(companyId, message.channel_type);

      for (const autoResponse of autoResponses) {
        try {
          // Check if response should be triggered
          const shouldTrigger = await this.shouldTriggerResponse(
            autoResponse,
            message,
            conversation,
            companyId
          );

          if (shouldTrigger) {
            // Check rate limiting
            if (!this.isRateLimited(autoResponse, conversation.id)) {
              // Send auto-response
              const response = await this.sendAutoResponse(
                autoResponse,
                message,
                conversation,
                companyId
              );

              responses.push(response);

              // Track response usage
              this.trackResponseUsage(autoResponse, conversation.id);

              // Update database statistics
              await this.autoResponseRepository.incrementUseCount(
                autoResponse.id,
                companyId
              );
            } else {
              this.logger.debug('Auto-response rate limited', {
                responseId: autoResponse.id,
                conversationId: conversation.id
              });
            }
          }
        } catch (error: any) {
          this.logger.error('Failed to process auto-response', {
            responseId: autoResponse.id,
            error: error.message
          });
        }
      }

      return responses;
    } catch (error: any) {
      this.logger.error('Failed to process message for auto-responses', error);
      return responses;
    }
  }

  /**
   * Check if response should be triggered
   */
  private async shouldTriggerResponse(
    autoResponse: IAutoResponse,
    message: any,
    conversation: any,
    companyId: string
  ): Promise<boolean> {
    switch (autoResponse.trigger_type) {
      case 'keyword':
        return this.checkKeywordTrigger(autoResponse, message);

      case 'welcome':
        return this.checkWelcomeTrigger(autoResponse, conversation);

      case 'away':
        return await this.checkAwayTrigger(autoResponse, companyId);

      case 'schedule':
        return this.checkScheduleTrigger(autoResponse);

      case 'timeout':
        return this.checkTimeoutTrigger(autoResponse, conversation);

      default:
        return false;
    }
  }

  /**
   * Check keyword trigger
   */
  private checkKeywordTrigger(autoResponse: IAutoResponse, message: any): boolean {
    if (message.direction !== 'inbound') {
      return false;
    }

    const keywords = autoResponse.triggers
      .filter(t => t.type === 'keyword')
      .map(t => ({
        keyword: t.value,
        options: t.options || {}
      }));

    return this.keywordMatcher.matchesAny(message.content, keywords);
  }

  /**
   * Check welcome trigger
   */
  private checkWelcomeTrigger(autoResponse: IAutoResponse, conversation: any): boolean {
    // Trigger if this is the first message in the conversation
    const isNewConversation = !conversation.last_message_at ||
      (Date.now() - new Date(conversation.last_message_at).getTime() > 86400000); // 24 hours

    return isNewConversation;
  }

  /**
   * Check away trigger
   */
  private async checkAwayTrigger(autoResponse: IAutoResponse, companyId: string): Promise<boolean> {
    // Check if current time is outside business hours
    const schedule = autoResponse.triggers.find(t => t.type === 'time');
    if (schedule) {
      return !this.scheduleManager.isWithinSchedule(schedule.value);
    }
    return false;
  }

  /**
   * Check schedule trigger
   */
  private checkScheduleTrigger(autoResponse: IAutoResponse): boolean {
    const schedule = autoResponse.triggers.find(t => t.type === 'time');
    if (schedule) {
      return this.scheduleManager.isWithinSchedule(schedule.value);
    }
    return false;
  }

  /**
   * Check timeout trigger
   */
  private checkTimeoutTrigger(autoResponse: IAutoResponse, conversation: any): boolean {
    const timeoutTrigger = autoResponse.triggers.find(t => t.type === 'condition' && t.value.type === 'timeout');
    if (!timeoutTrigger) return false;

    const timeoutMs = timeoutTrigger.value.timeout_ms || 300000; // 5 minutes default
    const lastMessageTime = conversation.last_message_at ? new Date(conversation.last_message_at).getTime() : 0;

    return Date.now() - lastMessageTime > timeoutMs;
  }

  /**
   * Send auto-response
   */
  private async sendAutoResponse(
    autoResponse: IAutoResponse,
    triggerMessage: any,
    conversation: any,
    companyId: string
  ): Promise<any> {
    // Apply delay if specified
    if (autoResponse.delay_ms && autoResponse.delay_ms > 0) {
      await new Promise(resolve => setTimeout(resolve, autoResponse.delay_ms));
    }

    // Prepare message data
    const messageData = {
      company_id: companyId,
      conversation_id: conversation.id,
      channel_id: conversation.channel_id,
      direction: 'outbound' as const,
      sender_type: 'system' as const,
      sender_id: 'auto_response',
      recipient_identifier: triggerMessage.sender_id,
      content: this.processResponseContent(autoResponse, triggerMessage, conversation),
      content_type: autoResponse.response_type || 'text',
      template_id: autoResponse.response_template_id,
      metadata: {
        auto_response_id: autoResponse.id,
        auto_response_name: autoResponse.name,
        trigger_type: autoResponse.trigger_type,
        automated: true
      }
    };

    const sentMessage = await this.messageService.sendMessage(messageData as any, companyId);

    this.logger.info('Auto-response sent', {
      responseId: autoResponse.id,
      conversationId: conversation.id,
      messageId: sentMessage.id
    });

    return sentMessage;
  }

  /**
   * Process response content with variables
   */
  private processResponseContent(
    autoResponse: IAutoResponse,
    message: any,
    conversation: any
  ): string {
    let content = autoResponse.response_content || '';

    // Replace variables
    content = content.replace(/\{\{customer_name\}\}/g, conversation.customer_name || 'Customer');
    content = content.replace(/\{\{agent_name\}\}/g, conversation.agent_name || 'Agent');
    content = content.replace(/\{\{company_name\}\}/g, conversation.company_name || 'Company');
    content = content.replace(/\{\{current_time\}\}/g, new Date().toLocaleTimeString());
    content = content.replace(/\{\{current_date\}\}/g, new Date().toLocaleDateString());

    return content;
  }

  /**
   * Check if response is rate limited
   */
  private isRateLimited(autoResponse: IAutoResponse, conversationId: string): boolean {
    const key = `${conversationId}:${autoResponse.id}`;
    const tracker = this.getResponseTracker(key);

    // Check max uses per conversation
    if (autoResponse.max_uses_per_conversation) {
      if (tracker && tracker.count >= autoResponse.max_uses_per_conversation) {
        return true;
      }
    }

    // Check cooldown period
    if (autoResponse.cooldown_minutes && tracker) {
      const cooldownMs = autoResponse.cooldown_minutes * 60 * 1000;
      if (Date.now() - tracker.lastUsed.getTime() < cooldownMs) {
        return true;
      }
    }

    return false;
  }

  /**
   * Track response usage
   */
  private trackResponseUsage(autoResponse: IAutoResponse, conversationId: string): void {
    const key = `${conversationId}:${autoResponse.id}`;
    const tracker = this.getResponseTracker(key);

    if (tracker) {
      tracker.count++;
      tracker.lastUsed = new Date();
    } else {
      const trackers = this.responseTracker.get(conversationId) || [];
      trackers.push({
        conversationId,
        responseId: autoResponse.id,
        count: 1,
        lastUsed: new Date()
      });
      this.responseTracker.set(conversationId, trackers);
    }
  }

  /**
   * Get response tracker
   */
  private getResponseTracker(key: string): IResponseTracker | undefined {
    const [conversationId, responseId] = key.split(':');
    const trackers = this.responseTracker.get(conversationId);
    return trackers?.find(t => t.responseId === responseId);
  }

  /**
   * Get applicable auto-responses
   */
  private async getApplicableResponses(companyId: string, channelType?: string): Promise<IAutoResponse[]> {
    const cacheKey = `responses:${companyId}:${channelType || 'all'}`;
    const lastUpdate = this.lastCacheUpdate.get(cacheKey) || 0;

    if (Date.now() - lastUpdate < this.cacheExpiryMs && this.responseCache.has(cacheKey)) {
      return this.responseCache.get(cacheKey)!;
    }

    // Fetch from database
    let responses: IAutoResponse[];
    if (channelType) {
      responses = await this.autoResponseRepository.findByChannel(channelType, companyId);
    } else {
      responses = await this.autoResponseRepository.findActiveByCompany(companyId);
    }

    // Update cache
    this.responseCache.set(cacheKey, responses);
    this.lastCacheUpdate.set(cacheKey, Date.now());

    return responses;
  }

  /**
   * Create auto-response
   */
  async createAutoResponse(data: Partial<IAutoResponse>, companyId: string): Promise<IAutoResponse> {
    const autoResponse = await this.autoResponseRepository.create({
      ...data,
      company_id: companyId
    } as IAutoResponse, companyId);

    this.clearCache(companyId);
    return autoResponse;
  }

  /**
   * Update auto-response
   */
  async updateAutoResponse(id: string, updates: Partial<IAutoResponse>, companyId: string): Promise<IAutoResponse> {
    const autoResponse = await this.autoResponseRepository.update(id, updates, companyId);
    this.clearCache(companyId);
    return autoResponse;
  }

  /**
   * Delete auto-response
   */
  async deleteAutoResponse(id: string, companyId: string): Promise<boolean> {
    const result = await this.autoResponseRepository.delete(id, companyId);
    this.clearCache(companyId);
    return result;
  }

  /**
   * Clear cache
   */
  private clearCache(companyId: string): void {
    const keysToDelete: string[] = [];
    this.responseCache.forEach((value, key) => {
      if (key.startsWith(`responses:${companyId}`)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.responseCache.delete(key);
      this.lastCacheUpdate.delete(key);
    });
  }

  /**
   * Get auto-response statistics
   */
  async getStatistics(companyId: string): Promise<any> {
    return await this.autoResponseRepository.getStatistics(companyId);
  }
}