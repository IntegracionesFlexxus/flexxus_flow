/**
 * CRM Integration Controller
 * Handles API requests from CRM module for omnichannel data
 * Sprint N+1 - CRM-Omni Integration
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { ConversationService } from '../services';
import { LandingPageRepository } from '../repositories/LandingPageRepository'; // Sprint N+3
import { EmailEngagementRepository } from '../repositories/EmailEngagementRepository'; // Sprint N+3

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
    @inject(TYPES.OmniConversationService) private conversationService: ConversationService,
    @inject(TYPES.OmniLandingPageRepository) private landingPageRepo: LandingPageRepository, // Sprint N+3
    @inject(TYPES.OmniEmailEngagementRepository) private emailEngagementRepo: EmailEngagementRepository // Sprint N+3
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

      if (!companyId) {
        res.status(401).json(apiResponse(false, null, 'Company ID not found'));
        return;
      }

      const submission = await this.landingPageRepo.findSubmissionById(id, companyId);

      if (!submission) {
        res.status(404).json(apiResponse(false, null, 'Submission not found'));
        return;
      }

      // Format submission for CRM consumption
      const formattedSubmission = {
        id: submission.submission_id,
        landingPageId: submission.landing_page_id,
        formData: submission.form_data,
        utm: {
          source: submission.utm_source,
          medium: submission.utm_medium,
          campaign: submission.utm_campaign,
          term: submission.utm_term,
          content: submission.utm_content
        },
        referrer: submission.referrer_url,
        submittedAt: submission.submitted_at
      };

      res.json(apiResponse(true, formattedSubmission, 'Submission retrieved successfully'));
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

      if (!companyId) {
        res.status(401).json(apiResponse(false, null, 'Company ID not found'));
        return;
      }

      const submissions = await this.landingPageRepo.findRecentSubmissions(companyId, since);

      // Format submissions for CRM consumption
      const formattedSubmissions = submissions.map(sub => ({
        id: sub.submission_id,
        landingPageId: sub.landing_page_id,
        formData: sub.form_data,
        email: sub.email,
        firstName: sub.first_name,
        lastName: sub.last_name,
        phone: sub.phone,
        company: sub.company_name,
        utm: {
          source: sub.utm_source,
          medium: sub.utm_medium,
          campaign: sub.utm_campaign,
          term: sub.utm_term,
          content: sub.utm_content
        },
        referrer: sub.referrer_url,
        status: sub.status,
        submittedAt: sub.submitted_at
      }));

      res.json(apiResponse(true, formattedSubmissions, 'Submissions retrieved successfully'));
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

      if (!companyId) {
        res.status(401).json(apiResponse(false, null, 'Company ID not found'));
        return;
      }

      const events = await this.emailEngagementRepo.findEventsByEmail(email as string, companyId);

      // Format engagement events for CRM consumption
      const formattedEvents = events.map(event => ({
        contactEmail: event.contact_email,
        campaignId: event.campaign_id,
        action: event.event_type,
        linkUrl: event.link_url,
        timestamp: event.occurred_at
      }));

      res.json(apiResponse(true, formattedEvents, 'Email engagements retrieved successfully'));
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

      if (!companyId) {
        res.status(401).json(apiResponse(false, null, 'Company ID not found'));
        return;
      }

      // Track the engagement event
      const event = await this.emailEngagementRepo.trackEvent({
        campaign_id: campaignId,
        company_id: companyId,
        contact_email: contactEmail,
        event_type: action as any,
        link_url: linkUrl,
        occurred_at: new Date()
      });

      res.json(apiResponse(true, { eventId: event.event_id }, 'Email engagement tracked successfully'));
    } catch (error: any) {
      res.status(500).json(apiResponse(false, null, error.message));
    }
  }
}
