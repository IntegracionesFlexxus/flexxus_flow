/**
 * Dynamic Pricing Engine - Sprint 19
 * Core service for calculating prices with rules and conditions
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
import Decimal from 'decimal.js';

export interface PricingRule {
  rule_id?: number;
  company_id: number;
  rule_name: string;
  rule_type: 'discount' | 'markup' | 'fixed' | 'tiered' | 'bundle' | 'seasonal' | 'promotional';
  priority: number;
  conditions: any;
  actions: any;
  is_active: boolean;
  effective_from?: Date;
  effective_to?: Date;
}

export interface PriceCalculationRequest {
  company_id: number;
  product_id: number;
  quantity: number;
  account_id?: number;
  currency_code?: string;
  attributes?: Record<string, any>;
  apply_promotions?: boolean;
}

export interface PriceCalculationResult {
  base_price: Decimal;
  discount_amount: Decimal;
  discount_percentage: Decimal;
  final_price: Decimal;
  currency_code: string;
  applied_rules: AppliedRule[];
  tax_amount?: Decimal;
  total_with_tax?: Decimal;
  warnings?: string[];
}

export interface AppliedRule {
  rule_id: number;
  rule_name: string;
  rule_type: string;
  discount_amount: Decimal;
  description?: string;
}

export interface CustomerPricing {
  account_id: number;
  product_id?: number;
  category_id?: number;
  discount_percentage?: number;
  special_price?: number;
  price_list_id?: number;
}

export interface TierPricing {
  min_quantity: number;
  max_quantity?: number;
  price?: number;
  discount_percentage?: number;
}

@injectable()
export class DynamicPricingEngine {
  private pool: Pool;
  private cache: Map<string, { result: PriceCalculationResult; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @inject(TYPES.CrmConnection) pool: Pool,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.pool = pool;
  }

  /**
   * Calculate dynamic price for a product
   * Uses the database function calculate_dynamic_price() for consistency
   */
  async calculatePrice(request: PriceCalculationRequest): Promise<PriceCalculationResult> {
    const startTime = Date.now();
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check cache first
      const cacheKey = this.getCacheKey(request);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.logger.debug('Price calculation cache hit', { cacheKey });
        return cached;
      }

      // Get product base price
      const productQuery = `
        SELECT
          p.base_price,
          p.currency_code,
          p.tax_rate,
          p.product_type,
          pc.name as category_name
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.category_id
        WHERE p.product_id = $1 AND p.company_id = $2
      `;

      const productResult = await client.query(productQuery, [
        request.product_id,
        request.company_id
      ]);

      if (productResult.rows.length === 0) {
        throw new Error(`Product ${request.product_id} not found`);
      }

      const product = productResult.rows[0];
      const basePrice = new Decimal(product.base_price);
      const currency = request.currency_code || product.currency_code;

      // Call the stored function for price calculation
      const priceCalcQuery = `
        SELECT * FROM calculate_dynamic_price($1, $2, $3, $4, $5)
      `;

      const priceResult = await client.query(priceCalcQuery, [
        request.company_id,
        request.product_id,
        request.quantity,
        request.account_id || null,
        request.apply_promotions !== false
      ]);

      const calcResult = priceResult.rows[0];

      // Get applied rules details
      const appliedRules: AppliedRule[] = [];
      if (calcResult.applied_rules && calcResult.applied_rules.length > 0) {
        const rulesQuery = `
          SELECT rule_id, rule_name, rule_type, description
          FROM pricing_rules
          WHERE rule_id = ANY($1)
        `;

        const rulesResult = await client.query(rulesQuery, [calcResult.applied_rules]);

        for (const rule of rulesResult.rows) {
          appliedRules.push({
            rule_id: rule.rule_id,
            rule_name: rule.rule_name,
            rule_type: rule.rule_type,
            discount_amount: new Decimal(calcResult.discount_amount).div(appliedRules.length + 1),
            description: rule.description
          });
        }
      }

      // Calculate tax if applicable
      let taxAmount = new Decimal(0);
      let totalWithTax = new Decimal(calcResult.final_price);

      if (product.tax_rate > 0) {
        taxAmount = new Decimal(calcResult.final_price).mul(product.tax_rate).div(100);
        totalWithTax = new Decimal(calcResult.final_price).plus(taxAmount);
      }

      const result: PriceCalculationResult = {
        base_price: new Decimal(basePrice),
        discount_amount: new Decimal(calcResult.discount_amount),
        discount_percentage: new Decimal(calcResult.discount_percentage),
        final_price: new Decimal(calcResult.final_price),
        currency_code: currency,
        applied_rules: appliedRules,
        tax_amount: taxAmount,
        total_with_tax: totalWithTax,
        warnings: calcResult.warnings || []
      };

      // Cache the result
      this.setCache(cacheKey, result);

      await client.query('COMMIT');

      const duration = Date.now() - startTime;
      this.logger.info('Price calculated successfully', {
        product_id: request.product_id,
        duration_ms: duration
      });

      // Performance check
      if (duration > 200) {
        this.logger.warn('Price calculation exceeded 200ms target', {
          duration_ms: duration,
          product_id: request.product_id
        });
      }

      return result;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error calculating price', { error, request });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Bulk calculate prices for multiple products
   */
  async calculateBulkPrices(
    requests: PriceCalculationRequest[]
  ): Promise<PriceCalculationResult[]> {
    const results: PriceCalculationResult[] = [];

    // Process in batches of 10 for performance
    const batchSize = 10;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(req => this.calculatePrice(req))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get customer-specific pricing
   */
  async getCustomerPricing(
    company_id: number,
    account_id: number,
    product_id?: number
  ): Promise<CustomerPricing[]> {
    const client = await this.pool.connect();

    try {
      let query = `
        SELECT
          csp.*,
          p.name as product_name,
          pc.name as category_name
        FROM customer_specific_pricing csp
        LEFT JOIN products p ON csp.product_id = p.product_id
        LEFT JOIN product_categories pc ON csp.category_id = pc.category_id
        WHERE csp.company_id = $1 AND csp.account_id = $2
      `;

      const params: any[] = [company_id, account_id];

      if (product_id) {
        query += ` AND csp.product_id = $3`;
        params.push(product_id);
      }

      query += ` ORDER BY csp.product_id NULLS LAST`;

      const result = await client.query(query, params);
      return result.rows;

    } catch (error) {
      this.logger.error('Error getting customer pricing', { error, account_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create or update pricing rule
   */
  async upsertPricingRule(rule: PricingRule): Promise<PricingRule> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      if (rule.rule_id) {
        // Update existing rule
        const updateQuery = `
          UPDATE pricing_rules
          SET rule_name = $2, rule_type = $3, priority = $4,
              conditions = $5, actions = $6, is_active = $7,
              effective_from = $8, effective_to = $9,
              updated_at = NOW()
          WHERE rule_id = $1 AND company_id = $10
          RETURNING *
        `;

        const result = await client.query(updateQuery, [
          rule.rule_id,
          rule.rule_name,
          rule.rule_type,
          rule.priority,
          JSON.stringify(rule.conditions),
          JSON.stringify(rule.actions),
          rule.is_active,
          rule.effective_from,
          rule.effective_to,
          rule.company_id
        ]);

        await client.query('COMMIT');
        return result.rows[0];

      } else {
        // Create new rule
        const insertQuery = `
          INSERT INTO pricing_rules (
            company_id, rule_name, rule_type, priority,
            conditions, actions, is_active,
            effective_from, effective_to
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `;

        const result = await client.query(insertQuery, [
          rule.company_id,
          rule.rule_name,
          rule.rule_type,
          rule.priority,
          JSON.stringify(rule.conditions),
          JSON.stringify(rule.actions),
          rule.is_active,
          rule.effective_from,
          rule.effective_to
        ]);

        await client.query('COMMIT');
        return result.rows[0];
      }

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error upserting pricing rule', { error, rule });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get active pricing rules
   */
  async getActiveRules(
    company_id: number,
    product_id?: number,
    account_id?: number
  ): Promise<PricingRule[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT *
        FROM pricing_rules
        WHERE company_id = $1
          AND is_active = true
          AND (effective_from IS NULL OR effective_from <= NOW())
          AND (effective_to IS NULL OR effective_to >= NOW())
        ORDER BY priority DESC, rule_id
      `;

      const result = await client.query(query, [company_id]);

      // Filter rules based on conditions if product_id or account_id provided
      let rules = result.rows;

      if (product_id || account_id) {
        rules = rules.filter(rule => {
          const conditions = rule.conditions || {};

          if (product_id && conditions.product_ids) {
            if (!conditions.product_ids.includes(product_id)) {
              return false;
            }
          }

          if (account_id && conditions.account_ids) {
            if (!conditions.account_ids.includes(account_id)) {
              return false;
            }
          }

          return true;
        });
      }

      return rules;

    } catch (error) {
      this.logger.error('Error getting active rules', { error, company_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Evaluate rule conditions
   */
  async evaluateRuleConditions(
    rule_id: number,
    context: Record<string, any>
  ): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT * FROM evaluate_pricing_rule_conditions($1, $2)
      `;

      const result = await client.query(query, [rule_id, JSON.stringify(context)]);
      return result.rows[0].result;

    } catch (error) {
      this.logger.error('Error evaluating rule conditions', { error, rule_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create promotion
   */
  async createPromotion(promotion: {
    company_id: number;
    promotion_name: string;
    promotion_type: string;
    discount_value: number;
    conditions?: any;
    start_date: Date;
    end_date: Date;
    is_active?: boolean;
  }): Promise<any> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO promotions (
          company_id, promotion_name, promotion_type,
          discount_value, conditions, start_date, end_date,
          is_active, usage_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)
        RETURNING *
      `;

      const result = await client.query(query, [
        promotion.company_id,
        promotion.promotion_name,
        promotion.promotion_type,
        promotion.discount_value,
        JSON.stringify(promotion.conditions || {}),
        promotion.start_date,
        promotion.end_date,
        promotion.is_active !== false
      ]);

      return result.rows[0];

    } catch (error) {
      this.logger.error('Error creating promotion', { error, promotion });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get cache key for price calculation
   */
  private getCacheKey(request: PriceCalculationRequest): string {
    return `price:${request.company_id}:${request.product_id}:${request.quantity}:${request.account_id || 'none'}:${request.apply_promotions}`;
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): PriceCalculationResult | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }
    return null;
  }

  /**
   * Set cache
   */
  private setCache(key: string, result: PriceCalculationResult): void {
    // Limit cache size to 1000 entries
    if (this.cache.size >= 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('Pricing cache cleared');
  }

  /**
   * Apply discount code
   */
  async applyDiscountCode(
    company_id: number,
    code: string,
    order_value: number,
    account_id?: number
  ): Promise<{
    valid: boolean;
    discount_amount: number;
    discount_type: string;
    message?: string;
  }> {
    const client = await this.pool.connect();

    try {
      // Validate discount code
      const validateQuery = `
        SELECT
          dc.*,
          (dc.usage_limit IS NULL OR dc.usage_count < dc.usage_limit) as can_use
        FROM discount_codes dc
        WHERE dc.company_id = $1
          AND dc.code = $2
          AND dc.is_active = true
          AND dc.valid_from <= NOW()
          AND dc.valid_to >= NOW()
      `;

      const result = await client.query(validateQuery, [company_id, code]);

      if (result.rows.length === 0) {
        return {
          valid: false,
          discount_amount: 0,
          discount_type: 'none',
          message: 'Invalid or expired discount code'
        };
      }

      const discount = result.rows[0];

      // Check usage limit
      if (!discount.can_use) {
        return {
          valid: false,
          discount_amount: 0,
          discount_type: discount.discount_type,
          message: 'Discount code usage limit reached'
        };
      }

      // Check minimum order value
      if (discount.minimum_order_value && order_value < discount.minimum_order_value) {
        return {
          valid: false,
          discount_amount: 0,
          discount_type: discount.discount_type,
          message: `Minimum order value of ${discount.minimum_order_value} required`
        };
      }

      // Check customer restrictions
      if (discount.allowed_customers && account_id) {
        if (!discount.allowed_customers.includes(account_id)) {
          return {
            valid: false,
            discount_amount: 0,
            discount_type: discount.discount_type,
            message: 'Discount code not valid for this customer'
          };
        }
      }

      // Calculate discount amount
      let discount_amount = 0;
      if (discount.discount_type === 'percentage') {
        discount_amount = (order_value * discount.discount_value) / 100;
        if (discount.maximum_discount && discount_amount > discount.maximum_discount) {
          discount_amount = discount.maximum_discount;
        }
      } else if (discount.discount_type === 'fixed') {
        discount_amount = Math.min(discount.discount_value, order_value);
      }

      // Update usage count
      await client.query(
        'UPDATE discount_codes SET usage_count = usage_count + 1 WHERE code_id = $1',
        [discount.code_id]
      );

      return {
        valid: true,
        discount_amount,
        discount_type: discount.discount_type,
        message: 'Discount applied successfully'
      };

    } catch (error) {
      this.logger.error('Error applying discount code', { error, code });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get tiered pricing for a product
   */
  async getTieredPricing(
    company_id: number,
    product_id: number
  ): Promise<TierPricing[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          min_quantity,
          max_quantity,
          price,
          discount_percentage
        FROM product_pricing_tiers
        WHERE company_id = $1 AND product_id = $2
        ORDER BY min_quantity
      `;

      const result = await client.query(query, [company_id, product_id]);
      return result.rows;

    } catch (error) {
      this.logger.error('Error getting tiered pricing', { error, product_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Set customer-specific pricing
   */
  async setCustomerPricing(
    pricing: CustomerPricing & { company_id: number }
  ): Promise<CustomerPricing> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if pricing already exists
      const checkQuery = `
        SELECT pricing_id FROM customer_specific_pricing
        WHERE company_id = $1 AND account_id = $2
          AND ($3::int IS NULL OR product_id = $3)
          AND ($4::int IS NULL OR category_id = $4)
      `;

      const existing = await client.query(checkQuery, [
        pricing.company_id,
        pricing.account_id,
        pricing.product_id || null,
        pricing.category_id || null
      ]);

      let result;
      if (existing.rows.length > 0) {
        // Update existing
        const updateQuery = `
          UPDATE customer_specific_pricing
          SET discount_percentage = $2,
              special_price = $3,
              price_list_id = $4,
              updated_at = NOW()
          WHERE pricing_id = $1
          RETURNING *
        `;

        result = await client.query(updateQuery, [
          existing.rows[0].pricing_id,
          pricing.discount_percentage,
          pricing.special_price,
          pricing.price_list_id
        ]);
      } else {
        // Insert new
        const insertQuery = `
          INSERT INTO customer_specific_pricing (
            company_id, account_id, product_id, category_id,
            discount_percentage, special_price, price_list_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;

        result = await client.query(insertQuery, [
          pricing.company_id,
          pricing.account_id,
          pricing.product_id || null,
          pricing.category_id || null,
          pricing.discount_percentage,
          pricing.special_price,
          pricing.price_list_id
        ]);
      }

      await client.query('COMMIT');
      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error setting customer pricing', { error, pricing });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate bundle pricing
   */
  async calculateBundlePrice(
    company_id: number,
    bundle_id: number,
    quantity: number = 1
  ): Promise<{
    total_price: number;
    savings: number;
    items: Array<{
      product_id: number;
      product_name: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }>;
  }> {
    const client = await this.pool.connect();

    try {
      // Get bundle details
      const bundleQuery = `
        SELECT
          pb.*,
          pbi.product_id,
          pbi.quantity as item_quantity,
          pbi.discount_percentage,
          p.name as product_name,
          p.base_price
        FROM product_bundles pb
        JOIN product_bundle_items pbi ON pb.bundle_id = pbi.bundle_id
        JOIN products p ON pbi.product_id = p.product_id
        WHERE pb.bundle_id = $1 AND pb.company_id = $2 AND pb.is_active = true
      `;

      const bundleResult = await client.query(bundleQuery, [bundle_id, company_id]);

      if (bundleResult.rows.length === 0) {
        throw new Error(`Bundle ${bundle_id} not found or inactive`);
      }

      const bundle = bundleResult.rows[0];
      const items: any[] = [];
      let total_regular_price = 0;
      let total_bundle_price = 0;

      // Calculate prices for each item
      for (const item of bundleResult.rows) {
        const regular_price = item.base_price * item.item_quantity;
        const discount = (item.discount_percentage || bundle.discount_percentage || 0) / 100;
        const discounted_price = regular_price * (1 - discount);

        items.push({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.item_quantity * quantity,
          unit_price: item.base_price * (1 - discount),
          subtotal: discounted_price * quantity
        });

        total_regular_price += regular_price * quantity;
        total_bundle_price += discounted_price * quantity;
      }

      return {
        total_price: total_bundle_price,
        savings: total_regular_price - total_bundle_price,
        items
      };

    } catch (error) {
      this.logger.error('Error calculating bundle price', { error, bundle_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get price history for a product
   */
  async getPriceHistory(
    company_id: number,
    product_id: number,
    start_date?: Date,
    end_date?: Date
  ): Promise<Array<{
    price: number;
    effective_date: Date;
    changed_by: number;
    reason?: string;
  }>> {
    const client = await this.pool.connect();

    try {
      let query = `
        SELECT
          price,
          effective_date,
          changed_by,
          reason
        FROM product_price_history
        WHERE company_id = $1 AND product_id = $2
      `;

      const params: any[] = [company_id, product_id];

      if (start_date) {
        query += ` AND effective_date >= $${params.length + 1}`;
        params.push(start_date);
      }

      if (end_date) {
        query += ` AND effective_date <= $${params.length + 1}`;
        params.push(end_date);
      }

      query += ` ORDER BY effective_date DESC`;

      const result = await client.query(query, params);
      return result.rows;

    } catch (error) {
      this.logger.error('Error getting price history', { error, product_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Simulate pricing for what-if scenarios
   */
  async simulatePricing(
    scenarios: Array<{
      request: PriceCalculationRequest;
      rules_to_apply?: number[];
      rules_to_exclude?: number[];
    }>
  ): Promise<Array<{
    scenario: any;
    result: PriceCalculationResult;
    impact: {
      revenue_change: number;
      margin_change: number;
      volume_estimate?: number;
    };
  }>> {
    const results = [];

    for (const scenario of scenarios) {
      // Temporarily modify rules if specified
      const originalRules = scenario.rules_to_exclude ?
        await this.deactivateRulesTemporary(scenario.rules_to_exclude) : [];

      try {
        // Calculate price with scenario conditions
        const result = await this.calculatePrice(scenario.request);

        // Estimate impact (simplified calculation)
        const basePrice = result.base_price.toNumber();
        const finalPrice = result.final_price.toNumber();
        const discountPercentage = ((basePrice - finalPrice) / basePrice) * 100;

        // Simple elasticity model (can be improved with ML)
        const priceElasticity = -1.5; // Typical for many products
        const volumeChange = (discountPercentage * priceElasticity) / 100;
        const volumeEstimate = scenario.request.quantity * (1 + volumeChange);

        const revenue_change = (finalPrice * volumeEstimate) - (basePrice * scenario.request.quantity);
        const margin_change = revenue_change * 0.4; // Assuming 40% margin

        results.push({
          scenario,
          result,
          impact: {
            revenue_change,
            margin_change,
            volume_estimate: volumeEstimate
          }
        });

      } finally {
        // Restore original rules
        if (originalRules.length > 0) {
          await this.restoreRules(originalRules);
        }
      }
    }

    return results;
  }

  /**
   * Get pricing analytics
   */
  async getPricingAnalytics(
    company_id: number,
    period: 'day' | 'week' | 'month' | 'quarter' = 'month'
  ): Promise<{
    average_discount: number;
    total_discounts_given: number;
    most_used_rules: Array<{ rule_id: number; rule_name: string; usage_count: number }>;
    conversion_by_discount: Array<{ discount_range: string; conversion_rate: number }>;
    revenue_impact: number;
  }> {
    const client = await this.pool.connect();

    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (period) {
        case 'day':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
      }

      // Get discount statistics
      const statsQuery = `
        SELECT
          AVG(discount_percentage) as avg_discount,
          SUM(discount_amount) as total_discounts,
          COUNT(DISTINCT quote_id) as quotes_with_discount
        FROM quote_items
        WHERE company_id = $1
          AND created_at BETWEEN $2 AND $3
          AND discount_percentage > 0
      `;

      const statsResult = await client.query(statsQuery, [company_id, startDate, endDate]);

      // Get most used pricing rules
      const rulesQuery = `
        SELECT
          pr.rule_id,
          pr.rule_name,
          COUNT(*) as usage_count
        FROM pricing_rules pr
        JOIN quote_items qi ON qi.metadata->>'applied_rules' LIKE '%' || pr.rule_id || '%'
        WHERE pr.company_id = $1
          AND qi.created_at BETWEEN $2 AND $3
        GROUP BY pr.rule_id, pr.rule_name
        ORDER BY usage_count DESC
        LIMIT 10
      `;

      const rulesResult = await client.query(rulesQuery, [company_id, startDate, endDate]);

      // Calculate conversion by discount range
      const conversionQuery = `
        WITH discount_ranges AS (
          SELECT
            CASE
              WHEN discount_percentage = 0 THEN '0%'
              WHEN discount_percentage <= 10 THEN '1-10%'
              WHEN discount_percentage <= 20 THEN '11-20%'
              WHEN discount_percentage <= 30 THEN '21-30%'
              ELSE '30%+'
            END as discount_range,
            q.quote_id,
            q.status = 'accepted' as converted
          FROM quotes q
          JOIN quote_items qi ON q.quote_id = qi.quote_id
          WHERE q.company_id = $1
            AND q.created_at BETWEEN $2 AND $3
        )
        SELECT
          discount_range,
          AVG(CASE WHEN converted THEN 1 ELSE 0 END) * 100 as conversion_rate
        FROM discount_ranges
        GROUP BY discount_range
        ORDER BY discount_range
      `;

      const conversionResult = await client.query(conversionQuery, [company_id, startDate, endDate]);

      // Calculate revenue impact
      const revenueQuery = `
        SELECT
          SUM(CASE WHEN discount_percentage > 0 THEN total_price ELSE 0 END) as revenue_with_discount,
          SUM(CASE WHEN discount_percentage = 0 THEN total_price ELSE 0 END) as revenue_without_discount
        FROM quote_items
        WHERE company_id = $1
          AND created_at BETWEEN $2 AND $3
      `;

      const revenueResult = await client.query(revenueQuery, [company_id, startDate, endDate]);

      const revenue_impact =
        (revenueResult.rows[0].revenue_with_discount || 0) -
        (revenueResult.rows[0].revenue_without_discount || 0);

      return {
        average_discount: parseFloat(statsResult.rows[0].avg_discount) || 0,
        total_discounts_given: parseFloat(statsResult.rows[0].total_discounts) || 0,
        most_used_rules: rulesResult.rows,
        conversion_by_discount: conversionResult.rows,
        revenue_impact
      };

    } catch (error) {
      this.logger.error('Error getting pricing analytics', { error, company_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Helper: Temporarily deactivate rules
   */
  private async deactivateRulesTemporary(rule_ids: number[]): Promise<any[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE pricing_rules
        SET is_active = false
        WHERE rule_id = ANY($1)
        RETURNING rule_id, is_active
      `;
      const result = await client.query(query, [rule_ids]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Helper: Restore rules
   */
  private async restoreRules(rules: any[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      for (const rule of rules) {
        await client.query(
          'UPDATE pricing_rules SET is_active = $1 WHERE rule_id = $2',
          [rule.is_active, rule.rule_id]
        );
      }
    } finally {
      client.release();
    }
  }

  /**
   * Optimize pricing rules based on performance
   */
  async optimizePricingRules(
    company_id: number,
    optimization_goal: 'revenue' | 'conversion' | 'margin' = 'revenue'
  ): Promise<{
    recommendations: Array<{
      rule_id: number;
      current_value: any;
      recommended_value: any;
      expected_impact: number;
      confidence: number;
    }>;
  }> {
    const analytics = await this.getPricingAnalytics(company_id, 'quarter');
    const recommendations = [];

    // Analyze rule performance and suggest optimizations
    for (const rule of analytics.most_used_rules) {
      // Simple optimization logic (can be enhanced with ML)
      const recommendation = {
        rule_id: rule.rule_id,
        current_value: null,
        recommended_value: null,
        expected_impact: 0,
        confidence: 0.75
      };

      // Based on goal, suggest different optimizations
      if (optimization_goal === 'revenue') {
        // Suggest slight discount reduction for frequently used rules
        recommendation.recommended_value = 'Reduce discount by 2-3%';
        recommendation.expected_impact = rule.usage_count * 100; // Simplified
      } else if (optimization_goal === 'conversion') {
        // Suggest targeted discounts
        recommendation.recommended_value = 'Increase discount for low-converting segments';
        recommendation.expected_impact = 15; // % improvement estimate
      }

      recommendations.push(recommendation);
    }

    return { recommendations };
  }
}