/**
 * useAccounts Hook - Sprint 15
 * Account management hook with React Query integration
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountService } from '../services';
import { useNotification } from '@/shared/hooks/useNotification';
import type { Account, AccountFilters, AccountFormData } from '../types';

export const useAccounts = (initialFilters?: AccountFilters) => {
  const [filters, setFilters] = useState<AccountFilters>(initialFilters || {});
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  /**
   * Fetch accounts query
   */
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['accounts', filters],
    queryFn: () => accountService.getAccounts(filters),
    staleTime: 5 * 60 * 1000
  });

  /**
   * Create account mutation
   */
  const createMutation = useMutation({
    mutationFn: (accountData: AccountFormData) => {
      console.log('=== useAccounts createMutation ===');
      console.log('Datos recibidos en el hook:', accountData);
      return accountService.createAccount(accountData);
    },
    onSuccess: (data) => {
      console.log('=== Cuenta creada exitosamente ===');
      console.log('Respuesta:', data);
      queryClient.invalidateQueries(['accounts']);
      showSuccess('Cuenta creada exitosamente');
    },
    onError: (error: any) => {
      console.error('=== Error en createMutation ===');
      console.error('Error:', error);
      console.error('Response:', error.response);
      console.error('Message:', error.response?.data?.message);
      console.error('Errors:', error.response?.data?.errors);
      showError(error.response?.data?.message || 'Error al crear la cuenta');
    }
  });

  /**
   * Update account mutation
   */
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Account> }) =>
      accountService.updateAccount(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts']);
      showSuccess('Cuenta actualizada exitosamente');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Error al actualizar la cuenta');
    }
  });

  /**
   * Delete account mutation
   */
  const deleteMutation = useMutation({
    mutationFn: (id: number) => accountService.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts']);
      showSuccess('Cuenta eliminada exitosamente');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Error al eliminar la cuenta');
    }
  });

  /**
   * Get account hierarchy
   */
  const { data: hierarchyData, mutate: fetchHierarchy } = useMutation({
    mutationFn: (id: number) => accountService.getAccountHierarchy(id)
  });

  /**
   * Update account rating
   */
  const updateRatingMutation = useMutation({
    mutationFn: ({ id, rating }: { id: number; rating: string }) =>
      accountService.updateAccountRating(id, rating),
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts']);
      showSuccess('Rating actualizado');
    }
  });

  /**
   * Validate CUIT
   */
  const validateCUITMutation = useMutation({
    mutationFn: (cuit: string) => accountService.validateCUIT(cuit)
  });

  /**
   * Apply filters
   */
  const applyFilters = useCallback((newFilters: AccountFilters) => {
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
    accounts: data?.data || [],
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
    fetchAccounts: refetch,
    createAccount: createMutation.mutate,
    updateAccount: updateMutation.mutate,
    deleteAccount: deleteMutation.mutate,
    updateAccountRating: updateRatingMutation.mutate,
    fetchAccountHierarchy: fetchHierarchy,
    validateCUIT: validateCUITMutation.mutate,

    // Additional data
    hierarchy: hierarchyData,

    // Mutation states
    isCreating: createMutation.isLoading,
    isUpdating: updateMutation.isLoading,
    isDeleting: deleteMutation.isLoading
  };
};