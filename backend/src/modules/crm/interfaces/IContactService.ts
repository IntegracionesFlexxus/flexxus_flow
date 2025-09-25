/**
 * Contact Service Interface
 */

import {
  Contact,
  ContactCreateDTO,
  ContactUpdateDTO,
  ContactFilter,
  ContactWithDetails
} from '../types/contact.types';
import { PaginatedResponse } from '../types/crm.types';

export interface IContactService {
  /**
   * Create a new contact
   */
  createContact(data: ContactCreateDTO, userId: number): Promise<Contact>;

  /**
   * Update an existing contact
   */
  updateContact(id: number, companyId: number, data: ContactUpdateDTO, userId: number): Promise<Contact | null>;

  /**
   * Get contact by ID
   */
  getContactById(id: number, companyId: number): Promise<ContactWithDetails | null>;

  /**
   * List contacts with filters
   */
  listContacts(companyId: number, filters?: ContactFilter): Promise<PaginatedResponse<ContactWithDetails>>;

  /**
   * Get contacts by account
   */
  getContactsByAccount(accountId: number, companyId: number): Promise<Contact[]>;

  /**
   * Set primary contact for account
   */
  setPrimaryContact(contactId: number, accountId: number, companyId: number, userId: number): Promise<boolean>;

  /**
   * Get contact hierarchy
   */
  getContactHierarchy(contactId: number, companyId: number): Promise<Contact[]>;

  /**
   * Delete contact
   */
  deleteContact(contactId: number, companyId: number, userId: number): Promise<boolean>;

  /**
   * Check for duplicate contacts
   */
  findDuplicates(email: string, companyId: number): Promise<Contact[]>;

  /**
   * Merge duplicate contacts
   */
  mergeContacts(
    primaryContactId: number,
    duplicateContactIds: number[],
    companyId: number,
    userId: number
  ): Promise<Contact>;

  /**
   * Get birthday contacts
   */
  getBirthdayContacts(companyId: number, daysAhead?: number): Promise<Contact[]>;
}