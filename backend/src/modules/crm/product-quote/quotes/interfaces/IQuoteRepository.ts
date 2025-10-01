/**
 * Quote Repository Interface
 * Sprint 20 - Product & Quote Module
 */

import {
  IQuote,
  CreateQuoteDto,
  UpdateQuoteDto,
  QuoteSearchCriteria,
  QuoteTotals
} from '../../shared/interfaces/quote.interfaces';

export interface IQuoteRepository {
  /**
   * Create a new quote
   */
  create(companyId: number, data: CreateQuoteDto): Promise<IQuote>;

  /**
   * Find quote by ID
   */
  findById(companyId: number, quoteId: number): Promise<IQuote | null>;

  /**
   * Find quote by number
   */
  findByNumber(companyId: number, quoteNumber: string): Promise<IQuote | null>;

  /**
   * Search quotes with criteria
   */
  search(companyId: number, criteria: QuoteSearchCriteria): Promise<IQuote[]>;

  /**
   * Update quote
   */
  update(companyId: number, quoteId: number, data: UpdateQuoteDto): Promise<IQuote>;

  /**
   * Update quote status
   */
  updateStatus(companyId: number, quoteId: number, status: string, additionalFields?: Record<string, any>): Promise<IQuote>;

  /**
   * Calculate quote totals
   */
  calculateTotals(quoteId: number): Promise<QuoteTotals>;

  /**
   * Delete quote
   */
  delete(companyId: number, quoteId: number): Promise<boolean>;

  /**
   * Clone a quote
   */
  clone(companyId: number, quoteId: number): Promise<IQuote>;

  /**
   * Get quote statistics
   */
  getStatistics(companyId: number, dateRange?: { start: Date; end: Date }): Promise<any>;

  /**
   * Get last quote number for a period
   */
  getLastQuoteNumber(year: number, month: number): Promise<string | null>;
}
