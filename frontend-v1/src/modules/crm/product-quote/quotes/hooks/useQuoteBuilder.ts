// useQuoteBuilder - Sprint 19 Frontend Implementation
// Main quote building operations

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotification } from '../../../../../shared/hooks/useNotification';
import { quoteService } from '../services/quoteService';
import { quoteValidator } from '../builders/quoteValidator';
import { quoteCalculator } from '../builders/quoteCalculator';
import {
  Quote,
  QuoteLineItem,
  QuoteSection,
  CreateLineItemDto,
  ValidationError,
  QuoteTotals
} from '../../shared/types';

interface UseQuoteBuilderOptions {
  quoteId?: number;
  quote?: Partial<Quote>;
}

interface UseQuoteBuilderReturn {
  // State
  quote: Quote | null;
  isLoading: boolean;
  error: string | null;
  isDirty: boolean;
  isValid: boolean;
  validationErrors: ValidationError[];
  calculatedTotals: QuoteTotals | null;

  // Actions
  initializeQuote: (options: UseQuoteBuilderOptions) => Promise<void>;
  updateQuote: (updates: Partial<Quote>) => void;
  addLineItem: (item: CreateLineItemDto) => Promise<void>;
  updateLineItem: (id: number, updates: Partial<QuoteLineItem>) => Promise<void>;
  removeLineItem: (id: number) => Promise<void>;
  reorderLineItems: (items: { id: number; sortOrder: number }[]) => void;
  addSection: (section: Omit<QuoteSection, 'id' | 'quoteId'>) => void;
  updateSection: (id: number, updates: Partial<QuoteSection>) => void;
  removeSection: (id: number) => void;
  calculateTotals: () => Promise<void>;
  validateStep: (stepId: string) => boolean;
  validate: () => boolean;
  save: () => Promise<void>;
  submitForApproval: () => Promise<void>;
  reset: () => void;
}

export const useQuoteBuilder = (): UseQuoteBuilderReturn => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  // Local state
  const [quote, setQuote] = useState<Quote | null>(null);
  const [originalQuote, setOriginalQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [calculatedTotals, setCalculatedTotals] = useState<QuoteTotals | null>(null);

  // Computed values
  const isDirty = quote !== null && originalQuote !== null &&
    JSON.stringify(quote) !== JSON.stringify(originalQuote);

  const isValid = validationErrors.filter(error => error.severity === 'error').length === 0;

  // Initialize quote
  const initializeQuote = useCallback(async (options: UseQuoteBuilderOptions) => {
    setIsLoading(true);
    setError(null);

    try {
      let quoteData: Quote;

      if (options.quoteId) {
        // Load existing quote
        quoteData = await quoteService.getQuote(options.quoteId);
      } else if (options.quote) {
        // Create new quote from partial data
        const defaultQuote: Quote = {
          id: 0,
          companyId: 1, // Should come from context
          quoteNumber: 'DRAFT',
          version: 1,
          status: 'draft',
          type: 'standard',
          title: '',
          currencyCode: 'USD',
          exchangeRate: 1,
          lineItems: [],
          sections: [],
          subtotal: 0,
          totalDiscount: 0,
          totalTax: 0,
          total: 0,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          approvalStatus: 'not_required',
          createdBy: 1, // Should come from auth context
          ...options.quote
        };
        quoteData = defaultQuote;
      } else {
        throw new Error('Either quoteId or quote data must be provided');
      }

      setQuote(quoteData);
      setOriginalQuote(JSON.parse(JSON.stringify(quoteData)));
      await calculateTotalsForQuote(quoteData);
      validateQuote(quoteData);
    } catch (err) {
      console.error('Failed to initialize quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize quote');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update quote
  const updateQuote = useCallback((updates: Partial<Quote>) => {
    if (!quote) return;

    const updatedQuote = { ...quote, ...updates, updatedAt: new Date().toISOString() };
    setQuote(updatedQuote);

    // Auto-validate and recalculate
    validateQuote(updatedQuote);
    if (updates.lineItems) {
      calculateTotalsForQuote(updatedQuote);
    }
  }, [quote]);

  // Line item operations
  const addLineItem = useCallback(async (item: CreateLineItemDto) => {
    if (!quote) return;

    const newItem: QuoteLineItem = {
      id: Date.now(), // Temporary ID - will be replaced by server
      quoteId: quote.id,
      sectionId: item.sectionId,
      productId: item.productId,
      variantId: item.variantId,
      name: item.name,
      description: item.description,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice || 0,
      listPrice: item.unitPrice || 0,
      cost: 0, // Should come from pricing engine
      discount: item.discount || 0,
      discountType: item.discountType || 'percentage',
      subtotal: item.quantity * (item.unitPrice || 0),
      configuration: item.configuration,
      sortOrder: quote.lineItems.length,
      isOptional: item.isOptional || false,
      appliedRules: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedLineItems = [...quote.lineItems, newItem];
    updateQuote({ lineItems: updatedLineItems });
  }, [quote, updateQuote]);

  const updateLineItem = useCallback(async (id: number, updates: Partial<QuoteLineItem>) => {
    if (!quote) return;

    const updatedLineItems = quote.lineItems.map(item =>
      item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
    );

    updateQuote({ lineItems: updatedLineItems });
  }, [quote, updateQuote]);

  const removeLineItem = useCallback(async (id: number) => {
    if (!quote) return;

    const updatedLineItems = quote.lineItems.filter(item => item.id !== id);
    updateQuote({ lineItems: updatedLineItems });
  }, [quote, updateQuote]);

  const reorderLineItems = useCallback((items: { id: number; sortOrder: number }[]) => {
    if (!quote) return;

    const updatedLineItems = quote.lineItems.map(item => {
      const reorderInfo = items.find(r => r.id === item.id);
      return reorderInfo ? { ...item, sortOrder: reorderInfo.sortOrder } : item;
    }).sort((a, b) => a.sortOrder - b.sortOrder);

    updateQuote({ lineItems: updatedLineItems });
  }, [quote, updateQuote]);

  // Section operations
  const addSection = useCallback((sectionData: Omit<QuoteSection, 'id' | 'quoteId'>) => {
    if (!quote) return;

    const newSection: QuoteSection = {
      ...sectionData,
      id: Date.now(), // Temporary ID
      quoteId: quote.id,
      lineItems: []
    };

    const updatedSections = [...quote.sections, newSection];
    updateQuote({ sections: updatedSections });
  }, [quote, updateQuote]);

  const updateSection = useCallback((id: number, updates: Partial<QuoteSection>) => {
    if (!quote) return;

    const updatedSections = quote.sections.map(section =>
      section.id === id ? { ...section, ...updates } : section
    );

    updateQuote({ sections: updatedSections });
  }, [quote, updateQuote]);

  const removeSection = useCallback((id: number) => {
    if (!quote) return;

    // Move items from this section to unsectioned
    const updatedLineItems = quote.lineItems.map(item =>
      item.sectionId === id ? { ...item, sectionId: undefined } : item
    );

    const updatedSections = quote.sections.filter(section => section.id !== id);

    updateQuote({
      sections: updatedSections,
      lineItems: updatedLineItems
    });
  }, [quote, updateQuote]);

  // Calculate totals
  const calculateTotalsForQuote = useCallback(async (quoteData: Quote) => {
    try {
      const totals = await quoteCalculator.calculateTotals(quoteData.lineItems, {
        currencyCode: quoteData.currencyCode,
        exchangeRate: quoteData.exchangeRate
      });

      setCalculatedTotals(totals);

      // Update quote with calculated totals if it's the current quote
      if (quote && quoteData.id === quote.id) {
        setQuote(prev => prev ? {
          ...prev,
          subtotal: totals.subtotal,
          totalDiscount: totals.totalDiscount,
          totalTax: totals.totalTax,
          total: totals.total,
          margin: totals.margin
        } : null);
      }
    } catch (error) {
      console.error('Failed to calculate totals:', error);
    }
  }, [quote]);

  const calculateTotals = useCallback(async () => {
    if (quote) {
      await calculateTotalsForQuote(quote);
    }
  }, [quote, calculateTotalsForQuote]);

  // Validation
  const validateQuote = useCallback((quoteData: Quote) => {
    const errors = quoteValidator.validateQuote(quoteData);
    setValidationErrors(errors);
  }, []);

  const validateStep = useCallback((stepId: string) => {
    if (!quote) return false;

    const stepErrors = quoteValidator.validateStep(quote, stepId);
    const hasErrors = stepErrors.filter(error => error.severity === 'error').length > 0;
    return !hasErrors;
  }, [quote]);

  const validate = useCallback(() => {
    if (!quote) return false;
    validateQuote(quote);
    return isValid;
  }, [quote, validateQuote, isValid]);

  // Save operations
  const save = useCallback(async () => {
    if (!quote) return;

    try {
      setIsLoading(true);

      let savedQuote: Quote;
      if (quote.id === 0) {
        // Create new quote
        savedQuote = await quoteService.createQuote(quote);
      } else {
        // Update existing quote
        savedQuote = await quoteService.updateQuote(quote.id, quote);
      }

      setQuote(savedQuote);
      setOriginalQuote(JSON.parse(JSON.stringify(savedQuote)));

      showNotification({
        type: 'success',
        title: 'Quote Saved',
        message: 'Quote has been saved successfully.'
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      if (savedQuote.id) {
        queryClient.invalidateQueries({ queryKey: ['quote', savedQuote.id] });
      }
    } catch (error) {
      console.error('Failed to save quote:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [quote, queryClient, showNotification]);

  const submitForApproval = useCallback(async () => {
    if (!quote || !isValid) return;

    try {
      setIsLoading(true);

      // First save the quote
      await save();

      if (quote.id) {
        // Then submit for approval
        await quoteService.submitForApproval(quote.id);

        // Update local state
        setQuote(prev => prev ? { ...prev, status: 'pending_approval', approvalStatus: 'pending' } : null);

        showNotification({
          type: 'success',
          title: 'Submitted for Approval',
          message: 'Quote has been submitted for approval.'
        });
      }
    } catch (error) {
      console.error('Failed to submit for approval:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [quote, isValid, save, showNotification]);

  // Reset
  const reset = useCallback(() => {
    setQuote(null);
    setOriginalQuote(null);
    setError(null);
    setValidationErrors([]);
    setCalculatedTotals(null);
  }, []);

  return {
    // State
    quote,
    isLoading,
    error,
    isDirty,
    isValid,
    validationErrors,
    calculatedTotals,

    // Actions
    initializeQuote,
    updateQuote,
    addLineItem,
    updateLineItem,
    removeLineItem,
    reorderLineItems,
    addSection,
    updateSection,
    removeSection,
    calculateTotals,
    validateStep,
    validate,
    save,
    submitForApproval,
    reset
  };
};