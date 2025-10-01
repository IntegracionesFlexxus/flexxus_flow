/**
 * Cognitive Services Routes - Sprint 12 Fase 4
 * Routes for cognitive services (Document AI, Voice Analytics, Knowledge Graph)
 */

import { Router } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { CognitiveController } from '../controllers/CognitiveController';

const router = Router();

const cognitiveController = container.get<CognitiveController>(TYPES.CognitiveController);

// Document AI
router.post('/documents/process', (req, res) => cognitiveController.processDocument(req, res));
router.get('/documents/:documentId/analysis', (req, res) => cognitiveController.getDocumentAnalysis(req, res));

// Voice Analytics
router.post('/voice/analyze', (req, res) => cognitiveController.analyzeVoice(req, res));
router.get('/voice/:interactionId/analysis', (req, res) => cognitiveController.getVoiceAnalysis(req, res));

// Knowledge Graph
router.post('/knowledge/entities', (req, res) => cognitiveController.createEntity(req, res));
router.post('/knowledge/relationships', (req, res) => cognitiveController.createRelationship(req, res));
router.get('/knowledge/entities/:entityId/connected', (req, res) => cognitiveController.getConnectedEntities(req, res));
router.get('/knowledge/entities/search', (req, res) => cognitiveController.searchEntities(req, res));

export default router;
