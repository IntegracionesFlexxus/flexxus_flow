/**
 * Omni Module Services - Sprint 05
 * All services for the omnichannel module
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

// Import repositories
import { ChannelRepository } from '../repositories/ChannelRepository';
import { ConversationRepository } from '../repositories/ConversationRepository';
import { MessageRepository } from '../repositories/MessageRepository';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { TemplateRepository, QuickReplyRepository } from '../repositories/TemplateRepository';

// Import interfaces
import { IChannel, IChannelCreate, IChannelUpdate } from '../interfaces/IChannel';
import { IConversation, IConversationCreate, IConversationUpdate, IConversationAssign } from '../interfaces/IConversation';
import { IMessage, IMessageCreate, IMessageSend } from '../interfaces/IMessage';
import { ICustomer, ICustomerCreate, ICustomerUpdate, ICustomerSearch } from '../interfaces/ICustomer';
import { IMessageTemplate, IMessageTemplateCreate, IQuickReply } from '../interfaces/ITemplate';

// Import types
import { ConversationStatus, ConversationFilters } from '../types/conversation.types';
import { MessageStatus } from '../types/message.types';
import { ChannelHealthStatus } from '../types/channel.types';

/**
 * Channel Service
 */
@injectable()
export class ChannelService {
  private logger: any;

  constructor(
    @inject(TYPES.OmniChannelRepository) private channelRepo: ChannelRepository
  ) {
    this.logger = LoggerFactory.create({ file: __filename });
  }

  async createChannel(data: IChannelCreate, companyId: string): Promise<IChannel> {
    this.logger.info('Creating channel', { channelType: data.channel_type, companyId });

    // Validate channel configuration based on type
    this.validateChannelConfig(data);

    return await this.channelRepo.createChannel(data, companyId);
  }

  async getActiveChannels(companyId: string): Promise<IChannel[]> {
    return await this.channelRepo.findActiveChannels(companyId);
  }

  async getChannelById(channelId: string, companyId: string): Promise<IChannel | null> {
    return await this.channelRepo.findById(channelId, companyId);
  }

  async updateChannel(channelId: string, data: IChannelUpdate, companyId: string): Promise<IChannel | null> {
    return await this.channelRepo.update(channelId, data, companyId);
  }

  async deleteChannel(channelId: string, companyId: string): Promise<boolean> {
    return await this.channelRepo.delete(channelId, companyId);
  }

  async checkChannelHealth(channelId: string, companyId: string): Promise<ChannelHealthStatus> {
    // TODO: Implement actual health checks for each channel type
    const channel = await this.channelRepo.findById(channelId, companyId);
    if (!channel) return ChannelHealthStatus.UNKNOWN;

    // For now, return the stored status
    return channel.health_status;
  }

  async checkDailyLimit(channelId: string, channelType: string): Promise<boolean> {
    return await this.channelRepo.checkDailyLimit(channelId, channelType as any);
  }

  private validateChannelConfig(data: IChannelCreate): void {
    // Basic validation - expand based on channel type
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Channel name is required');
    }

    // Add specific validation for each channel type
    switch (data.channel_type) {
      case 'whatsapp':
        if (!data.configuration.phoneNumber) {
          throw new Error('Phone number is required for WhatsApp channel');
        }
        break;
      case 'email':
        if (!data.configuration.fromEmail) {
          throw new Error('From email is required for Email channel');
        }
        break;
      // Add more validations as needed
    }
  }
}

/**
 * Conversation Service
 */
@injectable()
export class ConversationService {
  private logger: any;

  constructor(
    @inject(TYPES.OmniConversationRepository) private conversationRepo: ConversationRepository,
    @inject(TYPES.OmniCustomerRepository) private customerRepo: CustomerRepository
  ) {
    this.logger = LoggerFactory.create({ file: __filename });
  }

  async createConversation(data: IConversationCreate, companyId: string): Promise<IConversation> {
    this.logger.info('Creating conversation', { channelType: data.channel_type, companyId });
    return await this.conversationRepo.create(data as Partial<IConversation>, companyId);
  }

  async getConversations(filters: ConversationFilters, companyId: string): Promise<IConversation[]> {
    return await this.conversationRepo.findWithFilters(companyId, filters);
  }

  async getConversationById(conversationId: string, companyId: string): Promise<any> {
    return await this.conversationRepo.getConversationWithDetails(conversationId, companyId);
  }

  async updateConversation(
    conversationId: string,
    data: IConversationUpdate,
    companyId: string
  ): Promise<IConversation | null> {
    return await this.conversationRepo.update(conversationId, data, companyId);
  }

  async assignConversation(
    conversationId: string,
    assignment: IConversationAssign,
    companyId: string
  ): Promise<IConversation | null> {
    this.logger.info('Assigning conversation', { conversationId, assignedTo: assignment.assigned_to });
    return await this.conversationRepo.assignToAgent(conversationId, assignment, companyId);
  }

  async resolveConversation(conversationId: string, companyId: string): Promise<IConversation | null> {
    return await this.conversationRepo.updateStatus(conversationId, ConversationStatus.RESOLVED, companyId);
  }

  async reopenConversation(conversationId: string, companyId: string): Promise<IConversation | null> {
    return await this.conversationRepo.updateStatus(conversationId, ConversationStatus.OPEN, companyId);
  }

  async getConversationStats(companyId: string): Promise<any> {
    return await this.conversationRepo.getStatsByCompany(companyId);
  }

  async markAsRead(conversationId: string, companyId: string): Promise<void> {
    await this.conversationRepo.resetUnreadCount(conversationId, companyId);
  }

  /**
   * Get qualified conversations ready for CRM lead capture
   * Sprint N+1 - CRM Integration
   */
  async getQualifiedConversations(companyId: string, since?: Date): Promise<IConversation[]> {
    const filters: ConversationFilters = {
      status: 'qualified',
      since
    };
    return await this.conversationRepo.findWithFilters(companyId, filters);
  }

  /**
   * Link conversation to CRM lead
   * Sprint N+1 - CRM Integration
   */
  async linkToCRM(conversationId: string, leadId: number, companyId: string): Promise<void> {
    this.logger.info('Linking conversation to CRM lead', { conversationId, leadId });

    // Store CRM reference in conversation metadata
    const updateData: IConversationUpdate = {
      metadata: {
        crm_lead_id: leadId,
        crm_linked_at: new Date().toISOString()
      },
      tags: ['crm_linked']
    };

    await this.conversationRepo.update(conversationId, updateData, companyId);
  }
}

/**
 * Message Service
 */
@injectable()
export class MessageService {
  private logger: any;

  constructor(
    @inject(TYPES.OmniMessageRepository) private messageRepo: MessageRepository,
    @inject(TYPES.OmniConversationRepository) private conversationRepo: ConversationRepository,
    @inject(TYPES.OmniChannelRepository) private channelRepo: ChannelRepository
  ) {
    this.logger = LoggerFactory.create({ file: __filename });
  }

  async sendMessage(data: IMessageSend, companyId: string): Promise<IMessage> {
    this.logger.info('Sending message', { channelId: data.channel_id, recipient: data.recipient });

    // Check channel daily limit
    const channel = await this.channelRepo.findById(data.channel_id, companyId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const withinLimit = await this.channelRepo.checkDailyLimit(data.channel_id, channel.channel_type);
    if (!withinLimit) {
      throw new Error('Daily message limit reached for this channel');
    }

    // TODO: Create or find conversation
    // TODO: Send actual message through channel provider
    // For now, create a pending message

    const messageData: IMessageCreate = {
      conversation_id: '', // Should be set based on conversation
      content: data.content,
      content_type: data.content_type || 'text',
      sender_type: 'agent',
      sender_id: '', // Should be set from auth context
      media_url: data.media_url,
      metadata: data.metadata
    };

    const message = await this.messageRepo.createMessage(messageData, companyId);

    // Increment channel message count
    await this.channelRepo.incrementMessageCount(data.channel_id, channel.channel_type);

    return message;
  }

  async getConversationMessages(conversationId: string, companyId: string, limit = 50): Promise<IMessage[]> {
    return await this.messageRepo.getConversationMessages(conversationId, companyId, { limit });
  }

  async updateMessageStatus(messageId: string, status: MessageStatus, companyId: string): Promise<IMessage | null> {
    return await this.messageRepo.updateStatus(messageId, status, companyId);
  }

  async markMessagesAsRead(conversationId: string, companyId: string): Promise<number> {
    const readCount = await this.messageRepo.markAsRead(conversationId, companyId);

    // Reset conversation unread count
    if (readCount > 0) {
      await this.conversationRepo.resetUnreadCount(conversationId, companyId);
    }

    return readCount;
  }

  async searchMessages(searchTerm: string, companyId: string): Promise<IMessage[]> {
    return await this.messageRepo.searchMessages(searchTerm, companyId);
  }

  async retryFailedMessage(messageId: string, companyId: string): Promise<IMessage | null> {
    return await this.messageRepo.retryMessage(messageId, companyId);
  }
}

/**
 * Customer Service
 */
@injectable()
export class CustomerService {
  private logger: any;

  constructor(
    @inject(TYPES.OmniCustomerRepository) private customerRepo: CustomerRepository
  ) {
    this.logger = LoggerFactory.create({ file: __filename });
  }

  async createCustomer(data: ICustomerCreate, companyId: string): Promise<ICustomer> {
    this.logger.info('Creating customer', { email: data.email, phone: data.phone_number });

    // Check for existing customer
    if (data.email) {
      const existing = await this.customerRepo.findByEmail(data.email, companyId);
      if (existing) {
        throw new Error('Customer with this email already exists');
      }
    }

    if (data.phone_number) {
      const existing = await this.customerRepo.findByPhone(data.phone_number, companyId);
      if (existing) {
        throw new Error('Customer with this phone number already exists');
      }
    }

    return await this.customerRepo.create(data as Partial<ICustomer>, companyId);
  }

  async searchCustomers(search: ICustomerSearch, companyId: string): Promise<ICustomer[]> {
    return await this.customerRepo.searchCustomers(search, companyId);
  }

  async getCustomerById(customerId: string, companyId: string): Promise<ICustomer | null> {
    return await this.customerRepo.findById(customerId, companyId);
  }

  async updateCustomer(customerId: string, data: ICustomerUpdate, companyId: string): Promise<ICustomer | null> {
    return await this.customerRepo.update(customerId, data, companyId);
  }

  async mergeCustomers(primaryId: string, duplicateId: string, companyId: string): Promise<boolean> {
    this.logger.info('Merging customers', { primaryId, duplicateId });
    return await this.customerRepo.mergeCustomers(primaryId, duplicateId, companyId);
  }

  async findOrCreateCustomer(
    identifier: { email?: string; phone_number?: string },
    data: ICustomerCreate,
    companyId: string
  ): Promise<ICustomer> {
    return await this.customerRepo.findOrCreate(identifier, data, companyId);
  }

  async getCustomerStats(customerId: string, companyId: string): Promise<any> {
    return await this.customerRepo.getCustomerStats(customerId, companyId);
  }

  async addTags(customerId: string, tags: string[], companyId: string): Promise<void> {
    await this.customerRepo.addTags(customerId, tags, companyId);
  }

  async removeTags(customerId: string, tags: string[], companyId: string): Promise<void> {
    await this.customerRepo.removeTags(customerId, tags, companyId);
  }
}

/**
 * Template Service
 */
@injectable()
export class TemplateService {
  private logger: any;

  constructor(
    @inject(TYPES.OmniTemplateRepository) private templateRepo: TemplateRepository
  ) {
    this.logger = LoggerFactory.create({ file: __filename });
  }

  async createTemplate(data: IMessageTemplateCreate, companyId: string): Promise<IMessageTemplate> {
    this.logger.info('Creating template', { name: data.name, channelType: data.channel_type });

    // Check for duplicate
    const existing = await this.templateRepo.findByName(data.name, data.channel_type, companyId);
    if (existing) {
      throw new Error('Template with this name already exists for this channel');
    }

    return await this.templateRepo.create(data as Partial<IMessageTemplate>, companyId);
  }

  async getTemplatesByChannel(channelType: string, companyId: string): Promise<IMessageTemplate[]> {
    return await this.templateRepo.findByChannelType(channelType, companyId);
  }

  async getTemplateById(templateId: string, companyId: string): Promise<IMessageTemplate | null> {
    return await this.templateRepo.findById(templateId, companyId);
  }

  async updateTemplate(
    templateId: string,
    data: Partial<IMessageTemplate>,
    companyId: string
  ): Promise<IMessageTemplate | null> {
    return await this.templateRepo.update(templateId, data, companyId);
  }

  async deleteTemplate(templateId: string, companyId: string): Promise<boolean> {
    return await this.templateRepo.delete(templateId, companyId);
  }

  async getMostUsedTemplates(companyId: string, limit = 10): Promise<IMessageTemplate[]> {
    return await this.templateRepo.getMostUsedTemplates(companyId, limit);
  }

  async useTemplate(templateId: string, companyId: string): Promise<void> {
    await this.templateRepo.incrementUsageCount(templateId, companyId);
  }

  async searchTemplates(searchTerm: string, companyId: string, channelType?: string): Promise<IMessageTemplate[]> {
    return await this.templateRepo.searchTemplates(searchTerm, companyId, channelType);
  }
}

// Export all services
export {
  ChannelService,
  ConversationService,
  MessageService,
  CustomerService,
  TemplateService
};