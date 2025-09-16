/**
 * Query Cache Manager Implementation
 * Sprint 4 - Performance Optimization
 * Sistema avanzado de caché para queries extendiendo el CacheService existente
 */
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { ICacheService } from '@/shared/interfaces/ICacheService';
import {
  IQueryCacheManager,
  CacheStatistics,
  CacheStrategy,
  CachePattern
} from './interfaces/IPerformanceOptimizer';
import winston from 'winston';
import crypto from 'crypto';
interface CacheEntry {
  key: string;
  query: string;
  result: any;
  size: number;
  hits: number;
  lastAccessed: Date;
  created: Date;
  ttl: number;
  tags: string[];
}
interface CacheMetadata {
  totalHits: number;
  totalMisses: number;
  totalEvictions: number;
  totalSize: number;
  keyAccessCount: Map<string, number>;
  queryPatterns: Map<string, CachePattern>;
  invalidationRules: Map<string, string[]>;
}
@injectable()
export class QueryCacheManager implements IQueryCacheManager {
  private logger: winston.Logger;
  private cacheService: ICacheService;
  private metadata: CacheMetadata;
  private strategy: CacheStrategy;
  private lruCache: Map<string, CacheEntry> = new Map();
  private lfuCache: Map<string, CacheEntry> = new Map();
  private maxCacheSize: number = 100 * 1024 * 1024; // 100MB default
  private currentCacheSize: number = 0;
  constructor(
    @inject(TYPES.Logger) logger: winston.Logger,
    @inject(TYPES.CacheService) cacheService: ICacheService
  ) {
    this.logger = logger;
    this.cacheService = cacheService;
    // Initialize metadata
    this.metadata = {
      totalHits: 0,
      totalMisses: 0,
      totalEvictions: 0,
      totalSize: 0,
      keyAccessCount: new Map(),
      queryPatterns: new Map(),
      invalidationRules: new Map()
    };
    // Default strategy
    this.strategy = {
      type: 'ADAPTIVE',
      maxSize: this.maxCacheSize,
      defaultTTL: 300, // 5 minutes
      patterns: []
    };
    // Initialize default patterns
    this.initializeDefaultPatterns();
  }
  /**
   * Almacenar query en caché
   */
  async cacheQuery(key: string, result: any, ttl?: number): Promise<void> {
    try {
      // Generate cache key if not provided
      const cacheKey = this.generateCacheKey(key);
      // Calculate result size
      const size = this.calculateSize(result);
      // Check if we need to evict entries
      if (this.currentCacheSize + size > this.maxCacheSize) {
        await this.evictEntries(size);
      }
      // Determine TTL based on patterns
      const effectiveTTL = ttl || this.determineTTL(key);
      // Create cache entry
      const entry: CacheEntry = {
        key: cacheKey,
        query: key,
        result,
        size,
        hits: 0,
        lastAccessed: new Date(),
        created: new Date(),
        ttl: effectiveTTL,
        tags: this.extractTags(key)
      };
      // Store in appropriate cache based on strategy
      switch (this.strategy.type) {
        case 'LRU':
          this.lruCache.set(cacheKey, entry);
          break;
        case 'LFU':
          this.lfuCache.set(cacheKey, entry);
          break;
        case 'TTL':
          await this.cacheService.set(cacheKey, result, effectiveTTL);
          break;
        case 'ADAPTIVE':
          // Use both LRU and frequency tracking
          this.lruCache.set(cacheKey, entry);
          this.updateFrequency(cacheKey);
          // Also store in underlying cache service
          await this.cacheService.set(cacheKey, result, effectiveTTL);
          break;
      }
      // Update metrics
      this.currentCacheSize += size;
      this.metadata.totalSize = this.currentCacheSize;
      this.logger.debug(`Cached query: ${cacheKey}, size: ${size}, TTL: ${effectiveTTL}`);
    } catch (error) {
      this.logger.error('Failed to cache query:', error);
    }
  }
  /**
   * Obtener query del caché
   */
  async getCachedQuery(key: string): Promise<any | null> {
    try {
      const cacheKey = this.generateCacheKey(key);
      // Try to get from appropriate cache
      let result: any = null;
      let entry: CacheEntry | undefined;
      switch (this.strategy.type) {
        case 'LRU':
          entry = this.lruCache.get(cacheKey);
          if (entry) {
            // Move to end (most recently used)
            this.lruCache.delete(cacheKey);
            this.lruCache.set(cacheKey, entry);
            result = entry.result;
          }
          break;
        case 'LFU':
          entry = this.lfuCache.get(cacheKey);
          if (entry) {
            entry.hits++;
            result = entry.result;
          }
          break;
        case 'TTL':
          result = await this.cacheService.get(cacheKey);
          break;
        case 'ADAPTIVE':
          // Try LRU cache first
          entry = this.lruCache.get(cacheKey);
          if (entry) {
            // Update access info
            entry.hits++;
            entry.lastAccessed = new Date();
            // Move to end for LRU
            this.lruCache.delete(cacheKey);
            this.lruCache.set(cacheKey, entry);
            result = entry.result;
          } else {
            // Fallback to underlying cache service
            result = await this.cacheService.get(cacheKey);
          }
          break;
      }
      // Update metrics
      if (result !== null) {
        this.metadata.totalHits++;
        this.updateAccessCount(cacheKey);
        this.logger.debug(`Cache hit for: ${cacheKey}`);
      } else {
        this.metadata.totalMisses++;
        this.logger.debug(`Cache miss for: ${cacheKey}`);
      }
      return result;
    } catch (error) {
      this.logger.error('Failed to get cached query:', error);
      return null;
    }
  }
  /**
   * Invalidar caché por patrones
   */
  async invalidateCache(patterns: string[]): Promise<number> {
    let invalidatedCount = 0;
    try {
      for (const pattern of patterns) {
        // Convert pattern to regex
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        // Invalidate in LRU cache
        for (const [key, entry] of this.lruCache.entries()) {
          if (regex.test(entry.query) || entry.tags.some(tag => regex.test(tag))) {
            this.lruCache.delete(key);
            this.currentCacheSize -= entry.size;
            invalidatedCount++;
          }
        }
        // Invalidate in LFU cache
        for (const [key, entry] of this.lfuCache.entries()) {
          if (regex.test(entry.query) || entry.tags.some(tag => regex.test(tag))) {
            this.lfuCache.delete(key);
            this.currentCacheSize -= entry.size;
            invalidatedCount++;
          }
        }
        // Invalidate in underlying cache service
        const deletedFromService = await this.cacheService.deletePattern(pattern);
        invalidatedCount += deletedFromService;
      }
      this.logger.info(`Invalidated ${invalidatedCount} cache entries`);
    } catch (error) {
      this.logger.error('Failed to invalidate cache:', error);
    }
    return invalidatedCount;
  }
  /**
   * Obtener estadísticas del caché
   */
  async getCacheStats(): Promise<CacheStatistics> {
    const hitRatio = this.metadata.totalHits / 
      (this.metadata.totalHits + this.metadata.totalMisses) || 0;
    // Get top accessed keys
    const topKeys = Array.from(this.metadata.keyAccessCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, hits]) => ({ key, hits }));
    // Calculate average TTL
    let totalTTL = 0;
    let entryCount = 0;
    for (const entry of this.lruCache.values()) {
      totalTTL += entry.ttl;
      entryCount++;
    }
    const avgTTL = entryCount > 0 ? totalTTL / entryCount : this.strategy.defaultTTL;
    return {
      hits: this.metadata.totalHits,
      misses: this.metadata.totalMisses,
      hitRatio: hitRatio * 100,
      size: this.currentCacheSize,
      evictions: this.metadata.totalEvictions,
      avgTTL,
      topKeys
    };
  }
  /**
   * Optimizar estrategia de caché
   */
  async optimizeCacheStrategy(database: string): Promise<CacheStrategy> {
    const stats = await this.getCacheStats();
    // Analyze cache performance
    const hitRatio = stats.hitRatio;
    const evictionRate = stats.evictions / (stats.hits + stats.misses) || 0;
    // Determine optimal strategy based on metrics
    let newStrategy: CacheStrategy = { ...this.strategy };
    if (hitRatio < 50) {
      // Low hit ratio - increase cache size or TTL
      newStrategy.maxSize = Math.min(this.maxCacheSize * 1.5, 500 * 1024 * 1024);
      newStrategy.defaultTTL = Math.min(this.strategy.defaultTTL * 1.5, 3600);
      // Switch to LFU if not already
      if (this.strategy.type !== 'LFU') {
        newStrategy.type = 'LFU';
        this.logger.info('Switching to LFU strategy due to low hit ratio');
      }
    }
    if (evictionRate > 0.1) {
      // High eviction rate - increase cache size
      newStrategy.maxSize = Math.min(this.maxCacheSize * 2, 1024 * 1024 * 1024);
      this.logger.info('Increasing cache size due to high eviction rate');
    }
    // Analyze query patterns
    const patterns = await this.analyzeQueryPatterns(database);
    newStrategy.patterns = patterns;
    // Apply new strategy
    this.strategy = newStrategy;
    this.maxCacheSize = newStrategy.maxSize;
    return newStrategy;
  }
  /**
   * Implementar caché inteligente
   */
  async implementSmartCaching(query: string): Promise<boolean> {
    try {
      // Analyze query characteristics
      const characteristics = this.analyzeQuery(query);
      // Determine if query should be cached
      if (!this.shouldCache(characteristics)) {
        return false;
      }
      // Determine optimal TTL
      const ttl = this.calculateOptimalTTL(characteristics);
      // Add pattern for this query type
      const pattern: CachePattern = {
        pattern: this.extractQueryPattern(query),
        ttl,
        priority: characteristics.priority,
        invalidateOn: characteristics.invalidationTriggers
      };
      // Store pattern
      this.metadata.queryPatterns.set(pattern.pattern, pattern);
      // Update invalidation rules
      for (const trigger of characteristics.invalidationTriggers || []) {
        const rules = this.metadata.invalidationRules.get(trigger) || [];
        rules.push(pattern.pattern);
        this.metadata.invalidationRules.set(trigger, rules);
      }
      this.logger.info(`Smart caching implemented for pattern: ${pattern.pattern}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to implement smart caching:', error);
      return false;
    }
  }
  /**
   * Initialize default cache patterns
   */
  private initializeDefaultPatterns(): void {
    // Static data pattern
    this.strategy.patterns.push({
      pattern: 'SELECT.*FROM.*(config|settings|permissions)',
      ttl: 3600, // 1 hour
      priority: 1,
      invalidateOn: ['config_update', 'settings_change']
    });
    // User data pattern
    this.strategy.patterns.push({
      pattern: 'SELECT.*FROM.*users.*WHERE.*id',
      ttl: 600, // 10 minutes
      priority: 2,
      invalidateOn: ['user_update', 'profile_change']
    });
    // List queries pattern
    this.strategy.patterns.push({
      pattern: 'SELECT.*FROM.*LIMIT',
      ttl: 300, // 5 minutes
      priority: 3,
      invalidateOn: ['data_insert', 'data_update', 'data_delete']
    });
    // Count queries pattern
    this.strategy.patterns.push({
      pattern: 'SELECT COUNT',
      ttl: 600, // 10 minutes
      priority: 2,
      invalidateOn: ['data_insert', 'data_delete']
    });
  }
  /**
   * Generate cache key from query
   */
  private generateCacheKey(query: string): string {
    return crypto.createHash('md5').update(query).digest('hex');
  }
  /**
   * Calculate size of data
   */
  private calculateSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 1000; // Default size if serialization fails
    }
  }
  /**
   * Determine TTL based on patterns
   */
  private determineTTL(query: string): number {
    for (const pattern of this.strategy.patterns) {
      const regex = new RegExp(pattern.pattern, 'i');
      if (regex.test(query)) {
        return pattern.ttl;
      }
    }
    return this.strategy.defaultTTL;
  }
  /**
   * Extract tags from query
   */
  private extractTags(query: string): string[] {
    const tags: string[] = [];
    // Extract table names
    const tableMatches = query.match(/FROM\s+(\w+)/gi);
    if (tableMatches) {
      tags.push(...tableMatches.map(m => m.replace(/FROM\s+/i, '').toLowerCase()));
    }
    // Extract operation type
    const operation = query.trim().split(' ')[0].toUpperCase();
    tags.push(operation);
    return tags;
  }
  /**
   * Evict entries to make space
   */
  private async evictEntries(requiredSize: number): Promise<void> {
    let freedSize = 0;
    switch (this.strategy.type) {
      case 'LRU':
      case 'ADAPTIVE':
        // Evict least recently used
        for (const [key, entry] of this.lruCache.entries()) {
          if (freedSize >= requiredSize) break;
          this.lruCache.delete(key);
          freedSize += entry.size;
          this.metadata.totalEvictions++;
        }
        break;
      case 'LFU':
        // Evict least frequently used
        const sortedEntries = Array.from(this.lfuCache.entries())
          .sort((a, b) => a[1].hits - b[1].hits);
        for (const [key, entry] of sortedEntries) {
          if (freedSize >= requiredSize) break;
          this.lfuCache.delete(key);
          freedSize += entry.size;
          this.metadata.totalEvictions++;
        }
        break;
    }
    this.currentCacheSize -= freedSize;
  }
  /**
   * Update frequency tracking
   */
  private updateFrequency(key: string): void {
    const count = this.metadata.keyAccessCount.get(key) || 0;
    this.metadata.keyAccessCount.set(key, count + 1);
  }
  /**
   * Update access count
   */
  private updateAccessCount(key: string): void {
    const count = this.metadata.keyAccessCount.get(key) || 0;
    this.metadata.keyAccessCount.set(key, count + 1);
  }
  /**
   * Analyze query characteristics
   */
  private analyzeQuery(query: string): any {
    const characteristics = {
      isSelect: query.trim().toUpperCase().startsWith('SELECT'),
      hasJoin: /JOIN/i.test(query),
      hasAggregate: /COUNT|SUM|AVG|MAX|MIN/i.test(query),
      hasOrderBy: /ORDER BY/i.test(query),
      hasLimit: /LIMIT/i.test(query),
      tables: this.extractTags(query),
      priority: 3,
      invalidationTriggers: [] as string[]
    };
    // Determine priority
    if (characteristics.hasAggregate) {
      characteristics.priority = 1; // High priority for aggregates
    } else if (characteristics.hasJoin) {
      characteristics.priority = 2; // Medium priority for joins
    }
    // Determine invalidation triggers
    for (const table of characteristics.tables) {
      characteristics.invalidationTriggers.push(`${table}_update`);
      characteristics.invalidationTriggers.push(`${table}_delete`);
      characteristics.invalidationTriggers.push(`${table}_insert`);
    }
    return characteristics;
  }
  /**
   * Determine if query should be cached
   */
  private shouldCache(characteristics: any): boolean {
    // Don't cache non-SELECT queries
    if (!characteristics.isSelect) return false;
    // Cache aggregates and joins
    if (characteristics.hasAggregate || characteristics.hasJoin) return true;
    // Cache queries with LIMIT
    if (characteristics.hasLimit) return true;
    // Default: cache
    return true;
  }
  /**
   * Calculate optimal TTL
   */
  private calculateOptimalTTL(characteristics: any): number {
    let ttl = this.strategy.defaultTTL;
    // Longer TTL for aggregates
    if (characteristics.hasAggregate) {
      ttl *= 2;
    }
    // Shorter TTL for frequently changing tables
    if (characteristics.tables.some((t: string) => 
        ['sessions', 'logs', 'events'].includes(t))) {
      ttl /= 2;
    }
    return Math.min(Math.max(ttl, 60), 3600); // Between 1 minute and 1 hour
  }
  /**
   * Extract query pattern
   */
  private extractQueryPattern(query: string): string {
    // Simplify query to pattern
    return query
      .replace(/\s+/g, ' ')
      .replace(/['"][^'"]*['"]/g, '?') // Replace literals with ?
      .replace(/\d+/g, '#') // Replace numbers with #
      .trim();
  }
  /**
   * Analyze query patterns for a database
   */
  private async analyzeQueryPatterns(database: string): Promise<CachePattern[]> {
    // This would analyze actual query logs
    // For now, return enhanced default patterns
    return [
      ...this.strategy.patterns,
      {
        pattern: `SELECT.*FROM.*${database}`,
        ttl: 300,
        priority: 2,
        invalidateOn: [`${database}_change`]
      }
    ];
  }
}
