/**
 * CRM Types - General types and enums
 */

// Enums
export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  CONVERTED = 'converted',
  DISQUALIFIED = 'disqualified'
}

export enum AuthorityLevel {
  DECISION_MAKER = 'decision_maker',
  INFLUENCER = 'influencer',
  USER = 'user',
  OTHER = 'other'
}

export enum Timeline {
  IMMEDIATE = 'immediate',
  ONE_MONTH = '1_month',
  THREE_MONTHS = '3_months',
  SIX_MONTHS = '6_months',
  ONE_YEAR = '1_year'
}

export enum AccountType {
  PROSPECT = 'prospect',
  CUSTOMER = 'customer',
  PARTNER = 'partner',
  VENDOR = 'vendor',
  OTHER = 'other'
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended'
}

export enum AccountRating {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold'
}

export enum OpportunityStatus {
  OPEN = 'open',
  WON = 'won',
  LOST = 'lost'
}

export enum OpportunityType {
  NEW_BUSINESS = 'new_business',
  EXISTING_BUSINESS = 'existing_business',
  RENEWAL = 'renewal'
}

export enum ForecastCategory {
  PIPELINE = 'pipeline',
  BEST_CASE = 'best_case',
  COMMIT = 'commit',
  CLOSED = 'closed'
}

export enum ActivityType {
  TASK = 'task',
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  NOTE = 'note'
}

export enum ActivityStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ActivityPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum QuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

// Common interfaces
export interface Address {
  street?: string;
  city_id?: number;
  postal_code?: string;
}

export interface AuditFields {
  created_at?: Date;
  updated_at?: Date;
  created_by?: number;
  updated_by?: number;
}

export interface CustomFields {
  [key: string]: any;
}

// Reference data interfaces
export interface VatCondition {
  id: number;
  code: string;
  name: string;
  description?: string;
  aliquot: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Industry {
  id: number;
  code: string;
  name: string;
  description?: string;
  parent_id?: number;
  icon?: string;
  is_active: boolean;
  created_at: Date;
}

export interface Region {
  id: number;
  code: string;
  name: string;
  country_code: string;
  timezone: string;
  is_active: boolean;
  created_at: Date;
}

export interface City {
  id: number;
  region_id: number;
  name: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  is_capital: boolean;
  is_active: boolean;
  created_at: Date;
}

export interface LeadSource {
  id: number;
  code: string;
  name: string;
  description?: string;
  category?: string;
  is_active: boolean;
  created_at: Date;
}

export interface SalesStage {
  id: number;
  code: string;
  name: string;
  description?: string;
  order_position: number;
  probability: number;
  is_won: boolean;
  is_lost: boolean;
  is_active: boolean;
  created_at: Date;
}

// API Response types
export interface CRMResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Filter types
export interface BaseFilter {
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface DateRangeFilter {
  start: Date | string;
  end: Date | string;
}

// Conversion types
export interface LeadConversionData {
  createOpportunity: boolean;
  opportunityName?: string;
  opportunityAmount?: number;
  closeDate?: Date;
  accountName?: string;
  accountType?: AccountType;
}