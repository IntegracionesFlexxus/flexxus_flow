// Workflow Validator - Workflow validation logic
import {
  ApprovalWorkflow,
  ApprovalStep,
  ApprovalApprover,
  WorkflowCondition,
  EscalationRule
} from '../../shared/types';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  suggestions: ValidationError[];
}

export class WorkflowValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];
  private suggestions: ValidationError[] = [];

  /**
   * Validate a complete workflow
   */
  validateWorkflow(workflow: Partial<ApprovalWorkflow>): ValidationResult {
    this.reset();

    // Basic workflow validation
    this.validateBasicInfo(workflow);
    this.validateTriggerConditions(workflow.conditions || []);
    this.validateSteps(workflow.steps || []);
    this.validateWorkflowLogic(workflow);

    return this.getResult();
  }

  /**
   * Validate workflow basic information
   */
  private validateBasicInfo(workflow: Partial<ApprovalWorkflow>): void {
    // Name validation
    if (!workflow.name || workflow.name.trim().length === 0) {
      this.addError('name', 'Workflow name is required', 'WORKFLOW_NAME_REQUIRED');
    } else if (workflow.name.trim().length < 3) {
      this.addError('name', 'Workflow name must be at least 3 characters long', 'WORKFLOW_NAME_TOO_SHORT');
    } else if (workflow.name.trim().length > 100) {
      this.addError('name', 'Workflow name must be less than 100 characters', 'WORKFLOW_NAME_TOO_LONG');
    }

    // Type validation
    if (!workflow.type) {
      this.addError('type', 'Workflow type is required', 'WORKFLOW_TYPE_REQUIRED');
    } else if (!['sequential', 'parallel', 'conditional'].includes(workflow.type)) {
      this.addError('type', 'Invalid workflow type', 'WORKFLOW_TYPE_INVALID');
    }

    // Trigger event validation
    if (!workflow.triggerEvent) {
      this.addError('triggerEvent', 'Trigger event is required', 'TRIGGER_EVENT_REQUIRED');
    } else if (!['quote_created', 'quote_updated', 'amount_threshold', 'discount_threshold', 'manual'].includes(workflow.triggerEvent)) {
      this.addError('triggerEvent', 'Invalid trigger event', 'TRIGGER_EVENT_INVALID');
    }

    // Priority validation
    if (workflow.priority !== undefined) {
      if (workflow.priority < 1 || workflow.priority > 10) {
        this.addWarning('priority', 'Priority should be between 1 and 10', 'PRIORITY_OUT_OF_RANGE');
      }
    }
  }

  /**
   * Validate trigger conditions
   */
  private validateTriggerConditions(conditions: WorkflowCondition[]): void {
    if (conditions.length === 0) {
      this.addSuggestion('conditions', 'Consider adding trigger conditions to make the workflow more specific', 'NO_CONDITIONS');
      return;
    }

    conditions.forEach((condition, index) => {
      this.validateCondition(condition, `conditions[${index}]`);
    });

    // Check for conflicting conditions
    this.checkConflictingConditions(conditions);
  }

  /**
   * Validate a single condition
   */
  private validateCondition(condition: WorkflowCondition, fieldPrefix: string): void {
    // Field validation
    if (!condition.field || condition.field.trim().length === 0) {
      this.addError(`${fieldPrefix}.field`, 'Condition field is required', 'CONDITION_FIELD_REQUIRED');
    }

    // Operator validation
    const validOperators = ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'in', 'not_in', 'contains'];
    if (!condition.operator || !validOperators.includes(condition.operator)) {
      this.addError(`${fieldPrefix}.operator`, 'Invalid condition operator', 'CONDITION_OPERATOR_INVALID');
    }

    // Value validation
    if (condition.value === null || condition.value === undefined || condition.value === '') {
      this.addError(`${fieldPrefix}.value`, 'Condition value is required', 'CONDITION_VALUE_REQUIRED');
    }

    // Type-specific validation
    if (condition.field === 'amount' || condition.field === 'discount') {
      if (isNaN(Number(condition.value))) {
        this.addError(`${fieldPrefix}.value`, 'Numeric value required for amount/discount conditions', 'CONDITION_VALUE_INVALID_TYPE');
      } else if (Number(condition.value) < 0) {
        this.addWarning(`${fieldPrefix}.value`, 'Negative values may cause unexpected behavior', 'CONDITION_VALUE_NEGATIVE');
      }
    }

    // Logical operator validation
    if (condition.logicalOperator && !['AND', 'OR'].includes(condition.logicalOperator)) {
      this.addError(`${fieldPrefix}.logicalOperator`, 'Invalid logical operator', 'LOGICAL_OPERATOR_INVALID');
    }
  }

  /**
   * Check for conflicting conditions
   */
  private checkConflictingConditions(conditions: WorkflowCondition[]): void {
    const fieldConditions = new Map<string, WorkflowCondition[]>();

    // Group conditions by field
    conditions.forEach(condition => {
      if (!fieldConditions.has(condition.field)) {
        fieldConditions.set(condition.field, []);
      }
      fieldConditions.get(condition.field)!.push(condition);
    });

    // Check for conflicts within each field
    fieldConditions.forEach((fieldConds, field) => {
      if (fieldConds.length > 1) {
        this.checkFieldConditionConflicts(field, fieldConds);
      }
    });
  }

  /**
   * Check for conflicts in conditions for a specific field
   */
  private checkFieldConditionConflicts(field: string, conditions: WorkflowCondition[]): void {
    for (let i = 0; i < conditions.length; i++) {
      for (let j = i + 1; j < conditions.length; j++) {
        const cond1 = conditions[i];
        const cond2 = conditions[j];

        // Check for impossible combinations
        if (this.areConditionsConflicting(cond1, cond2)) {
          this.addWarning('conditions', `Conflicting conditions for field '${field}' may prevent workflow execution`, 'CONFLICTING_CONDITIONS');
        }
      }
    }
  }

  /**
   * Check if two conditions are conflicting
   */
  private areConditionsConflicting(cond1: WorkflowCondition, cond2: WorkflowCondition): boolean {
    if (cond1.field !== cond2.field) return false;

    // Example: amount > 1000 AND amount < 500
    if (cond1.operator === 'greater_than' && cond2.operator === 'less_than') {
      return Number(cond1.value) >= Number(cond2.value);
    }

    if (cond1.operator === 'equals' && cond2.operator === 'not_equals') {
      return cond1.value === cond2.value;
    }

    return false;
  }

  /**
   * Validate workflow steps
   */
  private validateSteps(steps: ApprovalStep[]): void {
    if (steps.length === 0) {
      this.addError('steps', 'At least one approval step is required', 'NO_STEPS');
      return;
    }

    if (steps.length > 10) {
      this.addWarning('steps', 'Workflows with more than 10 steps may be too complex', 'TOO_MANY_STEPS');
    }

    // Validate step numbering
    this.validateStepNumbering(steps);

    // Validate each step
    steps.forEach((step, index) => {
      this.validateStep(step, `steps[${index}]`);
    });

    // Check for duplicate step names
    this.checkDuplicateStepNames(steps);
  }

  /**
   * Validate step numbering
   */
  private validateStepNumbering(steps: ApprovalStep[]): void {
    const stepNumbers = steps.map(step => step.stepNumber).sort((a, b) => a - b);

    for (let i = 0; i < stepNumbers.length; i++) {
      if (stepNumbers[i] !== i + 1) {
        this.addError('steps', 'Step numbers must be sequential starting from 1', 'INVALID_STEP_NUMBERING');
        break;
      }
    }

    // Check for duplicate step numbers
    const uniqueNumbers = new Set(stepNumbers);
    if (uniqueNumbers.size !== stepNumbers.length) {
      this.addError('steps', 'Duplicate step numbers found', 'DUPLICATE_STEP_NUMBERS');
    }
  }

  /**
   * Validate a single step
   */
  private validateStep(step: ApprovalStep, fieldPrefix: string): void {
    // Name validation
    if (!step.name || step.name.trim().length === 0) {
      this.addError(`${fieldPrefix}.name`, 'Step name is required', 'STEP_NAME_REQUIRED');
    } else if (step.name.trim().length > 100) {
      this.addError(`${fieldPrefix}.name`, 'Step name must be less than 100 characters', 'STEP_NAME_TOO_LONG');
    }

    // Type validation
    if (!step.type || !['single', 'multiple', 'consensus', 'any_one'].includes(step.type)) {
      this.addError(`${fieldPrefix}.type`, 'Invalid step type', 'STEP_TYPE_INVALID');
    }

    // Approvers validation
    this.validateApprovers(step.approvers, step.type, `${fieldPrefix}.approvers`);

    // Timeout validation
    if (step.timeoutHours !== undefined) {
      if (step.timeoutHours <= 0) {
        this.addError(`${fieldPrefix}.timeoutHours`, 'Timeout must be greater than 0', 'TIMEOUT_INVALID');
      } else if (step.timeoutHours > 720) { // 30 days
        this.addWarning(`${fieldPrefix}.timeoutHours`, 'Timeout longer than 30 days may cause delays', 'TIMEOUT_TOO_LONG');
      }
    } else {
      this.addSuggestion(`${fieldPrefix}.timeoutHours`, 'Consider setting a timeout to prevent indefinite waiting', 'NO_TIMEOUT');
    }

    // Escalation rules validation
    if (step.escalationRules) {
      step.escalationRules.forEach((rule, index) => {
        this.validateEscalationRule(rule, `${fieldPrefix}.escalationRules[${index}]`, step.timeoutHours);
      });
    }

    // Step conditions validation
    if (step.conditions) {
      step.conditions.forEach((condition, index) => {
        this.validateStepCondition(condition, `${fieldPrefix}.conditions[${index}]`);
      });
    }
  }

  /**
   * Validate step approvers
   */
  private validateApprovers(approvers: ApprovalApprover[], stepType: string, fieldPrefix: string): void {
    if (approvers.length === 0) {
      this.addError(fieldPrefix, 'At least one approver is required', 'NO_APPROVERS');
      return;
    }

    // Type-specific validation
    if (stepType === 'single' && approvers.length > 1) {
      this.addWarning(fieldPrefix, 'Single approval step should have only one approver', 'SINGLE_STEP_MULTIPLE_APPROVERS');
    }

    if (stepType === 'consensus' && approvers.length < 2) {
      this.addError(fieldPrefix, 'Consensus step requires at least 2 approvers', 'CONSENSUS_INSUFFICIENT_APPROVERS');
    }

    approvers.forEach((approver, index) => {
      this.validateApprover(approver, `${fieldPrefix}[${index}]`);
    });

    // Check for required approvers
    const requiredApprovers = approvers.filter(a => a.isRequired);
    if (requiredApprovers.length === 0) {
      this.addWarning(fieldPrefix, 'No required approvers defined - step may be skipped', 'NO_REQUIRED_APPROVERS');
    }
  }

  /**
   * Validate a single approver
   */
  private validateApprover(approver: ApprovalApprover, fieldPrefix: string): void {
    // Type validation
    if (!approver.type || !['user', 'role', 'manager', 'custom'].includes(approver.type)) {
      this.addError(`${fieldPrefix}.type`, 'Invalid approver type', 'APPROVER_TYPE_INVALID');
    }

    // Type-specific validation
    if (approver.type === 'user' && !approver.userId) {
      this.addError(`${fieldPrefix}.userId`, 'User ID required for user-type approver', 'USER_ID_REQUIRED');
    }

    if (approver.type === 'role' && !approver.roleId) {
      this.addError(`${fieldPrefix}.roleId`, 'Role ID required for role-type approver', 'ROLE_ID_REQUIRED');
    }

    if (approver.type === 'custom' && !approver.customLogic) {
      this.addError(`${fieldPrefix}.customLogic`, 'Custom logic required for custom-type approver', 'CUSTOM_LOGIC_REQUIRED');
    }

    // Weight validation for consensus
    if (approver.weight !== undefined) {
      if (approver.weight <= 0) {
        this.addError(`${fieldPrefix}.weight`, 'Approver weight must be greater than 0', 'WEIGHT_INVALID');
      }
    }
  }

  /**
   * Validate escalation rule
   */
  private validateEscalationRule(rule: EscalationRule, fieldPrefix: string, stepTimeout?: number): void {
    // Trigger time validation
    if (rule.triggerAfterHours <= 0) {
      this.addError(`${fieldPrefix}.triggerAfterHours`, 'Escalation trigger time must be greater than 0', 'ESCALATION_TIME_INVALID');
    }

    if (stepTimeout && rule.triggerAfterHours >= stepTimeout) {
      this.addWarning(`${fieldPrefix}.triggerAfterHours`, 'Escalation time should be less than step timeout', 'ESCALATION_TIME_TOO_LATE');
    }

    // Action validation
    if (!rule.action || !['notify', 'escalate', 'auto_approve', 'auto_reject'].includes(rule.action)) {
      this.addError(`${fieldPrefix}.action`, 'Invalid escalation action', 'ESCALATION_ACTION_INVALID');
    }

    // Target validation
    if (rule.action === 'escalate' && !rule.targetUserId && !rule.targetRoleId) {
      this.addError(`${fieldPrefix}.target`, 'Escalation target required when action is escalate', 'ESCALATION_TARGET_REQUIRED');
    }
  }

  /**
   * Validate step condition
   */
  private validateStepCondition(condition: any, fieldPrefix: string): void {
    // Similar to trigger condition validation but for step-specific conditions
    this.validateCondition(condition, fieldPrefix);
  }

  /**
   * Check for duplicate step names
   */
  private checkDuplicateStepNames(steps: ApprovalStep[]): void {
    const stepNames = steps.map(step => step.name.trim().toLowerCase());
    const uniqueNames = new Set(stepNames);

    if (uniqueNames.size !== stepNames.length) {
      this.addWarning('steps', 'Duplicate step names found - consider using unique names for clarity', 'DUPLICATE_STEP_NAMES');
    }
  }

  /**
   * Validate overall workflow logic
   */
  private validateWorkflowLogic(workflow: Partial<ApprovalWorkflow>): void {
    if (!workflow.steps || workflow.steps.length === 0) return;

    // Check for unreachable steps in conditional workflows
    if (workflow.type === 'conditional') {
      this.validateConditionalLogic(workflow.steps);
    }

    // Check for circular dependencies
    this.checkCircularDependencies(workflow.steps);

    // Validate workflow completeness
    this.validateWorkflowCompleteness(workflow);
  }

  /**
   * Validate conditional workflow logic
   */
  private validateConditionalLogic(steps: ApprovalStep[]): void {
    // Check if all steps have appropriate conditions
    const stepsWithConditions = steps.filter(step => step.conditions && step.conditions.length > 0);

    if (stepsWithConditions.length === 0) {
      this.addWarning('workflow', 'Conditional workflow should have step conditions', 'CONDITIONAL_NO_STEP_CONDITIONS');
    }

    // Check for steps that might never execute
    steps.forEach((step, index) => {
      if (step.conditions && step.conditions.length > 0) {
        const hasAlwaysTrueCondition = step.conditions.some(cond =>
          this.isAlwaysTrueCondition(cond)
        );

        if (!hasAlwaysTrueCondition) {
          this.addSuggestion(`steps[${index}]`, 'Step may never execute due to conditions', 'STEP_MAY_NOT_EXECUTE');
        }
      }
    });
  }

  /**
   * Check if a condition is always true
   */
  private isAlwaysTrueCondition(condition: any): boolean {
    // Simple heuristic - in practice, this would be more sophisticated
    return false;
  }

  /**
   * Check for circular dependencies
   */
  private checkCircularDependencies(steps: ApprovalStep[]): void {
    // For now, sequential steps shouldn't have circular dependencies
    // This would be more complex for parallel/conditional workflows
    const stepNumbers = steps.map(step => step.stepNumber);
    const sortedNumbers = [...stepNumbers].sort((a, b) => a - b);

    if (JSON.stringify(stepNumbers) !== JSON.stringify(sortedNumbers)) {
      this.addWarning('workflow', 'Step order may create logical issues', 'STEP_ORDER_ISSUES');
    }
  }

  /**
   * Validate workflow completeness
   */
  private validateWorkflowCompleteness(workflow: Partial<ApprovalWorkflow>): void {
    // Check if workflow has both approval and rejection paths
    const hasApprovalPath = true; // Simplified
    const hasRejectionPath = true; // Simplified

    if (!hasApprovalPath) {
      this.addSuggestion('workflow', 'Consider defining clear approval paths', 'NO_APPROVAL_PATH');
    }

    if (!hasRejectionPath) {
      this.addSuggestion('workflow', 'Consider defining rejection handling', 'NO_REJECTION_PATH');
    }
  }

  /**
   * Helper methods for adding validation issues
   */
  private addError(field: string, message: string, code: string): void {
    this.errors.push({ field, message, severity: 'error', code });
  }

  private addWarning(field: string, message: string, code: string): void {
    this.warnings.push({ field, message, severity: 'warning', code });
  }

  private addSuggestion(field: string, message: string, code: string): void {
    this.suggestions.push({ field, message, severity: 'info', code });
  }

  private reset(): void {
    this.errors = [];
    this.warnings = [];
    this.suggestions = [];
  }

  private getResult(): ValidationResult {
    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      suggestions: this.suggestions
    };
  }
}

// Singleton instance
export const workflowValidator = new WorkflowValidator();

// Convenience functions
export const validateWorkflow = (workflow: Partial<ApprovalWorkflow>): ValidationResult => {
  return workflowValidator.validateWorkflow(workflow);
};

export const validateWorkflowAsync = async (workflow: Partial<ApprovalWorkflow>): Promise<ValidationResult> => {
  // For future async validation (e.g., checking against database)
  return validateWorkflow(workflow);
};