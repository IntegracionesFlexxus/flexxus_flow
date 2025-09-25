// Pricing Service - Sprint 19 Frontend Implementation

import {
  PricingRule,
  PriceCalculationParams,
  PriceResult,
  DiscountCode,
  PriceMatrix,
  PricingScenario,
  SimulationResult,
  OptimizationGoal,
  PricingRecommendation,
  PricingAnalytics,
  ApiResponse,
  CreateDto,
  UpdateDto
} from '../../shared/types';

// API Endpoints
const ENDPOINTS = {
  CALCULATE_PRICE: '/api/crm/pricing/calculate',
  PRICING_RULES: '/api/crm/pricing/rules',
  DISCOUNT_CODES: '/api/crm/pricing/discount-codes',
  PRICE_MATRICES: '/api/crm/pricing/matrices',
  PRICE_ANALYTICS: '/api/crm/pricing/analytics',
  SIMULATE_PRICING: '/api/crm/pricing/simulate',
  OPTIMIZE_PRICING: '/api/crm/pricing/optimize',
  RECOMMENDATIONS: '/api/crm/pricing/recommendations'
};

class PricingService {
  private baseUrl: string;
  private priceCache: Map<string, { result: PriceResult; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Calculate price with dynamic rules and caching
   */
  async calculatePrice(params: PriceCalculationParams, useCache: boolean = true): Promise<PriceResult> {
    const cacheKey = this.generateCacheKey(params);

    // Check cache first
    if (useCache && this.priceCache.has(cacheKey)) {
      const cached = this.priceCache.get(cacheKey)!;
      const isValid = Date.now() - cached.timestamp < this.CACHE_DURATION;

      if (isValid) {
        return cached.result;
      } else {
        this.priceCache.delete(cacheKey);
      }
    }

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.CALCULATE_PRICE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error(`Price calculation failed: ${response.statusText}`);
    }

    const data: ApiResponse<PriceResult> = await response.json();
    const result = data.data;

    // Cache the result
    if (useCache) {
      this.priceCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });
    }

    return result;
  }

  /**
   * Batch calculate prices for multiple products
   */
  async batchCalculatePrice(paramsList: PriceCalculationParams[]): Promise<PriceResult[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.CALCULATE_PRICE}/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ calculations: paramsList })
    });

    if (!response.ok) {
      throw new Error(`Batch price calculation failed: ${response.statusText}`);
    }

    const data: ApiResponse<PriceResult[]> = await response.json();
    return data.data;
  }

  /**
   * Get all pricing rules
   */
  async getPricingRules(filters?: { active?: boolean; companyId?: number }): Promise<PricingRule[]> {
    const queryParams = new URLSearchParams();
    if (filters?.active !== undefined) {
      queryParams.append('active', filters.active.toString());
    }
    if (filters?.companyId) {
      queryParams.append('companyId', filters.companyId.toString());
    }

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PRICING_RULES}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch pricing rules: ${response.statusText}`);
    }

    const data: ApiResponse<PricingRule[]> = await response.json();
    return data.data;
  }

  /**
   * Create new pricing rule
   */
  async createPricingRule(ruleData: CreateDto<PricingRule>): Promise<PricingRule> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PRICING_RULES}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(ruleData)
    });

    if (!response.ok) {
      throw new Error(`Failed to create pricing rule: ${response.statusText}`);
    }

    const data: ApiResponse<PricingRule> = await response.json();

    // Clear relevant cache entries
    this.clearCache();

    return data.data;
  }

  /**
   * Update pricing rule
   */
  async updatePricingRule(id: number, updates: UpdateDto<PricingRule>): Promise<PricingRule> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PRICING_RULES}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Failed to update pricing rule: ${response.statusText}`);
    }

    const data: ApiResponse<PricingRule> = await response.json();

    // Clear relevant cache entries
    this.clearCache();

    return data.data;
  }

  /**
   * Delete pricing rule
   */
  async deletePricingRule(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PRICING_RULES}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete pricing rule: ${response.statusText}`);
    }

    // Clear relevant cache entries
    this.clearCache();
  }

  /**
   * Test pricing rule with sample data
   */
  async testPricingRule(rule: PricingRule, testParams: PriceCalculationParams[]): Promise<{ params: PriceCalculationParams; result: PriceResult; matched: boolean }[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PRICING_RULES}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ rule, testParams })
    });

    if (!response.ok) {
      throw new Error(`Failed to test pricing rule: ${response.statusText}`);
    }

    const data: ApiResponse<any[]> = await response.json();
    return data.data;
  }

  /**
   * Get all discount codes
   */
  async getDiscountCodes(filters?: { active?: boolean; companyId?: number }): Promise<DiscountCode[]> {
    const queryParams = new URLSearchParams();
    if (filters?.active !== undefined) {
      queryParams.append('active', filters.active.toString());
    }
    if (filters?.companyId) {
      queryParams.append('companyId', filters.companyId.toString());
    }

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.DISCOUNT_CODES}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch discount codes: ${response.statusText}`);
    }

    const data: ApiResponse<DiscountCode[]> = await response.json();
    return data.data;
  }

  /**
   * Create discount code
   */
  async createDiscountCode(codeData: CreateDto<DiscountCode>): Promise<DiscountCode> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.DISCOUNT_CODES}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(codeData)
    });

    if (!response.ok) {
      throw new Error(`Failed to create discount code: ${response.statusText}`);
    }

    const data: ApiResponse<DiscountCode> = await response.json();
    return data.data;
  }

  /**
   * Validate discount code
   */
  async validateDiscountCode(code: string, params: {
    customerId?: number;
    orderAmount?: number;
    productIds?: number[];
  }): Promise<{ valid: boolean; discount?: DiscountCode; error?: string }> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.DISCOUNT_CODES}/${code}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error(`Failed to validate discount code: ${response.statusText}`);
    }

    const data: ApiResponse<any> = await response.json();
    return data.data;
  }

  /**
   * Get price matrices
   */
  async getPriceMatrices(filters?: { type?: string; active?: boolean }): Promise<PriceMatrix[]> {
    const queryParams = new URLSearchParams();
    if (filters?.type) {
      queryParams.append('type', filters.type);
    }
    if (filters?.active !== undefined) {
      queryParams.append('active', filters.active.toString());
    }

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PRICE_MATRICES}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch price matrices: ${response.statusText}`);
    }

    const data: ApiResponse<PriceMatrix[]> = await response.json();
    return data.data;
  }

  /**
   * Simulate pricing scenarios
   */
  async simulatePricing(scenarios: PricingScenario[]): Promise<SimulationResult[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.SIMULATE_PRICING}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ scenarios })
    });

    if (!response.ok) {
      throw new Error(`Pricing simulation failed: ${response.statusText}`);
    }

    const data: ApiResponse<SimulationResult[]> = await response.json();
    return data.data;
  }

  /**
   * Get pricing optimization recommendations
   */
  async optimizePricing(goal: OptimizationGoal): Promise<PricingRecommendation[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.OPTIMIZE_PRICING}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(goal)
    });

    if (!response.ok) {
      throw new Error(`Pricing optimization failed: ${response.statusText}`);
    }

    const data: ApiResponse<PricingRecommendation[]> = await response.json();
    return data.data;
  }

  /**
   * Get pricing analytics
   */
  async getPricingAnalytics(period: { start: string; end: string }): Promise<PricingAnalytics> {
    const queryParams = new URLSearchParams({
      startDate: period.start,
      endDate: period.end
    });

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.PRICE_ANALYTICS}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch pricing analytics: ${response.statusText}`);
    }

    const data: ApiResponse<PricingAnalytics> = await response.json();
    return data.data;
  }

  /**
   * Get real-time price updates via WebSocket
   */
  subscribeToRealTimePrices(callback: (update: { productId: number; price: PriceResult }) => void): () => void {
    // This would connect to WebSocket endpoint
    // Implementation depends on your WebSocket setup
    const ws = new WebSocket(`${this.baseUrl.replace('http', 'ws')}/ws/pricing`);

    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      callback(update);
    };

    // Return cleanup function
    return () => {
      ws.close();
    };
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    this.priceCache.clear();
  }

  /**
   * Clear specific cache entries by pattern
   */
  clearCacheByProduct(productId: number): void {
    const keysToDelete: string[] = [];

    this.priceCache.forEach((_, key) => {
      if (key.includes(`productId:${productId}`)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.priceCache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hits: number; misses: number } {
    // This would need to be implemented with proper hit/miss tracking
    return {
      size: this.priceCache.size,
      hits: 0,
      misses: 0
    };
  }

  /**
   * Generate cache key for price calculation params
   */
  private generateCacheKey(params: PriceCalculationParams): string {
    const key = [
      `productId:${params.productId}`,
      `variantId:${params.variantId || 'null'}`,
      `quantity:${params.quantity}`,
      `customerId:${params.customerId || 'null'}`,
      `accountId:${params.accountId || 'null'}`,
      `currency:${params.currencyCode || 'USD'}`,
      `date:${params.date || new Date().toISOString().split('T')[0]}`,
      `context:${JSON.stringify(params.context || {})}`
    ].join('|');

    return btoa(key); // Base64 encode for cleaner cache keys
  }

  /**
   * Get authentication token from storage or context
   */
  private getAuthToken(): string {
    // This should be implemented based on your auth system
    return localStorage.getItem('authToken') || '';
  }

  /**
   * Handle API errors consistently
   */
  private handleError(error: any): never {
    console.error('PricingService Error:', error);
    throw error;
  }
}

// Export singleton instance
export const pricingService = new PricingService();
export default pricingService;