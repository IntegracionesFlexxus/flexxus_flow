// useQuotes - Sprint 19 Frontend Implementation
// Quote CRUD operations

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quoteService } from '../services/quoteService';
import {
  Quote,
  QuoteFilters,
  PaginatedResponse,
  CreateDto,
  UpdateDto
} from '../../shared/types';

interface UseQuotesOptions {
  filters?: QuoteFilters;
  page?: number;
  limit?: number;
}

interface UseQuotesReturn {
  // State
  quotes: Quote[];
  currentQuote: Quote | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadQuotes: (options?: UseQuotesOptions) => Promise<void>;
  loadQuote: (id: number) => Promise<void>;
  createQuote: (data: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Quote>;
  updateQuote: (id: number, updates: Partial<Quote>) => Promise<Quote>;
  deleteQuote: (id: number) => Promise<void>;
  duplicateQuote: (id: number, options?: {
    newTitle?: string;
    copyLineItems?: boolean;
    resetDates?: boolean;
  }) => Promise<Quote>;
  submitForApproval: (id: number, comments?: string) => Promise<void>;
  convertToOrder: (id: number) => Promise<{ orderId: number }>;
  exportQuotes: (options: {
    format: 'csv' | 'excel' | 'pdf';
    quoteIds?: number[];
    filters?: any;
    columns?: string[];
  }) => Promise<Blob>;
  bulkUpdateQuotes: (updates: Array<{ id: number; data: Partial<Quote> }>) => Promise<void>;
}

export const useQuotes = (initialOptions?: UseQuotesOptions): UseQuotesReturn => {
  const queryClient = useQueryClient();

  // Local state
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load quotes with filters and pagination
  const loadQuotes = useCallback(async (options: UseQuotesOptions = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        page: options.page || 1,
        limit: options.limit || 25,
        ...options.filters
      };

      const response = await quoteService.getQuotes(params);

      setQuotes(response.data);
      setPagination(response.pagination);
    } catch (err) {
      console.error('Failed to load quotes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quotes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load single quote
  const loadQuote = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const quote = await quoteService.getQuote(id);
      setCurrentQuote(quote);

      // Update quotes array if the quote exists there
      setQuotes(prevQuotes =>
        prevQuotes.map(q => q.id === id ? quote : q)
      );
    } catch (err) {
      console.error('Failed to load quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quote');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mutations
  const createQuoteMutation = useMutation({
    mutationFn: (data: CreateDto<Quote>) => quoteService.createQuote(data),
    onSuccess: (newQuote) => {
      setQuotes(prevQuotes => [newQuote, ...prevQuotes]);
      setCurrentQuote(newQuote);
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
    onError: (error) => {
      console.error('Failed to create quote:', error);
      setError(error instanceof Error ? error.message : 'Failed to create quote');
    }
  });

  const updateQuoteMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: UpdateDto<Quote> }) =>
      quoteService.updateQuote(id, updates),
    onSuccess: (updatedQuote) => {
      setQuotes(prevQuotes =>
        prevQuotes.map(q => q.id === updatedQuote.id ? updatedQuote : q)
      );
      if (currentQuote?.id === updatedQuote.id) {
        setCurrentQuote(updatedQuote);
      }
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', updatedQuote.id] });
    },
    onError: (error) => {
      console.error('Failed to update quote:', error);
      setError(error instanceof Error ? error.message : 'Failed to update quote');
    }
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: (id: number) => quoteService.deleteQuote(id),
    onSuccess: (_, deletedId) => {
      setQuotes(prevQuotes => prevQuotes.filter(q => q.id !== deletedId));
      if (currentQuote?.id === deletedId) {
        setCurrentQuote(null);
      }
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
    onError: (error) => {
      console.error('Failed to delete quote:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete quote');
    }
  });

  const duplicateQuoteMutation = useMutation({
    mutationFn: ({ id, options }: {
      id: number;
      options?: {
        newTitle?: string;
        copyLineItems?: boolean;
        resetDates?: boolean;
      }
    }) => quoteService.duplicateQuote(id, options),
    onSuccess: (duplicatedQuote) => {
      setQuotes(prevQuotes => [duplicatedQuote, ...prevQuotes]);
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
    onError: (error) => {
      console.error('Failed to duplicate quote:', error);
      setError(error instanceof Error ? error.message : 'Failed to duplicate quote');
    }
  });

  const submitForApprovalMutation = useMutation({
    mutationFn: ({ id, comments }: { id: number; comments?: string }) =>
      quoteService.submitForApproval(id, comments),
    onSuccess: (_, { id }) => {
      // Update quote status locally
      setQuotes(prevQuotes =>
        prevQuotes.map(q =>
          q.id === id
            ? { ...q, status: 'pending_approval' as const, approvalStatus: 'pending' as const }
            : q
        )
      );
      if (currentQuote?.id === id) {
        setCurrentQuote(prev => prev ? {
          ...prev,
          status: 'pending_approval' as const,
          approvalStatus: 'pending' as const
        } : null);
      }
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
    },
    onError: (error) => {
      console.error('Failed to submit for approval:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit for approval');
    }
  });

  const convertToOrderMutation = useMutation({
    mutationFn: (id: number) => quoteService.convertToOrder(id),
    onSuccess: (result, id) => {
      // Update quote status locally
      setQuotes(prevQuotes =>
        prevQuotes.map(q =>
          q.id === id
            ? { ...q, status: 'converted' as const, convertedOrderId: result.orderId }
            : q
        )
      );
      if (currentQuote?.id === id) {
        setCurrentQuote(prev => prev ? {
          ...prev,
          status: 'converted' as const,
          convertedOrderId: result.orderId
        } : null);
      }
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
    },
    onError: (error) => {
      console.error('Failed to convert to order:', error);
      setError(error instanceof Error ? error.message : 'Failed to convert to order');
    }
  });

  const exportQuotesMutation = useMutation({
    mutationFn: (options: {
      format: 'csv' | 'excel' | 'pdf';
      quoteIds?: number[];
      filters?: any;
      columns?: string[];
    }) => quoteService.exportQuotes(options),
    onError: (error) => {
      console.error('Failed to export quotes:', error);
      setError(error instanceof Error ? error.message : 'Failed to export quotes');
    }
  });

  const bulkUpdateQuotesMutation = useMutation({
    mutationFn: (updates: Array<{ id: number; data: Partial<Quote> }>) =>
      quoteService.bulkUpdateQuotes(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      loadQuotes(); // Reload quotes to get updated data
    },
    onError: (error) => {
      console.error('Failed to bulk update quotes:', error);
      setError(error instanceof Error ? error.message : 'Failed to bulk update quotes');
    }
  });

  // Action wrappers
  const createQuote = useCallback(async (data: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>) => {
    const result = await createQuoteMutation.mutateAsync(data);
    return result;
  }, [createQuoteMutation]);

  const updateQuote = useCallback(async (id: number, updates: Partial<Quote>) => {
    const result = await updateQuoteMutation.mutateAsync({ id, updates });
    return result;
  }, [updateQuoteMutation]);

  const deleteQuote = useCallback(async (id: number) => {
    await deleteQuoteMutation.mutateAsync(id);
  }, [deleteQuoteMutation]);

  const duplicateQuote = useCallback(async (
    id: number,
    options?: {
      newTitle?: string;
      copyLineItems?: boolean;
      resetDates?: boolean;
    }
  ) => {
    const result = await duplicateQuoteMutation.mutateAsync({ id, options });
    return result;
  }, [duplicateQuoteMutation]);

  const submitForApproval = useCallback(async (id: number, comments?: string) => {
    await submitForApprovalMutation.mutateAsync({ id, comments });
  }, [submitForApprovalMutation]);

  const convertToOrder = useCallback(async (id: number) => {
    const result = await convertToOrderMutation.mutateAsync(id);
    return result;
  }, [convertToOrderMutation]);

  const exportQuotes = useCallback(async (options: {
    format: 'csv' | 'excel' | 'pdf';
    quoteIds?: number[];
    filters?: any;
    columns?: string[];
  }) => {
    const result = await exportQuotesMutation.mutateAsync(options);
    return result;
  }, [exportQuotesMutation]);

  const bulkUpdateQuotes = useCallback(async (updates: Array<{ id: number; data: Partial<Quote> }>) => {
    await bulkUpdateQuotesMutation.mutateAsync(updates);
  }, [bulkUpdateQuotesMutation]);

  // Determine loading state
  const isMutationLoading =
    createQuoteMutation.isPending ||
    updateQuoteMutation.isPending ||
    deleteQuoteMutation.isPending ||
    duplicateQuoteMutation.isPending ||
    submitForApprovalMutation.isPending ||
    convertToOrderMutation.isPending ||
    exportQuotesMutation.isPending ||
    bulkUpdateQuotesMutation.isPending;

  const finalIsLoading = isLoading || isMutationLoading;

  return {
    // State
    quotes,
    currentQuote,
    pagination,
    isLoading: finalIsLoading,
    error,

    // Actions
    loadQuotes,
    loadQuote,
    createQuote,
    updateQuote,
    deleteQuote,
    duplicateQuote,
    submitForApproval,
    convertToOrder,
    exportQuotes,
    bulkUpdateQuotes
  };
};