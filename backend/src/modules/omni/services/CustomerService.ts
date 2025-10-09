/**
 * Customer Service - Sprint 05
 * Business logic for managing omnichannel customers
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { ICustomer, ICustomerCreate, ICustomerUpdate } from '../interfaces/ICustomer';
import winston from 'winston';

@injectable()
export class CustomerService {
  constructor(
    @inject(TYPES.OmniCustomerRepository) private customerRepository: CustomerRepository,
    @inject(TYPES.Logger) private logger: winston.Logger
  ) {}

  /**
   * Create a new customer
   */
  async createCustomer(data: ICustomerCreate, companyId: string): Promise<ICustomer> {
    try {
      this.logger.info('Creating new customer', {
        email: data.email,
        phone: data.phone,
        companyId
      });

      // Check if customer already exists with email or phone
      if (data.email) {
        const existingByEmail = await this.customerRepository.findByEmail(data.email, companyId);
        if (existingByEmail) {
          throw new Error(`Customer with email ${data.email} already exists`);
        }
      }

      if (data.phone) {
        const existingByPhone = await this.customerRepository.findByPhone(data.phone, companyId);
        if (existingByPhone) {
          throw new Error(`Customer with phone ${data.phone} already exists`);
        }
      }

      // Create customer
      const customer = await this.customerRepository.create(data, companyId);

      this.logger.info('Customer created successfully', {
        customerId: customer.id,
        email: customer.email
      });

      return customer;
    } catch (error) {
      this.logger.error('Failed to create customer', { error, data });
      throw error;
    }
  }

  /**
   * Search customers
   */
  async searchCustomers(filters: any, companyId: string): Promise<ICustomer[]> {
    try {
      this.logger.info('Searching customers', { filters, companyId });

      const customers = await this.customerRepository.search(filters, companyId);
      return customers || [];
    } catch (error) {
      this.logger.error('Failed to search customers', { error, filters });
      return [];
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(customerId: string, companyId: string): Promise<ICustomer | null> {
    try {
      const customer = await this.customerRepository.findById(customerId, companyId);
      return customer;
    } catch (error) {
      this.logger.error('Failed to get customer by ID', { error, customerId, companyId });
      throw error;
    }
  }

  /**
   * Get customer by email
   */
  async getCustomerByEmail(email: string, companyId: string): Promise<ICustomer | null> {
    try {
      const customer = await this.customerRepository.findByEmail(email, companyId);
      return customer;
    } catch (error) {
      this.logger.error('Failed to get customer by email', { error, email, companyId });
      throw error;
    }
  }

  /**
   * Get customer by phone
   */
  async getCustomerByPhone(phone: string, companyId: string): Promise<ICustomer | null> {
    try {
      const customer = await this.customerRepository.findByPhone(phone, companyId);
      return customer;
    } catch (error) {
      this.logger.error('Failed to get customer by phone', { error, phone, companyId });
      throw error;
    }
  }

  /**
   * Update customer
   */
  async updateCustomer(
    customerId: string,
    data: ICustomerUpdate,
    companyId: string
  ): Promise<ICustomer | null> {
    try {
      this.logger.info('Updating customer', { customerId, companyId });

      // Check if customer exists
      const existingCustomer = await this.customerRepository.findById(customerId, companyId);
      if (!existingCustomer) {
        return null;
      }

      // Check for duplicate email if being updated
      if (data.email && data.email !== existingCustomer.email) {
        const existingByEmail = await this.customerRepository.findByEmail(data.email, companyId);
        if (existingByEmail && existingByEmail.id !== customerId) {
          throw new Error(`Customer with email ${data.email} already exists`);
        }
      }

      // Check for duplicate phone if being updated
      if (data.phone && data.phone !== existingCustomer.phone) {
        const existingByPhone = await this.customerRepository.findByPhone(data.phone, companyId);
        if (existingByPhone && existingByPhone.id !== customerId) {
          throw new Error(`Customer with phone ${data.phone} already exists`);
        }
      }

      // Update customer
      const updated = await this.customerRepository.update(customerId, data, companyId);

      if (updated) {
        const customer = await this.customerRepository.findById(customerId, companyId);
        this.logger.info('Customer updated successfully', { customerId });
        return customer;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to update customer', { error, customerId });
      throw error;
    }
  }

  /**
   * Merge duplicate customers
   */
  async mergeCustomers(
    primaryId: string,
    duplicateId: string,
    companyId: string
  ): Promise<boolean> {
    try {
      this.logger.info('Merging customers', { primaryId, duplicateId, companyId });

      // Get both customers
      const primaryCustomer = await this.customerRepository.findById(primaryId, companyId);
      const duplicateCustomer = await this.customerRepository.findById(duplicateId, companyId);

      if (!primaryCustomer || !duplicateCustomer) {
        throw new Error('One or both customers not found');
      }

      // Merge data (prefer primary customer data, fill in missing from duplicate)
      const mergedData: ICustomerUpdate = {
        first_name: primaryCustomer.first_name || duplicateCustomer.first_name,
        last_name: primaryCustomer.last_name || duplicateCustomer.last_name,
        email: primaryCustomer.email || duplicateCustomer.email,
        phone: primaryCustomer.phone || duplicateCustomer.phone,
        avatar_url: primaryCustomer.avatar_url || duplicateCustomer.avatar_url,
        attributes: {
          ...duplicateCustomer.attributes,
          ...primaryCustomer.attributes
        },
        tags: [...new Set([
          ...(primaryCustomer.tags || []),
          ...(duplicateCustomer.tags || [])
        ])],
        metadata: {
          ...duplicateCustomer.metadata,
          ...primaryCustomer.metadata,
          merged_from: duplicateId,
          merged_at: new Date().toISOString()
        }
      };

      // Update primary customer with merged data
      await this.customerRepository.update(primaryId, mergedData, companyId);

      // TODO: Transfer all conversations and messages from duplicate to primary

      // Delete duplicate customer
      await this.customerRepository.delete(duplicateId, companyId);

      this.logger.info('Customers merged successfully', { primaryId, duplicateId });
      return true;
    } catch (error) {
      this.logger.error('Failed to merge customers', { error, primaryId, duplicateId });
      throw error;
    }
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(customerId: string, companyId: string): Promise<any> {
    try {
      const stats = await this.customerRepository.getCustomerStats(customerId, companyId);

      // Add calculated metrics
      const enhancedStats = {
        ...stats,
        avgResponseTime: stats.totalMessages && stats.totalResponseTime
          ? Math.round(stats.totalResponseTime / stats.totalMessages)
          : 0,
        satisfactionScore: stats.totalRatings && stats.totalRatingScore
          ? (stats.totalRatingScore / stats.totalRatings).toFixed(1)
          : null,
        engagementRate: stats.totalConversations && stats.totalMessagesReceived
          ? ((stats.totalMessagesReceived / stats.totalConversations) * 100).toFixed(1)
          : 0
      };

      return enhancedStats;
    } catch (error) {
      this.logger.error('Failed to get customer stats', { error, customerId });
      throw error;
    }
  }

  /**
   * Add tags to customer
   */
  async addTags(customerId: string, tags: string[], companyId: string): Promise<boolean> {
    try {
      this.logger.info('Adding tags to customer', { customerId, tags, companyId });

      const customer = await this.customerRepository.findById(customerId, companyId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const updatedTags = [...new Set([...(customer.tags || []), ...tags])];

      const updated = await this.customerRepository.update(
        customerId,
        { tags: updatedTags },
        companyId
      );

      if (updated) {
        this.logger.info('Tags added successfully', { customerId, tags });
      }

      return updated;
    } catch (error) {
      this.logger.error('Failed to add tags', { error, customerId, tags });
      throw error;
    }
  }

  /**
   * Remove tags from customer
   */
  async removeTags(customerId: string, tags: string[], companyId: string): Promise<boolean> {
    try {
      this.logger.info('Removing tags from customer', { customerId, tags, companyId });

      const customer = await this.customerRepository.findById(customerId, companyId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const updatedTags = (customer.tags || []).filter(tag => !tags.includes(tag));

      const updated = await this.customerRepository.update(
        customerId,
        { tags: updatedTags },
        companyId
      );

      if (updated) {
        this.logger.info('Tags removed successfully', { customerId, tags });
      }

      return updated;
    } catch (error) {
      this.logger.error('Failed to remove tags', { error, customerId, tags });
      throw error;
    }
  }

  /**
   * Get or create customer by identifier
   */
  async getOrCreateCustomer(
    identifier: { email?: string; phone?: string; externalId?: string },
    data: Partial<ICustomerCreate>,
    companyId: string
  ): Promise<ICustomer> {
    try {
      // Try to find existing customer
      let customer: ICustomer | null = null;

      if (identifier.email) {
        customer = await this.customerRepository.findByEmail(identifier.email, companyId);
      }

      if (!customer && identifier.phone) {
        customer = await this.customerRepository.findByPhone(identifier.phone, companyId);
      }

      if (!customer && identifier.externalId) {
        customer = await this.customerRepository.findByExternalId(identifier.externalId, companyId);
      }

      // If customer exists, update with any new data
      if (customer) {
        const updateData: ICustomerUpdate = {};
        if (data.first_name && !customer.first_name) updateData.first_name = data.first_name;
        if (data.last_name && !customer.last_name) updateData.last_name = data.last_name;
        if (data.email && !customer.email) updateData.email = data.email;
        if (data.phone && !customer.phone) updateData.phone = data.phone;

        if (Object.keys(updateData).length > 0) {
          await this.customerRepository.update(customer.id, updateData, companyId);
          customer = await this.customerRepository.findById(customer.id, companyId);
        }

        return customer!;
      }

      // Create new customer
      const createData: ICustomerCreate = {
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: identifier.email || data.email || '',
        phone: identifier.phone || data.phone || '',
        external_id: identifier.externalId,
        attributes: data.attributes || {},
        tags: data.tags || [],
        metadata: data.metadata || {}
      };

      customer = await this.customerRepository.create(createData, companyId);

      this.logger.info('Customer created or retrieved', {
        customerId: customer.id,
        email: customer.email
      });

      return customer;
    } catch (error) {
      this.logger.error('Failed to get or create customer', { error, identifier });
      throw error;
    }
  }

  /**
   * Get customers with recent activity
   */
  async getRecentlyActiveCustomers(companyId: string, limit: number = 10): Promise<ICustomer[]> {
    try {
      const customers = await this.customerRepository.findRecentlyActive(companyId, limit);
      return customers || [];
    } catch (error) {
      this.logger.error('Failed to get recently active customers', { error, companyId });
      return [];
    }
  }

  /**
   * Delete customer
   */
  async deleteCustomer(customerId: string, companyId: string): Promise<boolean> {
    try {
      this.logger.info('Deleting customer', { customerId, companyId });

      const deleted = await this.customerRepository.delete(customerId, companyId);

      if (deleted) {
        this.logger.info('Customer deleted successfully', { customerId });
      }

      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete customer', { error, customerId });
      throw error;
    }
  }
}