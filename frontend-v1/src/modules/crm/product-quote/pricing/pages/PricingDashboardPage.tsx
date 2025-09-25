// Pricing Dashboard Page - Sprint 19 Phase 3
// Main pricing dashboard with metrics and rules management

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Target,
  Settings,
  Plus,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react';
import { usePricingStore } from '../../../../stores/pricingStore';
import { usePricing } from '../hooks/usePricing';
import { Button } from '../../../../../shared/ui/Button';
import { Card } from '../../../../../shared/ui/Card';
import { Loading } from '../../../../../shared/ui/Loading';
import { Badge } from '../../../../../shared/ui/Badge';

interface DashboardMetrics {
  totalRules: number;
  activeRules: number;
  inactiveRules: number;
  averageDiscount: number;
  totalDiscountCodes: number;
  priceVariance: number;
  marginImpact: number;
  calculationsToday: number;
  performanceMs: number;
}

interface PricePerformanceData {
  date: string;
  calculations: number;
  avgResponseTime: number;
  cacheHitRate: number;
}

interface RuleUsageData {
  ruleName: string;
  applications: number;
  impact: number;
  type: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const PricingDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [performanceData, setPerformanceData] = useState<PricePerformanceData[]>([]);
  const [ruleUsageData, setRuleUsageData] = useState<RuleUsageData[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    pricingRules,
    discountCodes,
    analytics,
    loading,
    analyticsLoading,
    error,
    loadPricingRules,
    loadDiscountCodes,
    loadAnalytics,
    clearError
  } = usePricingStore();

  const { getPricingMetrics } = usePricing();

  useEffect(() => {
    loadInitialData();
  }, [selectedPeriod]);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadPricingRules(),
        loadDiscountCodes(),
        loadAnalytics(getPeriodDates(selectedPeriod))
      ]);
      await loadDashboardMetrics();
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const loadDashboardMetrics = async () => {
    try {
      const metricsData = await getPricingMetrics(selectedPeriod);
      setMetrics(metricsData.metrics);
      setPerformanceData(metricsData.performance);
      setRuleUsageData(metricsData.ruleUsage);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadInitialData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getPeriodDates = (period: string) => {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case '1d':
        start.setDate(end.getDate() - 1);
        break;
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      default:
        start.setDate(end.getDate() - 7);
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  const getRuleStatusData = () => {
    if (!metrics) return [];

    return [
      { name: 'Active', value: metrics.activeRules, color: '#10B981' },
      { name: 'Inactive', value: metrics.inactiveRules, color: '#6B7280' }
    ];
  };

  const getPerformanceIndicator = (value: number, threshold: number, reverse = false) => {
    const isGood = reverse ? value < threshold : value > threshold;
    return isGood ? (
      <div className="flex items-center text-green-600">
        <TrendingUp className="w-4 h-4 mr-1" />
        <span className="text-sm font-medium">Good</span>
      </div>
    ) : (
      <div className="flex items-center text-red-600">
        <TrendingDown className="w-4 h-4 mr-1" />
        <span className="text-sm font-medium">Poor</span>
      </div>
    );
  };

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading size="lg" text="Loading pricing dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pricing Dashboard</h1>
              <p className="text-sm text-gray-500">
                Monitor pricing performance and manage pricing rules
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Period Selector */}
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1d">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {/* Handle export */}}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>

              <Button
                onClick={() => navigate('/crm/pricing/rules')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Rules
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <div className="mt-2">
                  <Button variant="outline" size="sm" onClick={clearError}>
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rules</p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics?.totalRules || pricingRules.length}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Settings className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <Badge variant={metrics?.activeRules ? 'success' : 'secondary'}>
                {metrics?.activeRules || 0} active
              </Badge>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Discount</p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics?.averageDiscount?.toFixed(1) || '0.0'}%
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <Percent className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              {getPerformanceIndicator(metrics?.averageDiscount || 0, 15, true)}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Price Variance</p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics?.priceVariance?.toFixed(2) || '0.00'}%
                </p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4">
              {getPerformanceIndicator(metrics?.priceVariance || 0, 10, true)}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Performance</p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics?.performanceMs || 0}ms
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              {getPerformanceIndicator(metrics?.performanceMs || 0, 300, true)}
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Performance Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Price Calculation Performance</h3>
              <Badge variant="info">
                {performanceData.length} data points
              </Badge>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="calculations" fill="#8884d8" name="Calculations" />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgResponseTime"
                    stroke="#82ca9d"
                    name="Avg Response Time (ms)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Rule Status Pie Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Pricing Rules Status</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/crm/pricing/rules')}
              >
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Button>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getRuleStatusData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getRuleStatusData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Rule Usage Analysis */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top Pricing Rules Usage</h3>
            <div className="flex items-center space-x-2">
              <Badge variant="info">
                Last {selectedPeriod}
              </Badge>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ruleUsageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ruleName" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="applications" fill="#8884d8" name="Applications" />
                <Bar dataKey="impact" fill="#82ca9d" name="Impact ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/crm/pricing/rules/new')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Pricing Rule
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/crm/pricing/discount-codes/new')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Discount Code
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/crm/pricing/simulator')}
              >
                <Target className="w-4 h-4 mr-2" />
                Price Simulator
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                <span>Volume discount rule activated</span>
              </div>
              <div className="flex items-center text-sm">
                <XCircle className="w-4 h-4 text-red-500 mr-2" />
                <span>Seasonal discount expired</span>
              </div>
              <div className="flex items-center text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                <span>New customer tier pricing updated</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Cache Hit Rate</span>
                <Badge variant="success">94%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Response Time</span>
                <Badge variant="success">{metrics?.performanceMs || 0}ms</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Error Rate</span>
                <Badge variant="success">0.1%</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PricingDashboardPage;