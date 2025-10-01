/**
 * Rule Evaluator - Sprint 07
 * Evaluates rule conditions against context
 */

import { injectable } from 'inversify';
import {
  IRule,
  ICondition,
  IRuleEvaluationContext,
  IRuleEvaluationResult
} from './interfaces/IRule';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

@injectable()
export class RuleEvaluator {
  private logger: any;

  constructor() {
    this.logger = LoggerFactory.create({ file: __filename });
  }

  /**
   * Evaluate a rule against the given context
   */
  async evaluate(rule: IRule, context: IRuleEvaluationContext): Promise<IRuleEvaluationResult> {
    const startTime = Date.now();
    let conditionsEvaluated = 0;
    let conditionsMatched = 0;

    try {
      const operator = rule.condition_operator || 'AND';
      let matched = operator === 'AND' ? true : false;

      for (const condition of rule.conditions) {
        conditionsEvaluated++;

        const conditionResult = await this.evaluateCondition(condition, context);

        if (conditionResult) {
          conditionsMatched++;
        }

        if (operator === 'AND') {
          matched = matched && conditionResult;
          if (!matched) break; // Short circuit on first false for AND
        } else {
          matched = matched || conditionResult;
          if (matched && operator === 'OR') break; // Short circuit on first true for OR
        }
      }

      return {
        rule_id: rule.id,
        matched,
        conditions_evaluated: conditionsEvaluated,
        conditions_matched: conditionsMatched,
        actions_to_execute: matched ? rule.actions : [],
        evaluation_time_ms: Date.now() - startTime
      };
    } catch (error: any) {
      this.logger.error('Failed to evaluate rule', {
        ruleId: rule.id,
        error: error.message
      });

      return {
        rule_id: rule.id,
        matched: false,
        conditions_evaluated: conditionsEvaluated,
        conditions_matched: conditionsMatched,
        actions_to_execute: [],
        evaluation_time_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(condition: ICondition, context: IRuleEvaluationContext): Promise<boolean> {
    try {
      const value = this.extractValue(condition.field, context);
      const targetValue = this.processTargetValue(condition.value, context);

      switch (condition.operator) {
        case 'equals':
          return this.compareEquals(value, targetValue, condition.case_sensitive);

        case 'not_equals':
          return !this.compareEquals(value, targetValue, condition.case_sensitive);

        case 'contains':
          return this.compareContains(value, targetValue, condition.case_sensitive);

        case 'starts_with':
          return this.compareStartsWith(value, targetValue, condition.case_sensitive);

        case 'ends_with':
          return this.compareEndsWith(value, targetValue, condition.case_sensitive);

        case 'regex':
          return this.compareRegex(value, targetValue, condition.case_sensitive);

        case 'in':
          return this.compareIn(value, targetValue, condition.case_sensitive);

        case 'between':
          return this.compareBetween(value, targetValue);

        case 'greater_than':
          return this.compareGreaterThan(value, targetValue);

        case 'less_than':
          return this.compareLessThan(value, targetValue);

        case 'exists':
          return value !== undefined && value !== null;

        case 'not_exists':
          return value === undefined || value === null;

        default:
          this.logger.warn('Unknown operator', { operator: condition.operator });
          return false;
      }
    } catch (error: any) {
      this.logger.error('Failed to evaluate condition', {
        condition,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Extract value from context using dot notation
   */
  private extractValue(field: string, context: IRuleEvaluationContext): any {
    const parts = field.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }

      // Handle array indices
      if (part.includes('[') && part.includes(']')) {
        const [arrayName, indexStr] = part.split('[');
        const index = parseInt(indexStr.replace(']', ''));
        value = value[arrayName];
        if (Array.isArray(value)) {
          value = value[index];
        }
      } else {
        value = value[part];
      }
    }

    return value;
  }

  /**
   * Process target value (handle variables)
   */
  private processTargetValue(value: any, context: IRuleEvaluationContext): any {
    if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
      const variableName = value.slice(2, -2).trim();
      return context.variables?.get(variableName) ?? value;
    }
    return value;
  }

  /**
   * Compare equals
   */
  private compareEquals(value: any, target: any, caseSensitive?: boolean): boolean {
    if (typeof value === 'string' && typeof target === 'string' && !caseSensitive) {
      return value.toLowerCase() === target.toLowerCase();
    }
    return value === target;
  }

  /**
   * Compare contains
   */
  private compareContains(value: any, target: any, caseSensitive?: boolean): boolean {
    if (typeof value !== 'string' || typeof target !== 'string') {
      return false;
    }

    if (!caseSensitive) {
      return value.toLowerCase().includes(target.toLowerCase());
    }
    return value.includes(target);
  }

  /**
   * Compare starts with
   */
  private compareStartsWith(value: any, target: any, caseSensitive?: boolean): boolean {
    if (typeof value !== 'string' || typeof target !== 'string') {
      return false;
    }

    if (!caseSensitive) {
      return value.toLowerCase().startsWith(target.toLowerCase());
    }
    return value.startsWith(target);
  }

  /**
   * Compare ends with
   */
  private compareEndsWith(value: any, target: any, caseSensitive?: boolean): boolean {
    if (typeof value !== 'string' || typeof target !== 'string') {
      return false;
    }

    if (!caseSensitive) {
      return value.toLowerCase().endsWith(target.toLowerCase());
    }
    return value.endsWith(target);
  }

  /**
   * Compare regex
   */
  private compareRegex(value: any, pattern: string, caseSensitive?: boolean): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    try {
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(pattern, flags);
      return regex.test(value);
    } catch (error) {
      this.logger.error('Invalid regex pattern', { pattern, error });
      return false;
    }
  }

  /**
   * Compare in array
   */
  private compareIn(value: any, targetArray: any[], caseSensitive?: boolean): boolean {
    if (!Array.isArray(targetArray)) {
      return false;
    }

    if (typeof value === 'string' && !caseSensitive) {
      const lowerValue = value.toLowerCase();
      return targetArray.some(item =>
        typeof item === 'string' && item.toLowerCase() === lowerValue
      );
    }

    return targetArray.includes(value);
  }

  /**
   * Compare between values
   */
  private compareBetween(value: any, range: [any, any]): boolean {
    if (!Array.isArray(range) || range.length !== 2) {
      return false;
    }

    const [min, max] = range;

    if (typeof value === 'number') {
      return value >= min && value <= max;
    }

    if (value instanceof Date && min instanceof Date && max instanceof Date) {
      return value >= min && value <= max;
    }

    // String comparison
    return value >= min && value <= max;
  }

  /**
   * Compare greater than
   */
  private compareGreaterThan(value: any, target: any): boolean {
    if (typeof value === 'number' && typeof target === 'number') {
      return value > target;
    }

    if (value instanceof Date && target instanceof Date) {
      return value > target;
    }

    return false;
  }

  /**
   * Compare less than
   */
  private compareLessThan(value: any, target: any): boolean {
    if (typeof value === 'number' && typeof target === 'number') {
      return value < target;
    }

    if (value instanceof Date && target instanceof Date) {
      return value < target;
    }

    return false;
  }
}