/**
 * Promotion Service Interface
 * Sprint 20 - Product & Quote Module
 */

export interface IPromotionService {
  /**
   * Create a new promotion
   */
  createPromotion(data: any): Promise<any>;

  /**
   * Update an existing promotion
   */
  updatePromotion(id: number, data: any): Promise<any>;

  /**
   * Delete a promotion
   */
  deletePromotion(id: number): Promise<boolean>;

  /**
   * Get promotion by ID
   */
  getPromotionById(id: number): Promise<any>;

  /**
   * Get promotion by code
   */
  getPromotionByCode(code: string): Promise<any>;

  /**
   * Get active promotions with optional filters
   */
  getActivePromotions(filters?: any): Promise<any[]>;

  /**
   * Validate a promotion code against context
   */
  validatePromotion(code: string, context: any): Promise<any>;

  /**
   * Apply promotion to a quote
   */
  applyPromotionToQuote(quoteId: number, promotionCode: string): Promise<any>;

  /**
   * Get promotion usage statistics
   */
  getPromotionUsage(promotionId: number): Promise<any>;
}
