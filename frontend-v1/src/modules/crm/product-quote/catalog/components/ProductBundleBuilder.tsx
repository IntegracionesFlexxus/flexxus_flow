// ProductBundleBuilder - Sprint 19 Frontend Implementation

import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Package, DollarSign } from 'lucide-react';
import { ProductBundle, BundleItem, Product } from '../../../shared/types';

interface ProductBundleBuilderProps {
  bundle?: ProductBundle;
  availableProducts: Product[];
  onSave: (bundle: Omit<ProductBundle, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const ProductBundleBuilder: React.FC<ProductBundleBuilderProps> = ({
  bundle,
  availableProducts,
  onSave,
  onCancel
}) => {
  const [bundleData, setBundleData] = useState<Partial<ProductBundle>>({
    name: bundle?.name || '',
    description: bundle?.description || '',
    bundleType: bundle?.bundleType || 'fixed',
    items: bundle?.items || [],
    pricing: bundle?.pricing || { type: 'percentage_discount', value: 0 },
    isActive: bundle?.isActive ?? true,
    companyId: bundle?.companyId || 1
  });

  const handleAddItem = useCallback((product: Product) => {
    const newItem: BundleItem = {
      id: Date.now(),
      productId: product.id,
      product,
      quantity: 1,
      isOptional: false,
      discountType: 'percentage',
      discount: 0
    };

    setBundleData(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
  }, []);

  const handleRemoveItem = useCallback((itemId: number) => {
    setBundleData(prev => ({
      ...prev,
      items: (prev.items || []).filter(item => item.id !== itemId)
    }));
  }, []);

  const handleSave = useCallback(() => {
    if (bundleData.name && bundleData.items && bundleData.items.length > 0) {
      onSave(bundleData as Omit<ProductBundle, 'id' | 'createdAt' | 'updatedAt'>);
    }
  }, [bundleData, onSave]);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          {bundle ? 'Edit' : 'Create'} Product Bundle
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Bundle Name</label>
            <input
              type="text"
              value={bundleData.name}
              onChange={(e) => setBundleData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={bundleData.description}
              onChange={(e) => setBundleData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bundle Items</label>
            <div className="space-y-2">
              {bundleData.items?.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Package className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-red-600 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-2">
              <select
                onChange={(e) => {
                  const product = availableProducts.find(p => p.id === parseInt(e.target.value));
                  if (product) handleAddItem(product);
                }}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value=""
              >
                <option value="">Add a product...</option>
                {availableProducts
                  .filter(p => !bundleData.items?.some(item => item.productId === p.id))
                  .map(product => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!bundleData.name || !bundleData.items?.length}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              Save Bundle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductBundleBuilder;