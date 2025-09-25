/**
 * Opportunity Service
 * Business logic for opportunity management
 */

import { injectable, inject } from 'inversify';
import { IOpportunityService } from '../interfaces/IOpportunityService';
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
import { OpportunityRepository } from '../repositories/OpportunityRepository';
import { ActivityRepository } from '../repositories/ActivityRepository';
import { TYPES } from '@/container/types';
import { AppError } from '@/shared/errors/AppError';
import { EventEmitter } from 'events';
import { CrossDatabaseService } from '@/shared/services/cross-database/CrossDatabaseService';

@injectable()
export class OpportunityService implements IOpportunityService {
  constructor(
    @inject(TYPES.OpportunityRepository) private opportunityRepository: OpportunityRepository,
    @inject(TYPES.ActivityRepository) private activityRepository: ActivityRepository,
    @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter,
    @inject(TYPES.CrossDatabaseService) private crossDatabaseService: CrossDatabaseService,
    @inject(TYPES.Logger) private logger?: any
  ) {}

  /**
   * Create a new opportunity
   */
  async createOpportunity(data: OpportunityCreateDTO, userId: number): Promise<Opportunity> {
    try {
      // Generate opportunity number if not provided
      if (!data.opportunity_number) {
        const timestamp = Date.now().toString(36).toUpperCase();
        (data as any).opportunity_number = `OPP-${timestamp}`;
      }

      // Set default probability based on stage if not provided
      if (!data.probability && data.stage_id) {
        // This would typically fetch from sales_stages table
        // For now, using default values
        const stageProbabilities: Record<number, number> = {
          1: 10,  // Prospecting
          2: 25,  // Qualification
          3: 50,  // Proposal
          4: 75,  // Negotiation
          5: 90,  // Closing
        };
        data.probability = stageProbabilities[data.stage_id] || 0;
      }

      // Create opportunity
      const opportunity = await this.opportunityRepository.create(data, userId);

      // Emit event
      this.eventEmitter.emit('opportunity:created', {
        opportunity,
        userId,
        timestamp: new Date()
      });

      // Create initial activity
      await this.activityRepository.create({
        company_id: data.company_id,
        type: 'task',
        subject: `New opportunity: ${opportunity.name}`,
        description: 'Review opportunity details and plan next steps',
        status: 'pending',
        priority: 'high',
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        opportunity_id: opportunity.id,
        account_id: data.account_id,
        assigned_to: data.owner_id
      }, userId);

      return opportunity;
    } catch (error) {
      this.logger?.error('Error creating opportunity', { error, data });
      throw error;
    }
  }

  /**
   * Update an existing opportunity
   */
  async updateOpportunity(
    id: number,
    companyId: number,
    data: OpportunityUpdateDTO,
    userId: number
  ): Promise<Opportunity | null> {
    try {
      const existingOpportunity = await this.opportunityRepository.findById(id, companyId);
      if (!existingOpportunity) {
        return null;
      }

      // Update opportunity
      const updated = await this.opportunityRepository.update(id, companyId, data, userId);

      if (updated) {
        // Check for significant changes
        if (data.stage_id && data.stage_id !== existingOpportunity.stage_id) {
          await this.logStageChange(id, companyId, existingOpportunity.stage_id!, data.stage_id, userId);
        }

        if (data.amount && Math.abs(data.amount - (existingOpportunity.amount || 0)) > 1000) {
          await this.logAmountChange(id, companyId, existingOpportunity.amount || 0, data.amount, userId);
        }

        this.eventEmitter.emit('opportunity:updated', {
          opportunity: updated,
          changes: data,
          userId,
          timestamp: new Date()
        });
      }

      return updated;
    } catch (error) {
      this.logger?.error('Error updating opportunity', { error, id, data });
      throw error;
    }
  }

  /**
   * Get opportunity by ID
   */
  async getOpportunityById(id: number, companyId: number): Promise<OpportunityWithDetails | null> {
    try {
      const opportunity = await this.opportunityRepository.getOpportunityWithDetails(id, companyId);

      if (!opportunity) {
        return null;
      }

      // Enrich with user data using CrossDatabaseService
      const [enrichedOpportunity] = await this.crossDatabaseService.enrichWithUserData([opportunity]);

      return enrichedOpportunity;
    } catch (error) {
      this.logger?.error('Error getting opportunity', { error, id, companyId });
      throw error;
    }
  }

  /**
   * List opportunities with filters
   */
  async listOpportunities(
    companyId: number,
    filters?: OpportunityFilter
  ): Promise<PaginatedResponse<OpportunityWithDetails>> {
    try {
      const [opportunities, total] = await Promise.all([
        this.opportunityRepository.findWithFilters(companyId, filters || {}),
        this.opportunityRepository.countWithFilters(companyId, filters || {})
      ]);

      const enrichedOpportunities = await Promise.all(
        opportunities.map(opp => this.opportunityRepository.getOpportunityWithDetails(opp.id!, companyId))
      );

      // Filter out null values
      const validOpportunities = enrichedOpportunities.filter(opp => opp !== null) as OpportunityWithDetails[];

      // Enrich with user data using CrossDatabaseService
      const opportunitiesWithUserData = await this.crossDatabaseService.enrichWithUserData(validOpportunities);

      return {
        data: opportunitiesWithUserData,
        total,
        page: filters?.page || 1,
        limit: filters?.limit || 20,
        totalPages: Math.ceil(total / (filters?.limit || 20))
      };
    } catch (error) {
      this.logger?.error('Error listing opportunities', { error, companyId, filters });
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
    userId: number
  ): Promise<boolean> {
    try {
      const opportunity = await this.opportunityRepository.findById(opportunityId, companyId);
      if (!opportunity) {
        throw new AppError('Opportunity not found', 404);
      }

      const result = await this.opportunityRepository.updateStage(
        opportunityId,
        companyId,
        stageUpdate,
        userId
      );

      if (result) {
        this.eventEmitter.emit('opportunity:stage:changed', {
          opportunityId,
          oldStage: opportunity.stage_id,
          newStage: stageUpdate.stage_id,
          userId,
          timestamp: new Date()
        });
      }

      return result;
    } catch (error) {
      this.logger?.error('Error updating opportunity stage', { error, opportunityId, stageUpdate });
      throw error;
    }
  }

  /**
   * Mark opportunity as won
   */
  async markAsWon(opportunityId: number, companyId: number, userId: number): Promise<Opportunity> {
    try {
      const opportunity = await this.opportunityRepository.findById(opportunityId, companyId);
      if (!opportunity) {
        throw new AppError('Opportunity not found', 404);
      }

      if (opportunity.status === 'won') {
        throw new AppError('Opportunity is already won', 400);
      }

      const result = await this.opportunityRepository.markAsWon(opportunityId, companyId, userId);

      if (result) {
        // Log win activity
        await this.activityRepository.create({
          company_id: companyId,
          type: 'task',
          subject: 'Opportunity won!',
          description: `Congratulations! ${opportunity.name} has been won.`,
          status: 'completed',
          priority: 'low',
          opportunity_id: opportunityId,
          assigned_to: opportunity.owner_id,
          completed_at: new Date()
        }, userId);

        this.eventEmitter.emit('opportunity:won', {
          opportunity,
          userId,
          timestamp: new Date()
        });
      }

      const updatedOpportunity = await this.opportunityRepository.findById(opportunityId, companyId);
      return updatedOpportunity!;
    } catch (error) {
      this.logger?.error('Error marking opportunity as won', { error, opportunityId });
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
    userId: number
  ): Promise<Opportunity> {
    try {
      const opportunity = await this.opportunityRepository.findById(opportunityId, companyId);
      if (!opportunity) {
        throw new AppError('Opportunity not found', 404);
      }

      if (opportunity.status === 'lost') {
        throw new AppError('Opportunity is already lost', 400);
      }

      const result = await this.opportunityRepository.markAsLost(
        opportunityId,
        companyId,
        lostReason,
        userId
      );

      if (result) {
        // Log loss activity
        await this.activityRepository.create({
          company_id: companyId,
          type: 'task',
          subject: 'Opportunity lost',
          description: `${opportunity.name} was lost. Reason: ${lostReason}`,
          status: 'completed',
          priority: 'low',
          opportunity_id: opportunityId,
          assigned_to: opportunity.owner_id,
          completed_at: new Date()
        }, userId);

        this.eventEmitter.emit('opportunity:lost', {
          opportunity,
          lostReason,
          userId,
          timestamp: new Date()
        });
      }

      const updatedOpportunity = await this.opportunityRepository.findById(opportunityId, companyId);
      return updatedOpportunity!;
    } catch (error) {
      this.logger?.error('Error marking opportunity as lost', { error, opportunityId, lostReason });
      throw error;
    }
  }

  /**
   * Get pipeline metrics
   */
  async getPipelineMetrics(companyId: number, ownerId?: number): Promise<PipelineMetrics> {
    try {
      return await this.opportunityRepository.getPipelineMetrics(companyId, ownerId);
    } catch (error) {
      this.logger?.error('Error getting pipeline metrics', { error, companyId, ownerId });
      throw error;
    }
  }

  /**
   * Get complete pipeline data with stages and opportunities
   */
  async getPipeline(
    companyId: number,
    filters?: OpportunityFilter
  ): Promise<PipelineData> {
    try {
      this.logger?.info('Getting pipeline data', { companyId, filters });

      // Llamar al repository para obtener datos completos
      const pipelineData = await this.opportunityRepository.getPipelineData(
        companyId,
        filters
      );

      // Log de éxito
      this.logger?.info('Pipeline data retrieved', {
        companyId,
        stagesCount: pipelineData.stages.length,
        opportunitiesCount: pipelineData.opportunities.length,
        totalValue: pipelineData.metrics.total_value
      });

      // Emitir evento para analytics
      this.eventEmitter.emit('pipeline:viewed', {
        companyId,
        userId: filters?.owner_id,
        timestamp: new Date(),
        stagesCount: pipelineData.stages.length,
        opportunitiesCount: pipelineData.opportunities.length
      });

      return pipelineData;
    } catch (error) {
      this.logger?.error('Error getting pipeline', { error, companyId, filters });
      throw error;
    }
  }

  /**
   * Get forecast data
   */
  async getForecastData(companyId: number, period: string): Promise<ForecastData[]> {
    try {
      return await this.opportunityRepository.getForecastData(companyId, period);
    } catch (error) {
      this.logger?.error('Error getting forecast data', { error, companyId, period });
      throw error;
    }
  }

  /**
   * Get win/loss analysis
   */
  async getWinLossAnalysis(companyId: number, period: string): Promise<WinLossAnalysis> {
    try {
      return await this.opportunityRepository.getWinLossAnalysis(companyId, period);
    } catch (error) {
      this.logger?.error('Error getting win/loss analysis', { error, companyId, period });
      throw error;
    }
  }

  /**
   * Delete opportunity
   */
  async deleteOpportunity(opportunityId: number, companyId: number, userId: number): Promise<boolean> {
    try {
      const opportunity = await this.opportunityRepository.findById(opportunityId, companyId);
      if (!opportunity) {
        throw new AppError('Opportunity not found', 404);
      }

      if (opportunity.status === 'won') {
        throw new AppError('Cannot delete a won opportunity', 400);
      }

      const deleted = await this.opportunityRepository.delete(opportunityId, companyId);

      if (deleted) {
        this.eventEmitter.emit('opportunity:deleted', {
          opportunityId,
          userId,
          timestamp: new Date()
        });
      }

      return deleted;
    } catch (error) {
      this.logger?.error('Error deleting opportunity', { error, opportunityId, companyId });
      throw error;
    }
  }

  /**
   * Clone opportunity
   */
  async cloneOpportunity(opportunityId: number, companyId: number, userId: number): Promise<Opportunity> {
    try {
      const original = await this.opportunityRepository.findById(opportunityId, companyId);
      if (!original) {
        throw new AppError('Opportunity not found', 404);
      }

      const cloneData: OpportunityCreateDTO = {
        company_id: companyId,
        name: `${original.name} (Copy)`,
        type: original.type,
        account_id: original.account_id,
        primary_contact_id: original.primary_contact_id,
        stage_id: 1, // Reset to first stage
        amount: original.amount,
        probability: 0,
        close_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        lead_source_id: original.lead_source_id,
        campaign_id: original.campaign_id,
        competitors: original.competitors,
        owner_id: userId,
        description: original.description,
        tags: original.tags
      };

      const cloned = await this.createOpportunity(cloneData, userId);

      this.eventEmitter.emit('opportunity:cloned', {
        originalId: opportunityId,
        clonedId: cloned.id,
        userId,
        timestamp: new Date()
      });

      return cloned;
    } catch (error) {
      this.logger?.error('Error cloning opportunity', { error, opportunityId, companyId });
      throw error;
    }
  }

  /**
   * Calculate opportunity weighted value
   */
  async calculateWeightedValue(opportunityId: number, companyId: number): Promise<number> {
    try {
      const opportunity = await this.opportunityRepository.findById(opportunityId, companyId);
      if (!opportunity) {
        throw new AppError('Opportunity not found', 404);
      }

      const amount = opportunity.amount || 0;
      const probability = opportunity.probability || 0;
      const weightedValue = (amount * probability) / 100;

      return weightedValue;
    } catch (error) {
      this.logger?.error('Error calculating weighted value', { error, opportunityId, companyId });
      throw error;
    }
  }

  /**
   * Log stage change activity
   */
  private async logStageChange(
    opportunityId: number,
    companyId: number,
    oldStageId: number,
    newStageId: number,
    userId: number
  ): Promise<void> {
    await this.activityRepository.create({
      company_id: companyId,
      type: 'task',
      subject: 'Stage updated',
      description: `Stage changed from ${oldStageId} to ${newStageId}`,
      status: 'completed',
      priority: 'low',
      opportunity_id: opportunityId,
      assigned_to: userId,
      completed_at: new Date()
    }, userId);
  }

  /**
   * Log amount change activity
   */
  private async logAmountChange(
    opportunityId: number,
    companyId: number,
    oldAmount: number,
    newAmount: number,
    userId: number
  ): Promise<void> {
    await this.activityRepository.create({
      company_id: companyId,
      type: 'task',
      subject: 'Amount updated',
      description: `Amount changed from $${oldAmount} to $${newAmount}`,
      status: 'completed',
      priority: 'low',
      opportunity_id: opportunityId,
      assigned_to: userId,
      completed_at: new Date()
    }, userId);
  }

  /**
   * Bulk create opportunities
   */
  async bulkCreate(
    opportunities: OpportunityCreateDTO[],
    companyId: number,
    userId: number
  ): Promise<Opportunity[]> {
    const results: Opportunity[] = [];
    const errors: any[] = [];

    try {
      // Process each opportunity
      for (const opportunityData of opportunities) {
        try {
          // Add company_id to each opportunity
          const dataWithCompany = {
            ...opportunityData,
            company_id: companyId
          };

          const opportunity = await this.createOpportunity(dataWithCompany, userId);
          results.push(opportunity);
        } catch (error) {
          errors.push({
            data: opportunityData,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          // Continue processing other opportunities
        }
      }

      this.logger?.info('Bulk opportunities created', {
        companyId,
        created: results.length,
        failed: errors.length
      });

      // Emit event for bulk creation
      if (results.length > 0) {
        this.eventEmitter.emit('opportunities:bulk-created', {
          companyId,
          userId,
          count: results.length,
          opportunities: results.map(o => o.id)
        });
      }

      return results;
    } catch (error) {
      this.logger?.error('Error in bulk create opportunities', error);
      throw new AppError('Failed to bulk create opportunities', 500);
    }
  }

  /**
   * Bulk update opportunities
   */
  async bulkUpdate(
    updates: Array<{ id: number; data: OpportunityUpdateDTO }>,
    companyId: number,
    userId: number
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    let success = 0;
    const errors: any[] = [];

    try {
      for (const update of updates) {
        try {
          const result = await this.updateOpportunity(
            update.id,
            companyId,
            update.data,
            userId
          );
          if (result) {
            success++;
          } else {
            errors.push({
              id: update.id,
              error: 'Opportunity not found'
            });
          }
        } catch (error) {
          errors.push({
            id: update.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      this.logger?.info('Bulk opportunities updated', {
        companyId,
        success,
        failed: errors.length
      });

      // Emit event for bulk update
      if (success > 0) {
        this.eventEmitter.emit('opportunities:bulk-updated', {
          companyId,
          userId,
          count: success
        });
      }

      return { success, failed: errors.length, errors };
    } catch (error) {
      this.logger?.error('Error in bulk update opportunities', error);
      throw new AppError('Failed to bulk update opportunities', 500);
    }
  }

  /**
   * Bulk delete opportunities
   */
  async bulkDelete(
    ids: number[],
    companyId: number,
    userId: number
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    try {
      for (const id of ids) {
        try {
          const deleted = await this.deleteOpportunity(id, companyId, userId);
          if (deleted) {
            success++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
          this.logger?.debug('Failed to delete opportunity', { id, error });
        }
      }

      this.logger?.info('Bulk opportunities deleted', {
        companyId,
        success,
        failed
      });

      // Emit event for bulk deletion
      if (success > 0) {
        this.eventEmitter.emit('opportunities:bulk-deleted', {
          companyId,
          userId,
          count: success
        });
      }

      return { success, failed };
    } catch (error) {
      this.logger?.error('Error in bulk delete opportunities', error);
      throw new AppError('Failed to bulk delete opportunities', 500);
    }
  }
}