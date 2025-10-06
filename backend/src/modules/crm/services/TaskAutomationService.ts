/**
 * Task Automation Service - Sprint 21
 * Handles automated task creation, workflows, and rule execution
 */

import { injectable, inject } from 'inversify';
import { EventEmitter } from 'events';
import { CronJob } from 'cron';
import { TYPES } from '@/container/types';
import { AppError, ErrorCode } from '@/shared/errors/AppError';
import { Logger } from 'winston';
import { Activity, ActivityCreateDTO } from '../types/activity.types';
import { ActivityService } from './ActivityService';
import { NotificationService } from '@/shared/services/NotificationService';

// Automation Types
export interface AutomationRule {
  id: number;
  company_id: number;
  name: string;
  description?: string;
  is_active: boolean;
  trigger_type: TriggerType;
  trigger_conditions: TriggerConditions;
  action_type: ActionType;
  action_config: ActionConfig;
  execution_delay_minutes?: number;
  max_executions_per_day?: number;
  times_triggered: number;
  last_triggered_at?: Date;
  created_at: Date;
  updated_at: Date;
  created_by: number;
}

export type TriggerType =
  | 'activity_created'
  | 'activity_completed'
  | 'activity_overdue'
  | 'opportunity_stage_change'
  | 'lead_status_change'
  | 'time_based'
  | 'recurring_schedule';

export type ActionType =
  | 'create_activity'
  | 'update_activity'
  | 'send_notification'
  | 'assign_to_user'
  | 'create_follow_up'
  | 'update_field'
  | 'execute_webhook';

export interface TriggerConditions {
  // For activity triggers
  activity_type?: string;
  activity_status?: string;
  activity_priority?: string;
  assigned_to?: number;

  // For entity triggers
  entity_type?: string;
  entity_id?: number;
  field_name?: string;
  old_value?: any;
  new_value?: any;

  // For time-based triggers
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time?: string; // HH:MM format
    days_of_week?: number[]; // 0-6, Sunday-Saturday
    day_of_month?: number;
  };

  // Advanced conditions
  conditions?: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  }>;
}

export interface ActionConfig {
  // For create_activity action
  activity_template?: {
    type: string;
    subject: string;
    description?: string;
    priority?: string;
    duration_minutes?: number;
    due_in_days?: number;
    assign_to?: 'same_user' | 'specific_user' | 'round_robin' | 'manager';
    specific_user_id?: number;
  };

  // For send_notification
  notification?: {
    type: 'email' | 'sms' | 'push' | 'in_app';
    recipients: Array<'assigned_user' | 'manager' | 'team' | 'specific_users'>;
    specific_user_ids?: number[];
    template_id?: string;
    subject?: string;
    message?: string;
    variables?: Record<string, string>;
  };

  // For update_field
  field_updates?: Array<{
    field_name: string;
    value: any;
    operation?: 'set' | 'increment' | 'append';
  }>;

  // For webhook
  webhook?: {
    url: string;
    method: 'GET' | 'POST' | 'PUT';
    headers?: Record<string, string>;
    payload?: any;
  };
}

export interface RecurringTask {
  id: number;
  activity_id: number;
  pattern: RecurrencePattern;
  next_occurrence: Date;
  occurrences_created: number;
  is_active: boolean;
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number;
  week_days?: number[]; // For weekly recurrence
  month_day?: number; // For monthly recurrence
  end_type: 'never' | 'after' | 'on_date';
  end_after?: number; // Number of occurrences
  end_date?: Date;
  exception_dates?: Date[];
}

export interface AutomationExecutionLog {
  id: number;
  rule_id: number;
  trigger_event: string;
  trigger_data: any;
  action_taken: string;
  action_result: any;
  status: 'success' | 'failed' | 'skipped';
  error_message?: string;
  executed_at: Date;
}

@injectable()
export class TaskAutomationService {
  private automationJobs: Map<number, CronJob> = new Map();
  private executionCounters: Map<number, { count: number; date: string }> = new Map();

  constructor(
    @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter,
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.ActivityService) private activityService: ActivityService,
    @inject(TYPES.TaskAutomationRepository) private automationRepository: any,
    @inject(TYPES.ActivityTemplateRepository) private templateRepository: any,
    @inject(TYPES.CRMDatabaseConnection) private db: any
  ) {
    // Note: NotificationService will be injected when available
    this.initializeAutomation();
  }

  /**
   * Initialize automation system
   */
  private async initializeAutomation(): Promise<void> {
    // Set up event listeners
    this.setupEventListeners();

    // Load and schedule time-based rules
    await this.loadTimeBasedRules();

    // Start recurring task processor
    this.startRecurringTaskProcessor();

    this.logger.info('Task automation service initialized');
  }

  /**
   * Setup event listeners for triggers
   */
  private setupEventListeners(): void {
    // Activity events
    this.eventEmitter.on('activity:created', this.handleActivityCreated.bind(this));
    this.eventEmitter.on('activity:completed', this.handleActivityCompleted.bind(this));
    this.eventEmitter.on('activity:overdue', this.handleActivityOverdue.bind(this));

    // Entity change events
    this.eventEmitter.on('opportunity:stage:changed', this.handleOpportunityStageChange.bind(this));
    this.eventEmitter.on('lead:status:changed', this.handleLeadStatusChange.bind(this));

    // Custom events
    this.eventEmitter.on('automation:trigger', this.handleCustomTrigger.bind(this));
  }

  /**
   * Create automation rule
   */
  async createAutomationRule(rule: Partial<AutomationRule>): Promise<AutomationRule> {
    try {
      const query = `
        INSERT INTO task_automation_rules (
          company_id, name, description, is_active,
          trigger_type, trigger_conditions, action_type, action_config,
          execution_delay_minutes, max_executions_per_day, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const result = await this.db.query(query, [
        rule.company_id,
        rule.name,
        rule.description,
        rule.is_active !== false,
        rule.trigger_type,
        JSON.stringify(rule.trigger_conditions),
        rule.action_type,
        JSON.stringify(rule.action_config),
        rule.execution_delay_minutes || 0,
        rule.max_executions_per_day,
        rule.created_by
      ]);

      const createdRule = result.rows[0];

      // Schedule if time-based
      if (createdRule.trigger_type === 'time_based' && createdRule.is_active) {
        this.scheduleTimeBasedRule(createdRule);
      }

      this.logger.info('Automation rule created', { ruleId: createdRule.id });

      return createdRule;
    } catch (error) {
      this.logger.error('Failed to create automation rule', { error, rule });
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create automation rule', 500);
    }
  }

  /**
   * Update automation rule
   */
  async updateAutomationRule(
    ruleId: number,
    updates: Partial<AutomationRule>
  ): Promise<AutomationRule> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id') {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(
            typeof value === 'object' && value !== null
              ? JSON.stringify(value)
              : value
          );
          paramCount++;
        }
      });

      values.push(ruleId);

      const query = `
        UPDATE task_automation_rules
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await this.db.query(query, values);
      const updatedRule = result.rows[0];

      // Update scheduled job if time-based
      if (updatedRule.trigger_type === 'time_based') {
        this.updateScheduledRule(updatedRule);
      }

      return updatedRule;
    } catch (error) {
      this.logger.error('Failed to update automation rule', { error, ruleId, updates });
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to update automation rule', 500);
    }
  }

  /**
   * Delete automation rule
   */
  async deleteAutomationRule(ruleId: number): Promise<boolean> {
    try {
      // Cancel scheduled job if exists
      const job = this.automationJobs.get(ruleId);
      if (job) {
        job.stop();
        this.automationJobs.delete(ruleId);
      }

      const query = 'DELETE FROM task_automation_rules WHERE id = $1';
      const result = await this.db.query(query, [ruleId]);

      return result.rowCount > 0;
    } catch (error) {
      this.logger.error('Failed to delete automation rule', { error, ruleId });
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to delete automation rule', 500);
    }
  }

  /**
   * Get automation rules
   */
  async getAutomationRules(companyId: number, filters?: any): Promise<AutomationRule[]> {
    try {
      let query = 'SELECT * FROM task_automation_rules WHERE company_id = $1';
      const params: any[] = [companyId];

      if (filters?.is_active !== undefined) {
        query += ' AND is_active = $2';
        params.push(filters.is_active);
      }

      if (filters?.trigger_type) {
        query += ` AND trigger_type = $${params.length + 1}`;
        params.push(filters.trigger_type);
      }

      query += ' ORDER BY created_at DESC';

      const result = await this.db.query(query, params);

      return result.rows.map((row: any) => ({
        ...row,
        trigger_conditions: row.trigger_conditions,
        action_config: row.action_config
      }));
    } catch (error) {
      this.logger.error('Failed to get automation rules', { error, companyId, filters });
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to get automation rules', 500);
    }
  }

  /**
   * Execute automation rule
   */
  async executeAutomationRule(
    ruleId: number,
    triggerData: any
  ): Promise<AutomationExecutionLog> {
    try {
      // Get rule details
      const rule = await this.getAutomationRule(ruleId);
      if (!rule || !rule.is_active) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Rule not found or inactive', 404);
      }

      // Check execution limits
      if (!this.checkExecutionLimit(rule)) {
        return this.logExecution(rule, triggerData, 'skipped', null, 'Execution limit reached');
      }

      // Apply execution delay if configured
      if (rule.execution_delay_minutes > 0) {
        setTimeout(() => {
          this.executeAction(rule, triggerData);
        }, rule.execution_delay_minutes * 60 * 1000);

        return this.logExecution(rule, triggerData, 'scheduled', null,
          `Scheduled for execution in ${rule.execution_delay_minutes} minutes`);
      }

      // Execute action immediately
      const result = await this.executeAction(rule, triggerData);

      return this.logExecution(rule, triggerData, 'success', result);
    } catch (error: any) {
      this.logger.error('Failed to execute automation rule', { error, ruleId, triggerData });
      return this.logExecution({ id: ruleId } as AutomationRule, triggerData, 'failed', null, error.message);
    }
  }

  /**
   * Create recurring task
   */
  async createRecurringTask(
    activityId: number,
    pattern: RecurrencePattern
  ): Promise<RecurringTask> {
    try {
      const query = `
        INSERT INTO activity_recurrence_patterns (
          activity_id, frequency, interval_value,
          week_days, month_day, end_type, end_after_occurrences, end_on_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await this.db.query(query, [
        activityId,
        pattern.frequency,
        pattern.interval,
        pattern.week_days,
        pattern.month_day,
        pattern.end_type,
        pattern.end_after,
        pattern.end_date
      ]);

      // Update activity as recurring
      await this.db.query(
        'UPDATE activities SET is_recurring = true WHERE id = $1',
        [activityId]
      );

      // Calculate next occurrence
      const nextOccurrence = this.calculateNextOccurrence(new Date(), pattern);

      await this.db.query(
        'UPDATE activity_recurrence_patterns SET next_occurrence_date = $1 WHERE id = $2',
        [nextOccurrence, result.rows[0].id]
      );

      return {
        id: result.rows[0].id,
        activity_id: activityId,
        pattern,
        next_occurrence: nextOccurrence,
        occurrences_created: 0,
        is_active: true
      };
    } catch (error) {
      this.logger.error('Failed to create recurring task', { error, activityId, pattern });
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create recurring task', 500);
    }
  }

  /**
   * Process recurring tasks
   */
  async processRecurringTasks(): Promise<void> {
    try {
      // Get recurring tasks due for creation
      const query = `
        SELECT
          arp.*,
          a.*
        FROM activity_recurrence_patterns arp
        JOIN activities a ON arp.activity_id = a.id
        WHERE arp.next_occurrence_date <= NOW()
        AND a.is_recurring = true
        AND a.status != 'cancelled'
      `;

      const result = await this.db.query(query);

      for (const record of result.rows) {
        await this.createRecurringOccurrence(record);
      }
    } catch (error) {
      this.logger.error('Failed to process recurring tasks', { error });
    }
  }

  /**
   * Get automation execution logs
   */
  async getExecutionLogs(
    ruleId?: number,
    limit: number = 100
  ): Promise<AutomationExecutionLog[]> {
    try {
      let query = 'SELECT * FROM automation_execution_logs';
      const params: any[] = [];

      if (ruleId) {
        query += ' WHERE rule_id = $1';
        params.push(ruleId);
      }

      query += ' ORDER BY executed_at DESC LIMIT $' + (params.length + 1);
      params.push(limit);

      const result = await this.db.query(query, params);

      return result.rows.map((row: any) => ({
        ...row,
        trigger_data: row.trigger_data,
        action_result: row.action_result
      }));
    } catch (error) {
      this.logger.error('Failed to get execution logs', { error, ruleId, limit });
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to get execution logs', 500);
    }
  }

  // Event Handlers

  private async handleActivityCreated(data: any): Promise<void> {
    await this.processRulesForTrigger('activity_created', data);
  }

  private async handleActivityCompleted(data: any): Promise<void> {
    await this.processRulesForTrigger('activity_completed', data);

    // Check if follow-up is required
    if (data.activity?.follow_up_required) {
      await this.createFollowUpActivity(data.activity, data.userId);
    }
  }

  private async handleActivityOverdue(data: any): Promise<void> {
    await this.processRulesForTrigger('activity_overdue', data);
  }

  private async handleOpportunityStageChange(data: any): Promise<void> {
    await this.processRulesForTrigger('opportunity_stage_change', data);
  }

  private async handleLeadStatusChange(data: any): Promise<void> {
    await this.processRulesForTrigger('lead_status_change', data);
  }

  private async handleCustomTrigger(data: any): Promise<void> {
    if (data.ruleId) {
      await this.executeAutomationRule(data.ruleId, data.triggerData);
    }
  }

  // Private Helper Methods

  private async getAutomationRule(ruleId: number): Promise<AutomationRule | null> {
    const query = 'SELECT * FROM task_automation_rules WHERE id = $1';
    const result = await this.db.query(query, [ruleId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      trigger_conditions: row.trigger_conditions,
      action_config: row.action_config
    };
  }

  private async processRulesForTrigger(
    triggerType: TriggerType,
    triggerData: any
  ): Promise<void> {
    try {
      // Get active rules for this trigger type
      const rules = await this.getAutomationRules(triggerData.companyId || 1, {
        is_active: true,
        trigger_type: triggerType
      });

      for (const rule of rules) {
        // Check if conditions match
        if (this.evaluateTriggerConditions(rule.trigger_conditions, triggerData)) {
          await this.executeAutomationRule(rule.id, triggerData);
        }
      }
    } catch (error) {
      this.logger.error('Failed to process rules for trigger', { error, triggerType, triggerData });
    }
  }

  private evaluateTriggerConditions(
    conditions: TriggerConditions,
    data: any
  ): boolean {
    // Check basic conditions
    if (conditions.activity_type && data.activity?.type !== conditions.activity_type) {
      return false;
    }

    if (conditions.activity_status && data.activity?.status !== conditions.activity_status) {
      return false;
    }

    if (conditions.activity_priority && data.activity?.priority !== conditions.activity_priority) {
      return false;
    }

    // Check advanced conditions
    if (conditions.conditions && conditions.conditions.length > 0) {
      for (const condition of conditions.conditions) {
        const fieldValue = this.getNestedValue(data, condition.field);

        if (!this.evaluateCondition(fieldValue, condition.operator, condition.value)) {
          return false;
        }
      }
    }

    return true;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private evaluateCondition(fieldValue: any, operator: string, conditionValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'not_equals':
        return fieldValue !== conditionValue;
      case 'contains':
        return String(fieldValue).includes(String(conditionValue));
      case 'greater_than':
        return fieldValue > conditionValue;
      case 'less_than':
        return fieldValue < conditionValue;
      default:
        return false;
    }
  }

  private checkExecutionLimit(rule: AutomationRule): boolean {
    if (!rule.max_executions_per_day) {
      return true;
    }

    const today = new Date().toDateString();
    const counter = this.executionCounters.get(rule.id);

    if (!counter || counter.date !== today) {
      this.executionCounters.set(rule.id, { count: 0, date: today });
      return true;
    }

    return counter.count < rule.max_executions_per_day;
  }

  private async executeAction(
    rule: AutomationRule,
    triggerData: any
  ): Promise<any> {
    switch (rule.action_type) {
      case 'create_activity':
        return this.executeCreateActivity(rule.action_config, triggerData);

      case 'send_notification':
        return this.executeSendNotification(rule.action_config, triggerData);

      case 'update_field':
        return this.executeUpdateField(rule.action_config, triggerData);

      case 'execute_webhook':
        return this.executeWebhook(rule.action_config, triggerData);

      case 'create_follow_up':
        return this.executeCreateFollowUp(rule.action_config, triggerData);

      case 'assign_to_user':
        return this.executeAssignToUser(rule.action_config, triggerData);

      default:
        throw new AppError(ErrorCode.INVALID_INPUT, `Unsupported action type: ${rule.action_type}`, 400);
    }
  }

  private async executeCreateActivity(
    config: ActionConfig,
    triggerData: any
  ): Promise<any> {
    if (!config.activity_template) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Activity template not configured', 400);
    }

    const template = config.activity_template;

    // Calculate due date
    const dueDate = new Date();
    if (template.due_in_days) {
      dueDate.setDate(dueDate.getDate() + template.due_in_days);
    }

    // Determine assignee
    let assignedTo = triggerData.userId;
    if (template.assign_to === 'specific_user' && template.specific_user_id) {
      assignedTo = template.specific_user_id;
    }

    const activityData: ActivityCreateDTO = {
      company_id: triggerData.companyId || 1,
      type: template.type as any,
      subject: this.replaceVariables(template.subject, triggerData),
      description: template.description ? this.replaceVariables(template.description, triggerData) : undefined,
      priority: template.priority as any,
      due_date: dueDate,
      duration_minutes: template.duration_minutes,
      assigned_to: assignedTo,
      account_id: triggerData.activity?.account_id,
      contact_id: triggerData.activity?.contact_id,
      opportunity_id: triggerData.activity?.opportunity_id,
      lead_id: triggerData.activity?.lead_id,
      is_automated: true
    };

    return this.activityService.createActivity(activityData, assignedTo);
  }

  private async executeSendNotification(
    config: ActionConfig,
    triggerData: any
  ): Promise<any> {
    if (!config.notification) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Notification config not provided', 400);
    }

    const notification = config.notification;
    const recipients = await this.resolveRecipients(notification.recipients, notification.specific_user_ids, triggerData);

    const message = this.replaceVariables(notification.message || '', triggerData);
    const subject = this.replaceVariables(notification.subject || '', triggerData);

    // TODO: Implement when NotificationService is available
    // return this.notificationService.send({
    //   type: notification.type,
    //   recipients,
    //   subject,
    //   message,
    this.logger.info(`Notification would be sent to ${recipients.length} recipients: ${subject}`);
    return {
      data: triggerData
    };
  }

  private async executeUpdateField(
    config: ActionConfig,
    triggerData: any
  ): Promise<any> {
    if (!config.field_updates || config.field_updates.length === 0) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Field updates not configured', 400);
    }

    const results = [];

    for (const update of config.field_updates) {
      // Determine entity and ID from trigger data
      const entityType = triggerData.entityType || 'activity';
      const entityId = triggerData.entityId || triggerData.activity?.id;

      if (!entityId) {
        continue;
      }

      // Update the field
      const query = `
        UPDATE ${entityType}s
        SET ${update.field_name} = $1, updated_at = NOW()
        WHERE id = $2
      `;

      const value = this.calculateFieldValue(update, triggerData);
      await this.db.query(query, [value, entityId]);

      results.push({ field: update.field_name, value });
    }

    return results;
  }

  private async executeWebhook(
    config: ActionConfig,
    triggerData: any
  ): Promise<any> {
    if (!config.webhook) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Webhook config not provided', 400);
    }

    const webhook = config.webhook;
    const axios = require('axios');

    try {
      const response = await axios({
        method: webhook.method,
        url: webhook.url,
        headers: webhook.headers,
        data: webhook.payload || triggerData
      });

      return {
        status: response.status,
        data: response.data
      };
    } catch (error: any) {
      throw new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, `Webhook failed: ${error.message}`, 500);
    }
  }

  private async executeCreateFollowUp(
    config: ActionConfig,
    triggerData: any
  ): Promise<any> {
    // Similar to create activity but specifically for follow-ups
    const followUpData: ActivityCreateDTO = {
      company_id: triggerData.companyId || 1,
      type: 'task',
      subject: `Follow-up: ${triggerData.activity?.subject || 'Previous Activity'}`,
      description: `This is a follow-up to the previous activity`,
      priority: 'medium',
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      assigned_to: triggerData.activity?.assigned_to || triggerData.userId,
      parent_activity_id: triggerData.activity?.id,
      is_automated: true
    };

    return this.activityService.createActivity(followUpData, triggerData.userId);
  }

  private async executeAssignToUser(
    config: ActionConfig,
    triggerData: any
  ): Promise<any> {
    const activityId = triggerData.activity?.id;
    if (!activityId) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'No activity to assign', 400);
    }

    // Determine new assignee (could implement round-robin, load balancing, etc.)
    const newAssignee = config.activity_template?.specific_user_id || triggerData.userId;

    await this.db.query(
      'UPDATE activities SET assigned_to = $1, updated_at = NOW() WHERE id = $2',
      [newAssignee, activityId]
    );

    return { activity_id: activityId, assigned_to: newAssignee };
  }

  private async createFollowUpActivity(
    originalActivity: Activity,
    userId: number
  ): Promise<Activity> {
    const followUpData: ActivityCreateDTO = {
      company_id: originalActivity.company_id,
      type: 'task',
      subject: `Follow-up: ${originalActivity.subject}`,
      description: `Follow-up required for: ${originalActivity.subject}\n\nOriginal outcome: ${originalActivity.outcome || 'N/A'}`,
      priority: originalActivity.priority || 'medium',
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      assigned_to: originalActivity.assigned_to,
      account_id: originalActivity.account_id,
      contact_id: originalActivity.contact_id,
      opportunity_id: originalActivity.opportunity_id,
      lead_id: originalActivity.lead_id,
      parent_activity_id: originalActivity.id
    };

    const followUp = await this.activityService.createActivity(followUpData, userId);

    // Update original activity with follow-up reference
    await this.db.query(
      'UPDATE activities SET follow_up_activity_id = $1 WHERE id = $2',
      [followUp.id, originalActivity.id]
    );

    return followUp;
  }

  private replaceVariables(template: string, data: any): string {
    return template.replace(/\{([^}]+)\}/g, (match, path) => {
      return this.getNestedValue(data, path) || match;
    });
  }

  private async resolveRecipients(
    recipientTypes: string[],
    specificUserIds: number[] | undefined,
    triggerData: any
  ): Promise<number[]> {
    const recipients: Set<number> = new Set();

    for (const type of recipientTypes) {
      switch (type) {
        case 'assigned_user':
          if (triggerData.activity?.assigned_to) {
            recipients.add(triggerData.activity.assigned_to);
          }
          break;

        case 'specific_users':
          if (specificUserIds) {
            specificUserIds.forEach(id => recipients.add(id));
          }
          break;

        // Add more recipient resolution logic as needed
      }
    }

    return Array.from(recipients);
  }

  private calculateFieldValue(update: any, triggerData: any): any {
    if (update.operation === 'increment') {
      // Would need to fetch current value first
      return update.value;
    }

    return this.replaceVariables(String(update.value), triggerData);
  }

  private async logExecution(
    rule: AutomationRule,
    triggerData: any,
    status: 'success' | 'failed' | 'skipped' | 'scheduled',
    result: any,
    errorMessage?: string
  ): Promise<AutomationExecutionLog> {
    const log = {
      rule_id: rule.id,
      trigger_event: rule.trigger_type,
      trigger_data: triggerData,
      action_taken: rule.action_type || 'unknown',
      action_result: result,
      status,
      error_message: errorMessage,
      executed_at: new Date()
    };

    // Store in database (implement as needed)
    // await this.db.query(...);

    // Update execution counter
    if (status === 'success') {
      const counter = this.executionCounters.get(rule.id);
      if (counter) {
        counter.count++;
      }

      // Update last triggered timestamp
      await this.db.query(
        'UPDATE task_automation_rules SET times_triggered = times_triggered + 1, last_triggered_at = NOW() WHERE id = $1',
        [rule.id]
      );
    }

    return log as AutomationExecutionLog;
  }

  private async loadTimeBasedRules(): Promise<void> {
    try {
      const query = `
        SELECT * FROM task_automation_rules
        WHERE trigger_type = 'time_based'
        AND is_active = true
      `;

      const result = await this.db.query(query);

      for (const rule of result.rows) {
        this.scheduleTimeBasedRule(rule);
      }
    } catch (error) {
      this.logger.error('Failed to load time-based rules', { error });
    }
  }

  private scheduleTimeBasedRule(rule: AutomationRule): void {
    try {
      // Cancel existing job if any
      const existingJob = this.automationJobs.get(rule.id);
      if (existingJob) {
        existingJob.stop();
      }

      const schedule = rule.trigger_conditions.schedule;
      if (!schedule) {
        return;
      }

      // Build cron pattern
      let cronPattern = '';

      if (schedule.frequency === 'daily') {
        const [hour, minute] = (schedule.time || '09:00').split(':');
        cronPattern = `${minute} ${hour} * * *`;
      } else if (schedule.frequency === 'weekly') {
        const [hour, minute] = (schedule.time || '09:00').split(':');
        const days = schedule.days_of_week?.join(',') || '1';
        cronPattern = `${minute} ${hour} * * ${days}`;
      } else if (schedule.frequency === 'monthly') {
        const [hour, minute] = (schedule.time || '09:00').split(':');
        const dayOfMonth = schedule.day_of_month || 1;
        cronPattern = `${minute} ${hour} ${dayOfMonth} * *`;
      }

      if (cronPattern) {
        const job = new CronJob(cronPattern, async () => {
          await this.executeAutomationRule(rule.id, {
            trigger: 'scheduled',
            timestamp: new Date()
          });
        });

        job.start();
        this.automationJobs.set(rule.id, job);

        this.logger.info('Scheduled time-based rule', { ruleId: rule.id, cronPattern });
      }
    } catch (error) {
      this.logger.error('Failed to schedule time-based rule', { error, rule });
    }
  }

  private updateScheduledRule(rule: AutomationRule): void {
    if (rule.is_active) {
      this.scheduleTimeBasedRule(rule);
    } else {
      const job = this.automationJobs.get(rule.id);
      if (job) {
        job.stop();
        this.automationJobs.delete(rule.id);
      }
    }
  }

  private startRecurringTaskProcessor(): void {
    // Process recurring tasks every hour
    const job = new CronJob('0 * * * *', async () => {
      await this.processRecurringTasks();
    });

    job.start();

    this.logger.info('Recurring task processor started');
  }

  private calculateNextOccurrence(
    currentDate: Date,
    pattern: RecurrencePattern
  ): Date {
    const next = new Date(currentDate);

    switch (pattern.frequency) {
      case 'daily':
        next.setDate(next.getDate() + pattern.interval);
        break;

      case 'weekly':
        next.setDate(next.getDate() + (pattern.interval * 7));
        break;

      case 'monthly':
        next.setMonth(next.getMonth() + pattern.interval);
        if (pattern.month_day) {
          next.setDate(pattern.month_day);
        }
        break;

      case 'yearly':
        next.setFullYear(next.getFullYear() + pattern.interval);
        break;
    }

    // Check end conditions
    if (pattern.end_type === 'on_date' && pattern.end_date && next > pattern.end_date) {
      return new Date(0); // No more occurrences
    }

    return next;
  }

  private async createRecurringOccurrence(record: any): Promise<void> {
    try {
      const pattern: RecurrencePattern = {
        frequency: record.frequency,
        interval: record.interval_value,
        week_days: record.week_days,
        month_day: record.month_day,
        end_type: record.end_type,
        end_after: record.end_after_occurrences,
        end_date: record.end_on_date
      };

      // Check end conditions
      if (pattern.end_type === 'after' && record.occurrences_created >= pattern.end_after!) {
        // Deactivate recurrence
        await this.db.query(
          'UPDATE activities SET is_recurring = false WHERE id = $1',
          [record.activity_id]
        );
        return;
      }

      // Create new occurrence
      const newActivity: ActivityCreateDTO = {
        company_id: record.company_id,
        type: record.type,
        subject: record.subject,
        description: record.description,
        priority: record.priority,
        due_date: record.next_occurrence_date,
        start_time: record.next_occurrence_date,
        assigned_to: record.assigned_to,
        account_id: record.account_id,
        contact_id: record.contact_id,
        opportunity_id: record.opportunity_id,
        lead_id: record.lead_id,
        recurrence_parent_id: record.activity_id
      };

      await this.activityService.createActivity(newActivity, record.assigned_to);

      // Calculate and update next occurrence
      const nextDate = this.calculateNextOccurrence(new Date(record.next_occurrence_date), pattern);

      await this.db.query(
        `UPDATE activity_recurrence_patterns
         SET next_occurrence_date = $1, occurrences_created = occurrences_created + 1
         WHERE id = $2`,
        [nextDate, record.id]
      );
    } catch (error) {
      this.logger.error('Failed to create recurring occurrence', { error, record });
    }
  }
}

export default TaskAutomationService;