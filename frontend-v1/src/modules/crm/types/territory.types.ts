/**
 * Territory Management Types - Sprint 17
 * Types for territory management and assignment
 */

export interface Territory {
  id: number;
  company_id: number;
  name: string;
  code: string;
  type: TerritoryType;
  status: TerritoryStatus;

  // Hierarchy
  parent_territory_id?: number;
  parent_territory?: Territory;
  child_territories?: Territory[];

  // Coverage
  coverage_area?: CoverageArea;
  rules?: TerritoryRules;

  // Assignment
  owner_id?: number;
  owner?: {
    id: number;
    name: string;
    email: string;
  };

  // Performance
  performance_targets?: PerformanceTargets;
  current_metrics?: TerritoryMetrics;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

export interface TerritoryAssignment {
  id: number;
  company_id: number;
  territory_id: number;
  account_id: number;
  assigned_by: number;
  assigned_at: string;
  reason?: string;
  status: AssignmentStatus;
  effective_from: string;
  effective_to?: string;
}

export interface TerritoryRules {
  countries?: string[];
  states?: string[];
  cities?: string[];
  postal_codes?: string[];
  industries?: string[];
  account_tiers?: string[];
  revenue_range?: {
    min: number;
    max: number;
  };
  employee_range?: {
    min: number;
    max: number;
  };
}

export interface CoverageArea {
  type: 'geographic' | 'industry' | 'account_based' | 'hybrid';
  geographic?: {
    countries: string[];
    states?: string[];
    cities?: string[];
  };
  industries?: string[];
  named_accounts?: number[];
}

export interface PerformanceTargets {
  revenue_target?: number;
  account_count_target?: number;
  opportunity_target?: number;
  activity_target?: number;
  conversion_rate_target?: number;
}

export interface TerritoryMetrics {
  total_accounts: number;
  active_accounts: number;
  total_revenue: number;
  pipeline_value: number;
  opportunity_count: number;
  activity_count: number;
  conversion_rate: number;
  average_deal_size: number;
  coverage_percentage: number;
  performance_score: number;
}

export interface TerritoryPerformance {
  territory_id: number;
  territory_name: string;
  period: string;
  metrics: TerritoryMetrics;
  target_achievement: {
    revenue: number;
    accounts: number;
    opportunities: number;
    overall: number;
  };
  trend: 'up' | 'down' | 'stable';
  ranking?: number;
}

export interface TerritoryRebalanceRequest {
  territory_ids?: number[];
  strategy: RebalanceStrategy;
  max_accounts_per_territory?: number;
  min_accounts_per_territory?: number;
  preserve_relationships?: boolean;
}

export interface TerritoryRebalanceResult {
  territories_affected: number;
  accounts_reassigned: number;
  changes: {
    account_id: number;
    from_territory_id: number;
    to_territory_id: number;
    reason: string;
  }[];
}

export type TerritoryType =
  | 'geographic'
  | 'industry'
  | 'account_based'
  | 'hybrid';

export type TerritoryStatus =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'archived';

export type AssignmentStatus =
  | 'active'
  | 'pending'
  | 'expired'
  | 'revoked';

export type RebalanceStrategy =
  | 'equal_distribution'
  | 'revenue_based'
  | 'workload_based'
  | 'geographic_proximity';