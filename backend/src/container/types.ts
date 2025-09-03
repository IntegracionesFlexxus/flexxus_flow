// DI Container type identifiers - Sprint 1
// Estructura según requisitos del Sprint 1
const TYPES = {
  // Database Connections (5 bases de datos separadas)
  SharedConnection: Symbol.for('SharedConnection'),
  OmniConnection: Symbol.for('OmniConnection'),
  CrmConnection: Symbol.for('CrmConnection'),
  WorkflowConnection: Symbol.for('WorkflowConnection'),
  AnalyticsConnection: Symbol.for('AnalyticsConnection'),
  
  // Auth Module - Sprint 1
  AuthService: Symbol.for('AuthService'),
  UserService: Symbol.for('UserService'),
  CompanyService: Symbol.for('CompanyService'),
  UserRepository: Symbol.for('UserRepository'),
  CompanyRepository: Symbol.for('CompanyRepository'),
  AuthController: Symbol.for('AuthController'),
  
  // Omni Module - Sprint 1
  OmniChannelRepository: Symbol.for('OmniChannelRepository'),
  OmniChannelService: Symbol.for('OmniChannelService'),
  OmniController: Symbol.for('OmniController'),
  
  // CRM Module - Sprint 1
  ContactRepository: Symbol.for('ContactRepository'),
  ContactService: Symbol.for('ContactService'),
  CrmController: Symbol.for('CrmController'),
  
  // Workflow Module - Sprint 1
  WorkflowRepository: Symbol.for('WorkflowRepository'),
  WorkflowService: Symbol.for('WorkflowService'),
  WorkflowController: Symbol.for('WorkflowController'),
  
  // Analytics Module - Sprint 1
  AnalyticsRepository: Symbol.for('AnalyticsRepository'),
  AnalyticsService: Symbol.for('AnalyticsService'),
  AnalyticsController: Symbol.for('AnalyticsController'),
  
  // Shared Services
  Logger: Symbol.for('Logger'),
  EventBus: Symbol.for('EventBus'),
  CacheService: Symbol.for('CacheService'),
  ConfigService: Symbol.for('ConfigService'),
  
  // Configuration
  DatabaseConfig: Symbol.for('DatabaseConfig'),
  ServerConfig: Symbol.for('ServerConfig'),
  
  // Middleware
  AuthMiddleware: Symbol.for('AuthMiddleware'),
  ErrorMiddleware: Symbol.for('ErrorMiddleware'),
  LoggingMiddleware: Symbol.for('LoggingMiddleware'),
  RateLimitMiddleware: Symbol.for('RateLimitMiddleware'),
  
  // Utils
  HashUtil: Symbol.for('HashUtil'),
  TokenUtil: Symbol.for('TokenUtil')
};

export { TYPES };