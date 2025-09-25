// SLAMonitor - SLA monitoring component
import React, { useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Target,
  Zap
} from 'lucide-react';
import { ApprovalMetrics } from '../../shared/types';

interface SLAMonitorProps {
  metrics: ApprovalMetrics | null;
  slaTargets?: SLATargets;
  loading?: boolean;
  showAlerts?: boolean;
}

interface SLATargets {
  responseTime: number; // hours
  completionRate: number; // percentage
  escalationRate: number; // percentage
  overdueThreshold: number; // percentage
}

interface SLAMetric {
  name: string;
  current: number;
  target: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

const defaultSLATargets: SLATargets = {
  responseTime: 24, // 24 hours
  completionRate: 95, // 95%
  escalationRate: 10, // max 10%
  overdueThreshold: 5 // max 5%
};

export const SLAMonitor: React.FC<SLAMonitorProps> = ({
  metrics,
  slaTargets = defaultSLATargets,
  loading = false,
  showAlerts = true
}) => {
  const slaMetrics = useMemo((): SLAMetric[] => {
    if (!metrics) return [];

    const completionRate = metrics.totalRequests > 0
      ? ((metrics.approved + metrics.rejected) / metrics.totalRequests) * 100
      : 0;

    const escalationRate = metrics.totalRequests > 0
      ? (metrics.overdue / metrics.totalRequests) * 100
      : 0;

    const overdueRate = metrics.totalRequests > 0
      ? (metrics.overdue / metrics.totalRequests) * 100
      : 0;

    const getStatus = (current: number, target: number, inverse: boolean = false): 'good' | 'warning' | 'critical' => {
      const ratio = current / target;
      if (inverse) {
        // For metrics where lower is better (like response time, escalation rate)
        if (ratio <= 0.8) return 'good';
        if (ratio <= 1.0) return 'warning';
        return 'critical';
      } else {
        // For metrics where higher is better (like completion rate)
        if (ratio >= 1.0) return 'good';
        if (ratio >= 0.9) return 'warning';
        return 'critical';
      }
    };

    return [
      {
        name: 'Response Time',
        current: metrics.averageTimeHours,
        target: slaTargets.responseTime,
        unit: 'hours',
        status: getStatus(metrics.averageTimeHours, slaTargets.responseTime, true),
        trend: 'down',
        trendValue: 12.5
      },
      {
        name: 'Completion Rate',
        current: completionRate,
        target: slaTargets.completionRate,
        unit: '%',
        status: getStatus(completionRate, slaTargets.completionRate),
        trend: 'up',
        trendValue: 3.2
      },
      {
        name: 'Escalation Rate',
        current: escalationRate,
        target: slaTargets.escalationRate,
        unit: '%',
        status: getStatus(escalationRate, slaTargets.escalationRate, true),
        trend: 'stable',
        trendValue: 0.8
      },
      {
        name: 'Overdue Rate',
        current: overdueRate,
        target: slaTargets.overdueThreshold,
        unit: '%',
        status: getStatus(overdueRate, slaTargets.overdueThreshold, true),
        trend: 'up',
        trendValue: 5.1
      }
    ];
  }, [metrics, slaTargets]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return CheckCircle;
      case 'warning':
        return AlertTriangle;
      case 'critical':
        return XCircle;
      default:
        return Clock;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return TrendingUp;
      case 'down':
        return TrendingDown;
      default:
        return Target;
    }
  };

  const criticalAlerts = slaMetrics.filter(metric => metric.status === 'critical');
  const warningAlerts = slaMetrics.filter(metric => metric.status === 'warning');

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="text-center">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No SLA Data</h3>
          <p className="text-gray-600">
            SLA monitoring requires approval metrics data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">SLA Monitor</h3>
          <p className="text-sm text-gray-600">
            Service level agreement compliance tracking
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-600">Real-time</span>
        </div>
      </div>

      {/* Alerts */}
      {showAlerts && (criticalAlerts.length > 0 || warningAlerts.length > 0) && (
        <div className="space-y-3">
          {criticalAlerts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-600 mr-2" />
                <h4 className="text-sm font-medium text-red-800">Critical SLA Violations</h4>
              </div>
              <div className="mt-2 space-y-1">
                {criticalAlerts.map((alert, index) => (
                  <p key={index} className="text-sm text-red-700">
                    {alert.name}: {alert.current.toFixed(1)}{alert.unit} (target: {alert.target}{alert.unit})
                  </p>
                ))}
              </div>
            </div>
          )}

          {warningAlerts.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                <h4 className="text-sm font-medium text-yellow-800">SLA Warnings</h4>
              </div>
              <div className="mt-2 space-y-1">
                {warningAlerts.map((alert, index) => (
                  <p key={index} className="text-sm text-yellow-700">
                    {alert.name}: {alert.current.toFixed(1)}{alert.unit} (target: {alert.target}{alert.unit})
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SLA Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {slaMetrics.map((metric, index) => {
          const StatusIcon = getStatusIcon(metric.status);
          const TrendIcon = getTrendIcon(metric.trend);
          const progressPercentage = Math.min((metric.current / metric.target) * 100, 100);

          return (
            <div key={index} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-900">{metric.name}</h4>
                <div className={`p-2 rounded-full ${getStatusColor(metric.status)}`}>
                  <StatusIcon className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-3">
                {/* Current Value */}
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {metric.current.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-500">{metric.unit}</span>
                </div>

                {/* Target and Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Target: {metric.target}{metric.unit}</span>
                    <span className={`font-medium ${getStatusColor(metric.status).split(' ')[0]}`}>
                      {metric.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        metric.status === 'good' ? 'bg-green-500' :
                        metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Trend */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1">
                    <TrendIcon className={`h-3 w-3 ${
                      metric.trend === 'up' ? 'text-green-600' :
                      metric.trend === 'down' ? 'text-red-600' : 'text-gray-400'
                    }`} />
                    <span className="text-gray-500">
                      {metric.trendValue.toFixed(1)}% vs last period
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed SLA Breakdown */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="text-lg font-medium text-gray-900 mb-4">SLA Breakdown by Workflow</h4>
        <div className="space-y-4">
          {metrics.byWorkflow.slice(0, 5).map((workflow) => {
            const workflowCompletionRate = workflow.completionRate * 100;
            const slaCompliant = workflow.averageTimeHours <= slaTargets.responseTime &&
                               workflowCompletionRate >= slaTargets.completionRate;

            return (
              <div key={workflow.workflowId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-medium text-gray-900">{workflow.workflowName}</h5>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      slaCompliant ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {slaCompliant ? 'SLA Met' : 'SLA Violation'}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Avg Response</div>
                      <div className="font-medium">{workflow.averageTimeHours.toFixed(1)}h</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Completion Rate</div>
                      <div className="font-medium">{workflowCompletionRate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Requests</div>
                      <div className="font-medium">{workflow.totalRequests}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SLA Configuration */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Current SLA Targets</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Response Time</div>
            <div className="font-medium">{slaTargets.responseTime}h</div>
          </div>
          <div>
            <div className="text-gray-500">Completion Rate</div>
            <div className="font-medium">{slaTargets.completionRate}%</div>
          </div>
          <div>
            <div className="text-gray-500">Max Escalation</div>
            <div className="font-medium">{slaTargets.escalationRate}%</div>
          </div>
          <div>
            <div className="text-gray-500">Max Overdue</div>
            <div className="font-medium">{slaTargets.overdueThreshold}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SLAMonitor;