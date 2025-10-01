/**
 * CRM Integration Routes
 * API endpoints for CRM module integration
 * Sprint N+1 - CRM-Omni Integration
 */

import { Router } from 'express';
import { container } from '@/container/container';
import { CRMIntegrationController } from '../controllers/CRMIntegrationController';

const router = Router();

// Get controller instance from DI container
const controller = container.get<CRMIntegrationController>(CRMIntegrationController);

/**
 * Conversation endpoints
 */
// GET /api/omni/crm-integration/conversations/qualified
router.get(
  '/conversations/qualified',
  (req, res) => controller.getQualifiedConversations(req, res)
);

// GET /api/omni/crm-integration/conversations/:id
router.get(
  '/conversations/:id',
  (req, res) => controller.getConversation(req, res)
);

// POST /api/omni/crm-integration/conversations/:id/link
router.post(
  '/conversations/:id/link',
  (req, res) => controller.linkConversationToLead(req, res)
);

/**
 * Landing page submission endpoints
 */
// GET /api/omni/crm-integration/submissions/:id
router.get(
  '/submissions/:id',
  (req, res) => controller.getLandingPageSubmission(req, res)
);

// GET /api/omni/crm-integration/submissions
router.get(
  '/submissions',
  (req, res) => controller.getRecentSubmissions(req, res)
);

/**
 * Email engagement endpoints
 */
// GET /api/omni/crm-integration/email-engagements
router.get(
  '/email-engagements',
  (req, res) => controller.getEmailEngagements(req, res)
);

// POST /api/omni/crm-integration/email-engagements
router.post(
  '/email-engagements',
  (req, res) => controller.trackEmailEngagement(req, res)
);

export default router;
