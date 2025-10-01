/**
 * Inversify Types - Sprint 2
 * Siguiendo lineamientos nivel 2: definición de tipos para inyección de dependencias
 * Arquitectura de servicios con separación de capas
 */
export const TYPES = {
  // Core Infrastructure Services
  Logger: Symbol.for('Logger'),
  LoggerService: Symbol.for('LoggerService'), // New secure logger
  DataSource: Symbol.for('DataSource'),
  RedisClient: Symbol.for('RedisClient'),
  EventBus: Symbol.for('EventBus'),
  EventEmitter: Symbol.for('EventEmitter'),
  // Event System (Sprint 4)
  EventStore: Symbol.for('EventStore'),
  DeadLetterQueue: Symbol.for('DeadLetterQueue'),
  EventReplayManager: Symbol.for('EventReplayManager'),
  EnhancedEventBus: Symbol.for('EnhancedEventBus'),
  // WebSocket System (Sprint 4)
  WebSocketServer: Symbol.for('WebSocketServer'),
  ConnectionManager: Symbol.for('ConnectionManager'),
  NamespaceManager: Symbol.for('NamespaceManager'),
  HeartbeatManager: Symbol.for('HeartbeatManager'),
  // Database Connections (5 bases de datos separadas)
  SharedConnection: Symbol.for('SharedConnection'),
  OmniConnection: Symbol.for('OmniConnection'),
  CrmConnection: Symbol.for('CrmConnection'),
  WorkflowConnection: Symbol.for('WorkflowConnection'),
  AnalyticsConnection: Symbol.for('AnalyticsConnection'),
  DatabasePool: Symbol.for('DatabasePool'),
  DatabaseConnection: Symbol.for('DatabaseConnection'),
  // Configuration Services
  ConfigService: Symbol.for('ConfigService'),
  DatabaseConfig: Symbol.for('DatabaseConfig'),
  ServerConfig: Symbol.for('ServerConfig'),
  EnvironmentService: Symbol.for('EnvironmentService'),
  // Authentication & Authorization Services
  AuthService: Symbol.for('AuthService'),
  AuthenticationService: Symbol.for('AuthenticationService'),
  JwtService: Symbol.for('JwtService'),
  SessionService: Symbol.for('SessionService'),
  PasswordService: Symbol.for('PasswordService'),
  TokenService: Symbol.for('TokenService'),
  PermissionService: Symbol.for('PermissionService'),
  RoleService: Symbol.for('RoleService'),
  // Feature Flag Services
  FeatureFlagService: Symbol.for('FeatureFlagService'),
  FeatureFlagRepository: Symbol.for('FeatureFlagRepository'),
  FeatureFlagController: Symbol.for('FeatureFlagController'),
  FeatureFlagCacheManager: Symbol.for('FeatureFlagCacheManager'),
  FeatureFlagAnalyticsService: Symbol.for('FeatureFlagAnalyticsService'),
  RuleEvaluatorRegistry: Symbol.for('RuleEvaluatorRegistry'),
  UserAttributeRuleEvaluator: Symbol.for('UserAttributeRuleEvaluator'),
  UserSegmentRuleEvaluator: Symbol.for('UserSegmentRuleEvaluator'),
  PercentageRuleEvaluator: Symbol.for('PercentageRuleEvaluator'),
  TimeWindowRuleEvaluator: Symbol.for('TimeWindowRuleEvaluator'),
  GeoLocationRuleEvaluator: Symbol.for('GeoLocationRuleEvaluator'),
  DeviceRuleEvaluator: Symbol.for('DeviceRuleEvaluator'),
  CustomRuleEvaluator: Symbol.for('CustomRuleEvaluator'),
  // User Domain Services
  AuthUserService: Symbol.for('AuthUserService'),
  UserService: Symbol.for('UserService'),
  UserRepository: Symbol.for('UserRepository'),
  UserCompanyRepository: Symbol.for('UserCompanyRepository'),
  UserAuthRepository: Symbol.for('UserAuthRepository'),
  PasswordResetRepository: Symbol.for('PasswordResetRepository'),
  UserController: Symbol.for('UserController'),
  UserValidator: Symbol.for('UserValidator'),
  UserFactory: Symbol.for('UserFactory'),
  // Role Domain Services
  RoleRepository: Symbol.for('RoleRepository'),
  RoleController: Symbol.for('RoleController'),
  PermissionRepository: Symbol.for('PermissionRepository'),
  // Company Domain Services
  CompanyService: Symbol.for('CompanyService'),
  CompanyRepository: Symbol.for('CompanyRepository'),
  CompanyValidator: Symbol.for('CompanyValidator'),
  CompanyFactory: Symbol.for('CompanyFactory'),
  // Session Management
  SessionRepository: Symbol.for('SessionRepository'),
  SessionValidator: Symbol.for('SessionValidator'),
  // Omni Module Services - Sprint 05 Complete
  // Repositories
  OmniChannelRepository: Symbol.for('OmniChannelRepository'),
  OmniConversationRepository: Symbol.for('OmniConversationRepository'),
  OmniMessageRepository: Symbol.for('OmniMessageRepository'),
  OmniCustomerRepository: Symbol.for('OmniCustomerRepository'),
  OmniTemplateRepository: Symbol.for('OmniTemplateRepository'),
  OmniLandingPageRepository: Symbol.for('OmniLandingPageRepository'),
  OmniFormRepository: Symbol.for('OmniFormRepository'),
  OmniEmailEngagementRepository: Symbol.for('OmniEmailEngagementRepository'), // Sprint N+3

  // Services
  OmniChannelService: Symbol.for('OmniChannelService'),
  OmniConversationService: Symbol.for('OmniConversationService'),
  OmniMessageService: Symbol.for('OmniMessageService'),
  OmniCustomerService: Symbol.for('OmniCustomerService'),
  OmniTemplateService: Symbol.for('OmniTemplateService'),
  OmniWebSocketService: Symbol.for('OmniWebSocketService'),

  // Controllers
  OmniChannelController: Symbol.for('OmniChannelController'),
  OmniConversationController: Symbol.for('OmniConversationController'),
  OmniMessageController: Symbol.for('OmniMessageController'),
  OmniCustomerController: Symbol.for('OmniCustomerController'),
  OmniTemplateController: Symbol.for('OmniTemplateController'),
  OmniController: Symbol.for('OmniController'),

  // WebSocket Handlers
  OmniWebSocketHandler: Symbol.for('OmniWebSocketHandler'),

  // Sprint 06 Services
  OmniChannelHealthMonitor: Symbol.for('OmniChannelHealthMonitor'),
  OmniRateLimiter: Symbol.for('OmniRateLimiter'),
  OmniWebhookProcessor: Symbol.for('OmniWebhookProcessor'),
  OmniMessageQueue: Symbol.for('OmniMessageQueue'),

  // Sprint 07 Services - Automation & Rules
  OmniRuleEngine: Symbol.for('OmniRuleEngine'),
  OmniRuleRepository: Symbol.for('OmniRuleRepository'),
  OmniRuleEvaluator: Symbol.for('OmniRuleEvaluator'),
  OmniActionExecutor: Symbol.for('OmniActionExecutor'),
  OmniAutoResponseService: Symbol.for('OmniAutoResponseService'),
  OmniAutoResponseRepository: Symbol.for('OmniAutoResponseRepository'),
  OmniKeywordMatcher: Symbol.for('OmniKeywordMatcher'),
  OmniScheduleManager: Symbol.for('OmniScheduleManager'),
  OmniConversationRouter: Symbol.for('OmniConversationRouter'),
  OmniAgentAvailabilityService: Symbol.for('OmniAgentAvailabilityService'),
  OmniFlowEngine: Symbol.for('OmniFlowEngine'),
  OmniFlowRepository: Symbol.for('OmniFlowRepository'),
  OmniCRMIntegrationService: Symbol.for('OmniCRMIntegrationService'),
  OmniAutomationMetricsService: Symbol.for('OmniAutomationMetricsService'),

  // Sprint 08 Services - Analytics & Reporting (Legacy)
  RealTimeAnalytics: Symbol.for('RealTimeAnalytics'),
  ReportingService: Symbol.for('ReportingService'),
  OmniDashboardServiceLegacy: Symbol.for('OmniDashboardServiceLegacy'),
  KPIService: Symbol.for('KPIService'),
  PredictionEngine: Symbol.for('PredictionEngine'),
  DataPipeline: Symbol.for('DataPipeline'),

  // Sprint 09 Services - External Integrations & APIs
  IntegrationManager: Symbol.for('IntegrationManager'),
  OAuthService: Symbol.for('OAuthService'),
  SalesforceProvider: Symbol.for('SalesforceProvider'),
  HubSpotProvider: Symbol.for('HubSpotProvider'),
  GoogleCalendarProvider: Symbol.for('GoogleCalendarProvider'),
  S3Provider: Symbol.for('S3Provider'),
  WebhookManager: Symbol.for('WebhookManager'),
  ApiKeyService: Symbol.for('ApiKeyService'),
  IntegrationController: Symbol.for('IntegrationController'),

  // Sprint 12 Services - ML/AI Advanced Features
  // ML Core
  MLModelRepository: Symbol.for('MLModelRepository'),
  MLModelService: Symbol.for('MLModelService'),
  MLDeploymentRepository: Symbol.for('MLDeploymentRepository'),
  MLDeploymentService: Symbol.for('MLDeploymentService'),
  PredictionRepository: Symbol.for('PredictionRepository'),
  PredictionService: Symbol.for('PredictionService'),
  FeatureStoreRepository: Symbol.for('FeatureStoreRepository'),
  FeatureStoreService: Symbol.for('FeatureStoreService'),
  MLExperimentRepository: Symbol.for('MLExperimentRepository'),
  MLExperimentService: Symbol.for('MLExperimentService'),

  // NLP Services
  NLPModelRepository: Symbol.for('NLPModelRepository'),
  NLPModelService: Symbol.for('NLPModelService'),
  IntentClassificationService: Symbol.for('IntentClassificationService'),
  EntityExtractionService: Symbol.for('EntityExtractionService'),
  IntentPatternRepository: Symbol.for('IntentPatternRepository'),
  ConversationContextRepository: Symbol.for('ConversationContextRepository'),
  ConversationContextService: Symbol.for('ConversationContextService'),
  AIResponseTemplateRepository: Symbol.for('AIResponseTemplateRepository'),
  AIResponseGenerationService: Symbol.for('AIResponseGenerationService'),

  // AI Workflows
  AIWorkflowRepository: Symbol.for('AIWorkflowRepository'),
  AIWorkflowService: Symbol.for('AIWorkflowService'),
  AIWorkflowEngine: Symbol.for('AIWorkflowEngine'),
  WorkflowExecutionRepository: Symbol.for('WorkflowExecutionRepository'),
  DecisionRuleRepository: Symbol.for('DecisionRuleRepository'),
  DecisionRuleService: Symbol.for('DecisionRuleService'),
  MLBasedRuleEngine: Symbol.for('MLBasedRuleEngine'),

  // Predictive Analytics
  CustomerBehaviorPredictionService: Symbol.for('CustomerBehaviorPredictionService'),
  CustomerPredictionRepository: Symbol.for('CustomerPredictionRepository'),
  AnomalyDetectionService: Symbol.for('AnomalyDetectionService'),
  AnomalyRepository: Symbol.for('AnomalyRepository'),
  DemandForecastingService: Symbol.for('DemandForecastingService'),
  ForecastRepository: Symbol.for('ForecastRepository'),

  // Cognitive Services
  DocumentAIService: Symbol.for('DocumentAIService'),
  DocumentAIRepository: Symbol.for('DocumentAIRepository'),
  VoiceAnalyticsService: Symbol.for('VoiceAnalyticsService'),
  VoiceAnalyticsRepository: Symbol.for('VoiceAnalyticsRepository'),
  KnowledgeGraphService: Symbol.for('KnowledgeGraphService'),
  KnowledgeGraphRepository: Symbol.for('KnowledgeGraphRepository'),

  // ML Monitoring
  ModelPerformanceMonitoringService: Symbol.for('ModelPerformanceMonitoringService'),
  ModelMonitoringRepository: Symbol.for('ModelMonitoringRepository'),
  DataDriftDetectionService: Symbol.for('DataDriftDetectionService'),
  DriftDetectionRepository: Symbol.for('DriftDetectionRepository'),
  ABTestingService: Symbol.for('ABTestingService'),
  ABTestRepository: Symbol.for('ABTestRepository'),

  // Controllers Sprint 12
  MLModelController: Symbol.for('MLModelController'),
  PredictionController: Symbol.for('PredictionController'),
  NLPController: Symbol.for('NLPController'),
  AIWorkflowController: Symbol.for('AIWorkflowController'),
  DecisionRuleController: Symbol.for('DecisionRuleController'),
  PredictiveAnalyticsController: Symbol.for('PredictiveAnalyticsController'),
  CognitiveController: Symbol.for('CognitiveController'),
  MLMonitoringController: Symbol.for('MLMonitoringController'),

  // Sprint 13 Services - Analytics & Reporting Module (Omni)
  // Analytics Services
  OmniAnalyticsService: Symbol.for('OmniAnalyticsService'),
  OmniAnalyticsDashboardService: Symbol.for('OmniAnalyticsDashboardService'),
  OmniAnalyticsReportService: Symbol.for('OmniAnalyticsReportService'),
  OmniAnalyticsKpiService: Symbol.for('OmniAnalyticsKpiService'),
  AnalyticsEtlService: Symbol.for('AnalyticsEtlService'),
  AnalyticsExportService: Symbol.for('AnalyticsExportService'),
  WidgetDataService: Symbol.for('WidgetDataService'),

  // Analytics Repositories
  DataMartRepository: Symbol.for('DataMartRepository'),
  AnalyticsDashboardRepository: Symbol.for('AnalyticsDashboardRepository'),
  AnalyticsReportRepository: Symbol.for('AnalyticsReportRepository'),
  AnalyticsKpiRepository: Symbol.for('AnalyticsKpiRepository'),
  EtlPipelineRepository: Symbol.for('EtlPipelineRepository'),
  WidgetRepository: Symbol.for('WidgetRepository'),

  // Analytics Engines
  CalculationEngine: Symbol.for('CalculationEngine'),
  AggregationEngine: Symbol.for('AggregationEngine'),
  StreamProcessor: Symbol.for('StreamProcessor'),
  ReportGenerator: Symbol.for('ReportGenerator'),

  // ETL Components
  PipelineManager: Symbol.for('PipelineManager'),
  DataExtractor: Symbol.for('DataExtractor'),
  DataTransformer: Symbol.for('DataTransformer'),
  DataLoader: Symbol.for('DataLoader'),

  // Analytics Controllers
  OmniAnalyticsController: Symbol.for('OmniAnalyticsController'),
  OmniAnalyticsDashboardController: Symbol.for('OmniAnalyticsDashboardController'),
  OmniAnalyticsReportController: Symbol.for('OmniAnalyticsReportController'),
  OmniAnalyticsKpiController: Symbol.for('OmniAnalyticsKpiController'),

  // CRM Module Services
  CRMDatabaseConnection: Symbol.for('CRMDatabaseConnection'),
  LeadRepository: Symbol.for('LeadRepository'),
  LeadService: Symbol.for('LeadService'),
  LeadScoringService: Symbol.for('LeadScoringService'),
  ConversionService: Symbol.for('ConversionService'),
  AccountRepository: Symbol.for('AccountRepository'),
  AccountService: Symbol.for('AccountService'),
  ContactRepository: Symbol.for('ContactRepository'),
  ContactService: Symbol.for('ContactService'),
  OpportunityRepository: Symbol.for('OpportunityRepository'),
  OpportunityService: Symbol.for('OpportunityService'),
  ActivityRepository: Symbol.for('ActivityRepository'),
  ActivityTemplateRepository: Symbol.for('ActivityTemplateRepository'), // Sprint 21
  TaskAutomationRepository: Symbol.for('TaskAutomationRepository'), // Sprint 21
  CalendarIntegrationRepository: Symbol.for('CalendarIntegrationRepository'), // Sprint 21
  CalendarIntegrationService: Symbol.for('CalendarIntegrationService'), // Sprint 21
  TaskAutomationService: Symbol.for('TaskAutomationService'), // Sprint 21
  ActivityService: Symbol.for('ActivityService'),
  AdvancedSearchService: Symbol.for('AdvancedSearchService'), // Sprint 22
  ReferenceDataRepository: Symbol.for('ReferenceDataRepository'),
  LeadController: Symbol.for('LeadController'),
  AccountController: Symbol.for('AccountController'),
  ContactController: Symbol.for('ContactController'),
  OpportunityController: Symbol.for('OpportunityController'),
  ActivityController: Symbol.for('ActivityController'),
  CrmController: Symbol.for('CrmController'),
  // Product & Quote Module Services (Sprint 20)
  ProductController: Symbol.for('ProductController'),
  QuoteController: Symbol.for('QuoteController'),
  ProductRepository: Symbol.for('ProductRepository'),
  QuoteRepository: Symbol.for('QuoteRepository'),
  ProductService: Symbol.for('ProductService'),
  QuoteService: Symbol.for('QuoteService'),
  PricingService: Symbol.for('PricingService'),
  DynamicPricingEngine: Symbol.for('DynamicPricingEngine'), // Sprint 20
  ApprovalService: Symbol.for('ApprovalService'),
  ApprovalRepository: Symbol.for('ApprovalRepository'), // Sprint 20
  ApprovalWorkflowService: Symbol.for('ApprovalWorkflowService'), // Sprint 20
  // Product & Quote - Additional Repositories (Sprint 20)
  ProductCategoryRepository: Symbol.for('ProductCategoryRepository'),
  QuoteLineItemRepository: Symbol.for('QuoteLineItemRepository'),
  PricingRepository: Symbol.for('PricingRepository'),
  PricingRuleRepository: Symbol.for('PricingRuleRepository'), // Sprint 20
  CategoryRepository: Symbol.for('CategoryRepository'), // Sprint 20
  // Product & Quote - Additional Controllers (Sprint 20)
  ProductCategoryController: Symbol.for('ProductCategoryController'),
  PricingController: Symbol.for('PricingController'),
  // Product & Quote - Additional Services (Sprint 20)
  ProductCatalogService: Symbol.for('ProductCatalogService'),
  QuoteBuilderService: Symbol.for('QuoteBuilderService'),
  QuoteManagementService: Symbol.for('QuoteManagementService'),
  // Product & Quote - Document Services (Sprint 20)
  DocumentGenerationService: Symbol.for('DocumentGenerationService'),
  DocumentTemplateRepository: Symbol.for('DocumentTemplateRepository'),
  // Product & Quote - Pricing Services (Sprint 20)
  PromotionService: Symbol.for('PromotionService'),
  PromotionController: Symbol.for('PromotionController'),
  // Product & Quote - Catalog Services (Sprint 20)
  ProductCategoryService: Symbol.for('ProductCategoryService'),

  // Sprint 16 - Lead Management Services
  ScoringEngineService: Symbol.for('ScoringEngineService'),
  AssignmentRuleEngine: Symbol.for('AssignmentRuleEngine'),
  DuplicateDetectorService: Symbol.for('DuplicateDetectorService'),
  OmniChannelIntegrationService: Symbol.for('OmniChannelIntegrationService'),
  LeadManagementController: Symbol.for('LeadManagementController'),

  // Sprint N+1 - CRM-Omni Integration
  CRMIntegrationController: Symbol.for('CRMIntegrationController'),

  // Sprint 17 CRM Extended Services
  AccountHierarchyService: Symbol.for('AccountHierarchyService'),
  TerritoryManagementService: Symbol.for('TerritoryManagementService'),
  AccountHealthScoringService: Symbol.for('AccountHealthScoringService'),
  ContactRoleManagementService: Symbol.for('ContactRoleManagementService'),
  CalendarController: Symbol.for('CalendarController'),
  // Workflow Module Services
  WorkflowRepository: Symbol.for('WorkflowRepository'),
  WorkflowService: Symbol.for('WorkflowService'),
  WorkflowController: Symbol.for('WorkflowController'),
  // Analytics Module Services
  AnalyticsRepository: Symbol.for('AnalyticsRepository'),
  // Enhanced Services (Sprint 4)
  EnhancedCacheService: Symbol.for('EnhancedCacheService'),
  EnhancedValidatorService: Symbol.for('EnhancedValidatorService'),
  EnhancedEmailService: Symbol.for('EnhancedEmailService'),
  EnhancedBaseService: Symbol.for('EnhancedBaseService'),
  // Repository Pattern Services (Sprint 4)
  DataMapper: Symbol.for('DataMapper'),
  QueryBuilder: Symbol.for('QueryBuilder'),
  SpecificationBuilder: Symbol.for('SpecificationBuilder'),
  // Audit & Logging Services
  AuditService: Symbol.for('AuditService'),
  AuditRepository: Symbol.for('AuditRepository'),
  StructuredLogger: Symbol.for('StructuredLogger'),
  LoggingContextService: Symbol.for('LoggingContextService'),
  // Email & Notification Services
  EmailService: Symbol.for('EmailService'),
  NotificationService: Symbol.for('NotificationService'),
  SmsService: Symbol.for('SmsService'),
  PushNotificationService: Symbol.for('PushNotificationService'),
  // Cache Services
  CacheService: Symbol.for('CacheService'),
  CacheManager: Symbol.for('CacheManager'),
  // Rate Limiting Services
  RateLimiterService: Symbol.for('RateLimiterService'),
  RateLimiterStore: Symbol.for('RateLimiterStore'),
  // Transaction Management
  TransactionManager: Symbol.for('TransactionManager'),
  UnitOfWork: Symbol.for('UnitOfWork'),
  // Validation Services
  ValidationService: Symbol.for('ValidationService'),
  SchemaValidator: Symbol.for('SchemaValidator'),
  // Security Services
  EncryptionService: Symbol.for('EncryptionService'),
  HashingService: Symbol.for('HashingService'),
  SecurityService: Symbol.for('SecurityService'),
  HashUtil: Symbol.for('HashUtil'),
  TokenUtil: Symbol.for('TokenUtil'),
  // File Services
  FileService: Symbol.for('FileService'),
  StorageService: Symbol.for('StorageService'),
  ImageProcessingService: Symbol.for('ImageProcessingService'),
  // Integration Services
  WebhookService: Symbol.for('WebhookService'),
  ApiClientService: Symbol.for('ApiClientService'),
  // Background Job Services
  QueueService: Symbol.for('QueueService'),
  JobScheduler: Symbol.for('JobScheduler'),
  WorkerService: Symbol.for('WorkerService'),
  // Metrics & Monitoring
  MetricsService: Symbol.for('MetricsService'),
  HealthCheckService: Symbol.for('HealthCheckService'),
  PerformanceMonitor: Symbol.for('PerformanceMonitor'),
  // Factory Services
  ServiceFactory: Symbol.for('ServiceFactory'),
  RepositoryFactory: Symbol.for('RepositoryFactory'),
  ValidatorFactory: Symbol.for('ValidatorFactory'),
  // Middleware Services
  AuthMiddleware: Symbol.for('AuthMiddleware'),
  ErrorMiddleware: Symbol.for('ErrorMiddleware'),
  LoggingMiddleware: Symbol.for('LoggingMiddleware'),
  RateLimitMiddleware: Symbol.for('RateLimitMiddleware'),
  MiddlewareFactory: Symbol.for('MiddlewareFactory'),
  RequestContextService: Symbol.for('RequestContextService'),
  // Controller Services
  AuthController: Symbol.for('AuthController'),
  CompanyController: Symbol.for('CompanyController'),
  // Database Services
  DatabaseService: Symbol.for('DatabaseService'),
  MigrationService: Symbol.for('MigrationService'),
  SeederService: Symbol.for('SeederService'),
  // Testing Services (only in test environment)
  MockFactory: Symbol.for('MockFactory'),
  TestDataBuilder: Symbol.for('TestDataBuilder'),
  TestHelper: Symbol.for('TestHelper'),
  // Cross-Module Validation Services (Sprint 4)
  CrossModuleValidator: Symbol.for('CrossModuleValidator'),
  BusinessRuleValidator: Symbol.for('BusinessRuleValidator'),
  ValidationTriggerManager: Symbol.for('ValidationTriggerManager'),
  ConstraintValidator: Symbol.for('ConstraintValidator'),
  ConsistencyChecker: Symbol.for('ConsistencyChecker'),
  // Migration Framework Services (Sprint 4)
  MigrationManager: Symbol.for('MigrationManager'),
  MigrationVersion: Symbol.for('MigrationVersion'),


  // Sprint 22 - CRM Analytics & Integration
  CRMAnalyticsService: Symbol.for('CRMAnalyticsService'),
  CRMReportService: Symbol.for('CRMReportService'),
  CRMKpiService: Symbol.for('CRMKpiService'),
  CRMDashboardService: Symbol.for('CRMDashboardService'),
  CRMExportService: Symbol.for('CRMExportService'),
  CRMReportRepository: Symbol.for('CRMReportRepository'),
  CRMKpiRepository: Symbol.for('CRMKpiRepository'),
  CRMDashboardRepository: Symbol.for('CRMDashboardRepository'),
  CRMExportRepository: Symbol.for('CRMExportRepository'),
  CRMIntegrationLogRepository: Symbol.for('CRMIntegrationLogRepository'),
  CRMAnalyticsController: Symbol.for('CRMAnalyticsController'),
  CRMReportController: Symbol.for('CRMReportController'),
  CRMExportController: Symbol.for('CRMExportController'),

  // Standalone symbols (used in some Sprint 20-22 services)
  ReportRepository: Symbol.for('ReportRepository'),
  KpiRepository: Symbol.for('KpiRepository'),
  DashboardRepository: Symbol.for('DashboardRepository'),
  ExportRepository: Symbol.for('ExportRepository'),
  ExportService: Symbol.for('ExportService'),
  IntegrationLogRepository: Symbol.for('IntegrationLogRepository'),

  // Cross-Database Services
  CrossDatabaseService: Symbol.for('CrossDatabaseService'),
  UserDataProvider: Symbol.for('UserDataProvider'),
  CompanyDataProvider: Symbol.for('CompanyDataProvider')
};
/**
 * Service identifiers for multi-injection
 */
export const SERVICE_IDENTIFIER = {
  Repository: Symbol.for('Repository'),
  Service: Symbol.for('Service'),
  Validator: Symbol.for('Validator'),
  Middleware: Symbol.for('Middleware'),
  Controller: Symbol.for('Controller'),
  Factory: Symbol.for('Factory'),
  EventHandler: Symbol.for('EventHandler'),
  CommandHandler: Symbol.for('CommandHandler'),
  QueryHandler: Symbol.for('QueryHandler')
};
/**
 * Metadata keys for decorators
 */
export const METADATA_KEY = {
  Controller: 'controller',
  Method: 'method',
  Path: 'path',
  Middleware: 'middleware',
  Validator: 'validator',
  Transactional: 'transactional',
  Cacheable: 'cacheable',
  Authenticated: 'authenticated',
  Authorized: 'authorized',
  RateLimit: 'rateLimit',
  Audit: 'audit',
  Log: 'log',
  Performance: 'performance',
  Retry: 'retry',
  Timeout: 'timeout',
  Circuit: 'circuit'
};
