/**
 * Predictive Analytics Validators - Sprint 12 Fase 3
 * Validation rules for predictive analytics endpoints
 */

import { body, param, query } from 'express-validator';

export const predictiveAnalyticsValidators = {
  // Customer Predictions
  predictChurn: [
    param('customerId')
      .isUUID()
      .withMessage('Invalid customer ID'),

    body('deployment_id')
      .optional()
      .isUUID()
      .withMessage('Invalid deployment ID')
  ],

  predictNextPurchase: [
    param('customerId')
      .isUUID()
      .withMessage('Invalid customer ID'),

    body('deployment_id')
      .optional()
      .isUUID()
      .withMessage('Invalid deployment ID')
  ],

  predictEngagement: [
    param('customerId')
      .isUUID()
      .withMessage('Invalid customer ID'),

    body('deployment_id')
      .optional()
      .isUUID()
      .withMessage('Invalid deployment ID')
  ],

  predictSatisfaction: [
    param('customerId')
      .isUUID()
      .withMessage('Invalid customer ID'),

    body('deployment_id')
      .optional()
      .isUUID()
      .withMessage('Invalid deployment ID')
  ],

  recordActualOutcome: [
    param('predictionId')
      .isUUID()
      .withMessage('Invalid prediction ID'),

    body('actual_outcome')
      .notEmpty()
      .withMessage('Actual outcome is required')
      .isObject()
      .withMessage('Actual outcome must be an object')
  ],

  // Anomaly Detection
  detectBehavioralAnomaly: [
    body('entity_type')
      .trim()
      .notEmpty()
      .withMessage('Entity type is required')
      .isLength({ max: 50 })
      .withMessage('Entity type must not exceed 50 characters'),

    body('entity_id')
      .trim()
      .notEmpty()
      .withMessage('Entity ID is required'),

    body('current_metrics')
      .notEmpty()
      .withMessage('Current metrics are required')
      .isObject()
      .withMessage('Current metrics must be an object'),

    body('options.deployment_id')
      .optional()
      .isUUID()
      .withMessage('Invalid deployment ID'),

    body('options.threshold')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('Threshold must be between 0 and 1')
  ],

  detectPerformanceAnomaly: [
    body('entity_type')
      .trim()
      .notEmpty()
      .withMessage('Entity type is required'),

    body('entity_id')
      .trim()
      .notEmpty()
      .withMessage('Entity ID is required'),

    body('performance_metrics')
      .notEmpty()
      .withMessage('Performance metrics are required')
      .isObject()
      .withMessage('Performance metrics must be an object')
  ],

  detectDataQualityAnomaly: [
    body('entity_type')
      .trim()
      .notEmpty()
      .withMessage('Entity type is required'),

    body('entity_id')
      .trim()
      .notEmpty()
      .withMessage('Entity ID is required'),

    body('data_metrics')
      .notEmpty()
      .withMessage('Data metrics are required')
      .isObject()
      .withMessage('Data metrics must be an object')
  ],

  detectSecurityAnomaly: [
    body('entity_type')
      .trim()
      .notEmpty()
      .withMessage('Entity type is required'),

    body('entity_id')
      .trim()
      .notEmpty()
      .withMessage('Entity ID is required'),

    body('security_metrics')
      .notEmpty()
      .withMessage('Security metrics are required')
      .isObject()
      .withMessage('Security metrics must be an object')
  ],

  getAnomaliesBySeverity: [
    param('severity')
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Invalid severity level'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 500 })
      .withMessage('Limit must be between 1 and 500')
  ],

  acknowledgeAnomaly: [
    param('anomalyId')
      .isUUID()
      .withMessage('Invalid anomaly ID')
  ],

  resolveAnomaly: [
    param('anomalyId')
      .isUUID()
      .withMessage('Invalid anomaly ID'),

    body('is_false_positive')
      .optional()
      .isBoolean()
      .withMessage('is_false_positive must be a boolean')
  ],

  // Demand Forecasting
  forecastDemand: [
    body('resource_type')
      .trim()
      .notEmpty()
      .withMessage('Resource type is required')
      .isLength({ max: 100 })
      .withMessage('Resource type must not exceed 100 characters'),

    body('options.horizon')
      .notEmpty()
      .withMessage('Forecast horizon is required')
      .isInt({ min: 1, max: 365 })
      .withMessage('Horizon must be between 1 and 365 days'),

    body('options.confidence_level')
      .optional()
      .isFloat({ min: 0.5, max: 0.99 })
      .withMessage('Confidence level must be between 0.5 and 0.99'),

    body('options.deployment_id')
      .optional()
      .isUUID()
      .withMessage('Invalid deployment ID')
  ],

  recordActualDemand: [
    param('forecastId')
      .isUUID()
      .withMessage('Invalid forecast ID'),

    body('actual_demand')
      .notEmpty()
      .withMessage('Actual demand is required')
      .isNumeric()
      .withMessage('Actual demand must be a number')
  ],

  getForecastsByResourceType: [
    param('resourceType')
      .trim()
      .notEmpty()
      .withMessage('Resource type is required'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 500 })
      .withMessage('Limit must be between 1 and 500')
  ]
};
