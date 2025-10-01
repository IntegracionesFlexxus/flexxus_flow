/**
 * Rule Interfaces - Sprint 07
 * Core interfaces for the business rules engine
 */

export interface ICondition {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex' | 'in' | 'between' | 'greater_than' | 'less_than' | 'not_equals' | 'exists' | 'not_exists';
  value: any;
  case_sensitive?: boolean;
  data_type?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
}

export interface IAction {
  type: 'send_message' | 'assign_agent' | 'add_tag' | 'remove_tag' | 'change_priority' | 'trigger_webhook' | 'update_customer' | 'create_crm_lead' | 'execute_flow' | 'wait' | 'conditional';
  params: any;
  delay_ms?: number;
  condition?: ICondition;
}

export interface IRule {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  type: 'keyword' | 'schedule' | 'customer_attribute' | 'conversation_state' | 'composite' | 'event_based';
  conditions: ICondition[];
  condition_operator?: 'AND' | 'OR';
  actions: IAction[];
  priority: number;
  is_active: boolean;
  execution_count?: number;
  last_executed_at?: Date;
  metadata?: any;
  created_at?: Date;
  updated_at?: Date;
}

export interface IRuleEvaluationContext {
  company_id: string;
  conversation?: any;
  message?: any;
  customer?: any;
  agent?: any;
  channel?: any;
  variables?: Map<string, any>;
  timestamp: Date;
}

export interface IRuleEvaluationResult {
  rule_id: string;
  matched: boolean;
  conditions_evaluated: number;
  conditions_matched: number;
  actions_to_execute: IAction[];
  evaluation_time_ms: number;
  error?: string;
}

export interface IRuleExecutionResult {
  rule_id: string;
  success: boolean;
  actions_executed: number;
  actions_succeeded: number;
  actions_failed: number;
  execution_time_ms: number;
  results: Array<{
    action: IAction;
    success: boolean;
    result?: any;
    error?: string;
  }>;
}