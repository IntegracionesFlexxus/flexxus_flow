/**
 * useOpportunities Hook - Sprint 15
 * Opportunity management hook
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { opportunityService } from '../services';
import { useNotification } from '@/shared/hooks/useNotification';
import type { Opportunity, OpportunityFilters, OpportunityFormData } from '../types';

export const useOpportunities = (initialFilters?: OpportunityFilters) => {
  const [filters, setFilters] = useState<OpportunityFilters>(initialFilters || {});
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  /**
   * Fetch opportunities query
   */
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['opportunities', filters],
    queryFn: () => opportunityService.getOpportunities(filters),
    staleTime: 5 * 60 * 1000
  });

  /**
   * Create opportunity mutation
   */
  const createMutation = useMutation({
    mutationFn: (opportunityData: OpportunityFormData) =>
      opportunityService.createOpportunity(opportunityData),
    onSuccess: () => {
      queryClient.invalidateQueries(['opportunities']);
      queryClient.invalidateQueries(['pipeline']);
      showSuccess('Oportunidad creada exitosamente');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Error al crear la oportunidad');
    }
  });

  /**
   * Update opportunity mutation
   */
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Opportunity> }) =>
      opportunityService.updateOpportunity(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['opportunities']);
      queryClient.invalidateQueries(['pipeline']);
      showSuccess('Oportunidad actualizada exitosamente');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Error al actualizar la oportunidad');
    }
  });

  /**
   * Delete opportunity mutation
   */
  const deleteMutation = useMutation({
    mutationFn: (id: number) => opportunityService.deleteOpportunity(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['opportunities']);
      queryClient.invalidateQueries(['pipeline']);
      showSuccess('Oportunidad eliminada exitosamente');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Error al eliminar la oportunidad');
    }
  });

  /**
   * Clone opportunity
   */
  const cloneMutation = useMutation({
    mutationFn: (id: number) => opportunityService.cloneOpportunity(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['opportunities']);
      showSuccess('Oportunidad clonada exitosamente');
    }
  });

  /**
   * Calculate weighted value
   */
  const { data: weightedValue, mutate: calculateWeighted } = useMutation({
    mutationFn: (id: number) => opportunityService.calculateWeightedValue(id)
  });

  /**
   * Apply filters
   */
  const applyFilters = useCallback((newFilters: OpportunityFilters) => {
    setFilters(newFilters);
  }, []);

  /**
   * Clear filters
   */
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  return {
    // Data
    opportunities: data?.data || [],
    total: data?.total || 0,
    page: data?.page || 1,
    totalPages: data?.totalPages || 0,

    // Loading states
    loading: isLoading,
    error,

    // Filters
    filters,
    applyFilters,
    clearFilters,

    // Actions
    fetchOpportunities: refetch,
    createOpportunity: createMutation.mutate,
    updateOpportunity: updateMutation.mutate,
    deleteOpportunity: deleteMutation.mutate,
    cloneOpportunity: cloneMutation.mutate,
    calculateWeightedValue: calculateWeighted,

    // Additional data
    weightedValue,

    // Mutation states
    isCreating: createMutation.isLoading,
    isUpdating: updateMutation.isLoading,
    isDeleting: deleteMutation.isLoading
  };
};