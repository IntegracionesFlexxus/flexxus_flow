// types/message.types.ts
export enum SenderType {
  CUSTOMER = 'customer',
  AGENT = 'agent',
  SYSTEM = 'system',
  BOT = 'bot'
}

export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  LOCATION = 'location'
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

export interface Message {
  id: string;
  companyId: string;
  conversationId: string;
  customerId?: string;
  senderType: SenderType;
  senderId?: string;
  senderName?: string;
  contentType: ContentType;
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  status: MessageStatus;
  metadata?: Record<string, any>;
  isPrivate: boolean;
  createdAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  errorMessage?: string;
}

export interface SendMessageRequest {
  conversationId: string;
  content?: string;
  contentType: ContentType;
  mediaUrl?: string;
  mediaType?: string;
  isPrivate?: boolean;
  metadata?: Record<string, any>;
}

export interface MessageListResponse {
  messages: Message[];
  hasMore: boolean;
  nextCursor?: string;
}