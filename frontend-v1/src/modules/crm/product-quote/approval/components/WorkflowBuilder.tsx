// WorkflowBuilder - Visual workflow builder with drag & drop
import React, { useState, useCallback } from 'react';
import {
  Plus,
  Save,
  X,
  Settings,
  Users,
  Clock,
  ArrowRight,
  Trash2,
  Edit2,
  Copy,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause
} from 'lucide-react';
import {
  ApprovalWorkflow,
  ApprovalStep,
  ApprovalApprover,
  WorkflowCondition,
  EscalationRule,
  User,
  Role
} from '../../shared/types';
import { WorkflowStepEditor } from './WorkflowStepEditor';

interface WorkflowBuilderProps {
  workflow?: ApprovalWorkflow;
  onSave: (workflow: Omit<ApprovalWorkflow, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  availableUsers: User[];
  availableRoles: Role[];
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  workflow,
  onSave,
  onCancel,
  availableUsers,
  availableRoles
}) => {
  const [workflowData, setWorkflowData] = useState<Omit<ApprovalWorkflow, 'id' | 'createdAt' | 'updatedAt'>>({
    companyId: workflow?.companyId || 1,
    name: workflow?.name || '',
    description: workflow?.description || '',
    type: workflow?.type || 'sequential',
    triggerEvent: workflow?.triggerEvent || 'quote_created',
    conditions: workflow?.conditions || [],
    steps: workflow?.steps || [],
    isActive: workflow?.isActive ?? true,
    isDefault: workflow?.isDefault ?? false,
    priority: workflow?.priority || 1,
    createdBy: workflow?.createdBy || 1
  });

  const [editingStep, setEditingStep] = useState<ApprovalStep | null>(null);
  const [showStepEditor, setShowStepEditor] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateWorkflow = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!workflowData.name.trim()) {
      newErrors.name = 'Workflow name is required';
    }

    if (workflowData.steps.length === 0) {
      newErrors.steps = 'At least one approval step is required';
    }

    workflowData.steps.forEach((step, index) => {
      if (!step.name.trim()) {
        newErrors[`step_${index}_name`] = 'Step name is required';
      }
      if (step.approvers.length === 0) {
        newErrors[`step_${index}_approvers`] = 'At least one approver is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [workflowData]);

  const handleSave = () => {
    if (validateWorkflow()) {
      onSave(workflowData);
    }
  };

  const addStep = () => {
    const newStep: ApprovalStep = {
      id: Date.now(), // Temporary ID
      workflowId: workflow?.id || 0,
      name: `Step ${workflowData.steps.length + 1}`,
      description: '',
      stepNumber: workflowData.steps.length + 1,
      type: 'single',
      approvers: [],
      isRequired: true,
      timeoutHours: 24
    };

    setWorkflowData(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));

    setEditingStep(newStep);
    setShowStepEditor(true);
  };

  const editStep = (step: ApprovalStep) => {
    setEditingStep(step);
    setShowStepEditor(true);
  };

  const deleteStep = (stepId: number) => {
    if (window.confirm('Are you sure you want to delete this step?')) {
      setWorkflowData(prev => ({
        ...prev,
        steps: prev.steps.filter(step => step.id !== stepId)
      }));
    }
  };

  const duplicateStep = (step: ApprovalStep) => {
    const newStep: ApprovalStep = {
      ...step,
      id: Date.now(),
      name: `${step.name} (Copy)`,
      stepNumber: workflowData.steps.length + 1
    };

    setWorkflowData(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
  };

  const moveStep = (stepId: number, direction: 'up' | 'down') => {
    const stepIndex = workflowData.steps.findIndex(step => step.id === stepId);
    if (stepIndex === -1) return;

    const newSteps = [...workflowData.steps];
    const targetIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;

    if (targetIndex < 0 || targetIndex >= newSteps.length) return;

    // Swap steps
    [newSteps[stepIndex], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[stepIndex]];

    // Update step numbers
    newSteps.forEach((step, index) => {
      step.stepNumber = index + 1;
    });

    setWorkflowData(prev => ({
      ...prev,
      steps: newSteps
    }));
  };

  const handleStepSave = (step: ApprovalStep) => {
    setWorkflowData(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === step.id ? step : s)
    }));
    setShowStepEditor(false);
    setEditingStep(null);
  };

  const addCondition = () => {
    const newCondition: WorkflowCondition = {
      id: Date.now(),
      field: 'amount',
      operator: 'greater_than',
      value: 0
    };

    setWorkflowData(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition]
    }));
  };

  const updateCondition = (conditionId: number, updates: Partial<WorkflowCondition>) => {
    setWorkflowData(prev => ({
      ...prev,
      conditions: prev.conditions.map(condition =>
        condition.id === conditionId ? { ...condition, ...updates } : condition
      )
    }));
  };

  const deleteCondition = (conditionId: number) => {
    setWorkflowData(prev => ({
      ...prev,
      conditions: prev.conditions.filter(condition => condition.id !== conditionId)
    }));
  };

  const getStepTypeIcon = (type: string) => {
    switch (type) {
      case 'single':
        return <Users className="h-4 w-4" />;
      case 'multiple':
        return <Users className="h-4 w-4" />;
      case 'consensus':
        return <CheckCircle className="h-4 w-4" />;
      case 'any_one':
        return <Users className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {workflow ? 'Edit Workflow' : 'Create New Workflow'}
          </h1>
          <p className="text-gray-600">
            Design your approval workflow with multiple steps and conditions
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onCancel}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
            <span>Cancel</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Save className="h-4 w-4" />
            <span>Save Workflow</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow Configuration */}
        <div className="lg:col-span-1 space-y-6">
          {/* Basic Information */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workflow Name *
                </label>
                <input
                  type="text"
                  value={workflowData.name}
                  onChange={(e) => setWorkflowData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter workflow name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={workflowData.description}
                  onChange={(e) => setWorkflowData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe this workflow..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workflow Type
                </label>
                <select
                  value={workflowData.type}
                  onChange={(e) => setWorkflowData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="sequential">Sequential</option>
                  <option value="parallel">Parallel</option>
                  <option value="conditional">Conditional</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trigger Event
                </label>
                <select
                  value={workflowData.triggerEvent}
                  onChange={(e) => setWorkflowData(prev => ({ ...prev, triggerEvent: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="quote_created">Quote Created</option>
                  <option value="quote_updated">Quote Updated</option>
                  <option value="amount_threshold">Amount Threshold</option>
                  <option value="discount_threshold">Discount Threshold</option>
                  <option value="manual">Manual Trigger</option>
                </select>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={workflowData.isActive}
                    onChange={(e) => setWorkflowData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={workflowData.isDefault}
                    onChange={(e) => setWorkflowData(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Default Workflow</span>
                </label>
              </div>
            </div>
          </div>

          {/* Trigger Conditions */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Trigger Conditions</h3>
              <button
                onClick={addCondition}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-3">
              {workflowData.conditions.map((condition, index) => (
                <div key={condition.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <select
                      value={condition.field}
                      onChange={(e) => updateCondition(condition.id, { field: e.target.value })}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="amount">Amount</option>
                      <option value="discount">Discount</option>
                      <option value="customer_type">Customer Type</option>
                      <option value="product_category">Product Category</option>
                    </select>

                    <select
                      value={condition.operator}
                      onChange={(e) => updateCondition(condition.id, { operator: e.target.value as any })}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="equals">Equals</option>
                      <option value="greater_than">Greater Than</option>
                      <option value="less_than">Less Than</option>
                      <option value="contains">Contains</option>
                    </select>

                    <input
                      type="text"
                      value={condition.value}
                      onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                      placeholder="Value"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    {index > 0 && (
                      <select
                        value={condition.logicalOperator || 'AND'}
                        onChange={(e) => updateCondition(condition.id, { logicalOperator: e.target.value as any })}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    )}

                    <button
                      onClick={() => deleteCondition(condition.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {workflowData.conditions.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No conditions defined. This workflow will trigger for all events.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Approval Steps</h3>
                <p className="text-sm text-gray-600">
                  Define the approval process with multiple steps
                </p>
              </div>

              <button
                onClick={addStep}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                <span>Add Step</span>
              </button>
            </div>

            {errors.steps && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errors.steps}</p>
              </div>
            )}

            <div className="space-y-4">
              {workflowData.steps.map((step, index) => (
                <div key={step.id} className="relative">
                  <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {index + 1}
                            </span>
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            {getStepTypeIcon(step.type)}
                            <h4 className="text-sm font-medium text-gray-900">
                              {step.name}
                            </h4>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {step.type}
                            </span>
                          </div>

                          {step.description && (
                            <p className="text-sm text-gray-600">{step.description}</p>
                          )}

                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <div className="flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              <span>{step.approvers.length} approver(s)</span>
                            </div>
                            {step.timeoutHours && (
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>{step.timeoutHours}h timeout</span>
                              </div>
                            )}
                            {step.isRequired && (
                              <span className="text-red-600">Required</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => moveStep(step.id, 'up')}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          <ArrowRight className="h-4 w-4 transform -rotate-90" />
                        </button>

                        <button
                          onClick={() => moveStep(step.id, 'down')}
                          disabled={index === workflowData.steps.length - 1}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          <ArrowRight className="h-4 w-4 transform rotate-90" />
                        </button>

                        <button
                          onClick={() => editStep(step)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => duplicateStep(step)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => deleteStep(step.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Step Errors */}
                    {(errors[`step_${index}_name`] || errors[`step_${index}_approvers`]) && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                        {errors[`step_${index}_name`] && (
                          <p className="text-xs text-red-600">{errors[`step_${index}_name`]}</p>
                        )}
                        {errors[`step_${index}_approvers`] && (
                          <p className="text-xs text-red-600">{errors[`step_${index}_approvers`]}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Flow Arrow */}
                  {index < workflowData.steps.length - 1 && (
                    <div className="flex justify-center py-2">
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}

              {workflowData.steps.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No steps defined</h3>
                  <p className="text-gray-600 mb-4">
                    Add your first approval step to get started
                  </p>
                  <button
                    onClick={addStep}
                    className="flex items-center space-x-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Step</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Step Editor Modal */}
      {showStepEditor && editingStep && (
        <WorkflowStepEditor
          step={editingStep}
          availableUsers={availableUsers}
          availableRoles={availableRoles}
          onSave={handleStepSave}
          onCancel={() => {
            setShowStepEditor(false);
            setEditingStep(null);
          }}
        />
      )}
    </div>
  );
};

export default WorkflowBuilder;