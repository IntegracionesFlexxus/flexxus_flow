/**
 * Product Interfaces
 * Sprint 19 Implementation
 */

import { BaseEntity, CompanyScoped, Searchable, Money } from './base.interfaces';

export interface IProduct extends BaseEntity, CompanyScoped, Searchable {
  product_id: number;
  sku: string;
  name: string;
  description?: string;
  category_id?: number;
  base_price: number;
  cost?: number;
  currency_code: string;
  unit_of_measure: string;
  weight?: number;
  dimensions?: ProductDimensions;
  product_type: ProductType;
  is_configurable: boolean;
  is_bundle: boolean;
  track_inventory: boolean;
  min_quantity: number;
  max_quantity?: number;
  status: ProductStatus;
  is_active: boolean;
  attributes?: Record<string, any>;
  custom_fields?: Record<string, any>;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
}

export interface IProductCategory extends BaseEntity, CompanyScoped {
  category_id: number;
  parent_category_id?: number;
  name: string;
  description?: string;
  image_url?: string;
  left_node: number;
  right_node: number;
  depth: number;
  is_active: boolean;
  sort_order: number;
}

export interface IProductVariation extends BaseEntity {
  variation_id: number;
  product_id: number;
  sku: string;
  name: string;
  attributes: Record<string, any>;
  price_adjustment: number;
  price_adjustment_type: 'fixed' | 'percentage';
  stock_quantity: number;
  reserved_quantity: number;
  image_urls?: string[];
  is_active: boolean;
  sort_order: number;
  custom_fields?: Record<string, any>;
}

export interface IProductBundle extends BaseEntity, CompanyScoped {
  bundle_id: number;
  bundle_name: string;
  description?: string;
  bundle_sku: string;
  bundle_type: BundleType;
  pricing_type: BundlePricingType;
  fixed_price?: number;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  is_active: boolean;
  valid_from?: Date;
  valid_until?: Date;
  image_url?: string;
}

export interface IProductBundleItem {
  item_id: number;
  bundle_id: number;
  product_id: number;
  variation_id?: number;
  quantity: number;
  min_quantity: number;
  max_quantity?: number;
  price_override?: number;
  discount_percentage?: number;
  is_optional: boolean;
  is_default: boolean;
  sort_order: number;
  display_name?: string;
}

export interface IProductMedia extends BaseEntity {
  media_id: number;
  company_id: number;
  product_id?: number;
  variation_id?: number;
  media_type: MediaType;
  media_url: string;
  thumbnail_url?: string;
  title?: string;
  alt_text?: string;
  description?: string;
  file_size?: number;
  dimensions?: MediaDimensions;
  duration?: number;
  is_primary: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface IProductInventory extends BaseEntity {
  inventory_id: number;
  product_id: number;
  variation_id?: number;
  warehouse_id?: number;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  reorder_point?: number;
  reorder_quantity?: number;
  location_code?: string;
  bin_number?: string;
  is_active: boolean;
  last_counted_at?: Date;
}

export interface IProductReview extends BaseEntity {
  review_id: number;
  product_id: number;
  variation_id?: number;
  customer_id?: number;
  order_id?: number;
  rating: number;
  title?: string;
  comment?: string;
  is_verified_purchase: boolean;
  is_featured: boolean;
  helpful_count: number;
  media_urls?: string[];
  status: ReviewStatus;
  moderation_notes?: string;
  approved_at?: Date;
  approved_by?: number;
}

// Enums and Types
export type ProductType = 'physical' | 'digital' | 'service' | 'subscription';
export type ProductStatus = 'draft' | 'active' | 'discontinued';
export type BundleType = 'fixed' | 'dynamic' | 'configurable';
export type BundlePricingType = 'fixed' | 'sum' | 'discount';
export type MediaType = 'image' | 'video' | 'document' | '3d_model';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'in' | 'm' | 'ft';
}

export interface MediaDimensions {
  width: number;
  height: number;
}

// DTOs
export interface CreateProductDto {
  sku: string;
  name: string;
  description?: string;
  category_id?: number;
  base_price: number;
  cost?: number;
  currency_code?: string;
  unit_of_measure?: string;
  weight?: number;
  dimensions?: ProductDimensions;
  product_type?: ProductType;
  is_configurable?: boolean;
  track_inventory?: boolean;
  min_quantity?: number;
  max_quantity?: number;
  attributes?: Record<string, any>;
  custom_fields?: Record<string, any>;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  status?: ProductStatus;
  is_active?: boolean;
}

export interface ProductSearchCriteria {
  search?: string;
  category_ids?: number[];
  price_range?: { min: number; max: number };
  product_types?: ProductType[];
  status?: ProductStatus[];
  is_active?: boolean;
  has_inventory?: boolean;
  tags?: string[];
}

export interface ProductConfiguration {
  product_id: number;
  selected_options: Record<string, any>;
  quantity: number;
  custom_text?: string;
  notes?: string;
}

export interface ProductPriceHistory {
  product_id: number;
  price: number;
  currency_code: string;
  effective_date: Date;
  end_date?: Date;
  reason?: string;
}

export interface CategoryTreeNode {
  category_id: number;
  name: string;
  parent_id?: number;
  children?: CategoryTreeNode[];
  product_count?: number;
  is_active: boolean;
}

export interface BundleConfiguration {
  bundle_id: number;
  selected_items: Array<{
    product_id: number;
    variation_id?: number;
    quantity: number;
  }>;
  apply_discount?: boolean;
}

export interface InventoryUpdate {
  product_id: number;
  variation_id?: number;
  warehouse_id?: number;
  adjustment_type: 'add' | 'subtract' | 'set';
  quantity: number;
  reason?: string;
}