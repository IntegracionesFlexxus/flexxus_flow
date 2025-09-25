// Pricing Rules Page - Sprint 19 Phase 3
// Manage all pricing rules with filtering and search

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  MoreVertical,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Copy,
  TestTube2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Package,
  Tag
} from 'lucide-react';
import { usePricingStore } from '../../../../stores/pricingStore';
import { usePricingRules } from '../hooks/usePricingRules';
import { PricingRule } from '../../../shared/types/pricing.types';
import { Button } from '../../../../../shared/ui/Button';
import { Card } from '../../../../../shared/ui/Card';
import { Loading } from '../../../../../shared/ui/Loading';
import { Badge } from '../../../../../shared/ui/Badge';
import { Modal } from '../../../../../shared/ui/Modal';
import { PricingRulesTable } from '../components/PricingRulesTable';
import { PricingRuleBuilder } from '../components/PricingRuleBuilder';
import { BulkPriceUpdate } from '../components/BulkPriceUpdate';

interface RuleFilters {
  status: 'all' | 'active' | 'inactive';
  type: string | null;
  priority: 'all' | 'high' | 'medium' | 'low';
  dateRange: 'all' | 'week' | 'month' | 'quarter';
  search: string;
}

export const PricingRulesPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<RuleFilters>({
    status: 'all',
    type: null,
    priority: 'all',
    dateRange: 'all',
    search: ''
  });
  const [selectedRules, setSelectedRules] = useState<number[]>([]);
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    pricingRules,
    loading,
    rulesLoading,
    error,
    loadPricingRules,
    createPricingRule,
    updatePricingRule,
    deletePricingRule,
    toggleRuleActive,
    testPricingRule,
    clearError
  } = usePricingStore();

  const {
    filteredRules,
    applyFilters,
    exportRules,
    importRules,
    duplicateRule,
    bulkUpdateRules
  } = usePricingRules();

  useEffect(() => {
    loadPricingRules();
  }, []);

  useEffect(() => {
    applyFilters(filters);
  }, [filters, pricingRules]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadPricingRules();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setShowRuleBuilder(true);
  };

  const handleEditRule = (rule: PricingRule) => {
    setEditingRule(rule);
    setShowRuleBuilder(true);
  };

  const handleSaveRule = async (ruleData: Omit<PricingRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingRule) {
        await updatePricingRule(editingRule.id, ruleData);
      } else {
        await createPricingRule(ruleData);
      }
      setShowRuleBuilder(false);
      setEditingRule(null);
    } catch (error) {
      console.error('Failed to save rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    setRuleToDelete(ruleId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteRule = async () => {
    if (ruleToDelete) {
      try {
        await deletePricingRule(ruleToDelete);
        setShowDeleteConfirm(false);
        setRuleToDelete(null);
      } catch (error) {
        console.error('Failed to delete rule:', error);
      }
    }
  };

  const handleToggleActive = async (ruleId: number) => {
    try {
      await toggleRuleActive(ruleId);
    } catch (error) {
      console.error('Failed to toggle rule status:', error);
    }
  };

  const handleDuplicateRule = async (rule: PricingRule) => {
    try {
      await duplicateRule(rule);
    } catch (error) {
      console.error('Failed to duplicate rule:', error);
    }
  };

  const handleTestRule = async (rule: PricingRule) => {
    try {
      // Navigate to test page or show test modal
      navigate(`/crm/pricing/rules/${rule.id}/test`);
    } catch (error) {
      console.error('Failed to test rule:', error);
    }
  };

  const handleBulkAction = (action: string) => {
    switch (action) {
      case 'activate':
        selectedRules.forEach(ruleId => handleToggleActive(ruleId));
        break;
      case 'deactivate':
        selectedRules.forEach(ruleId => handleToggleActive(ruleId));
        break;
      case 'delete':
        // Show bulk delete confirmation
        break;
      case 'update':
        setShowBulkUpdate(true);
        break;
      default:
        break;
    }
    setSelectedRules([]);
  };

  const handleExport = async () => {
    try {
      await exportRules(filteredRules);
    } catch (error) {
      console.error('Failed to export rules:', error);
    }
  };

  const handleImport = async (file: File) => {
    try {
      await importRules(file);
    } catch (error) {
      console.error('Failed to import rules:', error);
    }
  };

  const getRuleTypeOptions = () => {
    const types = [...new Set(pricingRules.map(rule => rule.type))];
    return types.map(type => ({
      value: type,
      label: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
    }));
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'text-red-600 bg-red-50';
    if (priority >= 5) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 8) return 'High';
    if (priority >= 5) return 'Medium';
    return 'Low';
  };

  if (loading && pricingRules.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading size="lg" text="Loading pricing rules..." />
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
              <h1 className="text-2xl font-bold text-gray-900">Pricing Rules</h1>
              <p className="text-sm text-gray-500">
                Manage pricing rules and automation logic
              </p>
            </div>
            <div className="flex items-center space-x-4">
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
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>

              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".json,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImport(file);
                  }}
                />
              </label>

              <Button onClick={handleCreateRule}>
                <Plus className="w-4 h-4 mr-2" />
                Create Rule
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

        {/* Filters */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search rules..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                />
              </div>

              {/* Status Filter */}
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              {/* Type Filter */}
              <select
                value={filters.type || ''}
                onChange={(e) => setFilters({ ...filters, type: e.target.value || null })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                {getRuleTypeOptions().map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              {/* Priority Filter */}
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value as any })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>

            {/* Bulk Actions */}
            {selectedRules.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedRules.length} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('activate')}
                >
                  <Power className="w-4 h-4 mr-1" />
                  Activate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('deactivate')}
                >
                  <PowerOff className="w-4 h-4 mr-1" />
                  Deactivate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('update')}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Bulk Update
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Rules Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Rules</p>
                <p className="text-2xl font-bold text-gray-900">{pricingRules.length}</p>
              </div>
              <Tag className="w-8 h-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Rules</p>
                <p className="text-2xl font-bold text-green-600">
                  {pricingRules.filter(rule => rule.isActive).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {pricingRules.filter(rule => {
                    if (!rule.validTo) return false;
                    const expiryDate = new Date(rule.validTo);
                    const weekFromNow = new Date();
                    weekFromNow.setDate(weekFromNow.getDate() + 7);
                    return expiryDate <= weekFromNow;
                  }).length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-red-600">
                  {pricingRules.filter(rule => rule.priority >= 8).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </Card>
        </div>

        {/* Rules Table */}
        <Card className="overflow-hidden">
          <PricingRulesTable
            rules={filteredRules}
            loading={rulesLoading}
            selectedRules={selectedRules}
            onSelectRules={setSelectedRules}
            onEdit={handleEditRule}
            onDelete={handleDeleteRule}
            onToggleActive={handleToggleActive}
            onDuplicate={handleDuplicateRule}
            onTest={handleTestRule}
          />
        </Card>

        {/* Rule Builder Modal */}
        {showRuleBuilder && (
          <Modal
            isOpen={showRuleBuilder}
            onClose={() => setShowRuleBuilder(false)}
            title={editingRule ? 'Edit Pricing Rule' : 'Create Pricing Rule'}
            size="xl"
          >
            <PricingRuleBuilder
              rule={editingRule}
              onSave={handleSaveRule}
              onCancel={() => setShowRuleBuilder(false)}
            />
          </Modal>
        )}

        {/* Bulk Update Modal */}
        {showBulkUpdate && (
          <Modal
            isOpen={showBulkUpdate}
            onClose={() => setShowBulkUpdate(false)}
            title="Bulk Update Rules"
            size="lg"
          >
            <BulkPriceUpdate
              selectedRuleIds={selectedRules}
              onComplete={() => {
                setShowBulkUpdate(false);
                setSelectedRules([]);
              }}
              onCancel={() => setShowBulkUpdate(false)}
            />
          </Modal>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <Modal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            title="Confirm Delete"
          >
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete this pricing rule? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteRule}
                >
                  Delete Rule
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default PricingRulesPage;