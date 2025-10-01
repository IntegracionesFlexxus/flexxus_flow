/**
 * Quote Service Interface
 * Sprint 20 - Product & Quote Module
 */

export interface IQuoteService {
  /**
   * Create a new quote
   */
  create(data: any): Promise<any>;

  /**
   * Update an existing quote
   */
  update(id: number, data: any): Promise<any>;

  /**
   * Delete a quote
   */
  delete(id: number): Promise<boolean>;

  /**
   * Find quote by ID
   */
  findById(id: number): Promise<any | null>;

  /**
   * Find quote by number
   */
  findByNumber(quoteNumber: string): Promise<any | null>;

  /**
   * Find all quotes with filters
   */
  findAll(filters?: any): Promise<any>;

  /**
   * Add item to quote
   */
  addItem(quoteId: number, item: any): Promise<any>;

  /**
   * Remove item from quote
   */
  removeItem(quoteId: number, itemId: number): Promise<any>;

  /**
   * Update quote status
   */
  updateStatus(id: number, status: string): Promise<any>;

  /**
   * Convert quote to order
   */
  convertToOrder(id: number): Promise<any>;

  /**
   * Duplicate an existing quote
   */
  duplicate(id: number): Promise<any>;
}
