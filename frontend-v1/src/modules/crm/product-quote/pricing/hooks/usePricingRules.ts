// Pricing Rules Management Hook - Sprint 19 Phase 3
// Comprehensive hook for pricing rules CRUD operations and management

import { useState, useCallback, useMemo, useEffect } from 'react';
import { usePricingStore } from '../../../../stores/pricingStore';
import {
  PricingRule,
  PricingCondition,
  PricingAction,
  PriceCalculationParams
} from '../../../shared/types/pricing.types';

interface RuleFilters {
  search: string;
  status: 'all' | 'active' | 'inactive';
  type: string | null;
  priority: 'all' | 'high' | 'medium' | 'low';
  dateRange: 'all' | 'week' | 'month' | 'quarter';
}

interface RuleValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface RuleConflict {
  conflictingRule: PricingRule;
  reason: string;
  severity: 'high' | 'medium' | 'low';
  suggestion?: string;
}

interface RulePerformance {
  ruleId: number;
  applications: number;
  avgImpact: number;
  successRate: number;
  lastUsed?: string;
}

interface UsePricingRulesReturn {
  // Filtered rules
  filteredRules: PricingRule[];

  // Filter management
  filters: RuleFilters;
  setFilters: (filters: RuleFilters) => void;
  applyFilters: (filters: RuleFilters) => void;
  clearFilters: () => void;

  // Rule CRUD operations
  createRule: (rule: Omit<PricingRule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PricingRule>;
  updateRule: (id: number, updates: Partial<PricingRule>) => Promise<void>;
  deleteRule: (id: number) => Promise<void>;
  duplicateRule: (rule: PricingRule) => Promise<PricingRule>;

  // Bulk operations
  bulkUpdateRules: (ruleIds: number[], updates: Partial<PricingRule>) => Promise<void>;
  bulkDeleteRules: (ruleIds: number[]) => Promise<void>;
  bulkToggleActive: (ruleIds: number[], isActive: boolean) => Promise<void>;

  // Rule validation and testing
  validateRule: (rule: Partial<PricingRule>) => RuleValidation;
  testRule: (rule: PricingRule, testParams: PriceCalculationParams[]) => Promise<any[]>;
  findConflicts: (rule: PricingRule) => RuleConflict[];
  simulateRule: (rule: PricingRule, params: PriceCalculationParams) => Promise<any>;

  // Rule ordering and priority
  reorderRules: (rules: PricingRule[]) => Promise<void>;
  updatePriority: (ruleId: number, priority: number) => Promise<void>;
  autoOptimizePriorities: () => Promise<void>;

  // Import/Export
  exportRules: (rules: PricingRule[]) => Promise<void>;
  importRules: (file: File) => Promise<void>;
  exportTemplate: () => void;

  // Performance and analytics
  getRulePerformance: (ruleId: number) => Promise<RulePerformance>;
  getPerformanceMetrics: () => Promise<RulePerformance[]>;

  // Rule templates and builders
  getConditionTemplates: () => any[];
  getActionTemplates: () => any[];
  createRuleFromTemplate: (templateId: string, customization?: any) => Partial<PricingRule>;

  // State
  loading: boolean;
  error: string | null;
  validationCache: Map<number, RuleValidation>;
  conflictCache: Map<number, RuleConflict[]>;
}

const DEFAULT_FILTERS: RuleFilters = {
  search: '',
  status: 'all',
  type: null,
  priority: 'all',
  dateRange: 'all'
};

export const usePricingRules = (): UsePricingRulesReturn => {
  const [filters, setFilters] = useState<RuleFilters>(DEFAULT_FILTERS);
  const [filteredRules, setFilteredRules] = useState<PricingRule[]>([]);
  const [validationCache, setValidationCache] = useState<Map<number, RuleValidation>>(new Map());
  const [conflictCache, setConflictCache] = useState<Map<number, RuleConflict[]>>(new Map());

  const {
    pricingRules,
    loading,
    rulesLoading,
    error,
    loadPricingRules,
    createPricingRule,
    updatePricingRule,
    deletePricingRule,
    testPricingRule,
    reorderRules: storeReorderRules,
    clearError
  } = usePricingStore();

  // Apply filters to rules
  const applyFilters = useCallback((filterParams: RuleFilters) => {
    let filtered = [...pricingRules];

    // Search filter
    if (filterParams.search) {
      const searchTerm = filterParams.search.toLowerCase();
      filtered = filtered.filter(rule =>
        rule.name.toLowerCase().includes(searchTerm) ||
        (rule.description && rule.description.toLowerCase().includes(searchTerm))
      );
    }

    // Status filter
    if (filterParams.status !== 'all') {
      const now = new Date();
      filtered = filtered.filter(rule => {
        switch (filterParams.status) {
          case 'active':
            return rule.isActive &&
                   (!rule.validTo || new Date(rule.validTo) > now) &&
                   (!rule.validFrom || new Date(rule.validFrom) <= now);
          case 'inactive':
            return !rule.isActive ||
                   (rule.validTo && new Date(rule.validTo) <= now) ||
                   (rule.validFrom && new Date(rule.validFrom) > now);
          default:
            return true;
        }
      });
    }

    // Type filter
    if (filterParams.type) {
      filtered = filtered.filter(rule => rule.type === filterParams.type);
    }

    // Priority filter
    if (filterParams.priority !== 'all') {
      filtered = filtered.filter(rule => {
        switch (filterParams.priority) {
          case 'high':
            return rule.priority >= 8;
          case 'medium':
            return rule.priority >= 5 && rule.priority < 8;
          case 'low':
            return rule.priority < 5;
          default:
            return true;
        }
      });
    }

    // Date range filter
    if (filterParams.dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (filterParams.dateRange) {
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3);
          break;
      }

      filtered = filtered.filter(rule =>
        new Date(rule.createdAt) >= filterDate
      );
    }

    setFilteredRules(filtered);
  }, [pricingRules]);

  // Update filters and apply them
  useEffect(() => {
    applyFilters(filters);
  }, [filters, pricingRules, applyFilters]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Rule CRUD operations
  const createRule = useCallback(async (
    rule: Omit<PricingRule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PricingRule> => {
    // Validate rule before creation
    const validation = validateRule(rule);
    if (!validation.isValid) {
      throw new Error(`Rule validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      return await createPricingRule(rule);
    } catch (error) {
      console.error('Failed to create rule:', error);
      throw error;
    }
  }, [createPricingRule]);

  const updateRule = useCallback(async (
    id: number,
    updates: Partial<PricingRule>
  ): Promise<void> => {
    try {
      await updatePricingRule(id, updates);

      // Clear validation cache for updated rule
      setValidationCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(id);
        return newCache;
      });

      // Clear conflict cache
      setConflictCache(new Map());
    } catch (error) {
      console.error('Failed to update rule:', error);
      throw error;
    }
  }, [updatePricingRule]);

  const deleteRule = useCallback(async (id: number): Promise<void> => {
    try {
      await deletePricingRule(id);

      // Clear caches
      setValidationCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(id);
        return newCache;
      });
      setConflictCache(new Map());
    } catch (error) {
      console.error('Failed to delete rule:', error);
      throw error;
    }
  }, [deletePricingRule]);

  const duplicateRule = useCallback(async (rule: PricingRule): Promise<PricingRule> => {
    const duplicatedRule = {
      ...rule,
      name: `${rule.name} (Copy)`,
      priority: rule.priority - 1, // Lower priority
      isActive: false, // Start inactive
      validFrom: undefined,
      validTo: undefined
    };

    // Remove fields that shouldn't be duplicated
    delete (duplicatedRule as any).id;
    delete (duplicatedRule as any).createdAt;
    delete (duplicatedRule as any).updatedAt;
    delete (duplicatedRule as any).createdBy;

    return await createRule(duplicatedRule);
  }, [createRule]);

  // Bulk operations
  const bulkUpdateRules = useCallback(async (
    ruleIds: number[],
    updates: Partial<PricingRule>
  ): Promise<void> => {
    try {
      await Promise.all(
        ruleIds.map(id => updatePricingRule(id, updates))
      );

      // Clear caches for affected rules
      setValidationCache(prev => {
        const newCache = new Map(prev);
        ruleIds.forEach(id => newCache.delete(id));
        return newCache;
      });
      setConflictCache(new Map());
    } catch (error) {
      console.error('Failed to bulk update rules:', error);
      throw error;
    }
  }, [updatePricingRule]);

  const bulkDeleteRules = useCallback(async (ruleIds: number[]): Promise<void> => {
    try {
      await Promise.all(
        ruleIds.map(id => deletePricingRule(id))
      );

      // Clear caches
      setValidationCache(prev => {
        const newCache = new Map(prev);
        ruleIds.forEach(id => newCache.delete(id));
        return newCache;
      });
      setConflictCache(new Map());
    } catch (error) {
      console.error('Failed to bulk delete rules:', error);
      throw error;
    }
  }, [deletePricingRule]);

  const bulkToggleActive = useCallback(async (
    ruleIds: number[],
    isActive: boolean
  ): Promise<void> => {
    await bulkUpdateRules(ruleIds, { isActive });
  }, [bulkUpdateRules]);

  // Rule validation
  const validateRule = useCallback((rule: Partial<PricingRule>): RuleValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!rule.name?.trim()) {
      errors.push('Rule name is required');
    }

    if (!rule.conditions || rule.conditions.length === 0) {
      errors.push('At least one condition is required');
    }

    if (!rule.actions || rule.actions.length === 0) {
      errors.push('At least one action is required');
    }

    // Priority validation
    if (rule.priority !== undefined && (rule.priority < 1 || rule.priority > 10)) {
      errors.push('Priority must be between 1 and 10');
    }

    // Date validation
    if (rule.validFrom && rule.validTo && rule.validFrom > rule.validTo) {
      errors.push('Valid from date must be before valid to date');
    }

    // Condition validation
    rule.conditions?.forEach((condition, index) => {
      if (!condition.field || !condition.operator) {
        errors.push(`Condition ${index + 1} is incomplete`);
      }

      if (condition.value === undefined || condition.value === null || condition.value === '') {
        warnings.push(`Condition ${index + 1} has no value`);
      }
    });

    // Action validation
    rule.actions?.forEach((action, index) => {
      if (!action.type) {
        errors.push(`Action ${index + 1} type is required`);
      }

      if (action.value === undefined || action.value === null) {
        errors.push(`Action ${index + 1} value is required`);
      }

      if (action.type === 'discount_percentage' && action.value > 100) {
        warnings.push(`Action ${index + 1} discount exceeds 100%`);
      }

      if (action.value < 0) {
        errors.push(`Action ${index + 1} value cannot be negative`);
      }
    });

    // Business logic warnings
    if (rule.priority && rule.priority >= 8) {
      warnings.push('High priority rules may override other rules');
    }

    const validation: RuleValidation = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    // Cache validation if rule has ID
    if (rule.id) {
      setValidationCache(prev => new Map(prev.set(rule.id!, validation)));
    }

    return validation;
  }, []);

  // Test rule
  const testRule = useCallback(async (
    rule: PricingRule,
    testParams: PriceCalculationParams[]
  ): Promise<any[]> => {
    try {
      return await testPricingRule(rule, testParams);
    } catch (error) {
      console.error('Failed to test rule:', error);
      throw error;
    }
  }, [testPricingRule]);

  // Find rule conflicts
  const findConflicts = useCallback((rule: PricingRule): RuleConflict[] => {
    const conflicts: RuleConflict[] = [];

    // Check against other rules
    pricingRules.forEach(existingRule => {
      if (existingRule.id === rule.id) return; // Skip self

      // Priority conflicts
      if (existingRule.priority === rule.priority && existingRule.isActive && rule.isActive) {
        conflicts.push({
          conflictingRule: existingRule,
          reason: 'Same priority level',
          severity: 'medium',
          suggestion: 'Consider adjusting priority levels'
        });
      }

      // Overlapping conditions (simplified check)
      const hasOverlappingConditions = rule.conditions.some(condition =>
        existingRule.conditions.some(existingCondition =>
          existingCondition.field === condition.field &&
          existingCondition.operator === condition.operator
        )
      );

      if (hasOverlappingConditions && existingRule.isActive && rule.isActive) {
        conflicts.push({
          conflictingRule: existingRule,
          reason: 'Overlapping conditions may cause rule conflicts',
          severity: 'high',
          suggestion: 'Review rule conditions and priorities'
        });
      }

      // Date range overlaps
      if (rule.validFrom && rule.validTo && existingRule.validFrom && existingRule.validTo) {
        const ruleStart = new Date(rule.validFrom);
        const ruleEnd = new Date(rule.validTo);
        const existingStart = new Date(existingRule.validFrom);
        const existingEnd = new Date(existingRule.validTo);

        if ((ruleStart <= existingEnd && ruleEnd >= existingStart) &&
            existingRule.isActive && rule.isActive) {
          conflicts.push({
            conflictingRule: existingRule,
            reason: 'Overlapping date ranges',
            severity: 'low',
            suggestion: 'Ensure rule priorities are set correctly'
          });
        }
      }
    });

    // Cache conflicts
    if (rule.id) {
      setConflictCache(prev => new Map(prev.set(rule.id, conflicts)));
    }

    return conflicts;
  }, [pricingRules]);

  // Simulate rule
  const simulateRule = useCallback(async (
    rule: PricingRule,
    params: PriceCalculationParams
  ): Promise<any> => {
    try {
      // This would simulate the rule application
      // For now, return mock simulation result
      return {
        matched: true,
        impact: 10.50,
        finalPrice: params.quantity ? params.quantity * 100 - 10.50 : 89.50
      };
    } catch (error) {
      console.error('Failed to simulate rule:', error);
      throw error;
    }
  }, []);

  // Rule ordering and priority
  const reorderRules = useCallback(async (rules: PricingRule[]): Promise<void> => {
    try {
      await storeReorderRules(rules);
      setConflictCache(new Map()); // Clear conflict cache after reordering
    } catch (error) {
      console.error('Failed to reorder rules:', error);
      throw error;
    }
  }, [storeReorderRules]);

  const updatePriority = useCallback(async (ruleId: number, priority: number): Promise<void> => {
    await updateRule(ruleId, { priority });
  }, [updateRule]);

  const autoOptimizePriorities = useCallback(async (): Promise<void> => {
    // Auto-optimize rule priorities based on usage and conflicts
    const sortedRules = [...pricingRules].sort((a, b) => {
      // Sort by usage (mock data) and creation date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const updates = sortedRules.map((rule, index) => ({
      id: rule.id,
      priority: Math.max(1, 10 - Math.floor(index / 2))
    }));

    await Promise.all(
      updates.map(update => updateRule(update.id, { priority: update.priority }))
    );
  }, [pricingRules, updateRule]);

  // Import/Export
  const exportRules = useCallback(async (rules: PricingRule[]): Promise<void> => {
    const exportData = rules.map(rule => ({
      ...rule,
      // Remove server-specific fields
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      createdBy: undefined
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pricing-rules-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const importRules = useCallback(async (file: File): Promise<void> => {
    try {
      const text = await file.text();
      const importedRules = JSON.parse(text);

      if (!Array.isArray(importedRules)) {
        throw new Error('Invalid file format');
      }

      // Validate and create rules
      for (const rule of importedRules) {
        const validation = validateRule(rule);
        if (validation.isValid) {
          await createRule(rule);
        } else {
          console.warn(`Skipping invalid rule: ${rule.name}`, validation.errors);
        }
      }
    } catch (error) {
      console.error('Failed to import rules:', error);
      throw error;
    }
  }, [validateRule, createRule]);

  const exportTemplate = useCallback(() => {
    const template = {
      name: 'Rule Name',
      description: 'Rule Description',
      type: 'percentage',
      priority: 5,
      isActive: true,
      conditions: [
        {
          field: 'quantity',
          operator: 'greater_than',
          value: 10
        }
      ],
      actions: [
        {
          type: 'discount_percentage',
          value: 10,
          applyTo: 'unit_price'
        }
      ],
      validFrom: '2024-01-01',
      validTo: '2024-12-31',
      applicableProducts: [],
      applicableCategories: [],
      applicableCustomers: []
    };

    const blob = new Blob([JSON.stringify([template], null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pricing-rule-template.json';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Performance and analytics
  const getRulePerformance = useCallback(async (ruleId: number): Promise<RulePerformance> => {
    // Mock performance data - would come from analytics service
    return {
      ruleId,
      applications: Math.floor(Math.random() * 100),
      avgImpact: Math.random() * 50,
      successRate: 95 + Math.random() * 5,
      lastUsed: new Date().toISOString()
    };
  }, []);

  const getPerformanceMetrics = useCallback(async (): Promise<RulePerformance[]> => {
    return Promise.all(
      pricingRules.map(rule => getRulePerformance(rule.id))
    );
  }, [pricingRules, getRulePerformance]);

  // Templates
  const getConditionTemplates = useCallback(() => {
    return [
      { id: 'quantity', name: 'Quantity', field: 'quantity', operators: ['greater_than', 'less_than', 'equals'] },
      { id: 'customer_tier', name: 'Customer Tier', field: 'customerTier', operators: ['equals', 'in'] },
      { id: 'product_category', name: 'Product Category', field: 'productCategory', operators: ['equals', 'in'] },
      { id: 'order_total', name: 'Order Total', field: 'orderTotal', operators: ['greater_than', 'less_than'] }
    ];
  }, []);

  const getActionTemplates = useCallback(() => {
    return [
      { id: 'discount_percentage', name: 'Percentage Discount', type: 'discount_percentage' },
      { id: 'discount_amount', name: 'Fixed Discount', type: 'discount_amount' },
      { id: 'set_price', name: 'Set Price', type: 'set_price' },
      { id: 'markup_percentage', name: 'Percentage Markup', type: 'markup_percentage' }
    ];
  }, []);

  const createRuleFromTemplate = useCallback((templateId: string, customization?: any): Partial<PricingRule> => {
    // Mock template creation - would have predefined templates
    const baseTemplate: Partial<PricingRule> = {
      name: `New Rule from ${templateId}`,
      description: 'Created from template',
      type: 'percentage',
      priority: 5,
      isActive: false,
      conditions: [],
      actions: [],
      applicableProducts: [],
      applicableCategories: [],
      applicableCustomers: []
    };

    return { ...baseTemplate, ...customization };
  }, []);

  return {
    // Filtered rules
    filteredRules,

    // Filter management
    filters,
    setFilters,
    applyFilters,
    clearFilters,

    // Rule CRUD operations
    createRule,
    updateRule,
    deleteRule,
    duplicateRule,

    // Bulk operations
    bulkUpdateRules,
    bulkDeleteRules,
    bulkToggleActive,

    // Rule validation and testing
    validateRule,
    testRule,
    findConflicts,
    simulateRule,

    // Rule ordering and priority
    reorderRules,
    updatePriority,
    autoOptimizePriorities,

    // Import/Export
    exportRules,
    importRules,
    exportTemplate,

    // Performance and analytics
    getRulePerformance,
    getPerformanceMetrics,

    // Rule templates and builders
    getConditionTemplates,
    getActionTemplates,
    createRuleFromTemplate,

    // State
    loading: loading || rulesLoading,
    error,
    validationCache,
    conflictCache
  };
};

export default usePricingRules;