/**
 * Account Service Interface
 */

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

export interface IAccountService {
  /**
   * Create a new account
   */
  createAccount(data: AccountCreateDTO, userId: number): Promise<Account>;

  /**
   * Update an existing account
   */
  updateAccount(id: number, companyId: string, data: AccountUpdateDTO, userId: number): Promise<Account | null>;

  /**
   * Get account by ID
   */
  getAccountById(id: number, companyId: string): Promise<AccountWithDetails | null>;

  /**
   * List accounts with filters
   */
  listAccounts(companyId: string, filters?: AccountFilter): Promise<PaginatedResponse<AccountWithDetails>>;

  /**
   * Get account hierarchy
   */
  getAccountHierarchy(accountId: number, companyId: string): Promise<AccountHierarchy | null>;

  /**
   * Get account metrics
   */
  getAccountMetrics(companyId: string): Promise<AccountMetrics>;

  /**
   * Delete account
   */
  deleteAccount(accountId: number, companyId: string, userId: number): Promise<boolean>;

  /**
   * Check for duplicate accounts
   */
  findDuplicates(name: string, cuit: string | null, companyId: string): Promise<Account[]>;

  /**
   * Merge duplicate accounts
   */
  mergeAccounts(
    primaryAccountId: number,
    duplicateAccountIds: number[],
    companyId: string,
    userId: number
  ): Promise<Account>;

  /**
   * Update account rating
   */
  updateAccountRating(accountId: number, companyId: string, rating: string, userId: number): Promise<Account>;

  /**
   * Get top accounts by revenue
   */
  getTopAccounts(companyId: string, limit?: number): Promise<AccountWithDetails[]>;
}