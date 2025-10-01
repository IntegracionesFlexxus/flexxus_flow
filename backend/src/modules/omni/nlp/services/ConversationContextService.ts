/**
 * Conversation Context Service - Sprint 12
 * Service for managing conversation context
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { ConversationContextRepository } from '../repositories/ConversationContextRepository';
import { IConversationContext } from '../../interfaces/INLPModel';
import { ContextType } from '../../types/nlp.types';

@injectable()
export class ConversationContextService {
  constructor(
    @inject(TYPES.ConversationContextRepository)
    private contextRepository: ConversationContextRepository,

    @inject(TYPES.LoggerService)
    private logger: any
  ) {}

  /**
   * Add context to conversation
   */
  async addContext(
    conversationId: string,
    contextType: ContextType,
    contextData: Record<string, any>,
    tenantId: string,
    options?: {
      contextSummary?: string;
      relevanceScore?: number;
      ttlMinutes?: number;
    }
  ): Promise<IConversationContext> {
    this.logger.info('Adding conversation context', { conversationId, contextType, tenantId });

    const expiresAt = options?.ttlMinutes
      ? new Date(Date.now() + options.ttlMinutes * 60 * 1000)
      : undefined;

    return await this.contextRepository.create(
      conversationId,
      contextType,
      contextData,
      tenantId,
      {
        contextSummary: options?.contextSummary,
        relevanceScore: options?.relevanceScore,
        expiresAt
      }
    );
  }

  /**
   * Get all context for a conversation
   */
  async getConversationContext(conversationId: string, tenantId: string): Promise<IConversationContext[]> {
    return await this.contextRepository.findByConversation(conversationId, tenantId);
  }

  /**
   * Get specific type of context
   */
  async getContextByType(
    conversationId: string,
    contextType: ContextType,
    tenantId: string
  ): Promise<IConversationContext[]> {
    return await this.contextRepository.findByConversationAndType(conversationId, contextType, tenantId);
  }

  /**
   * Get aggregated context summary
   */
  async getContextSummary(conversationId: string, tenantId: string): Promise<Record<string, any>> {
    const contexts = await this.getConversationContext(conversationId, tenantId);

    const summary: Record<string, any> = {
      total_contexts: contexts.length,
      by_type: {} as Record<string, number>,
      user_profile: null,
      intent_history: [],
      emotional_state: null
    };

    contexts.forEach(context => {
      // Count by type
      summary.by_type[context.context_type] = (summary.by_type[context.context_type] || 0) + 1;

      // Extract specific contexts
      switch (context.context_type) {
        case ContextType.USER_PROFILE:
          summary.user_profile = context.context_data;
          break;

        case ContextType.INTENT_CONTEXT:
          summary.intent_history.push(context.context_data);
          break;

        case ContextType.EMOTIONAL_CONTEXT:
          summary.emotional_state = context.context_data;
          break;
      }
    });

    return summary;
  }

  /**
   * Update context relevance score
   */
  async updateRelevanceScore(
    contextId: string,
    relevanceScore: number,
    tenantId: string
  ): Promise<IConversationContext | null> {
    this.logger.info('Updating context relevance', { contextId, relevanceScore });

    return await this.contextRepository.update(contextId, tenantId, {
      relevance_score: relevanceScore
    });
  }

  /**
   * Clean up expired contexts
   */
  async cleanupExpiredContexts(tenantId: string): Promise<number> {
    this.logger.info('Cleaning up expired contexts', { tenantId });

    const deletedCount = await this.contextRepository.deleteExpired(tenantId);

    this.logger.info('Expired contexts cleaned up', { deletedCount });

    return deletedCount;
  }

  /**
   * Delete context
   */
  async deleteContext(contextId: string, tenantId: string): Promise<boolean> {
    return await this.contextRepository.delete(contextId, tenantId);
  }

  /**
   * Clear all context for a conversation
   */
  async clearConversationContext(conversationId: string, tenantId: string): Promise<void> {
    const contexts = await this.getConversationContext(conversationId, tenantId);

    await Promise.all(
      contexts.map(context => this.contextRepository.delete(context.id, tenantId))
    );

    this.logger.info('Conversation context cleared', { conversationId, count: contexts.length });
  }
}
