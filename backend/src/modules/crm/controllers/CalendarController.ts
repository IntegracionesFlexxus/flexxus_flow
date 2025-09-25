import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { CalendarIntegrationService } from '../services/CalendarIntegrationService';
import { TaskAutomationService } from '../services/TaskAutomationService';
import { ActivityService } from '../services/ActivityService';
import { BaseController } from '@/core/base/BaseController';
import { validateRequest } from '@/shared/middleware/validateRequest';
import { body, param, query } from 'express-validator';
import { Logger } from 'winston';

@injectable()
export class CalendarController extends BaseController {
  private calendarService: CalendarIntegrationService;
  private automationService: TaskAutomationService;
  private activityService: ActivityService;

  constructor(
    @inject(TYPES.CalendarIntegrationService) calendarService: CalendarIntegrationService,
    @inject(TYPES.TaskAutomationService) automationService: TaskAutomationService,
    @inject(TYPES.ActivityService) activityService: ActivityService,
    @inject(TYPES.Logger) logger: Logger
  ) {
    super(logger);
    this.calendarService = calendarService;
    this.automationService = automationService;
    this.activityService = activityService;
  }

  /**
   * Initialize OAuth flow for calendar provider
   */
  public initializeOAuth = [
    query('provider').isIn(['google', 'outlook']).withMessage('Invalid calendar provider'),
    query('redirect_uri').optional().isURL(),
    validateRequest,
    async (req: Request, res: Response) => {
      try {
        const { provider, redirect_uri } = req.query;
        const userId = req.user?.id;
        const companyId = req.user?.companyId;

        if (!userId || !companyId) {
          return this.unauthorized(res, 'User authentication required');
        }

        const authUrl = await this.calendarService.initializeOAuth(
          provider as 'google' | 'outlook',
          userId,
          redirect_uri as string
        );

        return this.success(res, { authUrl }, 'OAuth initialization successful');
      } catch (error) {
        this.logger?.error('Error initializing OAuth:', error);
        return this.error(res, 'Failed to initialize OAuth');
      }
    }
  ];

  /**
   * Handle OAuth callback
   */
  public handleOAuthCallback = [
    query('code').notEmpty().withMessage('Authorization code is required'),
    query('state').notEmpty().withMessage('State parameter is required'),
    validateRequest,
    async (req: Request, res: Response) => {
      try {
        const { code, state } = req.query;
        const userId = req.user?.id;

        if (!userId) {
          return this.unauthorized(res, 'User authentication required');
        }

        const integration = await this.calendarService.handleOAuthCallback(
          code as string,
          state as string,
          userId
        );

        return this.success(res, integration, 'Calendar connected successfully');
      } catch (error) {
        this.logger?.error('Error handling OAuth callback:', error);
        return this.error(res, 'Failed to connect calendar');
      }
    }
  ];

  /**
   * Get user's calendar integrations
   */
  public getIntegrations = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const companyId = req.user?.companyId;

      if (!userId || !companyId) {
        return this.unauthorized(res, 'User authentication required');
      }

      const integrations = await this.calendarService.getIntegrations(userId, companyId);

      return this.success(res, integrations, 'Calendar integrations retrieved');
    } catch (error) {
      this.logger?.error('Error fetching calendar integrations:', error);
      return this.error(res, 'Failed to fetch calendar integrations');
    }
  };

  /**
   * Disconnect calendar integration
   */
  public disconnectIntegration = [
    param('integrationId').isNumeric().withMessage('Invalid integration ID'),
    validateRequest,
    async (req: Request, res: Response) => {
      try {
        const { integrationId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
          return this.unauthorized(res, 'User authentication required');
        }

        await this.calendarService.disconnectIntegration(parseInt(integrationId), userId);

        return this.success(res, null, 'Calendar disconnected successfully');
      } catch (error) {
        this.logger?.error('Error disconnecting calendar:', error);
        return this.error(res, 'Failed to disconnect calendar');
      }
    }
  ];

  /**
   * Sync calendar with external provider
   */
  public syncCalendar = [
    param('integrationId').isNumeric().withMessage('Invalid integration ID'),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    validateRequest,
    async (req: Request, res: Response) => {
      try {
        const { integrationId } = req.params;
        const { startDate, endDate } = req.body;
        const userId = req.user?.id;
        const companyId = req.user?.companyId;

        if (!userId || !companyId) {
          return this.unauthorized(res, 'User authentication required');
        }

        const syncResult = await this.calendarService.syncCalendar(
          parseInt(integrationId),
          userId,
          companyId,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );

        return this.success(res, syncResult, 'Calendar sync completed');
      } catch (error) {
        this.logger?.error('Error syncing calendar:', error);
        return this.error(res, 'Failed to sync calendar');
      }
    }
  ];

  /**
   * Get available time slots
   */
  public getAvailableSlots = [
    query('startDate').isISO8601().withMessage('Valid start date required'),
    query('endDate').isISO8601().withMessage('Valid end date required'),
    query('duration').isInt({ min: 15 }).withMessage('Duration must be at least 15 minutes'),
    query('userIds').optional().isString(),
    validateRequest,
    async (req: Request, res: Response) => {
      try {
        const { startDate, endDate, duration, userIds } = req.query;
        const companyId = req.user?.companyId;

        if (!companyId) {
          return this.unauthorized(res, 'User authentication required');
        }

        const users = userIds ? (userIds as string).split(',') : [req.user?.id];

        const availableSlots = await this.calendarService.getAvailableSlots(
          users,
          new Date(startDate as string),
          new Date(endDate as string),
          parseInt(duration as string),
          companyId
        );

        return this.success(res, availableSlots, 'Available slots retrieved');
      } catch (error) {
        this.logger?.error('Error getting available slots:', error);
        return this.error(res, 'Failed to get available slots');
      }
    }
  ];

  /**
   * Create external calendar event
   */
  public createExternalEvent = [
    param('integrationId').isNumeric().withMessage('Invalid integration ID'),
    body('title').notEmpty().withMessage('Title is required'),
    body('startTime').isISO8601().withMessage('Valid start time required'),
    body('endTime').isISO8601().withMessage('Valid end time required'),
    body('description').optional().isString(),
    body('location').optional().isString(),
    body('attendees').optional().isArray(),
    body('sendInvites').optional().isBoolean(),
    validateRequest,
    async (req: Request, res: Response) => {
      try {
        const { integrationId } = req.params;
        const eventData = req.body;
        const userId = req.user?.id;

        if (!userId) {
          return this.unauthorized(res, 'User authentication required');
        }

        const externalEvent = await this.calendarService.createExternalEvent(
          parseInt(integrationId),
          userId,
          eventData
        );

        return this.success(res, externalEvent, 'External event created');
      } catch (error) {
        this.logger?.error('Error creating external event:', error);
        return this.error(res, 'Failed to create external event');
      }
    }
  ];

  /**
   * Update external calendar event
   */
  public updateExternalEvent = [
    param('integrationId').isNumeric().withMessage('Invalid integration ID'),
    param('eventId').notEmpty().withMessage('Event ID is required'),
    body('title').optional().isString(),
    body('startTime').optional().isISO8601(),
    body('endTime').optional().isISO8601(),
    body('description').optional().isString(),
    body('location').optional().isString(),
    body('attendees').optional().isArray(),
    validateRequest,
    async (req: Request, res: Response) => {
      try {
        const { integrationId, eventId } = req.params;
        const updates = req.body;
        const userId = req.user?.id;

        if (!userId) {
          return this.unauthorized(res, 'User authentication required');
        }

        const updatedEvent = await this.calendarService.updateExternalEvent(
          parseInt(integrationId),
          userId,
          eventId,
          updates
        );

        return this.success(res, updatedEvent, 'External event updated');
      } catch (error) {
        this.logger?.error('Error updating external event:', error);
        return this.error(res, 'Failed to update external event');
      }
    }
  ];

  /**
   * Delete external calendar event
   */
  public deleteExternalEvent = [
    param('integrationId').isNumeric().withMessage('Invalid integration ID'),
    param('eventId').notEmpty().withMessage('Event ID is required'),
    validateRequest,
    async (req: Request, res: Response) => {
      try {
        const { integrationId, eventId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
          return this.unauthorized(res, 'User authentication required');
        }

        await this.calendarService.deleteExternalEvent(
          parseInt(integrationId),
          userId,
          eventId
        );

        return this.success(res, null, 'External event deleted');
      } catch (error) {
        this.logger?.error('Error deleting external event:', error);
        return this.error(res, 'Failed to delete external event');
      }
    }
  ];

  /**
   * Get task automation rules
   */
  public getAutomationRules = [
    query('active').optional().isBoolean(),
    query('triggerType').optional().isString(),
    validateRequest,
    async (req: Request, res: Response) => {
      try {
        const { active, triggerType } = req.query;
        const companyId = req.user?.companyId;

        if (!companyId) {
          return this.unauthorized(res, 'User authentication required');
        }

        const rules = await this.automationService.getRules(
          companyId,
          active !== undefined ? active === 'true' : undefined,
          triggerType as string
        );

        return this.success(res, rules, 'Automation rules retrieved');
      } catch (error) {
        this.logger?.error('Error fetching automation rules:', error);
        return this.error(res, 'Failed to fetch automation rules');
      }
    }
  ];

  /**
   * Create task automation rule
   */
  public createAutomationRule = [
    body('name').notEmpty().withMessage('Rule name is required'),
    body('triggerType').isIn(['event_created', 'status_change', 'due_date', 'assignment', 'custom']),
    body('triggerConditions').isObject().withMessage('Trigger conditions required'),
    body('actionType').isIn(['create_task', 'update_task', 'send_notification', 'create_activity']),
    body('actionConfig').isObject().withMessage('Action configuration required'),
    body('priority').optional().isInt({ min: 1, max: 10 }),
    body('active').optional().isBoolean(),
    validateRequest,
    async (req: Request, res: Response) => {
      try {
        const ruleData = req.body;
        const companyId = req.user?.companyId;
        const createdBy = req.user?.id;

        if (!companyId || !createdBy) {
          return this.unauthorized(res, 'User authentication required');
        }

        const rule = await this.automationService.createRule({
          ...ruleData,
          company_id: companyId,
          created_by: createdBy
        });

        return this.success(res, rule, 'Automation rule created');
      } catch (error) {
        this.logger?.error('Error creating automation rule:', error);
        return this.error(res, 'Failed to create automation rule');
      }
    }
  ];

  /**
   * Update task automation rule
   */
  public updateAutomationRule = [
    param('ruleId').isNumeric().withMessage('Invalid rule ID'),
    body('name').optional().isString(),
    body('triggerConditions').optional().isObject(),
    body('actionConfig').optional().isObject(),
    body('priority').optional().isInt({ min: 1, max: 10 }),
    body('active').optional().isBoolean(),
    validateRequest,
    async (req: Request, res: Response) => {
      try {
        const { ruleId } = req.params;
        const updates = req.body;
        const companyId = req.user?.companyId;

        if (!companyId) {
          return this.unauthorized(res, 'User authentication required');
        }

        const updatedRule = await this.automationService.updateRule(
          parseInt(ruleId),
          updates,
          companyId
        );

        return this.success(res, updatedRule, 'Automation rule updated');
      } catch (error) {
        this.logger?.error('Error updating automation rule:', error);
        return this.error(res, 'Failed to update automation rule');
      }
    }
  ];

  /**
   * Delete task automation rule
   */
  public deleteAutomationRule = [
    param('ruleId').isNumeric().withMessage('Invalid rule ID'),
    validateRequest,
    async (req: Request, res: Response) => {
      try {
        const { ruleId } = req.params;
        const companyId = req.user?.companyId;

        if (!companyId) {
          return this.unauthorized(res, 'User authentication required');
        }

        await this.automationService.deleteRule(parseInt(ruleId), companyId);

        return this.success(res, null, 'Automation rule deleted');
      } catch (error) {
        this.logger?.error('Error deleting automation rule:', error);
        return this.error(res, 'Failed to delete automation rule');
      }
    }
  ];

  /**
   * Test automation rule
   */
  public testAutomationRule = [
    param('ruleId').isNumeric().withMessage('Invalid rule ID'),
    body('testData').isObject().withMessage('Test data required'),
    validateRequest,
    async (req: Request, res: Response) => {
      try {
        const { ruleId } = req.params;
        const { testData } = req.body;
        const companyId = req.user?.companyId;

        if (!companyId) {
          return this.unauthorized(res, 'User authentication required');
        }

        const testResult = await this.automationService.testRule(
          parseInt(ruleId),
          testData,
          companyId
        );

        return this.success(res, testResult, 'Automation rule tested');
      } catch (error) {
        this.logger?.error('Error testing automation rule:', error);
        return this.error(res, 'Failed to test automation rule');
      }
    }
  ];

  /**
   * Get automation execution history
   */
  public getAutomationHistory = [
    query('ruleId').optional().isNumeric(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('status').optional().isIn(['success', 'failure', 'skipped']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    validateRequest,
    async (req: Request, res: Response) => {
      try {
        const { ruleId, startDate, endDate, status, limit, offset } = req.query;
        const companyId = req.user?.companyId;

        if (!companyId) {
          return this.unauthorized(res, 'User authentication required');
        }

        const history = await this.automationService.getExecutionHistory({
          companyId,
          ruleId: ruleId ? parseInt(ruleId as string) : undefined,
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          status: status as string,
          limit: limit ? parseInt(limit as string) : 50,
          offset: offset ? parseInt(offset as string) : 0
        });

        return this.success(res, history, 'Automation history retrieved');
      } catch (error) {
        this.logger?.error('Error fetching automation history:', error);
        return this.error(res, 'Failed to fetch automation history');
      }
    }
  ];

  /**
   * Create recurring task
   */
  public createRecurringTask = [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').optional().isString(),
    body('assignees').optional().isArray(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('recurringPattern').isObject().withMessage('Recurring pattern required'),
    body('recurringPattern.frequency').isIn(['daily', 'weekly', 'monthly', 'custom']),
    body('recurringPattern.interval').isInt({ min: 1 }),
    body('recurringPattern.endDate').optional().isISO8601(),
    body('startDate').isISO8601().withMessage('Start date required'),
    validateRequest,
    async (req: Request, res: Response) => {
      try {
        const taskData = req.body;
        const companyId = req.user?.companyId;
        const createdBy = req.user?.id;

        if (!companyId || !createdBy) {
          return this.unauthorized(res, 'User authentication required');
        }

        const recurringTask = await this.automationService.createRecurringTask({
          ...taskData,
          company_id: companyId,
          created_by: createdBy
        });

        return this.success(res, recurringTask, 'Recurring task created');
      } catch (error) {
        this.logger?.error('Error creating recurring task:', error);
        return this.error(res, 'Failed to create recurring task');
      }
    }
  ];

  /**
   * Get calendar view data
   */
  public getCalendarView = [
    query('startDate').isISO8601().withMessage('Valid start date required'),
    query('endDate').isISO8601().withMessage('Valid end date required'),
    query('view').optional().isIn(['month', 'week', 'day', 'agenda']),
    query('types').optional().isString(),
    query('userIds').optional().isString(),
    query('includeExternal').optional().isBoolean(),
    validateRequest,
    async (req: Request, res: Response) => {
      try {
        const { startDate, endDate, view, types, userIds, includeExternal } = req.query;
        const companyId = req.user?.companyId;
        const userId = req.user?.id;

        if (!companyId || !userId) {
          return this.unauthorized(res, 'User authentication required');
        }

        // Fetch activities within date range
        const activities = await this.activityService.getActivitiesByDateRange(
          companyId,
          new Date(startDate as string),
          new Date(endDate as string),
          {
            types: types ? (types as string).split(',') : undefined,
            userIds: userIds ? (userIds as string).split(',') : [userId],
            includeRecurring: true
          }
        );

        // Include external calendar events if requested
        let externalEvents = [];
        if (includeExternal === 'true') {
          const integrations = await this.calendarService.getIntegrations(userId, companyId);
          for (const integration of integrations) {
            if (integration.is_active) {
              const events = await this.calendarService.getExternalEvents(
                integration.id,
                userId,
                new Date(startDate as string),
                new Date(endDate as string)
              );
              externalEvents = [...externalEvents, ...events];
            }
          }
        }

        const calendarData = {
          activities,
          externalEvents,
          view: view || 'month',
          dateRange: {
            start: startDate,
            end: endDate
          }
        };

        return this.success(res, calendarData, 'Calendar view data retrieved');
      } catch (error) {
        this.logger?.error('Error fetching calendar view:', error);
        return this.error(res, 'Failed to fetch calendar view');
      }
    }
  ];
}