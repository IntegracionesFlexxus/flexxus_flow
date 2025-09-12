/**
 * Production Environment Configuration - Sprint 2
 * Siguiendo lineamientos nivel 2: configuración específica para producción
 */
import { Environment } from '@/config/environment';
import { environment } from '@/config/environment';
/**
 * Production-specific configuration overrides
 */
export const productionConfig: Partial<Environment> = {
  app: {
    name: 'flexxus-flow',
    version: process.env.APP_VERSION || '2.0.0',
    port: parseInt(process.env.PORT || '3000', 10),
    host: '0.0.0.0', // Listen on all interfaces
    baseUrl: process.env.BASE_URL || 'https://api.flexxus-flow.com',
    apiPrefix: '/api/v1',
  },
  // Production logging - structured and persistent
  logging: {
    level: 'info',
    format: 'json',
    directory: '/var/log/flexxus-flow',
    maxSize: '100m',
    maxFiles: '30d',
    auditEnabled: true,
  },
  // Strict security for production
  security: {
    bcryptRounds: 14, // Higher security
    rateLimiting: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 100,
      skipSuccessful: false,
      skipFailed: false,
    },
    masterKey: process.env.MASTER_KEY || 'production-master-key',
    secretsMasterKey: process.env.SECRETS_MASTER_KEY || 'production-secrets-master-key',
    secretsSalt: process.env.SECRETS_SALT || 'production-secrets-salt',
  },
  // CORS - Restricted origins
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['https://app.flexxus-flow.com'],
    credentials: true,
    maxAge: 86400,
  },
  // Cache - Longer TTL for performance
  cache: {
    enabled: true,
    ttl: 300, // 5 minutes
    maxKeys: 1000,
    checkPeriod: 600,
  },
  // Feature flags - Controlled rollout
  featureFlags: {
    enabled: true,
    cacheTTL: 300, // 5 minutes cache
  },
  // Email - Production mail service
  email: {
    enabled: true,
    provider: process.env.EMAIL_PROVIDER as any || 'sendgrid',
    from: process.env.EMAIL_FROM || 'noreply@flexxus-flow.com',
    fromEmail: process.env.FROM_EMAIL || 'noreply@flexxus-flow.com',
    fromName: process.env.FROM_NAME || 'FlexxusFlow',
    replyTo: process.env.EMAIL_REPLY_TO || 'support@flexxus-flow.com',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@flexxus-flow.com',
    logContent: process.env.LOG_EMAIL_CONTENT === 'true',
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(environment.email.smtp.port, 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: environment.email.smtp.user,
      password: process.env.SMTP_PASSWORD || '',
      pass: process.env.SMTP_PASS || '',
    },
  },
  // Monitoring - Full monitoring enabled
  monitoring: {
    enabled: true,
    metricsPort: parseInt(process.env.METRICS_PORT || '9090', 10),
    healthCheckPath: '/health',
  },
};
/**
 * Production-specific feature flags
 */
export const productionFeatureFlags = {
  debugMode: false,
  showDevTools: false,
  mockExternalServices: false,
  bypassAuth: false,
  enableHotReload: false,
  showErrorDetails: false,
  enableSourceMaps: false,
  logSqlQueries: false,
  enablePlayground: false,
  enableSwagger: false,
};
/**
 * Production-specific database configuration
 */
export const productionDatabase = {
  synchronize: false, // Never auto-sync in production
  logging: ['error'],
  dropSchema: false,
  migrationsRun: true,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],
  subscribers: ['dist/database/subscribers/*.js'],
  ssl: {
    rejectUnauthorized: false, // For AWS RDS
  },
  extra: {
    max: 100, // Maximum connections
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 30000,
  },
};
/**
 * Production-specific Redis configuration
 */
export const productionRedis = {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    if (times > 3) {
      // Stop retrying after 3 attempts
      return null;
    }
    const delay = Math.min(times * 1000, 3000);
    return delay;
  },
  reconnectOnError: (err: Error) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Reconnect when Redis is in readonly mode
      return true;
    }
    return false;
  },
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
};
/**
 * Production security headers
 */
export const productionSecurityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};
/**
 * Production performance optimizations
 */
export const productionOptimizations = {
  compression: {
    enabled: true,
    threshold: 1024, // Compress responses > 1KB
    level: 6, // Compression level (0-9)
  },
  clustering: {
    enabled: true,
    workers: process.env.WEB_CONCURRENCY || 'auto',
  },
  responseCache: {
    enabled: true,
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 60,
  },
};
/**
 * Production monitoring and alerting
 */
export const productionMonitoring = {
  apm: {
    enabled: process.env.APM_ENABLED === 'true',
    serviceName: 'flexxus-flow-api',
    environment: 'production',
  },
  errorTracking: {
    enabled: process.env.ERROR_TRACKING_ENABLED === 'true',
    dsn: process.env.SENTRY_DSN || '',
    environment: 'production',
    tracesSampleRate: 0.1,
  },
  metrics: {
    enabled: true,
    interval: 60000, // Collect every minute
    includeSystemMetrics: true,
    includeProcessMetrics: true,
  },
};
