// ApprovalDecisionModal - Modal for approve/reject decisions
import React, { useState } from 'react';
import {
  X,
  CheckCircle,
  XCircle,
  UserPlus,
  MessageSquare,
  Paperclip,
  AlertTriangle,
  Clock,
  Send
} from 'lucide-react';
import {
  ApprovalProcess,
  ApprovalDecision,
  User
} from '../../shared/types';

interface ApprovalDecisionModalProps {
  isOpen: boolean;
  process: ApprovalProcess;
  onDecision: (decision: ApprovalDecision) => void;
  onClose: () => void;
  canDelegate?: boolean;
  availableUsers?: User[];
}

export const ApprovalDecisionModal: React.FC<ApprovalDecisionModalProps> = ({
  isOpen,
  process,
  onDecision,
  onClose,
  canDelegate = false,
  availableUsers = []
}) => {
  const [action, setAction] = useState<'approve' | 'reject' | 'request_changes' | 'delegate' | null>(null);
  const [comments, setComments] = useState('');
  const [delegatedTo, setDelegatedTo] = useState<number | null>(null);
  const [notifyRequestor, setNotifyRequestor] = useState(true);
  const [conditions, setConditions] = useState<Array<{ description: string; required: boolean; dueDate?: string }>>([]);
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleSubmit = () => {
    if (!action) return;

    const decision: ApprovalDecision = {
      action,
      comments: comments.trim() || undefined,
      notifyRequestor,
      conditions: conditions.length > 0 ? conditions : undefined,
      delegatedTo: action === 'delegate' ? delegatedTo || undefined : undefined
    };

    onDecision(decision);
    handleClose();
  };

  const handleClose = () => {
    setAction(null);
    setComments('');
    setDelegatedTo(null);
    setNotifyRequestor(true);
    setConditions([]);
    setAttachments([]);
    onClose();
  };

  const addCondition = () => {
    setConditions([...conditions, { description: '', required: true }]);
  };

  const updateCondition = (index: number, field: string, value: any) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setConditions(newConditions);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  const getActionConfig = (actionType: string) => {
    switch (actionType) {
      case 'approve':
        return {
          icon: CheckCircle,
          color: 'bg-green-600 hover:bg-green-700',
          label: 'Approve',
          description: 'Approve this request and move to the next step'
        };
      case 'reject':
        return {
          icon: XCircle,
          color: 'bg-red-600 hover:bg-red-700',
          label: 'Reject',
          description: 'Reject this request and stop the approval process'
        };
      case 'request_changes':
        return {
          icon: AlertTriangle,
          color: 'bg-yellow-600 hover:bg-yellow-700',
          label: 'Request Changes',
          description: 'Request changes and send back to requestor'
        };
      case 'delegate':
        return {
          icon: UserPlus,
          color: 'bg-blue-600 hover:bg-blue-700',
          label: 'Delegate',
          description: 'Delegate this approval to another user'
        };
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Approval Decision</h3>
            <p className="text-sm text-gray-600">
              {process.entityType} #{process.entityId} - {process.workflow.name}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Action Selection */}
        {!action && (
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Choose an action:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['approve', 'reject', 'request_changes'].map((actionType) => {
                const config = getActionConfig(actionType);
                if (!config) return null;

                return (
                  <button
                    key={actionType}
                    onClick={() => setAction(actionType as any)}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${config.color.replace('hover:', '').replace('bg-', 'bg-').replace('-600', '-100').replace('-700', '-100')} text-white`}>
                        <config.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{config.label}</div>
                        <div className="text-sm text-gray-600">{config.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {canDelegate && (
                <button
                  onClick={() => setAction('delegate')}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-white">
                      <UserPlus className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Delegate</div>
                      <div className="text-sm text-gray-600">Delegate this approval to another user</div>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Decision Form */}
        {action && (
          <div className="space-y-6">
            {/* Selected Action */}
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              {(() => {
                const config = getActionConfig(action);
                return config ? (
                  <>
                    <div className={`p-2 rounded-lg ${config.color.replace('hover:', '').replace('bg-', 'bg-').replace('-600', '-100').replace('-700', '-100')} text-white`}>
                      <config.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{config.label}</div>
                      <div className="text-sm text-gray-600">{config.description}</div>
                    </div>
                  </>
                ) : null;
              })()}
              <button
                onClick={() => setAction(null)}
                className="ml-auto text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Delegation User Selection */}
            {action === 'delegate' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delegate to:
                </label>
                <select
                  value={delegatedTo || ''}
                  onChange={(e) => setDelegatedTo(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a user...</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Comments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments {action === 'reject' || action === 'request_changes' ? '*' : '(Optional)'}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={
                  action === 'approve' ? 'Add approval comments...' :
                  action === 'reject' ? 'Please explain why you are rejecting this request...' :
                  action === 'request_changes' ? 'Please specify what changes are needed...' :
                  'Add delegation comments...'
                }
                required={action === 'reject' || action === 'request_changes'}
              />
            </div>

            {/* Conditions (for request_changes) */}
            {action === 'request_changes' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Required Changes
                  </label>
                  <button
                    onClick={addCondition}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Add Condition
                  </button>
                </div>
                <div className="space-y-3">
                  {conditions.map((condition, index) => (
                    <div key={index} className="p-3 border border-gray-200 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <input
                            type="text"
                            value={condition.description}
                            onChange={(e) => updateCondition(index, 'description', e.target.value)}
                            placeholder="Describe the required change..."
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <label className="flex items-center text-sm">
                            <input
                              type="checkbox"
                              checked={condition.required}
                              onChange={(e) => updateCondition(index, 'required', e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            <span className="ml-2">Required</span>
                          </label>
                          <button
                            onClick={() => removeCondition(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* File Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-800"
                >
                  <Paperclip className="h-5 w-5" />
                  <span>Click to upload files</span>
                </label>
                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-900">{file.name}</span>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={notifyRequestor}
                  onChange={(e) => setNotifyRequestor(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Notify requestor of decision
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  (action === 'delegate' && !delegatedTo) ||
                  ((action === 'reject' || action === 'request_changes') && !comments.trim())
                }
                className={`px-4 py-2 rounded-lg text-white flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  getActionConfig(action)?.color || 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Send className="h-4 w-4" />
                <span>Submit Decision</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalDecisionModal;