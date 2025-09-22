// interfaces/IChannel.ts
export interface IChannel {
  id: string;
  companyId: string;
  channelType: ChannelType;
  name: string;
  description?: string;
  isActive: boolean;
  healthStatus: HealthStatus;
  configuration: ChannelConfig;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

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

export interface ChannelConfig {
  [key: string]: any;
}

export interface IWhatsAppChannel extends IChannel {
  phoneNumber: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  accessToken?: string;
  capabilities: string[];
}