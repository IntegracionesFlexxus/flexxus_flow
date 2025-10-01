/**
 * ML Routes - Sprint 12
 * Routes for ML model management and predictions
 */

import { Router } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { MLModelController } from '../controllers/MLModelController';
import { PredictionController } from '../controllers/PredictionController';

const router = Router();

// Get controllers from container
const mlModelController = container.get<MLModelController>(TYPES.MLModelController);
const predictionController = container.get<PredictionController>(TYPES.PredictionController);

// ML Model routes
router.post('/models', (req, res) => mlModelController.createModel(req, res));
router.get('/models', (req, res) => mlModelController.listModels(req, res));
router.get('/models/:id', (req, res) => mlModelController.getModel(req, res));
router.put('/models/:id', (req, res) => mlModelController.updateModel(req, res));
router.delete('/models/:id', (req, res) => mlModelController.deleteModel(req, res));
router.post('/models/:id/train', (req, res) => mlModelController.trainModel(req, res));
router.post('/models/:id/deploy', (req, res) => mlModelController.deployModel(req, res));
router.get('/models/:id/statistics', (req, res) => mlModelController.getModelStatistics(req, res));

// Prediction routes
router.post('/predictions', (req, res) => predictionController.createPrediction(req, res));
router.get('/predictions/:id', (req, res) => predictionController.getPrediction(req, res));
router.post('/predictions/batch', (req, res) => predictionController.createBatchPrediction(req, res));

// Deployment predictions
router.get('/deployments/:deploymentId/predictions', (req, res) =>
  predictionController.getDeploymentPredictions(req, res)
);
router.get('/deployments/:deploymentId/statistics', (req, res) =>
  predictionController.getDeploymentStatistics(req, res)
);

export default router;
