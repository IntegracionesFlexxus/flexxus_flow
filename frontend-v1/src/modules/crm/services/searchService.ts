/**
 * Search Service - Sprint 17
 * Advanced search functionality for CRM module
 */

import { api } from '@/shared/services/api';
import type {
  SearchQuery,
  SearchResult,
  SearchSuggestion,
  SavedSearch,
  SearchHistory,
  SearchAnalytics,
  QuickSearchRequest
} from '../types';

class SearchService {
  private readonly basePath = '/crm/search';

  /**
   * Perform advanced search
   */
  async search(query: SearchQuery): Promise<SearchResult> {
    const { data } = await api.post(this.basePath, query);
    return data.data;
  }

  /**
   * Quick search across entities
   */
  async quickSearch(request: QuickSearchRequest): Promise<SearchResult> {
    const { data } = await api.get(`${this.basePath}/quick`, {
      params: {
        q: request.query,
        limit: request.limit,
        entity_types: request.entity_types?.join(',')
      }
    });
    return data.data;
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(term: string, entityType?: string): Promise<SearchSuggestion[]> {
    const { data } = await api.get(`${this.basePath}/suggestions`, {
      params: { q: term, entity_type: entityType }
    });
    return data.data;
  }

  /**
   * Save a search
   */
  async saveSearch(search: Omit<SavedSearch, 'id' | 'created_at' | 'updated_at'>): Promise<SavedSearch> {
    const { data } = await api.post(`${this.basePath}/saved`, search);
    return data.data;
  }

  /**
   * Get saved searches
   */
  async getSavedSearches(shared: boolean = false): Promise<SavedSearch[]> {
    const { data } = await api.get(`${this.basePath}/saved`, {
      params: { shared }
    });
    return data.data;
  }

  /**
   * Get saved search by ID
   */
  async getSavedSearchById(id: number): Promise<SavedSearch> {
    const { data } = await api.get(`${this.basePath}/saved/${id}`);
    return data.data;
  }

  /**
   * Update saved search
   */
  async updateSavedSearch(
    id: number,
    updates: Partial<SavedSearch>
  ): Promise<SavedSearch> {
    const { data } = await api.put(`${this.basePath}/saved/${id}`, updates);
    return data.data;
  }

  /**
   * Delete saved search
   */
  async deleteSavedSearch(id: number): Promise<void> {
    await api.delete(`${this.basePath}/saved/${id}`);
  }

  /**
   * Execute saved search
   */
  async executeSavedSearch(id: number): Promise<SearchResult> {
    const { data } = await api.get(`${this.basePath}/saved/${id}/execute`);
    return data.data;
  }

  /**
   * Get search history
   */
  async getSearchHistory(limit: number = 20): Promise<SearchHistory[]> {
    const { data } = await api.get(`${this.basePath}/history`, {
      params: { limit }
    });
    return data.data;
  }

  /**
   * Clear search history
   */
  async clearSearchHistory(): Promise<void> {
    await api.delete(`${this.basePath}/history`);
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(
    startDate?: string,
    endDate?: string
  ): Promise<SearchAnalytics> {
    const { data } = await api.get(`${this.basePath}/analytics`, {
      params: { start_date: startDate, end_date: endDate }
    });
    return data.data;
  }

  /**
   * Get popular search terms
   */
  async getPopularSearchTerms(limit: number = 10, period: string = '30d'): Promise<string[]> {
    const { data } = await api.get(`${this.basePath}/popular`, {
      params: { limit, period }
    });
    return data.data;
  }

  /**
   * Index entities for search
   */
  async indexEntities(entityType: string, entityIds?: number[]): Promise<any> {
    const { data } = await api.post(`${this.basePath}/index`, {
      entity_type: entityType,
      entity_ids: entityIds
    });
    return data.data;
  }

  /**
   * Rebuild search index
   */
  async rebuildSearchIndex(entityType?: string): Promise<any> {
    const { data } = await api.post(`${this.basePath}/rebuild-index`, {
      entity_type: entityType
    });
    return data.data;
  }

  /**
   * Export search results
   */
  async exportSearchResults(query: SearchQuery, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    const response = await api.post(`${this.basePath}/export`, {
      query,
      format
    }, {
      responseType: 'blob'
    });
    return response.data;
  }
}

export const searchService = new SearchService();