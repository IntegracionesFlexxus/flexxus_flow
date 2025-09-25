import { useCallback } from 'react';
import { useAnalyticsStore } from '../stores/analyticsStore';

export const useAnalytics = () => {
  const {
    metrics,
    revenueTrend,
    conversionFunnel,
    loading,
    error,
    fetchMetrics,
    fetchRevenueTrend,
    fetchConversionFunnel,
    clearError
  } = useAnalyticsStore();

  const refreshAll = useCallback(async () => {
    try {
      await Promise.all([
        fetchMetrics(),
        fetchRevenueTrend('monthly'),
        fetchConversionFunnel()
      ]);
    } catch (error) {
      console.error('Failed to refresh analytics:', error);
    }
  }, [fetchMetrics, fetchRevenueTrend, fetchConversionFunnel]);

  const getTrendDirection = useCallback((current: number, previous: number) => {
    if (previous === 0) return 'stable';
    const change = ((current - previous) / previous) * 100;
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  }, []);

  const getChangePercentage = useCallback((current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }, []);

  const formatMetricValue = useCallback((value: number, unit?: string) => {
    switch (unit) {
      case '$':
      case 'USD':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        }).format(value);
      case '%':
        return `${value.toFixed(1)}%`;
      case 'days':
        return `${Math.round(value)} days`;
      default:
        return value.toLocaleString();
    }
  }, []);

  const getMetricTrend = useCallback((metricKey: string) => {
    if (!metrics) return null;

    // This is a simplified example - in a real app you'd have historical data
    const mockTrends = {
      totalRevenue: { current: 245000, previous: 220000 },
      averageDealSize: { current: 15000, previous: 14200 },
      winRate: { current: 65.5, previous: 67.8 },
      salesCycle: { current: 28, previous: 32 }
    };

    const trend = mockTrends[metricKey as keyof typeof mockTrends];
    if (!trend) return null;

    return {
      current: trend.current,
      previous: trend.previous,
      change: getChangePercentage(trend.current, trend.previous),
      direction: getTrendDirection(trend.current, trend.previous)
    };
  }, [metrics, getChangePercentage, getTrendDirection]);

  const getTopMetrics = useCallback(() => {
    if (!metrics) return [];

    return [
      {
        key: 'totalRevenue',
        label: 'Total Revenue',
        value: metrics.salesMetrics.totalRevenue,
        unit: '$',
        trend: getMetricTrend('totalRevenue')
      },
      {
        key: 'averageDealSize',
        label: 'Average Deal Size',
        value: metrics.salesMetrics.averageDealSize,
        unit: '$',
        trend: getMetricTrend('averageDealSize')
      },
      {
        key: 'winRate',
        label: 'Win Rate',
        value: metrics.salesMetrics.winRate,
        unit: '%',
        trend: getMetricTrend('winRate')
      },
      {
        key: 'salesCycle',
        label: 'Sales Cycle',
        value: metrics.salesMetrics.salesCycle,
        unit: 'days',
        trend: getMetricTrend('salesCycle')
      }
    ];
  }, [metrics, getMetricTrend]);

  const isHealthy = useCallback((metricKey: string, value: number) => {
    const thresholds = {
      totalRevenue: { min: 200000, max: Infinity },
      averageDealSize: { min: 10000, max: Infinity },
      winRate: { min: 60, max: 100 },
      salesCycle: { min: 0, max: 30 }
    };

    const threshold = thresholds[metricKey as keyof typeof thresholds];
    if (!threshold) return true;

    return value >= threshold.min && value <= threshold.max;
  }, []);

  return {
    // Data
    metrics,
    revenueTrend,
    conversionFunnel,
    loading,
    error,

    // Actions
    refreshAll,
    fetchMetrics,
    fetchRevenueTrend,
    fetchConversionFunnel,
    clearError,

    // Computed values
    getTopMetrics,
    getMetricTrend,
    getTrendDirection,
    getChangePercentage,
    formatMetricValue,
    isHealthy
  };
};