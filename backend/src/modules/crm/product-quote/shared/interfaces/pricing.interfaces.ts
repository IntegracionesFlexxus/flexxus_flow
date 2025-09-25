/**
 * Pricing Interfaces
 * Sprint 19 Implementation
 */

import { BaseEntity, CompanyScoped, DateRange } from './base.interfaces';

export interface IPriceList extends BaseEntity, CompanyScoped {
  price_list_id: number;
  name: string;
  description?: string;
  list_type: PriceListType;
  customer_id?: number;
  territory_id?: number;
  channel_code?: string;
  currency_code: string;
  valid_from?: Date;
  valid_until?: Date;
  priority: number;
  is_active: boolean;
}

export interface IPriceListItem extends BaseEntity {
  item_id: number;
  price_list_id: number;
  product_id: number;
  variation_id?: number;
  price: number;
  min_quantity: number;
  max_quantity?: number;
  discount_percentage?: number;
  discount_amount?: number;
  cost_override?: number;
  is_active: boolean;
  notes?: string;
}

export interface IPricingRule extends BaseEntity, CompanyScoped {
  rule_id: number;
  rule_name: string;
  description?: string;
  rule_type: PricingRuleType;
  scope: PricingScope;
  conditions: PricingConditions;
  action_type: PricingActionType;
  action_value: any;
  priority: number;
  stop_further_rules: boolean;
  valid_from?: Date;
  valid_until?: Date;
  is_active: boolean;
  requires_approval: boolean;
}

export interface IDiscountCode extends BaseEntity, CompanyScoped {
  code_id: number;
  code: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  applies_to: DiscountAppliesTo;
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
  stackable: boolean;
  is_active: boolean;
  times_used: number;
  total_discount_given: number;
}

export interface ICurrencyExchangeRate extends BaseEntity, CompanyScoped {
  rate_id: number;
  from_currency: string;
  to_currency: string;
  exchange_rate: number;
  inverse_rate: number;
  rate_type: ExchangeRateType;
  effective_date: Date;
  expiry_date?: Date;
  source?: string;
  source_reference?: string;
  is_active: boolean;
}

export interface ITaxRule extends BaseEntity, CompanyScoped {
  tax_rule_id: number;
  tax_name: string;
  tax_code?: string;
  tax_type: TaxType;
  tax_rate: number;
  country_code?: string;
  state_province?: string;
  city?: string;
  postal_code?: string;
  applies_to_all_products: boolean;
  product_categories?: number[];
  excluded_products?: number[];
  tax_on_shipping: boolean;
  compound_tax: boolean;
  tax_included_in_price: boolean;
  min_taxable_amount?: number;
  valid_from?: Date;
  valid_until?: Date;
  is_active: boolean;
}

export interface ICustomerPricingTier extends BaseEntity, CompanyScoped {
  tier_id: number;
  tier_name: string;
  tier_level: number;
  min_purchase_amount?: number;
  min_order_count?: number;
  qualification_period_days?: number;
  discount_percentage?: number;
  price_list_id?: number;
  free_shipping: boolean;
  priority_support: boolean;
  early_access: boolean;
  is_active: boolean;
  benefits_description?: string;
}

// Enums and Types
export type PriceListType = 'standard' | 'customer' | 'territory' | 'channel';
export type PricingRuleType = 'volume' | 'tiered' | 'customer_group' | 'time_based' | 'bundle' | 'promotion';
export type PricingScope = 'global' | 'category' | 'product' | 'customer';
export type PricingActionType = 'discount_percentage' | 'discount_fixed' | 'price_override' | 'tiered_pricing';
export type DiscountType = 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_shipping';
export type DiscountAppliesTo = 'order' | 'products' | 'categories' | 'shipping';
export type ExchangeRateType = 'spot' | 'daily' | 'monthly' | 'custom';
export type TaxType = 'sales_tax' | 'vat' | 'gst' | 'withholding';

// Complex Types
export interface PricingConditions {
  min_quantity?: number;
  max_quantity?: number;
  customer_groups?: string[];
  product_categories?: number[];
  date_range?: DateRange;
  custom_conditions?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
}

export interface PriceCalculationRequest {
  product_id: number;
  variation_id?: number;
  account_id?: number;
  quantity: number;
  date?: Date;
  territory_id?: number;
  currency_code: string;
  apply_discounts?: boolean;
  discount_codes?: string[];
  context?: PricingContext;
}

export interface PriceCalculationResult {
  base_price: number;
  list_price: number;
  unit_price: number;
  final_price: number;
  currency_code: string;
  applied_rules: AppliedPricingRule[];
  discounts: DiscountBreakdown[];
  taxes: TaxBreakdown[];
  total_discount: number;
  total_tax: number;
  warnings?: string[];
}

export interface PricingContext {
  customer_id?: number;
  customer_type?: string;
  customer_tier?: string;
  location?: {
    country: string;
    state?: string;
    city?: string;
    postal_code?: string;
  };
  channel?: string;
  campaign_code?: string;
  custom_attributes?: Record<string, any>;
}

export interface AppliedPricingRule {
  rule_id: number;
  rule_name: string;
  rule_type: PricingRuleType;
  discount_amount: number;
  discount_percentage?: number;
  priority: number;
}

export interface DiscountBreakdown {
  type: string;
  description: string;
  amount: number;
  percentage?: number;
  code?: string;
}

export interface TaxBreakdown {
  tax_name: string;
  tax_rate: number;
  tax_amount: number;
  is_compound: boolean;
  tax_on_shipping: boolean;
}

// DTOs
export interface CreatePricingRuleDto {
  rule_name: string;
  description?: string;
  rule_type: PricingRuleType;
  scope?: PricingScope;
  conditions: PricingConditions;
  action_type: PricingActionType;
  action_value: any;
  priority?: number;
  stop_further_rules?: boolean;
  valid_from?: Date;
  valid_until?: Date;
  is_active?: boolean;
  requires_approval?: boolean;
}

export interface CreateDiscountCodeDto {
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
}

export interface PriceMatrixRequest {
  product_id: number;
  quantity_ranges?: number[];
  customer_tiers?: string[];
  territories?: number[];
  currencies?: string[];
}

export interface PriceMatrix {
  product_id: number;
  base_price: number;
  matrix: Array<{
    quantity_min: number;
    quantity_max?: number;
    prices: Array<{
      tier?: string;
      territory?: string;
      currency: string;
      price: number;
      discount_percentage?: number;
    }>;
  }>;
}

export interface TaxCalculationRequest {
  amount: number;
  product_ids?: number[];
  location: {
    country: string;
    state?: string;
    city?: string;
    postal_code?: string;
  };
  include_shipping?: boolean;
  shipping_amount?: number;
  customer_tax_exempt?: boolean;
}

export interface TaxCalculationResult {
  subtotal: number;
  taxable_amount: number;
  total_tax: number;
  total_amount: number;
  tax_details: TaxBreakdown[];
}