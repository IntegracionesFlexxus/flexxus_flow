/**
 * Message Repository Interface
 * Omni Module - Sprint 05/06
 */

import { IMessage, IMessageCreate } from './IMessage';

export interface IMessageRepository {
  /**
   * Create a new message
   */
  create(data: Partial<IMessage>, companyId: string): Promise<IMessage>;

  /**
   * Find message by ID
   */
  findById(id: string, companyId: string): Promise<IMessage | null>;

  /**
   * Find message by external ID
   */
  findByExternalId(externalId: string, companyId: string): Promise<IMessage | null>;

  /**
   * Find messages by conversation
   */
  findByConversation(conversationId: string, companyId: string, limit?: number): Promise<IMessage[]>;

  /**
   * Update message
   */
  update(id: string, data: Partial<IMessage>, companyId: string): Promise<IMessage>;

  /**
   * Update message status
   */
  updateStatus(messageId: string, status: string, companyId: string): Promise<void>;

  /**
   * Delete message
   */
  delete(id: string, companyId: string): Promise<boolean>;

  /**
   * Find all messages with filters
   */
  findAll(filters: any, companyId: string): Promise<IMessage[]>;
}
