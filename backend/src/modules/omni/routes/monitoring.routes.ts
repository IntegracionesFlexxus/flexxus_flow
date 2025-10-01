/**
 * ML Monitoring Routes - Sprint 12 Fase 4
 * Routes for ML model monitoring, drift detection, and A/B testing
 */

import { Router } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { MLMonitoringController } from '../controllers/MLMonitoringController';

const router = Router();

const monitoringController = container.get<MLMonitoringController>(TYPES.MLMonitoringController);

// Model Performance Monitoring
router.post('/performance/metrics', (req, res) => monitoringController.recordMetrics(req, res));
router.get('/performance/:deploymentId/metrics/history', (req, res) => monitoringController.getMetricsHistory(req, res));
router.get('/performance/:deploymentId/metrics/average', (req, res) => monitoringController.getAverageMetrics(req, res));

// Drift Detection
router.post('/drift/detect', (req, res) => monitoringController.detectDrift(req, res));
router.get('/drift/:deploymentId/unresolved', (req, res) => monitoringController.getUnresolvedDrift(req, res));
router.post('/drift/:driftId/acknowledge', (req, res) => monitoringController.acknowledgeDrift(req, res));
router.post('/drift/:driftId/resolve', (req, res) => monitoringController.resolveDrift(req, res));

// A/B Testing
router.post('/ab-tests', (req, res) => monitoringController.createABTest(req, res));
router.get('/ab-tests', (req, res) => monitoringController.getAllABTests(req, res));
router.post('/ab-tests/:testId/start', (req, res) => monitoringController.startABTest(req, res));
router.post('/ab-tests/:testId/end', (req, res) => monitoringController.endABTest(req, res));
router.post('/ab-tests/:testId/results', (req, res) => monitoringController.recordABTestResult(req, res));
router.get('/ab-tests/:testId/results', (req, res) => monitoringController.getABTestResults(req, res));

export default router;
