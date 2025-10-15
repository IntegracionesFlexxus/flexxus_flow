/**
 * Webhook Processor Service - Sprint 06
 * Processes incoming webhooks from channel providers
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IWebhook } from '../interfaces/IWebhook';
import { IChannelRepository } from '../interfaces/IChannelRepository';
import { IMessageRepository } from '../interfaces/IMessageRepository';
import { IConversationRepository } from '../interfaces/IConversationRepository';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { ContactRepository } from '../repositories/ContactRepository';
import { ContactIdentityRepository } from '../repositories/ContactIdentityRepository';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { ConnectorFactory } from '../connectors/ConnectorFactory';
import { IChannelConnector } from '../connectors/base/IChannelConnector';
import {
  MessageContentType,
  MessageDirection,
  MessageSenderType,
  MessageStatus
} from '../types/message.types';
import { ConversationPriority, ConversationStatus } from '../types/conversation.types';
import crypto from 'crypto';

interface IWebhookValidation {
  isValid: boolean;
  message: string;
}

interface IncomingMessageData {
  channelId: string;
  channelType: string;
  externalId: string;
  from: string;
  content: string;
  contentType: string;
  timestamp: Date;
  metadata: any;
  contacts?: any[];
}

@injectable()
export class WebhookProcessor {
  private logger: any;
  private connectorFactory: ConnectorFactory;
  private connectorCache: Map<string, IChannelConnector> = new Map();
  private webhookStore: Map<string, IWebhook> = new Map();

  constructor(
    @inject(TYPES.OmniChannelRepository) private channelRepository: IChannelRepository,
    @inject(TYPES.OmniMessageRepository) private messageRepository: IMessageRepository,
    @inject(TYPES.OmniConversationRepository) private conversationRepository: IConversationRepository,
    @inject(TYPES.OmniCustomerRepository) private customerRepository: CustomerRepository,
    @inject(TYPES.OmniContactRepository) private contactRepository: ContactRepository,
    @inject(TYPES.OmniContactIdentityRepository) private contactIdentityRepository: ContactIdentityRepository
  ) {
    this.logger = LoggerFactory.create({ file: __filename });
    this.connectorFactory = new ConnectorFactory();
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(
    channelId: string,
    headers: Record<string, string>,
    body: any,
    companyId: string
  ): Promise<void> {
    const webhookId = this.generateWebhookId();
    const startTime = Date.now();

    // Create webhook record
    const webhook: IWebhook = {
      id: webhookId,
      channel_id: channelId,
      channel_type: '',
      event_type: this.detectEventType(body),
      payload: body,
      headers,
      signature: headers['x-signature'] || headers['x-hub-signature-256'] || '',
      received_at: new Date(),
      status: 'processing'
    };

    this.webhookStore.set(webhookId, webhook);

    try {
      this.logger.info('Processing webhook', {
        webhookId,
        channelId,
        eventType: webhook.event_type
      });

      // Get channel configuration
      const channel = await this.channelRepository.findById(channelId, companyId);
      if (!channel) {
        throw new Error(`Channel not found: ${channelId}`);
      }

      webhook.channel_type = channel.channel_type;

      // Validate webhook signature (skip in development if no App Secret configured)
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const hasAppSecret = channel.configuration?.appSecret || channel.configuration?.app_secret;

      if (!isDevelopment || hasAppSecret) {
        const validation = await this.validateWebhook(webhook, channel.configuration);
        if (!validation.isValid) {
          this.logger.warn('Webhook signature validation failed, but continuing in development mode', {
            channelId,
            hasAppSecret: !!hasAppSecret
          });
          // In development, log warning but continue processing
          if (!isDevelopment) {
            throw new Error(`Webhook validation failed: ${validation.message}`);
          }
        }
      } else {
        this.logger.info('Skipping webhook signature validation in development mode');
      }

      // Get or create connector
      const connector = await this.getConnector(
        channelId,
        channel.channel_type,
        channel.configuration
      );

      // Process webhook through connector
      await connector.processWebhook(webhook);

      // Process specific webhook events
      await this.processWebhookEvent(webhook, companyId);

      // Mark webhook as processed
      webhook.status = 'processed';
      webhook.processed_at = new Date();
      webhook.metadata = {
        processingTime: Date.now() - startTime
      };

      this.logger.info('Webhook processed successfully', {
        webhookId,
        processingTime: Date.now() - startTime
      });
    } catch (error: any) {
      webhook.status = 'failed';
      webhook.error = error.message;

      this.logger.error('Failed to process webhook', {
        webhookId,
        error: error.message
      });

      throw error;
    } finally {
      // Update webhook record
      this.webhookStore.set(webhookId, webhook);
    }
  }

  /**
   * Validate webhook signature
   */
  private async validateWebhook(
    webhook: IWebhook,
    channelConfig: any
  ): Promise<IWebhookValidation> {
    try {
      // Skip validation if no signature provided
      if (!webhook.signature) {
        return {
          isValid: true,
          message: 'No signature to validate'
        };
      }

      // Get connector for validation
      const connector = await this.getConnector(
        webhook.channel_id,
        webhook.channel_type,
        channelConfig
      );

      // Validate through connector
      const isValid = connector.validateWebhookSignature(
        webhook.signature,
        webhook.payload
      );

      return {
        isValid,
        message: isValid ? 'Valid signature' : 'Invalid signature'
      };
    } catch (error: any) {
      return {
        isValid: false,
        message: error.message
      };
    }
  }

  /**
   * Process specific webhook events
   */
  private async processWebhookEvent(webhook: IWebhook, companyId: string): Promise<void> {
    const { channel_type, event_type, payload } = webhook;

    switch (channel_type.toLowerCase()) {
      case 'whatsapp':
        await this.processWhatsAppEvent(webhook, companyId);
        break;

      case 'instagram':
        await this.processInstagramEvent(webhook, companyId);
        break;

      case 'email':
        await this.processEmailEvent(webhook, companyId);
        break;

      case 'sms':
        await this.processSMSEvent(webhook, companyId);
        break;

      default:
        this.logger.warn('Unknown channel type for webhook', {
          channelType: channel_type
        });
    }
  }

  /**
   * Process WhatsApp webhook events
   */
  private async processWhatsAppEvent(webhook: IWebhook, companyId: string): Promise<void> {
    const { payload } = webhook;

    if (payload.entry) {
      for (const entry of payload.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            await this.processWhatsAppChange(change, webhook.channel_id, companyId);
          }
        }
      }
    }
  }

  /**
   * Process WhatsApp change event
   */
  private async processWhatsAppChange(change: any, channelId: string, companyId: string): Promise<void> {
    const { field, value } = change;

    if (field === 'messages') {
      // Process incoming messages
      if (value.messages) {
        for (const message of value.messages) {
          await this.processIncomingMessage({
            channelId,
            channelType: 'whatsapp',
            externalId: message.id,
            from: message.from,
            content: message.text?.body || '',
            contentType: message.type,
            timestamp: new Date(parseInt(message.timestamp) * 1000),
            metadata: message,
            contacts: value.contacts
          }, companyId);
        }
      }

      // Process status updates
      if (value.statuses) {
        for (const status of value.statuses) {
          await this.processMessageStatus({
            externalId: status.id,
            status: this.mapWhatsAppStatus(status.status),
            timestamp: new Date(parseInt(status.timestamp) * 1000),
            recipientId: status.recipient_id
          }, companyId);
        }
      }
    }
  }

  /**
   * Process Instagram webhook events
   */
  private async processInstagramEvent(webhook: IWebhook, companyId: string): Promise<void> {
    const { payload } = webhook;

    if (payload.entry) {
      for (const entry of payload.entry) {
        if (entry.messaging) {
          for (const event of entry.messaging) {
            await this.processInstagramMessagingEvent(event, webhook.channel_id, companyId);
          }
        }
      }
    }
  }

  /**
   * Process Instagram messaging event
   */
  private async processInstagramMessagingEvent(event: any, channelId: string, companyId: string): Promise<void> {
    if (event.message) {
      await this.processIncomingMessage({
        channelId,
        channelType: 'instagram',
        externalId: event.message.mid,
        from: event.sender.id,
        content: event.message.text || '',
        contentType: event.message.attachments ? 'media' : 'text',
        timestamp: new Date(event.timestamp),
        metadata: {
          ...event.message,
          sender: event.sender  // Include sender info in metadata
        }
      }, companyId);
    }

    if (event.delivery) {
      // Process delivery confirmation
      for (const mid of event.delivery.mids || []) {
        await this.processMessageStatus({
          externalId: mid,
          status: 'delivered',
          timestamp: new Date(event.delivery.watermark)
        }, companyId);
      }
    }

    if (event.read) {
      // Process read receipt
      await this.processMessageStatus({
        externalId: event.read.mid,
        status: 'read',
        timestamp: new Date(event.read.watermark)
      }, companyId);
    }
  }

  /**
   * Process Email webhook events
   */
  private async processEmailEvent(webhook: IWebhook, companyId: string): Promise<void> {
    const { payload } = webhook;

    switch (payload.eventType) {
      case 'bounce':
        await this.processEmailBounce(payload, companyId);
        break;

      case 'delivery':
        await this.processMessageStatus({
          externalId: payload.messageId,
          status: 'delivered',
          timestamp: new Date(payload.deliveryTimestamp)
        }, companyId);
        break;

      case 'open':
        await this.processEmailOpen(payload, companyId);
        break;

      case 'click':
        await this.processEmailClick(payload, companyId);
        break;
    }
  }

  /**
   * Process SMS webhook events
   */
  private async processSMSEvent(webhook: IWebhook, companyId: string): Promise<void> {
    const { payload } = webhook;

    if (payload.SmsStatus === 'received') {
      await this.processIncomingMessage({
        channelId: webhook.channel_id,
        channelType: 'sms',
        externalId: payload.MessageSid,
        from: payload.From,
        content: payload.Body,
        contentType: 'text',
        timestamp: new Date(),
        metadata: {
          ...payload,
          from_number: payload.From  // Preserve sender phone number
        }
      }, companyId);
    } else {
      await this.processMessageStatus({
        externalId: payload.MessageSid,
        status: this.mapSMSStatus(payload.SmsStatus || payload.MessageStatus),
        timestamp: new Date()
      }, companyId);
    }
  }

  /**
   * Process incoming message
   */
  private async processIncomingMessage(data: IncomingMessageData, companyId: string): Promise<void> {
    try {
      this.logger.info('Processing incoming message', {
        channelType: data.channelType,
        from: data.from
      });

      const contactInfo = await this.resolveContact({
        companyId,
        channelId: data.channelId,
        externalId: data.from,
        contacts: data.contacts,
        metadata: data.metadata
      });

      // Find or create conversation anchored to contact
      let conversation = await this.conversationRepository.findByChannelAndCustomer(
        data.channelId,
        contactInfo.contactId,
        companyId
      );

      if (!conversation) {
        const normalizedPhone = this.normalizePhone(data.from);
        conversation = await this.conversationRepository.create(
          {
            channel_id: data.channelId,
            channel_type: data.channelType,
            external_id: undefined, // WhatsApp doesn't provide conversation external ID
            contact_id: contactInfo.contactId,
            customer_id: contactInfo.customerId,
            status: ConversationStatus.OPEN,
            priority: ConversationPriority.NORMAL,
            tags: [],
            metadata: {
              source: 'webhook',
              firstMessageId: data.externalId,
              contactExternalId: data.from, // Store contact's external ID in metadata
              customer_phone: normalizedPhone, // For outbound message routing
              phone_number: normalizedPhone // Alternative field name for compatibility
            }
          },
          companyId
        );
      }

      // Create message record
      await this.messageRepository.createMessage(
        {
          conversation_id: conversation.id,
          channel_id: data.channelId,
          customer_id: conversation.customer_id || contactInfo.customerId,
          direction: MessageDirection.INBOUND,
          sender_type: MessageSenderType.CUSTOMER,
          // NOTE: sender_id is UUID type for agent/user IDs only, not for customer external IDs
          // For customers, use customer_id and store external ID in metadata
          recipient_identifier: data.channelId,
          content: data.content,
          content_type: data.contentType || MessageContentType.TEXT,
          status: MessageStatus.RECEIVED,
          metadata: {
            ...data.metadata,
            sender_external_id: data.from  // Store customer's external ID (phone number) in metadata
          },
          external_message_id: data.externalId
        },
        companyId
      );

      this.logger.info('Incoming message processed', {
        conversationId: conversation.id,
        messageId: data.externalId
      });
    } catch (error) {
      this.logger.error('Failed to process incoming message', error);
      throw error;
    }
  }

  /**
   * Process message status update
   */
  private async processMessageStatus(data: any, companyId: string): Promise<void> {
    try {
      const message = await this.messageRepository.findByExternalId(
        data.externalId,
        companyId
      );

      if (message) {
        await this.messageRepository.updateStatus(
          message.id,
          data.status,
          companyId
        );

        this.logger.debug('Message status updated', {
          messageId: message.id,
          status: data.status
        });
      }
    } catch (error) {
      this.logger.error('Failed to process message status', error);
    }
  }

  private async resolveContact(input: {
    companyId: string;
    channelId: string;
    externalId: string;
    contacts?: any[];
    metadata?: any;
  }): Promise<{ contactId: string; customerId?: string }> {
    const normalizedPhone = this.normalizePhone(input.externalId);

    // Try contact identities first
    const existingIdentity = await this.contactIdentityRepository.findByChannelAndExternalId(
      input.channelId,
      input.externalId
    );

    if (existingIdentity) {
      await this.contactRepository.updateLastInteraction(existingIdentity.contact_id, input.companyId);
      return { contactId: existingIdentity.contact_id };
    }

    // Find existing contact by phone
    let contact = await this.contactRepository.findByPhone(input.companyId, normalizedPhone);
    if (!contact) {
      contact = await this.contactRepository.createContact(
        {
          first_name: this.extractContactName(input.contacts),
          phone: normalizedPhone,
          tags: ['whatsapp'],
          custom_fields: {
            whatsapp_id: input.externalId
          },
          created_by: input.companyId
        },
        input.companyId
      );
    }

    await this.contactIdentityRepository.upsertIdentity({
      contact_id: contact.id,
      channel_id: input.channelId,
      external_id: input.externalId,
      display_name: this.extractContactName(input.contacts),
      profile_data: input.metadata?.profile || {}
    });

    await this.contactRepository.updateLastInteraction(contact.id, input.companyId);

    // Ensure customer exists
    let customer = await this.customerRepository.findByWhatsAppId(input.externalId, input.companyId);
    if (!customer) {
      customer = await this.customerRepository.create({
        first_name: this.extractContactName(input.contacts),
        phone_number: normalizedPhone,
        whatsapp_id: input.externalId,
        display_name: this.extractContactName(input.contacts) || `WhatsApp ${normalizedPhone}`,
        metadata: { source: 'whatsapp' }
      }, input.companyId);
    }

    return { contactId: contact.id, customerId: customer.id };
  }

  private extractContactName(contacts?: any[]): string | undefined {
    const entry = contacts && contacts.length > 0 ? contacts[0] : null;
    return entry?.profile?.name;
  }

  private normalizePhone(raw: string): string {
    const digits = raw.replace(/[^0-9+]/g, '');
    if (digits.startsWith('+')) {
      return digits;
    }
    if (digits.startsWith('00')) {
      return `+${digits.substring(2)}`;
    }
    if (digits.length > 10 && digits.startsWith('54')) {
      return `+${digits}`;
    }
    return `+${digits}`;
  }

  /**
   * Process email bounce
   */
  private async processEmailBounce(payload: any, companyId: string): Promise<void> {
    await this.processMessageStatus({
      externalId: payload.messageId,
      status: 'failed',
      timestamp: new Date(),
      error: `Bounce: ${payload.bounceType} - ${payload.bounceSubType}`
    }, companyId);
  }

  /**
   * Process email open event
   */
  private async processEmailOpen(payload: any, companyId: string): Promise<void> {
    // Update message metadata with open tracking
    const message = await this.messageRepository.findByExternalId(
      payload.messageId,
      companyId
    );

    if (message) {
      await this.messageRepository.update(message.id, {
        metadata: {
          ...message.metadata,
          opens: [
            ...(message.metadata?.opens || []),
            {
              timestamp: payload.openTimestamp,
              ipAddress: payload.ipAddress,
              userAgent: payload.userAgent
            }
          ]
        }
      }, companyId);
    }
  }

  /**
   * Process email click event
   */
  private async processEmailClick(payload: any, companyId: string): Promise<void> {
    // Update message metadata with click tracking
    const message = await this.messageRepository.findByExternalId(
      payload.messageId,
      companyId
    );

    if (message) {
      await this.messageRepository.update(message.id, {
        metadata: {
          ...message.metadata,
          clicks: [
            ...(message.metadata?.clicks || []),
            {
              timestamp: payload.clickTimestamp,
              link: payload.link
            }
          ]
        }
      }, companyId);
    }
  }

  /**
   * Get or create connector instance
   */
  private async getConnector(
    channelId: string,
    channelType: string,
    config: any
  ): Promise<IChannelConnector> {
    if (!this.connectorCache.has(channelId)) {
      const connector = this.connectorFactory.create(channelType, config);
      await connector.initialize(config);
      this.connectorCache.set(channelId, connector);
    }

    return this.connectorCache.get(channelId)!;
  }

  /**
   * Detect event type from webhook payload
   */
  private detectEventType(payload: any): string {
    // WhatsApp/Instagram
    if (payload.entry?.[0]?.changes?.[0]?.field) {
      return payload.entry[0].changes[0].field;
    }

    // Email
    if (payload.eventType) {
      return payload.eventType;
    }

    // SMS
    if (payload.SmsStatus || payload.MessageStatus) {
      return payload.SmsStatus || payload.MessageStatus;
    }

    return 'unknown';
  }

  /**
   * Map WhatsApp status to internal status
   */
  private mapWhatsAppStatus(status: string): any {
    const statusMap: any = {
      'sent': 'sent',
      'delivered': 'delivered',
      'read': 'read',
      'failed': 'failed'
    };

    return statusMap[status] || status;
  }

  /**
   * Map SMS status to internal status
   */
  private mapSMSStatus(status: string): any {
    const statusMap: any = {
      'queued': 'pending',
      'sent': 'sent',
      'delivered': 'delivered',
      'undelivered': 'failed',
      'failed': 'failed'
    };

    return statusMap[status] || status;
  }

  /**
   * Generate webhook ID
   */
  private generateWebhookId(): string {
    return `webhook_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Get webhook by ID
   */
  getWebhook(webhookId: string): IWebhook | undefined {
    return this.webhookStore.get(webhookId);
  }

  /**
   * Clean up old webhooks
   */
  cleanupOldWebhooks(ageMs: number = 86400000): void {
    const cutoff = Date.now() - ageMs;
    const toDelete: string[] = [];

    for (const [id, webhook] of this.webhookStore) {
      if (webhook.received_at.getTime() < cutoff) {
        toDelete.push(id);
      }
    }

    toDelete.forEach(id => this.webhookStore.delete(id));

    this.logger.info('Cleaned up old webhooks', { count: toDelete.length });
  }
}
