/**
 * Rule Engine - Sprint 07
 * Core business rules evaluation and execution engine
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import {
  IRule,
  ICondition,
  IAction,
  IRuleEvaluationContext,
  IRuleEvaluationResult,
  IRuleExecutionResult
} from './interfaces/IRule';
import { RuleRepository } from './RuleRepository';
import { RuleEvaluator } from './RuleEvaluator';
import { ActionExecutor } from './ActionExecutor';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

@injectable()
export class RuleEngine {
  private logger: any;
  private rulesCache: Map<string, IRule[]> = new Map();
  private cacheExpiryMs: number = 300000; // 5 minutes
  private lastCacheUpdate: Map<string, number> = new Map();

  constructor(
    @inject(TYPES.OmniRuleRepository) private ruleRepository: RuleRepository,
    @inject(TYPES.OmniRuleEvaluator) private ruleEvaluator: RuleEvaluator,
    @inject(TYPES.OmniActionExecutor) private actionExecutor: ActionExecutor
  ) {
    this.logger = LoggerFactory.create({ file: __filename });
  }

  /**
   * Evaluate and execute rules for a given context
   */
  async processRules(context: IRuleEvaluationContext): Promise<IRuleExecutionResult[]> {
    const startTime = Date.now();
    const results: IRuleExecutionResult[] = [];

    try {
      // Get applicable rules
      const rules = await this.getApplicableRules(context.company_id);

      this.logger.info('Processing rules', {
        companyId: context.company_id,
        rulesCount: rules.length
      });

      // Sort rules by priority (higher priority first)
      rules.sort((a, b) => b.priority - a.priority);

      // Process each rule
      for (const rule of rules) {
        try {
          // Evaluate rule conditions
          const evaluationResult = await this.ruleEvaluator.evaluate(rule, context);

          if (evaluationResult.matched) {
            this.logger.debug('Rule matched', {
              ruleId: rule.id,
              ruleName: rule.name
            });

            // Execute rule actions
            const executionResult = await this.actionExecutor.executeActions(
              evaluationResult.actions_to_execute,
              context
            );

            // Update rule execution count
            await this.ruleRepository.incrementExecutionCount(rule.id, context.company_id);

            results.push({
              ...executionResult,
              rule_id: rule.id
            });

            // Log to automation logs
            await this.logRuleExecution(rule, evaluationResult, executionResult, context);
          }
        } catch (error: any) {
          this.logger.error('Failed to process rule', {
            ruleId: rule.id,
            error: error.message
          });

          results.push({
            rule_id: rule.id,
            success: false,
            actions_executed: 0,
            actions_succeeded: 0,
            actions_failed: 0,
            execution_time_ms: Date.now() - startTime,
            results: []
          });
        }
      }

      this.logger.info('Rules processing completed', {
        totalRules: rules.length,
        executedRules: results.filter(r => r.success).length,
        executionTime: Date.now() - startTime
      });

      return results;
    } catch (error: any) {
      this.logger.error('Failed to process rules', error);
      throw error;
    }
  }

  /**
   * Get applicable rules for a company
   */
  private async getApplicableRules(companyId: string): Promise<IRule[]> {
    // Check cache
    const cacheKey = `rules:${companyId}`;
    const lastUpdate = this.lastCacheUpdate.get(cacheKey) || 0;

    if (Date.now() - lastUpdate < this.cacheExpiryMs && this.rulesCache.has(cacheKey)) {
      return this.rulesCache.get(cacheKey)!;
    }

    // Fetch from database
    const rules = await this.ruleRepository.findActiveByCompany(companyId);

    // Update cache
    this.rulesCache.set(cacheKey, rules);
    this.lastCacheUpdate.set(cacheKey, Date.now());

    return rules;
  }

  /**
   * Test a specific rule without executing actions
   */
  async testRule(ruleId: string, context: IRuleEvaluationContext): Promise<IRuleEvaluationResult> {
    try {
      const rule = await this.ruleRepository.findById(ruleId, context.company_id);
      if (!rule) {
        throw new Error(`Rule not found: ${ruleId}`);
      }

      return await this.ruleEvaluator.evaluate(rule, context);
    } catch (error: any) {
      this.logger.error('Failed to test rule', {
        ruleId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create a new rule
   */
  async createRule(rule: Partial<IRule>, companyId: string): Promise<IRule> {
    try {
      // Validate rule structure
      this.validateRule(rule);

      const newRule = await this.ruleRepository.create({
        ...rule,
        company_id: companyId
      } as IRule, companyId);

      // Clear cache
      this.clearCache(companyId);

      return newRule;
    } catch (error: any) {
      this.logger.error('Failed to create rule', error);
      throw error;
    }
  }

  /**
   * Update an existing rule
   */
  async updateRule(ruleId: string, updates: Partial<IRule>, companyId: string): Promise<IRule> {
    try {
      // Validate rule structure if conditions or actions are being updated
      if (updates.conditions || updates.actions) {
        this.validateRule(updates);
      }

      const updatedRule = await this.ruleRepository.update(ruleId, updates, companyId);

      // Clear cache
      this.clearCache(companyId);

      return updatedRule;
    } catch (error: any) {
      this.logger.error('Failed to update rule', error);
      throw error;
    }
  }

  /**
   * Delete a rule
   */
  async deleteRule(ruleId: string, companyId: string): Promise<boolean> {
    try {
      const result = await this.ruleRepository.delete(ruleId, companyId);

      // Clear cache
      this.clearCache(companyId);

      return result;
    } catch (error: any) {
      this.logger.error('Failed to delete rule', error);
      throw error;
    }
  }

  /**
   * Validate rule structure
   */
  private validateRule(rule: Partial<IRule>): void {
    if (rule.conditions && rule.conditions.length === 0) {
      throw new Error('Rule must have at least one condition');
    }

    if (rule.actions && rule.actions.length === 0) {
      throw new Error('Rule must have at least one action');
    }

    // Validate conditions
    if (rule.conditions) {
      for (const condition of rule.conditions) {
        if (!condition.field || !condition.operator) {
          throw new Error('Invalid condition structure');
        }
      }
    }

    // Validate actions
    if (rule.actions) {
      for (const action of rule.actions) {
        if (!action.type || !action.params) {
          throw new Error('Invalid action structure');
        }
      }
    }

    // Check for potential infinite loops
    if (rule.actions) {
      const hasRecursiveAction = rule.actions.some(a =>
        a.type === 'execute_flow' ||
        (a.type === 'trigger_webhook' && a.params.url?.includes('/rules/'))
      );

      if (hasRecursiveAction && !rule.metadata?.loop_prevention) {
        this.logger.warn('Rule may cause infinite loop', { rule });
      }
    }
  }

  /**
   * Clear rules cache
   */
  private clearCache(companyId: string): void {
    const cacheKey = `rules:${companyId}`;
    this.rulesCache.delete(cacheKey);
    this.lastCacheUpdate.delete(cacheKey);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.rulesCache.clear();
    this.lastCacheUpdate.clear();
    this.logger.info('Rules cache cleared');
  }

  /**
   * Log rule execution to automation logs
   */
  private async logRuleExecution(
    rule: IRule,
    evaluationResult: IRuleEvaluationResult,
    executionResult: IRuleExecutionResult,
    context: IRuleEvaluationContext
  ): Promise<void> {
    try {
      await this.ruleRepository.createLog({
        company_id: context.company_id,
        log_type: 'rule',
        rule_id: rule.id,
        conversation_id: context.conversation?.id,
        customer_id: context.customer?.id,
        action_type: 'rule_execution',
        action_details: {
          rule_name: rule.name,
          rule_type: rule.type,
          conditions_matched: evaluationResult.conditions_matched,
          actions_executed: executionResult.actions_executed
        },
        input_data: {
          context: {
            conversation_id: context.conversation?.id,
            message_id: context.message?.id,
            customer_id: context.customer?.id
          }
        },
        output_data: {
          evaluation: evaluationResult,
          execution: executionResult
        },
        result: executionResult.success ? 'success' : 'failure',
        execution_time_ms: evaluationResult.evaluation_time_ms + executionResult.execution_time_ms
      });
    } catch (error) {
      this.logger.error('Failed to log rule execution', error);
    }
  }

  /**
   * Get rule execution statistics
   */
  async getRuleStatistics(companyId: string, dateRange?: { start: Date; end: Date }): Promise<any> {
    try {
      const stats = await this.ruleRepository.getExecutionStatistics(companyId, dateRange);
      return stats;
    } catch (error: any) {
      this.logger.error('Failed to get rule statistics', error);
      throw error;
    }
  }

  /**
   * Bulk enable/disable rules
   */
  async bulkUpdateStatus(ruleIds: string[], isActive: boolean, companyId: string): Promise<number> {
    try {
      let updatedCount = 0;

      for (const ruleId of ruleIds) {
        await this.ruleRepository.update(ruleId, { is_active: isActive }, companyId);
        updatedCount++;
      }

      // Clear cache
      this.clearCache(companyId);

      return updatedCount;
    } catch (error: any) {
      this.logger.error('Failed to bulk update rule status', error);
      throw error;
    }
  }
}