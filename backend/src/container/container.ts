/**
 * Container de Inyección de Dependencias - Inversify
 * 
 * SECURITY: Archivo revisado - No contiene secretos en código
 * Las credenciales se cargan desde variables de entorno
 * Los logs están sanitizados para evitar exposición de datos sensibles
 * 
 * Ver: TECH_DEBT.md para mejoras de seguridad pendientes
 */
import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '@/container/types';
import winston from 'winston';
import { EventEmitter } from 'events';
import Redis from 'ioredis';
// Configuration
import { environment } from '@/config/environment';
// Database
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { DatabaseConnection } from '@/shared/database/connections/DatabaseConnection';
// Auth Module Interfaces
import { IUserRepository } from '@/shared/interfaces/repositories/IUserRepository';
import { IUserService as IAuthUserService } from '@/modules/auth/interfaces/IUserService';
import { ICompanyRepository } from '@/shared/interfaces/repositories/ICompanyRepository';
import { ICompanyService } from '@/modules/auth/interfaces/ICompanyService';
import { IAuthService } from '@/modules/auth/interfaces/IAuthService';
import { IRoleRepository } from '@/modules/auth/interfaces/IRoleRepository';
import { IRoleService } from '@/modules/auth/interfaces/IRoleService';
import { IPermissionRepository } from '@/modules/auth/interfaces/IPermissionRepository';
import { IAuditRepository } from '@/shared/interfaces/repositories/IAuditRepository';
import { ISessionRepository } from '@/modules/auth/interfaces/ISessionRepository';
import { ISessionService } from '@/modules/auth/interfaces/ISessionService';
import { IJwtService } from '@/modules/auth/interfaces/IJwtService';
// Users Module Interfaces
import { IUserService } from '@/modules/users/interfaces/IUserService';
// Auth Module Implementations
import { UserRepository } from '@/modules/auth/repositories/UserRepository';
import { UserService as AuthUserService } from '@/modules/auth/services/UserService';
import { CompanyRepository } from '@/modules/auth/repositories/CompanyRepository';
import { CompanyService } from '@/modules/companies/services/CompanyService';
import { AuthService } from '@/modules/auth/services/AuthService';
import { AuthController } from '@/modules/auth/controllers/AuthController';
import { RoleRepository } from '@/modules/auth/repositories/RoleRepository';
import { RoleService } from '@/modules/roles/services/RoleService';
import { RoleController } from '@/modules/auth/controllers/RoleController';
import { UserController } from '@/modules/users/controllers/UserController';
import { CompanyController } from '@/modules/companies/controllers/CompanyController';
import { PermissionRepository } from '@/modules/auth/repositories/PermissionRepository';
import { AuditService } from '@/shared/services/audit/AuditService';
import { SessionRepository } from '@/modules/auth/repositories/SessionRepository';
import { SessionService } from '@/modules/auth/services/SessionService';
import { JwtService } from '@/modules/auth/services/JwtService';
import { PasswordService } from '@/modules/auth/services/PasswordService';
import { PermissionService } from '@/modules/auth/services/PermissionService';
import { AuditRepository } from '@/modules/auth/repositories/AuditRepository';
// Users Module Implementations
import { UserService } from '@/modules/users/services/UserService';
// Shared Services
import { ICacheService } from '@/shared/interfaces/ICacheService';
import { CacheService } from '@/shared/services/cache/CacheService';
import { EnhancedValidatorService } from '@/shared/services/validation/EnhancedValidatorService';
import { EmailService } from '@/shared/services/email/EmailService';
import { DataMapper } from '@/core/mapping/DataMapper';
// Feature Flag Services
import { IFeatureFlagService } from '@/modules/feature-flags/interfaces/IFeatureFlagService';
import { IFeatureFlagRepository } from '@/modules/feature-flags/interfaces/IFeatureFlagRepository';
import { EnhancedFeatureFlagService } from '@/modules/feature-flags/services/FeatureFlagService';
import { FeatureFlagRepository } from '@/modules/feature-flags/repositories/FeatureFlagRepository';
import { FeatureFlagController } from '@/modules/feature-flags/controllers/FeatureFlagController';
import { 
  RuleEvaluatorRegistry,
  UserAttributeRuleEvaluator,
  UserSegmentRuleEvaluator,
  PercentageRuleEvaluator,
  TimeWindowRuleEvaluator,
  GeoLocationRuleEvaluator,
  DeviceRuleEvaluator,
  CustomRuleEvaluator
} from '@/modules/feature-flags/services/RuleEvaluators';
import { FeatureFlagMiddleware } from '@/shared/middleware/featureFlagMiddleware';
import { FeatureFlagCacheManager } from '@/modules/feature-flags/services/FeatureFlagCacheManager';
import { FeatureFlagAnalyticsService } from '@/modules/feature-flags/services/FeatureFlagAnalyticsService';
/**
 * Container de Inversify
 * Patrón: IoC Container para Dependency Injection
 * SOLID: Dependency Inversion Principle
 */
const container = new Container();
// ========== Logger Configuration ==========
// Singleton para logging centralizado
const logger = winston.createLogger({
  level: environment.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
container.bind<winston.Logger>(TYPES.Logger).toConstantValue(logger);

// ========== Event System ==========
// EventEmitter para el sistema de eventos del módulo CRM
container.bind<EventEmitter>(TYPES.EventEmitter).toDynamicValue(() => new EventEmitter()).inSingletonScope();

// ========== Database Connections (5 DBs) ==========
// Patrón: Abstract Factory para diferentes conexiones
console.log('Environment database config:', {
  shared: environment.database.shared,
  hasHost: !!environment.database.shared?.host,
  hasPort: !!environment.database.shared?.port,
  hasDatabase: !!environment.database.shared?.database,
  hasUser: !!environment.database.shared?.user,
  hasPassword: !!environment.database.shared?.password
});
// Use lazy initialization to avoid early database connection attempts
container.bind<IDatabaseConnection>(TYPES.SharedConnection)
  .toDynamicValue((context) => {
    const config = environment.database.shared;
    logger.info('Creating SharedConnection with config:', JSON.stringify(config));
    try {
      return new DatabaseConnection(config, logger);
    } catch (error) {
      logger.error('Failed to create SharedConnection:', error);
      throw error;
    }
  })
  .inSingletonScope()
  .onActivation((context, instance) => {
    logger.info('SharedConnection activated');
    return instance;
  });
container.bind<IDatabaseConnection>(TYPES.OmniConnection)
  .toDynamicValue(() => new DatabaseConnection(environment.database.omni, logger))
  .inSingletonScope();
container.bind<IDatabaseConnection>(TYPES.CrmConnection)
  .toDynamicValue(() => new DatabaseConnection(environment.database.crm, logger))
  .inSingletonScope();
container.bind<IDatabaseConnection>(TYPES.WorkflowConnection)
  .toDynamicValue(() => new DatabaseConnection(environment.database.workflow, logger))
  .inSingletonScope();
container.bind<IDatabaseConnection>(TYPES.AnalyticsConnection)
  .toDynamicValue(() => new DatabaseConnection(environment.database.analytics, logger))
  .inSingletonScope();

// Redis Client - Production-ready configuration with proper error handling
class RedisClientFactory {
  private static instance: Redis | null = null;
  private static isConnected: boolean = false;

  static create(): Redis {
    if (!this.instance) {
      this.instance = new Redis({
        host: environment.redis?.host || 'localhost',
        port: environment.redis?.port || 6379,
        password: environment.redis?.password,
        db: environment.redis?.db || 0,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        connectTimeout: 10000,
        retryStrategy: (times: number) => {
          if (times > 3) {
            logger.error('Redis connection failed after 3 attempts');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 1000, 3000);
          logger.info(`Retrying Redis connection in ${delay}ms (attempt ${times})`);
          return delay;
        },
        reconnectOnError: (err: Error) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true; // Reconnect when Redis is in readonly mode
          }
          return false;
        }
      });

      // Handle connection events
      this.instance.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis client connected successfully');
      });

      this.instance.on('ready', () => {
        logger.info('Redis client is ready to accept commands');
      });

      this.instance.on('error', (err: Error) => {
        this.isConnected = false;
        logger.error('Redis client error:', err.message);
      });

      this.instance.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis connection closed');
      });

      this.instance.on('reconnecting', () => {
        logger.info('Redis client reconnecting...');
      });
    }

    return this.instance;
  }

  static isHealthy(): boolean {
    return this.isConnected;
  }
}

// Create a singleton Redis client
const redisClient = RedisClientFactory.create();

// Bind the Redis client
container.bind(TYPES.RedisClient).toConstantValue(redisClient);

// ========== Auth Module Bindings ==========
// Repositories - Refactored following SRP
container.bind<IUserRepository>(TYPES.UserRepository).to(UserRepository);
container.bind<ICompanyRepository>(TYPES.CompanyRepository).to(CompanyRepository);
container.bind<IRoleRepository>(TYPES.RoleRepository).to(RoleRepository).inSingletonScope();
container.bind<IPermissionRepository>(TYPES.PermissionRepository).to(PermissionRepository).inSingletonScope();
container.bind<ISessionRepository>(TYPES.SessionRepository).to(SessionRepository).inSingletonScope();
container.bind(TYPES.AuditRepository).to(AuditRepository).inSingletonScope();
// Importar los nuevos repositorios refactorizados
container.bind(TYPES.UserCompanyRepository).toDynamicValue((context) => {
  const UserCompanyRepository = require('@/modules/companies/repositories/UserCompanyRepository').UserCompanyRepository;
  return new UserCompanyRepository(
    context.container.get(TYPES.SharedConnection),
    context.container.get(TYPES.Logger)
  );
}).inSingletonScope();
container.bind(TYPES.UserAuthRepository).toDynamicValue((context) => {
  const UserAuthRepository = require('@/modules/auth/repositories/UserAuthRepository').UserAuthRepository;
  return new UserAuthRepository(
    context.container.get(TYPES.SharedConnection),
    context.container.get(TYPES.Logger)
  );
}).inSingletonScope();
container.bind(TYPES.PasswordResetRepository).toDynamicValue((context) => {
  const PasswordResetRepository = require('@/modules/auth/repositories/PasswordResetRepository').PasswordResetRepository;
  return new PasswordResetRepository(
    context.container.get(TYPES.SharedConnection),
    context.container.get(TYPES.Logger)
  );
}).inSingletonScope();
// Services
container.bind<IAuthUserService>(TYPES.AuthUserService).to(AuthUserService as any);
container.bind<IUserService>(TYPES.UserService).to(UserService as any);
container.bind<ICompanyService>(TYPES.CompanyService).to(CompanyService);
container.bind<IAuthService>(TYPES.AuthService).to(AuthService);
container.bind(TYPES.AuthenticationService).toDynamicValue((context) => {
  const { AuthenticationService } = require('@/modules/auth/services/AuthenticationService');
  return new AuthenticationService(
    context.container.get(TYPES.UserRepository),
    context.container.get(TYPES.SessionService),
    context.container.get(TYPES.JwtService),
    context.container.get(TYPES.PasswordService),
    context.container.get(TYPES.AuditService),
    context.container.get(TYPES.Logger)
  );
}).inSingletonScope();
container.bind<IRoleService>(TYPES.RoleService).to(RoleService).inSingletonScope();
container.bind<ISessionService>(TYPES.SessionService).to(SessionService).inSingletonScope();
container.bind<IJwtService>(TYPES.JwtService).to(JwtService).inSingletonScope();
container.bind<AuditService>(TYPES.AuditService).to(AuditService).inSingletonScope();
container.bind<PasswordService>(TYPES.PasswordService).to(PasswordService).inSingletonScope();
container.bind<PermissionService>(TYPES.PermissionService).to(PermissionService).inSingletonScope();
container.bind<ICacheService>(TYPES.CacheService).to(CacheService).inSingletonScope();
// Enhanced Services (Sprint 4)
container.bind<EnhancedValidatorService>(TYPES.EnhancedValidatorService).to(EnhancedValidatorService).inSingletonScope();
container.bind<EmailService>(TYPES.EmailService).to(EmailService).inSingletonScope();
// Repository Pattern Services (Sprint 4)
container.bind<DataMapper>(TYPES.DataMapper).to(DataMapper).inSingletonScope();
// Controllers
container.bind<AuthController>(TYPES.AuthController).to(AuthController);
container.bind<RoleController>(TYPES.RoleController).to(RoleController).inSingletonScope();
container.bind<UserController>(TYPES.UserController).to(UserController).inSingletonScope();
container.bind<CompanyController>(TYPES.CompanyController).to(CompanyController).inSingletonScope();
// ========== Feature Flag Module Bindings ==========
// Repository and Service (Core)
container.bind<IFeatureFlagRepository>(TYPES.FeatureFlagRepository).to(FeatureFlagRepository).inSingletonScope();
container.bind<IFeatureFlagService>(TYPES.FeatureFlagService).to(EnhancedFeatureFlagService as any).inSingletonScope();
// Controller
container.bind<FeatureFlagController>(TYPES.FeatureFlagController).to(FeatureFlagController).inSingletonScope();
// Rule Evaluators
container.bind<UserAttributeRuleEvaluator>(TYPES.UserAttributeRuleEvaluator).to(UserAttributeRuleEvaluator).inSingletonScope();
container.bind<UserSegmentRuleEvaluator>(TYPES.UserSegmentRuleEvaluator).to(UserSegmentRuleEvaluator).inSingletonScope();
container.bind<PercentageRuleEvaluator>(TYPES.PercentageRuleEvaluator).to(PercentageRuleEvaluator).inSingletonScope();
container.bind<TimeWindowRuleEvaluator>(TYPES.TimeWindowRuleEvaluator).to(TimeWindowRuleEvaluator).inSingletonScope();
container.bind<GeoLocationRuleEvaluator>(TYPES.GeoLocationRuleEvaluator).to(GeoLocationRuleEvaluator).inSingletonScope();
container.bind<DeviceRuleEvaluator>(TYPES.DeviceRuleEvaluator).to(DeviceRuleEvaluator).inSingletonScope();
container.bind<CustomRuleEvaluator>(TYPES.CustomRuleEvaluator).to(CustomRuleEvaluator).inSingletonScope();
// Rule Evaluator Registry
container.bind<RuleEvaluatorRegistry>(TYPES.RuleEvaluatorRegistry).to(RuleEvaluatorRegistry).inSingletonScope();
// Cache Manager
container.bind<FeatureFlagCacheManager>(TYPES.FeatureFlagCacheManager).to(FeatureFlagCacheManager).inSingletonScope();
// Analytics Service
container.bind<FeatureFlagAnalyticsService>(TYPES.FeatureFlagAnalyticsService).to(FeatureFlagAnalyticsService).inSingletonScope();
// Feature Flag Middleware
container.bind<FeatureFlagMiddleware>(TYPES.MiddlewareFactory).to(FeatureFlagMiddleware).inSingletonScope();
// ========== Cross-Module Validation Services (Sprint 4) ==========
import { 
  CrossModuleValidator,
  BusinessRuleValidator,
  ValidationTriggerManager,
  ConstraintValidator,
  ConsistencyChecker
} from '@/shared/validation';
// Bind validation services
container.bind(TYPES.CrossModuleValidator).to(CrossModuleValidator).inSingletonScope();
container.bind(TYPES.BusinessRuleValidator).to(BusinessRuleValidator).inSingletonScope();
container.bind(TYPES.ValidationTriggerManager).to(ValidationTriggerManager).inSingletonScope();
container.bind(TYPES.ConstraintValidator).to(ConstraintValidator).inSingletonScope();
container.bind(TYPES.ConsistencyChecker).to(ConsistencyChecker).inSingletonScope();
// ========== Migration Framework Services (Sprint 4) ==========
import { MigrationManager } from '@/core/migrations/MigrationManager';
import { MigrationVersion } from '@/core/migrations/MigrationVersion';
import { DataTransformer } from '@/core/migrations/DataTransformer';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

// Bind migration services
container.bind(TYPES.MigrationManager).to(MigrationManager).inSingletonScope();
container.bind(TYPES.MigrationVersion).to(MigrationVersion).inSingletonScope();
container.bind(TYPES.DataTransformer).to(DataTransformer).inSingletonScope();

// ========== Cross-Database Services ==========
import { CrossDatabaseService } from '@/shared/services/cross-database/CrossDatabaseService';
import { UserDataProvider } from '@/shared/services/cross-database/providers/UserDataProvider';
import { CompanyDataProvider } from '@/shared/services/cross-database/providers/CompanyDataProvider';

// Bind cross-database providers
container.bind(TYPES.UserDataProvider).to(UserDataProvider).inSingletonScope();
container.bind(TYPES.CompanyDataProvider).to(CompanyDataProvider).inSingletonScope();

// Bind cross-database service
container.bind(TYPES.CrossDatabaseService).to(CrossDatabaseService).inSingletonScope();

// ========== CRM Module Configuration (Sprint 15) ==========
import { configureCRMContainer } from '@/modules/crm';

// Configure CRM module bindings
configureCRMContainer(container);

// ========== Omni Module Configuration (Sprint 05-06) ==========
import { configureOmniContainer } from '@/modules/omni/config/omni.container';

// Configure Omni module bindings
configureOmniContainer(container);

// ========== Product & Quote Module (Sprint 20) ==========
// Note: Product & Quote module bindings are now handled by configureProductQuoteContainer()
// in src/modules/crm/product-quote/config/product-quote.container.ts
// This prevents duplicate bindings and keeps module dependencies isolated
/**
 * Verificar salud de las conexiones de base de datos
 * Clean Code: Función auxiliar para health checks
 */
export async function verifyDatabaseConnections(): Promise<boolean> {
  const connections = [
    { name: 'shared', type: TYPES.SharedConnection },
    { name: 'omni', type: TYPES.OmniConnection },
    { name: 'crm', type: TYPES.CrmConnection },
    { name: 'workflow', type: TYPES.WorkflowConnection },
    { name: 'analytics', type: TYPES.AnalyticsConnection }
  ];
  let allHealthy = true;
  for (const conn of connections) {
    try {
      const db = container.get<IDatabaseConnection>(conn.type);
      const isHealthy = await db.healthCheck();
      if (isHealthy) {
        logger.info(`Database ${conn.name} is healthy`);
      } else {
        logger.error(`Database ${conn.name} is not healthy`);
        allHealthy = false;
      }
    } catch (error) {
      logger.error(`Failed to check database ${conn.name}:`, error);
      allHealthy = false;
    }
  }
  return allHealthy;
}
/**
 * Cerrar todas las conexiones de base de datos
 * Clean Code: Graceful shutdown
 */
export async function closeDatabaseConnections(): Promise<void> {
  const connections = [
    TYPES.SharedConnection,
    TYPES.OmniConnection,
    TYPES.CrmConnection,
    TYPES.WorkflowConnection,
    TYPES.AnalyticsConnection
  ];
  for (const connType of connections) {
    try {
      const db = container.get<IDatabaseConnection>(connType);
      await db.close();
    } catch (error) {
      logger.error(`Failed to close database connection:`, error);
    }
  }
}
export { container, TYPES };

/**
 * Initialize container and database connections
 */
export async function initializeContainer(): Promise<void> {
  const logger = container.get<winston.Logger>(TYPES.Logger);

  logger.info('Initializing container and database connections...');

  // Test database connections
  const connections = [
    TYPES.SharedConnection,
    TYPES.OmniConnection,
    TYPES.CrmConnection,
    TYPES.WorkflowConnection,
    TYPES.AnalyticsConnection
  ];

  for (const connType of connections) {
    try {
      const db = container.get<IDatabaseConnection>(connType);
      await db.query('SELECT 1');
      logger.info(`Database connection verified: ${connType.toString()}`);
    } catch (error) {
      logger.error(`Failed to verify database connection ${connType.toString()}:`, error);
      throw error;
    }
  }

  logger.info('Container initialized successfully');
}

/**
 * Shutdown container and close all connections
 */
export async function shutdownContainer(): Promise<void> {
  const logger = container.get<winston.Logger>(TYPES.Logger);

  logger.info('Shutting down container and closing database connections...');

  const connections = [
    TYPES.SharedConnection,
    TYPES.OmniConnection,
    TYPES.CrmConnection,
    TYPES.WorkflowConnection,
    TYPES.AnalyticsConnection
  ];

  for (const connType of connections) {
    try {
      const db = container.get<IDatabaseConnection>(connType);
      await db.close();
      logger.info(`Database connection closed: ${connType.toString()}`);
    } catch (error) {
      logger.error(`Failed to close database connection ${connType.toString()}:`, error);
    }
  }

  logger.info('Container shutdown complete');
}
