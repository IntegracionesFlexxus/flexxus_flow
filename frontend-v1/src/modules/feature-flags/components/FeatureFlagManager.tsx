/**
 * Feature Flag Manager Component - Sprint 3
 * Componente principal para la gestión de feature flags
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingOverlay } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/select';
import { useNotifications } from '@/shared/hooks/useNotifications';
import { featureFlagService } from '@modules/feature-flags/services/featureFlagService';
import { FeatureFlagCreateDialog } from './FeatureFlagCreateDialog';
import { FeatureFlagEditDialog } from './FeatureFlagEditDialog';
import { FeatureFlagAnalytics } from './FeatureFlagAnalytics';
import { FeatureFlagRulesEditor } from './FeatureFlagRulesEditor';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  environment: string;
  companyId: string;
  rolloutPercentage: number;
  rolloutStrategy: 'percentage' | 'user_id' | 'custom';
  rules: any[];
  variations: any[];
  defaultVariation: string;
  category?: string;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface FeatureFlagEvaluation {
  enabled: boolean;
  variation?: string;
  value?: any;
  reason: string;
  evaluationTime: number;
  cacheHit: boolean;
}

export const FeatureFlagManager: React.FC = () => {
  // State management
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEnvironment, setFilterEnvironment] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedFlags, setSelectedFlags] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  // UI state
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; flagId?: string; flagName?: string }>({ show: false });
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  const { addNotification } = useNotifications();

  // Load feature flags on mount
  useEffect(() => {
    loadFeatureFlags();
  }, []);

  /**
   * Load feature flags from API
   */
  const loadFeatureFlags = async () => {
    try {
      setLoading(true);
      const response = await featureFlagService.getFeatureFlags();
      setFlags(response.flags || []);
    } catch (error) {
      addNotification('Failed to load feature flags', 'error');
      console.error('Error loading feature flags:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filter flags based on search and filters
   */
  const filteredFlags = flags.filter(flag => {
    const matchesSearch = flag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         flag.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEnvironment = filterEnvironment === 'all' || flag.environment === filterEnvironment;
    const matchesCategory = filterCategory === 'all' || flag.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'enabled' && flag.enabled) ||
                         (filterStatus === 'disabled' && !flag.enabled);
    
    return matchesSearch && matchesEnvironment && matchesCategory && matchesStatus;
  });

  /**
   * Toggle flag enabled state
   */
  const toggleFlag = async (flagId: string, enabled: boolean) => {
    try {
      await featureFlagService.updateFeatureFlag(flagId, { enabled });
      setFlags(prev => prev.map(flag => 
        flag.id === flagId ? { ...flag, enabled } : flag
      ));
      addNotification(`Feature flag ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      addNotification('Failed to update feature flag', 'error');
      console.error('Error toggling flag:', error);
    }
  };

  /**
   * Delete a feature flag
   */
  const deleteFlag = async (flagId: string) => {
    try {
      await featureFlagService.deleteFeatureFlag(flagId);
      setFlags(prev => prev.filter(flag => flag.id !== flagId));
      addNotification('Feature flag deleted successfully', 'success');
    } catch (error) {
      addNotification('Failed to delete feature flag', 'error');
      console.error('Error deleting flag:', error);
    }
  };

  /**
   * Bulk enable/disable selected flags
   */
  const bulkToggleFlags = async (enabled: boolean) => {
    if (selectedFlags.length === 0) return;
    
    try {
      setBulkActionLoading(true);
      await featureFlagService.bulkUpdateFlags(selectedFlags, { enabled });
      
      setFlags(prev => prev.map(flag => 
        selectedFlags.includes(flag.id) ? { ...flag, enabled } : flag
      ));
      
      setSelectedFlags([]);
      addNotification(`${selectedFlags.length} flags ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      addNotification('Failed to update flags', 'error');
      console.error('Error bulk updating flags:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  /**
   * Clone a feature flag
   */
  const cloneFlag = async (flag: FeatureFlag) => {
    try {
      const clonedFlag = {
        ...flag,
        name: `${flag.name}_copy`,
        enabled: false
      };
      delete clonedFlag.id;
      
      const response = await featureFlagService.createFeatureFlag(clonedFlag);
      setFlags(prev => [...prev, response.flag]);
      addNotification('Feature flag cloned successfully', 'success');
    } catch (error) {
      addNotification('Failed to clone feature flag', 'error');
      console.error('Error cloning flag:', error);
    }
  };

  /**
   * Table columns configuration
   */
  const tableColumns = [
    {
      key: 'name',
      title: 'Name',
      render: (flag: FeatureFlag) => (
        <div>
          <div className="font-medium">{flag.name}</div>
          <div className="text-sm text-gray-500">{flag.description}</div>
        </div>
      )
    },
    {
      key: 'enabled',
      title: 'Status',
      render: (flag: FeatureFlag) => (
        <Switch
          checked={flag.enabled}
          onCheckedChange={(enabled) => toggleFlag(flag.id, enabled)}
        />
      )
    },
    {
      key: 'environment',
      title: 'Environment',
      render: (flag: FeatureFlag) => (
        <Badge variant={flag.environment === 'production' ? 'success' : 'secondary'}>
          {flag.environment}
        </Badge>
      )
    },
    {
      key: 'rollout',
      title: 'Rollout',
      render: (flag: FeatureFlag) => (
        <div className="text-sm">
          <div>{flag.rolloutStrategy}</div>
          <div className="text-gray-500">{flag.rolloutPercentage}%</div>
        </div>
      )
    },
    {
      key: 'category',
      title: 'Category',
      render: (flag: FeatureFlag) => flag.category ? (
        <Badge variant="outline">{flag.category}</Badge>
      ) : null
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (flag: FeatureFlag) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditingFlag(flag)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => cloneFlag(flag)}
          >
            Clone
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setDeleteConfirm({ show: true, flagId: flag.id, flagName: flag.name })}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  /**
   * Get unique environments for filter
   */
  const environments = [...new Set(flags.map(flag => flag.environment))];
  const categories = [...new Set(flags.map(flag => flag.category).filter(Boolean))];

  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Feature Flags</h1>
          <p className="text-gray-600">Manage feature flags and rollout configurations</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAnalytics(true)}
          >
            Analytics
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
          >
            Create Flag
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search flags..."
            className="flex-1 min-w-64"
          />
          
          <Select value={filterEnvironment} onValueChange={setFilterEnvironment}>
            <option value="all">All Environments</option>
            {environments.map(env => (
              <option key={env} value={env}>{env}</option>
            ))}
          </Select>
          
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </Select>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <option value="all">All Status</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </Select>
          
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              Table
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('cards')}
            >
              Cards
            </Button>
          </div>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedFlags.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm">{selectedFlags.length} flags selected</span>
            <Button
              size="sm"
              onClick={() => bulkToggleFlags(true)}
              disabled={bulkActionLoading}
            >
              Enable All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkToggleFlags(false)}
              disabled={bulkActionLoading}
            >
              Disable All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedFlags([])}
            >
              Clear Selection
            </Button>
          </div>
        </Card>
      )}

      {/* Feature Flags List */}
      {filteredFlags.length === 0 ? (
        <EmptyState
          title="No feature flags found"
          description="Create your first feature flag to get started"
          action={
            <Button onClick={() => setShowCreateDialog(true)}>
              Create Flag
            </Button>
          }
        />
      ) : (
        <Card>
          <DataTable
            data={filteredFlags}
            columns={tableColumns}
            selectable
            selectedRows={selectedFlags}
            onSelectionChange={setSelectedFlags}
          />
        </Card>
      )}

      {/* Dialogs */}
      <FeatureFlagCreateDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={(flag) => {
          setFlags(prev => [...prev, flag]);
          setShowCreateDialog(false);
          addNotification('Feature flag created successfully', 'success');
        }}
      />

      {editingFlag && (
        <FeatureFlagEditDialog
          flag={editingFlag}
          open={!!editingFlag}
          onClose={() => setEditingFlag(null)}
          onSuccess={(updatedFlag) => {
            setFlags(prev => prev.map(flag => 
              flag.id === updatedFlag.id ? updatedFlag : flag
            ));
            setEditingFlag(null);
            addNotification('Feature flag updated successfully', 'success');
          }}
        />
      )}

      <ConfirmDialog
        open={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false })}
        onConfirm={() => {
          if (deleteConfirm.flagId) {
            deleteFlag(deleteConfirm.flagId);
          }
          setDeleteConfirm({ show: false });
        }}
        title="Delete Feature Flag"
        description={`Are you sure you want to delete "${deleteConfirm.flagName}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="destructive"
      />

      {showAnalytics && (
        <FeatureFlagAnalytics
          open={showAnalytics}
          onClose={() => setShowAnalytics(false)}
        />
      )}
    </div>
  );
};