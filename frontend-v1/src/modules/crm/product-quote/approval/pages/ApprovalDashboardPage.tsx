// ApprovalDashboardPage - Main approval dashboard with pending items
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Search,
  Bell,
  BarChart3,
  Calendar,
  Download
} from 'lucide-react';
import { ApprovalItem, ApprovalFilters, ApprovalMetrics } from '../../shared/types';
import { useApprovals } from '../hooks/useApprovals';
import { useApprovalNotifications } from '../hooks/useApprovalNotifications';
import { ApprovalQueue } from '../components/ApprovalQueue';
import { ApprovalStats } from '../dashboards/ApprovalStats';
import { SLAMonitor } from '../dashboards/SLAMonitor';
import { ApprovalTrends } from '../dashboards/ApprovalTrends';
import { ApprovalNotifications } from '../components/ApprovalNotifications';
import { ApprovalDecisionModal } from '../components/ApprovalDecisionModal';
import MetricsCard from '../../shared/components/MetricsCard';

export const ApprovalDashboardPage: React.FC = () => {
  const [selectedView, setSelectedView] = useState<'queue' | 'metrics' | 'notifications'>('queue');
  const [filters, setFilters] = useState<ApprovalFilters>({
    status: [],
    workflow: [],
    priority: [],
    overdue: false,
    assignedToMe: true
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [showDecisionModal, setShowDecisionModal] = useState(false);

  const {
    pendingApprovals,
    metrics,
    loading,
    error,
    submitDecision,
    delegateApproval,
    refreshApprovals
  } = useApprovals(filters);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  } = useApprovalNotifications();

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshApprovals();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshApprovals]);

  const handleApprove = (processId: number, decision: any) => {
    setSelectedItem(pendingApprovals.find(item => item.process.id === processId) || null);
    setShowDecisionModal(true);
  };

  const handleDelegate = async (processId: number, userId: number) => {
    try {
      await delegateApproval(processId, userId);
      refreshApprovals();
    } catch (error) {
      console.error('Failed to delegate approval:', error);
    }
  };

  const handleDecisionSubmit = async (decision: any) => {
    if (!selectedItem) return;

    try {
      await submitDecision(
        selectedItem.process.id,
        selectedItem.process.currentStepId!,
        decision
      );
      setShowDecisionModal(false);
      setSelectedItem(null);
      refreshApprovals();
    } catch (error) {
      console.error('Failed to submit decision:', error);
    }
  };

  const filteredApprovals = pendingApprovals.filter(item => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      item.entity.title.toLowerCase().includes(searchLower) ||
      item.entity.description?.toLowerCase().includes(searchLower) ||
      item.entity.requestor.name.toLowerCase().includes(searchLower)
    );
  });

  const stats = [
    {
      title: 'Pending Approvals',
      value: pendingApprovals.length,
      icon: Clock,
      color: 'bg-blue-500'
    },
    {
      title: 'Overdue Items',
      value: pendingApprovals.filter(item => item.isOverdue).length,
      icon: AlertTriangle,
      color: 'bg-red-500'
    },
    {
      title: 'Urgent Priority',
      value: pendingApprovals.filter(item => item.priority === 'urgent').length,
      icon: XCircle,
      color: 'bg-orange-500'
    },
    {
      title: 'Avg Response Time',
      value: metrics ? `${metrics.averageTimeHours.toFixed(1)}h` : '0h',
      icon: BarChart3,
      color: 'bg-green-500'
    }
  ];

  if (loading && !pendingApprovals.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approval Dashboard</h1>
          <p className="text-gray-600">Manage your pending approvals and track workflow performance</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <button
            onClick={() => setSelectedView('notifications')}
            className="relative p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSelectedView('queue')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                selectedView === 'queue'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Queue
            </button>
            <button
              onClick={() => setSelectedView('metrics')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                selectedView === 'metrics'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Metrics
            </button>
          </div>

          {/* Export Button */}
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <MetricsCard key={index} {...stat} />
        ))}
      </div>

      {/* Main Content */}
      {selectedView === 'queue' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search approvals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={() => {
                // Toggle filters panel
              }}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </button>

            <button
              onClick={() => setFilters(prev => ({ ...prev, assignedToMe: !prev.assignedToMe }))}
              className={`px-4 py-2 rounded-lg ${
                filters.assignedToMe
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              My Approvals
            </button>
          </div>

          {/* Approval Queue */}
          <ApprovalQueue
            items={filteredApprovals}
            loading={loading}
            onApprove={handleApprove}
            onDelegate={handleDelegate}
            onViewDetails={(item) => setSelectedItem(item)}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
      )}

      {selectedView === 'metrics' && (
        <div className="space-y-6">
          {/* Metrics Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ApprovalStats metrics={metrics} />
            <SLAMonitor metrics={metrics} />
          </div>

          <ApprovalTrends metrics={metrics} />
        </div>
      )}

      {selectedView === 'notifications' && (
        <ApprovalNotifications
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
        />
      )}

      {/* Decision Modal */}
      {showDecisionModal && selectedItem && (
        <ApprovalDecisionModal
          isOpen={showDecisionModal}
          process={selectedItem.process}
          onDecision={handleDecisionSubmit}
          onClose={() => {
            setShowDecisionModal(false);
            setSelectedItem(null);
          }}
          canDelegate={selectedItem.canDelegate}
        />
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

export default ApprovalDashboardPage;