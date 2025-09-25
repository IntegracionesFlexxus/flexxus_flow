// ApprovalHistory - Timeline of approval decisions
import React, { useState } from 'react';
import {
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Paperclip,
  Eye,
  ChevronDown,
  ChevronUp,
  Calendar,
  ArrowRight,
  Download
} from 'lucide-react';
import {
  ProcessApprovalStep,
  ProcessComment,
  ApprovalAttachment
} from '../../shared/types';

interface ApprovalHistoryProps {
  processId: number;
  steps: ProcessApprovalStep[];
  comments: ProcessComment[];
  showTimeline?: boolean;
  showComments?: boolean;
  showAttachments?: boolean;
  compact?: boolean;
}

interface TimelineItem {
  id: string;
  type: 'step' | 'comment' | 'attachment';
  timestamp: string;
  title: string;
  description?: string;
  status?: string;
  user?: {
    id: number;
    name: string;
  };
  data?: any;
}

export const ApprovalHistory: React.FC<ApprovalHistoryProps> = ({
  processId,
  steps,
  comments,
  showTimeline = true,
  showComments = true,
  showAttachments = true,
  compact = false
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());

  const toggleStepExpansion = (stepId: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const toggleCommentExpansion = (commentId: number) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  // Create timeline from steps and comments
  const timelineItems: TimelineItem[] = React.useMemo(() => {
    const items: TimelineItem[] = [];

    // Add step events
    steps.forEach(step => {
      if (step.startedAt) {
        items.push({
          id: `step-start-${step.id}`,
          type: 'step',
          timestamp: step.startedAt,
          title: `${step.step.name} Started`,
          description: step.step.description,
          status: 'started',
          data: step
        });
      }

      // Add approver decisions
      step.approvers.forEach(approver => {
        if (approver.decisionAt) {
          items.push({
            id: `approver-${approver.id}`,
            type: 'step',
            timestamp: approver.decisionAt,
            title: `Approval ${approver.status}`,
            description: approver.comments || undefined,
            status: approver.status,
            user: {
              id: approver.userId,
              name: `User ${approver.userId}` // Would be resolved from user service
            },
            data: { step, approver }
          });
        }
      });

      if (step.completedAt) {
        items.push({
          id: `step-complete-${step.id}`,
          type: 'step',
          timestamp: step.completedAt,
          title: `${step.step.name} ${step.status}`,
          description: step.skipReason || undefined,
          status: step.status,
          data: step
        });
      }
    });

    // Add comments
    if (showComments) {
      comments.forEach(comment => {
        items.push({
          id: `comment-${comment.id}`,
          type: 'comment',
          timestamp: comment.createdAt,
          title: 'Comment Added',
          description: comment.content,
          user: {
            id: comment.userId,
            name: `User ${comment.userId}` // Would be resolved from user service
          },
          data: comment
        });
      });
    }

    // Sort by timestamp
    return items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [steps, comments, showComments]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'timeout':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'started':
        return <ArrowRight className="h-5 w-5 text-blue-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'timeout':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'started':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    if (diffDays > 7) {
      return date.toLocaleDateString();
    } else if (diffDays > 1) {
      return `${Math.floor(diffDays)} days ago`;
    } else if (diffHours > 1) {
      return `${Math.floor(diffHours)} hours ago`;
    } else {
      return 'Recently';
    }
  };

  const calculateStepDuration = (step: ProcessApprovalStep) => {
    if (!step.startedAt) return null;
    const endTime = step.completedAt || new Date().toISOString();
    const duration = new Date(endTime).getTime() - new Date(step.startedAt).getTime();
    const hours = duration / (1000 * 60 * 60);

    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  if (showTimeline) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Approval History</h3>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">
              {timelineItems.length} events
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div className="flow-root">
          <ul className="-mb-8">
            {timelineItems.map((item, index) => (
              <li key={item.id}>
                <div className="relative pb-8">
                  {index !== timelineItems.length - 1 && (
                    <span
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className="h-8 w-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
                        {item.type === 'comment' ? (
                          <MessageSquare className="h-4 w-4 text-gray-500" />
                        ) : (
                          getStatusIcon(item.status || 'pending')
                        )}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-1.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.title}
                          </p>
                          {item.user && (
                            <p className="mt-0.5 text-xs text-gray-500">
                              by {item.user.name}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <time className="text-xs text-gray-500">
                            {formatTimestamp(item.timestamp)}
                          </time>
                          {item.status && (
                            <div className={`mt-1 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                              {item.status}
                            </div>
                          )}
                        </div>
                      </div>
                      {item.description && (
                        <div className="mt-2 text-sm text-gray-700">
                          {item.description.length > 100 && !compact ? (
                            <div>
                              <p className={expandedComments.has(parseInt(item.id.split('-')[1]))
                                ? ''
                                : 'line-clamp-2'
                              }>
                                {item.description}
                              </p>
                              <button
                                onClick={() => toggleCommentExpansion(parseInt(item.id.split('-')[1]))}
                                className="mt-1 text-blue-600 hover:text-blue-800 text-xs"
                              >
                                {expandedComments.has(parseInt(item.id.split('-')[1])) ? 'Show less' : 'Show more'}
                              </button>
                            </div>
                          ) : (
                            <p>{item.description}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {timelineItems.length === 0 && (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No History Yet</h3>
            <p className="text-gray-600">
              Approval history will appear here as the process progresses.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Non-timeline view (step-by-step)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Approval Steps</h3>
        <span className="text-sm text-gray-500">
          {steps.filter(s => s.status !== 'pending').length} of {steps.length} completed
        </span>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {index + 1}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {step.step.name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {step.step.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(step.status)}`}>
                    {getStatusIcon(step.status)}
                    <span className="ml-2 capitalize">{step.status}</span>
                  </div>
                  <button
                    onClick={() => toggleStepExpansion(step.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {expandedSteps.has(step.id) ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Step Timeline */}
              <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                {step.startedAt && (
                  <div className="flex items-center">
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Started {formatTimestamp(step.startedAt)}
                  </div>
                )}
                {step.completedAt && (
                  <div className="flex items-center">
                    {getStatusIcon(step.status)}
                    <span className="ml-1">Completed {formatTimestamp(step.completedAt)}</span>
                  </div>
                )}
                {step.startedAt && (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Duration: {calculateStepDuration(step)}
                  </div>
                )}
              </div>

              {/* Expanded Details */}
              {expandedSteps.has(step.id) && (
                <div className="mt-6 border-t border-gray-200 pt-4">
                  {/* Approvers */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-900">Approvers</h5>
                    {step.approvers.map((approver) => (
                      <div
                        key={approver.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              User {approver.userId}
                            </div>
                            <div className="text-xs text-gray-500">
                              {approver.approver.type} • {approver.approver.isRequired ? 'Required' : 'Optional'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {approver.decisionAt && (
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(approver.decisionAt)}
                            </span>
                          )}
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(approver.status)}`}>
                            {approver.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Comments for this step */}
                  {step.approvers.some(a => a.comments) && (
                    <div className="mt-4 space-y-2">
                      <h5 className="text-sm font-medium text-gray-900">Comments</h5>
                      {step.approvers
                        .filter(a => a.comments)
                        .map((approver) => (
                          <div key={`comment-${approver.id}`} className="p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm text-blue-900">{approver.comments}</p>
                                <p className="text-xs text-blue-600 mt-1">
                                  User {approver.userId} • {formatTimestamp(approver.decisionAt!)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Attachments */}
                  {showAttachments && step.approvers.some(a => a.attachments?.length) && (
                    <div className="mt-4 space-y-2">
                      <h5 className="text-sm font-medium text-gray-900">Attachments</h5>
                      {step.approvers
                        .filter(a => a.attachments?.length)
                        .map((approver) =>
                          approver.attachments!.map((attachment) => (
                            <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center space-x-2">
                                <Paperclip className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-900">{attachment.name}</span>
                                <span className="text-xs text-gray-500">
                                  ({(attachment.size / 1024).toFixed(1)} KB)
                                </span>
                              </div>
                              <button className="text-blue-600 hover:text-blue-800">
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          ))
                        )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Process Comments */}
      {showComments && comments.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Process Comments</h4>
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <MessageSquare className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{comment.content}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">
                        User {comment.userId} • {formatTimestamp(comment.createdAt)}
                      </p>
                      {comment.isInternal && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Internal
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {steps.length === 0 && (
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Steps Defined</h3>
          <p className="text-gray-600">
            This approval process has no steps configured.
          </p>
        </div>
      )}
    </div>
  );
};

export default ApprovalHistory;