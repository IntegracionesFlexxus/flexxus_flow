/**
 * Message Types
 * Definiciones de tipos para mensajes de omnicanalidad
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
  FAILED = 'failed',
  RECEIVED = 'received'
}

export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound'
}

export interface Message {
  id: string;
  company_id: string;
  conversation_id: string;
  channel_id?: string;
  customer_id?: string;
  direction: MessageDirection;
  sender_type: MessageSenderType;
  sender_id?: string;
  recipient_identifier?: string;
  content_type: MessageContentType;
  content?: string;
  media_url?: string;
  media_type?: string;
  external_message_id?: string;
  status: MessageStatus;
  error_message?: string;
  metadata?: Record<string, any>;
  is_private: boolean;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
  updated_at: string;

  // Campos adicionales que pueden venir del backend
  sender_name?: string;
  sender_avatar?: string;
}

export interface MessageCreate {
  conversation_id: string;
  channel_id?: string;
  customer_id?: string;
  sender_type: MessageSenderType;
  sender_id?: string;
  content_type: MessageContentType;
  content?: string;
  media_url?: string;
  media_type?: string;
  metadata?: Record<string, any>;
  is_private?: boolean;
}

export interface MessageSend {
  conversation_id?: string;
  channel_id?: string;
  recipient: string;
  content: string;
  content_type?: MessageContentType;
  media_url?: string;
  template_id?: string;
  template_variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface MessageUpdate {
  status?: MessageStatus;
  delivered_at?: string;
  read_at?: string;
  error_message?: string;
}

export interface MessageFilters {
  conversationId?: string;
  channelId?: string;
  customerId?: string;
  senderType?: MessageSenderType;
  status?: MessageStatus;
  contentType?: MessageContentType;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
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
