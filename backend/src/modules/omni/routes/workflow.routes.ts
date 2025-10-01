/**
 * Workflow Routes - Sprint 12 Fase 2
 * Routes for AI workflow management
 */

import { Router } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { validateRequest } from '@/middleware/validation';
import { AIWorkflowController } from '../controllers/AIWorkflowController';
import { workflowValidators } from '../validators/workflow.validators';

const router = Router();

const workflowController = container.get<AIWorkflowController>(TYPES.AIWorkflowController);

// Workflow CRUD
router.post('/', workflowValidators.create, validateRequest, (req, res) => workflowController.createWorkflow(req, res));
router.get('/', workflowValidators.list, validateRequest, (req, res) => workflowController.listWorkflows(req, res));
router.get('/:id', workflowValidators.getById, validateRequest, (req, res) => workflowController.getWorkflow(req, res));
router.put('/:id', workflowValidators.update, validateRequest, (req, res) => workflowController.updateWorkflow(req, res));
router.delete('/:id', workflowValidators.getById, validateRequest, (req, res) => workflowController.deleteWorkflow(req, res));

// Workflow actions
router.post('/:id/activate', workflowValidators.getById, validateRequest, (req, res) => workflowController.activateWorkflow(req, res));
router.post('/:id/pause', workflowValidators.getById, validateRequest, (req, res) => workflowController.pauseWorkflow(req, res));
router.post('/:id/execute', workflowValidators.execute, validateRequest, (req, res) => workflowController.executeWorkflow(req, res));

// Workflow analytics
router.get('/:id/executions', (req, res) => workflowController.getWorkflowExecutions(req, res));
router.get('/:id/statistics', (req, res) => workflowController.getWorkflowStatistics(req, res));

export default router;
