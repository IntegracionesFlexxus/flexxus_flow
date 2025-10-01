/**
 * Report Routes - Sprint 13
 */

import { Router } from 'express';
import { container } from '@/container';
import { TYPES } from '@/container/types';
import { analyticsValidators } from '../validators/analytics.validators';

export function createReportRoutes(): Router {
  const router = Router();
  const controller = container.get(TYPES.AnalyticsReportController);

  // Report CRUD
  router.post(
    '/',
    analyticsValidators.createReport,
    controller.createReport.bind(controller)
  );

  router.get(
    '/',
    controller.getReports.bind(controller)
  );

  router.get(
    '/:id',
    analyticsValidators.getReport,
    controller.getReport.bind(controller)
  );

  router.put(
    '/:id',
    analyticsValidators.updateReport,
    controller.updateReport.bind(controller)
  );

  router.delete(
    '/:id',
    analyticsValidators.deleteReport,
    controller.deleteReport.bind(controller)
  );

  // Report generation
  router.post(
    '/:id/generate',
    analyticsValidators.generateReport,
    controller.generateReport.bind(controller)
  );

  // Report scheduling
  router.post(
    '/:id/schedule',
    analyticsValidators.scheduleReport,
    controller.scheduleReport.bind(controller)
  );

  router.post(
    '/:id/schedule/cancel',
    analyticsValidators.cancelSchedule,
    controller.cancelSchedule.bind(controller)
  );

  // Execution history
  router.get(
    '/:id/executions',
    analyticsValidators.getExecutions,
    controller.getExecutions.bind(controller)
  );

  return router;
}
