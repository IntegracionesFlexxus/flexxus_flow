/**
 * AI Workflow Service - Sprint 12 Fase 2
 * Business logic for AI workflow management
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { AIWorkflowRepository } from '../repositories/AIWorkflowRepository';
import { WorkflowExecutionRepository } from '../repositories/WorkflowExecutionRepository';
import { AIWorkflowEngine } from './AIWorkflowEngine';
import { IAIWorkflow, CreateAIWorkflowDTO, UpdateAIWorkflowDTO } from '../../interfaces/IAIWorkflow';
import { WorkflowStatus } from '../../types/workflow-ai.types';

@injectable()
export class AIWorkflowService {
  constructor(
    @inject(TYPES.AIWorkflowRepository)
    private workflowRepository: AIWorkflowRepository,

    @inject(TYPES.WorkflowExecutionRepository)
    private executionRepository: WorkflowExecutionRepository,

    @inject(TYPES.AIWorkflowEngine)
    private workflowEngine: AIWorkflowEngine,

    @inject(TYPES.LoggerService)
    private logger: any
  ) {}

  /**
   * Create a new AI workflow
   */
  async createWorkflow(tenantId: string, data: CreateAIWorkflowDTO, userId?: string): Promise<IAIWorkflow> {
    this.logger.info('Creating AI workflow', { tenantId, workflowName: data.workflow_name });

    // Validate workflow data
    this.validateWorkflow(data);

    const workflow = await this.workflowRepository.create(tenantId, data, userId);

    this.logger.info('AI workflow created', { workflowId: workflow.id });

    return workflow;
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId: string, tenantId: string): Promise<IAIWorkflow> {
    const workflow = await this.workflowRepository.findById(workflowId, tenantId);

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    return workflow;
  }

  /**
   * List all workflows
   */
  async listWorkflows(tenantId: string, filters?: { status?: WorkflowStatus }): Promise<IAIWorkflow[]> {
    return await this.workflowRepository.findAll(tenantId, filters);
  }

  /**
   * Update workflow
   */
  async updateWorkflow(
    workflowId: string,
    tenantId: string,
    data: UpdateAIWorkflowDTO
  ): Promise<IAIWorkflow> {
    this.logger.info('Updating workflow', { workflowId, tenantId });

    const workflow = await this.workflowRepository.update(workflowId, tenantId, data);

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    return workflow;
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(workflowId: string, tenantId: string): Promise<void> {
    this.logger.info('Deleting workflow', { workflowId, tenantId });

    const deleted = await this.workflowRepository.delete(workflowId, tenantId);

    if (!deleted) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
  }

  /**
   * Activate workflow
   */
  async activateWorkflow(workflowId: string, tenantId: string): Promise<IAIWorkflow> {
    this.logger.info('Activating workflow', { workflowId, tenantId });

    await this.workflowRepository.updateStatus(workflowId, tenantId, WorkflowStatus.ACTIVE);

    const workflow = await this.getWorkflow(workflowId, tenantId);

    return workflow;
  }

  /**
   * Pause workflow
   */
  async pauseWorkflow(workflowId: string, tenantId: string): Promise<IAIWorkflow> {
    this.logger.info('Pausing workflow', { workflowId, tenantId });

    await this.workflowRepository.updateStatus(workflowId, tenantId, WorkflowStatus.PAUSED);

    const workflow = await this.getWorkflow(workflowId, tenantId);

    return workflow;
  }

  /**
   * Execute workflow manually
   */
  async executeWorkflow(
    workflowId: string,
    triggerData: Record<string, any>,
    tenantId: string
  ): Promise<any> {
    this.logger.info('Manual workflow execution', { workflowId, tenantId });

    return await this.workflowEngine.executeWorkflow(workflowId, triggerData, tenantId);
  }

  /**
   * Get workflow execution history
   */
  async getWorkflowExecutions(workflowId: string, tenantId: string, limit: number = 100): Promise<any[]> {
    return await this.executionRepository.findByWorkflowId(workflowId, tenantId, limit);
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStatistics(workflowId: string, tenantId: string): Promise<any> {
    const workflow = await this.getWorkflow(workflowId, tenantId);
    const stats = await this.executionRepository.getExecutionStats(workflowId, tenantId);

    return {
      workflow_id: workflow.id,
      workflow_name: workflow.workflow_name,
      status: workflow.status,
      ...stats
    };
  }

  /**
   * Validate workflow data
   */
  private validateWorkflow(data: CreateAIWorkflowDTO): void {
    if (!data.workflow_name) {
      throw new Error('Workflow name is required');
    }

    if (!data.trigger_conditions) {
      throw new Error('Trigger conditions are required');
    }

    if (!data.decision_tree) {
      throw new Error('Decision tree is required');
    }

    if (!data.actions || data.actions.length === 0) {
      throw new Error('At least one action is required');
    }
  }
}
