// useProductCatalog Hook - Sprint 19 Frontend Implementation

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Product,
  ProductSearchParams,
  ProductSearchResult,
  CreateProductDto,
  UpdateProductDto,
  ProductFilters
} from '../../../shared/types';
import { productService } from '../services/productService';

interface UseProductCatalogOptions {
  initialFilters?: Partial<ProductFilters>;
  autoSearch?: boolean;
  pageSize?: number;
}

interface UseProductCatalogReturn {
  // Data
  products: Product[];
  searchResult: ProductSearchResult | null;
  totalCount: number;
  currentPage: number;

  // State
  loading: boolean;
  error: string | null;
  filters: ProductFilters;
  searchQuery: string;
  viewMode: 'grid' | 'list';
  selectedProducts: number[];

  // Actions
  setFilters: (filters: Partial<ProductFilters>) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setCurrentPage: (page: number) => void;
  selectProduct: (productId: number) => void;
  selectAllProducts: (select: boolean) => void;
  clearSelection: () => void;

  // CRUD Operations
  createProduct: (data: CreateProductDto) => Promise<Product>;
  updateProduct: (id: number, data: UpdateProductDto) => Promise<Product>;
  deleteProduct: (id: number) => Promise<void>;
  bulkDeleteProducts: (ids: number[]) => Promise<void>;

  // Search & Pagination
  search: () => void;
  nextPage: () => void;
  previousPage: () => void;
  refreshData: () => void;

  // Utilities
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isProductSelected: (id: number) => boolean;
  clearFilters: () => void;
}

const defaultFilters: ProductFilters = {
  categories: [],
  status: [],
  type: [],
  tags: [],
  priceRange: [0, 10000],
  inStock: false,
  hasImages: false,
  search: ''
};

export const useProductCatalog = (options: UseProductCatalogOptions = {}): UseProductCatalogReturn => {
  const queryClient = useQueryClient();

  const {
    initialFilters = {},
    autoSearch = true,
    pageSize = 20
  } = options;

  // State
  const [filters, setFiltersState] = useState<ProductFilters>({
    ...defaultFilters,
    ...initialFilters
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);

  // Search parameters
  const searchParams = useMemo((): ProductSearchParams => ({
    query: searchQuery || filters.search,
    categoryId: filters.categories.length === 1 ? filters.categories[0] : undefined,
    status: filters.status.length > 0 ? filters.status : undefined,
    type: filters.type.length > 0 ? filters.type : undefined,
    tags: filters.tags.length > 0 ? filters.tags : undefined,
    minPrice: filters.priceRange[0] > 0 ? filters.priceRange[0] : undefined,
    maxPrice: filters.priceRange[1] < 10000 ? filters.priceRange[1] : undefined,
    inStock: filters.inStock || undefined,
    hasImages: filters.hasImages || undefined,
    page: currentPage,
    limit: pageSize,
    sortBy: 'name',
    sortOrder: 'asc',
    facets: ['categories', 'status', 'type', 'tags']
  }), [filters, searchQuery, currentPage, pageSize]);

  // Query for product search
  const {
    data: searchResult,
    isLoading: loading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ['products', 'search', searchParams],
    queryFn: () => productService.searchProducts(searchParams),
    enabled: autoSearch,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: (data: CreateProductDto) => productService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProductDto }) =>
      productService.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: (id: number) => productService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSelectedProducts(prev => prev.filter(productId => productId !== id));
    }
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => productService.bulkDeleteProducts(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSelectedProducts([]);
    }
  });

  // Derived data
  const products = searchResult?.products || [];
  const totalCount = searchResult?.total || 0;
  const error = queryError?.message || null;
  const hasNextPage = currentPage * pageSize < totalCount;
  const hasPreviousPage = currentPage > 1;

  // Filter actions
  const setFilters = useCallback((newFilters: Partial<ProductFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters);
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  // Search actions
  const search = useCallback(() => {
    refetch();
  }, [refetch]);

  // Pagination actions
  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPreviousPage]);

  // Selection actions
  const selectProduct = useCallback((productId: number) => {
    setSelectedProducts(prev => {
      const isSelected = prev.includes(productId);
      if (isSelected) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  }, []);

  const selectAllProducts = useCallback((select: boolean) => {
    if (select) {
      setSelectedProducts(products.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  }, [products]);

  const clearSelection = useCallback(() => {
    setSelectedProducts([]);
  }, []);

  const isProductSelected = useCallback((id: number) => {
    return selectedProducts.includes(id);
  }, [selectedProducts]);

  // CRUD operations
  const createProduct = useCallback(async (data: CreateProductDto): Promise<Product> => {
    return createProductMutation.mutateAsync(data);
  }, [createProductMutation]);

  const updateProduct = useCallback(async (id: number, data: UpdateProductDto): Promise<Product> => {
    return updateProductMutation.mutateAsync({ id, data });
  }, [updateProductMutation]);

  const deleteProduct = useCallback(async (id: number): Promise<void> => {
    return deleteProductMutation.mutateAsync(id);
  }, [deleteProductMutation]);

  const bulkDeleteProducts = useCallback(async (ids: number[]): Promise<void> => {
    return bulkDeleteMutation.mutateAsync(ids);
  }, [bulkDeleteMutation]);

  const refreshData = useCallback(() => {
    refetch();
  }, [refetch]);

  // Update search query and reset page
  const setSearchQueryWithReset = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  return {
    // Data
    products,
    searchResult,
    totalCount,
    currentPage,

    // State
    loading,
    error,
    filters,
    searchQuery,
    viewMode,
    selectedProducts,

    // Actions
    setFilters,
    setSearchQuery: setSearchQueryWithReset,
    setViewMode,
    setCurrentPage,
    selectProduct,
    selectAllProducts,
    clearSelection,

    // CRUD Operations
    createProduct,
    updateProduct,
    deleteProduct,
    bulkDeleteProducts,

    // Search & Pagination
    search,
    nextPage,
    previousPage,
    refreshData,

    // Utilities
    hasNextPage,
    hasPreviousPage,
    isProductSelected,
    clearFilters
  };
};

export default useProductCatalog;