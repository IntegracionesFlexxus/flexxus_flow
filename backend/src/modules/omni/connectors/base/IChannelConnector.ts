/**
 * Channel Connector Interface - Sprint 06
 * Base interface for all channel connectors
 */

import { IMessage, IMessageStatus, ISendMessageResult } from '../../interfaces/IMessage';
import { IWebhook } from '../../interfaces/IWebhook';

export interface IChannelConfig {
  [key: string]: any;
}

export interface IHealthCheckResult {
  healthy: boolean;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface IRateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}

export interface IChannelConnector {
  /**
   * Initialize the connector with configuration
   */
  initialize(config: IChannelConfig): Promise<void>;

  /**
   * Send a message through the channel
   */
  sendMessage(message: IMessage): Promise<ISendMessageResult>;

  /**
   * Get message status
   */
  getMessageStatus(messageId: string): Promise<IMessageStatus>;

  /**
   * Process incoming webhook
   */
  processWebhook(webhook: IWebhook): Promise<void>;

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(signature: string, payload: any): boolean;

  /**
   * Check channel health
   */
  checkHealth(): Promise<IHealthCheckResult>;

  /**
   * Get current rate limit information
   */
  getRateLimitInfo(): Promise<IRateLimitInfo>;

  /**
   * Clean up resources
   */
  cleanup(): Promise<void>;
}

export interface IConnectorFactory {
  create(channelType: string, config: IChannelConfig): IChannelConnector;
}