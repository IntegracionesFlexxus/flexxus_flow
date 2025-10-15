/**
 * AI Routes - Sprint 10
 * Route definitions for AI-powered features
 */

import { Router } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { authMiddleware } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { body, param, query } from 'express-validator';

// Import AI controller
import { AIController } from '../controllers/AIController';

// Create router
const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get AI controller from container
const getAIController = (): AIController => {
  try {
    return container.get<AIController>('AIController');
  } catch (error) {
    throw error;
  }
};

// Initialize controller
const aiController = getAIController();

// =======================
// SENTIMENT ANALYSIS ROUTES
// =======================

/**
 * Analyze sentiment of text
 * POST /api/omni/ai/sentiment/analyze
 */
router.post('/sentiment/analyze',
  [
    body('text')
      .isString()
      .isLength({ min: 1, max: 10000 })
      .withMessage('Text must be a string between 1 and 10000 characters'),
    body('context')
      .optional()
      .isObject()
      .withMessage('Context must be an object'),
    body('context.conversation_id')
      .optional()
      .isUUID()
      .withMessage('Conversation ID must be a valid UUID'),
    body('context.language')
      .optional()
      .isString()
      .isLength({ min: 2, max: 5 })
      .withMessage('Language must be a valid language code'),
    body('context.customer_id')
      .optional()
      .isUUID()
      .withMessage('Customer ID must be a valid UUID')
  ],
  validateRequest,
  (req, res) => aiController.analyzeSentiment(req, res)
);

/**
 * Analyze conversation sentiment
 * POST /api/omni/ai/sentiment/conversation
 */
router.post('/sentiment/conversation',
  [
    body('conversation_id')
      .isUUID()
      .withMessage('Conversation ID must be a valid UUID')
  ],
  validateRequest,
  (req, res) => aiController.analyzeConversationSentiment(req, res)
);

/**
 * Get sentiment statistics
 * GET /api/omni/ai/sentiment/stats
 */
router.get('/sentiment/stats',
  [
    query('period')
      .optional()
      .isIn(['hour', 'day', 'week', 'month'])
      .withMessage('Period must be one of: hour, day, week, month')
  ],
  validateRequest,
  (req, res) => aiController.getSentimentStats(req, res)
);

// =======================
// SUMMARIZATION ROUTES
// =======================

/**
 * Summarize conversation
 * POST /api/omni/ai/summary/conversation
 */
router.post('/summary/conversation',
  [
    body('conversation_id')
      .isUUID()
      .withMessage('Conversation ID must be a valid UUID'),
    body('options')
      .optional()
      .isObject()
      .withMessage('Options must be an object'),
    body('options.max_length')
      .optional()
      .isInt({ min: 10, max: 1000 })
      .withMessage('Max length must be between 10 and 1000'),
    body('options.style')
      .optional()
      .isIn(['bullet_points', 'paragraph', 'executive', 'technical'])
      .withMessage('Style must be one of: bullet_points, paragraph, executive, technical'),
    body('options.include_sentiment')
      .optional()
      .isBoolean()
      .withMessage('Include sentiment must be a boolean'),
    body('options.include_action_items')
      .optional()
      .isBoolean()
      .withMessage('Include action items must be a boolean'),
    body('options.language')
      .optional()
      .isString()
      .isLength({ min: 2, max: 5 })
      .withMessage('Language must be a valid language code'),
    body('options.focus_areas')
      .optional()
      .isArray()
      .withMessage('Focus areas must be an array')
  ],
  validateRequest,
  (req, res) => aiController.summarizeConversation(req, res)
);

/**
 * Summarize messages
 * POST /api/omni/ai/summary/messages
 */
router.post('/summary/messages',
  [
    body('messages')
      .isArray({ min: 1 })
      .withMessage('Messages must be a non-empty array'),
    body('messages.*')
      .custom((value) => {
        if (typeof value === 'string') return true;
        if (typeof value === 'object' && value !== null && typeof value.content === 'string') return true;
        throw new Error('Each message must be a string or object with content property');
      }),
    body('options')
      .optional()
      .isObject()
      .withMessage('Options must be an object'),
    body('options.max_length')
      .optional()
      .isInt({ min: 10, max: 1000 })
      .withMessage('Max length must be between 10 and 1000'),
    body('options.style')
      .optional()
      .isIn(['bullet_points', 'paragraph', 'executive', 'technical'])
      .withMessage('Style must be one of: bullet_points, paragraph, executive, technical')
  ],
  validateRequest,
  (req, res) => aiController.summarizeMessages(req, res)
);

/**
 * Generate executive summary
 * POST /api/omni/ai/summary/executive
 */
router.post('/summary/executive',
  [
    body('conversation_id')
      .isUUID()
      .withMessage('Conversation ID must be a valid UUID')
  ],
  validateRequest,
  (req, res) => aiController.generateExecutiveSummary(req, res)
);

/**
 * Summarize period
 * POST /api/omni/ai/summary/period
 */
router.post('/summary/period',
  [
    body('start_date')
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    body('end_date')
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    body('options')
      .optional()
      .isObject()
      .withMessage('Options must be an object'),
    body('options.max_length')
      .optional()
      .isInt({ min: 10, max: 2000 })
      .withMessage('Max length must be between 10 and 2000'),
    body('options.style')
      .optional()
      .isIn(['bullet_points', 'paragraph', 'executive', 'technical'])
      .withMessage('Style must be one of: bullet_points, paragraph, executive, technical')
  ],
  validateRequest,
  (req, res) => aiController.summarizePeriod(req, res)
);

// =======================
// ANALYSIS ROUTES
// =======================

/**
 * Get AI analysis for conversation
 * GET /api/omni/ai/analysis/:conversation_id
 */
router.get('/analysis/:conversation_id',
  [
    param('conversation_id')
      .isUUID()
      .withMessage('Conversation ID must be a valid UUID')
  ],
  validateRequest,
  (req, res) => aiController.getConversationAnalysis(req, res)
);

/**
 * Trigger full AI processing for conversation
 * POST /api/omni/ai/process/conversation
 */
router.post('/process/conversation',
  [
    body('conversation_id')
      .isUUID()
      .withMessage('Conversation ID must be a valid UUID'),
    body('features')
      .optional()
      .isArray({ min: 1 })
      .withMessage('Features must be a non-empty array'),
    body('features.*')
      .isIn(['sentiment', 'summary', 'intent'])
      .withMessage('Each feature must be one of: sentiment, summary, intent')
  ],
  validateRequest,
  (req, res) => aiController.processConversation(req, res)
);

// =======================
// STATUS AND HEALTH ROUTES
// =======================

/**
 * Get AI processing status
 * GET /api/omni/ai/status
 */
router.get('/status',
  (req, res) => aiController.getProcessingStatus(req, res)
);

/**
 * AI health check
 * GET /api/omni/ai/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    module: 'omni-ai',
    features: {
      sentiment_analysis: 'available',
      summarization: 'available',
      intent_detection: 'coming_soon'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
