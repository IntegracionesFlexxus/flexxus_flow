/**
 * Analytics Routes - Sprint 08
 * API routes for analytics, reporting, and optimization
 */

import { Router } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { authMiddleware as authenticate } from '@/modules/auth/middleware/authMiddleware';
import { validateRequest } from '@/shared/middleware/validation';
import { body, param, query } from 'express-validator';

const router = Router();
const controller = container.get<AnalyticsController>(TYPES.AnalyticsController);

// Analytics Events
router.post(
  '/events',
  authenticate,
  [
    body('event_type').isString().notEmpty(),
    body('entity_type').isString().notEmpty(),
    body('entity_id').isString().notEmpty(),
    body('dimensions').optional().isObject(),
    body('metrics').optional().isObject()
  ],
  validateRequest,
  (req, res) => controller.collectEvent(req, res)
);

router.get(
  '/metrics',
  authenticate,
  [
    query('timeWindow').optional().isIn(['minute', 'hour', 'day', 'week', 'month']),
    query('startTime').optional().isISO8601(),
    query('endTime').optional().isISO8601()
  ],
  validateRequest,
  (req, res) => controller.getMetrics(req, res)
);

router.get(
  '/time-series',
  authenticate,
  [
    query('metric').notEmpty().isString(),
    query('startTime').isISO8601(),
    query('endTime').isISO8601(),
    query('granularity').optional().isIn(['minute', 'hour', 'day'])
  ],
  validateRequest,
  (req, res) => controller.getTimeSeries(req, res)
);

// Reports
router.post(
  '/reports',
  authenticate,
  [
    body('name').isString().notEmpty(),
    body('type').isIn(['performance', 'summary', 'detailed', 'custom']),
    body('config').isObject(),
    body('schedule').optional().isString()
  ],
  validateRequest,
  (req, res) => controller.createReport(req, res)
);

router.post(
  '/reports/:reportId/generate',
  authenticate,
  [
    param('reportId').isUUID(),
    body('format').optional().isIn(['json', 'pdf', 'excel', 'csv']),
    body('parameters').optional().isObject()
  ],
  validateRequest,
  (req, res) => controller.generateReport(req, res)
);

router.post(
  '/reports/:reportId/schedule',
  authenticate,
  [
    param('reportId').isUUID(),
    body('schedule').isString().notEmpty(),
    body('format').isIn(['json', 'pdf', 'excel', 'csv']),
    body('recipients').optional().isArray()
  ],
  validateRequest,
  (req, res) => controller.scheduleReport(req, res)
);

// Dashboards
router.post(
  '/dashboards',
  authenticate,
  [
    body('name').isString().notEmpty(),
    body('description').optional().isString(),
    body('layout').optional().isObject(),
    body('is_default').optional().isBoolean()
  ],
  validateRequest,
  (req, res) => controller.createDashboard(req, res)
);

router.get(
  '/dashboards/:dashboardId',
  authenticate,
  [
    param('dashboardId').isUUID()
  ],
  validateRequest,
  (req, res) => controller.getDashboard(req, res)
);

router.post(
  '/dashboards/:dashboardId/widgets',
  authenticate,
  [
    param('dashboardId').isUUID(),
    body('title').isString().notEmpty(),
    body('type').isIn(['metric', 'chart', 'table', 'map', 'custom']),
    body('data_source').isObject(),
    body('config').isObject()
  ],
  validateRequest,
  (req, res) => controller.addWidget(req, res)
);

router.get(
  '/dashboards/:dashboardId/data',
  authenticate,
  [
    param('dashboardId').isUUID()
  ],
  validateRequest,
  (req, res) => controller.getDashboardData(req, res)
);

// KPIs
router.post(
  '/kpis',
  authenticate,
  [
    body('name').isString().notEmpty(),
    body('type').isIn(['metric', 'calculated', 'aggregated', 'composite']),
    body('formula').optional().isString(),
    body('target_value').isNumeric(),
    body('unit').optional().isIn(['number', 'percentage', 'currency', 'time', 'custom']),
    body('frequency').optional().isIn(['realtime', 'hourly', 'daily', 'weekly', 'monthly']),
    body('category').optional().isIn(['operational', 'strategic', 'financial', 'customer', 'process'])
  ],
  validateRequest,
  (req, res) => controller.createKPI(req, res)
);

router.get(
  '/kpis',
  authenticate,
  [
    query('category').optional().isString(),
    query('isActive').optional().isBoolean()
  ],
  validateRequest,
  (req, res) => controller.getKPIs(req, res)
);

router.post(
  '/kpis/:kpiId/calculate',
  authenticate,
  [
    param('kpiId').isUUID()
  ],
  validateRequest,
  (req, res) => controller.calculateKPI(req, res)
);

router.post(
  '/kpis/:kpiId/goal',
  authenticate,
  [
    param('kpiId').isUUID(),
    body('target_value').isNumeric(),
    body('target_date').isISO8601(),
    body('description').optional().isString(),
    body('strategy').optional().isString(),
    body('milestones').optional().isArray()
  ],
  validateRequest,
  (req, res) => controller.setKPIGoal(req, res)
);

router.get(
  '/kpis/:kpiId/history',
  authenticate,
  [
    param('kpiId').isUUID(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 1000 })
  ],
  validateRequest,
  (req, res) => controller.getKPIHistory(req, res)
);

router.post(
  '/kpis/compare',
  authenticate,
  [
    body('kpiIds').isArray().notEmpty(),
    body('kpiIds.*').isUUID(),
    body('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year'])
  ],
  validateRequest,
  (req, res) => controller.compareKPIs(req, res)
);

// Predictions
router.post(
  '/predictions',
  authenticate,
  [
    body('modelType').isIn(['volume_forecast', 'churn_prediction', 'response_time_prediction']),
    body('inputData').optional().isObject()
  ],
  validateRequest,
  (req, res) => controller.getPrediction(req, res)
);

router.get(
  '/recommendations',
  authenticate,
  [
    query('area').optional().isIn(['performance', 'cost', 'quality', 'all'])
  ],
  validateRequest,
  (req, res) => controller.getRecommendations(req, res)
);

// Data Pipelines
router.post(
  '/pipelines',
  authenticate,
  [
    body('name').isString().notEmpty(),
    body('type').isIn(['etl', 'streaming', 'batch', 'realtime']),
    body('source_config').isObject(),
    body('transform_config').isObject(),
    body('destination_config').isObject(),
    body('schedule').optional().isString(),
    body('is_active').optional().isBoolean()
  ],
  validateRequest,
  (req, res) => controller.createPipeline(req, res)
);

router.post(
  '/pipelines/:pipelineId/execute',
  authenticate,
  [
    param('pipelineId').isUUID(),
    body('parameters').optional().isObject()
  ],
  validateRequest,
  (req, res) => controller.executePipeline(req, res)
);

export default router;