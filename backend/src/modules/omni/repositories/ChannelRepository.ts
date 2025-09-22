// repositories/ChannelRepository.ts
import { injectable, inject } from 'inversify';
import { BaseOmniRepository } from './BaseOmniRepository';
import { IChannel, ChannelType, HealthStatus } from '../interfaces/IChannel';
import { OMNI_TYPES } from '../types/omni.types';

@injectable()
export class ChannelRepository {
  constructor(@inject(OMNI_TYPES.BaseOmniRepository) private baseRepo: BaseOmniRepository<IChannel>) {}

  private get tableName(): string {
    return 'channels';
  }

  async findByType(companyId: string, channelType: ChannelType): Promise<IChannel[]> {
    const query = `
      SELECT * FROM channels
      WHERE company_id = $1 AND channel_type = $2 AND is_active = true
    `;
    return this.baseRepo.executeQuery<IChannel>(this.tableName, query, [companyId, channelType]);
  }

  async updateHealthStatus(
    channelId: string,
    status: HealthStatus
  ): Promise<void> {
    const query = `
      UPDATE channels
      SET health_status = $2, last_health_check = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await this.baseRepo.executeQuery(this.tableName, query, [channelId, status]);
  }

  async getActiveChannels(companyId: string): Promise<IChannel[]> {
    const query = `
      SELECT * FROM channels
      WHERE company_id = $1 AND is_active = true
      ORDER BY channel_type, name
    `;
    return this.baseRepo.executeQuery<IChannel>(this.tableName, query, [companyId]);
  }

  async findByCompanyAndType(companyId: string, channelType: ChannelType): Promise<IChannel[]> {
    const query = `
      SELECT c.*, ct.display_name as channel_type_name
      FROM channels c
      JOIN channel_types ct ON c.channel_type_id = ct.id
      WHERE c.company_id = $1 AND ct.name = $2 AND c.deleted_at IS NULL
    `;
    return this.baseRepo.executeQuery<IChannel>(this.tableName, query, [companyId, channelType]);
  }

  async findById(id: string): Promise<IChannel | null> {
    return this.baseRepo.findById<IChannel>(this.tableName, id);
  }

  async findAll(companyId: string): Promise<IChannel[]> {
    return this.baseRepo.findAll<IChannel>(this.tableName, companyId);
  }

  async create(data: Partial<IChannel>): Promise<IChannel> {
    return this.baseRepo.create<IChannel>(this.tableName, data);
  }

  async update(id: string, data: Partial<IChannel>): Promise<IChannel | null> {
    return this.baseRepo.update<IChannel>(this.tableName, id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.baseRepo.delete(this.tableName, id);
  }
}