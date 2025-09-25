/**
 * Debug version of usePipeline Hook
 * This file adds extensive logging to debug the pipeline loading issue
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { opportunityService } from '../services';
import { usePipelineStore } from '../stores';
import { useNotification } from '@/shared/hooks/useNotification';
import type { OpportunityFilters } from '../types';

export const usePipeline = (filters?: OpportunityFilters) => {
  console.log('🚀 [usePipeline] Hook initialized with filters:', filters);

  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  // Store actions
  const {
    setStages,
    setOpportunities,
    setMetrics,
    moveOpportunity,
    setLoading,
    setUpdatingStage
  } = usePipelineStore();

  /**
   * Fetch pipeline data with extensive logging
   */
  const {
    data: pipelineData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['pipeline', filters],
    queryFn: async () => {
      console.log('🔍 [usePipeline] Starting pipeline fetch...');
      console.log('📦 [usePipeline] Filters:', filters);

      try {
        console.log('📡 [usePipeline] Calling opportunityService.getPipeline...');
        const startTime = Date.now();

        const data = await opportunityService.getPipeline(filters);

        const endTime = Date.now();
        console.log(`⏱️ [usePipeline] API call took ${endTime - startTime}ms`);
        console.log('✅ [usePipeline] Data received:', data);

        return data;
      } catch (error) {
        console.error('❌ [usePipeline] Error in queryFn:', error);
        console.error('❌ [usePipeline] Error details:', {
          message: error.message,
          response: error.response,
          status: error.response?.status,
          data: error.response?.data
        });
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000,
    onSuccess: (data) => {
      console.log('🎯 [usePipeline] onSuccess triggered');
      console.log('📊 [usePipeline] Setting data in store:', {
        stages: data?.stages?.length || 0,
        opportunities: data?.opportunities?.length || 0,
        hasMetrics: !!data?.metrics
      });

      setStages(data?.stages || []);
      setOpportunities(data?.opportunities || []);
      setMetrics(data?.metrics || null);

      console.log('✅ [usePipeline] Store updated successfully');
    },
    onError: (error: any) => {
      console.error('🔥 [usePipeline] onError triggered:', error);
      console.error('🔥 [usePipeline] Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });
    },
    retry: (failureCount, error: any) => {
      console.log(`🔄 [usePipeline] Retry attempt ${failureCount}`);
      if (error?.response?.status === 401) {
        console.log('🚫 [usePipeline] Not retrying - authentication error');
        return false;
      }
      return failureCount < 3;
    }
  });

  // Log loading state changes
  console.log('📊 [usePipeline] Current state:', {
    isLoading,
    hasError: !!error,
    hasData: !!pipelineData,
    dataLength: {
      stages: pipelineData?.stages?.length || 0,
      opportunities: pipelineData?.opportunities?.length || 0
    }
  });

  // Set loading state
  setLoading(isLoading);

  return {
    // Pipeline data
    stages: pipelineData?.stages || [],
    opportunities: pipelineData?.opportunities || [],
    metrics: pipelineData?.metrics,

    // Additional data
    forecast: null, // Simplified for debugging
    winLossAnalysis: null, // Simplified for debugging

    // Loading states
    loading: isLoading,
    error,

    // Actions (simplified for debugging)
    updateOpportunityStage: () => console.log('updateOpportunityStage called'),
    handleDragEnd: () => console.log('handleDragEnd called'),
    createOpportunity: () => console.log('createOpportunity called'),
    markAsWon: () => console.log('markAsWon called'),
    markAsLost: () => console.log('markAsLost called'),
    refreshPipeline: refetch,

    // Mutation states
    isUpdatingStage: false,
    isCreating: false
  };
};