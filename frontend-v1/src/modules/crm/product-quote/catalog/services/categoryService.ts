// Category Service - Sprint 19 Frontend Implementation

import {
  Category,
  ApiResponse,
  CreateDto,
  UpdateDto
} from '../../shared/types';

// API Endpoints
const ENDPOINTS = {
  CATEGORIES: '/api/crm/categories',
  CATEGORY_TREE: '/api/crm/categories/tree',
  CATEGORY_MOVE: (id: number) => `/api/crm/categories/${id}/move`,
  CATEGORY_PRODUCTS: (id: number) => `/api/crm/categories/${id}/products`
};

class CategoryService {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get all categories in flat list
   */
  async getCategories(filters?: { companyId?: number; active?: boolean }): Promise<Category[]> {
    const queryParams = new URLSearchParams();
    if (filters?.companyId) {
      queryParams.append('companyId', filters.companyId.toString());
    }
    if (filters?.active !== undefined) {
      queryParams.append('active', filters.active.toString());
    }

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.CATEGORIES}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }

    const data: ApiResponse<Category[]> = await response.json();
    return data.data;
  }

  /**
   * Get categories organized as tree structure using Nested Set Model
   */
  async getCategoryTree(companyId?: number): Promise<Category[]> {
    const queryParams = new URLSearchParams();
    if (companyId) {
      queryParams.append('companyId', companyId.toString());
    }

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.CATEGORY_TREE}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch category tree: ${response.statusText}`);
    }

    const data: ApiResponse<Category[]> = await response.json();
    return data.data;
  }

  /**
   * Get single category by ID
   */
  async getCategory(id: number): Promise<Category> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.CATEGORIES}/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch category: ${response.statusText}`);
    }

    const data: ApiResponse<Category> = await response.json();
    return data.data;
  }

  /**
   * Create new category
   */
  async createCategory(categoryData: CreateDto<Category>): Promise<Category> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.CATEGORIES}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(categoryData)
    });

    if (!response.ok) {
      throw new Error(`Failed to create category: ${response.statusText}`);
    }

    const data: ApiResponse<Category> = await response.json();
    return data.data;
  }

  /**
   * Update existing category
   */
  async updateCategory(id: number, updates: UpdateDto<Category>): Promise<Category> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.CATEGORIES}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Failed to update category: ${response.statusText}`);
    }

    const data: ApiResponse<Category> = await response.json();
    return data.data;
  }

  /**
   * Delete category
   */
  async deleteCategory(id: number, options?: { moveProductsTo?: number; deleteProducts?: boolean }): Promise<void> {
    const body = options ? JSON.stringify(options) : undefined;

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.CATEGORIES}/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body
    });

    if (!response.ok) {
      throw new Error(`Failed to delete category: ${response.statusText}`);
    }
  }

  /**
   * Move category to new parent (Nested Set Model)
   */
  async moveCategory(categoryId: number, newParentId: number | null, position?: 'first' | 'last' | number): Promise<void> {
    const body = {
      newParentId,
      position: position || 'last'
    };

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.CATEGORY_MOVE(categoryId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Failed to move category: ${response.statusText}`);
    }
  }

  /**
   * Get category ancestry path
   */
  async getCategoryPath(categoryId: number): Promise<Category[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.CATEGORIES}/${categoryId}/path`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch category path: ${response.statusText}`);
    }

    const data: ApiResponse<Category[]> = await response.json();
    return data.data;
  }

  /**
   * Get category descendants
   */
  async getCategoryDescendants(categoryId: number, maxDepth?: number): Promise<Category[]> {
    const queryParams = new URLSearchParams();
    if (maxDepth !== undefined) {
      queryParams.append('maxDepth', maxDepth.toString());
    }

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.CATEGORIES}/${categoryId}/descendants?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch category descendants: ${response.statusText}`);
    }

    const data: ApiResponse<Category[]> = await response.json();
    return data.data;
  }

  /**
   * Get category siblings
   */
  async getCategorySiblings(categoryId: number): Promise<Category[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.CATEGORIES}/${categoryId}/siblings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch category siblings: ${response.statusText}`);
    }

    const data: ApiResponse<Category[]> = await response.json();
    return data.data;
  }

  /**
   * Update category sort order
   */
  async updateCategorySortOrder(updates: Array<{ id: number; sortOrder: number }>): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.CATEGORIES}/sort-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ updates })
    });

    if (!response.ok) {
      throw new Error(`Failed to update category sort order: ${response.statusText}`);
    }
  }

  /**
   * Get products in category
   */
  async getCategoryProducts(categoryId: number, options?: {
    includeDescendants?: boolean;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (options?.includeDescendants) {
      queryParams.append('includeDescendants', 'true');
    }
    if (options?.page) {
      queryParams.append('page', options.page.toString());
    }
    if (options?.limit) {
      queryParams.append('limit', options.limit.toString());
    }

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.CATEGORY_PRODUCTS(categoryId)}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch category products: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Rebuild category tree (admin function)
   */
  async rebuildCategoryTree(companyId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.CATEGORIES}/rebuild-tree`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ companyId })
    });

    if (!response.ok) {
      throw new Error(`Failed to rebuild category tree: ${response.statusText}`);
    }
  }

  /**
   * Upload category image
   */
  async uploadCategoryImage(categoryId: number, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.CATEGORIES}/${categoryId}/image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to upload category image: ${response.statusText}`);
    }

    const data: ApiResponse<{ url: string }> = await response.json();
    return data.data;
  }

  /**
   * Search categories
   */
  async searchCategories(query: string, options?: {
    companyId?: number;
    includeInactive?: boolean;
    maxResults?: number;
  }): Promise<Category[]> {
    const queryParams = new URLSearchParams({
      q: query
    });

    if (options?.companyId) {
      queryParams.append('companyId', options.companyId.toString());
    }
    if (options?.includeInactive) {
      queryParams.append('includeInactive', 'true');
    }
    if (options?.maxResults) {
      queryParams.append('maxResults', options.maxResults.toString());
    }

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.CATEGORIES}/search?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to search categories: ${response.statusText}`);
    }

    const data: ApiResponse<Category[]> = await response.json();
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
    console.error('CategoryService Error:', error);
    throw error;
  }
}

// Export singleton instance
export const categoryService = new CategoryService();
export default categoryService;