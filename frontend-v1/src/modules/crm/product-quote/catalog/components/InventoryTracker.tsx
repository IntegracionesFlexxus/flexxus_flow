// InventoryTracker - Sprint 19 Frontend Implementation

import React, { useState, useCallback } from 'react';
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Edit,
  Save,
  X,
  RefreshCw
} from 'lucide-react';
import { InventoryLevel } from '../../../shared/types';

interface InventoryTrackerProps {
  productId: number;
  inventoryLevel: InventoryLevel | null;
  onUpdate?: (productId: number, data: Partial<InventoryLevel>) => void;
  readOnly?: boolean;
}

const InventoryTracker: React.FC<InventoryTrackerProps> = ({
  productId,
  inventoryLevel,
  onUpdate,
  readOnly = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<InventoryLevel>>({});

  const handleEdit = useCallback(() => {
    if (inventoryLevel) {
      setEditData({
        quantity: inventoryLevel.quantity,
        lowStockThreshold: inventoryLevel.lowStockThreshold
      });
      setIsEditing(true);
    }
  }, [inventoryLevel]);

  const handleSave = useCallback(() => {
    if (onUpdate && editData) {
      onUpdate(productId, editData);
      setIsEditing(false);
      setEditData({});
    }
  }, [onUpdate, productId, editData]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditData({});
  }, []);

  if (!inventoryLevel) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No inventory data</h3>
            <p className="text-sm text-gray-500">
              Inventory tracking is not available for this product.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getStockStatus = () => {
    if (inventoryLevel.available === 0) {
      return { color: 'text-red-600', label: 'Out of Stock', icon: <AlertTriangle className="h-4 w-4" /> };
    } else if (inventoryLevel.available <= inventoryLevel.lowStockThreshold) {
      return { color: 'text-yellow-600', label: 'Low Stock', icon: <TrendingDown className="h-4 w-4" /> };
    } else {
      return { color: 'text-green-600', label: 'In Stock', icon: <TrendingUp className="h-4 w-4" /> };
    }
  };

  const stockStatus = getStockStatus();

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Inventory Tracking
          </h3>
          {!readOnly && !isEditing && (
            <button
              onClick={handleEdit}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </button>
          )}
          {isEditing && (
            <div className="flex space-x-2">
              <button
                onClick={handleCancel}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </button>
            </div>
          )}
        </div>

        {/* Status indicator */}
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${stockStatus.color} bg-gray-50 mb-6`}>
          {stockStatus.icon}
          <span className="ml-2">{stockStatus.label}</span>
        </div>

        {/* Inventory metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {inventoryLevel.available}
            </div>
            <div className="text-sm text-gray-500">Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {isEditing ? (
                <input
                  type="number"
                  value={editData.quantity || 0}
                  onChange={(e) => setEditData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  className="w-20 text-center border-gray-300 rounded-md"
                />
              ) : (
                inventoryLevel.quantity
              )}
            </div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {inventoryLevel.committed}
            </div>
            <div className="text-sm text-gray-500">Committed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {inventoryLevel.onOrder}
            </div>
            <div className="text-sm text-gray-500">On Order</div>
          </div>
        </div>

        {/* Settings */}
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Low Stock Threshold
              </label>
              <div className="mt-1">
                {isEditing ? (
                  <input
                    type="number"
                    value={editData.lowStockThreshold || 0}
                    onChange={(e) => setEditData(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) || 0 }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <div className="text-sm text-gray-900">
                    {inventoryLevel.lowStockThreshold}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <div className="mt-1 text-sm text-gray-900">
                {inventoryLevel.location || 'Default'}
              </div>
            </div>
          </div>
        </div>

        {/* Last updated */}
        <div className="mt-4 text-xs text-gray-500 flex items-center">
          <RefreshCw className="h-3 w-3 mr-1" />
          Last updated: {new Date(inventoryLevel.lastUpdated).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default InventoryTracker;