/**
 * Analytics Routes Index - Sprint 13
 * Main router aggregating all analytics routes
 */

import { Router } from 'express';
import { createAnalyticsRoutes } from './analytics.routes';
import { createDashboardRoutes } from './dashboard.routes';
import { createReportRoutes } from './report.routes';
import { container } from '@/container';
import { TYPES } from '@/container/types';
import { analyticsValidators } from '../validators/analytics.validators';

export function createAnalyticsRouter(): Router {
  const router = Router();

  // Mount sub-routers
  router.use('/analytics', createAnalyticsRoutes());
  router.use('/dashboards', createDashboardRoutes());
  router.use('/reports', createReportRoutes());

  // KPI routes (inline for simplicity)
  const kpiController = container.get(TYPES.AnalyticsKpiController);

  router.post(
    '/kpis',
    analyticsValidators.createKpi,
    kpiController.createKpi.bind(kpiController)
  );

  router.get(
    '/kpis/category/:category',
    analyticsValidators.getKpisByCategory,
    kpiController.getKpisByCategory.bind(kpiController)
  );

  router.get(
    '/kpis/:id/trend',
    analyticsValidators.getKpiTrend,
    kpiController.getKpiTrend.bind(kpiController)
  );

  router.post(
    '/kpis/:id/calculate',
    analyticsValidators.calculateKpi,
    kpiController.calculateKpi.bind(kpiController)
  );

  router.put(
    '/kpis/:id',
    analyticsValidators.updateKpi,
    kpiController.updateKpi.bind(kpiController)
  );

  return router;
}

export default createAnalyticsRouter;
