/**
 * Pipeline Store - Sprint 15
 * Pipeline and opportunity state management
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Opportunity, OpportunityStage, PipelineMetrics } from '../types';

interface PipelineState {
  // Pipeline data
  stages: OpportunityStage[];
  opportunities: Opportunity[];
  metrics: PipelineMetrics | null;

  // View state
  selectedStageId: number | null;
  draggedOpportunityId: number | null;
  isCompactView: boolean;
  showMetrics: boolean;

  // Loading states
  isLoading: boolean;
  isUpdatingStage: boolean;

  // Filters
  pipelineFilters: {
    ownerId?: number;
    dateRange?: { start: Date; end: Date };
    minAmount?: number;
    maxAmount?: number;
  };

  // Actions - Data management
  setStages: (stages: OpportunityStage[]) => void;
  setOpportunities: (opportunities: Opportunity[]) => void;
  setMetrics: (metrics: PipelineMetrics) => void;

  // Actions - Opportunity management
  addOpportunity: (opportunity: Opportunity) => void;
  updateOpportunity: (id: number, updates: Partial<Opportunity>) => void;
  removeOpportunity: (id: number) => void;
  moveOpportunity: (opportunityId: number, fromStageId: number, toStageId: number) => void;

  // Actions - Stage management
  selectStage: (stageId: number | null) => void;
  updateStageMetrics: (stageId: number, metrics: Partial<OpportunityStage>) => void;

  // Actions - Drag and drop
  setDraggedOpportunity: (opportunityId: number | null) => void;
  handleDrop: (opportunityId: number, newStageId: number) => void;

  // Actions - View state
  toggleCompactView: () => void;
  toggleMetrics: () => void;

  // Actions - Filters
  setPipelineFilters: (filters: any) => void;
  clearPipelineFilters: () => void;

  // Actions - Loading states
  setLoading: (loading: boolean) => void;
  setUpdatingStage: (updating: boolean) => void;

  // Utility functions
  getOpportunitiesByStage: (stageId: number) => Opportunity[];
  getStageMetrics: (stageId: number) => { count: number; total: number; avgProbability: number };
  getTotalPipelineValue: () => number;
  getWeightedPipelineValue: () => number;
}

export const usePipelineStore = create<PipelineState>()(
  devtools(
    (set, get) => ({
      // Initial state
      stages: [],
      opportunities: [],
      metrics: null,
      selectedStageId: null,
      draggedOpportunityId: null,
      isCompactView: false,
      showMetrics: true,
      isLoading: false,
      isUpdatingStage: false,
      pipelineFilters: {},

      // Actions - Data management
      setStages: (stages) => set({ stages }),
      setOpportunities: (opportunities) => set({ opportunities }),
      setMetrics: (metrics) => set({ metrics }),

      // Actions - Opportunity management
      addOpportunity: (opportunity) => set((state) => ({
        opportunities: [...state.opportunities, opportunity]
      })),
      updateOpportunity: (id, updates) => set((state) => ({
        opportunities: state.opportunities.map(opp =>
          opp.id === id ? { ...opp, ...updates } : opp
        )
      })),
      removeOpportunity: (id) => set((state) => ({
        opportunities: state.opportunities.filter(opp => opp.id !== id)
      })),
      moveOpportunity: (opportunityId, fromStageId, toStageId) => {
        set((state) => {
          const opportunity = state.opportunities.find(o => o.id === opportunityId);
          if (!opportunity) return state;

          const toStage = state.stages.find(s => s.id === toStageId);
          if (!toStage) return state;

          return {
            opportunities: state.opportunities.map(opp =>
              opp.id === opportunityId
                ? { ...opp, stage_id: toStageId, probability: toStage.probability }
                : opp
            )
          };
        });
      },

      // Actions - Stage management
      selectStage: (stageId) => set({ selectedStageId: stageId }),
      updateStageMetrics: (stageId, metrics) => set((state) => ({
        stages: state.stages.map(stage =>
          stage.id === stageId ? { ...stage, ...metrics } : stage
        )
      })),

      // Actions - Drag and drop
      setDraggedOpportunity: (opportunityId) => set({ draggedOpportunityId: opportunityId }),
      handleDrop: (opportunityId, newStageId) => {
        const state = get();
        const opportunity = state.opportunities.find(o => o.id === opportunityId);
        if (opportunity && opportunity.stage_id !== newStageId) {
          state.moveOpportunity(opportunityId, opportunity.stage_id, newStageId);
        }
        set({ draggedOpportunityId: null });
      },

      // Actions - View state
      toggleCompactView: () => set((state) => ({ isCompactView: !state.isCompactView })),
      toggleMetrics: () => set((state) => ({ showMetrics: !state.showMetrics })),

      // Actions - Filters
      setPipelineFilters: (filters) => set({ pipelineFilters: filters }),
      clearPipelineFilters: () => set({ pipelineFilters: {} }),

      // Actions - Loading states
      setLoading: (loading) => set({ isLoading: loading }),
      setUpdatingStage: (updating) => set({ isUpdatingStage: updating }),

      // Utility functions
      getOpportunitiesByStage: (stageId) => {
        return get().opportunities.filter(opp => opp.stage_id === stageId);
      },
      getStageMetrics: (stageId) => {
        const opportunities = get().getOpportunitiesByStage(stageId);
        return {
          count: opportunities.length,
          total: opportunities.reduce((sum, opp) => sum + opp.amount, 0),
          avgProbability: opportunities.length > 0
            ? opportunities.reduce((sum, opp) => sum + (opp.probability || 0), 0) / opportunities.length
            : 0
        };
      },
      getTotalPipelineValue: () => {
        return get().opportunities.reduce((sum, opp) => sum + opp.amount, 0);
      },
      getWeightedPipelineValue: () => {
        return get().opportunities.reduce(
          (sum, opp) => sum + (opp.amount * (opp.probability || 0) / 100),
          0
        );
      }
    }),
    {
      name: 'PipelineStore'
    }
  )
);