/**
 * WhatsApp Channel Connector - Sprint 06
 * Mock implementation for WhatsApp Business API
 */

import { injectable } from 'inversify';
import { BaseChannelConnector } from './base/BaseChannelConnector';
import { IMessage, IMessageStatus, ISendMessageResult } from '../interfaces/IMessage';
import { IWebhook } from '../interfaces/IWebhook';
import { IChannelConfig } from './base/IChannelConnector';

@injectable()
export class WhatsAppConnector extends BaseChannelConnector {
  private apiUrl: string = 'https://mock-whatsapp-api.example.com';
  private phoneNumberId: string = '';
  private accessToken: string = '';

  async initialize(config: IChannelConfig): Promise<void> {
    await super.initialize(config);

    this.phoneNumberId = config.phoneNumberId || 'mock-phone-id';
    this.accessToken = config.accessToken || 'mock-access-token';
    this.apiUrl = config.apiUrl || this.apiUrl;

    this.logger.info('WhatsApp connector initialized', {
      phoneNumberId: this.phoneNumberId
    });
  }

  async sendMessage(message: IMessage): Promise<ISendMessageResult> {
    if (!this.isInitialized) {
      throw new Error('WhatsApp connector not initialized');
    }

    try {
      await this.simulateApiDelay();

      // Check rate limit
      if (this.rateLimitInfo.remaining <= 0) {
        throw new Error('Rate limit exceeded');
      }

      // Mock WhatsApp API request
      const payload = this.buildWhatsAppPayload(message);

      this.logger.info('Sending WhatsApp message', {
        recipient: message.recipient_identifier,
        contentType: message.content_type
      });

      // Simulate API response
      const messageId = this.generateMockMessageId();

      // Update rate limit
      this.updateRateLimit(
        this.rateLimitInfo.limit,
        this.rateLimitInfo.remaining - 1
      );

      // Simulate successful send
      return {
        success: true,
        messageId,
        status: 'sent',
        timestamp: new Date(),
        details: {
          whatsappMessageId: `wamid.${messageId}`,
          phoneNumberId: this.phoneNumberId,
          recipient: message.recipient_identifier
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to send WhatsApp message', error);
      return {
        success: false,
        messageId: '',
        status: 'failed',
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  async getMessageStatus(messageId: string): Promise<IMessageStatus> {
    await this.simulateApiDelay();

    // Mock status progression
    const statuses: IMessageStatus[] = ['sent', 'delivered', 'read'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    return randomStatus;
  }

  async processWebhook(webhook: IWebhook): Promise<void> {
    const { payload } = webhook;

    // Process different webhook types
    if (payload.entry) {
      for (const entry of payload.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            await this.processWebhookChange(change);
          }
        }
      }
    }
  }

  protected getChannelType(): string {
    return 'WhatsApp';
  }

  private buildWhatsAppPayload(message: IMessage): any {
    const basePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: message.recipient_identifier
    };

    switch (message.content_type) {
      case 'text':
        return {
          ...basePayload,
          type: 'text',
          text: {
            body: message.content,
            preview_url: false
          }
        };

      case 'image':
        return {
          ...basePayload,
          type: 'image',
          image: {
            link: message.media_url,
            caption: message.content
          }
        };

      case 'document':
        return {
          ...basePayload,
          type: 'document',
          document: {
            link: message.media_url,
            caption: message.content,
            filename: message.metadata?.filename || 'document.pdf'
          }
        };

      case 'template':
        return {
          ...basePayload,
          type: 'template',
          template: {
            name: message.template_id,
            language: {
              code: message.metadata?.language || 'en'
            },
            components: this.buildTemplateComponents(message.template_variables)
          }
        };

      default:
        return {
          ...basePayload,
          type: 'text',
          text: {
            body: message.content
          }
        };
    }
  }

  private buildTemplateComponents(variables?: any): any[] {
    if (!variables) return [];

    const components = [];

    if (variables.header) {
      components.push({
        type: 'header',
        parameters: variables.header
      });
    }

    if (variables.body) {
      components.push({
        type: 'body',
        parameters: variables.body
      });
    }

    if (variables.buttons) {
      components.push({
        type: 'button',
        parameters: variables.buttons
      });
    }

    return components;
  }

  private async processWebhookChange(change: any): Promise<void> {
    const { field, value } = change;

    if (field === 'messages') {
      // Process incoming messages
      if (value.messages) {
        for (const message of value.messages) {
          this.logger.info('Received WhatsApp message', {
            from: message.from,
            type: message.type,
            id: message.id
          });
        }
      }

      // Process status updates
      if (value.statuses) {
        for (const status of value.statuses) {
          this.logger.info('Received WhatsApp status update', {
            messageId: status.id,
            status: status.status,
            recipientId: status.recipient_id
          });
        }
      }
    }
  }
}