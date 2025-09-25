/**
 * Pipeline Management Types
 * Sprint 18 - Complete type definitions
 */

export type PipelineType = 'sales' | 'partnership' | 'renewal';
export type OpportunityStatus = 'open' | 'won' | 'lost';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type ForecastCategory = 'commit' | 'best_case' | 'pipeline' | 'omitted';
export type CommitStatus = 'committed' | 'likely' | 'possible' | 'unlikely';
export type WinLossOutcome = 'won' | 'lost' | 'no_decision';

export interface Pipeline {
  pipeline_id: number;
  company_id: number;
  name: string;
  description?: string;
  pipeline_type: PipelineType;
  is_default: boolean;
  is_active: boolean;
  currency_code: string;
  settings?: Record<string, any>;
  stages?: PipelineStage[];
  metrics?: PipelineMetrics;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  stage_id: number;
  company_id: number;
  pipeline_id: number;
  name: string;
  description?: string;
  stage_order: number;
  win_probability: number;
  expected_duration_days: number;
  is_closed: boolean;
  is_won: boolean;
  stage_color?: string;
  entry_criteria?: Record<string, any>;
  exit_criteria?: Record<string, any>;
  automation_rules?: Record<string, any>;
  created_at: string;
}

export interface OpportunityExtended {
  id: string;
  company_id: number;
  name: string;
  account_id?: string;
  amount: number;
  probability: number;
  status: OpportunityStatus;
  pipeline_id?: number;
  stage_id?: number;
  weighted_amount: number;
  expected_close_date?: string;
  actual_close_date?: string;
  health_score?: number;
  engagement_score?: number;
  priority: Priority;
  deal_type?: string;
  owner_id?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  last_activity_date?: string;
  days_in_stage?: number;
  stakeholders?: OpportunityStakeholder[];
  products?: OpportunityProduct[];
  account?: {
    id: string;
    name: string;
    industry?: string;
  };
}

export interface OpportunityStakeholder {
  stakeholder_id: number;
  company_id: number;
  opportunity_id: string;
  contact_id: string;
  role: string;
  influence_level: 'high' | 'medium' | 'low';
  stance: 'champion' | 'supporter' | 'neutral' | 'opponent' | 'blocker';
  notes?: string;
  contact?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
}

export interface OpportunityProduct {
  opportunity_product_id: number;
  opportunity_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  total_price: number;
  product?: {
    id: string;
    name: string;
    category?: string;
  };
}

export interface PipelineMetrics {
  pipeline_id: number;
  company_id: number;
  metric_date: string;
  total_opportunities: number;
  total_value: number;
  weighted_value: number;
  win_rate: number;
  avg_deal_size: number;
  avg_sales_cycle: number;
  velocity_rate: number;
  conversion_rate: number;
  stage_metrics?: StageMetric[];
}

export interface StageMetric {
  stage_id: number;
  stage_name: string;
  opportunities_count: number;
  total_value: number;
  avg_time_in_stage: number;
  conversion_rate: number;
  bottleneck_score?: number;
}

export interface ForecastPeriod {
  period_id: number;
  company_id: number;
  name: string;
  start_date: string;
  end_date: string;
  period_type: 'month' | 'quarter' | 'year';
  is_active: boolean;
  target_amount?: number;
  created_at: string;
}

export interface ForecastSnapshot {
  snapshot_id: number;
  company_id: number;
  period_id: number;
  opportunity_id: string;
  snapshot_date: string;
  amount: number;
  probability: number;
  expected_close_date: string;
  forecast_category: ForecastCategory;
  commit_status: CommitStatus;
  notes?: string;
  created_by?: string;
}

export interface ForecastAccuracy {
  accuracy_id: number;
  company_id: number;
  period_id: number;
  forecast_amount: number;
  actual_amount: number;
  variance: number;
  accuracy_percentage: number;
  calculation_date: string;
}

export interface WinLossAnalysis {
  analysis_id: number;
  company_id: number;
  opportunity_id: string;
  analysis_date: string;
  outcome: WinLossOutcome;
  primary_reason: string;
  secondary_reasons?: string[];
  competitor_won?: string;
  competitors_involved?: string[];
  lessons_learned?: string;
  improvement_areas?: string[];
  created_by?: string;
}

export interface WinLossPattern {
  pattern_id: number;
  company_id: number;
  pattern_type: string;
  pattern_description: string;
  occurrence_count: number;
  impact_score: number;
  recommendations?: string[];
  identified_date: string;
}

export interface PipelineTemplate {
  template_id: number;
  name: string;
  description?: string;
  industry?: string;
  company_size?: string;
  pipeline_type: PipelineType;
  stages: Omit<PipelineStage, 'stage_id' | 'company_id' | 'pipeline_id' | 'created_at'>[];
  is_public: boolean;
  created_by?: string;
}

export interface PipelinePermission {
  permission_id: number;
  company_id: number;
  pipeline_id: number;
  user_id?: string;
  team_id?: string;
  permission_level: 'view' | 'edit' | 'admin';
  created_at: string;
}

export interface StageHistory {
  history_id: number;
  company_id: number;
  opportunity_id: string;
  from_stage_id?: number;
  to_stage_id: number;
  change_date: string;
  days_in_previous_stage?: number;
  probability_change?: number;
  amount_change?: number;
  changed_by?: string;
  notes?: string;
}

export interface Bottleneck {
  stage_id: number;
  stage_name: string;
  avg_time_in_stage: number;
  opportunities_stuck: number;
  bottleneck_score: number;
  recommendations?: string[];
}

export interface PipelineFilters {
  pipeline_id?: number;
  stage_ids?: number[];
  owner_ids?: string[];
  priority?: Priority[];
  min_amount?: number;
  max_amount?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  status?: OpportunityStatus[];
}

export interface DragDropResult {
  opportunity_id: string;
  source_stage_id: number;
  destination_stage_id: number;
  new_order?: number;
}

export interface PipelineVelocity {
  stage_id: number;
  stage_name: string;
  inflow: number;
  outflow: number;
  velocity: number;
  avg_duration: number;
}

export interface SnapshotData {
  period_id: number;
  opportunity_id: string;
  amount: number;
  forecast_category: ForecastCategory;
  commit_status: CommitStatus;
  notes?: string;
}

export interface ForecastData {
  forecast_category: ForecastCategory;
  commit_status: CommitStatus;
  expected_close_date: string;
  notes?: string;
}

export interface ExportOptions {
  format: 'excel' | 'pdf' | 'csv';
  include_charts?: boolean;
  date_range?: {
    from: string;
    to: string;
  };
  filters?: PipelineFilters;
}