/**
 * Message Service - Sprint 05
 * Business logic for managing omnichannel messages
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { MessageRepository } from '../repositories/MessageRepository';
import { IMessage, IMessageCreate } from '../interfaces/IMessage';
import { ChannelType } from '../types/channel.types';
import winston from 'winston';

@injectable()
export class MessageService {
  constructor(
    @inject(TYPES.OmniMessageRepository) private messageRepository: MessageRepository,
    @inject(TYPES.Logger) private logger: winston.Logger
  ) {}

  /**
   * Send a message
   */
  async sendMessage(data: IMessageCreate, companyId: string): Promise<IMessage> {
    try {
      this.logger.info('Sending message', {
        conversationId: data.conversation_id,
        channelId: data.channel_id,
        direction: data.direction,
        companyId
      });

      // Validate message content
      if (!data.content || (typeof data.content === 'object' && !data.content.text && !data.content.attachments)) {
        throw new Error('Message content is required');
      }

      // Set default status based on direction
      if (!data.status) {
        data.status = data.direction === 'outbound' ? 'pending' : 'received';
      }

      // Create message
      const message = await this.messageRepository.create(data, companyId);

      // TODO: Send message through actual channel provider
      // For now, just simulate sending
      if (data.direction === 'outbound') {
        setTimeout(() => this.simulateMessageDelivery(message.id, companyId), 1000);
      }

      this.logger.info('Message created successfully', {
        messageId: message.id,
        conversationId: message.conversation_id
      });

      return message;
    } catch (error) {
      this.logger.error('Failed to send message', { error, data });
      throw error;
    }
  }

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(
    conversationId: string,
    companyId: string,
    limit: number = 50
  ): Promise<IMessage[]> {
    try {
      const messages = await this.messageRepository.findByConversation(conversationId, companyId, limit);
      return messages || [];
    } catch (error) {
      this.logger.error('Failed to get conversation messages', { error, conversationId, companyId });
      return [];
    }
  }

  /**
   * Update message status
   */
  async updateMessageStatus(
    messageId: string,
    status: string,
    companyId: string
  ): Promise<IMessage | null> {
    try {
      this.logger.info('Updating message status', { messageId, status, companyId });

      const message = await this.messageRepository.findById(messageId, companyId);
      if (!message) {
        return null;
      }

      const updated = await this.messageRepository.updateStatus(messageId, status, companyId);

      if (updated) {
        const updatedMessage = await this.messageRepository.findById(messageId, companyId);
        this.logger.info('Message status updated successfully', { messageId, status });
        return updatedMessage;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to update message status', { error, messageId, status });
      throw error;
    }
  }

  /**
   * Mark messages as read for a conversation
   */
  async markMessagesAsRead(conversationId: string, companyId: string): Promise<number> {
    try {
      this.logger.info('Marking messages as read', { conversationId, companyId });

      const count = await this.messageRepository.markAsRead(conversationId, companyId);

      this.logger.info('Messages marked as read', { conversationId, count });
      return count;
    } catch (error) {
      this.logger.error('Failed to mark messages as read', { error, conversationId });
      throw error;
    }
  }

  /**
   * Search messages
   */
  async searchMessages(searchTerm: string, companyId: string): Promise<IMessage[]> {
    try {
      this.logger.info('Searching messages', { searchTerm, companyId });

      const messages = await this.messageRepository.search(searchTerm, companyId);
      return messages || [];
    } catch (error) {
      this.logger.error('Failed to search messages', { error, searchTerm });
      return [];
    }
  }

  /**
   * Retry a failed message
   */
  async retryFailedMessage(messageId: string, companyId: string): Promise<IMessage | null> {
    try {
      this.logger.info('Retrying failed message', { messageId, companyId });

      const message = await this.messageRepository.findById(messageId, companyId);
      if (!message) {
        return null;
      }

      // Only retry failed outbound messages
      if (message.status !== 'failed' || message.direction !== 'outbound') {
        throw new Error('Only failed outbound messages can be retried');
      }

      // Update status to pending
      await this.messageRepository.updateStatus(messageId, 'pending', companyId);

      // Update retry count in metadata
      const updatedMetadata = {
        ...message.metadata,
        retry_count: (message.metadata?.retry_count || 0) + 1,
        last_retry_at: new Date().toISOString()
      };

      await this.messageRepository.updateMetadata(messageId, updatedMetadata, companyId);

      // TODO: Actually resend the message through the channel
      // For now, simulate retry
      setTimeout(() => this.simulateMessageDelivery(messageId, companyId), 2000);

      const updatedMessage = await this.messageRepository.findById(messageId, companyId);
      this.logger.info('Message retry initiated', { messageId });
      return updatedMessage;
    } catch (error) {
      this.logger.error('Failed to retry message', { error, messageId });
      throw error;
    }
  }

  /**
   * Get message statistics for a conversation
   */
  async getConversationMessageStats(conversationId: string, companyId: string): Promise<any> {
    try {
      const stats = await this.messageRepository.getConversationStats(conversationId, companyId);
      return stats;
    } catch (error) {
      this.logger.error('Failed to get conversation message stats', { error, conversationId });
      throw error;
    }
  }

  /**
   * Get failed messages for a channel
   */
  async getFailedMessages(channelId: string, companyId: string): Promise<IMessage[]> {
    try {
      const messages = await this.messageRepository.findFailedByChannel(channelId, companyId);
      return messages || [];
    } catch (error) {
      this.logger.error('Failed to get failed messages', { error, channelId });
      return [];
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, companyId: string): Promise<boolean> {
    try {
      this.logger.info('Deleting message', { messageId, companyId });

      const deleted = await this.messageRepository.delete(messageId, companyId);

      if (deleted) {
        this.logger.info('Message deleted successfully', { messageId });
      }

      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete message', { error, messageId });
      throw error;
    }
  }

  /**
   * Create a message from webhook
   */
  async createWebhookMessage(
    channelType: ChannelType,
    channelId: string,
    webhookData: any,
    companyId: string
  ): Promise<IMessage> {
    try {
      this.logger.info('Creating message from webhook', {
        channelType,
        channelId,
        companyId
      });

      // Parse webhook data based on channel type
      const messageData = this.parseWebhookData(channelType, webhookData);

      // Add channel information
      messageData.channel_id = channelId;
      messageData.channel_type = channelType;
      messageData.company_id = companyId;

      // Create the message
      const message = await this.messageRepository.create(messageData, companyId);

      this.logger.info('Webhook message created successfully', {
        messageId: message.id,
        channelType
      });

      return message;
    } catch (error) {
      this.logger.error('Failed to create webhook message', { error, channelType, webhookData });
      throw error;
    }
  }

  /**
   * Parse webhook data based on channel type
   */
  private parseWebhookData(channelType: ChannelType, webhookData: any): IMessageCreate {
    const baseMessage: Partial<IMessageCreate> = {
      direction: 'inbound',
      status: 'received',
      received_at: new Date(),
      metadata: {
        webhook_payload: webhookData
      }
    };

    switch (channelType) {
      case ChannelType.WHATSAPP:
        return {
          ...baseMessage,
          conversation_id: webhookData.conversationId || '',
          sender: webhookData.from || 'unknown',
          content: {
            text: webhookData.text || '',
            type: webhookData.type || 'text',
            attachments: webhookData.attachments
          },
          external_id: webhookData.messageId
        } as IMessageCreate;

      case ChannelType.EMAIL:
        return {
          ...baseMessage,
          conversation_id: webhookData.conversationId || '',
          sender: webhookData.from || 'unknown',
          content: {
            text: webhookData.text || webhookData.html || '',
            type: 'text',
            subject: webhookData.subject,
            attachments: webhookData.attachments
          },
          external_id: webhookData.messageId
        } as IMessageCreate;

      case ChannelType.SMS:
        return {
          ...baseMessage,
          conversation_id: webhookData.conversationId || '',
          sender: webhookData.from || 'unknown',
          content: {
            text: webhookData.body || '',
            type: 'text'
          },
          external_id: webhookData.messageSid || webhookData.id
        } as IMessageCreate;

      default:
        return {
          ...baseMessage,
          conversation_id: webhookData.conversationId || '',
          sender: webhookData.sender || 'unknown',
          content: {
            text: webhookData.text || '',
            type: 'text'
          },
          external_id: webhookData.id
        } as IMessageCreate;
    }
  }

  /**
   * Simulate message delivery (for testing)
   */
  private async simulateMessageDelivery(messageId: string, companyId: string): Promise<void> {
    try {
      // Randomly decide if message was delivered successfully
      const success = Math.random() > 0.1; // 90% success rate

      if (success) {
        await this.messageRepository.updateStatus(messageId, 'delivered', companyId);
      } else {
        await this.messageRepository.updateStatus(messageId, 'failed', companyId);
      }
    } catch (error) {
      this.logger.error('Failed to simulate message delivery', { error, messageId });
    }
  }
}