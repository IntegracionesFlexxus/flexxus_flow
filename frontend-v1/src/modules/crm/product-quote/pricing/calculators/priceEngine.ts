// Core Pricing Calculation Engine - Sprint 19 Phase 3
// Main pricing engine with rule evaluation and calculation logic

import {
  PriceCalculationParams,
  PriceResult,
  PricingRule,
  PricingCondition,
  PricingAction,
  PriceBreakdown,
  AppliedRule,
  DiscountInfo,
  TaxInfo,
  PricingContext
} from '../../../shared/types/pricing.types';

// Import other calculators
import { DiscountCalculator } from './discountCalculator';
import { TaxCalculator } from './taxCalculator';

interface PriceEngineConfig {
  basePriceProvider: (productId: number, variantId?: number) => Promise<number>;
  rulesProvider: (params: PriceCalculationParams) => Promise<PricingRule[]>;
  taxProvider: (params: PriceCalculationParams, price: number) => Promise<TaxInfo[]>;
  currency?: string;
  precision?: number;
  maxExecutionTime?: number;
  enableCaching?: boolean;
  enableLogging?: boolean;
}

interface CalculationContext {
  basePrice: number;
  currentPrice: number;
  appliedRules: AppliedRule[];
  discounts: DiscountInfo[];
  breakdown: PriceBreakdown[];
  taxes: TaxInfo[];
  metadata: Record<string, any>;
  calculationLog: string[];
}

export class PriceEngine {
  private config: PriceEngineConfig;
  private discountCalculator: DiscountCalculator;
  private taxCalculator: TaxCalculator;
  private calculationCache: Map<string, { result: PriceResult; timestamp: number }>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: PriceEngineConfig) {
    this.config = {
      currency: 'USD',
      precision: 2,
      maxExecutionTime: 5000, // 5 seconds
      enableCaching: true,
      enableLogging: false,
      ...config
    };

    this.discountCalculator = new DiscountCalculator();
    this.taxCalculator = new TaxCalculator();
    this.calculationCache = new Map();
  }

  /**
   * Main price calculation method
   */
  async calculatePrice(params: PriceCalculationParams, useCache: boolean = true): Promise<PriceResult> {
    const startTime = Date.now();

    try {
      // Check cache first
      if (useCache && this.config.enableCaching) {
        const cached = this.getCachedResult(params);
        if (cached) {
          this.log(`Cache hit for params: ${JSON.stringify(params)}`);
          return cached;
        }
      }

      // Initialize calculation context
      const context = await this.initializeContext(params);

      // Execute calculation pipeline
      await this.executeCalculationPipeline(params, context);

      // Build final result
      const result = this.buildResult(params, context, startTime);

      // Cache result
      if (useCache && this.config.enableCaching) {
        this.cacheResult(params, result);
      }

      this.log(`Price calculation completed in ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      this.log(`Price calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Initialize calculation context with base price
   */
  private async initializeContext(params: PriceCalculationParams): Promise<CalculationContext> {
    const basePrice = await this.config.basePriceProvider(params.productId, params.variantId);

    if (basePrice <= 0) {
      throw new Error(`Invalid base price: ${basePrice} for product ${params.productId}`);
    }

    return {
      basePrice,
      currentPrice: basePrice,
      appliedRules: [],
      discounts: [],
      breakdown: [{
        component: 'base_price',
        amount: basePrice,
        description: 'Base product price'
      }],
      taxes: [],
      metadata: {
        calculationStart: Date.now(),
        productId: params.productId,
        variantId: params.variantId,
        quantity: params.quantity
      },
      calculationLog: []
    };
  }

  /**
   * Execute the main calculation pipeline
   */
  private async executeCalculationPipeline(
    params: PriceCalculationParams,
    context: CalculationContext
  ): Promise<void> {
    // Step 1: Get applicable pricing rules
    const rules = await this.getApplicableRules(params, context);
    this.log(`Found ${rules.length} applicable rules`);

    // Step 2: Apply pricing rules in priority order
    await this.applyPricingRules(rules, params, context);

    // Step 3: Apply quantity-based adjustments
    await this.applyQuantityAdjustments(params, context);

    // Step 4: Apply context-based modifications (promotions, customer tiers, etc.)
    await this.applyContextModifications(params, context);

    // Step 5: Calculate taxes
    await this.calculateTaxes(params, context);

    // Step 6: Apply final validations and constraints
    await this.applyFinalValidations(params, context);
  }

  /**
   * Get applicable pricing rules for the given parameters
   */
  private async getApplicableRules(
    params: PriceCalculationParams,
    context: CalculationContext
  ): Promise<PricingRule[]> {
    const allRules = await this.config.rulesProvider(params);

    // Filter and sort rules by priority
    const applicableRules = allRules
      .filter(rule => this.isRuleApplicable(rule, params, context))
      .sort((a, b) => b.priority - a.priority); // Higher priority first

    return applicableRules;
  }

  /**
   * Check if a rule is applicable to the current calculation
   */
  private isRuleApplicable(
    rule: PricingRule,
    params: PriceCalculationParams,
    context: CalculationContext
  ): boolean {
    // Check if rule is active
    if (!rule.isActive) {
      return false;
    }

    // Check date validity
    const now = new Date();
    if (rule.validFrom && new Date(rule.validFrom) > now) {
      return false;
    }
    if (rule.validTo && new Date(rule.validTo) < now) {
      return false;
    }

    // Check quantity constraints
    if (rule.minQuantity && params.quantity < rule.minQuantity) {
      return false;
    }
    if (rule.maxQuantity && params.quantity > rule.maxQuantity) {
      return false;
    }

    // Check product applicability
    if (rule.applicableProducts.length > 0 && !rule.applicableProducts.includes(params.productId)) {
      return false;
    }

    // Check customer applicability
    if (params.customerId && rule.applicableCustomers.length > 0 &&
        !rule.applicableCustomers.includes(params.customerId)) {
      return false;
    }

    // Evaluate rule conditions
    return this.evaluateRuleConditions(rule.conditions, params, context);
  }

  /**
   * Evaluate rule conditions using logical operators
   */
  private evaluateRuleConditions(
    conditions: PricingCondition[],
    params: PriceCalculationParams,
    context: CalculationContext
  ): boolean {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    let result = true;
    let currentLogicalOperator: 'AND' | 'OR' | undefined;

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, params, context);

      if (currentLogicalOperator === 'OR') {
        result = result || conditionResult;
      } else {
        // Default to AND
        result = result && conditionResult;
      }

      currentLogicalOperator = condition.logicalOperator;
    }

    return result;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: PricingCondition,
    params: PriceCalculationParams,
    context: CalculationContext
  ): boolean {
    const value = this.getConditionValue(condition.field, params, context);

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      case 'greater_equal':
        return Number(value) >= Number(condition.value);
      case 'less_equal':
        return Number(value) <= Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) ? condition.value.includes(value) : false;
      case 'not_in':
        return Array.isArray(condition.value) ? !condition.value.includes(value) : true;
      case 'contains':
        return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
      default:
        return false;
    }
  }

  /**
   * Get value for condition evaluation
   */
  private getConditionValue(
    field: string,
    params: PriceCalculationParams,
    context: CalculationContext
  ): any {
    switch (field) {
      case 'productId':
        return params.productId;
      case 'variantId':
        return params.variantId;
      case 'quantity':
        return params.quantity;
      case 'customerId':
        return params.customerId;
      case 'accountId':
        return params.accountId;
      case 'currencyCode':
        return params.currencyCode;
      case 'basePrice':
        return context.basePrice;
      case 'currentPrice':
        return context.currentPrice;
      case 'customerTier':
        return params.context?.customerSegment;
      case 'salesChannel':
        return params.context?.salesChannel;
      case 'region':
        return params.context?.region;
      case 'promotionCode':
        return params.context?.promotionCode;
      default:
        return null;
    }
  }

  /**
   * Apply pricing rules to the calculation
   */
  private async applyPricingRules(
    rules: PricingRule[],
    params: PriceCalculationParams,
    context: CalculationContext
  ): Promise<void> {
    for (const rule of rules) {
      const ruleImpact = await this.applyRule(rule, params, context);

      if (ruleImpact !== 0) {
        context.appliedRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          type: rule.type,
          impact: ruleImpact,
          description: rule.description || `Applied ${rule.type} rule`
        });

        this.log(`Applied rule "${rule.name}" with impact: ${ruleImpact}`);
      }
    }
  }

  /**
   * Apply a single pricing rule
   */
  private async applyRule(
    rule: PricingRule,
    params: PriceCalculationParams,
    context: CalculationContext
  ): Promise<number> {
    let totalImpact = 0;

    for (const action of rule.actions) {
      const actionImpact = await this.applyAction(action, params, context);
      totalImpact += actionImpact;

      // Add to breakdown
      context.breakdown.push({
        component: this.getBreakdownComponent(action.type),
        amount: actionImpact,
        description: `${rule.name}: ${action.type}`,
        percentage: action.type.includes('percentage') ? action.value : undefined
      });
    }

    return totalImpact;
  }

  /**
   * Apply a pricing action
   */
  private async applyAction(
    action: PricingAction,
    params: PriceCalculationParams,
    context: CalculationContext
  ): Promise<number> {
    const targetPrice = this.getTargetPrice(action.applyTo, context);

    switch (action.type) {
      case 'discount_percentage':
        const discountAmount = this.discountCalculator.calculatePercentageDiscount(targetPrice, action.value);
        context.currentPrice -= discountAmount;
        this.addDiscount(context, 'percentage', action.value, discountAmount);
        return -discountAmount;

      case 'discount_amount':
        const fixedDiscount = Math.min(action.value, targetPrice);
        context.currentPrice -= fixedDiscount;
        this.addDiscount(context, 'fixed_amount', action.value, fixedDiscount);
        return -fixedDiscount;

      case 'set_price':
        const priceChange = action.value - context.currentPrice;
        context.currentPrice = action.value;
        return priceChange;

      case 'markup_percentage':
        const markupAmount = (targetPrice * action.value) / 100;
        context.currentPrice += markupAmount;
        return markupAmount;

      case 'markup_amount':
        context.currentPrice += action.value;
        return action.value;

      default:
        return 0;
    }
  }

  /**
   * Get target price for action application
   */
  private getTargetPrice(applyTo: string, context: CalculationContext): number {
    switch (applyTo) {
      case 'unit_price':
      case 'line_total':
        return context.currentPrice;
      case 'base_price':
        return context.basePrice;
      default:
        return context.currentPrice;
    }
  }

  /**
   * Add discount to context
   */
  private addDiscount(
    context: CalculationContext,
    type: 'percentage' | 'fixed_amount',
    value: number,
    amount: number,
    code?: string
  ): void {
    context.discounts.push({
      id: context.discounts.length + 1,
      type,
      value,
      amount,
      code,
      description: `${type === 'percentage' ? value + '%' : '$' + value} discount`
    });
  }

  /**
   * Apply quantity-based adjustments
   */
  private async applyQuantityAdjustments(
    params: PriceCalculationParams,
    context: CalculationContext
  ): Promise<void> {
    // Apply quantity multiplication
    const lineTotal = context.currentPrice * params.quantity;
    const adjustment = lineTotal - context.currentPrice;

    if (adjustment !== 0) {
      context.breakdown.push({
        component: 'quantity',
        amount: adjustment,
        description: `Quantity: ${params.quantity}`
      });

      context.currentPrice = lineTotal;
    }
  }

  /**
   * Apply context-based modifications
   */
  private async applyContextModifications(
    params: PriceCalculationParams,
    context: CalculationContext
  ): Promise<void> {
    if (!params.context) return;

    // Customer segment adjustments
    if (params.context.customerSegment) {
      await this.applyCustomerSegmentPricing(params.context.customerSegment, context);
    }

    // Regional adjustments
    if (params.context.region) {
      await this.applyRegionalPricing(params.context.region, context);
    }

    // Loyalty tier adjustments
    if (params.context.loyaltyTier) {
      await this.applyLoyaltyPricing(params.context.loyaltyTier, context);
    }
  }

  /**
   * Apply customer segment pricing
   */
  private async applyCustomerSegmentPricing(segment: string, context: CalculationContext): Promise<void> {
    const segmentDiscounts: Record<string, number> = {
      'enterprise': 15,
      'premium': 10,
      'standard': 5,
      'basic': 0
    };

    const discount = segmentDiscounts[segment.toLowerCase()] || 0;
    if (discount > 0) {
      const discountAmount = this.discountCalculator.calculatePercentageDiscount(context.currentPrice, discount);
      context.currentPrice -= discountAmount;
      this.addDiscount(context, 'percentage', discount, discountAmount);

      context.breakdown.push({
        component: 'discount',
        amount: -discountAmount,
        percentage: discount,
        description: `${segment} customer discount`
      });
    }
  }

  /**
   * Apply regional pricing adjustments
   */
  private async applyRegionalPricing(region: string, context: CalculationContext): Promise<void> {
    const regionMultipliers: Record<string, number> = {
      'north_america': 1.0,
      'europe': 1.15,
      'asia_pacific': 0.95,
      'latin_america': 0.85
    };

    const multiplier = regionMultipliers[region.toLowerCase()] || 1.0;
    if (multiplier !== 1.0) {
      const adjustment = context.currentPrice * (multiplier - 1);
      context.currentPrice *= multiplier;

      context.breakdown.push({
        component: 'regional_adjustment',
        amount: adjustment,
        percentage: (multiplier - 1) * 100,
        description: `Regional adjustment for ${region}`
      });
    }
  }

  /**
   * Apply loyalty tier pricing
   */
  private async applyLoyaltyPricing(tier: string, context: CalculationContext): Promise<void> {
    const loyaltyDiscounts: Record<string, number> = {
      'platinum': 20,
      'gold': 15,
      'silver': 10,
      'bronze': 5
    };

    const discount = loyaltyDiscounts[tier.toLowerCase()] || 0;
    if (discount > 0) {
      const discountAmount = this.discountCalculator.calculatePercentageDiscount(context.currentPrice, discount);
      context.currentPrice -= discountAmount;
      this.addDiscount(context, 'percentage', discount, discountAmount);

      context.breakdown.push({
        component: 'discount',
        amount: -discountAmount,
        percentage: discount,
        description: `${tier} loyalty discount`
      });
    }
  }

  /**
   * Calculate taxes
   */
  private async calculateTaxes(
    params: PriceCalculationParams,
    context: CalculationContext
  ): Promise<void> {
    try {
      const taxes = await this.config.taxProvider(params, context.currentPrice);
      context.taxes = taxes;

      const totalTaxAmount = taxes.reduce((sum, tax) => sum + tax.amount, 0);
      if (totalTaxAmount > 0) {
        context.breakdown.push({
          component: 'tax',
          amount: totalTaxAmount,
          description: 'Total taxes'
        });

        // Add taxes to final price if not included
        const hasIncludedTaxes = taxes.some(tax => tax.included);
        if (!hasIncludedTaxes) {
          context.currentPrice += totalTaxAmount;
        }
      }
    } catch (error) {
      this.log(`Tax calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Continue without taxes rather than failing the entire calculation
    }
  }

  /**
   * Apply final validations and constraints
   */
  private async applyFinalValidations(
    params: PriceCalculationParams,
    context: CalculationContext
  ): Promise<void> {
    // Ensure price is not negative
    if (context.currentPrice < 0) {
      this.log(`Negative price detected (${context.currentPrice}), setting to 0`);
      context.currentPrice = 0;
    }

    // Round to specified precision
    if (this.config.precision !== undefined) {
      context.currentPrice = Number(context.currentPrice.toFixed(this.config.precision));
    }

    // Apply minimum price constraints
    const minimumPrice = 0.01; // Minimum 1 cent
    if (context.currentPrice < minimumPrice && context.currentPrice > 0) {
      context.currentPrice = minimumPrice;
      context.breakdown.push({
        component: 'minimum_price',
        amount: minimumPrice - context.currentPrice,
        description: 'Minimum price constraint applied'
      });
    }
  }

  /**
   * Build final price result
   */
  private buildResult(
    params: PriceCalculationParams,
    context: CalculationContext,
    startTime: number
  ): PriceResult {
    return {
      basePrice: context.basePrice,
      finalPrice: context.currentPrice,
      currency: params.currencyCode || this.config.currency || 'USD',
      breakdown: context.breakdown,
      appliedRules: context.appliedRules,
      discounts: context.discounts,
      taxes: context.taxes,
      metadata: {
        ...context.metadata,
        calculationTime: Date.now() - startTime,
        engineVersion: '1.0.0'
      },
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Get breakdown component type
   */
  private getBreakdownComponent(actionType: string): 'base_price' | 'discount' | 'markup' | 'tax' | 'shipping' | 'fee' {
    if (actionType.includes('discount')) return 'discount';
    if (actionType.includes('markup')) return 'markup';
    if (actionType.includes('tax')) return 'tax';
    if (actionType.includes('shipping')) return 'shipping';
    if (actionType.includes('fee')) return 'fee';
    return 'discount'; // Default
  }

  /**
   * Cache management
   */
  private getCacheKey(params: PriceCalculationParams): string {
    return JSON.stringify({
      productId: params.productId,
      variantId: params.variantId,
      quantity: params.quantity,
      customerId: params.customerId,
      accountId: params.accountId,
      currencyCode: params.currencyCode,
      date: params.date,
      context: params.context
    });
  }

  private getCachedResult(params: PriceCalculationParams): PriceResult | null {
    const key = this.getCacheKey(params);
    const cached = this.calculationCache.get(key);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }

    if (cached) {
      this.calculationCache.delete(key);
    }

    return null;
  }

  private cacheResult(params: PriceCalculationParams, result: PriceResult): void {
    const key = this.getCacheKey(params);
    this.calculationCache.set(key, {
      result,
      timestamp: Date.now()
    });

    // Clean up old cache entries
    if (this.calculationCache.size > 1000) {
      const cutoff = Date.now() - this.CACHE_TTL;
      for (const [k, v] of this.calculationCache.entries()) {
        if (v.timestamp < cutoff) {
          this.calculationCache.delete(k);
        }
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.calculationCache.clear();
  }

  /**
   * Clear cache for specific product
   */
  clearProductCache(productId: number): void {
    for (const [key, value] of this.calculationCache.entries()) {
      if (key.includes(`"productId":${productId}`)) {
        this.calculationCache.delete(key);
      }
    }
  }

  /**
   * Logging utility
   */
  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(`[PriceEngine] ${new Date().toISOString()}: ${message}`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.calculationCache.size,
      hitRate: 0 // Would need to track hits/misses
    };
  }
}

export default PriceEngine;