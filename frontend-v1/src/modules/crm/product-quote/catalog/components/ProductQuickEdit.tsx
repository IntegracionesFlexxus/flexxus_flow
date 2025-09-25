// ProductQuickEdit - Sprint 19 Frontend Implementation

import React, { useState, useCallback } from 'react';
import { Save, X, Package, DollarSign, Tag } from 'lucide-react';
import { Product } from '../../../shared/types';

interface ProductQuickEditProps {
  product: Product;
  isEditing: boolean;
  onChange: (field: string, value: any) => void;
  onSave?: () => void;
  onCancel?: () => void;
}

const ProductQuickEdit: React.FC<ProductQuickEditProps> = ({
  product,
  isEditing,
  onChange,
  onSave,
  onCancel
}) => {
  const [localProduct, setLocalProduct] = useState(product);

  const handleFieldChange = useCallback((field: string, value: any) => {
    setLocalProduct(prev => ({ ...prev, [field]: value }));
    onChange(field, value);
  }, [onChange]);

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'discontinued', label: 'Discontinued' }
  ];

  const typeOptions = [
    { value: 'simple', label: 'Simple Product' },
    { value: 'variable', label: 'Variable Product' },
    { value: 'grouped', label: 'Grouped Product' },
    { value: 'external', label: 'External Product' }
  ];

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Basic Information
            </h3>
            <Package className="h-5 w-5 text-gray-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Product Name *
              </label>
              <div className="mt-1">
                {isEditing ? (
                  <input
                    type="text"
                    value={localProduct.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Enter product name"
                  />
                ) : (
                  <div className="text-sm text-gray-900">{product.name}</div>
                )}
              </div>
            </div>

            {/* SKU */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                SKU *
              </label>
              <div className="mt-1">
                {isEditing ? (
                  <input
                    type="text"
                    value={localProduct.sku}
                    onChange={(e) => handleFieldChange('sku', e.target.value)}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Enter SKU"
                  />
                ) : (
                  <div className="text-sm text-gray-900 font-mono">{product.sku}</div>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <div className="mt-1">
                {isEditing ? (
                  <select
                    value={localProduct.status}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    product.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : product.status === 'inactive'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.status}
                  </span>
                )}
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Product Type
              </label>
              <div className="mt-1">
                {isEditing ? (
                  <select
                    value={localProduct.type}
                    onChange={(e) => handleFieldChange('type', e.target.value)}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    {typeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-gray-900 capitalize">{product.type}</div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <div className="mt-1">
              {isEditing ? (
                <textarea
                  rows={3}
                  value={localProduct.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Enter product description"
                />
              ) : (
                <div className="text-sm text-gray-900 whitespace-pre-wrap">
                  {product.description || 'No description'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Pricing
            </h3>
            <DollarSign className="h-5 w-5 text-gray-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Base Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Base Price
              </label>
              <div className="mt-1">
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={localProduct.basePrice || ''}
                    onChange={(e) => handleFieldChange('basePrice', parseFloat(e.target.value) || 0)}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="0.00"
                  />
                ) : (
                  <div className="text-sm text-gray-900">
                    ${product.basePrice?.toFixed(2) || '0.00'}
                  </div>
                )}
              </div>
            </div>

            {/* Compare at Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Compare at Price
              </label>
              <div className="mt-1">
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={localProduct.compareAtPrice || ''}
                    onChange={(e) => handleFieldChange('compareAtPrice', parseFloat(e.target.value) || 0)}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="0.00"
                  />
                ) : (
                  <div className="text-sm text-gray-900">
                    {product.compareAtPrice ? `$${product.compareAtPrice.toFixed(2)}` : 'Not set'}
                  </div>
                )}
              </div>
            </div>

            {/* Cost Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Cost Price
              </label>
              <div className="mt-1">
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={localProduct.costPrice || ''}
                    onChange={(e) => handleFieldChange('costPrice', parseFloat(e.target.value) || 0)}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="0.00"
                  />
                ) : (
                  <div className="text-sm text-gray-900">
                    {product.costPrice ? `$${product.costPrice.toFixed(2)}` : 'Not set'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Physical Properties */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Physical Properties
            </h3>
            <Package className="h-5 w-5 text-gray-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Weight (kg)
              </label>
              <div className="mt-1">
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={localProduct.weight || ''}
                    onChange={(e) => handleFieldChange('weight', parseFloat(e.target.value) || 0)}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="0.00"
                  />
                ) : (
                  <div className="text-sm text-gray-900">
                    {product.weight ? `${product.weight} kg` : 'Not set'}
                  </div>
                )}
              </div>
            </div>

            {/* Dimensions */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Dimensions (L × W × H)
              </label>
              <div className="mt-1">
                {isEditing ? (
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={localProduct.dimensions?.length || ''}
                      onChange={(e) => handleFieldChange('dimensions', {
                        ...localProduct.dimensions,
                        length: parseFloat(e.target.value) || 0,
                        unit: localProduct.dimensions?.unit || 'cm'
                      })}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Length"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={localProduct.dimensions?.width || ''}
                      onChange={(e) => handleFieldChange('dimensions', {
                        ...localProduct.dimensions,
                        width: parseFloat(e.target.value) || 0,
                        unit: localProduct.dimensions?.unit || 'cm'
                      })}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Width"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={localProduct.dimensions?.height || ''}
                      onChange={(e) => handleFieldChange('dimensions', {
                        ...localProduct.dimensions,
                        height: parseFloat(e.target.value) || 0,
                        unit: localProduct.dimensions?.unit || 'cm'
                      })}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Height"
                    />
                  </div>
                ) : (
                  <div className="text-sm text-gray-900">
                    {product.dimensions
                      ? `${product.dimensions.length} × ${product.dimensions.width} × ${product.dimensions.height} ${product.dimensions.unit}`
                      : 'Not set'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Product Flags */}
          {isEditing && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Product Properties
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={localProduct.isDigital}
                    onChange={(e) => handleFieldChange('isDigital', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Digital product</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={localProduct.isVirtual}
                    onChange={(e) => handleFieldChange('isVirtual', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Virtual product</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={localProduct.isDownloadable}
                    onChange={(e) => handleFieldChange('isDownloadable', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Downloadable</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductQuickEdit;