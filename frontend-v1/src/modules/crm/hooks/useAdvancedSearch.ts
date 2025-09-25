/**
 * useAdvancedSearch Hook - Sprint 17
 * Hook for advanced search functionality
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { searchService } from '../services';
import { useNotification } from '@/shared/hooks/useNotification';
import type {
  SearchQuery,
  SearchResult,
  SearchSuggestion,
  SavedSearch,
  SearchFilters
} from '../types';

export const useAdvancedSearch = () => {
  const [query, setQuery] = useState<SearchQuery>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const debounceTimer = useRef<NodeJS.Timeout>();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  /**
   * Debounce search term for suggestions
   */
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchTerm]);

  /**
   * Perform search
   */
  const searchMutation = useMutation({
    mutationFn: (searchQuery: SearchQuery) => searchService.search(searchQuery),
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Search failed');
    }
  });

  /**
   * Quick search
   */
  const quickSearchMutation = useMutation({
    mutationFn: (term: string) =>
      searchService.quickSearch({ query: term, limit: 20 })
  });

  /**
   * Get search suggestions
   */
  const {
    data: suggestions,
    isLoading: loadingSuggestions
  } = useQuery({
    queryKey: ['search-suggestions', debouncedSearchTerm],
    queryFn: () => searchService.getSuggestions(debouncedSearchTerm),
    enabled: debouncedSearchTerm.length > 2,
    staleTime: 30 * 1000 // 30 seconds
  });

  /**
   * Get saved searches
   */
  const {
    data: savedSearches,
    isLoading: loadingSavedSearches,
    refetch: refetchSavedSearches
  } = useQuery({
    queryKey: ['saved-searches'],
    queryFn: () => searchService.getSavedSearches(),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  /**
   * Get search history
   */
  const {
    data: searchHistory,
    refetch: refetchHistory
  } = useQuery({
    queryKey: ['search-history'],
    queryFn: () => searchService.getSearchHistory(10),
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

  /**
   * Save search
   */
  const saveSearchMutation = useMutation({
    mutationFn: (search: Omit<SavedSearch, 'id' | 'created_at' | 'updated_at'>) =>
      searchService.saveSearch(search),
    onSuccess: () => {
      queryClient.invalidateQueries(['saved-searches']);
      showSuccess('Search saved successfully');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Error saving search');
    }
  });

  /**
   * Delete saved search
   */
  const deleteSearchMutation = useMutation({
    mutationFn: (id: number) => searchService.deleteSavedSearch(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['saved-searches']);
      showSuccess('Saved search deleted');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Error deleting saved search');
    }
  });

  /**
   * Execute saved search
   */
  const executeSavedSearchMutation = useMutation({
    mutationFn: (id: number) => searchService.executeSavedSearch(id),
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Error executing saved search');
    }
  });

  /**
   * Clear search history
   */
  const clearHistoryMutation = useMutation({
    mutationFn: () => searchService.clearSearchHistory(),
    onSuccess: () => {
      queryClient.invalidateQueries(['search-history']);
      showSuccess('Search history cleared');
    }
  });

  /**
   * Update search query
   */
  const updateQuery = useCallback((updates: Partial<SearchQuery>) => {
    setQuery(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Update search filters
   */
  const updateFilters = useCallback((filters: SearchFilters) => {
    setQuery(prev => ({ ...prev, filters }));
  }, []);

  /**
   * Clear search
   */
  const clearSearch = useCallback(() => {
    setQuery({});
    setSearchTerm('');
    searchMutation.reset();
  }, [searchMutation]);

  /**
   * Perform search with current query
   */
  const search = useCallback(() => {
    const finalQuery: SearchQuery = {
      ...query,
      text_query: searchTerm || undefined
    };
    return searchMutation.mutate(finalQuery);
  }, [query, searchTerm, searchMutation]);

  /**
   * Load and execute saved search
   */
  const loadSavedSearch = useCallback(async (id: number) => {
    const result = await executeSavedSearchMutation.mutateAsync(id);
    return result;
  }, [executeSavedSearchMutation]);

  return {
    // State
    query,
    searchTerm,
    searchResults: searchMutation.data,
    suggestions: suggestions || [],
    savedSearches: savedSearches || [],
    searchHistory: searchHistory || [],

    // Loading states
    isSearching: searchMutation.isLoading,
    loadingSuggestions,
    loadingSavedSearches,

    // Actions
    search,
    quickSearch: quickSearchMutation.mutate,
    updateQuery,
    updateFilters,
    clearSearch,
    setSearchTerm,
    saveSearch: saveSearchMutation.mutate,
    deleteSearch: deleteSearchMutation.mutate,
    loadSavedSearch,
    clearHistory: clearHistoryMutation.mutate,
    refetchSavedSearches,
    refetchHistory,

    // Mutation states
    isSaving: saveSearchMutation.isLoading,
    isDeleting: deleteSearchMutation.isLoading
  };
};