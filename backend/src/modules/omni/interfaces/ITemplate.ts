/**
 * Template Interface - Sprint 05
 * Interface definitions for message templates
 */

import { BaseEntity } from '../repositories/base/BaseOmniRepository';
import { ChannelType } from '../types/channel.types';
import { TemplateVariable, MessageButton } from '../types/message.types';

export interface IMessageTemplate extends BaseEntity {
  channel_type: ChannelType | string;
  name: string;
  category?: string;
  language: string;
  content: string;
  variables: TemplateVariable[];
  media_url?: string;
  buttons?: MessageButton[];
  is_active: boolean;
  approval_status?: string;
  external_id?: string;
  usage_count: number;
  last_used_at?: Date;
  created_by?: string;
}

export interface IMessageTemplateCreate {
  channel_type: ChannelType | string;
  name: string;
  category?: string;
  language?: string;
  content: string;
  variables?: TemplateVariable[];
  media_url?: string;
  buttons?: MessageButton[];
}

export interface IMessageTemplateUpdate {
  name?: string;
  category?: string;
  content?: string;
  variables?: TemplateVariable[];
  media_url?: string;
  buttons?: MessageButton[];
  is_active?: boolean;
  approval_status?: string;
}

export interface IQuickReply {
  id: string;
  company_id: string;
  title: string;
  content: string;
  category?: string;
  shortcuts: string[];
  usage_count: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

export interface IQuickReplyCreate {
  title: string;
  content: string;
  category?: string;
  shortcuts?: string[];
}

export interface IQuickReplyUpdate {
  title?: string;
  content?: string;
  category?: string;
  shortcuts?: string[];
  is_active?: boolean;
}