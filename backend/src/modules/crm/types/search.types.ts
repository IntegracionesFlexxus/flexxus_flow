/**
 * Search Types
 * Sprint 17: Advanced Search System
 */

export interface SearchQuery {
  text_query?: string;
  entity_types?: SearchEntityType[];
  filters?: SearchFilters;
  sort?: SearchSort;
  page?: number;
  limit?: number;
  include_archived?: boolean;
}

export type SearchEntityType = 'accounts' | 'contacts' | 'leads' | 'opportunities' | 'activities';

export interface SearchFilters {
  // Account filters
  account_tier?: string[];
  industry?: string[];
  territory?: number;
  health_score?: {
    min: number;
    max: number;
  };
  revenue?: {
    min: number;
    max: number;
  };
  created_date?: {
    from: Date;
    to: Date;
  };

  // Contact filters
  job_title?: string;
  department?: string;
  seniority?: string;
  influence_score?: {
    min: number;
    max: number;
  };

  // Common filters
  tags?: string[];
  owner_id?: number[];
  team_id?: number[];

  // Custom filters
  custom?: Record<string, any>;
}

export interface SearchSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SearchResult {
  accounts: SearchResultItem[];
  contacts: SearchResultItem[];
  leads?: SearchResultItem[];
  opportunities?: SearchResultItem[];
  total_results: number;
  search_time: number;
  facets?: SearchFacets;
  suggestions?: string[];
  query_id?: string;
}

export interface SearchResultItem {
  id: number;
  type: SearchEntityType;
  name: string;
  description?: string;
  relevance_score: number;
  highlights?: SearchHighlight[];
  metadata?: Record<string, any>;
  url?: string;
}

export interface SearchHighlight {
  field: string;
  snippet: string;
  matches: Array<{
    start: number;
    end: number;
  }>;
}

export interface SearchFacets {
  entity_types: FacetBucket[];
  industries?: FacetBucket[];
  territories?: FacetBucket[];
  account_tiers?: FacetBucket[];
  health_grades?: FacetBucket[];
}

export interface FacetBucket {
  key: string;
  label: string;
  count: number;
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
  notification_frequency?: 'daily' | 'weekly' | 'monthly';
  last_run?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface SearchSuggestion {
  text: string;
  type: 'query' | 'filter' | 'entity';
  confidence: number;
  metadata?: Record<string, any>;
}

export interface SearchAnalytics {
  total_searches: number;
  popular_terms: Array<{
    term: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  average_result_count: number;
  zero_result_searches: number;
  average_search_time: number;
  top_filters_used: Array<{
    filter: string;
    usage_count: number;
  }>;
  search_success_rate: number;
}

export interface AdvancedSearchRequest {
  query: SearchQuery;
  options?: SearchOptions;
}

export interface SearchOptions {
  fuzzy_matching?: boolean;
  synonym_expansion?: boolean;
  semantic_search?: boolean;
  boost_recent?: boolean;
  include_related?: boolean;
  debug?: boolean;
}

export interface SemanticSearchResult extends SearchResult {
  semantic_clusters?: Array<{
    cluster_id: string;
    cluster_label: string;
    items: SearchResultItem[];
    common_themes: string[];
  }>;
  related_queries?: string[];
  intent?: SearchIntent;
}

export interface SearchIntent {
  type: 'navigation' | 'information' | 'transaction';
  confidence: number;
  detected_entities?: Array<{
    entity_type: string;
    entity_value: string;
  }>;
}

export interface SearchIndex {
  entity_type: SearchEntityType;
  entity_id: number;
  content: string;
  metadata: Record<string, any>;
  vector?: number[]; // For semantic search
  last_indexed: Date;
}

export interface SearchConfiguration {
  company_id: number;
  settings: {
    default_limit: number;
    max_limit: number;
    enable_fuzzy: boolean;
    enable_semantic: boolean;
    enable_suggestions: boolean;
    index_frequency: string;
    stop_words?: string[];
    synonyms?: Record<string, string[]>;
    boost_fields?: Record<string, number>;
  };
}