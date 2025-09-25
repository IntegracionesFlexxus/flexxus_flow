/**
 * Account Service
 * Business logic for account management
 */

import { injectable, inject } from 'inversify';
import { IAccountService } from '../interfaces/IAccountService';
import {
  Account,
  AccountCreateDTO,
  AccountUpdateDTO,
  AccountFilter,
  AccountWithDetails,
  AccountHierarchy,
  AccountMetrics
} from '../types/account.types';
import { PaginatedResponse } from '../types/crm.types';
import { AccountRepository } from '../repositories/AccountRepository';
import { ContactRepository } from '../repositories/ContactRepository';
import { OpportunityRepository } from '../repositories/OpportunityRepository';
import { ActivityRepository } from '../repositories/ActivityRepository';
import { TYPES } from '@/container/types';
import { AppError } from '@/shared/errors/AppError';
import { EventEmitter } from 'events';
import { CrossDatabaseService } from '@/shared/services/cross-database/CrossDatabaseService';

@injectable()
export class AccountService implements IAccountService {
  constructor(
    @inject(TYPES.AccountRepository) private accountRepository: AccountRepository,
    @inject(TYPES.ContactRepository) private contactRepository: ContactRepository,
    @inject(TYPES.OpportunityRepository) private opportunityRepository: OpportunityRepository,
    @inject(TYPES.ActivityRepository) private activityRepository: ActivityRepository,
    @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter,
    @inject(TYPES.CrossDatabaseService) private crossDatabaseService: CrossDatabaseService,
    @inject(TYPES.Logger) private logger?: any
  ) {}

  /**
   * Create a new account
   */
  async createAccount(data: AccountCreateDTO, userId: number | string): Promise<Account> {
    try {
      // Check for duplicates by CUIT if provided
      if (data.cuit) {
        const existingAccount = await this.accountRepository.findByCUIT(data.cuit, data.company_id);
        if (existingAccount) {
          throw new AppError('An account with this CUIT already exists', 409);
        }
      }

      // Check for similar names
      const similarAccounts = await this.accountRepository.findDuplicates(
        data.name,
        data.cuit || null,
        data.company_id
      );

      if (similarAccounts.length > 0) {
        this.logger?.warn('Similar accounts found', {
          newAccountName: data.name,
          similarAccounts: similarAccounts.map(a => ({ id: a.id, name: a.name }))
        });
      }

      // Generate account number if not provided
      if (!data.account_number) {
        const timestamp = Date.now().toString(36).toUpperCase();
        (data as any).account_number = `ACC-${timestamp}`;
      }

      // Create account
      const account = await this.accountRepository.create(data, userId);

      // Emit event
      this.eventEmitter.emit('account:created', {
        account,
        userId,
        timestamp: new Date()
      });

      // Create welcome activity
      await this.activityRepository.create({
        company_id: data.company_id,
        type: 'task',
        subject: `Welcome new account: ${account.name}`,
        description: 'Review account information and plan engagement strategy',
        status: 'pending',
        priority: 'medium',
        due_date: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days
        account_id: account.id,
        assigned_to: data.owner_id
      }, userId);

      return account;
    } catch (error) {
      this.logger?.error('Error creating account', { error, data });
      throw error;
    }
  }

  /**
   * Update an existing account
   */
  async updateAccount(
    id: number,
    companyId: string,
    data: AccountUpdateDTO,
    userId: number | string
  ): Promise<Account | null> {
    try {
      // Check if account exists
      const existingAccount = await this.accountRepository.findById(id, companyId);
      if (!existingAccount) {
        return null;
      }

      // Check for CUIT duplicates if CUIT is being updated
      if (data.cuit && data.cuit !== existingAccount.cuit) {
        const duplicate = await this.accountRepository.findByCUIT(data.cuit, companyId);
        if (duplicate && duplicate.id !== id) {
          throw new AppError('An account with this CUIT already exists', 409);
        }
      }

      // Update account
      const updated = await this.accountRepository.update(id, companyId, data, userId);

      // Emit event
      if (updated) {
        this.eventEmitter.emit('account:updated', {
          account: updated,
          changes: data,
          userId,
          timestamp: new Date()
        });

        // If status changed to inactive, log it
        if (data.status === 'inactive' && existingAccount.status !== 'inactive') {
          await this.activityRepository.create({
            company_id: companyId,
            type: 'task',
            subject: 'Account marked as inactive',
            description: `Account ${updated.name} has been marked as inactive. Review and take necessary actions.`,
            status: 'pending',
            priority: 'high',
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
            account_id: id,
            assigned_to: updated.owner_id
          }, userId);
        }
      }

      return updated;
    } catch (error) {
      this.logger?.error('Error updating account', { error, id, data });
      throw error;
    }
  }

  /**
   * Get account by ID
   */
  async getAccountById(id: number, companyId: string): Promise<AccountWithDetails | null> {
    try {
      const account = await this.accountRepository.getAccountWithDetails(id, companyId);

      if (!account) {
        return null;
      }

      // Enrich with user data using CrossDatabaseService
      const [enrichedAccount] = await this.crossDatabaseService.enrichWithUserData([account]);

      return enrichedAccount;
    } catch (error) {
      this.logger?.error('Error getting account', { error, id, companyId });
      throw error;
    }
  }

  /**
   * List accounts with filters
   */
  async listAccounts(companyId: string, filters?: AccountFilter): Promise<PaginatedResponse<AccountWithDetails>> {
    try {
      const [accounts, total] = await Promise.all([
        this.accountRepository.findWithFilters(companyId, filters || {}),
        this.accountRepository.countWithFilters(companyId, filters || {})
      ]);

      // Enrich accounts with details
      const enrichedAccounts = await Promise.all(
        accounts.map(account => this.accountRepository.getAccountWithDetails(account.id!, companyId))
      );

      // Filter out null values
      const validAccounts = enrichedAccounts.filter(account => account !== null) as AccountWithDetails[];

      // Enrich with user data using CrossDatabaseService
      const accountsWithUserData = await this.crossDatabaseService.enrichWithUserData(validAccounts);

      return {
        data: accountsWithUserData,
        total,
        page: filters?.page || 1,
        limit: filters?.limit || 20,
        totalPages: Math.ceil(total / (filters?.limit || 20))
      };
    } catch (error) {
      this.logger?.error('Error listing accounts', { error, companyId, filters });
      throw error;
    }
  }

  /**
   * Get account hierarchy
   */
  async getAccountHierarchy(accountId: number, companyId: string): Promise<AccountHierarchy | null> {
    try {
      return await this.accountRepository.getAccountHierarchy(accountId, companyId);
    } catch (error) {
      this.logger?.error('Error getting account hierarchy', { error, accountId, companyId });
      throw error;
    }
  }

  /**
   * Get account metrics
   */
  async getAccountMetrics(companyId: string): Promise<AccountMetrics> {
    try {
      return await this.accountRepository.getAccountMetrics(companyId);
    } catch (error) {
      this.logger?.error('Error getting account metrics', { error, companyId });
      throw error;
    }
  }

  /**
   * Delete account
   */
  async deleteAccount(accountId: number, companyId: string, userId: number): Promise<boolean> {
    try {
      const account = await this.accountRepository.findById(accountId, companyId);
      if (!account) {
        throw new AppError('Account not found', 404);
      }

      // Check for related data
      const [contacts, opportunities] = await Promise.all([
        this.contactRepository.findByAccount(accountId, companyId),
        this.opportunityRepository.findWithFilters(companyId, { account_id: accountId })
      ]);

      if (contacts.length > 0 || opportunities.length > 0) {
        throw new AppError(
          'Cannot delete account with related contacts or opportunities',
          400
        );
      }

      const deleted = await this.accountRepository.delete(accountId, companyId);

      if (deleted) {
        // Emit event
        this.eventEmitter.emit('account:deleted', {
          accountId,
          userId,
          timestamp: new Date()
        });
      }

      return deleted;
    } catch (error) {
      this.logger?.error('Error deleting account', { error, accountId, companyId });
      throw error;
    }
  }

  /**
   * Check for duplicate accounts
   */
  async findDuplicates(name: string, cuit: string | null, companyId: string): Promise<Account[]> {
    try {
      return await this.accountRepository.findDuplicates(name, cuit, companyId);
    } catch (error) {
      this.logger?.error('Error finding duplicate accounts', { error, name, cuit, companyId });
      throw error;
    }
  }

  /**
   * Merge duplicate accounts
   */
  async mergeAccounts(
    primaryAccountId: number,
    duplicateAccountIds: number[],
    companyId: string,
    userId: number
  ): Promise<Account> {
    try {
      const primaryAccount = await this.accountRepository.findById(primaryAccountId, companyId);
      if (!primaryAccount) {
        throw new AppError('Primary account not found', 404);
      }

      // Verify all duplicate accounts exist
      for (const duplicateId of duplicateAccountIds) {
        const duplicate = await this.accountRepository.findById(duplicateId, companyId);
        if (!duplicate) {
          throw new AppError(`Duplicate account ${duplicateId} not found`, 404);
        }
      }

      // Transfer related data from duplicates to primary
      for (const duplicateId of duplicateAccountIds) {
        // Transfer contacts
        const contacts = await this.contactRepository.findByAccount(duplicateId, companyId);
        for (const contact of contacts) {
          await this.contactRepository.update(contact.id!, companyId, {
            account_id: primaryAccountId
          }, userId);
        }

        // Transfer opportunities
        const opportunities = await this.opportunityRepository.findWithFilters(companyId, {
          account_id: duplicateId
        });
        for (const opportunity of opportunities) {
          await this.opportunityRepository.update(opportunity.id!, companyId, {
            account_id: primaryAccountId
          }, userId);
        }

        // Transfer activities
        const activities = await this.activityRepository.findWithFilters(companyId, {
          account_id: duplicateId
        });
        for (const activity of activities) {
          await this.activityRepository.update(activity.id!, companyId, {
            account_id: primaryAccountId
          }, userId);
        }
      }

      // Delete duplicate accounts
      for (const duplicateId of duplicateAccountIds) {
        await this.accountRepository.delete(duplicateId, companyId);
      }

      // Log merge activity
      await this.activityRepository.create({
        company_id: companyId,
        type: 'task',
        subject: 'Accounts merged',
        description: `Merged ${duplicateAccountIds.length} duplicate account(s) into ${primaryAccount.name}`,
        status: 'completed',
        priority: 'low',
        account_id: primaryAccountId,
        assigned_to: userId,
        completed_at: new Date()
      }, userId);

      // Emit event
      this.eventEmitter.emit('accounts:merged', {
        primaryAccountId,
        mergedAccountIds: duplicateAccountIds,
        userId,
        timestamp: new Date()
      });

      const updatedAccount = await this.accountRepository.findById(primaryAccountId, companyId);
      return updatedAccount!;
    } catch (error) {
      this.logger?.error('Error merging accounts', { error, primaryAccountId, duplicateAccountIds });
      throw error;
    }
  }

  /**
   * Update account rating
   */
  async updateAccountRating(
    accountId: number,
    companyId: string,
    rating: string,
    userId: number
  ): Promise<Account> {
    try {
      const account = await this.accountRepository.findById(accountId, companyId);
      if (!account) {
        throw new AppError('Account not found', 404);
      }

      const updated = await this.accountRepository.update(
        accountId,
        companyId,
        { rating: rating as any },
        userId
      );

      if (!updated) {
        throw new AppError('Failed to update account rating', 500);
      }

      // Log rating change
      await this.activityRepository.create({
        company_id: companyId,
        type: 'task',
        subject: 'Account rating updated',
        description: `Account rating changed from ${account.rating || 'none'} to ${rating}`,
        status: 'completed',
        priority: 'low',
        account_id: accountId,
        assigned_to: userId,
        completed_at: new Date()
      }, userId);

      // Emit event
      this.eventEmitter.emit('account:rating:changed', {
        account: updated,
        oldRating: account.rating,
        newRating: rating,
        userId,
        timestamp: new Date()
      });

      return updated;
    } catch (error) {
      this.logger?.error('Error updating account rating', { error, accountId, rating });
      throw error;
    }
  }

  /**
   * Get top accounts by revenue
   */
  async getTopAccounts(companyId: string, limit: number = 10): Promise<AccountWithDetails[]> {
    try {
      const accounts = await this.accountRepository.findWithFilters(companyId, {
        orderBy: 'annual_revenue',
        orderDirection: 'DESC',
        limit,
        status: 'active'
      });

      // Enrich with details
      const enrichedAccounts = await Promise.all(
        accounts.map(account => this.accountRepository.getAccountWithDetails(account.id!, companyId))
      );

      return enrichedAccounts.filter(account => account !== null) as AccountWithDetails[];
    } catch (error) {
      this.logger?.error('Error getting top accounts', { error, companyId, limit });
      throw error;
    }
  }
}