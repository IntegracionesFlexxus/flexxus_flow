/**
 * Opportunity Types and DTOs
 */

import { CRMBaseEntity } from '../repositories/CRMBaseRepository';
import { 
  OpportunityStatus,
  OpportunityType,
  ForecastCategory,
  CustomFields,
  BaseFilter,
  DateRangeFilter
} from './crm.types';

// Opportunity entity
export interface Opportunity extends CRMBaseEntity {
  // Basic Information
  name: string;
  opportunity_number?: string;
  type?: OpportunityType;
  
  // Relationships
  account_id: number;
  primary_contact_id?: number;
  
  // Sales Information
  stage_id: number;
  amount?: number;
  probability?: number;
  close_date?: Date;
  
  // Lead Source
  lead_source_id?: number;
  campaign_id?: number;
  
  // Competition
  competitors?: string[];
  
  // Owner
  owner_id: number;
  
  // Status
  status: OpportunityStatus;
  lost_reason?: string;
  
  // Forecast
  forecast_category?: ForecastCategory;
  
  // Metadata
  description?: string;
  next_step?: string;
  tags?: string[];
  custom_fields?: CustomFields;
}

// DTOs
export interface OpportunityCreateDTO {
  company_id: number;
  name: string;
  type?: OpportunityType;
  account_id: number;
  primary_contact_id?: number;
  stage_id: number;
  amount?: number;
  probability?: number;
  close_date?: Date;
  lead_source_id?: number;
  campaign_id?: number;
  competitors?: string[];
  owner_id: number;
  forecast_category?: ForecastCategory;
  description?: string;
  next_step?: string;
  tags?: string[];
  custom_fields?: CustomFields;
}

export interface OpportunityUpdateDTO {
  name?: string;
  type?: OpportunityType;
  primary_contact_id?: number;
  stage_id?: number;
  amount?: number;
  probability?: number;
  close_date?: Date;
  lead_source_id?: number;
  campaign_id?: number;
  competitors?: string[];
  owner_id?: number;
  status?: OpportunityStatus;
  lost_reason?: string;
  forecast_category?: ForecastCategory;
  description?: string;
  next_step?: string;
  tags?: string[];
  custom_fields?: CustomFields;
}

// Stage update specific DTO
export interface OpportunityStageUpdateDTO {
  stage_id: number;
  probability?: number;
  next_step?: string;
  notes?: string;
}

// Filter interface
export interface OpportunityFilter extends BaseFilter {
  status?: OpportunityStatus;
  stage_id?: number;
  owner_id?: number;
  account_id?: number;
  type?: OpportunityType;
  forecast_category?: ForecastCategory;
  minAmount?: number;
  maxAmount?: number;
  closeDateRange?: DateRangeFilter;
  lead_source_id?: number;
  tags?: string[];
}

// Opportunity with related data
export interface OpportunityWithDetails extends Opportunity {
  account_name: string;
  contact_name?: string;
  owner_name: string;
  stage_name: string;
  stage_probability: number;
  lead_source_name?: string;
  products?: OpportunityProduct[];
}

// Pipeline stage data
export interface PipelineStage {
  stage_id: number;
  stage_name: string;
  order_position: number;
  probability: number;
  opportunity_count: number;
  total_amount: number;
  weighted_amount: number;
  opportunities?: OpportunityWithDetails[];
}

// Pipeline metrics
export interface PipelineMetrics {
  stages: PipelineStage[];
  total_opportunities: number;
  total_value: number;
  weighted_value: number;
  average_deal_size: number;
  conversion_rate: number;
  average_sales_cycle: number;
}

// Forecast data
export interface ForecastData {
  period: string;
  forecast_category: ForecastCategory;
  count: number;
  total: number;
  weighted_total: number;
  avg_probability: number;
}

// Opportunity product (line item)
export interface OpportunityProduct {
  id: number;
  opportunity_id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  total_price: number;
}

// Win/Loss analysis
export interface WinLossAnalysis {
  period: string;
  won_count: number;
  won_value: number;
  lost_count: number;
  lost_value: number;
  win_rate: number;
  top_lost_reasons: {
    reason: string;
    count: number;
    value: number;
  }[];
}

// Pipeline data - complete structure for frontend
export interface PipelineData {
  stages: PipelineStage[];
  opportunities: OpportunityWithDetails[];
  metrics: PipelineMetrics;
  filters?: OpportunityFilter;
  timestamp: Date;
}