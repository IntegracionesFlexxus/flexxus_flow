// quoteCalculator - Sprint 19 Frontend Implementation
// Quote calculation utilities

import {
  QuoteLineItem,
  QuoteTotals,
  TaxCalculation,
  LineItemCalculation,
  DiscountInfo
} from '../../shared/types';

interface CalculationOptions {
  currencyCode?: string;
  exchangeRate?: number;
  taxRate?: number;
  includeTax?: boolean;
  roundingPrecision?: number;
}

class QuoteCalculator {
  private readonly DEFAULT_TAX_RATE = 0.0825; // 8.25%
  private readonly DEFAULT_ROUNDING_PRECISION = 2;

  /**
   * Calculate totals for a quote
   */
  async calculateTotals(
    lineItems: QuoteLineItem[],
    options: CalculationOptions = {}
  ): Promise<QuoteTotals> {
    const {
      currencyCode = 'USD',
      exchangeRate = 1,
      taxRate = this.DEFAULT_TAX_RATE,
      includeTax = true,
      roundingPrecision = this.DEFAULT_ROUNDING_PRECISION
    } = options;

    // Calculate line item totals
    const lineCalculations = lineItems.map(item => this.calculateLineItemTotal(item));

    // Calculate subtotal (before discounts and tax)
    const subtotal = lineCalculations.reduce((sum, calc) => sum + calc.baseAmount, 0);

    // Calculate total discount
    const totalDiscount = lineCalculations.reduce((sum, calc) => sum + calc.discountAmount, 0);

    // Net amount after discounts
    const netAmount = subtotal - totalDiscount;

    // Calculate tax
    const totalTax = includeTax ? this.calculateTax(netAmount, taxRate) : 0;

    // Final total
    const total = netAmount + totalTax;

    // Calculate margin (if cost information is available)
    const totalCost = lineItems.reduce((sum, item) =>
      sum + ((item.cost || 0) * item.quantity), 0
    );
    const margin = total - totalCost;
    const marginPercentage = total > 0 ? (margin / total) * 100 : 0;

    // Apply currency conversion if needed
    const convertedTotals = this.convertCurrency({
      subtotal,
      totalDiscount,
      totalTax,
      total,
      margin,
      marginPercentage
    }, exchangeRate);

    // Round to specified precision
    return this.roundTotals(convertedTotals, roundingPrecision);
  }

  /**
   * Calculate line item total with discounts
   */
  calculateLineItemTotal(item: QuoteLineItem): {
    baseAmount: number;
    discountAmount: number;
    netAmount: number;
    taxAmount: number;
    totalAmount: number;
  } {
    const baseAmount = item.quantity * item.unitPrice;
    const discountAmount = this.calculateDiscount(baseAmount, item.discount, item.discountType);
    const netAmount = baseAmount - discountAmount;

    // Tax would be calculated at quote level, but we can estimate per line
    const taxAmount = 0; // Placeholder
    const totalAmount = netAmount + taxAmount;

    return {
      baseAmount,
      discountAmount,
      netAmount,
      taxAmount,
      totalAmount
    };
  }

  /**
   * Calculate discount amount
   */
  calculateDiscount(amount: number, discount: number, type: 'percentage' | 'fixed'): number {
    if (discount <= 0) return 0;

    switch (type) {
      case 'percentage':
        return (amount * discount) / 100;
      case 'fixed':
        return Math.min(discount, amount); // Don't allow discount to exceed amount
      default:
        return 0;
    }
  }

  /**
   * Calculate tax amount
   */
  calculateTax(amount: number, taxRate: number): number {
    return amount * taxRate;
  }

  /**
   * Calculate detailed tax breakdown
   */
  calculateTaxBreakdown(
    netAmount: number,
    taxRules: Array<{ name: string; rate: number; included: boolean }>
  ): TaxCalculation[] {
    return taxRules.map(rule => ({
      name: rule.name,
      rate: rule.rate * 100, // Convert to percentage
      amount: this.calculateTax(netAmount, rule.rate),
      included: rule.included
    }));
  }

  /**
   * Calculate line item details for display
   */
  calculateLineItemDetails(items: QuoteLineItem[]): LineItemCalculation[] {
    return items.map(item => {
      const calculation = this.calculateLineItemTotal(item);

      return {
        lineItemId: item.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: calculation.discountAmount,
        subtotal: calculation.netAmount,
        tax: calculation.taxAmount,
        total: calculation.totalAmount
      };
    });
  }

  /**
   * Apply bulk discount to multiple line items
   */
  applyBulkDiscount(
    items: QuoteLineItem[],
    discount: number,
    discountType: 'percentage' | 'fixed',
    distributionMethod: 'equal' | 'proportional' = 'proportional'
  ): QuoteLineItem[] {
    if (discount <= 0) return items;

    const totalAmount = items.reduce((sum, item) =>
      sum + (item.quantity * item.unitPrice), 0
    );

    if (totalAmount === 0) return items;

    return items.map(item => {
      const itemTotal = item.quantity * item.unitPrice;
      let itemDiscount = 0;

      if (discountType === 'percentage') {
        itemDiscount = discount; // Same percentage for all items
      } else {
        // Fixed discount distributed
        if (distributionMethod === 'equal') {
          itemDiscount = discount / items.length;
        } else {
          // Proportional distribution
          const proportion = itemTotal / totalAmount;
          itemDiscount = discount * proportion;
        }
      }

      return {
        ...item,
        discount: itemDiscount,
        discountType: discountType === 'percentage' ? 'percentage' : 'fixed',
        subtotal: itemTotal - this.calculateDiscount(itemTotal, itemDiscount,
          discountType === 'percentage' ? 'percentage' : 'fixed')
      };
    });
  }

  /**
   * Calculate quote comparison metrics
   */
  calculateComparisonMetrics(quote1Items: QuoteLineItem[], quote2Items: QuoteLineItem[]): {
    totalDifference: number;
    percentageDifference: number;
    itemCountDifference: number;
    commonItems: number;
    uniqueToQuote1: number;
    uniqueToQuote2: number;
  } {
    const total1 = quote1Items.reduce((sum, item) => sum + item.subtotal, 0);
    const total2 = quote2Items.reduce((sum, item) => sum + item.subtotal, 0);

    const totalDifference = Math.abs(total1 - total2);
    const percentageDifference = total1 > 0 ? (totalDifference / total1) * 100 : 0;

    const itemCountDifference = Math.abs(quote1Items.length - quote2Items.length);

    // Find common items by SKU or name
    const quote1Skus = new Set(quote1Items.map(item => item.sku || item.name).filter(Boolean));
    const quote2Skus = new Set(quote2Items.map(item => item.sku || item.name).filter(Boolean));

    const commonSkus = new Set([...quote1Skus].filter(sku => quote2Skus.has(sku)));
    const uniqueToQuote1 = quote1Skus.size - commonSkus.size;
    const uniqueToQuote2 = quote2Skus.size - commonSkus.size;

    return {
      totalDifference,
      percentageDifference,
      itemCountDifference,
      commonItems: commonSkus.size,
      uniqueToQuote1,
      uniqueToQuote2
    };
  }

  /**
   * Calculate pricing tier discounts
   */
  calculateTierDiscount(quantity: number, tiers: Array<{
    minQuantity: number;
    maxQuantity?: number;
    discount: number;
    discountType: 'percentage' | 'fixed';
  }>): { discount: number; discountType: 'percentage' | 'fixed' } {
    // Find applicable tier
    const applicableTier = tiers
      .filter(tier =>
        quantity >= tier.minQuantity &&
        (!tier.maxQuantity || quantity <= tier.maxQuantity)
      )
      .sort((a, b) => b.minQuantity - a.minQuantity)[0]; // Get highest tier

    if (!applicableTier) {
      return { discount: 0, discountType: 'percentage' };
    }

    return {
      discount: applicableTier.discount,
      discountType: applicableTier.discountType
    };
  }

  /**
   * Convert currency
   */
  private convertCurrency(totals: QuoteTotals, exchangeRate: number): QuoteTotals {
    if (exchangeRate === 1) return totals;

    return {
      ...totals,
      subtotal: totals.subtotal * exchangeRate,
      totalDiscount: totals.totalDiscount * exchangeRate,
      totalTax: totals.totalTax * exchangeRate,
      total: totals.total * exchangeRate,
      margin: totals.margin ? totals.margin * exchangeRate : undefined
      // marginPercentage stays the same
    };
  }

  /**
   * Round totals to specified precision
   */
  private roundTotals(totals: QuoteTotals, precision: number): QuoteTotals {
    const round = (value: number) => Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);

    return {
      ...totals,
      subtotal: round(totals.subtotal),
      totalDiscount: round(totals.totalDiscount),
      totalTax: round(totals.totalTax),
      total: round(totals.total),
      margin: totals.margin ? round(totals.margin) : undefined,
      marginPercentage: totals.marginPercentage ? round(totals.marginPercentage) : undefined
    };
  }

  /**
   * Validate calculations
   */
  validateCalculations(totals: QuoteTotals): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (totals.subtotal < 0) errors.push('Subtotal cannot be negative');
    if (totals.totalDiscount < 0) errors.push('Total discount cannot be negative');
    if (totals.totalTax < 0) errors.push('Total tax cannot be negative');
    if (totals.total < 0) errors.push('Total cannot be negative');

    // Logical validation
    if (totals.totalDiscount > totals.subtotal) {
      errors.push('Total discount cannot exceed subtotal');
    }

    const calculatedTotal = totals.subtotal - totals.totalDiscount + totals.totalTax;
    const totalDifference = Math.abs(calculatedTotal - totals.total);

    if (totalDifference > 0.01) { // Allow for small rounding differences
      errors.push('Total calculation mismatch');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format currency amount
   */
  formatCurrency(amount: number, currencyCode: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Format percentage
   */
  formatPercentage(value: number, precision: number = 1): string {
    return `${value.toFixed(precision)}%`;
  }
}

// Export singleton instance
export const quoteCalculator = new QuoteCalculator();
export default quoteCalculator;