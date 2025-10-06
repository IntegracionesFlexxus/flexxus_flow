/**
 * Contact Service
 * Business logic for contact management
 */

import { injectable, inject } from 'inversify';
import { IContactService } from '../interfaces/IContactService';
import {
  Contact,
  ContactCreateDTO,
  ContactUpdateDTO,
  ContactFilter,
  ContactWithDetails
} from '../types/contact.types';
import { PaginatedResponse } from '../types/crm.types';
import { ContactRepository } from '../repositories/ContactRepository';
import { ActivityRepository } from '../repositories/ActivityRepository';
import { TYPES } from '@/container/types';
import { AppError, ErrorCode } from '@/shared/errors/AppError';
import { EventEmitter } from 'events';
import { CrossDatabaseService } from '@/shared/services/cross-database/CrossDatabaseService';

@injectable()
export class ContactService implements IContactService {
  constructor(
    @inject(TYPES.ContactRepository) private contactRepository: ContactRepository,
    @inject(TYPES.ActivityRepository) private activityRepository: ActivityRepository,
    @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter,
    @inject(TYPES.CrossDatabaseService) private crossDatabaseService: CrossDatabaseService,
    @inject(TYPES.Logger) private logger?: any
  ) {}

  /**
   * Create a new contact
   */
  async createContact(data: ContactCreateDTO, userId: number): Promise<Contact> {
    try {
      // Check for duplicates
      if (data.email) {
        const existingContact = await this.contactRepository.findByEmail(data.email, data.company_id);
        if (existingContact) {
          throw new AppError(ErrorCode.RESOURCE_ALREADY_EXISTS, 'A contact with this email already exists', 409);
        }
      }

      // If marked as primary, unset other primary contacts
      if (data.is_primary && data.account_id) {
        await this.contactRepository.setPrimaryContact(0, data.account_id, data.company_id);
      }

      // Create contact
      const contact = await this.contactRepository.create(data, userId);

      // Emit event
      this.eventEmitter.emit('contact:created', {
        contact,
        userId,
        timestamp: new Date()
      });

      // Create welcome activity
      await this.activityRepository.create({
        company_id: data.company_id,
        type: 'task',
        subject: `New contact added: ${contact.first_name} ${contact.last_name || ''}`,
        description: 'Review contact information and plan engagement',
        status: 'pending',
        priority: 'low',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        contact_id: contact.id,
        account_id: data.account_id,
        assigned_to: userId
      }, userId);

      return contact;
    } catch (error) {
      this.logger?.error('Error creating contact', { error, data });
      throw error;
    }
  }

  /**
   * Update an existing contact
   */
  async updateContact(
    id: number,
    companyId: number,
    data: ContactUpdateDTO,
    userId: number
  ): Promise<Contact | null> {
    try {
      const existingContact = await this.contactRepository.findById(id, String(companyId));
      if (!existingContact) {
        return null;
      }

      // Check email uniqueness if being updated
      if (data.email && data.email !== existingContact.email) {
        const duplicate = await this.contactRepository.findByEmail(data.email, companyId);
        if (duplicate && duplicate.id !== id) {
          throw new AppError(ErrorCode.RESOURCE_ALREADY_EXISTS, 'A contact with this email already exists', 409);
        }
      }

      // Handle primary contact change
      if (data.is_primary === true && existingContact.account_id) {
        await this.contactRepository.setPrimaryContact(id, existingContact.account_id, companyId);
      }

      // Update contact
      const updated = await this.contactRepository.update(id, String(companyId), data, userId);

      if (updated) {
        this.eventEmitter.emit('contact:updated', {
          contact: updated,
          changes: data,
          userId,
          timestamp: new Date()
        });
      }

      return updated;
    } catch (error) {
      this.logger?.error('Error updating contact', { error, id, data });
      throw error;
    }
  }

  /**
   * Get contact by ID
   */
  async getContactById(id: number, companyId: number): Promise<ContactWithDetails | null> {
    try {
      const contact = await this.contactRepository.getContactWithDetails(id, companyId);

      if (!contact) {
        return null;
      }

      // Enrich with user data using CrossDatabaseService
      const [enrichedContact] = await this.crossDatabaseService.enrichWithUserData([contact]);

      return enrichedContact;
    } catch (error) {
      this.logger?.error('Error getting contact', { error, id, companyId });
      throw error;
    }
  }

  /**
   * List contacts with filters
   */
  async listContacts(companyId: number, filters?: ContactFilter): Promise<PaginatedResponse<ContactWithDetails>> {
    try {
      const [contacts, total] = await Promise.all([
        this.contactRepository.findWithFilters(companyId, filters || {}),
        this.contactRepository.countWithFilters(companyId, filters || {})
      ]);

      const enrichedContacts = await Promise.all(
        contacts.map(contact => this.contactRepository.getContactWithDetails(contact.id!, companyId))
      );

      // Filter out null values
      const validContacts = enrichedContacts.filter(contact => contact !== null) as ContactWithDetails[];

      // Enrich with user data using CrossDatabaseService
      const contactsWithUserData = await this.crossDatabaseService.enrichWithUserData(validContacts);

      return {
        data: contactsWithUserData,
        total,
        page: filters?.page || 1,
        limit: filters?.limit || 20,
        totalPages: Math.ceil(total / (filters?.limit || 20))
      };
    } catch (error) {
      this.logger?.error('Error listing contacts', { error, companyId, filters });
      throw error;
    }
  }

  /**
   * Get contacts by account
   */
  async getContactsByAccount(accountId: number, companyId: number): Promise<Contact[]> {
    try {
      return await this.contactRepository.findByAccount(accountId, companyId);
    } catch (error) {
      this.logger?.error('Error getting contacts by account', { error, accountId, companyId });
      throw error;
    }
  }

  /**
   * Set primary contact for account
   */
  async setPrimaryContact(contactId: number, accountId: number, companyId: number, userId: number): Promise<boolean> {
    try {
      const contact = await this.contactRepository.findById(contactId, String(companyId));
      if (!contact || contact.account_id !== accountId) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Contact not found or does not belong to account', 404);
      }

      const result = await this.contactRepository.setPrimaryContact(contactId, accountId, companyId);

      if (result) {
        this.eventEmitter.emit('contact:primary:changed', {
          contactId,
          accountId,
          userId,
          timestamp: new Date()
        });
      }

      return result;
    } catch (error) {
      this.logger?.error('Error setting primary contact', { error, contactId, accountId });
      throw error;
    }
  }

  /**
   * Get contact hierarchy
   */
  async getContactHierarchy(contactId: number, companyId: number): Promise<Contact[]> {
    try {
      return await this.contactRepository.getContactHierarchy(contactId, companyId);
    } catch (error) {
      this.logger?.error('Error getting contact hierarchy', { error, contactId, companyId });
      throw error;
    }
  }

  /**
   * Delete contact
   */
  async deleteContact(contactId: number, companyId: number, userId: number): Promise<boolean> {
    try {
      const contact = await this.contactRepository.findById(contactId, String(companyId));
      if (!contact) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Contact not found', 404);
      }

      const deleted = await this.contactRepository.delete(contactId, String(companyId));

      if (deleted) {
        this.eventEmitter.emit('contact:deleted', {
          contactId,
          userId,
          timestamp: new Date()
        });
      }

      return deleted;
    } catch (error) {
      this.logger?.error('Error deleting contact', { error, contactId, companyId });
      throw error;
    }
  }

  /**
   * Check for duplicate contacts
   */
  async findDuplicates(email: string, companyId: number): Promise<Contact[]> {
    try {
      return await this.contactRepository.findDuplicates(email, companyId);
    } catch (error) {
      this.logger?.error('Error finding duplicate contacts', { error, email, companyId });
      throw error;
    }
  }

  /**
   * Merge duplicate contacts
   */
  async mergeContacts(
    primaryContactId: number,
    duplicateContactIds: number[],
    companyId: number,
    userId: number
  ): Promise<Contact> {
    try {
      const primaryContact = await this.contactRepository.findById(primaryContactId, String(companyId));
      if (!primaryContact) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Primary contact not found', 404);
      }

      // Verify duplicates exist
      for (const duplicateId of duplicateContactIds) {
        const duplicate = await this.contactRepository.findById(duplicateId, String(companyId));
        if (!duplicate) {
          throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, `Duplicate contact ${duplicateId} not found`, 404);
        }
      }

      // Transfer activities
      for (const duplicateId of duplicateContactIds) {
        const activities = await this.activityRepository.findWithFilters(companyId, {
          contact_id: duplicateId
        });

        for (const activity of activities) {
          await this.activityRepository.update(activity.id!, String(companyId), {
            contact_id: primaryContactId
          }, userId);
        }
      }

      // Delete duplicates
      for (const duplicateId of duplicateContactIds) {
        await this.contactRepository.delete(duplicateId, String(companyId));
      }

      this.eventEmitter.emit('contacts:merged', {
        primaryContactId,
        mergedContactIds: duplicateContactIds,
        userId,
        timestamp: new Date()
      });

      const updatedContact = await this.contactRepository.findById(primaryContactId, String(companyId));
      return updatedContact!;
    } catch (error) {
      this.logger?.error('Error merging contacts', { error, primaryContactId, duplicateContactIds });
      throw error;
    }
  }

  /**
   * Get birthday contacts
   */
  async getBirthdayContacts(companyId: number, daysAhead: number = 7): Promise<Contact[]> {
    try {
      return await this.contactRepository.getBirthdayContacts(companyId, daysAhead);
    } catch (error) {
      this.logger?.error('Error getting birthday contacts', { error, companyId, daysAhead });
      throw error;
    }
  }
}