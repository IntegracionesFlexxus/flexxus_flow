/**
 * Health Scoring Types
 * Sprint 17: Account Health Management
 */

export interface AccountHealthConfig {
  id: number;
  company_id: number;
  config_name: string;
  scoring_weights: ScoringWeights;
  alert_thresholds: AlertThresholds;
  calculation_frequency: CalculationFrequency;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ScoringWeights {
  revenue: number;
  engagement: number;
  relationship: number;
  product_adoption: number;
  support: number;
  [key: string]: number; // Allow custom metrics
}

export interface AlertThresholds {
  critical: number;
  warning: number;
  healthy: number;
}

export type CalculationFrequency = 'real_time' | 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface AccountHealth {
  account_id: number;
  overall_score: number;
  overall_grade: HealthGrade;
  revenue_score: number;
  engagement_score: number;
  relationship_score: number;
  product_adoption_score: number;
  support_score: number;
  risk_factors: string[];
  opportunities: string[];
  trend: HealthTrend;
  last_calculated: Date;
}

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface HealthTrend {
  direction: 'improving' | 'stable' | 'declining';
  change_percentage: number;
  change_points: number;
  period: string; // e.g., '30d', '90d'
}

export interface AccountHealthHistory {
  id: number;
  company_id: number;
  account_id: number;
  overall_score: number;
  overall_grade: HealthGrade;
  revenue_score: number;
  engagement_score: number;
  relationship_score: number;
  product_adoption_score: number;
  support_score: number;
  risk_factors?: string[] | any;
  opportunities?: string[] | any;
  calculated_at: Date;
  created_at: Date;
}

export interface HealthAlert {
  id: number;
  company_id: number;
  account_id: number;
  alert_type: AlertType;
  alert_severity: AlertSeverity;
  alert_message: string;
  current_score?: number;
  previous_score?: number;
  threshold_value?: number;
  is_acknowledged: boolean;
  acknowledged_by?: number;
  acknowledged_at?: Date;
  auto_created: boolean;
  created_at: Date;
}

export type AlertType =
  | 'score_drop'
  | 'at_risk'
  | 'opportunity'
  | 'threshold_breach'
  | 'engagement_decline'
  | 'relationship_gap';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface HealthMetrics {
  // Revenue metrics
  annual_revenue?: number;
  revenue_growth_rate?: number;
  payment_history_score?: number;
  contract_value?: number;
  renewal_probability?: number;

  // Engagement metrics
  last_interaction_days?: number;
  total_interactions_30d?: number;
  email_open_rate?: number;
  meeting_frequency?: number;
  product_usage_score?: number;

  // Relationship metrics
  total_contacts?: number;
  decision_maker_coverage?: number;
  champion_identified?: boolean;
  relationship_strength?: number;
  stakeholder_engagement?: number;

  // Product metrics
  feature_adoption_rate?: number;
  active_users?: number;
  usage_frequency?: number;
  integration_count?: number;

  // Support metrics
  open_tickets?: number;
  ticket_resolution_time?: number;
  satisfaction_score?: number;
  escalation_count?: number;
}

export interface HealthScoreRequest {
  account_id: number;
  force_recalculation?: boolean;
  include_history?: boolean;
  include_metrics?: boolean;
}

export interface HealthScoreResponse {
  health: AccountHealth;
  metrics?: HealthMetrics;
  history?: AccountHealthHistory[];
  recommendations?: HealthRecommendation[];
}

export interface HealthRecommendation {
  type: 'action' | 'warning' | 'opportunity';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggested_action?: string;
  expected_impact?: string;
  due_date?: Date;
}

export interface BatchHealthCalculation {
  account_ids: number[];
  priority?: 'high' | 'normal' | 'low';
  callback_url?: string;
}

export interface HealthDashboard {
  company_id: number;
  total_accounts: number;
  average_health_score: number;
  health_distribution: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  };
  at_risk_accounts: number;
  improving_accounts: number;
  declining_accounts: number;
  alerts_pending: number;
  last_updated: Date;
}