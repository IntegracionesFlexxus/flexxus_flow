/**
 * Lead Types and Interfaces
 *
 * OMNICHANNEL STATUS: Adapted for missing module
 * See: FRONTEND_OMNICHANNEL_ADAPTATIONS.md for pending changes
 *
 * TODO: OMNICHANNEL - Add omnichannel-specific fields when ready
 */

// Basic Lead interface
export interface ILead {
  id: number;
  company_id: number;

  // Personal Information
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  mobile?: string;

  // Company Information
  company_name?: string;
  job_title?: string;
  industry_id?: number;
  industry_name?: string;
  website?: string;
  employee_count?: number;
  annual_revenue?: number;

  // Location
  street?: string;
  city_id?: number;
  city_name?: string;
  postal_code?: string;
  country?: string;

  // BANT Qualification
  budget?: number;
  authority_level?: 'decision_maker' | 'influencer' | 'evaluator' | 'user' | 'other';
  need_description?: string;
  timeline?: 'immediate' | '1_month' | '3_months' | '6_months' | '1_year' | 'unknown';

  // Lead Management
  source_id?: number;
  source_name?: string;
  status: LeadStatus;
  score: number;
  grade?: LeadGrade;
  temperature?: LeadTemperature;
  assigned_to?: number;
  assigned_to_name?: string;
  assigned_at?: Date | string;

  // Conversion
  converted_at?: Date | string;
  converted_to_account_id?: number;
  converted_to_contact_id?: number;
  converted_to_opportunity_id?: number;

  // Preferences
  do_not_call: boolean;
  do_not_email: boolean;
  preferred_contact_method?: 'email' | 'phone' | 'mobile' | 'in_person';

  // Additional Data
  notes?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;

  // OmniChannel Fields (currently mock/pending)
  manual_entry: boolean;          // TODO: OMNICHANNEL - Remove when automated capture ready
  source_verified: boolean;       // TODO: OMNICHANNEL - Auto-verify with real sources
  omnichannel_data?: any;        // TODO: OMNICHANNEL - Type this properly
  pending_sync?: boolean;         // TODO: OMNICHANNEL - Remove when real-time sync ready

  // Timestamps
  created_at: Date | string;
  updated_at: Date | string;
  created_by?: number;
  updated_by?: number;
}

// Lead Status enum
export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'converted'
  | 'disqualified'
  | 'merged';

// Lead Grade (based on score)
export type LeadGrade = 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';

// Lead Temperature (engagement level)
export type LeadTemperature = 'hot' | 'warm' | 'cool' | 'cold';

// Lead Source (adapted for no OmniChannel)
export interface ILeadSource {
  id: number;
  name: string;
  type: 'manual' | 'import' | 'api' | 'form' | 'chat' | 'email' | 'social' | 'other';
  is_verified: boolean;  // TODO: OMNICHANNEL - Verify against real sources
  is_active: boolean;
}

// Lead Scoring Details
export interface ILeadScoring {
  lead_id: number;
  total_score: number;
  demographic_score: number;
  behavioral_score: number;    // TODO: OMNICHANNEL - Currently limited/mock
  engagement_score: number;     // TODO: OMNICHANNEL - Currently limited/mock
  fit_score: number;
  grade: LeadGrade;
  temperature: LeadTemperature;
  scoring_date: Date | string;
  factors: IScoringFactor[];
  recommendations: string[];
}

// Scoring Factor
export interface IScoringFactor {
  category: 'demographic' | 'behavioral' | 'engagement' | 'fit';
  name: string;
  value: number;
  max_value: number;
  weight: number;
  description?: string;
}

// Lead Engagement (currently mock)
// TODO: OMNICHANNEL - Replace with real engagement data
export interface ILeadEngagement {
  lead_id: number;
  email_opens: number;
  email_clicks: number;
  website_visits: number;
  page_views: number;
  form_submissions: number;
  chat_interactions: number;
  content_downloads: number;
  social_interactions: number;
  last_engagement_date?: Date | string;
  engagement_score: number;
  is_mock_data: boolean;  // TODO: OMNICHANNEL - Remove this flag
}

// Lead Activity
export interface ILeadActivity {
  id: number;
  lead_id: number;
  type: 'call' | 'email' | 'meeting' | 'task' | 'note' | 'status_change' | 'assignment';
  subject: string;
  description?: string;
  status: 'planned' | 'completed' | 'cancelled';
  due_date?: Date | string;
  completed_date?: Date | string;
  created_by: number;
  created_by_name?: string;
  created_at: Date | string;
}

// Lead Duplicate
export interface ILeadDuplicate {
  lead_id: number;
  duplicate_lead_id: number;
  match_score: number;
  match_type: string[];
  match_details: {
    email_match?: boolean;
    phone_match?: boolean;
    name_similarity?: number;
    company_similarity?: number;
  };
}

// Lead Conversion Data
export interface ILeadConversionData {
  lead_id: number;
  create_account: boolean;
  account_name?: string;
  existing_account_id?: number;
  create_contact: boolean;
  contact_role?: string;
  create_opportunity: boolean;
  opportunity_name?: string;
  opportunity_amount?: number;
  opportunity_close_date?: Date | string;
  opportunity_stage?: string;
  transfer_activities: boolean;
  send_notification: boolean;
}

// Lead Filters (for searching/filtering)
export interface ILeadFilters {
  search?: string;
  status?: LeadStatus | LeadStatus[];
  source_id?: number | number[];
  assigned_to?: number | number[];
  score_min?: number;
  score_max?: number;
  grade?: LeadGrade | LeadGrade[];
  temperature?: LeadTemperature | LeadTemperature[];
  authority_level?: string | string[];
  timeline?: string | string[];
  created_from?: Date | string;
  created_to?: Date | string;
  tags?: string[];
  manual_entry?: boolean;        // TODO: OMNICHANNEL - Remove when not needed
  source_verified?: boolean;     // TODO: OMNICHANNEL - Remove when all verified
  has_duplicates?: boolean;
  is_converted?: boolean;
}

// Lead Bulk Action
export interface ILeadBulkAction {
  action: 'assign' | 'update_status' | 'add_tags' | 'remove_tags' | 'delete' | 'merge';
  lead_ids: number[];
  data?: any;
}

// Lead Assignment Rule
export interface ILeadAssignmentRule {
  id: number;
  name: string;
  priority: number;
  criteria: any;
  assignment_type: 'round_robin' | 'load_balance' | 'territory' | 'manual';
  assignee_pool: number[];
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

// Lead Import Data
export interface ILeadImportData {
  file: File;
  mapping: Record<string, string>;
  options: {
    skip_duplicates: boolean;
    update_existing: boolean;
    assign_to?: number;
    add_tags?: string[];
    set_source?: string;
  };
}

// API Response types
export interface ILeadsResponse {
  data: ILead[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ILeadResponse {
  data: ILead;
  success: boolean;
  message?: string;
}

export interface ILeadScoringResponse {
  data: ILeadScoring;
  success: boolean;
  message?: string;
}

export interface ILeadDuplicatesResponse {
  data: ILeadDuplicate[];
  total: number;
  success: boolean;
}

// Form Data types
export interface ILeadFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  job_title?: string;
  source?: string;
  notes?: string;
  // TODO: OMNICHANNEL - Add form_id, landing_page_id when ready
}

// Mock data indicator (remove when OmniChannel ready)
export interface IMockDataIndicator {
  is_mock: boolean;
  mock_reason: string;
  expected_data_source: string;
}

export default {
  // Re-export for convenience
  LeadStatus,
  LeadGrade,
  LeadTemperature
};