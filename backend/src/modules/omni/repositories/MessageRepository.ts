/**
 * Message Repository - Sprint 05
 * Repository for managing omnichannel messages
 */

import { injectable } from 'inversify';
import { BaseOmniRepository, QueryOptions } from './base/BaseOmniRepository';
import { IMessage, IMessageCreate, IMessageUpdate } from '../interfaces/IMessage';
import { MessageStatus, MessageSenderType, MessageContentType } from '../types/message.types';

@injectable()
export class MessageRepository extends BaseOmniRepository<IMessage> {
  protected tableName = 'messages';

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(
    conversationId: string,
    companyId: string,
    options: QueryOptions = {}
  ): Promise<IMessage[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE conversation_id = $1 AND company_id = $2
      ORDER BY created_at ${options.orderDirection === 'ASC' ? 'ASC' : 'DESC'}
      ${options.limit ? `LIMIT ${options.limit}` : ''}
      ${options.offset ? `OFFSET ${options.offset}` : ''}
    `;

    const result = await this.executeQuery(query, [conversationId, companyId], companyId);
    return result.rows as IMessage[];
  }

  /**
   * Get last message of conversation
   */
  async getLastMessage(conversationId: string, companyId: string): Promise<IMessage | null> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE conversation_id = $1 AND company_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.executeQuery(query, [conversationId, companyId], companyId);
    return result.rows[0] as IMessage || null;
  }

  /**
   * Create a new message
   */
  async createMessage(data: IMessageCreate, companyId: string): Promise<IMessage> {
    const message = await this.create(data as Partial<IMessage>, companyId);

    // Update conversation's last_message_at
    await this.updateConversationActivity(data.conversation_id, companyId);

    // If it's an agent's first response, update first_response_at
    if (data.sender_type === MessageSenderType.AGENT) {
      await this.updateFirstResponseTime(data.conversation_id, companyId);
    }

    return message;
  }

  /**
   * Update message status
   */
  async updateStatus(
    messageId: string,
    status: MessageStatus,
    companyId: string
  ): Promise<IMessage | null> {
    const updates: Partial<IMessage> = { status };

    // Add timestamps based on status
    switch (status) {
      case MessageStatus.DELIVERED:
        updates.delivered_at = new Date();
        break;
      case MessageStatus.READ:
        updates.read_at = new Date();
        break;
    }

    return this.update(messageId, updates, companyId);
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string, companyId: string): Promise<number> {
    const query = `
      UPDATE ${this.tableName}
      SET
        status = $1,
        read_at = CURRENT_TIMESTAMP
      WHERE conversation_id = $2
        AND company_id = $3
        AND status != $1
        AND sender_type = $4
    `;

    const result = await this.executeQuery(
      query,
      [MessageStatus.READ, conversationId, companyId, MessageSenderType.CUSTOMER],
      companyId
    );

    return result.rowCount;
  }

  /**
   * Get unread messages count
   */
  async getUnreadCount(conversationId: string, companyId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE conversation_id = $1
        AND company_id = $2
        AND status != $3
        AND sender_type = $4
    `;

    const result = await this.executeQuery(
      query,
      [conversationId, companyId, MessageStatus.READ, MessageSenderType.CUSTOMER],
      companyId
    );

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get messages by sender
   */
  async getMessagesBySender(
    senderId: string,
    senderType: MessageSenderType,
    companyId: string,
    options: QueryOptions = {}
  ): Promise<IMessage[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE sender_id = $1
        AND sender_type = $2
        AND company_id = $3
      ORDER BY created_at DESC
      ${options.limit ? `LIMIT ${options.limit}` : ''}
      ${options.offset ? `OFFSET ${options.offset}` : ''}
    `;

    const result = await this.executeQuery(
      query,
      [senderId, senderType, companyId],
      companyId
    );

    return result.rows as IMessage[];
  }

  /**
   * Get private notes for conversation
   */
  async getPrivateNotes(conversationId: string, companyId: string): Promise<IMessage[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE conversation_id = $1
        AND company_id = $2
        AND is_private = true
      ORDER BY created_at DESC
    `;

    const result = await this.executeQuery(query, [conversationId, companyId], companyId);
    return result.rows as IMessage[];
  }

  /**
   * Search messages
   */
  async searchMessages(
    searchTerm: string,
    companyId: string,
    options: QueryOptions = {}
  ): Promise<IMessage[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE company_id = $1
        AND to_tsvector('spanish', content) @@ plainto_tsquery('spanish', $2)
      ORDER BY created_at DESC
      ${options.limit ? `LIMIT ${options.limit}` : 'LIMIT 50'}
      ${options.offset ? `OFFSET ${options.offset}` : ''}
    `;

    const result = await this.executeQuery(query, [companyId, searchTerm], companyId);
    return result.rows as IMessage[];
  }

  /**
   * Get failed messages
   */
  async getFailedMessages(companyId: string): Promise<IMessage[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE company_id = $1
        AND status = $2
      ORDER BY created_at DESC
    `;

    const result = await this.executeQuery(
      query,
      [companyId, MessageStatus.FAILED],
      companyId
    );

    return result.rows as IMessage[];
  }

  /**
   * Retry failed message
   */
  async retryMessage(messageId: string, companyId: string): Promise<IMessage | null> {
    return this.update(
      messageId,
      {
        status: MessageStatus.PENDING,
        error_message: null
      } as Partial<IMessage>,
      companyId
    );
  }

  /**
   * Get message statistics for conversation
   */
  async getConversationStats(conversationId: string, companyId: string): Promise<any> {
    const query = `
      SELECT
        COUNT(*) as total_messages,
        COUNT(*) FILTER (WHERE sender_type = 'customer') as customer_messages,
        COUNT(*) FILTER (WHERE sender_type = 'agent') as agent_messages,
        COUNT(*) FILTER (WHERE sender_type = 'system') as system_messages,
        COUNT(*) FILTER (WHERE content_type = 'text') as text_messages,
        COUNT(*) FILTER (WHERE content_type != 'text') as media_messages,
        MIN(created_at) as first_message_at,
        MAX(created_at) as last_message_at
      FROM ${this.tableName}
      WHERE conversation_id = $1 AND company_id = $2
    `;

    const result = await this.executeQuery(query, [conversationId, companyId], companyId);
    return result.rows[0];
  }

  /**
   * Bulk update message status
   */
  async bulkUpdateStatus(
    messageIds: string[],
    status: MessageStatus,
    companyId: string
  ): Promise<number> {
    const query = `
      UPDATE ${this.tableName}
      SET
        status = $1,
        ${status === MessageStatus.DELIVERED ? 'delivered_at = CURRENT_TIMESTAMP,' : ''}
        ${status === MessageStatus.READ ? 'read_at = CURRENT_TIMESTAMP,' : ''}
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($2::uuid[])
        AND company_id = $3
    `;

    const result = await this.executeQuery(query, [status, messageIds, companyId], companyId);
    return result.rowCount;
  }

  // Private helper methods
  private async updateConversationActivity(conversationId: string, companyId: string): Promise<void> {
    const query = `
      UPDATE conversations
      SET last_message_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND company_id = $2
    `;

    await this.executeQuery(query, [conversationId, companyId], companyId);
  }

  private async updateFirstResponseTime(conversationId: string, companyId: string): Promise<void> {
    const query = `
      UPDATE conversations
      SET first_response_at = COALESCE(first_response_at, CURRENT_TIMESTAMP)
      WHERE id = $1 AND company_id = $2 AND first_response_at IS NULL
    `;

    await this.executeQuery(query, [conversationId, companyId], companyId);
  }
}