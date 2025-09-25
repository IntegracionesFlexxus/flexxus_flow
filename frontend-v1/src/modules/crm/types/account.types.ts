/**
 * Account Types - Sprint 15
 * Multi-tenant account management types
 */

export interface Account {
  id: number;
  company_id: string;  // UUID string

  // Basic Information
  name: string;
  type: AccountType;
  website?: string;
  phone?: string;
  email?: string;

  // Tax Information (Argentina)
  cuit?: string;
  tax_condition?: TaxCondition;

  // Business Details
  industry_id?: number;
  annual_revenue?: number;
  employees_count?: number;
  description?: string;

  // Hierarchy
  parent_account_id?: number;
  parent_account?: Account;
  child_accounts?: Account[];

  // Relationship
  rating?: AccountRating;
  ownership?: string;

  // Assignment
  owner_id?: number;
  owner?: UserInfo;

  // Address Information
  billing_street?: string;
  billing_city?: string;
  billing_state?: string;
  billing_postal_code?: string;
  billing_country?: string;

  shipping_street?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_postal_code?: string;
  shipping_country?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

export type AccountType =
  | 'customer'
  | 'prospect'
  | 'partner'
  | 'competitor'
  | 'vendor'
  | 'other';

export type AccountRating =
  | 'hot'
  | 'warm'
  | 'cold';

export type TaxCondition =
  | 'responsable_inscripto'
  | 'monotributo'
  | 'exento'
  | 'consumidor_final'
  | 'no_categorizado';

export interface AccountFormData extends Partial<Omit<Account, 'id' | 'created_at' | 'updated_at'>> {
  company_id?: string;  // UUID string
}

export interface AccountFilters {
  type?: AccountType;
  rating?: AccountRating;
  industry_id?: number;
  owner_id?: number;
  parent_account_id?: number;
  revenue_min?: number;
  revenue_max?: number;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface AccountMetrics {
  total: number;
  by_type: Record<AccountType, number>;
  by_rating: Record<AccountRating, number>;
  total_revenue: number;
  avg_revenue: number;
  with_opportunities: number;
  without_opportunities: number;
}

export interface AccountHierarchy {
  account: Account;
  parent?: Account;
  children: Account[];
  total_revenue: number;
  total_opportunities: number;
}

export interface UserInfo {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}