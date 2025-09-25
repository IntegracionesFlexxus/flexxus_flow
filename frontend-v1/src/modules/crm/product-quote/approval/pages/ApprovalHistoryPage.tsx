// ApprovalHistoryPage - View approval history and analytics
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  FileText,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import {
  ApprovalProcess,
  ProcessFilters,
  ApprovalMetrics,
  ProcessApprovalStep
} from '../../shared/types';
import { useApprovals } from '../hooks/useApprovals';
import { useApprovalAnalytics } from '../hooks/useApprovalAnalytics';
import { ApprovalHistory } from '../components/ApprovalHistory';
import { ApprovalTrends } from '../dashboards/ApprovalTrends';
import MetricsCard from '../../shared/components/MetricsCard';

export const ApprovalHistoryPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'history' | 'analytics'>('history');
  const [selectedProcess, setSelectedProcess] = useState<ApprovalProcess | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState<ProcessFilters>({
    status: [],
    workflow: [],
    entityType: [],
    requestedBy: [],
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    }
  });
  const [searchQuery, setSearchQuery] = useState('');

  const {
    processes,
    metrics,
    loading,
    error,
    loadProcesses,
    refreshProcesses
  } = useApprovals();

  const {
    analyticsData,
    trends,
    performance,
    bottlenecks,
    loadAnalytics
  } = useApprovalAnalytics();

  useEffect(() => {
    loadProcesses(filters);
    loadAnalytics(filters.dateRange!);
  }, [filters, loadProcesses, loadAnalytics]);

  const filteredProcesses = processes.filter(process => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      process.workflow.name.toLowerCase().includes(searchLower) ||
      process.entityType.toLowerCase().includes(searchLower) ||
      process.metadata?.title?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'cancelled':
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (hours?: number) => {
    if (!hours) return 'N/A';
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Exporting approval history...');
  };

  const handleViewDetails = (process: ApprovalProcess) => {
    setSelectedProcess(process);
    setShowDetailsModal(true);
  };

  const summaryStats = [
    {
      title: 'Total Processes',
      value: filteredProcesses.length,
      icon: FileText,
      color: 'bg-blue-500'
    },
    {
      title: 'Approved',
      value: filteredProcesses.filter(p => p.status === 'approved').length,
      icon: CheckCircle,
      color: 'bg-green-500'
    },
    {
      title: 'Rejected',
      value: filteredProcesses.filter(p => p.status === 'rejected').length,
      icon: XCircle,
      color: 'bg-red-500'
    },
    {
      title: 'Avg Duration',
      value: metrics ? formatDuration(metrics.averageTimeHours) : 'N/A',
      icon: Clock,
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approval History</h1>
          <p className="text-gray-600">View and analyze approval process history</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Tab Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSelectedTab('history')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                selectedTab === 'history'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setSelectedTab('analytics')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                selectedTab === 'analytics'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Analytics
            </button>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryStats.map((stat, index) => (
          <MetricsCard key={index} {...stat} />
        ))}
      </div>

      {selectedTab === 'history' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search processes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <select
                value={filters.status.join(',')}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  status: e.target.value ? e.target.value.split(',') : []
                }))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* Entity Type Filter */}
              <select
                value={filters.entityType.join(',')}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  entityType: e.target.value ? e.target.value.split(',') : []
                }))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="quote">Quote</option>
                <option value="order">Order</option>
                <option value="contract">Contract</option>
                <option value="discount">Discount</option>
              </select>

              {/* Date Range */}
              <input
                type="date"
                value={filters.dateRange?.start || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange!, start: e.target.value }
                }))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <input
                type="date"
                value={filters.dateRange?.end || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange!, end: e.target.value }
                }))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Process List */}
          <div className="bg-white rounded-lg border border-gray-200">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredProcesses.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No processes found</h3>
                <p className="text-gray-600">
                  Try adjusting your search criteria or date range
                </p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Process
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Workflow
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requested
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProcesses.map((process) => (
                      <tr key={process.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {process.entityType} #{process.entityId}
                            </div>
                            <div className="text-sm text-gray-500">
                              {process.metadata?.title || 'No title'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{process.workflow.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(process.status)}
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(process.status)}`}>
                              {process.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDuration(process.totalTimeHours)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(process.requestedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleViewDetails(process)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTab === 'analytics' && (
        <div className="space-y-6">
          {/* Analytics Dashboard */}
          <ApprovalTrends metrics={metrics} />

          {/* Performance Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performers</h3>
              {metrics?.byApprover.slice(0, 5).map((approver, index) => (
                <div key={approver.userId} className="flex items-center justify-between py-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {approver.userName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {approver.totalRequests} requests
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-900">
                    {formatDuration(approver.averageResponseTimeHours)}
                  </div>
                </div>
              ))}
            </div>

            {/* Workflow Performance */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Workflow Performance</h3>
              {metrics?.byWorkflow.slice(0, 5).map((workflow) => (
                <div key={workflow.workflowId} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {workflow.workflowName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {workflow.totalRequests} requests
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {(workflow.completionRate * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDuration(workflow.averageTimeHours)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Process Details Modal */}
      {showDetailsModal && selectedProcess && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Approval Process Details
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <ApprovalHistory
              processId={selectedProcess.id}
              steps={selectedProcess.approvalSteps}
              comments={selectedProcess.comments || []}
              showTimeline={true}
            />
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalHistoryPage;