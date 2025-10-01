/**
 * Product Service Interface
 * Sprint 20 - Product & Quote Module
 */

export interface IProductService {
  /**
   * Create a new product
   */
  create(data: any): Promise<any>;

  /**
   * Update an existing product
   */
  update(id: number, data: any): Promise<any>;

  /**
   * Delete a product
   */
  delete(id: number): Promise<boolean>;

  /**
   * Find product by ID
   */
  findById(id: number): Promise<any | null>;

  /**
   * Find product by SKU
   */
  findBySKU(sku: string): Promise<any | null>;

  /**
   * Find all products with filters
   */
  findAll(filters?: any): Promise<any>;

  /**
   * Find products by category
   */
  findByCategory(categoryId: number): Promise<any[]>;

  /**
   * Update product stock
   */
  updateStock(id: number, quantity: number, operation: 'add' | 'subtract'): Promise<any>;

  /**
   * Bulk update product prices
   */
  bulkUpdatePrices(updates: Array<{ id: number; price: number }>): Promise<boolean>;

  /**
   * Get inventory status
   */
  getInventoryStatus(): Promise<any>;
}
