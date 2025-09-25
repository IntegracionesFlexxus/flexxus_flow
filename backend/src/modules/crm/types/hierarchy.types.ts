/**
 * Hierarchy Types
 * Sprint 17: Account Hierarchy Management
 */

export interface HierarchyType {
  id: number;
  company_id: number;
  type_code: string;
  type_name: string;
  description?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AccountHierarchy {
  id: number;
  company_id: number;
  parent_account_id: number;
  child_account_id: number;
  hierarchy_type_id?: number;
  ownership_percentage?: number;
  relationship_strength?: 'strong' | 'moderate' | 'weak';
  valid_from: Date;
  valid_to?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: number;
}

export interface HierarchyNode {
  account_id: number;
  account_name?: string;
  parent_account_id?: number;
  level: number;
  path: string;
  children?: HierarchyNode[];
  metadata?: {
    ownership_percentage?: number;
    relationship_strength?: string;
    total_subsidiaries?: number;
    total_revenue?: number;
  };
}

export interface HierarchyMetrics {
  totalSubsidiaries: number;
  totalRevenue: number;
  totalEmployees: number;
  hierarchyDepth: number;
  directChildren: number;
  indirectChildren: number;
}

export interface AccountRollupCache {
  id: number;
  company_id: number;
  account_id: number;
  metric_type: 'total_revenue' | 'total_employees' | 'total_opportunities' | string;
  metric_value: number;
  calculation_date: Date;
  created_at: Date;
}

export interface CreateHierarchyDto {
  parent_account_id: number;
  child_account_id: number;
  hierarchy_type?: string;
  ownership_percentage?: number;
  relationship_strength?: 'strong' | 'moderate' | 'weak';
}

export interface UpdateHierarchyDto {
  ownership_percentage?: number;
  relationship_strength?: 'strong' | 'moderate' | 'weak';
  valid_to?: Date;
  is_active?: boolean;
}

export interface HierarchyValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  circular_reference_detected: boolean;
  max_depth_exceeded: boolean;
  affected_accounts: number[];
}

export type HierarchyDirection = 'up' | 'down' | 'both';

export interface HierarchyQueryOptions {
  direction?: HierarchyDirection;
  max_depth?: number;
  include_inactive?: boolean;
  include_metrics?: boolean;
  as_of_date?: Date;
}