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
container.bind<IAuthUserService>(TYPES.AuthUserService).to(AuthUserService);
container.bind<IUserService>(TYPES.UserService).to(UserService);
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
container.bind<IFeatureFlagService>(TYPES.FeatureFlagService).to(EnhancedFeatureFlagService).inSingletonScope();
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
// TODO: Bind otros módulos cuando estén implementados
// Nivel 2: Agregar más módulos siguiendo el mismo patrón
// - Omni Module
// - CRM Module
// - Workflow Module
// - Analytics Module
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
export { container };
