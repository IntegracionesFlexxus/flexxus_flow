/**
 * Opportunity Types - Sprint 15
 * Multi-tenant opportunity/pipeline management types
 */

export interface Opportunity {
  id: number;
  company_id: number;

  // Basic Information
  name: string;
  account_id: number;
  account?: Account;
  account_name?: string;

  // Financial
  amount: number;
  expected_revenue?: number;
  probability?: number;

  // Stage & Pipeline
  stage_id: number;
  stage?: OpportunityStage;
  type?: OpportunityType;

  // Dates
  close_date: string;
  closed_at?: string;

  // Relationships
  lead_source_id?: number;
  contact_id?: number;
  contact?: Contact;

  // Competition
  main_competitor?: string;
  competitor_analysis?: string;

  // Assignment
  owner_id: number;
  owner?: UserInfo;
  owner_name?: string;
  owner_avatar?: string;

  // Description
  description?: string;
  next_steps?: string;

  // Win/Loss
  is_won?: boolean;
  won_reason?: string;
  lost_reason?: string;

  // Forecast
  forecast_category?: ForecastCategory;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

export interface OpportunityStage {
  id: number;
  name: string;
  probability: number;
  order_index: number;
  is_won?: boolean;
  is_lost?: boolean;
  opportunity_count?: number;
  total_amount?: number;
}

export type OpportunityType =
  | 'new_business'
  | 'existing_business'
  | 'renewal';

export type ForecastCategory =
  | 'pipeline'
  | 'best_case'
  | 'commit'
  | 'closed';

export interface OpportunityFormData extends Partial<Omit<Opportunity, 'id' | 'company_id' | 'created_at' | 'updated_at'>> {}

export interface OpportunityFilters {
  stage_id?: number;
  account_id?: number;
  owner_id?: number;
  type?: OpportunityType;
  forecast_category?: ForecastCategory;
  amount_min?: number;
  amount_max?: number;
  close_date_from?: string;
  close_date_to?: string;
  is_won?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PipelineData {
  stages: OpportunityStage[];
  opportunities: Opportunity[];
  metrics: PipelineMetrics;
}

export interface PipelineMetrics {
  total_opportunities: number;
  total_value: number;
  avg_deal_size: number;
  win_rate: number;
  avg_sales_cycle: number;
  by_stage: Array<{
    stage_id: number;
    stage_name: string;
    count: number;
    value: number;
    avg_probability: number;
  }>;
}

export interface ForecastData {
  period: string;
  pipeline: number;
  best_case: number;
  commit: number;
  closed: number;
  quota?: number;
  achievement_percentage?: number;
}

export interface WinLossAnalysis {
  total_won: number;
  total_lost: number;
  win_rate: number;
  avg_won_amount: number;
  avg_lost_amount: number;
  top_win_reasons: Array<{ reason: string; count: number }>;
  top_loss_reasons: Array<{ reason: string; count: number }>;
}

// Import types from other files
import type { Account } from './account.types';
import type { Contact } from './contact.types';

export interface UserInfo {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}