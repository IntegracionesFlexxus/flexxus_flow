/**
 * Activity Service
 * Business logic for activity management
 */

import { injectable, inject } from 'inversify';
import { IActivityService } from '../interfaces/IActivityService';
import {
  Activity,
  ActivityCreateDTO,
  ActivityUpdateDTO,
  ActivityFilter,
  ActivityWithDetails,
  ActivityMetrics
} from '../types/activity.types';
import { PaginatedResponse } from '../types/crm.types';
import { ActivityRepository } from '../repositories/ActivityRepository';
import { TYPES } from '@/container/types';
import { AppError, ErrorCode } from '@/shared/errors/AppError';
import { EventEmitter } from 'events';

@injectable()
export class ActivityService implements IActivityService {
  constructor(
    @inject(TYPES.ActivityRepository) private activityRepository: ActivityRepository,
    @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter,
    @inject(TYPES.Logger) private logger?: any
  ) {}

  /**
   * Create a new activity
   */
  async createActivity(data: ActivityCreateDTO, userId: number): Promise<Activity> {
    try {
      // Validate at least one related entity
      if (!data.account_id && !data.contact_id && !data.opportunity_id && !data.lead_id) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Activity must be related to at least one entity', 400);
      }

      // Set default status and priority
      if (!data.status) {
        data.status = 'pending';
      }
      if (!data.priority) {
        data.priority = 'medium';
      }

      // Set reminder if due date is provided but no reminder
      if (data.due_date && !data.reminder_date) {
        const dueDate = new Date(data.due_date);
        const reminderDate = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before
        data.reminder_date = reminderDate;
      }

      // Create activity
      const activity = await this.activityRepository.create(data, userId);

      // Emit event
      this.eventEmitter.emit('activity:created', {
        activity,
        userId,
        timestamp: new Date()
      });

      // Schedule reminder if needed
      if (activity.reminder_date) {
        this.scheduleReminder(activity);
      }

      return activity;
    } catch (error) {
      this.logger?.error('Error creating activity', { error, data });
      throw error;
    }
  }

  /**
   * Update an existing activity
   */
  async updateActivity(
    id: number,
    companyId: number,
    data: ActivityUpdateDTO,
    userId: number
  ): Promise<Activity | null> {
    try {
      const existingActivity = await this.activityRepository.findById(id, String(companyId));
      if (!existingActivity) {
        return null;
      }

      // Update activity
      const updated = await this.activityRepository.update(id, String(companyId), data, userId);

      if (updated) {
        // Check for status change
        if (data.status === 'completed' && existingActivity.status !== 'completed') {
          (updated as any).completed_at = new Date();
        }

        // Reschedule reminder if date changed
        if (data.reminder_date && data.reminder_date !== existingActivity.reminder_date) {
          this.scheduleReminder(updated);
        }

        this.eventEmitter.emit('activity:updated', {
          activity: updated,
          changes: data,
          userId,
          timestamp: new Date()
        });
      }

      return updated;
    } catch (error) {
      this.logger?.error('Error updating activity', { error, id, data });
      throw error;
    }
  }

  /**
   * Get activity by ID
   */
  async getActivityById(id: number, companyId: number): Promise<ActivityWithDetails | null> {
    try {
      return await this.activityRepository.getActivityWithDetails(id, companyId);
    } catch (error) {
      this.logger?.error('Error getting activity', { error, id, companyId });
      throw error;
    }
  }

  /**
   * List activities with filters
   */
  async listActivities(
    companyId: number,
    filters?: ActivityFilter
  ): Promise<PaginatedResponse<ActivityWithDetails>> {
    try {
      const [activities, total] = await Promise.all([
        this.activityRepository.findWithFilters(companyId, filters || {}),
        this.activityRepository.countWithFilters(companyId, filters || {})
      ]);

      const enrichedActivities = await Promise.all(
        activities.map(activity => this.activityRepository.getActivityWithDetails(activity.id!, companyId))
      );

      return {
        data: enrichedActivities.filter(activity => activity !== null) as ActivityWithDetails[],
        total,
        page: filters?.page || 1,
        limit: filters?.limit || 20,
        totalPages: Math.ceil(total / (filters?.limit || 20))
      };
    } catch (error) {
      this.logger?.error('Error listing activities', { error, companyId, filters });
      throw error;
    }
  }

  /**
   * Get overdue activities
   */
  async getOverdueActivities(companyId: number, assignedTo?: number): Promise<Activity[]> {
    try {
      const activities = await this.activityRepository.getOverdueActivities(companyId, assignedTo);

      // Send notifications for overdue activities
      if (activities.length > 0) {
        this.eventEmitter.emit('activities:overdue', {
          activities,
          assignedTo,
          timestamp: new Date()
        });
      }

      return activities;
    } catch (error) {
      this.logger?.error('Error getting overdue activities', { error, companyId, assignedTo });
      throw error;
    }
  }

  /**
   * Get activities with reminders
   */
  async getActivitiesWithReminders(companyId: number): Promise<Activity[]> {
    try {
      const activities = await this.activityRepository.getActivitiesWithReminders(companyId);

      // Trigger reminders
      for (const activity of activities) {
        this.eventEmitter.emit('activity:reminder', {
          activity,
          timestamp: new Date()
        });
      }

      return activities;
    } catch (error) {
      this.logger?.error('Error getting activities with reminders', { error, companyId });
      throw error;
    }
  }

  /**
   * Complete activity
   */
  async completeActivity(
    activityId: number,
    companyId: number,
    outcome: string,
    userId: number
  ): Promise<Activity> {
    try {
      const activity = await this.activityRepository.findById(activityId, String(companyId));
      if (!activity) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Activity not found', 404);
      }

      if (activity.status === 'completed') {
        throw new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, 'Activity is already completed', 400);
      }

      const result = await this.activityRepository.completeActivity(
        activityId,
        companyId,
        outcome,
        userId
      );

      if (result) {
        this.eventEmitter.emit('activity:completed', {
          activityId,
          outcome,
          userId,
          timestamp: new Date()
        });

        // Check if follow-up is required
        if (activity.follow_up_required) {
          await this.createFollowUpActivity(activity, userId);
        }
      }

      const updatedActivity = await this.activityRepository.findById(activityId, String(companyId));
      return updatedActivity!;
    } catch (error) {
      this.logger?.error('Error completing activity', { error, activityId, outcome });
      throw error;
    }
  }

  /**
   * Reschedule activity
   */
  async rescheduleActivity(
    activityId: number,
    companyId: number,
    newDueDate: Date,
    newReminderDate?: Date,
    userId: number
  ): Promise<Activity> {
    try {
      const activity = await this.activityRepository.findById(activityId, String(companyId));
      if (!activity) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Activity not found', 404);
      }

      if (activity.status === 'completed') {
        throw new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, 'Cannot reschedule completed activity', 400);
      }

      const result = await this.activityRepository.rescheduleActivity(
        activityId,
        companyId,
        newDueDate,
        newReminderDate,
        userId
      );

      if (result) {
        this.eventEmitter.emit('activity:rescheduled', {
          activityId,
          oldDueDate: activity.due_date,
          newDueDate,
          userId,
          timestamp: new Date()
        });

        // Reschedule reminder
        if (newReminderDate) {
          this.scheduleReminder({ ...activity, reminder_date: newReminderDate });
        }
      }

      const updatedActivity = await this.activityRepository.findById(activityId, String(companyId));
      return updatedActivity!;
    } catch (error) {
      this.logger?.error('Error rescheduling activity', { error, activityId, newDueDate });
      throw error;
    }
  }

  /**
   * Get activity metrics
   */
  async getActivityMetrics(companyId: number, dateRange?: { start: Date; end: Date }): Promise<ActivityMetrics> {
    try {
      return await this.activityRepository.getActivityMetrics(companyId, dateRange);
    } catch (error) {
      this.logger?.error('Error getting activity metrics', { error, companyId, dateRange });
      throw error;
    }
  }

  /**
   * Bulk update activities status
   */
  async bulkUpdateStatus(
    activityIds: number[],
    companyId: number,
    status: string,
    userId: number
  ): Promise<number> {
    try {
      if (activityIds.length === 0) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'No activities provided', 400);
      }

      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid status', 400);
      }

      const updatedCount = await this.activityRepository.bulkUpdateStatus(
        activityIds,
        companyId,
        status,
        userId
      );

      if (updatedCount > 0) {
        this.eventEmitter.emit('activities:bulk:updated', {
          activityIds,
          status,
          updatedCount,
          userId,
          timestamp: new Date()
        });
      }

      return updatedCount;
    } catch (error) {
      this.logger?.error('Error bulk updating activities', { error, activityIds, status });
      throw error;
    }
  }

  /**
   * Get entity timeline
   */
  async getEntityTimeline(
    companyId: number,
    entityType: 'account' | 'contact' | 'opportunity' | 'lead',
    entityId: number
  ): Promise<Activity[]> {
    try {
      return await this.activityRepository.getEntityTimeline(companyId, entityType, entityId);
    } catch (error) {
      this.logger?.error('Error getting entity timeline', { error, companyId, entityType, entityId });
      throw error;
    }
  }

  /**
   * Delete activity
   */
  async deleteActivity(activityId: number, companyId: number, userId: number): Promise<boolean> {
    try {
      const activity = await this.activityRepository.findById(activityId, String(companyId));
      if (!activity) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Activity not found', 404);
      }

      const deleted = await this.activityRepository.delete(activityId, String(companyId));

      if (deleted) {
        this.eventEmitter.emit('activity:deleted', {
          activityId,
          userId,
          timestamp: new Date()
        });
      }

      return deleted;
    } catch (error) {
      this.logger?.error('Error deleting activity', { error, activityId, companyId });
      throw error;
    }
  }

  /**
   * Get user activities
   */
  async getUserActivities(companyId: number, userId: number, filters?: ActivityFilter): Promise<Activity[]> {
    try {
      const userFilters = {
        ...filters,
        assigned_to: userId
      };

      return await this.activityRepository.findWithFilters(companyId, userFilters);
    } catch (error) {
      this.logger?.error('Error getting user activities', { error, companyId, userId, filters });
      throw error;
    }
  }

  /**
   * Create follow-up activity
   */
  private async createFollowUpActivity(originalActivity: Activity, userId: number): Promise<void> {
    const followUpData: ActivityCreateDTO = {
      company_id: originalActivity.company_id,
      type: originalActivity.type,
      subject: `Follow-up: ${originalActivity.subject}`,
      description: `Follow-up required for: ${originalActivity.subject}`,
      status: 'pending',
      priority: 'medium',
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      account_id: originalActivity.account_id,
      contact_id: originalActivity.contact_id,
      opportunity_id: originalActivity.opportunity_id,
      lead_id: originalActivity.lead_id,
      assigned_to: originalActivity.assigned_to
    };

    await this.createActivity(followUpData, userId);
  }

  /**
   * Schedule reminder
   */
  private scheduleReminder(activity: Activity): void {
    // In a real implementation, this would schedule a job or notification
    // For now, just log
    this.logger?.info('Reminder scheduled', {
      activityId: activity.id,
      reminderDate: activity.reminder_date
    });
  }
}