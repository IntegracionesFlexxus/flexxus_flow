// Revenue Recognition Page - Sprint 19 Frontend Implementation

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Download,
  Eye,
  Filter,
  Search,
  Settings,
  BarChart3,
  PieChart,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Calculator,
  Building,
  Users
} from 'lucide-react';

// Local imports
import { RevenueScheduleBuilder } from '../components/RevenueScheduleBuilder';
import { useRevenueRecognition } from '../hooks/useRevenueRecognition';

interface RevenueRecognitionPageProps {
  contractId?: number;
  quoteId?: number;
}

type ViewMode = 'dashboard' | 'schedule' | 'builder' | 'reports';
type PeriodType = 'monthly' | 'quarterly' | 'yearly';
type RecognitionMethod = 'straight_line' | 'milestone' | 'percentage_completion' | 'output';

interface RevenueSchedule {
  id: number;
  contractId: number;
  contractNumber: string;
  customerName: string;
  totalContractValue: number;
  recognizedRevenue: number;
  remainingRevenue: number;
  startDate: string;
  endDate: string;
  method: RecognitionMethod;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  scheduleItems: RevenueScheduleItem[];
  createdAt: string;
  updatedAt: string;
}

interface RevenueScheduleItem {
  id: number;
  scheduleId: number;
  periodStart: string;
  periodEnd: string;
  plannedAmount: number;
  recognizedAmount: number;
  remainingAmount: number;
  status: 'pending' | 'partial' | 'complete';
  milestone?: string;
  notes?: string;
}

interface RevenueMetrics {
  totalContractValue: number;
  recognizedToDate: number;
  remainingRevenue: number;
  monthlyRecognition: number;
  projectedCompletion: string;
  recognitionRate: number;
  onTrackPercentage: number;
  atRiskCount: number;
}

export const RevenueRecognitionPage: React.FC<RevenueRecognitionPageProps> = ({
  contractId: propContractId,
  quoteId: propQuoteId
}) => {
  const { contractId: urlContractId, quoteId: urlQuoteId } = useParams();
  const navigate = useNavigate();

  // Use props or URL params
  const contractId = propContractId || (urlContractId ? parseInt(urlContractId) : undefined);
  const quoteId = propQuoteId || (urlQuoteId ? parseInt(urlQuoteId) : undefined);

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedSchedule, setSelectedSchedule] = useState<RevenueSchedule | null>(null);
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]
  });

  // Hooks
  const {
    schedules,
    metrics,
    isLoading,
    error,
    createSchedule,
    updateSchedule,
    recognizeRevenue,
    generateReport,
    refetch
  } = useRevenueRecognition(contractId, quoteId);

  // Effects
  useEffect(() => {
    refetch();
  }, [contractId, quoteId, dateRange, refetch]);

  // Handlers
  const handleCreateSchedule = () => {
    setSelectedSchedule(null);
    setViewMode('builder');
  };

  const handleEditSchedule = (schedule: RevenueSchedule) => {
    setSelectedSchedule(schedule);
    setViewMode('builder');
  };

  const handleViewSchedule = (schedule: RevenueSchedule) => {
    setSelectedSchedule(schedule);
    setViewMode('schedule');
  };

  const handleSaveSchedule = async (data: any) => {
    try {
      if (selectedSchedule) {
        await updateSchedule(selectedSchedule.id, data);
      } else {
        await createSchedule(data);
      }
      setViewMode('dashboard');
      refetch();
    } catch (error) {
      console.error('Failed to save schedule:', error);
    }
  };

  const handleRecognizeRevenue = async (scheduleId: number, amount: number, period: string) => {
    try {
      await recognizeRevenue(scheduleId, amount, period);
      refetch();
    } catch (error) {
      console.error('Failed to recognize revenue:', error);
    }
  };

  const handleGenerateReport = async (format: 'pdf' | 'excel') => {
    try {
      await generateReport({
        scheduleIds: filteredSchedules.map(s => s.id),
        format,
        dateRange,
        periodType
      });
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  // Filter schedules
  const filteredSchedules = schedules?.filter(schedule => {
    const matchesSearch = schedule.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         schedule.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || schedule.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Render metrics cards
  const renderMetricsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Contract Value</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(metrics?.totalContractValue || 0)}
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Recognized to Date</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics?.recognizedToDate || 0)}
            </p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {formatPercentage((metrics?.recognizedToDate || 0) / (metrics?.totalContractValue || 1))} of total
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Remaining Revenue</p>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(metrics?.remainingRevenue || 0)}
            </p>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Monthly Recognition</p>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(metrics?.monthlyRecognition || 0)}
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );

  // Render schedule table
  const renderScheduleTable = () => (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Revenue Schedules</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contract
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recognized
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Remaining
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredSchedules.map((schedule) => (
              <tr key={schedule.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {schedule.contractNumber}
                  </div>
                  <div className="text-sm text-gray-500">
                    {schedule.method.replace('_', ' ')}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <Building className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{schedule.customerName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {formatCurrency(schedule.totalContractValue)}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(schedule.recognizedRevenue)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatPercentage(schedule.recognizedRevenue / schedule.totalContractValue)}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {formatCurrency(schedule.remainingRevenue)}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(schedule.status)}`}>
                    {schedule.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewSchedule(schedule)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Schedule"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditSchedule(schedule)}
                      className="text-green-600 hover:text-green-900"
                      title="Edit Schedule"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      className="text-purple-600 hover:text-purple-900"
                      title="Generate Report"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredSchedules.length === 0 && (
        <div className="text-center py-12">
          <Calculator className="mx-auto w-12 h-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No revenue schedules found</h3>
          <p className="mt-2 text-sm text-gray-500">
            Create a new revenue schedule to get started with ASC 606 compliance.
          </p>
          <button
            onClick={handleCreateSchedule}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Schedule
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {(viewMode === 'schedule' || viewMode === 'builder') && (
              <button
                onClick={() => setViewMode('dashboard')}
                className="text-gray-500 hover:text-gray-700"
              >
                ←
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {viewMode === 'dashboard'
                  ? 'Revenue Recognition'
                  : viewMode === 'schedule'
                  ? 'Schedule Details'
                  : viewMode === 'builder'
                  ? (selectedSchedule ? 'Edit Schedule' : 'Create Schedule')
                  : 'Revenue Reports'
                }
              </h1>
              <p className="text-sm text-gray-500">
                ASC 606 compliant revenue recognition and scheduling
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {viewMode === 'dashboard' && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Period:</label>
                  <select
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value as PeriodType)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <button
                  onClick={() => handleGenerateReport('pdf')}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
                <button
                  onClick={() => handleGenerateReport('excel')}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Download className="w-4 h-4" />
                  Export Excel
                </button>
                <button
                  onClick={handleCreateSchedule}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Calculator className="w-4 h-4" />
                  New Schedule
                </button>
              </>
            )}
          </div>
        </div>

        {viewMode === 'dashboard' && (
          <div className="mt-4 flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search contracts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {viewMode === 'dashboard' && (
          <div>
            {renderMetricsCards()}
            {renderScheduleTable()}
          </div>
        )}

        {viewMode === 'builder' && (
          <RevenueScheduleBuilder
            schedule={selectedSchedule}
            contractId={contractId}
            quoteId={quoteId}
            onSave={handleSaveSchedule}
            onCancel={() => setViewMode('dashboard')}
          />
        )}

        {viewMode === 'schedule' && selectedSchedule && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {selectedSchedule.contractNumber} - Revenue Schedule
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Customer:</span>
                  <div className="text-lg font-medium">{selectedSchedule.customerName}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Total Value:</span>
                  <div className="text-lg font-medium">{formatCurrency(selectedSchedule.totalContractValue)}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Method:</span>
                  <div className="text-lg font-medium capitalize">{selectedSchedule.method.replace('_', ' ')}</div>
                </div>
              </div>
            </div>

            {/* Schedule Items */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Planned</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recognized</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedSchedule.scheduleItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(item.periodStart).toLocaleDateString()} - {new Date(item.periodEnd).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(item.plannedAmount)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(item.recognizedAmount)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(item.remainingAmount)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenueRecognitionPage;