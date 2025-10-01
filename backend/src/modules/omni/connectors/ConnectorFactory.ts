/**
 * Channel Connector Factory - Sprint 06
 * Creates appropriate connector instances based on channel type
 */

import { injectable } from 'inversify';
import { IChannelConnector, IChannelConfig, IConnectorFactory } from './base/IChannelConnector';
import { WhatsAppConnector } from './WhatsAppConnector';
import { InstagramConnector } from './InstagramConnector';
import { EmailConnector } from './EmailConnector';
import { SMSConnector } from './SMSConnector';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

@injectable()
export class ConnectorFactory implements IConnectorFactory {
  private logger: any;

  constructor() {
    this.logger = LoggerFactory.create({ file: __filename });
  }

  /**
   * Create a channel connector instance
   */
  create(channelType: string, config: IChannelConfig): IChannelConnector {
    this.logger.debug('Creating connector', { channelType });

    let connector: IChannelConnector;

    switch (channelType.toLowerCase()) {
      case 'whatsapp':
        connector = new WhatsAppConnector();
        break;

      case 'instagram':
        connector = new InstagramConnector();
        break;

      case 'email':
        connector = new EmailConnector();
        break;

      case 'sms':
        connector = new SMSConnector();
        break;

      default:
        throw new Error(`Unsupported channel type: ${channelType}`);
    }

    this.logger.info('Connector created', { channelType });
    return connector;
  }

  /**
   * Get supported channel types
   */
  getSupportedTypes(): string[] {
    return ['whatsapp', 'instagram', 'email', 'sms'];
  }

  /**
   * Check if channel type is supported
   */
  isSupported(channelType: string): boolean {
    return this.getSupportedTypes().includes(channelType.toLowerCase());
  }
}