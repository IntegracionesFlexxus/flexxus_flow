/**
 * Channel Repository - Sprint 05
 * Repository for managing omnichannel channels
 */

import { injectable } from 'inversify';
import { BaseOmniRepository } from './base/BaseOmniRepository';
import { IChannel, IChannelCreate, IChannelUpdate, IWhatsAppChannel, IInstagramChannel, IEmailChannel, ISMSChannel } from '../interfaces/IChannel';
import { ChannelType, ChannelHealthStatus } from '../types/channel.types';

@injectable()
export class ChannelRepository extends BaseOmniRepository<IChannel> {
  protected tableName = 'channels';

  /**
   * Create a new channel with type-specific configuration
   */
  async createChannel(data: IChannelCreate, companyId: string): Promise<IChannel> {
    const client = await this.beginTransaction();

    try {
      // Get channel_type_id from channel_types table
      const channelTypeQuery = `
        SELECT id FROM channel_types WHERE name = $1 AND is_active = true
      `;
      const channelTypeResult = await client.query(channelTypeQuery, [data.channel_type]);

      if (channelTypeResult.rows.length === 0) {
        throw new Error(`Invalid channel type: ${data.channel_type}`);
      }

      const channel_type_id = channelTypeResult.rows[0].id;

      // Get user ID from context (will be set by middleware)
      const created_by = companyId; // TODO: Get actual user ID from request context

      // Create base channel with manual INSERT to include channel_type_id
      // Status 'active' and health_status 'healthy' since credentials were validated
      const insertQuery = `
        INSERT INTO ${this.tableName}
        (company_id, channel_type_id, channel_type, name, description, configuration,
         is_active, health_status, status, business_verification_status, created_by, metadata, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const channelResult = await client.query(insertQuery, [
        companyId,
        channel_type_id,
        data.channel_type,
        data.name,
        data.description || null,
        JSON.stringify(data.configuration),
        true, // is_active
        ChannelHealthStatus.HEALTHY, // health_status - validated credentials
        'active', // status
        'verified', // business_verification_status
        created_by,
        data.metadata ? JSON.stringify(data.metadata) : null
      ]);

      const channel = channelResult.rows[0] as IChannel;

      // Create type-specific configuration
      switch (data.channel_type) {
        case ChannelType.WHATSAPP:
          await this.createWhatsAppChannel(channel.id, data.configuration, companyId, client);
          break;
        case ChannelType.INSTAGRAM:
          await this.createInstagramChannel(channel.id, data.configuration, companyId, client);
          break;
        case ChannelType.EMAIL:
          await this.createEmailChannel(channel.id, data.configuration, companyId, client);
          break;
        case ChannelType.SMS:
          await this.createSMSChannel(channel.id, data.configuration, companyId, client);
          break;
      }

      await this.commitTransaction(client);
      return channel;
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }

  /**
   * Get channel by type
   */
  async findByType(channelType: ChannelType, companyId: string): Promise<IChannel[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE company_id = $1 AND channel_type = $2 AND is_active = true
      ORDER BY created_at DESC
    `;

    const result = await this.executeQuery(query, [companyId, channelType], companyId);
    return result.rows as IChannel[];
  }

  /**
   * Get active channels
   */
  async findActiveChannels(companyId: string): Promise<IChannel[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE company_id = $1 AND is_active = true
      ORDER BY channel_type, name
    `;

    const result = await this.executeQuery(query, [companyId], companyId);

    return result.rows as IChannel[];
  }

  /**
   * Find WhatsApp channel by phone_number_id (used by webhook to identify channel)
   */
  async findByPhoneNumberId(phoneNumberId: string): Promise<IChannel | null> {
    const query = `
      SELECT c.* FROM ${this.tableName} c
      INNER JOIN whatsapp_channels wc ON wc.channel_id = c.id
      WHERE wc.phone_number_id = $1 AND c.is_active = true
      LIMIT 1
    `;

    const result = await this.executeQuery(query, [phoneNumberId]);
    return result.rows[0] || null;
  }

  /**
   * Update channel health status
   */
  async updateHealthStatus(
    channelId: string,
    status: ChannelHealthStatus,
    companyId: string
  ): Promise<boolean> {
    const query = `
      UPDATE ${this.tableName}
      SET health_status = $1, last_health_check = CURRENT_TIMESTAMP
      WHERE id = $2 AND company_id = $3
    `;

    const result = await this.executeQuery(query, [status, channelId, companyId], companyId);
    return result.rowCount > 0;
  }

  /**
   * Get channel with type-specific details
   */
  async getChannelWithDetails(channelId: string, companyId: string): Promise<any> {
    const channel = await this.findById(channelId, companyId);
    if (!channel) return null;

    let details = null;
    switch (channel.channel_type) {
      case ChannelType.WHATSAPP:
        details = await this.getWhatsAppDetails(channelId);
        break;
      case ChannelType.INSTAGRAM:
        details = await this.getInstagramDetails(channelId);
        break;
      case ChannelType.EMAIL:
        details = await this.getEmailDetails(channelId);
        break;
      case ChannelType.SMS:
        details = await this.getSMSDetails(channelId);
        break;
    }

    return { ...channel, details };
  }

  /**
   * Check daily message limit
   */
  async checkDailyLimit(channelId: string, channelType: ChannelType): Promise<boolean> {
    const table = this.getChannelTable(channelType);
    if (!table) return true;

    const query = `
      SELECT daily_limit, messages_sent_today
      FROM ${table}
      WHERE channel_id = $1
    `;

    const result = await this.executeQuery(query, [channelId]);
    if (result.rows.length === 0) return true;

    const { daily_limit, messages_sent_today } = result.rows[0];
    return messages_sent_today < daily_limit;
  }

  /**
   * Increment message counter
   */
  async incrementMessageCount(channelId: string, channelType: ChannelType): Promise<void> {
    const table = this.getChannelTable(channelType);
    if (!table) return;

    const query = `
      UPDATE ${table}
      SET messages_sent_today = messages_sent_today + 1
      WHERE channel_id = $1
    `;

    await this.executeQuery(query, [channelId]);
  }

  /**
   * Reset daily counters
   */
  async resetDailyCounters(): Promise<void> {
    const tables = ['whatsapp_channels', 'instagram_channels', 'email_channels', 'sms_channels'];

    for (const table of tables) {
      const query = `
        UPDATE ${table}
        SET messages_sent_today = 0, last_limit_reset = CURRENT_TIMESTAMP
        WHERE last_limit_reset < CURRENT_DATE
      `;
      await this.executeQuery(query);
    }
  }

  // Private helper methods
  private async createWhatsAppChannel(channelId: string, config: any, companyId: string, client: any): Promise<void> {
    const query = `
      INSERT INTO whatsapp_channels (channel_id, phone_number, phone_number_id, business_account_id,
        access_token, webhook_verify_token, api_version, capabilities, daily_limit)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const params = [
      channelId,
      config.phoneNumber,
      config.phoneNumberId || null,
      config.businessAccountId || null,
      config.accessToken || null,
      config.webhookVerifyToken || null,
      config.apiVersion || 'v17.0',
      JSON.stringify(config.capabilities || ['text', 'media', 'location', 'contacts']),
      config.dailyLimit || 1000
    ];

    await client.query(query, params);
  }

  private async createInstagramChannel(channelId: string, config: any, companyId: string, client: any): Promise<void> {
    const query = `
      INSERT INTO instagram_channels (channel_id, instagram_account_id, instagram_username, page_id,
        page_access_token, webhook_verify_token, api_version, daily_limit)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const params = [
      channelId,
      config.instagramAccountId,
      config.instagramUsername || null,
      config.pageId || null,
      config.pageAccessToken || null,
      config.webhookVerifyToken || null,
      config.apiVersion || 'v17.0',
      config.dailyLimit || 500
    ];

    await client.query(query, params);
  }

  private async createEmailChannel(channelId: string, config: any, companyId: string, client: any): Promise<void> {
    const query = `
      INSERT INTO email_channels (channel_id, provider, from_email, from_name, reply_to_email,
        smtp_host, smtp_port, smtp_user, smtp_password, api_key, daily_limit)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const params = [
      channelId,
      config.provider,
      config.fromEmail,
      config.fromName || null,
      config.replyToEmail || config.fromEmail,
      config.smtpHost || null,
      config.smtpPort || null,
      config.smtpUser || null,
      config.smtpPassword || null,
      config.apiKey || null,
      config.dailyLimit || 10000
    ];

    await client.query(query, params);
  }

  private async createSMSChannel(channelId: string, config: any, companyId: string, client: any): Promise<void> {
    const query = `
      INSERT INTO sms_channels (channel_id, provider, phone_number, account_sid, auth_token,
        api_key, messaging_service_sid, country_code, capabilities, daily_limit)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    const params = [
      channelId,
      config.provider,
      config.phoneNumber,
      config.accountSid || null,
      config.authToken || null,
      config.apiKey || null,
      config.messagingServiceSid || null,
      config.countryCode || null,
      JSON.stringify(config.capabilities || ['sms']),
      config.dailyLimit || 1000
    ];

    await client.query(query, params);
  }

  private async getWhatsAppDetails(channelId: string): Promise<IWhatsAppChannel | null> {
    const query = 'SELECT * FROM whatsapp_channels WHERE channel_id = $1';
    const result = await this.executeQuery(query, [channelId]);
    return result.rows[0] || null;
  }

  private async getInstagramDetails(channelId: string): Promise<IInstagramChannel | null> {
    const query = 'SELECT * FROM instagram_channels WHERE channel_id = $1';
    const result = await this.executeQuery(query, [channelId]);
    return result.rows[0] || null;
  }

  private async getEmailDetails(channelId: string): Promise<IEmailChannel | null> {
    const query = 'SELECT * FROM email_channels WHERE channel_id = $1';
    const result = await this.executeQuery(query, [channelId]);
    return result.rows[0] || null;
  }

  private async getSMSDetails(channelId: string): Promise<ISMSChannel | null> {
    const query = 'SELECT * FROM sms_channels WHERE channel_id = $1';
    const result = await this.executeQuery(query, [channelId]);
    return result.rows[0] || null;
  }

  private getChannelTable(channelType: ChannelType | string): string | null {
    switch (channelType) {
      case ChannelType.WHATSAPP:
        return 'whatsapp_channels';
      case ChannelType.INSTAGRAM:
        return 'instagram_channels';
      case ChannelType.EMAIL:
        return 'email_channels';
      case ChannelType.SMS:
        return 'sms_channels';
      default:
        return null;
    }
  }
}
