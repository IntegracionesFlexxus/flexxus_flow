/**
 * useAccountHierarchy Hook - Sprint 17
 * Hook for account hierarchy management
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountService } from '../services';
import { useNotification } from '@/shared/hooks/useNotification';
import type {
  HierarchyNode,
  HierarchyDirection,
  HierarchyMetrics,
  CreateHierarchyDto
} from '../types';

export const useAccountHierarchy = (accountId?: number) => {
  const [direction, setDirection] = useState<HierarchyDirection>('down');
  const [depth, setDepth] = useState<number>(3);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  /**
   * Fetch hierarchy tree
   */
  const {
    data: hierarchy,
    isLoading: loadingHierarchy,
    error: hierarchyError,
    refetch: refetchHierarchy
  } = useQuery({
    queryKey: ['account-hierarchy', accountId, direction, depth],
    queryFn: () => accountService.getFullHierarchy(accountId!, direction, depth),
    enabled: !!accountId,
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  /**
   * Fetch hierarchy metrics
   */
  const {
    data: hierarchyMetrics,
    isLoading: loadingMetrics,
    refetch: refetchMetrics
  } = useQuery({
    queryKey: ['hierarchy-metrics', accountId],
    queryFn: () => accountService.getHierarchyMetrics(accountId!),
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  /**
   * Create hierarchy relationship
   */
  const createHierarchyMutation = useMutation({
    mutationFn: (data: CreateHierarchyDto) =>
      accountService.createHierarchy(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['account-hierarchy']);
      queryClient.invalidateQueries(['hierarchy-metrics']);
      showSuccess('Hierarchy relationship created successfully');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Error creating hierarchy relationship');
    }
  });

  /**
   * Update hierarchy direction
   */
  const updateDirection = (newDirection: HierarchyDirection) => {
    setDirection(newDirection);
  };

  /**
   * Update hierarchy depth
   */
  const updateDepth = (newDepth: number) => {
    setDepth(Math.max(1, Math.min(10, newDepth))); // Limit between 1-10
  };

  /**
   * Calculate total nodes in hierarchy
   */
  const getTotalNodes = (node?: HierarchyNode): number => {
    if (!node) return 0;
    let count = 1;
    if (node.children) {
      node.children.forEach(child => {
        count += getTotalNodes(child);
      });
    }
    return count;
  };

  /**
   * Find node by account ID
   */
  const findNodeById = (
    node: HierarchyNode | undefined,
    accountId: number
  ): HierarchyNode | undefined => {
    if (!node) return undefined;
    if (node.account_id === accountId) return node;

    if (node.children) {
      for (const child of node.children) {
        const found = findNodeById(child, accountId);
        if (found) return found;
      }
    }
    return undefined;
  };

  /**
   * Get hierarchy path to root
   */
  const getPathToRoot = (node?: HierarchyNode): HierarchyNode[] => {
    if (!node) return [];
    const path: HierarchyNode[] = [];
    let current = node;

    while (current) {
      path.unshift(current);
      if (current.parent_id && hierarchy) {
        // Find parent in hierarchy
        // This is simplified - in real implementation, you'd need to traverse up
        break;
      } else {
        break;
      }
    }

    return path;
  };

  /**
   * Check if node has children
   */
  const hasChildren = (node?: HierarchyNode): boolean => {
    return !!(node?.children && node.children.length > 0);
  };

  /**
   * Get hierarchy level color
   */
  const getLevelColor = (level: number): string => {
    const colors = [
      '#1e40af', // level 0 - blue-800
      '#2563eb', // level 1 - blue-600
      '#3b82f6', // level 2 - blue-500
      '#60a5fa', // level 3 - blue-400
      '#93c5fd'  // level 4+ - blue-300
    ];
    return colors[Math.min(level, colors.length - 1)];
  };

  return {
    // Data
    hierarchy,
    hierarchyMetrics,
    direction,
    depth,

    // Loading states
    loadingHierarchy,
    loadingMetrics,
    isCreating: createHierarchyMutation.isLoading,

    // Errors
    hierarchyError,

    // Actions
    refetchHierarchy,
    refetchMetrics,
    createHierarchy: createHierarchyMutation.mutate,
    updateDirection,
    updateDepth,

    // Utilities
    getTotalNodes,
    findNodeById,
    getPathToRoot,
    hasChildren,
    getLevelColor
  };
};