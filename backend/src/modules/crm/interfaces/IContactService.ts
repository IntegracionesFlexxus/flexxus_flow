/**
 * Contact Service Interface
 */

// TODO: Create missing types file
// import {
//   Contact,
//   ContactCreateDTO,
//   ContactUpdateDTO,
//   ContactFilter,
//   ContactWithDetails
// } from '../types/contact.types';
import { PaginatedResponse } from '../types/crm.types';

export interface IContactService {
  /**
   * Create a new contact
   */
  createContact(data: any, userId: number): Promise<any>;

  /**
   * Update an existing contact
   */
  updateContact(id: number, companyId: number, data: any, userId: number): Promise<any | null>;

  /**
   * Get contact by ID
   */
  getContactById(id: number, companyId: number): Promise<any | null>;

  /**
   * List contacts with filters
   */
  listContacts(companyId: number, filters?: any): Promise<PaginatedResponse<any>>;

  /**
   * Get contacts by account
   */
  getContactsByAccount(accountId: number, companyId: number): Promise<any[]>;

  /**
   * Set primary contact for account
   */
  setPrimaryContact(contactId: number, accountId: number, companyId: number, userId: number): Promise<boolean>;

  /**
   * Get contact hierarchy
   */
  getContactHierarchy(contactId: number, companyId: number): Promise<any[]>;

  /**
   * Delete contact
   */
  deleteContact(contactId: number, companyId: number, userId: number): Promise<boolean>;

  /**
   * Check for duplicate contacts
   */
  findDuplicates(email: string, companyId: number): Promise<any[]>;

  /**
   * Merge duplicate contacts
   */
  mergeContacts(
    primaryContactId: number,
    duplicateContactIds: number[],
    companyId: number,
    userId: number
  ): Promise<any>;

  /**
   * Get birthday contacts
   */
  getBirthdayContacts(companyId: number, daysAhead?: number): Promise<any[]>;
}