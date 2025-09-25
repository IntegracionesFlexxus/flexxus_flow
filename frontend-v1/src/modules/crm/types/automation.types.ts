export interface AutomationRule {
  id: number;
  name: string;
  description?: string;
  triggerType: 'status_change' | 'field_update' | 'time_based' | 'record_created' | 'custom';
  triggerConditions: Record<string, any>;
  actionType: 'create_task' | 'send_email' | 'update_field' | 'create_activity' | 'custom';
  actionConfig: Record<string, any>;
  isActive: boolean;
  priority: number;
  schedule?: string; // Cron expression for time-based triggers
  lastExecutedAt?: Date;
  executionCount: number;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationExecution {
  id: number;
  ruleId: number;
  ruleName: string;
  executedAt: Date;
  status: 'success' | 'failure' | 'pending';
  triggerData?: Record<string, any>;
  resultData?: Record<string, any>;
  errorMessage?: string;
  duration?: number;
}

export interface AutomationTrigger {
  type: string;
  label: string;
  description: string;
  requiredFields: string[];
  supportedEntities: string[];
}

export interface AutomationAction {
  type: string;
  label: string;
  description: string;
  requiredFields: string[];
  configSchema?: Record<string, any>;
}