// repositories/CustomerRepository.ts
import { injectable, inject } from 'inversify';
import { BaseOmniRepository } from './BaseOmniRepository';
import { ICustomer, ICustomerIdentity } from '../interfaces/ICustomer';
import { OMNI_TYPES } from '../types/omni.types';

@injectable()
export class CustomerRepository {
  constructor(@inject(OMNI_TYPES.BaseOmniRepository) private baseRepo: BaseOmniRepository<ICustomer>) {}

  private get tableName(): string {
    return 'contacts';
  }

  async findByEmail(companyId: string, email: string): Promise<ICustomer | null> {
    const query = `
      SELECT * FROM contacts
      WHERE company_id = $1 AND email = $2 AND deleted_at IS NULL
      LIMIT 1
    `;
    const results = await this.baseRepo.executeQuery<ICustomer>(this.tableName, query, [companyId, email]);
    return results[0] || null;
  }

  async findByPhone(companyId: string, phone: string): Promise<ICustomer | null> {
    const query = `
      SELECT * FROM contacts
      WHERE company_id = $1 AND phone = $2 AND deleted_at IS NULL
      LIMIT 1
    `;
    const results = await this.baseRepo.executeQuery<ICustomer>(this.tableName, query, [companyId, phone]);
    return results[0] || null;
  }

  async findByChannelIdentity(
    channelId: string,
    externalId: string
  ): Promise<ICustomer | null> {
    const query = `
      SELECT c.* FROM contacts c
      JOIN contact_identities ci ON c.id = ci.contact_id
      WHERE ci.channel_id = $1 AND ci.external_id = $2 AND c.deleted_at IS NULL
      LIMIT 1
    `;
    const results = await this.baseRepo.executeQuery<ICustomer>(this.tableName, query, [channelId, externalId]);
    return results[0] || null;
  }

  async createIdentity(data: Partial<ICustomerIdentity>): Promise<ICustomerIdentity> {
    return this.baseRepo.create<ICustomerIdentity>('contact_identities', data);
  }

  async findIdentitiesByCustomer(customerId: string): Promise<ICustomerIdentity[]> {
    const query = `
      SELECT ci.*, ch.name as channel_name, ct.name as channel_type
      FROM contact_identities ci
      JOIN channels ch ON ci.channel_id = ch.id
      JOIN channel_types ct ON ch.channel_type_id = ct.id
      WHERE ci.contact_id = $1 AND ci.is_active = true
    `;
    return this.baseRepo.executeQuery<ICustomerIdentity>('contact_identities', query, [customerId]);
  }

  async updateConversationCount(customerId: string): Promise<void> {
    const query = `
      UPDATE contacts
      SET total_conversations = (
        SELECT COUNT(*) FROM conversations WHERE contact_id = $1
      ),
      last_contact_date = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await this.baseRepo.executeQuery(this.tableName, query, [customerId]);
  }

  async searchCustomers(
    companyId: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<ICustomer[]> {
    const query = `
      SELECT * FROM contacts
      WHERE company_id = $1
        AND deleted_at IS NULL
        AND (
          first_name ILIKE $2 OR
          last_name ILIKE $2 OR
          email ILIKE $2 OR
          phone ILIKE $2
        )
      ORDER BY last_contact_date DESC NULLS LAST
      LIMIT $3
    `;
    const searchPattern = `%${searchTerm}%`;
    return this.baseRepo.executeQuery<ICustomer>(this.tableName, query, [companyId, searchPattern, limit]);
  }

  async findById(id: string): Promise<ICustomer | null> {
    return this.baseRepo.findById<ICustomer>(this.tableName, id);
  }

  async findAll(companyId: string): Promise<ICustomer[]> {
    return this.baseRepo.findAll<ICustomer>(this.tableName, companyId);
  }

  async create(data: Partial<ICustomer>): Promise<ICustomer> {
    return this.baseRepo.create<ICustomer>(this.tableName, data);
  }

  async update(id: string, data: Partial<ICustomer>): Promise<ICustomer | null> {
    return this.baseRepo.update<ICustomer>(this.tableName, id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.baseRepo.delete(this.tableName, id);
  }
}