// Price Simulation Hook - Sprint 19 Phase 3
// What-if scenario simulation and analysis hook

import { useState, useCallback, useEffect } from 'react';
import { usePricingStore } from '../../../../stores/pricingStore';
import {
  PricingScenario,
  SimulationResult,
  PriceCalculationParams,
  PriceResult,
  ComparisonData
} from '../../../shared/types/pricing.types';

interface SimulationOptions {
  includeBaseline: boolean;
  compareAgainstCurrent: boolean;
  enableOptimization: boolean;
  maxExecutionTime: number; // milliseconds
  parallelExecution: boolean;
}

interface SimulationMetrics {
  totalScenarios: number;
  executionTime: number;
  averageResponseTime: number;
  successRate: number;
  priceVariance: number;
  minPrice: number;
  maxPrice: number;
  averagePrice: number;
}

interface ScenarioSet {
  id: string;
  name: string;
  description?: string;
  scenarios: PricingScenario[];
  createdAt: string;
  results?: SimulationResult[];
}

interface UsePriceSimulationReturn {
  // Simulation execution
  runSimulation: (scenarios: PricingScenario[], options?: Partial<SimulationOptions>) => Promise<SimulationResult[]>;
  runSingleScenario: (scenario: PricingScenario) => Promise<SimulationResult>;
  compareScenarios: (scenarios: PricingScenario[], baseline?: PricingScenario) => Promise<SimulationResult[]>;

  // Scenario management
  createScenario: (params: PriceCalculationParams, name: string, description?: string) => PricingScenario;
  validateScenario: (scenario: PricingScenario) => { valid: boolean; errors: string[] };
  optimizeScenario: (scenario: PricingScenario) => Promise<PricingScenario>;

  // Scenario sets
  saveScenarioSet: (scenarios: PricingScenario[], name: string, description?: string) => Promise<ScenarioSet>;
  loadScenarioSet: (id: string) => Promise<ScenarioSet>;
  getScenarioSets: () => Promise<ScenarioSet[]>;
  deleteScenarioSet: (id: string) => Promise<void>;

  // Results analysis
  analyzeResults: (results: SimulationResult[]) => SimulationMetrics;
  generateReport: (results: SimulationResult[], format: 'json' | 'csv' | 'excel') => Promise<Blob>;
  exportResults: (results: SimulationResult[]) => Promise<void>;

  // Templates and presets
  getScenarioTemplates: () => PricingScenario[];
  createFromTemplate: (templateId: string, customization?: Partial<PriceCalculationParams>) => PricingScenario;

  // Optimization and recommendations
  suggestOptimizations: (scenarios: PricingScenario[]) => Promise<string[]>;
  findBestScenario: (results: SimulationResult[], criteria: 'price' | 'profit' | 'volume') => SimulationResult;

  // State
  isRunning: boolean;
  progress: number;
  currentScenario: string | null;
  lastResults: SimulationResult[];
  error: string | null;
  metrics: SimulationMetrics | null;

  // Utilities
  clearResults: () => void;
  cancelSimulation: () => void;
}

const DEFAULT_OPTIONS: SimulationOptions = {
  includeBaseline: true,
  compareAgainstCurrent: true,
  enableOptimization: false,
  maxExecutionTime: 30000, // 30 seconds
  parallelExecution: true
};

export const usePriceSimulation = (): UsePriceSimulationReturn => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);
  const [lastResults, setLastResults] = useState<SimulationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<SimulationMetrics | null>(null);
  const [scenarioSets, setScenarioSets] = useState<ScenarioSet[]>([]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const {
    calculatePrice,
    simulatePricing,
    loading,
    error: storeError
  } = usePricingStore();

  // Load scenario sets from localStorage on mount
  useEffect(() => {
    const savedSets = localStorage.getItem('pricingScenarioSets');
    if (savedSets) {
      try {
        setScenarioSets(JSON.parse(savedSets));
      } catch (error) {
        console.error('Failed to load scenario sets:', error);
      }
    }
  }, []);

  // Save scenario sets to localStorage
  useEffect(() => {
    localStorage.setItem('pricingScenarioSets', JSON.stringify(scenarioSets));
  }, [scenarioSets]);

  // Run simulation with multiple scenarios
  const runSimulation = useCallback(async (
    scenarios: PricingScenario[],
    options: Partial<SimulationOptions> = {}
  ): Promise<SimulationResult[]> => {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();

    setIsRunning(true);
    setProgress(0);
    setError(null);
    setCurrentScenario(null);

    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const results: SimulationResult[] = [];
      const totalScenarios = scenarios.length;

      if (opts.parallelExecution && scenarios.length > 1) {
        // Parallel execution for better performance
        const promises = scenarios.map(async (scenario, index) => {
          if (controller.signal.aborted) throw new Error('Simulation cancelled');

          setCurrentScenario(scenario.name);
          const result = await runSingleScenario(scenario);

          setProgress(((index + 1) / totalScenarios) * 100);
          return result;
        });

        const parallelResults = await Promise.all(promises);
        results.push(...parallelResults);
      } else {
        // Sequential execution
        for (let i = 0; i < scenarios.length; i++) {
          if (controller.signal.aborted) throw new Error('Simulation cancelled');

          const scenario = scenarios[i];
          setCurrentScenario(scenario.name);

          const result = await runSingleScenario(scenario);
          results.push(result);

          setProgress(((i + 1) / totalScenarios) * 100);

          // Check execution time limit
          if (Date.now() - startTime > opts.maxExecutionTime) {
            console.warn('Simulation stopped due to time limit');
            break;
          }
        }
      }

      // Add baseline comparison if requested
      if (opts.includeBaseline && results.length > 0) {
        const baselineScenario = createBaselineScenario(scenarios[0]);
        const baselineResult = await runSingleScenario(baselineScenario);

        results.forEach(result => {
          result.comparison = {
            baselinePrice: baselineResult.result.finalPrice,
            difference: result.result.finalPrice - baselineResult.result.finalPrice,
            percentageChange: ((result.result.finalPrice - baselineResult.result.finalPrice) / baselineResult.result.finalPrice) * 100
          };
        });
      }

      const executionTime = Date.now() - startTime;
      const simulationMetrics = analyzeResults(results);
      simulationMetrics.executionTime = executionTime;

      setLastResults(results);
      setMetrics(simulationMetrics);
      setCurrentScenario(null);

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Simulation failed';
      setError(errorMessage);
      console.error('Simulation error:', error);
      throw error;
    } finally {
      setIsRunning(false);
      setProgress(0);
      setAbortController(null);
    }
  }, [calculatePrice]);

  // Run single scenario
  const runSingleScenario = useCallback(async (scenario: PricingScenario): Promise<SimulationResult> => {
    try {
      const result = await calculatePrice(scenario.parameters);

      return {
        scenario,
        result,
        variance: scenario.expectedResult ? Math.abs(result.finalPrice - scenario.expectedResult) : undefined
      };
    } catch (error) {
      console.error('Single scenario simulation failed:', error);
      throw error;
    }
  }, [calculatePrice]);

  // Compare scenarios with baseline
  const compareScenarios = useCallback(async (
    scenarios: PricingScenario[],
    baseline?: PricingScenario
  ): Promise<SimulationResult[]> => {
    let baselineResult: SimulationResult | null = null;

    if (baseline) {
      baselineResult = await runSingleScenario(baseline);
    }

    const results = await runSimulation(scenarios, { includeBaseline: false });

    if (baselineResult) {
      results.forEach(result => {
        result.comparison = {
          baselinePrice: baselineResult!.result.finalPrice,
          difference: result.result.finalPrice - baselineResult!.result.finalPrice,
          percentageChange: ((result.result.finalPrice - baselineResult!.result.finalPrice) / baselineResult!.result.finalPrice) * 100
        };
      });
    }

    return results;
  }, [runSimulation, runSingleScenario]);

  // Create baseline scenario
  const createBaselineScenario = useCallback((scenario: PricingScenario): PricingScenario => {
    return {
      name: 'Baseline',
      description: 'Baseline scenario without modifications',
      parameters: {
        ...scenario.parameters,
        context: undefined // Remove context modifications
      }
    };
  }, []);

  // Scenario management
  const createScenario = useCallback((
    params: PriceCalculationParams,
    name: string,
    description?: string
  ): PricingScenario => {
    return {
      name,
      description,
      parameters: { ...params }
    };
  }, []);

  const validateScenario = useCallback((scenario: PricingScenario): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!scenario.name?.trim()) {
      errors.push('Scenario name is required');
    }

    if (!scenario.parameters.productId) {
      errors.push('Product ID is required');
    }

    if (!scenario.parameters.quantity || scenario.parameters.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }, []);

  const optimizeScenario = useCallback(async (scenario: PricingScenario): Promise<PricingScenario> => {
    // Mock optimization - would use ML/AI service
    const optimizedParams = {
      ...scenario.parameters,
      quantity: Math.max(1, Math.round(scenario.parameters.quantity * 1.1)) // Suggest 10% increase
    };

    return {
      ...scenario,
      name: `${scenario.name} (Optimized)`,
      parameters: optimizedParams
    };
  }, []);

  // Scenario sets management
  const saveScenarioSet = useCallback(async (
    scenarios: PricingScenario[],
    name: string,
    description?: string
  ): Promise<ScenarioSet> => {
    const scenarioSet: ScenarioSet = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      description,
      scenarios,
      createdAt: new Date().toISOString()
    };

    setScenarioSets(prev => [...prev, scenarioSet]);
    return scenarioSet;
  }, []);

  const loadScenarioSet = useCallback(async (id: string): Promise<ScenarioSet> => {
    const scenarioSet = scenarioSets.find(set => set.id === id);
    if (!scenarioSet) {
      throw new Error('Scenario set not found');
    }
    return scenarioSet;
  }, [scenarioSets]);

  const getScenarioSets = useCallback(async (): Promise<ScenarioSet[]> => {
    return scenarioSets;
  }, [scenarioSets]);

  const deleteScenarioSet = useCallback(async (id: string): Promise<void> => {
    setScenarioSets(prev => prev.filter(set => set.id !== id));
  }, []);

  // Results analysis
  const analyzeResults = useCallback((results: SimulationResult[]): SimulationMetrics => {
    if (results.length === 0) {
      return {
        totalScenarios: 0,
        executionTime: 0,
        averageResponseTime: 0,
        successRate: 0,
        priceVariance: 0,
        minPrice: 0,
        maxPrice: 0,
        averagePrice: 0
      };
    }

    const prices = results.map(r => r.result.finalPrice);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const priceVariance = Math.sqrt(
      prices.reduce((sum, price) => sum + Math.pow(price - averagePrice, 2), 0) / prices.length
    );

    return {
      totalScenarios: results.length,
      executionTime: 0, // Will be set by caller
      averageResponseTime: 0, // Would calculate from individual response times
      successRate: 100, // All results are successful if we reach here
      priceVariance,
      minPrice,
      maxPrice,
      averagePrice
    };
  }, []);

  const generateReport = useCallback(async (
    results: SimulationResult[],
    format: 'json' | 'csv' | 'excel'
  ): Promise<Blob> => {
    switch (format) {
      case 'json':
        return new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });

      case 'csv':
        const csvHeader = 'Scenario,Base Price,Final Price,Discount,Rules Applied,Change vs Baseline\n';
        const csvRows = results.map(result => [
          `"${result.scenario.name}"`,
          result.result.basePrice.toFixed(2),
          result.result.finalPrice.toFixed(2),
          (result.result.basePrice - result.result.finalPrice).toFixed(2),
          result.result.appliedRules.length,
          result.comparison ? `${result.comparison.percentageChange.toFixed(2)}%` : 'N/A'
        ].join(',')).join('\n');

        return new Blob([csvHeader + csvRows], { type: 'text/csv' });

      case 'excel':
        // Mock Excel generation - would use a library like SheetJS
        return new Blob(['Excel format not implemented'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      default:
        throw new Error('Unsupported format');
    }
  }, []);

  const exportResults = useCallback(async (results: SimulationResult[]): Promise<void> => {
    const blob = await generateReport(results, 'csv');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `price-simulation-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [generateReport]);

  // Templates and presets
  const getScenarioTemplates = useCallback((): PricingScenario[] => {
    return [
      {
        name: 'Volume Discount Test',
        description: 'Test volume-based pricing',
        parameters: {
          productId: 1,
          quantity: 100,
          currencyCode: 'USD'
        }
      },
      {
        name: 'Customer Tier Test',
        description: 'Test customer tier pricing',
        parameters: {
          productId: 1,
          quantity: 10,
          customerId: 1,
          currencyCode: 'USD',
          context: {
            customerSegment: 'premium'
          }
        }
      },
      {
        name: 'Seasonal Pricing Test',
        description: 'Test seasonal pricing rules',
        parameters: {
          productId: 1,
          quantity: 5,
          currencyCode: 'USD',
          context: {
            promotionCode: 'SUMMER2024'
          }
        }
      }
    ];
  }, []);

  const createFromTemplate = useCallback((
    templateId: string,
    customization?: Partial<PriceCalculationParams>
  ): PricingScenario => {
    const templates = getScenarioTemplates();
    const template = templates.find(t => t.name.toLowerCase().includes(templateId.toLowerCase()));

    if (!template) {
      throw new Error('Template not found');
    }

    return {
      ...template,
      name: `${template.name} (Custom)`,
      parameters: {
        ...template.parameters,
        ...customization
      }
    };
  }, [getScenarioTemplates]);

  // Optimization and recommendations
  const suggestOptimizations = useCallback(async (scenarios: PricingScenario[]): Promise<string[]> => {
    const suggestions: string[] = [];

    scenarios.forEach(scenario => {
      if (scenario.parameters.quantity < 10) {
        suggestions.push(`Consider testing higher quantities for "${scenario.name}" to explore volume discounts`);
      }

      if (!scenario.parameters.customerId) {
        suggestions.push(`Add customer context to "${scenario.name}" for more realistic pricing`);
      }

      if (!scenario.parameters.context?.salesChannel) {
        suggestions.push(`Test different sales channels for "${scenario.name}"`);
      }
    });

    return suggestions;
  }, []);

  const findBestScenario = useCallback((
    results: SimulationResult[],
    criteria: 'price' | 'profit' | 'volume'
  ): SimulationResult => {
    if (results.length === 0) {
      throw new Error('No results to analyze');
    }

    switch (criteria) {
      case 'price':
        return results.reduce((best, current) =>
          current.result.finalPrice < best.result.finalPrice ? current : best
        );

      case 'profit':
        // Mock profit calculation - would need cost data
        return results.reduce((best, current) => {
          const currentProfit = current.result.finalPrice * 0.3; // Assume 30% margin
          const bestProfit = best.result.finalPrice * 0.3;
          return currentProfit > bestProfit ? current : best;
        });

      case 'volume':
        return results.reduce((best, current) =>
          current.scenario.parameters.quantity > best.scenario.parameters.quantity ? current : best
        );

      default:
        return results[0];
    }
  }, []);

  // Utilities
  const clearResults = useCallback(() => {
    setLastResults([]);
    setMetrics(null);
    setError(null);
  }, []);

  const cancelSimulation = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setIsRunning(false);
      setProgress(0);
      setCurrentScenario(null);
      setError('Simulation cancelled');
    }
  }, [abortController]);

  return {
    // Simulation execution
    runSimulation,
    runSingleScenario,
    compareScenarios,

    // Scenario management
    createScenario,
    validateScenario,
    optimizeScenario,

    // Scenario sets
    saveScenarioSet,
    loadScenarioSet,
    getScenarioSets,
    deleteScenarioSet,

    // Results analysis
    analyzeResults,
    generateReport,
    exportResults,

    // Templates and presets
    getScenarioTemplates,
    createFromTemplate,

    // Optimization and recommendations
    suggestOptimizations,
    findBestScenario,

    // State
    isRunning,
    progress,
    currentScenario,
    lastResults,
    error: error || storeError,
    metrics,

    // Utilities
    clearResults,
    cancelSimulation
  };
};

export default usePriceSimulation;