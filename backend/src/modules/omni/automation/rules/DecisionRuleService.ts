/**
 * Decision Rule Service - Sprint 12 Fase 2
 * Business logic for decision rule management
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { DecisionRuleRepository } from '../repositories/DecisionRuleRepository';
import { MLBasedRuleEngine } from './MLBasedRuleEngine';
import { IDecisionRule } from '../../interfaces/IAIWorkflow';
import { DecisionRuleType } from '../../types/workflow-ai.types';

@injectable()
export class DecisionRuleService {
  constructor(
    @inject(TYPES.DecisionRuleRepository)
    private ruleRepository: DecisionRuleRepository,

    @inject(TYPES.MLBasedRuleEngine)
    private ruleEngine: MLBasedRuleEngine,

    @inject(TYPES.LoggerService)
    private logger: any
  ) {}

  async createRule(
    tenantId: string,
    ruleName: string,
    ruleType: DecisionRuleType,
    conditions: any,
    actions: any[],
    options?: { mlModelId?: string; confidenceThreshold?: number; priority?: number }
  ): Promise<IDecisionRule> {
    this.logger.info('Creating decision rule', { tenantId, ruleName, ruleType });

    return await this.ruleRepository.create(tenantId, ruleName, ruleType, conditions, actions, options);
  }

  async getRule(ruleId: string, tenantId: string): Promise<IDecisionRule> {
    const rule = await this.ruleRepository.findById(ruleId, tenantId);

    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    return rule;
  }

  async listRules(tenantId: string, activeOnly: boolean = true): Promise<IDecisionRule[]> {
    return await this.ruleRepository.findAll(tenantId, activeOnly);
  }

  async updateRule(ruleId: string, tenantId: string, data: Partial<IDecisionRule>): Promise<IDecisionRule> {
    const rule = await this.ruleRepository.update(ruleId, tenantId, data);

    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    return rule;
  }

  async deleteRule(ruleId: string, tenantId: string): Promise<void> {
    const deleted = await this.ruleRepository.delete(ruleId, tenantId);

    if (!deleted) {
      throw new Error(`Rule not found: ${ruleId}`);
    }
  }

  async activateRule(ruleId: string, tenantId: string): Promise<void> {
    await this.ruleRepository.activate(ruleId, tenantId);
  }

  async deactivateRule(ruleId: string, tenantId: string): Promise<void> {
    await this.ruleRepository.deactivate(ruleId, tenantId);
  }

  /**
   * Evaluate all active rules against a context
   */
  async evaluateRules(context: Record<string, any>, tenantId: string): Promise<any> {
    this.logger.info('Evaluating rules', { tenantId });

    const activeRules = await this.ruleRepository.findActive(tenantId);

    // Sort by priority
    activeRules.sort((a, b) => b.priority - a.priority);

    const results: any[] = [];

    for (const rule of activeRules) {
      const evaluation = await this.ruleEngine.evaluateRule(rule, context, tenantId);

      results.push({
        rule_id: rule.id,
        rule_name: rule.rule_name,
        ...evaluation
      });

      // Execute actions if rule matches
      if (evaluation.matches) {
        const actionResults = await this.ruleEngine.executeRuleActions(rule, context, tenantId);

        results[results.length - 1].actions_taken = actionResults;
      }
    }

    return {
      total_rules_evaluated: activeRules.length,
      matched_rules: results.filter(r => r.matches).length,
      results
    };
  }
}
