/**
 * Channel Service - Sprint 05
 * Business logic for managing omnichannel channels
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { ChannelRepository } from '../repositories/ChannelRepository';
import { IChannel, IChannelCreate, IChannelUpdate } from '../interfaces/IChannel';
import { ChannelType, ChannelHealthStatus } from '../types/channel.types';
import winston from 'winston';
import { decryptCredential, decryptConfiguration } from '../utils/credentialDecryption';

@injectable()
export class ChannelService {
  constructor(
    @inject(TYPES.OmniChannelRepository) private channelRepository: ChannelRepository,
    @inject(TYPES.Logger) private logger: winston.Logger
  ) {}

  /**
   * Create a new channel
   */
  async createChannel(data: IChannelCreate, companyId: string): Promise<IChannel> {
    try {
      this.logger.info('Creating new channel', {
        channelType: data.channel_type,
        companyId
      });

      // Validate channel configuration based on type
      this.validateChannelConfig(data.channel_type, data.configuration);

      // Create channel in database
      const channel = await this.channelRepository.createChannel(data, companyId);

      this.logger.info('Channel created successfully', {
        channelId: channel.id,
        channelType: channel.channel_type
      });

      return channel;
    } catch (error) {
      this.logger.error('Failed to create channel', { error, data });
      throw error;
    }
  }

  /**
   * Get all active channels for a company
   */
  async getActiveChannels(companyId: string): Promise<IChannel[]> {
    const startTime = Date.now();
    console.log('⏱️ [ChannelService.getActiveChannels] Starting at:', new Date().toISOString());

    try {
      const repoStartTime = Date.now();
      const channels = await this.channelRepository.findActiveChannels(companyId);
      const repoEndTime = Date.now();

      console.log('✅ [ChannelService.getActiveChannels] Repository query took:', repoEndTime - repoStartTime, 'ms');
      console.log('📊 [ChannelService.getActiveChannels] Channels retrieved:', channels?.length || 0);

      const totalTime = Date.now() - startTime;
      console.log('🏁 [ChannelService.getActiveChannels] Total service time:', totalTime, 'ms');

      return channels || [];
    } catch (error) {
      const errorTime = Date.now() - startTime;
      this.logger.error('Failed to get active channels', { error, companyId, timeElapsed: errorTime });
      console.error('❌ [ChannelService.getActiveChannels] Error after', errorTime, 'ms:', error);
      return [];
    }
  }

  /**
   * Get channel by ID
   */
  async getChannelById(channelId: string, companyId: string): Promise<IChannel | null> {
    try {
      const channel = await this.channelRepository.findById(channelId, companyId);
      return channel;
    } catch (error) {
      this.logger.error('Failed to get channel by ID', { error, channelId, companyId });
      throw error;
    }
  }

  /**
   * Get channel with type-specific details
   */
  async getChannelWithDetails(channelId: string, companyId: string): Promise<any> {
    try {
      const channel = await this.channelRepository.getChannelWithDetails(channelId, companyId);
      return channel;
    } catch (error) {
      this.logger.error('Failed to get channel with details', { error, channelId });
      throw error;
    }
  }

  /**
   * Update channel configuration
   */
  async updateChannel(
    channelId: string,
    data: IChannelUpdate,
    companyId: string
  ): Promise<IChannel | null> {
    try {
      this.logger.info('Updating channel', { channelId, companyId });

      // Get existing channel
      const existingChannel = await this.channelRepository.findById(channelId, companyId);
      if (!existingChannel) {
        return null;
      }

      // If configuration is being updated, validate it
      if (data.configuration) {
        this.validateChannelConfig(existingChannel.channel_type, data.configuration);
      }

      // Update channel
      const updated = await this.channelRepository.update(channelId, data, companyId);

      if (updated) {
        // Get updated channel data
        const channel = await this.channelRepository.findById(channelId, companyId);

        this.logger.info('Channel updated successfully', { channelId });
        return channel;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to update channel', { error, channelId });
      throw error;
    }
  }

  /**
   * Delete a channel
   */
  async deleteChannel(channelId: string, companyId: string): Promise<boolean> {
    try {
      this.logger.info('Deleting channel', { channelId, companyId });

      const deleted = await this.channelRepository.delete(channelId, companyId);

      if (deleted) {
        this.logger.info('Channel deleted successfully', { channelId });
      }

      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete channel', { error, channelId });
      throw error;
    }
  }

  /**
   * Check channel health status
   */
  async checkChannelHealth(channelId: string, companyId: string): Promise<string> {
    try {
      const channel = await this.channelRepository.findById(channelId, companyId);

      if (!channel) {
        throw new Error('Channel not found');
      }

      // TODO: Implement actual health checks with external providers
      // For now, return the current status or simulate a check
      const healthStatus = channel.health_status || ChannelHealthStatus.UNKNOWN;

      // Update last health check timestamp
      await this.channelRepository.updateHealthStatus(
        channelId,
        healthStatus as ChannelHealthStatus,
        companyId
      );

      return healthStatus;
    } catch (error) {
      this.logger.error('Failed to check channel health', { error, channelId });
      throw error;
    }
  }

  /**
   * Update channel health status
   */
  async updateChannelHealth(
    channelId: string,
    status: ChannelHealthStatus,
    companyId: string
  ): Promise<boolean> {
    try {
      return await this.channelRepository.updateHealthStatus(channelId, status, companyId);
    } catch (error) {
      this.logger.error('Failed to update channel health', { error, channelId, status });
      throw error;
    }
  }

  /**
   * Get channels by type
   */
  async getChannelsByType(channelType: ChannelType, companyId: string): Promise<IChannel[]> {
    try {
      const channels = await this.channelRepository.findByType(channelType, companyId);
      return channels;
    } catch (error) {
      this.logger.error('Failed to get channels by type', { error, channelType, companyId });
      throw error;
    }
  }

  /**
   * Check if daily message limit is reached
   */
  async checkDailyLimit(channelId: string, channelType: ChannelType): Promise<boolean> {
    try {
      return await this.channelRepository.checkDailyLimit(channelId, channelType);
    } catch (error) {
      this.logger.error('Failed to check daily limit', { error, channelId });
      return false;
    }
  }

  /**
   * Increment message counter for a channel
   */
  async incrementMessageCount(channelId: string, channelType: ChannelType): Promise<void> {
    try {
      await this.channelRepository.incrementMessageCount(channelId, channelType);
    } catch (error) {
      this.logger.error('Failed to increment message count', { error, channelId });
    }
  }

  /**
   * Validate channel configuration based on type
   */
  private validateChannelConfig(channelType: ChannelType, config: any): void {
    if (!config) {
      throw new Error('Channel configuration is required');
    }

    switch (channelType) {
      case ChannelType.WHATSAPP:
        if (!config.phoneNumber) {
          throw new Error('WhatsApp phone number is required');
        }
        break;

      case ChannelType.EMAIL:
        if (!config.fromEmail) {
          throw new Error('From email is required');
        }
        if (!config.provider) {
          throw new Error('Email provider is required');
        }
        if (config.provider === 'smtp') {
          if (!config.smtpHost || !config.smtpPort || !config.smtpUser || !config.smtpPassword) {
            throw new Error('SMTP configuration is incomplete');
          }
        } else if (!config.apiKey) {
          throw new Error('API key is required for this email provider');
        }
        break;

      case ChannelType.SMS:
        if (!config.phoneNumber) {
          throw new Error('SMS phone number is required');
        }
        if (!config.provider) {
          throw new Error('SMS provider is required');
        }
        break;

      case ChannelType.INSTAGRAM:
        if (!config.instagramAccountId) {
          throw new Error('Instagram account ID is required');
        }
        break;

      case ChannelType.FACEBOOK:
        if (!config.pageId) {
          throw new Error('Facebook page ID is required');
        }
        if (!config.pageAccessToken) {
          throw new Error('Facebook page access token is required');
        }
        break;

      default:
        throw new Error(`Unknown channel type: ${channelType}`);
    }
  }

  /**
   * Reset daily message counters (should be called by a cron job)
   */
  async resetDailyCounters(): Promise<void> {
    try {
      await this.channelRepository.resetDailyCounters();
      this.logger.info('Daily message counters reset successfully');
    } catch (error) {
      this.logger.error('Failed to reset daily counters', { error });
    }
  }

  /**
   * Test channel connection without sending actual messages
   */
  async testConnection(channelId: string, companyId: string): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      this.logger.info('Testing channel connection', { channelId, companyId });

      // Get channel with details
      const channelData = await this.channelRepository.getChannelWithDetails(channelId, companyId);

      if (!channelData) {
        return {
          success: false,
          message: 'Channel not found'
        };
      }

      const { channel_type, configuration } = channelData;

      // Test based on channel type
      let testResult;
      switch (channel_type) {
        case ChannelType.EMAIL:
          testResult = await this.testEmailConnection(configuration, channelData.details);
          break;
        case ChannelType.WHATSAPP:
          testResult = await this.testWhatsAppConnection(configuration);
          break;
        case ChannelType.SMS:
          testResult = await this.testSMSConnection(configuration);
          break;
        case ChannelType.INSTAGRAM:
          testResult = await this.testInstagramConnection(configuration);
          break;
        default:
          return {
            success: false,
            message: `Test not implemented for channel type: ${channel_type}`
          };
      }

      // Update health status based on test result
      if (testResult.success) {
        await this.channelRepository.updateHealthStatus(
          channelId,
          ChannelHealthStatus.HEALTHY,
          companyId
        );
      } else {
        await this.channelRepository.updateHealthStatus(
          channelId,
          ChannelHealthStatus.DOWN,
          companyId
        );
      }

      this.logger.info('Channel test completed', {
        channelId,
        success: testResult.success
      });

      return testResult;
    } catch (error: any) {
      this.logger.error('Failed to test channel connection', { error, channelId });
      return {
        success: false,
        message: error.message || 'Test failed with unknown error'
      };
    }
  }

  /**
   * Test Email connection (SMTP or API)
   */
  private async testEmailConnection(config: any, details: any): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      if (config.provider === 'smtp' || details?.provider === 'smtp') {
        // Test SMTP connection
        const nodemailer = require('nodemailer');

        // IMPORTANTE: Desencriptar la contraseña antes de usarla
        const smtpPassword = decryptCredential(details.smtp_password);

        if (!smtpPassword) {
          return {
            success: false,
            message: 'No se pudo desencriptar la contraseña SMTP. Por favor, reconfigura el canal.',
            details: {
              error: 'DECRYPTION_FAILED',
              note: 'La contraseña almacenada no se pudo desencriptar. Esto puede ocurrir si se usó un método de encriptación antiguo.'
            }
          };
        }

        this.logger.debug('Testing SMTP connection', {
          host: details.smtp_host,
          port: details.smtp_port,
          user: details.smtp_user
        });

        const transporter = nodemailer.createTransport({
          host: details.smtp_host,
          port: details.smtp_port,
          secure: details.smtp_port === 465,
          auth: {
            user: details.smtp_user,
            pass: smtpPassword // Usar la contraseña desencriptada
          }
        });

        // Verify connection
        await transporter.verify();

        return {
          success: true,
          message: 'SMTP connection successful',
          details: {
            server: `${details.smtp_host}:${details.smtp_port}`,
            authenticated: true,
            secure: details.smtp_port === 465
          }
        };
      } else {
        // For API providers (SendGrid, Mailgun, etc.), just validate config
        // Real API test would require actual API calls
        return {
          success: true,
          message: `${config.provider} configuration valid (API test pending)`,
          details: {
            provider: config.provider,
            apiConfigured: !!details.api_key,
            note: 'Full API validation requires actual API call'
          }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Email connection failed: ${error.message}`,
        details: {
          error: error.code || error.message
        }
      };
    }
  }

  /**
   * Test WhatsApp connection
   */
  private async testWhatsAppConnection(config: any): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    // TODO: Implement real WhatsApp API verification
    // For now, just validate configuration
    return {
      success: !!config.phoneNumber && !!config.accessToken,
      message: config.phoneNumber && config.accessToken
        ? 'WhatsApp configuration valid (API verification pending)'
        : 'Missing required WhatsApp credentials',
      details: {
        phoneNumber: config.phoneNumber || 'not configured',
        hasAccessToken: !!config.accessToken,
        note: 'Full Meta API validation requires actual API call'
      }
    };
  }

  /**
   * Test SMS connection
   */
  private async testSMSConnection(config: any): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    // TODO: Implement real SMS provider verification
    // For now, just validate configuration
    return {
      success: !!config.phoneNumber && (!!config.apiKey || !!config.accountSid),
      message: config.phoneNumber && (config.apiKey || config.accountSid)
        ? `${config.provider} configuration valid (API verification pending)`
        : 'Missing required SMS credentials',
      details: {
        provider: config.provider,
        phoneNumber: config.phoneNumber || 'not configured',
        hasCredentials: !!(config.apiKey || config.accountSid),
        note: 'Full provider API validation requires actual API call'
      }
    };
  }

  /**
   * Test Instagram connection
   */
  private async testInstagramConnection(config: any): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    // TODO: Implement real Instagram API verification
    // For now, just validate configuration
    return {
      success: !!config.instagramAccountId && !!config.pageAccessToken,
      message: config.instagramAccountId && config.pageAccessToken
        ? 'Instagram configuration valid (API verification pending)'
        : 'Missing required Instagram credentials',
      details: {
        accountId: config.instagramAccountId || 'not configured',
        hasAccessToken: !!config.pageAccessToken,
        note: 'Full Meta API validation requires actual API call'
      }
    };
  }
}// Force recompile
