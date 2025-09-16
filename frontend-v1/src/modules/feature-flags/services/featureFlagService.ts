/**
 * Feature Flag Service - Sprint 3
 * Servicio para interactuar con la API de feature flags
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */

import { BaseService } from '@/shared/services/BaseService';
import { api } from '@/shared/services/api';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  environment: string;
  companyId: string;
  rolloutPercentage: number;
  rolloutStrategy: 'percentage' | 'user_id' | 'custom';
  rules: FeatureFlagRule[];
  variations: FeatureFlagVariation[];
  defaultVariation: string;
  category?: string;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface FeatureFlagRule {
  id: string;
  name: string;
  type: 'user_attribute' | 'user_segment' | 'percentage' | 'time_window' | 'geo_location' | 'device' | 'custom';
  enabled: boolean;
  weight?: number;
  conditions: any;
}

export interface FeatureFlagVariation {
  id: string;
  name: string;
  value: any;
  description?: string;
  weight?: number;
}

export interface FeatureFlagEvaluation {
  enabled: boolean;
  variation?: string;
  value?: any;
  reason: string;
  evaluationTime: number;
  cacheHit: boolean;
  ruleMatches: Array<{
    ruleId: string;
    ruleName: string;
    matched: boolean;
    reason?: string;
  }>;
}

export interface FeatureFlagAnalytics {
  flagName: string;
  evaluations: number;
  uniqueUsers: number;
  variations: Record<string, number>;
  ruleMatches: Record<string, number>;
  averageEvaluationTime: number;
  cacheHitRate: number;
  errorRate: number;
  period: {
    start: string;
    end: string;
  };
}

export interface FeatureFlagContext {
  userId?: string;
  companyId: string;
  environment?: string;
  userRole?: string;
  userAttributes?: Record<string, any>;
  deviceInfo?: Record<string, any>;
  geoLocation?: Record<string, any>;
  sessionAttributes?: Record<string, any>;
  requestMetadata?: Record<string, any>;
}

export interface CreateFeatureFlagRequest {
  name: string;
  description: string;
  environment: string;
  enabled?: boolean;
  rolloutPercentage?: number;
  rolloutStrategy?: 'percentage' | 'user_id' | 'custom';
  rules?: Partial<FeatureFlagRule>[];
  variations?: Partial<FeatureFlagVariation>[];
  defaultVariation?: string;
  category?: string;
  tags?: string[];
}

export interface UpdateFeatureFlagRequest {
  name?: string;
  description?: string;
  enabled?: boolean;
  rolloutPercentage?: number;
  rolloutStrategy?: 'percentage' | 'user_id' | 'custom';
  rules?: Partial<FeatureFlagRule>[];
  variations?: Partial<FeatureFlagVariation>[];
  defaultVariation?: string;
  category?: string;
  tags?: string[];
}

export interface BulkUpdateRequest {
  enabled?: boolean;
  category?: string;
  tags?: string[];
}

export interface FeatureFlagsResponse {
  flags: FeatureFlag[];
  total: number;
  page: number;
  limit: number;
}

export interface AnalyticsResponse {
  analytics: FeatureFlagAnalytics[];
  total: number;
}

class FeatureFlagService extends BaseService {
  private readonly baseUrl = '/feature-flags';

  /**
   * Get all feature flags
   */
  async getFeatureFlags(params?: {
    page?: number;
    limit?: number;
    environment?: string;
    category?: string;
    enabled?: boolean;
    search?: string;
  }): Promise<FeatureFlagsResponse> {
    const response = await api.get(this.baseUrl, { params });
    return this.handleResponse(response);
  }

  /**
   * Get a specific feature flag
   */
  async getFeatureFlag(flagId: string): Promise<{ flag: FeatureFlag }> {
    const response = await api.get(`${this.baseUrl}/${flagId}`);
    return this.handleResponse(response);
  }

  /**
   * Create a new feature flag
   */
  async createFeatureFlag(data: CreateFeatureFlagRequest): Promise<{ flag: FeatureFlag }> {
    const response = await api.post(this.baseUrl, data);
    return this.handleResponse(response);
  }

  /**
   * Update an existing feature flag
   */
  async updateFeatureFlag(flagId: string, data: UpdateFeatureFlagRequest): Promise<{ flag: FeatureFlag }> {
    const response = await api.put(`${this.baseUrl}/${flagId}`, data);
    return this.handleResponse(response);
  }

  /**
   * Delete a feature flag
   */
  async deleteFeatureFlag(flagId: string): Promise<{ success: boolean }> {
    const response = await api.delete(`${this.baseUrl}/${flagId}`);
    return this.handleResponse(response);
  }

  /**
   * Evaluate a feature flag
   */
  async evaluateFeatureFlag(flagName: string, context?: Partial<FeatureFlagContext>): Promise<FeatureFlagEvaluation> {
    const response = await api.post(`${this.baseUrl}/${flagName}/evaluate`, { context });
    return this.handleResponse(response);
  }

  /**
   * Evaluate multiple feature flags
   */
  async evaluateMultipleFlags(flagNames: string[], context?: Partial<FeatureFlagContext>): Promise<Record<string, FeatureFlagEvaluation>> {
    const response = await api.post(`${this.baseUrl}/evaluate-multiple`, { flagNames, context });
    return this.handleResponse(response);
  }

  /**
   * Bulk update multiple feature flags
   */
  async bulkUpdateFlags(flagIds: string[], data: BulkUpdateRequest): Promise<{ updated: number }> {
    const response = await api.put(`${this.baseUrl}/bulk-update`, { flagIds, data });
    return this.handleResponse(response);
  }

  /**
   * Clone feature flags between environments
   */
  async cloneFlags(sourceEnvironment: string, targetEnvironment: string, flagIds?: string[]): Promise<{ cloned: number }> {
    const response = await api.post(`${this.baseUrl}/clone`, {
      sourceEnvironment,
      targetEnvironment,
      flagIds
    });
    return this.handleResponse(response);
  }

  /**
   * Get feature flag analytics
   */
  async getAnalytics(params?: {
    flagNames?: string[];
    startDate?: string;
    endDate?: string;
    environment?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<AnalyticsResponse> {
    const response = await api.get(`${this.baseUrl}/analytics`, { params });
    return this.handleResponse(response);
  }

  /**
   * Get feature flag usage metrics
   */
  async getUsageMetrics(flagName: string, params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'hour' | 'day' | 'week';
  }): Promise<{
    metrics: {
      timestamp: string;
      evaluations: number;
      uniqueUsers: number;
      enabled: number;
      disabled: number;
    }[];
  }> {
    const response = await api.get(`${this.baseUrl}/${flagName}/metrics`, { params });
    return this.handleResponse(response);
  }

  /**
   * Test feature flag rules
   */
  async testRules(flagId: string, testCases: Array<{
    name: string;
    context: FeatureFlagContext;
    expectedResult: boolean;
  }>): Promise<{
    results: Array<{
      testCase: string;
      expected: boolean;
      actual: boolean;
      passed: boolean;
      evaluation: FeatureFlagEvaluation;
    }>;
  }> {
    const response = await api.post(`${this.baseUrl}/${flagId}/test-rules`, { testCases });
    return this.handleResponse(response);
  }

  /**
   * Get feature flag history
   */
  async getFlagHistory(flagId: string, params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    history: Array<{
      id: string;
      action: string;
      changes: Record<string, any>;
      changedBy: string;
      changedAt: string;
      version: number;
    }>;
    total: number;
  }> {
    const response = await api.get(`${this.baseUrl}/${flagId}/history`, { params });
    return this.handleResponse(response);
  }

  /**
   * Export feature flags configuration
   */
  async exportFlags(environment?: string, format: 'json' | 'yaml' = 'json'): Promise<Blob> {
    const response = await api.get(`${this.baseUrl}/export`, {
      params: { environment, format },
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Import feature flags configuration
   */
  async importFlags(file: File, options?: {
    environment?: string;
    merge?: boolean;
    overwrite?: boolean;
  }): Promise<{ imported: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const response = await api.post(`${this.baseUrl}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return this.handleResponse(response);
  }

  /**
   * Get available rule types and their schemas
   */
  async getRuleTypes(): Promise<{
    ruleTypes: Array<{
      type: string;
      name: string;
      description: string;
      schema: Record<string, any>;
      examples: any[];
    }>;
  }> {
    const response = await api.get(`${this.baseUrl}/rule-types`);
    return this.handleResponse(response);
  }

  /**
   * Validate feature flag configuration
   */
  async validateFlag(data: CreateFeatureFlagRequest | UpdateFeatureFlagRequest): Promise<{
    valid: boolean;
    errors: Array<{
      field: string;
      message: string;
    }>;
  }> {
    const response = await api.post(`${this.baseUrl}/validate`, data);
    return this.handleResponse(response);
  }

  /**
   * Get feature flag dependencies
   */
  async getDependencies(flagId: string): Promise<{
    dependencies: Array<{
      id: string;
      name: string;
      type: 'prerequisite' | 'dependent';
    }>;
  }> {
    const response = await api.get(`${this.baseUrl}/${flagId}/dependencies`);
    return this.handleResponse(response);
  }

  /**
   * Client-side flag evaluation with caching
   */
  private flagCache = new Map<string, { evaluation: FeatureFlagEvaluation; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Evaluate flag with client-side caching
   */
  async isEnabled(flagName: string, context?: Partial<FeatureFlagContext>): Promise<boolean> {
    try {
      const cacheKey = `${flagName}-${JSON.stringify(context || {})}`;
      const cached = this.flagCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.evaluation.enabled;
      }

      const evaluation = await this.evaluateFeatureFlag(flagName, context);
      this.flagCache.set(cacheKey, { evaluation, timestamp: Date.now() });
      
      return evaluation.enabled;
    } catch (error) {
      console.error('Feature flag evaluation failed:', error);
      return false; // Fail-safe: return false on error
    }
  }

  /**
   * Get flag value with client-side caching
   */
  async getValue<T = any>(flagName: string, defaultValue: T, context?: Partial<FeatureFlagContext>): Promise<T> {
    try {
      const cacheKey = `${flagName}-${JSON.stringify(context || {})}`;
      const cached = this.flagCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.evaluation.enabled ? (cached.evaluation.value ?? defaultValue) : defaultValue;
      }

      const evaluation = await this.evaluateFeatureFlag(flagName, context);
      this.flagCache.set(cacheKey, { evaluation, timestamp: Date.now() });
      
      return evaluation.enabled ? (evaluation.value ?? defaultValue) : defaultValue;
    } catch (error) {
      console.error('Feature flag evaluation failed:', error);
      return defaultValue; // Fail-safe: return default on error
    }
  }

  /**
   * Clear flag cache
   */
  clearCache(flagName?: string): void {
    if (flagName) {
      // Clear specific flag from cache
      for (const key of this.flagCache.keys()) {
        if (key.startsWith(flagName + '-')) {
          this.flagCache.delete(key);
        }
      }
    } else {
      // Clear entire cache
      this.flagCache.clear();
    }
  }
}

export const featureFlagService = new FeatureFlagService();