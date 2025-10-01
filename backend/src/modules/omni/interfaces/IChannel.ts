/**
 * Channel Interface - Sprint 05
 * Interface definitions for channels
 */

import { BaseEntity } from '../repositories/base/BaseOmniRepository';
import { ChannelType, ChannelHealthStatus, ChannelConfiguration } from '../types/channel.types';

export interface IChannel extends BaseEntity {
  channel_type: ChannelType;
  name: string;
  description?: string;
  is_active: boolean;
  health_status: ChannelHealthStatus;
  last_health_check?: Date;
  configuration: ChannelConfiguration;
  metadata?: Record<string, any>;
  created_by?: string;
}

export interface IChannelCreate {
  channel_type: ChannelType;
  name: string;
  description?: string;
  configuration: ChannelConfiguration;
  metadata?: Record<string, any>;
}

export interface IChannelUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
  configuration?: ChannelConfiguration;
  metadata?: Record<string, any>;
}

export interface IWhatsAppChannel {
  id: string;
  channel_id: string;
  phone_number: string;
  phone_number_id?: string;
  business_account_id?: string;
  access_token?: string;
  webhook_verify_token?: string;
  api_version: string;
  rate_limit_tier?: string;
  daily_limit: number;
  messages_sent_today: number;
  last_limit_reset: Date;
  capabilities: any;
  created_at: Date;
  updated_at: Date;
}

export interface IInstagramChannel {
  id: string;
  channel_id: string;
  instagram_account_id: string;
  instagram_username?: string;
  page_id?: string;
  page_access_token?: string;
  webhook_verify_token?: string;
  api_version: string;
  rate_limit_tier?: string;
  daily_limit: number;
  messages_sent_today: number;
  last_limit_reset: Date;
  created_at: Date;
  updated_at: Date;
}

export interface IEmailChannel {
  id: string;
  channel_id: string;
  provider: string;
  from_email: string;
  from_name?: string;
  reply_to_email?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  api_key?: string;
  daily_limit: number;
  messages_sent_today: number;
  last_limit_reset: Date;
  bounce_webhook_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ISMSChannel {
  id: string;
  channel_id: string;
  provider: string;
  phone_number: string;
  account_sid?: string;
  auth_token?: string;
  api_key?: string;
  messaging_service_sid?: string;
  country_code?: string;
  capabilities: any;
  daily_limit: number;
  messages_sent_today: number;
  last_limit_reset: Date;
  created_at: Date;
  updated_at: Date;
}