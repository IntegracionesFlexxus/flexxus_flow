/**
 * Quote Management Service - Sprint 19
 * High-level service orchestrating quote operations
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
import { QuoteRepository, Quote, QuoteLineItem } from '../repositories/QuoteRepository';
import { QuoteBuilderService, QuoteCreateRequest } from './QuoteBuilderService';
import { DynamicPricingEngine } from './DynamicPricingEngine';
import { ApprovalWorkflowService } from './ApprovalWorkflowService';
import { DocumentGenerationService } from './DocumentGenerationService';
import Decimal from 'decimal.js';

export interface QuoteFilter {
  company_id: number;
  account_id?: number;
  opportunity_id?: number;
  status?: string[];
  owner_id?: number;
  date_from?: Date;
  date_to?: Date;
  search?: string;
  min_amount?: number;
  max_amount?: number;
  currency_code?: string;
  is_expired?: boolean;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface QuoteUpdateRequest {
  quote_name?: string;
  description?: string;
  valid_until?: Date;
  currency_code?: string;
  payment_terms?: string;
  delivery_terms?: string;
  shipping_cost?: number;
  discount_amount?: number;
  notes?: string;
  custom_fields?: any;
}

export interface QuoteStatusTransition {
  from_status: string;
  to_status: string;
  comment?: string;
  notify_stakeholders?: boolean;
}

export interface QuoteMetrics {
  total_quotes: number;
  total_value: number;
  conversion_rate: number;
  average_quote_value: number;
  quotes_by_status: { status: string; count: number; value: number }[];
  top_products: { product_name: string; quantity: number; value: number }[];
  monthly_trends: { month: string; count: number; value: number }[];
}

export interface QuoteComparisonResult {
  base_quote: Quote;
  comparison_quotes: Quote[];
  differences: {
    line_items: any[];
    pricing: any[];
    terms: any[];
  };
}

@injectable()
export class QuoteManagementService {
  constructor(
    @inject(TYPES.CrmConnection) private pool: Pool,
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.QuoteRepository) private quoteRepository: QuoteRepository,
    @inject(TYPES.QuoteBuilderService) private quoteBuilder: QuoteBuilderService,
    @inject(TYPES.DynamicPricingEngine) private pricingEngine: DynamicPricingEngine,
    @inject(TYPES.ApprovalWorkflowService) private approvalService: ApprovalWorkflowService,
    @inject(TYPES.DocumentGenerationService) private documentService: DocumentGenerationService
  ) {}

  /**
   * Create quote with full business logic
   */
  async createQuote(request: QuoteCreateRequest): Promise<Quote> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Create quote using builder
      const quote = await this.quoteBuilder.createQuote(request);

      // Log creation in audit trail
      await this.logQuoteActivity(quote.quote_id!, 'created', {
        created_by: request.created_by,
        initial_status: quote.status,
        line_items_count: request.line_items?.length || 0
      });

      // Check if approval is required
      const requiresApproval = await this.checkApprovalRequired(quote);
      if (requiresApproval) {
        await this.approvalService.submitForApproval(
          quote.company_id,
          'quote',
          quote.quote_id!,
          request.created_by!,
          {
            total_amount: quote.total_amount,
            discount_percentage: quote.discount_amount / quote.subtotal * 100
          }
        );
      }

      await client.query('COMMIT');

      this.logger.info('Quote created successfully', {
        quote_id: quote.quote_id,
        quote_number: quote.quote_number,
        requires_approval: requiresApproval
      });

      return quote;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating quote', { error, request });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update quote with validation
   */
  async updateQuote(quote_id: number, updates: QuoteUpdateRequest, updated_by?: number): Promise<Quote> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get current quote
      const currentQuote = await this.quoteRepository.findById(quote_id);
      if (!currentQuote) {
        throw new Error(`Quote ${quote_id} not found`);
      }

      // Validate status for updates
      if (currentQuote.status === 'accepted' || currentQuote.status === 'expired') {
        throw new Error(`Cannot update quote in ${currentQuote.status} status`);
      }

      // Update quote
      const updatedQuote = await this.quoteRepository.update(quote_id, {
        ...updates,
        updated_by
      });

      // Log update
      await this.logQuoteActivity(quote_id, 'updated', {
        updated_by,
        changes: this.getChangedFields(currentQuote, updates)
      });

      await client.query('COMMIT');

      this.logger.info('Quote updated', { quote_id, updated_by });
      return updatedQuote;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating quote', { error, quote_id, updates });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Change quote status with business rules
   */
  async changeStatus(
    quote_id: number,
    transition: QuoteStatusTransition,
    changed_by?: number
  ): Promise<Quote> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get current quote
      const quote = await this.quoteRepository.findById(quote_id);
      if (!quote) {
        throw new Error(`Quote ${quote_id} not found`);
      }

      // Validate transition
      if (!this.isValidStatusTransition(transition.from_status, transition.to_status)) {
        throw new Error(`Invalid status transition from ${transition.from_status} to ${transition.to_status}`);
      }

      if (quote.status !== transition.from_status) {
        throw new Error(`Quote status is ${quote.status}, expected ${transition.from_status}`);
      }

      // Apply business rules for specific transitions
      await this.applyStatusTransitionRules(quote, transition);

      // Update status
      const updatedQuote = await this.quoteRepository.update(quote_id, {
        status: transition.to_status,
        updated_by: changed_by
      });

      // Log status change
      await this.logQuoteActivity(quote_id, 'status_changed', {
        changed_by,
        from_status: transition.from_status,
        to_status: transition.to_status,
        comment: transition.comment
      });

      // Send notifications if requested
      if (transition.notify_stakeholders) {
        await this.notifyStatusChange(quote, transition);
      }

      await client.query('COMMIT');

      this.logger.info('Quote status changed', {
        quote_id,
        from_status: transition.from_status,
        to_status: transition.to_status
      });

      return updatedQuote;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error changing quote status', { error, quote_id, transition });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Search quotes with advanced filtering
   */
  async searchQuotes(filter: QuoteFilter): Promise<{ data: Quote[]; total: number }> {
    try {
      const result = await this.quoteRepository.search(filter);

      // Enrich with additional data if needed
      for (const quote of result.data) {
        // Add computed fields
        quote.is_expired = new Date(quote.valid_until) < new Date();
        quote.days_until_expiry = this.calculateDaysUntilExpiry(quote.valid_until);
      }

      return result;

    } catch (error) {
      this.logger.error('Error searching quotes', { error, filter });
      throw error;
    }
  }

  /**
   * Generate quote document
   */
  async generateDocument(
    quote_id: number,
    template_id?: number,
    format: 'pdf' | 'html' = 'pdf',
    generated_by?: number
  ): Promise<any> {
    try {
      const quote = await this.quoteRepository.findById(quote_id);
      if (!quote) {
        throw new Error(`Quote ${quote_id} not found`);
      }

      const document = await this.documentService.generateDocument({
        company_id: quote.company_id,
        template_id,
        entity_type: 'quote',
        entity_id: quote_id,
        document_name: `${quote.quote_number}_${format}`,
        options: { format },
        generated_by
      });

      // Log document generation
      await this.logQuoteActivity(quote_id, 'document_generated', {
        generated_by,
        document_id: document.document_id,
        format
      });

      return document;

    } catch (error) {
      this.logger.error('Error generating quote document', { error, quote_id });
      throw error;
    }
  }

  /**
   * Clone quote with modifications
   */
  async cloneQuote(
    quote_id: number,
    modifications?: {
      quote_name?: string;
      account_id?: number;
      remove_expired_pricing?: boolean;
      update_prices?: boolean;
    }
  ): Promise<Quote> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Clone base quote
      const clonedQuote = await this.quoteBuilder.cloneQuote(
        quote_id,
        modifications?.quote_name
      );

      // Apply modifications
      if (modifications?.account_id && modifications.account_id !== clonedQuote.account_id) {
        await this.quoteRepository.update(clonedQuote.quote_id!, {
          account_id: modifications.account_id
        });
      }

      // Update prices if requested
      if (modifications?.update_prices) {
        await this.refreshQuotePricing(clonedQuote.quote_id!);
      }

      await client.query('COMMIT');

      this.logger.info('Quote cloned', {
        original_quote_id: quote_id,
        new_quote_id: clonedQuote.quote_id
      });

      return clonedQuote;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error cloning quote', { error, quote_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Refresh quote pricing
   */
  async refreshQuotePricing(quote_id: number): Promise<Quote> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const quote = await this.quoteRepository.findById(quote_id);
      if (!quote) {
        throw new Error(`Quote ${quote_id} not found`);
      }

      // Get line items
      const lineItems = await this.quoteRepository.getLineItems(quote_id);

      // Recalculate each line item
      for (const item of lineItems) {
        const priceResult = await this.pricingEngine.calculatePrice({
          company_id: quote.company_id,
          product_id: item.product_id,
          quantity: item.quantity,
          account_id: quote.account_id,
          apply_promotions: true
        });

        // Update line item pricing
        await this.quoteRepository.updateLineItem(item.line_item_id!, {
          unit_price: priceResult.final_price.toNumber(),
          discount_amount: priceResult.discount_amount.toNumber(),
          line_total: priceResult.final_price.mul(item.quantity).toNumber()
        });
      }

      // Recalculate quote totals
      await this.recalculateQuoteTotals(quote_id);

      // Get updated quote
      const updatedQuote = await this.quoteRepository.findById(quote_id);

      await client.query('COMMIT');

      this.logger.info('Quote pricing refreshed', { quote_id });
      return updatedQuote!;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error refreshing quote pricing', { error, quote_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get quote metrics and analytics
   */
  async getQuoteMetrics(
    company_id: number,
    date_from?: Date,
    date_to?: Date
  ): Promise<QuoteMetrics> {
    const client = await this.pool.connect();

    try {
      const dateFilter = date_from && date_to
        ? `AND q.created_at BETWEEN $2 AND $3`
        : '';

      const params = [company_id];
      if (date_from && date_to) {
        params.push(date_from.toISOString(), date_to.toISOString());
      }

      // Total quotes and value
      const totalQuery = `
        SELECT
          COUNT(*) as total_quotes,
          COALESCE(SUM(total_amount), 0) as total_value,
          COALESCE(AVG(total_amount), 0) as average_quote_value
        FROM quotes q
        WHERE q.company_id = $1 ${dateFilter}
      `;

      const totalResult = await client.query(totalQuery, params);
      const totals = totalResult.rows[0];

      // Conversion rate (accepted / total)
      const conversionQuery = `
        SELECT
          COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_count,
          COUNT(*) as total_count
        FROM quotes q
        WHERE q.company_id = $1 ${dateFilter}
      `;

      const conversionResult = await client.query(conversionQuery, params);
      const conversion = conversionResult.rows[0];
      const conversionRate = conversion.total_count > 0
        ? (conversion.accepted_count / conversion.total_count) * 100
        : 0;

      // Quotes by status
      const statusQuery = `
        SELECT
          status,
          COUNT(*) as count,
          COALESCE(SUM(total_amount), 0) as value
        FROM quotes q
        WHERE q.company_id = $1 ${dateFilter}
        GROUP BY status
        ORDER BY count DESC
      `;

      const statusResult = await client.query(statusQuery, params);

      // Top products
      const productsQuery = `
        SELECT
          qli.product_name,
          SUM(qli.quantity) as quantity,
          SUM(qli.line_total) as value
        FROM quote_line_items qli
        JOIN quotes q ON qli.quote_id = q.quote_id
        WHERE q.company_id = $1 ${dateFilter}
        GROUP BY qli.product_name
        ORDER BY value DESC
        LIMIT 10
      `;

      const productsResult = await client.query(productsQuery, params);

      // Monthly trends (last 12 months)
      const trendsQuery = `
        SELECT
          TO_CHAR(q.created_at, 'YYYY-MM') as month,
          COUNT(*) as count,
          COALESCE(SUM(q.total_amount), 0) as value
        FROM quotes q
        WHERE q.company_id = $1
          AND q.created_at >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR(q.created_at, 'YYYY-MM')
        ORDER BY month
      `;

      const trendsResult = await client.query(trendsQuery, [company_id]);

      return {
        total_quotes: parseInt(totals.total_quotes),
        total_value: parseFloat(totals.total_value),
        average_quote_value: parseFloat(totals.average_quote_value),
        conversion_rate: conversionRate,
        quotes_by_status: statusResult.rows.map(row => ({
          status: row.status,
          count: parseInt(row.count),
          value: parseFloat(row.value)
        })),
        top_products: productsResult.rows.map(row => ({
          product_name: row.product_name,
          quantity: parseInt(row.quantity),
          value: parseFloat(row.value)
        })),
        monthly_trends: trendsResult.rows.map(row => ({
          month: row.month,
          count: parseInt(row.count),
          value: parseFloat(row.value)
        }))
      };

    } catch (error) {
      this.logger.error('Error getting quote metrics', { error, company_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Compare multiple quotes
   */
  async compareQuotes(quote_ids: number[]): Promise<QuoteComparisonResult> {
    try {
      if (quote_ids.length < 2) {
        throw new Error('At least 2 quotes are required for comparison');
      }

      const quotes = await Promise.all(
        quote_ids.map(id => this.quoteRepository.findById(id))
      );

      const validQuotes = quotes.filter(q => q !== null) as Quote[];

      if (validQuotes.length !== quote_ids.length) {
        throw new Error('One or more quotes not found');
      }

      const baseQuote = validQuotes[0];
      const comparisonQuotes = validQuotes.slice(1);

      // Compare line items
      const lineItemDifferences = await this.compareLineItems(baseQuote, comparisonQuotes);

      // Compare pricing
      const pricingDifferences = this.comparePricing(baseQuote, comparisonQuotes);

      // Compare terms
      const termsDifferences = this.compareTerms(baseQuote, comparisonQuotes);

      return {
        base_quote: baseQuote,
        comparison_quotes: comparisonQuotes,
        differences: {
          line_items: lineItemDifferences,
          pricing: pricingDifferences,
          terms: termsDifferences
        }
      };

    } catch (error) {
      this.logger.error('Error comparing quotes', { error, quote_ids });
      throw error;
    }
  }

  /**
   * Mark expired quotes
   */
  async markExpiredQuotes(): Promise<number> {
    const client = await this.pool.connect();
    let updatedCount = 0;

    try {
      const query = `
        UPDATE quotes
        SET status = 'expired', updated_at = NOW()
        WHERE status IN ('draft', 'sent', 'viewed')
          AND valid_until < NOW()
        RETURNING quote_id
      `;

      const result = await client.query(query);
      updatedCount = result.rows.length;

      // Log expired quotes
      for (const row of result.rows) {
        await this.logQuoteActivity(row.quote_id, 'expired', {
          expired_at: new Date(),
          auto_expired: true
        });
      }

      this.logger.info('Expired quotes marked', { count: updatedCount });
      return updatedCount;

    } catch (error) {
      this.logger.error('Error marking expired quotes', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Private helper methods
   */

  private async checkApprovalRequired(quote: Quote): Promise<boolean> {
    // Check if quote requires approval based on amount, discount, etc.
    const highValueThreshold = 50000; // Configurable
    const highDiscountThreshold = 15; // Configurable

    if (quote.total_amount > highValueThreshold) {
      return true;
    }

    const discountPercentage = (quote.discount_amount / quote.subtotal) * 100;
    if (discountPercentage > highDiscountThreshold) {
      return true;
    }

    return false;
  }

  private isValidStatusTransition(from: string, to: string): boolean {
    const validTransitions: Record<string, string[]> = {
      'draft': ['sent', 'cancelled'],
      'sent': ['viewed', 'accepted', 'rejected', 'cancelled'],
      'viewed': ['accepted', 'rejected', 'cancelled'],
      'accepted': ['cancelled'],
      'rejected': ['draft'],
      'expired': ['draft'],
      'cancelled': []
    };

    return validTransitions[from]?.includes(to) || false;
  }

  private async applyStatusTransitionRules(quote: Quote, transition: QuoteStatusTransition): Promise<void> {
    // Apply specific business rules for status transitions
    switch (transition.to_status) {
      case 'accepted':
        // Create opportunity or update existing one
        await this.createOrUpdateOpportunity(quote);
        break;
      case 'expired':
        // Log expiration
        break;
    }
  }

  private async createOrUpdateOpportunity(quote: Quote): Promise<void> {
    // TODO: Implement opportunity creation/update logic
    this.logger.info('Creating/updating opportunity for accepted quote', { quote_id: quote.quote_id });
  }

  private async notifyStatusChange(quote: Quote, transition: QuoteStatusTransition): Promise<void> {
    // TODO: Implement notification logic
    this.logger.info('Sending status change notifications', {
      quote_id: quote.quote_id,
      transition: transition.to_status
    });
  }

  private getChangedFields(original: Quote, updates: QuoteUpdateRequest): string[] {
    const changes: string[] = [];

    Object.keys(updates).forEach(key => {
      const originalValue = (original as any)[key];
      const newValue = (updates as any)[key];

      if (originalValue !== newValue) {
        changes.push(key);
      }
    });

    return changes;
  }

  private calculateDaysUntilExpiry(validUntil: Date): number {
    const now = new Date();
    const expiry = new Date(validUntil);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private async recalculateQuoteTotals(quote_id: number): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `SELECT calculate_quote_totals($1)`;
      await client.query(query, [quote_id]);
    } finally {
      client.release();
    }
  }

  private async compareLineItems(baseQuote: Quote, comparisonQuotes: Quote[]): Promise<any[]> {
    // TODO: Implement line item comparison logic
    return [];
  }

  private comparePricing(baseQuote: Quote, comparisonQuotes: Quote[]): any[] {
    return comparisonQuotes.map(quote => ({
      quote_id: quote.quote_id,
      subtotal_diff: quote.subtotal - baseQuote.subtotal,
      total_diff: quote.total_amount - baseQuote.total_amount,
      discount_diff: quote.discount_amount - baseQuote.discount_amount
    }));
  }

  private compareTerms(baseQuote: Quote, comparisonQuotes: Quote[]): any[] {
    return comparisonQuotes.map(quote => ({
      quote_id: quote.quote_id,
      payment_terms_diff: quote.payment_terms !== baseQuote.payment_terms,
      delivery_terms_diff: quote.delivery_terms !== baseQuote.delivery_terms,
      valid_until_diff: quote.valid_until !== baseQuote.valid_until
    }));
  }

  private async logQuoteActivity(quote_id: number, activity: string, data: any): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO quote_audit_log (
          quote_id, activity_type, activity_data, created_at
        ) VALUES ($1, $2, $3, NOW())
      `;

      await client.query(query, [quote_id, activity, JSON.stringify(data)]);
    } catch (error) {
      this.logger.error('Error logging quote activity', { error, quote_id, activity });
    } finally {
      client.release();
    }
  }
}