/**
 * AI Workflow Controller - Sprint 12 Fase 2
 * REST API endpoints for AI workflow management
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { AIWorkflowService } from '../automation/workflows/AIWorkflowService';
import { CreateAIWorkflowDTO, UpdateAIWorkflowDTO } from '../interfaces/IAIWorkflow';

@injectable()
export class AIWorkflowController {
  constructor(
    @inject(TYPES.AIWorkflowService)
    private workflowService: AIWorkflowService
  ) {}

  async createWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.companyId || req.headers['x-tenant-id'] as string;
      const userId = req.user?.id;
      const workflowData: CreateAIWorkflowDTO = req.body;

      const workflow = await this.workflowService.createWorkflow(tenantId, workflowData, userId);

      res.status(201).json({ success: true, data: workflow });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.companyId || req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const workflow = await this.workflowService.getWorkflow(id, tenantId);

      res.status(200).json({ success: true, data: workflow });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  async listWorkflows(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.companyId || req.headers['x-tenant-id'] as string;
      const { status } = req.query;

      const filters: any = {};
      if (status) filters.status = status;

      const workflows = await this.workflowService.listWorkflows(tenantId, filters);

      res.status(200).json({ success: true, data: workflows, count: workflows.length });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.companyId || req.headers['x-tenant-id'] as string;
      const { id } = req.params;
      const updateData: UpdateAIWorkflowDTO = req.body;

      const workflow = await this.workflowService.updateWorkflow(id, tenantId, updateData);

      res.status(200).json({ success: true, data: workflow });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async deleteWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.companyId || req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      await this.workflowService.deleteWorkflow(id, tenantId);

      res.status(200).json({ success: true, message: 'Workflow deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async activateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.companyId || req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const workflow = await this.workflowService.activateWorkflow(id, tenantId);

      res.status(200).json({ success: true, data: workflow });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async pauseWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.companyId || req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const workflow = await this.workflowService.pauseWorkflow(id, tenantId);

      res.status(200).json({ success: true, data: workflow });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async executeWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.companyId || req.headers['x-tenant-id'] as string;
      const { id } = req.params;
      const { trigger_data } = req.body;

      if (!trigger_data) {
        res.status(400).json({ success: false, error: 'trigger_data is required' });
        return;
      }

      const result = await this.workflowService.executeWorkflow(id, trigger_data, tenantId);

      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getWorkflowExecutions(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.companyId || req.headers['x-tenant-id'] as string;
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      const executions = await this.workflowService.getWorkflowExecutions(id, tenantId, limit);

      res.status(200).json({ success: true, data: executions, count: executions.length });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getWorkflowStatistics(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.companyId || req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const statistics = await this.workflowService.getWorkflowStatistics(id, tenantId);

      res.status(200).json({ success: true, data: statistics });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
