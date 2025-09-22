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
OmniDbPool: Symbol.for('OmniDbPool'),  // Omni Repositories  ChannelRepository: Symbol.for('ChannelRepository'),  ConversationRepository: Symbol.for('ConversationRepository'),  MessageRepository: Symbol.for('MessageRepository'),  CustomerRepository: Symbol.for('CustomerRepository'),  TemplateRepository: Symbol.for('TemplateRepository'),  // Omni Services  ChannelService: Symbol.for('ChannelService'),  ConversationService: Symbol.for('ConversationService'),  MessageService: Symbol.for('MessageService'),  CustomerService: Symbol.for('CustomerService'),  TemplateService: Symbol.for('TemplateService'),  WebSocketService: Symbol.for('WebSocketService'),  // Omni Controllers  ChannelController: Symbol.for('ChannelController'),  ConversationController: Symbol.for('ConversationController'),  MessageController: Symbol.for('MessageController'),  CustomerController: Symbol.for('CustomerController'),  TemplateController: Symbol.for('TemplateController'),
  // CRM Module Services
  ContactRepository: Symbol.for('ContactRepository'),
  ContactService: Symbol.for('ContactService'),
  CrmController: Symbol.for('CrmController'),
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
  DataTransformer: Symbol.for('DataTransformer')
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
