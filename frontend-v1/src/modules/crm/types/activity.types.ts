/**
 * Activity Types - Sprint 15
 * Multi-tenant activity management types
 */

export interface Activity {
  id: number;
  company_id: number;

  // Basic Information
  type: ActivityType;
  subject: string;
  description?: string;

  // Dates
  due_date: string;
  completed_at?: string;
  reminder_date?: string;

  // Status
  status: ActivityStatus;
  priority?: ActivityPriority;

  // Relationships
  entity_type?: EntityType;
  entity_id?: number;
  lead_id?: number;
  account_id?: number;
  contact_id?: number;
  opportunity_id?: number;

  // Assignment
  assigned_to: number;
  assigned_user?: UserInfo;

  // Result
  outcome?: string;
  duration_minutes?: number;

  // Location/Contact
  location?: string;
  call_result?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

export type ActivityType =
  | 'call'
  | 'email'
  | 'meeting'
  | 'task'
  | 'note'
  | 'other';

export type ActivityStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'deferred';

export type ActivityPriority =
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent';

export type EntityType =
  | 'lead'
  | 'account'
  | 'contact'
  | 'opportunity';

export interface ActivityFormData extends Partial<Omit<Activity, 'id' | 'company_id' | 'created_at' | 'updated_at'>> {}

export interface ActivityFilters {
  type?: ActivityType;
  status?: ActivityStatus;
  priority?: ActivityPriority;
  assigned_to?: number;
  entity_type?: EntityType;
  entity_id?: number;
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ActivityMetrics {
  total: number;
  by_type: Record<ActivityType, number>;
  by_status: Record<ActivityStatus, number>;
  overdue_count: number;
  completed_today: number;
  pending_today: number;
  avg_completion_time: number;
}

export interface UserInfo {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

export interface ActivityTimeline {
  date: string;
  activities: Activity[];
}