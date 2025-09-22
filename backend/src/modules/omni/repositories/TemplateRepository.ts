// repositories/TemplateRepository.ts
import { injectable, inject } from 'inversify';
import { BaseOmniRepository } from './BaseOmniRepository';
import { ITemplate, IAutoResponse } from '../interfaces/ITemplate';
import { OMNI_TYPES } from '../types/omni.types';

@injectable()
export class TemplateRepository {
  constructor(@inject(OMNI_TYPES.BaseOmniRepository) private baseRepo: BaseOmniRepository<ITemplate>) {}

  private get tableName(): string {
    return 'message_templates';
  }

  async findByCategory(companyId: string, category: string): Promise<ITemplate[]> {
    const query = `
      SELECT * FROM message_templates
      WHERE company_id = $1 AND category = $2 AND is_active = true AND deleted_at IS NULL
      ORDER BY usage_count DESC, name ASC
    `;
    return this.baseRepo.executeQuery<ITemplate>(this.tableName, query, [companyId, category]);
  }

  async findByChannelType(companyId: string, channelType: string): Promise<ITemplate[]> {
    const query = `
      SELECT * FROM message_templates
      WHERE company_id = $1 AND $2 = ANY(channel_types) AND is_active = true AND deleted_at IS NULL
      ORDER BY usage_count DESC, name ASC
    `;
    return this.baseRepo.executeQuery<ITemplate>(this.tableName, query, [companyId, channelType]);
  }

  async incrementUsage(templateId: string): Promise<void> {
    const query = `
      UPDATE message_templates
      SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await this.baseRepo.executeQuery(this.tableName, query, [templateId]);
  }

  async findPublicTemplates(companyId: string): Promise<ITemplate[]> {
    const query = `
      SELECT * FROM message_templates
      WHERE (company_id = $1 OR is_public = true) AND is_active = true AND deleted_at IS NULL
      ORDER BY is_public ASC, usage_count DESC, name ASC
    `;
    return this.baseRepo.executeQuery<ITemplate>(this.tableName, query, [companyId]);
  }

  async searchTemplates(
    companyId: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<ITemplate[]> {
    const query = `
      SELECT * FROM message_templates
      WHERE company_id = $1
        AND deleted_at IS NULL
        AND is_active = true
        AND (
          name ILIKE $2 OR
          description ILIKE $2 OR
          content ILIKE $2
        )
      ORDER BY usage_count DESC
      LIMIT $3
    `;
    const searchPattern = `%${searchTerm}%`;
    return this.baseRepo.executeQuery<ITemplate>(this.tableName, query, [companyId, searchPattern, limit]);
  }

  // Auto Response methods
  async createAutoResponse(data: Partial<IAutoResponse>): Promise<IAutoResponse> {
    return this.baseRepo.create<IAutoResponse>('auto_responses', data);
  }

  async findAutoResponsesByChannel(channelId: string): Promise<IAutoResponse[]> {
    const query = `
      SELECT ar.*, mt.content as template_content
      FROM auto_responses ar
      JOIN message_templates mt ON ar.template_id = mt.id
      WHERE (ar.channel_id = $1 OR ar.channel_id IS NULL) AND ar.is_active = true AND ar.deleted_at IS NULL
      ORDER BY ar.trigger_type, ar.name
    `;
    return this.baseRepo.executeQuery<IAutoResponse>('auto_responses', query, [channelId]);
  }

  async findAutoResponsesByTrigger(
    companyId: string,
    triggerType: string
  ): Promise<IAutoResponse[]> {
    const query = `
      SELECT ar.*, mt.content as template_content
      FROM auto_responses ar
      JOIN message_templates mt ON ar.template_id = mt.id
      WHERE ar.company_id = $1 AND ar.trigger_type = $2 AND ar.is_active = true AND ar.deleted_at IS NULL
      ORDER BY ar.name
    `;
    return this.baseRepo.executeQuery<IAutoResponse>('auto_responses', query, [companyId, triggerType]);
  }

  async findById(id: string): Promise<ITemplate | null> {
    return this.baseRepo.findById<ITemplate>(this.tableName, id);
  }

  async findAll(companyId: string): Promise<ITemplate[]> {
    return this.baseRepo.findAll<ITemplate>(this.tableName, companyId);
  }

  async create(data: Partial<ITemplate>): Promise<ITemplate> {
    return this.baseRepo.create<ITemplate>(this.tableName, data);
  }

  async update(id: string, data: Partial<ITemplate>): Promise<ITemplate | null> {
    return this.baseRepo.update<ITemplate>(this.tableName, id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.baseRepo.delete(this.tableName, id);
  }
}