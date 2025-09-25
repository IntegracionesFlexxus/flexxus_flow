/**
 * Advanced Search Service
 * Sprint 17: Advanced Search System
 *
 * Provides full-text search, semantic search, faceted search,
 * and saved search functionality across CRM entities.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import winston from 'winston';
import {
  SearchQuery,
  SearchResult,
  SearchResultItem,
  SearchFilters,
  SearchSort,
  SearchFacets,
  SavedSearch,
  SearchSuggestion,
  SearchAnalytics,
  AdvancedSearchRequest,
  SearchOptions,
  SemanticSearchResult,
  SearchIntent,
  SearchEntityType,
  FacetBucket,
  SearchHighlight
} from '../types/search.types';

@injectable()
export class AdvancedSearchService {
  private readonly DEFAULT_LIMIT = 25;
  private readonly MAX_LIMIT = 100;
  private readonly SEARCH_TIMEOUT = 5000; // 5 seconds

  constructor(
    @inject(TYPES.CrmConnection) private db: Pool,
    @inject(TYPES.Logger) private logger: winston.Logger
  ) {}

  /**
   * Performs an advanced search across CRM entities
   * @param companyId - Company ID
   * @param query - Search query
   * @returns Search results
   */
  async search(
    companyId: number,
    query: SearchQuery
  ): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      const results: SearchResult = {
        accounts: [],
        contacts: [],
        leads: [],
        opportunities: [],
        total_results: 0,
        search_time: 0,
        suggestions: []
      };

      // Normalize search parameters
      const limit = Math.min(query.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT);
      const offset = ((query.page || 1) - 1) * limit;

      // Determine which entities to search
      const entityTypes = query.entity_types || ['accounts', 'contacts'];

      // Execute searches in parallel
      const searchPromises = [];

      if (entityTypes.includes('accounts')) {
        searchPromises.push(
          this.searchAccounts(companyId, query, limit, offset)
            .then(accounts => { results.accounts = accounts; })
            .catch(err => {
              this.logger.error('Error searching accounts', err);
              results.accounts = [];
            })
        );
      }

      if (entityTypes.includes('contacts')) {
        searchPromises.push(
          this.searchContacts(companyId, query, limit, offset)
            .then(contacts => { results.contacts = contacts; })
            .catch(err => {
              this.logger.error('Error searching contacts', err);
              results.contacts = [];
            })
        );
      }

      if (entityTypes.includes('leads')) {
        searchPromises.push(
          this.searchLeads(companyId, query, limit, offset)
            .then(leads => { results.leads = leads; })
            .catch(err => {
              this.logger.error('Error searching leads', err);
              results.leads = [];
            })
        );
      }

      if (entityTypes.includes('opportunities')) {
        searchPromises.push(
          this.searchOpportunities(companyId, query, limit, offset)
            .then(opportunities => { results.opportunities = opportunities; })
            .catch(err => {
              this.logger.error('Error searching opportunities', err);
              results.opportunities = [];
            })
        );
      }

      // Wait for all searches with timeout
      await Promise.race([
        Promise.all(searchPromises),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Search timeout')), this.SEARCH_TIMEOUT)
        )
      ]);

      // Calculate total results
      results.total_results =
        results.accounts.length +
        results.contacts.length +
        (results.leads?.length || 0) +
        (results.opportunities?.length || 0);

      // Generate suggestions if few results
      if (results.total_results < 5 && query.text_query) {
        results.suggestions = await this.generateSearchSuggestions(
          companyId,
          query.text_query
        );
      }

      // Calculate facets if requested
      if (query.text_query) {
        results.facets = await this.calculateFacets(companyId, results);
      }

      results.search_time = Date.now() - startTime;

      // Log search for analytics
      await this.logSearch(companyId, query, results.total_results);

      this.logger.info('Search completed', {
        companyId,
        query: query.text_query,
        totalResults: results.total_results,
        searchTime: results.search_time
      });

      return results;
    } catch (error) {
      this.logger.error('Error performing search', error);
      throw error;
    }
  }

  /**
   * Performs semantic search with AI-enhanced understanding
   * @param companyId - Company ID
   * @param request - Advanced search request
   * @returns Semantic search results
   */
  async semanticSearch(
    companyId: number,
    request: AdvancedSearchRequest
  ): Promise<SemanticSearchResult> {
    const { query, options = {} } = request;

    try {
      // Perform base search
      const baseResults = await this.search(companyId, query);

      // Enhance with semantic understanding
      const semanticResults: SemanticSearchResult = {
        ...baseResults,
        semantic_clusters: [],
        related_queries: [],
        intent: undefined
      };

      // Detect search intent
      if (query.text_query) {
        semanticResults.intent = this.detectSearchIntent(query.text_query);

        // Generate related queries
        semanticResults.related_queries = await this.generateRelatedQueries(
          companyId,
          query.text_query
        );

        // Cluster results by similarity
        if (options.semantic_search) {
          semanticResults.semantic_clusters = this.clusterResults(baseResults);
        }
      }

      return semanticResults;
    } catch (error) {
      this.logger.error('Error performing semantic search', error);
      throw error;
    }
  }

  /**
   * Saves a search for later use
   * @param companyId - Company ID
   * @param userId - User ID
   * @param name - Search name
   * @param query - Search query
   * @returns Saved search
   */
  async saveSearch(
    companyId: number,
    userId: number,
    name: string,
    description: string,
    query: SearchQuery
  ): Promise<SavedSearch> {
    try {
      const result = await this.db.query(
        `INSERT INTO saved_searches
         (company_id, user_id, name, description, query_data, is_shared, notification_enabled)
         VALUES ($1, $2, $3, $4, $5, false, false)
         RETURNING *`,
        [
          companyId,
          userId,
          name,
          description,
          JSON.stringify(query)
        ]
      );

      this.logger.info('Search saved', {
        companyId,
        userId,
        searchId: result.rows[0].id
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error saving search', error);
      throw error;
    }
  }

  /**
   * Gets saved searches for a user
   * @param companyId - Company ID
   * @param userId - User ID
   * @returns List of saved searches
   */
  async getSavedSearches(
    companyId: number,
    userId: number
  ): Promise<SavedSearch[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM saved_searches
         WHERE company_id = $1 AND (user_id = $2 OR is_shared = true)
         ORDER BY created_at DESC`,
        [companyId, userId]
      );

      return result.rows.map(row => ({
        ...row,
        query: JSON.parse(row.query_data)
      }));
    } catch (error) {
      this.logger.error('Error getting saved searches', error);
      throw error;
    }
  }

  /**
   * Gets search suggestions based on query
   * @param companyId - Company ID
   * @param query - Search query
   * @returns Search suggestions
   */
  async getSearchSuggestions(
    companyId: number,
    query: string
  ): Promise<SearchSuggestion[]> {
    try {
      const suggestions: SearchSuggestion[] = [];

      // Get query suggestions from recent searches
      const recentSearches = await this.db.query(
        `SELECT DISTINCT query_text, COUNT(*) as frequency
         FROM search_logs
         WHERE company_id = $1
           AND query_text ILIKE $2
           AND created_at > CURRENT_DATE - INTERVAL '30 days'
         GROUP BY query_text
         ORDER BY frequency DESC
         LIMIT 5`,
        [companyId, `%${query}%`]
      );

      recentSearches.rows.forEach(row => {
        suggestions.push({
          text: row.query_text,
          type: 'query',
          confidence: Math.min(row.frequency / 10, 1),
          metadata: { frequency: row.frequency }
        });
      });

      // Get entity suggestions
      if (query.length >= 3) {
        // Search for matching account names
        const accountSuggestions = await this.db.query(
          `SELECT name, id
           FROM accounts
           WHERE company_id = $1
             AND name ILIKE $2
             AND is_active = true
           LIMIT 3`,
          [companyId, `%${query}%`]
        );

        accountSuggestions.rows.forEach(row => {
          suggestions.push({
            text: row.name,
            type: 'entity',
            confidence: 0.8,
            metadata: { entity_type: 'account', entity_id: row.id }
          });
        });

        // Search for matching contact names
        const contactSuggestions = await this.db.query(
          `SELECT first_name || ' ' || last_name as name, id
           FROM contacts
           WHERE company_id = $1
             AND (first_name ILIKE $2 OR last_name ILIKE $2)
             AND is_active = true
           LIMIT 3`,
          [companyId, `%${query}%`]
        );

        contactSuggestions.rows.forEach(row => {
          suggestions.push({
            text: row.name,
            type: 'entity',
            confidence: 0.8,
            metadata: { entity_type: 'contact', entity_id: row.id }
          });
        });
      }

      // Get filter suggestions
      const commonFilters = [
        { field: 'industry', value: query },
        { field: 'account_tier', value: query },
        { field: 'territory', value: query }
      ];

      for (const filter of commonFilters) {
        if (filter.value.length >= 2) {
          suggestions.push({
            text: `Filter by ${filter.field}: ${filter.value}`,
            type: 'filter',
            confidence: 0.6,
            metadata: { filter_field: filter.field, filter_value: filter.value }
          });
        }
      }

      return suggestions.slice(0, 10); // Return top 10 suggestions
    } catch (error) {
      this.logger.error('Error getting search suggestions', error);
      throw error;
    }
  }

  /**
   * Gets search analytics
   * @param companyId - Company ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Search analytics
   */
  async getSearchAnalytics(
    companyId: number,
    startDate: Date,
    endDate: Date
  ): Promise<SearchAnalytics> {
    try {
      // Get total searches
      const totalSearches = await this.db.query(
        `SELECT COUNT(*) as count
         FROM search_logs
         WHERE company_id = $1
           AND created_at BETWEEN $2 AND $3`,
        [companyId, startDate, endDate]
      );

      // Get popular search terms
      const popularTerms = await this.db.query(
        `SELECT
          query_text as term,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users
         FROM search_logs
         WHERE company_id = $1
           AND created_at BETWEEN $2 AND $3
           AND query_text IS NOT NULL
         GROUP BY query_text
         ORDER BY count DESC
         LIMIT 10`,
        [companyId, startDate, endDate]
      );

      // Get average results and zero result searches
      const searchMetrics = await this.db.query(
        `SELECT
          AVG(result_count) as avg_results,
          COUNT(CASE WHEN result_count = 0 THEN 1 END) as zero_results,
          AVG(search_time) as avg_time
         FROM search_logs
         WHERE company_id = $1
           AND created_at BETWEEN $2 AND $3`,
        [companyId, startDate, endDate]
      );

      // Get top filters used
      const topFilters = await this.db.query(
        `SELECT
          jsonb_object_keys(filters) as filter_name,
          COUNT(*) as usage_count
         FROM search_logs
         WHERE company_id = $1
           AND created_at BETWEEN $2 AND $3
           AND filters IS NOT NULL
         GROUP BY filter_name
         ORDER BY usage_count DESC
         LIMIT 5`,
        [companyId, startDate, endDate]
      );

      const metrics = searchMetrics.rows[0];

      return {
        total_searches: parseInt(totalSearches.rows[0].count) || 0,
        popular_terms: popularTerms.rows.map(row => ({
          term: row.term,
          count: parseInt(row.count),
          trend: 'stable' // Would need historical data for trend
        })),
        average_result_count: parseFloat(metrics.avg_results) || 0,
        zero_result_searches: parseInt(metrics.zero_results) || 0,
        average_search_time: parseFloat(metrics.avg_time) || 0,
        top_filters_used: topFilters.rows.map(row => ({
          filter: row.filter_name,
          usage_count: parseInt(row.usage_count)
        })),
        search_success_rate: this.calculateSuccessRate(
          parseInt(totalSearches.rows[0].count),
          parseInt(metrics.zero_results)
        )
      };
    } catch (error) {
      this.logger.error('Error getting search analytics', error);
      throw error;
    }
  }

  /**
   * Searches accounts
   * @private
   */
  private async searchAccounts(
    companyId: number,
    query: SearchQuery,
    limit: number,
    offset: number
  ): Promise<SearchResultItem[]> {
    let sql = `
      SELECT
        a.id,
        a.name,
        a.industry,
        a.website,
        a.annual_revenue,
        a.health_score,
        a.account_tier,
        ts_rank(a.search_vector, query) as relevance
      FROM accounts a,
        ${query.text_query ?
          `websearch_to_tsquery('spanish', $2) query` :
          `to_tsquery('simple', '') query`
        }
      WHERE a.company_id = $1
        AND a.is_active = true
    `;

    const params: any[] = [companyId];
    let paramCounter = 2;

    if (query.text_query) {
      params.push(query.text_query);
      sql += ` AND a.search_vector @@ query`;
      paramCounter++;
    }

    // Apply filters
    if (query.filters) {
      const filterClauses = this.buildAccountFilterClauses(query.filters, paramCounter);
      if (filterClauses.sql) {
        sql += ` AND ${filterClauses.sql}`;
        params.push(...filterClauses.params);
        paramCounter += filterClauses.params.length;
      }
    }

    // Apply sorting
    if (query.sort) {
      sql += this.buildSortClause('a', query.sort);
    } else if (query.text_query) {
      sql += ' ORDER BY relevance DESC, a.name ASC';
    } else {
      sql += ' ORDER BY a.updated_at DESC';
    }

    sql += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(limit, offset);

    const result = await this.db.query(sql, params);

    return result.rows.map(row => ({
      id: row.id,
      type: 'accounts' as SearchEntityType,
      name: row.name,
      description: `${row.industry || 'N/A'} | ${row.account_tier || 'Standard'} | Health: ${row.health_score || 'N/A'}`,
      relevance_score: row.relevance || 0,
      metadata: {
        industry: row.industry,
        annual_revenue: row.annual_revenue,
        health_score: row.health_score,
        account_tier: row.account_tier
      }
    }));
  }

  /**
   * Searches contacts
   * @private
   */
  private async searchContacts(
    companyId: number,
    query: SearchQuery,
    limit: number,
    offset: number
  ): Promise<SearchResultItem[]> {
    let sql = `
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        c.email,
        c.job_title,
        c.department,
        c.influence_score,
        a.name as account_name,
        ts_rank(c.search_vector, query) as relevance
      FROM contacts c
      LEFT JOIN accounts a ON c.account_id = a.id,
        ${query.text_query ?
          `websearch_to_tsquery('spanish', $2) query` :
          `to_tsquery('simple', '') query`
        }
      WHERE c.company_id = $1
        AND c.is_active = true
    `;

    const params: any[] = [companyId];
    let paramCounter = 2;

    if (query.text_query) {
      params.push(query.text_query);
      sql += ` AND c.search_vector @@ query`;
      paramCounter++;
    }

    // Apply filters
    if (query.filters) {
      const filterClauses = this.buildContactFilterClauses(query.filters, paramCounter);
      if (filterClauses.sql) {
        sql += ` AND ${filterClauses.sql}`;
        params.push(...filterClauses.params);
        paramCounter += filterClauses.params.length;
      }
    }

    // Apply sorting
    if (query.sort) {
      sql += this.buildSortClause('c', query.sort);
    } else if (query.text_query) {
      sql += ' ORDER BY relevance DESC, c.last_name ASC';
    } else {
      sql += ' ORDER BY c.updated_at DESC';
    }

    sql += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(limit, offset);

    const result = await this.db.query(sql, params);

    return result.rows.map(row => ({
      id: row.id,
      type: 'contacts' as SearchEntityType,
      name: `${row.first_name} ${row.last_name}`,
      description: `${row.job_title || 'N/A'} at ${row.account_name || 'N/A'} | ${row.email}`,
      relevance_score: row.relevance || 0,
      metadata: {
        email: row.email,
        job_title: row.job_title,
        department: row.department,
        account_name: row.account_name,
        influence_score: row.influence_score
      }
    }));
  }

  /**
   * Searches leads
   * @private
   */
  private async searchLeads(
    companyId: number,
    query: SearchQuery,
    limit: number,
    offset: number
  ): Promise<SearchResultItem[]> {
    let sql = `
      SELECT
        l.id,
        l.first_name,
        l.last_name,
        l.email,
        l.company as company_name,
        l.job_title,
        l.lead_status,
        l.lead_score
      FROM leads l
      WHERE l.company_id = $1
        AND l.is_active = true
    `;

    const params: any[] = [companyId];
    let paramCounter = 2;

    if (query.text_query) {
      sql += ` AND (
        l.first_name ILIKE $${paramCounter} OR
        l.last_name ILIKE $${paramCounter} OR
        l.email ILIKE $${paramCounter} OR
        l.company ILIKE $${paramCounter}
      )`;
      params.push(`%${query.text_query}%`);
      paramCounter++;
    }

    sql += ' ORDER BY l.created_at DESC';
    sql += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(limit, offset);

    const result = await this.db.query(sql, params);

    return result.rows.map(row => ({
      id: row.id,
      type: 'leads' as SearchEntityType,
      name: `${row.first_name} ${row.last_name}`,
      description: `${row.job_title || 'N/A'} at ${row.company_name || 'N/A'} | Status: ${row.lead_status}`,
      relevance_score: row.lead_score || 0,
      metadata: {
        email: row.email,
        company: row.company_name,
        lead_status: row.lead_status,
        lead_score: row.lead_score
      }
    }));
  }

  /**
   * Searches opportunities
   * @private
   */
  private async searchOpportunities(
    companyId: number,
    query: SearchQuery,
    limit: number,
    offset: number
  ): Promise<SearchResultItem[]> {
    let sql = `
      SELECT
        o.id,
        o.name,
        o.stage,
        o.value,
        o.probability,
        o.close_date,
        a.name as account_name
      FROM opportunities o
      LEFT JOIN accounts a ON o.account_id = a.id
      WHERE o.company_id = $1
        AND o.is_active = true
    `;

    const params: any[] = [companyId];
    let paramCounter = 2;

    if (query.text_query) {
      sql += ` AND (
        o.name ILIKE $${paramCounter} OR
        o.description ILIKE $${paramCounter}
      )`;
      params.push(`%${query.text_query}%`);
      paramCounter++;
    }

    sql += ' ORDER BY o.value DESC';
    sql += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(limit, offset);

    const result = await this.db.query(sql, params);

    return result.rows.map(row => ({
      id: row.id,
      type: 'opportunities' as SearchEntityType,
      name: row.name,
      description: `${row.account_name || 'N/A'} | Stage: ${row.stage} | Value: $${row.value}`,
      relevance_score: row.probability || 0,
      metadata: {
        stage: row.stage,
        value: row.value,
        probability: row.probability,
        close_date: row.close_date,
        account_name: row.account_name
      }
    }));
  }

  /**
   * Builds filter clauses for accounts
   * @private
   */
  private buildAccountFilterClauses(
    filters: SearchFilters,
    startParam: number
  ): { sql: string; params: any[] } {
    const clauses: string[] = [];
    const params: any[] = [];
    let paramCounter = startParam;

    if (filters.account_tier && filters.account_tier.length > 0) {
      clauses.push(`a.account_tier = ANY($${paramCounter})`);
      params.push(filters.account_tier);
      paramCounter++;
    }

    if (filters.industry && filters.industry.length > 0) {
      clauses.push(`a.industry = ANY($${paramCounter})`);
      params.push(filters.industry);
      paramCounter++;
    }

    if (filters.territory) {
      clauses.push(`a.territory_id = $${paramCounter}`);
      params.push(filters.territory);
      paramCounter++;
    }

    if (filters.health_score) {
      clauses.push(`a.health_score BETWEEN $${paramCounter} AND $${paramCounter + 1}`);
      params.push(filters.health_score.min, filters.health_score.max);
      paramCounter += 2;
    }

    if (filters.revenue) {
      clauses.push(`a.annual_revenue BETWEEN $${paramCounter} AND $${paramCounter + 1}`);
      params.push(filters.revenue.min, filters.revenue.max);
      paramCounter += 2;
    }

    if (filters.created_date) {
      clauses.push(`a.created_at BETWEEN $${paramCounter} AND $${paramCounter + 1}`);
      params.push(filters.created_date.from, filters.created_date.to);
      paramCounter += 2;
    }

    return {
      sql: clauses.join(' AND '),
      params
    };
  }

  /**
   * Builds filter clauses for contacts
   * @private
   */
  private buildContactFilterClauses(
    filters: SearchFilters,
    startParam: number
  ): { sql: string; params: any[] } {
    const clauses: string[] = [];
    const params: any[] = [];
    let paramCounter = startParam;

    if (filters.job_title) {
      clauses.push(`c.job_title ILIKE $${paramCounter}`);
      params.push(`%${filters.job_title}%`);
      paramCounter++;
    }

    if (filters.department) {
      clauses.push(`c.department = $${paramCounter}`);
      params.push(filters.department);
      paramCounter++;
    }

    if (filters.seniority) {
      clauses.push(`c.seniority_level = $${paramCounter}`);
      params.push(filters.seniority);
      paramCounter++;
    }

    if (filters.influence_score) {
      clauses.push(`c.influence_score BETWEEN $${paramCounter} AND $${paramCounter + 1}`);
      params.push(filters.influence_score.min, filters.influence_score.max);
      paramCounter += 2;
    }

    return {
      sql: clauses.join(' AND '),
      params
    };
  }

  /**
   * Builds sort clause
   * @private
   */
  private buildSortClause(tableAlias: string, sort: SearchSort): string {
    const validFields = [
      'name', 'created_at', 'updated_at', 'health_score',
      'annual_revenue', 'influence_score'
    ];

    if (!validFields.includes(sort.field)) {
      return ` ORDER BY ${tableAlias}.updated_at DESC`;
    }

    return ` ORDER BY ${tableAlias}.${sort.field} ${sort.direction.toUpperCase()}`;
  }

  /**
   * Generates search suggestions
   * @private
   */
  private async generateSearchSuggestions(
    companyId: number,
    query: string
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Fuzzy match suggestions
    const fuzzyResults = await this.db.query(
      `SELECT DISTINCT name
       FROM (
         SELECT name FROM accounts WHERE company_id = $1
         UNION
         SELECT first_name || ' ' || last_name as name FROM contacts WHERE company_id = $1
       ) entities
       WHERE similarity(name, $2) > 0.3
       ORDER BY similarity(name, $2) DESC
       LIMIT 5`,
      [companyId, query]
    );

    fuzzyResults.rows.forEach(row => {
      suggestions.push(row.name);
    });

    // Common search corrections
    const corrections = this.getCommonCorrections(query);
    suggestions.push(...corrections);

    return [...new Set(suggestions)].slice(0, 5);
  }

  /**
   * Calculates search facets
   * @private
   */
  private async calculateFacets(
    companyId: number,
    results: SearchResult
  ): Promise<SearchFacets> {
    const facets: SearchFacets = {
      entity_types: [],
      industries: [],
      territories: [],
      account_tiers: [],
      health_grades: []
    };

    // Entity type facets
    if (results.accounts.length > 0) {
      facets.entity_types.push({
        key: 'accounts',
        label: 'Accounts',
        count: results.accounts.length
      });
    }

    if (results.contacts.length > 0) {
      facets.entity_types.push({
        key: 'contacts',
        label: 'Contacts',
        count: results.contacts.length
      });
    }

    // Get additional facets from database
    if (results.accounts.length > 0) {
      const accountIds = results.accounts.map(a => a.id);

      // Industry facets
      const industries = await this.db.query(
        `SELECT industry, COUNT(*) as count
         FROM accounts
         WHERE id = ANY($1) AND industry IS NOT NULL
         GROUP BY industry
         ORDER BY count DESC
         LIMIT 5`,
        [accountIds]
      );

      facets.industries = industries.rows.map(row => ({
        key: row.industry,
        label: row.industry,
        count: parseInt(row.count)
      }));

      // Account tier facets
      const tiers = await this.db.query(
        `SELECT account_tier, COUNT(*) as count
         FROM accounts
         WHERE id = ANY($1) AND account_tier IS NOT NULL
         GROUP BY account_tier
         ORDER BY count DESC`,
        [accountIds]
      );

      facets.account_tiers = tiers.rows.map(row => ({
        key: row.account_tier,
        label: row.account_tier,
        count: parseInt(row.count)
      }));
    }

    return facets;
  }

  /**
   * Detects search intent
   * @private
   */
  private detectSearchIntent(query: string): SearchIntent {
    const lowerQuery = query.toLowerCase();

    // Navigation intent (looking for specific entity)
    if (lowerQuery.includes('@') || lowerQuery.match(/^[a-z]+ [a-z]+$/)) {
      return {
        type: 'navigation',
        confidence: 0.8,
        detected_entities: []
      };
    }

    // Transaction intent (action-oriented)
    const actionKeywords = ['find', 'search', 'show', 'get', 'list'];
    if (actionKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return {
        type: 'transaction',
        confidence: 0.7,
        detected_entities: []
      };
    }

    // Information intent (general search)
    return {
      type: 'information',
      confidence: 0.6,
      detected_entities: []
    };
  }

  /**
   * Generates related queries
   * @private
   */
  private async generateRelatedQueries(
    companyId: number,
    query: string
  ): Promise<string[]> {
    const related: string[] = [];

    // Get similar historical queries
    const similarQueries = await this.db.query(
      `SELECT DISTINCT query_text
       FROM search_logs
       WHERE company_id = $1
         AND query_text != $2
         AND similarity(query_text, $2) > 0.5
       ORDER BY similarity(query_text, $2) DESC
       LIMIT 3`,
      [companyId, query]
    );

    similarQueries.rows.forEach(row => {
      related.push(row.query_text);
    });

    // Add variations
    const words = query.split(' ');
    if (words.length > 1) {
      related.push(words.reverse().join(' '));
    }

    return related.slice(0, 5);
  }

  /**
   * Clusters search results
   * @private
   */
  private clusterResults(results: SearchResult): any[] {
    // Simple clustering by entity type and metadata
    const clusters: Map<string, any> = new Map();

    // Cluster accounts by industry
    results.accounts.forEach(account => {
      const industry = account.metadata?.industry || 'Other';
      if (!clusters.has(industry)) {
        clusters.set(industry, {
          cluster_id: `industry_${industry}`,
          cluster_label: `Industry: ${industry}`,
          items: [],
          common_themes: [industry]
        });
      }
      clusters.get(industry).items.push(account);
    });

    // Cluster contacts by department
    results.contacts.forEach(contact => {
      const department = contact.metadata?.department || 'Other';
      const clusterKey = `dept_${department}`;
      if (!clusters.has(clusterKey)) {
        clusters.set(clusterKey, {
          cluster_id: clusterKey,
          cluster_label: `Department: ${department}`,
          items: [],
          common_themes: [department]
        });
      }
      clusters.get(clusterKey).items.push(contact);
    });

    return Array.from(clusters.values())
      .filter(cluster => cluster.items.length > 1)
      .sort((a, b) => b.items.length - a.items.length);
  }

  /**
   * Gets common corrections for misspellings
   * @private
   */
  private getCommonCorrections(query: string): string[] {
    const corrections: Record<string, string[]> = {
      'acount': ['account'],
      'contac': ['contact'],
      'oportunity': ['opportunity'],
      'led': ['lead'],
      'helth': ['health']
    };

    const lowerQuery = query.toLowerCase();

    for (const [misspelling, correctSpellings] of Object.entries(corrections)) {
      if (lowerQuery.includes(misspelling)) {
        return correctSpellings.map(correct =>
          query.toLowerCase().replace(misspelling, correct)
        );
      }
    }

    return [];
  }

  /**
   * Logs search for analytics
   * @private
   */
  private async logSearch(
    companyId: number,
    query: SearchQuery,
    resultCount: number
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO search_logs
         (company_id, user_id, query_text, filters, result_count, search_time)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          companyId,
          null, // Would need user context
          query.text_query || null,
          query.filters ? JSON.stringify(query.filters) : null,
          resultCount,
          new Date()
        ]
      );
    } catch (error) {
      // Don't fail search if logging fails
      this.logger.error('Error logging search', error);
    }
  }

  /**
   * Calculates search success rate
   * @private
   */
  private calculateSuccessRate(total: number, zeroResults: number): number {
    if (total === 0) return 0;
    return Math.round(((total - zeroResults) / total) * 100);
  }
}