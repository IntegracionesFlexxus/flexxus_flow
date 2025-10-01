/**
 * Integration Manager - Sprint 09
 * Central orchestrator for all integrations
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import {
  IIntegrationProvider,
  IIntegrationConfig,
  IIntegrationService,
  IProviderMetadata,
  IConnectionTestResult,
  ISyncOptions,
  ISyncResult,
  IWebhookConfig
} from './interfaces/IIntegration';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { EventEmitter } from 'events';
import * as cron from 'node-cron';
import { SalesforceProvider } from './providers/SalesforceProvider';
// Import other providers as needed

@injectable()
export class IntegrationManager extends EventEmitter implements IIntegrationService {
  private logger: any;
  private providers: Map<string, IIntegrationProvider> = new Map();
  private activeIntegrations: Map<string, IIntegrationProvider> = new Map();
  private scheduledSyncs: Map<string, cron.ScheduledTask> = new Map();
  private syncQueue: Map<string, ISyncOptions[]> = new Map();
  private isSyncing: Map<string, boolean> = new Map();

  constructor(
    @inject(TYPES.OmniConnection) private pool: Pool
  ) {
    super();
    this.logger = LoggerFactory.create({ file: __filename });
    this.registerBuiltInProviders();
  }

  /**
   * Register built-in providers
   */
  private registerBuiltInProviders(): void {
    // Register Salesforce provider
    this.registerProvider(new SalesforceProvider());
    
    // Register other providers
    // this.registerProvider(new HubSpotProvider());
    // this.registerProvider(new GoogleCalendarProvider());
    // this.registerProvider(new S3Provider());
    
    this.logger.info('Registered built-in providers', {
      count: this.providers.size,
      providers: Array.from(this.providers.keys())
    });
  }

  /**
   * Register a provider
   */
  registerProvider(provider: IIntegrationProvider): void {
    const metadata = provider.getMetadata();
    const providerId = metadata.name.toLowerCase().replace(/\s+/g, '_');
    
    this.providers.set(providerId, provider);
    
    // Set up event listeners
    provider.on('connected', (data) => {
      this.emit('provider:connected', { provider_id: providerId, ...data });
    });
    
    provider.on('disconnected', (data) => {
      this.emit('provider:disconnected', { provider_id: providerId, ...data });
    });
    
    provider.on('sync:started', (data) => {
      this.emit('sync:started', { provider_id: providerId, ...data });
    });
    
    provider.on('sync:completed', (data) => {
      this.emit('sync:completed', { provider_id: providerId, ...data });
      this.saveSyncLog(providerId, data);
    });
    
    provider.on('sync:failed', (data) => {
      this.emit('sync:failed', { provider_id: providerId, ...data });
      this.saveSyncLog(providerId, data);
    });
    
    this.logger.info('Provider registered', { provider_id: providerId });
  }

  /**
   * Get a provider
   */
  getProvider(providerId: string): IIntegrationProvider | null {
    return this.providers.get(providerId) || null;
  }

  /**
   * List all providers
   */
  listProviders(): IProviderMetadata[] {
    return Array.from(this.providers.values()).map(provider => provider.getMetadata());
  }

  /**
   * Connect to an integration
   */
  async connectIntegration(integrationId: string): Promise<void> {
    try {
      // Get integration config from database
      const config = await this.getIntegrationConfig(integrationId);
      if (!config) {
        throw new Error(`Integration ${integrationId} not found`);
      }

      // Get provider
      const provider = this.getProvider(config.provider);
      if (!provider) {
        throw new Error(`Provider ${config.provider} not found`);
      }

      // Connect
      await provider.connect(config);
      
      // Store active integration
      this.activeIntegrations.set(integrationId, provider);
      
      // Update status in database
      await this.updateIntegrationStatus(integrationId, 'connected');
      
      this.logger.info('Integration connected', { integration_id: integrationId });
    } catch (error: any) {
      this.logger.error('Failed to connect integration', error);
      await this.updateIntegrationStatus(integrationId, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from an integration
   */
  async disconnectIntegration(integrationId: string): Promise<void> {
    try {
      const provider = this.activeIntegrations.get(integrationId);
      if (provider) {
        await provider.disconnect();
        this.activeIntegrations.delete(integrationId);
      }
      
      // Cancel scheduled sync if exists
      this.cancelScheduledSync(integrationId);
      
      // Update status in database
      await this.updateIntegrationStatus(integrationId, 'disconnected');
      
      this.logger.info('Integration disconnected', { integration_id: integrationId });
    } catch (error: any) {
      this.logger.error('Failed to disconnect integration', error);
      throw error;
    }
  }

  /**
   * Test integration connection
   */
  async testIntegrationConnection(integrationId: string): Promise<IConnectionTestResult> {
    try {
      const provider = this.activeIntegrations.get(integrationId);
      if (!provider) {
        // Try to connect first
        await this.connectIntegration(integrationId);
        const connectedProvider = this.activeIntegrations.get(integrationId);
        if (!connectedProvider) {
          throw new Error('Failed to establish connection');
        }
        return await connectedProvider.testConnection();
      }
      
      return await provider.testConnection();
    } catch (error: any) {
      this.logger.error('Connection test failed', error);
      return {
        success: false,
        message: 'Connection test failed',
        error: error.message
      };
    }
  }

  /**
   * Sync integration data
   */
  async syncIntegration(integrationId: string, options?: ISyncOptions): Promise<ISyncResult> {
    // Check if already syncing
    if (this.isSyncing.get(integrationId)) {
      // Queue the sync request
      const queue = this.syncQueue.get(integrationId) || [];
      queue.push(options || {});
      this.syncQueue.set(integrationId, queue);
      
      return {
        success: false,
        sync_id: '',
        started_at: new Date(),
        records_synced: 0,
        records_created: 0,
        records_updated: 0,
        records_deleted: 0,
        records_failed: 0,
        warnings: ['Sync already in progress, request queued']
      };
    }

    this.isSyncing.set(integrationId, true);

    try {
      // Get provider
      let provider = this.activeIntegrations.get(integrationId);
      if (!provider) {
        await this.connectIntegration(integrationId);
        provider = this.activeIntegrations.get(integrationId);
        if (!provider) {
          throw new Error('Failed to get provider');
        }
      }

      // Update sync status
      await this.updateIntegrationStatus(integrationId, 'syncing');
      
      // Perform sync
      const result = await provider.sync(options || {});
      
      // Update last sync time
      await this.updateLastSyncTime(integrationId);
      
      // Update sync status
      await this.updateIntegrationStatus(
        integrationId,
        result.success ? 'success' : 'failed',
        result.errors?.[0]?.error_message
      );
      
      // Process queued syncs
      await this.processQueuedSyncs(integrationId);
      
      return result;
    } catch (error: any) {
      this.logger.error('Sync failed', error);
      await this.updateIntegrationStatus(integrationId, 'failed', error.message);
      
      return {
        success: false,
        sync_id: '',
        started_at: new Date(),
        records_synced: 0,
        records_created: 0,
        records_updated: 0,
        records_deleted: 0,
        records_failed: 0,
        errors: [{
          entity_type: 'unknown',
          error_code: 'SYNC_ERROR',
          error_message: error.message
        }]
      };
    } finally {
      this.isSyncing.set(integrationId, false);
    }
  }

  /**
   * Schedule periodic sync
   */
  scheduleSync(integrationId: string, cronExpression: string): void {
    // Cancel existing schedule if any
    this.cancelScheduledSync(integrationId);
    
    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error('Invalid cron expression');
    }
    
    // Create scheduled task
    const task = cron.schedule(cronExpression, async () => {
      try {
        await this.syncIntegration(integrationId);
      } catch (error) {
        this.logger.error('Scheduled sync failed', {
          integration_id: integrationId,
          error
        });
      }
    });
    
    task.start();
    this.scheduledSyncs.set(integrationId, task);
    
    this.logger.info('Sync scheduled', {
      integration_id: integrationId,
      schedule: cronExpression
    });
  }

  /**
   * Cancel scheduled sync
   */
  cancelScheduledSync(integrationId: string): void {
    const task = this.scheduledSyncs.get(integrationId);
    if (task) {
      task.stop();
      this.scheduledSyncs.delete(integrationId);
      
      this.logger.info('Scheduled sync cancelled', { integration_id: integrationId });
    }
  }

  /**
   * Process webhook from provider
   */
  async processWebhook(providerId: string, payload: any, headers: Record<string, string>): Promise<void> {
    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        throw new Error(`Provider ${providerId} not found`);
      }
      
      // Find integration for this provider
      const integrationId = await this.findIntegrationByProvider(providerId);
      if (!integrationId) {
        throw new Error(`No active integration found for provider ${providerId}`);
      }
      
      // Ensure provider is connected
      let activeProvider = this.activeIntegrations.get(integrationId);
      if (!activeProvider) {
        await this.connectIntegration(integrationId);
        activeProvider = this.activeIntegrations.get(integrationId);
      }
      
      if (activeProvider) {
        await activeProvider.handleWebhook(payload, headers);
      }
      
      this.logger.info('Webhook processed', { provider_id: providerId });
    } catch (error: any) {
      this.logger.error('Failed to process webhook', error);
      throw error;
    }
  }

  /**
   * Register webhook endpoint
   */
  async registerWebhookEndpoint(integrationId: string, config: IWebhookConfig): Promise<string> {
    const endpointId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const query = `
      INSERT INTO webhook_endpoints (
        id, company_id, url, events, headers, secret, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING id;
    `;
    
    const result = await this.pool.query(query, [
      endpointId,
      await this.getCompanyId(integrationId),
      config.endpoint_url,
      JSON.stringify(config.events),
      JSON.stringify(config.headers || {}),
      config.secret,
      true
    ]);
    
    this.logger.info('Webhook endpoint registered', {
      integration_id: integrationId,
      endpoint_id: endpointId
    });
    
    return endpointId;
  }

  /**
   * Unregister webhook endpoint
   */
  async unregisterWebhookEndpoint(integrationId: string, endpointId: string): Promise<void> {
    const query = `
      UPDATE webhook_endpoints
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `;
    
    await this.pool.query(query, [endpointId]);
    
    this.logger.info('Webhook endpoint unregistered', {
      integration_id: integrationId,
      endpoint_id: endpointId
    });
  }

  /**
   * Get integration configuration from database
   */
  private async getIntegrationConfig(integrationId: string): Promise<IIntegrationConfig | null> {
    const query = `
      SELECT * FROM integration_configs
      WHERE id = $1 AND is_active = true;
    `;
    
    const result = await this.pool.query(query, [integrationId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      company_id: row.company_id,
      provider: row.provider,
      type: row.type,
      name: row.name,
      config: row.config,
      mappings: row.mappings,
      sync_config: row.sync_config,
      webhook_config: row.webhook_config,
      is_active: row.is_active,
      last_sync_at: row.last_sync_at,
      sync_status: row.sync_status,
      metadata: row.metadata
    };
  }

  /**
   * Update integration status
   */
  private async updateIntegrationStatus(
    integrationId: string,
    status: string,
    error?: string
  ): Promise<void> {
    const query = `
      UPDATE integration_configs
      SET sync_status = $2,
          error_count = CASE WHEN $3 IS NOT NULL THEN error_count + 1 ELSE 0 END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `;
    
    await this.pool.query(query, [integrationId, status, error]);
  }

  /**
   * Update last sync time
   */
  private async updateLastSyncTime(integrationId: string): Promise<void> {
    const query = `
      UPDATE integration_configs
      SET last_sync_at = CURRENT_TIMESTAMP,
          next_sync_at = CURRENT_TIMESTAMP + (sync_config->>'interval' || ' seconds')::INTERVAL
      WHERE id = $1;
    `;
    
    await this.pool.query(query, [integrationId]);
  }

  /**
   * Save sync log
   */
  private async saveSyncLog(providerId: string, syncResult: ISyncResult): Promise<void> {
    try {
      const integrationId = await this.findIntegrationByProvider(providerId);
      if (!integrationId) return;
      
      const query = `
        INSERT INTO integration_sync_logs (
          integration_id, sync_type, direction, status,
          started_at, completed_at, records_synced,
          records_created, records_updated, records_deleted,
          records_failed, error_details, warnings
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        );
      `;
      
      await this.pool.query(query, [
        integrationId,
        'incremental', // Default
        'bidirectional', // Default
        syncResult.success ? 'completed' : 'failed',
        syncResult.started_at,
        syncResult.completed_at,
        syncResult.records_synced,
        syncResult.records_created,
        syncResult.records_updated,
        syncResult.records_deleted,
        syncResult.records_failed,
        JSON.stringify(syncResult.errors || []),
        JSON.stringify(syncResult.warnings || [])
      ]);
    } catch (error: any) {
      this.logger.error('Failed to save sync log', error);
    }
  }

  /**
   * Process queued syncs
   */
  private async processQueuedSyncs(integrationId: string): Promise<void> {
    const queue = this.syncQueue.get(integrationId);
    if (!queue || queue.length === 0) return;
    
    const nextSync = queue.shift();
    if (nextSync) {
      this.syncQueue.set(integrationId, queue);
      
      // Process next sync asynchronously
      setImmediate(() => {
        this.syncIntegration(integrationId, nextSync);
      });
    }
  }

  /**
   * Find integration by provider
   */
  private async findIntegrationByProvider(providerId: string): Promise<string | null> {
    const query = `
      SELECT id FROM integration_configs
      WHERE provider = $1 AND is_active = true
      LIMIT 1;
    `;
    
    const result = await this.pool.query(query, [providerId]);
    return result.rows.length > 0 ? result.rows[0].id : null;
  }

  /**
   * Get company ID for integration
   */
  private async getCompanyId(integrationId: string): Promise<string> {
    const query = `
      SELECT company_id FROM integration_configs WHERE id = $1;
    `;
    
    const result = await this.pool.query(query, [integrationId]);
    if (result.rows.length === 0) {
      throw new Error(`Integration ${integrationId} not found`);
    }
    
    return result.rows[0].company_id;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Cancel all scheduled syncs
    for (const [integrationId, task] of this.scheduledSyncs) {
      task.stop();
    }
    this.scheduledSyncs.clear();
    
    // Disconnect all active integrations
    for (const [integrationId, provider] of this.activeIntegrations) {
      try {
        await provider.disconnect();
      } catch (error) {
        this.logger.error('Error disconnecting integration', { integration_id: integrationId, error });
      }
    }
    this.activeIntegrations.clear();
    
    this.removeAllListeners();
    this.logger.info('IntegrationManager cleaned up');
  }
}