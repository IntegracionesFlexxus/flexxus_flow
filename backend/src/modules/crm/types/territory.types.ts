/**
 * Territory Types
 * Sprint 17: Territory Management System
 */

export interface Territory {
  id: number;
  company_id: number;
  territory_code: string;
  territory_name: string;
  territory_type: TerritoryType;
  parent_territory_id?: number;
  coverage_rules?: TerritoryRules;
  performance_targets?: PerformanceTargets;
  metadata?: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type TerritoryType = 'geographic' | 'industry' | 'account_based' | 'hybrid';

export interface TerritoryRules {
  // Geographic rules
  countries?: string[];
  states?: string[];
  cities?: string[];
  postal_codes?: string[];

  // Industry rules
  industries?: string[];
  sub_industries?: string[];

  // Account-based rules
  account_tiers?: string[];
  revenue_range?: {
    min: number;
    max: number;
  };
  employee_range?: {
    min: number;
    max: number;
  };

  // Custom rules
  custom_criteria?: Record<string, any>;
}

export interface PerformanceTargets {
  revenue_target?: number;
  new_accounts_target?: number;
  retention_target?: number;
  max_accounts?: number;
  min_accounts?: number;
  custom_targets?: Record<string, number>;
}

export interface TerritoryAssignment {
  id: number;
  company_id: number;
  territory_id: number;
  user_id: number;
  role: TerritoryRole;
  assignment_percentage: number;
  start_date: Date;
  end_date?: Date;
  is_primary: boolean;
  created_at: Date;
  updated_at: Date;
}

export type TerritoryRole = 'manager' | 'rep' | 'support' | 'specialist';

export interface TerritoryGeographicCoverage {
  id: number;
  territory_id: number;
  country_code?: string;
  state_province?: string;
  city?: string;
  postal_code_pattern?: string;
  created_at: Date;
}

export interface TerritoryIndustryCoverage {
  id: number;
  territory_id: number;
  industry_code?: string;
  sub_industry_code?: string;
  created_at: Date;
}

export interface TerritoryMetrics {
  territory_id: number;
  total_accounts: number;
  total_revenue: number;
  average_account_health: number;
  assigned_users: number;
  coverage_percentage: number;
  performance_score: number;
  opportunities_in_pipeline: number;
  conversion_rate: number;
  average_deal_size: number;
}

export interface TerritoryBalance {
  territory_id: number;
  territory_name: string;
  workload_score: number;
  is_overloaded: boolean;
  is_underutilized: boolean;
  recommended_actions: string[];
  accounts_to_reassign?: number[];
}

export interface CreateTerritoryDto {
  territory_code: string;
  territory_name: string;
  territory_type: TerritoryType;
  parent_territory_id?: number;
  coverage_rules?: TerritoryRules;
  performance_targets?: PerformanceTargets;
  metadata?: Record<string, any>;
}

export interface UpdateTerritoryDto {
  territory_name?: string;
  parent_territory_id?: number;
  coverage_rules?: TerritoryRules;
  performance_targets?: PerformanceTargets;
  metadata?: Record<string, any>;
  is_active?: boolean;
}

export interface AssignUserToTerritoryDto {
  user_id: number;
  role: TerritoryRole;
  assignment_percentage?: number;
  is_primary?: boolean;
  start_date?: Date;
}

export interface TerritoryRebalanceRequest {
  territory_ids?: number[];
  rebalance_strategy: 'equal_distribution' | 'performance_based' | 'geographic' | 'custom';
  max_accounts_per_rep?: number;
  min_accounts_per_rep?: number;
  custom_rules?: Record<string, any>;
}

export interface TerritoryRebalanceResult {
  territories_affected: number;
  accounts_reassigned: number;
  users_affected: number;
  new_assignments: Array<{
    account_id: number;
    from_territory_id: number;
    to_territory_id: number;
    reason: string;
  }>;
  estimated_improvement: number;
}