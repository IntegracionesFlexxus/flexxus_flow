// interfaces/IMessage.ts
export interface IMessage {
  id: string;
  companyId: string;
  conversationId: string;
  customerId?: string;
  senderType: SenderType;
  senderId?: string;
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
}

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