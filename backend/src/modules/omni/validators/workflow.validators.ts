/**
 * AI Workflow Validators - Sprint 12 Fase 2
 * Validation rules for AI workflows and decision rules
 */

import { body, param, query } from 'express-validator';

export const workflowValidators = {
  create: [
    body('workflow_name')
      .trim()
      .notEmpty()
      .withMessage('Workflow name is required')
      .isLength({ max: 200 })
      .withMessage('Workflow name must not exceed 200 characters'),

    body('trigger_conditions')
      .notEmpty()
      .withMessage('Trigger conditions are required')
      .isObject()
      .withMessage('Trigger conditions must be an object'),

    body('decision_tree')
      .notEmpty()
      .withMessage('Decision tree is required')
      .isObject()
      .withMessage('Decision tree must be an object'),

    body('actions')
      .notEmpty()
      .withMessage('Actions are required')
      .isArray()
      .withMessage('Actions must be an array'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must not exceed 1000 characters'),

    body('ml_models_used')
      .optional()
      .isArray()
      .withMessage('ML models must be an array')
  ],

  update: [
    param('id')
      .isUUID()
      .withMessage('Invalid workflow ID'),

    body('workflow_name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Workflow name cannot be empty')
      .isLength({ max: 200 })
      .withMessage('Workflow name must not exceed 200 characters'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must not exceed 1000 characters'),

    body('trigger_conditions')
      .optional()
      .isObject()
      .withMessage('Trigger conditions must be an object'),

    body('decision_tree')
      .optional()
      .isObject()
      .withMessage('Decision tree must be an object'),

    body('actions')
      .optional()
      .isArray()
      .withMessage('Actions must be an array')
  ],

  getById: [
    param('id')
      .isUUID()
      .withMessage('Invalid workflow ID')
  ],

  execute: [
    param('id')
      .isUUID()
      .withMessage('Invalid workflow ID'),

    body('trigger_data')
      .notEmpty()
      .withMessage('Trigger data is required')
      .isObject()
      .withMessage('Trigger data must be an object')
  ],

  list: [
    query('status')
      .optional()
      .isIn(['active', 'paused', 'draft'])
      .withMessage('Invalid status'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 500 })
      .withMessage('Limit must be between 1 and 500')
  ]
};

export const ruleValidators = {
  create: [
    body('rule_name')
      .trim()
      .notEmpty()
      .withMessage('Rule name is required')
      .isLength({ max: 200 })
      .withMessage('Rule name must not exceed 200 characters'),

    body('rule_type')
      .notEmpty()
      .withMessage('Rule type is required')
      .isIn(['rule_based', 'ml_based', 'hybrid', 'heuristic'])
      .withMessage('Invalid rule type'),

    body('conditions')
      .notEmpty()
      .withMessage('Conditions are required')
      .isObject()
      .withMessage('Conditions must be an object'),

    body('actions')
      .notEmpty()
      .withMessage('Actions are required')
      .isArray()
      .withMessage('Actions must be an array'),

    body('priority')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Priority must be between 0 and 100'),

    body('ml_model_id')
      .optional()
      .isUUID()
      .withMessage('Invalid ML model ID')
  ],

  update: [
    param('id')
      .isUUID()
      .withMessage('Invalid rule ID'),

    body('rule_name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Rule name cannot be empty')
      .isLength({ max: 200 })
      .withMessage('Rule name must not exceed 200 characters'),

    body('priority')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Priority must be between 0 and 100'),

    body('conditions')
      .optional()
      .isObject()
      .withMessage('Conditions must be an object'),

    body('actions')
      .optional()
      .isArray()
      .withMessage('Actions must be an array')
  ],

  getById: [
    param('id')
      .isUUID()
      .withMessage('Invalid rule ID')
  ],

  evaluate: [
    body('context')
      .notEmpty()
      .withMessage('Context is required')
      .isObject()
      .withMessage('Context must be an object')
  ]
};
