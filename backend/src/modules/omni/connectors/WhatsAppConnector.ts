/**
 * WhatsApp Channel Connector
 * Integración con Meta WhatsApp Business Cloud API
 */

import { injectable } from 'inversify';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { BaseChannelConnector } from './base/BaseChannelConnector';
import { IMessage, IMessageStatus, ISendMessageResult } from '../interfaces/IMessage';
import { IWebhook } from '../interfaces/IWebhook';
import { IChannelConfig } from './base/IChannelConnector';
import { MessageContentType } from '../types/message.types';

interface WhatsAppTemplateMetadata {
  id: string;
  language?: string;
  variables?: any;
}

@injectable()
export class WhatsAppConnector extends BaseChannelConnector {
  private readonly defaultVersion = 'v17.0';
  private apiVersion: string = this.defaultVersion;
  private phoneNumberId!: string;
  private accessToken!: string;
  private businessAccountId?: string;
  private httpClient!: AxiosInstance;

  async initialize(config: IChannelConfig): Promise<void> {
    await super.initialize(config);

    this.phoneNumberId =
      config.phoneNumberId ||
      config.phone_number_id ||
      config.details?.phone_number_id ||
      '';
    this.accessToken =
      config.accessToken ||
      config.api_token ||
      config.token ||
      config.details?.access_token ||
      '';
    this.businessAccountId =
      config.businessAccountId ||
      config.business_account_id ||
      config.details?.business_account_id;
    this.apiVersion = config.apiVersion || config.api_version || this.defaultVersion;

    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error('WhatsApp connector requires phoneNumberId and accessToken');
    }

    this.httpClient = axios.create({
      baseURL: `https://graph.facebook.com/${this.apiVersion}`,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: config.timeout || 10000
    });

    this.logger.info('WhatsApp connector initialized', {
      phoneNumberId: this.phoneNumberId,
      apiVersion: this.apiVersion
    });
  }

  async sendMessage(message: IMessage): Promise<ISendMessageResult> {
    if (!this.isInitialized) {
      throw new Error('WhatsApp connector not initialized');
    }

    try {
      const payload = this.buildWhatsAppPayload(message);
      this.logger.info('WhatsApp API request', {
        endpoint: `/${this.phoneNumberId}/messages`,
        method: 'POST',
        to: payload.to,
        type: payload.type,
        conversationId: message.conversation_id
      });
      this.logger.debug('Sending WhatsApp message', {
        to: payload.to,
        type: payload.type,
        conversationId: message.conversation_id
      });

      const response = await this.httpClient.post(`/${this.phoneNumberId}/messages`, payload);
      this.logger.info('WhatsApp API response', {
        endpoint: `/${this.phoneNumberId}/messages`,
        status: response.status,
        messageId: response.data?.messages?.[0]?.id || response.data?.id || response.data?.message_id,
        raw: response.data
      });
      this.updateRateLimitFromHeaders(response.headers);

      const messageId =
        response.data?.messages?.[0]?.id ||
        response.data?.id ||
        response.data?.message_id ||
        '';

      return {
        success: true,
        messageId,
        status: 'sent',
        timestamp: new Date(),
        details: response.data
      };
    } catch (error) {
      const parsed = this.parseAxiosError(error);
      this.logger.error('Failed to send WhatsApp message', parsed.logContext);

      return {
        success: false,
        messageId: '',
        status: 'failed',
        timestamp: new Date(),
        error: parsed.message,
        details: parsed.details
      };
    }
  }

  async getMessageStatus(messageId: string): Promise<IMessageStatus> {
    if (!this.isInitialized) {
      throw new Error('WhatsApp connector not initialized');
    }

    try {
      this.logger.info('WhatsApp API request', {
        endpoint: `/${messageId}`,
        method: 'GET',
        messageId
      });
      const response = await this.httpClient.get(`/${messageId}`);
      this.logger.info('WhatsApp API response', {
        endpoint: `/${messageId}`,
        status: response.status,
        raw: response.data
      });
      const status = response.data?.status || response.data?.messages?.[0]?.status;
      return this.mapWhatsAppStatus(status);
    } catch (error) {
      const parsed = this.parseAxiosError(error);
      this.logger.warn('Failed to fetch WhatsApp message status', parsed.logContext);
      return 'sent';
    }
  }

  async processWebhook(webhook: IWebhook): Promise<void> {
    const { payload } = webhook;

    if (!payload?.entry) {
      this.logger.warn('WhatsApp webhook without entries');
      return;
    }

    for (const entry of payload.entry) {
      if (!entry?.changes) continue;
      for (const change of entry.changes) {
        if (change?.value?.messages) {
          for (const message of change.value.messages) {
            this.logger.info('WhatsApp inbound message received', {
              id: message.id,
              from: message.from,
              type: message.type
            });
          }
        }

        if (change?.value?.statuses) {
          for (const status of change.value.statuses) {
            this.logger.info('WhatsApp delivery update received', {
              id: status.id,
              status: status.status,
              recipient: status.recipient_id
            });
          }
        }
      }
    }
  }

  protected getChannelType(): string {
    return 'WhatsApp';
  }

  private buildWhatsAppPayload(message: IMessage): any {
    const to = this.normalizeRecipient(message.recipient_identifier);
    const basePayload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to
    };

    const type = (message.content_type || MessageContentType.TEXT).toLowerCase();

    switch (type) {
      case MessageContentType.IMAGE:
        if (!message.media_url) {
          throw new Error('media_url is required for WhatsApp image messages');
        }
        return {
          ...basePayload,
          type: 'image',
          image: {
            link: message.media_url,
            caption: message.content || undefined
          }
        };

      case MessageContentType.DOCUMENT:
        if (!message.media_url) {
          throw new Error('media_url is required for WhatsApp document messages');
        }
        return {
          ...basePayload,
          type: 'document',
          document: {
            link: message.media_url,
            caption: message.content || undefined,
            filename: message.metadata?.filename || 'document'
          }
        };

      case MessageContentType.AUDIO:
        if (!message.media_url) {
          throw new Error('media_url is required for WhatsApp audio messages');
        }
        return {
          ...basePayload,
          type: 'audio',
          audio: {
            link: message.media_url
          }
        };

      case MessageContentType.VIDEO:
        if (!message.media_url) {
          throw new Error('media_url is required for WhatsApp video messages');
        }
        return {
          ...basePayload,
          type: 'video',
          video: {
            link: message.media_url,
            caption: message.content || undefined
          }
        };

      case MessageContentType.TEMPLATE:
        return this.buildTemplatePayload(message, basePayload);

      default:
        return {
          ...basePayload,
          type: 'text',
          text: {
            preview_url: false,
            body: message.content || ''
          }
        };
    }
  }

  private buildTemplatePayload(message: IMessage, basePayload: any): any {
    const templateMeta: WhatsAppTemplateMetadata | undefined =
      message.metadata?.template || message.metadata?.whatsappTemplate;

    if (!templateMeta?.id) {
      throw new Error('Template id is required for WhatsApp template messages');
    }

    return {
      ...basePayload,
      type: 'template',
      template: {
        name: templateMeta.id,
        language: {
          code: templateMeta.language || 'en'
        },
        components: this.buildTemplateComponents(templateMeta.variables)
      }
    };
  }

  private buildTemplateComponents(variables?: any): any[] {
    if (!variables) {
      return [];
    }

    if (Array.isArray(variables)) {
      return variables;
    }

    const components: any[] = [];

    if (variables.header) {
      components.push({
        type: 'header',
        parameters: this.normalizeTemplateParameters(variables.header)
      });
    }

    if (variables.body || typeof variables === 'object') {
      const source = variables.body || variables;
      const parameters = this.normalizeTemplateParameters(source);
      if (parameters.length > 0) {
        components.push({
          type: 'body',
          parameters
        });
      }
    }

    if (variables.buttons) {
      components.push({
        type: 'button',
        sub_type: variables.buttons.sub_type,
        index: variables.buttons.index,
        parameters: this.normalizeTemplateParameters(variables.buttons.parameters || variables.buttons)
      });
    }

    return components;
  }

  private normalizeTemplateParameters(source: any): any[] {
    if (!source) {
      return [];
    }

    if (Array.isArray(source)) {
      return source.map((parameter) => this.normalizeTemplateParameter(parameter));
    }

    return Object.values(source).map((parameter) => this.normalizeTemplateParameter(parameter));
  }

  private normalizeTemplateParameter(parameter: any): any {
    if (typeof parameter === 'string' || typeof parameter === 'number') {
      return {
        type: 'text',
        text: String(parameter)
      };
    }

    if (parameter && typeof parameter === 'object') {
      if (parameter.type) {
        return parameter;
      }

      if (parameter.text) {
        return {
          type: 'text',
          text: parameter.text
        };
      }

      if (parameter.currency) {
        return {
          type: 'currency',
          currency: parameter.currency
        };
      }

      if (parameter.date_time) {
        return {
          type: 'date_time',
          date_time: parameter.date_time
        };
      }
    }

    return {
      type: 'text',
      text: JSON.stringify(parameter)
    };
  }

  private normalizeRecipient(recipient?: string): string {
    if (!recipient) {
      throw new Error('Recipient identifier is required');
    }

    const digits = recipient.replace(/\D/g, '');
    if (!digits) {
      throw new Error('Recipient must contain numeric characters');
    }

    return digits;
  }

  private mapWhatsAppStatus(status: string | undefined): IMessageStatus {
    switch ((status || '').toLowerCase()) {
      case 'delivered':
        return 'delivered';
      case 'read':
        return 'read';
      case 'failed':
      case 'undelivered':
        return 'failed';
      case 'sent':
      case 'dispatched':
        return 'sent';
      default:
        return 'sent';
    }
  }

  private updateRateLimitFromHeaders(headers: Record<string, any>): void {
    const usageHeader = headers['x-business-use-case-usage'];
    if (!usageHeader) {
      return;
    }

    try {
      const usage = JSON.parse(usageHeader);
      const phoneUsage = usage[this.phoneNumberId]?.[0];
      if (phoneUsage?.limit && phoneUsage?.current !== undefined) {
        this.updateRateLimit(
          phoneUsage.limit,
          Math.max(0, phoneUsage.limit - phoneUsage.current)
        );
      }
    } catch (error) {
      this.logger.warn('Failed to parse WhatsApp rate-limit header', {
        header: usageHeader
      });
    }
  }

  private parseAxiosError(error: unknown): {
    message: string;
    details?: any;
    logContext: Record<string, any>;
  } {
    if (!axios.isAxiosError(error)) {
      const err = error as Error;
      return {
        message: err.message,
        logContext: { error: err }
      };
    }

    const axiosError = error as AxiosError<any>;
    const responseData = axiosError.response?.data;
    const message =
      responseData?.error?.message ||
      axiosError.message ||
      'Unknown WhatsApp API error';

    return {
      message,
      details: responseData,
      logContext: {
        message: axiosError.message,
        status: axiosError.response?.status,
        response: responseData
      }
    };
  }
}
