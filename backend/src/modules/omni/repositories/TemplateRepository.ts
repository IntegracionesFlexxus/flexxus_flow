/**
 * Template Repository - Sprint 05
 * Repository for managing message templates and quick replies
 */

import { injectable } from 'inversify';
import { BaseOmniRepository, QueryOptions } from './base/BaseOmniRepository';
import { IMessageTemplate, IMessageTemplateCreate, IQuickReply, IQuickReplyCreate } from '../interfaces/ITemplate';
import { ChannelType } from '../types/channel.types';

@injectable()
export class TemplateRepository extends BaseOmniRepository<IMessageTemplate> {
  protected tableName = 'message_templates';

  /**
   * Find templates by channel type
   */
  async findByChannelType(
    channelType: ChannelType | string,
    companyId: string,
    onlyActive = true
  ): Promise<IMessageTemplate[]> {
    const conditions = ['company_id = $1', 'channel_type = $2'];
    const params = [companyId, channelType];

    if (onlyActive) {
      conditions.push('is_active = true');
    }

    const query = `
      SELECT * FROM ${this.tableName}
      WHERE ${conditions.join(' AND ')}
      ORDER BY usage_count DESC, created_at DESC
    `;

    const result = await this.executeQuery(query, params, companyId);
    return result.rows as IMessageTemplate[];
  }

  /**
   * Find templates by category
   */
  async findByCategory(
    category: string,
    companyId: string,
    channelType?: string
  ): Promise<IMessageTemplate[]> {
    const conditions = ['company_id = $1', 'category = $2', 'is_active = true'];
    const params = [companyId, category];
    let paramCount = 2;

    if (channelType) {
      paramCount++;
      conditions.push(`channel_type = $${paramCount}`);
      params.push(channelType);
    }

    const query = `
      SELECT * FROM ${this.tableName}
      WHERE ${conditions.join(' AND ')}
      ORDER BY usage_count DESC
    `;

    const result = await this.executeQuery(query, params, companyId);
    return result.rows as IMessageTemplate[];
  }

  /**
   * Find template by name
   */
  async findByName(
    name: string,
    channelType: string,
    companyId: string
  ): Promise<IMessageTemplate | null> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE company_id = $1 AND channel_type = $2 AND name = $3
      LIMIT 1
    `;

    const result = await this.executeQuery(query, [companyId, channelType, name], companyId);
    return result.rows[0] as IMessageTemplate || null;
  }

  /**
   * Find approved WhatsApp templates
   */
  async findApprovedWhatsAppTemplates(companyId: string): Promise<IMessageTemplate[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE company_id = $1
        AND channel_type = $2
        AND approval_status = $3
        AND is_active = true
      ORDER BY name
    `;

    const result = await this.executeQuery(
      query,
      [companyId, ChannelType.WHATSAPP, 'approved'],
      companyId
    );

    return result.rows as IMessageTemplate[];
  }

  /**
   * Increment template usage count
   */
  async incrementUsageCount(templateId: string, companyId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET
        usage_count = usage_count + 1,
        last_used_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND company_id = $2
    `;

    await this.executeQuery(query, [templateId, companyId], companyId);
  }

  /**
   * Update template approval status
   */
  async updateApprovalStatus(
    templateId: string,
    status: string,
    externalId: string | null,
    companyId: string
  ): Promise<IMessageTemplate | null> {
    const query = `
      UPDATE ${this.tableName}
      SET
        approval_status = $1,
        external_id = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND company_id = $4
      RETURNING *
    `;

    const result = await this.executeQuery(
      query,
      [status, externalId, templateId, companyId],
      companyId
    );

    return result.rows[0] as IMessageTemplate || null;
  }

  /**
   * Get most used templates
   */
  async getMostUsedTemplates(
    companyId: string,
    limit = 10
  ): Promise<IMessageTemplate[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE company_id = $1 AND is_active = true
      ORDER BY usage_count DESC, last_used_at DESC NULLS LAST
      LIMIT $2
    `;

    const result = await this.executeQuery(query, [companyId, limit], companyId);
    return result.rows as IMessageTemplate[];
  }

  /**
   * Search templates
   */
  async searchTemplates(
    searchTerm: string,
    companyId: string,
    channelType?: string
  ): Promise<IMessageTemplate[]> {
    const conditions = [
      'company_id = $1',
      '(name ILIKE $2 OR content ILIKE $2)',
      'is_active = true'
    ];
    const params = [companyId, `%${searchTerm}%`];
    let paramCount = 2;

    if (channelType) {
      paramCount++;
      conditions.push(`channel_type = $${paramCount}`);
      params.push(channelType);
    }

    const query = `
      SELECT * FROM ${this.tableName}
      WHERE ${conditions.join(' AND ')}
      ORDER BY usage_count DESC
      LIMIT 20
    `;

    const result = await this.executeQuery(query, params, companyId);
    return result.rows as IMessageTemplate[];
  }
}

/**
 * Quick Reply Repository
 */
@injectable()
export class QuickReplyRepository extends BaseOmniRepository<IQuickReply> {
  protected tableName = 'quick_replies';

  /**
   * Find quick replies by category
   */
  async findByCategory(category: string, companyId: string): Promise<IQuickReply[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE company_id = $1 AND category = $2 AND is_active = true
      ORDER BY usage_count DESC
    `;

    const result = await this.executeQuery(query, [companyId, category], companyId);
    return result.rows as IQuickReply[];
  }

  /**
   * Find quick reply by shortcut
   */
  async findByShortcut(shortcut: string, companyId: string): Promise<IQuickReply | null> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE company_id = $1 AND $2 = ANY(shortcuts) AND is_active = true
      LIMIT 1
    `;

    const result = await this.executeQuery(query, [companyId, shortcut], companyId);
    return result.rows[0] as IQuickReply || null;
  }

  /**
   * Get most used quick replies
   */
  async getMostUsed(companyId: string, limit = 10): Promise<IQuickReply[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE company_id = $1 AND is_active = true
      ORDER BY usage_count DESC
      LIMIT $2
    `;

    const result = await this.executeQuery(query, [companyId, limit], companyId);
    return result.rows as IQuickReply[];
  }

  /**
   * Increment quick reply usage count
   */
  async incrementUsageCount(quickReplyId: string, companyId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET usage_count = usage_count + 1
      WHERE id = $1 AND company_id = $2
    `;

    await this.executeQuery(query, [quickReplyId, companyId], companyId);
  }

  /**
   * Search quick replies
   */
  async search(searchTerm: string, companyId: string): Promise<IQuickReply[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE company_id = $1
        AND (title ILIKE $2 OR content ILIKE $2)
        AND is_active = true
      ORDER BY usage_count DESC
      LIMIT 20
    `;

    const result = await this.executeQuery(query, [companyId, `%${searchTerm}%`], companyId);
    return result.rows as IQuickReply[];
  }
}