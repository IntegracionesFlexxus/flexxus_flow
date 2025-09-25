// WorkflowManagementPage - Create and manage approval workflows
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  Play,
  Pause,
  Settings,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  Users
} from 'lucide-react';
import { ApprovalWorkflow, WorkflowCanvas } from '../../shared/types';
import { useWorkflows } from '../hooks/useWorkflows';
import { WorkflowBuilder } from '../components/WorkflowBuilder';
import { WorkflowCanvas as WorkflowCanvasComponent } from '../components/WorkflowCanvas';
import { WorkflowSimulator } from '../components/WorkflowSimulator';

export const WorkflowManagementPage: React.FC = () => {
  const [selectedView, setSelectedView] = useState<'list' | 'builder' | 'canvas' | 'simulator'>('list');
  const [selectedWorkflow, setSelectedWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const {
    workflows,
    loading,
    error,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
    testWorkflow,
    refreshWorkflows
  } = useWorkflows();

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = !searchQuery ||
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && workflow.isActive) ||
      (statusFilter === 'inactive' && !workflow.isActive);

    return matchesSearch && matchesStatus;
  });

  const handleCreateWorkflow = () => {
    setSelectedWorkflow(null);
    setShowBuilder(true);
  };

  const handleEditWorkflow = (workflow: ApprovalWorkflow) => {
    setSelectedWorkflow(workflow);
    setShowBuilder(true);
  };

  const handleSaveWorkflow = async (workflowData: Omit<ApprovalWorkflow, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (selectedWorkflow) {
        await updateWorkflow(selectedWorkflow.id, workflowData);
      } else {
        await createWorkflow(workflowData);
      }
      setShowBuilder(false);
      setSelectedWorkflow(null);
      refreshWorkflows();
    } catch (error) {
      console.error('Failed to save workflow:', error);
    }
  };

  const handleDeleteWorkflow = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      try {
        await deleteWorkflow(id);
        refreshWorkflows();
      } catch (error) {
        console.error('Failed to delete workflow:', error);
      }
    }
  };

  const handleDuplicateWorkflow = async (workflow: ApprovalWorkflow) => {
    try {
      await duplicateWorkflow(workflow.id, `${workflow.name} (Copy)`);
      refreshWorkflows();
    } catch (error) {
      console.error('Failed to duplicate workflow:', error);
    }
  };

  const handleToggleWorkflowStatus = async (workflow: ApprovalWorkflow) => {
    try {
      await updateWorkflow(workflow.id, { isActive: !workflow.isActive });
      refreshWorkflows();
    } catch (error) {
      console.error('Failed to toggle workflow status:', error);
    }
  };

  const handleTestWorkflow = async (workflowId: number) => {
    try {
      const testData = {
        entityType: 'quote',
        amount: 10000,
        discountPercent: 15
      };
      const result = await testWorkflow(workflowId, testData);
      console.log('Test result:', result);
      // Show test results in a modal or sidebar
    } catch (error) {
      console.error('Failed to test workflow:', error);
    }
  };

  const getWorkflowStats = (workflow: ApprovalWorkflow) => {
    return {
      totalSteps: workflow.steps.length,
      approvers: workflow.steps.reduce((acc, step) => acc + step.approvers.length, 0),
      estimatedTime: workflow.steps.reduce((acc, step) => acc + (step.timeoutHours || 24), 0)
    };
  };

  if (showBuilder) {
    return (
      <WorkflowBuilder
        workflow={selectedWorkflow || undefined}
        onSave={handleSaveWorkflow}
        onCancel={() => {
          setShowBuilder(false);
          setSelectedWorkflow(null);
        }}
        availableUsers={[]} // TODO: Fetch from API
        availableRoles={[]} // TODO: Fetch from API
      />
    );
  }

  if (selectedView === 'canvas' && selectedWorkflow) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSelectedView('list')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to List
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{selectedWorkflow.name}</h1>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleEditWorkflow(selectedWorkflow)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Edit2 className="h-4 w-4" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => handleTestWorkflow(selectedWorkflow.id)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Play className="h-4 w-4" />
              <span>Test</span>
            </button>
          </div>
        </div>

        <WorkflowCanvasComponent
          canvas={{
            nodes: [], // TODO: Convert workflow to canvas format
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 }
          }}
          editable={false}
          onCanvasChange={() => {}}
          onNodeSelect={() => {}}
        />
      </div>
    );
  }

  if (selectedView === 'simulator' && selectedWorkflow) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSelectedView('list')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to List
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Simulate: {selectedWorkflow.name}</h1>
          </div>
        </div>

        <WorkflowSimulator
          workflow={selectedWorkflow}
          onClose={() => setSelectedView('list')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Management</h1>
          <p className="text-gray-600">Create and manage approval workflows</p>
        </div>

        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Upload className="h-4 w-4" />
            <span>Import</span>
          </button>

          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>

          <button
            onClick={handleCreateWorkflow}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>New Workflow</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Workflows List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="text-center py-12">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first approval workflow'
              }
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={handleCreateWorkflow}
                className="flex items-center space-x-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                <span>Create Workflow</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workflow
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Steps
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWorkflows.map((workflow) => {
                  const stats = getWorkflowStats(workflow);
                  return (
                    <tr key={workflow.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{workflow.name}</div>
                          {workflow.description && (
                            <div className="text-sm text-gray-500">{workflow.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {workflow.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-gray-400 mr-1" />
                            <span>{stats.totalSteps} steps</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 text-gray-400 mr-1" />
                            <span>{stats.approvers} approvers</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {workflow.isActive ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 mr-2" />
                          )}
                          <span className={`text-sm ${workflow.isActive ? 'text-green-700' : 'text-red-700'}`}>
                            {workflow.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(workflow.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedWorkflow(workflow);
                              setSelectedView('canvas');
                            }}
                            className="text-gray-400 hover:text-gray-600"
                            title="View Canvas"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedWorkflow(workflow);
                              setSelectedView('simulator');
                            }}
                            className="text-gray-400 hover:text-gray-600"
                            title="Simulate"
                          >
                            <Play className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleEditWorkflow(workflow)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleDuplicateWorkflow(workflow)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Duplicate"
                          >
                            <Copy className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleToggleWorkflowStatus(workflow)}
                            className={workflow.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                            title={workflow.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {workflow.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </button>

                          <button
                            onClick={() => handleDeleteWorkflow(workflow.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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

export default WorkflowManagementPage;