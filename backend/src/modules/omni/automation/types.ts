/**
 * Auto Response Types - Sprint 07
 * Shared types for auto-response functionality
 */

export interface IAutoResponse {
  id: string;
  company_id: string;
  name: string;
  channel_type?: string;
  trigger_type: 'keyword' | 'welcome' | 'away' | 'schedule' | 'timeout';
  triggers: ITrigger[];
  response_template_id?: string;
  response_content?: string;
  response_type?: string;
  delay_ms?: number;
  max_uses_per_conversation?: number;
  cooldown_minutes?: number;
  is_active: boolean;
  use_count?: number;
  last_used_at?: Date;
  metadata?: any;
}

export interface ITrigger {
  type: 'keyword' | 'time' | 'event' | 'condition';
  value: any;
  options?: {
    case_sensitive?: boolean;
    exact_match?: boolean;
    regex?: boolean;
  };
}
