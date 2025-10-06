/**
 * @deprecated Sprint 19 - Usar implementación Sprint 20 en product-quote/
 * Este archivo será eliminado en futuras versiones
 * Ver: backend/src/modules/crm/product-quote/pricing/ (repositorio por implementar)
 *
 * Pricing Rule Repository - Sprint 19
 * Handles pricing rules and dynamic pricing operations
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { CRMBaseRepository } from './CRMBaseRepository';

export interface PricingRule {
  rule_id?: number;
  company_id: number;
  rule_name: string;
  description?: string;
  rule_type: PricingRuleType;
  scope: PricingScope;
  conditions: any;
  action_type: PricingActionType;
  action_value: any;
  priority?: number;
  stop_further_rules?: boolean;
  valid_from?: Date;
  valid_until?: Date;
  is_active?: boolean;
  requires_approval?: boolean;
  tags?: string[];
  metadata?: any;
  created_at?: Date;
  updated_at?: Date;
  created_by?: number;
  updated_by?: number;
}

export interface PriceList {
  price_list_id?: number;
  company_id: number;
  name: string;
  description?: string;
  list_type: PriceListType;
  customer_id?: number;
  territory_id?: number;
  channel_code?: string;
  currency_code?: string;
  valid_from?: Date;
  valid_until?: Date;
  priority?: number;
  is_active?: boolean;
  metadata?: any;
}

export interface PriceListItem {
  item_id?: number;
  price_list_id: number;
  product_id: number;
  variation_id?: number;
  price: number;
  min_quantity?: number;
  max_quantity?: number;
  discount_percentage?: number;
  discount_amount?: number;
  cost_override?: number;
  is_active?: boolean;
  notes?: string;
}

export interface DiscountCode {
  code_id?: number;
  company_id: number;
  code: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  applies_to?: DiscountAppliesTo;
  product_ids?: number[];
  category_ids?: number[];
  min_purchase_amount?: number;
  max_discount_amount?: number;
  usage_limit_total?: number;
  usage_limit_per_customer?: number;
  valid_from?: Date;
  valid_until?: Date;
  customer_groups?: string[];
  excluded_products?: number[];
  stackable?: boolean;
  is_active?: boolean;
  times_used?: number;
  total_discount_given?: number;
}

export interface PricingContext {
  customer_id?: number;
  customer_group?: string;
  territory_id?: number;
  channel?: string;
  quantity?: number;
  product_ids?: number[];
  category_ids?: number[];
  date?: Date;
  currency_code?: string;
  total_amount?: number;
}

export type PricingRuleType = 'volume' | 'tiered' | 'customer_group' | 'time_based' | 'bundle' | 'promotion';
export type PricingScope = 'global' | 'category' | 'product' | 'customer';
export type PricingActionType = 'discount_percentage' | 'discount_fixed' | 'price_override' | 'tiered_pricing';
export type PriceListType = 'standard' | 'customer' | 'territory' | 'channel';
export type DiscountType = 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_shipping';
export type DiscountAppliesTo = 'order' | 'products' | 'categories' | 'shipping';

@injectable()
export class PricingRuleRepository extends CRMBaseRepository<PricingRule> {
  constructor(
    @inject(TYPES.CRMDatabaseConnection) db: IDatabaseConnection,
    @inject(TYPES.Logger) logger: Logger
  ) {
    super('pricing_rules', db, logger);
  }

  /**
   * Create a pricing rule
   */
  async createRule(rule: PricingRule, userId?: number): Promise<PricingRule> {
    const query = `
      INSERT INTO pricing_rules (
        company_id, rule_name, description, rule_type, scope,
        conditions, action_type, action_value, priority, stop_further_rules,
        valid_from, valid_until, is_active, requires_approval, tags, metadata,
        created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    const values = [
      rule.company_id,
      rule.rule_name,
      rule.description,
      rule.rule_type,
      rule.scope || 'global',
      JSON.stringify(rule.conditions),
      rule.action_type,
      JSON.stringify(rule.action_value),
      rule.priority || 0,
      rule.stop_further_rules || false,
      rule.valid_from,
      rule.valid_until,
      rule.is_active ?? true,
      rule.requires_approval || false,
      rule.tags,
      JSON.stringify(rule.metadata || {}),
      userId || rule.created_by,
      userId || rule.updated_by
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Update a pricing rule
   */
  async updateRule(
    ruleId: number,
    updates: Partial<PricingRule>,
    userId?: number
  ): Promise<PricingRule> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'rule_id' && value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        if (key === 'conditions' || key === 'action_value' || key === 'metadata') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramCount++;
      }
    });

    if (userId) {
      fields.push(`updated_by = $${paramCount}`);
      values.push(userId);
      paramCount++;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(ruleId);

    const query = `
      UPDATE pricing_rules
      SET ${fields.join(', ')}
      WHERE rule_id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get applicable pricing rules for a context
   */
  async getApplicableRules(context: PricingContext): Promise<PricingRule[]> {
    const currentDate = context.date || new Date();

    const query = `
      SELECT *
      FROM pricing_rules
      WHERE company_id = $1
        AND is_active = true
        AND (valid_from IS NULL OR valid_from <= $2)
        AND (valid_until IS NULL OR valid_until >= $2)
      ORDER BY priority DESC, rule_id
    `;

    const result = await this.db.query(query, [
      context.customer_id, // Assuming company_id is derived from customer
      currentDate
    ]);

    // Filter rules based on conditions
    return result.rows.filter(rule => {
      const conditions = JSON.parse(rule.conditions);
      return this.evaluateConditions(conditions, context);
    });
  }

  /**
   * Evaluate rule conditions
   */
  private evaluateConditions(conditions: any, context: PricingContext): boolean {
    if (!conditions || Object.keys(conditions).length === 0) {
      return true;
    }

    // Check quantity conditions
    if (conditions.min_quantity && context.quantity) {
      if (context.quantity < conditions.min_quantity) return false;
    }
    if (conditions.max_quantity && context.quantity) {
      if (context.quantity > conditions.max_quantity) return false;
    }

    // Check customer group
    if (conditions.customer_groups && conditions.customer_groups.length > 0) {
      if (!context.customer_group || !conditions.customer_groups.includes(context.customer_group)) {
        return false;
      }
    }

    // Check product categories
    if (conditions.product_categories && context.category_ids) {
      const hasMatch = context.category_ids.some(id =>
        conditions.product_categories.includes(id)
      );
      if (!hasMatch) return false;
    }

    // Check custom conditions
    if (conditions.custom_conditions) {
      for (const condition of conditions.custom_conditions) {
        if (!this.evaluateCustomCondition(condition, context)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Evaluate custom condition
   */
  private evaluateCustomCondition(condition: any, context: any): boolean {
    const { field, operator, value } = condition;
    const contextValue = this.getNestedValue(context, field);

    switch (operator) {
      case 'eq':
        return contextValue === value;
      case 'ne':
        return contextValue !== value;
      case 'gt':
        return contextValue > value;
      case 'gte':
        return contextValue >= value;
      case 'lt':
        return contextValue < value;
      case 'lte':
        return contextValue <= value;
      case 'in':
        return Array.isArray(value) && value.includes(contextValue);
      case 'nin':
        return Array.isArray(value) && !value.includes(contextValue);
      case 'contains':
        return String(contextValue).includes(value);
      default:
        return false;
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    return value;
  }

  /**
   * Update rule priority
   */
  async updateRulePriority(ruleId: number, priority: number): Promise<void> {
    await this.db.query(
      `UPDATE pricing_rules SET priority = $1 WHERE rule_id = $2`,
      [priority, ruleId]
    );
  }

  /**
   * Create a price list
   */
  async createPriceList(priceList: PriceList, userId?: number): Promise<PriceList> {
    const query = `
      INSERT INTO price_lists (
        company_id, name, description, list_type, customer_id,
        territory_id, channel_code, currency_code, valid_from, valid_until,
        priority, is_active, metadata, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      priceList.company_id,
      priceList.name,
      priceList.description,
      priceList.list_type || 'standard',
      priceList.customer_id,
      priceList.territory_id,
      priceList.channel_code,
      priceList.currency_code || 'USD',
      priceList.valid_from,
      priceList.valid_until,
      priceList.priority || 0,
      priceList.is_active ?? true,
      JSON.stringify(priceList.metadata || {}),
      userId,
      userId
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Add item to price list
   */
  async addPriceListItem(item: PriceListItem): Promise<PriceListItem> {
    const query = `
      INSERT INTO price_list_items (
        price_list_id, product_id, variation_id, price,
        min_quantity, max_quantity, discount_percentage, discount_amount,
        cost_override, is_active, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      item.price_list_id,
      item.product_id,
      item.variation_id,
      item.price,
      item.min_quantity || 1,
      item.max_quantity,
      item.discount_percentage,
      item.discount_amount,
      item.cost_override,
      item.is_active ?? true,
      item.notes
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get price lists by criteria
   */
  async getPriceLists(criteria: {
    company_id: number;
    customer_id?: number;
    territory_id?: number;
    channel?: string;
    is_active?: boolean;
  }): Promise<PriceList[]> {
    const conditions = ['company_id = $1'];
    const params: any[] = [criteria.company_id];
    let paramCount = 2;

    if (criteria.customer_id) {
      conditions.push(`(customer_id = $${paramCount} OR customer_id IS NULL)`);
      params.push(criteria.customer_id);
      paramCount++;
    }

    if (criteria.territory_id) {
      conditions.push(`(territory_id = $${paramCount} OR territory_id IS NULL)`);
      params.push(criteria.territory_id);
      paramCount++;
    }

    if (criteria.channel) {
      conditions.push(`(channel_code = $${paramCount} OR channel_code IS NULL)`);
      params.push(criteria.channel);
      paramCount++;
    }

    if (criteria.is_active !== undefined) {
      conditions.push(`is_active = $${paramCount}`);
      params.push(criteria.is_active);
      paramCount++;
    }

    const query = `
      SELECT * FROM price_lists
      WHERE ${conditions.join(' AND ')}
      ORDER BY priority DESC, price_list_id
    `;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Create a discount code
   */
  async createDiscountCode(code: DiscountCode, userId?: number): Promise<DiscountCode> {
    const query = `
      INSERT INTO discount_codes (
        company_id, code, description, discount_type, discount_value,
        applies_to, product_ids, category_ids, min_purchase_amount,
        max_discount_amount, usage_limit_total, usage_limit_per_customer,
        valid_from, valid_until, customer_groups, excluded_products,
        stackable, is_active, metadata, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `;

    const values = [
      code.company_id,
      code.code,
      code.description,
      code.discount_type,
      code.discount_value,
      code.applies_to || 'order',
      code.product_ids,
      code.category_ids,
      code.min_purchase_amount,
      code.max_discount_amount,
      code.usage_limit_total,
      code.usage_limit_per_customer,
      code.valid_from,
      code.valid_until,
      code.customer_groups,
      code.excluded_products,
      code.stackable || false,
      code.is_active ?? true,
      JSON.stringify({}),
      userId,
      userId
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Validate discount code
   */
  async validateDiscountCode(
    code: string,
    companyId: number,
    customerId?: number
  ): Promise<{ valid: boolean; code?: DiscountCode; reason?: string }> {
    // Get the discount code
    const codeResult = await this.db.query(
      `SELECT * FROM discount_codes
       WHERE code = $1 AND company_id = $2 AND is_active = true`,
      [code, companyId]
    );

    if (codeResult.rows.length === 0) {
      return { valid: false, reason: 'Invalid discount code' };
    }

    const discountCode = codeResult.rows[0];
    const now = new Date();

    // Check validity dates
    if (discountCode.valid_from && new Date(discountCode.valid_from) > now) {
      return { valid: false, reason: 'Discount code not yet valid' };
    }

    if (discountCode.valid_until && new Date(discountCode.valid_until) < now) {
      return { valid: false, reason: 'Discount code has expired' };
    }

    // Check usage limits
    if (discountCode.usage_limit_total && discountCode.times_used >= discountCode.usage_limit_total) {
      return { valid: false, reason: 'Discount code usage limit reached' };
    }

    // Check customer usage limit
    if (customerId && discountCode.usage_limit_per_customer) {
      const usageResult = await this.db.query(
        `SELECT COUNT(*) as count
         FROM discount_code_usage
         WHERE code_id = $1 AND customer_id = $2`,
        [discountCode.code_id, customerId]
      );

      if (usageResult.rows[0].count >= discountCode.usage_limit_per_customer) {
        return { valid: false, reason: 'Customer usage limit reached' };
      }
    }

    return { valid: true, code: discountCode };
  }

  /**
   * Record discount code usage
   */
  async recordDiscountUsage(
    codeId: number,
    customerId: number,
    orderId: number,
    discountAmount: number,
    orderAmount: number
  ): Promise<void> {
    const client = await this.db.getClient();

    try {
      await client.query('BEGIN');

      // Record usage
      await client.query(
        `INSERT INTO discount_code_usage (
          code_id, customer_id, order_id, discount_amount, order_amount
        )
        VALUES ($1, $2, $3, $4, $5)`,
        [codeId, customerId, orderId, discountAmount, orderAmount]
      );

      // Update usage statistics
      await client.query(
        `UPDATE discount_codes
         SET times_used = times_used + 1,
             total_discount_given = total_discount_given + $1
         WHERE code_id = $2`,
        [discountAmount, codeId]
      );

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get tax rules
   */
  async getTaxRules(criteria: {
    company_id: number;
    country_code?: string;
    state_province?: string;
    tax_type?: string;
  }): Promise<any[]> {
    const conditions = ['company_id = $1', 'is_active = true'];
    const params: any[] = [criteria.company_id];
    let paramCount = 2;

    if (criteria.country_code) {
      conditions.push(`country_code = $${paramCount}`);
      params.push(criteria.country_code);
      paramCount++;
    }

    if (criteria.state_province) {
      conditions.push(`state_province = $${paramCount}`);
      params.push(criteria.state_province);
      paramCount++;
    }

    if (criteria.tax_type) {
      conditions.push(`tax_type = $${paramCount}`);
      params.push(criteria.tax_type);
      paramCount++;
    }

    const query = `
      SELECT * FROM tax_rules
      WHERE ${conditions.join(' AND ')}
      ORDER BY country_code, state_province
    `;

    const result = await this.db.query(query, params);
    return result.rows;
  }
}