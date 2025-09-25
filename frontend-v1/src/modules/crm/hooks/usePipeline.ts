/**
 * usePipeline Hook - Sprint 15
 * Pipeline management hook with drag & drop support
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { opportunityService } from '../services';
import { usePipelineStore } from '../stores';
import { useNotification } from '@/shared/hooks/useNotification';
import type { OpportunityFilters } from '../types';

export const usePipeline = (filters?: OpportunityFilters) => {
  console.log('🚨 [usePipeline] HOOK LLAMADO - Hook called!');
  const DEBUG = true; // Forzamos debug para diagnóstico

  // Log initialization
  if (DEBUG) {
    console.group('🎣 [usePipeline] Hook Initialized');
    console.log('Filters:', filters);
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
  }

  const queryClient = useQueryClient();
  const { success: showSuccess, error: showError } = useNotification();

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
   * Fetch pipeline data
   */
  const {
    data: pipelineData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['pipeline', filters],
    queryFn: async () => {
      if (DEBUG) {
        console.group('🔄 [usePipeline] Query Function');
        console.log('Starting pipeline fetch...');
        console.time('pipelineFetch');
      }

      try {
        const data = await opportunityService.getPipeline(filters);

        if (DEBUG) {
          console.log('✅ Pipeline fetch successful');
          console.log('Data structure:', {
            hasStages: !!data?.stages,
            stagesCount: data?.stages?.length,
            hasOpportunities: !!data?.opportunities,
            opportunitiesCount: data?.opportunities?.length,
            hasMetrics: !!data?.metrics,
            rawData: data
          });
          console.timeEnd('pipelineFetch');
          console.groupEnd();
        }

        return data;
      } catch (error: any) {
        if (DEBUG) {
          console.error('❌ Pipeline fetch failed');
          console.error('Error details:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
            stack: error.stack
          });
          console.timeEnd('pipelineFetch');
          console.groupEnd();
        }

        // Show user-friendly error
        showError(
          error.response?.data?.message ||
          `Error ${error.response?.status || ''}: ${error.message}` ||
          'Error al cargar el pipeline'
        );

        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      // Log retry attempts
      if (DEBUG) {
        console.warn(`🔁 Retry attempt ${failureCount} for pipeline fetch`, {
          status: error.response?.status,
          message: error.message
        });
      }
      // Don't retry on 404 or 4xx errors
      return failureCount < 3 && (!error.response || error.response.status >= 500);
    },
    onError: (error: any) => {
      if (DEBUG) {
        console.error('🚨 [usePipeline] Query Error Handler:', {
          message: error.message,
          response: error.response,
          stack: error.stack
        });
      }
    },
    staleTime: 2 * 60 * 1000
  });

  // Update store when pipelineData changes
  React.useEffect(() => {
    if (pipelineData) {
      setStages(pipelineData.stages || []);
      setOpportunities(pipelineData.opportunities || []);
      setMetrics(pipelineData.metrics || null);

      if (DEBUG) {
        console.log('📦 [usePipeline] Store Updated:', {
          stagesSet: pipelineData.stages?.length || 0,
          opportunitiesSet: pipelineData.opportunities?.length || 0,
          metricsSet: !!pipelineData.metrics
        });
      }
    }
  }, [pipelineData, setStages, setOpportunities, setMetrics, DEBUG]);

  // Log state changes
  React.useEffect(() => {
    if (DEBUG) {
      console.log('📊 [usePipeline] State Update:', {
        isLoading,
        hasError: !!error,
        errorMessage: error?.message,
        hasData: !!pipelineData,
        dataPreview: pipelineData ? {
          stages: pipelineData.stages?.length,
          opportunities: pipelineData.opportunities?.length,
          hasMetrics: !!pipelineData.metrics
        } : null
      });
    }
  }, [isLoading, error, pipelineData, DEBUG]);

  /**
   * Update opportunity stage (for drag & drop)
   */
  const updateStageMutation = useMutation({
    mutationFn: ({ opportunityId, stageId }: { opportunityId: number; stageId: number }) => {
      setUpdatingStage(true);
      return opportunityService.updateStage(opportunityId, stageId);
    },
    onMutate: async ({ opportunityId, stageId }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries(['pipeline']);

      // Snapshot previous value
      const previousData = queryClient.getQueryData(['pipeline', filters]);

      // Optimistically update
      moveOpportunity(opportunityId, 0, stageId);

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['pipeline', filters], context.previousData);
      }
      showError('Error al mover la oportunidad');
      setUpdatingStage(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      setUpdatingStage(false);
      showSuccess('Etapa actualizada');
    }
  });

  /**
   * Handle drag end for pipeline board
   */
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const opportunityId = parseInt(result.draggableId);
    const newStageId = parseInt(result.destination.droppableId);
    const oldStageId = parseInt(result.source.droppableId);

    if (oldStageId !== newStageId) {
      updateStageMutation.mutate({ opportunityId, stageId: newStageId });
    }
  };

  /**
   * Create new opportunity
   */
  const createOpportunityMutation = useMutation({
    mutationFn: opportunityService.createOpportunity,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    },
    onSuccess: () => {
      showSuccess('Oportunidad creada');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Error al crear oportunidad');
    }
  });

  /**
   * Mark opportunity as won
   */
  const markAsWonMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      opportunityService.markAsWon(id, reason),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    },
    onSuccess: () => {
      showSuccess('¡Oportunidad ganada! 🎉');
    }
  });

  /**
   * Mark opportunity as lost
   */
  const markAsLostMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      opportunityService.markAsLost(id, reason),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    },
    onSuccess: () => {
      showSuccess('Oportunidad marcada como perdida');
    }
  });

  /**
   * Get forecast data
   */
  const { data: forecastData } = useQuery({
    queryKey: ['forecast', filters?.close_date_from],
    queryFn: () => opportunityService.getForecastData(filters?.close_date_from || 'current'),
    staleTime: 10 * 60 * 1000
  });

  /**
   * Get win/loss analysis
   */
  const { data: winLossData } = useQuery({
    queryKey: ['winloss', filters],
    queryFn: () => opportunityService.getWinLossAnalysis({
      start: filters?.close_date_from,
      end: filters?.close_date_to
    }),
    staleTime: 10 * 60 * 1000
  });

  // Set loading state in useEffect to avoid render loop
  React.useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  console.log('🎯 [usePipeline] ANTES DE RETURN - About to return data:', {
    isLoading,
    hasError: !!error,
    errorMessage: error?.message,
    stagesCount: pipelineData?.stages?.length || 0,
    opportunitiesCount: pipelineData?.opportunities?.length || 0,
    hasMetrics: !!pipelineData?.metrics
  });

  return {
    // Pipeline data
    stages: pipelineData?.stages || [],
    opportunities: pipelineData?.opportunities || [],
    metrics: pipelineData?.metrics,

    // Additional data
    forecast: forecastData,
    winLossAnalysis: winLossData,

    // Loading states
    loading: isLoading,
    error,

    // Actions
    updateOpportunityStage: updateStageMutation.mutate,
    handleDragEnd,
    createOpportunity: createOpportunityMutation.mutate,
    markAsWon: markAsWonMutation.mutate,
    markAsLost: markAsLostMutation.mutate,
    refreshPipeline: refetch,

    // Mutation states
    isUpdatingStage: updateStageMutation.isLoading,
    isCreating: createOpportunityMutation.isLoading
  };
};