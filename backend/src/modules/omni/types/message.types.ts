/**
 * Message Types - Sprint 05
 * Type definitions for omnichannel messages
 */

export enum MessageSenderType {
  CUSTOMER = 'customer',
  AGENT = 'agent',
  SYSTEM = 'system',
  BOT = 'bot'
}

export enum MessageContentType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  LOCATION = 'location',
  TEMPLATE = 'template'
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

export interface MessageContent {
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  templateId?: string;
  templateVariables?: Record<string, any>;
  location?: LocationContent;
  document?: DocumentContent;
}

export interface LocationContent {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
  url?: string;
}

export interface DocumentContent {
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  caption?: string;
}

export interface MessageDeliveryInfo {
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  retryCount?: number;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
  timestamp: Date;
}

export interface MessageButton {
  id: string;
  text: string;
  type: 'quick_reply' | 'url' | 'call' | 'postback';
  payload?: string;
  url?: string;
  phoneNumber?: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  category: 'greeting' | 'away' | 'followup' | 'closing' | 'custom';
  language: string;
  content: string;
  variables: TemplateVariable[];
  mediaUrl?: string;
  buttons?: MessageButton[];
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'url';
  required: boolean;
  defaultValue?: any;
  format?: string;
}

export interface QuickReply {
  id: string;
  title: string;
  content: string;
  category?: string;
  shortcuts: string[];
  usageCount: number;
}