/**
 * Cross-Database Types
 * Types for enriching data across different databases
 */

/**
 * Basic user information for cross-database enrichment
 */
export interface UserBasicInfo {
  id: number;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  status: string;
}

/**
 * Basic company information for cross-database enrichment
 */
export interface CompanyBasicInfo {
  id: string;
  name: string;
  industry?: string;
  size?: string;
  status: string;
}

/**
 * Options for data enrichment operations
 */
export interface EnrichmentOptions {
  fields?: string[];
  useCache?: boolean;
  cacheTTL?: number;
  batchSize?: number;
}

/**
 * Type helper to add user data to any entity
 */
export type WithUserData<T> = T & {
  owner?: UserBasicInfo;
  assignedTo?: UserBasicInfo;
  createdBy?: UserBasicInfo;
  updatedBy?: UserBasicInfo;
};

/**
 * Type helper to add company data to any entity
 */
export type WithCompanyData<T> = T & {
  company?: CompanyBasicInfo;
};

/**
 * Combined enrichment with both user and company data
 */
export type EnrichedEntity<T> = WithUserData<WithCompanyData<T>>;

/**
 * Pagination response with enriched data
 */
export interface EnrichedPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Cache statistics for monitoring
 */
export interface CrossDatabaseCacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalCached: number;
  lastReset: Date;
}

/**
 * Batch fetch result with metadata
 */
export interface BatchFetchResult<T> {
  data: Map<string | number, T>;
  fromCache: number;
  fromDatabase: number;
  totalTime: number;
  errors?: string[];
}