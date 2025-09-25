/**
 * useAccountTerritory Hook - Sprint 17
 * Hook for account territory management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountService, territoryService } from '../services';
import { useNotification } from '@/shared/hooks/useNotification';
import type { Territory, TerritoryAssignment } from '../types';

export const useAccountTerritory = (accountId?: number) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  /**
   * Fetch account territory
   */
  const {
    data: territory,
    isLoading: loadingTerritory,
    error: territoryError,
    refetch: refetchTerritory
  } = useQuery({
    queryKey: ['account-territory', accountId],
    queryFn: () => accountService.getAccountTerritory(accountId!),
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  /**
   * Fetch all territories
   */
  const {
    data: territories,
    isLoading: loadingTerritories
  } = useQuery({
    queryKey: ['territories'],
    queryFn: () => territoryService.getTerritories(),
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  /**
   * Assign account to territory
   */
  const assignTerritoryMutation = useMutation({
    mutationFn: ({ accountId, territoryId, reason }: {
      accountId: number;
      territoryId: number;
      reason?: string;
    }) => accountService.assignToTerritory(accountId, territoryId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['account-territory']);
      queryClient.invalidateQueries(['territories']);
      showSuccess('Account assigned to territory successfully');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Error assigning territory');
    }
  });

  /**
   * Bulk assign accounts to territory
   */
  const bulkAssignMutation = useMutation({
    mutationFn: ({ territoryId, accountIds, reason }: {
      territoryId: number;
      accountIds: number[];
      reason?: string;
    }) => territoryService.assignAccountsToTerritory(territoryId, accountIds, reason),
    onSuccess: (result) => {
      queryClient.invalidateQueries(['account-territory']);
      queryClient.invalidateQueries(['territories']);
      showSuccess(`${result.length} accounts assigned to territory`);
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Error in bulk assignment');
    }
  });

  /**
   * Get territory performance
   */
  const {
    data: territoryPerformance,
    refetch: refetchPerformance
  } = useQuery({
    queryKey: ['territory-performance', territory?.id],
    queryFn: () => territoryService.getTerritoryPerformance(territory!.id),
    enabled: !!territory?.id,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  /**
   * Get territory color based on type
   */
  const getTerritoryColor = (type?: string): string => {
    const colors: Record<string, string> = {
      geographic: '#3b82f6',    // blue
      industry: '#8b5cf6',      // purple
      account_based: '#10b981',  // green
      hybrid: '#f59e0b'         // amber
    };
    return colors[type || 'geographic'] || '#6b7280';
  };

  /**
   * Get territory badge style
   */
  const getTerritoryBadgeStyle = (territory?: Territory) => {
    if (!territory) return {};

    const baseColor = getTerritoryColor(territory.type);
    return {
      backgroundColor: `${baseColor}20`,
      color: baseColor,
      borderColor: baseColor
    };
  };

  /**
   * Format territory metrics
   */
  const formatTerritoryMetrics = (territory?: Territory) => {
    if (!territory?.current_metrics) return null;

    const metrics = territory.current_metrics;
    return {
      accounts: metrics.total_accounts || 0,
      revenue: metrics.total_revenue || 0,
      coverage: `${Math.round((metrics.coverage_percentage || 0) * 100)}%`,
      performance: `${Math.round((metrics.performance_score || 0) * 100)}%`
    };
  };

  return {
    // Data
    territory,
    territories: territories || [],
    territoryPerformance,

    // Loading states
    loadingTerritory,
    loadingTerritories,
    isAssigning: assignTerritoryMutation.isLoading,
    isBulkAssigning: bulkAssignMutation.isLoading,

    // Errors
    territoryError,

    // Actions
    refetchTerritory,
    refetchPerformance,
    assignTerritory: assignTerritoryMutation.mutate,
    bulkAssignToTerritory: bulkAssignMutation.mutate,

    // Utilities
    getTerritoryColor,
    getTerritoryBadgeStyle,
    formatTerritoryMetrics
  };
};