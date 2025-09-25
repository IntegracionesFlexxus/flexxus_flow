// Main Pricing Operations Hook - Sprint 19 Phase 3
// Central hook for all pricing operations and calculations

import { useState, useCallback, useEffect } from 'react';
import { usePricingStore } from '../../../../stores/pricingStore';
import { pricingService } from '../services/pricingService';
import {
  PriceCalculationParams,
  PriceResult,
  PricingRule,
  PricingScenario,
  SimulationResult,
  PricingAnalytics,
  DiscountCode,
  PriceMatrix
} from '../../../shared/types/pricing.types';

interface PricingMetrics {
  metrics: {
    totalRules: number;
    activeRules: number;
    inactiveRules: number;
    averageDiscount: number;
    totalDiscountCodes: number;
    priceVariance: number;
    marginImpact: number;
    calculationsToday: number;
    performanceMs: number;
  };
  performance: Array<{
    date: string;
    calculations: number;
    avgResponseTime: number;
    cacheHitRate: number;
  }>;
  ruleUsage: Array<{
    ruleName: string;
    applications: number;
    impact: number;
    type: string;
  }>;
}

interface PricingOperations {
  // Price calculations
  calculatePrice: (params: PriceCalculationParams, useCache?: boolean) => Promise<PriceResult>;
  batchCalculatePrice: (paramsList: PriceCalculationParams[]) => Promise<PriceResult[]>;
  recalculatePrice: (params: PriceCalculationParams) => Promise<PriceResult>;

  // Rule management
  createRule: (rule: Omit<PricingRule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PricingRule>;
  updateRule: (id: number, updates: Partial<PricingRule>) => Promise<void>;
  deleteRule: (id: number) => Promise<void>;
  testRule: (rule: PricingRule, testParams: PriceCalculationParams[]) => Promise<any[]>;

  // Discount codes
  createDiscountCode: (code: Omit<DiscountCode, 'id' | 'createdAt' | 'updatedAt'>) => Promise<DiscountCode>;
  validateDiscountCode: (code: string, params: any) => Promise<{ valid: boolean; discount?: DiscountCode; error?: string }>;

  // Analytics and metrics
  getPricingMetrics: (period: string) => Promise<PricingMetrics>;
  getAnalytics: (period: { start: string; end: string }) => Promise<PricingAnalytics>;

  // Optimization
  optimizePricing: (productIds: number[], constraints?: any) => Promise<any>;

  // Cache management
  clearCache: () => void;
  clearProductCache: (productId: number) => void;

  // Utilities
  formatPrice: (amount: number, currency?: string) => string;
  calculateDiscount: (basePrice: number, discountPercent: number) => number;
  isRuleActive: (rule: PricingRule) => boolean;
  getRuleConflicts: (rule: PricingRule) => PricingRule[];
}

interface UsePricingReturn extends PricingOperations {
  // State
  loading: boolean;
  error: string | null;
  calculationHistory: Array<{
    timestamp: number;
    params: PriceCalculationParams;
    result: PriceResult;
    responseTime: number;
  }>;

  // Performance metrics
  performance: {
    averageResponseTime: number;
    cacheHitRate: number;
    successRate: number;
    totalCalculations: number;
  };

  // Utilities
  clearError: () => void;
  resetPerformance: () => void;
}

export const usePricing = (): UsePricingReturn => {
  const [calculationHistory, setCalculationHistory] = useState<Array<{
    timestamp: number;
    params: PriceCalculationParams;
    result: PriceResult;
    responseTime: number;
  }>>([]);

  const [performance, setPerformance] = useState({
    averageResponseTime: 0,
    cacheHitRate: 0,
    successRate: 100,
    totalCalculations: 0
  });

  const {
    // State
    loading,
    calculationLoading,
    error,

    // Store actions
    calculatePrice: storeCalculatePrice,
    batchCalculatePrice: storeBatchCalculatePrice,
    createPricingRule,
    updatePricingRule,
    deletePricingRule,
    testPricingRule,
    createDiscountCode: storeCreateDiscountCode,
    validateDiscountCode: storeValidateDiscountCode,
    loadAnalytics,
    clearPriceCache,
    clearProductPriceCache,
    clearError: storeClearError
  } = usePricingStore();

  // Load calculation history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('pricingCalculationHistory');
    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory);
        setCalculationHistory(history.slice(0, 100)); // Keep last 100 calculations
      } catch (error) {
        console.error('Failed to load calculation history:', error);
      }
    }
  }, []);

  // Save calculation history to localStorage
  useEffect(() => {
    localStorage.setItem('pricingCalculationHistory', JSON.stringify(calculationHistory));
  }, [calculationHistory]);

  // Update performance metrics when history changes
  useEffect(() => {
    if (calculationHistory.length > 0) {
      const avgResponseTime = calculationHistory.reduce((sum, calc) => sum + calc.responseTime, 0) / calculationHistory.length;
      const cacheHits = calculationHistory.filter(calc => calc.responseTime < 50).length;
      const cacheHitRate = (cacheHits / calculationHistory.length) * 100;

      setPerformance({
        averageResponseTime: Math.round(avgResponseTime),
        cacheHitRate: Math.round(cacheHitRate),
        successRate: 100, // Will be updated with actual error tracking
        totalCalculations: calculationHistory.length
      });
    }
  }, [calculationHistory]);

  // Enhanced price calculation with history tracking
  const calculatePrice = useCallback(async (
    params: PriceCalculationParams,
    useCache: boolean = true
  ): Promise<PriceResult> => {
    const startTime = performance.now();

    try {
      const result = await storeCalculatePrice(params, useCache);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      // Add to history
      const historyEntry = {
        timestamp: Date.now(),
        params: { ...params },
        result,
        responseTime
      };

      setCalculationHistory(prev => [historyEntry, ...prev.slice(0, 99)]);

      return result;
    } catch (error) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      // Track failed calculations too
      console.error('Price calculation failed:', error);
      throw error;
    }
  }, [storeCalculatePrice]);

  // Batch price calculation
  const batchCalculatePrice = useCallback(async (
    paramsList: PriceCalculationParams[]
  ): Promise<PriceResult[]> => {
    const startTime = performance.now();

    try {
      const results = await storeBatchCalculatePrice(paramsList);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      // Add batch calculation to history
      results.forEach((result, index) => {
        const historyEntry = {
          timestamp: Date.now() + index, // Slight offset for each result
          params: paramsList[index],
          result,
          responseTime: responseTime / results.length // Distribute time across all calculations
        };

        setCalculationHistory(prev => [historyEntry, ...prev.slice(0, 99)]);
      });

      return results;
    } catch (error) {
      console.error('Batch price calculation failed:', error);
      throw error;
    }
  }, [storeBatchCalculatePrice]);

  // Force recalculation (bypassing cache)
  const recalculatePrice = useCallback(async (
    params: PriceCalculationParams
  ): Promise<PriceResult> => {
    return calculatePrice(params, false);
  }, [calculatePrice]);

  // Rule management operations
  const createRule = useCallback(async (
    rule: Omit<PricingRule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PricingRule> => {
    try {
      const newRule = await createPricingRule(rule);

      // Clear cache since new rule affects pricing
      clearCache();

      return newRule;
    } catch (error) {
      console.error('Failed to create pricing rule:', error);
      throw error;
    }
  }, [createPricingRule]);

  const updateRule = useCallback(async (
    id: number,
    updates: Partial<PricingRule>
  ): Promise<void> => {
    try {
      await updatePricingRule(id, updates);

      // Clear cache since rule changes affect pricing
      clearCache();
    } catch (error) {
      console.error('Failed to update pricing rule:', error);
      throw error;
    }
  }, [updatePricingRule]);

  const deleteRule = useCallback(async (id: number): Promise<void> => {
    try {
      await deletePricingRule(id);

      // Clear cache since rule deletion affects pricing
      clearCache();
    } catch (error) {
      console.error('Failed to delete pricing rule:', error);
      throw error;
    }
  }, [deletePricingRule]);

  const testRule = useCallback(async (
    rule: PricingRule,
    testParams: PriceCalculationParams[]
  ): Promise<any[]> => {
    try {
      return await testPricingRule(rule, testParams);
    } catch (error) {
      console.error('Failed to test pricing rule:', error);
      throw error;
    }
  }, [testPricingRule]);

  // Discount code operations
  const createDiscountCode = useCallback(async (
    code: Omit<DiscountCode, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DiscountCode> => {
    try {
      return await storeCreateDiscountCode(code);
    } catch (error) {
      console.error('Failed to create discount code:', error);
      throw error;
    }
  }, [storeCreateDiscountCode]);

  const validateDiscountCode = useCallback(async (
    code: string,
    params: any
  ): Promise<{ valid: boolean; discount?: DiscountCode; error?: string }> => {
    try {
      return await storeValidateDiscountCode(code, params);
    } catch (error) {
      console.error('Failed to validate discount code:', error);
      throw error;
    }
  }, [storeValidateDiscountCode]);

  // Analytics and metrics
  const getPricingMetrics = useCallback(async (period: string): Promise<PricingMetrics> => {
    try {
      // This would typically call a dedicated metrics endpoint
      // For now, we'll simulate with mock data
      const mockMetrics: PricingMetrics = {
        metrics: {
          totalRules: 15,
          activeRules: 12,
          inactiveRules: 3,
          averageDiscount: 8.5,
          totalDiscountCodes: 25,
          priceVariance: 4.2,
          marginImpact: 2.1,
          calculationsToday: calculationHistory.length,
          performanceMs: performance.averageResponseTime
        },
        performance: [
          { date: '2024-01-01', calculations: 150, avgResponseTime: 120, cacheHitRate: 85 },
          { date: '2024-01-02', calculations: 180, avgResponseTime: 110, cacheHitRate: 88 },
          { date: '2024-01-03', calculations: 200, avgResponseTime: 105, cacheHitRate: 90 },
        ],
        ruleUsage: [
          { ruleName: 'Volume Discount', applications: 45, impact: 1250, type: 'volume' },
          { ruleName: 'Customer Tier', applications: 38, impact: 980, type: 'customer' },
          { ruleName: 'Seasonal Sale', applications: 22, impact: 560, type: 'promotional' },
        ]
      };

      return mockMetrics;
    } catch (error) {
      console.error('Failed to get pricing metrics:', error);
      throw error;
    }
  }, [calculationHistory.length, performance.averageResponseTime]);

  const getAnalytics = useCallback(async (
    period: { start: string; end: string }
  ): Promise<PricingAnalytics> => {
    try {
      await loadAnalytics(period);
      // Return would come from store after loading
      return {} as PricingAnalytics;
    } catch (error) {
      console.error('Failed to get analytics:', error);
      throw error;
    }
  }, [loadAnalytics]);

  // Optimization
  const optimizePricing = useCallback(async (
    productIds: number[],
    constraints?: any
  ): Promise<any> => {
    try {
      // This would call optimization service
      console.log('Optimizing pricing for products:', productIds);
      return {};
    } catch (error) {
      console.error('Failed to optimize pricing:', error);
      throw error;
    }
  }, []);

  // Cache management
  const clearCache = useCallback(() => {
    clearPriceCache();
  }, [clearPriceCache]);

  const clearProductCache = useCallback((productId: number) => {
    clearProductPriceCache(productId);
  }, [clearProductPriceCache]);

  // Utility functions
  const formatPrice = useCallback((amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }, []);

  const calculateDiscount = useCallback((basePrice: number, discountPercent: number): number => {
    return basePrice * (discountPercent / 100);
  }, []);

  const isRuleActive = useCallback((rule: PricingRule): boolean => {
    if (!rule.isActive) return false;

    const now = new Date();
    if (rule.validFrom && new Date(rule.validFrom) > now) return false;
    if (rule.validTo && new Date(rule.validTo) < now) return false;

    return true;
  }, []);

  const getRuleConflicts = useCallback((rule: PricingRule): PricingRule[] => {
    // This would analyze rule conflicts based on conditions and priorities
    // For now, return empty array
    return [];
  }, []);

  // Utilities
  const clearError = useCallback(() => {
    storeClearError();
  }, [storeClearError]);

  const resetPerformance = useCallback(() => {
    setPerformance({
      averageResponseTime: 0,
      cacheHitRate: 0,
      successRate: 100,
      totalCalculations: 0
    });
    setCalculationHistory([]);
  }, []);

  return {
    // State
    loading: loading || calculationLoading,
    error,
    calculationHistory,
    performance,

    // Price calculations
    calculatePrice,
    batchCalculatePrice,
    recalculatePrice,

    // Rule management
    createRule,
    updateRule,
    deleteRule,
    testRule,

    // Discount codes
    createDiscountCode,
    validateDiscountCode,

    // Analytics and metrics
    getPricingMetrics,
    getAnalytics,

    // Optimization
    optimizePricing,

    // Cache management
    clearCache,
    clearProductCache,

    // Utilities
    formatPrice,
    calculateDiscount,
    isRuleActive,
    getRuleConflicts,
    clearError,
    resetPerformance
  };
};

export default usePricing;