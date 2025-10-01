/**
 * AI Workflow Engine - Sprint 12 Fase 2
 * Engine for executing AI-powered workflows with decision trees and ML integration
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { AIWorkflowRepository } from '../repositories/AIWorkflowRepository';
import { WorkflowExecutionRepository } from '../repositories/WorkflowExecutionRepository';
import { PredictionService } from '../../ml/services/PredictionService';
import {
  DecisionNode,
  WorkflowAction,
  DecisionTreePath,
  WorkflowExecutionContext,
  WorkflowExecutionResult
} from '../../types/workflow-ai.types';

@injectable()
export class AIWorkflowEngine {
  constructor(
    @inject(TYPES.AIWorkflowRepository)
    private workflowRepository: AIWorkflowRepository,

    @inject(TYPES.WorkflowExecutionRepository)
    private executionRepository: WorkflowExecutionRepository,

    @inject(TYPES.PredictionService)
    private predictionService: PredictionService,

    @inject(TYPES.LoggerService)
    private logger: any
  ) {}

  /**
   * Execute a complete workflow
   */
  async executeWorkflow(
    workflowId: string,
    triggerData: Record<string, any>,
    tenantId: string
  ): Promise<any> {
    const startTime = Date.now();

    this.logger.info('Executing AI workflow', { workflowId, tenantId });

    try {
      // Get workflow
      const workflow = await this.workflowRepository.findById(workflowId, tenantId);

      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      if (workflow.status !== 'active') {
        throw new Error(`Workflow is not active: ${workflow.status}`);
      }

      // Create execution context
      const context: WorkflowExecutionContext = {
        workflow_id: workflowId,
        execution_id: `exec-${Date.now()}`,
        trigger_data: triggerData,
        variables: {},
        start_time: new Date()
      };

      // Evaluate decision tree
      const executionPath: DecisionTreePath[] = [];
      const decisionsMade: Record<string, any> = {};

      await this.evaluateDecisionTree(
        workflow.decision_tree,
        context,
        executionPath,
        decisionsMade,
        tenantId
      );

      // Execute actions
      const actionsTaken = await this.executeActions(workflow.actions, context, tenantId);

      const executionTime = Date.now() - startTime;

      // Record execution
      await this.recordExecution(
        workflowId,
        triggerData,
        executionPath,
        decisionsMade,
        actionsTaken,
        WorkflowExecutionResult.SUCCESS,
        tenantId,
        executionTime
      );

      this.logger.info('Workflow executed successfully', {
        workflowId,
        executionTime
      });

      return {
        execution_id: context.execution_id,
        execution_result: WorkflowExecutionResult.SUCCESS,
        execution_path: executionPath,
        actions_taken: actionsTaken,
        execution_time_ms: executionTime
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      this.logger.error('Workflow execution failed', { workflowId, error });

      // Record failed execution
      await this.recordExecution(
        workflowId,
        triggerData,
        [],
        {},
        {},
        WorkflowExecutionResult.FAILED,
        tenantId,
        executionTime,
        error.message
      );

      throw error;
    }
  }

  /**
   * Evaluate decision tree recursively
   */
  private async evaluateDecisionTree(
    node: DecisionNode,
    context: WorkflowExecutionContext,
    executionPath: DecisionTreePath[],
    decisionsMade: Record<string, any>,
    tenantId: string
  ): Promise<void> {
    const nodeStartTime = Date.now();

    this.logger.debug('Evaluating decision node', { nodeId: node.id, nodeType: node.type });

    let decision: boolean | string | undefined;
    let output: any;

    switch (node.type) {
      case 'condition':
        decision = await this.evaluateCondition(node.config, context);
        output = { condition_result: decision };
        break;

      case 'ml_prediction':
        const predictionResult = await this.executeMlPrediction(node.config, context, tenantId);
        decision = predictionResult.decision;
        output = predictionResult;
        break;

      case 'action':
        output = await this.executeSingleAction(node.config, context, tenantId);
        decision = true;
        break;

      case 'parallel':
        output = await this.executeParallelNodes(node.children || [], context, tenantId);
        decision = true;
        break;

      case 'sequential':
        output = await this.executeSequentialNodes(node.children || [], context, tenantId);
        decision = true;
        break;

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }

    const nodeExecutionTime = Date.now() - nodeStartTime;

    // Record path
    executionPath.push({
      node_id: node.id,
      node_name: node.name,
      decision: decision ?? true,
      execution_time_ms: nodeExecutionTime,
      output
    });

    decisionsMade[node.id] = decision;

    // Navigate to next node
    if (node.type === 'condition') {
      const nextNodeId = decision ? node.next_on_true : node.next_on_false;
      if (nextNodeId) {
        // In real implementation, would fetch and evaluate next node
        this.logger.debug('Next node', { nextNodeId });
      }
    }
  }

  /**
   * Evaluate a condition
   */
  private async evaluateCondition(
    config: Record<string, any>,
    context: WorkflowExecutionContext
  ): Promise<boolean> {
    const { field, operator, value } = config;

    const actualValue = this.getValueFromContext(field, context);

    switch (operator) {
      case 'eq':
        return actualValue === value;
      case 'ne':
        return actualValue !== value;
      case 'gt':
        return actualValue > value;
      case 'gte':
        return actualValue >= value;
      case 'lt':
        return actualValue < value;
      case 'lte':
        return actualValue <= value;
      case 'in':
        return Array.isArray(value) && value.includes(actualValue);
      case 'contains':
        return String(actualValue).includes(String(value));
      default:
        return false;
    }
  }

  /**
   * Execute ML prediction node
   */
  private async executeMlPrediction(
    config: Record<string, any>,
    context: WorkflowExecutionContext,
    tenantId: string
  ): Promise<any> {
    const { deployment_id, input_features, threshold } = config;

    // Build input features from context
    const features = this.buildInputFeatures(input_features, context);

    // Make prediction
    const prediction = await this.predictionService.predict(deployment_id, features, tenantId);

    // Determine decision based on threshold
    const confidence = prediction.confidence_score || 0;
    const decision = confidence >= (threshold || 0.8);

    return {
      prediction_result: prediction.prediction_result,
      confidence_score: confidence,
      decision,
      threshold
    };
  }

  /**
   * Execute actions
   */
  private async executeActions(
    actions: WorkflowAction[],
    context: WorkflowExecutionContext,
    tenantId: string
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    for (const action of actions) {
      try {
        const result = await this.executeSingleAction(action.action_config, context, tenantId);
        results[action.id] = { success: true, result };
      } catch (error: any) {
        this.logger.error('Action execution failed', { actionId: action.id, error });
        results[action.id] = { success: false, error: error.message };

        if (!action.retry_on_failure) {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * Execute a single action
   */
  private async executeSingleAction(
    config: Record<string, any>,
    context: WorkflowExecutionContext,
    tenantId: string
  ): Promise<any> {
    const { action_type, params } = config;

    this.logger.debug('Executing action', { action_type, params });

    // Mock action execution
    // In production, this would dispatch to specific action handlers
    switch (action_type) {
      case 'send_notification':
        return { message_sent: true, recipient: params.recipient };

      case 'update_record':
        return { record_updated: true, record_id: params.record_id };

      case 'create_task':
        return { task_created: true, task_id: `task-${Date.now()}` };

      case 'send_email':
        return { email_sent: true, to: params.to };

      default:
        return { action_executed: true, action_type };
    }
  }

  /**
   * Execute parallel nodes
   */
  private async executeParallelNodes(
    nodes: DecisionNode[],
    context: WorkflowExecutionContext,
    tenantId: string
  ): Promise<any> {
    const results = await Promise.all(
      nodes.map(node =>
        this.evaluateDecisionTree(node, context, [], {}, tenantId)
      )
    );

    return { parallel_results: results };
  }

  /**
   * Execute sequential nodes
   */
  private async executeSequentialNodes(
    nodes: DecisionNode[],
    context: WorkflowExecutionContext,
    tenantId: string
  ): Promise<any> {
    const results: any[] = [];

    for (const node of nodes) {
      await this.evaluateDecisionTree(node, context, [], {}, tenantId);
      results.push({ node_id: node.id, completed: true });
    }

    return { sequential_results: results };
  }

  /**
   * Record workflow execution
   */
  private async recordExecution(
    workflowId: string,
    triggerData: Record<string, any>,
    executionPath: DecisionTreePath[],
    decisionsMade: Record<string, any>,
    actionsTaken: Record<string, any>,
    executionResult: WorkflowExecutionResult,
    tenantId: string,
    executionTimeMs: number,
    errorDetails?: string
  ): Promise<void> {
    await this.executionRepository.create(
      workflowId,
      triggerData,
      executionPath,
      decisionsMade,
      actionsTaken,
      executionResult,
      tenantId,
      executionTimeMs,
      errorDetails
    );
  }

  /**
   * Get value from context
   */
  private getValueFromContext(field: string, context: WorkflowExecutionContext): any {
    // Support dot notation: trigger_data.customer.age
    const parts = field.split('.');
    let value: any = context;

    for (const part of parts) {
      value = value?.[part];
    }

    return value;
  }

  /**
   * Build input features from context
   */
  private buildInputFeatures(
    featureConfig: Record<string, string>,
    context: WorkflowExecutionContext
  ): Record<string, any> {
    const features: Record<string, any> = {};

    for (const [featureName, contextPath] of Object.entries(featureConfig)) {
      features[featureName] = this.getValueFromContext(contextPath, context);
    }

    return features;
  }
}
