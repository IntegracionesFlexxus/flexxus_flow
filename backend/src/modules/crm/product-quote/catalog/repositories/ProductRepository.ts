/**
 * Product Repository - Sprint 20 Implementation
 * Conexión directa con ProductServiceImpl existente
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { Pool, PoolClient } from 'pg';
import { TYPES } from '@/container/types';
import {
  Product,
  CreateProductDto,
  UpdateProductDto,
  ProductSearchParams,
  BulkUpdateResult,
  InventoryUpdate
} from '../../shared/interfaces/product.interfaces';

export interface IInventoryInfo {
  available: number;
  reserved: number;
  on_hand: number;
}

@injectable()
export class ProductRepository {
  constructor(
    @inject(TYPES.CrmConnection) private pool: Pool,
    @inject(TYPES.Logger) private logger: any
  ) {}

  /**
   * Crear nuevo producto
   */
  async create(data: CreateProductDto): Promise<Product> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO products (
          sku, name, description, category_id, type, status,
          base_price, cost, currency, unit_of_measure, weight,
          dimensions, images, features, tags, metadata,
          min_order_quantity, max_order_quantity, lead_time_days,
          is_taxable, tax_class, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        ) RETURNING *
      `;

      const values = [
        data.sku,
        data.name,
        data.description,
        data.category_id,
        data.type || 'physical',
        data.status || 'draft',
        data.base_price,
        data.cost,
        data.currency || 'USD',
        data.unit_of_measure || 'unit',
        data.weight,
        JSON.stringify(data.dimensions || {}),
        JSON.stringify(data.images || []),
        JSON.stringify(data.features || []),
        data.tags || [],
        JSON.stringify(data.metadata || {}),
        data.min_quantity || 1,
        data.max_quantity,
        data.lead_time_days || 0,
        data.is_taxable !== false,
        data.tax_class,
        data.created_by || 1,
        data.updated_by || 1
      ];

      const result = await client.query(query, values);
      return this.mapToProduct(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating product', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Buscar producto por ID
   */
  async findById(id: number): Promise<Product | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT
          p.*,
          pc.name as category_name,
          pc.slug as category_slug,
          COALESCE(
            (SELECT json_agg(pv.*)
             FROM product_variants pv
             WHERE pv.product_id = p.id AND pv.is_active = true),
            '[]'::json
          ) as variants
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE p.id = $1
      `;

      const result = await client.query(query, [id]);
      return result.rows[0] ? this.mapToProduct(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  /**
   * Buscar producto por SKU
   */
  async findBySku(sku: string): Promise<Product | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT p.*, pc.name as category_name
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE p.sku = $1
      `;

      const result = await client.query(query, [sku]);
      return result.rows[0] ? this.mapToProduct(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  /**
   * Búsqueda avanzada con filtros y paginación
   */
  async search(filters: ProductSearchParams): Promise<{
    products: Product[];
    total: number;
    facets: any;
  }> {
    const client = await this.pool.connect();
    try {
      let whereClause = 'WHERE 1=1';
      const queryParams: any[] = [];
      let paramCount = 0;

      // Construcción dinámica de filtros
      if (filters.query) {
        paramCount++;
        whereClause += ` AND (
          p.name ILIKE $${paramCount} OR
          p.description ILIKE $${paramCount} OR
          p.sku ILIKE $${paramCount} OR
          array_to_string(p.tags, ' ') ILIKE $${paramCount}
        )`;
        queryParams.push(`%${filters.query}%`);
      }

      if (filters.categoryId) {
        paramCount++;
        whereClause += ` AND p.category_id = $${paramCount}`;
        queryParams.push(filters.categoryId);
      }

      if (filters.status && filters.status.length > 0) {
        paramCount++;
        whereClause += ` AND p.status = ANY($${paramCount})`;
        queryParams.push(filters.status);
      }

      if (filters.type && filters.type.length > 0) {
        paramCount++;
        whereClause += ` AND p.type = ANY($${paramCount})`;
        queryParams.push(filters.type);
      }

      if (filters.tags && filters.tags.length > 0) {
        paramCount++;
        whereClause += ` AND p.tags && $${paramCount}`;
        queryParams.push(filters.tags);
      }

      if (filters.minPrice !== undefined) {
        paramCount++;
        whereClause += ` AND p.base_price >= $${paramCount}`;
        queryParams.push(filters.minPrice);
      }

      if (filters.maxPrice !== undefined) {
        paramCount++;
        whereClause += ` AND p.base_price <= $${paramCount}`;
        queryParams.push(filters.maxPrice);
      }

      if (filters.inStock === true) {
        whereClause += ` AND EXISTS (
          SELECT 1 FROM product_variants pv
          WHERE pv.product_id = p.id AND pv.stock_quantity > 0
        )`;
      }

      if (filters.hasImages === true) {
        whereClause += ` AND jsonb_array_length(p.images) > 0`;
      }

      // Query principal con joins
      const mainQuery = `
        SELECT
          p.*,
          pc.name as category_name,
          pc.slug as category_slug,
          COALESCE(
            (SELECT SUM(pv.stock_quantity)
             FROM product_variants pv
             WHERE pv.product_id = p.id AND pv.is_active = true),
            0
          ) as total_stock
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        ${whereClause}
      `;

      // Contar total
      const countQuery = `SELECT COUNT(*) FROM products p ${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Aplicar ordenamiento
      const sortBy = filters.sortBy || 'created_at';
      const sortOrder = filters.sortOrder || 'desc';
      const sortClause = ` ORDER BY p.${sortBy} ${sortOrder.toUpperCase()}`;

      // Aplicar paginación
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      paramCount++;
      const limitClause = ` LIMIT $${paramCount}`;
      queryParams.push(limit);

      paramCount++;
      const offsetClause = ` OFFSET $${paramCount}`;
      queryParams.push(offset);

      const finalQuery = mainQuery + sortClause + limitClause + offsetClause;
      const result = await client.query(finalQuery, queryParams);

      // Generar facets
      const facets = await this.generateSearchFacets(client, whereClause, queryParams.slice(0, -2));

      return {
        products: result.rows.map(row => this.mapToProduct(row)),
        total,
        facets
      };
    } finally {
      client.release();
    }
  }

  /**
   * Actualizar producto
   */
  async update(id: number, data: UpdateProductDto): Promise<Product> {
    const client = await this.pool.connect();
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      // Construcción dinámica de UPDATE
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id') {
          paramCount++;
          updateFields.push(`${key} = $${paramCount}`);

          if (typeof value === 'object' && value !== null) {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      paramCount++;
      values.push(id);

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      const query = `
        UPDATE products
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Product not found');
      }

      return this.mapToProduct(result.rows[0]);
    } catch (error) {
      this.logger.error('Error updating product', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Eliminar producto (soft delete)
   */
  async delete(id: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE products
        SET
          status = 'archived',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      const result = await client.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error('Error deleting product', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Actualización masiva de productos
   */
  async bulkUpdate(ids: number[], updates: any): Promise<BulkUpdateResult> {
    const client = await this.pool.connect();
    const result: BulkUpdateResult = {
      total_rows: ids.length,
      successful: 0,
      failed: 0,
      errors: [],
      updated_products: []
    };

    try {
      await client.query('BEGIN');

      for (const id of ids) {
        try {
          const updated = await this.update(id, updates);
          result.updated_products.push(updated);
          result.successful++;
        } catch (error: any) {
          result.failed++;
          result.errors?.push({
            id,
            error: error.message
          });
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error in bulk update', error);
      throw error;
    } finally {
      client.release();
    }

    return result;
  }

  /**
   * Obtener disponibilidad de productos
   */
  async getAvailability(productIds: number[]): Promise<Map<number, IInventoryInfo>> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT
          product_id,
          SUM(stock_quantity) as on_hand,
          SUM(reserved_quantity) as reserved,
          SUM(stock_quantity - reserved_quantity) as available
        FROM product_variants
        WHERE product_id = ANY($1) AND is_active = true
        GROUP BY product_id
      `;

      const result = await client.query(query, [productIds]);
      const availability = new Map<number, IInventoryInfo>();

      result.rows.forEach(row => {
        availability.set(row.product_id, {
          available: parseInt(row.available) || 0,
          reserved: parseInt(row.reserved) || 0,
          on_hand: parseInt(row.on_hand) || 0
        });
      });

      // Agregar productos sin variantes con disponibilidad 0
      productIds.forEach(id => {
        if (!availability.has(id)) {
          availability.set(id, {
            available: 0,
            reserved: 0,
            on_hand: 0
          });
        }
      });

      return availability;
    } finally {
      client.release();
    }
  }

  /**
   * Actualizar inventario
   */
  async updateInventory(updates: InventoryUpdate[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const update of updates) {
        let query: string;
        let values: any[];

        if (update.variation_id) {
          // Actualizar variante específica
          switch (update.operation) {
            case 'add':
              query = `
                UPDATE product_variants
                SET
                  stock_quantity = stock_quantity + $1,
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
              `;
              values = [update.quantity_change, update.variation_id];
              break;
            case 'subtract':
              query = `
                UPDATE product_variants
                SET
                  stock_quantity = GREATEST(0, stock_quantity - $1),
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
              `;
              values = [update.quantity_change, update.variation_id];
              break;
            case 'set':
              query = `
                UPDATE product_variants
                SET
                  stock_quantity = $1,
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
              `;
              values = [update.quantity_change, update.variation_id];
              break;
            default:
              throw new Error(`Invalid operation: ${update.operation}`);
          }
        } else {
          // Actualizar todas las variantes del producto
          switch (update.operation) {
            case 'add':
              query = `
                UPDATE product_variants
                SET
                  stock_quantity = stock_quantity + $1,
                  updated_at = CURRENT_TIMESTAMP
                WHERE product_id = $2
              `;
              values = [update.quantity_change, update.product_id];
              break;
            case 'subtract':
              query = `
                UPDATE product_variants
                SET
                  stock_quantity = GREATEST(0, stock_quantity - $1),
                  updated_at = CURRENT_TIMESTAMP
                WHERE product_id = $2
              `;
              values = [update.quantity_change, update.product_id];
              break;
            case 'set':
              query = `
                UPDATE product_variants
                SET
                  stock_quantity = $1,
                  updated_at = CURRENT_TIMESTAMP
                WHERE product_id = $2
              `;
              values = [update.quantity_change, update.product_id];
              break;
            default:
              throw new Error(`Invalid operation: ${update.operation}`);
          }
        }

        await client.query(query, values);

        // Log del cambio de inventario
        await this.logInventoryChange(client, update);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating inventory', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Métodos auxiliares privados

  private mapToProduct(row: any): Product {
    return {
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      category_id: row.category_id,
      type: row.type,
      status: row.status,
      base_price: parseFloat(row.base_price),
      cost: row.cost ? parseFloat(row.cost) : undefined,
      currency: row.currency,
      unit_of_measure: row.unit_of_measure,
      weight: row.weight ? parseFloat(row.weight) : undefined,
      dimensions: row.dimensions,
      images: row.images || [],
      features: row.features || [],
      tags: row.tags || [],
      metadata: row.metadata || {},
      min_order_quantity: row.min_order_quantity,
      max_order_quantity: row.max_order_quantity,
      lead_time_days: row.lead_time_days,
      is_taxable: row.is_taxable,
      tax_class: row.tax_class,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
      // Campos adicionales del join
      category_name: row.category_name,
      category_slug: row.category_slug,
      variants: row.variants || [],
      total_stock: row.total_stock ? parseInt(row.total_stock) : 0
    };
  }

  private async generateSearchFacets(
    client: PoolClient,
    whereClause: string,
    params: any[]
  ): Promise<any> {
    const facets: any = {};

    try {
      // Facets por categoría
      const categoryQuery = `
        SELECT
          pc.id,
          pc.name,
          COUNT(p.id) as count
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        ${whereClause}
        GROUP BY pc.id, pc.name
        HAVING COUNT(p.id) > 0
        ORDER BY count DESC
        LIMIT 20
      `;
      const categoryResult = await client.query(categoryQuery, params);
      facets.categories = categoryResult.rows;

      // Facets por tipo
      const typeQuery = `
        SELECT
          type,
          COUNT(*) as count
        FROM products p
        ${whereClause}
        GROUP BY type
        ORDER BY count DESC
      `;
      const typeResult = await client.query(typeQuery, params);
      facets.types = typeResult.rows;

      // Facets por estado
      const statusQuery = `
        SELECT
          status,
          COUNT(*) as count
        FROM products p
        ${whereClause}
        GROUP BY status
        ORDER BY count DESC
      `;
      const statusResult = await client.query(statusQuery, params);
      facets.statuses = statusResult.rows;

      // Rango de precios
      const priceQuery = `
        SELECT
          MIN(base_price) as min_price,
          MAX(base_price) as max_price,
          AVG(base_price) as avg_price
        FROM products p
        ${whereClause}
      `;
      const priceResult = await client.query(priceQuery, params);
      facets.price_range = priceResult.rows[0];

      // Tags más comunes
      const tagsQuery = `
        SELECT
          unnest(tags) as tag,
          COUNT(*) as count
        FROM products p
        ${whereClause}
        AND tags IS NOT NULL
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 10
      `;
      const tagsResult = await client.query(tagsQuery, params);
      facets.tags = tagsResult.rows;

    } catch (error) {
      this.logger.error('Error generating facets', error);
      facets.error = 'Failed to generate facets';
    }

    return facets;
  }

  private async logInventoryChange(
    client: PoolClient,
    update: InventoryUpdate
  ): Promise<void> {
    try {
      const logQuery = `
        INSERT INTO inventory_logs (
          product_id, variant_id, quantity_change, operation,
          reason, reference_type, reference_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      `;

      await client.query(logQuery, [
        update.product_id,
        update.variation_id,
        update.quantity_change,
        update.operation,
        update.reason || 'Manual update',
        update.reference_type,
        update.reference_id
      ]);
    } catch (error) {
      // Ignorar errores de logging para no bloquear la operación principal
      this.logger.warn('Failed to log inventory change', error);
    }
  }
}