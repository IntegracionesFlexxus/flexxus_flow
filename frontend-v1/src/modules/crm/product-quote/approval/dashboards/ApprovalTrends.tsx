// ApprovalTrends - Approval trends chart
import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Filter
} from 'lucide-react';
import { ApprovalMetrics } from '../../shared/types';

interface ApprovalTrendsProps {
  metrics: ApprovalMetrics | null;
  chartType?: 'line' | 'area' | 'bar';
  timeframe?: 'week' | 'month' | 'quarter' | 'year';
  showComparison?: boolean;
  loading?: boolean;
}

interface TrendDataPoint {
  date: string;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  overdue: number;
  responseTime: number;
}

const COLORS = {
  approved: '#10b981',
  rejected: '#ef4444',
  pending: '#f59e0b',
  overdue: '#f97316',
  total: '#3b82f6',
  responseTime: '#8b5cf6'
};

export const ApprovalTrends: React.FC<ApprovalTrendsProps> = ({
  metrics,
  chartType = 'line',
  timeframe = 'month',
  showComparison = true,
  loading = false
}) => {
  // Generate trend data (in a real implementation, this would come from the API)
  const trendData = useMemo((): TrendDataPoint[] => {
    if (!metrics) return [];

    const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : timeframe === 'quarter' ? 90 : 365;
    const data: TrendDataPoint[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Generate mock data based on actual metrics
      const dailyTotal = Math.floor((metrics.totalRequests / days) + (Math.random() - 0.5) * 5);
      const dailyApproved = Math.floor(dailyTotal * 0.7 + (Math.random() - 0.5) * 3);
      const dailyRejected = Math.floor(dailyTotal * 0.15 + (Math.random() - 0.5) * 2);
      const dailyPending = Math.floor(dailyTotal * 0.12 + (Math.random() - 0.5) * 2);
      const dailyOverdue = Math.floor(dailyTotal * 0.03 + (Math.random() - 0.5) * 1);

      data.push({
        date: date.toISOString().split('T')[0],
        total: Math.max(0, dailyTotal),
        approved: Math.max(0, dailyApproved),
        rejected: Math.max(0, dailyRejected),
        pending: Math.max(0, dailyPending),
        overdue: Math.max(0, dailyOverdue),
        responseTime: metrics.averageTimeHours + (Math.random() - 0.5) * 10
      });
    }

    return data;
  }, [metrics, timeframe]);

  const statusDistribution = useMemo(() => {
    if (!metrics) return [];

    return [
      { name: 'Approved', value: metrics.approved, color: COLORS.approved },
      { name: 'Rejected', value: metrics.rejected, color: COLORS.rejected },
      { name: 'Pending', value: metrics.pending, color: COLORS.pending },
      { name: 'Overdue', value: metrics.overdue, color: COLORS.overdue }
    ].filter(item => item.value > 0);
  }, [metrics]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (timeframe === 'week') {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else if (timeframe === 'month') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short' });
    }
  };

  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'responseTime') {
      return [`${value.toFixed(1)}h`, 'Response Time'];
    }
    return [value, name.charAt(0).toUpperCase() + name.slice(1)];
  };

  const renderChart = () => {
    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.approved} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={COLORS.approved} stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorRejected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.rejected} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={COLORS.rejected} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip
              formatter={formatTooltipValue}
              labelFormatter={(label) => `Date: ${formatDate(label)}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="approved"
              stackId="1"
              stroke={COLORS.approved}
              fillOpacity={1}
              fill="url(#colorApproved)"
              name="Approved"
            />
            <Area
              type="monotone"
              dataKey="rejected"
              stackId="1"
              stroke={COLORS.rejected}
              fillOpacity={1}
              fill="url(#colorRejected)"
              name="Rejected"
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    } else if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip
              formatter={formatTooltipValue}
              labelFormatter={(label) => `Date: ${formatDate(label)}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar dataKey="approved" fill={COLORS.approved} name="Approved" />
            <Bar dataKey="rejected" fill={COLORS.rejected} name="Rejected" />
            <Bar dataKey="pending" fill={COLORS.pending} name="Pending" />
          </BarChart>
        </ResponsiveContainer>
      );
    } else {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis yAxisId="left" stroke="#6b7280" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke="#6b7280" fontSize={12} />
            <Tooltip
              formatter={formatTooltipValue}
              labelFormatter={(label) => `Date: ${formatDate(label)}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="total"
              stroke={COLORS.total}
              strokeWidth={2}
              dot={{ fill: COLORS.total, strokeWidth: 2, r: 4 }}
              name="Total Requests"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="approved"
              stroke={COLORS.approved}
              strokeWidth={2}
              dot={{ fill: COLORS.approved, strokeWidth: 2, r: 4 }}
              name="Approved"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="responseTime"
              stroke={COLORS.responseTime}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: COLORS.responseTime, strokeWidth: 2, r: 4 }}
              name="Response Time (h)"
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Trend Data</h3>
          <p className="text-gray-600">
            Trend analysis requires historical approval data.
          </p>
        </div>
      </div>
    );
  }

  // Calculate trend indicators
  const recentData = trendData.slice(-7);
  const olderData = trendData.slice(-14, -7);

  const recentAvg = recentData.reduce((sum, item) => sum + item.total, 0) / recentData.length;
  const olderAvg = olderData.reduce((sum, item) => sum + item.total, 0) / olderData.length;
  const volumeTrend = ((recentAvg - olderAvg) / olderAvg) * 100;

  const recentResponseTime = recentData.reduce((sum, item) => sum + item.responseTime, 0) / recentData.length;
  const olderResponseTime = olderData.reduce((sum, item) => sum + item.responseTime, 0) / olderData.length;
  const responseTrend = ((recentResponseTime - olderResponseTime) / olderResponseTime) * 100;

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Approval Trends</h3>
          <p className="text-sm text-gray-600">
            Historical analysis of approval activities
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span className="capitalize">{timeframe}</span>
          </div>
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <Filter className="h-4 w-4" />
            <span className="capitalize">{chartType}</span>
          </div>
        </div>
      </div>

      {/* Trend Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Volume Trend</div>
              <div className="text-lg font-semibold text-gray-900">
                {recentAvg.toFixed(1)}/day
              </div>
            </div>
            <div className={`flex items-center text-sm ${
              volumeTrend >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {volumeTrend >= 0 ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              {Math.abs(volumeTrend).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Response Time</div>
              <div className="text-lg font-semibold text-gray-900">
                {recentResponseTime.toFixed(1)}h
              </div>
            </div>
            <div className={`flex items-center text-sm ${
              responseTrend <= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {responseTrend <= 0 ? (
                <TrendingDown className="h-4 w-4 mr-1" />
              ) : (
                <TrendingUp className="h-4 w-4 mr-1" />
              )}
              {Math.abs(responseTrend).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Approval Rate</div>
              <div className="text-lg font-semibold text-gray-900">
                {((metrics.approved / (metrics.approved + metrics.rejected)) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-sm text-green-600">
              Stable
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="mb-4">
          <h4 className="text-lg font-medium text-gray-900">
            Approval Activity Over Time
          </h4>
        </div>
        {renderChart()}
      </div>

      {/* Additional Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Status Distribution</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Count']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Workflow Performance */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Workflow Performance</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={metrics.byWorkflow.slice(0, 5)} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" stroke="#6b7280" fontSize={12} />
              <YAxis
                type="category"
                dataKey="workflowName"
                stroke="#6b7280"
                fontSize={12}
                width={100}
              />
              <Tooltip
                formatter={(value, name) => [
                  name === 'averageTimeHours' ? `${value}h` : value,
                  name === 'averageTimeHours' ? 'Avg Time' : 'Completion Rate'
                ]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar
                dataKey="completionRate"
                fill={COLORS.approved}
                name="Completion Rate"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ApprovalTrends;