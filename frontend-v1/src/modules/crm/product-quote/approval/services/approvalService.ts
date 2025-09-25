// Approval Service - Sprint 19 Frontend Implementation

import {
  ApprovalWorkflow,
  ApprovalProcess,
  ApprovalItem,
  ApprovalDecision,
  ApprovalMetrics,
  ApprovalNotification,
  ProcessApprovalStep,
  ProcessComment,
  ApiResponse,
  CreateDto,
  UpdateDto
} from '../../shared/types';

// API Endpoints
const ENDPOINTS = {
  APPROVAL_WORKFLOWS: '/api/crm/approvals/workflows',
  APPROVAL_PROCESSES: '/api/crm/approvals/processes',
  PENDING_APPROVALS: '/api/crm/approvals/pending',
  APPROVAL_DECISION: (processId: number, stepId: number) => `/api/crm/approvals/processes/${processId}/steps/${stepId}/decision`,
  APPROVAL_DELEGATE: (processId: number, stepId: number) => `/api/crm/approvals/processes/${processId}/steps/${stepId}/delegate`,
  APPROVAL_METRICS: '/api/crm/approvals/metrics',
  APPROVAL_NOTIFICATIONS: '/api/crm/approvals/notifications',
  PROCESS_COMMENTS: (processId: number) => `/api/crm/approvals/processes/${processId}/comments`
};

class ApprovalService {
  private baseUrl: string;
  private wsConnection: WebSocket | null = null;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get all approval workflows
   */
  async getApprovalWorkflows(filters?: {
    companyId?: number;
    active?: boolean;
    type?: string
  }): Promise<ApprovalWorkflow[]> {
    const queryParams = new URLSearchParams();
    if (filters?.companyId) {
      queryParams.append('companyId', filters.companyId.toString());
    }
    if (filters?.active !== undefined) {
      queryParams.append('active', filters.active.toString());
    }
    if (filters?.type) {
      queryParams.append('type', filters.type);
    }

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.APPROVAL_WORKFLOWS}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch approval workflows: ${response.statusText}`);
    }

    const data: ApiResponse<ApprovalWorkflow[]> = await response.json();
    return data.data;
  }

  /**
   * Create new approval workflow
   */
  async createApprovalWorkflow(workflowData: CreateDto<ApprovalWorkflow>): Promise<ApprovalWorkflow> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.APPROVAL_WORKFLOWS}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(workflowData)
    });

    if (!response.ok) {
      throw new Error(`Failed to create approval workflow: ${response.statusText}`);
    }

    const data: ApiResponse<ApprovalWorkflow> = await response.json();
    return data.data;
  }

  /**
   * Update approval workflow
   */
  async updateApprovalWorkflow(id: number, updates: UpdateDto<ApprovalWorkflow>): Promise<ApprovalWorkflow> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.APPROVAL_WORKFLOWS}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Failed to update approval workflow: ${response.statusText}`);
    }

    const data: ApiResponse<ApprovalWorkflow> = await response.json();
    return data.data;
  }

  /**
   * Delete approval workflow
   */
  async deleteApprovalWorkflow(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.APPROVAL_WORKFLOWS}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete approval workflow: ${response.statusText}`);
    }
  }

  /**
   * Test approval workflow with sample data
   */
  async testApprovalWorkflow(workflowId: number, testData: any): Promise<{
    steps: any[];
    estimatedDuration: number;
    potentialIssues: string[]
  }> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.APPROVAL_WORKFLOWS}/${workflowId}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      throw new Error(`Failed to test approval workflow: ${response.statusText}`);
    }

    const data: ApiResponse<any> = await response.json();
    return data.data;
  }

  /**
   * Get pending approvals for current user
   */
  async getPendingApprovals(filters?: {
    assignedToMe?: boolean;
    workflow?: number[];
    priority?: string[];
    overdue?: boolean;
    entityType?: string[];
  }): Promise<ApprovalItem[]> {
    const queryParams = new URLSearchParams();
    if (filters?.assignedToMe !== undefined) {
      queryParams.append('assignedToMe', filters.assignedToMe.toString());
    }
    if (filters?.workflow?.length) {
      queryParams.append('workflow', filters.workflow.join(','));
    }
    if (filters?.priority?.length) {
      queryParams.append('priority', filters.priority.join(','));
    }
    if (filters?.overdue !== undefined) {
      queryParams.append('overdue', filters.overdue.toString());
    }
    if (filters?.entityType?.length) {
      queryParams.append('entityType', filters.entityType.join(','));
    }

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PENDING_APPROVALS}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch pending approvals: ${response.statusText}`);
    }

    const data: ApiResponse<ApprovalItem[]> = await response.json();
    return data.data;
  }

  /**
   * Get approval processes
   */
  async getApprovalProcesses(filters?: {
    status?: string[];
    workflow?: number[];
    entityType?: string[];
    requestedBy?: number[];
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ApprovalProcess[]> {
    const queryParams = new URLSearchParams();
    if (filters?.status?.length) {
      queryParams.append('status', filters.status.join(','));
    }
    if (filters?.workflow?.length) {
      queryParams.append('workflow', filters.workflow.join(','));
    }
    if (filters?.entityType?.length) {
      queryParams.append('entityType', filters.entityType.join(','));
    }
    if (filters?.requestedBy?.length) {
      queryParams.append('requestedBy', filters.requestedBy.join(','));
    }
    if (filters?.dateFrom) {
      queryParams.append('dateFrom', filters.dateFrom);
    }
    if (filters?.dateTo) {
      queryParams.append('dateTo', filters.dateTo);
    }

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.APPROVAL_PROCESSES}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch approval processes: ${response.statusText}`);
    }

    const data: ApiResponse<ApprovalProcess[]> = await response.json();
    return data.data;
  }

  /**
   * Get single approval process
   */
  async getApprovalProcess(processId: number): Promise<ApprovalProcess> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.APPROVAL_PROCESSES}/${processId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch approval process: ${response.statusText}`);
    }

    const data: ApiResponse<ApprovalProcess> = await response.json();
    return data.data;
  }

  /**
   * Submit approval decision
   */
  async submitApprovalDecision(
    processId: number,
    stepId: number,
    decision: ApprovalDecision
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.APPROVAL_DECISION(processId, stepId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(decision)
    });

    if (!response.ok) {
      throw new Error(`Failed to submit approval decision: ${response.statusText}`);
    }
  }

  /**
   * Delegate approval to another user
   */
  async delegateApproval(
    processId: number,
    stepId: number,
    userId: number,
    comments?: string
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.APPROVAL_DELEGATE(processId, stepId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ userId, comments })
    });

    if (!response.ok) {
      throw new Error(`Failed to delegate approval: ${response.statusText}`);
    }
  }

  /**
   * Add comment to approval process
   */
  async addProcessComment(
    processId: number,
    content: string,
    isInternal: boolean = false
  ): Promise<ProcessComment> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PROCESS_COMMENTS(processId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ content, isInternal })
    });

    if (!response.ok) {
      throw new Error(`Failed to add process comment: ${response.statusText}`);
    }

    const data: ApiResponse<ProcessComment> = await response.json();
    return data.data;
  }

  /**
   * Get process comments
   */
  async getProcessComments(processId: number): Promise<ProcessComment[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PROCESS_COMMENTS(processId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch process comments: ${response.statusText}`);
    }

    const data: ApiResponse<ProcessComment[]> = await response.json();
    return data.data;
  }

  /**
   * Get approval metrics
   */
  async getApprovalMetrics(period: { start: string; end: string }): Promise<ApprovalMetrics> {
    const queryParams = new URLSearchParams({
      startDate: period.start,
      endDate: period.end
    });

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.APPROVAL_METRICS}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch approval metrics: ${response.statusText}`);
    }

    const data: ApiResponse<ApprovalMetrics> = await response.json();
    return data.data;
  }

  /**
   * Get approval notifications for current user
   */
  async getApprovalNotifications(filters?: {
    unreadOnly?: boolean;
    type?: string[];
    limit?: number;
  }): Promise<ApprovalNotification[]> {
    const queryParams = new URLSearchParams();
    if (filters?.unreadOnly !== undefined) {
      queryParams.append('unreadOnly', filters.unreadOnly.toString());
    }
    if (filters?.type?.length) {
      queryParams.append('type', filters.type.join(','));
    }
    if (filters?.limit) {
      queryParams.append('limit', filters.limit.toString());
    }

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.APPROVAL_NOTIFICATIONS}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch approval notifications: ${response.statusText}`);
    }

    const data: ApiResponse<ApprovalNotification[]> = await response.json();
    return data.data;
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.APPROVAL_NOTIFICATIONS}/${notificationId}/read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to mark notification as read: ${response.statusText}`);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.APPROVAL_NOTIFICATIONS}/read-all`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to mark all notifications as read: ${response.statusText}`);
    }
  }

  /**
   * Cancel approval process
   */
  async cancelApprovalProcess(processId: number, reason?: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.APPROVAL_PROCESSES}/${processId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel approval process: ${response.statusText}`);
    }
  }

  /**
   * Restart approval process
   */
  async restartApprovalProcess(processId: number, fromStepId?: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.APPROVAL_PROCESSES}/${processId}/restart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ fromStepId })
    });

    if (!response.ok) {
      throw new Error(`Failed to restart approval process: ${response.statusText}`);
    }
  }

  /**
   * Get approval process history
   */
  async getApprovalHistory(processId: number): Promise<ProcessApprovalStep[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.APPROVAL_PROCESSES}/${processId}/history`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch approval history: ${response.statusText}`);
    }

    const data: ApiResponse<ProcessApprovalStep[]> = await response.json();
    return data.data;
  }

  /**
   * Subscribe to real-time approval updates via WebSocket
   */
  subscribeToApprovalUpdates(callback: (update: {
    type: 'approval_request' | 'approval_decision' | 'approval_completed' | 'approval_escalated';
    data: any;
  }) => void): () => void {
    const wsUrl = `${this.baseUrl.replace('http', 'ws')}/ws/approvals`;
    this.wsConnection = new WebSocket(wsUrl);

    this.wsConnection.onmessage = (event) => {
      const update = JSON.parse(event.data);
      callback(update);
    };

    this.wsConnection.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Return cleanup function
    return () => {
      if (this.wsConnection) {
        this.wsConnection.close();
        this.wsConnection = null;
      }
    };
  }

  /**
   * Upload attachment to approval process
   */
  async uploadProcessAttachment(
    processId: number,
    file: File,
    description?: string
  ): Promise<{ id: number; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.APPROVAL_PROCESSES}/${processId}/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to upload attachment: ${response.statusText}`);
    }

    const data: ApiResponse<{ id: number; url: string }> = await response.json();
    return data.data;
  }

  /**
   * Get authentication token from storage or context
   */
  private getAuthToken(): string {
    // This should be implemented based on your auth system
    return localStorage.getItem('authToken') || '';
  }

  /**
   * Handle API errors consistently
   */
  private handleError(error: any): never {
    console.error('ApprovalService Error:', error);
    throw error;
  }
}

// Export singleton instance
export const approvalService = new ApprovalService();
export default approvalService;