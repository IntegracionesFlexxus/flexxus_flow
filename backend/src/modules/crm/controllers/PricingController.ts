/**
 * @deprecated Sprint 19 - Usar implementación Sprint 20 en product-quote/
 * Este archivo será eliminado en futuras versiones
 * Ver: backend/src/modules/crm/product-quote/pricing/controllers/pricing.controller.ts
 *
 * Pricing Controller - Sprint 19
 * REST API endpoints for dynamic pricing and rules management
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
import Joi from 'joi';
import { DynamicPricingEngine } from '../services/DynamicPricingEngine';
import { PricingRuleRepository } from '../repositories/PricingRuleRepository';

// Validation schemas
const pricingRuleSchema = Joi.object({
  rule_name: Joi.string().required().max(100),
  rule_type: Joi.string().valid(
    'discount', 'markup', 'fixed', 'tiered', 'bundle', 'seasonal', 'promotional'
  ).required(),
  priority: Joi.number().integer().min(0).default(0),
  conditions: Joi.object({
    product_ids: Joi.array().items(Joi.number().integer().positive()),
    category_ids: Joi.array().items(Joi.number().integer().positive()),
    account_ids: Joi.array().items(Joi.number().integer().positive()),
    min_quantity: Joi.number().min(0),
    max_quantity: Joi.number().min(0),
    min_order_value: Joi.number().min(0),
    date_range: Joi.object({
      start: Joi.date(),
      end: Joi.date()
    }),
    customer_segments: Joi.array().items(Joi.string()),
    custom_conditions: Joi.object()
  }),
  actions: Joi.object({
    discount_percentage: Joi.number().min(0).max(100),
    discount_amount: Joi.number().min(0),
    fixed_price: Joi.number().min(0),
    markup_percentage: Joi.number(),
    tier_prices: Joi.array().items(Joi.object({
      min_quantity: Joi.number().min(0).required(),
      max_quantity: Joi.number().min(0),
      price: Joi.number().min(0),
      discount_percentage: Joi.number().min(0).max(100)
    }))
  }).required(),
  description: Joi.string().max(500),
  is_active: Joi.boolean().default(true),
  effective_from: Joi.date(),
  effective_to: Joi.date(),
  metadata: Joi.object()
});

const calculatePriceSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().positive().required(),
  account_id: Joi.number().integer().positive(),
  currency_code: Joi.string().length(3),
  attributes: Joi.object(),
  apply_promotions: Joi.boolean().default(true),
  simulation_mode: Joi.boolean().default(false)
});

const bulkPriceSchema = Joi.object({
  requests: Joi.array().items(calculatePriceSchema).min(1).max(100).required()
});

const discountCodeSchema = Joi.object({
  code: Joi.string().required().max(50),
  description: Joi.string().max(200),
  discount_type: Joi.string().valid('percentage', 'fixed').required(),
  discount_value: Joi.number().positive().required(),
  minimum_order_value: Joi.number().min(0),
  maximum_discount: Joi.number().min(0),
  usage_limit: Joi.number().integer().min(1),
  usage_limit_per_customer: Joi.number().integer().min(1),
  allowed_products: Joi.array().items(Joi.number().integer().positive()),
  allowed_categories: Joi.array().items(Joi.number().integer().positive()),
  allowed_customers: Joi.array().items(Joi.number().integer().positive()),
  valid_from: Joi.date().required(),
  valid_to: Joi.date().required(),
  is_active: Joi.boolean().default(true),
  metadata: Joi.object()
});

const customerPricingSchema = Joi.object({
  account_id: Joi.number().integer().positive().required(),
  product_id: Joi.number().integer().positive(),
  category_id: Joi.number().integer().positive(),
  discount_percentage: Joi.number().min(0).max(100),
  special_price: Joi.number().min(0),
  price_list_id: Joi.number().integer().positive()
}).or('product_id', 'category_id');

const promotionSchema = Joi.object({
  promotion_name: Joi.string().required().max(100),
  promotion_type: Joi.string().valid('seasonal', 'clearance', 'bogo', 'bundle').required(),
  discount_value: Joi.number().required(),
  conditions: Joi.object(),
  start_date: Joi.date().required(),
  end_date: Joi.date().required(),
  is_active: Joi.boolean().default(true)
});

@injectable()
export class PricingController {
  constructor(
    @inject(TYPES.DynamicPricingEngine) private pricingEngine: DynamicPricingEngine,
    @inject(TYPES.PricingRuleRepository) private ruleRepository: PricingRuleRepository,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Calculate dynamic price for a product
   * POST /api/crm/pricing/calculate
   */
  async calculatePrice(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = calculatePriceSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const result = await this.pricingEngine.calculatePrice({
        ...value,
        company_id
      });

      res.json({
        success: true,
        data: {
          base_price: result.base_price.toString(),
          discount_amount: result.discount_amount.toString(),
          discount_percentage: result.discount_percentage.toString(),
          final_price: result.final_price.toString(),
          currency_code: result.currency_code,
          applied_rules: result.applied_rules.map(r => ({
            ...r,
            discount_amount: r.discount_amount.toString()
          })),
          tax_amount: result.tax_amount?.toString(),
          total_with_tax: result.total_with_tax?.toString(),
          warnings: result.warnings
        }
      });

    } catch (error: any) {
      this.logger.error('Error calculating price', { error });

      if (error.message?.includes('not found')) {
        res.status(404).json({ error: 'Product not found' });
      } else {
        res.status(500).json({ error: 'Failed to calculate price' });
      }
    }
  }

  /**
   * Bulk calculate prices
   * POST /api/crm/pricing/calculate-bulk
   */
  async calculateBulkPrices(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = bulkPriceSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const requests = value.requests.map((r: any) => ({
        ...r,
        company_id
      }));

      const results = await this.pricingEngine.calculateBulkPrices(requests);

      res.json({
        success: true,
        data: results.map(result => ({
          base_price: result.base_price.toString(),
          discount_amount: result.discount_amount.toString(),
          discount_percentage: result.discount_percentage.toString(),
          final_price: result.final_price.toString(),
          currency_code: result.currency_code,
          applied_rules: result.applied_rules.map(r => ({
            ...r,
            discount_amount: r.discount_amount.toString()
          }))
        }))
      });

    } catch (error) {
      this.logger.error('Error calculating bulk prices', { error });
      res.status(500).json({ error: 'Failed to calculate prices' });
    }
  }

  /**
   * Get all pricing rules
   * GET /api/crm/pricing/rules
   */
  async getPricingRules(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const is_active = req.query.is_active === 'false' ? false : true;
      const rule_type = req.query.rule_type as string;

      const rules = await this.ruleRepository.getRules(company_id, {
        is_active,
        rule_type
      });

      res.json({
        success: true,
        data: rules
      });

    } catch (error) {
      this.logger.error('Error getting pricing rules', { error });
      res.status(500).json({ error: 'Failed to get pricing rules' });
    }
  }

  /**
   * Get pricing rule by ID
   * GET /api/crm/pricing/rules/:id
   */
  async getPricingRuleById(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const rule_id = Number(req.params.id);

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const rule = await this.ruleRepository.getRuleById(rule_id, company_id);

      if (!rule) {
        res.status(404).json({ error: 'Pricing rule not found' });
        return;
      }

      res.json({
        success: true,
        data: rule
      });

    } catch (error) {
      this.logger.error('Error getting pricing rule', { error });
      res.status(500).json({ error: 'Failed to get pricing rule' });
    }
  }

  /**
   * Create pricing rule
   * POST /api/crm/pricing/rules
   */
  async createPricingRule(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const user_id = req.user?.id;

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = pricingRuleSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const rule = await this.pricingEngine.upsertPricingRule({
        ...value,
        company_id
      });

      res.status(201).json({
        success: true,
        data: rule,
        message: 'Pricing rule created successfully'
      });

    } catch (error) {
      this.logger.error('Error creating pricing rule', { error });
      res.status(500).json({ error: 'Failed to create pricing rule' });
    }
  }

  /**
   * Update pricing rule
   * PUT /api/crm/pricing/rules/:id
   */
  async updatePricingRule(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const rule_id = Number(req.params.id);

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = pricingRuleSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const rule = await this.pricingEngine.upsertPricingRule({
        ...value,
        rule_id,
        company_id
      });

      res.json({
        success: true,
        data: rule,
        message: 'Pricing rule updated successfully'
      });

    } catch (error) {
      this.logger.error('Error updating pricing rule', { error });
      res.status(500).json({ error: 'Failed to update pricing rule' });
    }
  }

  /**
   * Delete pricing rule
   * DELETE /api/crm/pricing/rules/:id
   */
  async deletePricingRule(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const rule_id = Number(req.params.id);

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Soft delete by deactivating the rule
      await this.pricingEngine.upsertPricingRule({
        rule_id,
        company_id,
        is_active: false,
        rule_name: '', // These are required but won't be updated
        rule_type: 'discount',
        conditions: {},
        actions: {}
      } as any);

      res.json({
        success: true,
        message: 'Pricing rule deleted successfully'
      });

    } catch (error) {
      this.logger.error('Error deleting pricing rule', { error });
      res.status(500).json({ error: 'Failed to delete pricing rule' });
    }
  }

  /**
   * Apply discount code
   * POST /api/crm/pricing/discount-codes/apply
   */
  async applyDiscountCode(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const account_id = req.user?.account_id;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const applySchema = Joi.object({
        code: Joi.string().required(),
        order_value: Joi.number().positive().required()
      });

      const { error, value } = applySchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const result = await this.pricingEngine.applyDiscountCode(
        company_id,
        value.code,
        value.order_value,
        account_id
      );

      if (!result.valid) {
        res.status(400).json({
          success: false,
          message: result.message
        });
        return;
      }

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      this.logger.error('Error applying discount code', { error });
      res.status(500).json({ error: 'Failed to apply discount code' });
    }
  }

  /**
   * Create discount code
   * POST /api/crm/pricing/discount-codes
   */
  async createDiscountCode(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const user_id = req.user?.id;

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = discountCodeSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const code = await this.ruleRepository.createDiscountCode({
        ...value,
        company_id,
        created_by: user_id
      });

      res.status(201).json({
        success: true,
        data: code,
        message: 'Discount code created successfully'
      });

    } catch (error: any) {
      this.logger.error('Error creating discount code', { error });

      if (error.message?.includes('duplicate')) {
        res.status(409).json({ error: 'Discount code already exists' });
      } else {
        res.status(500).json({ error: 'Failed to create discount code' });
      }
    }
  }

  /**
   * Get customer-specific pricing
   * GET /api/crm/pricing/customer/:accountId
   */
  async getCustomerPricing(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const account_id = Number(req.params.accountId);

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const product_id = req.query.product_id ? Number(req.query.product_id) : undefined;

      const pricing = await this.pricingEngine.getCustomerPricing(
        company_id,
        account_id,
        product_id
      );

      res.json({
        success: true,
        data: pricing
      });

    } catch (error) {
      this.logger.error('Error getting customer pricing', { error });
      res.status(500).json({ error: 'Failed to get customer pricing' });
    }
  }

  /**
   * Set customer-specific pricing
   * POST /api/crm/pricing/customer
   */
  async setCustomerPricing(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const user_id = req.user?.id;

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = customerPricingSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const pricing = await this.pricingEngine.setCustomerPricing({
        ...value,
        company_id
      });

      res.json({
        success: true,
        data: pricing,
        message: 'Customer pricing updated successfully'
      });

    } catch (error) {
      this.logger.error('Error setting customer pricing', { error });
      res.status(500).json({ error: 'Failed to set customer pricing' });
    }
  }

  /**
   * Get tiered pricing for a product
   * GET /api/crm/pricing/tiers/:productId
   */
  async getTieredPricing(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const product_id = Number(req.params.productId);

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const tiers = await this.pricingEngine.getTieredPricing(company_id, product_id);

      res.json({
        success: true,
        data: tiers
      });

    } catch (error) {
      this.logger.error('Error getting tiered pricing', { error });
      res.status(500).json({ error: 'Failed to get tiered pricing' });
    }
  }

  /**
   * Calculate bundle pricing
   * POST /api/crm/pricing/bundles/:bundleId/calculate
   */
  async calculateBundlePrice(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const bundle_id = Number(req.params.bundleId);
      const quantity = Number(req.body.quantity) || 1;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const result = await this.pricingEngine.calculateBundlePrice(
        company_id,
        bundle_id,
        quantity
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      this.logger.error('Error calculating bundle price', { error });

      if (error.message?.includes('not found')) {
        res.status(404).json({ error: 'Bundle not found' });
      } else {
        res.status(500).json({ error: 'Failed to calculate bundle price' });
      }
    }
  }

  /**
   * Create promotion
   * POST /api/crm/pricing/promotions
   */
  async createPromotion(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = promotionSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const promotion = await this.pricingEngine.createPromotion({
        ...value,
        company_id
      });

      res.status(201).json({
        success: true,
        data: promotion,
        message: 'Promotion created successfully'
      });

    } catch (error) {
      this.logger.error('Error creating promotion', { error });
      res.status(500).json({ error: 'Failed to create promotion' });
    }
  }

  /**
   * Get price history
   * GET /api/crm/pricing/history/:productId
   */
  async getPriceHistory(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const product_id = Number(req.params.productId);

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const start_date = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
      const end_date = req.query.end_date ? new Date(req.query.end_date as string) : undefined;

      const history = await this.pricingEngine.getPriceHistory(
        company_id,
        product_id,
        start_date,
        end_date
      );

      res.json({
        success: true,
        data: history
      });

    } catch (error) {
      this.logger.error('Error getting price history', { error });
      res.status(500).json({ error: 'Failed to get price history' });
    }
  }

  /**
   * Simulate pricing scenarios
   * POST /api/crm/pricing/simulate
   */
  async simulatePricing(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const simulationSchema = Joi.object({
        scenarios: Joi.array().items(Joi.object({
          request: calculatePriceSchema,
          rules_to_apply: Joi.array().items(Joi.number().integer().positive()),
          rules_to_exclude: Joi.array().items(Joi.number().integer().positive())
        })).min(1).max(10).required()
      });

      const { error, value } = simulationSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      // Add company_id to each scenario request
      const scenarios = value.scenarios.map((s: any) => ({
        ...s,
        request: { ...s.request, company_id }
      }));

      const results = await this.pricingEngine.simulatePricing(scenarios);

      res.json({
        success: true,
        data: results.map(r => ({
          scenario: r.scenario,
          result: {
            base_price: r.result.base_price.toString(),
            final_price: r.result.final_price.toString(),
            discount_amount: r.result.discount_amount.toString(),
            discount_percentage: r.result.discount_percentage.toString()
          },
          impact: r.impact
        }))
      });

    } catch (error) {
      this.logger.error('Error simulating pricing', { error });
      res.status(500).json({ error: 'Failed to simulate pricing' });
    }
  }

  /**
   * Get pricing analytics
   * GET /api/crm/pricing/analytics
   */
  async getPricingAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const period = (req.query.period as 'day' | 'week' | 'month' | 'quarter') || 'month';

      const analytics = await this.pricingEngine.getPricingAnalytics(company_id, period);

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      this.logger.error('Error getting pricing analytics', { error });
      res.status(500).json({ error: 'Failed to get pricing analytics' });
    }
  }

  /**
   * Optimize pricing rules
   * POST /api/crm/pricing/optimize
   */
  async optimizePricingRules(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const optimizationSchema = Joi.object({
        optimization_goal: Joi.string().valid('revenue', 'conversion', 'margin').default('revenue')
      });

      const { error, value } = optimizationSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const recommendations = await this.pricingEngine.optimizePricingRules(
        company_id,
        value.optimization_goal
      );

      res.json({
        success: true,
        data: recommendations
      });

    } catch (error) {
      this.logger.error('Error optimizing pricing rules', { error });
      res.status(500).json({ error: 'Failed to optimize pricing rules' });
    }
  }

  /**
   * Clear pricing cache
   * POST /api/crm/pricing/cache/clear
   */
  async clearPricingCache(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      this.pricingEngine.clearCache();

      res.json({
        success: true,
        message: 'Pricing cache cleared successfully'
      });

    } catch (error) {
      this.logger.error('Error clearing pricing cache', { error });
      res.status(500).json({ error: 'Failed to clear pricing cache' });
    }
  }
}