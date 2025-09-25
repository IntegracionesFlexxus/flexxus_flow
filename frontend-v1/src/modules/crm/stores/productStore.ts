// Product Store - Sprint 19 Frontend Implementation
// Zustand store for product catalog management

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  Product,
  Category,
  ProductSearchParams,
  ProductSearchResult,
  ProductFilters,
  CreateProductDto,
  UpdateProductDto,
  ImportResult,
  InventoryLevel,
  ProductBundle
} from '../product-quote/shared/types';
import { productService, categoryService } from '../product-quote/catalog/services';

interface ProductStore {
  // State
  products: Product[];
  categories: Category[];
  selectedProducts: number[];
  currentProduct: Product | null;
  searchResult: ProductSearchResult | null;
  filters: ProductFilters;
  inventoryLevels: Map<number, InventoryLevel>;
  bundles: ProductBundle[];

  // Loading states
  loading: boolean;
  searchLoading: boolean;
  categoriesLoading: boolean;
  inventoryLoading: boolean;

  // Error states
  error: string | null;

  // Pagination
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;

  // View settings
  viewMode: 'grid' | 'list';
  sortBy: string;
  sortOrder: 'asc' | 'desc';

  // Actions - Product Management
  loadProducts: (page?: number, limit?: number) => Promise<void>;
  searchProducts: (params: ProductSearchParams) => Promise<void>;
  loadProduct: (id: number) => Promise<void>;
  createProduct: (productData: CreateProductDto) => Promise<Product>;
  updateProduct: (id: number, updates: UpdateProductDto) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  duplicateProduct: (id: number) => Promise<Product>;

  // Actions - Bulk Operations
  bulkDeleteProducts: (ids: number[]) => Promise<void>;
  bulkUpdateProducts: (updates: Array<{ id: number; data: Partial<UpdateProductDto> }>) => Promise<void>;
  selectProduct: (id: number) => void;
  selectAllProducts: () => void;
  clearSelection: () => void;

  // Actions - Import/Export
  importProducts: (file: File, options?: any) => Promise<ImportResult>;
  exportProducts: (params: any) => Promise<Blob>;

  // Actions - Categories
  loadCategories: () => Promise<void>;
  createCategory: (categoryData: any) => Promise<Category>;
  updateCategory: (id: number, updates: any) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  moveCategory: (categoryId: number, newParentId: number | null) => Promise<void>;

  // Actions - Inventory
  loadInventoryLevels: (productIds: number[]) => Promise<void>;
  updateInventoryLevel: (productId: number, level: Partial<InventoryLevel>) => Promise<void>;

  // Actions - Bundles
  loadBundles: () => Promise<void>;
  createBundle: (bundleData: any) => Promise<ProductBundle>;

  // Actions - Filters & Search
  setFilters: (filters: Partial<ProductFilters>) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;

  // Actions - View Settings
  setViewMode: (mode: 'grid' | 'list') => void;
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  setPageSize: (size: number) => void;

  // Actions - Utility
  clearError: () => void;
  resetStore: () => void;
}

const initialFilters: ProductFilters = {
  categories: [],
  status: [],
  type: [],
  tags: [],
  priceRange: [0, 10000],
  inStock: false,
  hasImages: false,
  search: ''
};

export const useProductStore = create<ProductStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        products: [],
        categories: [],
        selectedProducts: [],
        currentProduct: null,
        searchResult: null,
        filters: initialFilters,
        inventoryLevels: new Map(),
        bundles: [],

        // Loading states
        loading: false,
        searchLoading: false,
        categoriesLoading: false,
        inventoryLoading: false,

        // Error states
        error: null,

        // Pagination
        currentPage: 1,
        pageSize: 20,
        totalPages: 0,
        totalItems: 0,

        // View settings
        viewMode: 'grid',
        sortBy: 'name',
        sortOrder: 'asc',

        // Product Management Actions
        loadProducts: async (page = 1, limit?: number) => {
          const state = get();
          set({ loading: true, error: null });

          try {
            const pageSize = limit || state.pageSize;
            const response = await productService.getProducts(page, pageSize, state.filters);

            set({
              products: response.data,
              currentPage: response.pagination.page,
              totalPages: response.pagination.totalPages,
              totalItems: response.pagination.total,
              loading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load products',
              loading: false
            });
          }
        },

        searchProducts: async (params: ProductSearchParams) => {
          set({ searchLoading: true, error: null });

          try {
            const result = await productService.searchProducts(params);

            set({
              searchResult: result,
              products: result.products,
              totalItems: result.total,
              currentPage: result.page,
              searchLoading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Search failed',
              searchLoading: false
            });
          }
        },

        loadProduct: async (id: number) => {
          set({ loading: true, error: null });

          try {
            const product = await productService.getProduct(id);
            set({ currentProduct: product, loading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load product',
              loading: false
            });
          }
        },

        createProduct: async (productData: CreateProductDto) => {
          set({ loading: true, error: null });

          try {
            const newProduct = await productService.createProduct(productData);
            const state = get();

            set({
              products: [newProduct, ...state.products],
              totalItems: state.totalItems + 1,
              loading: false
            });

            return newProduct;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to create product',
              loading: false
            });
            throw error;
          }
        },

        updateProduct: async (id: number, updates: UpdateProductDto) => {
          set({ loading: true, error: null });

          try {
            const updatedProduct = await productService.updateProduct(id, updates);
            const state = get();

            set({
              products: state.products.map(p => p.id === id ? updatedProduct : p),
              currentProduct: state.currentProduct?.id === id ? updatedProduct : state.currentProduct,
              loading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update product',
              loading: false
            });
            throw error;
          }
        },

        deleteProduct: async (id: number) => {
          set({ loading: true, error: null });

          try {
            await productService.deleteProduct(id);
            const state = get();

            set({
              products: state.products.filter(p => p.id !== id),
              selectedProducts: state.selectedProducts.filter(pid => pid !== id),
              totalItems: state.totalItems - 1,
              currentProduct: state.currentProduct?.id === id ? null : state.currentProduct,
              loading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to delete product',
              loading: false
            });
            throw error;
          }
        },

        duplicateProduct: async (id: number) => {
          set({ loading: true, error: null });

          try {
            // Get original product
            const originalProduct = await productService.getProduct(id);

            // Create duplicate with modified name
            const duplicateData: CreateProductDto = {
              ...originalProduct,
              name: `${originalProduct.name} (Copy)`,
              sku: `${originalProduct.sku}_COPY_${Date.now()}`
            };

            const newProduct = await productService.createProduct(duplicateData);
            const state = get();

            set({
              products: [newProduct, ...state.products],
              totalItems: state.totalItems + 1,
              loading: false
            });

            return newProduct;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to duplicate product',
              loading: false
            });
            throw error;
          }
        },

        // Bulk Operations
        bulkDeleteProducts: async (ids: number[]) => {
          set({ loading: true, error: null });

          try {
            await productService.bulkDeleteProducts(ids);
            const state = get();

            set({
              products: state.products.filter(p => !ids.includes(p.id)),
              selectedProducts: [],
              totalItems: state.totalItems - ids.length,
              loading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to delete products',
              loading: false
            });
            throw error;
          }
        },

        bulkUpdateProducts: async (updates) => {
          set({ loading: true, error: null });

          try {
            await productService.bulkUpdateProducts(updates);

            // Reload products to get updated data
            await get().loadProducts();
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update products',
              loading: false
            });
            throw error;
          }
        },

        selectProduct: (id: number) => {
          const state = get();
          const isSelected = state.selectedProducts.includes(id);

          set({
            selectedProducts: isSelected
              ? state.selectedProducts.filter(pid => pid !== id)
              : [...state.selectedProducts, id]
          });
        },

        selectAllProducts: () => {
          const state = get();
          const allIds = state.products.map(p => p.id);

          set({
            selectedProducts: state.selectedProducts.length === allIds.length ? [] : allIds
          });
        },

        clearSelection: () => set({ selectedProducts: [] }),

        // Import/Export
        importProducts: async (file: File, options?: any) => {
          set({ loading: true, error: null });

          try {
            const result = await productService.importProducts(file, options);

            // Reload products after import
            await get().loadProducts();

            set({ loading: false });
            return result;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Import failed',
              loading: false
            });
            throw error;
          }
        },

        exportProducts: async (params: any) => {
          set({ loading: true, error: null });

          try {
            const blob = await productService.exportProducts(params);
            set({ loading: false });
            return blob;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Export failed',
              loading: false
            });
            throw error;
          }
        },

        // Category Management
        loadCategories: async () => {
          set({ categoriesLoading: true, error: null });

          try {
            const categories = await categoryService.getCategoryTree();
            set({ categories, categoriesLoading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load categories',
              categoriesLoading: false
            });
          }
        },

        createCategory: async (categoryData: any) => {
          set({ categoriesLoading: true, error: null });

          try {
            const newCategory = await categoryService.createCategory(categoryData);
            const state = get();

            set({
              categories: [...state.categories, newCategory],
              categoriesLoading: false
            });

            return newCategory;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to create category',
              categoriesLoading: false
            });
            throw error;
          }
        },

        updateCategory: async (id: number, updates: any) => {
          set({ categoriesLoading: true, error: null });

          try {
            const updatedCategory = await categoryService.updateCategory(id, updates);
            const state = get();

            set({
              categories: state.categories.map(c => c.id === id ? updatedCategory : c),
              categoriesLoading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update category',
              categoriesLoading: false
            });
            throw error;
          }
        },

        deleteCategory: async (id: number) => {
          set({ categoriesLoading: true, error: null });

          try {
            await categoryService.deleteCategory(id);
            const state = get();

            set({
              categories: state.categories.filter(c => c.id !== id),
              categoriesLoading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to delete category',
              categoriesLoading: false
            });
            throw error;
          }
        },

        moveCategory: async (categoryId: number, newParentId: number | null) => {
          set({ categoriesLoading: true, error: null });

          try {
            await categoryService.moveCategory(categoryId, newParentId);

            // Reload categories to get updated tree structure
            await get().loadCategories();
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to move category',
              categoriesLoading: false
            });
            throw error;
          }
        },

        // Inventory Management
        loadInventoryLevels: async (productIds: number[]) => {
          set({ inventoryLoading: true, error: null });

          try {
            const levels = await productService.getInventoryLevels(productIds);
            const state = get();
            const newLevels = new Map(state.inventoryLevels);

            levels.forEach(level => {
              newLevels.set(level.productId, level);
            });

            set({ inventoryLevels: newLevels, inventoryLoading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load inventory levels',
              inventoryLoading: false
            });
          }
        },

        updateInventoryLevel: async (productId: number, level: Partial<InventoryLevel>) => {
          // This would typically call an inventory service
          const state = get();
          const currentLevel = state.inventoryLevels.get(productId);

          if (currentLevel) {
            const updatedLevel = { ...currentLevel, ...level };
            const newLevels = new Map(state.inventoryLevels);
            newLevels.set(productId, updatedLevel);

            set({ inventoryLevels: newLevels });
          }
        },

        // Bundle Management
        loadBundles: async () => {
          set({ loading: true, error: null });

          try {
            const bundles = await productService.getProductBundles();
            set({ bundles, loading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load bundles',
              loading: false
            });
          }
        },

        createBundle: async (bundleData: any) => {
          set({ loading: true, error: null });

          try {
            const newBundle = await productService.createProductBundle(bundleData);
            const state = get();

            set({
              bundles: [...state.bundles, newBundle],
              loading: false
            });

            return newBundle;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to create bundle',
              loading: false
            });
            throw error;
          }
        },

        // Filter & Search Actions
        setFilters: (newFilters: Partial<ProductFilters>) => {
          const state = get();
          const updatedFilters = { ...state.filters, ...newFilters };

          set({ filters: updatedFilters });

          // Auto-search when filters change
          get().searchProducts({
            ...updatedFilters,
            page: 1,
            limit: state.pageSize
          });
        },

        clearFilters: () => {
          set({ filters: initialFilters });
          get().loadProducts(1);
        },

        setSearchQuery: (query: string) => {
          const state = get();
          const updatedFilters = { ...state.filters, search: query };

          set({ filters: updatedFilters });

          if (query.trim()) {
            get().searchProducts({
              query,
              page: 1,
              limit: state.pageSize
            });
          } else {
            get().loadProducts(1);
          }
        },

        // View Settings
        setViewMode: (mode: 'grid' | 'list') => set({ viewMode: mode }),

        setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => {
          set({ sortBy, sortOrder });

          // Re-search with new sorting
          const state = get();
          get().searchProducts({
            ...state.filters,
            sortBy,
            sortOrder,
            page: state.currentPage,
            limit: state.pageSize
          });
        },

        setPageSize: (size: number) => {
          set({ pageSize: size, currentPage: 1 });
          get().loadProducts(1, size);
        },

        // Utility Actions
        clearError: () => set({ error: null }),

        resetStore: () => set({
          products: [],
          categories: [],
          selectedProducts: [],
          currentProduct: null,
          searchResult: null,
          filters: initialFilters,
          inventoryLevels: new Map(),
          bundles: [],
          loading: false,
          searchLoading: false,
          categoriesLoading: false,
          inventoryLoading: false,
          error: null,
          currentPage: 1,
          pageSize: 20,
          totalPages: 0,
          totalItems: 0,
          viewMode: 'grid',
          sortBy: 'name',
          sortOrder: 'asc'
        })
      }),
      {
        name: 'product-store',
        // Only persist view settings and filters
        partialize: (state) => ({
          filters: state.filters,
          viewMode: state.viewMode,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          pageSize: state.pageSize
        })
      }
    ),
    { name: 'ProductStore' }
  )
);