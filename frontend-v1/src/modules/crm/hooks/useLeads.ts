/**
 * useLeads Hook - Sprint 15
 * Lead management hook with React Query integration
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadService } from '../services';
import { useLeadStore } from '../stores';
import { useNotification } from '@/shared/hooks/useNotification';
import type { Lead, LeadFilters, LeadFormData, LeadConversionOptions } from '../types';

export function useLeads(initialFilters?: LeadFilters) {
  const [filters, setFilters] = useState<LeadFilters>(initialFilters || {});
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  // Store actions
  const {
    setLeads,
    addLead,
    updateLead: updateLeadInStore,
    removeLead,
    setLoading,
    setCreating,
    setUpdating,
    setConverting
  } = useLeadStore();

  /**
   * Fetch leads query
   */
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['leads', filters],
    queryFn: () => leadService.getLeads(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    onSuccess: (response) => {
      setLeads(response.data, response.total);
    }
  });

  /**
   * Create lead mutation
   */
  const createMutation = useMutation({
    mutationFn: (leadData: LeadFormData) => {
      setCreating(true);
      return leadService.createLead(leadData);
    },
    onSuccess: (newLead) => {
      addLead(newLead);
      queryClient.invalidateQueries(['leads']);
      showSuccess('Lead creado exitosamente');
      setCreating(false);
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Error al crear el lead');
      setCreating(false);
    }
  });

  /**
   * Update lead mutation
   */
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Lead> }) => {
      setUpdating(true);
      return leadService.updateLead(id, updates);
    },
    onSuccess: (updatedLead) => {
      updateLeadInStore(updatedLead.id, updatedLead);
      queryClient.invalidateQueries(['leads']);
      showSuccess('Lead actualizado exitosamente');
      setUpdating(false);
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Error al actualizar el lead');
      setUpdating(false);
    }
  });

  /**
   * Delete lead mutation
   */
  const deleteMutation = useMutation({
    mutationFn: (id: number) => leadService.deleteLead(id),
    onSuccess: (_, id) => {
      removeLead(id);
      queryClient.invalidateQueries(['leads']);
      showSuccess('Lead eliminado exitosamente');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Error al eliminar el lead');
    }
  });

  /**
   * Qualify lead mutation
   */
  const qualifyMutation = useMutation({
    mutationFn: (id: number) => leadService.qualifyLead(id),
    onSuccess: (qualifiedLead) => {
      updateLeadInStore(qualifiedLead.id, qualifiedLead);
      queryClient.invalidateQueries(['leads']);
      showSuccess('Lead calificado exitosamente');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Error al calificar el lead');
    }
  });

  /**
   * Convert lead mutation
   */
  const convertMutation = useMutation({
    mutationFn: ({ id, options }: { id: number; options: LeadConversionOptions }) => {
      setConverting(true);
      return leadService.convertLead(id, options);
    },
    onSuccess: (result, { id }) => {
      updateLeadInStore(id, { status: 'converted' });
      queryClient.invalidateQueries(['leads']);
      queryClient.invalidateQueries(['accounts']);
      queryClient.invalidateQueries(['contacts']);
      if (result.opportunity) {
        queryClient.invalidateQueries(['opportunities']);
      }
      showSuccess('Lead convertido exitosamente');
      setConverting(false);
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Error al convertir el lead');
      setConverting(false);
    }
  });

  /**
   * Update lead score mutation
   */
  const updateScoreMutation = useMutation({
    mutationFn: (id: number) => leadService.updateLeadScore(id),
    onSuccess: (result, id) => {
      updateLeadInStore(id, { score: result.score });
      showSuccess(`Score actualizado: ${result.score}`);
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Error al actualizar el score');
    }
  });

  /**
   * Bulk update scores mutation
   */
  const bulkUpdateScoresMutation = useMutation({
    mutationFn: () => leadService.bulkUpdateScores(),
    onSuccess: (result) => {
      queryClient.invalidateQueries(['leads']);
      showSuccess(`${result.updated} leads actualizados`);
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Error al actualizar scores');
    }
  });

  /**
   * Assign lead mutation
   */
  const assignLeadMutation = useMutation({
    mutationFn: ({ leadId, userId }: { leadId: number; userId: number }) =>
      leadService.assignLead(leadId, userId),
    onSuccess: (updatedLead) => {
      updateLeadInStore(updatedLead.id, updatedLead);
      showSuccess('Lead asignado exitosamente');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Error al asignar el lead');
    }
  });

  /**
   * Apply filters
   */
  const applyFilters = useCallback((newFilters: LeadFilters) => {
    setFilters(newFilters);
  }, []);

  /**
   * Clear filters
   */
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Set loading state
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  return {
    // Data
    leads: data?.data || [],
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
    fetchLeads: refetch,
    createLead: createMutation.mutate,
    updateLead: updateMutation.mutate,
    deleteLead: deleteMutation.mutate,
    qualifyLead: qualifyMutation.mutate,
    convertLead: convertMutation.mutate,
    updateLeadScore: updateScoreMutation.mutate,
    bulkUpdateScores: bulkUpdateScoresMutation.mutate,
    assignLead: assignLeadMutation.mutate,

    // Mutation states
    isCreating: createMutation.isLoading,
    isUpdating: updateMutation.isLoading,
    isConverting: convertMutation.isLoading
  };
}