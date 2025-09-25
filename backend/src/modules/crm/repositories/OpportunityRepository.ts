/**
 * Opportunity Repository
 * Manages opportunity data operations with CRM database
 */

import { injectable, inject } from 'inversify';
import { CRMBaseRepository } from './CRMBaseRepository';
import {
  Opportunity,
  OpportunityCreateDTO,
  OpportunityUpdateDTO,
  OpportunityFilter,
  OpportunityWithDetails,
  OpportunityStageUpdateDTO,
  PipelineMetrics,
  PipelineStage,
  PipelineData,
  ForecastData,
  WinLossAnalysis
} from '../types/opportunity.types';
import { TYPES } from '@/container/types';

@injectable()
export class OpportunityRepository extends CRMBaseRepository<Opportunity> {
  constructor(
    @inject(TYPES.CRMDatabaseConnection) db: any,
    @inject(TYPES.Logger) logger?: any
  ) {
    super('opportunities', db, logger);

    // Define allowed fields for this entity
    this.allowedFields = new Set([
      'id', 'company_id', 'name', 'opportunity_number', 'type', 'account_id',
      'primary_contact_id', 'stage_id', 'amount', 'probability', 'close_date',
      'lead_source_id', 'campaign_id', 'competitors', 'owner_id', 'status',
      'lost_reason', 'forecast_category', 'description', 'next_step', 'tags',
      'custom_fields', 'created_at', 'updated_at', 'created_by', 'updated_by'
    ]);
  }

  /**
   * Get opportunity with all details
   */
  async getOpportunityWithDetails(id: number, companyId: number): Promise<OpportunityWithDetails | null> {
    const query = `
      SELECT
        o.*,
        a.name as account_name,
        c.first_name || ' ' || c.last_name as contact_name,
        u.name as owner_name,
        s.name as stage_name,
        s.probability as stage_probability,
        ls.name as lead_source_name
      FROM ${this.getFullTableName()} o
      LEFT JOIN public.accounts a ON o.account_id = a.id
      LEFT JOIN public.contacts c ON o.primary_contact_id = c.id
      LEFT JOIN public.users u ON o.owner_id = u.id
      LEFT JOIN public.sales_stages s ON o.stage_id = s.id
      LEFT JOIN public.lead_sources ls ON o.lead_source_id = ls.id
      WHERE o.id = $1 AND o.company_id = $2
    `;

    try {
      const result = await this.db.query(query, [id, companyId]);
      if (!result.rows[0]) return null;

      const opportunity = result.rows[0];

      // Get opportunity products
      const productsQuery = `
        SELECT
          op.*,
          p.name as product_name
        FROM public.opportunity_products op
        LEFT JOIN public.products p ON op.product_id = p.id
        WHERE op.opportunity_id = $1
        ORDER BY op.id
      `;
      const productsResult = await this.db.query(productsQuery, [id]);
      opportunity.products = productsResult.rows;

      return opportunity;
    } catch (error) {
      this.logger?.error('Error getting opportunity details', { error, id, companyId });
      throw error;
    }
  }

  /**
   * Find opportunities with filters
   */
  async findWithFilters(companyId: number, filters: OpportunityFilter): Promise<Opportunity[]> {
    let query = `
      SELECT o.* FROM ${this.getFullTableName()} o
      WHERE o.company_id = $1
    `;

    const params: any[] = [companyId];
    let paramIndex = 2;

    // Apply filters
    if (filters.status) {
      query += ` AND o.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.stage_id) {
      query += ` AND o.stage_id = $${paramIndex}`;
      params.push(filters.stage_id);
      paramIndex++;
    }

    if (filters.owner_id) {
      query += ` AND o.owner_id = $${paramIndex}`;
      params.push(filters.owner_id);
      paramIndex++;
    }

    if (filters.account_id) {
      query += ` AND o.account_id = $${paramIndex}`;
      params.push(filters.account_id);
      paramIndex++;
    }

    if (filters.type) {
      query += ` AND o.type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    if (filters.forecast_category) {
      query += ` AND o.forecast_category = $${paramIndex}`;
      params.push(filters.forecast_category);
      paramIndex++;
    }

    if (filters.minAmount !== undefined) {
      query += ` AND o.amount >= $${paramIndex}`;
      params.push(filters.minAmount);
      paramIndex++;
    }

    if (filters.maxAmount !== undefined) {
      query += ` AND o.amount <= $${paramIndex}`;
      params.push(filters.maxAmount);
      paramIndex++;
    }

    // Close date range filter
    if (filters.closeDateRange) {
      if (filters.closeDateRange.start) {
        query += ` AND o.close_date >= $${paramIndex}`;
        params.push(filters.closeDateRange.start);
        paramIndex++;
      }
      if (filters.closeDateRange.end) {
        query += ` AND o.close_date <= $${paramIndex}`;
        params.push(filters.closeDateRange.end);
        paramIndex++;
      }
    }

    if (filters.lead_source_id) {
      query += ` AND o.lead_source_id = $${paramIndex}`;
      params.push(filters.lead_source_id);
      paramIndex++;
    }

    // Search
    if (filters.search) {
      query += ` AND (
        o.name ILIKE $${paramIndex} OR
        o.opportunity_number ILIKE $${paramIndex} OR
        o.description ILIKE $${paramIndex}
      )`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      query += ` AND o.tags && $${paramIndex}::text[]`;
      params.push(filters.tags);
      paramIndex++;
    }

    // Ordering
    const orderBy = filters.orderBy || 'created_at';
    const orderDirection = filters.orderDirection || 'DESC';
    query += ` ORDER BY o.${orderBy} ${orderDirection}`;

    // Pagination
    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;

      if (filters.page && filters.page > 1) {
        const offset = (filters.page - 1) * filters.limit;
        query += ` OFFSET $${paramIndex}`;
        params.push(offset);
      }
    }

    try {
      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger?.error('Error finding opportunities with filters', { error, companyId, filters });
      throw error;
    }
  }

  /**
   * Update opportunity stage
   */
  async updateStage(
    opportunityId: number,
    companyId: number,
    stageUpdate: OpportunityStageUpdateDTO,
    userId?: number
  ): Promise<boolean> {
    const client = await this.db.getClient();

    try {
      await client.query('BEGIN');

      // Update opportunity stage and related fields
      const updateQuery = `
        UPDATE ${this.getFullTableName()}
        SET stage_id = $3,
            probability = COALESCE($4, (SELECT probability FROM public.sales_stages WHERE id = $3)),
            next_step = COALESCE($5, next_step),
            updated_at = NOW(),
            updated_by = $6
        WHERE id = $1 AND company_id = $2
      `;

      await client.query(updateQuery, [
        opportunityId,
        companyId,
        stageUpdate.stage_id,
        stageUpdate.probability,
        stageUpdate.next_step,
        userId
      ]);

      // Log stage history
      if (stageUpdate.notes) {
        const historyQuery = `
          INSERT INTO public.opportunity_stage_history
          (opportunity_id, stage_id, probability, notes, created_by, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
        `;
        await client.query(historyQuery, [
          opportunityId,
          stageUpdate.stage_id,
          stageUpdate.probability,
          stageUpdate.notes,
          userId
        ]);
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger?.error('Error updating opportunity stage', { error, opportunityId, stageUpdate });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get pipeline metrics
   */
  async getPipelineMetrics(companyId: number, ownerId?: number): Promise<PipelineMetrics> {
    let baseCondition = `o.company_id = $1 AND o.status = 'open'`;
    const params: any[] = [companyId];

    if (ownerId) {
      baseCondition += ` AND o.owner_id = $2`;
      params.push(ownerId);
    }

    const pipelineQuery = `
      SELECT
        s.id as stage_id,
        s.name as stage_name,
        s.order_position,
        s.probability,
        COUNT(o.id) as opportunity_count,
        COALESCE(SUM(o.amount), 0) as total_amount,
        COALESCE(SUM(o.amount * s.probability / 100), 0) as weighted_amount
      FROM public.sales_stages s
      LEFT JOIN public.opportunities o ON s.id = o.stage_id AND ${baseCondition}
      WHERE s.company_id = $1
      GROUP BY s.id, s.name, s.order_position, s.probability
      ORDER BY s.order_position
    `;

    const metricsQuery = `
      SELECT
        COUNT(*) as total_opportunities,
        COALESCE(SUM(amount), 0) as total_value,
        COALESCE(SUM(amount * probability / 100), 0) as weighted_value,
        COALESCE(AVG(amount), 0) as average_deal_size,
        COUNT(CASE WHEN status = 'won' THEN 1 END) * 100.0 /
          NULLIF(COUNT(CASE WHEN status IN ('won', 'lost') THEN 1 END), 0) as conversion_rate,
        COALESCE(AVG(
          CASE WHEN status = 'won' THEN
            EXTRACT(DAY FROM updated_at - created_at)
          END
        ), 0) as average_sales_cycle
      FROM public.opportunities
      WHERE company_id = $1 ${ownerId ? 'AND owner_id = $2' : ''}
    `;

    try {
      const [pipelineResult, metricsResult] = await Promise.all([
        this.db.query(pipelineQuery, params),
        this.db.query(metricsQuery, params)
      ]);

      const metrics = metricsResult.rows[0];

      return {
        stages: pipelineResult.rows.map(stage => ({
          ...stage,
          total_amount: parseFloat(stage.total_amount),
          weighted_amount: parseFloat(stage.weighted_amount)
        })),
        total_opportunities: parseInt(metrics.total_opportunities) || 0,
        total_value: parseFloat(metrics.total_value) || 0,
        weighted_value: parseFloat(metrics.weighted_value) || 0,
        average_deal_size: parseFloat(metrics.average_deal_size) || 0,
        conversion_rate: parseFloat(metrics.conversion_rate) || 0,
        average_sales_cycle: parseFloat(metrics.average_sales_cycle) || 0
      };
    } catch (error) {
      this.logger?.error('Error getting pipeline metrics', { error, companyId, ownerId });
      throw error;
    }
  }

  /**
   * Get forecast data
   */
  async getForecastData(companyId: number, period: string): Promise<ForecastData[]> {
    const periodCondition = this.getPeriodCondition(period);

    const query = `
      SELECT
        forecast_category,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total,
        COALESCE(SUM(amount * probability / 100), 0) as weighted_total,
        COALESCE(AVG(probability), 0) as avg_probability
      FROM ${this.getFullTableName()}
      WHERE company_id = $1
        AND status = 'open'
        ${periodCondition}
      GROUP BY forecast_category
      ORDER BY
        CASE forecast_category
          WHEN 'closed' THEN 1
          WHEN 'commit' THEN 2
          WHEN 'best_case' THEN 3
          WHEN 'pipeline' THEN 4
          ELSE 5
        END
    `;

    try {
      const result = await this.db.query(query, [companyId]);
      return result.rows.map(row => ({
        period,
        forecast_category: row.forecast_category,
        count: parseInt(row.count),
        total: parseFloat(row.total),
        weighted_total: parseFloat(row.weighted_total),
        avg_probability: parseFloat(row.avg_probability)
      }));
    } catch (error) {
      this.logger?.error('Error getting forecast data', { error, companyId, period });
      throw error;
    }
  }

  /**
   * Get win/loss analysis
   */
  async getWinLossAnalysis(companyId: number, period: string): Promise<WinLossAnalysis> {
    const periodCondition = this.getPeriodCondition(period, 'updated_at');

    const analysisQuery = `
      SELECT
        COUNT(CASE WHEN status = 'won' THEN 1 END) as won_count,
        COALESCE(SUM(CASE WHEN status = 'won' THEN amount END), 0) as won_value,
        COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_count,
        COALESCE(SUM(CASE WHEN status = 'lost' THEN amount END), 0) as lost_value
      FROM ${this.getFullTableName()}
      WHERE company_id = $1
        AND status IN ('won', 'lost')
        ${periodCondition}
    `;

    const lostReasonsQuery = `
      SELECT
        lost_reason as reason,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as value
      FROM ${this.getFullTableName()}
      WHERE company_id = $1
        AND status = 'lost'
        AND lost_reason IS NOT NULL
        ${periodCondition}
      GROUP BY lost_reason
      ORDER BY COUNT(*) DESC
      LIMIT 5
    `;

    try {
      const [analysisResult, lostReasonsResult] = await Promise.all([
        this.db.query(analysisQuery, [companyId]),
        this.db.query(lostReasonsQuery, [companyId])
      ]);

      const analysis = analysisResult.rows[0];
      const totalClosed = analysis.won_count + analysis.lost_count;
      const winRate = totalClosed > 0 ? (analysis.won_count / totalClosed) * 100 : 0;

      return {
        period,
        won_count: parseInt(analysis.won_count) || 0,
        won_value: parseFloat(analysis.won_value) || 0,
        lost_count: parseInt(analysis.lost_count) || 0,
        lost_value: parseFloat(analysis.lost_value) || 0,
        win_rate: winRate,
        top_lost_reasons: lostReasonsResult.rows.map(r => ({
          reason: r.reason,
          count: parseInt(r.count),
          value: parseFloat(r.value)
        }))
      };
    } catch (error) {
      this.logger?.error('Error getting win/loss analysis', { error, companyId, period });
      throw error;
    }
  }

  /**
   * Mark opportunity as won
   */
  async markAsWon(opportunityId: number, companyId: number, userId?: number): Promise<boolean> {
    const query = `
      UPDATE ${this.getFullTableName()}
      SET status = 'won',
          probability = 100,
          updated_at = NOW(),
          updated_by = $3
      WHERE id = $1 AND company_id = $2
    `;

    try {
      const result = await this.db.query(query, [opportunityId, companyId, userId]);
      return result.rowCount > 0;
    } catch (error) {
      this.logger?.error('Error marking opportunity as won', { error, opportunityId, companyId });
      throw error;
    }
  }

  /**
   * Mark opportunity as lost
   */
  async markAsLost(
    opportunityId: number,
    companyId: number,
    lostReason: string,
    userId?: number
  ): Promise<boolean> {
    const query = `
      UPDATE ${this.getFullTableName()}
      SET status = 'lost',
          lost_reason = $3,
          probability = 0,
          updated_at = NOW(),
          updated_by = $4
      WHERE id = $1 AND company_id = $2
    `;

    try {
      const result = await this.db.query(query, [opportunityId, companyId, lostReason, userId]);
      return result.rowCount > 0;
    } catch (error) {
      this.logger?.error('Error marking opportunity as lost', { error, opportunityId, companyId });
      throw error;
    }
  }

  /**
   * Get pipeline stages with opportunities
   */
  async getPipelineStages(companyId: number, filters?: OpportunityFilter): Promise<PipelineStage[]> {
    // Query para obtener todas las etapas
    const stagesQuery = `
      SELECT
        s.id as stage_id,
        s.name as stage_name,
        s.order_position,
        s.probability,
        s.code,
        s.description,
        s.is_won,
        s.is_lost
      FROM public.sales_stages s
      WHERE s.company_id = $1 AND s.is_active = true
      ORDER BY s.order_position
    `;

    try {
      const stagesResult = await this.db.query(stagesQuery, [companyId]);
      const stages: PipelineStage[] = [];

      // Para cada stage, obtener sus oportunidades
      for (const stage of stagesResult.rows) {
        // Construir filtros incluyendo stage_id
        const stageFilters: OpportunityFilter = {
          ...filters,
          stage_id: stage.stage_id,
          status: 'open' as any // Solo oportunidades abiertas
        };

        // Obtener oportunidades de este stage
        const opportunities = await this.findWithFilters(companyId, stageFilters);

        // Obtener detalles completos de cada oportunidad
        const detailedOpportunities: (OpportunityWithDetails | null)[] = await Promise.all(
          opportunities.map(opp => this.getOpportunityWithDetails(opp.id!, companyId))
        );

        // Calcular totales para el stage
        const total_amount = opportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0);
        const weighted_amount = opportunities.reduce(
          (sum, opp) => sum + ((opp.amount || 0) * (opp.probability || 0) / 100),
          0
        );

        stages.push({
          stage_id: stage.stage_id,
          stage_name: stage.stage_name,
          order_position: stage.order_position,
          probability: stage.probability,
          opportunity_count: opportunities.length,
          total_amount,
          weighted_amount,
          opportunities: detailedOpportunities.filter(o => o !== null) as OpportunityWithDetails[]
        });
      }

      return stages;
    } catch (error) {
      this.logger?.error('Error getting pipeline stages', { error, companyId, filters });
      throw error;
    }
  }

  /**
   * Get complete pipeline data
   */
  async getPipelineData(companyId: number, filters?: OpportunityFilter): Promise<PipelineData> {
    try {
      // Obtener stages con oportunidades
      const stages = await this.getPipelineStages(companyId, filters);

      // Obtener todas las oportunidades (flat list)
      const allOpportunities = stages.reduce((acc, stage) => {
        return [...acc, ...(stage.opportunities || [])];
      }, [] as OpportunityWithDetails[]);

      // Obtener métricas
      const metrics = await this.getPipelineMetrics(
        companyId,
        filters?.owner_id
      );

      return {
        stages,
        opportunities: allOpportunities,
        metrics,
        filters,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger?.error('Error getting pipeline data', { error, companyId, filters });
      throw error;
    }
  }

  /**
   * Helper method to get period condition
   */
  private getPeriodCondition(period: string, dateField: string = 'close_date'): string {
    switch (period) {
      case 'current_month':
        return `AND DATE_TRUNC('month', ${dateField}) = DATE_TRUNC('month', CURRENT_DATE)`;
      case 'current_quarter':
        return `AND DATE_TRUNC('quarter', ${dateField}) = DATE_TRUNC('quarter', CURRENT_DATE)`;
      case 'current_year':
        return `AND DATE_TRUNC('year', ${dateField}) = DATE_TRUNC('year', CURRENT_DATE)`;
      case 'next_month':
        return `AND DATE_TRUNC('month', ${dateField}) = DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month')`;
      case 'next_quarter':
        return `AND DATE_TRUNC('quarter', ${dateField}) = DATE_TRUNC('quarter', CURRENT_DATE + INTERVAL '3 months')`;
      default:
        return '';
    }
  }
}