// useQuoteCalculations - Sprint 19 Frontend Implementation
// Quote totals and calculations

import { useCallback } from 'react';
import { QuoteLineItem, QuoteTotals } from '../../shared/types';
import { quoteCalculator } from '../builders/quoteCalculator';

interface UseQuoteCalculationsReturn {
  calculateTotals: (lineItems: QuoteLineItem[], options?: {
    currencyCode?: string;
    exchangeRate?: number;
  }) => Promise<QuoteTotals>;
  calculateLineItemTotal: (item: QuoteLineItem) => number;
  calculateDiscount: (amount: number, discount: number, type: 'percentage' | 'fixed') => number;
}

export const useQuoteCalculations = (): UseQuoteCalculationsReturn => {
  const calculateTotals = useCallback(async (
    lineItems: QuoteLineItem[],
    options: { currencyCode?: string; exchangeRate?: number } = {}
  ) => {
    return await quoteCalculator.calculateTotals(lineItems, options);
  }, []);

  const calculateLineItemTotal = useCallback((item: QuoteLineItem) => {
    return quoteCalculator.calculateLineItemTotal(item);
  }, []);

  const calculateDiscount = useCallback((
    amount: number,
    discount: number,
    type: 'percentage' | 'fixed'
  ) => {
    return quoteCalculator.calculateDiscount(amount, discount, type);
  }, []);

  return {
    calculateTotals,
    calculateLineItemTotal,
    calculateDiscount
  };
};