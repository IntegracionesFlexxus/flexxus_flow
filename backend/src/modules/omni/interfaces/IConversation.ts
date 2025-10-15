/**
 * Conversation Interface - Sprint 05
 * Interface definitions for conversations
 */

import { BaseEntity } from '../repositories/base/BaseOmniRepository';
import { ConversationStatus, ConversationPriority, SLAStatus } from '../types/conversation.types';
import { ChannelType } from '../types/channel.types';

export interface IConversation extends BaseEntity {
  contact_id?: string;
  customer_id?: string;
  channel_id?: string;
  channel_type: ChannelType | string;
  external_id?: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  assigned_to?: string;
  assigned_at?: Date;
  first_response_at?: Date;
  last_message_at?: Date;
  resolved_at?: Date;
  resolution_time_seconds?: number;
  tags: string[];
  metadata?: Record<string, any>;
  sla_status?: SLAStatus;
  sla_breach_at?: Date;
  unread_count: number;
}

export interface IConversationCreate {
  contact_id?: string;
  customer_id?: string;
  channel_id: string;
  channel_type: ChannelType | string;
  external_id?: string;
  priority?: ConversationPriority;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface IConversationUpdate {
  status?: ConversationStatus;
  priority?: ConversationPriority;
  assigned_to?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  resolved_at?: Date;
  resolution_time_seconds?: number;
}

export interface IConversationAssign {
  assigned_to: string;
  reason?: string;
  auto_assigned?: boolean;
}

export interface IConversationWithMessages extends IConversation {
  messages?: IMessage[];
  customer?: ICustomer;
  channel?: IChannel;
}

export interface IConversationStats {
  total_conversations: number;
  open_conversations: number;
  pending_conversations: number;
  resolved_conversations: number;
  avg_response_time: number;
  avg_resolution_time: number;
  sla_breach_rate: number;
}

// Importing types from other interfaces (to avoid circular dependencies, these should be minimal)
import { IMessage } from './IMessage';
import { ICustomer } from './ICustomer';
import { IChannel } from './IChannel';