/**
 * Activity Service Interface
 */

import {
  Activity,
  ActivityCreateDTO,
  ActivityUpdateDTO,
  ActivityFilter,
  ActivityWithDetails,
  ActivityMetrics
} from '../types/activity.types';
import { PaginatedResponse } from '../types/crm.types';

export interface IActivityService {
  /**
   * Create a new activity
   */
  createActivity(data: ActivityCreateDTO, userId: number): Promise<Activity>;

  /**
   * Update an existing activity
   */
  updateActivity(
    id: number,
    companyId: number,
    data: ActivityUpdateDTO,
    userId: number
  ): Promise<Activity | null>;

  /**
   * Get activity by ID
   */
  getActivityById(id: number, companyId: number): Promise<ActivityWithDetails | null>;

  /**
   * List activities with filters
   */
  listActivities(
    companyId: number,
    filters?: ActivityFilter
  ): Promise<PaginatedResponse<ActivityWithDetails>>;

  /**
   * Get overdue activities
   */
  getOverdueActivities(companyId: number, assignedTo?: number): Promise<Activity[]>;

  /**
   * Get activities with reminders
   */
  getActivitiesWithReminders(companyId: number): Promise<Activity[]>;

  /**
   * Complete activity
   */
  completeActivity(
    activityId: number,
    companyId: number,
    outcome: string,
    userId: number
  ): Promise<Activity>;

  /**
   * Reschedule activity
   */
  rescheduleActivity(
    activityId: number,
    companyId: number,
    newDueDate: Date,
    newReminderDate?: Date,
    userId: number
  ): Promise<Activity>;

  /**
   * Get activity metrics
   */
  getActivityMetrics(companyId: number, dateRange?: { start: Date; end: Date }): Promise<ActivityMetrics>;

  /**
   * Bulk update activities status
   */
  bulkUpdateStatus(
    activityIds: number[],
    companyId: number,
    status: string,
    userId: number
  ): Promise<number>;

  /**
   * Get entity timeline
   */
  getEntityTimeline(
    companyId: number,
    entityType: 'account' | 'contact' | 'opportunity' | 'lead',
    entityId: number
  ): Promise<Activity[]>;

  /**
   * Delete activity
   */
  deleteActivity(activityId: number, companyId: number, userId: number): Promise<boolean>;

  /**
   * Get user activities
   */
  getUserActivities(companyId: number, userId: number, filters?: ActivityFilter): Promise<Activity[]>;
}