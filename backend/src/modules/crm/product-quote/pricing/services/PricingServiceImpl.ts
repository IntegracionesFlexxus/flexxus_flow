/**
 * Pricing Service Implementation - Sprint 20
 * Complete implementation of pricing rules and calculations
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool, PoolClient } from 'pg';
import { Logger } from 'winston';
import { Redis } from 'ioredis';
import * as moment from 'moment';

export interface PriceCalculation {
  product_id: number;
  quantity: number;
  base_price: number;
  list_price?: number;
  calculated_price: number;
  discounts: DiscountApplication[];
  final_price: number;
  currency: string;
  price_list_id?: number;
  customer_segment?: string;
  margin?: number;
  margin_percentage?: number;
  tax_amount?: number;
  total_with_tax?: number;
  metadata?: any;
}

export interface DiscountApplication {
  rule_id?: number;
  rule_name: string;
  type: 'percentage' | 'fixed' | 'volume' | 'bundle' | 'promotion';
  value: number;
  amount: number;
  priority: number;
  stackable: boolean;
  applied: boolean;
  reason?: string;
}

export interface PricingRule {
  id?: number;
  name: string;
  description?: string;
  rule_type: 'volume' | 'customer_type' | 'promotion' | 'bundle' | 'seasonal' | 'clearance';
  conditions: RuleConditions;
  actions: RuleActions;
  priority: number;
  valid_from?: Date;
  valid_to?: Date;
  usage_limit?: number;
  usage_count?: number;
  coupon_code?: string;
  is_stackable: boolean;
  is_active: boolean;
}

export interface RuleConditions {
  product_ids?: number[];
  category_ids?: number[];
  customer_segments?: string[];
  min_quantity?: number;
  max_quantity?: number;
  min_order_value?: number;
  max_order_value?: number;
  date_range?: {
    start: Date;
    end: Date;
  };
  custom_conditions?: any;
}

export interface RuleActions {
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_discount_amount?: number;
  apply_to?: 'product' | 'order' | 'shipping';
  free_shipping?: boolean;
  bonus_products?: number[];
  custom_actions?: any;
}

export interface PriceList {
  id?: number;
  name: string;
  description?: string;
  currency: string;
  is_default: boolean;
  valid_from?: Date;
  valid_to?: Date;
  conditions?: any;
  priority: number;
  customer_segment?: string;
  min_order_value?: number;
  is_active: boolean;
  items?: PriceListItem[];
}

export interface PriceListItem {
  id?: number;
  price_list_id: number;
  product_id?: number;
  variant_id?: number;
  price: number;
  min_quantity?: number;
  max_quantity?: number;
  discount_percentage?: number;
  discount_amount?: number;
  tier_pricing?: TierPrice[];
}

export interface TierPrice {
  min_quantity: number;
  max_quantity?: number;
  price: number;
  discount_percentage?: number;
}

export interface VolumeDiscount {
  product_id: number;
  tiers: Array<{
    min_quantity: number;
    max_quantity?: number;
    discount_percentage: number;
    discount_amount?: number;
    price?: number;
  }>;
}

export interface CustomerPricing {
  customer_id: number;
  customer_segment?: string;
  products: Array<{
    product_id: number;
    special_price?: number;
    discount_percentage?: number;
    valid_from?: Date;
    valid_to?: Date;
  }>;
  global_discount?: number;
  payment_terms?: string;
  credit_limit?: number;
}

export interface PriceSimulation {
  scenario_name: string;
  products: Array<{
    product_id: number;
    quantity: number;
  }>;
  customer_segment?: string;
  applied_rules?: number[];
  coupon_codes?: string[];
  date?: Date;
  results?: {
    original_total: number;
    discounted_total: number;
    total_discount: number;
    applied_discounts: DiscountApplication[];
    warnings?: string[];
  };
}

@injectable()
export class PricingServiceImpl {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly MAX_DISCOUNT_STACK = 3;

  constructor(
    @inject(TYPES.CrmConnection) private pool: Pool,
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.RedisClient) private redis: Redis
  ) {}

  /**
   * Calculate price for a product with all applicable rules
   */
  async calculatePrice(
    productId: number,
    quantity: number,
    customerId?: number,
    conditions?: any
  ): Promise<PriceCalculation> {
    const cacheKey = `pricing:${productId}:${quantity}:${customerId || 'guest'}`;

    // Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached && !conditions?.skipCache) {
      return JSON.parse(cached);
    }

    const client = await this.pool.connect();
    try {
      // Get product base price and cost
      const product = await this.getProductPricing(client, productId);

      if (!product) {
        throw new Error('Product not found');
      }

      let calculation: PriceCalculation = {
        product_id: productId,
        quantity,
        base_price: product.base_price,
        list_price: product.base_price,
        calculated_price: product.base_price * quantity,
        discounts: [],
        final_price: product.base_price * quantity,
        currency: product.currency || 'USD',
        margin: 0,
        margin_percentage: 0
      };

      // Get customer segment if customerId provided
      let customerSegment: string | undefined;
      if (customerId) {
        customerSegment = await this.getCustomerSegment(client, customerId);
        calculation.customer_segment = customerSegment;
      }

      // Apply price list pricing
      const priceListPrice = await this.getPriceListPrice(
        client,
        productId,
        quantity,
        customerSegment
      );

      if (priceListPrice) {
        calculation.list_price = priceListPrice.price;
        calculation.calculated_price = priceListPrice.price * quantity;
        calculation.price_list_id = priceListPrice.price_list_id;
      }

      // Get all applicable pricing rules
      const applicableRules = await this.getApplicableRules(
        client,
        productId,
        quantity,
        customerSegment,
        conditions
      );

      // Sort rules by priority
      applicableRules.sort((a, b) => b.priority - a.priority);

      // Apply rules
      let totalDiscount = 0;
      let stackCount = 0;

      for (const rule of applicableRules) {
        if (stackCount >= this.MAX_DISCOUNT_STACK && !rule.is_stackable) {
          continue;
        }

        const discount = await this.applyPricingRule(
          calculation,
          rule,
          quantity
        );

        if (discount.applied) {
          calculation.discounts.push(discount);
          totalDiscount += discount.amount;

          if (rule.is_stackable) {
            stackCount++;
          }
        }
      }

      // Calculate final price
      calculation.final_price = Math.max(
        0,
        calculation.calculated_price - totalDiscount
      );

      // Calculate margin
      if (product.cost) {
        const totalCost = product.cost * quantity;
        calculation.margin = calculation.final_price - totalCost;
        calculation.margin_percentage = (calculation.margin / calculation.final_price) * 100;
      }

      // Calculate tax if applicable
      if (conditions?.includeTax) {
        const taxRate = conditions.taxRate || 0.10; // 10% default
        calculation.tax_amount = calculation.final_price * taxRate;
        calculation.total_with_tax = calculation.final_price + calculation.tax_amount;
      }

      // Cache the result
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(calculation));

      // Log pricing calculation for analytics
      await this.logPricingCalculation(client, calculation);

      return calculation;
    } finally {
      client.release();
    }
  }

  /**
   * Apply pricing rules to calculate discounts
   */
  async applyPricingRules(
    basePrice: number,
    rules: PricingRule[]
  ): Promise<{
    finalPrice: number;
    appliedDiscounts: DiscountApplication[];
  }> {
    let currentPrice = basePrice;
    const appliedDiscounts: DiscountApplication[] = [];

    for (const rule of rules) {
      const discount = this.calculateRuleDiscount(currentPrice, rule);

      if (discount.amount > 0) {
        appliedDiscounts.push(discount);
        currentPrice -= discount.amount;
      }
    }

    return {
      finalPrice: Math.max(0, currentPrice),
      appliedDiscounts
    };
  }

  /**
   * Get volume discounts for a product
   */
  async getVolumeDiscounts(
    productId: number,
    quantity: number
  ): Promise<VolumeDiscount | null> {
    const client = await this.pool.connect();
    try {
      // Get tier pricing from price list items
      const query = `
        SELECT
          pli.*,
          pl.name as price_list_name
        FROM price_list_items pli
        JOIN price_lists pl ON pli.price_list_id = pl.id
        WHERE pli.product_id = $1
          AND pl.is_active = true
          AND (pl.valid_from IS NULL OR pl.valid_from <= CURRENT_DATE)
          AND (pl.valid_to IS NULL OR pl.valid_to >= CURRENT_DATE)
          AND pli.tier_pricing IS NOT NULL
        ORDER BY pl.priority DESC
        LIMIT 1
      `;

      const result = await client.query(query, [productId]);

      if (result.rows.length === 0) {
        return null;
      }

      const item = result.rows[0];
      const tiers = item.tier_pricing || [];

      // Find applicable tier
      const applicableTier = tiers.find((tier: any) =>
        tier.min_quantity <= quantity &&
        (!tier.max_quantity || tier.max_quantity >= quantity)
      );

      if (!applicableTier) {
        return null;
      }

      return {
        product_id: productId,
        tiers: tiers.map((tier: any) => ({
          min_quantity: tier.min_quantity,
          max_quantity: tier.max_quantity,
          discount_percentage: tier.discount_percentage || 0,
          discount_amount: tier.discount_amount,
          price: tier.price
        }))
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get customer-specific pricing
   */
  async getCustomerSpecificPricing(
    customerId: number,
    productIds: number[]
  ): Promise<CustomerPricing> {
    const client = await this.pool.connect();
    try {
      // Get customer segment and details
      const customerQuery = `
        SELECT
          c.id,
          c.customer_segment,
          c.payment_terms,
          c.credit_limit,
          c.global_discount_percentage
        FROM customers c
        WHERE c.id = $1
      `;

      const customerResult = await client.query(customerQuery, [customerId]);

      if (customerResult.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const customer = customerResult.rows[0];

      // Get customer-specific product pricing
      const productsQuery = `
        SELECT
          csp.product_id,
          csp.special_price,
          csp.discount_percentage,
          csp.valid_from,
          csp.valid_to
        FROM customer_special_pricing csp
        WHERE csp.customer_id = $1
          AND csp.product_id = ANY($2)
          AND csp.is_active = true
          AND (csp.valid_from IS NULL OR csp.valid_from <= CURRENT_DATE)
          AND (csp.valid_to IS NULL OR csp.valid_to >= CURRENT_DATE)
      `;

      const productsResult = await client.query(productsQuery, [customerId, productIds]);

      return {
        customer_id: customerId,
        customer_segment: customer.customer_segment,
        products: productsResult.rows.map(row => ({
          product_id: row.product_id,
          special_price: row.special_price,
          discount_percentage: row.discount_percentage,
          valid_from: row.valid_from,
          valid_to: row.valid_to
        })),
        global_discount: customer.global_discount_percentage,
        payment_terms: customer.payment_terms,
        credit_limit: customer.credit_limit
      };
    } finally {
      client.release();
    }
  }

  /**
   * Simulate pricing for a set of products
   */
  async simulatePricing(simulationData: PriceSimulation): Promise<PriceSimulation> {
    const client = await this.pool.connect();
    try {
      let originalTotal = 0;
      let discountedTotal = 0;
      const allDiscounts: DiscountApplication[] = [];
      const warnings: string[] = [];

      // Calculate pricing for each product
      for (const item of simulationData.products) {
        const product = await this.getProductPricing(client, item.product_id);

        if (!product) {
          warnings.push(`Product ${item.product_id} not found`);
          continue;
        }

        const itemOriginalPrice = product.base_price * item.quantity;
        originalTotal += itemOriginalPrice;

        // Calculate with conditions
        const calculation = await this.calculatePrice(
          item.product_id,
          item.quantity,
          undefined,
          {
            customer_segment: simulationData.customer_segment,
            applied_rules: simulationData.applied_rules,
            coupon_codes: simulationData.coupon_codes,
            simulation_date: simulationData.date,
            skipCache: true
          }
        );

        discountedTotal += calculation.final_price;
        allDiscounts.push(...calculation.discounts);
      }

      // Validate coupon codes
      if (simulationData.coupon_codes) {
        for (const code of simulationData.coupon_codes) {
          const isValid = await this.validateCouponCode(client, code);
          if (!isValid) {
            warnings.push(`Invalid coupon code: ${code}`);
          }
        }
      }

      simulationData.results = {
        original_total: originalTotal,
        discounted_total: discountedTotal,
        total_discount: originalTotal - discountedTotal,
        applied_discounts: allDiscounts,
        warnings: warnings.length > 0 ? warnings : undefined
      };

      // Log simulation for analytics
      await this.logPricingSimulation(client, simulationData);

      return simulationData;
    } finally {
      client.release();
    }
  }

  /**
   * Manage price lists (CRUD operations)
   */
  async managePriceLists(operations: {
    action: 'create' | 'update' | 'delete' | 'activate' | 'deactivate';
    priceList?: PriceList;
    priceListId?: number;
  }): Promise<PriceList | { success: boolean; message: string }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      let result: any;

      switch (operations.action) {
        case 'create':
          result = await this.createPriceList(client, operations.priceList!);
          break;
        case 'update':
          result = await this.updatePriceList(client, operations.priceListId!, operations.priceList!);
          break;
        case 'delete':
          result = await this.deletePriceList(client, operations.priceListId!);
          break;
        case 'activate':
          result = await this.activatePriceList(client, operations.priceListId!, true);
          break;
        case 'deactivate':
          result = await this.activatePriceList(client, operations.priceListId!, false);
          break;
      }

      await client.query('COMMIT');

      // Clear pricing cache
      await this.clearPricingCache();

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error managing price lists', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Helper methods

  private async getProductPricing(
    client: PoolClient,
    productId: number
  ): Promise<any> {
    const query = `
      SELECT
        id,
        sku,
        name,
        base_price,
        cost,
        currency,
        tax_class,
        is_taxable
      FROM products
      WHERE id = $1
    `;

    const result = await client.query(query, [productId]);
    return result.rows[0];
  }

  private async getCustomerSegment(
    client: PoolClient,
    customerId: number
  ): Promise<string | undefined> {
    const query = `
      SELECT customer_segment
      FROM customers
      WHERE id = $1
    `;

    const result = await client.query(query, [customerId]);
    return result.rows[0]?.customer_segment;
  }

  private async getPriceListPrice(
    client: PoolClient,
    productId: number,
    quantity: number,
    customerSegment?: string
  ): Promise<any> {
    const query = `
      SELECT
        pli.price,
        pli.price_list_id,
        pli.tier_pricing
      FROM price_list_items pli
      JOIN price_lists pl ON pli.price_list_id = pl.id
      WHERE pli.product_id = $1
        AND pl.is_active = true
        AND (pl.customer_segment IS NULL OR pl.customer_segment = $2)
        AND (pli.min_quantity IS NULL OR pli.min_quantity <= $3)
        AND (pli.max_quantity IS NULL OR pli.max_quantity >= $3)
        AND (pl.valid_from IS NULL OR pl.valid_from <= CURRENT_DATE)
        AND (pl.valid_to IS NULL OR pl.valid_to >= CURRENT_DATE)
      ORDER BY
        pl.priority DESC,
        pli.min_quantity DESC
      LIMIT 1
    `;

    const result = await client.query(query, [productId, customerSegment, quantity]);

    if (result.rows.length === 0) {
      return null;
    }

    const item = result.rows[0];

    // Check tier pricing
    if (item.tier_pricing && item.tier_pricing.length > 0) {
      const tier = item.tier_pricing.find((t: any) =>
        t.min_quantity <= quantity &&
        (!t.max_quantity || t.max_quantity >= quantity)
      );

      if (tier && tier.price) {
        return {
          price: tier.price,
          price_list_id: item.price_list_id
        };
      }
    }

    return {
      price: item.price,
      price_list_id: item.price_list_id
    };
  }

  private async getApplicableRules(
    client: PoolClient,
    productId: number,
    quantity: number,
    customerSegment?: string,
    conditions?: any
  ): Promise<PricingRule[]> {
    const query = `
      SELECT *
      FROM pricing_rules
      WHERE is_active = true
        AND (valid_from IS NULL OR valid_from <= $1)
        AND (valid_to IS NULL OR valid_to >= $1)
        AND (usage_limit IS NULL OR usage_count < usage_limit)
      ORDER BY priority DESC
    `;

    const currentDate = conditions?.simulation_date || new Date();
    const result = await client.query(query, [currentDate]);

    const applicableRules: PricingRule[] = [];

    for (const rule of result.rows) {
      if (await this.isRuleApplicable(rule, productId, quantity, customerSegment, conditions)) {
        applicableRules.push(rule);
      }
    }

    return applicableRules;
  }

  private async isRuleApplicable(
    rule: any,
    productId: number,
    quantity: number,
    customerSegment?: string,
    conditions?: any
  ): Promise<boolean> {
    const ruleConditions = rule.conditions || {};

    // Check product IDs
    if (ruleConditions.product_ids && !ruleConditions.product_ids.includes(productId)) {
      return false;
    }

    // Check quantity
    if (ruleConditions.min_quantity && quantity < ruleConditions.min_quantity) {
      return false;
    }
    if (ruleConditions.max_quantity && quantity > ruleConditions.max_quantity) {
      return false;
    }

    // Check customer segment
    if (ruleConditions.customer_segments && customerSegment &&
        !ruleConditions.customer_segments.includes(customerSegment)) {
      return false;
    }

    // Check coupon code
    if (rule.coupon_code && conditions?.coupon_codes &&
        !conditions.coupon_codes.includes(rule.coupon_code)) {
      return false;
    }

    return true;
  }

  private async applyPricingRule(
    calculation: PriceCalculation,
    rule: any,
    quantity: number
  ): Promise<DiscountApplication> {
    const actions = rule.actions || {};
    let discountAmount = 0;

    if (actions.discount_type === 'percentage') {
      discountAmount = calculation.calculated_price * (actions.discount_value / 100);
      if (actions.max_discount_amount) {
        discountAmount = Math.min(discountAmount, actions.max_discount_amount);
      }
    } else if (actions.discount_type === 'fixed') {
      discountAmount = actions.discount_value * quantity;
    }

    return {
      rule_id: rule.id,
      rule_name: rule.name,
      type: rule.rule_type,
      value: actions.discount_value,
      amount: discountAmount,
      priority: rule.priority,
      stackable: rule.is_stackable,
      applied: discountAmount > 0
    };
  }

  private calculateRuleDiscount(
    currentPrice: number,
    rule: PricingRule
  ): DiscountApplication {
    let discountAmount = 0;

    if (rule.actions.discount_type === 'percentage') {
      discountAmount = currentPrice * (rule.actions.discount_value / 100);
      if (rule.actions.max_discount_amount) {
        discountAmount = Math.min(discountAmount, rule.actions.max_discount_amount);
      }
    } else if (rule.actions.discount_type === 'fixed') {
      discountAmount = rule.actions.discount_value;
    }

    return {
      rule_id: rule.id,
      rule_name: rule.name,
      type: rule.rule_type,
      value: rule.actions.discount_value,
      amount: discountAmount,
      priority: rule.priority,
      stackable: rule.is_stackable,
      applied: discountAmount > 0
    };
  }

  private async validateCouponCode(
    client: PoolClient,
    code: string
  ): Promise<boolean> {
    const query = `
      SELECT id
      FROM pricing_rules
      WHERE coupon_code = $1
        AND is_active = true
        AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP)
        AND (valid_to IS NULL OR valid_to >= CURRENT_TIMESTAMP)
        AND (usage_limit IS NULL OR usage_count < usage_limit)
    `;

    const result = await client.query(query, [code]);
    return result.rows.length > 0;
  }

  private async createPriceList(
    client: PoolClient,
    priceList: PriceList
  ): Promise<PriceList> {
    const query = `
      INSERT INTO price_lists (
        name, description, currency, is_default,
        valid_from, valid_to, conditions, priority,
        customer_segment, min_order_value, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) RETURNING *
    `;

    const values = [
      priceList.name,
      priceList.description,
      priceList.currency || 'USD',
      priceList.is_default || false,
      priceList.valid_from,
      priceList.valid_to,
      JSON.stringify(priceList.conditions || {}),
      priceList.priority || 0,
      priceList.customer_segment,
      priceList.min_order_value,
      priceList.is_active !== false
    ];

    const result = await client.query(query, values);
    const createdPriceList = result.rows[0];

    // Add price list items if provided
    if (priceList.items && priceList.items.length > 0) {
      for (const item of priceList.items) {
        await this.addPriceListItem(client, createdPriceList.id, item);
      }
    }

    this.logger.info(`Price list created: ${createdPriceList.name}`);

    return createdPriceList;
  }

  private async updatePriceList(
    client: PoolClient,
    priceListId: number,
    updates: Partial<PriceList>
  ): Promise<PriceList> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'items' && value !== undefined) {
        paramCount++;
        updateFields.push(`${key} = $${paramCount}`);
        values.push(key === 'conditions' ? JSON.stringify(value) : value);
      }
    });

    if (updateFields.length > 0) {
      paramCount++;
      values.push(priceListId);

      const query = `
        UPDATE price_lists
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      return result.rows[0];
    }

    const result = await client.query('SELECT * FROM price_lists WHERE id = $1', [priceListId]);
    return result.rows[0];
  }

  private async deletePriceList(
    client: PoolClient,
    priceListId: number
  ): Promise<{ success: boolean; message: string }> {
    await client.query('DELETE FROM price_lists WHERE id = $1', [priceListId]);
    return {
      success: true,
      message: `Price list ${priceListId} deleted successfully`
    };
  }

  private async activatePriceList(
    client: PoolClient,
    priceListId: number,
    activate: boolean
  ): Promise<{ success: boolean; message: string }> {
    await client.query(
      'UPDATE price_lists SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [activate, priceListId]
    );

    return {
      success: true,
      message: `Price list ${priceListId} ${activate ? 'activated' : 'deactivated'} successfully`
    };
  }

  private async addPriceListItem(
    client: PoolClient,
    priceListId: number,
    item: PriceListItem
  ): Promise<void> {
    const query = `
      INSERT INTO price_list_items (
        price_list_id, product_id, variant_id, price,
        min_quantity, max_quantity, discount_percentage,
        discount_amount, tier_pricing
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
    `;

    const values = [
      priceListId,
      item.product_id,
      item.variant_id,
      item.price,
      item.min_quantity,
      item.max_quantity,
      item.discount_percentage,
      item.discount_amount,
      JSON.stringify(item.tier_pricing || [])
    ];

    await client.query(query, values);
  }

  private async logPricingCalculation(
    client: PoolClient,
    calculation: PriceCalculation
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO pricing_calculation_logs (
          product_id, quantity, base_price, final_price,
          discounts_applied, customer_segment, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP
        )
      `;

      await client.query(query, [
        calculation.product_id,
        calculation.quantity,
        calculation.base_price,
        calculation.final_price,
        JSON.stringify(calculation.discounts),
        calculation.customer_segment
      ]);
    } catch (error) {
      // Ignore logging errors
    }
  }

  private async logPricingSimulation(
    client: PoolClient,
    simulation: PriceSimulation
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO pricing_simulation_logs (
          scenario_name, simulation_data, results, created_at
        ) VALUES (
          $1, $2, $3, CURRENT_TIMESTAMP
        )
      `;

      await client.query(query, [
        simulation.scenario_name,
        JSON.stringify({
          products: simulation.products,
          customer_segment: simulation.customer_segment,
          applied_rules: simulation.applied_rules,
          coupon_codes: simulation.coupon_codes
        }),
        JSON.stringify(simulation.results)
      ]);
    } catch (error) {
      // Ignore logging errors
    }
  }

  private async clearPricingCache(): Promise<void> {
    const patterns = ['pricing:*'];

    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }
}