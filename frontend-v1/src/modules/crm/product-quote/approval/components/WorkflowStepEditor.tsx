// WorkflowStepEditor - Edit workflow steps
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Users, Clock, AlertTriangle } from 'lucide-react';
import { ApprovalStep, ApprovalApprover, EscalationRule, User, Role } from '../../shared/types';

interface WorkflowStepEditorProps {
  step: ApprovalStep;
  availableUsers: User[];
  availableRoles: Role[];
  onSave: (step: ApprovalStep) => void;
  onCancel: () => void;
}

export const WorkflowStepEditor: React.FC<WorkflowStepEditorProps> = ({
  step,
  availableUsers,
  availableRoles,
  onSave,
  onCancel
}) => {
  const [stepData, setStepData] = useState<ApprovalStep>(step);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!stepData.name.trim()) {
      newErrors.name = 'Step name is required';
    }

    if (stepData.approvers.length === 0) {
      newErrors.approvers = 'At least one approver is required';
    }

    if (stepData.timeoutHours && stepData.timeoutHours <= 0) {
      newErrors.timeoutHours = 'Timeout must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(stepData);
    }
  };

  const addApprover = () => {
    const newApprover: ApprovalApprover = {
      id: Date.now(),
      stepId: stepData.id,
      type: 'user',
      isRequired: true,
      canDelegate: true
    };
    setStepData(prev => ({
      ...prev,
      approvers: [...prev.approvers, newApprover]
    }));
  };

  const updateApprover = (index: number, updates: Partial<ApprovalApprover>) => {
    setStepData(prev => ({
      ...prev,
      approvers: prev.approvers.map((approver, i) =>
        i === index ? { ...approver, ...updates } : approver
      )
    }));
  };

  const removeApprover = (index: number) => {
    setStepData(prev => ({
      ...prev,
      approvers: prev.approvers.filter((_, i) => i !== index)
    }));
  };

  const addEscalationRule = () => {
    const newRule: EscalationRule = {
      id: Date.now(),
      stepId: stepData.id,
      triggerAfterHours: 24,
      action: 'notify'
    };
    setStepData(prev => ({
      ...prev,
      escalationRules: [...(prev.escalationRules || []), newRule]
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Edit Step: {stepData.name}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Step Name *</label>
              <input
                type="text"
                value={stepData.name}
                onChange={(e) => setStepData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg ${errors.name ? 'border-red-300' : 'border-gray-300'}`}
              />
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Step Type</label>
              <select
                value={stepData.type}
                onChange={(e) => setStepData(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="single">Single Approval</option>
                <option value="multiple">Multiple Approvals</option>
                <option value="consensus">Consensus</option>
                <option value="any_one">Any One</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={stepData.description || ''}
                onChange={(e) => setStepData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (hours)</label>
              <input
                type="number"
                value={stepData.timeoutHours || ''}
                onChange={(e) => setStepData(prev => ({ ...prev, timeoutHours: Number(e.target.value) }))}
                className={`w-full px-3 py-2 border rounded-lg ${errors.timeoutHours ? 'border-red-300' : 'border-gray-300'}`}
              />
              {errors.timeoutHours && <p className="text-red-600 text-sm mt-1">{errors.timeoutHours}</p>}
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={stepData.isRequired}
                  onChange={(e) => setStepData(prev => ({ ...prev, isRequired: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Required Step</span>
              </label>
            </div>
          </div>

          {/* Approvers */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900">Approvers</h4>
              <button
                onClick={addApprover}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                <span>Add Approver</span>
              </button>
            </div>

            {errors.approvers && <p className="text-red-600 text-sm mb-3">{errors.approvers}</p>}

            <div className="space-y-3">
              {stepData.approvers.map((approver, index) => (
                <div key={approver.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={approver.type}
                        onChange={(e) => updateApprover(index, { type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      >
                        <option value="user">User</option>
                        <option value="role">Role</option>
                        <option value="manager">Manager</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    {approver.type === 'user' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                        <select
                          value={approver.userId || ''}
                          onChange={(e) => updateApprover(index, { userId: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        >
                          <option value="">Select User...</option>
                          {availableUsers.map(user => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {approver.type === 'role' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select
                          value={approver.roleId || ''}
                          onChange={(e) => updateApprover(index, { roleId: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        >
                          <option value="">Select Role...</option>
                          {availableRoles.map(role => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex items-end space-x-2">
                      <button
                        onClick={() => removeApprover(index)}
                        className="p-2 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center space-x-4">
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={approver.isRequired}
                        onChange={(e) => updateApprover(index, { isRequired: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="ml-2">Required</span>
                    </label>
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={approver.canDelegate}
                        onChange={(e) => updateApprover(index, { canDelegate: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="ml-2">Can Delegate</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Escalation Rules */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900">Escalation Rules</h4>
              <button
                onClick={addEscalationRule}
                className="flex items-center space-x-1 px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                <Plus className="h-4 w-4" />
                <span>Add Rule</span>
              </button>
            </div>

            <div className="space-y-3">
              {(stepData.escalationRules || []).map((rule, index) => (
                <div key={rule.id} className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Trigger After (hours)</label>
                      <input
                        type="number"
                        value={rule.triggerAfterHours}
                        onChange={(e) => {
                          const newRules = [...(stepData.escalationRules || [])];
                          newRules[index] = { ...rule, triggerAfterHours: Number(e.target.value) };
                          setStepData(prev => ({ ...prev, escalationRules: newRules }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                      <select
                        value={rule.action}
                        onChange={(e) => {
                          const newRules = [...(stepData.escalationRules || [])];
                          newRules[index] = { ...rule, action: e.target.value as any };
                          setStepData(prev => ({ ...prev, escalationRules: newRules }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      >
                        <option value="notify">Notify</option>
                        <option value="escalate">Escalate</option>
                        <option value="auto_approve">Auto Approve</option>
                        <option value="auto_reject">Auto Reject</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          const newRules = (stepData.escalationRules || []).filter((_, i) => i !== index);
                          setStepData(prev => ({ ...prev, escalationRules: newRules }));
                        }}
                        className="p-2 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>Save Step</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowStepEditor;