/**
 * Conversation Service - Sprint 05
 * Business logic for managing omnichannel conversations
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { ConversationRepository } from '../repositories/ConversationRepository';
import { IConversation, IConversationCreate, IConversationUpdate } from '../interfaces/IConversation';
import winston from 'winston';

@injectable()
export class ConversationService {
  constructor(
    @inject(TYPES.OmniConversationRepository) private conversationRepository: ConversationRepository,
    @inject(TYPES.Logger) private logger: winston.Logger
  ) {}

  /**
   * Create a new conversation
   */
  async createConversation(data: IConversationCreate, companyId: string): Promise<IConversation> {
    try {
      this.logger.info('Creating new conversation', {
        channelId: data.channel_id,
        customerId: data.customer_id,
        companyId
      });

      const conversation = await this.conversationRepository.create(data, companyId);

      this.logger.info('Conversation created successfully', {
        conversationId: conversation.id,
        channelId: conversation.channel_id
      });

      return conversation;
    } catch (error) {
      this.logger.error('Failed to create conversation', { error, data });
      throw error;
    }
  }

  /**
   * Get conversations with filters
   */
  async getConversations(filters: any, companyId: string): Promise<IConversation[]> {
    try {
      const conversations = await this.conversationRepository.findByFilters(filters, companyId);
      return conversations || [];
    } catch (error) {
      this.logger.error('Failed to get conversations', { error, filters, companyId });
      return [];
    }
  }

  /**
   * Get conversation by ID
   */
  async getConversationById(conversationId: string, companyId: string): Promise<IConversation | null> {
    try {
      const conversation = await this.conversationRepository.findById(conversationId, companyId);
      return conversation;
    } catch (error) {
      this.logger.error('Failed to get conversation by ID', { error, conversationId, companyId });
      throw error;
    }
  }

  /**
   * Update conversation
   */
  async updateConversation(
    conversationId: string,
    data: IConversationUpdate,
    companyId: string
  ): Promise<IConversation | null> {
    try {
      this.logger.info('Updating conversation', { conversationId, companyId });

      const conversation = await this.conversationRepository.findById(conversationId, companyId);
      if (!conversation) {
        return null;
      }

      const updated = await this.conversationRepository.update(conversationId, data, companyId);

      if (updated) {
        const updatedConversation = await this.conversationRepository.findById(conversationId, companyId);
        this.logger.info('Conversation updated successfully', { conversationId });
        return updatedConversation;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to update conversation', { error, conversationId });
      throw error;
    }
  }

  /**
   * Assign conversation to agent
   */
  async assignConversation(
    conversationId: string,
    data: { agent_id: string; notes?: string },
    companyId: string
  ): Promise<IConversation | null> {
    try {
      this.logger.info('Assigning conversation', {
        conversationId,
        agentId: data.agent_id,
        companyId
      });

      const conversation = await this.conversationRepository.findById(conversationId, companyId);
      if (!conversation) {
        return null;
      }

      const updateData: IConversationUpdate = {
        assigned_to: data.agent_id,
        metadata: {
          ...conversation.metadata,
          assignment_notes: data.notes,
          assigned_at: new Date().toISOString()
        }
      };

      const updated = await this.conversationRepository.update(conversationId, updateData, companyId);

      if (updated) {
        const updatedConversation = await this.conversationRepository.findById(conversationId, companyId);
        this.logger.info('Conversation assigned successfully', { conversationId, agentId: data.agent_id });
        return updatedConversation;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to assign conversation', { error, conversationId });
      throw error;
    }
  }

  /**
   * Resolve conversation
   */
  async resolveConversation(conversationId: string, companyId: string): Promise<IConversation | null> {
    try {
      this.logger.info('Resolving conversation', { conversationId, companyId });

      const conversation = await this.conversationRepository.findById(conversationId, companyId);
      if (!conversation) {
        return null;
      }

      const updateData: IConversationUpdate = {
        status: 'resolved',
        resolved_at: new Date(),
        metadata: {
          ...conversation.metadata,
          resolved_by: 'system', // Should be replaced with actual user ID
          resolution_time: Date.now() - new Date(conversation.created_at).getTime()
        }
      };

      const updated = await this.conversationRepository.update(conversationId, updateData, companyId);

      if (updated) {
        const updatedConversation = await this.conversationRepository.findById(conversationId, companyId);
        this.logger.info('Conversation resolved successfully', { conversationId });
        return updatedConversation;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to resolve conversation', { error, conversationId });
      throw error;
    }
  }

  /**
   * Reopen conversation
   */
  async reopenConversation(conversationId: string, companyId: string): Promise<IConversation | null> {
    try {
      this.logger.info('Reopening conversation', { conversationId, companyId });

      const conversation = await this.conversationRepository.findById(conversationId, companyId);
      if (!conversation) {
        return null;
      }

      const updateData: IConversationUpdate = {
        status: 'active',
        resolved_at: undefined,
        metadata: {
          ...conversation.metadata,
          reopened_at: new Date().toISOString(),
          reopened_count: (conversation.metadata?.reopened_count || 0) + 1
        }
      };

      const updated = await this.conversationRepository.update(conversationId, updateData, companyId);

      if (updated) {
        const updatedConversation = await this.conversationRepository.findById(conversationId, companyId);
        this.logger.info('Conversation reopened successfully', { conversationId });
        return updatedConversation;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to reopen conversation', { error, conversationId });
      throw error;
    }
  }

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId: string, companyId: string): Promise<boolean> {
    try {
      this.logger.info('Marking conversation as read', { conversationId, companyId });

      const conversation = await this.conversationRepository.findById(conversationId, companyId);
      if (!conversation) {
        return false;
      }

      const updateData: IConversationUpdate = {
        unread_count: 0,
        last_read: new Date(),
        metadata: {
          ...conversation.metadata,
          last_read_by: 'system', // Should be replaced with actual user ID
          last_read_at: new Date().toISOString()
        }
      };

      const updated = await this.conversationRepository.update(conversationId, updateData, companyId);

      if (updated) {
        this.logger.info('Conversation marked as read', { conversationId });
      }

      return updated;
    } catch (error) {
      this.logger.error('Failed to mark conversation as read', { error, conversationId });
      throw error;
    }
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(companyId: string): Promise<any> {
    try {
      const stats = await this.conversationRepository.getStats(companyId);

      // Add calculated metrics
      const enhancedStats = {
        ...stats,
        avgResolutionTime: stats.totalResolutionTime && stats.resolved
          ? Math.round(stats.totalResolutionTime / stats.resolved)
          : 0,
        resolutionRate: stats.total
          ? ((stats.resolved || 0) / stats.total * 100).toFixed(1)
          : 0,
        activeRate: stats.total
          ? ((stats.active || 0) / stats.total * 100).toFixed(1)
          : 0
      };

      return enhancedStats;
    } catch (error) {
      this.logger.error('Failed to get conversation stats', { error, companyId });
      throw error;
    }
  }

  /**
   * Get active conversations for an agent
   */
  async getAgentConversations(agentId: string, companyId: string): Promise<IConversation[]> {
    try {
      const filters = {
        assigned_to: agentId,
        status: ['active', 'pending']
      };

      const conversations = await this.conversationRepository.findByFilters(filters, companyId);
      return conversations || [];
    } catch (error) {
      this.logger.error('Failed to get agent conversations', { error, agentId, companyId });
      return [];
    }
  }

  /**
   * Get unassigned conversations
   */
  async getUnassignedConversations(companyId: string): Promise<IConversation[]> {
    try {
      const filters = {
        assigned_to: null,
        status: ['active', 'pending']
      };

      const conversations = await this.conversationRepository.findByFilters(filters, companyId);
      return conversations || [];
    } catch (error) {
      this.logger.error('Failed to get unassigned conversations', { error, companyId });
      return [];
    }
  }

  /**
   * Bulk assign conversations
   */
  async bulkAssign(conversationIds: string[], agentId: string, companyId: string): Promise<number> {
    try {
      let assignedCount = 0;

      for (const conversationId of conversationIds) {
        const result = await this.assignConversation(conversationId, { agent_id: agentId }, companyId);
        if (result) {
          assignedCount++;
        }
      }

      this.logger.info('Bulk assignment completed', {
        total: conversationIds.length,
        assigned: assignedCount,
        agentId
      });

      return assignedCount;
    } catch (error) {
      this.logger.error('Failed to bulk assign conversations', { error, conversationIds, agentId });
      throw error;
    }
  }
}