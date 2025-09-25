/**
 * Pipeline Metrics Hook
 * Manages pipeline metrics with polling and caching
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import usePipelineStore from '../stores/usePipelineStore';
import { PipelineMetrics, StageMetric } from '../types/pipeline.types';

interface UsePipelineMetricsOptions {
  pipelineId?: number;
  pollingInterval?: number; // in milliseconds
  enablePolling?: boolean;
  cacheTimeout?: number; // in milliseconds
}

const DEFAULT_POLLING_INTERVAL = 30000; // 30 seconds
const DEFAULT_CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const usePipelineMetrics = (options: UsePipelineMetricsOptions = {}) => {
  const {
    pipelineId,
    pollingInterval = DEFAULT_POLLING_INTERVAL,
    enablePolling = true,
    cacheTimeout = DEFAULT_CACHE_TIMEOUT
  } = options;

  const {
    currentPipeline,
    metrics,
    bottlenecks,
    velocity,
    loadMetrics,
    loadBottlenecks,
    loadVelocity,
    refreshMetrics,
    opportunities,
    stages
  } = usePipelineStore();

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cacheTimestampRef = useRef<number>(0);

  const activePipelineId = pipelineId || currentPipeline?.pipeline_id;

  // Start polling for metrics
  useEffect(() => {
    if (!activePipelineId || !enablePolling) {
      return;
    }

    const startPolling = () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }

      pollingTimerRef.current = setInterval(() => {
        const now = Date.now();
        const shouldRefresh = now - cacheTimestampRef.current > cacheTimeout;

        if (shouldRefresh) {
          loadMetrics(activePipelineId, true);
          cacheTimestampRef.current = now;
        }
      }, pollingInterval);
    };

    // Initial load
    loadMetrics(activePipelineId);
    cacheTimestampRef.current = Date.now();

    startPolling();

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, [activePipelineId, enablePolling, pollingInterval, cacheTimeout, loadMetrics]);

  // Calculate derived metrics
  const derivedMetrics = useMemo(() => {
    if (!metrics || !opportunities || !stages) {
      return null;
    }

    const openOpps = opportunities.filter(o => o.status === 'open');
    const wonOpps = opportunities.filter(o => o.status === 'won');
    const lostOpps = opportunities.filter(o => o.status === 'lost');

    // Stage funnel
    const stageFunnel = stages.map(stage => {
      const stageOpps = openOpps.filter(o => o.stage_id === stage.stage_id);
      return {
        stage_id: stage.stage_id,
        stage_name: stage.name,
        count: stageOpps.length,
        percentage: openOpps.length > 0 ? (stageOpps.length / openOpps.length) * 100 : 0,
        total_value: stageOpps.reduce((sum, o) => sum + o.amount, 0),
        avg_days: stageOpps.reduce((sum, o) => sum + (o.days_in_stage || 0), 0) / (stageOpps.length || 1)
      };
    });

    // Conversion rates between stages
    const conversionRates = stages.slice(0, -1).map((stage, index) => {
      const currentStageOpps = openOpps.filter(o => o.stage_id === stage.stage_id);
      const nextStage = stages[index + 1];
      const nextStageOpps = openOpps.filter(o => o.stage_id === nextStage.stage_id);

      return {
        from_stage: stage.name,
        to_stage: nextStage.name,
        rate: currentStageOpps.length > 0
          ? ((nextStageOpps.length + wonOpps.length) / currentStageOpps.length) * 100
          : 0
      };
    });

    // Time-based metrics
    const avgTimeToClose = wonOpps.reduce((sum, o) => {
      if (o.created_at && o.actual_close_date) {
        const created = new Date(o.created_at).getTime();
        const closed = new Date(o.actual_close_date).getTime();
        const days = (closed - created) / (1000 * 60 * 60 * 24);
        return sum + days;
      }
      return sum;
    }, 0) / (wonOpps.length || 1);

    // Health metrics
    const healthDistribution = {
      healthy: openOpps.filter(o => (o.health_score || 0) >= 70).length,
      warning: openOpps.filter(o => {
        const score = o.health_score || 0;
        return score >= 40 && score < 70;
      }).length,
      critical: openOpps.filter(o => (o.health_score || 0) < 40).length
    };

    // Engagement metrics
    const avgEngagement = openOpps.reduce((sum, o) => sum + (o.engagement_score || 0), 0) / (openOpps.length || 1);

    return {
      stageFunnel,
      conversionRates,
      avgTimeToClose,
      healthDistribution,
      avgEngagement,
      momentum: {
        newThisWeek: openOpps.filter(o => {
          const created = new Date(o.created_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return created >= weekAgo;
        }).length,
        closedThisWeek: [...wonOpps, ...lostOpps].filter(o => {
          if (!o.actual_close_date) return false;
          const closed = new Date(o.actual_close_date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return closed >= weekAgo;
        }).length
      }
    };
  }, [metrics, opportunities, stages]);

  // Force refresh metrics
  const forceRefresh = useCallback(async () => {
    if (!activePipelineId) return;

    await Promise.all([
      loadMetrics(activePipelineId, true),
      loadBottlenecks(activePipelineId),
      loadVelocity(activePipelineId)
    ]);

    cacheTimestampRef.current = Date.now();
  }, [activePipelineId, loadMetrics, loadBottlenecks, loadVelocity]);

  // Get metrics for specific stage
  const getStageMetrics = useCallback((stageId: number): StageMetric | null => {
    if (!metrics?.stage_metrics) return null;
    return metrics.stage_metrics.find(m => m.stage_id === stageId) || null;
  }, [metrics]);

  // Check if stage is a bottleneck
  const isBottleneck = useCallback((stageId: number): boolean => {
    return bottlenecks.some(b => b.stage_id === stageId && b.bottleneck_score > 50);
  }, [bottlenecks]);

  // Get velocity for stage
  const getStageVelocity = useCallback((stageId: number) => {
    return velocity.find(v => v.stage_id === stageId);
  }, [velocity]);

  // Calculate pipeline health score
  const pipelineHealthScore = useMemo(() => {
    if (!metrics || !derivedMetrics) return 0;

    const factors = [
      metrics.win_rate / 100,
      metrics.conversion_rate / 100,
      derivedMetrics.avgEngagement / 100,
      derivedMetrics.healthDistribution.healthy /
        (derivedMetrics.healthDistribution.healthy +
         derivedMetrics.healthDistribution.warning +
         derivedMetrics.healthDistribution.critical || 1),
      Math.min(metrics.velocity_rate / 5, 1) // Normalize velocity to 0-1
    ];

    return Math.round(factors.reduce((sum, f) => sum + f, 0) / factors.length * 100);
  }, [metrics, derivedMetrics]);

  // Pause/resume polling
  const pausePolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  const resumePolling = useCallback(() => {
    if (!activePipelineId || !enablePolling) return;

    pausePolling();
    pollingTimerRef.current = setInterval(() => {
      loadMetrics(activePipelineId, false);
    }, pollingInterval);
  }, [activePipelineId, enablePolling, pollingInterval, pausePolling, loadMetrics]);

  return {
    // Core metrics
    metrics,
    bottlenecks,
    velocity,

    // Derived metrics
    derivedMetrics,
    pipelineHealthScore,

    // Stage-specific
    getStageMetrics,
    isBottleneck,
    getStageVelocity,

    // Actions
    forceRefresh,
    pausePolling,
    resumePolling,

    // State
    isLoading: !metrics,
    lastUpdate: cacheTimestampRef.current
  };
};

export default usePipelineMetrics;