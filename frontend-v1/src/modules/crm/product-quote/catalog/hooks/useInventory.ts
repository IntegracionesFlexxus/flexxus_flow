// useInventory Hook - Sprint 19 Frontend Implementation

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InventoryLevel } from '../../../shared/types';
import { productService } from '../services/productService';

interface InventoryAlert {
  productId: number;
  productName: string;
  currentStock: number;
  threshold: number;
  severity: 'low' | 'critical' | 'out_of_stock';
}

interface UseInventoryOptions {
  productIds?: number[];
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableAlerts?: boolean;
}

interface UseInventoryReturn {
  // Data
  inventoryLevels: Record<number, InventoryLevel>;
  alerts: InventoryAlert[];

  // State
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;

  // Statistics
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;

  // Actions
  refreshInventory: () => void;
  updateInventoryLevel: (productId: number, quantity: number) => Promise<void>;
  setLowStockThreshold: (productId: number, threshold: number) => Promise<void>;

  // Utilities
  getInventoryLevel: (productId: number) => InventoryLevel | null;
  isLowStock: (productId: number) => boolean;
  isOutOfStock: (productId: number) => boolean;
  getStockStatus: (productId: number) => 'in_stock' | 'low_stock' | 'out_of_stock';
  getAvailableQuantity: (productId: number) => number;
}

export const useInventory = (options: UseInventoryOptions = {}): UseInventoryReturn => {
  const queryClient = useQueryClient();

  const {
    productIds = [],
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enableAlerts = true
  } = options;

  // State
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Query for inventory levels
  const {
    data: inventoryData = [],
    isLoading: loading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ['inventory', 'levels', productIds],
    queryFn: () => productService.getInventoryLevels(productIds),
    enabled: productIds.length > 0,
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 15000, // 15 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    onSuccess: () => {
      setLastUpdated(new Date().toISOString());
    }
  });

  // Update inventory mutation
  const updateInventoryMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) =>
      productService.updateInventoryLevel(productId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setLastUpdated(new Date().toISOString());
    }
  });

  // Set threshold mutation
  const setThresholdMutation = useMutation({
    mutationFn: ({ productId, threshold }: { productId: number; threshold: number }) =>
      productService.setLowStockThreshold(productId, threshold),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });

  // Convert array to lookup object
  const inventoryLevels = useMemo((): Record<number, InventoryLevel> => {
    return inventoryData.reduce((acc, level) => {
      acc[level.productId] = level;
      return acc;
    }, {} as Record<number, InventoryLevel>);
  }, [inventoryData]);

  // Generate inventory alerts
  const alerts = useMemo((): InventoryAlert[] => {
    if (!enableAlerts) return [];

    return inventoryData
      .filter(level => {
        const available = level.available;
        const threshold = level.lowStockThreshold;
        return available <= threshold;
      })
      .map(level => {
        const available = level.available;
        const threshold = level.lowStockThreshold;

        let severity: InventoryAlert['severity'];
        if (available === 0) {
          severity = 'out_of_stock';
        } else if (available <= threshold * 0.5) {
          severity = 'critical';
        } else {
          severity = 'low';
        }

        return {
          productId: level.productId,
          productName: `Product ${level.productId}`, // This should come from product data
          currentStock: available,
          threshold,
          severity
        };
      })
      .sort((a, b) => {
        // Sort by severity: out_of_stock > critical > low
        const severityOrder = { out_of_stock: 3, critical: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
  }, [inventoryData, enableAlerts]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalProducts = inventoryData.length;
    const lowStockCount = inventoryData.filter(level =>
      level.available <= level.lowStockThreshold && level.available > 0
    ).length;
    const outOfStockCount = inventoryData.filter(level =>
      level.available === 0
    ).length;

    // Calculate total inventory value (requires product pricing data)
    const totalValue = inventoryData.reduce((sum, level) => {
      // This would need product price data to calculate properly
      return sum + (level.available * 0); // Placeholder
    }, 0);

    return {
      totalProducts,
      lowStockCount,
      outOfStockCount,
      totalValue
    };
  }, [inventoryData]);

  // Error handling
  const error = queryError?.message || null;

  // Utility functions
  const getInventoryLevel = useCallback((productId: number): InventoryLevel | null => {
    return inventoryLevels[productId] || null;
  }, [inventoryLevels]);

  const isLowStock = useCallback((productId: number): boolean => {
    const level = getInventoryLevel(productId);
    if (!level) return false;
    return level.available <= level.lowStockThreshold && level.available > 0;
  }, [getInventoryLevel]);

  const isOutOfStock = useCallback((productId: number): boolean => {
    const level = getInventoryLevel(productId);
    if (!level) return false;
    return level.available === 0;
  }, [getInventoryLevel]);

  const getStockStatus = useCallback((productId: number): 'in_stock' | 'low_stock' | 'out_of_stock' => {
    if (isOutOfStock(productId)) return 'out_of_stock';
    if (isLowStock(productId)) return 'low_stock';
    return 'in_stock';
  }, [isOutOfStock, isLowStock]);

  const getAvailableQuantity = useCallback((productId: number): number => {
    const level = getInventoryLevel(productId);
    return level?.available || 0;
  }, [getInventoryLevel]);

  // Actions
  const refreshInventory = useCallback(() => {
    refetch();
  }, [refetch]);

  const updateInventoryLevel = useCallback(async (productId: number, quantity: number): Promise<void> => {
    return updateInventoryMutation.mutateAsync({ productId, quantity });
  }, [updateInventoryMutation]);

  const setLowStockThreshold = useCallback(async (productId: number, threshold: number): Promise<void> => {
    return setThresholdMutation.mutateAsync({ productId, threshold });
  }, [setThresholdMutation]);

  // WebSocket connection for real-time updates (optional enhancement)
  useEffect(() => {
    if (!autoRefresh) return;

    // This could be implemented with WebSocket for real-time inventory updates
    // For now, we rely on the query's refetchInterval

    return () => {
      // Cleanup WebSocket connection if implemented
    };
  }, [autoRefresh, productIds]);

  return {
    // Data
    inventoryLevels,
    alerts,

    // State
    loading,
    error,
    lastUpdated,

    // Statistics
    totalProducts: statistics.totalProducts,
    lowStockCount: statistics.lowStockCount,
    outOfStockCount: statistics.outOfStockCount,
    totalValue: statistics.totalValue,

    // Actions
    refreshInventory,
    updateInventoryLevel,
    setLowStockThreshold,

    // Utilities
    getInventoryLevel,
    isLowStock,
    isOutOfStock,
    getStockStatus,
    getAvailableQuantity
  };
};

export default useInventory;