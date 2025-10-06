/**
 * Lead Service
 * Business logic for lead management
 */

import { injectable, inject } from 'inversify';
import { ILeadService } from '../interfaces/ILeadService';
import {
  Lead,
  LeadCreateDTO,
  LeadUpdateDTO,
  LeadFilter,
  LeadWithDetails,
  LeadMetrics
} from '../types/lead.types';
import { LeadConversionData, PaginatedResponse } from '../types/crm.types';
import { LeadRepository } from '../repositories/LeadRepository';
import { AccountRepository } from '../repositories/AccountRepository';
import { ContactRepository } from '../repositories/ContactRepository';
import { OpportunityRepository } from '../repositories/OpportunityRepository';
import { ActivityRepository } from '../repositories/ActivityRepository';
import { TYPES } from '@/container/types';
import { AppError, ErrorCode } from '@/shared/errors/AppError';
import { EventEmitter } from 'events';
import { CrossDatabaseService } from '@/shared/services/cross-database/CrossDatabaseService';

@injectable()
export class LeadService implements ILeadService {
  constructor(
    @inject(TYPES.LeadRepository) private leadRepository: LeadRepository,
    @inject(TYPES.AccountRepository) private accountRepository: AccountRepository,
    @inject(TYPES.ContactRepository) private contactRepository: ContactRepository,
    @inject(TYPES.OpportunityRepository) private opportunityRepository: OpportunityRepository,
    @inject(TYPES.ActivityRepository) private activityRepository: ActivityRepository,
    @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter,
    @inject(TYPES.CrossDatabaseService) private crossDatabaseService: CrossDatabaseService,
    @inject(TYPES.Logger) private logger?: any
  ) {}

  /**
   * Create a new lead
   */
  async createLead(data: LeadCreateDTO, userId: number): Promise<Lead> {
    try {
      // Check for duplicates
      if (data.email) {
        const existingLead = await this.leadRepository.findByEmail(data.email, data.company_id);
        if (existingLead) {
          throw new AppError(ErrorCode.RESOURCE_ALREADY_EXISTS, 'A lead with this email already exists', 409);
        }
      }

      // Create lead
      const lead = await this.leadRepository.create(data as any, userId);

      // Calculate initial score
      if (lead.id) {
        const score = await this.leadRepository.updateLeadScore(lead.id);
        lead.score = score;
      }

      // Emit event
      this.eventEmitter.emit('lead:created', {
        lead,
        userId,
        timestamp: new Date()
      });

      // Create welcome activity if assigned
      if (data.assigned_to) {
        await this.activityRepository.create({
          company_id: data.company_id,
          type: 'task',
          subject: `Follow up with new lead: ${data.first_name} ${data.last_name || ''}`,
          description: `New lead from ${data.source_id ? 'source' : 'manual entry'}. Review and qualify.`,
          status: 'pending',
          priority: 'medium',
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          lead_id: lead.id,
          assigned_to: data.assigned_to
        }, userId);
      }

      return lead;
    } catch (error) {
      this.logger?.error('Error creating lead', { error, data });
      throw error;
    }
  }

  /**
   * Update an existing lead
   */
  async updateLead(
    id: number,
    companyId: number,
    data: LeadUpdateDTO,
    userId: number
  ): Promise<Lead | null> {
    try {
      // Check if lead exists
      const existingLead = await this.leadRepository.findById(id, String(companyId));
      if (!existingLead) {
        return null;
      }

      // Check for email duplicates if email is being updated
      if (data.email && data.email !== existingLead.email) {
        const duplicate = await this.leadRepository.findByEmail(data.email, companyId);
        if (duplicate && duplicate.id !== id) {
          throw new AppError(ErrorCode.RESOURCE_ALREADY_EXISTS, 'A lead with this email already exists', 409);
        }
      }

      // Update lead
      const updated = await this.leadRepository.update(id, String(companyId), data, userId);

      // Update score if BANT fields changed
      if (data.budget !== undefined ||
          data.authority_level !== undefined ||
          data.need_description !== undefined ||
          data.timeline !== undefined) {
        if (updated) {
          const score = await this.leadRepository.updateLeadScore(id);
          updated.score = score;
        }
      }

      // Emit event
      if (updated) {
        this.eventEmitter.emit('lead:updated', {
          lead: updated,
          changes: data,
          userId,
          timestamp: new Date()
        });
      }

      return updated;
    } catch (error) {
      this.logger?.error('Error updating lead', { error, id, data });
      throw error;
    }
  }

  /**
   * Get lead by ID
   */
  async getLeadById(id: number, companyId: number): Promise<LeadWithDetails | null> {
    try {
      const lead = await this.leadRepository.getLeadWithDetails(id, companyId);

      if (!lead) {
        return null;
      }

      // Enrich with user data using CrossDatabaseService
      const [enrichedLead] = await this.crossDatabaseService.enrichWithUserData([lead]);

      return enrichedLead;
    } catch (error) {
      this.logger?.error('Error getting lead', { error, id, companyId });
      throw error;
    }
  }

  /**
   * List leads with filters
   */
  async listLeads(companyId: number, filters?: LeadFilter): Promise<PaginatedResponse<LeadWithDetails>> {
    try {
      const [leads, total] = await Promise.all([
        this.leadRepository.findWithFilters(companyId, filters || {}),
        this.leadRepository.countWithFilters(companyId, filters || {})
      ]);

      // Enrich leads with details
      const enrichedLeads = await Promise.all(
        leads.map(lead => this.leadRepository.getLeadWithDetails(lead.id!, companyId))
      );

      // Filter out null values
      const validLeads = enrichedLeads.filter(lead => lead !== null) as LeadWithDetails[];

      // Enrich with user data using CrossDatabaseService
      const leadsWithUserData = await this.crossDatabaseService.enrichWithUserData(validLeads);

      return {
        data: leadsWithUserData,
        total,
        page: filters?.page || 1,
        limit: filters?.limit || 20,
        totalPages: Math.ceil(total / (filters?.limit || 20))
      };
    } catch (error) {
      this.logger?.error('Error listing leads', { error, companyId, filters });
      throw error;
    }
  }

  /**
   * Qualify a lead
   */
  async qualifyLead(leadId: number, companyId: number, userId: number): Promise<Lead> {
    try {
      const lead = await this.leadRepository.findById(leadId, String(companyId));
      if (!lead) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Lead not found', 404);
      }

      if (lead.status === 'converted') {
        throw new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, 'Lead is already converted', 400);
      }

      // Update status to qualified
      const updated = await this.leadRepository.update(
        leadId,
        String(companyId),
        { status: 'qualified' },
        userId
      );

      if (!updated) {
        throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to qualify lead', 500);
      }

      // Create follow-up activity
      await this.activityRepository.create({
        company_id: companyId,
        type: 'task',
        subject: 'Follow up on qualified lead',
        description: `Lead ${lead.first_name} ${lead.last_name || ''} has been qualified. Plan next steps.`,
        status: 'pending',
        priority: 'high',
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lead_id: leadId,
        assigned_to: lead.assigned_to || userId
      }, userId);

      // Emit event
      this.eventEmitter.emit('lead:qualified', {
        lead: updated,
        userId,
        timestamp: new Date()
      });

      return updated;
    } catch (error) {
      this.logger?.error('Error qualifying lead', { error, leadId, companyId });
      throw error;
    }
  }

  /**
   * Convert lead to account/contact/opportunity
   */
  async convertLead(
    leadId: number,
    companyId: number,
    conversionData: LeadConversionData,
    userId: number
  ): Promise<{
    account: any;
    contact: any;
    opportunity?: any;
  }> {
    try {
      const lead = await this.leadRepository.getLeadWithDetails(leadId, companyId);
      if (!lead) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Lead not found', 404);
      }

      if (lead.status === 'converted') {
        throw new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, 'Lead is already converted', 400);
      }

      // Start transaction
      let account: any;
      let contact: any;
      let opportunity: any;

      // Create or find account
      if (conversionData.createAccount) {
        account = await this.accountRepository.create({
          company_id: companyId,
          name: conversionData.accountName || lead.company_name || `${lead.first_name} ${lead.last_name || ''}`,
          type: 'prospect',
          website: lead.website,
          industry_id: lead.industry_id,
          phone: lead.phone,
          email: lead.email,
          billing_street: lead.street,
          billing_city_id: lead.city_id,
          billing_postal_code: lead.postal_code,
          owner_id: lead.assigned_to || userId,
          status: 'active',
          description: lead.notes
        }, userId);
      } else if (conversionData.existingAccountId) {
        account = await this.accountRepository.findById(conversionData.existingAccountId, String(companyId));
        if (!account) {
          throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Specified account not found', 404);
        }
      }

      // Create contact
      contact = await this.contactRepository.create({
        company_id: companyId,
        account_id: account.id,
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        mobile: lead.mobile,
        job_title: lead.job_title,
        is_primary: true,
        mailing_street: lead.street,
        mailing_city_id: lead.city_id,
        mailing_postal_code: lead.postal_code,
        lead_source_id: lead.source_id,
        description: lead.notes
      }, userId);

      // Create opportunity if requested
      if (conversionData.createOpportunity) {
        opportunity = await this.opportunityRepository.create({
          company_id: companyId,
          name: conversionData.opportunityName || `${account.name} - Opportunity`,
          account_id: account.id,
          primary_contact_id: contact.id,
          stage_id: conversionData.stageId || 1, // Default to first stage
          amount: conversionData.amount || lead.budget,
          close_date: conversionData.closeDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          lead_source_id: lead.source_id,
          owner_id: lead.assigned_to || userId,
          description: lead.need_description
        } as any, userId);
      }

      // Update lead as converted
      await this.leadRepository.convertLead(
        leadId,
        companyId,
        account.id,
        contact.id,
        opportunity?.id,
        userId
      );

      // Transfer activities
      const activities = await this.activityRepository.findWithFilters(companyId, {
        lead_id: leadId
      });

      for (const activity of activities) {
        await this.activityRepository.update(activity.id!, String(companyId), {
          lead_id: undefined,
          account_id: account.id,
          contact_id: contact.id,
          opportunity_id: opportunity?.id
        }, userId);
      }

      // Emit event
      this.eventEmitter.emit('lead:converted', {
        lead,
        account,
        contact,
        opportunity,
        userId,
        timestamp: new Date()
      });

      return {
        account,
        contact,
        opportunity
      };
    } catch (error) {
      this.logger?.error('Error converting lead', { error, leadId, conversionData });
      throw error;
    }
  }

  /**
   * Calculate and update lead score
   */
  async updateLeadScore(leadId: number, companyId: number): Promise<number> {
    try {
      const lead = await this.leadRepository.findById(leadId, String(companyId));
      if (!lead) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Lead not found', 404);
      }

      const score = await this.leadRepository.updateLeadScore(leadId);

      // Emit event if score changed significantly
      if (Math.abs(score - lead.score) >= 10) {
        this.eventEmitter.emit('lead:score:changed', {
          lead: { ...lead, score },
          oldScore: lead.score,
          newScore: score,
          timestamp: new Date()
        });
      }

      return score;
    } catch (error) {
      this.logger?.error('Error updating lead score', { error, leadId, companyId });
      throw error;
    }
  }

  /**
   * Bulk update lead scores
   */
  async bulkUpdateScores(companyId: number): Promise<number> {
    try {
      const leads = await this.leadRepository.findAll(String(companyId));
      let updatedCount = 0;

      for (const lead of leads) {
        if (lead.id && lead.status !== 'converted') {
          await this.leadRepository.updateLeadScore(lead.id);
          updatedCount++;
        }
      }

      this.logger?.info('Bulk lead score update completed', {
        companyId,
        updatedCount
      });

      return updatedCount;
    } catch (error) {
      this.logger?.error('Error bulk updating lead scores', { error, companyId });
      throw error;
    }
  }

  /**
   * Assign lead to user
   */
  async assignLead(leadId: number, companyId: number, assignedTo: number, userId: number): Promise<Lead> {
    try {
      const lead = await this.leadRepository.findById(leadId, String(companyId));
      if (!lead) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Lead not found', 404);
      }

      const updated = await this.leadRepository.update(
        leadId,
        String(companyId),
        { assigned_to: assignedTo },
        userId
      );

      if (!updated) {
        throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to assign lead', 500);
      }

      // Create notification activity
      await this.activityRepository.create({
        company_id: companyId,
        type: 'task',
        subject: `New lead assigned: ${lead.first_name} ${lead.last_name || ''}`,
        description: 'You have been assigned a new lead. Please review and follow up.',
        status: 'pending',
        priority: 'medium',
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lead_id: leadId,
        assigned_to: assignedTo
      }, userId);

      // Emit event
      this.eventEmitter.emit('lead:assigned', {
        lead: updated,
        assignedTo,
        assignedBy: userId,
        timestamp: new Date()
      });

      return updated;
    } catch (error) {
      this.logger?.error('Error assigning lead', { error, leadId, assignedTo });
      throw error;
    }
  }

  /**
   * Auto-assign leads based on rules
   */
  async autoAssignLeads(companyId: number): Promise<number> {
    try {
      // Get unassigned leads
      const unassignedLeads = await this.leadRepository.findWithFilters(companyId, {
        assigned_to: undefined
      });

      // Simple round-robin assignment (can be enhanced with more complex rules)
      // This is a placeholder - actual implementation would involve user availability, workload, etc.

      let assignedCount = 0;

      for (const lead of unassignedLeads) {
        if (lead.id) {
          // Here you would implement your assignment logic
          // For now, we'll skip actual assignment
          this.logger?.info('Lead ready for auto-assignment', { leadId: lead.id });
          assignedCount++;
        }
      }

      return assignedCount;
    } catch (error) {
      this.logger?.error('Error auto-assigning leads', { error, companyId });
      throw error;
    }
  }

  /**
   * Delete lead
   */
  async deleteLead(leadId: number, companyId: number, userId: number): Promise<boolean> {
    try {
      const lead = await this.leadRepository.findById(leadId, String(companyId));
      if (!lead) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Lead not found', 404);
      }

      if (lead.status === 'converted') {
        throw new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, 'Cannot delete a converted lead', 400);
      }

      const deleted = await this.leadRepository.delete(leadId, String(companyId));

      if (deleted) {
        // Emit event
        this.eventEmitter.emit('lead:deleted', {
          leadId,
          userId,
          timestamp: new Date()
        });
      }

      return deleted;
    } catch (error) {
      this.logger?.error('Error deleting lead', { error, leadId, companyId });
      throw error;
    }
  }

  /**
   * Get lead metrics
   */
  async getLeadMetrics(companyId: number, dateRange?: { start: Date; end: Date }): Promise<LeadMetrics> {
    try {
      // This would typically be implemented in the repository with optimized queries
      // For now, returning a placeholder structure

      const leads = await this.leadRepository.findAll(String(companyId));
      const total = leads.length;

      const byStatus = {
        new: 0,
        contacted: 0,
        qualified: 0,
        disqualified: 0,
        converted: 0
      };

      let totalScore = 0;
      let convertedCount = 0;

      for (const lead of leads) {
        byStatus[lead.status]++;
        totalScore += lead.score;
        if (lead.status === 'converted') convertedCount++;
      }

      return {
        total,
        byStatus,
        averageScore: total > 0 ? totalScore / total : 0,
        conversionRate: total > 0 ? (convertedCount / total) * 100 : 0,
        averageTimeToConvert: 7, // Placeholder
        topSources: [] // Would need actual query
      };
    } catch (error) {
      this.logger?.error('Error getting lead metrics', { error, companyId });
      throw error;
    }
  }

  /**
   * Check for duplicate leads
   */
  async findDuplicates(email: string, companyId: number): Promise<Lead[]> {
    try {
      return await this.leadRepository.findDuplicates(email, companyId);
    } catch (error) {
      this.logger?.error('Error finding duplicate leads', { error, email, companyId });
      throw error;
    }
  }

  /**
   * Merge duplicate leads
   */
  async mergeLeads(
    primaryLeadId: number,
    duplicateLeadIds: number[],
    companyId: number,
    userId: number
  ): Promise<Lead> {
    try {
      const primaryLead = await this.leadRepository.findById(primaryLeadId, String(companyId));
      if (!primaryLead) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Primary lead not found', 404);
      }

      // Verify all duplicate leads exist and belong to company
      for (const duplicateId of duplicateLeadIds) {
        const duplicate = await this.leadRepository.findById(duplicateId, String(companyId));
        if (!duplicate) {
          throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, `Duplicate lead ${duplicateId} not found`, 404);
        }
      }

      // Transfer activities from duplicates to primary
      for (const duplicateId of duplicateLeadIds) {
        const activities = await this.activityRepository.findWithFilters(companyId, {
          lead_id: duplicateId
        });

        for (const activity of activities) {
          await this.activityRepository.update(activity.id!, String(companyId), {
            lead_id: primaryLeadId
          }, userId);
        }
      }

      // Delete duplicate leads
      for (const duplicateId of duplicateLeadIds) {
        await this.leadRepository.delete(duplicateId, String(companyId));
      }

      // Update primary lead score
      if (primaryLeadId) {
        await this.leadRepository.updateLeadScore(primaryLeadId);
      }

      // Emit event
      this.eventEmitter.emit('leads:merged', {
        primaryLeadId,
        mergedLeadIds: duplicateLeadIds,
        userId,
        timestamp: new Date()
      });

      const updatedLead = await this.leadRepository.findById(primaryLeadId, String(companyId));
      return updatedLead!;
    } catch (error) {
      this.logger?.error('Error merging leads', { error, primaryLeadId, duplicateLeadIds });
      throw error;
    }
  }
}