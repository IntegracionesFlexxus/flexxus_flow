// useApprovals - Approval operations hook
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ApprovalItem,
  ApprovalProcess,
  ApprovalMetrics,
  ApprovalFilters,
  ProcessFilters,
  ApprovalDecision
} from '../../shared/types';
import { approvalService } from '../services/approvalService';
import { useWebSocket } from '../../shared/hooks/useWebSocket';

interface UseApprovalsReturn {
  // State
  pendingApprovals: ApprovalItem[];
  processes: ApprovalProcess[];
  metrics: ApprovalMetrics | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadPendingApprovals: (filters?: ApprovalFilters) => Promise<void>;
  loadProcesses: (filters?: ProcessFilters) => Promise<void>;
  loadMetrics: (period: { start: string; end: string }) => Promise<void>;
  submitDecision: (processId: number, stepId: number, decision: ApprovalDecision) => Promise<void>;
  delegateApproval: (processId: number, stepId: number, userId: number, comments?: string) => Promise<void>;
  addComment: (processId: number, content: string, isInternal?: boolean) => Promise<void>;
  cancelProcess: (processId: number, reason?: string) => Promise<void>;
  restartProcess: (processId: number, fromStepId?: number) => Promise<void>;
  refreshApprovals: () => void;
  refreshProcesses: () => void;
  refreshMetrics: () => void;
}

export const useApprovals = (initialFilters?: ApprovalFilters): UseApprovalsReturn => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ApprovalFilters>(initialFilters || {
    status: [],
    workflow: [],
    priority: [],
    overdue: false,
    assignedToMe: true
  });
  const [processFilters, setProcessFilters] = useState<ProcessFilters>({
    status: [],
    workflow: [],
    entityType: [],
    requestedBy: []
  });
  const [metricsDateRange, setMetricsDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Query keys
  const PENDING_APPROVALS_KEY = ['approvals', 'pending', filters];
  const PROCESSES_KEY = ['approvals', 'processes', processFilters];
  const METRICS_KEY = ['approvals', 'metrics', metricsDateRange];

  // Pending approvals query
  const {
    data: pendingApprovals = [],
    isLoading: pendingLoading,
    error: pendingError,
    refetch: refetchPendingApprovals
  } = useQuery({
    queryKey: PENDING_APPROVALS_KEY,
    queryFn: () => approvalService.getPendingApprovals(filters),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true
  });

  // Processes query
  const {
    data: processes = [],
    isLoading: processesLoading,
    error: processesError,
    refetch: refetchProcesses
  } = useQuery({
    queryKey: PROCESSES_KEY,
    queryFn: () => approvalService.getApprovalProcesses(processFilters),
    staleTime: 60000, // 1 minute
    enabled: false // Only load when explicitly called
  });

  // Metrics query
  const {
    data: metrics = null,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics
  } = useQuery({
    queryKey: METRICS_KEY,
    queryFn: () => approvalService.getApprovalMetrics(metricsDateRange),
    staleTime: 300000, // 5 minutes
    enabled: false // Only load when explicitly called
  });

  // Real-time updates via WebSocket
  const { isConnected } = useWebSocket('/ws/approvals', {
    onMessage: (update) => {
      handleRealTimeUpdate(update);
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    }
  });

  // Handle real-time updates
  const handleRealTimeUpdate = useCallback((update: any) => {
    switch (update.type) {
      case 'approval_request':
        // New approval request
        queryClient.invalidateQueries({ queryKey: ['approvals', 'pending'] });
        break;

      case 'approval_decision':
        // Approval decision made
        queryClient.invalidateQueries({ queryKey: ['approvals', 'pending'] });
        queryClient.invalidateQueries({ queryKey: ['approvals', 'processes'] });
        break;

      case 'approval_completed':
        // Approval process completed
        queryClient.invalidateQueries({ queryKey: ['approvals', 'pending'] });
        queryClient.invalidateQueries({ queryKey: ['approvals', 'processes'] });
        queryClient.invalidateQueries({ queryKey: ['approvals', 'metrics'] });
        break;

      case 'approval_escalated':
        // Approval escalated
        queryClient.invalidateQueries({ queryKey: ['approvals', 'pending'] });
        break;

      default:
        console.log('Unknown update type:', update.type);
    }
  }, [queryClient]);

  // Submit decision mutation
  const submitDecisionMutation = useMutation({
    mutationFn: ({ processId, stepId, decision }: {
      processId: number;
      stepId: number;
      decision: ApprovalDecision;
    }) => approvalService.submitApprovalDecision(processId, stepId, decision),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['approvals', 'processes'] });
    },
    onError: (error) => {
      console.error('Failed to submit decision:', error);
    }
  });

  // Delegate approval mutation
  const delegateApprovalMutation = useMutation({
    mutationFn: ({ processId, stepId, userId, comments }: {
      processId: number;
      stepId: number;
      userId: number;
      comments?: string;
    }) => approvalService.delegateApproval(processId, stepId, userId, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', 'pending'] });
    },
    onError: (error) => {
      console.error('Failed to delegate approval:', error);
    }
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: ({ processId, content, isInternal }: {
      processId: number;
      content: string;
      isInternal?: boolean;
    }) => approvalService.addProcessComment(processId, content, isInternal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', 'processes'] });
    },
    onError: (error) => {
      console.error('Failed to add comment:', error);
    }
  });

  // Cancel process mutation
  const cancelProcessMutation = useMutation({
    mutationFn: ({ processId, reason }: {
      processId: number;
      reason?: string;
    }) => approvalService.cancelApprovalProcess(processId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['approvals', 'processes'] });
    },
    onError: (error) => {
      console.error('Failed to cancel process:', error);
    }
  });

  // Restart process mutation
  const restartProcessMutation = useMutation({
    mutationFn: ({ processId, fromStepId }: {
      processId: number;
      fromStepId?: number;
    }) => approvalService.restartApprovalProcess(processId, fromStepId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['approvals', 'processes'] });
    },
    onError: (error) => {
      console.error('Failed to restart process:', error);
    }
  });

  // Action functions
  const loadPendingApprovals = useCallback(async (newFilters?: ApprovalFilters) => {
    if (newFilters) {
      setFilters(newFilters);
    }
    await refetchPendingApprovals();
  }, [refetchPendingApprovals]);

  const loadProcesses = useCallback(async (newFilters?: ProcessFilters) => {
    if (newFilters) {
      setProcessFilters(newFilters);
    }
    await refetchProcesses();
  }, [refetchProcesses]);

  const loadMetrics = useCallback(async (period: { start: string; end: string }) => {
    setMetricsDateRange(period);
    await refetchMetrics();
  }, [refetchMetrics]);

  const submitDecision = useCallback(async (
    processId: number,
    stepId: number,
    decision: ApprovalDecision
  ) => {
    await submitDecisionMutation.mutateAsync({ processId, stepId, decision });
  }, [submitDecisionMutation]);

  const delegateApproval = useCallback(async (
    processId: number,
    stepId: number,
    userId: number,
    comments?: string
  ) => {
    await delegateApprovalMutation.mutateAsync({ processId, stepId, userId, comments });
  }, [delegateApprovalMutation]);

  const addComment = useCallback(async (
    processId: number,
    content: string,
    isInternal?: boolean
  ) => {
    await addCommentMutation.mutateAsync({ processId, content, isInternal });
  }, [addCommentMutation]);

  const cancelProcess = useCallback(async (processId: number, reason?: string) => {
    await cancelProcessMutation.mutateAsync({ processId, reason });
  }, [cancelProcessMutation]);

  const restartProcess = useCallback(async (processId: number, fromStepId?: number) => {
    await restartProcessMutation.mutateAsync({ processId, fromStepId });
  }, [restartProcessMutation]);

  const refreshApprovals = useCallback(() => {
    refetchPendingApprovals();
  }, [refetchPendingApprovals]);

  const refreshProcesses = useCallback(() => {
    refetchProcesses();
  }, [refetchProcesses]);

  const refreshMetrics = useCallback(() => {
    refetchMetrics();
  }, [refetchMetrics]);

  // Auto-refresh on filter changes
  useEffect(() => {
    refetchPendingApprovals();
  }, [filters, refetchPendingApprovals]);

  useEffect(() => {
    if (processFilters.status.length > 0 || processFilters.workflow.length > 0) {
      refetchProcesses();
    }
  }, [processFilters, refetchProcesses]);

  // Compute loading and error states
  const loading = pendingLoading || processesLoading || metricsLoading ||
                 submitDecisionMutation.isPending || delegateApprovalMutation.isPending ||
                 addCommentMutation.isPending || cancelProcessMutation.isPending ||
                 restartProcessMutation.isPending;

  const error = pendingError?.message || processesError?.message || metricsError?.message ||
               submitDecisionMutation.error?.message || delegateApprovalMutation.error?.message ||
               addCommentMutation.error?.message || cancelProcessMutation.error?.message ||
               restartProcessMutation.error?.message || null;

  return {
    // State
    pendingApprovals,
    processes,
    metrics,
    loading,
    error,

    // Actions
    loadPendingApprovals,
    loadProcesses,
    loadMetrics,
    submitDecision,
    delegateApproval,
    addComment,
    cancelProcess,
    restartProcess,
    refreshApprovals,
    refreshProcesses,
    refreshMetrics
  };
};