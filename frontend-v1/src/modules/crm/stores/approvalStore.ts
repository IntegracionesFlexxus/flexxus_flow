// Approval Store - Sprint 19 Frontend Implementation
// Zustand store for approval workflow management

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import {
  ApprovalWorkflow,
  ApprovalProcess,
  ApprovalItem,
  ApprovalDecision,
  ApprovalMetrics,
  ApprovalNotification,
  ApprovalFilters,
  ProcessFilters,
  ProcessComment,
  CreateDto,
  UpdateDto
} from '../product-quote/shared/types';
import { approvalService } from '../product-quote/approval/services';

interface ApprovalStore {
  // State
  pendingApprovals: ApprovalItem[];
  workflows: ApprovalWorkflow[];
  processes: ApprovalProcess[];
  notifications: ApprovalNotification[];
  metrics: ApprovalMetrics | null;
  currentProcess: ApprovalProcess | null;

  // Loading states
  loading: boolean;
  workflowsLoading: boolean;
  processesLoading: boolean;
  notificationsLoading: boolean;
  metricsLoading: boolean;

  // Error states
  error: string | null;

  // Filter states
  approvalFilters: ApprovalFilters;
  processFilters: ProcessFilters;

  // Real-time features
  realTimeUpdates: boolean;
  updateSubscription: (() => void) | null;

  // Counts
  unreadNotificationCount: number;
  overdueApprovalCount: number;

  // Actions - Workflows
  loadWorkflows: () => Promise<void>;
  createWorkflow: (workflow: CreateDto<ApprovalWorkflow>) => Promise<ApprovalWorkflow>;
  updateWorkflow: (id: number, updates: UpdateDto<ApprovalWorkflow>) => Promise<void>;
  deleteWorkflow: (id: number) => Promise<void>;
  testWorkflow: (workflowId: number, testData: any) => Promise<any>;
  toggleWorkflowActive: (id: number) => Promise<void>;

  // Actions - Approvals
  loadPendingApprovals: (filters?: ApprovalFilters) => Promise<void>;
  submitApprovalDecision: (processId: number, stepId: number, decision: ApprovalDecision) => Promise<void>;
  delegateApproval: (processId: number, stepId: number, userId: number, comments?: string) => Promise<void>;
  bulkApprove: (approvalIds: Array<{ processId: number; stepId: number }>, comments?: string) => Promise<void>;
  bulkReject: (approvalIds: Array<{ processId: number; stepId: number }>, reason: string) => Promise<void>;

  // Actions - Processes
  loadProcesses: (filters?: ProcessFilters) => Promise<void>;
  loadProcess: (processId: number) => Promise<void>;
  addProcessComment: (processId: number, content: string, isInternal?: boolean) => Promise<void>;
  cancelProcess: (processId: number, reason?: string) => Promise<void>;
  restartProcess: (processId: number, fromStepId?: number) => Promise<void>;

  // Actions - Notifications
  loadNotifications: () => Promise<void>;
  markNotificationRead: (notificationId: number) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  getUnreadCount: () => number;

  // Actions - Metrics
  loadMetrics: (period: { start: string; end: string }) => Promise<void>;
  getWorkflowPerformance: (workflowId: number) => any;
  getApproverPerformance: (userId: number) => any;

  // Actions - Real-time
  enableRealTimeUpdates: () => void;
  disableRealTimeUpdates: () => void;
  subscribeToApprovalUpdates: (callback: (update: any) => void) => () => void;

  // Actions - Filters
  setApprovalFilters: (filters: Partial<ApprovalFilters>) => void;
  setProcessFilters: (filters: Partial<ProcessFilters>) => void;
  clearFilters: () => void;

  // Actions - Utility
  refreshAll: () => Promise<void>;
  clearError: () => void;
  resetStore: () => void;
}

const initialApprovalFilters: ApprovalFilters = {
  status: [],
  workflow: [],
  priority: [],
  overdue: false,
  assignedToMe: true
};

const initialProcessFilters: ProcessFilters = {
  status: [],
  workflow: [],
  entityType: [],
  requestedBy: []
};

export const useApprovalStore = create<ApprovalStore>()(
  devtools(
    subscribeWithSelector(
      (set, get) => ({
        // Initial state
        pendingApprovals: [],
        workflows: [],
        processes: [],
        notifications: [],
        metrics: null,
        currentProcess: null,

        // Loading states
        loading: false,
        workflowsLoading: false,
        processesLoading: false,
        notificationsLoading: false,
        metricsLoading: false,

        // Error states
        error: null,

        // Filter states
        approvalFilters: initialApprovalFilters,
        processFilters: initialProcessFilters,

        // Real-time features
        realTimeUpdates: false,
        updateSubscription: null,

        // Counts
        unreadNotificationCount: 0,
        overdueApprovalCount: 0,

        // Workflow Actions
        loadWorkflows: async () => {
          set({ workflowsLoading: true, error: null });

          try {
            const workflows = await approvalService.getApprovalWorkflows({
              active: true
            });

            // Sort by priority
            const sortedWorkflows = workflows.sort((a, b) => b.priority - a.priority);

            set({ workflows: sortedWorkflows, workflowsLoading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load workflows',
              workflowsLoading: false
            });
          }
        },

        createWorkflow: async (workflowData: CreateDto<ApprovalWorkflow>) => {
          set({ workflowsLoading: true, error: null });

          try {
            const newWorkflow = await approvalService.createApprovalWorkflow(workflowData);
            const state = get();

            const updatedWorkflows = [...state.workflows, newWorkflow]
              .sort((a, b) => b.priority - a.priority);

            set({
              workflows: updatedWorkflows,
              workflowsLoading: false
            });

            return newWorkflow;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to create workflow',
              workflowsLoading: false
            });
            throw error;
          }
        },

        updateWorkflow: async (id: number, updates: UpdateDto<ApprovalWorkflow>) => {
          set({ workflowsLoading: true, error: null });

          try {
            const updatedWorkflow = await approvalService.updateApprovalWorkflow(id, updates);
            const state = get();

            const updatedWorkflows = state.workflows.map(w =>
              w.id === id ? updatedWorkflow : w
            ).sort((a, b) => b.priority - a.priority);

            set({
              workflows: updatedWorkflows,
              workflowsLoading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update workflow',
              workflowsLoading: false
            });
            throw error;
          }
        },

        deleteWorkflow: async (id: number) => {
          set({ workflowsLoading: true, error: null });

          try {
            await approvalService.deleteApprovalWorkflow(id);
            const state = get();

            set({
              workflows: state.workflows.filter(w => w.id !== id),
              workflowsLoading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to delete workflow',
              workflowsLoading: false
            });
            throw error;
          }
        },

        testWorkflow: async (workflowId: number, testData: any) => {
          set({ loading: true, error: null });

          try {
            const result = await approvalService.testApprovalWorkflow(workflowId, testData);
            set({ loading: false });
            return result;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to test workflow',
              loading: false
            });
            throw error;
          }
        },

        toggleWorkflowActive: async (id: number) => {
          const state = get();
          const workflow = state.workflows.find(w => w.id === id);

          if (workflow) {
            await get().updateWorkflow(id, { isActive: !workflow.isActive });
          }
        },

        // Approval Actions
        loadPendingApprovals: async (filters?: ApprovalFilters) => {
          set({ loading: true, error: null });

          try {
            const currentFilters = filters || get().approvalFilters;
            const approvals = await approvalService.getPendingApprovals(currentFilters);

            // Calculate overdue count
            const overdueCount = approvals.filter(approval => approval.isOverdue).length;

            set({
              pendingApprovals: approvals,
              overdueApprovalCount: overdueCount,
              approvalFilters: currentFilters,
              loading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load pending approvals',
              loading: false
            });
          }
        },

        submitApprovalDecision: async (processId: number, stepId: number, decision: ApprovalDecision) => {
          set({ loading: true, error: null });

          try {
            await approvalService.submitApprovalDecision(processId, stepId, decision);

            // Remove from pending approvals if approved/rejected
            if (decision.action === 'approve' || decision.action === 'reject') {
              const state = get();
              const updatedApprovals = state.pendingApprovals.filter(
                approval => !(approval.process.id === processId && approval.process.currentStepId === stepId)
              );

              set({
                pendingApprovals: updatedApprovals,
                overdueApprovalCount: updatedApprovals.filter(a => a.isOverdue).length
              });
            }

            // Reload processes to get updated status
            await get().loadProcesses();

            set({ loading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to submit approval decision',
              loading: false
            });
            throw error;
          }
        },

        delegateApproval: async (processId: number, stepId: number, userId: number, comments?: string) => {
          set({ loading: true, error: null });

          try {
            await approvalService.delegateApproval(processId, stepId, userId, comments);

            // Remove from current user's pending approvals
            const state = get();
            const updatedApprovals = state.pendingApprovals.filter(
              approval => !(approval.process.id === processId && approval.process.currentStepId === stepId)
            );

            set({
              pendingApprovals: updatedApprovals,
              overdueApprovalCount: updatedApprovals.filter(a => a.isOverdue).length,
              loading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to delegate approval',
              loading: false
            });
            throw error;
          }
        },

        bulkApprove: async (approvalIds: Array<{ processId: number; stepId: number }>, comments?: string) => {
          set({ loading: true, error: null });

          try {
            const approveDecision: ApprovalDecision = {
              action: 'approve',
              comments,
              notifyRequestor: true
            };

            // Submit approval for each item
            await Promise.all(
              approvalIds.map(({ processId, stepId }) =>
                approvalService.submitApprovalDecision(processId, stepId, approveDecision)
              )
            );

            // Remove from pending approvals
            const state = get();
            const approvalIdSet = new Set(
              approvalIds.map(({ processId, stepId }) => `${processId}-${stepId}`)
            );

            const updatedApprovals = state.pendingApprovals.filter(
              approval => !approvalIdSet.has(`${approval.process.id}-${approval.process.currentStepId}`)
            );

            set({
              pendingApprovals: updatedApprovals,
              overdueApprovalCount: updatedApprovals.filter(a => a.isOverdue).length,
              loading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to bulk approve',
              loading: false
            });
            throw error;
          }
        },

        bulkReject: async (approvalIds: Array<{ processId: number; stepId: number }>, reason: string) => {
          set({ loading: true, error: null });

          try {
            const rejectDecision: ApprovalDecision = {
              action: 'reject',
              comments: reason,
              notifyRequestor: true
            };

            // Submit rejection for each item
            await Promise.all(
              approvalIds.map(({ processId, stepId }) =>
                approvalService.submitApprovalDecision(processId, stepId, rejectDecision)
              )
            );

            // Remove from pending approvals
            const state = get();
            const approvalIdSet = new Set(
              approvalIds.map(({ processId, stepId }) => `${processId}-${stepId}`)
            );

            const updatedApprovals = state.pendingApprovals.filter(
              approval => !approvalIdSet.has(`${approval.process.id}-${approval.process.currentStepId}`)
            );

            set({
              pendingApprovals: updatedApprovals,
              overdueApprovalCount: updatedApprovals.filter(a => a.isOverdue).length,
              loading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to bulk reject',
              loading: false
            });
            throw error;
          }
        },

        // Process Actions
        loadProcesses: async (filters?: ProcessFilters) => {
          set({ processesLoading: true, error: null });

          try {
            const currentFilters = filters || get().processFilters;
            const processes = await approvalService.getApprovalProcesses(currentFilters);

            // Sort by requested date (newest first)
            const sortedProcesses = processes.sort(
              (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
            );

            set({
              processes: sortedProcesses,
              processFilters: currentFilters,
              processesLoading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load processes',
              processesLoading: false
            });
          }
        },

        loadProcess: async (processId: number) => {
          set({ loading: true, error: null });

          try {
            const process = await approvalService.getApprovalProcess(processId);
            set({ currentProcess: process, loading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load process',
              loading: false
            });
          }
        },

        addProcessComment: async (processId: number, content: string, isInternal: boolean = false) => {
          set({ loading: true, error: null });

          try {
            await approvalService.addProcessComment(processId, content, isInternal);

            // If current process is loaded, reload it to get new comments
            const state = get();
            if (state.currentProcess?.id === processId) {
              await get().loadProcess(processId);
            }

            set({ loading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to add comment',
              loading: false
            });
            throw error;
          }
        },

        cancelProcess: async (processId: number, reason?: string) => {
          set({ loading: true, error: null });

          try {
            await approvalService.cancelApprovalProcess(processId, reason);

            // Update process status in the list
            const state = get();
            set({
              processes: state.processes.map(p =>
                p.id === processId ? { ...p, status: 'cancelled' } : p
              ),
              currentProcess: state.currentProcess?.id === processId
                ? { ...state.currentProcess, status: 'cancelled' }
                : state.currentProcess,
              loading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to cancel process',
              loading: false
            });
            throw error;
          }
        },

        restartProcess: async (processId: number, fromStepId?: number) => {
          set({ loading: true, error: null });

          try {
            await approvalService.restartApprovalProcess(processId, fromStepId);

            // Reload process to get updated status
            await get().loadProcess(processId);

            // Reload pending approvals as this might create new ones
            await get().loadPendingApprovals();

            set({ loading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to restart process',
              loading: false
            });
            throw error;
          }
        },

        // Notification Actions
        loadNotifications: async () => {
          set({ notificationsLoading: true, error: null });

          try {
            const notifications = await approvalService.getApprovalNotifications({
              limit: 50
            });

            // Sort by creation date (newest first)
            const sortedNotifications = notifications.sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            // Count unread notifications
            const unreadCount = notifications.filter(n => !n.isRead).length;

            set({
              notifications: sortedNotifications,
              unreadNotificationCount: unreadCount,
              notificationsLoading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load notifications',
              notificationsLoading: false
            });
          }
        },

        markNotificationRead: async (notificationId: number) => {
          try {
            await approvalService.markNotificationRead(notificationId);

            const state = get();
            const updatedNotifications = state.notifications.map(n =>
              n.id === notificationId ? { ...n, isRead: true } : n
            );

            const unreadCount = updatedNotifications.filter(n => !n.isRead).length;

            set({
              notifications: updatedNotifications,
              unreadNotificationCount: unreadCount
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to mark notification as read'
            });
          }
        },

        markAllNotificationsRead: async () => {
          try {
            await approvalService.markAllNotificationsRead();

            const state = get();
            const updatedNotifications = state.notifications.map(n => ({ ...n, isRead: true }));

            set({
              notifications: updatedNotifications,
              unreadNotificationCount: 0
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to mark all notifications as read'
            });
          }
        },

        getUnreadCount: () => {
          return get().unreadNotificationCount;
        },

        // Metrics Actions
        loadMetrics: async (period: { start: string; end: string }) => {
          set({ metricsLoading: true, error: null });

          try {
            const metrics = await approvalService.getApprovalMetrics(period);
            set({ metrics, metricsLoading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load metrics',
              metricsLoading: false
            });
          }
        },

        getWorkflowPerformance: (workflowId: number) => {
          const state = get();
          return state.metrics?.byWorkflow.find(w => w.workflowId === workflowId);
        },

        getApproverPerformance: (userId: number) => {
          const state = get();
          return state.metrics?.byApprover.find(a => a.userId === userId);
        },

        // Real-time Actions
        enableRealTimeUpdates: () => {
          const state = get();
          if (state.realTimeUpdates) return;

          set({ realTimeUpdates: true });

          const unsubscribe = approvalService.subscribeToApprovalUpdates((update) => {
            console.log('Real-time approval update:', update);

            const currentState = get();

            switch (update.type) {
              case 'approval_request':
                // Add to pending approvals if it's for current user
                if (update.data.assignedTo === 'current_user') { // This would be determined by auth context
                  set({
                    pendingApprovals: [update.data, ...currentState.pendingApprovals]
                  });
                }
                break;

              case 'approval_decision':
                // Remove from pending approvals
                set({
                  pendingApprovals: currentState.pendingApprovals.filter(
                    approval => approval.process.id !== update.data.processId
                  )
                });
                break;

              case 'approval_completed':
              case 'approval_escalated':
                // Refresh data
                get().loadPendingApprovals();
                get().loadNotifications();
                break;
            }
          });

          set({ updateSubscription: unsubscribe });
        },

        disableRealTimeUpdates: () => {
          const state = get();
          if (state.updateSubscription) {
            state.updateSubscription();
          }

          set({
            realTimeUpdates: false,
            updateSubscription: null
          });
        },

        subscribeToApprovalUpdates: (callback: (update: any) => void) => {
          return approvalService.subscribeToApprovalUpdates(callback);
        },

        // Filter Actions
        setApprovalFilters: (newFilters: Partial<ApprovalFilters>) => {
          const state = get();
          const updatedFilters = { ...state.approvalFilters, ...newFilters };

          set({ approvalFilters: updatedFilters });
          get().loadPendingApprovals(updatedFilters);
        },

        setProcessFilters: (newFilters: Partial<ProcessFilters>) => {
          const state = get();
          const updatedFilters = { ...state.processFilters, ...newFilters };

          set({ processFilters: updatedFilters });
          get().loadProcesses(updatedFilters);
        },

        clearFilters: () => {
          set({
            approvalFilters: initialApprovalFilters,
            processFilters: initialProcessFilters
          });

          get().loadPendingApprovals(initialApprovalFilters);
          get().loadProcesses(initialProcessFilters);
        },

        // Utility Actions
        refreshAll: async () => {
          const state = get();

          await Promise.all([
            get().loadPendingApprovals(),
            get().loadProcesses(),
            get().loadWorkflows(),
            get().loadNotifications()
          ]);
        },

        clearError: () => set({ error: null }),

        resetStore: () => {
          const state = get();

          // Cleanup real-time subscription
          if (state.updateSubscription) {
            state.updateSubscription();
          }

          set({
            pendingApprovals: [],
            workflows: [],
            processes: [],
            notifications: [],
            metrics: null,
            currentProcess: null,
            loading: false,
            workflowsLoading: false,
            processesLoading: false,
            notificationsLoading: false,
            metricsLoading: false,
            error: null,
            approvalFilters: initialApprovalFilters,
            processFilters: initialProcessFilters,
            realTimeUpdates: false,
            updateSubscription: null,
            unreadNotificationCount: 0,
            overdueApprovalCount: 0
          });
        }
      })
    ),
    { name: 'ApprovalStore' }
  )
);

// Auto-cleanup on unmount
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const state = useApprovalStore.getState();
    if (state.updateSubscription) {
      state.updateSubscription();
    }
  });
}