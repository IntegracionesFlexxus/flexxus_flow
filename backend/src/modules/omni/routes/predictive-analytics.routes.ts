/**
 * Predictive Analytics Routes - Sprint 12 Fase 3
 * Routes for predictive analytics features
 */

import { Router } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { PredictiveAnalyticsController } from '../controllers/PredictiveAnalyticsController';

const router = Router();

const analyticsController = container.get<PredictiveAnalyticsController>(
  TYPES.PredictiveAnalyticsController
);

// Customer Behavior Predictions
router.post(
  '/customers/:customerId/churn-risk',
  (req, res) => analyticsController.predictChurnRisk(req, res)
);
router.post(
  '/customers/:customerId/next-purchase',
  (req, res) => analyticsController.predictNextPurchase(req, res)
);
router.post(
  '/customers/:customerId/engagement',
  (req, res) => analyticsController.predictEngagement(req, res)
);
router.post(
  '/customers/:customerId/satisfaction',
  (req, res) => analyticsController.predictSatisfaction(req, res)
);
router.get(
  '/customers/:customerId/predictions',
  (req, res) => analyticsController.getCustomerPredictions(req, res)
);
router.post(
  '/predictions/:predictionId/actual-outcome',
  (req, res) => analyticsController.recordActualOutcome(req, res)
);

// Anomaly Detection
router.post(
  '/anomalies/detect/behavioral',
  (req, res) => analyticsController.detectBehavioralAnomaly(req, res)
);
router.post(
  '/anomalies/detect/performance',
  (req, res) => analyticsController.detectPerformanceAnomaly(req, res)
);
router.post(
  '/anomalies/detect/data-quality',
  (req, res) => analyticsController.detectDataQualityAnomaly(req, res)
);
router.post(
  '/anomalies/detect/security',
  (req, res) => analyticsController.detectSecurityAnomaly(req, res)
);
router.get(
  '/anomalies/unresolved',
  (req, res) => analyticsController.getUnresolvedAnomalies(req, res)
);
router.get(
  '/anomalies/severity/:severity',
  (req, res) => analyticsController.getAnomaliesBySeverity(req, res)
);
router.post(
  '/anomalies/:anomalyId/acknowledge',
  (req, res) => analyticsController.acknowledgeAnomaly(req, res)
);
router.post(
  '/anomalies/:anomalyId/resolve',
  (req, res) => analyticsController.resolveAnomaly(req, res)
);

// Demand Forecasting
router.post(
  '/forecast/demand',
  (req, res) => analyticsController.forecastDemand(req, res)
);
router.get(
  '/forecast/:resourceType',
  (req, res) => analyticsController.getForecastsByResourceType(req, res)
);
router.post(
  '/forecast/:forecastId/actual-demand',
  (req, res) => analyticsController.recordActualDemand(req, res)
);
router.get(
  '/forecast/:resourceType/accuracy',
  (req, res) => analyticsController.getForecastAccuracy(req, res)
);

export default router;
