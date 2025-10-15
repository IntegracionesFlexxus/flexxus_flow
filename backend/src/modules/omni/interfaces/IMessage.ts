/**
 * Message Interface - Sprint 05
 * Interface definitions for messages
 */

import { BaseEntity } from '../repositories/base/BaseOmniRepository';
import {
  MessageSenderType,
  MessageContentType,
  MessageStatus,
  MessageDirection
} from '../types/message.types';

export interface IMessage extends BaseEntity {
  conversation_id: string;
  sender_type: MessageSenderType;
  sender_id?: string;
  sender_name?: string;
  content?: string;
  message_type?: string;
  content_type?: MessageContentType | string;
  media_url?: string;
  media_type?: string;
  media_metadata?: Record<string, any>;
  status: MessageStatus;
  error_message?: string;
  is_internal?: boolean;
  is_private?: boolean;
  reply_to_message_id?: string;
  external_id?: string;
  external_message_id?: string;
  platform_data?: Record<string, any>;
  metadata?: Record<string, any>;
  direction?: MessageDirection;
  channel_id?: string;
  recipient_identifier?: string;
  customer_id?: string;
  company_id?: string;
  delivered_at?: Date;
  read_at?: Date;
  sent_at?: Date;
}

export interface IMessageCreate {
  conversation_id: string;
  company_id: string;
  channel_id?: string;
  customer_id?: string;
  sender_type: MessageSenderType;
  sender_id?: string;
  recipient_identifier?: string;
  content?: string;
  content_type?: MessageContentType | string;
  message_type?: string;
  media_url?: string;
  media_type?: string;
  media_metadata?: Record<string, any>;
  status?: MessageStatus;
  is_internal?: boolean;
  reply_to_message_id?: string;
  external_message_id?: string;
  metadata?: Record<string, any>;
  direction?: MessageDirection;
  platform_data?: Record<string, any>;
  sent_at?: Date;
  delivered_at?: Date;
  read_at?: Date;
}

export interface IMessageUpdate {
  status?: MessageStatus;
  delivered_at?: Date;
  read_at?: Date;
  error_message?: string;
}

export interface IMessageSend {
  channel_id: string;
  recipient: string; // phone, email, instagram handle, etc.
  content: string;
  content_type?: MessageContentType;
  media_url?: string;
  template_id?: string;
  template_variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface IMessageBatch {
  channel_id: string;
  recipients: string[];
  content: string;
  content_type?: MessageContentType;
  template_id?: string;
  schedule_at?: Date;
}
