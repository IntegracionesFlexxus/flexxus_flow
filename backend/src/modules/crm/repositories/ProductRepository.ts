/**
 * @deprecated Sprint 19 - Usar implementación Sprint 20 en product-quote/
 * Este archivo será eliminado en futuras versiones
 * Ver: backend/src/modules/crm/product-quote/catalog/repositories/ProductRepository.ts
 *
 * Product Repository - Sprint 19
 * Handles all database operations for products
 */

import { injectable, inject } from 'inversify';
import { Pool, PoolClient } from 'pg';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';

export interface Product {
  product_id?: number;
  company_id: number;
  category_id?: number;
  name: string;
  description?: string;
  short_description?: string;
  product_code: string;
  barcode?: string;
  manufacturer_part_number?: string;
  product_type: 'simple' | 'configurable' | 'bundle' | 'service' | 'digital' | 'subscription';
  is_active: boolean;
  is_digital: boolean;
  is_subscription: boolean;
  requires_shipping: boolean;
  weight?: number;
  weight_unit?: string;
  dimensions?: any;
  track_inventory: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  allow_backorders: boolean;
  max_order_quantity?: number;
  min_order_quantity: number;
  base_price: number;
  cost_price?: number;
  markup_percentage?: number;
  currency_code: string;
  tax_class?: string;
  tax_rate: number;
  tags?: string[];
  specifications?: any;
  custom_fields?: any;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  launch_date?: Date;
  discontinue_date?: Date;
  created_at?: Date;
  updated_at?: Date;
  created_by?: number;
  updated_by?: number;
}

export interface ProductVariation {
  variation_id?: number;
  company_id: number;
  parent_product_id: number;
  variation_name: string;
  variation_code: string;
  description?: string;
  attributes: any;
  price_adjustment_type: 'fixed' | 'percentage';
  price_adjustment: number;
  sku?: string;
  stock_quantity: number;
  is_active: boolean;
  sort_order: number;
  image_urls?: string[];
}

export interface ProductFilter {
  company_id: number;
  category_id?: number;
  is_active?: boolean;
  product_type?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  tags?: string[];
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

@injectable()
export class ProductRepository {
  private pool: Pool;

  constructor(
    @inject(TYPES.CrmConnection) pool: Pool,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.pool = pool;
  }

  /**
   * Create a new product
   */
  async create(product: Product): Promise<Product> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO products (
          company_id, category_id, name, description, short_description,
          product_code, barcode, manufacturer_part_number,
          product_type, is_active, is_digital, is_subscription, requires_shipping,
          weight, weight_unit, dimensions,
          track_inventory, stock_quantity, low_stock_threshold, allow_backorders,
          max_order_quantity, min_order_quantity,
          base_price, cost_price, markup_percentage, currency_code,
          tax_class, tax_rate,
          tags, specifications, custom_fields,
          seo_title, seo_description, seo_keywords,
          launch_date, discontinue_date,
          created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38
        ) RETURNING *`;

      const values = [
        product.company_id,
        product.category_id,
        product.name,
        product.description,
        product.short_description,
        product.product_code,
        product.barcode,
        product.manufacturer_part_number,
        product.product_type,
        product.is_active ?? true,
        product.is_digital ?? false,
        product.is_subscription ?? false,
        product.requires_shipping ?? true,
        product.weight,
        product.weight_unit,
        JSON.stringify(product.dimensions || {}),
        product.track_inventory ?? true,
        product.stock_quantity ?? 0,
        product.low_stock_threshold ?? 10,
        product.allow_backorders ?? false,
        product.max_order_quantity,
        product.min_order_quantity ?? 1,
        product.base_price,
        product.cost_price,
        product.markup_percentage,
        product.currency_code ?? 'ARS',
        product.tax_class,
        product.tax_rate ?? 0,
        product.tags || [],
        JSON.stringify(product.specifications || {}),
        JSON.stringify(product.custom_fields || {}),
        product.seo_title,
        product.seo_description,
        product.seo_keywords,
        product.launch_date,
        product.discontinue_date,
        product.created_by,
        product.updated_by
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Error creating product', { error, product });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing product
   */
  async update(product_id: number, product: Partial<Product>): Promise<Product> {
    const client = await this.pool.connect();
    try {
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(product).forEach((key) => {
        if (key !== 'product_id' && key !== 'created_at' && key !== 'created_by') {
          let value = product[key as keyof Product];

          // Handle JSON fields
          if (['dimensions', 'specifications', 'custom_fields'].includes(key) && value !== undefined) {
            value = JSON.stringify(value);
          }

          updateFields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      // Add updated_at
      updateFields.push(`updated_at = NOW()`);

      // Add product_id as last parameter
      values.push(product_id);

      const query = `
        UPDATE products
        SET ${updateFields.join(', ')}
        WHERE product_id = $${paramCount}
        RETURNING *`;

      const result = await client.query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Error updating product', { error, product_id, product });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get product by ID
   */
  async findById(product_id: number): Promise<Product | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT p.*,
               pc.name as category_name,
               COUNT(pv.variation_id) as variations_count
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.category_id
        LEFT JOIN product_variations pv ON p.product_id = pv.parent_product_id
        WHERE p.product_id = $1
        GROUP BY p.product_id, pc.name`;

      const result = await client.query(query, [product_id]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Error finding product by ID', { error, product_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get product by code
   */
  async findByCode(company_id: number, product_code: string): Promise<Product | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM products
        WHERE company_id = $1 AND product_code = $2`;

      const result = await client.query(query, [company_id, product_code]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Error finding product by code', { error, company_id, product_code });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Search products with filters
   */
  async search(filter: ProductFilter): Promise<{ data: Product[]; total: number }> {
    const client = await this.pool.connect();
    try {
      let whereConditions = ['p.company_id = $1'];
      let values: any[] = [filter.company_id];
      let paramCount = 2;

      // Build WHERE conditions
      if (filter.category_id) {
        whereConditions.push(`p.category_id = $${paramCount}`);
        values.push(filter.category_id);
        paramCount++;
      }

      if (filter.is_active !== undefined) {
        whereConditions.push(`p.is_active = $${paramCount}`);
        values.push(filter.is_active);
        paramCount++;
      }

      if (filter.product_type) {
        whereConditions.push(`p.product_type = $${paramCount}`);
        values.push(filter.product_type);
        paramCount++;
      }

      if (filter.search) {
        whereConditions.push(`(
          p.name ILIKE $${paramCount}
          OR p.product_code ILIKE $${paramCount}
          OR p.barcode = $${paramCount + 1}
        )`);
        values.push(`%${filter.search}%`, filter.search);
        paramCount += 2;
      }

      if (filter.min_price !== undefined) {
        whereConditions.push(`p.base_price >= $${paramCount}`);
        values.push(filter.min_price);
        paramCount++;
      }

      if (filter.max_price !== undefined) {
        whereConditions.push(`p.base_price <= $${paramCount}`);
        values.push(filter.max_price);
        paramCount++;
      }

      if (filter.in_stock) {
        whereConditions.push(`(p.track_inventory = false OR p.stock_quantity > 0 OR p.allow_backorders = true)`);
      }

      if (filter.tags && filter.tags.length > 0) {
        whereConditions.push(`p.tags && $${paramCount}`);
        values.push(filter.tags);
        paramCount++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Count total results
      const countQuery = `
        SELECT COUNT(*)
        FROM products p
        WHERE ${whereClause}`;

      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated results
      const sortBy = filter.sort_by || 'name';
      const sortOrder = filter.sort_order || 'ASC';
      const limit = filter.limit || 20;
      const offset = filter.offset || 0;

      const dataQuery = `
        SELECT p.*,
               pc.name as category_name,
               COUNT(pv.variation_id) as variations_count
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.category_id
        LEFT JOIN product_variations pv ON p.product_id = pv.parent_product_id
        WHERE ${whereClause}
        GROUP BY p.product_id, pc.name
        ORDER BY p.${sortBy} ${sortOrder}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}`;

      values.push(limit, offset);
      const dataResult = await client.query(dataQuery, values);

      return {
        data: dataResult.rows,
        total
      };
    } catch (error) {
      this.logger.error('Error searching products', { error, filter });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get products by category
   */
  async findByCategory(company_id: number, category_id: number): Promise<Product[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT p.*
        FROM products p
        WHERE p.company_id = $1
        AND (p.category_id = $2 OR p.category_id IN (
          SELECT category_id
          FROM product_categories
          WHERE parent_category_id = $2
        ))
        AND p.is_active = true
        ORDER BY p.name`;

      const result = await client.query(query, [company_id, category_id]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error finding products by category', { error, company_id, category_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update stock quantity
   */
  async updateStock(product_id: number, quantity_change: number, absolute?: boolean): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = absolute
        ? `UPDATE products SET stock_quantity = $2, updated_at = NOW() WHERE product_id = $1`
        : `UPDATE products SET stock_quantity = stock_quantity + $2, updated_at = NOW() WHERE product_id = $1`;

      await client.query(query, [product_id, quantity_change]);
    } catch (error) {
      this.logger.error('Error updating product stock', { error, product_id, quantity_change });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(company_id: number): Promise<Product[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT p.*
        FROM products p
        WHERE p.company_id = $1
        AND p.track_inventory = true
        AND p.stock_quantity <= p.low_stock_threshold
        AND p.is_active = true
        ORDER BY p.stock_quantity ASC`;

      const result = await client.query(query, [company_id]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error getting low stock products', { error, company_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete product
   */
  async delete(product_id: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = `DELETE FROM products WHERE product_id = $1`;
      const result = await client.query(query, [product_id]);
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error('Error deleting product', { error, product_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create product variation
   */
  async createVariation(variation: ProductVariation): Promise<ProductVariation> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO product_variations (
          company_id, parent_product_id, variation_name, variation_code,
          description, attributes, price_adjustment_type, price_adjustment,
          sku, stock_quantity, is_active, sort_order, image_urls
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        ) RETURNING *`;

      const values = [
        variation.company_id,
        variation.parent_product_id,
        variation.variation_name,
        variation.variation_code,
        variation.description,
        JSON.stringify(variation.attributes),
        variation.price_adjustment_type,
        variation.price_adjustment,
        variation.sku,
        variation.stock_quantity,
        variation.is_active ?? true,
        variation.sort_order ?? 0,
        variation.image_urls || []
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Error creating product variation', { error, variation });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get product variations
   */
  async getVariations(product_id: number): Promise<ProductVariation[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM product_variations
        WHERE parent_product_id = $1
        ORDER BY sort_order, variation_name`;

      const result = await client.query(query, [product_id]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error getting product variations', { error, product_id });
      throw error;
    } finally {
      client.release();
    }
  }
}