/**
 * Opportunity Service Interface
 */

import {
  Opportunity,
  OpportunityCreateDTO,
  OpportunityUpdateDTO,
  OpportunityFilter,
  OpportunityWithDetails,
  OpportunityStageUpdateDTO,
  PipelineMetrics,
  PipelineData,
  ForecastData,
  WinLossAnalysis
} from '../types/opportunity.types';
import { PaginatedResponse } from '../types/crm.types';

export interface IOpportunityService {
  /**
   * Create a new opportunity
   */
  createOpportunity(data: OpportunityCreateDTO, userId: number): Promise<Opportunity>;

  /**
   * Update an existing opportunity
   */
  updateOpportunity(
    id: number,
    companyId: number,
    data: OpportunityUpdateDTO,
    userId: number
  ): Promise<Opportunity | null>;

  /**
   * Get opportunity by ID
   */
  getOpportunityById(id: number, companyId: number): Promise<OpportunityWithDetails | null>;

  /**
   * List opportunities with filters
   */
  listOpportunities(
    companyId: number,
    filters?: OpportunityFilter
  ): Promise<PaginatedResponse<OpportunityWithDetails>>;

  /**
   * Update opportunity stage
   */
  updateStage(
    opportunityId: number,
    companyId: number,
    stageUpdate: OpportunityStageUpdateDTO,
    userId: number
  ): Promise<boolean>;

  /**
   * Mark opportunity as won
   */
  markAsWon(opportunityId: number, companyId: number, userId: number): Promise<Opportunity>;

  /**
   * Mark opportunity as lost
   */
  markAsLost(
    opportunityId: number,
    companyId: number,
    lostReason: string,
    userId: number
  ): Promise<Opportunity>;

  /**
   * Get pipeline metrics
   */
  getPipelineMetrics(companyId: number, ownerId?: number): Promise<PipelineMetrics>;

  /**
   * Get complete pipeline data
   */
  getPipeline(companyId: number, filters?: OpportunityFilter): Promise<PipelineData>;

  /**
   * Get forecast data
   */
  getForecastData(companyId: number, period: string): Promise<ForecastData[]>;

  /**
   * Get win/loss analysis
   */
  getWinLossAnalysis(companyId: number, period: string): Promise<WinLossAnalysis>;

  /**
   * Delete opportunity
   */
  deleteOpportunity(opportunityId: number, companyId: number, userId: number): Promise<boolean>;

  /**
   * Clone opportunity
   */
  cloneOpportunity(opportunityId: number, companyId: number, userId: number): Promise<Opportunity>;

  /**
   * Calculate opportunity value
   */
  calculateWeightedValue(opportunityId: number, companyId: number): Promise<number>;

  /**
   * Bulk create opportunities
   */
  bulkCreate(
    opportunities: OpportunityCreateDTO[],
    companyId: number,
    userId: number
  ): Promise<Opportunity[]>;

  /**
   * Bulk update opportunities
   */
  bulkUpdate(
    updates: Array<{ id: number; data: OpportunityUpdateDTO }>,
    companyId: number,
    userId: number
  ): Promise<{ success: number; failed: number; errors: any[] }>;

  /**
   * Bulk delete opportunities
   */
  bulkDelete(
    ids: number[],
    companyId: number,
    userId: number
  ): Promise<{ success: number; failed: number }>;
}