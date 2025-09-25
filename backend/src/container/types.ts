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
  // Omni Module Services
  OmniChannelRepository: Symbol.for('OmniChannelRepository'),
  OmniChannelService: Symbol.for('OmniChannelService'),
  OmniController: Symbol.for('OmniController'),
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
  ActivityService: Symbol.for('ActivityService'),
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
  ApprovalService: Symbol.for('ApprovalService'),
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
  AnalyticsService: Symbol.for('AnalyticsService'),
  AnalyticsController: Symbol.for('AnalyticsController'),
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
  DataTransformer: Symbol.for('DataTransformer'),

  // Product & Quote Module (Sprint 20)
  ProductController: Symbol.for('ProductController'),
  QuoteController: Symbol.for('QuoteController'),
  ProductRepository: Symbol.for('ProductRepository'),
  QuoteRepository: Symbol.for('QuoteRepository'),
  ProductService: Symbol.for('ProductService'),
  QuoteService: Symbol.for('QuoteService'),
  PricingService: Symbol.for('PricingService'),
  ApprovalService: Symbol.for('ApprovalService'),

  // Sprint 17 - Advanced Account & Contact Management Services
  AccountHierarchyService: Symbol.for('AccountHierarchyService'),
  AccountHierarchyRepository: Symbol.for('AccountHierarchyRepository'),
  TerritoryManagementService: Symbol.for('TerritoryManagementService'),
  TerritoryRepository: Symbol.for('TerritoryRepository'),
  TerritoryController: Symbol.for('TerritoryController'),
  ContactRoleManagementService: Symbol.for('ContactRoleManagementService'),
  ContactRoleRepository: Symbol.for('ContactRoleRepository'),
  AccountHealthScoringService: Symbol.for('AccountHealthScoringService'),
  AccountHealthRepository: Symbol.for('AccountHealthRepository'),
  AdvancedSearchService: Symbol.for('AdvancedSearchService'),
  SearchController: Symbol.for('SearchController'),

  // Sprint 21 - Activities & Task Management
  CalendarIntegrationService: Symbol.for('CalendarIntegrationService'),
  TaskAutomationService: Symbol.for('TaskAutomationService'),
  CalendarController: Symbol.for('CalendarController'),
  ActivityTemplateRepository: Symbol.for('ActivityTemplateRepository'),
  CalendarIntegrationRepository: Symbol.for('CalendarIntegrationRepository'),
  TaskAutomationRepository: Symbol.for('TaskAutomationRepository'),

  // Sprint 22 - CRM Analytics & Integration
  AnalyticsService: Symbol.for('AnalyticsService'),
  ReportService: Symbol.for('ReportService'),
  KpiService: Symbol.for('KpiService'),
  DashboardService: Symbol.for('DashboardService'),
  ExportService: Symbol.for('ExportService'),
  ReportRepository: Symbol.for('ReportRepository'),
  KpiRepository: Symbol.for('KpiRepository'),
  DashboardRepository: Symbol.for('DashboardRepository'),
  ExportRepository: Symbol.for('ExportRepository'),
  IntegrationLogRepository: Symbol.for('IntegrationLogRepository'),
  AnalyticsController: Symbol.for('AnalyticsController'),
  ReportController: Symbol.for('ReportController'),
  ExportController: Symbol.for('ExportController'),

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
