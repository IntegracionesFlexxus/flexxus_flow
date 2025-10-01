/**
 * Prediction Types - Sprint 12
 * Type definitions for predictive analytics and forecasting
 */

export enum BehaviorPredictionType {
  CHURN_RISK = 'churn_risk',
  NEXT_PURCHASE = 'next_purchase',
  ENGAGEMENT_LEVEL = 'engagement_level',
  SATISFACTION_SCORE = 'satisfaction_score',
  SUPPORT_NEED = 'support_need',
  UPGRADE_LIKELIHOOD = 'upgrade_likelihood',
  RECOMMENDATION_PREFERENCE = 'recommendation_preference'
}

export enum AnomalyType {
  STATISTICAL = 'statistical',
  BEHAVIORAL = 'behavioral',
  TEMPORAL = 'temporal',
  NETWORK = 'network',
  SECURITY = 'security',
  PERFORMANCE = 'performance'
}

export enum AnomalySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum DocumentType {
  INVOICE = 'invoice',
  CONTRACT = 'contract',
  RECEIPT = 'receipt',
  FORM = 'form',
  RESUME = 'resume',
  REPORT = 'report',
  EMAIL = 'email',
  OTHER = 'other'
}

export enum ProcessingStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface PredictionValue {
  prediction: any;
  confidence: number;
  probability_distribution?: Record<string, number>;
  explanation?: string;
  contributing_factors?: Array<{
    feature: string;
    contribution: number;
    value: any;
  }>;
}

export interface ChurnPrediction {
  churn_probability: number;
  churn_risk_level: 'low' | 'medium' | 'high';
  days_until_churn?: number;
  retention_recommendations?: string[];
  key_indicators: Record<string, any>;
}

export interface NextPurchasePrediction {
  product_category?: string;
  predicted_products?: Array<{
    product_id: string;
    probability: number;
    confidence: number;
  }>;
  days_until_purchase?: number;
  estimated_value?: number;
}

export interface AnomalyFeatures {
  feature_values: Record<string, any>;
  expected_values: Record<string, any>;
  deviations: Record<string, number>;
  threshold_violations: string[];
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  confidence_level: number;
}

export interface ForecastFactors {
  seasonal_component?: number;
  trend_component?: number;
  cyclical_component?: number;
  irregular_component?: number;
  external_factors?: Record<string, number>;
}

export interface DocumentExtraction {
  text_content?: string;
  structured_data?: Record<string, any>;
  entities?: Array<{
    entity_type: string;
    entity_value: string;
    confidence: number;
  }>;
  tables?: Array<{
    headers: string[];
    rows: any[][];
  }>;
  metadata?: Record<string, any>;
}

export interface VoiceEmotions {
  anger?: number;
  joy?: number;
  sadness?: number;
  fear?: number;
  surprise?: number;
  disgust?: number;
  neutral?: number;
  [emotion: string]: number | undefined;
}

export interface VoiceSentiment {
  overall_sentiment: 'positive' | 'neutral' | 'negative';
  sentiment_score: number;
  sentiment_by_speaker?: Record<string, number>;
}

export interface PauseAnalysis {
  total_pauses: number;
  avg_pause_duration_ms: number;
  significant_pauses: Array<{
    timestamp_ms: number;
    duration_ms: number;
  }>;
}
