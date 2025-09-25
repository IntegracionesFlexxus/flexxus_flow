// Product Service - Sprint 19 Frontend Implementation

import {
  Product,
  ProductSearchParams,
  ProductSearchResult,
  CreateProductDto,
  UpdateProductDto,
  ImportResult,
  InventoryLevel,
  ProductBundle,
  ApiResponse,
  PaginatedResponse
} from '../../shared/types';

// API Endpoints
const ENDPOINTS = {
  PRODUCTS: '/api/crm/products',
  PRODUCT_SEARCH: '/api/crm/products/search',
  PRODUCT_VARIANTS: (id: number) => `/api/crm/products/${id}/variants`,
  PRODUCT_BUNDLES: '/api/crm/bundles',
  INVENTORY: '/api/crm/inventory/levels',
  IMPORT: '/api/crm/products/import',
  EXPORT: '/api/crm/products/export'
};

class ProductService {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Search products with advanced filtering and faceting
   */
  async searchProducts(params: ProductSearchParams): Promise<ProductSearchResult> {
    const queryParams = new URLSearchParams();

    // Add search parameters
    if (params.query) queryParams.append('query', params.query);
    if (params.categoryId) queryParams.append('categoryId', params.categoryId.toString());
    if (params.status?.length) queryParams.append('status', params.status.join(','));
    if (params.type?.length) queryParams.append('type', params.type.join(','));
    if (params.tags?.length) queryParams.append('tags', params.tags.join(','));
    if (params.minPrice !== undefined) queryParams.append('minPrice', params.minPrice.toString());
    if (params.maxPrice !== undefined) queryParams.append('maxPrice', params.maxPrice.toString());
    if (params.inStock !== undefined) queryParams.append('inStock', params.inStock.toString());
    if (params.hasImages !== undefined) queryParams.append('hasImages', params.hasImages.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.facets?.length) queryParams.append('facets', params.facets.join(','));

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PRODUCT_SEARCH}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Product search failed: ${response.statusText}`);
    }

    const data: ApiResponse<ProductSearchResult> = await response.json();
    return data.data;
  }

  /**
   * Get products with pagination
   */
  async getProducts(page: number = 1, limit: number = 20, filters?: Partial<ProductSearchParams>): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PRODUCTS}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get single product by ID
   */
  async getProduct(id: number): Promise<Product> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PRODUCTS}/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch product: ${response.statusText}`);
    }

    const data: ApiResponse<Product> = await response.json();
    return data.data;
  }

  /**
   * Create new product
   */
  async createProduct(productData: CreateProductDto): Promise<Product> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PRODUCTS}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(productData)
    });

    if (!response.ok) {
      throw new Error(`Failed to create product: ${response.statusText}`);
    }

    const data: ApiResponse<Product> = await response.json();
    return data.data;
  }

  /**
   * Update existing product
   */
  async updateProduct(id: number, updates: UpdateProductDto): Promise<Product> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PRODUCTS}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Failed to update product: ${response.statusText}`);
    }

    const data: ApiResponse<Product> = await response.json();
    return data.data;
  }

  /**
   * Delete product
   */
  async deleteProduct(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PRODUCTS}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete product: ${response.statusText}`);
    }
  }

  /**
   * Bulk delete products
   */
  async bulkDeleteProducts(ids: number[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PRODUCTS}/bulk-delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ ids })
    });

    if (!response.ok) {
      throw new Error(`Failed to bulk delete products: ${response.statusText}`);
    }
  }

  /**
   * Bulk update products
   */
  async bulkUpdateProducts(updates: Array<{ id: number; data: Partial<UpdateProductDto> }>): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PRODUCTS}/bulk-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ updates })
    });

    if (!response.ok) {
      throw new Error(`Failed to bulk update products: ${response.statusText}`);
    }
  }

  /**
   * Import products from file
   */
  async importProducts(file: File, options?: { hasHeaders?: boolean; mapping?: Record<string, string> }): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    if (options) {
      formData.append('options', JSON.stringify(options));
    }

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.IMPORT}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to import products: ${response.statusText}`);
    }

    const data: ApiResponse<ImportResult> = await response.json();
    return data.data;
  }

  /**
   * Export products to file
   */
  async exportProducts(params: {
    format: 'csv' | 'excel';
    filters?: ProductSearchParams;
    columns?: string[];
  }): Promise<Blob> {
    const queryParams = new URLSearchParams({
      format: params.format
    });

    if (params.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
    }
    if (params.columns) {
      queryParams.append('columns', params.columns.join(','));
    }

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.EXPORT}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to export products: ${response.statusText}`);
    }

    return await response.blob();
  }

  /**
   * Get product variants
   */
  async getProductVariants(productId: number): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PRODUCT_VARIANTS(productId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch product variants: ${response.statusText}`);
    }

    const data: ApiResponse<any[]> = await response.json();
    return data.data;
  }

  /**
   * Get inventory levels for products
   */
  async getInventoryLevels(productIds: number[]): Promise<InventoryLevel[]> {
    const queryParams = new URLSearchParams({
      productIds: productIds.join(',')
    });

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.INVENTORY}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch inventory levels: ${response.statusText}`);
    }

    const data: ApiResponse<InventoryLevel[]> = await response.json();
    return data.data;
  }

  /**
   * Get product bundles
   */
  async getProductBundles(filters?: { active?: boolean; productId?: number }): Promise<ProductBundle[]> {
    const queryParams = new URLSearchParams();
    if (filters?.active !== undefined) {
      queryParams.append('active', filters.active.toString());
    }
    if (filters?.productId) {
      queryParams.append('productId', filters.productId.toString());
    }

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PRODUCT_BUNDLES}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch product bundles: ${response.statusText}`);
    }

    const data: ApiResponse<ProductBundle[]> = await response.json();
    return data.data;
  }

  /**
   * Create product bundle
   */
  async createProductBundle(bundleData: Omit<ProductBundle, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductBundle> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PRODUCT_BUNDLES}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(bundleData)
    });

    if (!response.ok) {
      throw new Error(`Failed to create product bundle: ${response.statusText}`);
    }

    const data: ApiResponse<ProductBundle> = await response.json();
    return data.data;
  }

  /**
   * Upload product images
   */
  async uploadProductImages(productId: number, files: File[]): Promise<{ urls: string[] }> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`images[${index}]`, file);
    });

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PRODUCTS}/${productId}/images`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to upload product images: ${response.statusText}`);
    }

    const data: ApiResponse<{ urls: string[] }> = await response.json();
    return data.data;
  }

  /**
   * Get authentication token from storage or context
   */
  private getAuthToken(): string {
    // This should be implemented based on your auth system
    return localStorage.getItem('authToken') || '';
  }

  /**
   * Handle API errors consistently
   */
  private handleError(error: any): never {
    console.error('ProductService Error:', error);
    throw error;
  }
}

// Export singleton instance
export const productService = new ProductService();
export default productService;