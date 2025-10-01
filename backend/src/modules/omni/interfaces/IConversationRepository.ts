/**
 * Conversation Repository Interface
 * Omni Module - Sprint 05/06
 */

import { IConversation, IConversationCreate, IConversationUpdate } from './IConversation';

export interface IConversationRepository {
  /**
   * Create a new conversation
   */
  create(data: Partial<IConversation>, companyId: string): Promise<IConversation>;

  /**
   * Find conversation by ID
   */
  findById(id: string, companyId: string): Promise<IConversation | null>;

  /**
   * Find conversation by external ID
   */
  findByExternalId(externalId: string, channelId: string, companyId: string): Promise<IConversation | null>;

  /**
   * Find conversations by customer
   */
  findByCustomer(customerId: string, companyId: string): Promise<IConversation[]>;

  /**
   * Find conversations by channel
   */
  findByChannel(channelId: string, companyId: string): Promise<IConversation[]>;

  /**
   * Find conversations assigned to agent
   */
  findByAgent(agentId: number, companyId: string): Promise<IConversation[]>;

  /**
   * Update conversation
   */
  update(id: string, data: IConversationUpdate, companyId: string): Promise<IConversation>;

  /**
   * Assign conversation to agent
   */
  assignToAgent(conversationId: string, agentId: number, companyId: string): Promise<void>;

  /**
   * Update conversation status
   */
  updateStatus(conversationId: string, status: string, companyId: string): Promise<void>;

  /**
   * Delete conversation
   */
  delete(id: string, companyId: string): Promise<boolean>;

  /**
   * Find all conversations with filters
   */
  findAll(filters: any, companyId: string): Promise<IConversation[]>;
}
