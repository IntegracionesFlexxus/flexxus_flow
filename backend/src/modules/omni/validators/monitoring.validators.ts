/**
 * ML Monitoring Validators - Sprint 12 Fase 4
 * Validation rules for ML monitoring and A/B testing endpoints
 */

import { body, param, query } from 'express-validator';

export const monitoringValidators = {
  // Model Performance Monitoring
  recordMetrics: [
    body('deployment_id')
      .isUUID()
      .withMessage('Invalid deployment ID'),

    body('metrics')
      .notEmpty()
      .withMessage('Metrics are required')
      .isObject()
      .withMessage('Metrics must be an object'),

    body('metrics.accuracy')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('Accuracy must be between 0 and 1'),

    body('metrics.precision')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('Precision must be between 0 and 1'),

    body('metrics.recall')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('Recall must be between 0 and 1'),

    body('metrics.f1Score')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('F1 Score must be between 0 and 1'),

    body('metrics.latencyMs')
      .optional()
      .isNumeric()
      .withMessage('Latency must be a number'),

    body('metrics.throughputRps')
      .optional()
      .isNumeric()
      .withMessage('Throughput must be a number'),

    body('metrics.errorRate')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('Error rate must be between 0 and 1')
  ],

  getMetricsHistory: [
    param('deploymentId')
      .isUUID()
      .withMessage('Invalid deployment ID'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000')
  ],

  getAverageMetrics: [
    param('deploymentId')
      .isUUID()
      .withMessage('Invalid deployment ID'),

    query('hours')
      .optional()
      .isInt({ min: 1, max: 168 })
      .withMessage('Hours must be between 1 and 168 (1 week)')
  ],

  // Drift Detection
  detectDrift: [
    body('deployment_id')
      .isUUID()
      .withMessage('Invalid deployment ID'),

    body('baseline_data')
      .notEmpty()
      .withMessage('Baseline data is required')
      .isArray()
      .withMessage('Baseline data must be an array'),

    body('current_data')
      .notEmpty()
      .withMessage('Current data is required')
      .isArray()
      .withMessage('Current data must be an array')
  ],

  getUnresolvedDrift: [
    param('deploymentId')
      .isUUID()
      .withMessage('Invalid deployment ID')
  ],

  acknowledgeDrift: [
    param('driftId')
      .isUUID()
      .withMessage('Invalid drift ID')
  ],

  resolveDrift: [
    param('driftId')
      .isUUID()
      .withMessage('Invalid drift ID')
  ],

  // A/B Testing
  createABTest: [
    body('test_name')
      .trim()
      .notEmpty()
      .withMessage('Test name is required')
      .isLength({ max: 200 })
      .withMessage('Test name must not exceed 200 characters'),

    body('control_deployment_id')
      .isUUID()
      .withMessage('Invalid control deployment ID'),

    body('variant_deployments')
      .notEmpty()
      .withMessage('Variant deployments are required')
      .isObject()
      .withMessage('Variant deployments must be an object'),

    body('traffic_split')
      .notEmpty()
      .withMessage('Traffic split is required')
      .isObject()
      .withMessage('Traffic split must be an object')
      .custom((value) => {
        const total = Object.values(value).reduce((sum: number, val: any) => sum + val, 0);
        if (Math.abs(total - 1.0) > 0.01) {
          throw new Error('Traffic split must sum to 1.0');
        }
        return true;
      }),

    body('success_metrics')
      .notEmpty()
      .withMessage('Success metrics are required')
      .isArray({ min: 1 })
      .withMessage('At least one success metric is required'),

    body('options.description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must not exceed 1000 characters')
  ],

  startABTest: [
    param('testId')
      .isUUID()
      .withMessage('Invalid test ID')
  ],

  endABTest: [
    param('testId')
      .isUUID()
      .withMessage('Invalid test ID')
  ],

  recordABTestResult: [
    param('testId')
      .isUUID()
      .withMessage('Invalid test ID'),

    body('variant')
      .notEmpty()
      .withMessage('Variant is required')
      .isIn(['control', 'variant_a', 'variant_b', 'variant_c'])
      .withMessage('Invalid variant'),

    body('deployment_id')
      .isUUID()
      .withMessage('Invalid deployment ID'),

    body('metric_name')
      .trim()
      .notEmpty()
      .withMessage('Metric name is required'),

    body('metric_value')
      .notEmpty()
      .withMessage('Metric value is required')
      .isNumeric()
      .withMessage('Metric value must be a number'),

    body('sample_size')
      .notEmpty()
      .withMessage('Sample size is required')
      .isInt({ min: 1 })
      .withMessage('Sample size must be at least 1')
  ],

  getABTestResults: [
    param('testId')
      .isUUID()
      .withMessage('Invalid test ID')
  ]
};
