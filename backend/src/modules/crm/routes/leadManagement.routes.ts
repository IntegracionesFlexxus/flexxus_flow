/**
 * Lead Management Routes
 * Defines all API endpoints for lead management features
 */

import { Router } from 'express';
import { Container } from 'inversify';
import { LeadManagementController } from '../controllers/LeadManagementController';
import { authenticateToken } from '@/shared/middleware/auth';
import { validateRequest } from '@/shared/middleware/validation';
import { body, param, query } from 'express-validator';

export function createLeadManagementRoutes(container: Container): Router {
  const router = Router();
  const controller = container.get<LeadManagementController>('LeadManagementController');

  // Apply auth middleware to all routes
  router.use(authenticateToken);

// ========== SCORING ENDPOINTS ==========

// Calculate lead score
router.post(
  '/leads/:leadId/score',
  [
    param('leadId').isInt().withMessage('Lead ID must be an integer')
  ],
  validateRequest,
  controller.calculateScore.bind(controller)
);

// Bulk calculate scores
router.post(
  '/leads/bulk-score',
  [
    body('leadIds').isArray().withMessage('Lead IDs must be an array'),
    body('leadIds.*').isInt().withMessage('Each lead ID must be an integer')
  ],
  validateRequest,
  controller.bulkCalculateScores.bind(controller)
);

// Get current lead score
router.get(
  '/leads/:leadId/score',
  [
    param('leadId').isInt().withMessage('Lead ID must be an integer')
  ],
  validateRequest,
  controller.getScore.bind(controller)
);

// ========== ASSIGNMENT ENDPOINTS ==========

// Assign lead
router.post(
  '/leads/:leadId/assign',
  [
    param('leadId').isInt().withMessage('Lead ID must be an integer'),
    body('assigneeId').optional().isInt().withMessage('Assignee ID must be an integer')
  ],
  validateRequest,
  controller.assignLead.bind(controller)
);

// Auto-assign unassigned leads
router.post(
  '/leads/auto-assign',
  [
    body('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000')
  ],
  validateRequest,
  controller.autoAssignLeads.bind(controller)
);

// Get assignment rules
router.get(
  '/assignment/rules',
  controller.getAssignmentRules.bind(controller)
);

// Create assignment rule
router.post(
  '/assignment/rules',
  [
    body('name').notEmpty().withMessage('Rule name is required'),
    body('priority').isInt({ min: 0 }).withMessage('Priority must be a non-negative integer'),
    body('assignment_type').isIn(['round_robin', 'load_balance', 'territory', 'manual'])
      .withMessage('Invalid assignment type'),
    body('assignee_pool').isArray().withMessage('Assignee pool must be an array'),
    body('assignee_pool.*').isInt().withMessage('Each assignee ID must be an integer'),
    body('criteria').optional().isObject().withMessage('Criteria must be an object'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
  ],
  validateRequest,
  controller.createAssignmentRule.bind(controller)
);

// Update assignment rule
router.put(
  '/assignment/rules/:ruleId',
  [
    param('ruleId').isInt().withMessage('Rule ID must be an integer'),
    body('name').optional().notEmpty().withMessage('Rule name cannot be empty'),
    body('priority').optional().isInt({ min: 0 }).withMessage('Priority must be a non-negative integer'),
    body('assignment_type').optional().isIn(['round_robin', 'load_balance', 'territory', 'manual'])
      .withMessage('Invalid assignment type'),
    body('assignee_pool').optional().isArray().withMessage('Assignee pool must be an array'),
    body('criteria').optional().isObject().withMessage('Criteria must be an object'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
  ],
  validateRequest,
  controller.updateAssignmentRule.bind(controller)
);

// Check SLA compliance
router.get(
  '/assignment/sla-compliance',
  controller.checkSLACompliance.bind(controller)
);

// ========== DUPLICATE DETECTION ENDPOINTS ==========

// Find duplicates for a lead
router.get(
  '/leads/:leadId/duplicates',
  [
    param('leadId').isInt().withMessage('Lead ID must be an integer')
  ],
  validateRequest,
  controller.findDuplicates.bind(controller)
);

// Merge duplicate leads
router.post(
  '/leads/:leadId/merge',
  [
    param('leadId').isInt().withMessage('Lead ID must be an integer'),
    body('duplicateIds').isArray().withMessage('Duplicate IDs must be an array'),
    body('duplicateIds.*').isInt().withMessage('Each duplicate ID must be an integer'),
    body('strategy').optional().isObject().withMessage('Strategy must be an object'),
    body('strategy.keepField').optional()
      .isIn(['newest', 'oldest', 'highest_score', 'manual'])
      .withMessage('Invalid keepField strategy'),
    body('strategy.preserveHistory').optional().isBoolean()
      .withMessage('preserveHistory must be a boolean'),
    body('strategy.mergeCustomFields').optional().isBoolean()
      .withMessage('mergeCustomFields must be a boolean')
  ],
  validateRequest,
  controller.mergeDuplicates.bind(controller)
);

// Auto-merge high confidence duplicates
router.post(
  '/leads/auto-merge-duplicates',
  controller.autoMergeDuplicates.bind(controller)
);

// Find all duplicate groups
router.get(
  '/leads/duplicate-groups',
  controller.findAllDuplicateGroups.bind(controller)
);

  return router;
}

export function createLeadManagementWebhooks(container: Container): Router {
  const webhookRouter = Router();
  const controller = container.get<LeadManagementController>('LeadManagementController');

// Form submitted webhook
webhookRouter.post(
  '/omnichannel/form-submitted',
  [
    body('submissionId').notEmpty().withMessage('Submission ID is required'),
    body('landingPageId').notEmpty().withMessage('Landing page ID is required'),
    body('formData').isObject().withMessage('Form data must be an object'),
    body('companyId').isInt().withMessage('Company ID must be an integer')
  ],
  validateRequest,
  controller.handleOmniChannelFormSubmitted.bind(controller)
);

// Chat qualified webhook
webhookRouter.post(
  '/omnichannel/chat-qualified',
  [
    body('conversationId').notEmpty().withMessage('Conversation ID is required'),
    body('customerId').notEmpty().withMessage('Customer ID is required'),
    body('qualified').isBoolean().withMessage('Qualified must be a boolean'),
    body('companyId').isInt().withMessage('Company ID must be an integer')
  ],
  validateRequest,
  controller.handleOmniChannelChatQualified.bind(controller)
);

// Email engaged webhook
webhookRouter.post(
  '/omnichannel/email-engaged',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('campaignId').notEmpty().withMessage('Campaign ID is required'),
    body('action').isIn(['open', 'click', 'reply']).withMessage('Invalid action'),
    body('companyId').isInt().withMessage('Company ID must be an integer')
  ],
  validateRequest,
  controller.handleOmniChannelEmailEngaged.bind(controller)
);

  return webhookRouter;
}

export const leadManagementRoutes = createLeadManagementRoutes;
export const leadManagementWebhooks = createLeadManagementWebhooks;