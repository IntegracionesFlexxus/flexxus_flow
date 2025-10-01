/**
 * ML-Based Rule Engine - Sprint 12 Fase 2
 * Engine for evaluating rules (rule-based and ML-based)
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { PredictionService } from '../../ml/services/PredictionService';
import { IDecisionRule } from '../../interfaces/IAIWorkflow';
import { DecisionRuleType, ConditionExpression } from '../../types/workflow-ai.types';

@injectable()
export class MLBasedRuleEngine {
  constructor(
    @inject(TYPES.PredictionService)
    private predictionService: PredictionService,

    @inject(TYPES.LoggerService)
    private logger: any
  ) {}

  /**
   * Evaluate a single rule
   */
  async evaluateRule(
    rule: IDecisionRule,
    context: Record<string, any>,
    tenantId: string
  ): Promise<{ matches: boolean; confidence?: number; result?: any }> {
    this.logger.debug('Evaluating rule', { ruleId: rule.id, ruleType: rule.rule_type });

    switch (rule.rule_type) {
      case DecisionRuleType.RULE_BASED:
        return await this.evaluateRuleBased(rule, context);

      case DecisionRuleType.ML_BASED:
        return await this.evaluateMLBased(rule, context, tenantId);

      case DecisionRuleType.HYBRID:
        return await this.evaluateHybrid(rule, context, tenantId);

      case DecisionRuleType.HEURISTIC:
        return await this.evaluateHeuristic(rule, context);

      default:
        throw new Error(`Unknown rule type: ${rule.rule_type}`);
    }
  }

  /**
   * Execute rule actions
   */
  async executeRuleActions(
    rule: IDecisionRule,
    context: Record<string, any>,
    tenantId: string
  ): Promise<any[]> {
    this.logger.info('Executing rule actions', { ruleId: rule.id, actionCount: rule.actions.length });

    const results: any[] = [];

    for (const action of rule.actions) {
      try {
        const result = await this.executeAction(action, context, tenantId);
        results.push({ success: true, action_type: action.action_type, result });
      } catch (error: any) {
        this.logger.error('Rule action failed', { ruleId: rule.id, action, error });
        results.push({ success: false, action_type: action.action_type, error: error.message });
      }
    }

    return results;
  }

  /**
   * Evaluate rule-based rule
   */
  private async evaluateRuleBased(
    rule: IDecisionRule,
    context: Record<string, any>
  ): Promise<{ matches: boolean }> {
    const { conditions } = rule.conditions;

    if (!conditions || conditions.length === 0) {
      return { matches: true };
    }

    let matches = true;
    let previousLogicalOp: 'and' | 'or' | undefined;

    for (const condition of conditions) {
      const conditionMatches = this.evaluateCondition(condition, context);

      if (previousLogicalOp === 'or') {
        matches = matches || conditionMatches;
      } else {
        // Default is AND
        matches = matches && conditionMatches;
      }

      previousLogicalOp = condition.logical_operator;
    }

    return { matches };
  }

  /**
   * Evaluate ML-based rule
   */
  private async evaluateMLBased(
    rule: IDecisionRule,
    context: Record<string, any>,
    tenantId: string
  ): Promise<{ matches: boolean; confidence: number; result: any }> {
    if (!rule.ml_model_id) {
      throw new Error('ML model ID is required for ML-based rules');
    }

    // Assuming there's a deployment for this model
    // In production, you'd lookup the active deployment for the model
    const deploymentId = context.deployment_id || rule.ml_model_id;

    const inputFeatures = this.extractFeatures(context);

    const prediction = await this.predictionService.predict(deploymentId, inputFeatures, tenantId);

    const confidence = prediction.confidence_score || 0;
    const matches = confidence >= rule.confidence_threshold;

    return {
      matches,
      confidence,
      result: prediction.prediction_result
    };
  }

  /**
   * Evaluate hybrid rule (combines rule-based and ML-based)
   */
  private async evaluateHybrid(
    rule: IDecisionRule,
    context: Record<string, any>,
    tenantId: string
  ): Promise<{ matches: boolean; confidence?: number }> {
    // First evaluate rule-based conditions
    const ruleBasedResult = await this.evaluateRuleBased(rule, context);

    if (!ruleBasedResult.matches) {
      return { matches: false };
    }

    // Then evaluate ML-based prediction
    if (rule.ml_model_id) {
      const mlResult = await this.evaluateMLBased(rule, context, tenantId);
      return mlResult;
    }

    return { matches: true };
  }

  /**
   * Evaluate heuristic rule
   */
  private async evaluateHeuristic(
    rule: IDecisionRule,
    context: Record<string, any>
  ): Promise<{ matches: boolean }> {
    // Heuristic rules use simple scoring logic
    const { conditions } = rule.conditions;

    let score = 0;
    let maxScore = conditions.length;

    for (const condition of conditions) {
      if (this.evaluateCondition(condition, context)) {
        score++;
      }
    }

    const scoreRatio = maxScore > 0 ? score / maxScore : 0;
    const matches = scoreRatio >= (rule.confidence_threshold || 0.5);

    return { matches };
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: ConditionExpression, context: Record<string, any>): boolean {
    const { field, operator, value } = condition;

    const actualValue = this.getFieldValue(field, context);

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
      case 'not_in':
        return Array.isArray(value) && !value.includes(actualValue);
      case 'contains':
        return String(actualValue).includes(String(value));
      case 'matches':
        const regex = new RegExp(String(value));
        return regex.test(String(actualValue));
      default:
        return false;
    }
  }

  /**
   * Execute an action
   */
  private async executeAction(
    action: any,
    context: Record<string, any>,
    tenantId: string
  ): Promise<any> {
    const { action_type, action_params, execute_async } = action;

    this.logger.debug('Executing action', { action_type, execute_async });

    // Mock action execution
    // In production, this would dispatch to actual action handlers
    switch (action_type) {
      case 'assign_conversation':
        return { assigned: true, agent_id: action_params.agent_id };

      case 'send_notification':
        return { notification_sent: true, recipient: action_params.recipient };

      case 'update_priority':
        return { priority_updated: true, new_priority: action_params.priority };

      case 'add_tag':
        return { tag_added: true, tag: action_params.tag };

      case 'trigger_workflow':
        return { workflow_triggered: true, workflow_id: action_params.workflow_id };

      default:
        return { action_executed: true, action_type };
    }
  }

  /**
   * Get field value from context using dot notation
   */
  private getFieldValue(field: string, context: Record<string, any>): any {
    const parts = field.split('.');
    let value: any = context;

    for (const part of parts) {
      value = value?.[part];
    }

    return value;
  }

  /**
   * Extract features from context for ML prediction
   */
  private extractFeatures(context: Record<string, any>): Record<string, any> {
    // Extract relevant features from context
    // In production, this would be configurable per rule
    const features: Record<string, any> = {};

    if (context.customer) {
      Object.assign(features, context.customer);
    }

    if (context.conversation) {
      Object.assign(features, context.conversation);
    }

    if (context.message) {
      features.message_length = context.message.content?.length || 0;
      features.has_attachments = !!context.message.attachments;
    }

    return features;
  }
}
