/**
 * Customer Interface - Sprint 05
 * Interface definitions for customers
 */

import { BaseEntity } from '../repositories/base/BaseOmniRepository';

export interface ICustomer extends BaseEntity {
  external_id?: string; // CRM reference (soft reference)
  phone_number?: string;
  email?: string;
  instagram_handle?: string;
  whatsapp_id?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  metadata?: Record<string, any>;
  tags: string[];
  last_activity_at?: Date;
}

export interface ICustomerCreate {
  external_id?: string;
  phone_number?: string;
  email?: string;
  instagram_handle?: string;
  whatsapp_id?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface ICustomerUpdate {
  external_id?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface ICustomerMerge {
  primary_customer_id: string;
  duplicate_customer_id: string;
  merge_metadata?: boolean;
  merge_tags?: boolean;
}

export interface ICustomerSearch {
  query?: string;
  phone_number?: string;
  email?: string;
  instagram_handle?: string;
  external_id?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface ICustomerStats {
  total_conversations: number;
  total_messages: number;
  avg_response_time: number;
  last_conversation_date?: Date;
  preferred_channel?: string;
  satisfaction_score?: number;
}