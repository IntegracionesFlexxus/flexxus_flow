/**
 * Search Controller
 * HTTP endpoints for advanced search functionality
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { AdvancedSearchService } from '../services/AdvancedSearchService';
import { TYPES } from '@/container/types';
import { AppError } from '@/shared/errors/AppError';
import { SearchQuery } from '../types/search.types';

@injectable()
export class SearchController {
  constructor(
    @inject(TYPES.AdvancedSearchService) private searchService: AdvancedSearchService,
    @inject(TYPES.Logger) private logger?: any
  ) {}

  /**
   * Perform advanced search
   * POST /api/crm/search
   */
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;

      const query: SearchQuery = {
        ...req.body,
        user_id: userId
      };

      const results = await this.searchService.search(companyId, query);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Perform quick search
   * GET /api/crm/search/quick
   */
  async quickSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const { q, limit } = req.query;

      if (!q) {
        throw new AppError('Search query is required', 400);
      }

      const results = await this.searchService.quickSearch(
        companyId,
        q as string,
        parseInt(limit as string) || 10
      );

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get search suggestions
   * GET /api/crm/search/suggestions
   */
  async getSearchSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const { q, entity_type } = req.query;

      if (!q) {
        throw new AppError('Query is required', 400);
      }

      const suggestions = await this.searchService.getSearchSuggestions(
        companyId,
        q as string,
        entity_type as string
      );

      res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Save search
   * POST /api/crm/search/saved
   */
  async saveSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;

      const savedSearch = await this.searchService.saveSearch(
        companyId,
        userId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: savedSearch,
        message: 'Search saved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get saved searches
   * GET /api/crm/search/saved
   */
  async getSavedSearches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;
      const { shared } = req.query;

      const searches = await this.searchService.getSavedSearches(
        companyId,
        userId,
        shared === 'true'
      );

      res.json({
        success: true,
        data: searches
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get saved search by ID
   * GET /api/crm/search/saved/:id
   */
  async getSavedSearchById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const searchId = parseInt(req.params.id);

      const search = await this.searchService.getSavedSearchById(
        companyId,
        searchId
      );

      if (!search) {
        throw new AppError('Saved search not found', 404);
      }

      res.json({
        success: true,
        data: search
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update saved search
   * PUT /api/crm/search/saved/:id
   */
  async updateSavedSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;
      const searchId = parseInt(req.params.id);

      const search = await this.searchService.updateSavedSearch(
        companyId,
        searchId,
        userId,
        req.body
      );

      res.json({
        success: true,
        data: search,
        message: 'Saved search updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete saved search
   * DELETE /api/crm/search/saved/:id
   */
  async deleteSavedSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;
      const searchId = parseInt(req.params.id);

      await this.searchService.deleteSavedSearch(
        companyId,
        searchId,
        userId
      );

      res.json({
        success: true,
        message: 'Saved search deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Execute saved search
   * GET /api/crm/search/saved/:id/execute
   */
  async executeSavedSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;
      const searchId = parseInt(req.params.id);

      const results = await this.searchService.executeSavedSearch(
        companyId,
        searchId,
        userId
      );

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get search history
   * GET /api/crm/search/history
   */
  async getSearchHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;
      const limit = parseInt(req.query.limit as string) || 20;

      const history = await this.searchService.getSearchHistory(
        companyId,
        userId,
        limit
      );

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clear search history
   * DELETE /api/crm/search/history
   */
  async clearSearchHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;

      await this.searchService.clearSearchHistory(companyId, userId);

      res.json({
        success: true,
        message: 'Search history cleared successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get search analytics
   * GET /api/crm/search/analytics
   */
  async getSearchAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
      const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;

      const analytics = await this.searchService.getSearchAnalytics(
        companyId,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get popular search terms
   * GET /api/crm/search/popular
   */
  async getPopularSearchTerms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const limit = parseInt(req.query.limit as string) || 10;
      const period = req.query.period as string || '30d';

      const terms = await this.searchService.getPopularSearchTerms(
        companyId,
        limit,
        period
      );

      res.json({
        success: true,
        data: terms
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Index entities for search
   * POST /api/crm/search/index
   */
  async indexEntities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const { entity_type, entity_ids } = req.body;

      if (!entity_type) {
        throw new AppError('Entity type is required', 400);
      }

      const result = await this.searchService.indexEntities(
        companyId,
        entity_type,
        entity_ids
      );

      res.json({
        success: true,
        data: result,
        message: 'Entities indexed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Rebuild search index
   * POST /api/crm/search/rebuild-index
   */
  async rebuildSearchIndex(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const { entity_type } = req.body;

      const result = await this.searchService.rebuildSearchIndex(
        companyId,
        entity_type
      );

      res.json({
        success: true,
        data: result,
        message: 'Search index rebuilt successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get search facets
   * GET /api/crm/search/facets
   */
  async getSearchFacets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const { entity_type } = req.query;

      const facets = await this.searchService.getAvailableFacets(
        companyId,
        entity_type as string
      );

      res.json({
        success: true,
        data: facets
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export search results
   * POST /api/crm/search/export
   */
  async exportSearchResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;
      const { query, format } = req.body;

      if (!query) {
        throw new AppError('Search query is required', 400);
      }

      const exportData = await this.searchService.exportSearchResults(
        companyId,
        { ...query, user_id: userId },
        format || 'csv'
      );

      const contentType = format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="search_results.${format || 'csv'}"`);
      res.send(exportData);
    } catch (error) {
      next(error);
    }
  }
}