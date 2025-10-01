/**
 * Product Category Repository Interface
 * Sprint 20 - Product & Quote Module
 */

import {
  IProductCategory,
  CategoryTreeNode
} from '../../shared/interfaces/product.interfaces';

export interface IProductCategoryRepository {
  /**
   * Create a new category
   */
  create(companyId: number, data: Partial<IProductCategory>): Promise<IProductCategory>;

  /**
   * Find category by ID
   */
  findById(companyId: number, categoryId: number): Promise<IProductCategory | null>;

  /**
   * Find category by name
   */
  findByName(name: string): Promise<IProductCategory | null>;

  /**
   * Get all categories for a company
   */
  findAll(companyId: number): Promise<IProductCategory[]>;

  /**
   * Get category tree (hierarchical structure)
   */
  getTree(companyId: number): Promise<CategoryTreeNode[]>;

  /**
   * Get direct children of a category
   */
  getChildren(companyId: number, parentId: number): Promise<IProductCategory[]>;

  /**
   * Get path from root to category
   */
  getPath(companyId: number, categoryId: number): Promise<IProductCategory[]>;

  /**
   * Update category
   */
  update(companyId: number, categoryId: number, data: Partial<IProductCategory>): Promise<IProductCategory>;

  /**
   * Delete category (soft delete)
   */
  delete(companyId: number, categoryId: number): Promise<boolean>;
}
