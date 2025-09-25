/**
 * Account Hierarchy Types - Sprint 17
 * Types for account hierarchy management
 */

export interface HierarchyNode {
  account_id: number;
  account_name: string;
  account_type?: string;
  level: number;
  path: number[];

  // Metrics
  revenue?: number;
  employee_count?: number;
  opportunity_count?: number;
  health_score?: number;
  health_grade?: string;

  // Relationships
  parent_id?: number;
  parent_name?: string;
  children?: HierarchyNode[];
  children_count: number;

  // Ownership info
  ownership_percentage?: number;
  relationship_strength?: number;
  is_primary?: boolean;
}

export interface HierarchyRelation {
  id: number;
  company_id: number;
  parent_account_id: number;
  child_account_id: number;
  hierarchy_type: HierarchyType;
  ownership_percentage?: number;
  relationship_strength: number;
  is_primary: boolean;
  valid_from?: string;
  valid_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface HierarchyMetrics {
  total_subsidiaries: number;
  total_revenue: number;
  total_employees: number;
  total_opportunities: number;
  hierarchy_depth: number;
  avg_health_score: number;
  at_risk_subsidiaries: number;
}

export interface CreateHierarchyDto {
  parent_account_id: number;
  child_account_id: number;
  hierarchy_type: HierarchyType;
  ownership_percentage?: number;
  relationship_strength?: number;
  notes?: string;
}

export interface UpdateHierarchyDto {
  hierarchy_type?: HierarchyType;
  ownership_percentage?: number;
  relationship_strength?: number;
  is_primary?: boolean;
  notes?: string;
}

export type HierarchyType =
  | 'parent_company'
  | 'subsidiary'
  | 'division'
  | 'branch'
  | 'affiliate'
  | 'partner';

export type HierarchyDirection = 'up' | 'down' | 'both';

export interface HierarchyTreeRequest {
  account_id: number;
  direction?: HierarchyDirection;
  max_depth?: number;
  include_metrics?: boolean;
}

export interface HierarchyVisualizationData {
  nodes: HierarchyNode[];
  edges: {
    source: number;
    target: number;
    relationship: HierarchyType;
    strength: number;
  }[];
  metrics: HierarchyMetrics;
}