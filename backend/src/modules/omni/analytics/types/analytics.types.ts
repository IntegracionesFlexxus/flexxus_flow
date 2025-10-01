/**
 * Analytics Types - Sprint 13
 * Type definitions for Analytics & Reporting Module
 */

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface Dashboard {
  id: number;
  companyId: number;
  name: string;
  description?: string;
  type: DashboardType;
  layoutConfig: LayoutConfig;
  widgets: number[] | Widget[];
  filters?: Record<string, any>;
  refreshIntervalSeconds?: number;
  isPublic: boolean;
  ownerId: number;
  sharedWithUsers?: number[];
  sharedWithRoles?: number[];
  isActive: boolean;
  isDefault: boolean;
  viewCount: number;
  lastViewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number;
}

export type DashboardType = 'custom' | 'executive' | 'operational' | 'sales' | 'marketing' | 'support';

export interface LayoutConfig {
  columns: number;
  rowHeight: number;
  layouts: {
    lg?: LayoutItem[];
    md?: LayoutItem[];
    sm?: LayoutItem[];
    xs?: LayoutItem[];
  };
}

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

export interface Widget {
  id: number;
  dashboardId: number;
  widgetType: WidgetType;
  title: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  dataSource: string;
  query?: string;
  metrics?: Record<string, any>;
  dimensions?: Record<string, any>;
  filters?: Record<string, any>;
  chartType?: ChartType;
  chartConfig?: ChartConfig;
  colorScheme?: string;
  cacheEnabled: boolean;
  cacheTtlSeconds: number;
  lastCachedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type WidgetType = 'chart' | 'metric' | 'table' | 'map' | 'gauge' | 'heatmap' | 'funnel' | 'kpi';

export type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'bubble' | 'radar' | 'polar';

export interface ChartConfig {
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  showDataLabels?: boolean;
  stacked?: boolean;
  smooth?: boolean;
  fillArea?: boolean;
  animations?: boolean;
  responsive?: boolean;
  aspectRatio?: number;
  colors?: string[];
}

export interface DashboardData {
  dashboard: Dashboard;
  widgets: WidgetWithData[];
}

export interface WidgetWithData extends Widget {
  data: any;
  loading?: boolean;
  error?: string;
}

export interface CreateDashboardDto {
  name: string;
  description?: string;
  type: DashboardType;
  layoutConfig?: LayoutConfig;
  widgets?: CreateWidgetDto[];
  filters?: Record<string, any>;
  refreshIntervalSeconds?: number;
  isPublic?: boolean;
  sharedWithUsers?: number[];
  sharedWithRoles?: number[];
}

export interface UpdateDashboardDto {
  name?: string;
  description?: string;
  type?: DashboardType;
  layoutConfig?: LayoutConfig;
  filters?: Record<string, any>;
  refreshIntervalSeconds?: number;
  isPublic?: boolean;
  sharedWithUsers?: number[];
  sharedWithRoles?: number[];
  isActive?: boolean;
}

export interface CreateWidgetDto {
  widgetType: WidgetType;
  title: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  dataSource: string;
  query?: string;
  metrics?: Record<string, any>;
  dimensions?: Record<string, any>;
  filters?: Record<string, any>;
  chartType?: ChartType;
  chartConfig?: ChartConfig;
  colorScheme?: string;
  cacheEnabled?: boolean;
  cacheTtlSeconds?: number;
}

export interface UpdateWidgetDto {
  title?: string;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  dataSource?: string;
  query?: string;
  metrics?: Record<string, any>;
  dimensions?: Record<string, any>;
  filters?: Record<string, any>;
  chartType?: ChartType;
  chartConfig?: ChartConfig;
  cacheEnabled?: boolean;
  cacheTtlSeconds?: number;
}

// ============================================================================
// REPORT TYPES
// ============================================================================

export interface Report {
  id: number;
  companyId: number;
  name: string;
  description?: string;
  reportType: ReportType;
  templateId?: number;
  dataSources: DataSourceConfig[];
  parameters?: Record<string, any>;
  filters?: Record<string, any>;
  groupings?: Record<string, any>;
  sortings?: Record<string, any>;
  outputFormat: OutputFormat;
  includeCharts: boolean;
  includeSummary: boolean;
  brandingConfig?: BrandingConfig;
  isScheduled: boolean;
  scheduleCron?: string;
  nextRunAt?: Date;
  recipients?: EmailRecipient[];
  isActive: boolean;
  lastGeneratedAt?: Date;
  generationCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number;
}

export type ReportType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';

export type OutputFormat = 'pdf' | 'excel' | 'csv' | 'html' | 'json';

export interface DataSourceConfig {
  name: string;
  table: string;
  query?: string;
  fields?: string[];
  joins?: JoinConfig[];
  aggregations?: AggregationConfig[];
}

export interface JoinConfig {
  table: string;
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  on: string;
}

export interface AggregationConfig {
  field: string;
  function: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' | 'GROUP_CONCAT';
  alias?: string;
}

export interface BrandingConfig {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  companyName?: string;
  headerText?: string;
  footerText?: string;
}

export interface EmailRecipient {
  email: string;
  name?: string;
  type: 'to' | 'cc' | 'bcc';
}

export interface ReportExecution {
  id: number;
  reportId: number;
  executionId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  durationSeconds?: number;
  filePath?: string;
  fileSizeBytes?: number;
  pageCount?: number;
  rowCount?: number;
  sentTo?: EmailRecipient[];
  deliveryStatus?: Record<string, any>;
  errorMessage?: string;
  errorDetails?: Record<string, any>;
  createdAt: Date;
  createdBy?: number;
}

export type ExecutionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface CreateReportDto {
  name: string;
  description?: string;
  reportType: ReportType;
  templateId?: number;
  dataSources: DataSourceConfig[];
  parameters?: Record<string, any>;
  filters?: Record<string, any>;
  groupings?: Record<string, any>;
  sortings?: Record<string, any>;
  outputFormat: OutputFormat;
  includeCharts?: boolean;
  includeSummary?: boolean;
  brandingConfig?: BrandingConfig;
  recipients?: EmailRecipient[];
}

export interface UpdateReportDto {
  name?: string;
  description?: string;
  reportType?: ReportType;
  dataSources?: DataSourceConfig[];
  parameters?: Record<string, any>;
  filters?: Record<string, any>;
  outputFormat?: OutputFormat;
  includeCharts?: boolean;
  brandingConfig?: BrandingConfig;
  recipients?: EmailRecipient[];
  isActive?: boolean;
}

export interface ScheduleReportDto {
  scheduleCron: string;
  recipients: EmailRecipient[];
  nextRunAt?: Date;
}

export interface GeneratedReport {
  execution: ReportExecution;
  file: GeneratedFile;
}

export interface GeneratedFile {
  path: string;
  buffer: Buffer;
  size: number;
  mimeType: string;
  pageCount?: number;
  rowCount?: number;
}

export interface DistributionResult {
  sent: number;
  failed: number;
  details: Array<{
    email: string;
    status: 'sent' | 'failed';
    error?: string;
  }>;
}

// ============================================================================
// KPI TYPES
// ============================================================================

export interface KpiDefinition {
  id: number;
  companyId: number;
  name: string;
  description?: string;
  category: KpiCategory;
  formula: string;
  dataSource: string;
  aggregationType: AggregationType;
  unit?: string;
  targetValue?: number;
  minThreshold?: number;
  maxThreshold?: number;
  alertEnabled: boolean;
  displayFormat: string;
  decimalPlaces: number;
  trendDirection: TrendDirection;
  isActive: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type KpiCategory = 'conversation' | 'campaign' | 'customer' | 'revenue' | 'performance' | 'quality' | 'custom';

export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'ratio' | 'percentage';

export type TrendDirection = 'higher_is_better' | 'lower_is_better' | 'neutral';

export interface KpiValue {
  id: number;
  kpiId: number;
  companyId: number;
  timestamp: Date;
  value: number;
  previousValue?: number;
  changePercentage?: number;
  dimensions?: Record<string, any>;
  filtersApplied?: Record<string, any>;
  calculatedAt: Date;
}

export interface KpiTrend {
  kpiId: number;
  period: string;
  values: KpiValue[];
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
  forecast?: number[];
}

export interface ThresholdEvaluation {
  kpiId: number;
  value: number;
  targetValue?: number;
  minThreshold?: number;
  maxThreshold?: number;
  status: 'above_target' | 'on_target' | 'below_target' | 'critical';
  alertTriggered: boolean;
}

export interface DefineKpiDto {
  name: string;
  description?: string;
  category: KpiCategory;
  formula: string;
  dataSource: string;
  aggregationType: AggregationType;
  unit?: string;
  targetValue?: number;
  minThreshold?: number;
  maxThreshold?: number;
  alertEnabled?: boolean;
  displayFormat?: string;
  decimalPlaces?: number;
  trendDirection?: TrendDirection;
}

export interface UpdateKpiDto {
  name?: string;
  description?: string;
  category?: KpiCategory;
  formula?: string;
  targetValue?: number;
  minThreshold?: number;
  maxThreshold?: number;
  alertEnabled?: boolean;
  isActive?: boolean;
}

// ============================================================================
// METRICS TYPES
// ============================================================================

export interface ConversationMetrics {
  conversationCount: number;
  messageCount: number;
  avgResponseTimeSeconds: number;
  avgResolutionTimeMinutes: number;
  firstResponseTimeSeconds: number;
  csat: number;
  messagesSent: number;
  messagesReceived: number;
  mediaMessages: number;
  escalationCount: number;
  byChannel: ChannelMetrics[];
  byAgent?: AgentMetrics[];
  trend: TrendData;
  comparisons?: ComparisonData;
}

export interface ChannelMetrics {
  channel: string;
  conversationCount: number;
  messageCount: number;
  avgResponseTimeSeconds: number;
  csat: number;
  percentage: number;
}

export interface AgentMetrics {
  agentId: number;
  agentName: string;
  conversationCount: number;
  avgResponseTimeSeconds: number;
  avgResolutionTimeMinutes: number;
  csat: number;
  activeTime: number;
}

export interface CampaignAnalytics {
  campaignId: number;
  campaignName: string;
  campaignType: string;
  channel: string;
  sentCount: number;
  deliveredCount: number;
  bouncedCount: number;
  openedCount: number;
  clickedCount: number;
  repliedCount: number;
  convertedCount: number;
  unsubscribedCount: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  bounceRate: number;
  cost: number;
  revenue: number;
  roi: number;
  roas: number;
  conversionFunnel: ConversionFunnel;
  attribution: Attribution;
  trend: TrendData;
}

export interface CustomerAnalytics {
  customerId: number;
  totalInteractions: number;
  channelInteractions: Record<string, number>;
  lastInteractionDate: Date;
  daysSinceLastInteraction: number;
  lifetimeValue: number;
  totalPurchases: number;
  averageOrderValue: number;
  totalSpent: number;
  engagementScore: number;
  satisfactionScore: number;
  churnRiskScore: number;
  leadScore: number;
  segmentIds: number[];
  tags: string[];
  preferredChannel: string;
  preferredContactTime: string;
  nextBestAction?: NextBestAction;
}

export interface ChannelComparison {
  channels: string[];
  metrics: Record<string, number[]>;
  totals: Record<string, number>;
  percentages: Record<string, number>;
  trends: Record<string, TrendData>;
}

export interface TrendData {
  direction: 'up' | 'down' | 'stable';
  changePercentage: number;
  changeAbsolute: number;
  previousValue: number;
  currentValue: number;
  sparkline?: number[];
}

export interface ComparisonData {
  previousPeriod: Record<string, number>;
  currentPeriod: Record<string, number>;
  changes: Record<string, { absolute: number; percentage: number }>;
}

export interface ConversionFunnel {
  stages: FunnelStage[];
  totalEntered: number;
  totalConverted: number;
  overallConversionRate: number;
}

export interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  dropoff: number;
  dropoffRate: number;
}

export interface Attribution {
  model: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'position_based';
  touchpoints: Touchpoint[];
  attributedRevenue: Record<string, number>;
}

export interface Touchpoint {
  channel: string;
  timestamp: Date;
  attribution: number;
}

export interface NextBestAction {
  action: string;
  reason: string;
  score: number;
  channel: string;
}

// ============================================================================
// REAL-TIME TYPES
// ============================================================================

export interface RealTimeMetrics {
  timestamp: Date;
  eventType: string;
  channel?: string;
  value: number;
  dimensions?: Record<string, any>;
  runningAverage: number;
  percentileP95: number;
  trend: 'up' | 'down' | 'stable';
}

export interface AnalyticsEvent {
  type: string;
  companyId: number;
  channel?: string;
  value: number;
  dimensions?: Record<string, any>;
  timestamp: Date;
}

// ============================================================================
// ETL TYPES
// ============================================================================

export interface EtlPipeline {
  id: number;
  companyId?: number;
  pipelineName: string;
  pipelineType: PipelineType;
  sourceTables: string[];
  targetTable: string;
  scheduleCron?: string;
  isActive: boolean;
  priority: number;
  timeoutMinutes: number;
  retryCount: number;
  lastRunAt?: Date;
  lastSuccessAt?: Date;
  lastErrorAt?: Date;
  lastErrorMessage?: string;
  runCount: number;
  successCount: number;
  transformations?: Transformation[];
  createdAt: Date;
  updatedAt: Date;
}

export type PipelineType = 'aggregation' | 'transformation' | 'calculation' | 'sync' | 'cleanup';

export interface EtlExecution {
  id: number;
  pipelineId: number;
  executionId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  durationSeconds?: number;
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsDeleted: number;
  recordsFailed: number;
  errorMessage?: string;
  errorDetails?: Record<string, any>;
  executionLog?: string;
  createdAt: Date;
}

export interface Transformation {
  type: 'map' | 'filter' | 'aggregate' | 'join' | 'calculate';
  config: Record<string, any>;
}

export interface ExecutionResult {
  success: boolean;
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsDeleted: number;
  recordsFailed: number;
  duration: number;
  errors?: string[];
}

export interface LoadResult {
  inserted: number;
  updated: number;
  deleted: number;
  failed: number;
  errors?: string[];
}

export interface CreatePipelineDto {
  pipelineName: string;
  pipelineType: PipelineType;
  sourceTables: string[];
  targetTable: string;
  scheduleCron?: string;
  priority?: number;
  timeoutMinutes?: number;
  retryCount?: number;
  transformations?: Transformation[];
}

export interface UpdatePipelineDto {
  pipelineName?: string;
  sourceTables?: string[];
  targetTable?: string;
  scheduleCron?: string;
  isActive?: boolean;
  priority?: number;
  timeoutMinutes?: number;
  retryCount?: number;
  transformations?: Transformation[];
}

export interface CreateEtlExecutionDto {
  pipelineId: number;
  status: ExecutionStatus;
}

export interface UpdateEtlExecutionDto {
  status?: ExecutionStatus;
  completedAt?: Date;
  durationSeconds?: number;
  recordsProcessed?: number;
  recordsInserted?: number;
  recordsUpdated?: number;
  recordsDeleted?: number;
  recordsFailed?: number;
  errorMessage?: string;
  errorDetails?: Record<string, any>;
  executionLog?: string;
}

// ============================================================================
// QUERY PARAMS TYPES
// ============================================================================

export interface MetricsQueryParams {
  companyId: number;
  startDate: Date | string;
  endDate: Date | string;
  channels?: string[];
  agentIds?: number[];
  departmentIds?: number[];
  tags?: string[];
  groupBy?: 'hour' | 'day' | 'week' | 'month' | 'channel' | 'agent';
  includeProjections?: boolean;
  includeComparisons?: boolean;
}

export interface DateRange {
  startDate: Date | string;
  endDate: Date | string;
}

export interface WidgetDataParams {
  dataSource: string;
  query?: string;
  filters?: Record<string, any>;
  metrics?: Record<string, any>;
  dimensions?: Record<string, any>;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
}

export interface EnhanceOptions {
  calculateTrends?: boolean;
  calculateComparisons?: boolean;
  calculateProjections?: boolean;
  comparisonPeriod?: 'previous_period' | 'previous_year' | 'custom';
}

export interface EnhancedMetrics {
  current: any;
  previous?: any;
  trend?: TrendData;
  comparison?: ComparisonData;
  projections?: number[];
}

// ============================================================================
// VALIDATION & ERROR TYPES
// ============================================================================

export interface ValidationSchema {
  fields: Record<string, FieldValidation>;
}

export interface FieldValidation {
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  validRecords: any[];
  invalidRecords: any[];
}

export interface ValidationError {
  field: string;
  value: any;
  message: string;
  row?: number;
}

export interface DerivedField {
  name: string;
  formula: string;
  type: 'number' | 'string' | 'boolean';
}

export interface ExecutionMetrics {
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsDeleted?: number;
  recordsFailed?: number;
  duration: number;
}

// ============================================================================
// REPORT GENERATION TYPES
// ============================================================================

export interface ReportGenerationOptions {
  type: ReportType;
  data: any[];
  format: OutputFormat;
  template?: ReportTemplate;
  branding?: BrandingConfig;
  includeCharts?: boolean;
  includeSummary?: boolean;
}

export interface ReportTemplate {
  id: number;
  name: string;
  sections: ReportSection[];
  styles?: Record<string, any>;
}

export interface ReportSection {
  type: 'header' | 'summary' | 'table' | 'chart' | 'text' | 'footer';
  title?: string;
  content?: any;
  config?: Record<string, any>;
}

// ============================================================================
// UPDATE CALLBACK TYPE
// ============================================================================

export type UpdateCallback = (data: any) => void;

// ============================================================================
// ANOMALY TYPES
// ============================================================================

export interface AnomalyThreshold {
  upper: number;
  lower: number;
  method: 'std_dev' | 'iqr' | 'percentile';
}

export interface AnomalyAlert {
  event: AnalyticsEvent;
  metrics: RealTimeMetrics;
  threshold: AnomalyThreshold;
  severity: 'low' | 'medium' | 'high' | 'critical';
}
