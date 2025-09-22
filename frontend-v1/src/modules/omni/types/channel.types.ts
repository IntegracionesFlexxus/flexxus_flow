// types/channel.types.ts
export enum ChannelType {
  WHATSAPP = 'whatsapp',
  INSTAGRAM = 'instagram',
  EMAIL = 'email',
  SMS = 'sms'
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  DOWN = 'down',
  UNKNOWN = 'unknown'
}

export interface Channel {
  id: string;
  companyId: string;
  channelType: ChannelType;
  name: string;
  description?: string;
  isActive: boolean;
  healthStatus: HealthStatus;
  lastHealthCheck?: Date;
  configuration: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhatsAppChannel extends Channel {
  phoneNumber: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  capabilities: string[];
}

export interface ChannelConfig {
  [ChannelType.WHATSAPP]: {
    phoneNumber: string;
    accessToken: string;
    businessAccountId?: string;
  };
  [ChannelType.EMAIL]: {
    fromEmail: string;
    fromName: string;
    provider: 'sendgrid' | 'ses' | 'smtp';
    apiKey?: string;
  };
  [ChannelType.INSTAGRAM]: {
    username: string;
    pageId: string;
    accessToken: string;
  };
  [ChannelType.SMS]: {
    phoneNumber: string;
    provider: 'twilio' | 'messagebird';
    apiKey: string;
  };
}

export interface CreateChannelRequest {
  channelType: ChannelType;
  name: string;
  description?: string;
  configuration: Record<string, any>;
}

export interface UpdateChannelRequest {
  name?: string;
  description?: string;
  configuration?: Record<string, any>;
  isActive?: boolean;
}