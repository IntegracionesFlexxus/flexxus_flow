// Discount Calculation Engine - Sprint 19 Phase 3
// Specialized calculator for discount logic and validation

import {
  DiscountCode,
  DiscountInfo,
  PriceCalculationParams
} from '../../../shared/types/pricing.types';

interface DiscountValidationResult {
  valid: boolean;
  discount?: DiscountCode;
  error?: string;
  applicableAmount?: number;
  finalDiscount?: number;
}

interface DiscountContext {
  orderAmount: number;
  customerId?: number;
  productIds: number[];
  categoryIds: number[];
  quantity: number;
  currentDate: Date;
  existingDiscounts: DiscountInfo[];
}

interface BulkDiscountRule {
  minQuantity: number;
  maxQuantity?: number;
  discountPercentage: number;
  description: string;
}

interface TieredDiscountRule {
  threshold: number;
  discountPercentage: number;
  maxDiscount?: number;
  description: string;
}

export class DiscountCalculator {
  private readonly DEFAULT_CURRENCY = 'USD';
  private readonly MAX_DISCOUNT_PERCENTAGE = 100;

  /**
   * Calculate percentage-based discount
   */
  calculatePercentageDiscount(baseAmount: number, percentage: number): number {
    if (baseAmount <= 0 || percentage <= 0) {
      return 0;
    }

    if (percentage > this.MAX_DISCOUNT_PERCENTAGE) {
      percentage = this.MAX_DISCOUNT_PERCENTAGE;
    }

    return (baseAmount * percentage) / 100;
  }

  /**
   * Calculate fixed amount discount
   */
  calculateFixedDiscount(baseAmount: number, discountAmount: number): number {
    if (baseAmount <= 0 || discountAmount <= 0) {
      return 0;
    }

    // Cannot discount more than the base amount
    return Math.min(discountAmount, baseAmount);
  }

  /**
   * Calculate tiered discount based on order amount
   */
  calculateTieredDiscount(
    orderAmount: number,
    tiers: TieredDiscountRule[]
  ): { discount: number; appliedTier?: TieredDiscountRule } {
    if (orderAmount <= 0 || !tiers.length) {
      return { discount: 0 };
    }

    // Sort tiers by threshold (highest first)
    const sortedTiers = tiers.sort((a, b) => b.threshold - a.threshold);

    // Find applicable tier
    for (const tier of sortedTiers) {
      if (orderAmount >= tier.threshold) {
        let discount = this.calculatePercentageDiscount(orderAmount, tier.discountPercentage);

        // Apply maximum discount limit if specified
        if (tier.maxDiscount && discount > tier.maxDiscount) {
          discount = tier.maxDiscount;
        }

        return { discount, appliedTier: tier };
      }
    }

    return { discount: 0 };
  }

  /**
   * Calculate volume/quantity-based discount
   */
  calculateVolumeDiscount(
    quantity: number,
    unitPrice: number,
    rules: BulkDiscountRule[]
  ): { discount: number; appliedRule?: BulkDiscountRule } {
    if (quantity <= 0 || unitPrice <= 0 || !rules.length) {
      return { discount: 0 };
    }

    // Sort rules by minimum quantity (highest first)
    const sortedRules = rules.sort((a, b) => b.minQuantity - a.minQuantity);

    // Find applicable rule
    for (const rule of sortedRules) {
      if (quantity >= rule.minQuantity &&
          (!rule.maxQuantity || quantity <= rule.maxQuantity)) {

        const totalAmount = quantity * unitPrice;
        const discount = this.calculatePercentageDiscount(totalAmount, rule.discountPercentage);

        return { discount, appliedRule: rule };
      }
    }

    return { discount: 0 };
  }

  /**
   * Validate and apply discount code
   */
  validateAndApplyDiscountCode(
    code: DiscountCode,
    context: DiscountContext
  ): DiscountValidationResult {
    // Basic validation
    const basicValidation = this.validateDiscountCodeBasics(code, context);
    if (!basicValidation.valid) {
      return basicValidation;
    }

    // Calculate applicable amount and discount
    const calculationResult = this.calculateDiscountCodeAmount(code, context);

    return {
      valid: true,
      discount: code,
      applicableAmount: calculationResult.applicableAmount,
      finalDiscount: calculationResult.finalDiscount
    };
  }

  /**
   * Basic discount code validation
   */
  private validateDiscountCodeBasics(
    code: DiscountCode,
    context: DiscountContext
  ): DiscountValidationResult {
    // Check if code is active
    if (!code.isActive) {
      return { valid: false, error: 'Discount code is not active' };
    }

    // Check date validity
    const now = context.currentDate;
    if (new Date(code.validFrom) > now) {
      return { valid: false, error: 'Discount code is not yet valid' };
    }
    if (new Date(code.validTo) < now) {
      return { valid: false, error: 'Discount code has expired' };
    }

    // Check usage limits
    if (code.usageLimit && code.usageCount >= code.usageLimit) {
      return { valid: false, error: 'Discount code usage limit exceeded' };
    }

    // Check minimum order amount
    if (code.minOrderAmount && context.orderAmount < code.minOrderAmount) {
      return {
        valid: false,
        error: `Minimum order amount of $${code.minOrderAmount} required`
      };
    }

    // Check product applicability
    if (code.applicableProducts.length > 0) {
      const hasApplicableProduct = context.productIds.some(id =>
        code.applicableProducts.includes(id)
      );
      if (!hasApplicableProduct) {
        return { valid: false, error: 'Discount code not applicable to selected products' };
      }
    }

    // Check excluded products
    if (code.excludedProducts.length > 0) {
      const hasExcludedProduct = context.productIds.some(id =>
        code.excludedProducts.includes(id)
      );
      if (hasExcludedProduct) {
        return { valid: false, error: 'Discount code cannot be applied to selected products' };
      }
    }

    // Check category applicability
    if (code.applicableCategories.length > 0) {
      const hasApplicableCategory = context.categoryIds.some(id =>
        code.applicableCategories.includes(id)
      );
      if (!hasApplicableCategory) {
        return { valid: false, error: 'Discount code not applicable to selected categories' };
      }
    }

    // Check excluded categories
    if (code.excludedCategories.length > 0) {
      const hasExcludedCategory = context.categoryIds.some(id =>
        code.excludedCategories.includes(id)
      );
      if (hasExcludedCategory) {
        return { valid: false, error: 'Discount code cannot be applied to selected categories' };
      }
    }

    // Check customer-specific conditions
    if (code.conditions) {
      const conditionValidation = this.validateDiscountConditions(code.conditions, context);
      if (!conditionValidation.valid) {
        return conditionValidation;
      }
    }

    return { valid: true };
  }

  /**
   * Validate discount code conditions
   */
  private validateDiscountConditions(
    conditions: any[],
    context: DiscountContext
  ): DiscountValidationResult {
    for (const condition of conditions) {
      switch (condition.type) {
        case 'min_quantity':
          if (context.quantity < condition.value) {
            return {
              valid: false,
              error: `Minimum quantity of ${condition.value} required`
            };
          }
          break;

        case 'customer_group':
          // Would need customer group data
          break;

        case 'first_purchase':
          // Would need customer purchase history
          break;

        case 'geographic':
          // Would need geographic data
          break;

        default:
          // Unknown condition type
          break;
      }
    }

    return { valid: true };
  }

  /**
   * Calculate discount code amount
   */
  private calculateDiscountCodeAmount(
    code: DiscountCode,
    context: DiscountContext
  ): { applicableAmount: number; finalDiscount: number } {
    let applicableAmount = context.orderAmount;

    // If specific products are targeted, calculate applicable amount
    if (code.applicableProducts.length > 0 || code.applicableCategories.length > 0) {
      // This would require product-level pricing data
      // For now, assume full order amount is applicable
      applicableAmount = context.orderAmount;
    }

    let finalDiscount = 0;

    switch (code.type) {
      case 'percentage':
        finalDiscount = this.calculatePercentageDiscount(applicableAmount, code.value);
        break;

      case 'fixed_amount':
        finalDiscount = this.calculateFixedDiscount(applicableAmount, code.value);
        break;

      case 'free_shipping':
        // Free shipping would be handled separately
        finalDiscount = 0; // Would set shipping cost to 0
        break;

      case 'buy_x_get_y':
        finalDiscount = this.calculateBuyXGetYDiscount(code, context);
        break;

      default:
        finalDiscount = 0;
    }

    // Apply maximum discount limit if specified
    if (code.maxDiscountAmount && finalDiscount > code.maxDiscountAmount) {
      finalDiscount = code.maxDiscountAmount;
    }

    return { applicableAmount, finalDiscount };
  }

  /**
   * Calculate Buy X Get Y discount
   */
  private calculateBuyXGetYDiscount(
    code: DiscountCode,
    context: DiscountContext
  ): number {
    // This would require more complex logic based on product quantities
    // For now, return a simple calculation
    const discountMultiplier = Math.floor(context.quantity / (code.value || 1));
    return discountMultiplier * (code.maxDiscountAmount || 0);
  }

  /**
   * Combine multiple discounts with stacking rules
   */
  combineDiscounts(
    discounts: DiscountInfo[],
    stackingRules: {
      allowStacking: boolean;
      maxStackingCount?: number;
      stackingType: 'additive' | 'multiplicative' | 'best_single';
    }
  ): { totalDiscount: number; appliedDiscounts: DiscountInfo[] } {
    if (!discounts.length) {
      return { totalDiscount: 0, appliedDiscounts: [] };
    }

    if (!stackingRules.allowStacking || stackingRules.stackingType === 'best_single') {
      // Use only the best single discount
      const bestDiscount = discounts.reduce((best, current) =>
        current.amount > best.amount ? current : best
      );
      return { totalDiscount: bestDiscount.amount, appliedDiscounts: [bestDiscount] };
    }

    // Apply stacking limit
    const applicableDiscounts = stackingRules.maxStackingCount
      ? discounts.slice(0, stackingRules.maxStackingCount)
      : discounts;

    let totalDiscount = 0;

    if (stackingRules.stackingType === 'additive') {
      // Simple addition
      totalDiscount = applicableDiscounts.reduce((sum, discount) => sum + discount.amount, 0);
    } else if (stackingRules.stackingType === 'multiplicative') {
      // Multiplicative stacking (more complex)
      let remainingAmount = 100; // Start with 100% of original price

      for (const discount of applicableDiscounts) {
        if (discount.type === 'percentage') {
          remainingAmount *= (1 - discount.value / 100);
        } else {
          // Fixed amount discounts are harder to stack multiplicatively
          totalDiscount += discount.amount;
        }
      }

      // Calculate percentage-based total discount
      if (remainingAmount !== 100) {
        const percentageDiscount = (100 - remainingAmount) / 100;
        // This would need the original amount to calculate properly
        // For now, just add to totalDiscount
      }
    }

    return { totalDiscount, appliedDiscounts: applicableDiscounts };
  }

  /**
   * Calculate loyalty discount based on customer tier
   */
  calculateLoyaltyDiscount(
    orderAmount: number,
    loyaltyTier: string,
    loyaltyRules: Record<string, { discountPercentage: number; maxDiscount?: number }>
  ): { discount: number; tier: string } {
    const rule = loyaltyRules[loyaltyTier.toLowerCase()];

    if (!rule) {
      return { discount: 0, tier: loyaltyTier };
    }

    let discount = this.calculatePercentageDiscount(orderAmount, rule.discountPercentage);

    if (rule.maxDiscount && discount > rule.maxDiscount) {
      discount = rule.maxDiscount;
    }

    return { discount, tier: loyaltyTier };
  }

  /**
   * Calculate promotional discount for special events
   */
  calculatePromotionalDiscount(
    orderAmount: number,
    promotionCode: string,
    promotionalRules: Record<string, {
      type: 'percentage' | 'fixed' | 'tiered';
      value: number;
      conditions?: any;
    }>
  ): { discount: number; promotion: string } {
    const rule = promotionalRules[promotionCode.toLowerCase()];

    if (!rule) {
      return { discount: 0, promotion: promotionCode };
    }

    let discount = 0;

    switch (rule.type) {
      case 'percentage':
        discount = this.calculatePercentageDiscount(orderAmount, rule.value);
        break;
      case 'fixed':
        discount = this.calculateFixedDiscount(orderAmount, rule.value);
        break;
      case 'tiered':
        // Would implement tiered promotional logic
        break;
    }

    return { discount, promotion: promotionCode };
  }

  /**
   * Validate discount amount constraints
   */
  validateDiscountConstraints(
    discount: number,
    originalAmount: number,
    constraints: {
      maxDiscountPercentage?: number;
      maxDiscountAmount?: number;
      minRemainingAmount?: number;
    }
  ): { valid: boolean; adjustedDiscount: number; reason?: string } {
    let adjustedDiscount = discount;
    let reason: string | undefined;

    // Check maximum discount percentage
    if (constraints.maxDiscountPercentage) {
      const maxAllowed = this.calculatePercentageDiscount(originalAmount, constraints.maxDiscountPercentage);
      if (discount > maxAllowed) {
        adjustedDiscount = maxAllowed;
        reason = `Discount capped at ${constraints.maxDiscountPercentage}%`;
      }
    }

    // Check maximum discount amount
    if (constraints.maxDiscountAmount && adjustedDiscount > constraints.maxDiscountAmount) {
      adjustedDiscount = constraints.maxDiscountAmount;
      reason = `Discount capped at $${constraints.maxDiscountAmount}`;
    }

    // Check minimum remaining amount
    if (constraints.minRemainingAmount) {
      const maxDiscount = originalAmount - constraints.minRemainingAmount;
      if (adjustedDiscount > maxDiscount) {
        adjustedDiscount = Math.max(0, maxDiscount);
        reason = `Minimum remaining amount of $${constraints.minRemainingAmount} required`;
      }
    }

    return {
      valid: adjustedDiscount === discount,
      adjustedDiscount,
      reason
    };
  }

  /**
   * Generate discount summary for display
   */
  generateDiscountSummary(discounts: DiscountInfo[]): {
    totalDiscount: number;
    totalSavings: number;
    discountBreakdown: Array<{
      type: string;
      amount: number;
      description: string;
    }>;
  } {
    const totalDiscount = discounts.reduce((sum, discount) => sum + discount.amount, 0);

    const discountBreakdown = discounts.map(discount => ({
      type: discount.type,
      amount: discount.amount,
      description: discount.description
    }));

    return {
      totalDiscount,
      totalSavings: totalDiscount,
      discountBreakdown
    };
  }
}

export default DiscountCalculator;