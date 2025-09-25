// ApprovalQueue - List of pending approvals with actions
import React, { useState } from 'react';
import {
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Calendar,
  DollarSign,
  Eye,
  UserPlus,
  MoreHorizontal,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  ApprovalItem,
  ApprovalFilters,
  ApprovalDecision
} from '../../shared/types';

interface ApprovalQueueProps {
  items: ApprovalItem[];
  loading?: boolean;
  onApprove: (processId: number, decision: ApprovalDecision) => void;
  onDelegate: (processId: number, userId: number) => void;
  onViewDetails: (item: ApprovalItem) => void;
  filters?: ApprovalFilters;
  onFiltersChange?: (filters: ApprovalFilters) => void;
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  items,
  loading = false,
  onApprove,
  onDelegate,
  onViewDetails,
  filters,
  onFiltersChange
}) => {
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'amount'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimeRemaining = (timeRemaining?: number) => {
    if (!timeRemaining) return 'No deadline';

    const hours = Math.floor(timeRemaining);
    const minutes = Math.floor((timeRemaining - hours) * 60);

    if (timeRemaining < 0) {
      return `Overdue by ${Math.abs(hours)}h ${Math.abs(minutes)}m`;
    }

    if (hours < 24) {
      return `${hours}h ${minutes}m remaining`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h remaining`;
  };

  const formatAmount = (amount?: number, currency?: string) => {
    if (!amount) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  const sortedItems = [...items].sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortBy) {
      case 'priority':
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        break;
      case 'date':
        aValue = new Date(a.process.requestedAt).getTime();
        bValue = new Date(b.process.requestedAt).getTime();
        break;
      case 'amount':
        aValue = a.entity.amount || 0;
        bValue = b.entity.amount || 0;
        break;
      default:
        return 0;
    }

    if (sortOrder === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });

  const handleQuickApprove = (item: ApprovalItem) => {
    onApprove(item.process.id, {
      action: 'approve',
      comments: 'Quick approval',
      notifyRequestor: true
    });
  };

  const handleQuickReject = (item: ApprovalItem) => {
    onApprove(item.process.id, {
      action: 'reject',
      comments: 'Quick rejection',
      notifyRequestor: true
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-medium text-gray-900">
              Approval Queue ({items.length})
            </h3>

            {/* Sort Controls */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="priority">Priority</option>
                <option value="date">Date</option>
                <option value="amount">Amount</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="text-gray-400 hover:text-gray-600"
              >
                {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && filters && onFiltersChange && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  multiple
                  value={filters.priority}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    priority: Array.from(e.target.selectedOptions, option => option.value)
                  })}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  multiple
                  value={filters.status}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    status: Array.from(e.target.selectedOptions, option => option.value)
                  })}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.overdue}
                    onChange={(e) => onFiltersChange({
                      ...filters,
                      overdue: e.target.checked
                    })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Show overdue only</span>
                </label>
              </div>

              <div className="flex items-center">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.assignedToMe}
                    onChange={(e) => onFiltersChange({
                      ...filters,
                      assignedToMe: e.target.checked
                    })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Assigned to me</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Queue Items */}
      <div className="divide-y divide-gray-200">
        {sortedItems.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pending approvals</h3>
            <p className="text-gray-600">All caught up! Check back later for new approval requests.</p>
          </div>
        ) : (
          sortedItems.map((item) => (
            <div key={item.process.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                {/* Left Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    {/* Priority Badge */}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </span>

                    {/* Overdue Indicator */}
                    {item.isOverdue && (
                      <span className="inline-flex items-center text-red-600">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        <span className="text-xs font-medium">Overdue</span>
                      </span>
                    )}

                    {/* Entity Type */}
                    <span className="text-xs text-gray-500 uppercase tracking-wide">
                      {item.entity.type}
                    </span>
                  </div>

                  <h4 className="text-lg font-medium text-gray-900 mb-1">
                    {item.entity.title}
                  </h4>

                  {item.entity.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {item.entity.description}
                    </p>
                  )}

                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    {/* Requestor */}
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      <span>{item.entity.requestor.name}</span>
                    </div>

                    {/* Amount */}
                    {item.entity.amount && (
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        <span>{formatAmount(item.entity.amount, item.entity.currency)}</span>
                      </div>
                    )}

                    {/* Requested Date */}
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{new Date(item.process.requestedAt).toLocaleDateString()}</span>
                    </div>

                    {/* Time Remaining */}
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span className={item.isOverdue ? 'text-red-600' : ''}>
                        {formatTimeRemaining(item.timeRemaining)}
                      </span>
                    </div>
                  </div>

                  {/* Workflow Info */}
                  <div className="mt-2 text-sm text-gray-500">
                    Workflow: <span className="font-medium">{item.process.workflow.name}</span>
                    {item.process.currentStep && (
                      <span> • Step: {item.process.currentStep.name}</span>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center space-x-2 ml-6">
                  {item.canApprove && (
                    <>
                      <button
                        onClick={() => handleQuickApprove(item)}
                        className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => handleQuickReject(item)}
                        className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {item.canDelegate && (
                    <button
                      onClick={() => {
                        // TODO: Show delegate modal
                        console.log('Delegate approval for process:', item.process.id);
                      }}
                      className="flex items-center space-x-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Delegate</span>
                    </button>
                  )}

                  <button
                    onClick={() => onViewDetails(item)}
                    className="flex items-center space-x-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Details</span>
                  </button>

                  <button
                    onClick={() => setExpandedItem(expandedItem === item.process.id ? null : item.process.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedItem === item.process.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Process Information</h5>
                      <dl className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Process ID:</dt>
                          <dd className="text-gray-900">#{item.process.id}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Current Step:</dt>
                          <dd className="text-gray-900">{item.process.currentStep?.name || 'N/A'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Total Steps:</dt>
                          <dd className="text-gray-900">{item.process.workflow.steps.length}</dd>
                        </div>
                      </dl>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Entity Details</h5>
                      <dl className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Entity ID:</dt>
                          <dd className="text-gray-900">#{item.entity.id}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Requestor Email:</dt>
                          <dd className="text-gray-900">{item.entity.requestor.email}</dd>
                        </div>
                        {item.entity.amount && (
                          <div className="flex justify-between">
                            <dt className="text-gray-500">Amount:</dt>
                            <dd className="text-gray-900">
                              {formatAmount(item.entity.amount, item.entity.currency)}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </div>

                  {/* Comments */}
                  {item.process.comments && item.process.comments.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Recent Comments</h5>
                      <div className="space-y-2">
                        {item.process.comments.slice(-2).map((comment) => (
                          <div key={comment.id} className="flex items-start space-x-2">
                            <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm text-gray-600">{comment.content}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(comment.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ApprovalQueue;