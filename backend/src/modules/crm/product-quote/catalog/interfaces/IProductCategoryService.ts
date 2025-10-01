/**
 * Product Category Service Interface
 * Sprint 20 - Product & Quote Module
 */

import { ProductCategory, ProductCategoryInput } from '../../../types/product.types';

export interface IProductCategoryService {
  /**
   * Create a new product category
   */
  create(data: ProductCategoryInput): Promise<ProductCategory>;

  /**
   * Update an existing category
   */
  update(id: number, data: Partial<ProductCategoryInput>): Promise<ProductCategory>;

  /**
   * Delete a category (soft delete)
   */
  delete(id: number): Promise<boolean>;

  /**
   * Find category by ID
   */
  findById(id: number): Promise<ProductCategory | null>;

  /**
   * Get all categories
   */
  findAll(includeInactive?: boolean): Promise<ProductCategory[]>;

  /**
   * Get category hierarchy as tree
   */
  getHierarchy(): Promise<any>;

  /**
   * Get direct children of a category
   */
  getChildren(parentId: number): Promise<ProductCategory[]>;

  /**
   * Get all descendants of a category (recursive)
   */
  getChildrenRecursive(parentId: number): Promise<ProductCategory[]>;

  /**
   * Get path from root to category
   */
  getPath(categoryId: number): Promise<ProductCategory[]>;

  /**
   * Move category to a new parent
   */
  moveCategory(categoryId: number, newParentId: number | null): Promise<ProductCategory>;
}
