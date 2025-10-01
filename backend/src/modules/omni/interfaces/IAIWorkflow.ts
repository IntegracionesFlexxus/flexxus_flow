/**
 * AI Workflow Interfaces - Sprint 12
 */

import {
  WorkflowStatus,
  WorkflowExecutionResult,
  DecisionRuleType,
  TriggerCondition,
  DecisionNode,
  WorkflowAction,
  DecisionTreePath,
  DecisionRuleCondition,
  DecisionRuleAction
} from '../types/workflow-ai.types';

export interface IAIWorkflow {
  id: string;
  tenant_id: string;
  workflow_name: string;
  description?: string;
  trigger_conditions: TriggerCondition;
  decision_tree: DecisionNode;
  actions: WorkflowAction[];
  ml_models_used?: string[];
  status: WorkflowStatus;
  execution_count: number;
  success_rate?: number;
  avg_execution_time_ms?: number;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAIWorkflowDTO {
  workflow_name: string;
  description?: string;
  trigger_conditions: TriggerCondition;
  decision_tree: DecisionNode;
  actions: WorkflowAction[];
  ml_models_used?: string[];
}

export interface UpdateAIWorkflowDTO {
  workflow_name?: string;
  description?: string;
  trigger_conditions?: TriggerCondition;
  decision_tree?: DecisionNode;
  actions?: WorkflowAction[];
  ml_models_used?: string[];
  status?: WorkflowStatus;
}

export interface IWorkflowExecution {
  id: string;
  workflow_id: string;
  trigger_data: Record<string, any>;
  execution_path: DecisionTreePath[];
  decisions_made: Record<string, any>;
  actions_taken: Record<string, any>;
  execution_result: WorkflowExecutionResult;
  execution_time_ms?: number;
  error_details?: string;
  tenant_id: string;
  started_at: Date;
  completed_at?: Date;
}

export interface IDecisionRule {
  id: string;
  tenant_id: string;
  rule_name: string;
  rule_type: DecisionRuleType;
  conditions: DecisionRuleCondition;
  ml_model_id?: string;
  confidence_threshold: number;
  actions: DecisionRuleAction[];
  priority: number;
  is_active: boolean;
  execution_count: number;
  success_rate?: number;
  created_at: Date;
  updated_at: Date;
}
