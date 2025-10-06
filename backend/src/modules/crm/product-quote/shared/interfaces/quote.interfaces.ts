/**
 * Quote Interfaces
 * Sprint 19 Implementation
 */

import { BaseEntity, CompanyScoped, Versionable, Address, Money } from './base.interfaces';

export interface IQuote extends BaseEntity, CompanyScoped, Versionable {
  quote_id: number;
  quote_number: string;
  opportunity_id?: number;
  account_id: number;
  contact_id?: number;
  quote_name: string;
  quote_type: QuoteType;
  description?: string;
  currency_code: string;
  exchange_rate: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  payment_terms?: string;
  payment_method?: string;
  delivery_terms?: string;
  delivery_method?: string;
  valid_from: Date;
  valid_until?: Date;
  status: QuoteStatus;
  approval_status?: ApprovalStatus;
  sent_at?: Date;
  viewed_at?: Date;
  accepted_at?: Date;
  rejected_at?: Date;
  converted_at?: Date;
  sales_rep_id?: number;
  sales_team_id?: number;
  commission_rate?: number;
  billing_address?: Address;
  shipping_address?: Address;
  internal_notes?: string;
  customer_notes?: string;
  terms_conditions?: string;
  custom_fields?: Record<string, any>;
  items?: IQuoteLineItem[]; // Associated line items (populated when needed)
}

export interface IQuoteSection extends BaseEntity {
  section_id: number;
  quote_id: number;
  section_name: string;
  section_type: SectionType;
  description?: string;
  parent_section_id?: number;
  sort_order: number;
  is_visible: boolean;
  is_optional: boolean;
  is_selected: boolean;
  subtotal: number;
  discount_amount: number;
  custom_fields?: Record<string, any>;
}

export interface IQuoteLineItem extends BaseEntity {
  line_item_id: number;
  quote_id: number;
  section_id?: number;
  product_id?: number;
  variation_id?: number;
  bundle_id?: number;
  line_number: number;
  sku?: string;
  name: string;
  description?: string;
  quantity: number;
  unit_of_measure: string;
  list_price: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  subtotal: number;
  total_discount: number;
  total_amount: number;
  unit_cost?: number;
  total_cost?: number;
  margin_amount?: number;
  margin_percentage?: number;
  is_optional: boolean;
  is_selected: boolean;
  requires_configuration: boolean;
  configuration?: Record<string, any>;
  notes?: string;
  sort_order: number;
  custom_fields?: Record<string, any>;
}

export interface IQuoteAttachment extends BaseEntity {
  attachment_id: number;
  quote_id: number;
  file_name: string;
  file_type?: string;
  file_size?: number;
  file_url: string;
  attachment_type: AttachmentType;
  title?: string;
  description?: string;
  is_customer_visible: boolean;
  is_internal: boolean;
  is_active: boolean;
  uploaded_by?: number;
}

export interface IQuoteComment extends BaseEntity {
  comment_id: number;
  quote_id: number;
  comment_text: string;
  comment_type: CommentType;
  parent_comment_id?: number;
  is_internal: boolean;
  is_customer_visible: boolean;
  is_resolved: boolean;
  mentioned_users?: number[];
}

export interface IQuoteActivity {
  activity_id: number;
  quote_id: number;
  activity_type: ActivityType;
  activity_description?: string;
  field_changes?: Record<string, any>;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  related_entity_type?: string;
  related_entity_id?: number;
  user_id?: number;
  user_ip?: string;
  user_agent?: string;
  created_at: Date;
}

export interface IQuoteTemplate extends BaseEntity, CompanyScoped {
  template_id: number;
  template_name: string;
  description?: string;
  template_type: QuoteTemplateType;
  sections?: any[];
  line_items?: any[];
  default_payment_terms?: string;
  default_delivery_terms?: string;
  default_validity_days?: number;
  default_terms_conditions?: string;
  requires_approval: boolean;
  approval_threshold?: number;
  is_active: boolean;
  is_default: boolean;
  times_used: number;
  last_used_at?: Date;
  custom_fields?: Record<string, any>;
}

export interface IQuoteComparison extends BaseEntity, CompanyScoped {
  comparison_id: number;
  comparison_name?: string;
  quote_ids: number[];
  criteria?: Record<string, any>;
  winner_quote_id?: number;
  comparison_notes?: string;
  decision_factors?: string;
  status: ComparisonStatus;
  completed_at?: Date;
  completed_by?: number;
}

// Enums and Types
export type QuoteType = 'standard' | 'renewal' | 'amendment';
export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'converted';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type SectionType = 'standard' | 'optional' | 'alternative';
export type AttachmentType = 'document' | 'image' | 'presentation' | 'spreadsheet';
export type CommentType = 'note' | 'approval' | 'rejection' | 'question';
export type ActivityType = 'created' | 'updated' | 'sent' | 'viewed' | 'approved' | 'rejected' | 'converted';
export type QuoteTemplateType = 'standard' | 'product' | 'service' | 'recurring';
export type ComparisonStatus = 'active' | 'completed' | 'archived';

// DTOs
export interface CreateQuoteDto {
  opportunity_id?: number;
  account_id: number;
  contact_id?: number;
  quote_name: string;
  quote_type?: QuoteType;
  description?: string;
  currency_code?: string;
  payment_terms?: string;
  delivery_terms?: string;
  valid_until?: Date;
  billing_address?: Address;
  shipping_address?: Address;
  internal_notes?: string;
  customer_notes?: string;
  terms_conditions?: string;
  custom_fields?: Record<string, any>;
  items?: AddLineItemDto[]; // Line items to create with quote
}

export interface UpdateQuoteDto extends Partial<CreateQuoteDto> {
  status?: QuoteStatus;
  items?: AddLineItemDto[]; // Updated line items
}

export interface AddLineItemDto {
  section_id?: number;
  product_id?: number;
  variation_id?: number;
  bundle_id?: number;
  sku?: string;
  name: string;
  description?: string;
  quantity: number;
  unit_of_measure?: string;
  unit_price: number;
  discount_percentage?: number;
  discount_amount?: number;
  is_optional?: boolean;
  configuration?: Record<string, any>;
  notes?: string;
  custom_fields?: Record<string, any>;
}

export interface UpdateLineItemDto extends Partial<AddLineItemDto> {
  is_selected?: boolean;
}

export interface QuoteTotals {
  subtotal: number;
  total_discount: number;
  discount_percentage?: number;
  taxable_amount: number;
  total_tax: number;
  shipping_amount: number;
  total_amount: number;
  currency_code: string;
  line_items_count: number;
  optional_items_total?: number;
  margin_amount?: number;
  margin_percentage?: number;
}

export interface QuoteSearchCriteria {
  search?: string;
  account_ids?: number[];
  opportunity_ids?: number[];
  status?: QuoteStatus[];
  approval_status?: ApprovalStatus[];
  date_range?: {
    field: 'created' | 'sent' | 'valid_until';
    start: Date;
    end: Date;
  };
  amount_range?: {
    min: number;
    max: number;
  };
  sales_rep_ids?: number[];
  has_discount?: boolean;
  is_expired?: boolean;
}

export interface QuoteVersion {
  version_number: number;
  quote_id: number;
  created_at: Date;
  created_by: number;
  changes_summary?: string;
  total_amount: number;
  status: QuoteStatus;
}

export interface QuoteValidationResult {
  is_valid: boolean;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  warnings?: Array<{
    field: string;
    message: string;
  }>;
  requires_approval?: boolean;
  approval_reasons?: string[];
}

export interface QuoteMetrics {
  total_quotes: number;
  total_value: number;
  average_value: number;
  conversion_rate: number;
  average_days_to_close: number;
  win_rate: number;
  by_status: Record<QuoteStatus, number>;
  by_sales_rep?: Record<number, {
    count: number;
    value: number;
    conversion_rate: number;
  }>;
}

export interface SendQuoteOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  message?: string;
  attach_pdf?: boolean;
  include_attachments?: boolean;
  template_id?: number;
}

export interface QuoteConversionDto {
  create_order?: boolean;
  create_invoice?: boolean;
  update_opportunity?: boolean;
  notes?: string;
}