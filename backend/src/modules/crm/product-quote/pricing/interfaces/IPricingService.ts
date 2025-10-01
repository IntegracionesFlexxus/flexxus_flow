/**
 * Pricing Service Interface
 * Sprint 20 - Product & Quote Module
 */

export interface IPricingService {
  /**
   * Calculate item price with discounts and promotions
   */
  calculateItemPrice(
    productId: number,
    quantity: number,
    customerId?: number,
    options?: any
  ): Promise<any>;

  /**
   * Get best available price for a customer
   */
  getBestPrice(
    productId: number,
    customerId: number,
    quantity: number
  ): Promise<number>;

  /**
   * Apply promotion to a quote
   */
  applyPromotion(
    quoteId: number,
    promotionCode: string
  ): Promise<any>;

  /**
   * Validate pricing for a quote
   */
  validatePricing(quoteId: number): Promise<boolean>;
}
