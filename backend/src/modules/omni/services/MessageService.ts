/**
 * Message Service - Sprint 05
 * Business logic for managing omnichannel messages
 */

import { injectable, inject, optional } from 'inversify';
import { TYPES } from '@/container/types';
import { MessageRepository } from '../repositories/MessageRepository';
import { ConversationRepository } from '../repositories/ConversationRepository';
import { MessageQueue } from '../queues/MessageQueue';
import { IMessage, IMessageCreate } from '../interfaces/IMessage';
import { IConversation } from '../interfaces/IConversation';
import { ChannelType } from '../types/channel.types';
import {
  MessageContentType,
  MessageDirection,
  MessageSenderType,
  MessageStatus
} from '../types/message.types';
import winston from 'winston';
import { hydrateMessage } from '../utils/messageMapper';
import { OmniWebSocketHandler } from '../websocket/OmniWebSocketHandler';

@injectable()
export class MessageService {
  constructor(
    @inject(TYPES.OmniMessageRepository) private messageRepository: MessageRepository,
    @inject(TYPES.OmniConversationRepository) private conversationRepository: ConversationRepository,
    @inject(TYPES.OmniMessageQueue) private messageQueue: MessageQueue,
    @inject(TYPES.Logger) private logger: winston.Logger,
    @inject(TYPES.OmniWebSocketHandler) @optional() private wsHandler?: OmniWebSocketHandler
  ) {}

  /**
   * Send a message
   */
  async sendMessage(data: any, companyId: string): Promise<IMessage> {
    try {
      const { dbPayload, channelId, direction } = await this.normalizeMessagePayload(data, companyId);

      this.logger.info('Sending message', {
        conversationId: dbPayload.conversation_id,
        channelId,
        direction,
        companyId
      });

      if (!dbPayload.content && !dbPayload.media_url) {
        throw new Error('Message content is required');
      }

      const message = await this.messageRepository.createMessage(dbPayload, companyId);
      const hydrated = hydrateMessage(message);

      if (direction === MessageDirection.OUTBOUND) {
        const targetChannelId = channelId || hydrated.channel_id;
        if (!targetChannelId) {
          throw new Error('Channel ID is required to enqueue outbound message');
        }

        await this.messageQueue.enqueueMessage(
          hydrated.id,
          targetChannelId,
          companyId,
          {
            priority: data.priority,
            delay: data.delay
          }
        );
      }

      this.logger.info('Message created successfully', {
        messageId: hydrated.id,
        conversationId: hydrated.conversation_id
      });

      // Emit WebSocket event for real-time updates
      if (this.wsHandler && hydrated.conversation_id) {
        try {
          this.wsHandler.emitMessage(hydrated.conversation_id, hydrated);
          this.logger.info('WebSocket message emitted successfully', {
            messageId: hydrated.id,
            conversationId: hydrated.conversation_id,
            direction: hydrated.direction,
            senderType: hydrated.sender_type
          });
        } catch (wsError) {
          this.logger.warn('Failed to emit WebSocket message event', { wsError, messageId: hydrated.id });
        }
      }

      return hydrated;
    } catch (error) {
      this.logger.error('Failed to send message', { error, data });
      throw error;
    }
  }

  private async normalizeMessagePayload(
    data: any,
    companyId: string
  ): Promise<{ dbPayload: IMessageCreate; channelId?: string; direction: MessageDirection }> {
    const conversationId = data.conversation_id;
    if (!conversationId) {
      throw new Error('conversation_id is required');
    }

    const initialDirection: MessageDirection | undefined = data.direction;
    const initialSenderType: MessageSenderType | undefined = data.sender_type;
    let direction: MessageDirection;
    let senderType: MessageSenderType | undefined = initialSenderType;

    // IMPROVED LOGIC: Determine direction based on available information
    // Priority 1: If direction is explicitly provided, use it
    if (initialDirection) {
      direction = initialDirection;
      this.logger.debug('Using explicit direction', { direction });
    }
    // Priority 2: If sender_type is provided, infer direction from it
    else if (initialSenderType) {
      direction = initialSenderType === MessageSenderType.CUSTOMER
        ? MessageDirection.INBOUND
        : MessageDirection.OUTBOUND;
      this.logger.debug('Inferred direction from sender_type', { senderType: initialSenderType, direction });
    }
    // Priority 3: If sender_id is provided (authenticated agent), assume OUTBOUND
    else if (data.sender_id) {
      direction = MessageDirection.OUTBOUND;
      senderType = MessageSenderType.AGENT;
      this.logger.debug('Inferred OUTBOUND from authenticated sender_id', { sender_id: data.sender_id });
    }
    // Priority 4: Will check conversation later as last resort
    else {
      direction = MessageDirection.INBOUND; // Default, may be overridden
      this.logger.debug('Using default direction (will check conversation)', { direction });
    }

    const contentType: MessageContentType = data.content_type || MessageContentType.TEXT;

    let channelId = data.channel_id;
    let customerId = data.customer_id;
    let recipient = data.recipient || data.recipient_identifier;
    let conversation: IConversation | null = null;

    const needsConversationLookup =
      !channelId ||
      !customerId ||
      (direction === MessageDirection.OUTBOUND && !recipient);

    if (needsConversationLookup) {
      conversation = await this.conversationRepository.findById(conversationId, companyId);
      if (!conversation) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }

      channelId = channelId || conversation.channel_id;
      customerId = customerId || conversation.customer_id;

      // LAST RESORT: Only use conversation assigned_to if we have no other information
      if (!initialDirection && !initialSenderType && !data.sender_id) {
        const hasAssignedAgent = conversation.assigned_to || (conversation.metadata as any)?.autoResponder;
        direction = hasAssignedAgent ? MessageDirection.OUTBOUND : MessageDirection.INBOUND;
        senderType = hasAssignedAgent ? MessageSenderType.AGENT : MessageSenderType.CUSTOMER;
        this.logger.debug('Determined direction from conversation', {
          assigned_to: conversation.assigned_to,
          direction,
          senderType
        });
      }

      if (direction === MessageDirection.OUTBOUND && !recipient) {
        const meta = (conversation.metadata || {}) as Record<string, any>;
        recipient =
          conversation.external_id ||
          meta.customer_phone ||
          meta.phone_number ||
          meta.contact?.phone;
      }
    }

    if (!channelId) {
      throw new Error('Channel ID is required');
    }

    if (direction === MessageDirection.OUTBOUND && !recipient) {
      throw new Error('Recipient is required for outbound messages');
    }

    // Use senderType determined earlier, or infer from direction
    const finalSenderType: MessageSenderType = senderType ||
      (direction === MessageDirection.OUTBOUND
        ? MessageSenderType.AGENT
        : MessageSenderType.CUSTOMER);

    const baseMetadata =
      data.metadata && typeof data.metadata === 'object' ? data.metadata : {};

    const platformData: Record<string, any> = {
      channel_id: channelId,
      recipient,
      direction,
      metadata: baseMetadata
    };

    if (data.template_id) {
      platformData.template = {
        id: data.template_id,
        variables: data.template_variables
      };
    }

    if (typeof data.content === 'object' && data.content !== null) {
      platformData.contentPayload = data.content;
    }

    const contentValue =
      typeof data.content === 'object' && data.content !== null
        ? data.content.text ?? JSON.stringify(data.content)
        : data.content;

    const status: MessageStatus =
      data.status ||
      (direction === MessageDirection.OUTBOUND
        ? MessageStatus.PENDING
        : MessageStatus.RECEIVED);

    const dbPayload: IMessageCreate = {
      conversation_id: conversationId,
      company_id: companyId,
      customer_id: customerId,
      sender_type: finalSenderType,
      sender_id: data.sender_id,
      sender_name: data.sender_name, // Add sender name (agent name)
      content: contentValue,
      content_type: contentType,
      message_type: contentType,
      media_url: data.media_url,
      media_type: data.media_type,
      media_metadata: data.media_metadata,
      status,
      direction, // CRITICAL FIX: Add direction field to database payload
      is_internal: data.is_private ?? false,
      reply_to_message_id: data.reply_to_message_id,
      external_message_id: data.external_message_id,
      platform_data: platformData
    };

    if (direction === MessageDirection.OUTBOUND) {
      dbPayload.sent_at = new Date();
    }

    if (!dbPayload.media_metadata && data.media_url) {
      dbPayload.media_metadata = {};
    }

    // LOG: Final validation of message direction and sender
    this.logger.info('Message normalized successfully', {
      conversationId,
      direction,
      senderType: finalSenderType,
      senderId: data.sender_id,
      senderName: data.sender_name,
      hasExplicitDirection: !!initialDirection,
      hasExplicitSenderType: !!initialSenderType,
      inferredFrom: initialDirection ? 'explicit_direction' :
                    initialSenderType ? 'sender_type' :
                    data.sender_id ? 'authenticated_sender' :
                    'conversation_assigned_to'
    });

    return { dbPayload, channelId, direction };
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
      const messages = await this.messageRepository.getConversationMessages(conversationId, companyId, { limit });
      return this.mapMessages(messages);
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

      const updated = await this.messageRepository.updateStatus(
        messageId,
        status as MessageStatus,
        companyId
      );

      if (!updated) {
        return null;
      }

      this.logger.info('Message status updated successfully', { messageId, status });
      const mapped = this.mapMessage(updated);

      // Emit WebSocket event for status update
      if (this.wsHandler && mapped && mapped.conversation_id) {
        try {
          this.wsHandler.emitMessage(mapped.conversation_id, {
            ...mapped,
            _updateType: 'status_change'
          });
        } catch (wsError) {
          this.logger.warn('Failed to emit WebSocket status update event', { wsError, messageId });
        }
      }

      return mapped;
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
      return this.mapMessages(messages);
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

      const messageRecord = await this.messageRepository.findById(messageId, companyId);
      if (!messageRecord) {
        return null;
      }

      const hydrated = hydrateMessage(messageRecord);

      // Only retry failed outbound messages
      if (
        hydrated.status !== MessageStatus.FAILED ||
        hydrated.direction !== MessageDirection.OUTBOUND
      ) {
        throw new Error('Only failed outbound messages can be retried');
      }

      // Update status to pending
      await this.messageRepository.updateStatus(messageId, MessageStatus.PENDING, companyId);

      // Update retry count in metadata
      const updatedMetadata = {
        ...(hydrated.metadata || {}),
        retry_count: (hydrated.metadata?.retry_count || 0) + 1,
        last_retry_at: new Date().toISOString()
      };

      const updatedPlatformData = {
        ...(hydrated.platform_data || {}),
        metadata: updatedMetadata
      };

      await this.messageRepository.update(
        messageId,
        { platform_data: updatedPlatformData },
        companyId
      );

      // TODO: Actually resend the message through the channel
      // For now, simulate retry
      setTimeout(() => this.simulateMessageDelivery(messageId, companyId), 2000);

      const updatedMessage = await this.messageRepository.findById(messageId, companyId);
      this.logger.info('Message retry initiated', { messageId });
      return this.mapMessage(updatedMessage);
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
      return this.mapMessages(messages);
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

  private mapMessage(message: IMessage | null): IMessage | null {
    return message ? hydrateMessage(message) : null;
  }

  private mapMessages(messages: IMessage[] | null): IMessage[] {
    return (messages || []).map(hydrateMessage);
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

