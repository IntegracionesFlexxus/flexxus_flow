import { create } from 'zustand';
import analyticsService from '../services/analyticsService';

interface AnalyticsMetrics {
  salesMetrics: {
    totalRevenue: number;
    averageDealSize: number;
    winRate: number;
    salesCycle: number;
  };
  leadMetrics: {
    totalLeads: number;
    conversionRate: number;
    averageScore: number;
    topSources: Array<{ source: string; count: number }>;
  };
  activityMetrics: {
    totalActivities: number;
    completionRate: number;
    overdueCount: number;
    upcomingCount: number;
  };
  pipelineMetrics: {
    totalValue: number;
    weightedValue: number;
    stageDistribution: Array<{ stage: string; count: number; value: number }>;
    forecast: number;
  };
}

interface AnalyticsState {
  metrics: AnalyticsMetrics | null;
  revenueTrend: any[];
  conversionFunnel: any[];
  topPerformers: any[];
  salesForecast: any;
  campaignROI: any;
  performanceComparison: any;
  loading: boolean;
  error: string | null;

  fetchMetrics: () => Promise<void>;
  fetchRevenueTrend: (period?: string, startDate?: string, endDate?: string) => Promise<void>;
  fetchConversionFunnel: () => Promise<void>;
  fetchTopPerformers: (metric?: string, limit?: number) => Promise<void>;
  fetchSalesForecast: (months?: number) => Promise<void>;
  fetchCampaignROI: (campaignId?: number) => Promise<void>;
  fetchPerformanceComparison: (
    currentPeriod: { start: string; end: string },
    previousPeriod: { start: string; end: string }
  ) => Promise<void>;
  clearError: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  metrics: null,
  revenueTrend: [],
  conversionFunnel: [],
  topPerformers: [],
  salesForecast: null,
  campaignROI: null,
  performanceComparison: null,
  loading: false,
  error: null,

  fetchMetrics: async () => {
    set({ loading: true, error: null });
    try {
      const metrics = await analyticsService.getMetrics();
      set({ metrics, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch metrics', loading: false });
    }
  },

  fetchRevenueTrend: async (period = 'monthly', startDate?: string, endDate?: string) => {
    set({ loading: true, error: null });
    try {
      const trend = await analyticsService.getRevenueTrend(
        period as 'daily' | 'weekly' | 'monthly' | 'quarterly',
        startDate,
        endDate
      );
      set({ revenueTrend: trend, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch revenue trend', loading: false });
    }
  },

  fetchConversionFunnel: async () => {
    set({ loading: true, error: null });
    try {
      const funnel = await analyticsService.getConversionFunnel();
      set({ conversionFunnel: funnel, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch conversion funnel', loading: false });
    }
  },

  fetchTopPerformers: async (metric = 'revenue', limit = 10) => {
    set({ loading: true, error: null });
    try {
      const performers = await analyticsService.getTopPerformers(
        metric as 'revenue' | 'deals' | 'activities',
        limit
      );
      set({ topPerformers: performers, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch top performers', loading: false });
    }
  },

  fetchSalesForecast: async (months = 3) => {
    set({ loading: true, error: null });
    try {
      const forecast = await analyticsService.getSalesForecast(months);
      set({ salesForecast: forecast, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch sales forecast', loading: false });
    }
  },

  fetchCampaignROI: async (campaignId?: number) => {
    set({ loading: true, error: null });
    try {
      const roi = await analyticsService.getCampaignROI(campaignId);
      set({ campaignROI: roi, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch campaign ROI', loading: false });
    }
  },

  fetchPerformanceComparison: async (currentPeriod, previousPeriod) => {
    set({ loading: true, error: null });
    try {
      const comparison = await analyticsService.getPerformanceComparison(
        currentPeriod,
        previousPeriod
      );
      set({ performanceComparison: comparison, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch performance comparison', loading: false });
    }
  },

  clearError: () => set({ error: null })
}));