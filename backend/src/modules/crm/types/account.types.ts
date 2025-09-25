/**
 * Account Types and DTOs
 */

import { CRMBaseEntity } from '../repositories/CRMBaseRepository';
import { 
  AccountType, 
  AccountStatus, 
  AccountRating,
  CustomFields,
  BaseFilter,
  Address
} from './crm.types';

// Account entity
export interface Account extends CRMBaseEntity {
  // Basic Information
  name: string;
  account_number?: string;
  type: AccountType;
  
  // Business Information
  industry_id?: number;
  vat_condition_id?: number;
  cuit?: string;
  website?: string;
  annual_revenue?: number;
  employee_count?: number;
  
  // Hierarchy
  parent_account_id?: number;
  
  // Billing Address
  billing_street?: string;
  billing_city_id?: number;
  billing_postal_code?: string;
  
  // Shipping Address
  shipping_street?: string;
  shipping_city_id?: number;
  shipping_postal_code?: string;
  
  // Contact Information
  phone?: string;
  fax?: string;
  email?: string;
  
  // Management
  owner_id: number;
  rating?: AccountRating;
  sla_type?: string;
  sla_expiration_date?: Date;
  
  // Status
  status: AccountStatus;
  
  // Metadata
  description?: string;
  tags?: string[];
  custom_fields?: CustomFields;
}

// DTOs
export interface AccountCreateDTO {
  company_id: string;  // Changed to string for UUID
  name: string;
  type?: AccountType;
  industry_id?: number;
  vat_condition_id?: number;
  cuit?: string;
  website?: string;
  annual_revenue?: number;
  employee_count?: number;
  parent_account_id?: number;
  billing_street?: string;
  billing_city_id?: number;
  billing_postal_code?: string;
  shipping_street?: string;
  shipping_city_id?: number;
  shipping_postal_code?: string;
  phone?: string;
  fax?: string;
  email?: string;
  owner_id: number;
  rating?: AccountRating;
  sla_type?: string;
  sla_expiration_date?: Date;
  description?: string;
  tags?: string[];
  custom_fields?: CustomFields;
}

export interface AccountUpdateDTO {
  name?: string;
  type?: AccountType;
  industry_id?: number;
  vat_condition_id?: number;
  cuit?: string;
  website?: string;
  annual_revenue?: number;
  employee_count?: number;
  parent_account_id?: number;
  billing_street?: string;
  billing_city_id?: number;
  billing_postal_code?: string;
  shipping_street?: string;
  shipping_city_id?: number;
  shipping_postal_code?: string;
  phone?: string;
  fax?: string;
  email?: string;
  owner_id?: number;
  rating?: AccountRating;
  sla_type?: string;
  sla_expiration_date?: Date;
  status?: AccountStatus;
  description?: string;
  tags?: string[];
  custom_fields?: CustomFields;
}

// Filter interface
export interface AccountFilter extends BaseFilter {
  type?: AccountType;
  status?: AccountStatus;
  rating?: AccountRating;
  industry_id?: number;
  vat_condition_id?: number;
  owner_id?: number;
  parent_account_id?: number;
  minRevenue?: number;
  maxRevenue?: number;
  minEmployees?: number;
  maxEmployees?: number;
  tags?: string[];
}

// Account with related data
export interface AccountWithDetails extends Account {
  industry_name?: string;
  vat_condition_name?: string;
  parent_account_name?: string;
  owner_name?: string;
  billing_city_name?: string;
  shipping_city_name?: string;
  contacts?: Contact[];
  opportunities?: Opportunity[];
  total_opportunity_value?: number;
}

// Account hierarchy
export interface AccountHierarchy extends Account {
  level: number;
  children: AccountHierarchy[];
}

// Account metrics
export interface AccountMetrics {
  total: number;
  byType: {
    [key in AccountType]: number;
  };
  byStatus: {
    [key in AccountStatus]: number;
  };
  byRating: {
    [key in AccountRating]: number;
  };
  totalRevenue: number;
  averageRevenue: number;
  topAccounts: {
    id: number;
    name: string;
    revenue: number;
    opportunity_count: number;
  }[];
}

// Simple references (to avoid circular dependencies)
interface Contact {
  id: number;
  first_name: string;
  last_name?: string;
  email: string;
  job_title?: string;
  is_primary: boolean;
}

interface Opportunity {
  id: number;
  name: string;
  amount?: number;
  stage_id: number;
  close_date?: Date;
  status: string;
}