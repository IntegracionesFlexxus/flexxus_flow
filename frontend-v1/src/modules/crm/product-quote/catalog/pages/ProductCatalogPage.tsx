// ProductCatalogPage - Sprint 19 Frontend Implementation

import React, { useState, useCallback } from 'react';
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Plus,
  Upload,
  Download,
  Settings,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import { useProductCatalog } from '../hooks/useProductCatalog';
import { useProductFilters } from '../hooks/useProductFilters';
import { useCategories } from '../hooks/useCategories';
import { Product, ViewMode } from '../../../shared/types';

// Components (will be implemented next)
import ProductGrid from '../components/ProductGrid';
import ProductFilters from '../components/ProductFilters';
import CategorySidebar from '../components/CategorySidebar';
import ProductDetailModal from '../components/ProductDetailModal';
import ProductImportExport from '../components/ProductImportExport';

interface ProductCatalogPageProps {
  companyId: number;
}

const ProductCatalogPage: React.FC<ProductCatalogPageProps> = ({ companyId }) => {
  // Local state
  const [showFilters, setShowFilters] = useState(true);
  const [showImportExport, setShowImportExport] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Hooks
  const {
    products,
    loading,
    error,
    totalCount,
    currentPage,
    viewMode,
    selectedProducts,
    setViewMode,
    setCurrentPage,
    setSearchQuery: setCatalogSearchQuery,
    selectProduct,
    selectAllProducts,
    clearSelection,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    bulkDeleteProducts,
    refreshData
  } = useProductCatalog({
    pageSize: 20,
    autoSearch: true
  });

  const {
    categories,
    selectedCategory,
    selectCategory,
    loading: categoriesLoading
  } = useCategories({
    showProductCounts: true
  });

  const {
    filters,
    filterGroups,
    activeFilterCount,
    hasActiveFilters,
    setFilter,
    clearAllFilters,
    getFilterSummary
  } = useProductFilters({
    categories,
    enableUrlSync: true
  });

  // Handlers
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCatalogSearchQuery(query);
  }, [setCatalogSearchQuery]);

  const handleViewModeChange = useCallback((mode: 'grid' | 'list') => {
    setViewMode(mode);
  }, [setViewMode]);

  const handleProductSelect = useCallback((product: Product) => {
    setSelectedProduct(product);
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedProducts.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedProducts.length} products? This action cannot be undone.`
    );

    if (confirmed) {
      try {
        await bulkDeleteProducts(selectedProducts);
        clearSelection();
      } catch (error) {
        console.error('Failed to delete products:', error);
        // Show error notification
      }
    }
  }, [selectedProducts, bulkDeleteProducts, clearSelection]);

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilter(key as any, value);
  }, [setFilter]);

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / 20);
  const startItem = (currentPage - 1) * 20 + 1;
  const endItem = Math.min(currentPage * 20, totalCount);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Product Catalog</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your product inventory and catalog
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowImportExport(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import/Export
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative flex-1 max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search products..."
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md ${
                showFilters
                  ? 'text-blue-700 bg-blue-50 border-blue-300'
                  : 'text-gray-700 bg-white hover:bg-gray-50'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {showFilters ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Clear all filters
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {/* Selection Actions */}
            {selectedProducts.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedProducts.length} selected
                </span>
                <button
                  onClick={handleBulkDelete}
                  className="text-sm text-red-600 hover:text-red-500"
                >
                  Delete
                </button>
                <button
                  onClick={clearSelection}
                  className="text-sm text-gray-600 hover:text-gray-500"
                >
                  Clear
                </button>
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center border border-gray-300 rounded-md">
              <button
                onClick={() => handleViewModeChange('grid')}
                className={`p-2 ${
                  viewMode === 'grid'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleViewModeChange('list')}
                className={`p-2 ${
                  viewMode === 'list'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            {getFilterSummary().map((filter, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {filter}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {showFilters && (
          <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <CategorySidebar
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={selectCategory}
                loading={categoriesLoading}
              />
              <div className="mt-6">
                <ProductFilters
                  filters={filters}
                  filterGroups={filterGroups}
                  onFilterChange={handleFilterChange}
                  onClearFilters={clearAllFilters}
                />
              </div>
            </div>
          </div>
        )}

        {/* Product Grid */}
        <div className="flex-1 flex flex-col">
          {/* Results Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {loading ? (
                  'Loading products...'
                ) : (
                  `Showing ${startItem}-${endItem} of ${totalCount} products`
                )}
              </div>

              {/* Pagination */}
              {totalCount > 0 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={previousPage}
                    disabled={!hasPreviousPage}
                    className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={nextPage}
                    disabled={!hasNextPage}
                    className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Product Grid Content */}
          <div className="flex-1 p-6">
            {error ? (
              <div className="text-center py-12">
                <div className="text-red-600 mb-2">Error loading products</div>
                <div className="text-gray-500 text-sm mb-4">{error}</div>
                <button
                  onClick={refreshData}
                  className="text-blue-600 hover:text-blue-500"
                >
                  Try again
                </button>
              </div>
            ) : (
              <ProductGrid
                products={products}
                loading={loading}
                viewMode={viewMode}
                selectedItems={selectedProducts}
                onProductSelect={handleProductSelect}
                onSelectionChange={(selectedIds) => {
                  // Handle selection change if needed
                }}
                virtualScrolling={true}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onEdit={(product) => {
            // Handle edit
            setSelectedProduct(null);
          }}
        />
      )}

      {showImportExport && (
        <ProductImportExport
          onClose={() => setShowImportExport(false)}
          onImportComplete={refreshData}
        />
      )}
    </div>
  );
};

export default ProductCatalogPage;