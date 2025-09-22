// controllers/ConversationController.ts
import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { ConversationService } from '../services/ConversationService';
import { validateConversation } from '../validators/messageValidators';
import { OMNI_TYPES } from '../types/omni.types';

@injectable()
export class ConversationController {
  constructor(
    @inject(OMNI_TYPES.ConversationService) private conversationService: ConversationService
  ) {}

  async createConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const validatedData = await validateConversation(req.body);

      const conversation = await this.conversationService.createConversation({
        ...validatedData,
        companyId,
        createdBy: req.user?.id
      });

      res.status(201).json({
        success: true,
        data: conversation,
        message: 'Conversation created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const filters = {
        status: req.query.status as string,
        assignedTo: req.query.assignedTo as string,
        channelType: req.query.channelType as string,
        priority: req.query.priority as string,
        limit: parseInt(req.query.limit as string) || 50
      };

      // Filtrar propiedades undefined
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] === undefined) {
          delete filters[key as keyof typeof filters];
        }
      });

      const conversations = await this.conversationService.getConversations(
        companyId,
        filters
      );

      res.json({
        success: true,
        data: conversations,
        count: conversations.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const conversation = await this.conversationService.getConversation(id);

      if (!conversation) {
        res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
        return;
      }

      res.json({
        success: true,
        data: conversation
      });
    } catch (error) {
      next(error);
    }
  }

  async assignConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'userId is required'
        });
        return;
      }

      const conversation = await this.conversationService.assignConversation(id, userId);

      if (!conversation) {
        res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
        return;
      }

      res.json({
        success: true,
        data: conversation,
        message: 'Conversation assigned successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateConversationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          message: 'status is required'
        });
        return;
      }

      const conversation = await this.conversationService.updateConversationStatus(id, status);

      if (!conversation) {
        res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
        return;
      }

      res.json({
        success: true,
        data: conversation,
        message: 'Conversation status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async resolveConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const conversation = await this.conversationService.resolveConversation(id);

      if (!conversation) {
        res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
        return;
      }

      res.json({
        success: true,
        data: conversation,
        message: 'Conversation resolved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async reopenConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const conversation = await this.conversationService.reopenConversation(id);

      if (!conversation) {
        res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
        return;
      }

      res.json({
        success: true,
        data: conversation,
        message: 'Conversation reopened successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateConversationPriority(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { priority } = req.body;

      if (!priority) {
        res.status(400).json({
          success: false,
          message: 'priority is required'
        });
        return;
      }

      const conversation = await this.conversationService.updateConversationPriority(
        id,
        priority
      );

      if (!conversation) {
        res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
        return;
      }

      res.json({
        success: true,
        data: conversation,
        message: 'Conversation priority updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async addTags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { tags } = req.body;

      if (!tags || !Array.isArray(tags)) {
        res.status(400).json({
          success: false,
          message: 'tags array is required'
        });
        return;
      }

      const conversation = await this.conversationService.addTagsToConversation(id, tags);

      if (!conversation) {
        res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
        return;
      }

      res.json({
        success: true,
        data: conversation,
        message: 'Tags added successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async removeTags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { tags } = req.body;

      if (!tags || !Array.isArray(tags)) {
        res.status(400).json({
          success: false,
          message: 'tags array is required'
        });
        return;
      }

      const conversation = await this.conversationService.removeTagsFromConversation(id, tags);

      if (!conversation) {
        res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
        return;
      }

      res.json({
        success: true,
        data: conversation,
        message: 'Tags removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getConversationStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const stats = await this.conversationService.getConversationStats(companyId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}