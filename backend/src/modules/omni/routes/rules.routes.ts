/**
 * Rules Routes - Sprint 12 Fase 2
 * Routes for decision rule management
 */

import { Router } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { validateRequest } from '@/middleware/validation';
import { DecisionRuleController } from '../controllers/DecisionRuleController';
import { ruleValidators } from '../validators/workflow.validators';

const router = Router();

const ruleController = container.get<DecisionRuleController>(TYPES.DecisionRuleController);

// Rule CRUD
router.post('/', ruleValidators.create, validateRequest, (req, res) => ruleController.createRule(req, res));
router.get('/', (req, res) => ruleController.listRules(req, res));
router.get('/:id', ruleValidators.getById, validateRequest, (req, res) => ruleController.getRule(req, res));
router.put('/:id', ruleValidators.update, validateRequest, (req, res) => ruleController.updateRule(req, res));
router.delete('/:id', ruleValidators.getById, validateRequest, (req, res) => ruleController.deleteRule(req, res));

// Rule actions
router.post('/:id/activate', ruleValidators.getById, validateRequest, (req, res) => ruleController.activateRule(req, res));
router.post('/:id/deactivate', ruleValidators.getById, validateRequest, (req, res) => ruleController.deactivateRule(req, res));

// Rule evaluation
router.post('/evaluate', ruleValidators.evaluate, validateRequest, (req, res) => ruleController.evaluateRules(req, res));

export default router;
