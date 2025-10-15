/**
 * Conversation Types
 * Definiciones de tipos para conversaciones de omnicanalidad
 */

import { ChannelType } from './channel.types';

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

export interface Conversation {
  id: string;
  company_id: string;
  customer_id?: string;
  channel_id?: string;
  channel_type: ChannelType | string;
  external_id?: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  assigned_to?: string;
  assigned_at?: string;
  first_response_at?: string;
  last_message_at?: string;
  resolved_at?: string;
  resolution_time_seconds?: number;
  tags: string[];
  metadata?: Record<string, any>;
  sla_status?: SLAStatus;
  sla_breach_at?: string;
  unread_count: number;
  created_at: string;
  updated_at: string;

  // Campos adicionales que pueden venir del backend con JOINs
  customer_first_name?: string;
  customer_last_name?: string;
  customer_email?: string;
  customer_phone?: string;
  channel_name?: string;
  channel_health_status?: string;
  agent_name?: string;
}

export interface ConversationCreate {
  customer_id?: string;
  channel_id: string;
  channel_type: ChannelType | string;
  external_id?: string;
  priority?: ConversationPriority;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ConversationUpdate {
  status?: ConversationStatus;
  priority?: ConversationPriority;
  assigned_to?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ConversationAssign {
  assigned_to: string;
  reason?: string;
  auto_assigned?: boolean;
}

export interface ConversationFilters {
  status?: ConversationStatus;
  priority?: ConversationPriority;
  channelType?: ChannelType | string;
  assignedTo?: string;
  customerId?: string;
  tags?: string[];
  slaStatus?: SLAStatus;
  dateFrom?: Date;
  dateTo?: Date;
  hasUnread?: boolean;
  search?: string;
}

export interface ConversationStats {
  total_conversations: number;
  open_conversations: number;
  pending_conversations: number;
  resolved_conversations: number;
  archived_conversations: number;
  avg_resolution_time: number;
  sla_breached_count: number;
}

export interface ConversationWithDetails extends Conversation {
  messages?: any[]; // Will be typed with Message[] when we create message types
  customer?: any;
  channel?: any;
}
