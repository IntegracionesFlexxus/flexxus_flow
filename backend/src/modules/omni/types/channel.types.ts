/**
 * Channel Types - Sprint 05
 * Type definitions for omnichannel channels
 */

export enum ChannelType {
  WHATSAPP = 'whatsapp',
  INSTAGRAM = 'instagram',
  EMAIL = 'email',
  SMS = 'sms'
}

export enum ChannelHealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  DOWN = 'down',
  UNKNOWN = 'unknown'
}

export enum EmailProvider {
  SENDGRID = 'sendgrid',
  SES = 'ses',
  SMTP = 'smtp',
  MAILGUN = 'mailgun'
}

export enum SMSProvider {
  TWILIO = 'twilio',
  MESSAGEBIRD = 'messagebird',
  VONAGE = 'vonage',
  AWS_SNS = 'aws_sns'
}

export interface ChannelConfiguration {
  [key: string]: any;
}

export interface WhatsAppConfig extends ChannelConfiguration {
  phoneNumber: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  accessToken?: string;
  webhookVerifyToken?: string;
  apiVersion?: string;
  capabilities?: string[];
}

export interface InstagramConfig extends ChannelConfiguration {
  instagramAccountId: string;
  instagramUsername?: string;
  pageId?: string;
  pageAccessToken?: string;
  webhookVerifyToken?: string;
  apiVersion?: string;
}

export interface EmailConfig extends ChannelConfiguration {
  provider: EmailProvider;
  fromEmail: string;
  fromName?: string;
  replyToEmail?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  apiKey?: string;
  bounceWebhookUrl?: string;
}

export interface SMSConfig extends ChannelConfiguration {
  provider: SMSProvider;
  phoneNumber: string;
  accountSid?: string;
  authToken?: string;
  apiKey?: string;
  messagingServiceSid?: string;
  countryCode?: string;
  capabilities?: string[];
}

export interface ChannelLimits {
  dailyLimit: number;
  messageSentToday: number;
  lastLimitReset: Date;
  rateLimitTier?: string;
}

export interface ChannelMetrics {
  messagesSent: number;
  messagesReceived: number;
  messagesFailed: number;
  conversationsCreated: number;
  conversationsResolved: number;
  avgResponseTimeSeconds?: number;
  avgResolutionTimeSeconds?: number;
  healthUptimePercentage?: number;
}