import { injectable } from 'inversify';
import { BaseOmniRepository } from './base/BaseOmniRepository';

interface ContactCreateInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
  notes?: string | null;
  created_by?: string;
}

@injectable()
export class ContactRepository extends BaseOmniRepository<any> {
  protected tableName = 'contacts';

  async findById(id: string, companyId: string): Promise<any | null> {
    return super.findById(id, companyId);
  }

  async findByPhone(companyId: string, phone: string): Promise<any | null> {
    const query = `
      SELECT *
      FROM ${this.tableName}
      WHERE company_id = $1
        AND phone = $2
        AND deleted_at IS NULL
      LIMIT 1
    `;

    const result = await this.executeQuery(query, [companyId, phone], companyId);
    return result.rows[0] || null;
  }

  async createContact(data: ContactCreateInput, companyId: string): Promise<any> {
    const now = new Date();
    const payload: Record<string, any> = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      avatar_url: data.avatar_url,
      tags: data.tags ?? ['whatsapp'],
      custom_fields: data.custom_fields ?? { source: 'whatsapp' },
      notes: data.notes ?? null,
      first_contact_date: now,
      last_contact_date: now,
      lead_status: 'new',
      created_by: data.created_by ?? companyId
    };

    return this.create(payload, companyId);
  }

  async updateLastInteraction(contactId: string, companyId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET
        last_contact_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND company_id = $2
    `;

    await this.executeQuery(query, [contactId, companyId], companyId);
  }
}
