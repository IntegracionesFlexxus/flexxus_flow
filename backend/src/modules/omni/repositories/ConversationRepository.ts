// repositories/ConversationRepository.ts
import { injectable, inject } from 'inversify';
import { BaseOmniRepository } from './BaseOmniRepository';
import { IConversation, ConversationStatus } from '../interfaces/IConversation';
import { OMNI_TYPES } from '../types/omni.types';

@injectable()
export class ConversationRepository {
  constructor(@inject(OMNI_TYPES.BaseOmniRepository) private baseRepo: BaseOmniRepository<IConversation>) {}

  private get tableName(): string {
    return 'conversations';
  }

  async findByStatus(
    companyId: string,
    status: ConversationStatus
  ): Promise<IConversation[]> {
    const query = `
      SELECT c.*, cu.first_name || ' ' || cu.last_name as customer_name
      FROM conversations c
      LEFT JOIN contacts cu ON c.contact_id = cu.id
      WHERE c.company_id = $1 AND c.status = $2
      ORDER BY c.last_message_at DESC
    `;
    return this.baseRepo.executeQuery<IConversation>(this.tableName, query, [companyId, status]);
  }

  async findByAssignee(
    companyId: string,
    userId: string
  ): Promise<IConversation[]> {
    const query = `
      SELECT * FROM conversations
      WHERE company_id = $1 AND assigned_to = $2 AND status IN ('open', 'pending')
      ORDER BY priority DESC, last_message_at DESC
    `;
    return this.baseRepo.executeQuery<IConversation>(this.tableName, query, [companyId, userId]);
  }

  async assignConversation(
    conversationId: string,
    userId: string
  ): Promise<IConversation | null> {
    const query = `
      UPDATE conversations
      SET assigned_to = $2, assigned_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const results = await this.baseRepo.executeQuery<IConversation>(this.tableName, query, [conversationId, userId]);
    return results[0] || null;
  }

  async findWithLastMessage(companyId: string, limit: number = 50): Promise<IConversation[]> {
    const query = `
      SELECT
        c.*,
        m.content as last_message_content,
        m.sent_at as last_message_sent_at,
        m.sender_type as last_message_sender_type,
        cu.first_name || ' ' || cu.last_name as customer_name
      FROM conversations c
      LEFT JOIN contacts cu ON c.contact_id = cu.id
      LEFT JOIN LATERAL (
        SELECT content, sent_at, sender_type
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY sent_at DESC
        LIMIT 1
      ) m ON true
      WHERE c.company_id = $1 AND c.deleted_at IS NULL
      ORDER BY c.last_message_at DESC
      LIMIT $2
    `;
    return this.baseRepo.executeQuery<IConversation>(this.tableName, query, [companyId, limit]);
  }

  async updateLastMessageAt(conversationId: string): Promise<void> {
    const query = `
      UPDATE conversations
      SET last_message_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await this.baseRepo.executeQuery(this.tableName, query, [conversationId]);
  }

  async findById(id: string): Promise<IConversation | null> {
    return this.baseRepo.findById<IConversation>(this.tableName, id);
  }

  async findAll(companyId: string): Promise<IConversation[]> {
    return this.baseRepo.findAll<IConversation>(this.tableName, companyId);
  }

  async create(data: Partial<IConversation>): Promise<IConversation> {
    return this.baseRepo.create<IConversation>(this.tableName, data);
  }

  async update(id: string, data: Partial<IConversation>): Promise<IConversation | null> {
    return this.baseRepo.update<IConversation>(this.tableName, id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.baseRepo.delete(this.tableName, id);
  }
}