/**
 * NLP Routes - Sprint 12
 * Routes for NLP services
 */

import { Router } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { NLPController } from '../controllers/NLPController';

const router = Router();

// Get controller from container
const nlpController = container.get<NLPController>(TYPES.NLPController);

// Intent classification
router.post('/intent/classify', (req, res) => nlpController.classifyIntent(req, res));

// Conversation context
router.post('/context', (req, res) => nlpController.addContext(req, res));
router.get('/context/:conversationId', (req, res) => nlpController.getConversationContext(req, res));
router.get('/context/:conversationId/summary', (req, res) => nlpController.getContextSummary(req, res));
router.delete('/context/:conversationId', (req, res) => nlpController.clearContext(req, res));

export default router;
