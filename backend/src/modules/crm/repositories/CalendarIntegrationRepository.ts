/**
 * Calendar Integration Repository
 * Manages external calendar integration data operations
 */

import { injectable, inject } from 'inversify';
import { CRMBaseRepository } from './CRMBaseRepository';
import { TYPES } from '@/container/types';

export interface CalendarIntegration {
  id?: number;
  company_id: number;
  user_id: number;
  provider: 'google' | 'outlook' | 'apple' | 'caldav' | 'other';
  provider_account_id?: string;
  provider_account_email?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: Date;
  calendar_id?: string;
  calendar_name?: string;
  sync_enabled?: boolean;
  sync_direction?: 'to_crm' | 'from_crm' | 'bidirectional';
  last_sync_at?: Date;
  last_sync_token?: string;
  sync_frequency_minutes?: number;
  sync_status?: string;
  sync_errors?: any;
  settings?: any;
  is_primary?: boolean;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface CalendarSyncLog {
  integration_id: number;
  activity_id?: number;
  external_event_id?: string;
  sync_direction: 'to_external' | 'from_external';
  sync_status: 'success' | 'failure' | 'conflict';
  sync_details?: any;
  error_message?: string;
}

@injectable()
export class CalendarIntegrationRepository extends CRMBaseRepository<CalendarIntegration> {
  constructor(
    @inject(TYPES.CRMDatabaseConnection) db: any,
    @inject(TYPES.Logger) logger?: any
  ) {
    super('calendar_integrations', db, logger);

    // Define allowed fields for this entity
    this.allowedFields = new Set([
      'id', 'company_id', 'user_id', 'provider', 'provider_account_id',
      'provider_account_email', 'access_token', 'refresh_token', 'token_expires_at',
      'calendar_id', 'calendar_name', 'sync_enabled', 'sync_direction',
      'last_sync_at', 'last_sync_token', 'sync_frequency_minutes', 'sync_status',
      'sync_errors', 'settings', 'is_primary', 'is_active', 'created_at', 'updated_at'
    ]);
  }

  /**
   * Get all active integrations for a user
   */
  async getUserIntegrations(userId: number, companyId: number): Promise<CalendarIntegration[]> {
    return this.findMany({
      user_id: userId,
      company_id: companyId,
      is_active: true
    });
  }

  /**
   * Get integrations that need syncing
   */
  async getIntegrationsForSync(minutesSinceLastSync: number = 15): Promise<CalendarIntegration[]> {
    const query = `
      SELECT *
      FROM ${this.getFullTableName()}
      WHERE is_active = true
        AND sync_enabled = true
        AND (
          last_sync_at IS NULL
          OR last_sync_at < NOW() - INTERVAL '${minutesSinceLastSync} minutes'
        )
      ORDER BY last_sync_at ASC NULLS FIRST
    `;

    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Update OAuth tokens
   */
  async updateTokens(
    integrationId: number,
    accessToken: string,
    refreshToken?: string,
    expiresAt?: Date
  ): Promise<void> {
    const updates: any = {
      access_token: accessToken,
      updated_at: new Date()
    };

    if (refreshToken) {
      updates.refresh_token = refreshToken;
    }
    if (expiresAt) {
      updates.token_expires_at = expiresAt;
    }

    await this.update(integrationId, updates);
    this.logger?.debug(`Updated tokens for integration ${integrationId}`);
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(
    integrationId: number,
    status: string,
    lastSyncAt?: Date,
    syncToken?: string,
    errors?: any
  ): Promise<void> {
    const updates: any = {
      sync_status: status,
      updated_at: new Date()
    };

    if (lastSyncAt) {
      updates.last_sync_at = lastSyncAt;
    }
    if (syncToken !== undefined) {
      updates.last_sync_token = syncToken;
    }
    if (errors) {
      updates.sync_errors = JSON.stringify(errors);
    }

    await this.update(integrationId, updates);
    this.logger?.debug(`Updated sync status for integration ${integrationId}: ${status}`);
  }

  /**
   * Log sync activity
   */
  async logSyncActivity(log: CalendarSyncLog): Promise<void> {
    const query = `
      INSERT INTO activity_sync_log
      (integration_id, activity_id, external_event_id, sync_direction,
       sync_status, sync_details, error_message, synced_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `;

    try {
      await this.db.query(query, [
        log.integration_id,
        log.activity_id || null,
        log.external_event_id || null,
        log.sync_direction,
        log.sync_status,
        JSON.stringify(log.sync_details || {}),
        log.error_message || null
      ]);
    } catch (error) {
      this.logger?.error('Error logging sync activity:', error);
      throw error;
    }
  }

  /**
   * Get primary integration for user
   */
  async getPrimaryIntegration(userId: number, companyId: number): Promise<CalendarIntegration | null> {
    const result = await this.findMany({
      user_id: userId,
      company_id: companyId,
      is_primary: true,
      is_active: true
    }, {
      limit: 1
    });

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Set integration as primary
   */
  async setPrimaryIntegration(integrationId: number, userId: number): Promise<void> {
    const query = `
      WITH updated AS (
        UPDATE ${this.getFullTableName()}
        SET is_primary = false
        WHERE user_id = $1 AND is_primary = true
      )
      UPDATE ${this.getFullTableName()}
      SET is_primary = true, updated_at = NOW()
      WHERE id = $2
    `;

    await this.db.query(query, [userId, integrationId]);
    this.logger?.info(`Set integration ${integrationId} as primary for user ${userId}`);
  }

  /**
   * Check if tokens are expired
   */
  async areTokensExpired(integrationId: number): Promise<boolean> {
    const integration = await this.findById(integrationId);
    if (!integration || !integration.token_expires_at) {
      return false;
    }

    return new Date(integration.token_expires_at) < new Date();
  }
}