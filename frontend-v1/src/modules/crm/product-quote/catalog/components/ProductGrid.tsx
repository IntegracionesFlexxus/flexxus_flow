// ProductGrid - Sprint 19 Frontend Implementation

import React, { useMemo, useCallback } from 'react';
import { useVirtualScroll } from '../hooks/useVirtualScroll';
import { Product, ProductGridProps } from '../../../shared/types';
import ProductCard from './ProductCard';

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  loading = false,
  viewMode = 'grid',
  selectable = false,
  selectedItems = [],
  onProductSelect,
  onSelectionChange,
  onBulkAction,
  virtualScrolling = false
}) => {
  // Calculate item height based on view mode
  const getItemHeight = useCallback((index: number) => {
    return viewMode === 'grid' ? 320 : 120; // Grid cards are taller than list items
  }, [viewMode]);

  // Virtual scrolling setup
  const {
    containerRef,
    wrapperStyle,
    innerStyle,
    visibleItems,
    isScrolling
  } = useVirtualScroll(products, {
    itemHeight: getItemHeight,
    overscan: 5,
    scrollingDelay: 150
  });

  // Handle product selection
  const handleProductSelect = useCallback((product: Product) => {
    if (onProductSelect) {
      onProductSelect(product);
    }
  }, [onProductSelect]);

  // Handle checkbox selection
  const handleSelectionToggle = useCallback((productId: number) => {
    if (!selectable || !onSelectionChange) return;

    const isSelected = selectedItems.includes(productId);
    let newSelection: number[];

    if (isSelected) {
      newSelection = selectedItems.filter(id => id !== productId);
    } else {
      newSelection = [...selectedItems, productId];
    }

    onSelectionChange(newSelection);
  }, [selectable, selectedItems, onSelectionChange]);

  // Handle select all
  const handleSelectAll = useCallback((checked: boolean) => {
    if (!selectable || !onSelectionChange) return;

    const newSelection = checked ? products.map(p => p.id) : [];
    onSelectionChange(newSelection);
  }, [selectable, products, onSelectionChange]);

  // Check if all items are selected
  const allSelected = useMemo(() => {
    return products.length > 0 && selectedItems.length === products.length;
  }, [products.length, selectedItems.length]);

  // Check if some items are selected (for indeterminate state)
  const someSelected = useMemo(() => {
    return selectedItems.length > 0 && selectedItems.length < products.length;
  }, [selectedItems.length, products.length]);

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className={`grid gap-4 ${
      viewMode === 'grid'
        ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
        : 'grid-cols-1'
    }`}>
      {Array.from({ length: 12 }).map((_, index) => (
        <div
          key={index}
          className={`bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse ${
            viewMode === 'grid' ? 'h-80' : 'h-24'
          }`}
        >
          <div className={`bg-gray-200 ${viewMode === 'grid' ? 'h-48' : 'h-full w-24 float-left'}`} />
          <div className="p-4 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            {viewMode === 'grid' && (
              <>
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // Empty state
  const EmptyState = () => (
    <div className="text-center py-12">
      <div className="text-gray-400 mb-4">
        <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
      <p className="text-gray-500">
        Try adjusting your search criteria or filters to find what you're looking for.
      </p>
    </div>
  );

  // Render product items (either virtual or regular)
  const renderProducts = () => {
    if (virtualScrolling && products.length > 100) {
      // Use virtual scrolling for large datasets
      return (
        <div ref={containerRef} style={wrapperStyle}>
          <div style={innerStyle}>
            {visibleItems.map((item) => {
              const product = products[item.index];
              return (
                <div
                  key={product.id}
                  style={{
                    position: 'absolute',
                    top: item.offsetTop,
                    left: 0,
                    right: 0,
                    height: item.height
                  }}
                  className={viewMode === 'grid' ? 'px-2' : ''}
                >
                  <ProductCard
                    product={product}
                    viewMode={viewMode}
                    selectable={selectable}
                    selected={selectedItems.includes(product.id)}
                    onSelect={handleProductSelect}
                    onSelectionToggle={() => handleSelectionToggle(product.id)}
                    isScrolling={isScrolling}
                  />
                </div>
              );
            })}
          </div>
        </div>
      );
    } else {
      // Regular rendering for smaller datasets
      return (
        <div className={`grid gap-4 ${
          viewMode === 'grid'
            ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
            : 'grid-cols-1'
        }`}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              viewMode={viewMode}
              selectable={selectable}
              selected={selectedItems.includes(product.id)}
              onSelect={handleProductSelect}
              onSelectionToggle={() => handleSelectionToggle(product.id)}
            />
          ))}
        </div>
      );
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (products.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      {/* Bulk Selection Header */}
      {selectable && products.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(input) => {
                  if (input) input.indeterminate = someSelected;
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                {allSelected
                  ? `All ${products.length} products selected`
                  : someSelected
                  ? `${selectedItems.length} of ${products.length} products selected`
                  : `Select all ${products.length} products`}
              </span>
            </label>
          </div>

          {selectedItems.length > 0 && onBulkAction && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onBulkAction('export', selectedItems)}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Export Selected
              </button>
              <button
                onClick={() => onBulkAction('delete', selectedItems)}
                className="text-sm text-red-600 hover:text-red-500"
              >
                Delete Selected
              </button>
            </div>
          )}
        </div>
      )}

      {/* Product Grid */}
      {renderProducts()}

      {/* Virtual Scrolling Info */}
      {virtualScrolling && products.length > 100 && (
        <div className="text-center py-4 text-sm text-gray-500">
          Showing {visibleItems.length} of {products.length} products
          {isScrolling && <span className="ml-2 animate-pulse">• Scrolling...</span>}
        </div>
      )}
    </div>
  );
};

export default ProductGrid;