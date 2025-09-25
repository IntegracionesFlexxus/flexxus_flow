/**
 * useAccountHealth Hook - Sprint 17
 * Hook for account health score management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountService } from '../services';
import { useNotification } from '@/shared/hooks/useNotification';
import type {
  AccountHealthScore,
  HealthHistory,
  HealthAlert,
  BulkHealthCalculationRequest
} from '../types';

export const useAccountHealth = (accountId?: number) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  /**
   * Fetch account health score
   */
  const {
    data: healthScore,
    isLoading: loadingHealth,
    error: healthError,
    refetch: refetchHealth
  } = useQuery({
    queryKey: ['account-health', accountId],
    queryFn: () => accountService.getAccountHealth(accountId!),
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  /**
   * Fetch health history
   */
  const {
    data: healthHistory,
    isLoading: loadingHistory,
    refetch: refetchHistory
  } = useQuery({
    queryKey: ['account-health-history', accountId],
    queryFn: () => accountService.getAccountHealthHistory(accountId!),
    enabled: !!accountId,
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  /**
   * Fetch health alerts
   */
  const {
    data: healthAlerts,
    isLoading: loadingAlerts,
    refetch: refetchAlerts
  } = useQuery({
    queryKey: ['health-alerts'],
    queryFn: () => accountService.getHealthAlerts(),
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

  /**
   * Calculate health scores in bulk
   */
  const bulkCalculateMutation = useMutation({
    mutationFn: (request: BulkHealthCalculationRequest) =>
      accountService.bulkCalculateHealth(request),
    onSuccess: (result) => {
      queryClient.invalidateQueries(['account-health']);
      queryClient.invalidateQueries(['accounts']);
      showSuccess(`Health scores calculated: ${result.success_count} successful`);
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Error calculating health scores');
    }
  });

  /**
   * Get health grade color
   */
  const getHealthGradeColor = (grade?: string): string => {
    const colors: Record<string, string> = {
      A: '#22c55e', // green
      B: '#84cc16', // lime
      C: '#eab308', // yellow
      D: '#f97316', // orange
      F: '#ef4444'  // red
    };
    return colors[grade || 'F'] || '#6b7280';
  };

  /**
   * Get health trend icon
   */
  const getHealthTrendIcon = (trend?: string): string => {
    const icons: Record<string, string> = {
      improving: '📈',
      stable: '➡️',
      declining: '📉'
    };
    return icons[trend || 'stable'] || '➡️';
  };

  /**
   * Format health score for display
   */
  const formatHealthScore = (score?: number): string => {
    if (score === undefined || score === null) return '-';
    return `${Math.round(score)}%`;
  };

  /**
   * Get alert severity color
   */
  const getAlertSeverityColor = (severity?: string): string => {
    const colors: Record<string, string> = {
      low: '#3b82f6',      // blue
      medium: '#eab308',   // yellow
      high: '#f97316',     // orange
      critical: '#ef4444'  // red
    };
    return colors[severity || 'low'] || '#6b7280';
  };

  return {
    // Data
    healthScore,
    healthHistory: healthHistory || [],
    healthAlerts: healthAlerts || [],

    // Loading states
    loadingHealth,
    loadingHistory,
    loadingAlerts,
    isCalculating: bulkCalculateMutation.isLoading,

    // Errors
    healthError,

    // Actions
    refetchHealth,
    refetchHistory,
    refetchAlerts,
    bulkCalculateHealth: bulkCalculateMutation.mutate,

    // Utilities
    getHealthGradeColor,
    getHealthTrendIcon,
    formatHealthScore,
    getAlertSeverityColor
  };
};