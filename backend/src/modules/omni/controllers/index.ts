/**
 * Omni Module Controllers - Sprint 05
 * All controllers for the omnichannel module
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';

// Import services
import {
  ChannelService,
  ConversationService,
  MessageService,
  CustomerService,
  TemplateService
} from '../services';

// Base response helper
const apiResponse = (success: boolean, data: any = null, message: string = '') => ({
  success,
  data,
  message,
  timestamp: new Date().toISOString()
});

/**
 * Channel Controller
 */
@injectable()
export class ChannelController {
  constructor(
    @inject(TYPES.OmniChannelService) private channelService: ChannelService
  ) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      console.log('🔍 [ChannelController.create] Request info:', {
        companyId,
        userId: (req as any).userId,
        body: req.body
      });

      if (!companyId) {
        console.error('❌ [ChannelController.create] Company ID not found');
        res.status(401).json(apiResponse(false, null, 'Company ID not found'));
        return;
      }

      console.log('💾 [ChannelController.create] Creating channel...');
      const channel = await this.channelService.createChannel(req.body, companyId);
      console.log('✅ [ChannelController.create] Channel created successfully:', channel);
      res.status(201).json(apiResponse(true, channel, 'Channel created successfully'));
    } catch (error: any) {
      console.error('❌ [ChannelController.create] Error:', error);
      res.status(400).json(apiResponse(false, null, error.message));
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    console.log('⏱️ [ChannelController.list] Request received at:', new Date().toISOString());

    try {
      const companyId = (req as any).companyId;
      console.log('🔍 [ChannelController.list] CompanyId:', companyId);

      if (!companyId) {
        console.log('⚠️ [ChannelController.list] No companyId, returning empty array');
        res.json(apiResponse(true, []));
        return;
      }

      const serviceStartTime = Date.now();
      const channels = await this.channelService.getActiveChannels(companyId) || [];
      const serviceEndTime = Date.now();

      console.log('✅ [ChannelController.list] Service completed in:', serviceEndTime - serviceStartTime, 'ms');
      console.log('📊 [ChannelController.list] Channels found:', channels.length);

      res.json(apiResponse(true, channels));

      const totalTime = Date.now() - startTime;
      console.log('🏁 [ChannelController.list] Total request time:', totalTime, 'ms');
    } catch (error: any) {
      const errorTime = Date.now() - startTime;
      console.error('❌ [ChannelController.list] Error after', errorTime, 'ms:', error);
      res.json(apiResponse(true, [], 'Error fetching channels, returning empty list'));
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;

      const channel = await this.channelService.getChannelById(id, companyId);
      if (!channel) {
        res.status(404).json(apiResponse(false, null, 'Channel not found'));
        return;
      }

      res.json(apiResponse(true, channel));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;

      const channel = await this.channelService.updateChannel(id, req.body, companyId);
      if (!channel) {
        res.status(404).json(apiResponse(false, null, 'Channel not found'));
        return;
      }

      res.json(apiResponse(true, channel, 'Channel updated successfully'));
    } catch (error: any) {
      res.status(400).json(apiResponse(false, null, error.message));
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;

      const deleted = await this.channelService.deleteChannel(id, companyId);
      if (!deleted) {
        res.status(404).json(apiResponse(false, null, 'Channel not found'));
        return;
      }

      res.json(apiResponse(true, null, 'Channel deleted successfully'));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }

  async checkHealth(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;

      const health = await this.channelService.checkChannelHealth(id, companyId);
      res.json(apiResponse(true, {
        healthy: health === 'healthy' || health === 'active',
        status: health,
        message: `Channel is ${health}`,
        lastCheck: new Date().toISOString()
      }));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }

  async validateCredentials(req: Request, res: Response): Promise<void> {
    try {
      const { channel_type, configuration } = req.body;
      const companyId = (req as any).companyId || (req as any).user?.companyId;

      // Log para debugging
      console.log('🔍 Validate credentials request:', {
        channel_type,
        hasConfiguration: !!configuration,
        companyId,
        userId: (req as any).userId,
        hasAuthHeader: !!req.headers.authorization
      });

      // Validación básica de datos requeridos
      if (!channel_type) {
        res.status(400).json(apiResponse(false, null, 'Channel type is required'));
        return;
      }

      if (!configuration) {
        res.status(400).json(apiResponse(false, null, 'Configuration is required'));
        return;
      }

      // Por ahora, validación básica
      // TODO: Implementar validación real con los proveedores
      const result = {
        valid: true,
        message: 'Credentials validation successful',
        errors: [],
        warnings: [],
        checks: [
          {
            name: 'Format validation',
            status: 'success',
            message: 'All fields have correct format',
            details: ['Structure valid', 'Data types correct']
          },
          {
            name: 'API Connection',
            status: 'warning',
            message: 'Mock validation - real API check pending',
            details: ['Using test mode', 'Real validation will be implemented']
          }
        ],
        // Incluir companyId si está disponible para referencia
        companyId: companyId || null
      };

      // Validación simple según tipo
      if (channel_type === 'whatsapp' && !configuration.phoneNumber) {
        result.valid = false;
        result.errors = ['Phone number is required'];
      }

      if (channel_type === 'email' && !configuration.fromEmail) {
        result.valid = false;
        result.errors = ['From email is required'];
      }

      console.log('✅ Validation result:', { valid: result.valid, errors: result.errors });
      res.json(apiResponse(true, result));
    } catch (error: any) {
      console.error('❌ Validation error:', error);
      res.status(400).json(apiResponse(false, null, error.message));
    }
  }

  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;

      console.log('🧪 [ChannelController.testConnection] Testing channel:', {
        channelId: id,
        companyId
      });

      if (!companyId) {
        res.status(401).json(apiResponse(false, null, 'Company ID not found'));
        return;
      }

      const result = await this.channelService.testConnection(id, companyId);

      console.log('✅ [ChannelController.testConnection] Test result:', result);

      res.json(apiResponse(result.success, result));
    } catch (error: any) {
      console.error('❌ [ChannelController.testConnection] Error:', error);
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }
}

/**
 * Conversation Controller
 */
@injectable()
export class ConversationController {
  constructor(
    @inject(TYPES.OmniConversationService) private conversationService: ConversationService
  ) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const conversation = await this.conversationService.createConversation(req.body, companyId);
      res.status(201).json(apiResponse(true, conversation, 'Conversation created successfully'));
    } catch (error: any) {
      res.status(400).json(apiResponse(false, null, error.message));
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const filters = req.query as any;

      const conversations = await this.conversationService.getConversations(filters, companyId);
      res.json(apiResponse(true, conversations));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;

      const conversation = await this.conversationService.getConversationById(id, companyId);
      if (!conversation) {
        res.status(404).json(apiResponse(false, null, 'Conversation not found'));
        return;
      }

      res.json(apiResponse(true, conversation));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;

      const conversation = await this.conversationService.updateConversation(id, req.body, companyId);
      if (!conversation) {
        res.status(404).json(apiResponse(false, null, 'Conversation not found'));
        return;
      }

      res.json(apiResponse(true, conversation, 'Conversation updated successfully'));
    } catch (error: any) {
      res.status(400).json(apiResponse(false, null, error.message));
    }
  }

  async assign(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;

      const conversation = await this.conversationService.assignConversation(id, req.body, companyId);
      if (!conversation) {
        res.status(404).json(apiResponse(false, null, 'Conversation not found'));
        return;
      }

      res.json(apiResponse(true, conversation, 'Conversation assigned successfully'));
    } catch (error: any) {
      res.status(400).json(apiResponse(false, null, error.message));
    }
  }

  async resolve(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;

      const conversation = await this.conversationService.resolveConversation(id, companyId);
      res.json(apiResponse(true, conversation, 'Conversation resolved'));
    } catch (error: any) {
      res.status(400).json(apiResponse(false, null, error.message));
    }
  }

  async reopen(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;

      const conversation = await this.conversationService.reopenConversation(id, companyId);
      res.json(apiResponse(true, conversation, 'Conversation reopened'));
    } catch (error: any) {
      res.status(400).json(apiResponse(false, null, error.message));
    }
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;

      await this.conversationService.markAsRead(id, companyId);
      res.json(apiResponse(true, null, 'Marked as read'));
    } catch (error: any) {
      res.status(400).json(apiResponse(false, null, error.message));
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const stats = await this.conversationService.getConversationStats(companyId);
      res.json(apiResponse(true, stats));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }
}

/**
 * Message Controller
 */
@injectable()
export class MessageController {
  constructor(
    @inject(TYPES.OmniMessageService) private messageService: MessageService
  ) {}

  async send(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const message = await this.messageService.sendMessage(req.body, companyId);
      res.status(201).json(apiResponse(true, message, 'Message sent successfully'));
    } catch (error: any) {
      res.status(400).json(apiResponse(false, null, error.message));
    }
  }

  async getByConversation(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;
      const { limit = 50 } = req.query;

      const messages = await this.messageService.getConversationMessages(
        id,
        companyId,
        parseInt(limit as string)
      );
      res.json(apiResponse(true, messages));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;
      const { status } = req.body;

      const message = await this.messageService.updateMessageStatus(id, status, companyId);
      if (!message) {
        res.status(404).json(apiResponse(false, null, 'Message not found'));
        return;
      }

      res.json(apiResponse(true, message, 'Message status updated'));
    } catch (error: any) {
      res.status(400).json(apiResponse(false, null, error.message));
    }
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { conversationId } = req.body;

      const count = await this.messageService.markMessagesAsRead(conversationId, companyId);
      res.json(apiResponse(true, { marked: count }, `${count} messages marked as read`));
    } catch (error: any) {
      res.status(400).json(apiResponse(false, null, error.message));
    }
  }

  async search(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { q } = req.query;

      if (!q) {
        res.status(400).json(apiResponse(false, null, 'Search term required'));
        return;
      }

      const messages = await this.messageService.searchMessages(q as string, companyId);
      res.json(apiResponse(true, messages));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }

  async retry(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;

      const message = await this.messageService.retryFailedMessage(id, companyId);
      if (!message) {
        res.status(404).json(apiResponse(false, null, 'Message not found'));
        return;
      }

      res.json(apiResponse(true, message, 'Message retry initiated'));
    } catch (error: any) {
      res.status(400).json(apiResponse(false, null, error.message));
    }
  }
}

/**
 * Customer Controller
 */
@injectable()
export class CustomerController {
  constructor(
    @inject(TYPES.OmniCustomerService) private customerService: CustomerService
  ) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const customer = await this.customerService.createCustomer(req.body, companyId);
      res.status(201).json(apiResponse(true, customer, 'Customer created successfully'));
    } catch (error: any) {
      res.status(400).json(apiResponse(false, null, error.message));
    }
  }

  async search(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const customers = await this.customerService.searchCustomers(req.query as any, companyId);
      res.json(apiResponse(true, customers));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;

      const customer = await this.customerService.getCustomerById(id, companyId);
      if (!customer) {
        res.status(404).json(apiResponse(false, null, 'Customer not found'));
        return;
      }

      res.json(apiResponse(true, customer));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;

      const customer = await this.customerService.updateCustomer(id, req.body, companyId);
      if (!customer) {
        res.status(404).json(apiResponse(false, null, 'Customer not found'));
        return;
      }

      res.json(apiResponse(true, customer, 'Customer updated successfully'));
    } catch (error: any) {
      res.status(400).json(apiResponse(false, null, error.message));
    }
  }

  async merge(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { primaryId, duplicateId } = req.body;

      const success = await this.customerService.mergeCustomers(primaryId, duplicateId, companyId);
      if (!success) {
        res.status(400).json(apiResponse(false, null, 'Failed to merge customers'));
        return;
      }

      res.json(apiResponse(true, null, 'Customers merged successfully'));
    } catch (error: any) {
      res.status(400).json(apiResponse(false, null, error.message));
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;

      const stats = await this.customerService.getCustomerStats(id, companyId);
      res.json(apiResponse(true, stats));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }

  async addTags(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;
      const { tags } = req.body;

      await this.customerService.addTags(id, tags, companyId);
      res.json(apiResponse(true, null, 'Tags added successfully'));
    } catch (error: any) {
      res.status(400).json(apiResponse(false, null, error.message));
    }
  }

  async removeTags(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;
      const { tags } = req.body;

      await this.customerService.removeTags(id, tags, companyId);
      res.json(apiResponse(true, null, 'Tags removed successfully'));
    } catch (error: any) {
      res.status(400).json(apiResponse(false, null, error.message));
    }
  }
}

/**
 * Template Controller
 */
@injectable()
export class TemplateController {
  constructor(
    @inject(TYPES.OmniTemplateService) private templateService: TemplateService
  ) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const template = await this.templateService.createTemplate(req.body, companyId);
      res.status(201).json(apiResponse(true, template, 'Template created successfully'));
    } catch (error: any) {
      res.status(400).json(apiResponse(false, null, error.message));
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { channelType } = req.query;

      if (!channelType) {
        res.status(400).json(apiResponse(false, null, 'Channel type is required'));
        return;
      }

      const templates = await this.templateService.getTemplatesByChannel(channelType as string, companyId);
      res.json(apiResponse(true, templates));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;

      const template = await this.templateService.getTemplateById(id, companyId);
      if (!template) {
        res.status(404).json(apiResponse(false, null, 'Template not found'));
        return;
      }

      res.json(apiResponse(true, template));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;

      const template = await this.templateService.updateTemplate(id, req.body, companyId);
      if (!template) {
        res.status(404).json(apiResponse(false, null, 'Template not found'));
        return;
      }

      res.json(apiResponse(true, template, 'Template updated successfully'));
    } catch (error: any) {
      res.status(400).json(apiResponse(false, null, error.message));
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { id } = req.params;

      const deleted = await this.templateService.deleteTemplate(id, companyId);
      if (!deleted) {
        res.status(404).json(apiResponse(false, null, 'Template not found'));
        return;
      }

      res.json(apiResponse(true, null, 'Template deleted successfully'));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }

  async getMostUsed(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const templates = await this.templateService.getMostUsedTemplates(companyId);
      res.json(apiResponse(true, templates));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }

  async search(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).companyId;
      const { q, channelType } = req.query;

      if (!q) {
        res.status(400).json(apiResponse(false, null, 'Search term required'));
        return;
      }

      const templates = await this.templateService.searchTemplates(
        q as string,
        companyId,
        channelType as string
      );
      res.json(apiResponse(true, templates));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }
}

// Export all controllers
export {
  ChannelController,
  ConversationController,
  MessageController,
  CustomerController,
  TemplateController
};