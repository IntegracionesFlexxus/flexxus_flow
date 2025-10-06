/**
 * Dashboard Routes - Sprint 13
 */

import { Router } from 'express';
import { container } from '@/container';
import { TYPES } from '@/container/types';
import { analyticsValidators } from '../validators/analytics.validators';

export function createDashboardRoutes(): Router {
  const router = Router();
  const controller = container.get(TYPES.OmniAnalyticsDashboardController);

  // Dashboard CRUD
  router.post(
    '/',
    analyticsValidators.createDashboard,
    controller.createDashboard.bind(controller)
  );

  router.get(
    '/',
    controller.getDashboards.bind(controller)
  );

  router.get(
    '/:id',
    analyticsValidators.getDashboard,
    controller.getDashboard.bind(controller)
  );

  router.put(
    '/:id',
    analyticsValidators.updateDashboard,
    controller.updateDashboard.bind(controller)
  );

  router.delete(
    '/:id',
    analyticsValidators.deleteDashboard,
    controller.deleteDashboard.bind(controller)
  );

  // Widget operations
  router.post(
    '/:id/widgets',
    analyticsValidators.addWidget,
    controller.addWidget.bind(controller)
  );

  router.put(
    '/:id/widgets/:widgetId',
    analyticsValidators.updateWidget,
    controller.updateWidget.bind(controller)
  );

  router.delete(
    '/:id/widgets/:widgetId',
    analyticsValidators.deleteWidget,
    controller.deleteWidget.bind(controller)
  );

  return router;
}
