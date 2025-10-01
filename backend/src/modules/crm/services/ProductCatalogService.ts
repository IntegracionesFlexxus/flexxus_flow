/**
 * @deprecated Sprint 19 - Usar implementación Sprint 20 en product-quote/
 * Este archivo será eliminado en futuras versiones
 * Ver: backend/src/modules/crm/product-quote/catalog/services/ProductServiceImpl.ts
 *
 * Product Catalog Service - Sprint 19
 * Manages product catalog, categories, variations, and inventory
 */

import { injectable, inject } from 'inversify';
import { Pool, PoolClient } from 'pg';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
import { ProductRepository, Product, ProductVariation, ProductFilter } from '../repositories/ProductRepository';
import { CategoryRepository, ProductCategory, CategoryNode } from '../repositories/CategoryRepository';

export interface ProductBundle {
  bundle_id?: number;
  company_id: number;
  bundle_name: string;
  description?: string;
  bundle_sku: string;
  bundle_type: 'fixed' | 'dynamic' | 'configurable';
  pricing_type: 'fixed' | 'sum' | 'discount';
  fixed_price?: number;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  is_active: boolean;
  valid_from?: Date;
  valid_until?: Date;
  image_url?: string;
  items: ProductBundleItem[];
  metadata?: any;
}

export interface ProductBundleItem {
  item_id?: number;
  bundle_id?: number;
  product_id: number;
  variation_id?: number;
  quantity: number;
  min_quantity?: number;
  max_quantity?: number;
  price_override?: number;
  discount_percentage?: number;
  is_optional: boolean;
  is_default?: boolean;
  sort_order: number;
  display_name?: string;
}

export interface ProductMedia {
  media_id?: number;
  company_id: number;
  product_id?: number;
  variation_id?: number;
  media_type: 'image' | 'video' | 'document' | '3d_model';
  media_url: string;
  thumbnail_url?: string;
  title?: string;
  alt_text?: string;
  description?: string;
  file_size?: number;
  dimensions?: { width: number; height: number };
  duration?: number;
  is_primary: boolean;
  sort_order: number;
  is_active?: boolean;
}

export interface ProductInventory {
  product_id: number;
  variation_id?: number;
  warehouse_id?: number;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  location_code?: string;
  bin_number?: string;
}

export interface InventoryMovement {
  movement_id?: number;
  company_id: number;
  product_id: number;
  variation_id?: number;
  warehouse_id?: number;
  movement_type: 'in' | 'out' | 'adjustment' | 'reserved' | 'released';
  quantity: number;
  unit_cost?: number;
  reference_type?: string;
  reference_id?: number;
  notes?: string;
  created_by?: number;
  created_at?: Date;
}

export interface ProductSearchResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  facets?: SearchFacets;
}

export interface SearchFacets {
  categories: Array<{ id: number; name: string; count: number }>;
  price_ranges: Array<{ min: number; max: number; count: number }>;
  brands?: Array<{ name: string; count: number }>;
  attributes?: Record<string, Array<{ value: string; count: number }>>;
}

export interface ProductImportData {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  base_price: number;
  cost?: number;
  weight?: number;
  dimensions?: any;
  attributes?: any;
  variations?: any[];
}

export interface BulkOperationResult {
  successful: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
  created_ids?: number[];
}

@injectable()
export class ProductCatalogService {
  constructor(
    @inject(TYPES.CrmConnection) private pool: Pool,
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.ProductRepository) private productRepository: ProductRepository,
    @inject(TYPES.CategoryRepository) private categoryRepository: CategoryRepository
  ) {}

  /**
   * Create product with complete data
   */
  async createProduct(companyId: number, productData: Partial<Product>): Promise<Product> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Validate SKU uniqueness
      const skuCheck = await client.query(
        `SELECT product_id FROM products
         WHERE company_id = $1 AND sku = $2`,
        [companyId, productData.sku]
      );

      if (skuCheck.rows.length > 0) {
        throw new Error(`Product with SKU ${productData.sku} already exists`);
      }

      // Create main product
      const product = await this.productRepository.create({
        ...productData,
        company_id: companyId
      });

      // Create variations if provided
      if (productData.variations && productData.variations.length > 0) {
        for (const variation of productData.variations) {
          await this.createProductVariation(product.product_id!, variation, client);
        }
      }

      // Initialize inventory if tracking is enabled
      if (product.track_inventory) {
        await this.initializeInventory(product.product_id!, companyId, client);
      }

      await client.query('COMMIT');
      return product;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating product:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update product
   */
  async updateProduct(productId: number, updateData: Partial<Product>): Promise<Product> {
    // Remove fields that shouldn't be updated directly
    const { product_id, company_id, created_at, ...updates } = updateData;

    return await this.productRepository.update(productId, updates);
  }

  /**
   * Get product with complete details
   */
  async getProduct(productId: number, companyId: number): Promise<Product | null> {
    const product = await this.productRepository.findById(productId);

    if (!product || product.company_id !== companyId) {
      return null;
    }

    // Load related data
    const [variations, media, inventory] = await Promise.all([
      this.getProductVariations(productId),
      this.getProductMedia(productId),
      this.getProductInventory(productId)
    ]);

    return {
      ...product,
      variations,
      media,
      inventory
    };
  }

  /**
   * Advanced product search
   */
  async searchProducts(criteria: ProductFilter & {
    page?: number;
    limit?: number;
    include_facets?: boolean;
  }): Promise<ProductSearchResult> {
    const page = criteria.page || 1;
    const limit = criteria.limit || 20;
    const offset = (page - 1) * limit;

    // Build search query with filters
    const conditions = ['p.company_id = $1'];
    const params: any[] = [criteria.company_id];
    let paramCount = 2;

    if (criteria.search) {
      conditions.push(`(
        p.name ILIKE $${paramCount} OR
        p.sku ILIKE $${paramCount} OR
        p.description ILIKE $${paramCount}
      )`);
      params.push(`%${criteria.search}%`);
      paramCount++;
    }

    if (criteria.category_id) {
      // Include subcategories
      conditions.push(`p.category_id IN (
        SELECT category_id
        FROM product_categories
        WHERE left_node >= (
          SELECT left_node FROM product_categories WHERE category_id = $${paramCount}
        )
        AND right_node <= (
          SELECT right_node FROM product_categories WHERE category_id = $${paramCount}
        )
      )`);
      params.push(criteria.category_id);
      paramCount++;
    }

    if (criteria.price_min !== undefined) {
      conditions.push(`p.base_price >= $${paramCount}`);
      params.push(criteria.price_min);
      paramCount++;
    }

    if (criteria.price_max !== undefined) {
      conditions.push(`p.base_price <= $${paramCount}`);
      params.push(criteria.price_max);
      paramCount++;
    }

    if (criteria.is_active !== undefined) {
      conditions.push(`p.is_active = $${paramCount}`);
      params.push(criteria.is_active);
      paramCount++;
    }

    if (criteria.in_stock) {
      conditions.push(`EXISTS (
        SELECT 1 FROM product_inventory i
        WHERE i.product_id = p.product_id
        AND i.quantity_available > 0
      )`);
    }

    const whereClause = conditions.join(' AND ');

    // Main query
    const query = `
      SELECT p.*,
             c.name as category_name,
             COALESCE(i.quantity_available, 0) as stock_available
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.category_id
      LEFT JOIN (
        SELECT product_id,
               SUM(quantity_available) as quantity_available
        FROM product_inventory
        GROUP BY product_id
      ) i ON p.product_id = i.product_id
      WHERE ${whereClause}
      ORDER BY ${criteria.sort_by || 'p.name'} ${criteria.sort_order || 'ASC'}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(limit, offset);

    const [productsResult, countResult] = await Promise.all([
      this.pool.query(query, params),
      this.pool.query(
        `SELECT COUNT(*) FROM products p WHERE ${whereClause}`,
        params.slice(0, -2)
      )
    ]);

    const result: ProductSearchResult = {
      products: productsResult.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit
    };

    // Get facets if requested
    if (criteria.include_facets) {
      result.facets = await this.getSearchFacets(whereClause, params.slice(0, -2));
    }

    return result;
  }

  /**
   * Get search facets for filtering
   */
  private async getSearchFacets(whereClause: string, params: any[]): Promise<SearchFacets> {
    // Category facets
    const categoryQuery = `
      SELECT c.category_id as id, c.name, COUNT(p.product_id) as count
      FROM products p
      INNER JOIN product_categories c ON p.category_id = c.category_id
      WHERE ${whereClause}
      GROUP BY c.category_id, c.name
      ORDER BY count DESC
      LIMIT 10
    `;

    // Price range facets
    const priceQuery = `
      SELECT
        CASE
          WHEN base_price < 100 THEN '0-100'
          WHEN base_price < 500 THEN '100-500'
          WHEN base_price < 1000 THEN '500-1000'
          ELSE '1000+'
        END as range,
        COUNT(*) as count
      FROM products p
      WHERE ${whereClause}
      GROUP BY range
      ORDER BY range
    `;

    const [categoryResult, priceResult] = await Promise.all([
      this.pool.query(categoryQuery, params),
      this.pool.query(priceQuery, params)
    ]);

    return {
      categories: categoryResult.rows,
      price_ranges: priceResult.rows.map(row => {
        const [min, max] = row.range.includes('+')
          ? [1000, null]
          : row.range.split('-').map(Number);
        return { min, max, count: parseInt(row.count) };
      })
    };
  }

  /**
   * Create product variation
   */
  async createProductVariation(
    productId: number,
    variation: Partial<ProductVariation>,
    client?: PoolClient
  ): Promise<ProductVariation> {
    const queryClient = client || this.pool;

    const result = await queryClient.query(
      `INSERT INTO product_variations (
        product_id, sku, name, attributes, price_adjustment,
        price_adjustment_type, stock_quantity, reserved_quantity,
        image_urls, is_active, sort_order, custom_fields
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        productId,
        variation.sku,
        variation.name,
        JSON.stringify(variation.attributes || {}),
        variation.price_adjustment || 0,
        variation.price_adjustment_type || 'fixed',
        variation.stock_quantity || 0,
        variation.reserved_quantity || 0,
        variation.image_urls || [],
        variation.is_active ?? true,
        variation.sort_order || 0,
        JSON.stringify(variation.custom_fields || {})
      ]
    );

    return result.rows[0];
  }

  /**
   * Get product variations
   */
  async getProductVariations(productId: number): Promise<ProductVariation[]> {
    const result = await this.pool.query(
      `SELECT * FROM product_variations
       WHERE product_id = $1 AND is_active = true
       ORDER BY sort_order, variation_id`,
      [productId]
    );

    return result.rows;
  }

  /**
   * Create product bundle
   */
  async createBundle(bundle: ProductBundle): Promise<ProductBundle> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Create bundle
      const bundleResult = await client.query(
        `INSERT INTO product_bundles (
          company_id, bundle_name, description, bundle_sku, bundle_type,
          pricing_type, fixed_price, discount_type, discount_value,
          is_active, valid_from, valid_until, image_url, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          bundle.company_id,
          bundle.bundle_name,
          bundle.description,
          bundle.bundle_sku,
          bundle.bundle_type,
          bundle.pricing_type,
          bundle.fixed_price,
          bundle.discount_type,
          bundle.discount_value,
          bundle.is_active,
          bundle.valid_from,
          bundle.valid_until,
          bundle.image_url,
          JSON.stringify(bundle.metadata || {})
        ]
      );

      const createdBundle = bundleResult.rows[0];

      // Add bundle items
      for (const item of bundle.items) {
        await client.query(
          `INSERT INTO product_bundle_items (
            bundle_id, product_id, variation_id, quantity,
            min_quantity, max_quantity, price_override,
            discount_percentage, is_optional, is_default,
            sort_order, display_name
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            createdBundle.bundle_id,
            item.product_id,
            item.variation_id,
            item.quantity,
            item.min_quantity || item.quantity,
            item.max_quantity,
            item.price_override,
            item.discount_percentage,
            item.is_optional,
            item.is_default ?? true,
            item.sort_order,
            item.display_name
          ]
        );
      }

      await client.query('COMMIT');
      return { ...createdBundle, items: bundle.items };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating bundle:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate bundle price
   */
  async calculateBundlePrice(bundleId: number, configuration?: any): Promise<{
    base_price: number;
    discount_amount: number;
    final_price: number;
    savings: number;
    items: Array<{ product_id: number; price: number; quantity: number }>;
  }> {
    const bundle = await this.pool.query(
      `SELECT * FROM product_bundles WHERE bundle_id = $1`,
      [bundleId]
    );

    if (bundle.rows.length === 0) {
      throw new Error('Bundle not found');
    }

    const bundleData = bundle.rows[0];

    // Get bundle items with product prices
    const itemsResult = await this.pool.query(
      `SELECT bi.*, p.base_price, p.name
       FROM product_bundle_items bi
       INNER JOIN products p ON bi.product_id = p.product_id
       WHERE bi.bundle_id = $1`,
      [bundleId]
    );

    let basePrice = 0;
    const items = [];

    for (const item of itemsResult.rows) {
      const quantity = configuration?.items?.[item.product_id]?.quantity || item.quantity;
      const itemPrice = item.price_override || item.base_price;

      basePrice += itemPrice * quantity;
      items.push({
        product_id: item.product_id,
        price: itemPrice,
        quantity
      });
    }

    let finalPrice = basePrice;
    let discountAmount = 0;

    // Apply bundle pricing
    if (bundleData.pricing_type === 'fixed') {
      finalPrice = bundleData.fixed_price;
      discountAmount = basePrice - finalPrice;
    } else if (bundleData.pricing_type === 'discount') {
      if (bundleData.discount_type === 'percentage') {
        discountAmount = basePrice * (bundleData.discount_value / 100);
      } else {
        discountAmount = bundleData.discount_value;
      }
      finalPrice = basePrice - discountAmount;
    }

    return {
      base_price: basePrice,
      discount_amount: discountAmount,
      final_price: finalPrice,
      savings: discountAmount,
      items
    };
  }

  /**
   * Category Management
   */
  async createCategory(category: ProductCategory): Promise<ProductCategory> {
    return await this.categoryRepository.createCategory(category);
  }

  async getCategoryTree(companyId: number): Promise<CategoryNode[]> {
    return await this.categoryRepository.getCategoryTree(companyId);
  }

  async moveCategory(categoryId: number, newParentId: number | null, companyId: number): Promise<void> {
    return await this.categoryRepository.moveCategory(categoryId, newParentId, companyId);
  }

  /**
   * Product Media Management
   */
  async addProductMedia(media: ProductMedia): Promise<ProductMedia> {
    const result = await this.pool.query(
      `INSERT INTO product_media (
        company_id, product_id, variation_id, media_type, media_url,
        thumbnail_url, title, alt_text, description, file_size,
        dimensions, duration, is_primary, sort_order, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        media.company_id,
        media.product_id,
        media.variation_id,
        media.media_type,
        media.media_url,
        media.thumbnail_url,
        media.title,
        media.alt_text,
        media.description,
        media.file_size,
        JSON.stringify(media.dimensions),
        media.duration,
        media.is_primary,
        media.sort_order,
        media.is_active ?? true
      ]
    );

    return result.rows[0];
  }

  async getProductMedia(productId: number): Promise<ProductMedia[]> {
    const result = await this.pool.query(
      `SELECT * FROM product_media
       WHERE product_id = $1 AND is_active = true
       ORDER BY is_primary DESC, sort_order`,
      [productId]
    );

    return result.rows;
  }

  /**
   * Inventory Management
   */
  private async initializeInventory(
    productId: number,
    companyId: number,
    client: PoolClient
  ): Promise<void> {
    await client.query(
      `INSERT INTO product_inventory (
        product_id, warehouse_id, quantity_on_hand,
        quantity_reserved, is_active
      )
      VALUES ($1, NULL, 0, 0, true)`,
      [productId]
    );
  }

  async getProductInventory(productId: number, warehouseId?: number): Promise<ProductInventory[]> {
    const conditions = ['product_id = $1'];
    const params = [productId];

    if (warehouseId) {
      conditions.push('warehouse_id = $2');
      params.push(warehouseId);
    }

    const result = await this.pool.query(
      `SELECT * FROM product_inventory
       WHERE ${conditions.join(' AND ')}`,
      params
    );

    return result.rows;
  }

  async updateInventory(movement: InventoryMovement): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Record movement
      await client.query(
        `INSERT INTO inventory_movements (
          product_id, variation_id, warehouse_id, movement_type,
          quantity, unit_cost, reference_type, reference_id,
          notes, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          movement.product_id,
          movement.variation_id,
          movement.warehouse_id,
          movement.movement_type,
          movement.quantity,
          movement.unit_cost,
          movement.reference_type,
          movement.reference_id,
          movement.notes,
          movement.created_by
        ]
      );

      // Update inventory levels
      const quantityChange = movement.movement_type === 'in' ? movement.quantity : -movement.quantity;
      const reservedChange = movement.movement_type === 'reserved' ? movement.quantity :
                            movement.movement_type === 'released' ? -movement.quantity : 0;

      await client.query(
        `UPDATE product_inventory
         SET quantity_on_hand = quantity_on_hand + $1,
             quantity_reserved = quantity_reserved + $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE product_id = $3
         AND COALESCE(warehouse_id, 0) = COALESCE($4, 0)`,
        [
          quantityChange,
          reservedChange,
          movement.product_id,
          movement.warehouse_id
        ]
      );

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating inventory:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Bulk Operations
   */
  async bulkImportProducts(
    companyId: number,
    products: ProductImportData[]
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      successful: 0,
      failed: 0,
      errors: [],
      created_ids: []
    };

    for (let i = 0; i < products.length; i++) {
      try {
        const product = await this.createProduct(companyId, products[i] as any);
        result.successful++;
        result.created_ids!.push(product.product_id!);
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: i + 1,
          error: error.message
        });
      }
    }

    return result;
  }

  async bulkUpdatePrices(
    updates: Array<{ product_id: number; price: number }>
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      successful: 0,
      failed: 0,
      errors: []
    };

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const update of updates) {
        try {
          await client.query(
            `UPDATE products
             SET base_price = $1, updated_at = CURRENT_TIMESTAMP
             WHERE product_id = $2`,
            [update.price, update.product_id]
          );
          result.successful++;
        } catch (error: any) {
          result.failed++;
          result.errors.push({
            row: update.product_id,
            error: error.message
          });
        }
      }

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return result;
  }

  /**
   * Product validation
   */
  async validateSKU(sku: string, companyId: number): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT COUNT(*) FROM products
       WHERE company_id = $1 AND sku = $2`,
      [companyId, sku]
    );

    return parseInt(result.rows[0].count) === 0;
  }

  /**
   * Export products to CSV/JSON
   */
  async exportProducts(
    companyId: number,
    format: 'csv' | 'json',
    filters?: ProductFilter
  ): Promise<string> {
    const products = await this.searchProducts({
      ...filters,
      company_id: companyId,
      limit: 10000
    });

    if (format === 'json') {
      return JSON.stringify(products.products, null, 2);
    }

    // CSV format
    const headers = ['SKU', 'Name', 'Category', 'Price', 'Stock', 'Status'];
    const rows = products.products.map(p => [
      p.sku,
      p.name,
      p.category_name || '',
      p.base_price,
      p.stock_available || 0,
      p.status
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}