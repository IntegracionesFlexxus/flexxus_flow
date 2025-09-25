/**
 * Account Health Types - Sprint 17
 * Types for account health scoring and metrics
 */

export interface AccountHealthScore {
  account_id: number;
  overall_score: number;
  overall_grade: HealthGrade;

  // Individual scores (0-100)
  revenue_score: number;
  engagement_score: number;
  relationship_score: number;
  product_adoption_score: number;
  support_score: number;

  // Trend and analysis
  trend: HealthTrend;
  risk_factors: string[];
  opportunities: string[];
  recommendations: string[];

  // Metadata
  calculated_at: string;
  next_review_date: string;
}

export interface HealthHistory {
  date: string;
  score: number;
  grade: HealthGrade;
  trend: HealthTrend;
}

export interface HealthAlert {
  id: number;
  account_id: number;
  account_name: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  message: string;
  threshold_violated?: string;
  metric_value?: number;
  recommended_action?: string;
  status: AlertStatus;
  created_at: string;
  resolved_at?: string;
}

export interface HealthMetrics {
  total_accounts: number;
  average_score: number;
  at_risk_accounts: number;
  healthy_accounts: number;
  trending_up: number;
  trending_down: number;
  distribution: {
    grade: HealthGrade;
    count: number;
    percentage: number;
  }[];
}

export interface ScoringWeights {
  revenue: number;
  engagement: number;
  relationship: number;
  product_adoption: number;
  support: number;
}

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export type HealthTrend = 'improving' | 'stable' | 'declining';

export type AlertType =
  | 'score_drop'
  | 'threshold_breach'
  | 'engagement_decline'
  | 'churn_risk'
  | 'opportunity';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AlertStatus = 'new' | 'acknowledged' | 'in_progress' | 'resolved';

export interface BulkHealthCalculationRequest {
  account_ids?: number[];
  force_recalculation?: boolean;
}

export interface BulkHealthCalculationResult {
  success_count: number;
  error_count: number;
  errors?: {
    account_id: number;
    error: string;
  }[];
}