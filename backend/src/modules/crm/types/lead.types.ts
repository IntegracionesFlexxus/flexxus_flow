/**
 * Lead Types and DTOs
 */

import { CRMBaseEntity } from '../repositories/CRMBaseRepository';
import { 
  LeadStatus, 
  AuthorityLevel, 
  Timeline, 
  CustomFields,
  BaseFilter 
} from './crm.types';

// Lead entity
export interface Lead extends CRMBaseEntity {
  // Basic Information
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  mobile?: string;
  
  // Company Information
  company_name?: string;
  job_title?: string;
  industry_id?: number;
  website?: string;
  
  // Address
  street?: string;
  city_id?: number;
  postal_code?: string;
  
  // BANT Qualification
  budget?: number;
  authority_level?: AuthorityLevel;
  need_description?: string;
  timeline?: Timeline;
  
  // Lead Management
  source_id?: number;
  status: LeadStatus;
  score: number;
  assigned_to?: number;
  
  // Conversion
  converted_at?: Date;
  converted_to_account_id?: number;
  converted_to_contact_id?: number;
  converted_to_opportunity_id?: number;
  
  // Communication Preferences
  do_not_call: boolean;
  do_not_email: boolean;
  preferred_contact_method?: string;
  
  // Metadata
  notes?: string;
  tags?: string[];
  custom_fields?: CustomFields;
}

// DTOs
export interface LeadCreateDTO {
  company_id: number;
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  mobile?: string;
  company_name?: string;
  job_title?: string;
  industry_id?: number;
  website?: string;
  street?: string;
  city_id?: number;
  postal_code?: string;
  budget?: number;
  authority_level?: AuthorityLevel;
  need_description?: string;
  timeline?: Timeline;
  source_id?: number;
  assigned_to?: number;
  notes?: string;
  tags?: string[];
  custom_fields?: CustomFields;
}

export interface LeadUpdateDTO {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  company_name?: string;
  job_title?: string;
  industry_id?: number;
  website?: string;
  street?: string;
  city_id?: number;
  postal_code?: string;
  budget?: number;
  authority_level?: AuthorityLevel;
  need_description?: string;
  timeline?: Timeline;
  status?: LeadStatus;
  score?: number;
  assigned_to?: number;
  do_not_call?: boolean;
  do_not_email?: boolean;
  preferred_contact_method?: string;
  notes?: string;
  tags?: string[];
  custom_fields?: CustomFields;
}

// Filter interface
export interface LeadFilter extends BaseFilter {
  status?: LeadStatus;
  minScore?: number;
  maxScore?: number;
  assigned_to?: number;
  source_id?: number;
  timeline?: Timeline;
  authority_level?: AuthorityLevel;
  minBudget?: number;
  maxBudget?: number;
  industry_id?: number;
  tags?: string[];
  converted?: boolean;
}

// Lead with related data
export interface LeadWithDetails extends Lead {
  industry_name?: string;
  source_name?: string;
  assigned_to_name?: string;
  city_name?: string;
  region_name?: string;
}

// Lead scoring criteria
export interface LeadScoringCriteria {
  budget: {
    min: number;
    score: number;
  }[];
  authority: {
    [key in AuthorityLevel]: number;
  };
  need: {
    hasDescription: number;
    descriptionLength?: number;
  };
  timeline: {
    [key in Timeline]: number;
  };
  engagement: {
    emailOpened: number;
    linkClicked: number;
    formSubmitted: number;
    demoRequested: number;
  };
}

// Lead metrics
export interface LeadMetrics {
  total: number;
  byStatus: {
    [key in LeadStatus]: number;
  };
  averageScore: number;
  conversionRate: number;
  averageTimeToConvert: number;
  topSources: {
    source_id: number;
    source_name: string;
    count: number;
    conversionRate: number;
  }[];
}