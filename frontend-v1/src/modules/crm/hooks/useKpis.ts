import { useCallback } from 'react';
import { useDashboardStore } from '../stores/dashboardStore';

export const useKpis = () => {
  const {
    kpis,
    kpiDashboard,
    kpiSnapshots,
    loading,
    error,
    fetchKpis,
    fetchKpiDashboard,
    calculateKpi,
    fetchKpiTrends,
    createKpiAlert,
    clearError
  } = useDashboardStore();

  const getKpisByCategory = useCallback((category: string) => {
    return kpis.filter(kpi => kpi.category === category);
  }, [kpis]);

  const getActiveKpis = useCallback(() => {
    return kpis.filter(kpi => kpi.status === 'active');
  }, [kpis]);

  const getKpiSnapshot = useCallback((kpiId: number) => {
    if (!kpiDashboard?.snapshots) return null;
    return kpiDashboard.snapshots.find((s: any) => s.kpi_id === kpiId);
  }, [kpiDashboard]);

  const getKpiTrends = useCallback((kpiId: number) => {
    return kpiSnapshots[kpiId] || [];
  }, [kpiSnapshots]);

  const getKpiAlerts = useCallback((kpiId: number) => {
    if (!kpiDashboard?.alerts) return [];
    return kpiDashboard.alerts.filter((alert: any) => alert.kpi_id === kpiId);
  }, [kpiDashboard]);

  const getKpiPerformance = useCallback((kpiId: number) => {
    const kpi = kpis.find(k => k.id === kpiId);
    const snapshot = getKpiSnapshot(kpiId);

    if (!kpi || !snapshot) return null;

    const current = snapshot.value;
    const target = kpi.target_value;
    const previous = snapshot.previous_value;

    let performance = 'unknown';
    let progress = 0;

    if (target) {
      progress = (current / target) * 100;
      if (progress >= 100) performance = 'excellent';
      else if (progress >= 80) performance = 'good';
      else if (progress >= 60) performance = 'fair';
      else performance = 'poor';
    }

    let trend = 'stable';
    let changePercent = 0;

    if (previous && previous !== 0) {
      changePercent = ((current - previous) / previous) * 100;
      if (changePercent > 5) trend = 'up';
      else if (changePercent < -5) trend = 'down';
    }

    return {
      current,
      target,
      previous,
      progress,
      performance,
      trend,
      changePercent,
      isOnTrack: target ? current >= target * 0.8 : true
    };
  }, [kpis, getKpiSnapshot]);

  const refreshKpi = useCallback(async (kpiId: number) => {
    await calculateKpi(kpiId);
    await fetchKpiDashboard();
  }, [calculateKpi, fetchKpiDashboard]);

  const refreshAllKpis = useCallback(async () => {
    await Promise.all([
      fetchKpis(),
      fetchKpiDashboard()
    ]);
  }, [fetchKpis, fetchKpiDashboard]);

  const getKpisByPerformance = useCallback((performanceLevel: string) => {
    return kpis.filter(kpi => {
      const performance = getKpiPerformance(kpi.id);
      return performance?.performance === performanceLevel;
    });
  }, [kpis, getKpiPerformance]);

  const getKpisByTrend = useCallback((trendDirection: string) => {
    return kpis.filter(kpi => {
      const performance = getKpiPerformance(kpi.id);
      return performance?.trend === trendDirection;
    });
  }, [kpis, getKpiPerformance]);

  const getKpisWithAlerts = useCallback(() => {
    return kpis.filter(kpi => {
      const alerts = getKpiAlerts(kpi.id);
      return alerts.length > 0;
    });
  }, [kpis, getKpiAlerts]);

  const formatKpiValue = useCallback((value: number, kpi: any) => {
    switch (kpi.format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'duration':
        return `${Math.round(value)} ${kpi.unit}`;
      case 'number':
      default:
        return value.toLocaleString();
    }
  }, []);

  const getKpiColor = useCallback((kpiId: number) => {
    const performance = getKpiPerformance(kpiId);
    const alerts = getKpiAlerts(kpiId);

    if (alerts.some((a: any) => a.severity === 'critical')) return 'error';
    if (alerts.some((a: any) => a.severity === 'warning')) return 'warning';

    if (!performance) return 'primary';

    switch (performance.performance) {
      case 'excellent': return 'success';
      case 'good': return 'info';
      case 'fair': return 'warning';
      case 'poor': return 'error';
      default: return 'primary';
    }
  }, [getKpiPerformance, getKpiAlerts]);

  const createAlert = useCallback(async (kpiId: number, alertConfig: any) => {
    return createKpiAlert(kpiId, alertConfig);
  }, [createKpiAlert]);

  const getKpiStats = useCallback(() => {
    const total = kpis.length;
    const active = kpis.filter(k => k.status === 'active').length;
    const withTargets = kpis.filter(k => k.target_value).length;
    const onTrack = kpis.filter(k => {
      const perf = getKpiPerformance(k.id);
      return perf?.isOnTrack;
    }).length;

    const byCategory = kpis.reduce((acc, kpi) => {
      acc[kpi.category] = (acc[kpi.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPerformance = {
      excellent: getKpisByPerformance('excellent').length,
      good: getKpisByPerformance('good').length,
      fair: getKpisByPerformance('fair').length,
      poor: getKpisByPerformance('poor').length
    };

    return {
      total,
      active,
      withTargets,
      onTrack,
      byCategory,
      byPerformance,
      healthScore: total > 0 ? Math.round((onTrack / total) * 100) : 0
    };
  }, [kpis, getKpiPerformance, getKpisByPerformance]);

  const searchKpis = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return kpis;

    const term = searchTerm.toLowerCase();
    return kpis.filter(kpi =>
      kpi.name.toLowerCase().includes(term) ||
      kpi.description?.toLowerCase().includes(term) ||
      kpi.category.toLowerCase().includes(term)
    );
  }, [kpis]);

  const sortKpis = useCallback((
    sortBy: 'name' | 'category' | 'created_at' | 'performance',
    direction: 'asc' | 'desc' = 'asc'
  ) => {
    return [...kpis].sort((a, b) => {
      let aValue: any = a[sortBy as keyof typeof a];
      let bValue: any = b[sortBy as keyof typeof b];

      if (sortBy === 'performance') {
        const aPerf = getKpiPerformance(a.id);
        const bPerf = getKpiPerformance(b.id);
        aValue = aPerf?.progress || 0;
        bValue = bPerf?.progress || 0;
      }

      if (sortBy === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [kpis, getKpiPerformance]);

  return {
    // Data
    kpis,
    kpiDashboard,
    kpiSnapshots,
    loading,
    error,

    // Basic actions
    fetchKpis,
    fetchKpiDashboard,
    calculateKpi,
    fetchKpiTrends,
    refreshKpi,
    refreshAllKpis,
    createAlert,
    clearError,

    // Data retrieval
    getKpiSnapshot,
    getKpiTrends,
    getKpiAlerts,
    getKpiPerformance,

    // Filtering & searching
    getKpisByCategory,
    getActiveKpis,
    getKpisByPerformance,
    getKpisByTrend,
    getKpisWithAlerts,
    searchKpis,
    sortKpis,

    // Utilities
    formatKpiValue,
    getKpiColor,
    getKpiStats
  };
};