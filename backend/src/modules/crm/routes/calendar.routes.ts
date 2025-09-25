/**
 * Calendar Routes
 * Routes for calendar integration, task automation, and activity management
 */

import { Router } from 'express';
import { Container } from 'inversify';
import { TYPES } from '@/container/types';
import { authenticateToken, requirePermission } from '@/shared/middleware/auth';
import { CalendarController } from '../controllers/CalendarController';

export function registerCalendarRoutes(router: Router, container: Container): void {
  const controller = container.get<CalendarController>(TYPES.CalendarController);

  // Apply authentication to all routes
  router.use(authenticateToken);

  // ========== OAuth Integration Routes ==========

  // Initialize OAuth flow
  router.get(
    '/calendar/oauth/init',
    controller.initializeOAuth
  );

  // Handle OAuth callback
  router.get(
    '/calendar/oauth/callback',
    controller.handleOAuthCallback
  );

  // ========== Integration Management Routes ==========

  // Get user's calendar integrations
  router.get(
    '/calendar/integrations',
    controller.getIntegrations
  );

  // Disconnect calendar integration
  router.delete(
    '/calendar/integrations/:integrationId',
    controller.disconnectIntegration
  );

  // ========== Calendar Sync Routes ==========

  // Sync calendar with external provider
  router.post(
    '/calendar/sync/:integrationId',
    controller.syncCalendar
  );

  // Get available time slots
  router.get(
    '/calendar/available-slots',
    controller.getAvailableSlots
  );

  // ========== External Event Management Routes ==========

  // Create external calendar event
  router.post(
    '/calendar/integrations/:integrationId/events',
    controller.createExternalEvent
  );

  // Update external calendar event
  router.put(
    '/calendar/integrations/:integrationId/events/:eventId',
    controller.updateExternalEvent
  );

  // Delete external calendar event
  router.delete(
    '/calendar/integrations/:integrationId/events/:eventId',
    controller.deleteExternalEvent
  );

  // ========== Task Automation Routes ==========

  // Get automation rules
  router.get(
    '/automation/rules',
    controller.getAutomationRules
  );

  // Create automation rule
  router.post(
    '/automation/rules',
    controller.createAutomationRule
  );

  // Update automation rule
  router.put(
    '/automation/rules/:ruleId',
    controller.updateAutomationRule
  );

  // Delete automation rule
  router.delete(
    '/automation/rules/:ruleId',
    controller.deleteAutomationRule
  );

  // Test automation rule
  router.post(
    '/automation/rules/:ruleId/test',
    controller.testAutomationRule
  );

  // Get automation execution history
  router.get(
    '/automation/history',
    controller.getAutomationHistory
  );

  // ========== Calendar View Routes ==========

  // Get calendar view data
  router.get(
    '/calendar/view',
    controller.getCalendarView
  );

  // ========== Recurring Tasks Routes ==========

  // Create recurring task
  router.post(
    '/activities/recurring',
    controller.createRecurringTask
  );
}