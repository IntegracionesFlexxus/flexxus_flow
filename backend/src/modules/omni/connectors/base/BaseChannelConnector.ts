/**
 * Base Channel Connector - Sprint 06
 * Abstract base class for all channel connectors
 */

import { injectable } from 'inversify';
import { IChannelConnector, IChannelConfig, IHealthCheckResult, IRateLimitInfo } from './IChannelConnector';
import { IMessage, IMessageStatus, ISendMessageResult } from '../../interfaces/IMessage';
import { IWebhook } from '../../interfaces/IWebhook';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

@injectable()
export abstract class BaseChannelConnector implements IChannelConnector {
  protected config!: IChannelConfig;
  protected logger: any;
  protected isInitialized: boolean = false;
  protected rateLimitInfo: IRateLimitInfo = {
    limit: 1000,
    remaining: 1000,
    resetAt: new Date(Date.now() + 3600000)
  };

  constructor() {
    this.logger = LoggerFactory.create({ file: __filename });
  }

  async initialize(config: IChannelConfig): Promise<void> {
    this.config = config;
    this.isInitialized = true;
    this.logger.info(`${this.getChannelType()} connector initialized`);
  }

  abstract sendMessage(message: IMessage): Promise<ISendMessageResult>;

  abstract getMessageStatus(messageId: string): Promise<IMessageStatus>;

  abstract processWebhook(webhook: IWebhook): Promise<void>;

  validateWebhookSignature(signature: string, payload: any): boolean {
    // Mock validation - in production, implement actual signature verification
    return signature === this.generateMockSignature(payload);
  }

  async checkHealth(): Promise<IHealthCheckResult> {
    if (!this.isInitialized) {
      return {
        healthy: false,
        message: 'Connector not initialized',
        timestamp: new Date()
      };
    }

    // Mock health check - in production, actually check API connectivity
    return {
      healthy: true,
      message: `${this.getChannelType()} connector is healthy`,
      details: {
        initialized: this.isInitialized,
        rateLimit: this.rateLimitInfo
      },
      timestamp: new Date()
    };
  }

  async getRateLimitInfo(): Promise<IRateLimitInfo> {
    return this.rateLimitInfo;
  }

  async cleanup(): Promise<void> {
    this.isInitialized = false;
    this.logger.info(`${this.getChannelType()} connector cleaned up`);
  }

  protected abstract getChannelType(): string;

  protected generateMockSignature(payload: any): string {
    // Mock signature generation
    const crypto = require('crypto');
    const secret = this.config.webhookSecret || 'mock-secret';
    return crypto.createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  protected updateRateLimit(limit: number, remaining: number): void {
    this.rateLimitInfo = {
      limit,
      remaining,
      resetAt: new Date(Date.now() + 3600000)
    };
  }

  protected generateMockMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected simulateApiDelay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
  }
}