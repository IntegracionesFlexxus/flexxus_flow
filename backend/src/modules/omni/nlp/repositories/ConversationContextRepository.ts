/**
 * Conversation Context Repository - Sprint 12
 * Data access layer for conversation contexts
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { IConversationContext } from '../../interfaces/INLPModel';
import { ContextType } from '../../types/nlp.types';

@injectable()
export class ConversationContextRepository {
  constructor(
    @inject(TYPES.OmniConnection)
    private db: Pool
  ) {}

  async create(
    conversationId: string,
    contextType: ContextType,
    contextData: Record<string, any>,
    tenantId: string,
    options?: {
      contextSummary?: string;
      relevanceScore?: number;
      expiresAt?: Date;
    }
  ): Promise<IConversationContext> {
    const query = `
      INSERT INTO conversation_contexts (
        conversation_id, context_type, context_data, context_summary,
        relevance_score, expires_at, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      conversationId,
      contextType,
      JSON.stringify(contextData),
      options?.contextSummary,
      options?.relevanceScore || 1.0,
      options?.expiresAt,
      tenantId
    ];

    const result = await this.db.query(query, values);
    return this.mapToContext(result.rows[0]);
  }

  async findById(id: string, tenantId: string): Promise<IConversationContext | null> {
    const query = 'SELECT * FROM conversation_contexts WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return result.rows[0] ? this.mapToContext(result.rows[0]) : null;
  }

  async findByConversation(conversationId: string, tenantId: string): Promise<IConversationContext[]> {
    const query = `
      SELECT * FROM conversation_contexts
      WHERE conversation_id = $1 AND tenant_id = $2
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY relevance_score DESC, created_at DESC
    `;
    const result = await this.db.query(query, [conversationId, tenantId]);
    return result.rows.map(row => this.mapToContext(row));
  }

  async findByConversationAndType(
    conversationId: string,
    contextType: ContextType,
    tenantId: string
  ): Promise<IConversationContext[]> {
    const query = `
      SELECT * FROM conversation_contexts
      WHERE conversation_id = $1 AND context_type = $2 AND tenant_id = $3
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY created_at DESC
    `;
    const result = await this.db.query(query, [conversationId, contextType, tenantId]);
    return result.rows.map(row => this.mapToContext(row));
  }

  async update(id: string, tenantId: string, data: Partial<IConversationContext>): Promise<IConversationContext | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'tenant_id' && key !== 'conversation_id') {
        fields.push(`${key} = $${paramIndex}`);
        if (typeof value === 'object' && !(value instanceof Date)) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.findById(id, tenantId);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, tenantId);

    const query = `
      UPDATE conversation_contexts
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0] ? this.mapToContext(result.rows[0]) : null;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const query = 'DELETE FROM conversation_contexts WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return (result.rowCount ?? 0) > 0;
  }

  async deleteExpired(tenantId: string): Promise<number> {
    const query = `
      DELETE FROM conversation_contexts
      WHERE tenant_id = $1 AND expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP
    `;
    const result = await this.db.query(query, [tenantId]);
    return result.rowCount ?? 0;
  }

  private mapToContext(row: any): IConversationContext {
    return {
      id: row.id,
      conversation_id: row.conversation_id,
      context_type: row.context_type,
      context_data: row.context_data || {},
      context_summary: row.context_summary,
      relevance_score: parseFloat(row.relevance_score),
      expires_at: row.expires_at,
      tenant_id: row.tenant_id,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
