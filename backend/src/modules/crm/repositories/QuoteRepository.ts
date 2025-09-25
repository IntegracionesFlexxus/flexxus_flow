/**
 * Quote Repository - Sprint 19
 * Handles all database operations for quotes
 */

import { injectable, inject } from 'inversify';
import { Pool, PoolClient } from 'pg';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';

export interface Quote {
  quote_id?: number;
  company_id: number;
  quote_number: string;
  opportunity_id?: number;
  account_id: number;
  contact_id?: number;
  quote_name: string;
  description?: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'revised';
  version_number: number;
  parent_quote_id?: number;
  quote_date: Date;
  expiration_date?: Date;
  accepted_date?: Date;
  currency_code: string;
  exchange_rate: number;
  subtotal: number;
  total_discount: number;
  total_tax: number;
  shipping_amount: number;
  total_amount: number;
  payment_terms?: string;
  delivery_terms?: string;
  terms_and_conditions?: string;
  notes?: string;
  template_id?: number;
  custom_fields?: any;
  view_count: number;
  last_viewed_at?: Date;
  owner_user_id: number;
  created_by: number;
  created_at?: Date;
  updated_at?: Date;
  updated_by?: number;
}

export interface QuoteLineItem {
  line_item_id?: number;
  company_id: number;
  quote_id: number;
  product_id?: number;
  variation_id?: number;
  line_number: number;
  item_type: 'product' | 'service' | 'discount' | 'custom' | 'comment';
  name: string;
  description?: string;
  product_code?: string;
  quantity: number;
  unit_of_measure: string;
  unit_price: number;
  list_price?: number;
  discount_type?: 'percentage' | 'fixed';
  discount_value: number;
  is_taxable: boolean;
  tax_rate: number;
  tax_amount: number;
  line_total?: number;
  delivery_date?: Date;
  lead_time_days?: number;
  is_optional: boolean;
  sort_order: number;
  custom_fields?: any;
}

export interface QuoteFilter {
  company_id: number;
  status?: string[];
  owner_user_id?: number;
  account_id?: number;
  opportunity_id?: number;
  date_from?: Date;
  date_to?: Date;
  min_amount?: number;
  max_amount?: number;
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

@injectable()
export class QuoteRepository {
  private pool: Pool;

  constructor(
    @inject(TYPES.CrmConnection) pool: Pool,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.pool = pool;
  }

  /**
   * Create a new quote
   */
  async create(quote: Quote): Promise<Quote> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO quotes (
          company_id, quote_number, opportunity_id, account_id, contact_id,
          quote_name, description, status, version_number, parent_quote_id,
          quote_date, expiration_date, currency_code, exchange_rate,
          payment_terms, delivery_terms, terms_and_conditions, notes,
          template_id, custom_fields, owner_user_id, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        ) RETURNING *`;

      const values = [
        quote.company_id,
        quote.quote_number,
        quote.opportunity_id,
        quote.account_id,
        quote.contact_id,
        quote.quote_name,
        quote.description,
        quote.status || 'draft',
        quote.version_number || 1,
        quote.parent_quote_id,
        quote.quote_date || new Date(),
        quote.expiration_date,
        quote.currency_code || 'ARS',
        quote.exchange_rate || 1.0,
        quote.payment_terms,
        quote.delivery_terms,
        quote.terms_and_conditions,
        quote.notes,
        quote.template_id,
        JSON.stringify(quote.custom_fields || {}),
        quote.owner_user_id,
        quote.created_by
      ];

      const result = await client.query(query, values);
      const newQuote = result.rows[0];

      // Log creation in audit
      await this.logAuditEvent(client, {
        company_id: quote.company_id,
        quote_id: newQuote.quote_id,
        action_type: 'created',
        user_id: quote.created_by
      });

      await client.query('COMMIT');
      return newQuote;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating quote', { error, quote });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing quote
   */
  async update(quote_id: number, quote: Partial<Quote>, user_id: number): Promise<Quote> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get current quote for comparison
      const currentQuery = 'SELECT * FROM quotes WHERE quote_id = $1';
      const currentResult = await client.query(currentQuery, [quote_id]);
      const currentQuote = currentResult.rows[0];

      const updateFields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(quote).forEach((key) => {
        if (key !== 'quote_id' && key !== 'created_at' && key !== 'created_by') {
          let value = quote[key as keyof Quote];

          // Handle JSON fields
          if (key === 'custom_fields' && value !== undefined) {
            value = JSON.stringify(value);
          }

          updateFields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      // Add updated fields
      updateFields.push(`updated_at = NOW()`);
      updateFields.push(`updated_by = $${paramCount}`);
      values.push(user_id);
      paramCount++;

      // Add quote_id as last parameter
      values.push(quote_id);

      const query = `
        UPDATE quotes
        SET ${updateFields.join(', ')}
        WHERE quote_id = $${paramCount}
        RETURNING *`;

      const result = await client.query(query, values);
      const updatedQuote = result.rows[0];

      // Log status changes
      if (quote.status && quote.status !== currentQuote.status) {
        await this.logAuditEvent(client, {
          company_id: currentQuote.company_id,
          quote_id,
          action_type: `status_changed_to_${quote.status}`,
          field_name: 'status',
          old_value: currentQuote.status,
          new_value: quote.status,
          user_id
        });
      }

      await client.query('COMMIT');
      return updatedQuote;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating quote', { error, quote_id, quote });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get quote by ID
   */
  async findById(quote_id: number): Promise<Quote | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT q.*,
               COUNT(qli.line_item_id) as line_items_count
        FROM quotes q
        LEFT JOIN quote_line_items qli ON q.quote_id = qli.quote_id
        WHERE q.quote_id = $1
        GROUP BY q.quote_id`;

      const result = await client.query(query, [quote_id]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Error finding quote by ID', { error, quote_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get quote by number
   */
  async findByNumber(company_id: number, quote_number: string): Promise<Quote | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM quotes
        WHERE company_id = $1 AND quote_number = $2`;

      const result = await client.query(query, [company_id, quote_number]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Error finding quote by number', { error, company_id, quote_number });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Search quotes with filters
   */
  async search(filter: QuoteFilter): Promise<{ data: Quote[]; total: number }> {
    const client = await this.pool.connect();
    try {
      let whereConditions = ['q.company_id = $1'];
      let values: any[] = [filter.company_id];
      let paramCount = 2;

      // Build WHERE conditions
      if (filter.status && filter.status.length > 0) {
        whereConditions.push(`q.status = ANY($${paramCount})`);
        values.push(filter.status);
        paramCount++;
      }

      if (filter.owner_user_id) {
        whereConditions.push(`q.owner_user_id = $${paramCount}`);
        values.push(filter.owner_user_id);
        paramCount++;
      }

      if (filter.account_id) {
        whereConditions.push(`q.account_id = $${paramCount}`);
        values.push(filter.account_id);
        paramCount++;
      }

      if (filter.opportunity_id) {
        whereConditions.push(`q.opportunity_id = $${paramCount}`);
        values.push(filter.opportunity_id);
        paramCount++;
      }

      if (filter.date_from) {
        whereConditions.push(`q.quote_date >= $${paramCount}`);
        values.push(filter.date_from);
        paramCount++;
      }

      if (filter.date_to) {
        whereConditions.push(`q.quote_date <= $${paramCount}`);
        values.push(filter.date_to);
        paramCount++;
      }

      if (filter.min_amount !== undefined) {
        whereConditions.push(`q.total_amount >= $${paramCount}`);
        values.push(filter.min_amount);
        paramCount++;
      }

      if (filter.max_amount !== undefined) {
        whereConditions.push(`q.total_amount <= $${paramCount}`);
        values.push(filter.max_amount);
        paramCount++;
      }

      if (filter.search) {
        whereConditions.push(`(
          q.quote_name ILIKE $${paramCount}
          OR q.quote_number ILIKE $${paramCount}
          OR q.description ILIKE $${paramCount}
        )`);
        values.push(`%${filter.search}%`);
        paramCount++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Count total results
      const countQuery = `
        SELECT COUNT(*)
        FROM quotes q
        WHERE ${whereClause}`;

      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated results
      const sortBy = filter.sort_by || 'quote_date';
      const sortOrder = filter.sort_order || 'DESC';
      const limit = filter.limit || 20;
      const offset = filter.offset || 0;

      const dataQuery = `
        SELECT q.*,
               COUNT(qli.line_item_id) as line_items_count
        FROM quotes q
        LEFT JOIN quote_line_items qli ON q.quote_id = qli.quote_id
        WHERE ${whereClause}
        GROUP BY q.quote_id
        ORDER BY q.${sortBy} ${sortOrder}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}`;

      values.push(limit, offset);
      const dataResult = await client.query(dataQuery, values);

      return {
        data: dataResult.rows,
        total
      };
    } catch (error) {
      this.logger.error('Error searching quotes', { error, filter });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create quote line items
   */
  async createLineItem(lineItem: QuoteLineItem): Promise<QuoteLineItem> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO quote_line_items (
          company_id, quote_id, product_id, variation_id, line_number,
          item_type, name, description, product_code, quantity,
          unit_of_measure, unit_price, list_price, discount_type,
          discount_value, is_taxable, tax_rate, tax_amount,
          delivery_date, lead_time_days, is_optional, sort_order, custom_fields
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23
        ) RETURNING *, line_total`;

      const values = [
        lineItem.company_id,
        lineItem.quote_id,
        lineItem.product_id,
        lineItem.variation_id,
        lineItem.line_number,
        lineItem.item_type || 'product',
        lineItem.name,
        lineItem.description,
        lineItem.product_code,
        lineItem.quantity,
        lineItem.unit_of_measure || 'each',
        lineItem.unit_price,
        lineItem.list_price,
        lineItem.discount_type,
        lineItem.discount_value || 0,
        lineItem.is_taxable ?? true,
        lineItem.tax_rate || 0,
        lineItem.tax_amount || 0,
        lineItem.delivery_date,
        lineItem.lead_time_days,
        lineItem.is_optional ?? false,
        lineItem.sort_order || 0,
        JSON.stringify(lineItem.custom_fields || {})
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Error creating quote line item', { error, lineItem });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get quote line items
   */
  async getLineItems(quote_id: number): Promise<QuoteLineItem[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT qli.*, qli.line_total,
               p.name as product_name,
               p.product_code as product_code_ref
        FROM quote_line_items qli
        LEFT JOIN products p ON qli.product_id = p.product_id
        WHERE qli.quote_id = $1
        ORDER BY qli.line_number`;

      const result = await client.query(query, [quote_id]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error getting quote line items', { error, quote_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update quote line item
   */
  async updateLineItem(line_item_id: number, lineItem: Partial<QuoteLineItem>): Promise<QuoteLineItem> {
    const client = await this.pool.connect();
    try {
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(lineItem).forEach((key) => {
        if (key !== 'line_item_id' && key !== 'created_at') {
          let value = lineItem[key as keyof QuoteLineItem];

          if (key === 'custom_fields' && value !== undefined) {
            value = JSON.stringify(value);
          }

          updateFields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      updateFields.push(`updated_at = NOW()`);
      values.push(line_item_id);

      const query = `
        UPDATE quote_line_items
        SET ${updateFields.join(', ')}
        WHERE line_item_id = $${paramCount}
        RETURNING *, line_total`;

      const result = await client.query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Error updating quote line item', { error, line_item_id, lineItem });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete quote line item
   */
  async deleteLineItem(line_item_id: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = `DELETE FROM quote_line_items WHERE line_item_id = $1`;
      const result = await client.query(query, [line_item_id]);
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error('Error deleting quote line item', { error, line_item_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Clone quote with all line items
   */
  async cloneQuote(quote_id: number, new_quote_number: string, user_id: number): Promise<Quote> {
    const client = await this.pool.connect();
    try {
      const query = `SELECT clone_quote_with_items($1, $2, $3) as new_quote_id`;
      const result = await client.query(query, [quote_id, new_quote_number, user_id]);
      const new_quote_id = result.rows[0].new_quote_id;

      return await this.findById(new_quote_id) as Quote;
    } catch (error) {
      this.logger.error('Error cloning quote', { error, quote_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update quote status
   */
  async updateStatus(quote_id: number, status: string, user_id: number): Promise<Quote> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const updateQuery = `
        UPDATE quotes
        SET status = $2,
            ${status === 'accepted' ? 'accepted_date = NOW(),' : ''}
            updated_at = NOW(),
            updated_by = $3
        WHERE quote_id = $1
        RETURNING *`;

      const result = await client.query(updateQuery, [quote_id, status, user_id]);
      const quote = result.rows[0];

      // Log status change
      await this.logAuditEvent(client, {
        company_id: quote.company_id,
        quote_id,
        action_type: status,
        user_id
      });

      // Update view count if viewed
      if (status === 'viewed') {
        await client.query(
          'UPDATE quotes SET view_count = view_count + 1, last_viewed_at = NOW() WHERE quote_id = $1',
          [quote_id]
        );
      }

      await client.query('COMMIT');
      return quote;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating quote status', { error, quote_id, status });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get quotes expiring soon
   */
  async getExpiringQuotes(company_id: number, days: number = 7): Promise<Quote[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM quotes
        WHERE company_id = $1
        AND status IN ('sent', 'viewed')
        AND expiration_date IS NOT NULL
        AND expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
        ORDER BY expiration_date`;

      const result = await client.query(query, [company_id]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error getting expiring quotes', { error, company_id, days });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(client: PoolClient, event: any): Promise<void> {
    const query = `
      INSERT INTO quote_audit_log (
        company_id, quote_id, action_type, field_name,
        old_value, new_value, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`;

    await client.query(query, [
      event.company_id,
      event.quote_id,
      event.action_type,
      event.field_name || null,
      event.old_value || null,
      event.new_value || null,
      event.user_id
    ]);
  }
}