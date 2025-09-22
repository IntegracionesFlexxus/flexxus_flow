// events/eventTypes.ts
export interface ChannelEvent {
  channelId: string;
  companyId: string;
  channelType: string;
  action: 'created' | 'updated' | 'deleted' | 'health_changed';
  data?: any;
}

export interface ConversationEvent {
  conversationId: string;
  companyId: string;
  customerId?: string;
  channelId: string;
  action: 'created' | 'assigned' | 'status_changed' | 'resolved' | 'reopened';
  data?: any;
}

export interface MessageEvent {
  messageId: string;
  conversationId: string;
  companyId: string;
  senderType: 'customer' | 'agent' | 'system' | 'bot';
  action: 'received' | 'sent' | 'delivered' | 'read' | 'failed' | 'status_changed';
  data?: any;
}

export interface CustomerEvent {
  customerId: string;
  companyId: string;
  action: 'created' | 'updated' | 'merged' | 'identity_created';
  data?: any;
}

export interface TemplateEvent {
  templateId: string;
  companyId: string;
  action: 'created' | 'updated' | 'deleted' | 'used';
  data?: any;
}

export interface SLAEvent {
  conversationId: string;
  companyId: string;
  type: 'warning' | 'breached';
  threshold: number;
  currentTime: number;
  data?: any;
}

export interface IntegrationEvent {
  channelId: string;
  companyId: string;
  type: 'error' | 'success';
  service: 'whatsapp' | 'instagram' | 'email' | 'sms';
  data?: any;
}

// Union type para todos los eventos
export type OmniEventPayload =
  | ChannelEvent
  | ConversationEvent
  | MessageEvent
  | CustomerEvent
  | TemplateEvent
  | SLAEvent
  | IntegrationEvent;