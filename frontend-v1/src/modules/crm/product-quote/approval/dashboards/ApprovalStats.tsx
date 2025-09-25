// ApprovalStats - Approval statistics widget
import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  BarChart3
} from 'lucide-react';
import { ApprovalMetrics } from '../../shared/types';

interface ApprovalStatsProps {
  metrics: ApprovalMetrics | null;
  loading?: boolean;
  showTrends?: boolean;
  timeframe?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label: string;
  };
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  trend,
  subtitle
}) => (
  <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <div className="flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {trend && (
              <div className={`ml-2 flex items-center text-sm ${
                trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.direction === 'up' ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
    {trend && (
      <div className="mt-4">
        <div className="text-xs text-gray-500">
          {trend.label}
        </div>
      </div>
    )}
  </div>
);

export const ApprovalStats: React.FC<ApprovalStatsProps> = ({
  metrics,
  loading = false,
  showTrends = true,
  timeframe = '30 days'
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="ml-4 flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600">
            No approval metrics available for the selected period.
          </p>
        </div>
      </div>
    );
  }

  const calculatePercentage = (value: number, total: number): number => {
    return total > 0 ? (value / total) * 100 : 0;
  };

  const getCompletionRate = (): number => {
    const completed = metrics.approved + metrics.rejected;
    return calculatePercentage(completed, metrics.totalRequests);
  };

  const getApprovalRate = (): number => {
    const completed = metrics.approved + metrics.rejected;
    return completed > 0 ? calculatePercentage(metrics.approved, completed) : 0;
  };

  const formatDuration = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  const stats = [
    {
      title: 'Total Requests',
      value: metrics.totalRequests.toLocaleString(),
      icon: BarChart3,
      color: 'bg-blue-500',
      subtitle: `Last ${timeframe}`,
      trend: showTrends ? {
        value: 12.5,
        direction: 'up' as const,
        label: 'vs previous period'
      } : undefined
    },
    {
      title: 'Approval Rate',
      value: `${getApprovalRate().toFixed(1)}%`,
      icon: CheckCircle,
      color: 'bg-green-500',
      subtitle: `${metrics.approved} approved of ${metrics.approved + metrics.rejected} completed`,
      trend: showTrends ? {
        value: 2.3,
        direction: 'up' as const,
        label: 'vs previous period'
      } : undefined
    },
    {
      title: 'Avg Response Time',
      value: formatDuration(metrics.averageTimeHours),
      icon: Clock,
      color: 'bg-purple-500',
      subtitle: 'Average approval time',
      trend: showTrends ? {
        value: 8.1,
        direction: 'down' as const,
        label: 'vs previous period'
      } : undefined
    },
    {
      title: 'Overdue Items',
      value: metrics.overdue.toLocaleString(),
      icon: AlertTriangle,
      color: metrics.overdue > 0 ? 'bg-red-500' : 'bg-gray-400',
      subtitle: `${calculatePercentage(metrics.overdue, metrics.totalRequests).toFixed(1)}% of total`,
      trend: showTrends ? {
        value: 15.2,
        direction: metrics.overdue > 10 ? 'up' : 'down' as const,
        label: 'vs previous period'
      } : undefined
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Approval Statistics</h3>
          <p className="text-sm text-gray-600">
            Performance metrics for the last {timeframe}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Period</div>
          <div className="text-sm font-medium text-gray-900">
            {new Date(metrics.period.start).toLocaleDateString()} - {new Date(metrics.period.end).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workflow Performance */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Workflow Performance</h4>
          <div className="space-y-4">
            {metrics.byWorkflow.slice(0, 5).map((workflow) => (
              <div key={workflow.workflowId} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {workflow.workflowName}
                    </span>
                    <span className="text-sm text-gray-500">
                      {workflow.totalRequests} requests
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${workflow.completionRate * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>{(workflow.completionRate * 100).toFixed(1)}% completion</span>
                    <span>{formatDuration(workflow.averageTimeHours)} avg time</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Approvers */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Top Approvers</h4>
          <div className="space-y-4">
            {metrics.byApprover.slice(0, 5).map((approver, index) => (
              <div key={approver.userId} className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {index + 1}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {approver.userName}
                    </p>
                    <div className="text-sm text-gray-500">
                      {approver.totalRequests} requests
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {approver.approved} approved, {approver.rejected} rejected
                    </span>
                    <span>
                      {formatDuration(approver.averageResponseTimeHours)} avg
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Status Distribution</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{metrics.pending}</div>
            <div className="text-sm text-gray-500">Pending</div>
            <div className="text-xs text-gray-400">
              {calculatePercentage(metrics.pending, metrics.totalRequests).toFixed(1)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{metrics.approved}</div>
            <div className="text-sm text-gray-500">Approved</div>
            <div className="text-xs text-gray-400">
              {calculatePercentage(metrics.approved, metrics.totalRequests).toFixed(1)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{metrics.rejected}</div>
            <div className="text-sm text-gray-500">Rejected</div>
            <div className="text-xs text-gray-400">
              {calculatePercentage(metrics.rejected, metrics.totalRequests).toFixed(1)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{metrics.overdue}</div>
            <div className="text-sm text-gray-500">Overdue</div>
            <div className="text-xs text-gray-400">
              {calculatePercentage(metrics.overdue, metrics.totalRequests).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalStats;