/**
 * Contact Types - Sprint 15
 * Multi-tenant contact management types
 */

export interface Contact {
  id: number;
  company_id: number;

  // Basic Information
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  mobile_phone?: string;

  // Professional Information
  account_id?: number;
  account?: Account;
  job_title?: string;
  department?: string;
  reports_to_id?: number;
  reports_to?: Contact;

  // Personal Information
  birthdate?: string;
  preferred_contact_method?: ContactMethod;

  // Address
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;

  // Social
  linkedin?: string;
  twitter?: string;

  // Relationship
  is_primary?: boolean;
  do_not_call?: boolean;
  do_not_email?: boolean;

  // Assignment
  owner_id?: number;
  owner?: UserInfo;

  // Description
  description?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

export type ContactMethod =
  | 'email'
  | 'phone'
  | 'mobile'
  | 'linkedin'
  | 'other';

export interface ContactFormData extends Partial<Omit<Contact, 'id' | 'company_id' | 'created_at' | 'updated_at'>> {}

export interface ContactFilters {
  account_id?: number;
  owner_id?: number;
  is_primary?: boolean;
  department?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Import types from other files
import type { Account } from './account.types';

export interface UserInfo {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}