// ProductCard - Sprint 19 Frontend Implementation

import React, { useState, useCallback } from 'react';
import {
  Eye,
  Edit,
  Trash2,
  Package,
  DollarSign,
  Tag,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Copy,
  ExternalLink
} from 'lucide-react';

import { Product, ProductCardProps } from '../../../shared/types';
import { useInventory } from '../hooks/useInventory';

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  viewMode = 'grid',
  selectable = false,
  selected = false,
  onSelect,
  onSelectionToggle,
  onEdit,
  onDelete,
  isScrolling = false
}) => {
  const [showActions, setShowActions] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get inventory status
  const {
    getStockStatus,
    getAvailableQuantity,
    isLowStock,
    isOutOfStock
  } = useInventory({
    productIds: [product.id],
    autoRefresh: false
  });

  const stockStatus = getStockStatus(product.id);
  const availableQuantity = getAvailableQuantity(product.id);

  // Get primary image
  const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0];

  // Handle click
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.target instanceof HTMLInputElement) {
      // Don't trigger onSelect if clicking on checkbox
      return;
    }

    if (onSelect) {
      onSelect(product);
    }
  }, [onSelect, product]);

  // Handle selection toggle
  const handleSelectionToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectionToggle) {
      onSelectionToggle();
    }
  }, [onSelectionToggle]);

  // Handle actions
  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(product);
    }
  }, [onEdit, product]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(product.id);
    }
  }, [onDelete, product.id]);

  const handleCopySku = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(product.sku);
    // Show toast notification
  }, [product.sku]);

  // Format price
  const formatPrice = (price?: number) => {
    if (!price) return 'No price';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800';
      case 'discontinued':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get stock status color and icon
  const getStockInfo = () => {
    switch (stockStatus) {
      case 'in_stock':
        return {
          color: 'text-green-600',
          icon: <CheckCircle className="h-4 w-4" />,
          text: `${availableQuantity} in stock`
        };
      case 'low_stock':
        return {
          color: 'text-yellow-600',
          icon: <AlertTriangle className="h-4 w-4" />,
          text: `${availableQuantity} left`
        };
      case 'out_of_stock':
        return {
          color: 'text-red-600',
          icon: <XCircle className="h-4 w-4" />,
          text: 'Out of stock'
        };
      default:
        return {
          color: 'text-gray-600',
          icon: <Package className="h-4 w-4" />,
          text: 'Stock unknown'
        };
    }
  };

  const stockInfo = getStockInfo();

  // Grid view rendering
  if (viewMode === 'grid') {
    return (
      <div
        className={`bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group ${
          selected ? 'ring-2 ring-blue-500 border-blue-500' : ''
        } ${isScrolling ? 'pointer-events-none' : ''}`}
        onClick={handleClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Selection checkbox */}
        {selectable && (
          <div className="absolute top-2 left-2 z-10">
            <input
              type="checkbox"
              checked={selected}
              onChange={handleSelectionToggle}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        )}

        {/* Actions dropdown */}
        <div className={`absolute top-2 right-2 z-10 transition-opacity ${
          showActions || selected ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className="bg-white rounded-full p-1 shadow-sm border border-gray-200 hover:bg-gray-50"
            >
              <MoreVertical className="h-4 w-4 text-gray-600" />
            </button>

            {showActions && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect?.(product);
                  }}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </button>
                {onEdit && (
                  <button
                    onClick={handleEdit}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                )}
                <button
                  onClick={handleCopySku}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy SKU
                </button>
                {onDelete && (
                  <>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={handleDelete}
                      className="flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Product image */}
        <div className="aspect-square bg-gray-100 overflow-hidden">
          {primaryImage && !imageError ? (
            <img
              src={primaryImage.url}
              alt={primaryImage.alt || product.name}
              className={`w-full h-full object-cover transition-opacity ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="p-3">
          {/* Status badge */}
          <div className="flex items-center justify-between mb-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              getStatusColor(product.status)
            }`}>
              {product.status}
            </span>
            <span className={`inline-flex items-center text-xs font-medium ${stockInfo.color}`}>
              {stockInfo.icon}
              <span className="ml-1">{stockInfo.text}</span>
            </span>
          </div>

          {/* Product name */}
          <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600">
            {product.name}
          </h3>

          {/* SKU */}
          <p className="text-xs text-gray-500 mb-2">SKU: {product.sku}</p>

          {/* Price */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900">
              {formatPrice(product.basePrice)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > (product.basePrice || 0) && (
              <span className="text-sm text-gray-500 line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>

          {/* Category */}
          {product.category && (
            <div className="mt-2 flex items-center text-xs text-gray-500">
              <Tag className="h-3 w-3 mr-1" />
              {product.category.name}
            </div>
          )}
        </div>
      </div>
    );
  }

  // List view rendering
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow cursor-pointer group ${
        selected ? 'ring-2 ring-blue-500 border-blue-500' : ''
      } ${isScrolling ? 'pointer-events-none' : ''}`}
      onClick={handleClick}
    >
      <div className="flex items-center p-4">
        {/* Selection checkbox */}
        {selectable && (
          <div className="mr-4">
            <input
              type="checkbox"
              checked={selected}
              onChange={handleSelectionToggle}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        )}

        {/* Product image */}
        <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-md overflow-hidden">
          {primaryImage && !imageError ? (
            <img
              src={primaryImage.url}
              alt={primaryImage.alt || product.name}
              className={`w-full h-full object-cover transition-opacity ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="ml-4 flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                {product.name}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                SKU: {product.sku} • {product.category?.name || 'No category'}
              </p>
            </div>

            <div className="ml-4 flex items-center space-x-4">
              {/* Price */}
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  {formatPrice(product.basePrice)}
                </div>
                {product.compareAtPrice && product.compareAtPrice > (product.basePrice || 0) && (
                  <div className="text-xs text-gray-500 line-through">
                    {formatPrice(product.compareAtPrice)}
                  </div>
                )}
              </div>

              {/* Stock status */}
              <div className={`flex items-center text-xs ${stockInfo.color}`}>
                {stockInfo.icon}
                <span className="ml-1 hidden sm:inline">{stockInfo.text}</span>
              </div>

              {/* Status */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                getStatusColor(product.status)
              }`}>
                {product.status}
              </span>

              {/* Actions */}
              <div className="flex items-center space-x-1">
                {onEdit && (
                  <button
                    onClick={handleEdit}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;