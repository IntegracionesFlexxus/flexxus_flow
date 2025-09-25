/**
 * Enhanced Product Catalog Hook - Sprint 20 Implementation
 * Complete hook for product catalog management with advanced features
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '../shared/hooks/useDebounce';
import { usePagination } from '../shared/hooks/usePagination';
import { productService } from '../services/productService';
import {
  Product,
  ProductSearchParams,
  ProductSearchResult,
  BulkUpdateResult,
  ImportResult,
  ApiResponse,
  ProductFilters,
  SortOptions,
  ViewMode
} from '../../shared/types';
import { useNotification } from '../../../../shared/hooks/useNotification';
import { useAuth } from '../../../../shared/hooks/useAuth';
import { useWebSocket } from '../shared/hooks/useWebSocket';

export interface ProductCatalogState {
  products: Product[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  filters: ProductFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  sorting: SortOptions;
  selectedProducts: number[];
  viewMode: ViewMode;
  facets?: any;
  bulkOperations: {
    isActive: boolean;
    selectedCount: number;
    availableActions: string[];
  };
  cache: {
    lastUpdated: Date | null;
    isStale: boolean;
  };
}

export interface UseProductCatalogOptions {
  initialFilters?: Partial<ProductFilters>;
  initialViewMode?: ViewMode;
  pageSize?: number;
  enableRealTime?: boolean;
  enableBulkOperations?: boolean;
}

export const useProductCatalogEnhanced = (options: UseProductCatalogOptions = {}) => {
  const {
    initialFilters = {},
    initialViewMode = 'grid',
    pageSize = 20,
    enableRealTime = true,
    enableBulkOperations = true
  } = options;

  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const pagination = usePagination({ initialLimit: pageSize });

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ProductFilters>({
    categories: [],
    types: [],
    status: ['active'],
    tags: [],
    priceRange: { min: 0, max: null },
    inStock: null,
    hasImages: null,
    ...initialFilters
  });
  const [sorting, setSorting] = useState<SortOptions>({
    field: 'created_at',
    direction: 'desc'
  });
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSearchTime, setLastSearchTime] = useState<Date | null>(null);
  const searchAbortController = useRef<AbortController | null>(null);

  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Advanced search with abort capability and caching
  const searchProducts = useCallback(
    async (params: ProductSearchParams): Promise<ProductSearchResult> => {
      // Cancel previous search if still running
      if (searchAbortController.current) {
        searchAbortController.current.abort();
      }

      searchAbortController.current = new AbortController();

      try {
        setLastSearchTime(new Date());

        const result = await productService.searchProducts({
          ...params,
          page: pagination.page,
          limit: pagination.limit,
          sortBy: sorting.field,
          sortOrder: sorting.direction
        }, searchAbortController.current.signal);

        return result;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw new Error('Search cancelled');
        }
        throw new Error(error.message || 'Failed to search products');
      } finally {
        searchAbortController.current = null;
      }
    },
    [pagination.page, pagination.limit, sorting.field, sorting.direction]
  );

  // Query for products with advanced caching and optimization
  const {
    data: searchResult,
    isLoading,
    error,
    refetch,
    isFetching,
    isStale
  } = useQuery({
    queryKey: ['products', 'search', debouncedSearchQuery, filters, pagination.page, sorting],
    queryFn: () => searchProducts({ query: debouncedSearchQuery, ...filters }),
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: !isRefreshing,
    onError: (error: any) => {
      if (error.message !== 'Search cancelled') {
        showNotification({
          type: 'error',
          title: 'Search Error',
          message: error.message
        });
      }
    }
  });

  // Advanced bulk operations with progress tracking
  const bulkUpdate = useMutation({
    mutationFn: async (data: { productIds: number[]; updates: any; }) => {
      const result = await productService.bulkUpdateProducts(data.productIds, data.updates);

      // Show progress for large operations
      if (data.productIds.length > 10) {
        showNotification({
          type: 'info',
          title: 'Bulk Update',
          message: `Updating ${data.productIds.length} products...`,
          duration: 2000
        });
      }

      return result;
    },
    onSuccess: (result: BulkUpdateResult) => {
      queryClient.invalidateQueries(['products']);
      setSelectedProducts([]);
      setBulkEditMode(false);

      if (result.failed > 0) {
        showNotification({
          type: 'warning',
          title: 'Partial Success',
          message: `${result.successful} products updated, ${result.failed} failed`,
          details: result.errors?.slice(0, 5).map(e => e.message)
        });
      } else {
        showNotification({
          type: 'success',
          title: 'Products Updated',
          message: `${result.successful} products updated successfully`
        });
      }
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Update Failed',
        message: error.message || 'Failed to update products'
      });
    }
  });

  // Enhanced import with progress tracking and validation
  const importProducts = useMutation({
    mutationFn: async (file: File) => {
      // Validate file before upload
      if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
        throw new Error('Please upload a CSV file');
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('File size must be less than 10MB');
      }

      showNotification({
        type: 'info',
        title: 'Import Started',
        message: 'Processing your product file...',
        duration: 3000
      });

      return await productService.importProducts(file);
    },
    onSuccess: (result: ImportResult) => {
      queryClient.invalidateQueries(['products']);

      if (result.failed > 0) {
        showNotification({
          type: 'warning',
          title: 'Import Completed with Errors',
          message: `${result.successful} products imported, ${result.failed} failed`,
          details: result.errors?.slice(0, 10).map(e => `Row ${e.row}: ${e.error}`),
          duration: 8000
        });
      } else {
        showNotification({
          type: 'success',
          title: 'Import Successful',
          message: `${result.successful} products imported successfully`
        });
      }
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Import Failed',
        message: error.message || 'Failed to import products'
      });
    }
  });

  // Enhanced filter management with validation
  const updateFilters = useCallback((newFilters: Partial<ProductFilters>) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters };

      // Validate price range
      if (updated.priceRange?.min && updated.priceRange?.max &&
          updated.priceRange.min > updated.priceRange.max) {
        showNotification({
          type: 'warning',
          title: 'Invalid Price Range',
          message: 'Minimum price cannot be greater than maximum price'
        });
        return prev;
      }

      return updated;
    });
    pagination.setPage(1); // Reset to first page
  }, [pagination, showNotification]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      categories: [],
      types: [],
      status: ['active'],
      tags: [],
      priceRange: { min: 0, max: null },
      inStock: null,
      hasImages: null
    });
    setSearchQuery('');
    pagination.setPage(1);
  }, [pagination]);

  // Enhanced sorting with validation
  const updateSorting = useCallback((field: string, direction?: 'asc' | 'desc') => {
    const validSortFields = ['name', 'sku', 'base_price', 'created_at', 'updated_at', 'status'];

    if (!validSortFields.includes(field)) {
      showNotification({
        type: 'warning',
        title: 'Invalid Sort',
        message: 'Invalid sort field selected'
      });
      return;
    }

    setSorting(prev => ({
      field,
      direction: direction || (prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc')
    }));
  }, [showNotification]);

  // Enhanced selection management
  const toggleProductSelection = useCallback((productId: number) => {
    setSelectedProducts(prev => {
      const isSelected = prev.includes(productId);
      const newSelection = isSelected
        ? prev.filter(id => id !== productId)
        : [...prev, productId];

      // Auto-enable bulk mode when selecting products
      if (newSelection.length > 0 && !bulkEditMode) {
        setBulkEditMode(true);
      } else if (newSelection.length === 0 && bulkEditMode) {
        setBulkEditMode(false);
      }

      return newSelection;
    });
  }, [bulkEditMode]);

  const selectAllProducts = useCallback(() => {
    if (searchResult?.products) {
      const allIds = searchResult.products.map(p => p.id!).filter(Boolean);
      setSelectedProducts(allIds);
      setBulkEditMode(true);
    }
  }, [searchResult]);

  const selectAllPages = useCallback(async () => {
    try {
      const allProducts = await productService.getAllProductIds({
        query: debouncedSearchQuery,
        ...filters
      });
      setSelectedProducts(allProducts);
      showNotification({
        type: 'info',
        title: 'Selection Updated',
        message: `Selected ${allProducts.length} products across all pages`
      });
    } catch (error: any) {
      showNotification({
        type: 'error',
        title: 'Selection Failed',
        message: error.message
      });
    }
  }, [debouncedSearchQuery, filters, showNotification]);

  const clearSelection = useCallback(() => {
    setSelectedProducts([]);
    setBulkEditMode(false);
  }, []);

  // Enhanced export with progress and format options
  const exportProducts = useCallback(async (options: {
    format: 'csv' | 'xlsx' | 'json';
    includeImages?: boolean;
    includeVariants?: boolean;
    selectedOnly?: boolean;
  }) => {
    try {
      const exportData = {
        format: options.format,
        query: debouncedSearchQuery,
        ...filters,
        selectedIds: options.selectedOnly && selectedProducts.length > 0 ? selectedProducts : undefined,
        includeImages: options.includeImages,
        includeVariants: options.includeVariants
      };

      showNotification({
        type: 'info',
        title: 'Export Started',
        message: 'Preparing your export...',
        duration: 2000
      });

      const result = await productService.exportProducts(exportData);

      showNotification({
        type: 'success',
        title: 'Export Complete',
        message: `${result.count} products exported successfully`
      });

      // Trigger download
      if (result.downloadUrl) {
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.filename;
        link.click();
      }
    } catch (error: any) {
      showNotification({
        type: 'error',
        title: 'Export Failed',
        message: error.message || 'Failed to export products'
      });
    }
  }, [debouncedSearchQuery, filters, selectedProducts, showNotification]);

  // WebSocket integration for real-time updates
  const { subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    if (!enableRealTime) return;

    const handleInventoryUpdate = (data: any) => {
      if (data.productIds?.some((id: number) =>
        searchResult?.products.some(p => p.id === id)
      )) {
        queryClient.invalidateQueries(['products']);
      }
    };

    const handleProductUpdate = (data: any) => {
      queryClient.invalidateQueries(['products', 'search']);
    };

    subscribe('inventory_updated', handleInventoryUpdate);
    subscribe('product_updated', handleProductUpdate);

    return () => {
      unsubscribe('inventory_updated', handleInventoryUpdate);
      unsubscribe('product_updated', handleProductUpdate);
    };
  }, [subscribe, unsubscribe, queryClient, searchResult, enableRealTime]);

  // Manual refresh function
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      showNotification({
        type: 'success',
        title: 'Data Refreshed',
        message: 'Product catalog updated'
      });
    } catch (error: any) {
      showNotification({
        type: 'error',
        title: 'Refresh Failed',
        message: error.message
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, showNotification]);

  // Computed values
  const bulkOperations = useMemo(() => ({
    isActive: bulkEditMode && enableBulkOperations,
    selectedCount: selectedProducts.length,
    availableActions: [
      'update_status',
      'update_category',
      'update_pricing',
      'export',
      'delete'
    ].filter(action => {
      // Filter based on permissions
      return user?.permissions?.includes(`product.${action}`) ?? false;
    })
  }), [bulkEditMode, selectedProducts.length, user?.permissions, enableBulkOperations]);

  const cache = useMemo(() => ({
    lastUpdated: lastSearchTime,
    isStale
  }), [lastSearchTime, isStale]);

  // Product operations
  const deleteProduct = useMutation({
    mutationFn: (productId: number) => productService.deleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      showNotification({
        type: 'success',
        title: 'Product Deleted',
        message: 'Product deleted successfully'
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Delete Failed',
        message: error.message
      });
    }
  });

  const duplicateProduct = useMutation({
    mutationFn: (productId: number) => productService.duplicateProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      showNotification({
        type: 'success',
        title: 'Product Duplicated',
        message: 'Product duplicated successfully'
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Duplicate Failed',
        message: error.message
      });
    }
  });

  return {
    // State
    products: searchResult?.products || [],
    loading: isLoading,
    fetching: isFetching,
    refreshing: isRefreshing,
    error: error?.message || null,
    searchQuery,
    filters,
    pagination: {
      ...pagination,
      total: searchResult?.total || 0,
      totalPages: Math.ceil((searchResult?.total || 0) / pagination.limit)
    },
    sorting,
    selectedProducts,
    viewMode,
    facets: searchResult?.facets,
    bulkOperations,
    cache,

    // Actions
    setSearchQuery,
    updateFilters,
    clearFilters,
    updateSorting,
    setViewMode,
    toggleProductSelection,
    selectAllProducts,
    selectAllPages,
    clearSelection,
    setBulkEditMode,
    refreshData,

    // Mutations
    bulkUpdate: {
      mutate: bulkUpdate.mutate,
      isLoading: bulkUpdate.isLoading,
      error: bulkUpdate.error?.message
    },

    importProducts: {
      mutate: importProducts.mutate,
      isLoading: importProducts.isLoading,
      error: importProducts.error?.message
    },

    deleteProduct: {
      mutate: deleteProduct.mutate,
      isLoading: deleteProduct.isLoading,
      error: deleteProduct.error?.message
    },

    duplicateProduct: {
      mutate: duplicateProduct.mutate,
      isLoading: duplicateProduct.isLoading,
      error: duplicateProduct.error?.message
    },

    // Utilities
    refetch,
    exportProducts,

    // Stats
    stats: {
      totalProducts: searchResult?.total || 0,
      selectedCount: selectedProducts.length,
      isAllSelected: selectedProducts.length === searchResult?.products?.length,
      hasFilters: Object.values(filters).some(filter =>
        Array.isArray(filter) ? filter.length > 0 : filter !== null && filter !== undefined
      ) || searchQuery.length > 0
    },

    // Advanced features
    features: {
      realTimeUpdates: enableRealTime,
      bulkOperationsEnabled: enableBulkOperations,
      canExport: user?.permissions?.includes('product.export') ?? false,
      canImport: user?.permissions?.includes('product.import') ?? false,
      canBulkEdit: user?.permissions?.includes('product.bulk_edit') ?? false
    }
  };
};

// Export types for use in components
export type { ProductCatalogState };
export default useProductCatalogEnhanced;