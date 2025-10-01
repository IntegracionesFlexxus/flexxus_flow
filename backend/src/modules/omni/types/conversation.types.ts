/**
 * Conversation Types - Sprint 05
 * Type definitions for omnichannel conversations
 */

export enum ConversationStatus {
  OPEN = 'open',
  PENDING = 'pending',
  RESOLVED = 'resolved',
  ARCHIVED = 'archived'
}

export enum ConversationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum SLAStatus {
  ON_TIME = 'on_time',
  WARNING = 'warning',
  BREACHED = 'breached'
}

export interface ConversationFilters {
  status?: ConversationStatus;
  priority?: ConversationPriority;
  channelType?: string;
  assignedTo?: string;
  customerId?: string;
  tags?: string[];
  slaStatus?: SLAStatus;
  dateFrom?: Date;
  dateTo?: Date;
  hasUnread?: boolean;
}

export interface ConversationMetrics {
  totalMessages: number;
  firstResponseTime?: number;
  resolutionTime?: number;
  customerSatisfaction?: number;
  agentInteractions: number;
}

export interface ConversationAssignment {
  assignedTo: string;
  assignedAt: Date;
  assignedBy?: string;
  reason?: string;
  autoAssigned?: boolean;
}

export interface ConversationSLA {
  firstResponseTarget: number; // seconds
  resolutionTarget: number; // seconds
  status: SLAStatus;
  breachAt?: Date;
  breachedAt?: Date;
}

export interface ConversationContext {
  previousConversations?: number;
  customerValue?: string;
  preferredLanguage?: string;
  timezone?: string;
  customData?: Record<string, any>;
}