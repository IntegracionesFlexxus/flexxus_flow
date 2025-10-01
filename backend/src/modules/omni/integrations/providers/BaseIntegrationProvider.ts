/**
 * Base Integration Provider - Sprint 09
 * Abstract base class for all integration providers
 */

import { injectable } from 'inversify';
import {
  IIntegrationProvider,
  IIntegrationConfig,
  IConnectionTestResult,
  ISyncOptions,
  ISyncResult,
  IProviderMetadata,
  IFieldSchema,
  ISyncError
} from '../interfaces/IIntegration';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';

@injectable()
export abstract class BaseIntegrationProvider extends EventEmitter implements IIntegrationProvider {
  protected logger: any;
  protected config?: IIntegrationConfig;
  protected isConnected: boolean = false;
  protected rateLimiter: Map<string, { count: number; resetAt: Date }> = new Map();
  
  constructor() {
    super();
    this.logger = LoggerFactory.create({ file: __filename });
  }

  /**
   * Connect to the external service
   */
  async connect(config: IIntegrationConfig): Promise<void> {
    this.config = config;
    
    try {
      // Validate configuration
      this.validateConfig(config);
      
      // Provider-specific connection logic
      await this.establishConnection(config);
      
      this.isConnected = true;
      this.emit('connected', { provider: this.getMetadata().name });
      
      this.logger.info('Connected to integration provider', {
        provider: config.provider,
        integration_id: config.id
      });
    } catch (error: any) {
      this.logger.error('Failed to connect to integration provider', error);
      throw error;
    }
  }

  /**
   * Disconnect from the external service
   */
  async disconnect(): Promise<void> {
    try {
      await this.closeConnection();
      this.isConnected = false;
      this.emit('disconnected', { provider: this.getMetadata().name });
      
      this.logger.info('Disconnected from integration provider');
    } catch (error: any) {
      this.logger.error('Error during disconnect', error);
      throw error;
    }
  }

  /**
   * Test the connection to the external service
   */
  async testConnection(): Promise<IConnectionTestResult> {
    if (!this.config) {
      return {
        success: false,
        message: 'No configuration provided',
        error: 'NOT_CONFIGURED'
      };
    }

    try {
      const result = await this.performConnectionTest();
      
      this.logger.info('Connection test completed', { success: result.success });
      return result;
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
   * Sync data with the external service
   */
  async sync(options: ISyncOptions): Promise<ISyncResult> {
    const syncId = this.generateSyncId();
    const startedAt = new Date();
    const errors: ISyncError[] = [];
    const warnings: string[] = [];
    
    let recordsSynced = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsDeleted = 0;
    let recordsFailed = 0;

    try {
      this.logger.info('Starting sync', { sync_id: syncId, options });
      this.emit('sync:started', { sync_id: syncId, options });

      // Get entities to sync
      const entityTypes = options.entity_types || this.getSupportedEntities();
      
      for (const entityType of entityTypes) {
        try {
          const entityResult = await this.syncEntity(entityType, options);
          
          recordsSynced += entityResult.records_synced;
          recordsCreated += entityResult.records_created;
          recordsUpdated += entityResult.records_updated;
          recordsDeleted += entityResult.records_deleted;
          recordsFailed += entityResult.records_failed;
          
          if (entityResult.errors) {
            errors.push(...entityResult.errors);
          }
          
          if (entityResult.warnings) {
            warnings.push(...entityResult.warnings);
          }
        } catch (error: any) {
          this.logger.error(`Failed to sync entity ${entityType}`, error);
          errors.push({
            entity_type: entityType,
            error_code: 'SYNC_FAILED',
            error_message: error.message
          });
          recordsFailed++;
        }
      }

      const completedAt = new Date();
      const result: ISyncResult = {
        success: errors.length === 0,
        sync_id: syncId,
        started_at: startedAt,
        completed_at: completedAt,
        records_synced: recordsSynced,
        records_created: recordsCreated,
        records_updated: recordsUpdated,
        records_deleted: recordsDeleted,
        records_failed: recordsFailed,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };

      this.emit('sync:completed', result);
      this.logger.info('Sync completed', { sync_id: syncId, result });
      
      return result;
    } catch (error: any) {
      this.logger.error('Sync failed', error);
      
      const result: ISyncResult = {
        success: false,
        sync_id: syncId,
        started_at: startedAt,
        completed_at: new Date(),
        records_synced: recordsSynced,
        records_created: recordsCreated,
        records_updated: recordsUpdated,
        records_deleted: recordsDeleted,
        records_failed: recordsFailed,
        errors: [{
          entity_type: 'unknown',
          error_code: 'SYNC_ERROR',
          error_message: error.message
        }]
      };
      
      this.emit('sync:failed', result);
      return result;
    }
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(payload: any, headers: Record<string, string>): Promise<void> {
    try {
      // Validate webhook signature if configured
      if (this.config?.webhook_config?.secret) {
        const signature = headers['x-signature'] || headers['x-hub-signature'];
        if (!this.validateWebhook(payload, signature)) {
          throw new Error('Invalid webhook signature');
        }
      }

      // Process webhook
      await this.processWebhook(payload, headers);
      
      this.emit('webhook:processed', { payload, headers });
      this.logger.info('Webhook processed successfully');
    } catch (error: any) {
      this.logger.error('Failed to process webhook', error);
      this.emit('webhook:failed', { payload, headers, error: error.message });
      throw error;
    }
  }

  /**
   * Validate webhook signature
   */
  validateWebhook(payload: any, signature: string): boolean {
    if (!this.config?.webhook_config?.secret) {
      return true; // No secret configured, skip validation
    }

    const secret = this.config.webhook_config.secret;
    const computedSignature = this.computeWebhookSignature(payload, secret);
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );
  }

  /**
   * Check rate limits
   */
  protected checkRateLimit(endpoint: string, limit: number, window: number): boolean {
    const now = new Date();
    const key = `${this.config?.id}:${endpoint}`;
    const rateInfo = this.rateLimiter.get(key);

    if (!rateInfo || rateInfo.resetAt < now) {
      // Create new window
      this.rateLimiter.set(key, {
        count: 1,
        resetAt: new Date(now.getTime() + window * 1000)
      });
      return true;
    }

    if (rateInfo.count >= limit) {
      return false; // Rate limit exceeded
    }

    rateInfo.count++;
    return true;
  }

  /**
   * Apply field mappings to data
   */
  protected applyFieldMappings(data: any, direction: 'inbound' | 'outbound'): any {
    if (!this.config?.mappings?.field_mappings) {
      return data;
    }

    const mapped: any = {};
    const mappings = this.config.mappings.field_mappings;

    for (const mapping of mappings) {
      const sourceField = direction === 'inbound' ? mapping.source_field : mapping.target_field;
      const targetField = direction === 'inbound' ? mapping.target_field : mapping.source_field;
      
      if (data[sourceField] !== undefined) {
        mapped[targetField] = data[sourceField];
      } else if (mapping.default_value !== undefined) {
        mapped[targetField] = mapping.default_value;
      }
    }

    return mapped;
  }

  /**
   * Generate unique sync ID
   */
  protected generateSyncId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Compute webhook signature
   */
  protected computeWebhookSignature(payload: any, secret: string): string {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Handle API errors with retry logic
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          break;
        }
        
        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }
        
        // Wait before retry with exponential backoff
        const waitTime = delay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        this.logger.warn(`Retrying operation (attempt ${attempt}/${maxAttempts})`);
      }
    }
    
    throw lastError;
  }

  /**
   * Check if error is retryable
   */
  protected isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }
    
    // HTTP status codes
    if (error.status === 429 || error.status === 503 || error.status === 504) {
      return true;
    }
    
    return false;
  }

  // Abstract methods to be implemented by specific providers
  protected abstract validateConfig(config: IIntegrationConfig): void;
  protected abstract establishConnection(config: IIntegrationConfig): Promise<void>;
  protected abstract closeConnection(): Promise<void>;
  protected abstract performConnectionTest(): Promise<IConnectionTestResult>;
  protected abstract processWebhook(payload: any, headers: Record<string, string>): Promise<void>;
  
  abstract syncEntity(entityType: string, options: ISyncOptions): Promise<ISyncResult>;
  abstract create(entityType: string, data: any): Promise<any>;
  abstract read(entityType: string, id: string): Promise<any>;
  abstract update(entityType: string, id: string, data: any): Promise<any>;
  abstract delete(entityType: string, id: string): Promise<boolean>;
  abstract list(entityType: string, filters?: any): Promise<any[]>;
  abstract getMetadata(): IProviderMetadata;
  abstract getSupportedEntities(): string[];
  abstract getFieldSchema(entityType: string): Promise<IFieldSchema[]>;
}