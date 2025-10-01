/**
 * SMS Channel Connector - Sprint 06
 * Mock implementation for SMS service (Twilio-like)
 */

import { injectable } from 'inversify';
import { BaseChannelConnector } from './base/BaseChannelConnector';
import { IMessage, IMessageStatus, ISendMessageResult } from '../interfaces/IMessage';
import { IWebhook } from '../interfaces/IWebhook';
import { IChannelConfig } from './base/IChannelConnector';

@injectable()
export class SMSConnector extends BaseChannelConnector {
  private apiUrl: string = 'https://mock-sms-api.example.com';
  private accountSid: string = '';
  private authToken: string = '';
  private fromNumber: string = '';

  async initialize(config: IChannelConfig): Promise<void> {
    await super.initialize(config);

    this.accountSid = config.accountSid || 'mock-account-sid';
    this.authToken = config.authToken || 'mock-auth-token';
    this.fromNumber = config.fromNumber || '+1234567890';
    this.apiUrl = config.apiUrl || this.apiUrl;

    this.logger.info('SMS connector initialized', {
      accountSid: this.accountSid,
      fromNumber: this.fromNumber
    });
  }

  async sendMessage(message: IMessage): Promise<ISendMessageResult> {
    if (!this.isInitialized) {
      throw new Error('SMS connector not initialized');
    }

    try {
      await this.simulateApiDelay();

      // Check rate limit
      if (this.rateLimitInfo.remaining <= 0) {
        throw new Error('Rate limit exceeded');
      }

      // Validate phone number format
      const toNumber = this.normalizePhoneNumber(message.recipient_identifier);
      if (!this.isValidPhoneNumber(toNumber)) {
        throw new Error('Invalid phone number format');
      }

      // Mock SMS API request
      const smsPayload = this.buildSMSPayload(message, toNumber);

      this.logger.info('Sending SMS', {
        to: toNumber,
        from: this.fromNumber,
        length: smsPayload.body.length
      });

      // Check message length (SMS limit is 160 characters for single message)
      const segmentCount = Math.ceil(smsPayload.body.length / 160);

      // Simulate API response
      const messageId = this.generateMockMessageId();

      // Update rate limit
      this.updateRateLimit(
        this.rateLimitInfo.limit,
        this.rateLimitInfo.remaining - segmentCount
      );

      // Simulate successful send
      return {
        success: true,
        messageId,
        status: 'sent',
        timestamp: new Date(),
        details: {
          smsMessageSid: `SM${messageId}`,
          from: this.fromNumber,
          to: toNumber,
          segments: segmentCount,
          price: (segmentCount * 0.0075).toFixed(4),
          priceUnit: 'USD'
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to send SMS', error);
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

    // Mock SMS status progression
    const random = Math.random();
    if (random < 0.03) return 'failed'; // 3% failure rate
    if (random < 0.95) return 'delivered'; // 92% delivered
    return 'sent'; // 5% still queued
  }

  async processWebhook(webhook: IWebhook): Promise<void> {
    const { payload } = webhook;

    // Process SMS webhook events
    switch (payload.SmsStatus || payload.MessageStatus) {
      case 'received':
        this.processIncomingSMS(payload);
        break;

      case 'sent':
      case 'delivered':
      case 'undelivered':
      case 'failed':
        this.processStatusUpdate(payload);
        break;

      default:
        this.logger.warn('Unknown SMS webhook event', {
          status: payload.SmsStatus || payload.MessageStatus
        });
    }
  }

  protected getChannelType(): string {
    return 'SMS';
  }

  private buildSMSPayload(message: IMessage, toNumber: string): any {
    let body = '';

    switch (message.content_type) {
      case 'text':
        body = message.content;
        break;

      case 'template':
        body = this.renderSMSTemplate(message);
        break;

      case 'image':
      case 'document':
        // SMS doesn't support media directly, include link
        body = message.content;
        if (message.media_url) {
          body += `\n\nView: ${this.shortenUrl(message.media_url)}`;
        }
        break;

      default:
        body = message.content;
    }

    // Trim to SMS max length (1600 chars for concatenated messages)
    if (body.length > 1600) {
      body = body.substring(0, 1597) + '...';
    }

    return {
      body,
      from: this.fromNumber,
      to: toNumber,
      statusCallback: `${this.apiUrl}/webhooks/status`,
      maxPrice: '0.50', // Max price willing to pay
      validityPeriod: 14400 // 4 hours
    };
  }

  private renderSMSTemplate(message: IMessage): string {
    let template = message.content;
    const variables = message.template_variables || {};

    // Replace template variables
    Object.keys(variables).forEach(key => {
      const value = variables[key];
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return template;
  }

  private normalizePhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let normalized = phone.replace(/\D/g, '');

    // Add country code if missing (assuming US for this mock)
    if (normalized.length === 10) {
      normalized = '1' + normalized;
    }

    // Add + prefix
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }

    return normalized;
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Basic validation for E.164 format
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  }

  private shortenUrl(url: string): string {
    // Mock URL shortening
    const shortId = Math.random().toString(36).substring(7);
    return `https://short.link/${shortId}`;
  }

  private processIncomingSMS(payload: any): void {
    this.logger.info('Incoming SMS received', {
      from: payload.From,
      to: payload.To,
      body: payload.Body,
      messageSid: payload.MessageSid,
      numMedia: payload.NumMedia || 0
    });

    // Process MMS media if present
    if (payload.NumMedia && parseInt(payload.NumMedia) > 0) {
      for (let i = 0; i < parseInt(payload.NumMedia); i++) {
        this.logger.info('MMS media received', {
          contentType: payload[`MediaContentType${i}`],
          url: payload[`MediaUrl${i}`]
        });
      }
    }
  }

  private processStatusUpdate(payload: any): void {
    this.logger.info('SMS status update', {
      messageSid: payload.MessageSid,
      status: payload.MessageStatus || payload.SmsStatus,
      to: payload.To,
      from: payload.From,
      errorCode: payload.ErrorCode,
      errorMessage: payload.ErrorMessage
    });

    // Handle delivery failures
    if (payload.ErrorCode) {
      this.logger.error('SMS delivery failed', {
        messageSid: payload.MessageSid,
        errorCode: payload.ErrorCode,
        errorMessage: payload.ErrorMessage
      });
    }
  }
}