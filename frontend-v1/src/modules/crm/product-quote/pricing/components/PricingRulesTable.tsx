// Pricing Rules Table Component - Sprint 19 Phase 3
// Table view of all pricing rules with sorting and filtering

import React, { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Copy,
  TestTube2,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Star,
  Filter,
  Search,
  Calendar,
  Package,
  Users,
  Tag
} from 'lucide-react';
import {
  PricingRule,
  PricingRulesTableProps
} from '../../../shared/types/pricing.types';
import { Button } from '../../../../../shared/ui/Button';
import { Badge } from '../../../../../shared/ui/Badge';
import { Checkbox } from '../../../../../shared/ui/Checkbox';
import { Dropdown } from '../../../../../shared/ui/Dropdown';
import { Loading } from '../../../../../shared/ui/Loading';

type SortField = 'name' | 'priority' | 'type' | 'isActive' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

interface TableSort {
  field: SortField;
  order: SortOrder;
}

interface TableFilters {
  search: string;
  status: 'all' | 'active' | 'inactive';
  type: string | null;
  priority: 'all' | 'high' | 'medium' | 'low';
}

export const PricingRulesTable: React.FC<PricingRulesTableProps> = ({
  rules,
  loading = false,
  selectedRules = [],
  onSelectRules,
  onEdit,
  onDelete,
  onToggleActive,
  onDuplicate,
  onTest,
  onReorder
}) => {
  const [sort, setSort] = useState<TableSort>({ field: 'priority', order: 'desc' });
  const [filters, setFilters] = useState<TableFilters>({
    search: '',
    status: 'all',
    type: null,
    priority: 'all'
  });

  // Sort and filter rules
  const processedRules = useMemo(() => {
    let filtered = [...rules];

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(rule =>
        rule.name.toLowerCase().includes(searchTerm) ||
        (rule.description && rule.description.toLowerCase().includes(searchTerm))
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(rule =>
        filters.status === 'active' ? rule.isActive : !rule.isActive
      );
    }

    // Apply type filter
    if (filters.type) {
      filtered = filtered.filter(rule => rule.type === filters.type);
    }

    // Apply priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter(rule => {
        switch (filters.priority) {
          case 'high':
            return rule.priority >= 8;
          case 'medium':
            return rule.priority >= 5 && rule.priority < 8;
          case 'low':
            return rule.priority < 5;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sort.field];
      let bValue: any = b[sort.field];

      // Handle special cases
      if (sort.field === 'createdAt' || sort.field === 'updatedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sort.order === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sort.order === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [rules, sort, filters]);

  const handleSort = (field: SortField) => {
    setSort(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectRules?.(processedRules.map(rule => rule.id));
    } else {
      onSelectRules?.([]);
    }
  };

  const handleSelectRule = (ruleId: number, checked: boolean) => {
    if (checked) {
      onSelectRules?.([...selectedRules, ruleId]);
    } else {
      onSelectRules?.(selectedRules.filter(id => id !== ruleId));
    }
  };

  const getPriorityBadge = (priority: number) => {
    if (priority >= 8) {
      return <Badge variant="destructive">High</Badge>;
    } else if (priority >= 5) {
      return <Badge variant="warning">Medium</Badge>;
    } else {
      return <Badge variant="secondary">Low</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeLabels: Record<string, string> = {
      percentage: 'Percentage',
      fixed_amount: 'Fixed Amount',
      fixed_price: 'Fixed Price',
      tiered: 'Tiered',
      volume: 'Volume'
    };

    return (
      <Badge variant="outline">
        {typeLabels[type] || type}
      </Badge>
    );
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-gray-400" />
    );
  };

  const isExpiringSoon = (rule: PricingRule) => {
    if (!rule.validTo) return false;
    const expiryDate = new Date(rule.validTo);
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return expiryDate <= weekFromNow && expiryDate > new Date();
  };

  const isExpired = (rule: PricingRule) => {
    if (!rule.validTo) return false;
    return new Date(rule.validTo) < new Date();
  };

  const renderSortHeader = (field: SortField, label: string) => (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {sort.field === field && (
          sort.order === 'asc' ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )
        )}
      </div>
    </th>
  );

  const renderRuleActions = (rule: PricingRule) => {
    const actions = [
      {
        label: 'Edit',
        icon: Edit,
        onClick: () => onEdit?.(rule),
        color: 'text-blue-600'
      },
      {
        label: rule.isActive ? 'Deactivate' : 'Activate',
        icon: rule.isActive ? PowerOff : Power,
        onClick: () => onToggleActive?.(rule.id, !rule.isActive),
        color: rule.isActive ? 'text-yellow-600' : 'text-green-600'
      },
      {
        label: 'Duplicate',
        icon: Copy,
        onClick: () => onDuplicate?.(rule),
        color: 'text-gray-600'
      },
      {
        label: 'Test Rule',
        icon: TestTube2,
        onClick: () => onTest?.(rule),
        color: 'text-purple-600'
      },
      {
        label: 'Delete',
        icon: Trash2,
        onClick: () => onDelete?.(rule.id),
        color: 'text-red-600'
      }
    ];

    return (
      <Dropdown
        trigger={
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        }
        items={actions.map(action => ({
          label: action.label,
          icon: action.icon,
          onClick: action.onClick,
          className: action.color
        }))}
      />
    );
  };

  if (loading && rules.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" text="Loading pricing rules..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search rules..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Type Filter */}
          <select
            value={filters.type || ''}
            onChange={(e) => setFilters({ ...filters, type: e.target.value || null })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="percentage">Percentage</option>
            <option value="fixed_amount">Fixed Amount</option>
            <option value="fixed_price">Fixed Price</option>
            <option value="tiered">Tiered</option>
            <option value="volume">Volume</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value as any })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            {processedRules.length} of {rules.length} rules
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <Checkbox
                  checked={selectedRules.length === processedRules.length && processedRules.length > 0}
                  indeterminate={selectedRules.length > 0 && selectedRules.length < processedRules.length}
                  onChange={handleSelectAll}
                />
              </th>
              {renderSortHeader('name', 'Rule Name')}
              {renderSortHeader('type', 'Type')}
              {renderSortHeader('priority', 'Priority')}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Conditions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valid Period
              </th>
              {renderSortHeader('updatedAt', 'Last Updated')}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {processedRules.map((rule) => (
              <tr
                key={rule.id}
                className={`hover:bg-gray-50 ${
                  selectedRules.includes(rule.id) ? 'bg-blue-50' : ''
                } ${
                  isExpired(rule) ? 'opacity-60' : ''
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <Checkbox
                    checked={selectedRules.includes(rule.id)}
                    onChange={(checked) => handleSelectRule(rule.id, checked)}
                  />
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium text-gray-900">
                          {rule.name}
                        </div>
                        {isExpiringSoon(rule) && (
                          <AlertTriangle className="w-4 h-4 text-yellow-500" title="Expiring soon" />
                        )}
                        {isExpired(rule) && (
                          <XCircle className="w-4 h-4 text-red-500" title="Expired" />
                        )}
                      </div>
                      {rule.description && (
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {rule.description}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  {getTypeBadge(rule.type)}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getPriorityBadge(rule.priority)}
                    <span className="text-sm text-gray-500">({rule.priority})</span>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(rule.isActive)}
                    <span className={`text-sm ${rule.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    <Badge variant="outline" size="sm">
                      {rule.conditions?.length || 0} conditions
                    </Badge>
                    <Badge variant="outline" size="sm">
                      {rule.actions?.length || 0} actions
                    </Badge>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  {rule.validFrom || rule.validTo ? (
                    <div className="text-sm text-gray-900">
                      {rule.validFrom && (
                        <div>From: {new Date(rule.validFrom).toLocaleDateString()}</div>
                      )}
                      {rule.validTo && (
                        <div className={isExpired(rule) ? 'text-red-600' : ''}>
                          To: {new Date(rule.validTo).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">No expiry</span>
                  )}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(rule.updatedAt).toLocaleDateString()}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  {renderRuleActions(rule)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {processedRules.length === 0 && (
          <div className="text-center py-12">
            <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No rules found</h3>
            <p className="text-gray-500">
              {filters.search || filters.status !== 'all' || filters.type || filters.priority !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first pricing rule to get started'
              }
            </p>
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {loading && rules.length > 0 && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <Loading size="md" text="Updating rules..." />
        </div>
      )}
    </div>
  );
};

export default PricingRulesTable;