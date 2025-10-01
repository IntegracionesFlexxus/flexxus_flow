/**
 * AI Workflow Types - Sprint 12
 * Type definitions for intelligent automation workflows
 */

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  DEPRECATED = 'deprecated'
}

export enum WorkflowExecutionResult {
  SUCCESS = 'success',
  PARTIAL_SUCCESS = 'partial_success',
  FAILED = 'failed',
  TIMEOUT = 'timeout'
}

export enum DecisionRuleType {
  RULE_BASED = 'rule_based',
  ML_BASED = 'ml_based',
  HYBRID = 'hybrid',
  HEURISTIC = 'heuristic'
}

export interface TriggerCondition {
  event_type: string;
  conditions: ConditionExpression[];
  frequency?: 'once' | 'always' | 'throttled';
  throttle_seconds?: number;
}

export interface ConditionExpression {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'matches';
  value: any;
  logical_operator?: 'and' | 'or';
}

export interface DecisionNode {
  id: string;
  type: 'condition' | 'ml_prediction' | 'action' | 'parallel' | 'sequential';
  name: string;
  config: Record<string, any>;
  next_on_true?: string;
  next_on_false?: string;
  next?: string | string[];
  children?: DecisionNode[];
}

export interface WorkflowAction {
  id: string;
  action_type: string;
  action_config: Record<string, any>;
  retry_on_failure?: boolean;
  max_retries?: number;
  timeout_seconds?: number;
}

export interface DecisionTreePath {
  node_id: string;
  node_name: string;
  decision: boolean | string;
  execution_time_ms: number;
  output?: any;
}

export interface WorkflowExecutionContext {
  workflow_id: string;
  execution_id: string;
  trigger_data: Record<string, any>;
  variables: Record<string, any>;
  current_node?: string;
  start_time: Date;
}

export interface DecisionRuleCondition {
  conditions: ConditionExpression[];
  ml_model_id?: string;
  confidence_threshold?: number;
  fallback_action?: string;
}

export interface DecisionRuleAction {
  action_type: string;
  action_params: Record<string, any>;
  execute_async?: boolean;
  priority?: number;
}
