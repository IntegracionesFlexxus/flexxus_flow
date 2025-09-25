// ProductVariantsManager - Sprint 19 Frontend Implementation

import React, { useState, useCallback } from 'react';
import { Plus, Edit, Trash2, Save, X, Package } from 'lucide-react';
import { Product, ProductVariant, ProductAttribute } from '../../../shared/types';

interface ProductVariantsManagerProps {
  product: Product;
  onVariantsChange: (variants: ProductVariant[]) => void;
  readOnly?: boolean;
}

const ProductVariantsManager: React.FC<ProductVariantsManagerProps> = ({
  product,
  onVariantsChange,
  readOnly = false
}) => {
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const variants = product.variants || [];

  const handleCreateVariant = useCallback(() => {
    const newVariant: ProductVariant = {
      id: Date.now(),
      productId: product.id,
      sku: `${product.sku}-V${variants.length + 1}`,
      attributes: [],
      price: product.basePrice || 0,
      inventoryQuantity: 0,
      isActive: true
    };

    setEditingVariant(newVariant);
    setIsCreating(true);
  }, [product, variants.length]);

  const handleSaveVariant = useCallback((variant: ProductVariant) => {
    let updatedVariants;
    if (isCreating) {
      updatedVariants = [...variants, variant];
    } else {
      updatedVariants = variants.map(v => v.id === variant.id ? variant : v);
    }

    onVariantsChange(updatedVariants);
    setEditingVariant(null);
    setIsCreating(false);
  }, [variants, isCreating, onVariantsChange]);

  const handleDeleteVariant = useCallback((variantId: number) => {
    const updatedVariants = variants.filter(v => v.id !== variantId);
    onVariantsChange(updatedVariants);
  }, [variants, onVariantsChange]);

  if (variants.length === 0 && readOnly) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">No variants available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Product Variants
          </h3>
          {!readOnly && (
            <button
              onClick={handleCreateVariant}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Variant
            </button>
          )}
        </div>

        <div className="space-y-4">
          {variants.map((variant) => (
            <div key={variant.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{variant.sku}</h4>
                  <p className="text-sm text-gray-500">
                    Price: ${variant.price} • Stock: {variant.inventoryQuantity}
                  </p>
                </div>
                {!readOnly && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingVariant(variant)}
                      className="text-blue-600 hover:text-blue-500"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteVariant(variant.id)}
                      className="text-red-600 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {editingVariant && (
          <div className="mt-4 border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-4">
              {isCreating ? 'Create' : 'Edit'} Variant
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">SKU</label>
                <input
                  type="text"
                  value={editingVariant.sku}
                  onChange={(e) => setEditingVariant({...editingVariant, sku: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Price</label>
                <input
                  type="number"
                  value={editingVariant.price}
                  onChange={(e) => setEditingVariant({...editingVariant, price: parseFloat(e.target.value) || 0})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setEditingVariant(null);
                  setIsCreating(false);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveVariant(editingVariant)}
                className="px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductVariantsManager;