/**
 * Base Interfaces for Product-Quote Module
 * Sprint 19 Implementation
 */

export interface BaseEntity {
  created_at: Date;
  updated_at: Date;
  created_by?: number;
  updated_by?: number;
}

export interface CompanyScoped {
  company_id: number;
}

export interface Auditable extends BaseEntity {
  deleted_at?: Date;
  deleted_by?: number;
}

export interface Versionable {
  version_number: number;
  parent_id?: number;
  is_primary: boolean;
}

export interface Searchable {
  search_text?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface FilterOperator {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'between';
  value: any;
}

export interface SearchCriteria {
  filters?: FilterOperator[];
  search?: string;
  pagination?: PaginationParams;
}

export interface ValidationResult {
  is_valid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface Money {
  amount: number;
  currency: string;
}

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  postal_code?: string;
  country: string;
}

export interface Contact {
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
}

export interface DateRange {
  start_date: Date;
  end_date: Date;
}

export interface TimeRange {
  start_time: string;
  end_time: string;
}

export interface Attachment {
  id?: number;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface CustomField {
  key: string;
  value: any;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface BulkOperationResult {
  total: number;
  successful: number;
  failed: number;
  errors?: Array<{
    index: number;
    error: string;
  }>;
}

export interface ImportExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  fields?: string[];
  include_headers?: boolean;
  encoding?: string;
}

export interface NotificationOptions {
  type: 'email' | 'sms' | 'push' | 'in_app';
  recipients: string[] | number[];
  template?: string;
  data?: Record<string, any>;
}

export interface WorkflowContext {
  entity_type: string;
  entity_id: number;
  user_id: number;
  company_id: number;
  data?: Record<string, any>;
}

export interface ApprovalContext extends WorkflowContext {
  approval_level?: number;
  approvers?: number[];
  comments?: string;
}