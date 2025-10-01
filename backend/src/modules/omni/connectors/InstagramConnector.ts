/**
 * Instagram Channel Connector - Sprint 06
 * Mock implementation for Instagram Messaging API
 */

import { injectable } from 'inversify';
import { BaseChannelConnector } from './base/BaseChannelConnector';
import { IMessage, IMessageStatus, ISendMessageResult } from '../interfaces/IMessage';
import { IWebhook } from '../interfaces/IWebhook';
import { IChannelConfig } from './base/IChannelConnector';

@injectable()
export class InstagramConnector extends BaseChannelConnector {
  private apiUrl: string = 'https://mock-instagram-api.example.com';
  private pageId: string = '';
  private accessToken: string = '';

  async initialize(config: IChannelConfig): Promise<void> {
    await super.initialize(config);

    this.pageId = config.pageId || 'mock-page-id';
    this.accessToken = config.accessToken || 'mock-access-token';
    this.apiUrl = config.apiUrl || this.apiUrl;

    this.logger.info('Instagram connector initialized', {
      pageId: this.pageId
    });
  }

  async sendMessage(message: IMessage): Promise<ISendMessageResult> {
    if (!this.isInitialized) {
      throw new Error('Instagram connector not initialized');
    }

    try {
      await this.simulateApiDelay();

      // Check rate limit
      if (this.rateLimitInfo.remaining <= 0) {
        throw new Error('Rate limit exceeded');
      }

      // Mock Instagram API request
      const payload = this.buildInstagramPayload(message);

      this.logger.info('Sending Instagram message', {
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
          instagramMessageId: `ig_${messageId}`,
          pageId: this.pageId,
          recipientId: message.recipient_identifier
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to send Instagram message', error);
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

    // Instagram doesn't provide read receipts for all users
    const statuses: IMessageStatus[] = ['sent', 'delivered'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    return randomStatus;
  }

  async processWebhook(webhook: IWebhook): Promise<void> {
    const { payload } = webhook;

    // Process Instagram webhook events
    if (payload.entry) {
      for (const entry of payload.entry) {
        if (entry.messaging) {
          for (const messagingEvent of entry.messaging) {
            await this.processMessagingEvent(messagingEvent);
          }
        }
      }
    }
  }

  protected getChannelType(): string {
    return 'Instagram';
  }

  private buildInstagramPayload(message: IMessage): any {
    const basePayload = {
      recipient: {
        id: message.recipient_identifier
      },
      messaging_type: 'RESPONSE'
    };

    switch (message.content_type) {
      case 'text':
        return {
          ...basePayload,
          message: {
            text: message.content
          }
        };

      case 'image':
        return {
          ...basePayload,
          message: {
            attachment: {
              type: 'image',
              payload: {
                url: message.media_url,
                is_reusable: true
              }
            }
          }
        };

      case 'video':
        return {
          ...basePayload,
          message: {
            attachment: {
              type: 'video',
              payload: {
                url: message.media_url,
                is_reusable: true
              }
            }
          }
        };

      case 'template':
        return {
          ...basePayload,
          message: {
            attachment: {
              type: 'template',
              payload: this.buildTemplatePayload(message)
            }
          }
        };

      default:
        return {
          ...basePayload,
          message: {
            text: message.content
          }
        };
    }
  }

  private buildTemplatePayload(message: IMessage): any {
    // Instagram supports generic, button, and media templates
    const templateType = message.metadata?.templateType || 'generic';

    switch (templateType) {
      case 'button':
        return {
          template_type: 'button',
          text: message.content,
          buttons: message.metadata?.buttons || []
        };

      case 'media':
        return {
          template_type: 'media',
          elements: [{
            media_type: message.metadata?.mediaType || 'image',
            url: message.media_url,
            buttons: message.metadata?.buttons || []
          }]
        };

      default:
        return {
          template_type: 'generic',
          elements: [{
            title: message.metadata?.title || 'Message',
            subtitle: message.content,
            image_url: message.media_url,
            buttons: message.metadata?.buttons || []
          }]
        };
    }
  }

  private async processMessagingEvent(event: any): Promise<void> {
    const { sender, recipient, timestamp } = event;

    if (event.message) {
      // Process incoming message
      this.logger.info('Received Instagram message', {
        senderId: sender.id,
        recipientId: recipient.id,
        messageId: event.message.mid,
        text: event.message.text,
        attachments: event.message.attachments
      });
    }

    if (event.delivery) {
      // Process delivery confirmation
      this.logger.info('Instagram message delivered', {
        watermark: event.delivery.watermark,
        messageIds: event.delivery.mids
      });
    }

    if (event.read) {
      // Process read receipt
      this.logger.info('Instagram message read', {
        watermark: event.read.watermark
      });
    }

    if (event.postback) {
      // Process postback from button click
      this.logger.info('Instagram postback received', {
        payload: event.postback.payload,
        title: event.postback.title
      });
    }
  }
}