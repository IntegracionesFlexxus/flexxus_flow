/**
// Logger instance
const logger = LoggerFactory.create({ file: __filename });

 * Environment Configuration - Sprint 2
 * Siguiendo lineamientos nivel 2: configuración centralizada
 * Validación mejorada con múltiples esquemas y ambientes
 */
import dotenv from 'dotenv';
import path from 'path';
import * as Joi from 'joi';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

// Determine environment
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const IS_TEST = NODE_ENV === 'test';
const IS_DEVELOPMENT = NODE_ENV === 'development';
// Load environment files in order of priority
const envFiles = [
  `.env.${NODE_ENV}.local`,
  `.env.${NODE_ENV}`,
  '.env.local',
  '.env'
];
// Load each env file
for (const file of envFiles) {
  dotenv.config({ 
    path: path.resolve(process.cwd(), file) 
  });
}
// Validation schema - Sprint 2 Enhanced
const envSchema = Joi.object({
  // Node Environment
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  // Application Config
  APP_NAME: Joi.string().default('flexxus-flow'),
  APP_VERSION: Joi.string().default('2.0.0'),
  PORT: Joi.number().min(1).max(65535).default(3000),
  HOST: Joi.string().default('localhost'),
  BASE_URL: Joi.string().uri().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  API_PREFIX: Joi.string().default('/api/v1'),
  // Database connections - Multiple databases support
  SHARED_DB_HOST: Joi.string().default('localhost'),
  SHARED_DB_PORT: Joi.number().default(5432),
  SHARED_DB_NAME: Joi.string().default('shared_db'),
  SHARED_DB_USER: Joi.string().default('postgres'),
  SHARED_DB_PASSWORD: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default('postgres123')
  }),
  SHARED_DB_SSL: Joi.boolean().default(IS_PRODUCTION),
  SHARED_DB_POOL_MIN: Joi.number().min(0).default(2),
  SHARED_DB_POOL_MAX: Joi.number().min(1).default(20),
  OMNI_DB_HOST: Joi.string().default('localhost'),
  OMNI_DB_PORT: Joi.number().default(5432),
  OMNI_DB_NAME: Joi.string().default('omni_db'),
  OMNI_DB_USER: Joi.string().default('postgres'),
  OMNI_DB_PASSWORD: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default('postgres123')
  }),
  CRM_DB_HOST: Joi.string().default('localhost'),
  CRM_DB_PORT: Joi.number().default(5432),
  CRM_DB_NAME: Joi.string().default('flexxus_crm'),
  CRM_DB_USER: Joi.string().default('postgres'),
  CRM_DB_PASSWORD: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default('postgres123')
  }),
  WORKFLOW_DB_HOST: Joi.string().default('localhost'),
  WORKFLOW_DB_PORT: Joi.number().default(5432),
  WORKFLOW_DB_NAME: Joi.string().default('flexxus_workflow'),
  WORKFLOW_DB_USER: Joi.string().default('postgres'),
  WORKFLOW_DB_PASSWORD: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default('postgres123')
  }),
  ANALYTICS_DB_HOST: Joi.string().default('localhost'),
  ANALYTICS_DB_PORT: Joi.number().default(5432),
  ANALYTICS_DB_NAME: Joi.string().default('flexxus_analytics'),
  ANALYTICS_DB_USER: Joi.string().default('postgres'),
  ANALYTICS_DB_PASSWORD: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default('postgres123')
  }),
  // Redis Configuration
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().min(0).max(15).default(0),
  REDIS_KEY_PREFIX: Joi.string().default('flexxus:'),
  REDIS_TTL: Joi.number().default(3600),
  // JWT Configuration - Sprint 2 Enhanced
  JWT_SECRET: Joi.string().min(32).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default('flexxus_jwt_secret_key_temporal_sprint2_enhanced_auth')
  }),
  JWT_REFRESH_SECRET: Joi.string().min(32).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default('flexxus_jwt_refresh_secret_key_temporal_sprint2_auth')
  }),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  JWT_ISSUER: Joi.string().default('flexxus-sistema-gestion'),
  JWT_AUDIENCE: Joi.string().default('flexxus-sistema-gestion-client'),
  JWT_ALGORITHM: Joi.string().valid('HS256', 'HS384', 'HS512', 'RS256').default('HS256'),
  // Session Configuration
  SESSION_SECRET: Joi.string().min(32).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default('flexxus_session_secret_key_temporal_sprint2')
  }),
  SESSION_NAME: Joi.string().default('flexxus.sid'),
  SESSION_COOKIE_MAX_AGE: Joi.number().default(7 * 24 * 60 * 60 * 1000),
  SESSION_COOKIE_SECURE: Joi.boolean().default(IS_PRODUCTION),
  SESSION_COOKIE_HTTP_ONLY: Joi.boolean().default(true),
  SESSION_COOKIE_SAME_SITE: Joi.string().valid('strict', 'lax', 'none').default('lax'),
  // External services
  FRONTEND_URL: Joi.string().default('http://localhost:5173'),
  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default(IS_PRODUCTION ? 'info' : 'debug'),
  LOG_FORMAT: Joi.string().valid('json', 'simple', 'combined').default('json'),
  LOG_DIRECTORY: Joi.string().default('./logs'),
  LOG_MAX_SIZE: Joi.string().default('20m'),
  LOG_MAX_FILES: Joi.string().default('14d'),
  AUDIT_LOG_ENABLED: Joi.boolean().default(true),
  // Security
  BCRYPT_ROUNDS: Joi.number().min(10).max(20).default(12),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  RATE_LIMIT_SKIP_SUCCESSFUL: Joi.boolean().default(false),
  RATE_LIMIT_SKIP_FAILED: Joi.boolean().default(false),
  // CORS - Más estricto en producción
  CORS_ORIGIN: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).when('NODE_ENV', {
    is: 'production',
    then: Joi.required().custom((value, helpers) => {
      // En producción, no permitir wildcard
      if (value === '*' || (Array.isArray(value) && value.includes('*'))) {
        return helpers.error('CORS wildcard (*) no está permitido en producción');
      }
      // Validar que solo sean URLs HTTPS en producción
      const origins = Array.isArray(value) ? value : [value];
      for (const origin of origins) {
        if (!origin.startsWith('https://')) {
          return helpers.error(`CORS origin debe usar HTTPS en producción: ${origin}`);
        }
      }
      return value;
    }),
    otherwise: Joi.optional().default(['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173'])
  }),
  CORS_CREDENTIALS: Joi.boolean().default(true),
  CORS_MAX_AGE: Joi.number().default(86400),
  // Email Configuration
  EMAIL_ENABLED: Joi.boolean().default(false),
  EMAIL_PROVIDER: Joi.string().valid('smtp', 'sendgrid', 'aws-ses', 'mailgun').default('smtp'),
  EMAIL_FROM: Joi.string().email().default('noreply@flexxus-flow.com'),
  EMAIL_REPLY_TO: Joi.string().email().optional(),
  SMTP_HOST: Joi.string().when('EMAIL_PROVIDER', {
    is: 'smtp',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASSWORD: Joi.string().allow('').default(''),
  // Storage Configuration
  STORAGE_PROVIDER: Joi.string().valid('local', 's3', 'gcs', 'azure').default('local'),
  STORAGE_LOCAL_UPLOAD_DIR: Joi.string().default('./uploads'),
  STORAGE_LOCAL_TEMP_DIR: Joi.string().default('./temp'),
  STORAGE_MAX_FILE_SIZE: Joi.number().default(10 * 1024 * 1024),
  // Cache Configuration
  CACHE_ENABLED: Joi.boolean().default(true),
  CACHE_TTL: Joi.number().default(300),
  CACHE_MAX_KEYS: Joi.number().default(500),
  CACHE_CHECK_PERIOD: Joi.number().default(600),
  // Queue Configuration
  QUEUE_ENABLED: Joi.boolean().default(false),
  QUEUE_PROVIDER: Joi.string().valid('bull', 'rabbitmq', 'aws-sqs').default('bull'),
  // Monitoring
  MONITORING_ENABLED: Joi.boolean().default(false),
  METRICS_PORT: Joi.number().default(9090),
  HEALTH_CHECK_PATH: Joi.string().default('/health'),
  // Feature Flags
  FEATURE_FLAGS_ENABLED: Joi.boolean().default(true),
  FEATURE_FLAGS_CACHE_TTL: Joi.number().default(300),
  
  // Security Keys (agregadas para centralización)
  MASTER_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default('default-master-key')
  }),
  AUDIT_SIGNING_KEY: Joi.string().default('default-signing-key'),
  SECRETS_MASTER_KEY: Joi.string().default('default-master-key-change-in-production'),
  SECRETS_SALT: Joi.string().default('flexxus-secrets-salt'),
  
  // Email Extended (agregadas para centralización)
  FROM_EMAIL: Joi.string().email().default('noreply@flexxusflow.com'),
  FROM_NAME: Joi.string().default('FlexxusFlow'),
  SUPPORT_EMAIL: Joi.string().email().default('support@flexxusflow.com'),
  LOG_EMAIL_CONTENT: Joi.boolean().default(false),
  SMTP_PASS: Joi.string().allow('').default(''),
  
  // WebSocket
  WEBSOCKET_PORT: Joi.number().default(3001),
  WEBSOCKET_ENABLED: Joi.boolean().default(true),
}).unknown();
// Validate environment variables
const { error, value: env } = envSchema.validate(process.env, {
  abortEarly: false,
  stripUnknown: true
});
if (error) {
  console.error('❌ Environment validation failed:');
  error.details.forEach(detail => {
    console.error(`  - ${detail.message}`);
  });
  // In production, exit if validation fails
  if (IS_PRODUCTION) {
    process.exit(1);
  } else {
    console.warn('⚠️  Using default values for missing environment variables');
  }
}
// Export validated environment configuration
export const environment = {
  // Node Environment
  nodeEnv: env.NODE_ENV,
  isDevelopment: IS_DEVELOPMENT,
  isProduction: IS_PRODUCTION,
  isTest: IS_TEST,
  // Application
  app: {
    name: env.APP_NAME,
    version: env.APP_VERSION,
    port: env.PORT,
    host: env.HOST,
    baseUrl: env.BASE_URL,
    apiPrefix: env.API_PREFIX,
  },
  // Database configurations
  database: {
    shared: {
      host: env.SHARED_DB_HOST,
      port: env.SHARED_DB_PORT,
      database: env.SHARED_DB_NAME,
      user: env.SHARED_DB_USER,
      password: env.SHARED_DB_PASSWORD,
      ssl: env.SHARED_DB_SSL,
      poolMin: env.SHARED_DB_POOL_MIN,
      poolMax: env.SHARED_DB_POOL_MAX,
      dbName: 'shared'
    },
    omni: {
      host: env.OMNI_DB_HOST,
      port: env.OMNI_DB_PORT,
      database: env.OMNI_DB_NAME,
      user: env.OMNI_DB_USER,
      password: env.OMNI_DB_PASSWORD,
      dbName: 'omni'
    },
    crm: {
      host: env.CRM_DB_HOST,
      port: env.CRM_DB_PORT,
      database: env.CRM_DB_NAME,
      user: env.CRM_DB_USER,
      password: env.CRM_DB_PASSWORD,
      dbName: 'crm'
    },
    workflow: {
      host: env.WORKFLOW_DB_HOST,
      port: env.WORKFLOW_DB_PORT,
      database: env.WORKFLOW_DB_NAME,
      user: env.WORKFLOW_DB_USER,
      password: env.WORKFLOW_DB_PASSWORD,
      dbName: 'workflow'
    },
    analytics: {
      host: env.ANALYTICS_DB_HOST,
      port: env.ANALYTICS_DB_PORT,
      database: env.ANALYTICS_DB_NAME,
      user: env.ANALYTICS_DB_USER,
      password: env.ANALYTICS_DB_PASSWORD,
      dbName: 'analytics'
    }
  },
  // Redis
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
    keyPrefix: env.REDIS_KEY_PREFIX,
    ttl: env.REDIS_TTL,
  },
  // JWT
  jwt: {
    secret: env.JWT_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithm: env.JWT_ALGORITHM,
  },
  // Session
  session: {
    secret: env.SESSION_SECRET,
    name: env.SESSION_NAME,
    cookie: {
      maxAge: env.SESSION_COOKIE_MAX_AGE,
      secure: env.SESSION_COOKIE_SECURE,
      httpOnly: env.SESSION_COOKIE_HTTP_ONLY,
      sameSite: env.SESSION_COOKIE_SAME_SITE,
    },
  },
  // Logging
  logging: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
    directory: env.LOG_DIRECTORY,
    maxSize: env.LOG_MAX_SIZE,
    maxFiles: env.LOG_MAX_FILES,
    auditEnabled: env.AUDIT_LOG_ENABLED,
  },
  // Security
  security: {
    bcryptRounds: env.BCRYPT_ROUNDS,
    rateLimiting: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
      skipSuccessful: env.RATE_LIMIT_SKIP_SUCCESSFUL,
      skipFailed: env.RATE_LIMIT_SKIP_FAILED,
    },
    masterKey: env.MASTER_KEY,
    secretsMasterKey: env.SECRETS_MASTER_KEY,
    secretsSalt: env.SECRETS_SALT,
  },
  // CORS
  cors: {
    origin: typeof env.CORS_ORIGIN === 'string' && env.CORS_ORIGIN.includes(',') 
      ? env.CORS_ORIGIN.split(',').map((origin: string) => origin.trim())
      : env.CORS_ORIGIN,
    credentials: env.CORS_CREDENTIALS,
    maxAge: env.CORS_MAX_AGE,
  },
  // Email
  email: {
    enabled: env.EMAIL_ENABLED,
    provider: env.EMAIL_PROVIDER,
    from: env.EMAIL_FROM,
    fromEmail: env.FROM_EMAIL,
    fromName: env.FROM_NAME,
    replyTo: env.EMAIL_REPLY_TO,
    supportEmail: env.SUPPORT_EMAIL,
    logContent: env.LOG_EMAIL_CONTENT,
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
      pass: env.SMTP_PASS,
    },
  },
  // Storage
  storage: {
    provider: env.STORAGE_PROVIDER,
    local: {
      uploadDir: env.STORAGE_LOCAL_UPLOAD_DIR,
      tempDir: env.STORAGE_LOCAL_TEMP_DIR,
      maxFileSize: env.STORAGE_MAX_FILE_SIZE,
    },
  },
  // Cache
  cache: {
    enabled: env.CACHE_ENABLED,
    ttl: env.CACHE_TTL,
    maxKeys: env.CACHE_MAX_KEYS,
    checkPeriod: env.CACHE_CHECK_PERIOD,
  },
  // Queue
  queue: {
    enabled: env.QUEUE_ENABLED,
    provider: env.QUEUE_PROVIDER,
  },
  // Monitoring
  monitoring: {
    enabled: env.MONITORING_ENABLED,
    metricsPort: env.METRICS_PORT,
    healthCheckPath: env.HEALTH_CHECK_PATH,
  },
  // Feature Flags
  featureFlags: {
    enabled: env.FEATURE_FLAGS_ENABLED,
    cacheTTL: env.FEATURE_FLAGS_CACHE_TTL,
  },
  // Audit
  audit: {
    enabled: true,
    retentionDays: 90,
    logLevel: 'info',
    signingKey: env.AUDIT_SIGNING_KEY,
  },
  
  // WebSocket
  websocket: {
    enabled: env.WEBSOCKET_ENABLED,
    port: env.WEBSOCKET_PORT,
  },
  // Rate Limiting
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
  },
  // External Services
  frontendUrl: env.FRONTEND_URL,
};

// Backward compatibility alias
export const config = environment;

// Export type for TypeScript
export type Environment = typeof environment;
// Helper functions
export const isProduction = () => IS_PRODUCTION;
export const isDevelopment = () => IS_DEVELOPMENT;
export const isTest = () => IS_TEST;
export const isStaging = () => NODE_ENV === 'staging';
// Environment metadata
export const environmentInfo = {
  nodeEnv: NODE_ENV,
  isDevelopment: IS_DEVELOPMENT,
  isProduction: IS_PRODUCTION,
  isTest: IS_TEST,
  timestamp: new Date().toISOString(),
  pid: process.pid,
  platform: process.platform,
  nodeVersion: process.version,
  appVersion: env.APP_VERSION,
};
// Log successful configuration load
console.info(`✅ Environment configuration loaded for: ${NODE_ENV}`);
