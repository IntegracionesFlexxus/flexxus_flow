/**
 * Prediction Interfaces - Sprint 08
 * Core interfaces for ML predictions and recommendations
 */

export interface IPrediction {
  id: string;
  company_id: string;
  model_id: string;
  prediction_type: 'classification' | 'regression' | 'time_series' | 'clustering';
  predictions: any[];
  confidence: number;
  features_used: string[];
  model_version: string;
  metadata?: any;
  created_at: Date;
}

export interface IPredictionModel {
  id: string;
  name: string;
  type: 'classification' | 'regression' | 'time_series' | 'clustering';
  version: string;
  accuracy: number;
  features: string[];
  hyperparameters: any;
  metadata?: any;
}

export interface IPredictionResult {
  model_id: string;
  company_id: string;
  prediction_type: string;
  predictions: IPredictionValue[];
  features_used: string[];
  model_version: string;
  confidence: number;
  metadata?: any;
  timestamp: Date;
}

export interface IPredictionValue {
  timestamp: Date;
  value: number;
  confidence: number;
  lower_bound?: number;
  upper_bound?: number;
  class?: string;
  probabilities?: Record<string, number>;
  unit?: string;
}

export interface IOptimizationRecommendation {
  id: string;
  company_id: string;
  type: 'performance' | 'cost' | 'quality' | 'efficiency';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: {
    metric: string;
    current_value: number;
    expected_improvement: string;
    confidence: number;
  };
  actions: string[];
  estimated_effort: 'low' | 'medium' | 'high';
  estimated_value: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  metadata?: any;
  created_at: Date;
  updated_at?: Date;
}

export interface IModelPerformance {
  model_id: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  auc_roc?: number;
  confusion_matrix?: {
    true_positive: number;
    true_negative: number;
    false_positive: number;
    false_negative: number;
  };
  feature_importance?: Record<string, number>;
  evaluation_date: Date;
}

export interface IForecast {
  metric: string;
  period: {
    start: Date;
    end: Date;
  };
  values: IForecastValue[];
  confidence_interval: {
    lower: number[];
    upper: number[];
  };
  seasonality?: string;
  trend?: 'increasing' | 'decreasing' | 'stable';
  model_used: string;
}

export interface IForecastValue {
  timestamp: Date;
  predicted: number;
  actual?: number;
  error?: number;
  confidence: number;
}

export interface IAnomalyDetection {
  metric: string;
  timestamp: Date;
  value: number;
  expected_range: {
    min: number;
    max: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  possible_causes?: string[];
  recommended_actions?: string[];
}