// Dependency Injection Container - Sprint 1 con Nivel 2
// Container principal con todos los bindings del sistema

import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './types';
import winston from 'winston';

// Configuration
import { environment } from '../config/environment';

// Database
import { IDatabaseConnection } from '../shared/database/interfaces/IDatabaseConnection';
import { DatabaseConnection } from '../shared/database/connections/DatabaseConnection';

// Auth Module Interfaces
import { IUserRepository } from '../modules/auth/interfaces/IUserRepository';
import { IUserService } from '../modules/auth/interfaces/IUserService';
import { ICompanyRepository } from '../modules/auth/interfaces/ICompanyRepository';
import { ICompanyService } from '../modules/auth/interfaces/ICompanyService';
import { IAuthService } from '../modules/auth/interfaces/IAuthService';

// Auth Module Implementations
import { UserRepository } from '../modules/auth/repositories/UserRepository';
import { UserService } from '../modules/auth/services/UserService';
import { CompanyRepository } from '../modules/auth/repositories/CompanyRepository';
import { CompanyService } from '../modules/auth/services/CompanyService';
import { AuthService } from '../modules/auth/services/AuthService';
import { AuthController } from '../modules/auth/controllers/AuthController';

/**
 * Container de Inversify
 * Patrón: IoC Container para Dependency Injection
 * SOLID: Dependency Inversion Principle
 */
const container = new Container();

// ========== Logger Configuration ==========
// Singleton para logging centralizado
const logger = winston.createLogger({
  level: environment.logLevel,
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

container.bind<IDatabaseConnection>(TYPES.SharedConnection)
  .toDynamicValue(() => new DatabaseConnection(environment.database.shared))
  .inSingletonScope();

container.bind<IDatabaseConnection>(TYPES.OmniConnection)
  .toDynamicValue(() => new DatabaseConnection(environment.database.omni))
  .inSingletonScope();

container.bind<IDatabaseConnection>(TYPES.CrmConnection)
  .toDynamicValue(() => new DatabaseConnection(environment.database.crm))
  .inSingletonScope();

container.bind<IDatabaseConnection>(TYPES.WorkflowConnection)
  .toDynamicValue(() => new DatabaseConnection(environment.database.workflow))
  .inSingletonScope();

container.bind<IDatabaseConnection>(TYPES.AnalyticsConnection)
  .toDynamicValue(() => new DatabaseConnection(environment.database.analytics))
  .inSingletonScope();

// ========== Auth Module Bindings ==========
// Repositories
container.bind<IUserRepository>(TYPES.UserRepository).to(UserRepository);
container.bind<ICompanyRepository>(TYPES.CompanyRepository).to(CompanyRepository);

// Services
container.bind<IUserService>(TYPES.UserService).to(UserService);
container.bind<ICompanyService>(TYPES.CompanyService).to(CompanyService);
container.bind<IAuthService>(TYPES.AuthService).to(AuthService);

// Controllers
container.bind<AuthController>(TYPES.AuthController).to(AuthController);

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