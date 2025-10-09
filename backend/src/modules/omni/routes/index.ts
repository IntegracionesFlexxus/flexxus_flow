/**
 * Omni Module Routes - Sprint 05 & 06 (Simplified)
 * Route definitions for all omnichannel endpoints
 */

import { Router } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { authMiddleware } from '@/modules/auth/middleware/authMiddleware';

// Import controllers
import {
  ChannelController,
  ConversationController,
  MessageController,
  CustomerController,
  TemplateController
} from '../controllers';

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
router.get('/channels', (req, res) => channelController.list(req, res));
router.post('/channels', (req, res) => channelController.create(req, res));
router.get('/channels/:id', (req, res) => channelController.getById(req, res));
router.put('/channels/:id', (req, res) => channelController.update(req, res));
router.delete('/channels/:id', (req, res) => channelController.delete(req, res));
router.get('/channels/:id/health', (req, res) => channelController.checkHealth(req, res));
router.post('/channels/:id/test', (req, res) => channelController.testConnection(req, res));
router.post('/channels/validate', (req, res) => channelController.validateCredentials(req, res));

// =======================
// CONVERSATION ROUTES
// =======================
router.get('/conversations', (req, res) => conversationController.list(req, res));
router.post('/conversations', (req, res) => conversationController.create(req, res));
router.get('/conversations/stats', (req, res) => conversationController.getStats(req, res));
router.get('/conversations/:id', (req, res) => conversationController.getById(req, res));
router.put('/conversations/:id', (req, res) => conversationController.update(req, res));
router.post('/conversations/:id/assign', (req, res) => conversationController.assign(req, res));
router.post('/conversations/:id/resolve', (req, res) => conversationController.resolve(req, res));
router.post('/conversations/:id/reopen', (req, res) => conversationController.reopen(req, res));
router.post('/conversations/:id/read', (req, res) => conversationController.markAsRead(req, res));

// =======================
// MESSAGE ROUTES
// =======================
router.post('/messages', (req, res) => messageController.send(req, res));
router.get('/messages/search', (req, res) => messageController.search(req, res));
router.get('/conversations/:id/messages', (req, res) => messageController.getByConversation(req, res));
router.put('/messages/:id/status', (req, res) => messageController.updateStatus(req, res));
router.post('/messages/:id/retry', (req, res) => messageController.retry(req, res));
router.post('/messages/mark-read', (req, res) => messageController.markAsRead(req, res));

// =======================
// CUSTOMER ROUTES
// =======================
router.get('/customers', (req, res) => customerController.search(req, res));
router.post('/customers', (req, res) => customerController.create(req, res));
router.get('/customers/:id', (req, res) => customerController.getById(req, res));
router.put('/customers/:id', (req, res) => customerController.update(req, res));
router.get('/customers/:id/stats', (req, res) => customerController.getStats(req, res));
router.post('/customers/merge', (req, res) => customerController.merge(req, res));
router.post('/customers/:id/tags', (req, res) => customerController.addTags(req, res));
router.delete('/customers/:id/tags', (req, res) => customerController.removeTags(req, res));

// =======================
// TEMPLATE ROUTES
// =======================
router.get('/templates', (req, res) => templateController.list(req, res));
router.post('/templates', (req, res) => templateController.create(req, res));
router.get('/templates/most-used', (req, res) => templateController.getMostUsed(req, res));
router.get('/templates/search', (req, res) => templateController.search(req, res));
router.get('/templates/:id', (req, res) => templateController.getById(req, res));
router.put('/templates/:id', (req, res) => templateController.update(req, res));
router.delete('/templates/:id', (req, res) => templateController.delete(req, res));

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