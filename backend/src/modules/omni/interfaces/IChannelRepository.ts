/**
 * Channel Repository Interface
 * Omni Module - Sprint 05/06
 */

import { IChannel, IChannelCreate, IChannelUpdate } from './IChannel';
import { ChannelType } from '../types/channel.types';

export interface IChannelRepository {
  /**
   * Create a new channel with type-specific configuration
   */
  createChannel(data: IChannelCreate, companyId: string): Promise<IChannel>;

  /**
   * Find channel by ID
   */
  findById(id: string, companyId: string): Promise<IChannel | null>;

  /**
   * Find channels by type
   */
  findByType(channelType: ChannelType, companyId: string): Promise<IChannel[]>;

  /**
   * Find all active channels
   */
  findActiveChannels(companyId: string): Promise<IChannel[]>;

  /**
   * Update channel
   */
  update(id: string, data: IChannelUpdate, companyId: string): Promise<IChannel>;

  /**
   * Update channel health status
   */
  updateHealthStatus(channelId: string, status: any, lastCheck: Date, companyId: string): Promise<void>;

  /**
   * Delete channel
   */
  delete(id: string, companyId: string): Promise<boolean>;

  /**
   * Find all channels with filters
   */
  findAll(filters: any, companyId: string): Promise<IChannel[]>;
}
