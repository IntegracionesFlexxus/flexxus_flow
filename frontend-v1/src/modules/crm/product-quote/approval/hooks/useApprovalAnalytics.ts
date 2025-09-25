// useApprovalAnalytics - Approval analytics hook
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApprovalMetrics } from '../../shared/types';
import { approvalService } from '../services/approvalService';

interface AnalyticsFilters {
  dateRange: {
    start: string;
    end: string;
  };
  workflowIds?: number[];
  entityTypes?: string[];
  approverIds?: number[];
}

interface TrendData {
  date: string;
  value: number;
  label: string;
}

interface PerformanceMetrics {
  averageResponseTime: number;
  completionRate: number;
  escalationRate: number;
  overduePlaceholder: number;
  throughput: number;
}

interface BottleneckAnalysis {
  stepId: number;
  stepName: string;
  averageTime: number;
  maxTime: number;
  timeoutRate: number;
  frequency: number;
}

interface UseApprovalAnalyticsReturn {
  // State
  analyticsData: ApprovalMetrics | null;
  trends: TrendData[];
  performance: PerformanceMetrics | null;
  bottlenecks: BottleneckAnalysis[];
  loading: boolean;
  error: string | null;

  // Actions
  loadAnalytics: (filters: AnalyticsFilters) => Promise<void>;
  generateReport: (filters: AnalyticsFilters, format: 'pdf' | 'excel' | 'csv') => Promise<void>;
  compareperiods: (period1: AnalyticsFilters, period2: AnalyticsFilters) => Promise<any>;
  refreshAnalytics: () => void;

  // Computed metrics
  getCompletionRateByWorkflow: () => Array<{ workflowId: number; workflowName: string; rate: number }>;
  getApproverPerformance: () => Array<{ userId: number; userName: string; metrics: any }>;
  getSLACompliance: () => { total: number; compliant: number; rate: number };
  getTimeDistribution: () => Array<{ range: string; count: number; percentage: number }>;
}

export const useApprovalAnalytics = (
  initialFilters?: AnalyticsFilters
): UseApprovalAnalyticsReturn => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<AnalyticsFilters>(
    initialFilters || {
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    }
  );

  const ANALYTICS_KEY = ['approval-analytics', filters];

  // Analytics query
  const {
    data: analyticsData = null,
    isLoading,
    error: queryError,
    refetch: refetchAnalytics
  } = useQuery({
    queryKey: ANALYTICS_KEY,
    queryFn: () => approvalService.getApprovalMetrics(filters.dateRange),
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Generate trends data
  const trends = useMemo(() => {
    if (!analyticsData) return [];

    const trendData: TrendData[] = [];
    const daysBetween = Math.ceil(
      (new Date(filters.dateRange.end).getTime() - new Date(filters.dateRange.start).getTime())
      / (1000 * 60 * 60 * 24)
    );

    // Generate daily approval counts (this would come from more detailed API data)
    for (let i = 0; i < daysBetween; i++) {
      const date = new Date(filters.dateRange.start);
      date.setDate(date.getDate() + i);

      trendData.push({
        date: date.toISOString().split('T')[0],
        value: Math.floor(Math.random() * 20) + 5, // Mock data
        label: 'Approvals'
      });
    }

    return trendData;
  }, [analyticsData, filters.dateRange]);

  // Calculate performance metrics
  const performance = useMemo((): PerformanceMetrics | null => {
    if (!analyticsData) return null;

    const totalRequests = analyticsData.totalRequests;
    const completedRequests = analyticsData.approved + analyticsData.rejected;

    return {
      averageResponseTime: analyticsData.averageTimeHours,
      completionRate: totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0,
      escalationRate: totalRequests > 0 ? (analyticsData.overdue / totalRequests) * 100 : 0,
      overduePlaceholder: analyticsData.overdue,
      throughput: completedRequests / (filters.dateRange.end !== filters.dateRange.start ?
        Math.ceil((new Date(filters.dateRange.end).getTime() - new Date(filters.dateRange.start).getTime()) / (1000 * 60 * 60 * 24)) : 1)
    };
  }, [analyticsData, filters.dateRange]);

  // Analyze bottlenecks
  const bottlenecks = useMemo((): BottleneckAnalysis[] => {
    if (!analyticsData || !analyticsData.byWorkflow) return [];

    return analyticsData.byWorkflow.map((workflow, index) => ({
      stepId: index + 1,
      stepName: workflow.workflowName,
      averageTime: workflow.averageTimeHours,
      maxTime: workflow.averageTimeHours * 1.5, // Mock calculation
      timeoutRate: (1 - workflow.completionRate) * 100,
      frequency: workflow.totalRequests
    })).sort((a, b) => b.averageTime - a.averageTime);
  }, [analyticsData]);

  // Actions
  const loadAnalytics = useCallback(async (newFilters: AnalyticsFilters) => {
    setFilters(newFilters);
    await refetchAnalytics();
  }, [refetchAnalytics]);

  const generateReport = useCallback(async (
    reportFilters: AnalyticsFilters,
    format: 'pdf' | 'excel' | 'csv'
  ) => {
    try {
      // This would call a report generation API
      const response = await fetch('/api/crm/approvals/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          filters: reportFilters,
          format
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Download the generated report
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `approval-analytics-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw error;
    }
  }, []);

  const compareperiods = useCallback(async (
    period1: AnalyticsFilters,
    period2: AnalyticsFilters
  ) => {
    try {
      const [data1, data2] = await Promise.all([
        approvalService.getApprovalMetrics(period1.dateRange),
        approvalService.getApprovalMetrics(period2.dateRange)
      ]);

      return {
        period1: data1,
        period2: data2,
        comparison: {
          totalRequestsChange: ((data1.totalRequests - data2.totalRequests) / data2.totalRequests) * 100,
          averageTimeChange: ((data1.averageTimeHours - data2.averageTimeHours) / data2.averageTimeHours) * 100,
          completionRateChange: ((data1.approved - data2.approved) / data2.approved) * 100,
          overdueChange: ((data1.overdue - data2.overdue) / (data2.overdue || 1)) * 100
        }
      };
    } catch (error) {
      console.error('Failed to compare periods:', error);
      throw error;
    }
  }, []);

  const refreshAnalytics = useCallback(() => {
    refetchAnalytics();
  }, [refetchAnalytics]);

  // Computed metrics
  const getCompletionRateByWorkflow = useCallback(() => {
    if (!analyticsData || !analyticsData.byWorkflow) return [];

    return analyticsData.byWorkflow.map(workflow => ({
      workflowId: workflow.workflowId,
      workflowName: workflow.workflowName,
      rate: workflow.completionRate * 100
    })).sort((a, b) => b.rate - a.rate);
  }, [analyticsData]);

  const getApproverPerformance = useCallback(() => {
    if (!analyticsData || !analyticsData.byApprover) return [];

    return analyticsData.byApprover.map(approver => ({
      userId: approver.userId,
      userName: approver.userName,
      metrics: {
        totalRequests: approver.totalRequests,
        approved: approver.approved,
        rejected: approver.rejected,
        averageResponseTime: approver.averageResponseTimeHours,
        overdue: approver.overdue,
        approvalRate: approver.totalRequests > 0 ? (approver.approved / approver.totalRequests) * 100 : 0,
        responseRate: approver.totalRequests > 0 ? ((approver.approved + approver.rejected) / approver.totalRequests) * 100 : 0
      }
    })).sort((a, b) => a.metrics.averageResponseTime - b.metrics.averageResponseTime);
  }, [analyticsData]);

  const getSLACompliance = useCallback(() => {
    if (!analyticsData) return { total: 0, compliant: 0, rate: 0 };

    const total = analyticsData.totalRequests;
    const compliant = total - analyticsData.overdue;

    return {
      total,
      compliant,
      rate: total > 0 ? (compliant / total) * 100 : 0
    };
  }, [analyticsData]);

  const getTimeDistribution = useCallback(() => {
    if (!analyticsData || !analyticsData.timeDistribution) return [];

    return analyticsData.timeDistribution.map(dist => ({
      range: dist.range,
      count: dist.count,
      percentage: dist.percentage
    }));
  }, [analyticsData]);

  const loading = isLoading;
  const error = queryError?.message || null;

  return {
    // State
    analyticsData,
    trends,
    performance,
    bottlenecks,
    loading,
    error,

    // Actions
    loadAnalytics,
    generateReport,
    compareperiods,
    refreshAnalytics,

    // Computed metrics
    getCompletionRateByWorkflow,
    getApproverPerformance,
    getSLACompliance,
    getTimeDistribution
  };
};