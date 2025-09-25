/**
 * Product Repository
 * Sprint 20 Implementation
 */

import { Pool } from 'pg';
import {
  IProduct,
  CreateProductDto,
  UpdateProductDto,
  ProductSearchCriteria
} from '../../shared/interfaces/product.interfaces';

export class ProductRepository {
  constructor(private pool: Pool) {}

  async create(companyId: number, data: CreateProductDto): Promise<IProduct> {
    const query = `
      INSERT INTO products (
        company_id, sku, name, description, category_id, base_price,
        cost, currency_code, unit_of_measure, weight, dimensions,
        product_type, is_configurable, track_inventory, min_quantity,
        max_quantity, attributes, custom_fields, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;

    const values = [
      companyId,
      data.sku,
      data.name,
      data.description,
      data.category_id,
      data.base_price,
      data.cost,
      data.currency_code || 'USD',
      data.unit_of_measure || 'unit',
      data.weight,
      JSON.stringify(data.dimensions),
      data.product_type || 'physical',
      data.is_configurable || false,
      data.track_inventory !== false,
      data.min_quantity || 1,
      data.max_quantity,
      JSON.stringify(data.attributes),
      JSON.stringify(data.custom_fields),
      1 // TODO: Get from auth context
    ];

    const result = await this.pool.query(query, values);
    return this.mapToProduct(result.rows[0]);
  }

  async findById(companyId: number, productId: number): Promise<IProduct | null> {
    const query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.category_id
      WHERE p.product_id = $1 AND p.company_id = $2 AND p.is_active = true
    `;

    const result = await this.pool.query(query, [productId, companyId]);
    return result.rows[0] ? this.mapToProduct(result.rows[0]) : null;
  }

  async findBySku(companyId: number, sku: string): Promise<IProduct | null> {
    const query = `
      SELECT * FROM products
      WHERE company_id = $1 AND sku = $2 AND is_active = true
    `;

    const result = await this.pool.query(query, [companyId, sku]);
    return result.rows[0] ? this.mapToProduct(result.rows[0]) : null;
  }

  async search(companyId: number, criteria: ProductSearchCriteria): Promise<IProduct[]> {
    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.category_id
      WHERE p.company_id = $1 AND p.is_active = true
    `;

    const params: any[] = [companyId];
    let paramIndex = 2;

    if (criteria.search) {
      query += ` AND (p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      params.push(`%${criteria.search}%`);
      paramIndex++;
    }

    if (criteria.category_ids?.length) {
      query += ` AND p.category_id = ANY($${paramIndex})`;
      params.push(criteria.category_ids);
      paramIndex++;
    }

    if (criteria.price_range) {
      query += ` AND p.base_price BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(criteria.price_range.min, criteria.price_range.max);
      paramIndex += 2;
    }

    if (criteria.product_types?.length) {
      query += ` AND p.product_type = ANY($${paramIndex})`;
      params.push(criteria.product_types);
      paramIndex++;
    }

    if (criteria.status?.length) {
      query += ` AND p.status = ANY($${paramIndex})`;
      params.push(criteria.status);
      paramIndex++;
    }

    if (criteria.is_active !== undefined) {
      query += ` AND p.is_active = $${paramIndex}`;
      params.push(criteria.is_active);
      paramIndex++;
    }

    query += ` ORDER BY p.name ASC`;

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapToProduct(row));
  }

  async update(companyId: number, productId: number, data: UpdateProductDto): Promise<IProduct> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic update query
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    });

    values.push(productId, companyId);

    const query = `
      UPDATE products
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP, updated_by = 1
      WHERE product_id = $${paramIndex} AND company_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return this.mapToProduct(result.rows[0]);
  }

  async delete(companyId: number, productId: number): Promise<boolean> {
    const query = `
      UPDATE products
      SET is_active = false, updated_at = CURRENT_TIMESTAMP, updated_by = 1
      WHERE product_id = $1 AND company_id = $2 AND is_active = true
    `;

    const result = await this.pool.query(query, [productId, companyId]);
    return result.rowCount > 0;
  }

  async findAll(companyId: number, limit = 100, offset = 0): Promise<IProduct[]> {
    const query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.category_id
      WHERE p.company_id = $1 AND p.is_active = true
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.pool.query(query, [companyId, limit, offset]);
    return result.rows.map(row => this.mapToProduct(row));
  }

  async updateInventory(productId: number, quantity: number, type: 'add' | 'subtract' | 'set'): Promise<boolean> {
    let query: string;

    switch (type) {
      case 'add':
        query = `
          UPDATE product_inventory
          SET quantity_on_hand = quantity_on_hand + $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE product_id = $1
        `;
        break;
      case 'subtract':
        query = `
          UPDATE product_inventory
          SET quantity_on_hand = quantity_on_hand - $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE product_id = $1
        `;
        break;
      case 'set':
        query = `
          UPDATE product_inventory
          SET quantity_on_hand = $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE product_id = $1
        `;
        break;
    }

    const result = await this.pool.query(query, [productId, quantity]);
    return result.rowCount > 0;
  }

  async getInventory(productId: number): Promise<any> {
    const query = `
      SELECT *
      FROM product_inventory
      WHERE product_id = $1
    `;

    const result = await this.pool.query(query, [productId]);
    return result.rows[0] || null;
  }

  private mapToProduct(row: any): IProduct {
    return {
      product_id: row.product_id,
      company_id: row.company_id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      category_id: row.category_id,
      base_price: parseFloat(row.base_price),
      cost: row.cost ? parseFloat(row.cost) : undefined,
      currency_code: row.currency_code,
      unit_of_measure: row.unit_of_measure,
      weight: row.weight ? parseFloat(row.weight) : undefined,
      dimensions: row.dimensions,
      product_type: row.product_type,
      is_configurable: row.is_configurable,
      is_bundle: row.is_bundle,
      track_inventory: row.track_inventory,
      min_quantity: row.min_quantity,
      max_quantity: row.max_quantity,
      status: row.status,
      is_active: row.is_active,
      attributes: row.attributes,
      custom_fields: row.custom_fields,
      seo_title: row.seo_title,
      seo_description: row.seo_description,
      seo_keywords: row.seo_keywords,
      created_at: row.created_at,
      created_by: row.created_by,
      updated_at: row.updated_at,
      updated_by: row.updated_by,
      search_vector: row.search_vector
    };
  }
}