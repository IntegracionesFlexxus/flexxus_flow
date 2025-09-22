// interfaces/IConversation.ts
export interface IConversation {
  id: string;
  companyId: string;
  customerId?: string;
  channelId: string;
  channelType: ChannelType;
  status: ConversationStatus;
  priority: Priority;
  assignedTo?: string;
  assignedAt?: Date;
  firstResponseAt?: Date;
  lastMessageAt?: Date;
  resolvedAt?: Date;
  tags: string[];
  metadata?: Record<string, any>;
  slaStatus?: SLAStatus;
  createdAt: Date;
  updatedAt: Date;
}

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

import { ChannelType } from './IChannel';