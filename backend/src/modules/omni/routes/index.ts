/**
 * Omni Module Routes - Sprint 05 & 06
 * Route definitions for all omnichannel endpoints
 */

import { Router } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { authMiddleware } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { channelValidators, conversationValidators, messageValidators, customerValidators, templateValidators } from '../validators/omni.validators';

// Import controllers
import {
  ChannelController,
  ConversationController,
  MessageController,
  CustomerController,
  TemplateController
} from '../controllers';

// Import webhook routes
import webhookRoutes from './webhook.routes';
// Import analytics routes (Sprint 08 - Legacy)
import analyticsRoutesLegacy from './analyticsRoutes';
// Import analytics routes (Sprint 13 - New Analytics & Reporting Module)
import { createAnalyticsRouter } from '../analytics/routes';
// Import AI routes (Sprint 10)
import aiRoutes from './aiRoutes';
// Import ML/NLP routes (Sprint 12)
import mlRoutes from './ml.routes';
import nlpRoutes from './nlp.routes';
// Import Sprint 12 Fase 2-4 routes
import workflowRoutes from './workflow.routes';
import rulesRoutes from './rules.routes';
import predictiveAnalyticsRoutes from './predictive-analytics.routes';
import cognitiveRoutes from './cognitive.routes';
import monitoringRoutes from './monitoring.routes';
// Import CRM Integration routes (Sprint N+1)
import crmIntegrationRoutes from './crm-integration.routes';

// Create router
const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get controllers from container
const getController = <T>(type: symbol): T => {
  try {
    return container.get<T>(type);
  } catch (error) {
    console.error(`Failed to get controller for ${type.toString()}:`, error);
    throw error;
  }
};

// Initialize controllers
const channelController = getController<ChannelController>(TYPES.OmniChannelController);
const conversationController = getController<ConversationController>(TYPES.OmniConversationController);
const messageController = getController<MessageController>(TYPES.OmniMessageController);
const customerController = getController<CustomerController>(TYPES.OmniCustomerController);
const templateController = getController<TemplateController>(TYPES.OmniTemplateController);

// =======================
// CHANNEL ROUTES
// =======================
router.get('/channels',
  (req, res) => channelController.list(req, res)
);

router.post('/channels',
  channelValidators.create,
  validateRequest,
  (req, res) => channelController.create(req, res)
);

router.get('/channels/:id',
  channelValidators.getById,
  validateRequest,
  (req, res) => channelController.getById(req, res)
);

router.put('/channels/:id',
  channelValidators.update,
  validateRequest,
  (req, res) => channelController.update(req, res)
);

router.delete('/channels/:id',
  channelValidators.delete,
  validateRequest,
  (req, res) => channelController.delete(req, res)
);

router.get('/channels/:id/health',
  channelValidators.getById,
  validateRequest,
  (req, res) => channelController.checkHealth(req, res)
);

router.post('/channels/validate',
  validateRequest,
  (req, res) => channelController.validateCredentials(req, res)
);

// =======================
// CONVERSATION ROUTES
// =======================
router.get('/conversations',
  conversationValidators.list,
  validateRequest,
  (req, res) => conversationController.list(req, res)
);

router.post('/conversations',
  conversationValidators.create,
  validateRequest,
  (req, res) => conversationController.create(req, res)
);

router.get('/conversations/stats',
  (req, res) => conversationController.getStats(req, res)
);

router.get('/conversations/:id',
  conversationValidators.getById,
  validateRequest,
  (req, res) => conversationController.getById(req, res)
);

router.put('/conversations/:id',
  conversationValidators.update,
  validateRequest,
  (req, res) => conversationController.update(req, res)
);

router.post('/conversations/:id/assign',
  conversationValidators.assign,
  validateRequest,
  (req, res) => conversationController.assign(req, res)
);

router.post('/conversations/:id/resolve',
  conversationValidators.getById,
  validateRequest,
  (req, res) => conversationController.resolve(req, res)
);

router.post('/conversations/:id/reopen',
  conversationValidators.getById,
  validateRequest,
  (req, res) => conversationController.reopen(req, res)
);

router.post('/conversations/:id/read',
  conversationValidators.getById,
  validateRequest,
  (req, res) => conversationController.markAsRead(req, res)
);

// =======================
// MESSAGE ROUTES
// =======================
router.post('/messages',
  messageValidators.send,
  validateRequest,
  (req, res) => messageController.send(req, res)
);

router.get('/messages/search',
  messageValidators.search,
  validateRequest,
  (req, res) => messageController.search(req, res)
);

router.get('/conversations/:id/messages',
  conversationValidators.getById,
  validateRequest,
  (req, res) => messageController.getByConversation(req, res)
);

router.put('/messages/:id/status',
  messageValidators.updateStatus,
  validateRequest,
  (req, res) => messageController.updateStatus(req, res)
);

router.post('/messages/:id/retry',
  messageValidators.getById,
  validateRequest,
  (req, res) => messageController.retry(req, res)
);

router.post('/messages/mark-read',
  messageValidators.markAsRead,
  validateRequest,
  (req, res) => messageController.markAsRead(req, res)
);

// =======================
// CUSTOMER ROUTES
// =======================
router.get('/customers',
  customerValidators.search,
  validateRequest,
  (req, res) => customerController.search(req, res)
);

router.post('/customers',
  customerValidators.create,
  validateRequest,
  (req, res) => customerController.create(req, res)
);

router.get('/customers/:id',
  customerValidators.getById,
  validateRequest,
  (req, res) => customerController.getById(req, res)
);

router.put('/customers/:id',
  customerValidators.update,
  validateRequest,
  (req, res) => customerController.update(req, res)
);

router.get('/customers/:id/stats',
  customerValidators.getById,
  validateRequest,
  (req, res) => customerController.getStats(req, res)
);

router.post('/customers/merge',
  customerValidators.merge,
  validateRequest,
  (req, res) => customerController.merge(req, res)
);

router.post('/customers/:id/tags',
  customerValidators.manageTags,
  validateRequest,
  (req, res) => customerController.addTags(req, res)
);

router.delete('/customers/:id/tags',
  customerValidators.manageTags,
  validateRequest,
  (req, res) => customerController.removeTags(req, res)
);

// =======================
// TEMPLATE ROUTES
// =======================
router.get('/templates',
  templateValidators.list,
  validateRequest,
  (req, res) => templateController.list(req, res)
);

router.post('/templates',
  templateValidators.create,
  validateRequest,
  (req, res) => templateController.create(req, res)
);

router.get('/templates/most-used',
  (req, res) => templateController.getMostUsed(req, res)
);

router.get('/templates/search',
  templateValidators.search,
  validateRequest,
  (req, res) => templateController.search(req, res)
);

router.get('/templates/:id',
  templateValidators.getById,
  validateRequest,
  (req, res) => templateController.getById(req, res)
);

router.put('/templates/:id',
  templateValidators.update,
  validateRequest,
  (req, res) => templateController.update(req, res)
);

router.delete('/templates/:id',
  templateValidators.delete,
  validateRequest,
  (req, res) => templateController.delete(req, res)
);

// =======================
// WEBHOOK ROUTES (Sprint 06)
// =======================
// Note: Webhook routes don't require auth middleware
router.use('/webhooks', webhookRoutes);

// =======================
// ANALYTICS ROUTES (Sprint 08 - Legacy)
// =======================
router.use('/analytics-legacy', analyticsRoutesLegacy);

// =======================
// ANALYTICS & REPORTING ROUTES (Sprint 13)
// =======================
router.use('/analytics', createAnalyticsRouter());

// =======================
// AI ROUTES (Sprint 10)
// =======================
router.use('/ai', aiRoutes);

// =======================
// ML ROUTES (Sprint 12)
// =======================
router.use('/ml', mlRoutes);

// =======================
// NLP ROUTES (Sprint 12)
// =======================
router.use('/nlp', nlpRoutes);

// =======================
// AI WORKFLOWS ROUTES (Sprint 12 Fase 2)
// =======================
router.use('/workflows', workflowRoutes);
router.use('/rules', rulesRoutes);

// =======================
// PREDICTIVE ANALYTICS ROUTES (Sprint 12 Fase 3)
// =======================
router.use('/predictive-analytics', predictiveAnalyticsRoutes);

// =======================
// COGNITIVE SERVICES ROUTES (Sprint 12 Fase 4)
// =======================
router.use('/cognitive', cognitiveRoutes);

// =======================
// ML MONITORING ROUTES (Sprint 12 Fase 4)
// =======================
router.use('/monitoring', monitoringRoutes);

// =======================
// CRM INTEGRATION ROUTES (Sprint N+1)
// =======================
router.use('/crm-integration', crmIntegrationRoutes);

// =======================
// HEALTH CHECK
// =======================
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    module: 'omni',
    timestamp: new Date().toISOString()
  });
});

export default router;