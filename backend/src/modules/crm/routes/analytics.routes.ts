import { Router } from 'express';
import { Container } from 'inversify';
import { TYPES } from '../../../container/types';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { ReportController } from '../controllers/ReportController';
import { ExportController } from '../controllers/ExportController';
import { authenticateToken, requirePermission } from '@/shared/middleware/auth';

export function createAnalyticsRoutes(container: Container): Router {
  const router = Router();

  const analyticsController = container.get<AnalyticsController>(TYPES.CRMAnalyticsController);
  const reportController = container.get<ReportController>(TYPES.CRMReportController);
  const exportController = container.get<ExportController>(TYPES.CRMExportController);

  // Apply auth middleware to all routes
  router.use(authenticateToken);

  // ============= Analytics Routes =============

  // General metrics
  router.get('/metrics',
    analyticsController.getMetrics.bind(analyticsController)
  );

  // Revenue analytics
  router.get('/revenue-trend',
    analyticsController.getRevenueTrend.bind(analyticsController)
  );

  // Conversion funnel
  router.get('/conversion-funnel',
    analyticsController.getConversionFunnel.bind(analyticsController)
  );

  // Top performers
  router.get('/top-performers',
    analyticsController.getTopPerformers.bind(analyticsController)
  );

  // Performance comparison
  router.get('/performance-comparison',
    analyticsController.comparePerformance.bind(analyticsController)
  );

  // Sales forecast
  router.get('/sales-forecast',
    analyticsController.getSalesForecast.bind(analyticsController)
  );

  // Campaign ROI
  router.get('/campaign-roi',
    analyticsController.getCampaignROI.bind(analyticsController)
  );

  // ============= KPI Routes =============

  // KPI management
  router.get('/kpis',
    analyticsController.getKpis.bind(analyticsController)
  );

  router.get('/kpis/dashboard',
    analyticsController.getKpiDashboard.bind(analyticsController)
  );

  router.post('/kpis/:kpiId/calculate',
    analyticsController.calculateKpi.bind(analyticsController)
  );

  router.get('/kpis/:kpiId/trends',
    analyticsController.getKpiTrends.bind(analyticsController)
  );

  // ============= Dashboard Routes =============

  // Dashboard management
  router.get('/dashboards',
    analyticsController.getDashboards.bind(analyticsController)
  );

  router.get('/dashboards/:dashboardId',
    analyticsController.getDashboardWithData.bind(analyticsController)
  );

  router.post('/dashboards',
    analyticsController.createDashboard.bind(analyticsController)
  );

  router.put('/dashboards/:dashboardId',
    analyticsController.updateDashboard.bind(analyticsController)
  );

  router.delete('/dashboards/:dashboardId',
    analyticsController.deleteDashboard.bind(analyticsController)
  );

  router.post('/dashboards/:dashboardId/clone',
    analyticsController.cloneDashboard.bind(analyticsController)
  );

  // Widget management
  router.post('/dashboards/:dashboardId/widgets',
    analyticsController.addWidget.bind(analyticsController)
  );

  router.put('/widgets/:widgetId',
    analyticsController.updateWidget.bind(analyticsController)
  );

  router.delete('/widgets/:widgetId',
    analyticsController.deleteWidget.bind(analyticsController)
  );

  // ============= Report Routes =============

  // Report management
  router.get('/reports',
    reportController.getReports.bind(reportController)
  );

  router.get('/reports/:reportId',
    reportController.getReport.bind(reportController)
  );

  router.post('/reports',
    reportController.createReport.bind(reportController)
  );

  router.put('/reports/:reportId',
    reportController.updateReport.bind(reportController)
  );

  router.delete('/reports/:reportId',
    reportController.deleteReport.bind(reportController)
  );

  // Report execution and export
  router.post('/reports/:reportId/execute',
    reportController.executeReport.bind(reportController)
  );

  router.post('/reports/:reportId/schedule',
    reportController.scheduleReport.bind(reportController)
  );

  router.post('/reports/:reportId/export',
    reportController.exportReport.bind(reportController)
  );

  router.post('/reports/:reportId/clone',
    reportController.cloneReport.bind(reportController)
  );

  router.get('/reports/:reportId/metrics',
    reportController.getReportMetrics.bind(reportController)
  );

  // ============= Export Routes =============

  // Export management
  // NOTE: Following methods are commented out - they don't exist in ReportController
  // Uncomment when ExportController methods are implemented
  /*
  router.get('/exports',
    exportController.getExports.bind(exportController)
  );

  router.get('/exports/my',
    exportController.getUserExports.bind(exportController)
  );

  router.get('/exports/:exportId',
    exportController.getExport.bind(exportController)
  );

  router.post('/exports',
    exportController.createExport.bind(exportController)
  );

  router.post('/exports/bulk',
    exportController.createBulkExport.bind(exportController)
  );

  router.post('/exports/:exportId/retry',
    exportController.retryExport.bind(exportController)
  );
  */

  router.get('/exports/statistics',
    exportController.getExportStatistics.bind(exportController)
  );

  router.get('/exports/:exportId/status',
    exportController.getExportStatus.bind(exportController)
  );

  router.get('/exports/:exportId/download',
    exportController.downloadExport.bind(exportController)
  );

  router.post('/exports/:exportId/cancel',
    exportController.cancelExport.bind(exportController)
  );

  // Admin only
  router.post('/exports/cleanup',
    requirePermission('admin'),
    exportController.cleanupExpiredExports.bind(exportController)
  );

  return router;
}

export default createAnalyticsRoutes;