// services/CustomerService.ts
import { injectable, inject } from 'inversify';
import { EventEmitter } from 'events';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { ICustomer, ICustomerIdentity } from '../interfaces/ICustomer';
import { OMNI_TYPES } from '../types/omni.types';

@injectable()
export class CustomerService {
  constructor(
    @inject(OMNI_TYPES.CustomerRepository) private customerRepo: CustomerRepository,
    @inject(OMNI_TYPES.EventEmitter) private eventEmitter: EventEmitter
  ) {}

  async createCustomer(data: Partial<ICustomer>): Promise<ICustomer> {
    // Verificar si ya existe un cliente con el mismo email o teléfono
    if (data.email) {
      const existingByEmail = await this.customerRepo.findByEmail(
        data.companyId!,
        data.email
      );
      if (existingByEmail) {
        throw new Error('Customer with this email already exists');
      }
    }

    if (data.phone) {
      const existingByPhone = await this.customerRepo.findByPhone(
        data.companyId!,
        data.phone
      );
      if (existingByPhone) {
        throw new Error('Customer with this phone already exists');
      }
    }

    const customer = await this.customerRepo.create({
      ...data,
      totalConversations: 0,
      leadScore: 0,
      tags: data.tags || [],
      createdAt: new Date()
    });

    this.eventEmitter.emit('customer.created', {
      customerId: customer.id,
      companyId: customer.companyId,
      customer
    });

    return customer;
  }

  async getCustomer(id: string): Promise<ICustomer | null> {
    return this.customerRepo.findById(id);
  }

  async getCustomers(companyId: string): Promise<ICustomer[]> {
    return this.customerRepo.findAll(companyId);
  }

  async updateCustomer(id: string, data: Partial<ICustomer>): Promise<ICustomer | null> {
    const customer = await this.customerRepo.update(id, data);

    if (customer) {
      this.eventEmitter.emit('customer.updated', {
        customerId: id,
        companyId: customer.companyId,
        changes: data,
        customer
      });
    }

    return customer;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const customer = await this.customerRepo.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const result = await this.customerRepo.delete(id);

    if (result) {
      this.eventEmitter.emit('customer.deleted', {
        customerId: id,
        companyId: customer.companyId
      });
    }

    return result;
  }

  async findOrCreateByChannelIdentity(
    channelId: string,
    externalId: string,
    customerData?: Partial<ICustomer>
  ): Promise<ICustomer> {
    // Buscar cliente existente por identidad de canal
    let customer = await this.customerRepo.findByChannelIdentity(channelId, externalId);

    if (!customer && customerData) {
      // Crear nuevo cliente
      customer = await this.createCustomer(customerData);

      // Crear identidad de canal
      await this.createCustomerIdentity({
        customerId: customer.id,
        channelId,
        externalId,
        isActive: true,
        firstInteractionAt: new Date(),
        lastInteractionAt: new Date()
      });
    }

    if (!customer) {
      throw new Error('Customer not found and no data provided to create one');
    }

    return customer;
  }

  async createCustomerIdentity(data: Partial<ICustomerIdentity>): Promise<ICustomerIdentity> {
    const identity = await this.customerRepo.createIdentity(data);

    this.eventEmitter.emit('customer.identity.created', {
      identityId: identity.id,
      customerId: identity.customerId,
      channelId: identity.channelId
    });

    return identity;
  }

  async getCustomerIdentities(customerId: string): Promise<ICustomerIdentity[]> {
    return this.customerRepo.findIdentitiesByCustomer(customerId);
  }

  async searchCustomers(
    companyId: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<ICustomer[]> {
    return this.customerRepo.searchCustomers(companyId, searchTerm, limit);
  }

  async updateConversationCount(customerId: string): Promise<void> {
    await this.customerRepo.updateConversationCount(customerId);
  }

  async addTagsToCustomer(customerId: string, tags: string[]): Promise<ICustomer | null> {
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) {
      return null;
    }

    const updatedTags = [...new Set([...customer.tags, ...tags])];
    return this.updateCustomer(customerId, { tags: updatedTags });
  }

  async removeTagsFromCustomer(
    customerId: string,
    tagsToRemove: string[]
  ): Promise<ICustomer | null> {
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) {
      return null;
    }

    const updatedTags = customer.tags.filter(tag => !tagsToRemove.includes(tag));
    return this.updateCustomer(customerId, { tags: updatedTags });
  }

  async updateLeadScore(customerId: string, score: number): Promise<ICustomer | null> {
    const customer = await this.updateCustomer(customerId, { leadScore: score });

    if (customer) {
      this.eventEmitter.emit('customer.lead.score.updated', {
        customerId,
        oldScore: customer.leadScore,
        newScore: score,
        customer
      });
    }

    return customer;
  }

  async updateLeadStatus(customerId: string, status: string): Promise<ICustomer | null> {
    const customer = await this.updateCustomer(customerId, { leadStatus: status });

    if (customer) {
      this.eventEmitter.emit('customer.lead.status.updated', {
        customerId,
        newStatus: status,
        customer
      });
    }

    return customer;
  }

  async mergeCustomers(
    primaryCustomerId: string,
    secondaryCustomerId: string
  ): Promise<ICustomer | null> {
    const [primaryCustomer, secondaryCustomer] = await Promise.all([
      this.customerRepo.findById(primaryCustomerId),
      this.customerRepo.findById(secondaryCustomerId)
    ]);

    if (!primaryCustomer || !secondaryCustomer) {
      throw new Error('One or both customers not found');
    }

    // Combinar datos
    const mergedData: Partial<ICustomer> = {
      tags: [...new Set([...primaryCustomer.tags, ...secondaryCustomer.tags])],
      totalConversations: primaryCustomer.totalConversations + secondaryCustomer.totalConversations,
      leadScore: Math.max(primaryCustomer.leadScore, secondaryCustomer.leadScore),
      notes: [primaryCustomer.notes, secondaryCustomer.notes]
        .filter(Boolean)
        .join('\n---\n'),
      customFields: {
        ...secondaryCustomer.customFields,
        ...primaryCustomer.customFields
      }
    };

    // Actualizar cliente principal
    const mergedCustomer = await this.updateCustomer(primaryCustomerId, mergedData);

    // Transferir identidades del cliente secundario al principal
    const secondaryIdentities = await this.customerRepo.findIdentitiesByCustomer(
      secondaryCustomerId
    );

    for (const identity of secondaryIdentities) {
      await this.customerRepo.createIdentity({
        ...identity,
        customerId: primaryCustomerId
      });
    }

    // Eliminar cliente secundario
    await this.deleteCustomer(secondaryCustomerId);

    if (mergedCustomer) {
      this.eventEmitter.emit('customer.merged', {
        primaryCustomerId,
        secondaryCustomerId,
        mergedCustomer
      });
    }

    return mergedCustomer;
  }

  async getCustomerStats(companyId: string): Promise<any> {
    const customers = await this.customerRepo.findAll(companyId);

    const stats = {
      total: customers.length,
      byLeadStatus: {} as Record<string, number>,
      averageLeadScore: 0,
      totalConversations: 0
    };

    customers.forEach(customer => {
      if (customer.leadStatus) {
        stats.byLeadStatus[customer.leadStatus] =
          (stats.byLeadStatus[customer.leadStatus] || 0) + 1;
      }
      stats.totalConversations += customer.totalConversations;
    });

    stats.averageLeadScore = customers.length > 0
      ? customers.reduce((sum, c) => sum + c.leadScore, 0) / customers.length
      : 0;

    return stats;
  }
}