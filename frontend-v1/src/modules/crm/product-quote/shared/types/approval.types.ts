// Approval Types - Sprint 19 Frontend Implementation

export interface ApprovalWorkflow {
  id: number;
  companyId: number;
  name: string;
  description?: string;
  type: 'sequential' | 'parallel' | 'conditional';
  triggerEvent: 'quote_created' | 'quote_updated' | 'amount_threshold' | 'discount_threshold' | 'manual';
  conditions: WorkflowCondition[];
  steps: ApprovalStep[];
  isActive: boolean;
  isDefault: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
}

export interface WorkflowCondition {
  id: number;
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'in' | 'not_in' | 'contains';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface ApprovalStep {
  id: number;
  workflowId: number;
  name: string;
  description?: string;
  stepNumber: number;
  type: 'single' | 'multiple' | 'consensus' | 'any_one';
  approvers: ApprovalApprover[];
  isRequired: boolean;
  timeoutHours?: number;
  escalationRules?: EscalationRule[];
  conditions?: StepCondition[];
  actions?: StepAction[];
}

export interface ApprovalApprover {
  id: number;
  stepId: number;
  type: 'user' | 'role' | 'manager' | 'custom';
  userId?: number;
  roleId?: number;
  customLogic?: string;
  isRequired: boolean;
  canDelegate: boolean;
  weight?: number; // For weighted approvals
}

export interface EscalationRule {
  id: number;
  stepId: number;
  triggerAfterHours: number;
  action: 'notify' | 'escalate' | 'auto_approve' | 'auto_reject';
  targetUserId?: number;
  targetRoleId?: number;
  notificationTemplate?: string;
}

export interface StepCondition {
  id: number;
  field: string;
  operator: string;
  value: any;
  skipStep: boolean;
}

export interface StepAction {
  id: number;
  type: 'email' | 'slack' | 'webhook' | 'update_field' | 'create_task';
  configuration: Record<string, any>;
  executeOn: 'step_start' | 'step_complete' | 'step_timeout' | 'step_skip';
}

export interface ApprovalProcess {
  id: number;
  workflowId: number;
  workflow: ApprovalWorkflow;
  entityType: 'quote' | 'order' | 'contract' | 'discount';
  entityId: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'timeout';
  currentStepId?: number;
  currentStep?: ApprovalStep;
  approvalSteps: ProcessApprovalStep[];
  requestedBy: number;
  requestedAt: string;
  completedAt?: string;
  totalTimeHours?: number;
  metadata?: Record<string, any>;
  comments?: ProcessComment[];
}

export interface ProcessApprovalStep {
  id: number;
  processId: number;
  stepId: number;
  step: ApprovalStep;
  status: 'pending' | 'approved' | 'rejected' | 'skipped' | 'timeout';
  approvers: ProcessApprover[];
  startedAt?: string;
  completedAt?: string;
  timeoutAt?: string;
  skipReason?: string;
}

export interface ProcessApprover {
  id: number;
  processStepId: number;
  approver: ApprovalApprover;
  userId: number;
  status: 'pending' | 'approved' | 'rejected' | 'delegated' | 'timeout';
  decision?: ApprovalDecision;
  decisionAt?: string;
  delegatedTo?: number;
  comments?: string;
  attachments?: ApprovalAttachment[];
}

export interface ApprovalDecision {
  action: 'approve' | 'reject' | 'request_changes' | 'delegate';
  comments?: string;
  conditions?: DecisionCondition[];
  attachments?: ApprovalAttachment[];
  delegatedTo?: number;
  notifyRequestor?: boolean;
}

export interface DecisionCondition {
  description: string;
  required: boolean;
  dueDate?: string;
  assignedTo?: number;
}

export interface ApprovalAttachment {
  id: number;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: number;
}

export interface ProcessComment {
  id: number;
  processId: number;
  userId: number;
  content: string;
  isInternal: boolean;
  createdAt: string;
  attachments?: ApprovalAttachment[];
}

export interface ApprovalItem {
  process: ApprovalProcess;
  entity: ApprovalEntity;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isOverdue: boolean;
  timeRemaining?: number;
  canApprove: boolean;
  canDelegate: boolean;
  requiresAction: boolean;
}

export interface ApprovalEntity {
  id: number;
  type: string;
  title: string;
  description?: string;
  amount?: number;
  currency?: string;
  requestor: {
    id: number;
    name: string;
    email: string;
  };
  metadata?: Record<string, any>;
}

export interface ApprovalMetrics {
  period: {
    start: string;
    end: string;
  };
  totalRequests: number;
  approved: number;
  rejected: number;
  pending: number;
  averageTimeHours: number;
  overdue: number;
  byWorkflow: WorkflowMetrics[];
  byApprover: ApproverMetrics[];
  timeDistribution: TimeDistribution[];
}

export interface WorkflowMetrics {
  workflowId: number;
  workflowName: string;
  totalRequests: number;
  approved: number;
  rejected: number;
  averageTimeHours: number;
  completionRate: number;
}

export interface ApproverMetrics {
  userId: number;
  userName: string;
  totalRequests: number;
  approved: number;
  rejected: number;
  averageResponseTimeHours: number;
  overdue: number;
}

export interface TimeDistribution {
  range: string;
  count: number;
  percentage: number;
}

export interface ApprovalNotification {
  id: number;
  type: 'approval_request' | 'approval_reminder' | 'approval_completed' | 'approval_escalated';
  processId: number;
  recipientId: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowCanvas {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface WorkflowNode {
  id: string;
  type: 'start' | 'approval_step' | 'condition' | 'action' | 'end';
  position: {
    x: number;
    y: number;
  };
  data: {
    label: string;
    stepId?: number;
    config?: any;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
  data?: {
    condition?: string;
    config?: any;
  };
}

// Component Props Types
export interface ApprovalQueueProps {
  items: ApprovalItem[];
  loading?: boolean;
  onApprove: (processId: number, decision: ApprovalDecision) => void;
  onDelegate: (processId: number, userId: number) => void;
  onViewDetails: (item: ApprovalItem) => void;
  filters?: ApprovalFilters;
  onFiltersChange?: (filters: ApprovalFilters) => void;
}

export interface ApprovalFilters {
  status: string[];
  workflow: number[];
  priority: string[];
  overdue: boolean;
  assignedToMe: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface WorkflowBuilderProps {
  workflow?: ApprovalWorkflow;
  onSave: (workflow: Omit<ApprovalWorkflow, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  availableUsers: User[];
  availableRoles: Role[];
}

export interface WorkflowCanvasProps {
  canvas: WorkflowCanvas;
  editable?: boolean;
  onCanvasChange: (canvas: WorkflowCanvas) => void;
  onNodeSelect: (nodeId: string) => void;
  selectedNodeId?: string;
}

export interface ApprovalHistoryProps {
  processId: number;
  steps: ProcessApprovalStep[];
  comments: ProcessComment[];
  showTimeline?: boolean;
}

export interface ApprovalDecisionModalProps {
  isOpen: boolean;
  process: ApprovalProcess;
  onDecision: (decision: ApprovalDecision) => void;
  onClose: () => void;
  canDelegate?: boolean;
  availableUsers?: User[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
}

export interface Role {
  id: number;
  name: string;
  permissions: string[];
}

// Store Types
export interface ApprovalStore {
  // State
  pendingApprovals: ApprovalItem[];
  workflows: ApprovalWorkflow[];
  processes: ApprovalProcess[];
  notifications: ApprovalNotification[];
  metrics: ApprovalMetrics | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadPendingApprovals: (filters?: ApprovalFilters) => Promise<void>;
  loadWorkflows: () => Promise<void>;
  loadProcesses: (filters?: ProcessFilters) => Promise<void>;

  // Workflow Management
  createWorkflow: (workflow: Omit<ApprovalWorkflow, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateWorkflow: (id: number, updates: Partial<ApprovalWorkflow>) => Promise<void>;
  deleteWorkflow: (id: number) => Promise<void>;

  // Process Actions
  submitDecision: (processId: number, stepId: number, decision: ApprovalDecision) => Promise<void>;
  delegateApproval: (processId: number, stepId: number, userId: number, comments?: string) => Promise<void>;
  addComment: (processId: number, content: string, isInternal?: boolean) => Promise<void>;

  // Metrics
  loadMetrics: (period: { start: string; end: string }) => Promise<void>;

  // Notifications
  loadNotifications: () => Promise<void>;
  markNotificationRead: (notificationId: number) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

export interface ProcessFilters {
  status: string[];
  workflow: number[];
  entityType: string[];
  requestedBy: number[];
  dateRange?: {
    start: string;
    end: string;
  };
}