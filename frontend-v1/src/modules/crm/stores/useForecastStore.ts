/**
 * Forecast Store - Zustand
 * Global state management for forecasting operations
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import forecastService from '../services/forecastService';
import {
  ForecastPeriod,
  ForecastSnapshot,
  ForecastAccuracy,
  SnapshotData,
  ForecastData,
  ForecastCategory,
  CommitStatus
} from '../types/pipeline.types';

interface ForecastSummary {
  total_pipeline: number;
  committed: number;
  best_case: number;
  upside: number;
  closed_won: number;
  closed_lost: number;
  gap_to_target: number;
  confidence_level: number;
}

interface ForecastByOwner {
  owner_id: string;
  owner_name: string;
  pipeline_amount: number;
  committed_amount: number;
  best_case_amount: number;
  closed_amount: number;
  quota?: number;
  attainment?: number;
}

interface ForecastTrend {
  period_id: number;
  period_name: string;
  forecast_amount: number;
  actual_amount: number;
  accuracy: number;
}

interface Prediction {
  opportunity_id: string;
  predicted_close_date: string;
  predicted_amount: number;
  confidence_score: number;
  risk_factors: string[];
  recommendations: string[];
}

interface ForecastStore {
  // State
  periods: ForecastPeriod[];
  currentPeriod: ForecastPeriod | null;
  snapshots: ForecastSnapshot[];
  accuracy: ForecastAccuracy[];
  historicalAccuracy: ForecastAccuracy[];
  summary: ForecastSummary | null;
  byOwner: ForecastByOwner[];
  trends: ForecastTrend[];
  predictions: Prediction[];
  isLoading: boolean;
  error: string | null;

  // Filters
  categoryFilter: ForecastCategory | null;
  commitStatusFilter: CommitStatus | null;
  ownerFilter: string | null;

  // Actions - Period Management
  loadPeriods: (active?: boolean) => Promise<void>;
  selectPeriod: (periodId: number) => Promise<void>;
  createPeriod: (period: Partial<ForecastPeriod>) => Promise<ForecastPeriod>;
  updatePeriod: (periodId: number, updates: Partial<ForecastPeriod>) => Promise<void>;
  closePeriod: (periodId: number) => Promise<void>;

  // Actions - Snapshot Management
  createSnapshot: (data: SnapshotData) => Promise<void>;
  createBulkSnapshots: (periodId: number, opportunityIds?: string[]) => Promise<void>;
  loadSnapshots: (periodId: number) => Promise<void>;
  updateSnapshot: (snapshotId: number, updates: Partial<ForecastSnapshot>) => Promise<void>;
  deleteSnapshot: (snapshotId: number) => Promise<void>;

  // Actions - Forecast Updates
  updateForecast: (oppId: string, category: ForecastCategory, status: CommitStatus) => Promise<void>;
  updateOpportunityForecast: (oppId: string, data: ForecastData) => Promise<void>;

  // Actions - Accuracy
  calculateAccuracy: (periodId: number) => Promise<void>;
  loadHistoricalAccuracy: (periods?: number) => Promise<void>;
  loadAccuracy: (periodId: number) => Promise<void>;

  // Actions - Analytics
  loadSummary: (periodId: number) => Promise<void>;
  loadByOwner: (periodId: number) => Promise<void>;
  loadTrends: (periodIds: number[]) => Promise<void>;
  loadPredictions: (periodId: number) => Promise<void>;

  // Actions - Filters
  setFilters: (filters: {
    category?: ForecastCategory | null;
    commitStatus?: CommitStatus | null;
    owner?: string | null;
  }) => void;
  clearFilters: () => void;

  // Actions - Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  exportForecast: (periodId: number, format: 'excel' | 'pdf') => Promise<void>;

  // Computed getters
  getFilteredSnapshots: () => ForecastSnapshot[];
  getForecastByCategory: () => Map<ForecastCategory, {
    count: number;
    amount: number;
    weighted: number;
  }>;
}

const useForecastStore = create<ForecastStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        periods: [],
        currentPeriod: null,
        snapshots: [],
        accuracy: [],
        historicalAccuracy: [],
        summary: null,
        byOwner: [],
        trends: [],
        predictions: [],
        isLoading: false,
        error: null,
        categoryFilter: null,
        commitStatusFilter: null,
        ownerFilter: null,

        // Period Management
        loadPeriods: async (active?: boolean) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            const periods = await forecastService.getForecastPeriods(active);
            set((state) => {
              state.periods = periods;
              if (!state.currentPeriod && periods.length > 0) {
                state.currentPeriod = periods.find(p => p.is_active) || periods[0];
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

        selectPeriod: async (periodId: number) => {
          const period = get().periods.find(p => p.period_id === periodId);
          if (!period) {
            const fetchedPeriod = await forecastService.getForecastPeriod(periodId);
            set((state) => {
              state.currentPeriod = fetchedPeriod;
            });
          } else {
            set((state) => {
              state.currentPeriod = period;
            });
          }

          // Load related data
          await Promise.all([
            get().loadSnapshots(periodId),
            get().loadSummary(periodId),
            get().loadByOwner(periodId)
          ]);
        },

        createPeriod: async (period: Partial<ForecastPeriod>) => {
          set((state) => {
            state.isLoading = true;
          });

          try {
            const newPeriod = await forecastService.createForecastPeriod(period);
            set((state) => {
              state.periods.push(newPeriod);
            });
            return newPeriod;
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

        updatePeriod: async (periodId: number, updates: Partial<ForecastPeriod>) => {
          try {
            const updatedPeriod = await forecastService.updateForecastPeriod(periodId, updates);
            set((state) => {
              const index = state.periods.findIndex(p => p.period_id === periodId);
              if (index !== -1) {
                state.periods[index] = updatedPeriod;
              }
              if (state.currentPeriod?.period_id === periodId) {
                state.currentPeriod = updatedPeriod;
              }
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        closePeriod: async (periodId: number) => {
          try {
            await forecastService.closeForecastPeriod(periodId);
            set((state) => {
              const period = state.periods.find(p => p.period_id === periodId);
              if (period) {
                period.is_active = false;
              }
              if (state.currentPeriod?.period_id === periodId) {
                state.currentPeriod.is_active = false;
              }
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        // Snapshot Management
        createSnapshot: async (data: SnapshotData) => {
          try {
            const snapshot = await forecastService.createSnapshot(data);
            set((state) => {
              state.snapshots.push(snapshot);
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        createBulkSnapshots: async (periodId: number, opportunityIds?: string[]) => {
          set((state) => {
            state.isLoading = true;
          });

          try {
            const result = await forecastService.createBulkSnapshots(periodId, opportunityIds);
            await get().loadSnapshots(periodId);
            return result;
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

        loadSnapshots: async (periodId: number) => {
          try {
            const filters = {
              category: get().categoryFilter || undefined,
              commit_status: get().commitStatusFilter || undefined,
              owner_id: get().ownerFilter || undefined
            };
            const snapshots = await forecastService.getSnapshots(periodId, filters);
            set((state) => {
              state.snapshots = snapshots;
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        updateSnapshot: async (snapshotId: number, updates: Partial<ForecastSnapshot>) => {
          try {
            const updatedSnapshot = await forecastService.updateSnapshot(snapshotId, updates);
            set((state) => {
              const index = state.snapshots.findIndex(s => s.snapshot_id === snapshotId);
              if (index !== -1) {
                state.snapshots[index] = updatedSnapshot;
              }
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        deleteSnapshot: async (snapshotId: number) => {
          try {
            await forecastService.deleteSnapshot(snapshotId);
            set((state) => {
              state.snapshots = state.snapshots.filter(s => s.snapshot_id !== snapshotId);
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        // Forecast Updates
        updateForecast: async (oppId: string, category: ForecastCategory, status: CommitStatus) => {
          const snapshot = get().snapshots.find(s => s.opportunity_id === oppId);
          if (snapshot) {
            await get().updateSnapshot(snapshot.snapshot_id, {
              forecast_category: category,
              commit_status: status
            });
          } else if (get().currentPeriod) {
            await get().createSnapshot({
              period_id: get().currentPeriod!.period_id,
              opportunity_id: oppId,
              amount: 0, // Will be fetched from opportunity
              forecast_category: category,
              commit_status: status
            });
          }
        },

        updateOpportunityForecast: async (oppId: string, data: ForecastData) => {
          try {
            await forecastService.updateOpportunityForecast(oppId, data);
            if (get().currentPeriod) {
              await get().loadSnapshots(get().currentPeriod.period_id);
            }
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        // Accuracy
        calculateAccuracy: async (periodId: number) => {
          try {
            const accuracy = await forecastService.calculateAccuracy(periodId);
            set((state) => {
              const existing = state.accuracy.findIndex(a => a.period_id === periodId);
              if (existing !== -1) {
                state.accuracy[existing] = accuracy;
              } else {
                state.accuracy.push(accuracy);
              }
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        loadHistoricalAccuracy: async (periods: number = 4) => {
          try {
            const accuracy = await forecastService.getHistoricalAccuracy(periods);
            set((state) => {
              state.historicalAccuracy = accuracy;
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        loadAccuracy: async (periodId: number) => {
          try {
            const accuracy = await forecastService.getForecastAccuracy(periodId);
            set((state) => {
              state.accuracy = accuracy;
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        // Analytics
        loadSummary: async (periodId: number) => {
          try {
            const summary = await forecastService.getForecastSummary(periodId);
            set((state) => {
              state.summary = summary;
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        loadByOwner: async (periodId: number) => {
          try {
            const byOwner = await forecastService.getForecastByOwner(periodId);
            set((state) => {
              state.byOwner = byOwner;
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        loadTrends: async (periodIds: number[]) => {
          try {
            const trends = await forecastService.getForecastTrends(periodIds);
            set((state) => {
              state.trends = trends;
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        loadPredictions: async (periodId: number) => {
          try {
            const predictions = await forecastService.getPredictions(periodId);
            set((state) => {
              state.predictions = predictions;
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        // Filters
        setFilters: (filters) => {
          set((state) => {
            if (filters.category !== undefined) state.categoryFilter = filters.category;
            if (filters.commitStatus !== undefined) state.commitStatusFilter = filters.commitStatus;
            if (filters.owner !== undefined) state.ownerFilter = filters.owner;
          });

          // Reload snapshots with new filters
          if (get().currentPeriod) {
            get().loadSnapshots(get().currentPeriod!.period_id);
          }
        },

        clearFilters: () => {
          set((state) => {
            state.categoryFilter = null;
            state.commitStatusFilter = null;
            state.ownerFilter = null;
          });

          if (get().currentPeriod) {
            get().loadSnapshots(get().currentPeriod!.period_id);
          }
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

        exportForecast: async (periodId: number, format: 'excel' | 'pdf') => {
          try {
            const blob = await forecastService.exportForecast(periodId, format);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `forecast_${periodId}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
            a.click();
            window.URL.revokeObjectURL(url);
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
            });
          }
        },

        // Computed getters
        getFilteredSnapshots: () => {
          const { snapshots, categoryFilter, commitStatusFilter, ownerFilter } = get();
          let filtered = [...snapshots];

          if (categoryFilter) {
            filtered = filtered.filter(s => s.forecast_category === categoryFilter);
          }
          if (commitStatusFilter) {
            filtered = filtered.filter(s => s.commit_status === commitStatusFilter);
          }
          // Owner filter would need to join with opportunities data

          return filtered;
        },

        getForecastByCategory: () => {
          const snapshots = get().getFilteredSnapshots();
          const byCategory = new Map<ForecastCategory, any>();

          const categories: ForecastCategory[] = ['commit', 'best_case', 'pipeline', 'omitted'];
          categories.forEach(cat => {
            const catSnapshots = snapshots.filter(s => s.forecast_category === cat);
            byCategory.set(cat, {
              count: catSnapshots.length,
              amount: catSnapshots.reduce((sum, s) => sum + s.amount, 0),
              weighted: catSnapshots.reduce((sum, s) => sum + (s.amount * s.probability / 100), 0)
            });
          });

          return byCategory;
        }
      })),
      {
        name: 'forecast-store',
        partialize: (state) => ({
          currentPeriod: state.currentPeriod,
          categoryFilter: state.categoryFilter,
          commitStatusFilter: state.commitStatusFilter,
          ownerFilter: state.ownerFilter
        })
      }
    ),
    {
      name: 'ForecastStore'
    }
  )
);

export default useForecastStore;