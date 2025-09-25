/**
 * Product Category Repository
 * Sprint 20 Implementation
 */

import { Pool } from 'pg';
import {
  IProductCategory,
  CategoryTreeNode
} from '../../shared/interfaces/product.interfaces';

export class ProductCategoryRepository {
  constructor(private pool: Pool) {}

  async create(companyId: number, data: Partial<IProductCategory>): Promise<IProductCategory> {
    // Get parent category info for nested set model
    let leftNode = 1;
    let rightNode = 2;
    let depth = 0;

    if (data.parent_category_id) {
      const parentQuery = `
        SELECT right_node, depth
        FROM product_categories
        WHERE category_id = $1 AND company_id = $2
      `;
      const parentResult = await this.pool.query(parentQuery, [data.parent_category_id, companyId]);

      if (parentResult.rows[0]) {
        const parent = parentResult.rows[0];
        leftNode = parent.right_node;
        rightNode = parent.right_node + 1;
        depth = parent.depth + 1;

        // Update all nodes to the right
        await this.pool.query(
          `UPDATE product_categories
           SET right_node = right_node + 2
           WHERE right_node >= $1 AND company_id = $2`,
          [leftNode, companyId]
        );

        await this.pool.query(
          `UPDATE product_categories
           SET left_node = left_node + 2
           WHERE left_node > $1 AND company_id = $2`,
          [leftNode, companyId]
        );
      }
    }

    const query = `
      INSERT INTO product_categories (
        company_id, parent_category_id, name, description, image_url,
        left_node, right_node, depth, is_active, sort_order, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      companyId,
      data.parent_category_id || null,
      data.name,
      data.description,
      data.image_url,
      leftNode,
      rightNode,
      depth,
      data.is_active !== false,
      data.sort_order || 0,
      1 // TODO: Get from auth context
    ];

    const result = await this.pool.query(query, values);
    return this.mapToCategory(result.rows[0]);
  }

  async findById(companyId: number, categoryId: number): Promise<IProductCategory | null> {
    const query = `
      SELECT * FROM product_categories
      WHERE category_id = $1 AND company_id = $2
    `;

    const result = await this.pool.query(query, [categoryId, companyId]);
    return result.rows[0] ? this.mapToCategory(result.rows[0]) : null;
  }

  async findAll(companyId: number): Promise<IProductCategory[]> {
    const query = `
      SELECT * FROM product_categories
      WHERE company_id = $1
      ORDER BY left_node
    `;

    const result = await this.pool.query(query, [companyId]);
    return result.rows.map(row => this.mapToCategory(row));
  }

  async getTree(companyId: number): Promise<CategoryTreeNode[]> {
    const query = `
      WITH RECURSIVE category_tree AS (
        SELECT
          c.*,
          ARRAY[c.category_id] as path,
          0 as level
        FROM product_categories c
        WHERE c.parent_category_id IS NULL AND c.company_id = $1

        UNION ALL

        SELECT
          c.*,
          ct.path || c.category_id,
          ct.level + 1
        FROM product_categories c
        JOIN category_tree ct ON c.parent_category_id = ct.category_id
      )
      SELECT
        ct.*,
        (SELECT COUNT(*) FROM products WHERE category_id = ct.category_id) as product_count
      FROM category_tree ct
      ORDER BY ct.path
    `;

    const result = await this.pool.query(query, [companyId]);
    return this.buildTree(result.rows);
  }

  async getChildren(companyId: number, parentId: number): Promise<IProductCategory[]> {
    const query = `
      SELECT * FROM product_categories
      WHERE company_id = $1 AND parent_category_id = $2
      ORDER BY sort_order, name
    `;

    const result = await this.pool.query(query, [companyId, parentId]);
    return result.rows.map(row => this.mapToCategory(row));
  }

  async getPath(companyId: number, categoryId: number): Promise<IProductCategory[]> {
    const query = `
      SELECT parent.*
      FROM product_categories node,
           product_categories parent
      WHERE node.left_node BETWEEN parent.left_node AND parent.right_node
        AND node.category_id = $1
        AND node.company_id = $2
        AND parent.company_id = $2
      ORDER BY parent.left_node
    `;

    const result = await this.pool.query(query, [categoryId, companyId]);
    return result.rows.map(row => this.mapToCategory(row));
  }

  async update(companyId: number, categoryId: number, data: Partial<IProductCategory>): Promise<IProductCategory> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'category_id' && key !== 'company_id') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    values.push(categoryId, companyId);

    const query = `
      UPDATE product_categories
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP, updated_by = 1
      WHERE category_id = $${paramIndex} AND company_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return this.mapToCategory(result.rows[0]);
  }

  async delete(companyId: number, categoryId: number): Promise<boolean> {
    // Check if category has products
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM products
      WHERE category_id = $1 AND company_id = $2
    `;

    const checkResult = await this.pool.query(checkQuery, [categoryId, companyId]);
    if (parseInt(checkResult.rows[0].count) > 0) {
      throw new Error('Cannot delete category with products');
    }

    // Get node info for nested set update
    const nodeQuery = `
      SELECT left_node, right_node, (right_node - left_node + 1) as width
      FROM product_categories
      WHERE category_id = $1 AND company_id = $2
    `;

    const nodeResult = await this.pool.query(nodeQuery, [categoryId, companyId]);
    if (!nodeResult.rows[0]) {
      return false;
    }

    const { left_node, right_node, width } = nodeResult.rows[0];

    // Delete the category and its children
    await this.pool.query(
      `DELETE FROM product_categories
       WHERE left_node BETWEEN $1 AND $2 AND company_id = $3`,
      [left_node, right_node, companyId]
    );

    // Update the nested set
    await this.pool.query(
      `UPDATE product_categories
       SET right_node = right_node - $1
       WHERE right_node > $2 AND company_id = $3`,
      [width, right_node, companyId]
    );

    await this.pool.query(
      `UPDATE product_categories
       SET left_node = left_node - $1
       WHERE left_node > $2 AND company_id = $3`,
      [width, right_node, companyId]
    );

    return true;
  }

  private mapToCategory(row: any): IProductCategory {
    return {
      category_id: row.category_id,
      company_id: row.company_id,
      parent_category_id: row.parent_category_id,
      name: row.name,
      description: row.description,
      image_url: row.image_url,
      left_node: row.left_node,
      right_node: row.right_node,
      depth: row.depth,
      is_active: row.is_active,
      sort_order: row.sort_order,
      created_at: row.created_at,
      created_by: row.created_by,
      updated_at: row.updated_at,
      updated_by: row.updated_by
    };
  }

  private buildTree(rows: any[]): CategoryTreeNode[] {
    const map = new Map<number, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    // First pass: create all nodes
    rows.forEach(row => {
      const node: CategoryTreeNode = {
        category_id: row.category_id,
        name: row.name,
        parent_id: row.parent_category_id,
        children: [],
        product_count: row.product_count || 0,
        is_active: row.is_active
      };
      map.set(row.category_id, node);
    });

    // Second pass: build tree structure
    rows.forEach(row => {
      const node = map.get(row.category_id)!;
      if (row.parent_category_id) {
        const parent = map.get(row.parent_category_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }
}