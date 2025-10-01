/**
 * Product Repository Interface
 * Sprint 20 - Product & Quote Module
 */

import {
  IProduct,
  CreateProductDto,
  UpdateProductDto,
  ProductSearchCriteria
} from '../../shared/interfaces/product.interfaces';

export interface IProductRepository {
  /**
   * Create a new product
   */
  create(companyId: number, data: CreateProductDto): Promise<IProduct>;

  /**
   * Find product by ID
   */
  findById(companyId: number, productId: number): Promise<IProduct | null>;

  /**
   * Find product by SKU
   */
  findBySKU(companyId: number, sku: string): Promise<IProduct | null>;

  /**
   * Search products with criteria
   */
  search(companyId: number, criteria: ProductSearchCriteria): Promise<IProduct[]>;

  /**
   * Update product
   */
  update(companyId: number, productId: number, data: UpdateProductDto): Promise<IProduct>;

  /**
   * Delete product (soft delete)
   */
  delete(companyId: number, productId: number): Promise<boolean>;

  /**
   * Find all products
   */
  findAll(companyId: number, limit?: number, offset?: number): Promise<IProduct[]>;

  /**
   * Update inventory
   */
  updateInventory(productId: number, quantity: number, type: 'add' | 'subtract' | 'set'): Promise<boolean>;

  /**
   * Get inventory for a product
   */
  getInventory(productId: number): Promise<any>;

  /**
   * Check if product has active quotes
   */
  hasActiveQuotes(productId: number): Promise<boolean>;
}
