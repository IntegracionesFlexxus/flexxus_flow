/**
 * Product Category Service Interface
 * Sprint 20 - Product & Quote Module
 */

// TODO: Create missing types file
// import { ProductCategory, ProductCategoryInput } from '../../../types/product.types';

export interface IProductCategoryService {
  /**
   * Create a new product category
   */
  create(data: any): Promise<any>;

  /**
   * Update an existing category
   */
  update(id: number, data: Partial<any>): Promise<any>;

  /**
   * Delete a category (soft delete)
   */
  delete(id: number): Promise<boolean>;

  /**
   * Find category by ID
   */
  findById(id: number): Promise<any | null>;

  /**
   * Get all categories
   */
  findAll(includeInactive?: boolean): Promise<any[]>;

  /**
   * Get category hierarchy as tree
   */
  getHierarchy(): Promise<any>;

  /**
   * Get direct children of a category
   */
  getChildren(parentId: number): Promise<any[]>;

  /**
   * Get all descendants of a category (recursive)
   */
  getChildrenRecursive(parentId: number): Promise<any[]>;

  /**
   * Get path from root to category
   */
  getPath(categoryId: number): Promise<any[]>;

  /**
   * Move category to a new parent
   */
  moveCategory(categoryId: number, newParentId: number | null): Promise<any>;
}
