/**
 * NLP Controller - Sprint 12
 * REST API endpoints for NLP services
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IntentClassificationService } from '../nlp/services/IntentClassificationService';
import { ConversationContextService } from '../nlp/services/ConversationContextService';

@injectable()
export class NLPController {
  constructor(
    @inject(TYPES.IntentClassificationService)
    private intentClassificationService: IntentClassificationService,

    @inject(TYPES.ConversationContextService)
    private conversationContextService: ConversationContextService
  ) {}

  /**
   * POST /api/omni/nlp/intent/classify
   * Classify intent from text
   */
  async classifyIntent(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { text } = req.body;

      if (!text) {
        res.status(400).json({
          success: false,
          error: 'text is required'
        });
        return;
      }

      const result = await this.intentClassificationService.classifyIntent(text, tenantId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/omni/nlp/context
   * Add context to conversation
   */
  async addContext(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { conversation_id, context_type, context_data, options } = req.body;

      if (!conversation_id || !context_type || !context_data) {
        res.status(400).json({
          success: false,
          error: 'conversation_id, context_type, and context_data are required'
        });
        return;
      }

      const context = await this.conversationContextService.addContext(
        conversation_id,
        context_type,
        context_data,
        tenantId,
        options
      );

      res.status(201).json({
        success: true,
        data: context
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/omni/nlp/context/:conversationId
   * Get conversation context
   */
  async getConversationContext(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { conversationId } = req.params;

      const contexts = await this.conversationContextService.getConversationContext(
        conversationId,
        tenantId
      );

      res.status(200).json({
        success: true,
        data: contexts,
        count: contexts.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/omni/nlp/context/:conversationId/summary
   * Get conversation context summary
   */
  async getContextSummary(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { conversationId } = req.params;

      const summary = await this.conversationContextService.getContextSummary(
        conversationId,
        tenantId
      );

      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/omni/nlp/context/:conversationId
   * Clear conversation context
   */
  async clearContext(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { conversationId } = req.params;

      await this.conversationContextService.clearConversationContext(
        conversationId,
        tenantId
      );

      res.status(200).json({
        success: true,
        message: 'Conversation context cleared'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}
