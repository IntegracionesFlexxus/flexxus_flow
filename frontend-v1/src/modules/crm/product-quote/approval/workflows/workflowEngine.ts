// Workflow Engine - Workflow execution engine
import {
  ApprovalWorkflow,
  ApprovalProcess,
  ApprovalStep,
  ApprovalApprover,
  ProcessApprovalStep,
  ProcessApprover,
  ApprovalDecision,
  WorkflowCondition,
  EscalationRule
} from '../../shared/types';

export interface WorkflowContext {
  entityType: string;
  entityId: number;
  entityData: Record<string, any>;
  requestedBy: number;
  requestedAt: string;
  metadata?: Record<string, any>;
}

export interface ExecutionResult {
  success: boolean;
  processId?: number;
  currentStepId?: number;
  errors?: string[];
  warnings?: string[];
}

export interface StepExecutionResult {
  success: boolean;
  stepId: number;
  status: 'pending' | 'approved' | 'rejected' | 'skipped' | 'timeout';
  nextStepId?: number;
  completedAt?: string;
  errors?: string[];
}

export interface ConditionEvaluationResult {
  result: boolean;
  evaluatedConditions: Array<{
    condition: WorkflowCondition;
    result: boolean;
    reason?: string;
  }>;
}

export class WorkflowEngine {
  private context: WorkflowContext | null = null;
  private workflow: ApprovalWorkflow | null = null;
  private process: ApprovalProcess | null = null;

  /**
   * Initialize workflow execution
   */
  async initializeWorkflow(
    workflow: ApprovalWorkflow,
    context: WorkflowContext
  ): Promise<ExecutionResult> {
    try {
      this.workflow = workflow;
      this.context = context;

      // Validate workflow against context
      const validationResult = this.validateWorkflowContext();
      if (!validationResult.success) {
        return {
          success: false,
          errors: validationResult.errors
        };
      }

      // Evaluate trigger conditions
      const conditionResult = this.evaluateTriggerConditions();
      if (!conditionResult.result) {
        return {
          success: false,
          errors: ['Workflow trigger conditions not met']
        };
      }

      // Create approval process
      const process = await this.createApprovalProcess();
      this.process = process;

      // Determine first step
      const firstStep = this.determineFirstStep();
      if (!firstStep) {
        return {
          success: false,
          errors: ['No executable steps found in workflow']
        };
      }

      // Initialize first step
      const stepResult = await this.initializeStep(firstStep);
      if (!stepResult.success) {
        return {
          success: false,
          errors: stepResult.errors
        };
      }

      return {
        success: true,
        processId: process.id,
        currentStepId: firstStep.id
      };
    } catch (error) {
      console.error('Workflow initialization error:', error);
      return {
        success: false,
        errors: ['Failed to initialize workflow']
      };
    }
  }

  /**
   * Process approval decision
   */
  async processDecision(
    processId: number,
    stepId: number,
    approverId: number,
    decision: ApprovalDecision
  ): Promise<StepExecutionResult> {
    try {
      // Load process and validate
      const process = await this.loadProcess(processId);
      if (!process) {
        return {
          success: false,
          stepId,
          status: 'pending',
          errors: ['Process not found']
        };
      }

      this.process = process;
      this.workflow = process.workflow;

      // Find current step
      const currentStep = process.approvalSteps.find(step => step.stepId === stepId);
      if (!currentStep) {
        return {
          success: false,
          stepId,
          status: 'pending',
          errors: ['Step not found']
        };
      }

      // Validate approver
      const approver = currentStep.approvers.find(app => app.userId === approverId);
      if (!approver) {
        return {
          success: false,
          stepId,
          status: 'pending',
          errors: ['Approver not found for this step']
        };
      }

      // Process the decision
      const decisionResult = await this.applyDecision(currentStep, approver, decision);
      if (!decisionResult.success) {
        return decisionResult;
      }

      // Evaluate step completion
      const completionResult = await this.evaluateStepCompletion(currentStep);
      if (completionResult.success) {
        // Move to next step or complete workflow
        const nextResult = await this.progressWorkflow(currentStep);
        return nextResult;
      }

      return {
        success: true,
        stepId,
        status: 'pending'
      };
    } catch (error) {
      console.error('Decision processing error:', error);
      return {
        success: false,
        stepId,
        status: 'pending',
        errors: ['Failed to process decision']
      };
    }
  }

  /**
   * Handle step timeout
   */
  async handleStepTimeout(processId: number, stepId: number): Promise<void> {
    try {
      const process = await this.loadProcess(processId);
      if (!process) return;

      const step = process.approvalSteps.find(s => s.stepId === stepId);
      if (!step) return;

      // Execute escalation rules
      await this.executeEscalationRules(step);

      // Update step status
      step.status = 'timeout';
      step.completedAt = new Date().toISOString();

      // Progress workflow if configured to do so
      await this.progressWorkflow(step);
    } catch (error) {
      console.error('Timeout handling error:', error);
    }
  }

  /**
   * Validate workflow context
   */
  private validateWorkflowContext(): { success: boolean; errors?: string[] } {
    if (!this.workflow || !this.context) {
      return { success: false, errors: ['Missing workflow or context'] };
    }

    const errors: string[] = [];

    // Validate required context fields
    if (!this.context.entityType) {
      errors.push('Entity type is required');
    }

    if (!this.context.entityId) {
      errors.push('Entity ID is required');
    }

    if (!this.context.requestedBy) {
      errors.push('Requestor is required');
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Evaluate trigger conditions
   */
  private evaluateTriggerConditions(): ConditionEvaluationResult {
    if (!this.workflow || this.workflow.conditions.length === 0) {
      return { result: true, evaluatedConditions: [] };
    }

    const evaluatedConditions = this.workflow.conditions.map(condition => {
      const result = this.evaluateCondition(condition);
      return { condition, result };
    });

    // Apply logical operators
    let finalResult = true;
    for (let i = 0; i < evaluatedConditions.length; i++) {
      const evaluation = evaluatedConditions[i];

      if (i === 0) {
        finalResult = evaluation.result;
      } else {
        const operator = evaluation.condition.logicalOperator || 'AND';
        if (operator === 'AND') {
          finalResult = finalResult && evaluation.result;
        } else if (operator === 'OR') {
          finalResult = finalResult || evaluation.result;
        }
      }
    }

    return { result: finalResult, evaluatedConditions };
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: WorkflowCondition): boolean {
    if (!this.context) return false;

    const fieldValue = this.getFieldValue(condition.field);
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'not_equals':
        return fieldValue !== conditionValue;
      case 'greater_than':
        return Number(fieldValue) > Number(conditionValue);
      case 'less_than':
        return Number(fieldValue) < Number(conditionValue);
      case 'greater_equal':
        return Number(fieldValue) >= Number(conditionValue);
      case 'less_equal':
        return Number(fieldValue) <= Number(conditionValue);
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      case 'not_in':
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
      default:
        return false;
    }
  }

  /**
   * Get field value from context
   */
  private getFieldValue(field: string): any {
    if (!this.context) return null;

    // Check entity data first
    if (this.context.entityData && this.context.entityData[field] !== undefined) {
      return this.context.entityData[field];
    }

    // Check metadata
    if (this.context.metadata && this.context.metadata[field] !== undefined) {
      return this.context.metadata[field];
    }

    // Check direct context properties
    if ((this.context as any)[field] !== undefined) {
      return (this.context as any)[field];
    }

    return null;
  }

  /**
   * Create approval process
   */
  private async createApprovalProcess(): Promise<ApprovalProcess> {
    if (!this.workflow || !this.context) {
      throw new Error('Missing workflow or context');
    }

    // This would typically call an API to create the process
    const process: ApprovalProcess = {
      id: Date.now(), // Temporary ID
      workflowId: this.workflow.id,
      workflow: this.workflow,
      entityType: this.context.entityType as any,
      entityId: this.context.entityId,
      status: 'pending',
      approvalSteps: [],
      requestedBy: this.context.requestedBy,
      requestedAt: this.context.requestedAt,
      metadata: this.context.metadata
    };

    // Create process steps
    for (const workflowStep of this.workflow.steps) {
      const processStep = await this.createProcessStep(process.id, workflowStep);
      process.approvalSteps.push(processStep);
    }

    return process;
  }

  /**
   * Create process step from workflow step
   */
  private async createProcessStep(
    processId: number,
    workflowStep: ApprovalStep
  ): Promise<ProcessApprovalStep> {
    const processStep: ProcessApprovalStep = {
      id: Date.now() + workflowStep.id, // Temporary ID
      processId,
      stepId: workflowStep.id,
      step: workflowStep,
      status: 'pending',
      approvers: []
    };

    // Create process approvers
    for (const workflowApprover of workflowStep.approvers) {
      const processApprovers = await this.resolveApprover(processStep.id, workflowApprover);
      processStep.approvers.push(...processApprovers);
    }

    return processStep;
  }

  /**
   * Resolve approver to actual users
   */
  private async resolveApprover(
    processStepId: number,
    workflowApprover: ApprovalApprover
  ): Promise<ProcessApprover[]> {
    const processApprovers: ProcessApprover[] = [];

    switch (workflowApprover.type) {
      case 'user':
        if (workflowApprover.userId) {
          processApprovers.push({
            id: Date.now() + workflowApprover.id,
            processStepId,
            approver: workflowApprover,
            userId: workflowApprover.userId,
            status: 'pending'
          });
        }
        break;

      case 'role':
        if (workflowApprover.roleId) {
          // This would typically fetch users with the specified role
          const roleUsers = await this.getUsersByRole(workflowApprover.roleId);
          for (const user of roleUsers) {
            processApprovers.push({
              id: Date.now() + workflowApprover.id + user.id,
              processStepId,
              approver: workflowApprover,
              userId: user.id,
              status: 'pending'
            });
          }
        }
        break;

      case 'manager':
        // Resolve manager of the requestor
        if (this.context?.requestedBy) {
          const managerId = await this.getManagerId(this.context.requestedBy);
          if (managerId) {
            processApprovers.push({
              id: Date.now() + workflowApprover.id,
              processStepId,
              approver: workflowApprover,
              userId: managerId,
              status: 'pending'
            });
          }
        }
        break;

      case 'custom':
        // Execute custom logic to resolve approvers
        const customApprovers = await this.executeCustomLogic(workflowApprover.customLogic);
        for (const userId of customApprovers) {
          processApprovers.push({
            id: Date.now() + workflowApprover.id + userId,
            processStepId,
            approver: workflowApprover,
            userId,
            status: 'pending'
          });
        }
        break;
    }

    return processApprovers;
  }

  /**
   * Determine first executable step
   */
  private determineFirstStep(): ApprovalStep | null {
    if (!this.workflow) return null;

    if (this.workflow.type === 'sequential') {
      return this.workflow.steps.find(step => step.stepNumber === 1) || null;
    }

    if (this.workflow.type === 'parallel') {
      // For parallel workflows, return the first step (all will be initialized)
      return this.workflow.steps[0] || null;
    }

    if (this.workflow.type === 'conditional') {
      // Find first step whose conditions are met
      for (const step of this.workflow.steps.sort((a, b) => a.stepNumber - b.stepNumber)) {
        if (this.evaluateStepConditions(step)) {
          return step;
        }
      }
    }

    return null;
  }

  /**
   * Evaluate step conditions
   */
  private evaluateStepConditions(step: ApprovalStep): boolean {
    if (!step.conditions || step.conditions.length === 0) {
      return true;
    }

    return step.conditions.every(condition => {
      const result = this.evaluateCondition(condition as WorkflowCondition);
      return condition.skipStep ? !result : result;
    });
  }

  /**
   * Initialize step execution
   */
  private async initializeStep(step: ApprovalStep): Promise<StepExecutionResult> {
    if (!this.process) {
      return {
        success: false,
        stepId: step.id,
        status: 'pending',
        errors: ['No active process']
      };
    }

    const processStep = this.process.approvalSteps.find(ps => ps.stepId === step.id);
    if (!processStep) {
      return {
        success: false,
        stepId: step.id,
        status: 'pending',
        errors: ['Process step not found']
      };
    }

    // Set step as started
    processStep.startedAt = new Date().toISOString();

    // Set timeout if configured
    if (step.timeoutHours) {
      const timeoutDate = new Date();
      timeoutDate.setHours(timeoutDate.getHours() + step.timeoutHours);
      processStep.timeoutAt = timeoutDate.toISOString();
    }

    // Execute step actions
    await this.executeStepActions(step, 'step_start');

    // Send notifications to approvers
    await this.notifyApprovers(processStep);

    return {
      success: true,
      stepId: step.id,
      status: 'pending'
    };
  }

  /**
   * Apply approval decision
   */
  private async applyDecision(
    processStep: ProcessApprovalStep,
    processApprover: ProcessApprover,
    decision: ApprovalDecision
  ): Promise<StepExecutionResult> {
    // Update approver status
    processApprover.status = decision.action === 'approve' ? 'approved' :
                            decision.action === 'reject' ? 'rejected' :
                            decision.action === 'delegate' ? 'delegated' : 'pending';

    processApprover.decision = decision;
    processApprover.decisionAt = new Date().toISOString();
    processApprover.comments = decision.comments;

    // Handle delegation
    if (decision.action === 'delegate' && decision.delegatedTo) {
      processApprover.delegatedTo = decision.delegatedTo;
      // Create new approver for delegated user
      // This would be implemented based on specific requirements
    }

    return {
      success: true,
      stepId: processStep.stepId,
      status: processStep.status
    };
  }

  /**
   * Evaluate step completion
   */
  private async evaluateStepCompletion(processStep: ProcessApprovalStep): Promise<StepExecutionResult> {
    const step = processStep.step;
    const approvers = processStep.approvers;

    switch (step.type) {
      case 'single':
        // Single approval - any approval/rejection completes the step
        const singleDecision = approvers.find(app =>
          app.status === 'approved' || app.status === 'rejected'
        );
        if (singleDecision) {
          processStep.status = singleDecision.status === 'approved' ? 'approved' : 'rejected';
          processStep.completedAt = new Date().toISOString();
          await this.executeStepActions(step, 'step_complete');
          return { success: true, stepId: step.id, status: processStep.status };
        }
        break;

      case 'multiple':
        // Multiple approval - all required approvers must approve
        const requiredApprovers = approvers.filter(app => app.approver.isRequired);
        const requiredApproved = requiredApprovers.filter(app => app.status === 'approved');
        const anyRejected = approvers.some(app => app.status === 'rejected');

        if (anyRejected) {
          processStep.status = 'rejected';
          processStep.completedAt = new Date().toISOString();
          await this.executeStepActions(step, 'step_complete');
          return { success: true, stepId: step.id, status: 'rejected' };
        }

        if (requiredApproved.length === requiredApprovers.length) {
          processStep.status = 'approved';
          processStep.completedAt = new Date().toISOString();
          await this.executeStepActions(step, 'step_complete');
          return { success: true, stepId: step.id, status: 'approved' };
        }
        break;

      case 'consensus':
        // Consensus - weighted approval
        const totalWeight = approvers.reduce((sum, app) => sum + (app.approver.weight || 1), 0);
        const approvedWeight = approvers
          .filter(app => app.status === 'approved')
          .reduce((sum, app) => sum + (app.approver.weight || 1), 0);
        const rejectedWeight = approvers
          .filter(app => app.status === 'rejected')
          .reduce((sum, app) => sum + (app.approver.weight || 1), 0);

        const approvalThreshold = totalWeight / 2;

        if (approvedWeight > approvalThreshold) {
          processStep.status = 'approved';
          processStep.completedAt = new Date().toISOString();
          await this.executeStepActions(step, 'step_complete');
          return { success: true, stepId: step.id, status: 'approved' };
        }

        if (rejectedWeight > approvalThreshold) {
          processStep.status = 'rejected';
          processStep.completedAt = new Date().toISOString();
          await this.executeStepActions(step, 'step_complete');
          return { success: true, stepId: step.id, status: 'rejected' };
        }
        break;

      case 'any_one':
        // Any one approval completes the step
        const anyApproved = approvers.some(app => app.status === 'approved');
        const allRejected = approvers.every(app =>
          app.status === 'rejected' || app.status === 'pending'
        ) && approvers.some(app => app.status === 'rejected');

        if (anyApproved) {
          processStep.status = 'approved';
          processStep.completedAt = new Date().toISOString();
          await this.executeStepActions(step, 'step_complete');
          return { success: true, stepId: step.id, status: 'approved' };
        }

        if (allRejected) {
          processStep.status = 'rejected';
          processStep.completedAt = new Date().toISOString();
          await this.executeStepActions(step, 'step_complete');
          return { success: true, stepId: step.id, status: 'rejected' };
        }
        break;
    }

    return { success: false, stepId: step.id, status: 'pending' };
  }

  /**
   * Progress workflow to next step or completion
   */
  private async progressWorkflow(completedStep: ProcessApprovalStep): Promise<StepExecutionResult> {
    if (!this.workflow || !this.process) {
      return {
        success: false,
        stepId: completedStep.stepId,
        status: completedStep.status,
        errors: ['No active workflow or process']
      };
    }

    // Check if workflow should be rejected
    if (completedStep.status === 'rejected') {
      this.process.status = 'rejected';
      this.process.completedAt = new Date().toISOString();
      return {
        success: true,
        stepId: completedStep.stepId,
        status: 'rejected',
        completedAt: this.process.completedAt
      };
    }

    // Find next step
    const nextStep = this.findNextStep(completedStep);

    if (!nextStep) {
      // Workflow completed successfully
      this.process.status = 'approved';
      this.process.completedAt = new Date().toISOString();
      this.process.totalTimeHours = this.calculateProcessDuration();

      return {
        success: true,
        stepId: completedStep.stepId,
        status: 'approved',
        completedAt: this.process.completedAt
      };
    }

    // Initialize next step
    const nextStepResult = await this.initializeStep(nextStep);
    return {
      ...nextStepResult,
      nextStepId: nextStep.id
    };
  }

  /**
   * Find next step in workflow
   */
  private findNextStep(completedStep: ProcessApprovalStep): ApprovalStep | null {
    if (!this.workflow) return null;

    if (this.workflow.type === 'sequential') {
      const currentStepNumber = completedStep.step.stepNumber;
      return this.workflow.steps.find(step => step.stepNumber === currentStepNumber + 1) || null;
    }

    if (this.workflow.type === 'conditional') {
      // Find next executable step based on conditions
      const currentStepNumber = completedStep.step.stepNumber;
      const remainingSteps = this.workflow.steps
        .filter(step => step.stepNumber > currentStepNumber)
        .sort((a, b) => a.stepNumber - b.stepNumber);

      for (const step of remainingSteps) {
        if (this.evaluateStepConditions(step)) {
          return step;
        }
      }
    }

    // For parallel workflows, all steps start simultaneously
    return null;
  }

  /**
   * Calculate process duration
   */
  private calculateProcessDuration(): number {
    if (!this.process || !this.process.completedAt) return 0;

    const startTime = new Date(this.process.requestedAt).getTime();
    const endTime = new Date(this.process.completedAt).getTime();

    return (endTime - startTime) / (1000 * 60 * 60); // Hours
  }

  // Placeholder methods for external integrations
  private async loadProcess(processId: number): Promise<ApprovalProcess | null> {
    // This would load from API/database
    return this.process;
  }

  private async getUsersByRole(roleId: number): Promise<Array<{ id: number }>> {
    // This would fetch from user service
    return [];
  }

  private async getManagerId(userId: number): Promise<number | null> {
    // This would fetch from user service
    return null;
  }

  private async executeCustomLogic(logic?: string): Promise<number[]> {
    // This would execute custom approval logic
    return [];
  }

  private async executeStepActions(step: ApprovalStep, trigger: string): Promise<void> {
    // Execute configured actions (email, webhook, etc.)
    if (step.actions) {
      for (const action of step.actions) {
        if (action.executeOn === trigger) {
          await this.executeAction(action);
        }
      }
    }
  }

  private async executeAction(action: any): Promise<void> {
    // Execute specific action based on type
    console.log('Executing action:', action);
  }

  private async notifyApprovers(processStep: ProcessApprovalStep): Promise<void> {
    // Send notifications to approvers
    console.log('Notifying approvers for step:', processStep.stepId);
  }

  private async executeEscalationRules(processStep: ProcessApprovalStep): Promise<void> {
    // Execute escalation rules
    if (processStep.step.escalationRules) {
      for (const rule of processStep.step.escalationRules) {
        await this.executeEscalationRule(rule);
      }
    }
  }

  private async executeEscalationRule(rule: EscalationRule): Promise<void> {
    // Execute specific escalation rule
    console.log('Executing escalation rule:', rule);
  }
}

// Export singleton instance
export const workflowEngine = new WorkflowEngine();