/**
 * Enhanced Quote Builder Hook - Sprint 20 Implementation
 * Complete hook for quote creation and management
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '../shared/hooks/useDebounce';
import { quoteService } from '../services/quoteService';
import { productService } from '../catalog/services/productService';
import { pricingService } from '../pricing/services/pricingService';
import {
  Quote,
  QuoteItem,
  Product,
  QuoteSummary,
  DiscountRule,
  PriceCalculation
} from '../../shared/types';
import { useNotification } from '../../../../shared/hooks/useNotification';
import { useAuth } from '../../../../shared/hooks/useAuth';
import { useWebSocket } from '../shared/hooks/useWebSocket';

export interface QuoteBuilderState {
  quote: Partial<Quote>;
  items: QuoteItem[];
  summary: QuoteSummary;
  loading: boolean;
  saving: boolean;
  error: string | null;
  isDirty: boolean;
  isValid: boolean;
  validationErrors: string[];
  autoSaveEnabled: boolean;
  lastSaved: Date | null;
}

export interface UseQuoteBuilderOptions {
  quoteId?: number;
  opportunityId?: number;
  accountId?: number;
  contactId?: number;
  autoSave?: boolean;
  autoSaveInterval?: number;
  enableRealTimePricing?: boolean;
  template?: 'standard' | 'services' | 'products' | 'hybrid';
}

export const useQuoteBuilderEnhanced = (options: UseQuoteBuilderOptions = {}) => {
  const {
    quoteId,
    opportunityId,
    accountId,
    contactId,
    autoSave = true,
    autoSaveInterval = 30000, // 30 seconds
    enableRealTimePricing = true,
    template = 'standard'
  } = options;

  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const { subscribe, unsubscribe, emit } = useWebSocket();
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const lastCalculationRef = useRef<Date>(new Date());

  // State management
  const [quote, setQuote] = useState<Partial<Quote>>({
    opportunity_id: opportunityId,
    account_id: accountId,
    contact_id: contactId,
    status: 'draft',
    currency: 'USD',
    valid_from: new Date(),
    valid_to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    terms_conditions: '',
    payment_terms: 'Net 30',
    delivery_terms: 'Standard delivery'
  });

  const [items, setItems] = useState<QuoteItem[]>([]);
  const [summary, setSummary] = useState<QuoteSummary>({
    subtotal: 0,
    discount_total: 0,
    tax_total: 0,
    shipping_total: 0,
    grand_total: 0,
    margin_total: 0,
    margin_percentage: 0,
    item_count: 0
  });

  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(autoSave);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Debounced items for price calculation
  const debouncedItems = useDebounce(items, 500);

  // Load existing quote if quoteId provided
  const {
    data: existingQuote,
    isLoading: loadingQuote,
    error: loadError
  } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => quoteService.getQuoteById(quoteId!),
    enabled: !!quoteId,
    onSuccess: (data) => {
      setQuote(data.quote);
      setItems(data.items || []);
      setIsDirty(false);
    }
  });

  // Real-time price calculation
  const {
    data: calculationResult,
    isLoading: calculatingPrices,
    refetch: recalculatePrices
  } = useQuery({
    queryKey: ['quote-calculation', debouncedItems, quote.account_id],
    queryFn: () => quoteService.calculateQuoteTotals({
      items: debouncedItems,
      accountId: quote.account_id,
      currency: quote.currency || 'USD'
    }),
    enabled: debouncedItems.length > 0 && enableRealTimePricing,
    staleTime: 10000, // 10 seconds
    onSuccess: (result) => {
      setSummary(result);
      lastCalculationRef.current = new Date();
    }
  });

  // Save quote mutation
  const saveQuoteMutation = useMutation({
    mutationFn: async (data: { quote: Partial<Quote>; items: QuoteItem[] }) => {
      if (quoteId) {
        return await quoteService.updateQuote(quoteId, data);
      } else {
        return await quoteService.createQuote(data);
      }
    },
    onSuccess: (result) => {
      setQuote(result.quote);
      setItems(result.items || []);
      setIsDirty(false);
      setLastSaved(new Date());

      if (!quoteId) {
        // Update URL or handle new quote creation
        window.history.replaceState(null, '', `/quotes/${result.quote.id}`);
      }

      showNotification({
        type: 'success',
        title: 'Quote Saved',
        message: `Quote ${result.quote.quote_number} saved successfully`
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Save Failed',
        message: error.message || 'Failed to save quote'
      });
    }
  });

  // Clone quote mutation
  const cloneQuoteMutation = useMutation({
    mutationFn: (sourceQuoteId: number) => quoteService.cloneQuote(sourceQuoteId),
    onSuccess: (result) => {
      setQuote(result.quote);
      setItems(result.items || []);
      setIsDirty(true);
      showNotification({
        type: 'success',
        title: 'Quote Cloned',
        message: 'Quote cloned successfully'
      });
    }
  });

  // Convert to order mutation
  const convertToOrderMutation = useMutation({
    mutationFn: () => quoteService.convertToOrder(quoteId!),
    onSuccess: (result) => {
      showNotification({
        type: 'success',
        title: 'Quote Converted',
        message: `Quote converted to order ${result.order_number}`
      });
      queryClient.invalidateQueries(['quote', quoteId]);
    }
  });

  // Add product to quote
  const addProduct = useCallback(async (
    product: Product,
    quantity: number = 1,
    customPrice?: number
  ) => {
    try {
      // Get pricing for the product
      const pricing = customPrice ? {
        final_price: customPrice,
        base_price: product.base_price,
        calculated_price: customPrice,
        discounts: []
      } : await pricingService.calculatePrice(
        product.id!,
        quantity,
        quote.account_id
      );

      const newItem: QuoteItem = {
        id: Date.now(), // Temporary ID
        product_id: product.id,
        description: product.name,
        quantity,
        unit_price: pricing.final_price,
        list_price: pricing.base_price,
        discount_percentage: 0,
        discount_amount: 0,
        tax_rate: 0.10, // 10% default
        subtotal: pricing.final_price * quantity,
        total_amount: pricing.final_price * quantity,
        cost: product.cost,
        optional: false,
        display_order: items.length
      };

      setItems(prev => [...prev, newItem]);
      setIsDirty(true);

      showNotification({
        type: 'success',
        title: 'Product Added',
        message: `${product.name} added to quote`
      });
    } catch (error: any) {
      showNotification({
        type: 'error',
        title: 'Add Product Failed',
        message: error.message
      });
    }
  }, [items.length, quote.account_id, showNotification]);

  // Remove item from quote
  const removeItem = useCallback((itemId: number) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
    setIsDirty(true);
  }, []);

  // Update item quantity
  const updateItemQuantity = useCallback(async (
    itemId: number,
    quantity: number
  ) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const subtotal = item.unit_price * quantity;
        const discountAmount = subtotal * (item.discount_percentage || 0) / 100;
        const netAmount = subtotal - discountAmount;
        const taxAmount = netAmount * (item.tax_rate || 0);
        const totalAmount = netAmount + taxAmount;

        return {
          ...item,
          quantity,
          subtotal,
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          total_amount: totalAmount
        };
      }
      return item;
    }));

    setIsDirty(true);

    // Recalculate pricing if real-time pricing is enabled
    if (enableRealTimePricing) {
      await recalculatePrices();
    }
  }, [removeItem, enableRealTimePricing, recalculatePrices]);

  // Update item price
  const updateItemPrice = useCallback((
    itemId: number,
    unitPrice: number
  ) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const subtotal = unitPrice * item.quantity;
        const discountAmount = subtotal * (item.discount_percentage || 0) / 100;
        const netAmount = subtotal - discountAmount;
        const taxAmount = netAmount * (item.tax_rate || 0);
        const totalAmount = netAmount + taxAmount;

        return {
          ...item,
          unit_price: unitPrice,
          subtotal,
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          total_amount: totalAmount
        };
      }
      return item;
    }));

    setIsDirty(true);
  }, []);

  // Apply discount to item
  const applyItemDiscount = useCallback((
    itemId: number,
    discountType: 'percentage' | 'fixed',
    discountValue: number
  ) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        let discountAmount = 0;
        let discountPercentage = 0;

        if (discountType === 'percentage') {
          discountPercentage = discountValue;
          discountAmount = item.subtotal * (discountValue / 100);
        } else {
          discountAmount = discountValue;
          discountPercentage = (discountValue / item.subtotal) * 100;
        }

        const netAmount = item.subtotal - discountAmount;
        const taxAmount = netAmount * (item.tax_rate || 0);
        const totalAmount = netAmount + taxAmount;

        return {
          ...item,
          discount_percentage: discountPercentage,
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          total_amount: totalAmount
        };
      }
      return item;
    }));

    setIsDirty(true);
  }, []);

  // Apply global discount to quote
  const applyGlobalDiscount = useCallback((
    discountType: 'percentage' | 'fixed',
    discountValue: number
  ) => {
    if (discountType === 'percentage') {
      setQuote(prev => ({
        ...prev,
        discount_percentage: discountValue,
        discount_amount: undefined
      }));
    } else {
      setQuote(prev => ({
        ...prev,
        discount_amount: discountValue,
        discount_percentage: undefined
      }));
    }

    setIsDirty(true);
  }, []);

  // Reorder items
  const reorderItems = useCallback((fromIndex: number, toIndex: number) => {
    setItems(prev => {
      const newItems = [...prev];
      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, movedItem);

      // Update display order
      return newItems.map((item, index) => ({
        ...item,
        display_order: index
      }));
    });

    setIsDirty(true);
  }, []);

  // Bulk operations
  const bulkUpdateItems = useCallback((
    itemIds: number[],
    updates: Partial<QuoteItem>
  ) => {
    setItems(prev => prev.map(item => {
      if (itemIds.includes(item.id!)) {
        const updated = { ...item, ...updates };

        // Recalculate totals if price or quantity changed
        if (updates.unit_price || updates.quantity) {
          const subtotal = updated.unit_price * updated.quantity;
          const discountAmount = subtotal * (updated.discount_percentage || 0) / 100;
          const netAmount = subtotal - discountAmount;
          const taxAmount = netAmount * (updated.tax_rate || 0);
          const totalAmount = netAmount + taxAmount;

          return {
            ...updated,
            subtotal,
            discount_amount: discountAmount,
            tax_amount: taxAmount,
            total_amount: totalAmount
          };
        }

        return updated;
      }
      return item;
    }));

    setIsDirty(true);
  }, []);

  // Quote validation
  const validateQuote = useCallback(() => {
    const errors: string[] = [];

    if (!quote.account_id) {
      errors.push('Account is required');
    }

    if (!quote.contact_id) {
      errors.push('Contact is required');
    }

    if (items.length === 0) {
      errors.push('At least one line item is required');
    }

    if (quote.valid_to && quote.valid_from && quote.valid_to <= quote.valid_from) {
      errors.push('Valid to date must be after valid from date');
    }

    // Validate items
    items.forEach((item, index) => {
      if (!item.description?.trim()) {
        errors.push(`Item ${index + 1}: Description is required`);
      }
      if (item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      }
      if (item.unit_price < 0) {
        errors.push(`Item ${index + 1}: Unit price cannot be negative`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  }, [quote, items]);

  // Auto-save functionality
  const performAutoSave = useCallback(async () => {
    if (!isDirty || !autoSaveEnabled) return;

    try {
      await saveQuoteMutation.mutateAsync({ quote, items });
    } catch (error) {
      // Auto-save errors are logged but not shown to user
      console.error('Auto-save failed:', error);
    }
  }, [isDirty, autoSaveEnabled, quote, items, saveQuoteMutation]);

  // Manual save
  const saveQuote = useCallback(async () => {
    if (!validateQuote()) {
      showNotification({
        type: 'error',
        title: 'Validation Failed',
        message: 'Please fix validation errors before saving',
        details: validationErrors
      });
      return;
    }

    return await saveQuoteMutation.mutateAsync({ quote, items });
  }, [validateQuote, validationErrors, quote, items, showNotification, saveQuoteMutation]);

  // Auto-save timer
  useEffect(() => {
    if (autoSaveEnabled && isDirty) {
      autoSaveRef.current = setTimeout(performAutoSave, autoSaveInterval);
    }

    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
  }, [autoSaveEnabled, isDirty, performAutoSave, autoSaveInterval]);

  // WebSocket integration for collaborative editing
  useEffect(() => {
    if (!quoteId) return;

    const handleQuoteUpdate = (data: any) => {
      if (data.quoteId === quoteId && data.userId !== user?.id) {
        // Another user updated the quote
        queryClient.invalidateQueries(['quote', quoteId]);
        showNotification({
          type: 'info',
          title: 'Quote Updated',
          message: `Quote was updated by ${data.userName}`,
          duration: 3000
        });
      }
    };

    const handleQuoteLock = (data: any) => {
      if (data.quoteId === quoteId && data.userId !== user?.id) {
        showNotification({
          type: 'warning',
          title: 'Quote Locked',
          message: `${data.userName} is currently editing this quote`,
          duration: 5000
        });
      }
    };

    subscribe('quote_updated', handleQuoteUpdate);
    subscribe('quote_locked', handleQuoteLock);

    // Emit that we're editing this quote
    emit('quote_lock', { quoteId, userId: user?.id, userName: user?.name });

    return () => {
      unsubscribe('quote_updated', handleQuoteUpdate);
      unsubscribe('quote_locked', handleQuoteLock);
      emit('quote_unlock', { quoteId, userId: user?.id });
    };
  }, [quoteId, user, queryClient, showNotification, subscribe, unsubscribe, emit]);

  // Computed values
  const isValid = useMemo(() => validateQuote(), [validateQuote]);

  const canSave = useMemo(() =>
    isValid && isDirty && !saveQuoteMutation.isLoading,
    [isValid, isDirty, saveQuoteMutation.isLoading]
  );

  const canConvert = useMemo(() =>
    quote.status === 'accepted' && quote.approval_status === 'approved',
    [quote.status, quote.approval_status]
  );

  return {
    // State
    quote,
    items,
    summary,
    loading: loadingQuote || calculatingPrices,
    saving: saveQuoteMutation.isLoading,
    error: loadError?.message || null,
    isDirty,
    isValid,
    validationErrors,
    autoSaveEnabled,
    lastSaved,

    // Quote actions
    setQuote: (updates: Partial<Quote>) => {
      setQuote(prev => ({ ...prev, ...updates }));
      setIsDirty(true);
    },

    // Item actions
    addProduct,
    removeItem,
    updateItemQuantity,
    updateItemPrice,
    applyItemDiscount,
    reorderItems,
    bulkUpdateItems,

    // Global actions
    applyGlobalDiscount,
    saveQuote,
    validateQuote,
    recalculatePrices,

    // Mutations
    cloneQuote: cloneQuoteMutation.mutate,
    convertToOrder: convertToOrderMutation.mutate,

    // Settings
    setAutoSaveEnabled,

    // Computed
    canSave,
    canConvert,

    // Stats
    stats: {
      itemCount: items.length,
      totalValue: summary.grand_total,
      marginPercentage: summary.margin_percentage,
      discountTotal: summary.discount_total,
      lastCalculated: lastCalculationRef.current
    },

    // Features
    features: {
      autoSave: autoSaveEnabled,
      realTimePricing: enableRealTimePricing,
      collaborative: !!quoteId,
      canClone: !!quoteId,
      canConvert: canConvert
    }
  };
};

export type { QuoteBuilderState };
export default useQuoteBuilderEnhanced;