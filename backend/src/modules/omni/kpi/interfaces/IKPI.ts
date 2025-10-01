/**
 * KPI Interfaces - Sprint 08
 * Core interfaces for KPI tracking and management
 */

export interface IKPI {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  type: 'metric' | 'calculated' | 'aggregated' | 'composite';
  formula?: string;
  target_value: number;
  current_value: number;
  unit: 'number' | 'percentage' | 'currency' | 'time' | 'custom';
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  category: 'operational' | 'strategic' | 'financial' | 'customer' | 'process';
  data_source: 'analytics' | 'database' | 'api' | 'manual';
  is_active: boolean;
  priority?: number;
  target_date?: Date;
  last_calculated_at?: Date;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

export interface IKPIGoal {
  kpi_id: string;
  target_value: number;
  target_date: Date;
  current_value: number;
  progress_percentage: number;
  is_achieved: boolean;
  description?: string;
  strategy?: string;
  milestones?: IKPIMilestone[];
}

export interface IKPIMilestone {
  date: Date;
  target_value: number;
  description: string;
  is_achieved: boolean;
}

export interface IKPIHistory {
  id: string;
  kpi_id: string;
  value: number;
  timestamp: Date;
  breakdown?: any;
  metadata?: any;
}

export interface IKPICalculation {
  kpi_id: string;
  value: number;
  timestamp: Date;
  breakdown?: any;
  trend?: 'improving' | 'stable' | 'declining';
  goal_progress?: number;
}

export interface IKPIAlert {
  kpi_id: string;
  type: 'info' | 'warning' | 'critical' | 'success';
  message: string;
  threshold: number;
  actual_value: number;
  timestamp: Date;
  metadata?: any;
}

export interface IKPIDashboard {
  id: string;
  company_id: string;
  name: string;
  kpis: string[];
  layout: IKPILayout[];
  refresh_interval: number;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface IKPILayout {
  kpi_id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  visualization_type: 'number' | 'gauge' | 'chart' | 'table';
  options?: any;
}

export interface IKPIComparison {
  period: string;
  kpis: IKPIComparisonItem[];
  summary: IKPIComparisonSummary;
}

export interface IKPIComparisonItem {
  kpi_id: string;
  name: string;
  current_value: number;
  previous_value: number;
  change_percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface IKPIComparisonSummary {
  total_kpis: number;
  improving: number;
  declining: number;
  stable: number;
  average_change: number;
}