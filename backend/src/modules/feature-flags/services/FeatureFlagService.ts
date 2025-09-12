/**
 * Enhanced Feature Flag Service - Sprint 3
 * Servicio mejorado con evaluación en tiempo real y reglas avanzadas
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import { TYPES } from '@/container/types';
import { IFeatureFlagService } from '@/modules/feature-flags/interfaces/IFeatureFlagService';
import { IFeatureFlagRepository } from '@/modules/feature-flags/interfaces/IFeatureFlagRepository';
import { ICacheService } from '@/shared/interfaces/ICacheService';
import { AppError } from '@/shared/errors/AppError';
import { RuleEvaluatorRegistry } from '@/modules/feature-flags/services/RuleEvaluators';
import { FeatureFlagCacheManager } from '@/modules/feature-flags/services/FeatureFlagCacheManager';
// Enhanced Types and Interfaces
export interface FeatureFlagContext {
  userId?: string;
  companyId: string;
  environment?: string;
  userRole?: string;
  userAttributes?: Record<string, any>;
  deviceInfo?: {
    type?: string;
    os?: string;
    browser?: string;
    version?: string;
    userAgent?: string;
  };
  geoLocation?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
  sessionAttributes?: Record<string, any>;
  requestMetadata?: {
    ipAddress?: string;
    timestamp?: Date;
    source?: string;
  };
}
export interface FeatureFlagRule {
  id: string;
  name: string;
  type: 'user_attribute' | 'user_segment' | 'percentage' | 'time_window' | 'geo_location' | 'device' | 'custom';
  enabled: boolean;
  weight?: number;
  conditions: any; // Flexible conditions object specific to each rule type
}
export interface RuleEvaluationResult {
  matched: boolean;
  reason: string;
  metadata?: Record<string, any>;
}
export interface FeatureFlagConfiguration {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  environment: string;
  companyId: string;
  // Rollout Configuration
  rolloutPercentage: number;
  rolloutStrategy: 'percentage' | 'user_id' | 'custom';
  // Rules and Conditions
  rules: FeatureFlagRule[];
  prerequisites?: string[];
  // Time-based Configuration
  startDate?: Date;
  endDate?: Date;
  timezone?: string;
  // Variation Configuration
  variations: {
    id: string;
    name: string;
    value: any;
    description?: string;
    weight?: number;
  }[];
  defaultVariation: string;
  // Metadata
  category?: string;
  tags?: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}
export interface EvaluationResult {
  enabled: boolean;
  variation?: string;
  value?: any;
  reason: string;
  ruleMatches: Array<{
    ruleId: string;
    ruleName: string;
    matched: boolean;
    reason?: string;
  }>;
  evaluationTime: number;
  cacheHit: boolean;
  flag?: FeatureFlagConfiguration;
  context: FeatureFlagContext;
}
export interface AnalyticsData {
  flagName: string;
  evaluations: number;
  uniqueUsers: number;
  variations: Record<string, number>;
  ruleMatches: Record<string, number>;
  averageEvaluationTime: number;
  cacheHitRate: number;
  errorRate: number;
  period: {
    start: Date;
    end: Date;
  };
}
/**
 * EnhancedFeatureFlagService
 * Servicio completo con evaluación en tiempo real y reglas avanzadas
 */
@injectable()
export class EnhancedFeatureFlagService extends EventEmitter implements IFeatureFlagService {
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes for real-time behavior
  private readonly CACHE_PREFIX = 'enhanced_ff:';
  private readonly ANALYTICS_PREFIX = 'ff_analytics:';
  // Real-time evaluation metrics
  private metrics = {
    totalEvaluations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalEvaluationTime: 0,
    errors: 0,
    uniqueUsers: new Set<string>(),
    flagUsage: new Map<string, number>()
  };
  constructor(
    @inject(TYPES.FeatureFlagRepository) private flagRepository: IFeatureFlagRepository,
    @inject(TYPES.CacheService) private cacheService: ICacheService,
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.RuleEvaluatorRegistry) private ruleEvaluatorRegistry: RuleEvaluatorRegistry,
    @inject(TYPES.FeatureFlagCacheManager) private cacheManager: FeatureFlagCacheManager
  ) {
    super();
    this.startMetricsCollection();
    this.setupCacheEventHandlers();
  }
  /**
   * Setup cache event handlers
   */
  private setupCacheEventHandlers(): void {
    this.cacheManager.on('flagInvalidated', ({ flagName, reason, invalidatedCount }) => {
      this.logger.info('Flag cache invalidated', { flagName, reason, invalidatedCount });
      this.emit('cacheInvalidated', { flagName, reason, invalidatedCount });
    });
    this.cacheManager.on('metricsUpdated', (metrics) => {
      this.emit('cacheMetricsUpdated', metrics);
    });
  }
  /**
   * Enhanced real-time flag evaluation
   */
  async evaluateFlag(
    flagName: string, 
    context: FeatureFlagContext
  ): Promise<EvaluationResult> {
    const startTime = Date.now();
    try {
      this.metrics.totalEvaluations++;
      // Add user to unique users set
      if (context.userId) {
        this.metrics.uniqueUsers.add(context.userId);
      }
      // Try cache first for performance using enhanced cache manager
      const cachedEvaluation = await this.cacheManager.getCachedEvaluation(flagName, context);
      if (cachedEvaluation) {
        this.metrics.cacheHits++;
        this.metrics.totalEvaluationTime += (Date.now() - startTime);
        return cachedEvaluation.evaluation;
      }
      this.metrics.cacheMisses++;
      // Load flag configuration
      let flag = await this.cacheManager.getCachedConfiguration(flagName, context.environment || 'production');
      if (!flag) {
        flag = await this.loadFlag(flagName, context.companyId, context.environment || 'production');
        if (flag) {
          await this.cacheManager.cacheConfiguration(flag);
        }
      }
      if (!flag) {
        return await this.createEvaluationResult(
          false, 
          null, 
          null,
          'Flag not found',
          [],
          startTime,
          false,
          null,
          context
        );
      }
      // Check prerequisites first
      if (flag.prerequisites && flag.prerequisites.length > 0) {
        const prerequisiteResult = await this.evaluatePrerequisites(flag.prerequisites, context);
        if (!prerequisiteResult.satisfied) {
          return await this.createEvaluationResult(
            false,
            null,
            null,
            `Prerequisites not met: ${prerequisiteResult.reason}`,
            [],
            startTime,
            false,
            flag,
            context
          );
        }
      }
      // Check if flag is globally enabled
      if (!flag.enabled) {
        return await this.createEvaluationResult(
          false,
          flag.defaultVariation,
          this.getVariationValue(flag, flag.defaultVariation),
          'Flag disabled',
          [],
          startTime,
          false,
          flag,
          context
        );
      }
      // Check time constraints
      if (!this.isTimeActive(flag)) {
        return await this.createEvaluationResult(
          false,
          flag.defaultVariation,
          this.getVariationValue(flag, flag.defaultVariation),
          'Outside time window',
          [],
          startTime,
          false,
          flag,
          context
        );
      }
      // Evaluate rules
      const ruleEvaluation = await this.evaluateRules(flag, context);
      if (!ruleEvaluation.passed) {
        return await this.createEvaluationResult(
          false,
          flag.defaultVariation,
          this.getVariationValue(flag, flag.defaultVariation),
          `Rules not satisfied: ${ruleEvaluation.reason}`,
          ruleEvaluation.ruleMatches,
          startTime,
          false,
          flag,
          context
        );
      }
      // Determine variation based on rollout strategy
      const variation = await this.determineVariation(flag, context);
      // Record analytics
      await this.recordEvaluation(flag, context, variation, true);
      // Emit real-time event
      this.emit('flagEvaluated', {
        flagName,
        context,
        result: variation,
        evaluationTime: Date.now() - startTime
      });
      return await this.createEvaluationResult(
        true,
        variation.id,
        variation.value,
        'All conditions satisfied',
        ruleEvaluation.ruleMatches,
        startTime,
        false,
        flag,
        context
      );
    } catch (error) {
      this.metrics.errors++;
      this.logger.error('Feature flag evaluation error', {
        error: error.message,
        flagName,
        context,
        stack: error.stack
      });
      return await this.createEvaluationResult(
        false,
        null,
        null,
        `Evaluation error: ${error.message}`,
        [],
        startTime,
        false,
        null,
        context
      );
    } finally {
      const evaluationTime = Date.now() - startTime;
      this.metrics.totalEvaluationTime += evaluationTime;
      // Update flag usage metrics
      const currentUsage = this.metrics.flagUsage.get(flagName) || 0;
      this.metrics.flagUsage.set(flagName, currentUsage + 1);
    }
  }
  /**
   * Bulk flag evaluation for efficiency
   */
  async evaluateMultipleFlags(
    flagNames: string[],
    context: FeatureFlagContext
  ): Promise<Record<string, EvaluationResult>> {
    const results: Record<string, EvaluationResult> = {};
    // Evaluate flags in parallel for better performance
    const evaluationPromises = flagNames.map(async (flagName) => {
      const result = await this.evaluateFlag(flagName, context);
      return { flagName, result };
    });
    const evaluatedFlags = await Promise.allSettled(evaluationPromises);
    evaluatedFlags.forEach((outcome) => {
      if (outcome.status === 'fulfilled') {
        const { flagName, result } = outcome.value;
        results[flagName] = result;
      } else {
        this.logger.error('Flag evaluation failed in bulk operation', {
          error: outcome.reason,
          context
        });
      }
    });
    return results;
  }
  /**
   * Real-time flag updates
   */
  async updateFlag(
    flagName: string,
    companyId: string,
    updates: Partial<FeatureFlagConfiguration>,
    environment: string = 'production'
  ): Promise<FeatureFlagConfiguration> {
    try {
      // Update in database
      const updatedFlag = await this.flagRepository.update(flagName, companyId, updates, environment);
      if (!updatedFlag) {
        throw new AppError('Flag not found', 404);
      }
      // Increment version for cache invalidation
      updatedFlag.version = (updatedFlag.version || 0) + 1;
      updatedFlag.updatedAt = new Date();
      // Invalidate all related cache entries
      await this.invalidateFlagCache(flagName, companyId, environment);
      // Emit real-time update event
      this.emit('flagUpdated', {
        flagName,
        companyId,
        environment,
        updates,
        timestamp: new Date()
      });
      this.logger.info('Feature flag updated', {
        flagName,
        companyId,
        environment,
        updates: Object.keys(updates),
        version: updatedFlag.version
      });
      return updatedFlag;
    } catch (error) {
      this.logger.error('Feature flag update error', {
        error: error.message,
        flagName,
        companyId,
        environment
      });
      throw error;
    }
  }
  /**
   * Get real-time analytics
   */
  async getAnalytics(
    flagName?: string,
    companyId?: string,
    timeRange: { start: Date; end: Date } = {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date()
    }
  ): Promise<AnalyticsData> {
    try {
      const analyticsKey = `${this.ANALYTICS_PREFIX}${flagName || 'all'}:${companyId || 'global'}`;
      // Get cached analytics if available
      let analytics = await this.cacheService.get(analyticsKey);
      if (!analytics) {
        // Calculate analytics from metrics and database
        analytics = await this.calculateAnalytics(flagName, companyId, timeRange);
        // Cache for 5 minutes
        await this.cacheService.set(analyticsKey, analytics, 5 * 60 * 1000);
      }
      return analytics;
    } catch (error) {
      this.logger.error('Analytics calculation error', {
        error: error.message,
        flagName,
        companyId,
        timeRange
      });
      throw error;
    }
  }
  // ========== Private Helper Methods ==========
  /**
   * Evaluate all rules for a flag
   */
  private async evaluateRules(
    flag: FeatureFlagConfiguration, 
    context: FeatureFlagContext
  ): Promise<{
    passed: boolean;
    reason: string;
    ruleMatches: Array<{ ruleId: string; ruleName: string; matched: boolean; reason?: string }>;
  }> {
    const ruleMatches: Array<{ ruleId: string; ruleName: string; matched: boolean; reason?: string }> = [];
    if (!flag.rules || flag.rules.length === 0) {
      return { passed: true, reason: 'No rules defined', ruleMatches };
    }
    let allRulesPassed = true;
    let failureReason = '';
    for (const rule of flag.rules) {
      if (!rule.enabled) {
        ruleMatches.push({
          ruleId: rule.id,
          ruleName: rule.name,
          matched: true,
          reason: 'Rule disabled (skipped)'
        });
        continue;
      }
      try {
        const evaluationResult = await this.ruleEvaluatorRegistry.evaluateRule(rule, context);
        const ruleMatched = evaluationResult.matched;
        ruleMatches.push({
          ruleId: rule.id,
          ruleName: rule.name,
          matched: ruleMatched,
          reason: evaluationResult.reason
        });
        if (!ruleMatched) {
          allRulesPassed = false;
          failureReason = `Rule '${rule.name}' not satisfied`;
          break; // Stop on first rule failure for AND logic
        }
      } catch (error) {
        this.logger.error('Rule evaluation error', {
          error: error.message,
          ruleId: rule.id,
          ruleType: rule.type
        });
        ruleMatches.push({
          ruleId: rule.id,
          ruleName: rule.name,
          matched: false,
          reason: `Evaluation error: ${error.message}`
        });
        allRulesPassed = false;
        failureReason = `Rule evaluation error: ${error.message}`;
        break;
      }
    }
    return {
      passed: allRulesPassed,
      reason: allRulesPassed ? 'All rules satisfied' : failureReason,
      ruleMatches
    };
  }
  /**
   * Determine variation based on rollout strategy
   */
  private async determineVariation(
    flag: FeatureFlagConfiguration,
    context: FeatureFlagContext
  ): Promise<{ id: string; value: any }> {
    if (!flag.variations || flag.variations.length === 0) {
      return {
        id: flag.defaultVariation,
        value: this.getVariationValue(flag, flag.defaultVariation)
      };
    }
    switch (flag.rolloutStrategy) {
      case 'percentage':
        return this.getVariationByPercentage(flag, context);
      case 'user_id':
        return this.getVariationByUserId(flag, context);
      case 'custom':
        return this.getVariationByCustomLogic(flag, context);
      default:
        return {
          id: flag.defaultVariation,
          value: this.getVariationValue(flag, flag.defaultVariation)
        };
    }
  }
  private getVariationByPercentage(
    flag: FeatureFlagConfiguration,
    context: FeatureFlagContext
  ): { id: string; value: any } {
    if (!context.userId) {
      const defaultVar = flag.variations.find(v => v.id === flag.defaultVariation);
      return {
        id: flag.defaultVariation,
        value: defaultVar?.value
      };
    }
    // Calculate hash and determine variation based on weight distribution
    const hash = this.hashString(`${context.userId}:${flag.name}:${flag.version}`);
    const percentage = (hash % 100) + 1;
    let cumulativeWeight = 0;
    for (const variation of flag.variations) {
      cumulativeWeight += variation.weight || 0;
      if (percentage <= cumulativeWeight) {
        return {
          id: variation.id,
          value: variation.value
        };
      }
    }
    // Fallback to default
    const defaultVar = flag.variations.find(v => v.id === flag.defaultVariation);
    return {
      id: flag.defaultVariation,
      value: defaultVar?.value
    };
  }
  private getVariationByUserId(
    flag: FeatureFlagConfiguration,
    context: FeatureFlagContext
  ): { id: string; value: any } {
    if (!context.userId || flag.variations.length === 0) {
      const defaultVar = flag.variations.find(v => v.id === flag.defaultVariation);
      return {
        id: flag.defaultVariation,
        value: defaultVar?.value
      };
    }
    // Use user ID to consistently select same variation
    const hash = this.hashString(context.userId);
    const variationIndex = hash % flag.variations.length;
    const selectedVariation = flag.variations[variationIndex];
    return {
      id: selectedVariation.id,
      value: selectedVariation.value
    };
  }
  private getVariationByCustomLogic(
    flag: FeatureFlagConfiguration,
    context: FeatureFlagContext
  ): { id: string; value: any } {
    // Custom variation logic would be implemented here
    // This could involve complex business rules, external data, etc.
    const defaultVar = flag.variations.find(v => v.id === flag.defaultVariation);
    return {
      id: flag.defaultVariation,
      value: defaultVar?.value
    };
  }
  /**
   * Utility methods
   */
  private hashString(input: string): number {
    let hash = 0;
    if (input.length === 0) return hash;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
  private buildCacheKey(flagName: string, context: FeatureFlagContext): string {
    const keyParts = [
      this.CACHE_PREFIX,
      context.companyId,
      context.environment || 'production',
      flagName,
      context.userId || 'anonymous',
      context.userRole || 'default'
    ];
    return keyParts.join(':');
  }
  private async getCachedFlag(cacheKey: string): Promise<FeatureFlagConfiguration | null> {
    try {
      return await this.cacheService.get(cacheKey);
    } catch (error) {
      this.logger.warn('Cache retrieval failed', { error: error.message, cacheKey });
      return null;
    }
  }
  private async cacheFlag(cacheKey: string, flag: FeatureFlagConfiguration): Promise<void> {
    try {
      await this.cacheService.set(cacheKey, flag, this.CACHE_TTL);
    } catch (error) {
      this.logger.warn('Cache storage failed', { error: error.message, cacheKey });
    }
  }
  private async loadFlag(
    flagName: string, 
    companyId: string, 
    environment: string
  ): Promise<FeatureFlagConfiguration | null> {
    try {
      return await this.flagRepository.findByName(flagName, companyId, environment);
    } catch (error) {
      this.logger.error('Flag loading failed', {
        error: error.message,
        flagName,
        companyId,
        environment
      });
      return null;
    }
  }
  private async invalidateFlagCache(
    flagName: string, 
    companyId: string, 
    environment: string
  ): Promise<void> {
    try {
      // Invalidate all possible cache keys for this flag
      const pattern = `${this.CACHE_PREFIX}${companyId}:${environment}:${flagName}:*`;
      await this.cacheService.deletePattern(pattern);
    } catch (error) {
      this.logger.warn('Cache invalidation failed', {
        error: error.message,
        flagName,
        companyId,
        environment
      });
    }
  }
  private isTimeActive(flag: FeatureFlagConfiguration): boolean {
    const now = new Date();
    if (flag.startDate && now < flag.startDate) {
      return false;
    }
    if (flag.endDate && now > flag.endDate) {
      return false;
    }
    return true;
  }
  private getVariationValue(flag: FeatureFlagConfiguration, variationId: string): any {
    const variation = flag.variations?.find(v => v.id === variationId);
    return variation?.value;
  }
  private async createEvaluationResult(
    enabled: boolean,
    variation: string | null,
    value: any,
    reason: string,
    ruleMatches: Array<{ ruleId: string; ruleName: string; matched: boolean; reason?: string }>,
    startTime: number,
    cacheHit: boolean,
    flag: FeatureFlagConfiguration | null,
    context: FeatureFlagContext
  ): Promise<EvaluationResult> {
    const result: EvaluationResult = {
      enabled,
      variation: variation || undefined,
      value,
      reason,
      ruleMatches,
      evaluationTime: Date.now() - startTime,
      cacheHit,
      flag: flag || undefined,
      context
    };
    // Cache the evaluation result for future use (if not from cache)
    if (!cacheHit && flag) {
      try {
        await this.cacheManager.cacheEvaluation(flag.name, context, result, flag);
      } catch (error) {
        this.logger.warn('Failed to cache evaluation result', { error, flagName: flag.name });
      }
    }
    return result;
  }
  private async evaluatePrerequisites(
    prerequisites: string[],
    context: FeatureFlagContext
  ): Promise<{ satisfied: boolean; reason: string }> {
    for (const prerequisite of prerequisites) {
      const result = await this.evaluateFlag(prerequisite, context);
      if (!result.enabled) {
        return {
          satisfied: false,
          reason: `Prerequisite '${prerequisite}' not satisfied`
        };
      }
    }
    return { satisfied: true, reason: 'All prerequisites satisfied' };
  }
  private async recordEvaluation(
    flag: FeatureFlagConfiguration,
    context: FeatureFlagContext,
    variation: { id: string; value: any },
    enabled: boolean
  ): Promise<void> {
    try {
      // Record analytics data
      const analyticsData = {
        flagName: flag.name,
        companyId: context.companyId,
        userId: context.userId,
        variation: variation.id,
        enabled,
        timestamp: new Date(),
        context: {
          environment: context.environment,
          userRole: context.userRole,
          deviceInfo: context.deviceInfo,
          geoLocation: context.geoLocation
        }
      };
      // Store in analytics system (could be database, external service, etc.)
      await this.storeAnalytics(analyticsData);
    } catch (error) {
      this.logger.error('Failed to record evaluation analytics', {
        error: error.message,
        flagName: flag.name
      });
    }
  }
  private async storeAnalytics(data: any): Promise<void> {
    // Implementation would store analytics data
    // This could be a time-series database, analytics service, etc.
  }
  private async calculateAnalytics(
    flagName?: string,
    companyId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<AnalyticsData> {
    // Implementation would calculate analytics from stored data
    return {
      flagName: flagName || 'all',
      evaluations: this.metrics.totalEvaluations,
      uniqueUsers: this.metrics.uniqueUsers.size,
      variations: {},
      ruleMatches: {},
      averageEvaluationTime: this.metrics.totalEvaluationTime / this.metrics.totalEvaluations || 0,
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0,
      errorRate: this.metrics.errors / this.metrics.totalEvaluations || 0,
      period: timeRange || { start: new Date(), end: new Date() }
    };
  }
  private startMetricsCollection(): void {
    // Reset metrics periodically
    setInterval(() => {
      const oldMetrics = { ...this.metrics };
      // Reset counters but keep cumulative data
      this.metrics.totalEvaluations = 0;
      this.metrics.cacheHits = 0;
      this.metrics.cacheMisses = 0;
      this.metrics.totalEvaluationTime = 0;
      this.metrics.errors = 0;
      this.metrics.uniqueUsers.clear();
      // Emit metrics for monitoring
      this.emit('metricsCollected', oldMetrics);
    }, 60 * 60 * 1000); // Every hour
  }
  /**
   * Public API methods for compatibility
   */
  async isEnabled(flagName: string, context: any): Promise<any> {
    const result = await this.evaluateFlag(flagName, context);
    return {
      enabled: result.enabled,
      value: result.value,
      reason: result.reason,
      evaluationTime: result.evaluationTime,
      flag: result.flag
    };
  }
  // Additional methods would be implemented here...
}
