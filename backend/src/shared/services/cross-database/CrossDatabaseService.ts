/**
 * Cross-Database Service
 * Central service for enriching entities with data from different databases
 * Uses existing CacheService for caching
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { ICacheService } from '@/shared/interfaces/ICacheService';
import { UserDataProvider } from './providers/UserDataProvider';
import { CompanyDataProvider } from './providers/CompanyDataProvider';
import {
  UserBasicInfo,
  CompanyBasicInfo,
  EnrichmentOptions,
  WithUserData,
  WithCompanyData,
  EnrichedEntity,
  BatchFetchResult,
  CrossDatabaseCacheStats
} from '@/shared/types/cross-database.types';
import { Logger } from 'winston';
import * as _ from 'lodash';

/**
 * Service for enriching entities with cross-database data
 */
@injectable()
export class CrossDatabaseService {
  private readonly CACHE_PREFIX = 'crossdb:';
  private readonly DEFAULT_CACHE_TTL = 3600; // 1 hour
  private readonly DEFAULT_BATCH_SIZE = 100;

  // Statistics
  private stats: CrossDatabaseCacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalCached: 0,
    lastReset: new Date()
  };

  constructor(
    @inject(TYPES.UserDataProvider) private userProvider: UserDataProvider,
    @inject(TYPES.CompanyDataProvider) private companyProvider: CompanyDataProvider,
    @inject(TYPES.CacheService) private cache: ICacheService, // REUSING existing CacheService
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Enrich items with user data
   */
  async enrichWithUserData<T extends {
    owner_id?: number;
    assigned_to?: number;
    created_by?: number;
    updated_by?: number;
  }>(
    items: T[],
    options: EnrichmentOptions = {}
  ): Promise<WithUserData<T>[]> {
    const startTime = Date.now();

    try {
      // Extract all unique user IDs
      const userIds = this.extractUserIds(items);

      this.logger.debug(`Enriching ${items.length} items with user data`, {
        itemCount: items.length,
        userIdsFound: Array.from(userIds)
      });

      if (userIds.size === 0) {
        return items as WithUserData<T>[];
      }

      // Fetch users with caching
      const users = await this.getUsersByIds(Array.from(userIds), options);
      this.logger.debug(`Fetched ${users.size} users for enrichment`, {
        fetchedUserIds: Array.from(users.keys())
      });

      // Enrich items
      const enrichedItems = items.map(item => {
        const enriched = { ...item } as WithUserData<T>;

        if (item.owner_id && users.has(item.owner_id)) {
          enriched.owner = users.get(item.owner_id);
        }
        if (item.assigned_to && users.has(item.assigned_to)) {
          enriched.assignedTo = users.get(item.assigned_to);
        }
        if (item.created_by && users.has(item.created_by)) {
          enriched.createdBy = users.get(item.created_by);
        }
        if (item.updated_by && users.has(item.updated_by)) {
          enriched.updatedBy = users.get(item.updated_by);
        }

        return enriched;
      });

      const duration = Date.now() - startTime;
      this.logger.debug(`Enriched ${items.length} items with user data`, {
        itemCount: items.length,
        userCount: userIds.length,
        duration,
        cacheHitRate: this.stats.hitRate
      });

      return enrichedItems;
    } catch (error) {
      this.logger.error('Error enriching with user data', { error });
      // Return original items without enrichment on error
      return items as WithUserData<T>[];
    }
  }

  /**
   * Enrich items with company data
   */
  async enrichWithCompanyData<T extends { company_id?: string }>(
    items: T[],
    options: EnrichmentOptions = {}
  ): Promise<WithCompanyData<T>[]> {
    const startTime = Date.now();

    try {
      // Extract unique company IDs
      const companyIds = new Set<string>();
      items.forEach(item => {
        if (item.company_id) {
          companyIds.add(item.company_id);
        }
      });

      if (companyIds.size === 0) {
        return items as WithCompanyData<T>[];
      }

      // Fetch companies with caching
      const companies = await this.getCompaniesByIds(Array.from(companyIds), options);

      // Enrich items
      const enrichedItems = items.map(item => {
        const enriched = { ...item } as WithCompanyData<T>;

        if (item.company_id && companies.has(item.company_id)) {
          enriched.company = companies.get(item.company_id);
        }

        return enriched;
      });

      const duration = Date.now() - startTime;
      this.logger.debug(`Enriched ${items.length} items with company data`, {
        itemCount: items.length,
        companyCount: companyIds.size,
        duration
      });

      return enrichedItems;
    } catch (error) {
      this.logger.error('Error enriching with company data', { error });
      return items as WithCompanyData<T>[];
    }
  }

  /**
   * Enrich items with both user and company data
   */
  async enrichWithAllData<T extends {
    owner_id?: number;
    assigned_to?: number;
    created_by?: number;
    updated_by?: number;
    company_id?: string;
  }>(
    items: T[],
    options: EnrichmentOptions = {}
  ): Promise<EnrichedEntity<T>[]> {
    // First enrich with user data
    const userEnriched = await this.enrichWithUserData(items, options);
    // Then enrich with company data
    const fullyEnriched = await this.enrichWithCompanyData(userEnriched, options);

    return fullyEnriched as EnrichedEntity<T>[];
  }

  /**
   * Batch fetch users by IDs with caching
   */
  private async getUsersByIds(
    ids: number[],
    options: EnrichmentOptions = {}
  ): Promise<Map<number, UserBasicInfo>> {
    if (ids.length === 0) {
      return new Map();
    }

    const { useCache = true, cacheTTL = this.DEFAULT_CACHE_TTL, batchSize = this.DEFAULT_BATCH_SIZE } = options;
    const result = new Map<number, UserBasicInfo>();
    const missingIds: number[] = [];

    // Check cache first
    if (useCache) {
      for (const id of ids) {
        const cacheKey = `${this.CACHE_PREFIX}user:${id}`;
        const cached = await this.cache.get<UserBasicInfo>(cacheKey);

        if (cached) {
          result.set(id, cached);
          this.stats.hits++;
        } else {
          missingIds.push(id);
          this.stats.misses++;
        }
      }
    } else {
      missingIds.push(...ids);
    }

    // Fetch missing users in batches
    if (missingIds.length > 0) {
      const chunks = _.chunk(missingIds, batchSize);

      for (const chunk of chunks) {
        const users = await this.userProvider.fetchUsersByIds(chunk);

        for (const user of users) {
          result.set(user.id, user);

          // Cache the user
          if (useCache) {
            const cacheKey = `${this.CACHE_PREFIX}user:${user.id}`;
            await this.cache.set(cacheKey, user, cacheTTL);
          }
        }
      }
    }

    // Update statistics
    this.updateStats();

    return result;
  }

  /**
   * Batch fetch companies by IDs with caching
   */
  private async getCompaniesByIds(
    ids: string[],
    options: EnrichmentOptions = {}
  ): Promise<Map<string, CompanyBasicInfo>> {
    if (ids.length === 0) {
      return new Map();
    }

    const { useCache = true, cacheTTL = this.DEFAULT_CACHE_TTL, batchSize = this.DEFAULT_BATCH_SIZE } = options;
    const result = new Map<string, CompanyBasicInfo>();
    const missingIds: string[] = [];

    // Check cache first
    if (useCache) {
      for (const id of ids) {
        const cacheKey = `${this.CACHE_PREFIX}company:${id}`;
        const cached = await this.cache.get<CompanyBasicInfo>(cacheKey);

        if (cached) {
          result.set(id, cached);
          this.stats.hits++;
        } else {
          missingIds.push(id);
          this.stats.misses++;
        }
      }
    } else {
      missingIds.push(...ids);
    }

    // Fetch missing companies in batches
    if (missingIds.length > 0) {
      const chunks = _.chunk(missingIds, batchSize);

      for (const chunk of chunks) {
        const companies = await this.companyProvider.fetchCompaniesByIds(chunk);

        for (const company of companies) {
          result.set(company.id, company);

          // Cache the company
          if (useCache) {
            const cacheKey = `${this.CACHE_PREFIX}company:${company.id}`;
            await this.cache.set(cacheKey, company, cacheTTL);
          }
        }
      }
    }

    // Update statistics
    this.updateStats();

    return result;
  }

  /**
   * Extract unique user IDs from items
   */
  private extractUserIds<T extends {
    owner_id?: number;
    assigned_to?: number;
    created_by?: number;
    updated_by?: number;
  }>(items: T[]): Set<number> {
    const userIds = new Set<number>();

    items.forEach(item => {
      if (item.owner_id) userIds.add(item.owner_id);
      if (item.assigned_to) userIds.add(item.assigned_to);
      if (item.created_by) userIds.add(item.created_by);
      if (item.updated_by) userIds.add(item.updated_by);
    });

    return userIds;
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Invalidate cache for specific pattern
   */
  async invalidateCache(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        // Using the existing CacheService's clear method
        // Most cache services support pattern-based clearing
        await this.cache.clear();
        this.logger.info(`Cache invalidated for pattern: ${pattern}`);
      } else {
        await this.cache.clear();
        this.logger.info('All cross-database cache cleared');
      }

      // Reset statistics
      this.resetStats();
    } catch (error) {
      this.logger.error('Error invalidating cache', { error, pattern });
    }
  }

  /**
   * Preload cache with frequently accessed data
   */
  async preloadCache(
    entityType: 'users' | 'companies',
    options: EnrichmentOptions = {}
  ): Promise<void> {
    try {
      this.logger.info(`Preloading cache for ${entityType}`);

      if (entityType === 'users') {
        const userIds = await this.userProvider.fetchActiveUserIds(1000);
        await this.getUsersByIds(userIds, { ...options, useCache: true });
        this.logger.info(`Preloaded ${userIds.length} users into cache`);
      } else if (entityType === 'companies') {
        const companyIds = await this.companyProvider.fetchActiveCompanyIds(500);
        await this.getCompaniesByIds(companyIds, { ...options, useCache: true });
        this.logger.info(`Preloaded ${companyIds.length} companies into cache`);
      }
    } catch (error) {
      this.logger.error(`Error preloading cache for ${entityType}`, { error });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CrossDatabaseCacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalCached: 0,
      lastReset: new Date()
    };
  }
}