/**
 * Quote Repository
 * Sprint 20 Implementation
 */

import { Pool } from 'pg';
import {
  IQuote,
  CreateQuoteDto,
  UpdateQuoteDto,
  QuoteSearchCriteria,
  QuoteTotals
} from '../../shared/interfaces/quote.interfaces';

export class QuoteRepository {
  constructor(private pool: Pool) {}

  async create(companyId: number, data: CreateQuoteDto): Promise<IQuote> {
    const quoteNumber = await this.generateQuoteNumber(companyId);

    const query = `
      INSERT INTO quotes (
        company_id, quote_number, opportunity_id, account_id, contact_id,
        quote_name, quote_type, description, currency_code, payment_terms,
        delivery_terms, valid_from, valid_until, billing_address, shipping_address,
        internal_notes, customer_notes, terms_conditions, custom_fields, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;

    const values = [
      companyId,
      quoteNumber,
      data.opportunity_id,
      data.account_id,
      data.contact_id,
      data.quote_name,
      data.quote_type || 'standard',
      data.description,
      data.currency_code || 'USD',
      data.payment_terms,
      data.delivery_terms,
      new Date(),
      data.valid_until,
      JSON.stringify(data.billing_address),
      JSON.stringify(data.shipping_address),
      data.internal_notes,
      data.customer_notes,
      data.terms_conditions,
      JSON.stringify(data.custom_fields),
      1 // TODO: Get from auth context
    ];

    const result = await this.pool.query(query, values);
    return this.mapToQuote(result.rows[0]);
  }

  async findById(companyId: number, quoteId: number): Promise<IQuote | null> {
    const query = `
      SELECT q.*, a.account_name, c.full_name as contact_name
      FROM quotes q
      LEFT JOIN accounts a ON q.account_id = a.account_id
      LEFT JOIN contacts c ON q.contact_id = c.contact_id
      WHERE q.quote_id = $1 AND q.company_id = $2
    `;

    const result = await this.pool.query(query, [quoteId, companyId]);
    return result.rows[0] ? this.mapToQuote(result.rows[0]) : null;
  }

  async findByNumber(companyId: number, quoteNumber: string): Promise<IQuote | null> {
    const query = `
      SELECT * FROM quotes
      WHERE company_id = $1 AND quote_number = $2
    `;

    const result = await this.pool.query(query, [companyId, quoteNumber]);
    return result.rows[0] ? this.mapToQuote(result.rows[0]) : null;
  }

  async search(companyId: number, criteria: QuoteSearchCriteria): Promise<IQuote[]> {
    let query = `
      SELECT q.*, a.account_name, c.full_name as contact_name
      FROM quotes q
      LEFT JOIN accounts a ON q.account_id = a.account_id
      LEFT JOIN contacts c ON q.contact_id = c.contact_id
      WHERE q.company_id = $1
    `;

    const params: any[] = [companyId];
    let paramIndex = 2;

    if (criteria.search) {
      query += ` AND (q.quote_name ILIKE $${paramIndex} OR q.quote_number ILIKE $${paramIndex} OR q.description ILIKE $${paramIndex})`;
      params.push(`%${criteria.search}%`);
      paramIndex++;
    }

    if (criteria.account_ids?.length) {
      query += ` AND q.account_id = ANY($${paramIndex})`;
      params.push(criteria.account_ids);
      paramIndex++;
    }

    if (criteria.opportunity_ids?.length) {
      query += ` AND q.opportunity_id = ANY($${paramIndex})`;
      params.push(criteria.opportunity_ids);
      paramIndex++;
    }

    if (criteria.status?.length) {
      query += ` AND q.status = ANY($${paramIndex})`;
      params.push(criteria.status);
      paramIndex++;
    }

    if (criteria.approval_status?.length) {
      query += ` AND q.approval_status = ANY($${paramIndex})`;
      params.push(criteria.approval_status);
      paramIndex++;
    }

    if (criteria.amount_range) {
      query += ` AND q.total_amount BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(criteria.amount_range.min, criteria.amount_range.max);
      paramIndex += 2;
    }

    if (criteria.date_range) {
      const dateField = criteria.date_range.field === 'created' ? 'created_at' :
                       criteria.date_range.field === 'sent' ? 'sent_at' : 'valid_until';
      query += ` AND q.${dateField} BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(criteria.date_range.start, criteria.date_range.end);
      paramIndex += 2;
    }

    if (criteria.sales_rep_ids?.length) {
      query += ` AND q.sales_rep_id = ANY($${paramIndex})`;
      params.push(criteria.sales_rep_ids);
      paramIndex++;
    }

    if (criteria.has_discount !== undefined) {
      query += criteria.has_discount ? ` AND q.discount_amount > 0` : ` AND q.discount_amount = 0`;
    }

    if (criteria.is_expired) {
      query += ` AND q.valid_until < CURRENT_DATE AND q.status NOT IN ('accepted', 'converted')`;
    }

    query += ` ORDER BY q.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapToQuote(row));
  }

  async update(companyId: number, quoteId: number, data: UpdateQuoteDto): Promise<IQuote> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    });

    values.push(quoteId, companyId);

    const query = `
      UPDATE quotes
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP, updated_by = 1, version_number = version_number + 1
      WHERE quote_id = $${paramIndex} AND company_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return this.mapToQuote(result.rows[0]);
  }

  async updateStatus(companyId: number, quoteId: number, status: string, additionalFields?: Record<string, any>): Promise<IQuote> {
    const updates: Record<string, any> = { status };

    // Add timestamp based on status
    switch (status) {
      case 'sent':
        updates.sent_at = new Date();
        break;
      case 'viewed':
        updates.viewed_at = new Date();
        break;
      case 'accepted':
        updates.accepted_at = new Date();
        break;
      case 'rejected':
        updates.rejected_at = new Date();
        break;
      case 'converted':
        updates.converted_at = new Date();
        break;
    }

    if (additionalFields) {
      Object.assign(updates, additionalFields);
    }

    return this.update(companyId, quoteId, updates);
  }

  async calculateTotals(quoteId: number): Promise<QuoteTotals> {
    // Calculate totals from line items
    const query = `
      WITH totals AS (
        SELECT
          COALESCE(SUM(subtotal), 0) as subtotal,
          COALESCE(SUM(total_discount), 0) as total_discount,
          COALESCE(SUM(total_amount), 0) as line_items_total,
          COUNT(*) as line_items_count,
          COALESCE(SUM(CASE WHEN is_optional THEN total_amount ELSE 0 END), 0) as optional_items_total,
          COALESCE(SUM(margin_amount), 0) as margin_amount
        FROM quote_line_items
        WHERE quote_id = $1 AND is_selected = true
      )
      UPDATE quotes q
      SET
        subtotal = t.subtotal,
        total_amount = t.line_items_total + q.shipping_amount + q.tax_amount - q.discount_amount,
        updated_at = CURRENT_TIMESTAMP
      FROM totals t
      WHERE q.quote_id = $1
      RETURNING
        q.subtotal,
        q.discount_amount as total_discount,
        CASE WHEN q.subtotal > 0 THEN (q.discount_amount / q.subtotal * 100) ELSE 0 END as discount_percentage,
        q.subtotal - q.discount_amount as taxable_amount,
        q.tax_amount as total_tax,
        q.shipping_amount,
        q.total_amount,
        q.currency_code,
        t.line_items_count::integer,
        t.optional_items_total,
        t.margin_amount,
        CASE WHEN q.subtotal > 0 THEN (t.margin_amount / q.subtotal * 100) ELSE 0 END as margin_percentage
    `;

    const result = await this.pool.query(query, [quoteId]);

    if (!result.rows[0]) {
      throw new Error('Quote not found');
    }

    return {
      subtotal: parseFloat(result.rows[0].subtotal),
      total_discount: parseFloat(result.rows[0].total_discount),
      discount_percentage: result.rows[0].discount_percentage ? parseFloat(result.rows[0].discount_percentage) : undefined,
      taxable_amount: parseFloat(result.rows[0].taxable_amount),
      total_tax: parseFloat(result.rows[0].total_tax),
      shipping_amount: parseFloat(result.rows[0].shipping_amount),
      total_amount: parseFloat(result.rows[0].total_amount),
      currency_code: result.rows[0].currency_code,
      line_items_count: result.rows[0].line_items_count,
      optional_items_total: result.rows[0].optional_items_total ? parseFloat(result.rows[0].optional_items_total) : undefined,
      margin_amount: result.rows[0].margin_amount ? parseFloat(result.rows[0].margin_amount) : undefined,
      margin_percentage: result.rows[0].margin_percentage ? parseFloat(result.rows[0].margin_percentage) : undefined
    };
  }

  async delete(companyId: number, quoteId: number): Promise<boolean> {
    const query = `
      DELETE FROM quotes
      WHERE quote_id = $1 AND company_id = $2 AND status = 'draft'
    `;

    const result = await this.pool.query(query, [quoteId, companyId]);
    return result.rowCount > 0;
  }

  async clone(companyId: number, quoteId: number): Promise<IQuote> {
    const query = `
      INSERT INTO quotes (
        company_id, quote_number, opportunity_id, account_id, contact_id,
        quote_name, quote_type, description, currency_code, exchange_rate,
        payment_terms, payment_method, delivery_terms, delivery_method,
        billing_address, shipping_address, internal_notes, customer_notes,
        terms_conditions, custom_fields, created_by
      )
      SELECT
        company_id,
        generate_quote_number(company_id),
        opportunity_id,
        account_id,
        contact_id,
        quote_name || ' (Copy)',
        quote_type,
        description,
        currency_code,
        exchange_rate,
        payment_terms,
        payment_method,
        delivery_terms,
        delivery_method,
        billing_address,
        shipping_address,
        internal_notes,
        customer_notes,
        terms_conditions,
        custom_fields,
        1
      FROM quotes
      WHERE quote_id = $1 AND company_id = $2
      RETURNING *
    `;

    const result = await this.pool.query(query, [quoteId, companyId]);
    const newQuote = this.mapToQuote(result.rows[0]);

    // Clone line items
    const cloneItemsQuery = `
      INSERT INTO quote_line_items (
        quote_id, section_id, product_id, variation_id, bundle_id,
        line_number, sku, name, description, quantity, unit_of_measure,
        list_price, unit_price, discount_percentage, discount_amount,
        subtotal, total_discount, total_amount, unit_cost, total_cost,
        margin_amount, margin_percentage, is_optional, is_selected,
        requires_configuration, configuration, notes, sort_order,
        custom_fields, created_by
      )
      SELECT
        $2, section_id, product_id, variation_id, bundle_id,
        line_number, sku, name, description, quantity, unit_of_measure,
        list_price, unit_price, discount_percentage, discount_amount,
        subtotal, total_discount, total_amount, unit_cost, total_cost,
        margin_amount, margin_percentage, is_optional, is_selected,
        requires_configuration, configuration, notes, sort_order,
        custom_fields, 1
      FROM quote_line_items
      WHERE quote_id = $1
    `;

    await this.pool.query(cloneItemsQuery, [quoteId, newQuote.quote_id]);

    // Calculate totals for the new quote
    await this.calculateTotals(newQuote.quote_id);

    return newQuote;
  }

  async getStatistics(companyId: number, dateRange?: { start: Date; end: Date }): Promise<any> {
    let query = `
      SELECT
        COUNT(*) as total_quotes,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_count,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_count,
        SUM(total_amount) as total_value,
        AVG(total_amount) as average_value,
        COUNT(CASE WHEN status = 'converted' THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100 as conversion_rate
      FROM quotes
      WHERE company_id = $1
    `;

    const params: any[] = [companyId];

    if (dateRange) {
      query += ` AND created_at BETWEEN $2 AND $3`;
      params.push(dateRange.start, dateRange.end);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  private async generateQuoteNumber(companyId: number): Promise<string> {
    const query = `SELECT generate_quote_number($1) as quote_number`;
    const result = await this.pool.query(query, [companyId]);
    return result.rows[0].quote_number;
  }

  private mapToQuote(row: any): IQuote {
    return {
      quote_id: row.quote_id,
      company_id: row.company_id,
      quote_number: row.quote_number,
      opportunity_id: row.opportunity_id,
      account_id: row.account_id,
      contact_id: row.contact_id,
      quote_name: row.quote_name,
      quote_type: row.quote_type,
      description: row.description,
      currency_code: row.currency_code,
      exchange_rate: parseFloat(row.exchange_rate),
      subtotal: parseFloat(row.subtotal),
      discount_amount: parseFloat(row.discount_amount),
      tax_amount: parseFloat(row.tax_amount),
      shipping_amount: parseFloat(row.shipping_amount),
      total_amount: parseFloat(row.total_amount),
      payment_terms: row.payment_terms,
      payment_method: row.payment_method,
      delivery_terms: row.delivery_terms,
      delivery_method: row.delivery_method,
      valid_from: row.valid_from,
      valid_until: row.valid_until,
      status: row.status,
      approval_status: row.approval_status,
      sent_at: row.sent_at,
      viewed_at: row.viewed_at,
      accepted_at: row.accepted_at,
      rejected_at: row.rejected_at,
      converted_at: row.converted_at,
      sales_rep_id: row.sales_rep_id,
      sales_team_id: row.sales_team_id,
      commission_rate: row.commission_rate ? parseFloat(row.commission_rate) : undefined,
      billing_address: row.billing_address,
      shipping_address: row.shipping_address,
      internal_notes: row.internal_notes,
      customer_notes: row.customer_notes,
      terms_conditions: row.terms_conditions,
      custom_fields: row.custom_fields,
      version_number: row.version_number,
      created_at: row.created_at,
      created_by: row.created_by,
      updated_at: row.updated_at,
      updated_by: row.updated_by
    };
  }
}