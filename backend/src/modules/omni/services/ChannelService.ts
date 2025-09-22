// services/ChannelService.ts
import { injectable, inject } from 'inversify';
import { EventEmitter } from 'events';
import { ChannelRepository } from '../repositories/ChannelRepository';
import { IChannel, ChannelType, HealthStatus } from '../interfaces/IChannel';
import { OMNI_TYPES } from '../types/omni.types';

@injectable()
export class ChannelService {
  constructor(
    @inject(OMNI_TYPES.ChannelRepository) private channelRepo: ChannelRepository,
    @inject(OMNI_TYPES.EventEmitter) private eventEmitter: EventEmitter
  ) {}

  async createChannel(data: Partial<IChannel>): Promise<IChannel> {
    // Validar configuración según tipo de canal
    this.validateChannelConfig(data.channelType!, data.configuration!);

    const channel = await this.channelRepo.create(data);

    // Emitir evento
    this.eventEmitter.emit('channel.created', {
      companyId: channel.companyId,
      channelId: channel.id,
      channelType: channel.channelType
    });

    return channel;
  }

  async getChannelsByType(
    companyId: string,
    type: ChannelType
  ): Promise<IChannel[]> {
    return this.channelRepo.findByType(companyId, type);
  }

  async getAllChannels(companyId: string): Promise<IChannel[]> {
    return this.channelRepo.getActiveChannels(companyId);
  }

  async getChannel(id: string): Promise<IChannel | null> {
    return this.channelRepo.findById(id);
  }

  async updateChannel(id: string, data: Partial<IChannel>): Promise<IChannel | null> {
    if (data.channelType && data.configuration) {
      this.validateChannelConfig(data.channelType, data.configuration);
    }

    const channel = await this.channelRepo.update(id, data);

    if (channel) {
      this.eventEmitter.emit('channel.updated', {
        companyId: channel.companyId,
        channelId: channel.id,
        changes: data
      });
    }

    return channel;
  }

  async deleteChannel(id: string): Promise<boolean> {
    const channel = await this.channelRepo.findById(id);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const result = await this.channelRepo.delete(id);

    if (result) {
      this.eventEmitter.emit('channel.deleted', {
        companyId: channel.companyId,
        channelId: channel.id
      });
    }

    return result;
  }

  async updateChannelHealth(channelId: string): Promise<void> {
    // Lógica para verificar salud del canal
    const health = await this.checkChannelHealth(channelId);
    await this.channelRepo.updateHealthStatus(channelId, health);

    this.eventEmitter.emit('channel.health.changed', {
      channelId,
      healthStatus: health
    });
  }

  async toggleChannelStatus(id: string): Promise<IChannel | null> {
    const channel = await this.channelRepo.findById(id);
    if (!channel) {
      throw new Error('Channel not found');
    }

    return this.updateChannel(id, { isActive: !channel.isActive });
  }

  private validateChannelConfig(type: ChannelType, config: any): void {
    switch (type) {
      case ChannelType.WHATSAPP:
        if (!config.phoneNumber || !config.accessToken) {
          throw new Error('WhatsApp channel requires phoneNumber and accessToken');
        }
        break;
      case ChannelType.EMAIL:
        if (!config.fromEmail || !config.provider) {
          throw new Error('Email channel requires fromEmail and provider');
        }
        break;
      case ChannelType.INSTAGRAM:
        if (!config.pageId || !config.accessToken) {
          throw new Error('Instagram channel requires pageId and accessToken');
        }
        break;
      case ChannelType.SMS:
        if (!config.phoneNumber || !config.provider || !config.apiKey) {
          throw new Error('SMS channel requires phoneNumber, provider and apiKey');
        }
        break;
      default:
        throw new Error(`Unsupported channel type: ${type}`);
    }
  }

  private async checkChannelHealth(channelId: string): Promise<HealthStatus> {
    // Implementar lógica de health check según tipo de canal
    // Por ahora retorna HEALTHY por defecto
    try {
      const channel = await this.channelRepo.findById(channelId);
      if (!channel || !channel.isActive) {
        return HealthStatus.DOWN;
      }

      // Aquí iría la lógica específica para cada tipo de canal
      // Por ejemplo, hacer un ping a la API correspondiente
      return HealthStatus.HEALTHY;
    } catch (error) {
      console.error(`Health check failed for channel ${channelId}:`, error);
      return HealthStatus.DEGRADED;
    }
  }
}