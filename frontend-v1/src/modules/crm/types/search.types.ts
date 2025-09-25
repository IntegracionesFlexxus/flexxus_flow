/**
 * Advanced Search Types - Sprint 17
 * Types for advanced search functionality
 */

export interface SearchQuery {
  text_query?: string;
  entity_types?: EntityType[];
  filters?: SearchFilters;
  facets?: string[];
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  include_suggestions?: boolean;
}

export interface SearchFilters {
  // Account filters
  account_type?: string[];
  account_tier?: string[];
  industry?: string[];
  territory?: number[];
  health_score?: {
    min: number;
    max: number;
  };
  health_grade?: string[];
  revenue?: {
    min: number;
    max: number;
  };
  employee_count?: {
    min: number;
    max: number;
  };

  // Contact filters
  job_title?: string;
  department?: string[];
  seniority?: string[];
  influence_score?: {
    min: number;
    max: number;
  };
  has_role?: boolean;

  // Common filters
  owner_id?: number[];
  created_date?: {
    from: string;
    to: string;
  };
  modified_date?: {
    from: string;
    to: string;
  };
  tags?: string[];
  country?: string[];
  state?: string[];
  city?: string[];
}

export interface SearchResult {
  query: string;
  total_results: number;
  search_time: number;
  page: number;
  limit: number;

  results: SearchResultItem[];
  facets?: SearchFacets;
  suggestions?: SearchSuggestion[];
  related_searches?: string[];
}

export interface SearchResultItem {
  id: string;
  entity_type: EntityType;
  entity_id: number;
  title: string;
  subtitle?: string;
  description?: string;

  // Relevance and scoring
  relevance_score: number;
  matched_fields: string[];
  highlights?: Record<string, string[]>;

  // Entity-specific data
  data: Record<string, any>;

  // Additional metadata
  owner?: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface SearchFacets {
  entity_types: FacetItem[];
  industries?: FacetItem[];
  account_types?: FacetItem[];
  territories?: FacetItem[];
  health_grades?: FacetItem[];
  departments?: FacetItem[];
  owners?: FacetItem[];
}

export interface FacetItem {
  value: string;
  label: string;
  count: number;
  selected?: boolean;
}

export interface SearchSuggestion {
  text: string;
  type: SuggestionType;
  confidence: number;
  entity_type?: EntityType;
  entity_id?: number;
}

export interface SavedSearch {
  id: number;
  company_id: number;
  user_id: number;
  name: string;
  description?: string;
  query: SearchQuery;
  is_shared: boolean;
  notification_enabled: boolean;
  last_run_at?: string;
  run_count: number;
  created_at: string;
  updated_at: string;
}

export interface SearchHistory {
  id: number;
  user_id: number;
  query: string;
  filters?: SearchFilters;
  result_count: number;
  clicked_results: number[];
  search_time: number;
  created_at: string;
}

export interface SearchAnalytics {
  period: string;
  total_searches: number;
  unique_users: number;
  avg_search_time: number;
  avg_results_per_search: number;
  zero_result_searches: number;

  popular_terms: {
    term: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }[];

  popular_filters: {
    filter: string;
    count: number;
  }[];

  conversion_rate: number;
}

export type EntityType = 'account' | 'contact' | 'lead' | 'opportunity';

export type SuggestionType =
  | 'correction'
  | 'completion'
  | 'entity'
  | 'recent'
  | 'popular';

export interface QuickSearchRequest {
  query: string;
  limit?: number;
  entity_types?: EntityType[];
}