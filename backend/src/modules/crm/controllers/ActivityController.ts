/**
 * Activity Controller
 * HTTP endpoints for activity management
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { IActivityService } from '../interfaces/IActivityService';
import { TYPES } from '@/container/types';
import { AppError, ErrorCode } from '@/shared/errors/AppError';

@injectable()
export class ActivityController {
  constructor(
    @inject(TYPES.ActivityService) private activityService: IActivityService,
    @inject(TYPES.Logger) private logger?: any
  ) {}

  /**
   * Create a new activity
   * POST /api/crm/activities
   */
  async createActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;

      const activityData = {
        ...req.body,
        company_id: companyId
      };

      const activity = await this.activityService.createActivity(activityData, userId);

      res.status(201).json({
        success: true,
        data: activity,
        message: 'Activity created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all activities with filters
   * GET /api/crm/activities
   */
  async getActivities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const filters = {
        ...req.query,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      const result = await this.activityService.listActivities(companyId, filters);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get activity by ID
   * GET /api/crm/activities/:id
   */
  async getActivityById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const activityId = parseInt(req.params.id);

      const activity = await this.activityService.getActivityById(activityId, companyId);

      if (!activity) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Activity not found', 404);
      }

      res.json({
        success: true,
        data: activity
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update activity
   * PUT /api/crm/activities/:id
   */
  async updateActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const activityId = parseInt(req.params.id);

      const activity = await this.activityService.updateActivity(
        activityId,
        companyId,
        req.body,
        userId
      );

      if (!activity) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Activity not found', 404);
      }

      res.json({
        success: true,
        data: activity,
        message: 'Activity updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete activity
   * DELETE /api/crm/activities/:id
   */
  async deleteActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const activityId = parseInt(req.params.id);

      const deleted = await this.activityService.deleteActivity(activityId, companyId, userId);

      if (!deleted) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Activity not found', 404);
      }

      res.json({
        success: true,
        message: 'Activity deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get overdue activities
   * GET /api/crm/activities/overdue
   */
  async getOverdueActivities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const assignedTo = req.query.assignedTo ? parseInt(req.query.assignedTo as string) : undefined;

      const activities = await this.activityService.getOverdueActivities(companyId, assignedTo);

      res.json({
        success: true,
        data: activities
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get activities with reminders
   * GET /api/crm/activities/reminders
   */
  async getActivitiesWithReminders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;

      const activities = await this.activityService.getActivitiesWithReminders(companyId);

      res.json({
        success: true,
        data: activities
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete activity
   * POST /api/crm/activities/:id/complete
   */
  async completeActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const activityId = parseInt(req.params.id);
      const { outcome } = req.body;

      const activity = await this.activityService.completeActivity(
        activityId,
        companyId,
        outcome,
        userId
      );

      res.json({
        success: true,
        data: activity,
        message: 'Activity completed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reschedule activity
   * POST /api/crm/activities/:id/reschedule
   */
  async rescheduleActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const activityId = parseInt(req.params.id);
      const { due_date, reminder_date } = req.body;

      const activity = await this.activityService.rescheduleActivity(
        activityId,
        companyId,
        new Date(due_date),
        reminder_date ? new Date(reminder_date) : undefined,
        userId
      );

      res.json({
        success: true,
        data: activity,
        message: 'Activity rescheduled successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get activity metrics
   * GET /api/crm/activities/metrics
   */
  async getActivityMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const { startDate, endDate } = req.query;

      const dateRange = startDate && endDate
        ? { start: new Date(startDate as string), end: new Date(endDate as string) }
        : undefined;

      const metrics = await this.activityService.getActivityMetrics(companyId, dateRange);

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk update activities status
   * POST /api/crm/activities/bulk/status
   */
  async bulkUpdateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const { activityIds, status } = req.body;

      if (!activityIds || !Array.isArray(activityIds) || activityIds.length === 0) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Activity IDs are required', 400);
      }

      if (!status) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Status is required', 400);
      }

      const updatedCount = await this.activityService.bulkUpdateStatus(
        activityIds,
        companyId,
        status,
        userId
      );

      res.json({
        success: true,
        data: { updatedCount },
        message: `${updatedCount} activities updated successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get entity timeline
   * GET /api/crm/activities/timeline/:entityType/:entityId
   */
  async getEntityTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const entityType = req.params.entityType as 'account' | 'contact' | 'opportunity' | 'lead';
      const entityId = parseInt(req.params.entityId);

      const validEntityTypes = ['account', 'contact', 'opportunity', 'lead'];
      if (!validEntityTypes.includes(entityType)) {
        throw new AppError(ErrorCode.INVALID_INPUT, 'Invalid entity type', 400);
      }

      const activities = await this.activityService.getEntityTimeline(
        companyId,
        entityType,
        entityId
      );

      res.json({
        success: true,
        data: activities
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user activities
   * GET /api/crm/activities/user/:userId
   */
  async getUserActivities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = parseInt(req.params.userId);

      const activities = await this.activityService.getUserActivities(companyId, userId);

      res.json({
        success: true,
        data: activities
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my activities
   * GET /api/crm/activities/my
   */
  async getMyActivities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;

      const activities = await this.activityService.getUserActivities(companyId, userId);

      res.json({
        success: true,
        data: activities
      });
    } catch (error) {
      next(error);
    }
  }
}