// Price Calculator Component - Sprint 19 Phase 3
// Real-time price calculation component with < 300ms response

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';
import {
  Calculator,
  DollarSign,
  Percent,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { usePricingStore } from '../../../../stores/pricingStore';
import { useRealTimePricing } from '../hooks/useRealTimePricing';
import {
  PriceCalculationParams,
  PriceResult,
  PriceCalculatorProps
} from '../../../shared/types/pricing.types';
import { Button } from '../../../../../shared/ui/Button';
import { Card } from '../../../../../shared/ui/Card';
import { Loading } from '../../../../../shared/ui/Loading';
import { Badge } from '../../../../../shared/ui/Badge';
import { PriceBreakdown } from './PriceBreakdown';

interface CalculationHistory {
  timestamp: number;
  params: PriceCalculationParams;
  result: PriceResult;
  responseTime: number;
}

export const PriceCalculator: React.FC<PriceCalculatorProps> = ({
  productId,
  variantId,
  quantity,
  customerId,
  accountId,
  onPriceCalculated,
  realTime = false,
  showBreakdown = true
}) => {
  const [params, setParams] = useState<PriceCalculationParams>({
    productId,
    variantId,
    quantity,
    customerId,
    accountId,
    currencyCode: 'USD',
    date: new Date().toISOString().split('T')[0]
  });

  const [result, setResult] = useState<PriceResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseTime, setResponseTime] = useState<number>(0);
  const [showDetails, setShowDetails] = useState(showBreakdown);
  const [history, setHistory] = useState<CalculationHistory[]>([]);
  const [cacheHit, setCacheHit] = useState(false);

  const {
    calculatePrice,
    calculationLoading,
    error: storeError,
    clearError
  } = usePricingStore();

  const { subscribeToProduct, unsubscribeFromProduct } = useRealTimePricing();

  // Debounced calculation function for performance
  const debouncedCalculate = useCallback(
    debounce(async (calculationParams: PriceCalculationParams) => {
      if (!calculationParams.productId || calculationParams.quantity <= 0) {
        return;
      }

      setIsCalculating(true);
      setError(null);
      setCacheHit(false);

      const startTime = performance.now();

      try {
        const priceResult = await calculatePrice(calculationParams, true);
        const endTime = performance.now();
        const calcResponseTime = Math.round(endTime - startTime);

        setResult(priceResult);
        setResponseTime(calcResponseTime);

        // Add to history
        const historyEntry: CalculationHistory = {
          timestamp: Date.now(),
          params: { ...calculationParams },
          result: priceResult,
          responseTime: calcResponseTime
        };

        setHistory(prev => [historyEntry, ...prev.slice(0, 9)]); // Keep last 10

        // Check if result was from cache (response time < 50ms typically indicates cache hit)
        setCacheHit(calcResponseTime < 50);

        // Notify parent component
        onPriceCalculated(priceResult);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Calculation failed';
        setError(errorMessage);
        console.error('Price calculation error:', err);
      } finally {
        setIsCalculating(false);
      }
    }, 300), // 300ms debounce for optimal UX
    [calculatePrice, onPriceCalculated]
  );

  // Auto-calculate when params change
  useEffect(() => {
    const calculationParams = {
      ...params,
      productId,
      variantId,
      quantity,
      customerId,
      accountId
    };

    setParams(calculationParams);
    debouncedCalculate(calculationParams);
  }, [productId, variantId, quantity, customerId, accountId, debouncedCalculate]);

  // Real-time pricing subscription
  useEffect(() => {
    if (realTime && productId) {
      const unsubscribe = subscribeToProduct(productId, (update) => {
        setResult(update.price);
        setResponseTime(0); // Real-time updates don't have response time
        setCacheHit(false);
        onPriceCalculated(update.price);
      });

      return () => {
        unsubscribe();
      };
    }
  }, [realTime, productId, subscribeToProduct, onPriceCalculated]);

  // Manual recalculation
  const handleRecalculate = useCallback(() => {
    debouncedCalculate.cancel(); // Cancel any pending debounced calls
    debouncedCalculate(params);
  }, [params, debouncedCalculate]);

  // Update calculation parameters
  const updateParams = useCallback((updates: Partial<PriceCalculationParams>) => {
    const newParams = { ...params, ...updates };
    setParams(newParams);
    debouncedCalculate(newParams);
  }, [params, debouncedCalculate]);

  // Performance indicators
  const getPerformanceIndicator = () => {
    if (responseTime === 0) return null; // Real-time or no calculation yet

    if (responseTime < 100) {
      return { color: 'text-green-600', icon: Zap, label: 'Excellent' };
    } else if (responseTime < 300) {
      return { color: 'text-yellow-600', icon: Clock, label: 'Good' };
    } else {
      return { color: 'text-red-600', icon: AlertTriangle, label: 'Slow' };
    }
  };

  const performanceIndicator = getPerformanceIndicator();

  // Price comparison with history
  const getPriceComparison = () => {
    if (history.length < 2) return null;

    const current = result?.finalPrice || 0;
    const previous = history[1]?.result.finalPrice || 0;
    const change = current - previous;
    const percentChange = previous ? (change / previous) * 100 : 0;

    return {
      change,
      percentChange,
      isIncrease: change > 0,
      isDecrease: change < 0
    };
  };

  const priceComparison = getPriceComparison();

  return (
    <div className="space-y-4">
      {/* Main Calculator Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calculator className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Price Calculator</h3>
              <p className="text-sm text-gray-500">
                {realTime ? 'Real-time pricing enabled' : 'Standard pricing'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Real-time indicator */}
            {realTime && (
              <Badge variant="success" className="animate-pulse">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                Live
              </Badge>
            )}

            {/* Cache indicator */}
            {cacheHit && (
              <Badge variant="info">
                Cached
              </Badge>
            )}

            {/* Performance indicator */}
            {performanceIndicator && (
              <div className={`flex items-center ${performanceIndicator.color}`}>
                <performanceIndicator.icon className="w-4 h-4 mr-1" />
                <span className="text-xs font-medium">{responseTime}ms</span>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              disabled={isCalculating}
            >
              {isCalculating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {(error || storeError) && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Calculation Error</h3>
                <p className="mt-1 text-sm text-red-700">{error || storeError}</p>
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      clearError();
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              value={params.quantity}
              onChange={(e) => updateParams({ quantity: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              value={params.currencyCode}
              onChange={(e) => updateParams({ currencyCode: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={params.date}
              onChange={(e) => updateParams({ date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Price Display */}
        {isCalculating ? (
          <div className="flex items-center justify-center py-8">
            <Loading size="md" text="Calculating price..." />
          </div>
        ) : result ? (
          <div className="space-y-4">
            {/* Main Price Display */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Final Price</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {result.currency} {result.finalPrice.toFixed(2)}
                    </p>
                    {result.basePrice !== result.finalPrice && (
                      <p className="text-sm text-gray-500">
                        Base: {result.currency} {result.basePrice.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Price change indicator */}
                {priceComparison && priceComparison.change !== 0 && (
                  <div className={`flex items-center ${
                    priceComparison.isIncrease ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {priceComparison.isIncrease ? (
                      <TrendingUp className="w-5 h-5 mr-1" />
                    ) : (
                      <TrendingDown className="w-5 h-5 mr-1" />
                    )}
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {priceComparison.isIncrease ? '+' : ''}
                        {result.currency} {Math.abs(priceComparison.change).toFixed(2)}
                      </p>
                      <p className="text-xs">
                        {priceComparison.percentChange > 0 ? '+' : ''}
                        {priceComparison.percentChange.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">
                    {result.appliedRules.length}
                  </p>
                  <p className="text-sm text-gray-600">Rules Applied</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">
                    {result.discounts.length}
                  </p>
                  <p className="text-sm text-gray-600">Discounts</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">
                    {((result.basePrice - result.finalPrice) / result.basePrice * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600">Total Savings</p>
                </div>
              </div>
            </div>

            {/* Detailed Breakdown */}
            {showDetails && (
              <PriceBreakdown
                result={result}
                showDetails={true}
                showRules={true}
                showTaxes={true}
              />
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calculator className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Enter parameters to calculate price</p>
          </div>
        )}
      </Card>

      {/* Calculation History */}
      {history.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Recent Calculations</h4>
            <Badge variant="info">{history.length} entries</Badge>
          </div>

          <div className="space-y-2">
            {history.slice(0, 5).map((entry, index) => (
              <div key={entry.timestamp} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    index === 0 ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Qty: {entry.params.quantity} → {entry.result.currency} {entry.result.finalPrice.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge variant="outline" size="sm">
                    {entry.responseTime}ms
                  </Badge>
                  {entry.result.appliedRules.length > 0 && (
                    <Badge variant="info" size="sm">
                      {entry.result.appliedRules.length} rules
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default PriceCalculator;