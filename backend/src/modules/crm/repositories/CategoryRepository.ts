/**
 * Category Repository - Sprint 19
 * Handles product category operations with Nested Set Model
 */

import { injectable, inject } from 'inversify';
import { PoolClient } from 'pg';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { CRMBaseRepository } from './CRMBaseRepository';

export interface ProductCategory {
  category_id?: number;
  company_id: number;
  parent_category_id?: number;
  name: string;
  description?: string;
  image_url?: string;
  left_node?: number;
  right_node?: number;
  depth?: number;
  is_active?: boolean;
  sort_order?: number;
  metadata?: any;
  created_at?: Date;
  updated_at?: Date;
  created_by?: number;
  updated_by?: number;
}

export interface CategoryNode {
  category_id: number;
  name: string;
  parent_id?: number;
  children?: CategoryNode[];
  product_count?: number;
  is_active: boolean;
  depth: number;
  path?: string;
}

export interface CategoryFilter {
  company_id?: number;
  parent_id?: number;
  is_active?: boolean;
  search?: string;
  depth_max?: number;
}

@injectable()
export class CategoryRepository extends CRMBaseRepository<ProductCategory> {
  constructor(
    @inject(TYPES.CRMDatabaseConnection) db: IDatabaseConnection,
    @inject(TYPES.Logger) logger: Logger
  ) {
    super('categories', db, logger);
  }

  /**
   * Create a new category
   */
  async createCategory(category: ProductCategory, userId?: number): Promise<ProductCategory> {
    const client = await this.db.getClient();

    try {
      await client.query('BEGIN');

      // If parent_id is provided, get parent's nested set values
      let parentLeft = 0;
      let parentRight = 0;
      let parentDepth = -1;

      if (category.parent_category_id) {
        const parentResult = await client.query(
          `SELECT left_node, right_node, depth
           FROM product_categories
           WHERE category_id = $1 AND company_id = $2`,
          [category.parent_category_id, category.company_id]
        );

        if (parentResult.rows.length === 0) {
          throw new Error('Parent category not found');
        }

        parentLeft = parentResult.rows[0].left_node;
        parentRight = parentResult.rows[0].right_node;
        parentDepth = parentResult.rows[0].depth;
      } else {
        // Get the max right value for root categories
        const maxRightResult = await client.query(
          `SELECT COALESCE(MAX(right_node), 0) as max_right
           FROM product_categories
           WHERE company_id = $1`,
          [category.company_id]
        );
        parentRight = maxRightResult.rows[0].max_right;
      }

      // Update nested set values for existing nodes
      const newLeft = parentRight;
      const newRight = parentRight + 1;
      const newDepth = parentDepth + 1;

      // Shift existing nodes to make room
      await client.query(
        `UPDATE product_categories
         SET right_node = right_node + 2
         WHERE right_node >= $1 AND company_id = $2`,
        [newLeft, category.company_id]
      );

      await client.query(
        `UPDATE product_categories
         SET left_node = left_node + 2
         WHERE left_node > $1 AND company_id = $2`,
        [newLeft, category.company_id]
      );

      // Insert the new category
      const result = await client.query(
        `INSERT INTO product_categories
         (company_id, parent_category_id, name, description, image_url,
          left_node, right_node, depth, is_active, sort_order, metadata,
          created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          category.company_id,
          category.parent_category_id,
          category.name,
          category.description,
          category.image_url,
          newLeft,
          newRight,
          newDepth,
          category.is_active ?? true,
          category.sort_order ?? 0,
          JSON.stringify(category.metadata || {}),
          userId || category.created_by,
          userId || category.updated_by
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating category:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update a category
   */
  async updateCategory(
    categoryId: number,
    updates: Partial<ProductCategory>,
    userId?: number
  ): Promise<ProductCategory> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic update query
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'category_id' && key !== 'left_node' && key !== 'right_node' && key !== 'depth') {
        fields.push(`${key} = $${paramCount}`);
        values.push(key === 'metadata' ? JSON.stringify(value) : value);
        paramCount++;
      }
    });

    if (userId) {
      fields.push(`updated_by = $${paramCount}`);
      values.push(userId);
      paramCount++;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(categoryId);

    const query = `
      UPDATE product_categories
      SET ${fields.join(', ')}
      WHERE category_id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId: number, companyId: number): Promise<ProductCategory | null> {
    const result = await this.db.query(
      `SELECT * FROM product_categories
       WHERE category_id = $1 AND company_id = $2`,
      [categoryId, companyId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get category tree for a company
   */
  async getCategoryTree(companyId: number, includeInactive: boolean = false): Promise<CategoryNode[]> {
    const activeClause = includeInactive ? '' : 'AND is_active = true';

    const result = await this.db.query(
      `WITH RECURSIVE category_tree AS (
        -- Root categories
        SELECT
          c.category_id,
          c.name,
          c.parent_category_id,
          c.depth,
          c.is_active,
          c.sort_order,
          ARRAY[c.name] as path
        FROM product_categories c
        WHERE c.company_id = $1
          AND c.parent_category_id IS NULL
          ${activeClause}

        UNION ALL

        -- Child categories
        SELECT
          c.category_id,
          c.name,
          c.parent_category_id,
          c.depth,
          c.is_active,
          c.sort_order,
          ct.path || c.name
        FROM product_categories c
        INNER JOIN category_tree ct ON c.parent_category_id = ct.category_id
        WHERE c.company_id = $1
          ${activeClause}
      ),
      category_counts AS (
        SELECT
          category_id,
          COUNT(DISTINCT p.product_id) as product_count
        FROM products p
        WHERE p.company_id = $1
        GROUP BY category_id
      )
      SELECT
        ct.*,
        COALESCE(cc.product_count, 0) as product_count,
        array_to_string(ct.path, ' > ') as path_string
      FROM category_tree ct
      LEFT JOIN category_counts cc ON ct.category_id = cc.category_id
      ORDER BY ct.sort_order, ct.name`,
      [companyId]
    );

    // Build tree structure
    return this.buildCategoryTree(result.rows);
  }

  /**
   * Build hierarchical tree from flat list
   */
  private buildCategoryTree(categories: any[]): CategoryNode[] {
    const categoryMap = new Map<number, CategoryNode>();
    const rootCategories: CategoryNode[] = [];

    // First pass: create all nodes
    categories.forEach(cat => {
      categoryMap.set(cat.category_id, {
        category_id: cat.category_id,
        name: cat.name,
        parent_id: cat.parent_category_id,
        children: [],
        product_count: cat.product_count,
        is_active: cat.is_active,
        depth: cat.depth,
        path: cat.path_string
      });
    });

    // Second pass: build tree structure
    categories.forEach(cat => {
      const node = categoryMap.get(cat.category_id)!;
      if (cat.parent_category_id) {
        const parent = categoryMap.get(cat.parent_category_id);
        if (parent) {
          parent.children!.push(node);
        }
      } else {
        rootCategories.push(node);
      }
    });

    return rootCategories;
  }

  /**
   * Move category to a new parent
   */
  async moveCategory(
    categoryId: number,
    newParentId: number | null,
    companyId: number
  ): Promise<void> {
    const client = await this.db.getClient();

    try {
      await client.query('BEGIN');

      // Get the category to move
      const categoryResult = await client.query(
        `SELECT left_node, right_node, depth, parent_category_id
         FROM product_categories
         WHERE category_id = $1 AND company_id = $2`,
        [categoryId, companyId]
      );

      if (categoryResult.rows.length === 0) {
        throw new Error('Category not found');
      }

      const category = categoryResult.rows[0];
      const oldLeft = category.left_node;
      const oldRight = category.right_node;
      const oldDepth = category.depth;
      const width = oldRight - oldLeft + 1;

      // Get new parent info
      let newParentLeft = 0;
      let newParentDepth = -1;

      if (newParentId) {
        const parentResult = await client.query(
          `SELECT left_node, right_node, depth
           FROM product_categories
           WHERE category_id = $1 AND company_id = $2`,
          [newParentId, companyId]
        );

        if (parentResult.rows.length === 0) {
          throw new Error('New parent category not found');
        }

        const parent = parentResult.rows[0];

        // Check if new parent is a descendant of the category
        if (parent.left_node >= oldLeft && parent.left_node <= oldRight) {
          throw new Error('Cannot move category to its own descendant');
        }

        newParentLeft = parent.right_node;
        newParentDepth = parent.depth;
      } else {
        // Moving to root
        const maxRightResult = await client.query(
          `SELECT COALESCE(MAX(right_node), 0) as max_right
           FROM product_categories
           WHERE company_id = $1`,
          [companyId]
        );
        newParentLeft = maxRightResult.rows[0].max_right + 1;
      }

      const depthDiff = newParentDepth - oldDepth + 1;
      const moveDiff = newParentLeft - oldLeft;

      // Temporarily "remove" the subtree
      await client.query(
        `UPDATE product_categories
         SET left_node = -left_node, right_node = -right_node
         WHERE left_node >= $1 AND right_node <= $2 AND company_id = $3`,
        [oldLeft, oldRight, companyId]
      );

      // Close the gap
      await client.query(
        `UPDATE product_categories
         SET left_node = left_node - $1
         WHERE left_node > $2 AND company_id = $3`,
        [width, oldRight, companyId]
      );

      await client.query(
        `UPDATE product_categories
         SET right_node = right_node - $1
         WHERE right_node > $2 AND company_id = $3`,
        [width, oldRight, companyId]
      );

      // Create space for the subtree
      await client.query(
        `UPDATE product_categories
         SET right_node = right_node + $1
         WHERE right_node >= $2 AND company_id = $3 AND left_node > 0`,
        [width, newParentLeft, companyId]
      );

      await client.query(
        `UPDATE product_categories
         SET left_node = left_node + $1
         WHERE left_node >= $2 AND company_id = $3 AND left_node > 0`,
        [width, newParentLeft, companyId]
      );

      // Move the subtree
      await client.query(
        `UPDATE product_categories
         SET
           left_node = -left_node + $1,
           right_node = -right_node + $1,
           depth = depth + $2,
           parent_category_id = CASE
             WHEN category_id = $3 THEN $4
             ELSE parent_category_id
           END
         WHERE left_node < 0 AND company_id = $5`,
        [moveDiff, depthDiff, categoryId, newParentId, companyId]
      );

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error moving category:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a category and its descendants
   */
  async deleteCategory(categoryId: number, companyId: number): Promise<void> {
    const client = await this.db.getClient();

    try {
      await client.query('BEGIN');

      // Get category info
      const result = await client.query(
        `SELECT left_node, right_node
         FROM product_categories
         WHERE category_id = $1 AND company_id = $2`,
        [categoryId, companyId]
      );

      if (result.rows.length === 0) {
        throw new Error('Category not found');
      }

      const { left_node, right_node } = result.rows[0];
      const width = right_node - left_node + 1;

      // Check if category has products
      const productCheck = await client.query(
        `SELECT COUNT(*) as count
         FROM products
         WHERE category_id IN (
           SELECT category_id
           FROM product_categories
           WHERE left_node >= $1 AND right_node <= $2 AND company_id = $3
         )`,
        [left_node, right_node, companyId]
      );

      if (productCheck.rows[0].count > 0) {
        throw new Error('Cannot delete category with products');
      }

      // Delete the category and its descendants
      await client.query(
        `DELETE FROM product_categories
         WHERE left_node >= $1 AND right_node <= $2 AND company_id = $3`,
        [left_node, right_node, companyId]
      );

      // Update nested set values
      await client.query(
        `UPDATE product_categories
         SET left_node = left_node - $1
         WHERE left_node > $2 AND company_id = $3`,
        [width, right_node, companyId]
      );

      await client.query(
        `UPDATE product_categories
         SET right_node = right_node - $1
         WHERE right_node > $2 AND company_id = $3`,
        [width, right_node, companyId]
      );

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error deleting category:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(
    categoryId: number,
    companyId: number,
    includeDescendants: boolean = true
  ): Promise<any[]> {
    let query: string;
    let params: any[];

    if (includeDescendants) {
      query = `
        SELECT p.*
        FROM products p
        INNER JOIN product_categories c ON p.category_id = c.category_id
        WHERE p.company_id = $1
          AND c.left_node >= (
            SELECT left_node FROM product_categories WHERE category_id = $2
          )
          AND c.right_node <= (
            SELECT right_node FROM product_categories WHERE category_id = $2
          )
        ORDER BY p.name
      `;
      params = [companyId, categoryId];
    } else {
      query = `
        SELECT *
        FROM products
        WHERE company_id = $1 AND category_id = $2
        ORDER BY name
      `;
      params = [companyId, categoryId];
    }

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Get category path
   */
  async getCategoryPath(categoryId: number, companyId: number): Promise<ProductCategory[]> {
    const result = await this.db.query(
      `WITH RECURSIVE category_path AS (
        SELECT *
        FROM product_categories
        WHERE category_id = $1 AND company_id = $2

        UNION ALL

        SELECT pc.*
        FROM product_categories pc
        INNER JOIN category_path cp ON pc.category_id = cp.parent_category_id
      )
      SELECT * FROM category_path
      ORDER BY depth`,
      [categoryId, companyId]
    );

    return result.rows;
  }

  /**
   * Search categories
   */
  async searchCategories(filter: CategoryFilter): Promise<ProductCategory[]> {
    const conditions = ['1=1'];
    const params: any[] = [];
    let paramCount = 1;

    if (filter.company_id) {
      conditions.push(`company_id = $${paramCount}`);
      params.push(filter.company_id);
      paramCount++;
    }

    if (filter.parent_id !== undefined) {
      if (filter.parent_id === null) {
        conditions.push('parent_category_id IS NULL');
      } else {
        conditions.push(`parent_category_id = $${paramCount}`);
        params.push(filter.parent_id);
        paramCount++;
      }
    }

    if (filter.is_active !== undefined) {
      conditions.push(`is_active = $${paramCount}`);
      params.push(filter.is_active);
      paramCount++;
    }

    if (filter.search) {
      conditions.push(`(name ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
      params.push(`%${filter.search}%`);
      paramCount++;
    }

    if (filter.depth_max !== undefined) {
      conditions.push(`depth <= $${paramCount}`);
      params.push(filter.depth_max);
      paramCount++;
    }

    const query = `
      SELECT * FROM product_categories
      WHERE ${conditions.join(' AND ')}
      ORDER BY left_node
    `;

    const result = await this.db.query(query, params);
    return result.rows;
  }
}