/**
 * Quote Builder Service - Sprint 19
 * Handles quote creation, calculation, and management
 */

import { injectable, inject } from 'inversify';
import { Pool, PoolClient } from 'pg';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
import Decimal from 'decimal.js';
import { DynamicPricingEngine, PriceCalculationRequest } from './DynamicPricingEngine';
import { QuoteRepository, Quote, QuoteLineItem } from '../repositories/QuoteRepository';
import { ProductRepository } from '../repositories/ProductRepository';
import { ApprovalRepository } from '../repositories/ApprovalRepository';
import { DocumentTemplateRepository } from '../repositories/DocumentTemplateRepository';

export interface QuoteCreateRequest {
  company_id: number;
  opportunity_id?: number;
  account_id: number;
  contact_id?: number;
  quote_name: string;
  quote_type?: string;
  description?: string;
  valid_until?: Date;
  currency_code?: string;
  payment_terms?: string;
  delivery_terms?: string;
  billing_address?: any;
  shipping_address?: any;
  created_by?: number;
  line_items?: QuoteLineItemRequest[];
  sections?: QuoteSectionRequest[];
  custom_fields?: any;
}

export interface QuoteLineItemRequest {
  section_id?: number;
  product_id?: number;
  variation_id?: number;
  bundle_id?: number;
  sku?: string;
  name?: string;
  description?: string;
  quantity: number;
  unit_price?: number;
  discount_percentage?: number;
  discount_amount?: number;
  is_optional?: boolean;
  configuration?: any;
  notes?: string;
  custom_fields?: any;
}

export interface QuoteSectionRequest {
  section_name: string;
  section_type?: 'standard' | 'optional' | 'alternative';
  description?: string;
  sort_order?: number;
  is_visible?: boolean;
  line_items?: QuoteLineItemRequest[];
}

export interface QuoteTotals {
  subtotal: Decimal;
  discount_amount: Decimal;
  tax_amount: Decimal;
  shipping_amount: Decimal;
  total_amount: Decimal;
  margin_amount?: Decimal;
  margin_percentage?: Decimal;
  currency_code: string;
}

export interface QuoteValidation {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  requires_approval?: boolean;
  approval_reasons?: string[];
}

export interface QuoteVersion {
  version_number: number;
  quote_id: number;
  created_at: Date;
  created_by: number;
  changes_summary?: string;
  total_amount: Decimal;
  status: string;
}

export interface QuoteCloneOptions {
  include_line_items?: boolean;
  include_sections?: boolean;
  include_attachments?: boolean;
  new_account_id?: number;
  new_opportunity_id?: number;
  update_dates?: boolean;
}

export interface QuoteComparisonResult {
  quotes: Array<{
    quote_id: number;
    quote_number: string;
    total_amount: Decimal;
    discount_percentage: number;
    margin_percentage: number;
    status: string;
  }>;
  differences: Array<{
    field: string;
    values: any[];
  }>;
  recommendation?: {
    recommended_quote_id: number;
    reasons: string[];
  };
}

@injectable()
export class QuoteBuilderService {
  constructor(
    @inject(TYPES.CrmConnection) private pool: Pool,
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.QuoteRepository) private quoteRepository: QuoteRepository,
    @inject(TYPES.ProductRepository) private productRepository: ProductRepository,
    @inject(TYPES.DynamicPricingEngine) private pricingEngine: DynamicPricingEngine,
    @inject(TYPES.ApprovalRepository) private approvalRepository: ApprovalRepository,
    @inject(TYPES.DocumentTemplateRepository) private documentTemplateRepository: DocumentTemplateRepository
  ) {}

  /**
   * Create a new quote with line items
   */
  async createQuote(companyId: number, request: QuoteCreateRequest): Promise<Quote> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Validate quote request
      const validation = await this.validateQuoteRequest(request);
      if (!validation.is_valid) {
        throw new Error(`Quote validation failed: ${validation.errors.join(', ')}`);
      }

      // Generate quote number
      const quoteNumber = await this.generateQuoteNumber(companyId, client);

      // Create the quote header
      const quoteResult = await client.query(
        `INSERT INTO quotes (
          company_id, quote_number, opportunity_id, account_id, contact_id,
          quote_name, quote_type, description, currency_code,
          payment_terms, delivery_terms, valid_from, valid_until,
          status, version_number, is_primary,
          billing_address, shipping_address, custom_fields,
          created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *`,
        [
          companyId,
          quoteNumber,
          request.opportunity_id,
          request.account_id,
          request.contact_id,
          request.quote_name,
          request.quote_type || 'standard',
          request.description,
          request.currency_code || 'USD',
          request.payment_terms,
          request.delivery_terms,
          new Date(),
          request.valid_until || this.addDays(new Date(), 30),
          'draft',
          1, // version_number
          true, // is_primary
          JSON.stringify(request.billing_address || {}),
          JSON.stringify(request.shipping_address || {}),
          JSON.stringify(request.custom_fields || {}),
          request.created_by,
          request.created_by
        ]
      );

      const quote = quoteResult.rows[0];

      // Create sections if provided
      if (request.sections && request.sections.length > 0) {
        for (const section of request.sections) {
          await this.createQuoteSection(quote.quote_id, section, client);
        }
      } else {
        // Create default section
        await client.query(
          `INSERT INTO quote_sections (
            quote_id, section_name, section_type, sort_order, is_visible
          )
          VALUES ($1, $2, $3, $4, $5)`,
          [quote.quote_id, 'Main', 'standard', 0, true]
        );
      }

      // Add line items
      if (request.line_items && request.line_items.length > 0) {
        for (const item of request.line_items) {
          await this.addLineItem(quote.quote_id, item, client);
        }
      }

      // Calculate totals
      await this.calculateAndUpdateTotals(quote.quote_id, client);

      // Check if approval is required
      if (validation.requires_approval) {
        await this.initiateApprovalProcess(quote.quote_id, companyId, request.created_by!, client);
      }

      await client.query('COMMIT');

      // Return complete quote with details
      return await this.getQuoteById(quote.quote_id, companyId);

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating quote:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add line item to quote
   */
  async addLineItem(
    quoteId: number,
    item: QuoteLineItemRequest,
    client?: PoolClient
  ): Promise<QuoteLineItem> {
    const queryClient = client || this.pool;

    // Get product details if product_id is provided
    let productDetails: any = {};
    if (item.product_id) {
      const productResult = await queryClient.query(
        `SELECT * FROM products WHERE product_id = $1`,
        [item.product_id]
      );

      if (productResult.rows.length > 0) {
        productDetails = productResult.rows[0];
      }
    }

    // Calculate pricing if not provided
    let unitPrice = item.unit_price;
    if (!unitPrice && item.product_id) {
      const priceResult = await this.pricingEngine.calculatePrice({
        product_id: item.product_id,
        variation_id: item.variation_id,
        quantity: item.quantity,
        currency_code: 'USD',
        context: {}
      });
      unitPrice = priceResult.final_price;
    }

    // Get next line number
    const lineNumberResult = await queryClient.query(
      `SELECT COALESCE(MAX(line_number), 0) + 1 as next_number
       FROM quote_line_items WHERE quote_id = $1`,
      [quoteId]
    );

    const lineNumber = lineNumberResult.rows[0].next_number;

    // Insert line item
    const result = await queryClient.query(
      `INSERT INTO quote_line_items (
        quote_id, section_id, product_id, variation_id, bundle_id,
        line_number, sku, name, description,
        quantity, unit_of_measure, list_price, unit_price,
        discount_percentage, discount_amount,
        unit_cost, is_optional, requires_configuration,
        configuration, notes, sort_order, custom_fields
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *`,
      [
        quoteId,
        item.section_id,
        item.product_id,
        item.variation_id,
        item.bundle_id,
        lineNumber,
        item.sku || productDetails.sku,
        item.name || productDetails.name,
        item.description || productDetails.description,
        item.quantity,
        productDetails.unit_of_measure || 'UNIT',
        productDetails.base_price || unitPrice,
        unitPrice,
        item.discount_percentage || 0,
        item.discount_amount || 0,
        productDetails.cost || 0,
        item.is_optional || false,
        productDetails.is_configurable || false,
        JSON.stringify(item.configuration || {}),
        item.notes,
        lineNumber * 10,
        JSON.stringify(item.custom_fields || {})
      ]
    );

    return result.rows[0];
  }

  /**
   * Update line item
   */
  async updateLineItem(
    lineItemId: number,
    updates: Partial<QuoteLineItemRequest>
  ): Promise<QuoteLineItem> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'line_item_id') {
        fields.push(`${key} = $${paramCount}`);
        values.push(['configuration', 'custom_fields'].includes(key)
          ? JSON.stringify(value)
          : value);
        paramCount++;
      }
    });

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(lineItemId);

    const query = `
      UPDATE quote_line_items
      SET ${fields.join(', ')}
      WHERE line_item_id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    const updatedItem = result.rows[0];

    // Recalculate quote totals
    await this.calculateAndUpdateTotals(updatedItem.quote_id);

    return updatedItem;
  }

  /**
   * Remove line item
   */
  async removeLineItem(lineItemId: number): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM quote_line_items WHERE line_item_id = $1 RETURNING quote_id`,
      [lineItemId]
    );

    if (result.rows.length > 0) {
      await this.calculateAndUpdateTotals(result.rows[0].quote_id);
    }
  }

  /**
   * Calculate and update quote totals
   */
  async calculateAndUpdateTotals(
    quoteId: number,
    client?: PoolClient
  ): Promise<QuoteTotals> {
    const queryClient = client || this.pool;

    // Get all line items
    const itemsResult = await queryClient.query(
      `SELECT * FROM quote_line_items
       WHERE quote_id = $1 AND is_selected = true`,
      [quoteId]
    );

    let subtotal = new Decimal(0);
    let totalDiscount = new Decimal(0);
    let totalCost = new Decimal(0);

    for (const item of itemsResult.rows) {
      const lineTotal = new Decimal(item.quantity).mul(item.unit_price);
      subtotal = subtotal.add(lineTotal);

      // Calculate discount
      if (item.discount_percentage > 0) {
        const discount = lineTotal.mul(item.discount_percentage).div(100);
        totalDiscount = totalDiscount.add(discount);
      } else if (item.discount_amount > 0) {
        totalDiscount = totalDiscount.add(item.discount_amount);
      }

      // Calculate cost for margin
      if (item.unit_cost) {
        totalCost = totalCost.add(
          new Decimal(item.quantity).mul(item.unit_cost)
        );
      }
    }

    // Calculate tax (simplified - would integrate with tax service)
    const taxRate = 0.10; // 10% tax rate
    const taxableAmount = subtotal.sub(totalDiscount);
    const taxAmount = taxableAmount.mul(taxRate);

    // Calculate shipping (simplified)
    const shippingAmount = new Decimal(0);

    // Calculate total
    const totalAmount = taxableAmount.add(taxAmount).add(shippingAmount);

    // Calculate margin
    const marginAmount = taxableAmount.sub(totalCost);
    const marginPercentage = totalCost.gt(0)
      ? marginAmount.div(taxableAmount).mul(100)
      : new Decimal(100);

    // Update quote totals
    await queryClient.query(
      `UPDATE quotes
       SET subtotal = $2,
           discount_amount = $3,
           tax_amount = $4,
           shipping_amount = $5,
           total_amount = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE quote_id = $1`,
      [
        quoteId,
        subtotal.toNumber(),
        totalDiscount.toNumber(),
        taxAmount.toNumber(),
        shippingAmount.toNumber(),
        totalAmount.toNumber()
      ]
    );

    return {
      subtotal,
      discount_amount: totalDiscount,
      tax_amount: taxAmount,
      shipping_amount: shippingAmount,
      total_amount: totalAmount,
      margin_amount: marginAmount,
      margin_percentage: marginPercentage,
      currency_code: 'USD'
    };
  }

  /**
   * Apply discount to quote
   */
  async applyDiscount(
    quoteId: number,
    discount: { type: 'percentage' | 'amount'; value: number }
  ): Promise<Quote> {
    if (discount.type === 'percentage') {
      await this.pool.query(
        `UPDATE quote_line_items
         SET discount_percentage = $2,
             discount_amount = 0
         WHERE quote_id = $1`,
        [quoteId, discount.value]
      );
    } else {
      // Distribute fixed amount across line items proportionally
      const itemsResult = await this.pool.query(
        `SELECT line_item_id, quantity * unit_price as line_total
         FROM quote_line_items
         WHERE quote_id = $1`,
        [quoteId]
      );

      const totalValue = itemsResult.rows.reduce(
        (sum, item) => sum + parseFloat(item.line_total), 0
      );

      for (const item of itemsResult.rows) {
        const proportion = parseFloat(item.line_total) / totalValue;
        const itemDiscount = discount.value * proportion;

        await this.pool.query(
          `UPDATE quote_line_items
           SET discount_amount = $2,
               discount_percentage = 0
           WHERE line_item_id = $1`,
          [item.line_item_id, itemDiscount]
        );
      }
    }

    await this.calculateAndUpdateTotals(quoteId);
    return await this.quoteRepository.findById(quoteId);
  }

  /**
   * Duplicate/Clone quote
   */
  async duplicateQuote(
    sourceQuoteId: number,
    options: QuoteCloneOptions = {}
  ): Promise<Quote> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get source quote
      const sourceResult = await client.query(
        `SELECT * FROM quotes WHERE quote_id = $1`,
        [sourceQuoteId]
      );

      if (sourceResult.rows.length === 0) {
        throw new Error('Source quote not found');
      }

      const source = sourceResult.rows[0];

      // Create new quote
      const newQuoteNumber = await this.generateQuoteNumber(source.company_id, client);

      const newQuoteResult = await client.query(
        `INSERT INTO quotes (
          company_id, quote_number, opportunity_id, account_id, contact_id,
          quote_name, quote_type, description, currency_code,
          payment_terms, delivery_terms, valid_from, valid_until,
          status, version_number, parent_quote_id, is_primary,
          billing_address, shipping_address, custom_fields
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
        [
          source.company_id,
          newQuoteNumber,
          options.new_opportunity_id || source.opportunity_id,
          options.new_account_id || source.account_id,
          source.contact_id,
          `${source.quote_name} (Copy)`,
          source.quote_type,
          source.description,
          source.currency_code,
          source.payment_terms,
          source.delivery_terms,
          options.update_dates ? new Date() : source.valid_from,
          options.update_dates ? this.addDays(new Date(), 30) : source.valid_until,
          'draft',
          source.version_number + 1,
          sourceQuoteId,
          true,
          source.billing_address,
          source.shipping_address,
          source.custom_fields
        ]
      );

      const newQuote = newQuoteResult.rows[0];

      // Clone sections if requested
      if (options.include_sections !== false) {
        const sectionsResult = await client.query(
          `SELECT * FROM quote_sections WHERE quote_id = $1`,
          [sourceQuoteId]
        );

        for (const section of sectionsResult.rows) {
          await client.query(
            `INSERT INTO quote_sections (
              quote_id, section_name, section_type, description,
              parent_section_id, sort_order, is_visible, is_optional,
              is_selected, custom_fields
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              newQuote.quote_id,
              section.section_name,
              section.section_type,
              section.description,
              section.parent_section_id,
              section.sort_order,
              section.is_visible,
              section.is_optional,
              section.is_selected,
              section.custom_fields
            ]
          );
        }
      }

      // Clone line items if requested
      if (options.include_line_items !== false) {
        const itemsResult = await client.query(
          `SELECT * FROM quote_line_items WHERE quote_id = $1`,
          [sourceQuoteId]
        );

        for (const item of itemsResult.rows) {
          await client.query(
            `INSERT INTO quote_line_items (
              quote_id, section_id, product_id, variation_id, bundle_id,
              line_number, sku, name, description,
              quantity, unit_of_measure, list_price, unit_price,
              discount_percentage, discount_amount,
              unit_cost, is_optional, is_selected,
              requires_configuration, configuration,
              notes, sort_order, custom_fields
            )
            SELECT
              $1, section_id, product_id, variation_id, bundle_id,
              line_number, sku, name, description,
              quantity, unit_of_measure, list_price, unit_price,
              discount_percentage, discount_amount,
              unit_cost, is_optional, is_selected,
              requires_configuration, configuration,
              notes, sort_order, custom_fields
            FROM quote_line_items
            WHERE line_item_id = $2`,
            [newQuote.quote_id, item.line_item_id]
          );
        }
      }

      // Clone attachments if requested
      if (options.include_attachments) {
        await client.query(
          `INSERT INTO quote_attachments (
            quote_id, file_name, file_type, file_size, file_url,
            attachment_type, title, description,
            is_customer_visible, is_internal, is_active
          )
          SELECT
            $1, file_name, file_type, file_size, file_url,
            attachment_type, title, description,
            is_customer_visible, is_internal, is_active
          FROM quote_attachments
          WHERE quote_id = $2`,
          [newQuote.quote_id, sourceQuoteId]
        );
      }

      // Calculate totals for new quote
      await this.calculateAndUpdateTotals(newQuote.quote_id, client);

      await client.query('COMMIT');
      return newQuote;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error duplicating quote:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate unique quote number
   */
  async generateQuoteNumber(companyId: number, client?: PoolClient): Promise<string> {
    const queryClient = client || this.pool;

    const result = await queryClient.query(
      `SELECT COUNT(*) + 1 as next_number
       FROM quotes
       WHERE company_id = $1
       AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [companyId]
    );

    const year = new Date().getFullYear();
    const number = String(result.rows[0].next_number).padStart(5, '0');

    return `Q-${year}-${number}`;
  }

  /**
   * Validate quote request
   */
  async validateQuoteRequest(request: QuoteCreateRequest): Promise<QuoteValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let requiresApproval = false;
    const approvalReasons: string[] = [];

    // Required fields validation
    if (!request.account_id) {
      errors.push('Account is required');
    }

    if (!request.quote_name) {
      errors.push('Quote name is required');
    }

    // Validate line items
    if (request.line_items && request.line_items.length > 0) {
      for (let i = 0; i < request.line_items.length; i++) {
        const item = request.line_items[i];

        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Line item ${i + 1}: Invalid quantity`);
        }

        if (!item.product_id && !item.name) {
          errors.push(`Line item ${i + 1}: Product or name is required`);
        }

        // Check discount limits
        if (item.discount_percentage && item.discount_percentage > 50) {
          requiresApproval = true;
          approvalReasons.push(`Line item ${i + 1} has discount > 50%`);
        }
      }
    } else {
      warnings.push('Quote has no line items');
    }

    // Check total value for approval
    if (request.line_items) {
      const estimatedTotal = request.line_items.reduce((sum, item) => {
        const lineTotal = item.quantity * (item.unit_price || 0);
        return sum + lineTotal;
      }, 0);

      if (estimatedTotal > 100000) {
        requiresApproval = true;
        approvalReasons.push('Quote value exceeds $100,000');
      }
    }

    // Validate dates
    if (request.valid_until && new Date(request.valid_until) < new Date()) {
      errors.push('Valid until date cannot be in the past');
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      requires_approval: requiresApproval,
      approval_reasons: approvalReasons
    };
  }

  /**
   * Get quote version history
   */
  async getQuoteVersionHistory(quoteId: number): Promise<QuoteVersion[]> {
    const result = await this.pool.query(
      `SELECT
        quote_id,
        version_number,
        total_amount,
        status,
        created_at,
        created_by
       FROM quotes
       WHERE quote_id = $1 OR parent_quote_id = $1
       ORDER BY version_number DESC`,
      [quoteId]
    );

    return result.rows.map(row => ({
      version_number: row.version_number,
      quote_id: row.quote_id,
      created_at: row.created_at,
      created_by: row.created_by,
      total_amount: new Decimal(row.total_amount),
      status: row.status
    }));
  }

  /**
   * Compare multiple quotes
   */
  async compareQuotes(quoteIds: number[]): Promise<QuoteComparisonResult> {
    const quotes = await Promise.all(
      quoteIds.map(id => this.quoteRepository.findById(id))
    );

    const comparison: QuoteComparisonResult = {
      quotes: quotes.map(q => ({
        quote_id: q.quote_id!,
        quote_number: q.quote_number,
        total_amount: new Decimal(q.total_amount),
        discount_percentage: (q.discount_amount / q.subtotal) * 100,
        margin_percentage: 0, // Calculate based on cost
        status: q.status
      })),
      differences: []
    };

    // Find differences in key fields
    const fields = ['payment_terms', 'delivery_terms', 'currency_code'];
    for (const field of fields) {
      const values = quotes.map(q => q[field]);
      if (new Set(values).size > 1) {
        comparison.differences.push({ field, values });
      }
    }

    // Recommend best quote based on criteria
    const bestQuote = comparison.quotes.reduce((best, current) => {
      if (current.total_amount.lt(best.total_amount)) {
        return current;
      }
      return best;
    });

    comparison.recommendation = {
      recommended_quote_id: bestQuote.quote_id,
      reasons: ['Lowest total cost', 'Best value for customer']
    };

    return comparison;
  }

  /**
   * Submit quote for approval
   */
  async submitForApproval(
    quoteId: number,
    companyId: number,
    submitterId: number
  ): Promise<void> {
    const approval = await this.approvalRepository.requiresApproval(
      'quote',
      companyId,
      { quote_id: quoteId }
    );

    if (approval.required && approval.workflow) {
      await this.initiateApprovalProcess(
        quoteId,
        companyId,
        submitterId
      );
    }
  }

  /**
   * Initiate approval process
   */
  private async initiateApprovalProcess(
    quoteId: number,
    companyId: number,
    submitterId: number,
    client?: PoolClient
  ): Promise<void> {
    const quote = await this.quoteRepository.findById(quoteId);

    const workflow = await this.approvalRepository.getWorkflow({
      company_id: companyId,
      entity_type: 'quote',
      is_active: true,
      is_default: true
    });

    if (workflow) {
      await this.approvalRepository.initiateApprovalProcess(
        {
          workflow_id: workflow.workflow_id!,
          company_id: companyId,
          entity_type: 'quote',
          entity_id: quoteId,
          entity_reference: quote.quote_number,
          title: `Quote Approval: ${quote.quote_name}`,
          description: `Approval required for quote ${quote.quote_number}`,
          requested_by: submitterId,
          request_comments: 'Quote submitted for approval',
          priority: quote.total_amount > 100000 ? 'high' : 'normal',
          context_data: {
            quote_amount: quote.total_amount,
            discount_percentage: (quote.discount_amount / quote.subtotal) * 100,
            account_id: quote.account_id
          }
        },
        client
      );

      // Update quote status
      await this.pool.query(
        `UPDATE quotes SET approval_status = 'pending' WHERE quote_id = $1`,
        [quoteId]
      );
    }
  }

  /**
   * Create quote section
   */
  private async createQuoteSection(
    quoteId: number,
    section: QuoteSectionRequest,
    client: PoolClient
  ): Promise<void> {
    const sectionResult = await client.query(
      `INSERT INTO quote_sections (
        quote_id, section_name, section_type, description,
        sort_order, is_visible, is_optional, is_selected
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING section_id`,
      [
        quoteId,
        section.section_name,
        section.section_type || 'standard',
        section.description,
        section.sort_order || 0,
        section.is_visible !== false,
        section.section_type === 'optional',
        section.section_type !== 'optional'
      ]
    );

    const sectionId = sectionResult.rows[0].section_id;

    // Add line items to section
    if (section.line_items && section.line_items.length > 0) {
      for (const item of section.line_items) {
        await this.addLineItem(
          quoteId,
          { ...item, section_id: sectionId },
          client
        );
      }
    }
  }

  /**
   * Get quote by ID with full details
   */
  async getQuoteById(quoteId: number, companyId: number): Promise<Quote> {
    const quote = await this.quoteRepository.findById(quoteId);

    if (!quote || quote.company_id !== companyId) {
      throw new Error('Quote not found');
    }

    // Load related data
    const [lineItems, sections, attachments] = await Promise.all([
      this.getQuoteLineItems(quoteId),
      this.getQuoteSections(quoteId),
      this.getQuoteAttachments(quoteId)
    ]);

    return {
      ...quote,
      line_items: lineItems,
      sections,
      attachments
    };
  }

  /**
   * Get quote line items
   */
  private async getQuoteLineItems(quoteId: number): Promise<QuoteLineItem[]> {
    const result = await this.pool.query(
      `SELECT * FROM quote_line_items
       WHERE quote_id = $1
       ORDER BY sort_order, line_number`,
      [quoteId]
    );

    return result.rows;
  }

  /**
   * Get quote sections
   */
  private async getQuoteSections(quoteId: number): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT * FROM quote_sections
       WHERE quote_id = $1
       ORDER BY sort_order`,
      [quoteId]
    );

    return result.rows;
  }

  /**
   * Get quote attachments
   */
  private async getQuoteAttachments(quoteId: number): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT * FROM quote_attachments
       WHERE quote_id = $1 AND is_active = true`,
      [quoteId]
    );

    return result.rows;
  }

  /**
   * Helper: Add days to date
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Generate quote document
   */
  async generateQuoteDocument(
    quoteId: number,
    templateId?: number,
    format: 'pdf' | 'html' = 'pdf'
  ): Promise<{ document_id: number; file_url: string }> {
    const quote = await this.getQuoteById(quoteId, 0); // Get full quote details

    // Get template
    const template = templateId
      ? await this.documentTemplateRepository.getTemplateById(templateId, quote.company_id)
      : await this.documentTemplateRepository.getDefaultTemplate('quote', quote.company_id);

    if (!template) {
      throw new Error('No template found for quote generation');
    }

    // Generate document
    const document = await this.documentTemplateRepository.generateDocument({
      company_id: quote.company_id,
      template_id: template.template_id,
      document_name: `Quote_${quote.quote_number}`,
      document_type: 'quote',
      entity_type: 'quote',
      entity_id: quoteId,
      format: format as any,
      created_by: quote.created_by
    });

    return {
      document_id: document.document_id!,
      file_url: document.file_url || ''
    };
  }
}