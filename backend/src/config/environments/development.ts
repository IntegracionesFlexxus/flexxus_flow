/**
 * Development Environment Configuration - Sprint 2
 * Siguiendo lineamientos nivel 2: configuración específica por ambiente
 */
import { Environment } from '@/config/environment';
/**
 * Development-specific configuration overrides
 */
export const developmentConfig: Partial<Environment> = {
  app: {
    name: 'flexxus-flow-dev',
    version: '2.0.0-dev',
    port: 3000,
    host: 'localhost',
    baseUrl: 'http://localhost:3000',
    apiPrefix: '/api/v1',
  },
  // Development logging - more verbose
  logging: {
    level: 'debug',
    format: 'simple',
    directory: './logs',
    maxSize: '20m',
    maxFiles: '7d',
    auditEnabled: true,
  },
  // Relaxed security for development
  security: {
    bcryptRounds: 10, // Faster for development
    rateLimiting: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 1000, // Higher limit for development
      skipSuccessful: false,
      skipFailed: false,
    },
    masterKey: 'default-master-key-dev',
    secretsMasterKey: 'default-master-key-change-in-production-dev',
    secretsSalt: 'flexxus-secrets-salt-dev',
  },
  // CORS - Allow all origins in development
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    maxAge: 86400,
  },
  // Cache - Shorter TTL for development
  cache: {
    enabled: true,
    ttl: 60, // 1 minute
    maxKeys: 100,
    checkPeriod: 120,
  },
  // Feature flags - Enable all for testing
  featureFlags: {
    enabled: true,
    cacheTTL: 60, // 1 minute cache
  },
  // Email - Disabled in development
  email: {
    enabled: false,
    provider: 'smtp',
    from: 'dev@flexxus-flow.local',
    fromEmail: 'dev@flexxus-flow.local',
    fromName: 'FlexxusFlow Dev',
    replyTo: undefined,
    supportEmail: 'dev-support@flexxus-flow.local',
    logContent: true,
    smtp: {
      host: 'localhost',
      port: 1025, // MailHog default port
      secure: false,
      user: '',
      password: '',
      pass: '',
    },
  },
  // Monitoring - Basic health check only
  monitoring: {
    enabled: false,
    metricsPort: 9090,
    healthCheckPath: '/health',
  },
};
/**
 * Development-specific feature flags
 */
export const developmentFeatureFlags = {
  debugMode: true,
  showDevTools: true,
  mockExternalServices: true,
  bypassAuth: false,
  enableHotReload: true,
  showErrorDetails: true,
  enableSourceMaps: true,
  logSqlQueries: true,
  enablePlayground: true,
  enableSwagger: true,
};
/**
 * Development-specific database configuration
 */
export const developmentDatabase = {
  synchronize: true, // Auto-sync schema in development
  logging: ['query', 'error', 'warn'],
  dropSchema: false,
  migrationsRun: false,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  subscribers: ['src/database/subscribers/*.ts'],
};
/**
 * Development-specific Redis configuration
 */
export const developmentRedis = {
  enableOfflineQueue: true,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err: Error) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
};
/**
 * Development shortcuts and utilities
 */
export const developmentUtils = {
  // Mock user for testing
  mockUser: {
    id: 'dev-user-001',
    email: 'dev@flexxus-flow.com',
    companyId: 'dev-company-001',
    role: 'admin',
  },
  // Test tokens
  testTokens: {
    accessToken: 'dev-access-token',
    refreshToken: 'dev-refresh-token',
  },
  // API keys for testing
  testApiKeys: {
    internal: 'dev-internal-api-key',
    external: 'dev-external-api-key',
  },
};
