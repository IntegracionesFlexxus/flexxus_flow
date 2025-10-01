/**
 * Email Channel Connector - Sprint 06
 * Mock implementation for SMTP/Email service
 */

import { injectable } from 'inversify';
import { BaseChannelConnector } from './base/BaseChannelConnector';
import { IMessage, IMessageStatus, ISendMessageResult } from '../interfaces/IMessage';
import { IWebhook } from '../interfaces/IWebhook';
import { IChannelConfig } from './base/IChannelConnector';

@injectable()
export class EmailConnector extends BaseChannelConnector {
  private smtpHost: string = '';
  private smtpPort: number = 587;
  private smtpUser: string = '';
  private smtpPass: string = '';
  private fromEmail: string = '';
  private fromName: string = '';

  async initialize(config: IChannelConfig): Promise<void> {
    await super.initialize(config);

    this.smtpHost = config.smtpHost || 'mock-smtp.example.com';
    this.smtpPort = config.smtpPort || 587;
    this.smtpUser = config.smtpUser || 'mock-user';
    this.smtpPass = config.smtpPass || 'mock-pass';
    this.fromEmail = config.fromEmail || 'noreply@example.com';
    this.fromName = config.fromName || 'Flexxus Flow';

    this.logger.info('Email connector initialized', {
      smtpHost: this.smtpHost,
      smtpPort: this.smtpPort,
      fromEmail: this.fromEmail
    });
  }

  async sendMessage(message: IMessage): Promise<ISendMessageResult> {
    if (!this.isInitialized) {
      throw new Error('Email connector not initialized');
    }

    try {
      await this.simulateApiDelay();

      // Check rate limit
      if (this.rateLimitInfo.remaining <= 0) {
        throw new Error('Rate limit exceeded');
      }

      // Mock SMTP send
      const emailPayload = this.buildEmailPayload(message);

      this.logger.info('Sending email', {
        to: message.recipient_identifier,
        subject: emailPayload.subject
      });

      // Simulate API response
      const messageId = this.generateMockMessageId();

      // Update rate limit (emails typically have lower limits)
      this.updateRateLimit(
        500,
        Math.max(0, this.rateLimitInfo.remaining - 1)
      );

      // Simulate successful send
      return {
        success: true,
        messageId,
        status: 'sent',
        timestamp: new Date(),
        details: {
          emailMessageId: `<${messageId}@${this.smtpHost}>`,
          from: this.fromEmail,
          to: message.recipient_identifier,
          subject: emailPayload.subject
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to send email', error);
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

    // Email doesn't have real-time status updates
    // Mock bounce/delivery based on random
    const random = Math.random();
    if (random < 0.05) return 'failed'; // 5% bounce rate
    if (random < 0.85) return 'delivered'; // 80% delivered
    return 'sent'; // 15% still pending
  }

  async processWebhook(webhook: IWebhook): Promise<void> {
    const { payload } = webhook;

    // Process email webhook events (bounce, complaint, delivery)
    switch (payload.eventType) {
      case 'bounce':
        this.processBounceEvent(payload);
        break;

      case 'complaint':
        this.processComplaintEvent(payload);
        break;

      case 'delivery':
        this.processDeliveryEvent(payload);
        break;

      case 'open':
        this.processOpenEvent(payload);
        break;

      case 'click':
        this.processClickEvent(payload);
        break;

      default:
        this.logger.warn('Unknown email webhook event type', {
          eventType: payload.eventType
        });
    }
  }

  protected getChannelType(): string {
    return 'Email';
  }

  private buildEmailPayload(message: IMessage): any {
    // Extract email components
    const subject = message.metadata?.subject || 'Message from Flexxus Flow';
    const replyTo = message.metadata?.replyTo || this.fromEmail;

    const payload: any = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: message.recipient_identifier,
      subject,
      replyTo
    };

    switch (message.content_type) {
      case 'text':
        payload.text = message.content;
        payload.html = this.textToHtml(message.content);
        break;

      case 'template':
        const template = this.renderEmailTemplate(message);
        payload.html = template.html;
        payload.text = template.text;
        break;

      default:
        payload.html = message.content;
        payload.text = this.htmlToText(message.content);
        break;
    }

    // Add attachments if present
    if (message.media_url) {
      payload.attachments = [{
        filename: message.metadata?.filename || 'attachment',
        path: message.media_url
      }];
    }

    // Add headers for tracking
    payload.headers = {
      'X-Message-ID': message.id,
      'X-Company-ID': message.company_id,
      'X-Conversation-ID': message.conversation_id
    };

    return payload;
  }

  private renderEmailTemplate(message: IMessage): { html: string, text: string } {
    // Mock template rendering
    const variables = message.template_variables || {};
    let html = message.content;
    let text = message.content;

    // Replace variables
    Object.keys(variables).forEach(key => {
      const value = variables[key];
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
      text = text.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    // Add basic HTML structure if not present
    if (!html.includes('<html>')) {
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${message.metadata?.subject || 'Message'}</title>
        </head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          ${html}
        </body>
        </html>
      `;
    }

    return { html, text: this.htmlToText(text) };
  }

  private textToHtml(text: string): string {
    // Convert plain text to HTML
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  private processBounceEvent(payload: any): void {
    this.logger.warn('Email bounced', {
      messageId: payload.messageId,
      recipient: payload.recipient,
      bounceType: payload.bounceType,
      bounceSubType: payload.bounceSubType
    });
  }

  private processComplaintEvent(payload: any): void {
    this.logger.warn('Email complaint received', {
      messageId: payload.messageId,
      complainant: payload.complainant,
      complaintType: payload.complaintType
    });
  }

  private processDeliveryEvent(payload: any): void {
    this.logger.info('Email delivered', {
      messageId: payload.messageId,
      recipient: payload.recipient,
      deliveryTimestamp: payload.deliveryTimestamp
    });
  }

  private processOpenEvent(payload: any): void {
    this.logger.info('Email opened', {
      messageId: payload.messageId,
      recipient: payload.recipient,
      openTimestamp: payload.openTimestamp,
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent
    });
  }

  private processClickEvent(payload: any): void {
    this.logger.info('Email link clicked', {
      messageId: payload.messageId,
      recipient: payload.recipient,
      clickTimestamp: payload.clickTimestamp,
      link: payload.link
    });
  }
}