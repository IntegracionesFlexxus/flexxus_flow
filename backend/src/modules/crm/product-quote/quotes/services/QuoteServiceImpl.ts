/**
 * Quote Service Implementation - Sprint 20
 * Complete implementation of quote management functionality
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { Pool, PoolClient } from 'pg';
import { TYPES } from '@/container/types';
import { Redis } from 'ioredis';
import * as PDFDocument from 'pdfkit';
import * as Handlebars from 'handlebars';
import { v4 as uuidv4 } from 'uuid';

export interface Quote {
  id?: number;
  quote_number?: string;
  opportunity_id?: number;
  account_id?: number;
  contact_id?: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'converted';
  valid_from?: Date;
  valid_to?: Date;
  currency: string;
  exchange_rate?: number;
  subtotal?: number;
  discount_amount?: number;
  discount_percentage?: number;
  tax_amount?: number;
  shipping_amount?: number;
  total_amount?: number;
  terms_conditions?: string;
  payment_terms?: string;
  delivery_terms?: string;
  notes?: string;
  internal_notes?: string;
  version?: number;
  parent_quote_id?: number;
  approval_status?: 'not_required' | 'pending' | 'approved' | 'rejected';
  approved_by?: number;
  approved_at?: Date;
  rejection_reason?: string;
  created_by?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface QuoteItem {
  id?: number;
  quote_id?: number;
  product_id?: number;
  variant_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  list_price?: number;
  discount_percentage?: number;
  discount_amount?: number;
  tax_rate?: number;
  tax_amount?: number;
  subtotal?: number;
  total_amount?: number;
  cost?: number;
  margin?: number;
  margin_percentage?: number;
  notes?: string;
  custom_fields?: any;
  optional?: boolean;
  parent_item_id?: number;
  display_order?: number;
}

export interface QuoteCreateData {
  quote: Quote;
  items: QuoteItem[];
}

export interface DiscountRule {
  type: 'percentage' | 'fixed' | 'volume' | 'bundle';
  value: number;
  conditions?: any;
  apply_to?: 'quote' | 'items' | 'specific_items';
  item_ids?: number[];
}

export interface QuoteSummary {
  subtotal: number;
  discount_total: number;
  tax_total: number;
  shipping_total: number;
  grand_total: number;
  margin_total: number;
  margin_percentage: number;
  item_count: number;
}

export interface QuoteVersion {
  version: number;
  quote_id: number;
  created_at: Date;
  created_by: number;
  changes: any;
  status: string;
}

export interface ConversionResult {
  order_id: number;
  order_number: string;
  status: string;
  message: string;
}

@injectable()
export class QuoteServiceImpl {
  private readonly DEFAULT_VALIDITY_DAYS = 30;
  private readonly TAX_RATE = 0.10; // 10% default tax rate

  constructor(
    @inject(TYPES.CrmConnection) private pool: Pool,
    @inject(TYPES.Logger) private logger: any,
    @inject(TYPES.RedisClient) private redis: Redis,
    @inject(TYPES.ProductService) private productService: any,
    @inject(TYPES.PricingService) private pricingService: any,
    @inject(TYPES.ApprovalService) private approvalService: any
  ) {}

  /**
   * Create a new quote with line items
   */
  async createQuote(quoteData: QuoteCreateData): Promise<Quote> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Generate quote number
      const quoteNumber = await this.generateQuoteNumber(client);

      // Set default values
      const quote = {
        ...quoteData.quote,
        quote_number: quoteNumber,
        status: quoteData.quote.status || 'draft',
        currency: quoteData.quote.currency || 'USD',
        exchange_rate: quoteData.quote.exchange_rate || 1.0,
        valid_from: quoteData.quote.valid_from || new Date(),
        valid_to: quoteData.quote.valid_to || new Date(Date.now() + this.DEFAULT_VALIDITY_DAYS * 24 * 60 * 60 * 1000),
        version: 1,
        approval_status: 'not_required' as const
      };

      // Insert quote
      const quoteQuery = `
        INSERT INTO quotes (
          quote_number, opportunity_id, account_id, contact_id,
          status, valid_from, valid_to, currency, exchange_rate,
          terms_conditions, payment_terms, delivery_terms,
          notes, internal_notes, version, parent_quote_id,
          approval_status, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18
        ) RETURNING *
      `;

      const quoteValues = [
        quote.quote_number,
        quote.opportunity_id,
        quote.account_id,
        quote.contact_id,
        quote.status,
        quote.valid_from,
        quote.valid_to,
        quote.currency,
        quote.exchange_rate,
        quote.terms_conditions,
        quote.payment_terms,
        quote.delivery_terms,
        quote.notes,
        quote.internal_notes,
        quote.version,
        quote.parent_quote_id,
        quote.approval_status,
        quote.created_by
      ];

      const quoteResult = await client.query(quoteQuery, quoteValues);
      const createdQuote = quoteResult.rows[0];

      // Add line items
      if (quoteData.items && quoteData.items.length > 0) {
        await this.addQuoteItems(client, createdQuote.id, quoteData.items);
      }

      // Calculate totals
      await this.calculateAndUpdateTotals(client, createdQuote.id);

      // Get the updated quote with totals
      const finalQuote = await this.getQuoteById(createdQuote.id);

      // Check if approval is required
      await this.checkAndInitiateApproval(finalQuote);

      await client.query('COMMIT');

      this.logger.info(`Quote created: ${createdQuote.quote_number}`, {
        quoteId: createdQuote.id,
        accountId: createdQuote.account_id
      });

      return finalQuote;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating quote', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update quote items
   */
  async updateQuoteItems(quoteId: number, items: QuoteItem[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing items
      await client.query('DELETE FROM quote_items WHERE quote_id = $1', [quoteId]);

      // Add new items
      await this.addQuoteItems(client, quoteId, items);

      // Recalculate totals
      await this.calculateAndUpdateTotals(client, quoteId);

      // Update quote version
      await client.query(
        'UPDATE quotes SET version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [quoteId]
      );

      await client.query('COMMIT');

      // Clear cache
      await this.clearQuoteCache(quoteId);

      this.logger.info(`Quote items updated for quote ${quoteId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating quote items', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate quote totals
   */
  async calculateQuoteTotals(quoteId: number): Promise<QuoteSummary> {
    const client = await this.pool.connect();
    try {
      // Get all quote items
      const itemsQuery = `
        SELECT
          qi.*,
          p.cost as product_cost
        FROM quote_items qi
        LEFT JOIN products p ON qi.product_id = p.id
        WHERE qi.quote_id = $1 AND qi.optional = false
        ORDER BY qi.display_order
      `;

      const itemsResult = await client.query(itemsQuery, [quoteId]);
      const items = itemsResult.rows;

      let subtotal = 0;
      let discountTotal = 0;
      let taxTotal = 0;
      let marginTotal = 0;

      for (const item of items) {
        const itemSubtotal = item.quantity * item.unit_price;
        const itemDiscount = item.discount_amount || (itemSubtotal * (item.discount_percentage || 0) / 100);
        const itemNetAmount = itemSubtotal - itemDiscount;
        const itemTax = itemNetAmount * (item.tax_rate || this.TAX_RATE) / 100;
        const itemTotal = itemNetAmount + itemTax;

        // Calculate margin
        const itemCost = (item.cost || item.product_cost || 0) * item.quantity;
        const itemMargin = itemNetAmount - itemCost;

        subtotal += itemSubtotal;
        discountTotal += itemDiscount;
        taxTotal += itemTax;
        marginTotal += itemMargin;

        // Update item totals
        await client.query(`
          UPDATE quote_items
          SET
            subtotal = $1,
            discount_amount = $2,
            tax_amount = $3,
            total_amount = $4,
            margin = $5,
            margin_percentage = $6,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $7
        `, [
          itemSubtotal,
          itemDiscount,
          itemTax,
          itemTotal,
          itemMargin,
          itemCost > 0 ? (itemMargin / itemNetAmount * 100) : 0,
          item.id
        ]);
      }

      // Get quote level shipping
      const quoteResult = await client.query(
        'SELECT shipping_amount FROM quotes WHERE id = $1',
        [quoteId]
      );
      const shippingTotal = parseFloat(quoteResult.rows[0]?.shipping_amount || 0);

      const grandTotal = subtotal - discountTotal + taxTotal + shippingTotal;
      const marginPercentage = subtotal > 0 ? (marginTotal / subtotal * 100) : 0;

      const summary: QuoteSummary = {
        subtotal,
        discount_total: discountTotal,
        tax_total: taxTotal,
        shipping_total: shippingTotal,
        grand_total: grandTotal,
        margin_total: marginTotal,
        margin_percentage: marginPercentage,
        item_count: items.length
      };

      return summary;
    } finally {
      client.release();
    }
  }

  /**
   * Apply discount rules to quote
   */
  async applyDiscounts(quoteId: number, discountRules: DiscountRule[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const rule of discountRules) {
        switch (rule.apply_to) {
          case 'quote':
            await this.applyQuoteLevelDiscount(client, quoteId, rule);
            break;
          case 'items':
            await this.applyItemsDiscount(client, quoteId, rule);
            break;
          case 'specific_items':
            await this.applySpecificItemsDiscount(client, quoteId, rule);
            break;
        }
      }

      // Recalculate totals
      await this.calculateAndUpdateTotals(client, quoteId);

      await client.query('COMMIT');

      this.logger.info(`Discounts applied to quote ${quoteId}`, { discountRules });
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error applying discounts', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Convert quote to order
   */
  async convertToOrder(quoteId: number): Promise<ConversionResult> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get quote details
      const quote = await this.getQuoteById(quoteId);

      if (!quote) {
        throw new Error('Quote not found');
      }

      if (quote.status === 'converted') {
        throw new Error('Quote already converted to order');
      }

      if (quote.status !== 'accepted') {
        throw new Error('Only accepted quotes can be converted to orders');
      }

      // Create order (would integrate with Order service)
      const orderNumber = `ORD-${Date.now()}`;
      const orderId = await this.createOrderFromQuote(client, quote, orderNumber);

      // Update quote status
      await client.query(`
        UPDATE quotes
        SET
          status = 'converted',
          converted_to_order_id = $1,
          converted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [orderId, quoteId]);

      // Reserve inventory for ordered items
      await this.reserveInventory(client, quoteId);

      await client.query('COMMIT');

      this.logger.info(`Quote ${quote.quote_number} converted to order ${orderNumber}`);

      return {
        order_id: orderId,
        order_number: orderNumber,
        status: 'success',
        message: 'Quote successfully converted to order'
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      this.logger.error('Error converting quote to order', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Clone an existing quote
   */
  async cloneQuote(quoteId: number, updates?: Partial<Quote>): Promise<Quote> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get original quote
      const originalQuote = await this.getQuoteById(quoteId);
      if (!originalQuote) {
        throw new Error('Quote not found');
      }

      // Get original quote items
      const itemsResult = await client.query(
        'SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY display_order',
        [quoteId]
      );
      const originalItems = itemsResult.rows;

      // Create new quote
      const newQuoteData: QuoteCreateData = {
        quote: {
          ...originalQuote,
          ...updates,
          id: undefined,
          quote_number: undefined,
          status: 'draft',
          parent_quote_id: quoteId,
          version: 1,
          approval_status: 'not_required',
          approved_by: undefined,
          approved_at: undefined,
          created_at: undefined,
          updated_at: undefined
        },
        items: originalItems.map(item => ({
          ...item,
          id: undefined,
          quote_id: undefined
        }))
      };

      const clonedQuote = await this.createQuote(newQuoteData);

      await client.query('COMMIT');

      this.logger.info(`Quote ${originalQuote.quote_number} cloned to ${clonedQuote.quote_number}`);

      return clonedQuote;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error cloning quote', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate quote PDF
   */
  async generateQuotePDF(quoteId: number, templateId?: number): Promise<Buffer> {
    const client = await this.pool.connect();
    try {
      // Get quote with all details
      const quote = await this.getQuoteWithDetails(client, quoteId);

      // Get template
      const template = await this.getQuoteTemplate(client, templateId);

      // Generate PDF
      const pdfBuffer = await this.createPDFFromTemplate(quote, template);

      // Log PDF generation
      await client.query(`
        INSERT INTO quote_pdf_logs (
          quote_id, template_id, generated_at, generated_by
        ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
      `, [quoteId, templateId, quote.created_by]);

      return pdfBuffer;
    } finally {
      client.release();
    }
  }

  /**
   * Submit quote for approval
   */
  async submitForApproval(quoteId: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const quote = await this.getQuoteById(quoteId);
      if (!quote) {
        throw new Error('Quote not found');
      }

      // Check approval thresholds
      const requiresApproval = await this.checkApprovalRequired(quote);

      if (requiresApproval) {
        // Create approval request
        const approvalRequest = await this.approvalService.createApprovalRequest({
          entity_type: 'quote',
          entity_id: quoteId,
          entity_data: quote,
          requested_by: quote.created_by
        });

        // Update quote approval status
        await client.query(`
          UPDATE quotes
          SET
            approval_status = 'pending',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [quoteId]);

        this.logger.info(`Quote ${quote.quote_number} submitted for approval`);
      } else {
        // Auto-approve
        await client.query(`
          UPDATE quotes
          SET
            approval_status = 'approved',
            approved_by = $1,
            approved_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [quote.created_by, quoteId]);

        this.logger.info(`Quote ${quote.quote_number} auto-approved`);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error submitting quote for approval', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get quote version history
   */
  async getQuoteVersionHistory(quoteId: number): Promise<QuoteVersion[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT
          q.version,
          q.id as quote_id,
          q.created_at,
          q.created_by,
          q.status,
          json_build_object(
            'total', q.total_amount,
            'discount', q.discount_amount,
            'items', (
              SELECT COUNT(*)
              FROM quote_items
              WHERE quote_id = q.id
            )
          ) as changes
        FROM quotes q
        WHERE q.id = $1 OR q.parent_quote_id = $1
        ORDER BY q.version DESC
      `;

      const result = await client.query(query, [quoteId]);

      return result.rows.map(row => ({
        version: row.version,
        quote_id: row.quote_id,
        created_at: row.created_at,
        created_by: row.created_by,
        changes: row.changes,
        status: row.status
      }));
    } finally {
      client.release();
    }
  }

  // Helper methods

  private async generateQuoteNumber(client: PoolClient): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Get the next sequence number
    const result = await client.query(`
      SELECT COUNT(*) + 1 as next_number
      FROM quotes
      WHERE quote_number LIKE $1
    `, [`Q${year}${month}%`]);

    const nextNumber = String(result.rows[0].next_number).padStart(4, '0');
    return `Q${year}${month}${nextNumber}`;
  }

  private async addQuoteItems(
    client: PoolClient,
    quoteId: number,
    items: QuoteItem[]
  ): Promise<void> {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Get product pricing if product_id is provided
      let calculatedPrice = item.unit_price;
      if (item.product_id) {
        const pricing = await this.pricingService.calculatePrice(
          item.product_id,
          item.quantity
        );
        calculatedPrice = pricing.final_price;
        item.list_price = pricing.base_price;
      }

      const itemQuery = `
        INSERT INTO quote_items (
          quote_id, product_id, variant_id, description,
          quantity, unit_price, list_price, discount_percentage,
          discount_amount, tax_rate, notes, custom_fields,
          optional, parent_item_id, display_order
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
      `;

      const itemValues = [
        quoteId,
        item.product_id,
        item.variant_id,
        item.description,
        item.quantity,
        calculatedPrice,
        item.list_price,
        item.discount_percentage || 0,
        item.discount_amount || 0,
        item.tax_rate || this.TAX_RATE,
        item.notes,
        JSON.stringify(item.custom_fields || {}),
        item.optional || false,
        item.parent_item_id,
        item.display_order || i
      ];

      await client.query(itemQuery, itemValues);
    }
  }

  private async calculateAndUpdateTotals(
    client: PoolClient,
    quoteId: number
  ): Promise<void> {
    const summary = await this.calculateQuoteTotals(quoteId);

    await client.query(`
      UPDATE quotes
      SET
        subtotal = $1,
        discount_amount = $2,
        tax_amount = $3,
        shipping_amount = $4,
        total_amount = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [
      summary.subtotal,
      summary.discount_total,
      summary.tax_total,
      summary.shipping_total,
      summary.grand_total,
      quoteId
    ]);
  }

  private async applyQuoteLevelDiscount(
    client: PoolClient,
    quoteId: number,
    rule: DiscountRule
  ): Promise<void> {
    if (rule.type === 'percentage') {
      await client.query(`
        UPDATE quotes
        SET
          discount_percentage = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [rule.value, quoteId]);
    } else if (rule.type === 'fixed') {
      await client.query(`
        UPDATE quotes
        SET
          discount_amount = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [rule.value, quoteId]);
    }
  }

  private async applyItemsDiscount(
    client: PoolClient,
    quoteId: number,
    rule: DiscountRule
  ): Promise<void> {
    if (rule.type === 'percentage') {
      await client.query(`
        UPDATE quote_items
        SET
          discount_percentage = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE quote_id = $2 AND optional = false
      `, [rule.value, quoteId]);
    } else if (rule.type === 'fixed') {
      await client.query(`
        UPDATE quote_items
        SET
          discount_amount = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE quote_id = $2 AND optional = false
      `, [rule.value, quoteId]);
    }
  }

  private async applySpecificItemsDiscount(
    client: PoolClient,
    quoteId: number,
    rule: DiscountRule
  ): Promise<void> {
    if (!rule.item_ids || rule.item_ids.length === 0) return;

    if (rule.type === 'percentage') {
      await client.query(`
        UPDATE quote_items
        SET
          discount_percentage = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE quote_id = $2 AND id = ANY($3)
      `, [rule.value, quoteId, rule.item_ids]);
    } else if (rule.type === 'fixed') {
      await client.query(`
        UPDATE quote_items
        SET
          discount_amount = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE quote_id = $2 AND id = ANY($3)
      `, [rule.value, quoteId, rule.item_ids]);
    }
  }

  private async getQuoteById(quoteId: number): Promise<Quote> {
    const cacheKey = `quote:${quoteId}`;

    // Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM quotes WHERE id = $1',
        [quoteId]
      );

      if (result.rows.length === 0) {
        throw new Error('Quote not found');
      }

      const quote = result.rows[0];

      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(quote));

      return quote;
    } finally {
      client.release();
    }
  }

  private async getQuoteWithDetails(client: PoolClient, quoteId: number): Promise<any> {
    const quoteResult = await client.query(`
      SELECT
        q.*,
        a.name as account_name,
        c.name as contact_name,
        o.name as opportunity_name
      FROM quotes q
      LEFT JOIN accounts a ON q.account_id = a.id
      LEFT JOIN contacts c ON q.contact_id = c.id
      LEFT JOIN opportunities o ON q.opportunity_id = o.id
      WHERE q.id = $1
    `, [quoteId]);

    const itemsResult = await client.query(`
      SELECT
        qi.*,
        p.name as product_name,
        p.sku as product_sku
      FROM quote_items qi
      LEFT JOIN products p ON qi.product_id = p.id
      WHERE qi.quote_id = $1
      ORDER BY qi.display_order
    `, [quoteId]);

    return {
      ...quoteResult.rows[0],
      items: itemsResult.rows
    };
  }

  private async getQuoteTemplate(
    client: PoolClient,
    templateId?: number
  ): Promise<any> {
    let query: string;
    let values: any[];

    if (templateId) {
      query = 'SELECT * FROM quote_templates WHERE id = $1';
      values = [templateId];
    } else {
      query = 'SELECT * FROM quote_templates WHERE is_default = true LIMIT 1';
      values = [];
    }

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      // Return default template
      return {
        name: 'Default Template',
        content: this.getDefaultTemplateContent()
      };
    }

    return result.rows[0];
  }

  private getDefaultTemplateContent(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .header { text-align: center; margin-bottom: 30px; }
          .quote-details { margin-bottom: 30px; }
          .items-table { width: 100%; border-collapse: collapse; }
          .items-table th, .items-table td { padding: 10px; border: 1px solid #ddd; }
          .totals { text-align: right; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>QUOTE</h1>
          <p>{{quote_number}}</p>
        </div>
        <div class="quote-details">
          <p><strong>To:</strong> {{account_name}}</p>
          <p><strong>Contact:</strong> {{contact_name}}</p>
          <p><strong>Valid Until:</strong> {{valid_to}}</p>
        </div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {{#each items}}
            <tr>
              <td>{{product_name}}</td>
              <td>{{description}}</td>
              <td>{{quantity}}</td>
              <td>{{unit_price}}</td>
              <td>{{total_amount}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>
        <div class="totals">
          <p><strong>Subtotal:</strong> {{subtotal}}</p>
          <p><strong>Discount:</strong> {{discount_amount}}</p>
          <p><strong>Tax:</strong> {{tax_amount}}</p>
          <p><strong>Total:</strong> {{total_amount}}</p>
        </div>
      </body>
      </html>
    `;
  }

  private async createPDFFromTemplate(quote: any, template: any): Promise<Buffer> {
    // Compile Handlebars template
    const compiledTemplate = Handlebars.compile(template.content);
    const html = compiledTemplate(quote);

    // For now, return a simple PDF
    // In production, use a proper HTML to PDF converter like Puppeteer
    const doc = new (PDFDocument as any)();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Add content to PDF
      doc.fontSize(20).text('QUOTE', 50, 50);
      doc.fontSize(12).text(`Quote Number: ${quote.quote_number}`, 50, 100);
      doc.fontSize(12).text(`Customer: ${quote.account_name}`, 50, 120);
      doc.fontSize(12).text(`Total: $${quote.total_amount}`, 50, 140);

      // Add items
      let yPosition = 200;
      doc.fontSize(14).text('Items:', 50, yPosition);
      yPosition += 30;

      for (const item of quote.items) {
        doc.fontSize(10).text(
          `${item.product_name || item.description} - Qty: ${item.quantity} - $${item.total_amount}`,
          50,
          yPosition
        );
        yPosition += 20;
      }

      doc.end();
    });
  }

  private async checkApprovalRequired(quote: Quote): Promise<boolean> {
    // Check if quote total exceeds approval threshold
    const APPROVAL_THRESHOLD = 10000; // $10,000

    if (!quote.total_amount) return false;

    if (quote.total_amount > APPROVAL_THRESHOLD) {
      return true;
    }

    // Check if discount exceeds threshold
    const DISCOUNT_THRESHOLD = 20; // 20%
    if (quote.discount_percentage && quote.discount_percentage > DISCOUNT_THRESHOLD) {
      return true;
    }

    return false;
  }

  private async checkAndInitiateApproval(quote: Quote): Promise<void> {
    if (await this.checkApprovalRequired(quote)) {
      await this.submitForApproval(quote.id!);
    }
  }

  private async createOrderFromQuote(
    client: PoolClient,
    quote: Quote,
    orderNumber: string
  ): Promise<number> {
    // This would integrate with the Order Management system
    // For now, create a simple order record
    const result = await client.query(`
      INSERT INTO orders (
        order_number, quote_id, account_id, contact_id,
        status, currency, total_amount, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP
      ) RETURNING id
    `, [
      orderNumber,
      quote.id,
      quote.account_id,
      quote.contact_id,
      'pending',
      quote.currency,
      quote.total_amount
    ]);

    return result.rows[0]?.id || 0;
  }

  private async reserveInventory(client: PoolClient, quoteId: number): Promise<void> {
    const itemsResult = await client.query(
      'SELECT product_id, variant_id, quantity FROM quote_items WHERE quote_id = $1',
      [quoteId]
    );

    for (const item of itemsResult.rows) {
      if (item.variant_id) {
        await client.query(`
          UPDATE product_variants
          SET
            reserved_quantity = reserved_quantity + $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [item.quantity, item.variant_id]);
      }
    }
  }

  private async clearQuoteCache(quoteId: number): Promise<void> {
    const patterns = [
      `quote:${quoteId}`,
      `quote:${quoteId}:*`,
      `quotes:list:*`
    ];

    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }
}