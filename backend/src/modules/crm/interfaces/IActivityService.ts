/**
 * Activity Service Interface
 */

// TODO: Create missing types file
// import {
//   Activity,
//   ActivityCreateDTO,
//   ActivityUpdateDTO,
//   ActivityFilter,
//   ActivityWithDetails,
//   ActivityMetrics
// } from '../types/activity.types';
import { PaginatedResponse } from '../types/crm.types';

export interface IActivityService {
  /**
   * Create a new activity
   */
  createActivity(data: any, userId: number): Promise<any>;

  /**
   * Update an existing activity
   */
  updateActivity(
    id: number,
    companyId: number,
    data: any,
    userId: number
  ): Promise<any | null>;

  /**
   * Get activity by ID
   */
  getActivityById(id: number, companyId: number): Promise<any | null>;

  /**
   * List activities with filters
   */
  listActivities(
    companyId: number,
    filters?: any
  ): Promise<PaginatedResponse<any>>;

  /**
   * Get overdue activities
   */
  getOverdueActivities(companyId: number, assignedTo?: number): Promise<any[]>;

  /**
   * Get activities with reminders
   */
  getActivitiesWithReminders(companyId: number): Promise<any[]>;

  /**
   * Complete activity
   */
  completeActivity(
    activityId: number,
    companyId: number,
    outcome: string,
    userId: number
  ): Promise<any>;

  /**
   * Reschedule activity
   */
  rescheduleActivity(
    activityId: number,
    companyId: number,
    newDueDate: Date,
    newReminderDate?: Date,
    userId: number
  ): Promise<any>;

  /**
   * Get activity metrics
   */
  getActivityMetrics(companyId: number, dateRange?: { start: Date; end: Date }): Promise<any>;

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
  ): Promise<any[]>;

  /**
   * Delete activity
   */
  deleteActivity(activityId: number, companyId: number, userId: number): Promise<boolean>;

  /**
   * Get user activities
   */
  getUserActivities(companyId: number, userId: number, filters?: any): Promise<any[]>;
}