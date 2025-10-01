/**
 * Channel Health Monitor Service - Sprint 06
 * Monitors health status of all active channels
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IChannelRepository } from '../interfaces/IChannelRepository';
import { IChannel } from '../interfaces/IChannel';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { IChannelConnector, IHealthCheckResult } from '../connectors/base/IChannelConnector';
import { ConnectorFactory } from '../connectors/ConnectorFactory';

interface IHealthStatus {
  channelId: string;
  channelName: string;
  channelType: string;
  healthy: boolean;
  message: string;
  lastCheck: Date;
  nextCheck: Date;
  consecutiveFailures: number;
  details?: any;
}

@injectable()
export class ChannelHealthMonitor {
  private logger: any;
  private healthStatuses: Map<string, IHealthStatus> = new Map();
  private monitoringInterval: NodeJS.Timer | null = null;
  private checkInterval: number = 300000; // 5 minutes default
  private maxConsecutiveFailures: number = 3;
  private connectorFactory: ConnectorFactory;

  constructor(
    @inject(TYPES.OmniChannelRepository) private channelRepository: IChannelRepository
  ) {
    this.logger = LoggerFactory.create({ file: __filename });
    this.connectorFactory = new ConnectorFactory();
  }

  /**
   * Start health monitoring
   */
  async startMonitoring(companyId: string, intervalMs?: number): Promise<void> {
    if (intervalMs) {
      this.checkInterval = intervalMs;
    }

    this.logger.info('Starting channel health monitoring', {
      companyId,
      checkInterval: this.checkInterval
    });

    // Initial check
    await this.checkAllChannels(companyId);

    // Schedule periodic checks
    this.monitoringInterval = setInterval(async () => {
      await this.checkAllChannels(companyId);
    }, this.checkInterval);
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.logger.info('Channel health monitoring stopped');
    }
  }

  /**
   * Check health of all active channels
   */
  async checkAllChannels(companyId: string): Promise<Map<string, IHealthStatus>> {
    try {
      this.logger.debug('Starting health check for all channels');

      // Get all active channels
      const channels = await this.channelRepository.findByCompany(companyId);
      const activeChannels = channels.filter(c => c.is_active);

      // Check each channel in parallel
      const checkPromises = activeChannels.map(channel =>
        this.checkChannelHealth(channel, companyId)
      );

      await Promise.allSettled(checkPromises);

      this.logger.info('Health check completed', {
        totalChannels: activeChannels.length,
        healthyChannels: Array.from(this.healthStatuses.values())
          .filter(s => s.healthy).length
      });

      return this.healthStatuses;
    } catch (error) {
      this.logger.error('Failed to check channel health', error);
      throw error;
    }
  }

  /**
   * Check health of a specific channel
   */
  async checkChannelHealth(channel: IChannel, companyId: string): Promise<IHealthStatus> {
    const startTime = Date.now();

    try {
      // Create connector instance
      const connector = this.connectorFactory.create(
        channel.channel_type,
        channel.configuration
      );

      // Initialize connector
      await connector.initialize(channel.configuration);

      // Perform health check
      const healthResult = await connector.checkHealth();

      // Get rate limit info
      const rateLimitInfo = await connector.getRateLimitInfo();

      // Clean up connector
      await connector.cleanup();

      // Update health status
      const status: IHealthStatus = {
        channelId: channel.id,
        channelName: channel.name,
        channelType: channel.channel_type,
        healthy: healthResult.healthy,
        message: healthResult.message,
        lastCheck: new Date(),
        nextCheck: new Date(Date.now() + this.checkInterval),
        consecutiveFailures: healthResult.healthy ? 0 :
          (this.healthStatuses.get(channel.id)?.consecutiveFailures || 0) + 1,
        details: {
          ...healthResult.details,
          rateLimit: rateLimitInfo,
          responseTime: Date.now() - startTime
        }
      };

      this.healthStatuses.set(channel.id, status);

      // Update channel status in database if needed
      if (!status.healthy && status.consecutiveFailures >= this.maxConsecutiveFailures) {
        await this.handleUnhealthyChannel(channel, status, companyId);
      }

      this.logger.debug('Channel health check completed', {
        channelId: channel.id,
        healthy: status.healthy,
        responseTime: status.details.responseTime
      });

      return status;
    } catch (error: any) {
      const status: IHealthStatus = {
        channelId: channel.id,
        channelName: channel.name,
        channelType: channel.channel_type,
        healthy: false,
        message: `Health check failed: ${error.message}`,
        lastCheck: new Date(),
        nextCheck: new Date(Date.now() + this.checkInterval),
        consecutiveFailures: (this.healthStatuses.get(channel.id)?.consecutiveFailures || 0) + 1,
        details: {
          error: error.message,
          responseTime: Date.now() - startTime
        }
      };

      this.healthStatuses.set(channel.id, status);

      this.logger.error('Channel health check failed', {
        channelId: channel.id,
        error: error.message
      });

      return status;
    }
  }

  /**
   * Handle unhealthy channel
   */
  private async handleUnhealthyChannel(
    channel: IChannel,
    status: IHealthStatus,
    companyId: string
  ): Promise<void> {
    this.logger.warn('Channel marked as unhealthy', {
      channelId: channel.id,
      channelName: channel.name,
      consecutiveFailures: status.consecutiveFailures
    });

    // Update channel status to indicate health issues
    const updates = {
      health_status: 'unhealthy',
      health_check_message: status.message,
      last_health_check: status.lastCheck,
      metadata: {
        ...channel.metadata,
        health: {
          consecutiveFailures: status.consecutiveFailures,
          lastHealthyCheck: channel.metadata?.health?.lastHealthyCheck || null,
          details: status.details
        }
      }
    };

    await this.channelRepository.update(channel.id, updates, companyId);

    // Emit event for notification system
    this.emitHealthAlert(channel, status);
  }

  /**
   * Get health status for a specific channel
   */
  getChannelHealth(channelId: string): IHealthStatus | undefined {
    return this.healthStatuses.get(channelId);
  }

  /**
   * Get all health statuses
   */
  getAllHealthStatuses(): IHealthStatus[] {
    return Array.from(this.healthStatuses.values());
  }

  /**
   * Get unhealthy channels
   */
  getUnhealthyChannels(): IHealthStatus[] {
    return Array.from(this.healthStatuses.values())
      .filter(status => !status.healthy);
  }

  /**
   * Force health check for specific channel
   */
  async forceChannelCheck(channelId: string, companyId: string): Promise<IHealthStatus> {
    const channel = await this.channelRepository.findById(channelId, companyId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    return this.checkChannelHealth(channel, companyId);
  }

  /**
   * Reset health status for a channel
   */
  resetChannelHealth(channelId: string): void {
    this.healthStatuses.delete(channelId);
  }

  /**
   * Emit health alert event
   */
  private emitHealthAlert(channel: IChannel, status: IHealthStatus): void {
    // This would integrate with notification system
    this.logger.warn('HEALTH_ALERT', {
      channelId: channel.id,
      channelName: channel.name,
      channelType: channel.channel_type,
      status: status.healthy ? 'recovered' : 'unhealthy',
      consecutiveFailures: status.consecutiveFailures,
      message: status.message
    });
  }

  /**
   * Get health statistics
   */
  getHealthStatistics(): any {
    const statuses = Array.from(this.healthStatuses.values());

    return {
      total: statuses.length,
      healthy: statuses.filter(s => s.healthy).length,
      unhealthy: statuses.filter(s => !s.healthy).length,
      averageResponseTime: statuses.reduce((acc, s) =>
        acc + (s.details?.responseTime || 0), 0) / statuses.length || 0,
      channelTypes: this.groupByChannelType(statuses)
    };
  }

  /**
   * Group health statuses by channel type
   */
  private groupByChannelType(statuses: IHealthStatus[]): any {
    const grouped: any = {};

    statuses.forEach(status => {
      if (!grouped[status.channelType]) {
        grouped[status.channelType] = {
          total: 0,
          healthy: 0,
          unhealthy: 0
        };
      }

      grouped[status.channelType].total++;
      if (status.healthy) {
        grouped[status.channelType].healthy++;
      } else {
        grouped[status.channelType].unhealthy++;
      }
    });

    return grouped;
  }
}