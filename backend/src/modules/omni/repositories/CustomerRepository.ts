/**
 * Customer Repository - Sprint 05
 * Repository for managing omnichannel customers
 */

import { injectable } from 'inversify';
import { BaseOmniRepository, QueryOptions } from './base/BaseOmniRepository';
import { ICustomer, ICustomerCreate, ICustomerUpdate, ICustomerSearch } from '../interfaces/ICustomer';

@injectable()
export class CustomerRepository extends BaseOmniRepository<ICustomer> {
  protected tableName = 'customers';

  /**
   * Find customer by email
   */
  async findByEmail(email: string, companyId: string): Promise<ICustomer | null> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE email = $1 AND company_id = $2
      LIMIT 1
    `;

    const result = await this.executeQuery(query, [email, companyId], companyId);
    return result.rows[0] as ICustomer || null;
  }

  /**
   * Find customer by phone number
   */
  async findByPhone(phoneNumber: string, companyId: string): Promise<ICustomer | null> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE phone_number = $1 AND company_id = $2
      LIMIT 1
    `;

    const result = await this.executeQuery(query, [phoneNumber, companyId], companyId);
    return result.rows[0] as ICustomer || null;
  }

  /**
   * Find customer by Instagram handle
   */
  async findByInstagram(instagramHandle: string, companyId: string): Promise<ICustomer | null> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE instagram_handle = $1 AND company_id = $2
      LIMIT 1
    `;

    const result = await this.executeQuery(query, [instagramHandle, companyId], companyId);
    return result.rows[0] as ICustomer || null;
  }

  /**
   * Find customer by WhatsApp ID
   */
  async findByWhatsAppId(whatsappId: string, companyId: string): Promise<ICustomer | null> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE whatsapp_id = $1 AND company_id = $2
      LIMIT 1
    `;

    const result = await this.executeQuery(query, [whatsappId, companyId], companyId);
    return result.rows[0] as ICustomer || null;
  }

  /**
   * Find customer by external ID (CRM reference)
   */
  async findByExternalId(externalId: string, companyId: string): Promise<ICustomer | null> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE external_id = $1 AND company_id = $2
      LIMIT 1
    `;

    const result = await this.executeQuery(query, [externalId, companyId], companyId);
    return result.rows[0] as ICustomer || null;
  }

  /**
   * Search customers with multiple criteria
   */
  async searchCustomers(
    search: ICustomerSearch,
    companyId: string
  ): Promise<ICustomer[]> {
    const conditions = ['company_id = $1'];
    const params = [companyId];
    let paramCount = 1;

    // Build search conditions
    if (search.query) {
      paramCount++;
      conditions.push(`
        (
          first_name ILIKE $${paramCount} OR
          last_name ILIKE $${paramCount} OR
          display_name ILIKE $${paramCount} OR
          email ILIKE $${paramCount} OR
          phone_number ILIKE $${paramCount}
        )
      `);
      params.push(`%${search.query}%`);
    }

    if (search.email) {
      paramCount++;
      conditions.push(`email = $${paramCount}`);
      params.push(search.email);
    }

    if (search.phone_number) {
      paramCount++;
      conditions.push(`phone_number = $${paramCount}`);
      params.push(search.phone_number);
    }

    if (search.instagram_handle) {
      paramCount++;
      conditions.push(`instagram_handle = $${paramCount}`);
      params.push(search.instagram_handle);
    }

    if (search.external_id) {
      paramCount++;
      conditions.push(`external_id = $${paramCount}`);
      params.push(search.external_id);
    }

    if (search.tags && search.tags.length > 0) {
      paramCount++;
      conditions.push(`tags && $${paramCount}`);
      params.push(search.tags);
    }

    // Build query
    let query = `
      SELECT * FROM ${this.tableName}
      WHERE ${conditions.join(' AND ')}
      ORDER BY last_activity_at DESC NULLS LAST, created_at DESC
    `;

    // Add pagination
    if (search.limit) {
      query += ` LIMIT ${search.limit}`;
    }
    if (search.offset) {
      query += ` OFFSET ${search.offset}`;
    }

    const result = await this.executeQuery(query, params, companyId);
    return result.rows as ICustomer[];
  }

  /**
   * Find or create customer by identifier
   */
  async findOrCreate(
    identifier: { email?: string; phone_number?: string; instagram_handle?: string },
    data: ICustomerCreate,
    companyId: string
  ): Promise<ICustomer> {
    // Try to find existing customer
    let customer = null;

    if (identifier.email) {
      customer = await this.findByEmail(identifier.email, companyId);
    } else if (identifier.phone_number) {
      customer = await this.findByPhone(identifier.phone_number, companyId);
    } else if (identifier.instagram_handle) {
      customer = await this.findByInstagram(identifier.instagram_handle, companyId);
    }

    // If found, return existing
    if (customer) {
      // Update last activity
      await this.updateLastActivity(customer.id, companyId);
      return customer;
    }

    // Create new customer
    return this.create({
      ...data,
      ...identifier
    } as Partial<ICustomer>, companyId);
  }

  /**
   * Merge duplicate customers
   */
  async mergeCustomers(
    primaryCustomerId: string,
    duplicateCustomerId: string,
    companyId: string
  ): Promise<boolean> {
    const query = `SELECT merge_duplicate_customers($1, $2, $3)`;

    try {
      await this.executeQuery(query, [companyId, primaryCustomerId, duplicateCustomerId], companyId);
      return true;
    } catch (error) {
      this.logger.error('Error merging customers:', error);
      return false;
    }
  }

  /**
   * Update last activity timestamp
   */
  async updateLastActivity(customerId: string, companyId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET last_activity_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND company_id = $2
    `;

    await this.executeQuery(query, [customerId, companyId], companyId);
  }

  /**
   * Add tags to customer
   */
  async addTags(customerId: string, tags: string[], companyId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET
        tags = array_cat(tags, $1::text[]),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND company_id = $3
    `;

    await this.executeQuery(query, [tags, customerId, companyId], companyId);
  }

  /**
   * Remove tags from customer
   */
  async removeTags(customerId: string, tags: string[], companyId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET
        tags = array_remove(tags, ANY($1::text[])),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND company_id = $3
    `;

    await this.executeQuery(query, [tags, customerId, companyId], companyId);
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(customerId: string, companyId: string): Promise<any> {
    const query = `
      SELECT
        c.*,
        COUNT(DISTINCT conv.id) as total_conversations,
        COUNT(DISTINCT m.id) as total_messages,
        MAX(conv.created_at) as last_conversation_date,
        AVG(conv.resolution_time_seconds) as avg_resolution_time,
        STRING_AGG(DISTINCT conv.channel_type, ',') as used_channels
      FROM ${this.tableName} c
      LEFT JOIN conversations conv ON c.id = conv.customer_id
      LEFT JOIN messages m ON conv.id = m.conversation_id
      WHERE c.id = $1 AND c.company_id = $2
      GROUP BY c.id
    `;

    const result = await this.executeQuery(query, [customerId, companyId], companyId);
    return result.rows[0] || null;
  }

  /**
   * Get customers by tag
   */
  async getByTag(tag: string, companyId: string, options: QueryOptions = {}): Promise<ICustomer[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE company_id = $1 AND $2 = ANY(tags)
      ORDER BY last_activity_at DESC NULLS LAST
      ${options.limit ? `LIMIT ${options.limit}` : ''}
      ${options.offset ? `OFFSET ${options.offset}` : ''}
    `;

    const result = await this.executeQuery(query, [companyId, tag], companyId);
    return result.rows as ICustomer[];
  }

  /**
   * Get recent customers
   */
  async getRecentCustomers(companyId: string, limit = 10): Promise<ICustomer[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE company_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await this.executeQuery(query, [companyId, limit], companyId);
    return result.rows as ICustomer[];
  }

  /**
   * Get active customers (with recent activity)
   */
  async getActiveCustomers(companyId: string, daysBack = 30): Promise<ICustomer[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE company_id = $1
        AND last_activity_at >= CURRENT_DATE - INTERVAL '${daysBack} days'
      ORDER BY last_activity_at DESC
    `;

    const result = await this.executeQuery(query, [companyId], companyId);
    return result.rows as ICustomer[];
  }

  /**
   * Bulk update external IDs (for CRM sync)
   */
  async bulkUpdateExternalIds(
    updates: { customerId: string; externalId: string }[],
    companyId: string
  ): Promise<number> {
    let updatedCount = 0;

    for (const update of updates) {
      const query = `
        UPDATE ${this.tableName}
        SET external_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND company_id = $3
      `;

      const result = await this.executeQuery(
        query,
        [update.externalId, update.customerId, companyId],
        companyId
      );

      updatedCount += result.rowCount;
    }

    return updatedCount;
  }
}