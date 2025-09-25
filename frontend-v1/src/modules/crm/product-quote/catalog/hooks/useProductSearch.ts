// useProductSearch Hook - Sprint 19 Frontend Implementation

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ProductSearchParams,
  ProductSearchResult,
  ProductFacet,
  SearchSuggestion
} from '../../../shared/types';
import { productService } from '../services/productService';

interface UseProductSearchOptions {
  debounceMs?: number;
  enableSuggestions?: boolean;
  enableFacets?: boolean;
  minQueryLength?: number;
  maxSuggestions?: number;
}

interface UseProductSearchReturn {
  // Search state
  query: string;
  results: ProductSearchResult | null;
  suggestions: SearchSuggestion[];
  facets: ProductFacet[];

  // Loading states
  isSearching: boolean;
  isLoadingSuggestions: boolean;

  // Error states
  searchError: string | null;
  suggestionsError: string | null;

  // Actions
  setQuery: (query: string) => void;
  search: (params?: Partial<ProductSearchParams>) => void;
  clearSearch: () => void;
  selectSuggestion: (suggestion: SearchSuggestion) => void;

  // Utilities
  hasResults: boolean;
  totalResults: number;
  isEmpty: boolean;
  isValidQuery: boolean;
}

export const useProductSearch = (options: UseProductSearchOptions = {}): UseProductSearchReturn => {
  const {
    debounceMs = 300,
    enableSuggestions = true,
    enableFacets = true,
    minQueryLength = 2,
    maxSuggestions = 10
  } = options;

  // State
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchParams, setSearchParams] = useState<ProductSearchParams>({});
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('product-recent-searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (error) {
        console.warn('Failed to parse recent searches:', error);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (searchQuery.trim().length >= minQueryLength) {
      setRecentSearches(prev => {
        const filtered = prev.filter(s => s !== searchQuery);
        const updated = [searchQuery, ...filtered].slice(0, 10);
        localStorage.setItem('product-recent-searches', JSON.stringify(updated));
        return updated;
      });
    }
  }, [minQueryLength]);

  // Build search parameters
  const finalSearchParams = useMemo((): ProductSearchParams => ({
    query: debouncedQuery,
    facets: enableFacets ? ['categories', 'status', 'type', 'tags', 'price'] : undefined,
    limit: 20,
    ...searchParams
  }), [debouncedQuery, searchParams, enableFacets]);

  // Validation
  const isValidQuery = debouncedQuery.length >= minQueryLength;

  // Main search query
  const {
    data: results,
    isLoading: isSearching,
    error: searchError,
    refetch: executeSearch
  } = useQuery({
    queryKey: ['products', 'search', finalSearchParams],
    queryFn: () => productService.searchProducts(finalSearchParams),
    enabled: isValidQuery,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  // Generate search suggestions
  const suggestions = useMemo((): SearchSuggestion[] => {
    if (!enableSuggestions || !query || query.length < minQueryLength) {
      return [];
    }

    const suggestions: SearchSuggestion[] = [];

    // Add recent searches that match current query
    const matchingRecent = recentSearches
      .filter(search => search.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3)
      .map(search => ({
        value: search,
        label: search,
        type: 'recent' as const,
        count: undefined
      }));

    suggestions.push(...matchingRecent);

    // Add popular search suggestions (mock data - replace with real API)
    const popularSearches = [
      'Electronics',
      'Software',
      'Hardware',
      'Services',
      'Accessories'
    ].filter(term =>
      term.toLowerCase().includes(query.toLowerCase()) &&
      !suggestions.some(s => s.value === term)
    ).slice(0, 3).map(term => ({
      value: term,
      label: term,
      type: 'popular' as const,
      count: Math.floor(Math.random() * 100) + 10
    }));

    suggestions.push(...popularSearches);

    // Add auto-complete suggestions based on current results
    if (results?.suggestions) {
      const autoComplete = results.suggestions
        .filter(suggestion =>
          !suggestions.some(s => s.value === suggestion)
        )
        .slice(0, 2)
        .map(suggestion => ({
          value: suggestion,
          label: suggestion,
          type: 'suggestion' as const,
          count: undefined
        }));

      suggestions.push(...autoComplete);
    }

    return suggestions.slice(0, maxSuggestions);
  }, [query, recentSearches, results?.suggestions, enableSuggestions, minQueryLength, maxSuggestions]);

  // Derived state
  const facets = results?.facets || [];
  const hasResults = (results?.products.length || 0) > 0;
  const totalResults = results?.total || 0;
  const isEmpty = isValidQuery && !isSearching && !hasResults;

  // Actions
  const setQueryWithDebounce = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  const search = useCallback((params?: Partial<ProductSearchParams>) => {
    if (params) {
      setSearchParams(prev => ({ ...prev, ...params }));
    }

    if (query.trim()) {
      saveRecentSearch(query.trim());
      executeSearch();
    }
  }, [query, saveRecentSearch, executeSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setSearchParams({});
  }, []);

  const selectSuggestion = useCallback((suggestion: SearchSuggestion) => {
    setQuery(suggestion.value);
    saveRecentSearch(suggestion.value);

    // Trigger immediate search
    setTimeout(() => {
      setSearchParams(prev => ({ ...prev, query: suggestion.value }));
    }, 0);
  }, [saveRecentSearch]);

  return {
    // Search state
    query,
    results,
    suggestions,
    facets,

    // Loading states
    isSearching,
    isLoadingSuggestions: false, // Could be implemented for async suggestions

    // Error states
    searchError: searchError?.message || null,
    suggestionsError: null,

    // Actions
    setQuery: setQueryWithDebounce,
    search,
    clearSearch,
    selectSuggestion,

    // Utilities
    hasResults,
    totalResults,
    isEmpty,
    isValidQuery
  };
};

export default useProductSearch;