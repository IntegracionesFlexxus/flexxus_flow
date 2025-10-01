/**
 * Message Interface - Sprint 05
 * Interface definitions for messages
 */

import { BaseEntity } from '../repositories/base/BaseOmniRepository';
import { MessageSenderType, MessageContentType, MessageStatus } from '../types/message.types';

export interface IMessage extends BaseEntity {
  conversation_id: string;
  customer_id?: string;
  sender_type: MessageSenderType;
  sender_id?: string;
  content_type: MessageContentType;
  content?: string;
  media_url?: string;
  media_type?: string;
  external_id?: string;
  status: MessageStatus;
  error_message?: string;
  metadata?: Record<string, any>;
  is_private: boolean;
  delivered_at?: Date;
  read_at?: Date;
}

export interface IMessageCreate {
  conversation_id: string;
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