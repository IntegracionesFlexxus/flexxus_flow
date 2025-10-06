/**
 * Conversation Repository - Sprint 05
 * Repository for managing omnichannel conversations
 */

import { injectable } from 'inversify';
import { BaseOmniRepository, QueryOptions } from './base/BaseOmniRepository';
import { IConversation, IConversationCreate, IConversationUpdate, IConversationAssign } from '../interfaces/IConversation';
import { ConversationStatus, ConversationPriority, ConversationFilters } from '../types/conversation.types';

@injectable()
export class ConversationRepository extends BaseOmniRepository<IConversation> {
  protected tableName = 'conversations';

  /**
   * Find conversations with filters
   */
  async findWithFilters(
    companyId: string,
    filters: ConversationFilters,
    options: QueryOptions = {}
  ): Promise<IConversation[]> {
    const conditions = ['company_id = $1'];
    const params = [companyId];
    let paramCount = 1;

    // Build filter conditions
    if (filters.status) {
      paramCount++;
      conditions.push(`status = $${paramCount}`);
      params.push(filters.status);
    }

    if (filters.priority) {
      paramCount++;
      conditions.push(`priority = $${paramCount}`);
      params.push(filters.priority);
    }

    if (filters.channelType) {
      paramCount++;
      conditions.push(`channel_type = $${paramCount}`);
      params.push(filters.channelType);
    }

    if (filters.assignedTo) {
      paramCount++;
      conditions.push(`assigned_to = $${paramCount}`);
      params.push(filters.assignedTo);
    }

    if (filters.customerId) {
      paramCount++;
      conditions.push(`customer_id = $${paramCount}`);
      params.push(filters.customerId);
    }

    if (filters.slaStatus) {
      paramCount++;
      conditions.push(`sla_status = $${paramCount}`);
      params.push(filters.slaStatus);
    }

    if (filters.hasUnread) {
      conditions.push('unread_count > 0');
    }

    if (filters.tags && filters.tags.length > 0) {
      paramCount++;
      conditions.push(`tags && $${paramCount}`);
      params.push(filters.tags as any); // PostgreSQL array parameter
    }

    if (filters.dateFrom) {
      paramCount++;
      conditions.push(`created_at >= $${paramCount}`);
      params.push(filters.dateFrom.toISOString());
    }

    if (filters.dateTo) {
      paramCount++;
      conditions.push(`created_at <= $${paramCount}`);
      params.push(filters.dateTo.toISOString());
    }

    // Build query
    let query = `
      SELECT * FROM ${this.tableName}
      WHERE ${conditions.join(' AND ')}
    `;

    // Add ordering
    query += ` ORDER BY ${options.orderBy || 'last_message_at DESC NULLS LAST, created_at DESC'}`;

    // Add pagination
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }

    const result = await this.executeQuery(query, params, companyId);
    return result.rows as IConversation[];
  }

  /**
   * Find conversations by status
   */
  async findByStatus(status: ConversationStatus, companyId: string): Promise<IConversation[]> {
    return this.findAll(companyId, { status });
  }

  /**
   * Find conversations assigned to an agent
   */
  async findByAgent(agentId: string, companyId: string): Promise<IConversation[]> {
    return this.findAll(companyId, { assigned_to: agentId });
  }

  /**
   * Find open conversations
   */
  async findOpenConversations(companyId: string): Promise<IConversation[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE company_id = $1 AND status IN ($2, $3)
      ORDER BY priority DESC, last_message_at DESC
    `;

    const result = await this.executeQuery(
      query,
      [companyId, ConversationStatus.OPEN, ConversationStatus.PENDING],
      companyId
    );
    return result.rows as IConversation[];
  }

  /**
   * Assign conversation to agent
   */
  async assignToAgent(
    conversationId: string,
    assignment: IConversationAssign,
    companyId: string
  ): Promise<IConversation | null> {
    const query = `
      UPDATE ${this.tableName}
      SET
        assigned_to = $1,
        assigned_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND company_id = $3
      RETURNING *
    `;

    const result = await this.executeQuery(
      query,
      [assignment.assigned_to, conversationId, companyId],
      companyId
    );

    return result.rows[0] as IConversation || null;
  }

  /**
   * Update conversation status
   */
  async updateStatus(
    conversationId: string,
    status: ConversationStatus,
    companyId: string
  ): Promise<IConversation | null> {
    const updates: Partial<IConversation> = { status };

    // Add resolution timestamp if resolved
    if (status === ConversationStatus.RESOLVED) {
      updates.resolved_at = new Date();

      // Calculate resolution time
      const conversation = await this.findById(conversationId, companyId);
      if (conversation && conversation.created_at) {
        const createdAt = new Date(conversation.created_at).getTime();
        const resolvedAt = new Date().getTime();
        updates.resolution_time_seconds = Math.floor((resolvedAt - createdAt) / 1000);
      }
    }

    return this.update(conversationId, updates, companyId);
  }

  /**
   * Update conversation metrics
   */
  async updateMetrics(conversationId: string, companyId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET
        last_message_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND company_id = $2
    `;

    await this.executeQuery(query, [conversationId, companyId], companyId);
  }

  /**
   * Increment unread count
   */
  async incrementUnreadCount(conversationId: string, companyId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET
        unread_count = unread_count + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND company_id = $2
    `;

    await this.executeQuery(query, [conversationId, companyId], companyId);
  }

  /**
   * Reset unread count
   */
  async resetUnreadCount(conversationId: string, companyId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET
        unread_count = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND company_id = $2
    `;

    await this.executeQuery(query, [conversationId, companyId], companyId);
  }

  /**
   * Get conversation with customer and channel details
   */
  async getConversationWithDetails(conversationId: string, companyId: string): Promise<any> {
    const query = `
      SELECT
        c.*,
        cust.first_name as customer_first_name,
        cust.last_name as customer_last_name,
        cust.email as customer_email,
        cust.phone_number as customer_phone,
        ch.name as channel_name,
        ch.health_status as channel_health_status
      FROM ${this.tableName} c
      LEFT JOIN customers cust ON c.customer_id = cust.id
      LEFT JOIN channels ch ON c.channel_id = ch.id
      WHERE c.id = $1 AND c.company_id = $2
    `;

    const result = await this.executeQuery(query, [conversationId, companyId], companyId);
    return result.rows[0] || null;
  }

  /**
   * Get conversation statistics
   */
  async getStatsByCompany(companyId: string): Promise<any> {
    const query = `
      SELECT
        COUNT(*) as total_conversations,
        COUNT(*) FILTER (WHERE status = 'open') as open_conversations,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_conversations,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_conversations,
        COUNT(*) FILTER (WHERE status = 'archived') as archived_conversations,
        AVG(resolution_time_seconds) FILTER (WHERE resolution_time_seconds IS NOT NULL) as avg_resolution_time,
        COUNT(*) FILTER (WHERE sla_status = 'breached') as sla_breached_count
      FROM ${this.tableName}
      WHERE company_id = $1
    `;

    const result = await this.executeQuery(query, [companyId], companyId);
    return result.rows[0];
  }

  /**
   * Update first response time
   */
  async updateFirstResponseTime(conversationId: string, companyId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET
        first_response_at = COALESCE(first_response_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND company_id = $2 AND first_response_at IS NULL
    `;

    await this.executeQuery(query, [conversationId, companyId], companyId);
  }

  /**
   * Add tags to conversation
   */
  async addTags(conversationId: string, tags: string[], companyId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET
        tags = array_cat(tags, $1::text[]),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND company_id = $3
    `;

    await this.executeQuery(query, [tags, conversationId, companyId], companyId);
  }

  /**
   * Remove tags from conversation
   */
  async removeTags(conversationId: string, tags: string[], companyId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET
        tags = array_remove(tags, ANY($1::text[])),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND company_id = $3
    `;

    await this.executeQuery(query, [tags, conversationId, companyId], companyId);
  }
}