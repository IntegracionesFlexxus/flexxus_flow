/**
 * CRM Integration Controller
 * Handles API requests from CRM module for omnichannel data
 * Sprint N+1 - CRM-Omni Integration
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { ConversationService } from '../services';

// Helper for consistent API responses
const apiResponse = (success: boolean, data: any = null, message: string = '') => ({
  success,
  data,
  message,
  timestamp: new Date().toISOString()
});

@injectable()
export class CRMIntegrationController {
  constructor(
    @inject(TYPES.OmniConversationService) private conversationService: ConversationService
  ) {}

  /**
   * GET /api/omni/crm-integration/conversations/:id
   * Get conversation details for CRM lead capture
   */
  async getConversation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = (req as any).user?.companyId;

      if (!companyId) {
        res.status(401).json(apiResponse(false, null, 'Company ID not found'));
        return;
      }

      const conversation = await this.conversationService.getConversationById(id, companyId);

      if (!conversation) {
        res.status(404).json(apiResponse(false, null, 'Conversation not found'));
        return;
      }

      // Format conversation for CRM consumption
      const formattedConversation = {
        id: conversation.conversation_id,
        customerId: conversation.customer_id,
        customerEmail: conversation.customer?.email,
        messages: conversation.messages?.map(msg => ({
          content: msg.content,
          sender: msg.direction === 'inbound' ? 'customer' : 'agent',
          timestamp: msg.created_at
        })) || [],
        metadata: {
          firstName: conversation.customer?.first_name,
          lastName: conversation.customer?.last_name,
          phone: conversation.customer?.phone,
          company: conversation.customer?.company_name,
          email: conversation.customer?.email
        },
        qualified: conversation.status === 'qualified',
        createdAt: conversation.created_at
      };

      res.json(apiResponse(true, formattedConversation, 'Conversation retrieved successfully'));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }

  /**
   * GET /api/omni/crm-integration/conversations/qualified
   * Get qualified conversations ready for lead capture
   */
  async getQualifiedConversations(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).user?.companyId;
      const since = req.query.since ? new Date(req.query.since as string) : undefined;

      if (!companyId) {
        res.status(401).json(apiResponse(false, null, 'Company ID not found'));
        return;
      }

      // Get conversations with status 'qualified' or 'ready_for_crm'
      const conversations = await this.conversationService.getQualifiedConversations(
        companyId,
        since
      );

      const formattedConversations = conversations.map(conv => ({
        id: conv.conversation_id,
        customerId: conv.customer_id,
        customerEmail: conv.customer?.email,
        qualified: true,
        createdAt: conv.created_at,
        summary: conv.summary,
        metadata: {
          firstName: conv.customer?.first_name,
          lastName: conv.customer?.last_name,
          phone: conv.customer?.phone,
          company: conv.customer?.company_name,
          email: conv.customer?.email
        }
      }));

      res.json(apiResponse(true, formattedConversations, 'Qualified conversations retrieved'));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }

  /**
   * POST /api/omni/crm-integration/conversations/:id/link
   * Link conversation to CRM lead
   */
  async linkConversationToLead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { leadId } = req.body;
      const companyId = (req as any).user?.companyId;

      if (!companyId) {
        res.status(401).json(apiResponse(false, null, 'Company ID not found'));
        return;
      }

      if (!leadId) {
        res.status(400).json(apiResponse(false, null, 'Lead ID is required'));
        return;
      }

      // Update conversation with CRM lead reference
      await this.conversationService.linkToCRM(id, leadId, companyId);

      res.json(apiResponse(true, { conversationId: id, leadId }, 'Conversation linked to lead'));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }

  /**
   * GET /api/omni/crm-integration/submissions/:id
   * Get landing page submission details
   */
  async getLandingPageSubmission(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = (req as any).user?.companyId;

      // TODO: Implement landing page submissions repository
      // For now, return mock structure
      res.status(501).json(apiResponse(false, null, 'Landing page submissions not yet implemented'));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }

  /**
   * GET /api/omni/crm-integration/submissions
   * Get recent landing page submissions
   */
  async getRecentSubmissions(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).user?.companyId;
      const since = req.query.since ? new Date(req.query.since as string) : undefined;

      // TODO: Implement landing page submissions repository
      res.status(501).json(apiResponse(false, null, 'Landing page submissions not yet implemented'));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }

  /**
   * GET /api/omni/crm-integration/email-engagements
   * Get email engagement history for a contact
   */
  async getEmailEngagements(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.query;
      const companyId = (req as any).user?.companyId;

      if (!email) {
        res.status(400).json(apiResponse(false, null, 'Email parameter is required'));
        return;
      }

      // TODO: Implement email engagement tracking
      res.status(501).json(apiResponse(false, null, 'Email engagement tracking not yet implemented'));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }

  /**
   * POST /api/omni/crm-integration/email-engagements
   * Track email engagement event
   */
  async trackEmailEngagement(req: Request, res: Response): Promise<void> {
    try {
      const { contactEmail, campaignId, action, linkUrl } = req.body;
      const companyId = (req as any).user?.companyId;

      if (!contactEmail || !action) {
        res.status(400).json(apiResponse(false, null, 'Contact email and action are required'));
        return;
      }

      // TODO: Implement email engagement tracking
      res.status(501).json(apiResponse(false, null, 'Email engagement tracking not yet implemented'));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }
}
