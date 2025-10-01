/**
 * Analytics Validators - Sprint 13
 * Express-validator chains for analytics endpoints
 */

import { body, param, query } from 'express-validator';

export const analyticsValidators = {
  // ============================================================================
  // METRICS VALIDATORS
  // ============================================================================

  getMetrics: [
    query('startDate').isISO8601().withMessage('Invalid start date format'),
    query('endDate').isISO8601().withMessage('Invalid end date format'),
    query('channels').optional().isArray().withMessage('Channels must be an array'),
    query('agentIds').optional().isArray().withMessage('Agent IDs must be an array'),
    query('departmentIds').optional().isArray().withMessage('Department IDs must be an array'),
    query('tags').optional().isArray().withMessage('Tags must be an array'),
    query('groupBy').optional().isIn(['hour', 'day', 'week', 'month', 'channel', 'agent']).withMessage('Invalid groupBy value')
  ],

  getCampaignMetrics: [
    param('campaignId').isInt({ min: 1 }).withMessage('Invalid campaign ID')
  ],

  getCustomerMetrics: [
    param('customerId').isInt({ min: 1 }).withMessage('Invalid customer ID')
  ],

  // ============================================================================
  // DASHBOARD VALIDATORS
  // ============================================================================

  createDashboard: [
    body('name').trim().notEmpty().withMessage('Dashboard name is required').isLength({ max: 100 }).withMessage('Name too long'),
    body('description').optional().isString().isLength({ max: 500 }).withMessage('Description too long'),
    body('type').notEmpty().isIn(['custom', 'executive', 'operational', 'sales', 'marketing', 'support']).withMessage('Invalid dashboard type'),
    body('layoutConfig').optional().isObject().withMessage('Layout config must be an object'),
    body('widgets').optional().isArray().withMessage('Widgets must be an array'),
    body('filters').optional().isObject().withMessage('Filters must be an object'),
    body('refreshIntervalSeconds').optional().isInt({ min: 10, max: 3600 }).withMessage('Refresh interval must be between 10 and 3600 seconds'),
    body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
    body('sharedWithUsers').optional().isArray().withMessage('Shared users must be an array'),
    body('sharedWithRoles').optional().isArray().withMessage('Shared roles must be an array')
  ],

  updateDashboard: [
    param('id').isInt({ min: 1 }).withMessage('Invalid dashboard ID'),
    body('name').optional().trim().notEmpty().withMessage('Dashboard name cannot be empty').isLength({ max: 100 }).withMessage('Name too long'),
    body('description').optional().isString().isLength({ max: 500 }).withMessage('Description too long'),
    body('type').optional().isIn(['custom', 'executive', 'operational', 'sales', 'marketing', 'support']).withMessage('Invalid dashboard type'),
    body('layoutConfig').optional().isObject().withMessage('Layout config must be an object'),
    body('filters').optional().isObject().withMessage('Filters must be an object'),
    body('refreshIntervalSeconds').optional().isInt({ min: 10, max: 3600 }).withMessage('Refresh interval must be between 10 and 3600 seconds'),
    body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
  ],

  getDashboard: [
    param('id').isInt({ min: 1 }).withMessage('Invalid dashboard ID')
  ],

  deleteDashboard: [
    param('id').isInt({ min: 1 }).withMessage('Invalid dashboard ID')
  ],

  updateLayout: [
    param('id').isInt({ min: 1 }).withMessage('Invalid dashboard ID'),
    body('columns').optional().isInt({ min: 1, max: 24 }).withMessage('Columns must be between 1 and 24'),
    body('rowHeight').optional().isInt({ min: 10 }).withMessage('Row height must be at least 10'),
    body('layouts').notEmpty().isObject().withMessage('Layouts object is required')
  ],

  // ============================================================================
  // WIDGET VALIDATORS
  // ============================================================================

  addWidget: [
    param('id').isInt({ min: 1 }).withMessage('Invalid dashboard ID'),
    body('widgetType').notEmpty().isIn(['chart', 'metric', 'table', 'map', 'gauge', 'heatmap', 'funnel', 'kpi']).withMessage('Invalid widget type'),
    body('title').trim().notEmpty().withMessage('Widget title is required').isLength({ max: 100 }).withMessage('Title too long'),
    body('dataSource').notEmpty().isString().withMessage('Data source is required'),
    body('positionX').isInt({ min: 0 }).withMessage('Invalid position X'),
    body('positionY').isInt({ min: 0 }).withMessage('Invalid position Y'),
    body('width').isInt({ min: 1, max: 12 }).withMessage('Width must be between 1 and 12'),
    body('height').isInt({ min: 1, max: 12 }).withMessage('Height must be between 1 and 12'),
    body('chartType').optional().isIn(['line', 'bar', 'pie', 'doughnut', 'area', 'scatter', 'bubble', 'radar', 'polar']).withMessage('Invalid chart type'),
    body('chartConfig').optional().isObject().withMessage('Chart config must be an object'),
    body('metrics').optional().isObject().withMessage('Metrics must be an object'),
    body('dimensions').optional().isObject().withMessage('Dimensions must be an object'),
    body('filters').optional().isObject().withMessage('Filters must be an object'),
    body('cacheEnabled').optional().isBoolean().withMessage('cacheEnabled must be a boolean'),
    body('cacheTtlSeconds').optional().isInt({ min: 10, max: 3600 }).withMessage('Cache TTL must be between 10 and 3600 seconds')
  ],

  updateWidget: [
    param('id').isInt({ min: 1 }).withMessage('Invalid dashboard ID'),
    param('widgetId').isInt({ min: 1 }).withMessage('Invalid widget ID'),
    body('title').optional().trim().notEmpty().isLength({ max: 100 }).withMessage('Title too long'),
    body('dataSource').optional().isString().withMessage('Data source must be a string'),
    body('positionX').optional().isInt({ min: 0 }).withMessage('Invalid position X'),
    body('positionY').optional().isInt({ min: 0 }).withMessage('Invalid position Y'),
    body('width').optional().isInt({ min: 1, max: 12 }).withMessage('Width must be between 1 and 12'),
    body('height').optional().isInt({ min: 1, max: 12 }).withMessage('Height must be between 1 and 12'),
    body('chartType').optional().isIn(['line', 'bar', 'pie', 'doughnut', 'area', 'scatter', 'bubble', 'radar', 'polar']).withMessage('Invalid chart type'),
    body('cacheEnabled').optional().isBoolean().withMessage('cacheEnabled must be a boolean')
  ],

  deleteWidget: [
    param('id').isInt({ min: 1 }).withMessage('Invalid dashboard ID'),
    param('widgetId').isInt({ min: 1 }).withMessage('Invalid widget ID')
  ],

  // ============================================================================
  // REPORT VALIDATORS
  // ============================================================================

  createReport: [
    body('name').trim().notEmpty().withMessage('Report name is required').isLength({ max: 100 }).withMessage('Name too long'),
    body('description').optional().isString().isLength({ max: 500 }).withMessage('Description too long'),
    body('reportType').notEmpty().isIn(['daily', 'weekly', 'monthly', 'quarterly', 'annual', 'custom']).withMessage('Invalid report type'),
    body('dataSources').isArray({ min: 1 }).withMessage('At least one data source is required'),
    body('dataSources.*.name').notEmpty().isString().withMessage('Data source name is required'),
    body('dataSources.*.table').notEmpty().isString().withMessage('Data source table is required'),
    body('outputFormat').notEmpty().isIn(['pdf', 'excel', 'csv', 'html', 'json']).withMessage('Invalid output format'),
    body('filters').optional().isObject().withMessage('Filters must be an object'),
    body('parameters').optional().isObject().withMessage('Parameters must be an object'),
    body('includeCharts').optional().isBoolean().withMessage('includeCharts must be a boolean'),
    body('includeSummary').optional().isBoolean().withMessage('includeSummary must be a boolean'),
    body('recipients').optional().isArray().withMessage('Recipients must be an array'),
    body('recipients.*.email').optional().isEmail().withMessage('Invalid email address')
  ],

  updateReport: [
    param('id').isInt({ min: 1 }).withMessage('Invalid report ID'),
    body('name').optional().trim().notEmpty().isLength({ max: 100 }).withMessage('Name too long'),
    body('description').optional().isString().isLength({ max: 500 }).withMessage('Description too long'),
    body('reportType').optional().isIn(['daily', 'weekly', 'monthly', 'quarterly', 'annual', 'custom']).withMessage('Invalid report type'),
    body('outputFormat').optional().isIn(['pdf', 'excel', 'csv', 'html', 'json']).withMessage('Invalid output format'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
  ],

  getReport: [
    param('id').isInt({ min: 1 }).withMessage('Invalid report ID')
  ],

  deleteReport: [
    param('id').isInt({ min: 1 }).withMessage('Invalid report ID')
  ],

  generateReport: [
    param('id').isInt({ min: 1 }).withMessage('Invalid report ID')
  ],

  scheduleReport: [
    param('id').isInt({ min: 1 }).withMessage('Invalid report ID'),
    body('scheduleCron').notEmpty()
      .matches(/^(\*|[0-9,\-\*\/]+)\s+(\*|[0-9,\-\*\/]+)\s+(\*|[0-9,\-\*\/]+)\s+(\*|[0-9,\-\*\/]+)\s+(\*|[0-9,\-\*\/]+)$/)
      .withMessage('Invalid cron expression'),
    body('recipients').isArray({ min: 1 }).withMessage('At least one recipient is required'),
    body('recipients.*.email').isEmail().withMessage('Invalid email address')
  ],

  cancelSchedule: [
    param('id').isInt({ min: 1 }).withMessage('Invalid report ID')
  ],

  getExecutions: [
    param('id').isInt({ min: 1 }).withMessage('Invalid report ID'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],

  downloadExecution: [
    param('id').isInt({ min: 1 }).withMessage('Invalid report ID'),
    param('executionId').isInt({ min: 1 }).withMessage('Invalid execution ID')
  ],

  // ============================================================================
  // KPI VALIDATORS
  // ============================================================================

  createKpi: [
    body('name').trim().notEmpty().withMessage('KPI name is required').isLength({ max: 100 }).withMessage('Name too long'),
    body('description').optional().isString().isLength({ max: 500 }).withMessage('Description too long'),
    body('category').notEmpty().isIn(['conversation', 'campaign', 'customer', 'revenue', 'performance', 'quality', 'custom']).withMessage('Invalid category'),
    body('formula').notEmpty().isString().withMessage('Formula is required'),
    body('dataSource').notEmpty().isString().withMessage('Data source is required'),
    body('aggregationType').notEmpty().isIn(['sum', 'avg', 'count', 'min', 'max', 'ratio', 'percentage']).withMessage('Invalid aggregation type'),
    body('unit').optional().isString().isLength({ max: 20 }).withMessage('Unit too long'),
    body('targetValue').optional().isNumeric().withMessage('Target value must be numeric'),
    body('minThreshold').optional().isNumeric().withMessage('Min threshold must be numeric'),
    body('maxThreshold').optional().isNumeric().withMessage('Max threshold must be numeric'),
    body('alertEnabled').optional().isBoolean().withMessage('alertEnabled must be a boolean'),
    body('decimalPlaces').optional().isInt({ min: 0, max: 10 }).withMessage('Decimal places must be between 0 and 10'),
    body('trendDirection').optional().isIn(['higher_is_better', 'lower_is_better', 'neutral']).withMessage('Invalid trend direction')
  ],

  updateKpi: [
    param('id').isInt({ min: 1 }).withMessage('Invalid KPI ID'),
    body('name').optional().trim().notEmpty().isLength({ max: 100 }).withMessage('Name too long'),
    body('description').optional().isString().isLength({ max: 500 }).withMessage('Description too long'),
    body('targetValue').optional().isNumeric().withMessage('Target value must be numeric'),
    body('minThreshold').optional().isNumeric().withMessage('Min threshold must be numeric'),
    body('maxThreshold').optional().isNumeric().withMessage('Max threshold must be numeric'),
    body('alertEnabled').optional().isBoolean().withMessage('alertEnabled must be a boolean'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
  ],

  getKpi: [
    param('id').isInt({ min: 1 }).withMessage('Invalid KPI ID')
  ],

  deleteKpi: [
    param('id').isInt({ min: 1 }).withMessage('Invalid KPI ID')
  ],

  getKpiTrend: [
    param('id').isInt({ min: 1 }).withMessage('Invalid KPI ID'),
    query('period').optional().isIn(['hour', 'day', 'week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date')
  ],

  getKpisByCategory: [
    param('category').notEmpty().isIn(['conversation', 'campaign', 'customer', 'revenue', 'performance', 'quality', 'custom']).withMessage('Invalid category')
  ],

  calculateKpi: [
    param('id').isInt({ min: 1 }).withMessage('Invalid KPI ID')
  ],

  // ============================================================================
  // ETL PIPELINE VALIDATORS
  // ============================================================================

  createPipeline: [
    body('pipelineName').trim().notEmpty().withMessage('Pipeline name is required').isLength({ max: 100 }).withMessage('Name too long'),
    body('pipelineType').notEmpty().isIn(['aggregation', 'transformation', 'calculation', 'sync', 'cleanup']).withMessage('Invalid pipeline type'),
    body('sourceTables').isArray({ min: 1 }).withMessage('At least one source table is required'),
    body('targetTable').notEmpty().isString().withMessage('Target table is required'),
    body('scheduleCron').optional()
      .matches(/^(\*|[0-9,\-\*\/]+)\s+(\*|[0-9,\-\*\/]+)\s+(\*|[0-9,\-\*\/]+)\s+(\*|[0-9,\-\*\/]+)\s+(\*|[0-9,\-\*\/]+)$/)
      .withMessage('Invalid cron expression'),
    body('priority').optional().isInt({ min: 1, max: 10 }).withMessage('Priority must be between 1 and 10'),
    body('timeoutMinutes').optional().isInt({ min: 1, max: 600 }).withMessage('Timeout must be between 1 and 600 minutes'),
    body('retryCount').optional().isInt({ min: 0, max: 10 }).withMessage('Retry count must be between 0 and 10')
  ],

  updatePipeline: [
    param('id').isInt({ min: 1 }).withMessage('Invalid pipeline ID'),
    body('pipelineName').optional().trim().notEmpty().isLength({ max: 100 }).withMessage('Name too long'),
    body('sourceTables').optional().isArray({ min: 1 }).withMessage('At least one source table is required'),
    body('targetTable').optional().isString().withMessage('Target table must be a string'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    body('priority').optional().isInt({ min: 1, max: 10 }).withMessage('Priority must be between 1 and 10')
  ],

  getPipeline: [
    param('id').isInt({ min: 1 }).withMessage('Invalid pipeline ID')
  ],

  runPipeline: [
    param('id').isInt({ min: 1 }).withMessage('Invalid pipeline ID')
  ]
};
