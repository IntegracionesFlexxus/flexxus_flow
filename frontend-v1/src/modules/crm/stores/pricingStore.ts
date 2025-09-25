// Pricing Store - Sprint 19 Frontend Implementation
// Zustand store for pricing engine management

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import {
  PricingRule,
  PriceCalculationParams,
  PriceResult,
  DiscountCode,
  PriceMatrix,
  PricingScenario,
  SimulationResult,
  PricingAnalytics,
  PricingRecommendation,
  OptimizationGoal,
  CreateDto,
  UpdateDto
} from '../product-quote/shared/types';
import { pricingService } from '../product-quote/pricing/services';

interface PricingStore {
  // State
  pricingRules: PricingRule[];
  discountCodes: DiscountCode[];
  priceMatrices: PriceMatrix[];
  priceCache: Map<string, { result: PriceResult; timestamp: number }>;
  analytics: PricingAnalytics | null;
  recommendations: PricingRecommendation[];
  simulationResults: SimulationResult[];

  // Loading states
  loading: boolean;
  rulesLoading: boolean;
  analyticsLoading: boolean;
  calculationLoading: boolean;

  // Error states
  error: string | null;

  // Real-time pricing
  realTimePricing: boolean;
  priceUpdatesSubscription: (() => void) | null;

  // Filter states
  activeRulesOnly: boolean;
  ruleTypeFilter: string | null;

  // Actions - Pricing Rules
  loadPricingRules: () => Promise<void>;
  createPricingRule: (rule: CreateDto<PricingRule>) => Promise<PricingRule>;
  updatePricingRule: (id: number, updates: UpdateDto<PricingRule>) => Promise<void>;
  deletePricingRule: (id: number) => Promise<void>;
  testPricingRule: (rule: PricingRule, testParams: PriceCalculationParams[]) => Promise<any[]>;
  toggleRuleActive: (id: number) => Promise<void>;
  reorderRules: (rules: PricingRule[]) => Promise<void>;

  // Actions - Price Calculations
  calculatePrice: (params: PriceCalculationParams, useCache?: boolean) => Promise<PriceResult>;
  batchCalculatePrice: (paramsList: PriceCalculationParams[]) => Promise<PriceResult[]>;
  clearPriceCache: () => void;
  clearProductPriceCache: (productId: number) => void;

  // Actions - Discount Codes
  loadDiscountCodes: () => Promise<void>;
  createDiscountCode: (code: CreateDto<DiscountCode>) => Promise<DiscountCode>;
  updateDiscountCode: (id: number, updates: UpdateDto<DiscountCode>) => Promise<void>;
  deleteDiscountCode: (id: number) => Promise<void>;
  validateDiscountCode: (code: string, params: any) => Promise<any>;

  // Actions - Price Matrices
  loadPriceMatrices: () => Promise<void>;
  createPriceMatrix: (matrix: CreateDto<PriceMatrix>) => Promise<PriceMatrix>;
  updatePriceMatrix: (id: number, updates: UpdateDto<PriceMatrix>) => Promise<void>;
  deletePriceMatrix: (id: number) => Promise<void>;

  // Actions - Analytics & Optimization
  loadAnalytics: (period: { start: string; end: string }) => Promise<void>;
  loadRecommendations: (goal?: OptimizationGoal) => Promise<void>;
  simulatePricing: (scenarios: PricingScenario[]) => Promise<void>;
  optimizePricing: (goal: OptimizationGoal) => Promise<void>;

  // Actions - Real-time Features
  enableRealTimePricing: () => void;
  disableRealTimePricing: () => void;
  subscribeToRealTimePrices: (callback: (update: any) => void) => () => void;

  // Actions - Filters
  setActiveRulesOnly: (activeOnly: boolean) => void;
  setRuleTypeFilter: (type: string | null) => void;

  // Actions - Utility
  clearError: () => void;
  resetStore: () => void;
}

export const usePricingStore = create<PricingStore>()(
  devtools(
    subscribeWithSelector(
      (set, get) => ({
        // Initial state
        pricingRules: [],
        discountCodes: [],
        priceMatrices: [],
        priceCache: new Map(),
        analytics: null,
        recommendations: [],
        simulationResults: [],

        // Loading states
        loading: false,
        rulesLoading: false,
        analyticsLoading: false,
        calculationLoading: false,

        // Error states
        error: null,

        // Real-time pricing
        realTimePricing: false,
        priceUpdatesSubscription: null,

        // Filter states
        activeRulesOnly: true,
        ruleTypeFilter: null,

        // Pricing Rules Actions
        loadPricingRules: async () => {
          set({ rulesLoading: true, error: null });

          try {
            const state = get();
            const rules = await pricingService.getPricingRules({
              active: state.activeRulesOnly,
              companyId: undefined // Will be determined by auth context
            });

            let filteredRules = rules;
            if (state.ruleTypeFilter) {
              filteredRules = rules.filter(rule => rule.type === state.ruleTypeFilter);
            }

            // Sort by priority (higher priority first)
            filteredRules.sort((a, b) => b.priority - a.priority);

            set({ pricingRules: filteredRules, rulesLoading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load pricing rules',
              rulesLoading: false
            });
          }
        },

        createPricingRule: async (ruleData: CreateDto<PricingRule>) => {
          set({ rulesLoading: true, error: null });

          try {
            const newRule = await pricingService.createPricingRule(ruleData);
            const state = get();

            // Insert in correct position based on priority
            const updatedRules = [...state.pricingRules, newRule].sort((a, b) => b.priority - a.priority);

            set({ pricingRules: updatedRules, rulesLoading: false });

            // Clear cache since rules changed
            get().clearPriceCache();

            return newRule;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to create pricing rule',
              rulesLoading: false
            });
            throw error;
          }
        },

        updatePricingRule: async (id: number, updates: UpdateDto<PricingRule>) => {
          set({ rulesLoading: true, error: null });

          try {
            const updatedRule = await pricingService.updatePricingRule(id, updates);
            const state = get();

            const updatedRules = state.pricingRules.map(rule =>
              rule.id === id ? updatedRule : rule
            ).sort((a, b) => b.priority - a.priority);

            set({ pricingRules: updatedRules, rulesLoading: false });

            // Clear cache since rules changed
            get().clearPriceCache();
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update pricing rule',
              rulesLoading: false
            });
            throw error;
          }
        },

        deletePricingRule: async (id: number) => {
          set({ rulesLoading: true, error: null });

          try {
            await pricingService.deletePricingRule(id);
            const state = get();

            set({
              pricingRules: state.pricingRules.filter(rule => rule.id !== id),
              rulesLoading: false
            });

            // Clear cache since rules changed
            get().clearPriceCache();
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to delete pricing rule',
              rulesLoading: false
            });
            throw error;
          }
        },

        testPricingRule: async (rule: PricingRule, testParams: PriceCalculationParams[]) => {
          set({ loading: true, error: null });

          try {
            const results = await pricingService.testPricingRule(rule, testParams);
            set({ loading: false });
            return results;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to test pricing rule',
              loading: false
            });
            throw error;
          }
        },

        toggleRuleActive: async (id: number) => {
          const state = get();
          const rule = state.pricingRules.find(r => r.id === id);

          if (rule) {
            await get().updatePricingRule(id, { isActive: !rule.isActive });
          }
        },

        reorderRules: async (rules: PricingRule[]) => {
          set({ rulesLoading: true, error: null });

          try {
            // Update priorities based on new order
            const updates = rules.map((rule, index) => ({
              id: rule.id,
              data: { priority: rules.length - index } // Higher index = higher priority
            }));

            await pricingService.bulkUpdatePricingRules(updates);
            await get().loadPricingRules(); // Reload to get updated rules

            // Clear cache since rule order changed
            get().clearPriceCache();
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to reorder pricing rules',
              rulesLoading: false
            });
            throw error;
          }
        },

        // Price Calculation Actions
        calculatePrice: async (params: PriceCalculationParams, useCache: boolean = true) => {
          set({ calculationLoading: true, error: null });

          try {
            const result = await pricingService.calculatePrice(params, useCache);
            set({ calculationLoading: false });
            return result;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Price calculation failed',
              calculationLoading: false
            });
            throw error;
          }
        },

        batchCalculatePrice: async (paramsList: PriceCalculationParams[]) => {
          set({ calculationLoading: true, error: null });

          try {
            const results = await pricingService.batchCalculatePrice(paramsList);
            set({ calculationLoading: false });
            return results;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Batch price calculation failed',
              calculationLoading: false
            });
            throw error;
          }
        },

        clearPriceCache: () => {
          pricingService.clearCache();
          set({ priceCache: new Map() });
        },

        clearProductPriceCache: (productId: number) => {
          pricingService.clearCacheByProduct(productId);

          // Update local cache
          const state = get();
          const newCache = new Map(state.priceCache);

          for (const [key, value] of newCache.entries()) {
            if (key.includes(`productId:${productId}`)) {
              newCache.delete(key);
            }
          }

          set({ priceCache: newCache });
        },

        // Discount Codes Actions
        loadDiscountCodes: async () => {
          set({ loading: true, error: null });

          try {
            const codes = await pricingService.getDiscountCodes({ active: true });
            set({ discountCodes: codes, loading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load discount codes',
              loading: false
            });
          }
        },

        createDiscountCode: async (codeData: CreateDto<DiscountCode>) => {
          set({ loading: true, error: null });

          try {
            const newCode = await pricingService.createDiscountCode(codeData);
            const state = get();

            set({
              discountCodes: [...state.discountCodes, newCode],
              loading: false
            });

            return newCode;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to create discount code',
              loading: false
            });
            throw error;
          }
        },

        updateDiscountCode: async (id: number, updates: UpdateDto<DiscountCode>) => {
          set({ loading: true, error: null });

          try {
            const updatedCode = await pricingService.updateDiscountCode(id, updates);
            const state = get();

            set({
              discountCodes: state.discountCodes.map(code =>
                code.id === id ? updatedCode : code
              ),
              loading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update discount code',
              loading: false
            });
            throw error;
          }
        },

        deleteDiscountCode: async (id: number) => {
          set({ loading: true, error: null });

          try {
            await pricingService.deleteDiscountCode(id);
            const state = get();

            set({
              discountCodes: state.discountCodes.filter(code => code.id !== id),
              loading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to delete discount code',
              loading: false
            });
            throw error;
          }
        },

        validateDiscountCode: async (code: string, params: any) => {
          set({ loading: true, error: null });

          try {
            const result = await pricingService.validateDiscountCode(code, params);
            set({ loading: false });
            return result;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to validate discount code',
              loading: false
            });
            throw error;
          }
        },

        // Price Matrices Actions
        loadPriceMatrices: async () => {
          set({ loading: true, error: null });

          try {
            const matrices = await pricingService.getPriceMatrices({ active: true });
            set({ priceMatrices: matrices, loading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load price matrices',
              loading: false
            });
          }
        },

        createPriceMatrix: async (matrixData: CreateDto<PriceMatrix>) => {
          set({ loading: true, error: null });

          try {
            const newMatrix = await pricingService.createPriceMatrix(matrixData);
            const state = get();

            set({
              priceMatrices: [...state.priceMatrices, newMatrix],
              loading: false
            });

            return newMatrix;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to create price matrix',
              loading: false
            });
            throw error;
          }
        },

        updatePriceMatrix: async (id: number, updates: UpdateDto<PriceMatrix>) => {
          set({ loading: true, error: null });

          try {
            const updatedMatrix = await pricingService.updatePriceMatrix(id, updates);
            const state = get();

            set({
              priceMatrices: state.priceMatrices.map(matrix =>
                matrix.id === id ? updatedMatrix : matrix
              ),
              loading: false
            });

            // Clear cache since matrix changed
            get().clearPriceCache();
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update price matrix',
              loading: false
            });
            throw error;
          }
        },

        deletePriceMatrix: async (id: number) => {
          set({ loading: true, error: null });

          try {
            await pricingService.deletePriceMatrix(id);
            const state = get();

            set({
              priceMatrices: state.priceMatrices.filter(matrix => matrix.id !== id),
              loading: false
            });

            // Clear cache since matrix was deleted
            get().clearPriceCache();
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to delete price matrix',
              loading: false
            });
            throw error;
          }
        },

        // Analytics & Optimization Actions
        loadAnalytics: async (period: { start: string; end: string }) => {
          set({ analyticsLoading: true, error: null });

          try {
            const analytics = await pricingService.getPricingAnalytics(period);
            set({ analytics, analyticsLoading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load analytics',
              analyticsLoading: false
            });
          }
        },

        loadRecommendations: async (goal?: OptimizationGoal) => {
          set({ loading: true, error: null });

          try {
            let recommendations: PricingRecommendation[] = [];

            if (goal) {
              recommendations = await pricingService.optimizePricing(goal);
            } else {
              // Load general recommendations
              const defaultGoal: OptimizationGoal = {
                type: 'maximize_profit',
                constraints: [],
                targetMetrics: []
              };
              recommendations = await pricingService.optimizePricing(defaultGoal);
            }

            set({ recommendations, loading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load recommendations',
              loading: false
            });
          }
        },

        simulatePricing: async (scenarios: PricingScenario[]) => {
          set({ loading: true, error: null });

          try {
            const results = await pricingService.simulatePricing(scenarios);
            set({ simulationResults: results, loading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Pricing simulation failed',
              loading: false
            });
          }
        },

        optimizePricing: async (goal: OptimizationGoal) => {
          set({ loading: true, error: null });

          try {
            const recommendations = await pricingService.optimizePricing(goal);
            set({ recommendations, loading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Pricing optimization failed',
              loading: false
            });
          }
        },

        // Real-time Features
        enableRealTimePricing: () => {
          set({ realTimePricing: true });

          const unsubscribe = pricingService.subscribeToRealTimePrices((update) => {
            // Handle real-time price updates
            console.log('Real-time price update:', update);

            // Update cache with new price
            const state = get();
            if (update.productId && update.price) {
              const cacheKey = `productId:${update.productId}`;
              const newCache = new Map(state.priceCache);
              newCache.set(cacheKey, {
                result: update.price,
                timestamp: Date.now()
              });
              set({ priceCache: newCache });
            }
          });

          set({ priceUpdatesSubscription: unsubscribe });
        },

        disableRealTimePricing: () => {
          const state = get();
          if (state.priceUpdatesSubscription) {
            state.priceUpdatesSubscription();
          }

          set({
            realTimePricing: false,
            priceUpdatesSubscription: null
          });
        },

        subscribeToRealTimePrices: (callback: (update: any) => void) => {
          return pricingService.subscribeToRealTimePrices(callback);
        },

        // Filter Actions
        setActiveRulesOnly: (activeOnly: boolean) => {
          set({ activeRulesOnly: activeOnly });
          get().loadPricingRules(); // Reload with new filter
        },

        setRuleTypeFilter: (type: string | null) => {
          set({ ruleTypeFilter: type });
          get().loadPricingRules(); // Reload with new filter
        },

        // Utility Actions
        clearError: () => set({ error: null }),

        resetStore: () => {
          const state = get();

          // Cleanup real-time subscription
          if (state.priceUpdatesSubscription) {
            state.priceUpdatesSubscription();
          }

          set({
            pricingRules: [],
            discountCodes: [],
            priceMatrices: [],
            priceCache: new Map(),
            analytics: null,
            recommendations: [],
            simulationResults: [],
            loading: false,
            rulesLoading: false,
            analyticsLoading: false,
            calculationLoading: false,
            error: null,
            realTimePricing: false,
            priceUpdatesSubscription: null,
            activeRulesOnly: true,
            ruleTypeFilter: null
          });
        }
      })
    ),
    { name: 'PricingStore' }
  )
);

// Auto-cleanup on unmount
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const state = usePricingStore.getState();
    if (state.priceUpdatesSubscription) {
      state.priceUpdatesSubscription();
    }
  });
}