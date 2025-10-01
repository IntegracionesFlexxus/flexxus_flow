/**
 * Pricing Repository Interface
 * Sprint 20 - Product & Quote Module
 */

export interface IPricingRepository {
  /**
   * Get promotion by code
   */
  getPromotionByCode(code: string): Promise<any>;
}
