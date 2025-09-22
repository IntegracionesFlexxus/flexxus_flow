// types/conversation.types.ts
import { ChannelType } from './channel.types';
import { Customer } from './customer.types';
import { Message } from './message.types';

export enum ConversationStatus {
  OPEN = 'open',
  PENDING = 'pending',
  RESOLVED = 'resolved',
  ARCHIVED = 'archived'
}

export enum Priority {
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

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
}

export interface Conversation {
  id: string;
  companyId: string;
  customerId?: string;
  customer?: Customer;
  channelId: string;
  channel?: any;
  channelType: ChannelType;
  status: ConversationStatus;
  priority: Priority;
  assignedTo?: string;
  assignedUser?: User;
  assignedAt?: Date;
  firstResponseAt?: Date;
  lastMessageAt?: Date;
  resolvedAt?: Date;
  resolutionTimeSeconds?: number;
  tags: string[];
  metadata?: Record<string, any>;
  slaStatus?: SLAStatus;
  slaBreachAt?: Date;
  unreadCount?: number;
  lastMessage?: Message;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationFilters {
  status?: ConversationStatus;
  channelType?: ChannelType;
  assignedTo?: string;
  priority?: Priority;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}

export interface CreateConversationRequest {
  customerId?: string;
  channelId: string;
  title?: string;
  priority?: Priority;
  tags?: string[];
  customFields?: Record<string, any>;
  internalNotes?: string;
}

export interface ConversationStats {
  total: number;
  open: number;
  pending: number;
  resolved: number;
  responseTimeAvg: number;
}