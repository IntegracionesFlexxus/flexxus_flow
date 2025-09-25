/**
 * Lead Service Interface
 */

import { Lead, LeadCreateDTO, LeadUpdateDTO, LeadFilter, LeadWithDetails, LeadMetrics } from '../types/lead.types';
import { LeadConversionData } from '../types/crm.types';
import { PaginatedResponse } from '../types/crm.types';

export interface ILeadService {
  /**
   * Create a new lead
   */
  createLead(data: LeadCreateDTO, userId: number): Promise<Lead>;

  /**
   * Update an existing lead
   */
  updateLead(id: number, companyId: number, data: LeadUpdateDTO, userId: number): Promise<Lead | null>;

  /**
   * Get lead by ID
   */
  getLeadById(id: number, companyId: number): Promise<LeadWithDetails | null>;

  /**
   * List leads with filters
   */
  listLeads(companyId: number, filters?: LeadFilter): Promise<PaginatedResponse<LeadWithDetails>>;

  /**
   * Qualify a lead
   */
  qualifyLead(leadId: number, companyId: number, userId: number): Promise<Lead>;

  /**
   * Convert lead to account/contact/opportunity
   */
  convertLead(
    leadId: number,
    companyId: number,
    conversionData: LeadConversionData,
    userId: number
  ): Promise<{
    account: any;
    contact: any;
    opportunity?: any;
  }>;

  /**
   * Calculate and update lead score
   */
  updateLeadScore(leadId: number, companyId: number): Promise<number>;

  /**
   * Bulk update lead scores
   */
  bulkUpdateScores(companyId: number): Promise<number>;

  /**
   * Assign lead to user
   */
  assignLead(leadId: number, companyId: number, assignedTo: number, userId: number): Promise<Lead>;

  /**
   * Auto-assign leads based on rules
   */
  autoAssignLeads(companyId: number): Promise<number>;

  /**
   * Delete lead
   */
  deleteLead(leadId: number, companyId: number, userId: number): Promise<boolean>;

  /**
   * Get lead metrics
   */
  getLeadMetrics(companyId: number, dateRange?: { start: Date; end: Date }): Promise<LeadMetrics>;

  /**
   * Check for duplicate leads
   */
  findDuplicates(email: string, companyId: number): Promise<Lead[]>;

  /**
   * Merge duplicate leads
   */
  mergeLeads(primaryLeadId: number, duplicateLeadIds: number[], companyId: number, userId: number): Promise<Lead>;
}