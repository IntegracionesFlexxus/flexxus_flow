/**
 * Action Executor - Sprint 07
 * Executes rule actions based on evaluation results
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IAction, IRuleEvaluationContext, IRuleExecutionResult } from './interfaces/IRule';
import { MessageService, ConversationService, CustomerService } from '../services';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

@injectable()
export class ActionExecutor {
  private logger: any;

  constructor(
    @inject(TYPES.OmniMessageService) private messageService: MessageService,
    @inject(TYPES.OmniConversationService) private conversationService: ConversationService,
    @inject(TYPES.OmniCustomerService) private customerService: CustomerService
  ) {
    this.logger = LoggerFactory.create({ file: __filename });
  }

  /**
   * Execute a list of actions
   */
  async executeActions(actions: IAction[], context: IRuleEvaluationContext): Promise<IRuleExecutionResult> {
    const startTime = Date.now();
    const results: any[] = [];
    let actionsExecuted = 0;
    let actionsSucceeded = 0;
    let actionsFailed = 0;

    for (const action of actions) {
      try {
        // Apply delay if specified
        if (action.delay_ms && action.delay_ms > 0) {
          await this.delay(action.delay_ms);
        }

        // Check conditional execution
        if (action.condition && !(await this.evaluateActionCondition(action.condition, context))) {
          results.push({
            action,
            success: false,
            result: 'skipped',
            error: 'Condition not met'
          });
          continue;
        }

        actionsExecuted++;

        // Execute action based on type
        const result = await this.executeAction(action, context);

        results.push({
          action,
          success: true,
          result
        });

        actionsSucceeded++;
      } catch (error: any) {
        this.logger.error('Failed to execute action', {
          actionType: action.type,
          error: error.message
        });

        results.push({
          action,
          success: false,
          error: error.message
        });

        actionsFailed++;
      }
    }

    return {
      rule_id: '', // Will be set by RuleEngine
      success: actionsFailed === 0,
      actions_executed: actionsExecuted,
      actions_succeeded: actionsSucceeded,
      actions_failed: actionsFailed,
      execution_time_ms: Date.now() - startTime,
      results
    };
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: IAction, context: IRuleEvaluationContext): Promise<any> {
    this.logger.debug('Executing action', {
      type: action.type,
      params: action.params
    });

    switch (action.type) {
      case 'send_message':
        return await this.executeSendMessage(action.params, context);

      case 'assign_agent':
        return await this.executeAssignAgent(action.params, context);

      case 'add_tag':
        return await this.executeAddTag(action.params, context);

      case 'remove_tag':
        return await this.executeRemoveTag(action.params, context);

      case 'change_priority':
        return await this.executeChangePriority(action.params, context);

      case 'trigger_webhook':
        return await this.executeTriggerWebhook(action.params, context);

      case 'update_customer':
        return await this.executeUpdateCustomer(action.params, context);

      case 'create_crm_lead':
        return await this.executeCreateCRMLead(action.params, context);

      case 'execute_flow':
        return await this.executeFlow(action.params, context);

      case 'wait':
        return await this.executeWait(action.params, context);

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Send a message
   */
  private async executeSendMessage(params: any, context: IRuleEvaluationContext): Promise<any> {
    const { template_id, content, content_type = 'text', channel_id } = params;

    const messageData = {
      company_id: context.company_id,
      conversation_id: context.conversation?.id,
      channel_id: channel_id || context.conversation?.channel_id,
      direction: 'outbound' as const,
      sender_type: 'system' as const,
      sender_id: 'automation',
      recipient_identifier: context.customer?.phone_number || context.customer?.email,
      content: content || '',
      content_type,
      template_id,
      metadata: {
        automated: true,
        rule_triggered: true
      }
    };

    const message = await this.messageService.sendMessage(messageData, context.company_id);
    return { messageId: message.id };
  }

  /**
   * Assign conversation to agent
   */
  private async executeAssignAgent(params: any, context: IRuleEvaluationContext): Promise<any> {
    const { agent_id, reason = 'Automated assignment' } = params;

    if (!context.conversation?.id) {
      throw new Error('No conversation in context for assignment');
    }

    const result = await this.conversationService.assignToAgent(
      context.conversation.id,
      {
        assigned_to: agent_id,
        assignment_reason: reason
      },
      context.company_id
    );

    return { conversationId: result.id, assignedTo: agent_id };
  }

  /**
   * Add tag to conversation or customer
   */
  private async executeAddTag(params: any, context: IRuleEvaluationContext): Promise<any> {
    const { tag, target = 'conversation' } = params;

    if (target === 'conversation' && context.conversation) {
      const currentTags = context.conversation.tags || [];
      if (!currentTags.includes(tag)) {
        currentTags.push(tag);
        await this.conversationService.updateConversation(
          context.conversation.id,
          { tags: currentTags },
          context.company_id
        );
      }
      return { target: 'conversation', tag };
    }

    if (target === 'customer' && context.customer) {
      const currentTags = context.customer.tags || [];
      if (!currentTags.includes(tag)) {
        currentTags.push(tag);
        await this.customerService.updateCustomer(
          context.customer.id,
          { tags: currentTags },
          context.company_id
        );
      }
      return { target: 'customer', tag };
    }

    throw new Error(`Cannot add tag: no ${target} in context`);
  }

  /**
   * Remove tag from conversation or customer
   */
  private async executeRemoveTag(params: any, context: IRuleEvaluationContext): Promise<any> {
    const { tag, target = 'conversation' } = params;

    if (target === 'conversation' && context.conversation) {
      const currentTags = context.conversation.tags || [];
      const newTags = currentTags.filter((t: string) => t !== tag);
      await this.conversationService.updateConversation(
        context.conversation.id,
        { tags: newTags },
        context.company_id
      );
      return { target: 'conversation', tag };
    }

    if (target === 'customer' && context.customer) {
      const currentTags = context.customer.tags || [];
      const newTags = currentTags.filter((t: string) => t !== tag);
      await this.customerService.updateCustomer(
        context.customer.id,
        { tags: newTags },
        context.company_id
      );
      return { target: 'customer', tag };
    }

    throw new Error(`Cannot remove tag: no ${target} in context`);
  }

  /**
   * Change conversation priority
   */
  private async executeChangePriority(params: any, context: IRuleEvaluationContext): Promise<any> {
    const { priority } = params;

    if (!context.conversation?.id) {
      throw new Error('No conversation in context for priority change');
    }

    await this.conversationService.updateConversation(
      context.conversation.id,
      { priority },
      context.company_id
    );

    return { conversationId: context.conversation.id, priority };
  }

  /**
   * Trigger webhook
   */
  private async executeTriggerWebhook(params: any, context: IRuleEvaluationContext): Promise<any> {
    const { url, method = 'POST', headers = {}, body_template } = params;

    // Process body template with context variables
    let body = body_template;
    if (typeof body_template === 'string') {
      body = this.processTemplate(body_template, context);
    }

    // Mock webhook execution for now
    this.logger.info('Webhook triggered', {
      url,
      method,
      headers,
      body
    });

    // In production, use axios or fetch to make actual HTTP request
    return { url, method, status: 'triggered' };
  }

  /**
   * Update customer information
   */
  private async executeUpdateCustomer(params: any, context: IRuleEvaluationContext): Promise<any> {
    if (!context.customer?.id) {
      throw new Error('No customer in context for update');
    }

    const updates = this.processTemplateObject(params.updates, context);

    await this.customerService.updateCustomer(
      context.customer.id,
      updates,
      context.company_id
    );

    return { customerId: context.customer.id, updates };
  }

  /**
   * Create CRM lead
   */
  private async executeCreateCRMLead(params: any, context: IRuleEvaluationContext): Promise<any> {
    // This would integrate with CRM module
    // For now, mock the creation
    const leadData = {
      source: 'omnichannel_automation',
      customer_id: context.customer?.id,
      conversation_id: context.conversation?.id,
      ...params
    };

    this.logger.info('CRM lead creation triggered', leadData);

    return { leadId: 'mock-lead-id', data: leadData };
  }

  /**
   * Execute a flow
   */
  private async executeFlow(params: any, context: IRuleEvaluationContext): Promise<any> {
    const { flow_id, variables = {} } = params;

    // This would trigger flow execution
    // Implementation will be in FlowEngine
    this.logger.info('Flow execution triggered', {
      flowId: flow_id,
      variables
    });

    return { flowId: flow_id, status: 'triggered' };
  }

  /**
   * Wait for specified duration
   */
  private async executeWait(params: any, context: IRuleEvaluationContext): Promise<any> {
    const { duration_ms } = params;
    await this.delay(duration_ms);
    return { waited: duration_ms };
  }

  /**
   * Evaluate action condition
   */
  private async evaluateActionCondition(condition: any, context: IRuleEvaluationContext): Promise<boolean> {
    // Simple condition evaluation for actions
    // Could reuse RuleEvaluator for complex conditions
    return true;
  }

  /**
   * Process template string with context variables
   */
  private processTemplate(template: string, context: IRuleEvaluationContext): string {
    let processed = template;

    // Replace context variables
    processed = processed.replace(/\{\{customer\.(\w+)\}\}/g, (match, field) => {
      return context.customer?.[field] || match;
    });

    processed = processed.replace(/\{\{conversation\.(\w+)\}\}/g, (match, field) => {
      return context.conversation?.[field] || match;
    });

    processed = processed.replace(/\{\{message\.(\w+)\}\}/g, (match, field) => {
      return context.message?.[field] || match;
    });

    // Replace custom variables
    if (context.variables) {
      context.variables.forEach((value, key) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        processed = processed.replace(regex, value);
      });
    }

    return processed;
  }

  /**
   * Process template object with context variables
   */
  private processTemplateObject(obj: any, context: IRuleEvaluationContext): any {
    if (typeof obj === 'string') {
      return this.processTemplate(obj, context);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.processTemplateObject(item, context));
    }

    if (typeof obj === 'object' && obj !== null) {
      const processed: any = {};
      for (const [key, value] of Object.entries(obj)) {
        processed[key] = this.processTemplateObject(value, context);
      }
      return processed;
    }

    return obj;
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}