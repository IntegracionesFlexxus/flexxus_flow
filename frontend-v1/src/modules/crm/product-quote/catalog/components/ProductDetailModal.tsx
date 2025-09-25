// ProductDetailModal - Sprint 19 Frontend Implementation

import React, { useState, useCallback } from 'react';
import {
  X,
  Edit,
  Package,
  DollarSign,
  BarChart3,
  Image as ImageIcon,
  Tag,
  ExternalLink,
  Copy,
  Share2,
  Heart,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

import { Product } from '../../../shared/types';
import { useInventory } from '../hooks/useInventory';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onEdit?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onAddToWishlist?: (product: Product) => void;
  readOnly?: boolean;
}

interface TabConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onEdit,
  onAddToCart,
  onAddToWishlist,
  readOnly = false
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Get inventory information
  const {
    getInventoryLevel,
    getStockStatus,
    getAvailableQuantity
  } = useInventory({
    productIds: [product.id],
    autoRefresh: false
  });

  const inventoryLevel = getInventoryLevel(product.id);
  const stockStatus = getStockStatus(product.id);
  const availableQuantity = getAvailableQuantity(product.id);

  // Tab configuration
  const tabs: TabConfig[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <Package className="h-4 w-4" />
    },
    {
      id: 'details',
      label: 'Details',
      icon: <Package className="h-4 w-4" />
    },
    {
      id: 'pricing',
      label: 'Pricing',
      icon: <DollarSign className="h-4 w-4" />
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: <BarChart3 className="h-4 w-4" />
    }
  ];

  // Handlers
  const handleEdit = useCallback(() => {
    if (onEdit) {
      onEdit(product);
    }
  }, [onEdit, product]);

  const handleAddToCart = useCallback(() => {
    if (onAddToCart && stockStatus !== 'out_of_stock') {
      onAddToCart(product);
    }
  }, [onAddToCart, product, stockStatus]);

  const handleAddToWishlist = useCallback(() => {
    if (onAddToWishlist) {
      onAddToWishlist(product);
    }
  }, [onAddToWishlist, product]);

  const handleCopySku = useCallback(() => {
    navigator.clipboard.writeText(product.sku);
    // Show toast notification
  }, [product.sku]);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: product.description,
        url: window.location.href
      });
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
    }
  }, [product]);

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

  // Get stock status info
  const getStockInfo = () => {
    switch (stockStatus) {
      case 'in_stock':
        return {
          color: 'text-green-600',
          icon: <CheckCircle className="h-4 w-4" />,
          text: `${availableQuantity} in stock`,
          bgColor: 'bg-green-50'
        };
      case 'low_stock':
        return {
          color: 'text-yellow-600',
          icon: <AlertTriangle className="h-4 w-4" />,
          text: `Only ${availableQuantity} left`,
          bgColor: 'bg-yellow-50'
        };
      case 'out_of_stock':
        return {
          color: 'text-red-600',
          icon: <XCircle className="h-4 w-4" />,
          text: 'Out of stock',
          bgColor: 'bg-red-50'
        };
      default:
        return {
          color: 'text-gray-600',
          icon: <Package className="h-4 w-4" />,
          text: 'Stock unknown',
          bgColor: 'bg-gray-50'
        };
    }
  };

  const stockInfo = getStockInfo();
  const selectedImage = product.images?.[selectedImageIndex];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900">
                {product.name}
              </h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                getStatusColor(product.status)
              }`}>
                {product.status}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleShare}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
                title="Share"
              >
                <Share2 className="h-5 w-5" />
              </button>
              {!readOnly && onEdit && (
                <button
                  onClick={handleEdit}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
                  title="Edit product"
                >
                  <Edit className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex">
            {/* Left side - Images and basic info */}
            <div className="w-1/2 p-6 border-r border-gray-200">
              {/* Image gallery */}
              <div className="space-y-4">
                {/* Main image */}
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {selectedImage ? (
                    <img
                      src={selectedImage.url}
                      alt={selectedImage.alt || product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-24 w-24 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Thumbnail gallery */}
                {product.images && product.images.length > 1 && (
                  <div className="flex space-x-2 overflow-x-auto">
                    {product.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                          index === selectedImageIndex
                            ? 'border-blue-500'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={image.url}
                          alt={image.alt || `Product image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Basic info */}
              <div className="mt-6 space-y-4">
                {/* Price */}
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatPrice(product.basePrice)}
                  </div>
                  {product.compareAtPrice && product.compareAtPrice > (product.basePrice || 0) && (
                    <div className="text-lg text-gray-500 line-through">
                      {formatPrice(product.compareAtPrice)}
                    </div>
                  )}
                </div>

                {/* Stock status */}
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  stockInfo.color
                } ${stockInfo.bgColor}`}>
                  {stockInfo.icon}
                  <span className="ml-2">{stockInfo.text}</span>
                </div>

                {/* Quick actions */}
                {!readOnly && (
                  <div className="space-y-3">
                    {/* Quantity selector */}
                    {stockStatus !== 'out_of_stock' && (
                      <div className="flex items-center space-x-3">
                        <label className="text-sm font-medium text-gray-700">
                          Quantity:
                        </label>
                        <div className="flex items-center border border-gray-300 rounded-md">
                          <button
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="p-2 hover:bg-gray-50"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 text-center border-0 focus:ring-0"
                            min="1"
                            max={availableQuantity}
                          />
                          <button
                            onClick={() => setQuantity(Math.min(availableQuantity, quantity + 1))}
                            className="p-2 hover:bg-gray-50"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex space-x-2">
                      {onAddToCart && (
                        <button
                          onClick={handleAddToCart}
                          disabled={stockStatus === 'out_of_stock'}
                          className="flex-1 flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Add to Cart
                        </button>
                      )}
                      {onAddToWishlist && (
                        <button
                          onClick={handleAddToWishlist}
                          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Heart className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right side - Detailed info */}
            <div className="w-1/2 flex flex-col">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Basic info */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Product Information</h3>
                      <dl className="grid grid-cols-1 gap-3">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">SKU</dt>
                          <dd className="mt-1 flex items-center space-x-2">
                            <span className="text-sm text-gray-900">{product.sku}</span>
                            <button
                              onClick={handleCopySku}
                              className="text-gray-400 hover:text-gray-600"
                              title="Copy SKU"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Type</dt>
                          <dd className="mt-1 text-sm text-gray-900 capitalize">{product.type}</dd>
                        </div>
                        {product.category && (
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Category</dt>
                            <dd className="mt-1 text-sm text-gray-900">{product.category.name}</dd>
                          </div>
                        )}
                        {product.tags && product.tags.length > 0 && (
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Tags</dt>
                            <dd className="mt-1 flex flex-wrap gap-1">
                              {product.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                >
                                  {tag}
                                </span>
                              ))}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    {/* Description */}
                    {product.description && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {product.description}
                        </p>
                      </div>
                    )}

                    {/* Long description */}
                    {product.longDescription && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Detailed Description</h3>
                        <div
                          className="text-sm text-gray-700 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: product.longDescription }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'details' && (
                  <div className="space-y-6">
                    {/* Physical properties */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Physical Properties</h3>
                      <dl className="grid grid-cols-1 gap-3">
                        {product.weight && (
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Weight</dt>
                            <dd className="mt-1 text-sm text-gray-900">{product.weight} kg</dd>
                          </div>
                        )}
                        {product.dimensions && (
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Dimensions</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height} {product.dimensions.unit}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    {/* Product flags */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Product Type</h3>
                      <div className="space-y-2">
                        {product.isDigital && (
                          <div className="flex items-center text-sm text-gray-700">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            Digital product
                          </div>
                        )}
                        {product.isVirtual && (
                          <div className="flex items-center text-sm text-gray-700">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            Virtual product
                          </div>
                        )}
                        {product.isDownloadable && (
                          <div className="flex items-center text-sm text-gray-700">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            Downloadable
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Custom fields */}
                    {product.customFields && Object.keys(product.customFields).length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Additional Information</h3>
                        <dl className="grid grid-cols-1 gap-3">
                          {Object.entries(product.customFields).map(([key, value]) => (
                            <div key={key}>
                              <dt className="text-sm font-medium text-gray-500 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </dt>
                              <dd className="mt-1 text-sm text-gray-900">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'pricing' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Pricing Information</h3>
                      <dl className="grid grid-cols-1 gap-3">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Base Price</dt>
                          <dd className="mt-1 text-lg font-semibold text-gray-900">
                            {formatPrice(product.basePrice)}
                          </dd>
                        </div>
                        {product.compareAtPrice && (
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Compare at Price</dt>
                            <dd className="mt-1 text-sm text-gray-500 line-through">
                              {formatPrice(product.compareAtPrice)}
                            </dd>
                          </div>
                        )}
                        {product.costPrice && (
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Cost Price</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {formatPrice(product.costPrice)}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    {/* Variants pricing */}
                    {product.variants && product.variants.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Variant Pricing</h3>
                        <div className="space-y-2">
                          {product.variants.map((variant, index) => (
                            <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span className="text-sm text-gray-700">{variant.sku}</span>
                              <span className="text-sm font-medium text-gray-900">
                                {formatPrice(variant.price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'inventory' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Stock Information</h3>
                      {inventoryLevel ? (
                        <dl className="grid grid-cols-1 gap-3">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Available</dt>
                            <dd className="mt-1 text-lg font-semibold text-gray-900">
                              {inventoryLevel.available}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Total Quantity</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {inventoryLevel.quantity}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Committed</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {inventoryLevel.committed}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">On Order</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {inventoryLevel.onOrder}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Low Stock Threshold</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {inventoryLevel.lowStockThreshold}
                            </dd>
                          </div>
                        </dl>
                      ) : (
                        <p className="text-sm text-gray-500">
                          No inventory information available.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;