// repositories/MessageRepository.ts
import { injectable, inject } from 'inversify';
import { BaseOmniRepository } from './BaseOmniRepository';
import { IMessage, MessageStatus } from '../interfaces/IMessage';
import { OMNI_TYPES } from '../types/omni.types';

@injectable()
export class MessageRepository {
  constructor(@inject(OMNI_TYPES.BaseOmniRepository) private baseRepo: BaseOmniRepository<IMessage>) {}

  private get tableName(): string {
    return 'messages';
  }

  async findByConversation(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<IMessage[]> {
    const query = `
      SELECT * FROM messages
      WHERE conversation_id = $1
      ORDER BY sent_at DESC
      LIMIT $2 OFFSET $3
    `;
    return this.baseRepo.executeQuery<IMessage>(this.tableName, query, [conversationId, limit, offset]);
  }

  async updateStatus(messageId: string, status: MessageStatus): Promise<IMessage | null> {
    const statusField = this.getStatusField(status);
    const query = `
      UPDATE messages
      SET status = $2, ${statusField} = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const results = await this.baseRepo.executeQuery<IMessage>(this.tableName, query, [messageId, status]);
    return results[0] || null;
  }

  async findUnreadByConversation(conversationId: string): Promise<IMessage[]> {
    const query = `
      SELECT * FROM messages
      WHERE conversation_id = $1 AND status != 'read' AND sender_type = 'customer'
      ORDER BY sent_at ASC
    `;
    return this.baseRepo.executeQuery<IMessage>(this.tableName, query, [conversationId]);
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const query = `
      UPDATE messages
      SET status = 'read', read_at = CURRENT_TIMESTAMP
      WHERE conversation_id = $1 AND sender_type = 'customer' AND status != 'read'
    `;
    await this.baseRepo.executeQuery(this.tableName, query, [conversationId]);
  }

  async findByExternalId(externalId: string): Promise<IMessage | null> {
    const query = `
      SELECT * FROM messages
      WHERE external_message_id = $1
      LIMIT 1
    `;
    const results = await this.baseRepo.executeQuery<IMessage>(this.tableName, query, [externalId]);
    return results[0] || null;
  }

  async searchInConversation(
    conversationId: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<IMessage[]> {
    const query = `
      SELECT * FROM messages
      WHERE conversation_id = $1
        AND to_tsvector('spanish', content) @@ plainto_tsquery('spanish', $2)
      ORDER BY sent_at DESC
      LIMIT $3
    `;
    return this.baseRepo.executeQuery<IMessage>(this.tableName, query, [conversationId, searchTerm, limit]);
  }

  async findById(id: string): Promise<IMessage | null> {
    return this.baseRepo.findById<IMessage>(this.tableName, id);
  }

  async findAll(companyId: string): Promise<IMessage[]> {
    return this.baseRepo.findAll<IMessage>(this.tableName, companyId);
  }

  async create(data: Partial<IMessage>): Promise<IMessage> {
    return this.baseRepo.create<IMessage>(this.tableName, data);
  }

  async update(id: string, data: Partial<IMessage>): Promise<IMessage | null> {
    return this.baseRepo.update<IMessage>(this.tableName, id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.baseRepo.delete(this.tableName, id);
  }

  private getStatusField(status: MessageStatus): string {
    switch (status) {
      case MessageStatus.DELIVERED:
        return 'delivered_at';
      case MessageStatus.READ:
        return 'read_at';
      default:
        return 'updated_at';
    }
  }
}