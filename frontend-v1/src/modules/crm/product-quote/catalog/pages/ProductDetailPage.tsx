// ProductDetailPage - Sprint 19 Frontend Implementation

import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Save,
  X,
  Plus,
  Upload,
  ExternalLink,
  Package,
  BarChart3,
  DollarSign,
  Image as ImageIcon,
  Tag,
  Settings,
  Clock,
  User
} from 'lucide-react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Product, ProductVariant, InventoryLevel } from '../../../shared/types';
import { productService } from '../services/productService';
import { useInventory } from '../hooks/useInventory';

// Components (will be implemented next)
import ProductVariantsManager from '../components/ProductVariantsManager';
import InventoryTracker from '../components/InventoryTracker';
import ProductQuickEdit from '../components/ProductQuickEdit';

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Local state
  const [activeTab, setActiveTab] = useState('details');
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState<Product | null>(null);

  // Query for product details
  const {
    data: product,
    isLoading: productLoading,
    error: productError
  } = useQuery({
    queryKey: ['products', productId],
    queryFn: () => productService.getProduct(parseInt(productId!)),
    enabled: !!productId
  });

  // Inventory hook
  const {
    getInventoryLevel,
    getStockStatus,
    isLowStock,
    isOutOfStock
  } = useInventory({
    productIds: product ? [product.id] : [],
    autoRefresh: true
  });

  // Update mutation
  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      productService.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsEditing(false);
      setEditedProduct(null);
    }
  });

  // Delete mutation
  const deleteProductMutation = useMutation({
    mutationFn: (id: number) => productService.deleteProduct(id),
    onSuccess: () => {
      navigate('/crm/products');
    }
  });

  // Set edited product when product loads
  useEffect(() => {
    if (product && !editedProduct) {
      setEditedProduct(product);
    }
  }, [product, editedProduct]);

  // Handlers
  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedProduct(product);
  }, [product]);

  const handleSave = useCallback(async () => {
    if (!editedProduct || !product) return;

    try {
      await updateProductMutation.mutateAsync({
        id: product.id,
        data: editedProduct
      });
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  }, [editedProduct, product, updateProductMutation]);

  const handleDelete = useCallback(async () => {
    if (!product) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`
    );

    if (confirmed) {
      try {
        await deleteProductMutation.mutateAsync(product.id);
      } catch (error) {
        console.error('Failed to delete product:', error);
      }
    }
  }, [product, deleteProductMutation]);

  const handleFieldChange = useCallback((field: string, value: any) => {
    if (!editedProduct) return;

    setEditedProduct(prev => prev ? { ...prev, [field]: value } : null);
  }, [editedProduct]);

  // Tab configuration
  const tabs: TabItem[] = [
    {
      id: 'details',
      label: 'Product Details',
      icon: <Package className="h-4 w-4" />
    },
    {
      id: 'pricing',
      label: 'Pricing',
      icon: <DollarSign className="h-4 w-4" />
    },
    {
      id: 'variants',
      label: 'Variants',
      icon: <Settings className="h-4 w-4" />,
      count: product?.variants?.length
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: <BarChart3 className="h-4 w-4" />
    },
    {
      id: 'media',
      label: 'Media',
      icon: <ImageIcon className="h-4 w-4" />,
      count: product?.images?.length
    }
  ];

  // Get stock information
  const inventoryLevel = product ? getInventoryLevel(product.id) : null;
  const stockStatus = product ? getStockStatus(product.id) : 'in_stock';

  // Loading state
  if (productLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (productError || !product) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-2">Failed to load product</div>
          <div className="text-gray-500 text-sm mb-4">
            {productError?.message || 'Product not found'}
          </div>
          <button
            onClick={() => navigate('/crm/products')}
            className="text-blue-600 hover:text-blue-500"
          >
            Back to catalog
          </button>
        </div>
      </div>
    );
  }

  const displayProduct = editedProduct || product;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/crm/products')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {displayProduct.name}
                </h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  displayProduct.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : displayProduct.status === 'inactive'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {displayProduct.status}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  stockStatus === 'in_stock'
                    ? 'bg-green-100 text-green-800'
                    : stockStatus === 'low_stock'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {stockStatus === 'in_stock' ? 'In Stock' :
                   stockStatus === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                SKU: {displayProduct.sku} • Type: {displayProduct.type}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateProductMutation.isPending}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateProductMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <nav className="px-6 -mb-px flex space-x-8">
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
              {tab.count !== undefined && (
                <span className="bg-gray-100 text-gray-900 ml-2 py-0.5 px-2.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'details' && (
          <div className="max-w-4xl mx-auto p-6">
            <ProductQuickEdit
              product={displayProduct}
              isEditing={isEditing}
              onChange={handleFieldChange}
            />
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Pricing Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Base Price
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        value={displayProduct.basePrice || ''}
                        onChange={(e) => handleFieldChange('basePrice', parseFloat(e.target.value))}
                        disabled={!isEditing}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md disabled:bg-gray-50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Compare at Price
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        value={displayProduct.compareAtPrice || ''}
                        onChange={(e) => handleFieldChange('compareAtPrice', parseFloat(e.target.value))}
                        disabled={!isEditing}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md disabled:bg-gray-50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Cost Price
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        value={displayProduct.costPrice || ''}
                        onChange={(e) => handleFieldChange('costPrice', parseFloat(e.target.value))}
                        disabled={!isEditing}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md disabled:bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'variants' && (
          <div className="p-6">
            <ProductVariantsManager
              product={displayProduct}
              onVariantsChange={(variants) => handleFieldChange('variants', variants)}
              readOnly={!isEditing}
            />
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="p-6">
            <InventoryTracker
              productId={displayProduct.id}
              inventoryLevel={inventoryLevel}
              readOnly={!isEditing}
            />
          </div>
        )}

        {activeTab === 'media' && (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Product Images
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {displayProduct.images?.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image.url}
                        alt={image.alt || `Product image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                      {image.isPrimary && (
                        <div className="absolute top-2 left-2">
                          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            Primary
                          </span>
                        </div>
                      )}
                      {isEditing && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="bg-red-600 text-white p-1 rounded hover:bg-red-700">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <button className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors">
                      <div className="text-center">
                        <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                        <span className="text-sm text-gray-600">Add Image</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <User className="h-4 w-4 mr-1" />
              Created by {displayProduct.createdBy}
            </span>
            <span className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {new Date(displayProduct.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div>
            Last updated: {new Date(displayProduct.updatedAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;