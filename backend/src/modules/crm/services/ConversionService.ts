/**
 * Conversion Service
 * Handles lead to account/contact/opportunity conversion
 */

import { injectable, inject } from 'inversify';
import { LeadRepository } from '../repositories/LeadRepository';
import { AccountRepository } from '../repositories/AccountRepository';
import { ContactRepository } from '../repositories/ContactRepository';
import { OpportunityRepository } from '../repositories/OpportunityRepository';
import { ActivityRepository } from '../repositories/ActivityRepository';
import { Lead } from '../types/lead.types';
import { Account } from '../types/account.types';
import { Contact } from '../types/contact.types';
import { Opportunity } from '../types/opportunity.types';
import { LeadConversionData } from '../types/crm.types';
import { TYPES } from '@/container/types';
import { AppError } from '@/shared/errors/AppError';
import { EventEmitter } from 'events';

@injectable()
export class ConversionService {
  constructor(
    @inject(TYPES.LeadRepository) private leadRepository: LeadRepository,
    @inject(TYPES.AccountRepository) private accountRepository: AccountRepository,
    @inject(TYPES.ContactRepository) private contactRepository: ContactRepository,
    @inject(TYPES.OpportunityRepository) private opportunityRepository: OpportunityRepository,
    @inject(TYPES.ActivityRepository) private activityRepository: ActivityRepository,
    @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter,
    @inject(TYPES.Logger) private logger?: any
  ) {}

  /**
   * Convert lead to account/contact/opportunity
   */
  async convertLead(
    leadId: number,
    companyId: number,
    conversionData: LeadConversionData,
    userId: number
  ): Promise<{
    account: Account;
    contact: Contact;
    opportunity?: Opportunity;
  }> {
    try {
      // Get lead details
      const lead = await this.leadRepository.getLeadWithDetails(leadId, companyId);
      if (!lead) {
        throw new AppError('Lead not found', 404);
      }

      if (lead.status === 'converted') {
        throw new AppError('Lead is already converted', 400);
      }

      // Start transaction
      const client = await this.leadRepository.db.getClient();

      try {
        await client.query('BEGIN');

        // Step 1: Create or find account
        const account = await this.createOrFindAccount(
          lead,
          conversionData,
          userId,
          client
        );

        // Step 2: Create contact
        const contact = await this.createContactFromLead(
          lead,
          account.id!,
          userId,
          client
        );

        // Step 3: Create opportunity if requested
        let opportunity: Opportunity | undefined;
        if (conversionData.createOpportunity) {
          opportunity = await this.createOpportunityFromLead(
            lead,
            account.id!,
            contact.id!,
            conversionData,
            userId,
            client
          );
        }

        // Step 4: Update lead as converted
        await this.leadRepository.convertLead(
          leadId,
          companyId,
          account.id!,
          contact.id!,
          opportunity?.id,
          userId
        );

        // Step 5: Transfer activities
        await this.transferActivities(
          leadId,
          account.id!,
          contact.id!,
          opportunity?.id,
          companyId,
          userId
        );

        // Commit transaction
        await client.query('COMMIT');

        // Emit conversion event
        this.eventEmitter.emit('lead:converted', {
          leadId,
          accountId: account.id,
          contactId: contact.id,
          opportunityId: opportunity?.id,
          userId,
          timestamp: new Date()
        });

        // Log conversion activity
        await this.logConversionActivity(
          lead,
          account,
          contact,
          opportunity,
          companyId,
          userId
        );

        this.logger?.info('Lead converted successfully', {
          leadId,
          accountId: account.id,
          contactId: contact.id,
          opportunityId: opportunity?.id
        });

        return { account, contact, opportunity };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger?.error('Error converting lead', { error, leadId, conversionData });
      throw error;
    }
  }

  /**
   * Create or find account
   */
  private async createOrFindAccount(
    lead: Lead,
    conversionData: LeadConversionData,
    userId: number,
    client: any
  ): Promise<Account> {
    // Use existing account if specified
    if (conversionData.existingAccountId) {
      const account = await this.accountRepository.findById(
        conversionData.existingAccountId,
        lead.company_id
      );
      if (!account) {
        throw new AppError('Specified account not found', 404);
      }
      return account;
    }

    // Create new account
    if (conversionData.createAccount !== false) {
      const accountName = conversionData.accountName ||
                         lead.company_name ||
                         `${lead.first_name} ${lead.last_name || ''}`.trim();

      // Check for existing account with same name
      const existingAccounts = await this.accountRepository.findDuplicates(
        accountName,
        null,
        lead.company_id
      );

      if (existingAccounts.length > 0) {
        // Use first matching account
        this.logger?.warn('Using existing account with similar name', {
          requestedName: accountName,
          existingAccount: existingAccounts[0]
        });
        return existingAccounts[0];
      }

      // Create new account
      const account = await this.accountRepository.create({
        company_id: lead.company_id,
        name: accountName,
        type: 'prospect',
        industry_id: lead.industry_id,
        website: lead.website,
        phone: lead.phone,
        email: lead.email,
        billing_street: lead.street,
        billing_city_id: lead.city_id,
        billing_postal_code: lead.postal_code,
        owner_id: lead.assigned_to || userId,
        status: 'active',
        rating: this.determineAccountRating(lead.score),
        description: lead.notes,
        tags: lead.tags
      }, userId);

      return account;
    }

    throw new AppError('Account creation or selection is required', 400);
  }

  /**
   * Create contact from lead
   */
  private async createContactFromLead(
    lead: Lead,
    accountId: number,
    userId: number,
    client: any
  ): Promise<Contact> {
    // Check for existing contact
    const existingContacts = await this.contactRepository.findDuplicates(
      lead.email,
      lead.company_id
    );

    if (existingContacts.length > 0) {
      // Update existing contact with account
      const existingContact = existingContacts[0];
      await this.contactRepository.update(
        existingContact.id!,
        lead.company_id,
        { account_id: accountId },
        userId
      );
      return this.contactRepository.findById(existingContact.id!, lead.company_id) as Promise<Contact>;
    }

    // Create new contact
    const contact = await this.contactRepository.create({
      company_id: lead.company_id,
      account_id: accountId,
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      mobile: lead.mobile,
      job_title: lead.job_title,
      is_primary: true,
      lead_source_id: lead.source_id,
      mailing_street: lead.street,
      mailing_city_id: lead.city_id,
      mailing_postal_code: lead.postal_code,
      do_not_call: lead.do_not_call,
      do_not_email: lead.do_not_email,
      preferred_contact_method: lead.preferred_contact_method,
      description: lead.notes,
      tags: lead.tags
    }, userId);

    return contact;
  }

  /**
   * Create opportunity from lead
   */
  private async createOpportunityFromLead(
    lead: Lead,
    accountId: number,
    contactId: number,
    conversionData: LeadConversionData,
    userId: number,
    client: any
  ): Promise<Opportunity> {
    const opportunity = await this.opportunityRepository.create({
      company_id: lead.company_id,
      name: conversionData.opportunityName || `${lead.company_name || lead.first_name} - Opportunity`,
      type: 'new_business',
      account_id: accountId,
      primary_contact_id: contactId,
      stage_id: conversionData.stageId || 1, // Default to first stage
      amount: conversionData.amount || lead.budget,
      probability: this.determineInitialProbability(lead.score),
      close_date: conversionData.closeDate || this.calculateCloseDate(lead.timeline),
      lead_source_id: lead.source_id,
      owner_id: lead.assigned_to || userId,
      description: lead.need_description,
      next_step: 'Follow up on converted lead',
      forecast_category: 'pipeline',
      tags: lead.tags
    }, userId);

    return opportunity;
  }

  /**
   * Transfer activities from lead to new entities
   */
  private async transferActivities(
    leadId: number,
    accountId: number,
    contactId: number,
    opportunityId: number | undefined,
    companyId: number,
    userId: number
  ): Promise<void> {
    const activities = await this.activityRepository.findWithFilters(companyId, {
      lead_id: leadId
    });

    for (const activity of activities) {
      await this.activityRepository.update(activity.id!, companyId, {
        lead_id: undefined,
        account_id: accountId,
        contact_id: contactId,
        opportunity_id: opportunityId
      }, userId);
    }

    this.logger?.info('Activities transferred', {
      leadId,
      accountId,
      contactId,
      opportunityId,
      activityCount: activities.length
    });
  }

  /**
   * Log conversion activity
   */
  private async logConversionActivity(
    lead: Lead,
    account: Account,
    contact: Contact,
    opportunity: Opportunity | undefined,
    companyId: number,
    userId: number
  ): Promise<void> {
    let description = `Lead "${lead.first_name} ${lead.last_name || ''}" converted to:\n`;
    description += `- Account: ${account.name}\n`;
    description += `- Contact: ${contact.first_name} ${contact.last_name || ''}\n`;
    if (opportunity) {
      description += `- Opportunity: ${opportunity.name}`;
    }

    await this.activityRepository.create({
      company_id: companyId,
      type: 'task',
      subject: 'Lead converted',
      description,
      status: 'completed',
      priority: 'low',
      account_id: account.id,
      contact_id: contact.id,
      opportunity_id: opportunity?.id,
      assigned_to: userId,
      completed_at: new Date()
    }, userId);
  }

  /**
   * Determine account rating based on lead score
   */
  private determineAccountRating(leadScore: number): 'hot' | 'warm' | 'cold' {
    if (leadScore >= 70) return 'hot';
    if (leadScore >= 40) return 'warm';
    return 'cold';
  }

  /**
   * Determine initial opportunity probability based on lead score
   */
  private determineInitialProbability(leadScore: number): number {
    if (leadScore >= 80) return 30;
    if (leadScore >= 60) return 20;
    if (leadScore >= 40) return 10;
    return 5;
  }

  /**
   * Calculate close date based on lead timeline
   */
  private calculateCloseDate(timeline?: string): Date {
    const now = new Date();

    switch (timeline) {
      case 'immediate':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      case 'this_quarter':
        return new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days
      case 'next_quarter':
        return new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000); // 120 days
      case 'this_year':
        return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 180 days
      case 'next_year':
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 365 days
      default:
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // Default 90 days
    }
  }

  /**
   * Validate conversion data
   */
  async validateConversionData(
    leadId: number,
    companyId: number,
    conversionData: LeadConversionData
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check lead exists and is not converted
    const lead = await this.leadRepository.findById(leadId, companyId);
    if (!lead) {
      errors.push('Lead not found');
    } else if (lead.status === 'converted') {
      errors.push('Lead is already converted');
    }

    // Validate account selection
    if (!conversionData.createAccount && !conversionData.existingAccountId) {
      errors.push('Must either create new account or select existing account');
    }

    if (conversionData.existingAccountId) {
      const account = await this.accountRepository.findById(
        conversionData.existingAccountId,
        companyId
      );
      if (!account) {
        errors.push('Selected account does not exist');
      }
    }

    // Validate opportunity data
    if (conversionData.createOpportunity) {
      if (!conversionData.opportunityName) {
        errors.push('Opportunity name is required when creating opportunity');
      }
      if (conversionData.closeDate && new Date(conversionData.closeDate) < new Date()) {
        errors.push('Close date cannot be in the past');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}