/**
 * Feature Flag Cache Manager - Sprint 3
 * Gestor avanzado de cache con invalidación inteligente y sincronización
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import { TYPES } from '@/container/types';
import { ICacheService } from '@/shared/interfaces/ICacheService';
import { FeatureFlagConfiguration, FeatureFlagContext, EvaluationResult } from '@/modules/feature-flags/services/EnhancedFeatureFlagService';
export interface CacheMetrics {
  hits: number;
  misses: number;
  invalidations: number;
  evictions: number;
  size: number;
  hitRate: number;
  averageResponseTime: number;
}
export interface CacheKey {
  flagName: string;
  context: string; // Hashed context for performance
  contextHash: string;
}
export interface CachedEvaluation {
  evaluation: EvaluationResult;
  cachedAt: number;
  ttl: number;
  contextHash: string;
  flagVersion: number;
}
export interface InvalidationRule {
  pattern: string | RegExp;
  reason: string;
  scope: 'flag' | 'context' | 'global';
}
@injectable()
export class FeatureFlagCacheManager extends EventEmitter {
  private readonly CACHE_PREFIX = 'ff_eval:';
  private readonly CONFIG_CACHE_PREFIX = 'ff_config:';
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly SHORT_TTL = 30 * 1000; // 30 seconds for frequent changes
  private readonly LONG_TTL = 30 * 60 * 1000; // 30 minutes for stable flags
  // Metrics tracking
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    invalidations: 0,
    evictions: 0,
    size: 0,
    hitRate: 0,
    averageResponseTime: 0
  };
  // In-memory cache for hot data (LRU)
  private hotCache = new Map<string, CachedEvaluation>();
  private readonly HOT_CACHE_MAX_SIZE = 1000;
  // Context signatures for efficient invalidation
  private contextSignatures = new Map<string, Set<string>>();
  // Response time tracking
  private responseTimes: number[] = [];
  private readonly MAX_RESPONSE_SAMPLES = 100;
  constructor(
    @inject(TYPES.CacheService) private cacheService: ICacheService,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    super();
    this.startMetricsCollection();
  }
  /**
   * Get cached evaluation result
   */
  async getCachedEvaluation(
    flagName: string,
    context: FeatureFlagContext
  ): Promise<CachedEvaluation | null> {
    const startTime = Date.now();
    try {
      const contextHash = this.hashContext(context);
      const cacheKey = this.buildEvaluationKey(flagName, contextHash);
      // Try hot cache first
      const hotResult = this.hotCache.get(cacheKey);
      if (hotResult && !this.isExpired(hotResult)) {
        this.recordHit(Date.now() - startTime);
        return hotResult;
      }
      // Try distributed cache
      const cachedData = await this.cacheService.get<CachedEvaluation>(cacheKey);
      if (cachedData && !this.isExpired(cachedData)) {
        // Promote to hot cache if frequently accessed
        this.promoteToHotCache(cacheKey, cachedData);
        this.recordHit(Date.now() - startTime);
        return cachedData;
      }
      this.recordMiss(Date.now() - startTime);
      return null;
    } catch (error) {
      this.logger.error('Cache retrieval error', { error, flagName, contextHash: this.hashContext(context) });
      this.recordMiss(Date.now() - startTime);
      return null;
    }
  }
  /**
   * Cache evaluation result with intelligent TTL
   */
  async cacheEvaluation(
    flagName: string,
    context: FeatureFlagContext,
    evaluation: EvaluationResult,
    flagConfig?: FeatureFlagConfiguration
  ): Promise<void> {
    try {
      const contextHash = this.hashContext(context);
      const cacheKey = this.buildEvaluationKey(flagName, contextHash);
      const ttl = this.calculateTTL(flagConfig, evaluation);
      const cachedEvaluation: CachedEvaluation = {
        evaluation,
        cachedAt: Date.now(),
        ttl,
        contextHash,
        flagVersion: flagConfig?.version || 1
      };
      // Cache in both hot and distributed cache
      await Promise.all([
        this.cacheService.set(cacheKey, cachedEvaluation, ttl),
        this.setHotCache(cacheKey, cachedEvaluation)
      ]);
      // Track context signature for invalidation
      this.trackContextSignature(flagName, contextHash);
      this.logger.debug('Evaluation cached', { 
        flagName, 
        contextHash, 
        ttl, 
        cacheKey: cacheKey.substring(0, 20) + '...' 
      });
    } catch (error) {
      this.logger.error('Cache storage error', { error, flagName });
    }
  }
  /**
   * Cache feature flag configuration
   */
  async cacheConfiguration(config: FeatureFlagConfiguration): Promise<void> {
    try {
      const cacheKey = this.buildConfigKey(config.name, config.environment);
      const ttl = this.LONG_TTL; // Configs change less frequently
      await this.cacheService.set(cacheKey, config, ttl);
      this.logger.debug('Configuration cached', { flagName: config.name, environment: config.environment });
    } catch (error) {
      this.logger.error('Config cache storage error', { error, flagName: config.name });
    }
  }
  /**
   * Get cached configuration
   */
  async getCachedConfiguration(flagName: string, environment: string): Promise<FeatureFlagConfiguration | null> {
    try {
      const cacheKey = this.buildConfigKey(flagName, environment);
      return await this.cacheService.get<FeatureFlagConfiguration>(cacheKey);
    } catch (error) {
      this.logger.error('Config cache retrieval error', { error, flagName, environment });
      return null;
    }
  }
  /**
   * Invalidate cache for specific flag
   */
  async invalidateFlag(flagName: string, reason: string = 'Manual invalidation'): Promise<number> {
    try {
      let invalidatedCount = 0;
      // Invalidate evaluations for this flag
      const evaluationPattern = `${this.CACHE_PREFIX}${flagName}:*`;
      const evaluationKeys = await this.cacheService.getKeysByPattern(evaluationPattern);
      if (evaluationKeys.length > 0) {
        await this.cacheService.deleteMany(evaluationKeys);
        invalidatedCount += evaluationKeys.length;
      }
      // Invalidate configurations for this flag
      const configPattern = `${this.CONFIG_CACHE_PREFIX}${flagName}:*`;
      const configKeys = await this.cacheService.getKeysByPattern(configPattern);
      if (configKeys.length > 0) {
        await this.cacheService.deleteMany(configKeys);
        invalidatedCount += configKeys.length;
      }
      // Clean hot cache
      const hotKeysToDelete: string[] = [];
      for (const key of this.hotCache.keys()) {
        if (key.includes(flagName)) {
          hotKeysToDelete.push(key);
        }
      }
      hotKeysToDelete.forEach(key => this.hotCache.delete(key));
      invalidatedCount += hotKeysToDelete.length;
      // Clean context signatures
      this.contextSignatures.delete(flagName);
      this.metrics.invalidations++;
      this.emit('flagInvalidated', { flagName, reason, invalidatedCount });
      this.logger.info('Flag cache invalidated', { flagName, reason, invalidatedCount });
      return invalidatedCount;
    } catch (error) {
      this.logger.error('Cache invalidation error', { error, flagName, reason });
      return 0;
    }
  }
  /**
   * Invalidate cache by context pattern
   */
  async invalidateByContext(
    contextPattern: Partial<FeatureFlagContext>,
    reason: string = 'Context-based invalidation'
  ): Promise<number> {
    try {
      let invalidatedCount = 0;
      const patternHash = this.hashContext(contextPattern);
      // Find keys matching context pattern
      for (const [key, cachedEval] of this.hotCache.entries()) {
        if (this.contextMatches(cachedEval.contextHash, patternHash)) {
          this.hotCache.delete(key);
          invalidatedCount++;
        }
      }
      // Distributed cache invalidation by pattern
      const allKeys = await this.cacheService.getKeysByPattern(`${this.CACHE_PREFIX}*`);
      const keysToDelete: string[] = [];
      for (const key of allKeys) {
        const cachedData = await this.cacheService.get<CachedEvaluation>(key);
        if (cachedData && this.contextMatches(cachedData.contextHash, patternHash)) {
          keysToDelete.push(key);
        }
      }
      if (keysToDelete.length > 0) {
        await this.cacheService.deleteMany(keysToDelete);
        invalidatedCount += keysToDelete.length;
      }
      this.metrics.invalidations++;
      this.emit('contextInvalidated', { contextPattern, reason, invalidatedCount });
      this.logger.info('Context cache invalidated', { contextPattern, reason, invalidatedCount });
      return invalidatedCount;
    } catch (error) {
      this.logger.error('Context invalidation error', { error, contextPattern, reason });
      return 0;
    }
  }
  /**
   * Warm up cache for frequently used flags
   */
  async warmUpCache(
    flagName: string,
    contexts: FeatureFlagContext[],
    evaluationFunction: (flagName: string, context: FeatureFlagContext) => Promise<EvaluationResult>
  ): Promise<void> {
    try {
      this.logger.info('Starting cache warm-up', { flagName, contextsCount: contexts.length });
      const warmUpPromises = contexts.map(async (context) => {
        try {
          const evaluation = await evaluationFunction(flagName, context);
          await this.cacheEvaluation(flagName, context, evaluation);
        } catch (error) {
          this.logger.warn('Cache warm-up failed for context', { flagName, error });
        }
      });
      await Promise.all(warmUpPromises);
      this.logger.info('Cache warm-up completed', { flagName, contextsCount: contexts.length });
    } catch (error) {
      this.logger.error('Cache warm-up error', { error, flagName });
    }
  }
  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    this.metrics.size = this.hotCache.size;
    this.metrics.hitRate = this.metrics.hits / Math.max(this.metrics.hits + this.metrics.misses, 1);
    this.metrics.averageResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;
    return { ...this.metrics };
  }
  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    try {
      // Clear hot cache
      this.hotCache.clear();
      this.contextSignatures.clear();
      // Clear distributed cache
      const evaluationKeys = await this.cacheService.getKeysByPattern(`${this.CACHE_PREFIX}*`);
      const configKeys = await this.cacheService.getKeysByPattern(`${this.CONFIG_CACHE_PREFIX}*`);
      const allKeys = [...evaluationKeys, ...configKeys];
      if (allKeys.length > 0) {
        await this.cacheService.deleteMany(allKeys);
      }
      // Reset metrics
      this.metrics = {
        hits: 0,
        misses: 0,
        invalidations: 0,
        evictions: 0,
        size: 0,
        hitRate: 0,
        averageResponseTime: 0
      };
      this.emit('cacheCleared');
      this.logger.info('All caches cleared');
    } catch (error) {
      this.logger.error('Cache clear error', { error });
    }
  }
  // Private helper methods
  private buildEvaluationKey(flagName: string, contextHash: string): string {
    return `${this.CACHE_PREFIX}${flagName}:${contextHash}`;
  }
  private buildConfigKey(flagName: string, environment: string): string {
    return `${this.CONFIG_CACHE_PREFIX}${flagName}:${environment}`;
  }
  private hashContext(context: Partial<FeatureFlagContext>): string {
    // Create a deterministic hash of the context
    const relevantFields = {
      userId: context.userId,
      companyId: context.companyId,
      environment: context.environment,
      userRole: context.userRole,
      // Only include stable attributes that affect evaluation
      userAttributes: context.userAttributes ? 
        Object.keys(context.userAttributes).sort().reduce((acc, key) => {
          acc[key] = context.userAttributes![key];
          return acc;
        }, {} as any) : undefined
    };
    return this.simpleHash(JSON.stringify(relevantFields));
  }
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
  private calculateTTL(config?: FeatureFlagConfiguration, evaluation?: EvaluationResult): number {
    // Intelligent TTL based on flag characteristics
    if (config?.rolloutStrategy === 'percentage' && config.rolloutPercentage < 100) {
      return this.SHORT_TTL; // Shorter TTL for active rollouts
    }
    if (config?.rules && config.rules.length > 0) {
      return this.DEFAULT_TTL; // Standard TTL for rule-based flags
    }
    if (evaluation?.cacheHit) {
      return this.LONG_TTL; // Longer TTL for stable evaluations
    }
    return this.DEFAULT_TTL;
  }
  private isExpired(cached: CachedEvaluation): boolean {
    return Date.now() - cached.cachedAt > cached.ttl;
  }
  private promoteToHotCache(key: string, cachedEvaluation: CachedEvaluation): void {
    this.setHotCache(key, cachedEvaluation);
  }
  private setHotCache(key: string, cachedEvaluation: CachedEvaluation): void {
    // Implement LRU eviction if cache is full
    if (this.hotCache.size >= this.HOT_CACHE_MAX_SIZE) {
      const firstKey = this.hotCache.keys().next().value;
      this.hotCache.delete(firstKey);
      this.metrics.evictions++;
    }
    this.hotCache.set(key, cachedEvaluation);
  }
  private trackContextSignature(flagName: string, contextHash: string): void {
    if (!this.contextSignatures.has(flagName)) {
      this.contextSignatures.set(flagName, new Set());
    }
    this.contextSignatures.get(flagName)!.add(contextHash);
  }
  private contextMatches(contextHash: string, patternHash: string): boolean {
    // Simple pattern matching - can be enhanced
    return contextHash.includes(patternHash) || patternHash.includes(contextHash);
  }
  private recordHit(responseTime: number): void {
    this.metrics.hits++;
    this.recordResponseTime(responseTime);
  }
  private recordMiss(responseTime: number): void {
    this.metrics.misses++;
    this.recordResponseTime(responseTime);
  }
  private recordResponseTime(time: number): void {
    this.responseTimes.push(time);
    if (this.responseTimes.length > this.MAX_RESPONSE_SAMPLES) {
      this.responseTimes.shift();
    }
  }
  private startMetricsCollection(): void {
    // Emit metrics every 60 seconds
    setInterval(() => {
      this.emit('metricsUpdated', this.getMetrics());
    }, 60000);
  }
}
