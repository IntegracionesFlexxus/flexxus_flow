/**
 * Pipeline Store - Zustand
 * Global state management for pipeline operations
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import pipelineService from '../services/pipelineService';
import {
  Pipeline,
  PipelineStage,
  OpportunityExtended,
  PipelineMetrics,
  PipelineFilters,
  Bottleneck,
  PipelineVelocity,
  PipelineTemplate,
  DragDropResult
} from '../types/pipeline.types';

interface PipelineStore {
  // State
  pipelines: Pipeline[];
  currentPipeline: Pipeline | null;
  stages: PipelineStage[];
  opportunities: OpportunityExtended[];
  metrics: PipelineMetrics | null;
  bottlenecks: Bottleneck[];
  velocity: PipelineVelocity[];
  templates: PipelineTemplate[];
  filters: PipelineFilters;
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  viewMode: 'kanban' | 'list' | 'calendar';
  cardSize: 'compact' | 'normal' | 'expanded';

  // Cache management
  opportunitiesCache: Map<number, OpportunityExtended[]>;
  metricsCache: Map<number, { data: PipelineMetrics; timestamp: number }>;

  // Actions - Pipeline Management
  loadPipelines: () => Promise<void>;
  selectPipeline: (id: number) => Promise<void>;
  createPipeline: (pipeline: Partial<Pipeline>) => Promise<Pipeline>;
  updatePipeline: (id: number, updates: Partial<Pipeline>) => Promise<void>;
  deletePipeline: (id: number) => Promise<void>;

  // Actions - Stage Management
  loadStages: (pipelineId: number) => Promise<void>;
  createStage: (stage: Partial<PipelineStage>) => Promise<void>;
  updateStage: (stageId: number, updates: Partial<PipelineStage>) => Promise<void>;
  deleteStage: (stageId: number) => Promise<void>;
  reorderStages: (stageOrders: { stage_id: number; order: number }[]) => Promise<void>;

  // Actions - Opportunity Management
  loadOpportunities: (pipelineId?: number) => Promise<void>;
  moveOpportunity: (oppId: string, newStageId: number, notes?: string) => Promise<void>;
  handleDragDrop: (result: DragDropResult) => Promise<void>;
  updateOpportunity: (oppId: string, updates: Partial<OpportunityExtended>) => void;
  bulkMoveOpportunities: (oppIds: string[], newStageId: number) => Promise<void>;

  // Actions - Metrics & Analytics
  loadMetrics: (pipelineId: number, force?: boolean) => Promise<void>;
  loadBottlenecks: (pipelineId: number) => Promise<void>;
  loadVelocity: (pipelineId: number, period?: 'week' | 'month' | 'quarter') => Promise<void>;
  refreshMetrics: () => Promise<void>;

  // Actions - Templates
  loadTemplates: () => Promise<void>;
  applyTemplate: (templateId: number, pipelineName: string) => Promise<void>;

  // Actions - Filters & View
  updateFilters: (filters: Partial<PipelineFilters>) => void;
  clearFilters: () => void;
  setViewMode: (mode: 'kanban' | 'list' | 'calendar') => void;
  setCardSize: (size: 'compact' | 'normal' | 'expanded') => void;

  // Actions - Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearCache: () => void;

  // Computed getters
  getFilteredOpportunities: () => OpportunityExtended[];
  getOpportunitiesByStage: (stageId: number) => OpportunityExtended[];
  getStageMetrics: (stageId: number) => { count: number; totalValue: number; weightedValue: number };
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const usePipelineStore = create<PipelineStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        pipelines: [],
        currentPipeline: null,
        stages: [],
        opportunities: [],
        metrics: null,
        bottlenecks: [],
        velocity: [],
        templates: [],
        filters: {},
        isLoading: false,
        error: null,
        lastRefresh: null,
        viewMode: 'kanban',
        cardSize: 'normal',
        opportunitiesCache: new Map(),
        metricsCache: new Map(),

        // Pipeline Management
        loadPipelines: async () => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            const pipelines = await pipelineService.getPipelines();
            set((state) => {
              state.pipelines = pipelines;
              if (!state.currentPipeline && pipelines.length > 0) {
                const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];
                state.currentPipeline = defaultPipeline;
              }
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          } finally {
            set((state) => {
              state.isLoading = false;
            });
          }
        },

        selectPipeline: async (id: number) => {
          const pipeline = get().pipelines.find(p => p.pipeline_id === id);
          if (!pipeline) {
            await get().loadPipelines();
          }

          set((state) => {
            state.currentPipeline = state.pipelines.find(p => p.pipeline_id === id) || null;
          });

          if (get().currentPipeline) {
            await Promise.all([
              get().loadStages(id),
              get().loadOpportunities(id),
              get().loadMetrics(id)
            ]);
          }
        },

        createPipeline: async (pipeline: Partial<Pipeline>) => {
          set((state) => {
            state.isLoading = true;
          });

          try {
            const newPipeline = await pipelineService.createPipeline(pipeline);
            set((state) => {
              state.pipelines.push(newPipeline);
            });
            return newPipeline;
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
            throw error;
          } finally {
            set((state) => {
              state.isLoading = false;
            });
          }
        },

        updatePipeline: async (id: number, updates: Partial<Pipeline>) => {
          try {
            const updatedPipeline = await pipelineService.updatePipeline(id, updates);
            set((state) => {
              const index = state.pipelines.findIndex(p => p.pipeline_id === id);
              if (index !== -1) {
                state.pipelines[index] = updatedPipeline;
              }
              if (state.currentPipeline?.pipeline_id === id) {
                state.currentPipeline = updatedPipeline;
              }
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        deletePipeline: async (id: number) => {
          try {
            await pipelineService.deletePipeline(id);
            set((state) => {
              state.pipelines = state.pipelines.filter(p => p.pipeline_id !== id);
              if (state.currentPipeline?.pipeline_id === id) {
                state.currentPipeline = state.pipelines[0] || null;
              }
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        // Stage Management
        loadStages: async (pipelineId: number) => {
          try {
            const stages = await pipelineService.getPipelineStages(pipelineId);
            set((state) => {
              state.stages = stages.sort((a, b) => a.stage_order - b.stage_order);
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        createStage: async (stage: Partial<PipelineStage>) => {
          if (!get().currentPipeline) return;

          try {
            const newStage = await pipelineService.createStage(
              get().currentPipeline!.pipeline_id,
              stage
            );
            set((state) => {
              state.stages.push(newStage);
              state.stages.sort((a, b) => a.stage_order - b.stage_order);
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        updateStage: async (stageId: number, updates: Partial<PipelineStage>) => {
          try {
            const updatedStage = await pipelineService.updateStage(stageId, updates);
            set((state) => {
              const index = state.stages.findIndex(s => s.stage_id === stageId);
              if (index !== -1) {
                state.stages[index] = updatedStage;
                state.stages.sort((a, b) => a.stage_order - b.stage_order);
              }
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        deleteStage: async (stageId: number) => {
          try {
            await pipelineService.deleteStage(stageId);
            set((state) => {
              state.stages = state.stages.filter(s => s.stage_id !== stageId);
              state.opportunities = state.opportunities.filter(o => o.stage_id !== stageId);
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        reorderStages: async (stageOrders: { stage_id: number; order: number }[]) => {
          if (!get().currentPipeline) return;

          // Optimistic update
          set((state) => {
            stageOrders.forEach(({ stage_id, order }) => {
              const stage = state.stages.find(s => s.stage_id === stage_id);
              if (stage) {
                stage.stage_order = order;
              }
            });
            state.stages.sort((a, b) => a.stage_order - b.stage_order);
          });

          try {
            await pipelineService.reorderStages(get().currentPipeline!.pipeline_id, stageOrders);
          } catch (error: any) {
            // Rollback on error
            await get().loadStages(get().currentPipeline!.pipeline_id);
            set((state) => {
              state.error = error.message;
            });
          }
        },

        // Opportunity Management
        loadOpportunities: async (pipelineId?: number) => {
          set((state) => {
            state.isLoading = true;
          });

          try {
            const opportunities = await pipelineService.getOpportunitiesExtended(pipelineId);
            set((state) => {
              state.opportunities = opportunities;
              state.lastRefresh = new Date();
            });

            if (pipelineId) {
              get().opportunitiesCache.set(pipelineId, opportunities);
            }
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          } finally {
            set((state) => {
              state.isLoading = false;
            });
          }
        },

        moveOpportunity: async (oppId: string, newStageId: number, notes?: string) => {
          const opportunity = get().opportunities.find(o => o.id === oppId);
          if (!opportunity) return;

          const oldStageId = opportunity.stage_id;

          // Optimistic update
          set((state) => {
            const opp = state.opportunities.find(o => o.id === oppId);
            if (opp) {
              opp.stage_id = newStageId;
            }
          });

          try {
            const updated = await pipelineService.moveOpportunityStage(oppId, newStageId, notes);
            set((state) => {
              const index = state.opportunities.findIndex(o => o.id === oppId);
              if (index !== -1) {
                state.opportunities[index] = updated;
              }
            });
          } catch (error: any) {
            // Rollback on error
            set((state) => {
              const opp = state.opportunities.find(o => o.id === oppId);
              if (opp) {
                opp.stage_id = oldStageId;
              }
              state.error = error.message;
            });
          }
        },

        handleDragDrop: async (result: DragDropResult) => {
          await get().moveOpportunity(
            result.opportunity_id,
            result.destination_stage_id
          );
        },

        updateOpportunity: (oppId: string, updates: Partial<OpportunityExtended>) => {
          set((state) => {
            const opportunity = state.opportunities.find(o => o.id === oppId);
            if (opportunity) {
              Object.assign(opportunity, updates);
            }
          });
        },

        bulkMoveOpportunities: async (oppIds: string[], newStageId: number) => {
          set((state) => {
            state.isLoading = true;
          });

          try {
            await pipelineService.bulkMoveOpportunities(oppIds, newStageId);
            await get().loadOpportunities(get().currentPipeline?.pipeline_id);
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          } finally {
            set((state) => {
              state.isLoading = false;
            });
          }
        },

        // Metrics & Analytics
        loadMetrics: async (pipelineId: number, force: boolean = false) => {
          const cached = get().metricsCache.get(pipelineId);
          if (!force && cached && Date.now() - cached.timestamp < CACHE_TTL) {
            set((state) => {
              state.metrics = cached.data;
            });
            return;
          }

          try {
            const metrics = await pipelineService.getPipelineMetrics(pipelineId);
            set((state) => {
              state.metrics = metrics;
              state.metricsCache.set(pipelineId, {
                data: metrics,
                timestamp: Date.now()
              });
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        loadBottlenecks: async (pipelineId: number) => {
          try {
            const bottlenecks = await pipelineService.detectBottlenecks(pipelineId);
            set((state) => {
              state.bottlenecks = bottlenecks;
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        loadVelocity: async (pipelineId: number, period: 'week' | 'month' | 'quarter' = 'month') => {
          try {
            const velocity = await pipelineService.getPipelineVelocity(pipelineId, period);
            set((state) => {
              state.velocity = velocity;
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        refreshMetrics: async () => {
          if (!get().currentPipeline) return;

          try {
            await pipelineService.refreshMetrics(get().currentPipeline!.pipeline_id);
            await get().loadMetrics(get().currentPipeline!.pipeline_id, true);
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        // Templates
        loadTemplates: async () => {
          try {
            const templates = await pipelineService.getTemplates();
            set((state) => {
              state.templates = templates;
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        applyTemplate: async (templateId: number, pipelineName: string) => {
          try {
            const newPipeline = await pipelineService.applyTemplate(templateId, pipelineName);
            set((state) => {
              state.pipelines.push(newPipeline);
              state.currentPipeline = newPipeline;
            });
            await get().selectPipeline(newPipeline.pipeline_id);
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        // Filters & View
        updateFilters: (filters: Partial<PipelineFilters>) => {
          set((state) => {
            state.filters = { ...state.filters, ...filters };
          });
        },

        clearFilters: () => {
          set((state) => {
            state.filters = {};
          });
        },

        setViewMode: (mode: 'kanban' | 'list' | 'calendar') => {
          set((state) => {
            state.viewMode = mode;
          });
        },

        setCardSize: (size: 'compact' | 'normal' | 'expanded') => {
          set((state) => {
            state.cardSize = size;
          });
        },

        // Utility
        setLoading: (loading: boolean) => {
          set((state) => {
            state.isLoading = loading;
          });
        },

        setError: (error: string | null) => {
          set((state) => {
            state.error = error;
          });
        },

        clearCache: () => {
          set((state) => {
            state.opportunitiesCache.clear();
            state.metricsCache.clear();
          });
        },

        // Computed getters
        getFilteredOpportunities: () => {
          const { opportunities, filters } = get();
          let filtered = [...opportunities];

          if (filters.stage_ids?.length) {
            filtered = filtered.filter(o => filters.stage_ids!.includes(o.stage_id!));
          }
          if (filters.owner_ids?.length) {
            filtered = filtered.filter(o => filters.owner_ids!.includes(o.owner_id!));
          }
          if (filters.priority?.length) {
            filtered = filtered.filter(o => filters.priority!.includes(o.priority));
          }
          if (filters.status?.length) {
            filtered = filtered.filter(o => filters.status!.includes(o.status));
          }
          if (filters.min_amount) {
            filtered = filtered.filter(o => o.amount >= filters.min_amount!);
          }
          if (filters.max_amount) {
            filtered = filtered.filter(o => o.amount <= filters.max_amount!);
          }
          if (filters.search) {
            const search = filters.search.toLowerCase();
            filtered = filtered.filter(o =>
              o.name.toLowerCase().includes(search) ||
              o.account?.name?.toLowerCase().includes(search)
            );
          }

          return filtered;
        },

        getOpportunitiesByStage: (stageId: number) => {
          const filtered = get().getFilteredOpportunities();
          return filtered.filter(o => o.stage_id === stageId);
        },

        getStageMetrics: (stageId: number) => {
          const opportunities = get().getOpportunitiesByStage(stageId);
          return {
            count: opportunities.length,
            totalValue: opportunities.reduce((sum, o) => sum + o.amount, 0),
            weightedValue: opportunities.reduce((sum, o) => sum + o.weighted_amount, 0)
          };
        }
      })),
      {
        name: 'pipeline-store',
        partialize: (state) => ({
          currentPipeline: state.currentPipeline,
          filters: state.filters,
          viewMode: state.viewMode,
          cardSize: state.cardSize
        })
      }
    ),
    {
      name: 'PipelineStore'
    }
  )
);

export default usePipelineStore;