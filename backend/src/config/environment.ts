// Environment Configuration - Sprint 1
// Configuración actualizada con validación y variables de entorno

import { config } from 'dotenv';
import Joi from 'joi';

// Load environment variables
config();

// Validation schema - Sprint 1 MVP
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  
  PORT: Joi.number().default(3001),
  
  // Database connections - usando valores por defecto para MVP
  SHARED_DB_HOST: Joi.string().default('localhost'),
  SHARED_DB_PORT: Joi.number().default(5432),
  SHARED_DB_NAME: Joi.string().default('shared_db'),
  SHARED_DB_USER: Joi.string().default('postgres'),
  SHARED_DB_PASSWORD: Joi.string().default('postgres123'),
  
  OMNI_DB_HOST: Joi.string().default('localhost'),
  OMNI_DB_PORT: Joi.number().default(5432),
  OMNI_DB_NAME: Joi.string().default('omni_db'),
  OMNI_DB_USER: Joi.string().default('postgres'),
  OMNI_DB_PASSWORD: Joi.string().default('postgres123'),

  CRM_DB_HOST: Joi.string().default('localhost'),
  CRM_DB_PORT: Joi.number().default(5432),
  CRM_DB_NAME: Joi.string().default('crm_db'),
  CRM_DB_USER: Joi.string().default('postgres'),
  CRM_DB_PASSWORD: Joi.string().default('postgres123'),

  WORKFLOW_DB_HOST: Joi.string().default('localhost'),
  WORKFLOW_DB_PORT: Joi.number().default(5432),
  WORKFLOW_DB_NAME: Joi.string().default('workflow_db'),
  WORKFLOW_DB_USER: Joi.string().default('postgres'),
  WORKFLOW_DB_PASSWORD: Joi.string().default('postgres123'),

  ANALYTICS_DB_HOST: Joi.string().default('localhost'),
  ANALYTICS_DB_PORT: Joi.number().default(5432),
  ANALYTICS_DB_NAME: Joi.string().default('analytics_db'),
  ANALYTICS_DB_USER: Joi.string().default('postgres'),
  ANALYTICS_DB_PASSWORD: Joi.string().default('postgres123'),
  
  // JWT Configuration - valores por defecto para MVP
  JWT_SECRET: Joi.string().min(32).default('flexxus_jwt_secret_key_temporal_sprint1_mvp'),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  
  // External services
  FRONTEND_URL: Joi.string().default('http://localhost:5173'),
  
  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),

  // Security
  BCRYPT_ROUNDS: Joi.number().default(10),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

  // CORS
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
  
}).unknown();

// Validate environment variables
const { error, value: env } = envSchema.validate(process.env);

if (error) {
  console.error('Environment validation error:', error.message);
  // En MVP, continuar con valores por defecto
  console.warn('Using default values for missing environment variables');
}

// Export validated environment configuration
export const environment = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  
  // Database configurations
  database: {
    shared: {
      host: env.SHARED_DB_HOST,
      port: env.SHARED_DB_PORT,
      database: env.SHARED_DB_NAME,
      user: env.SHARED_DB_USER,
      password: env.SHARED_DB_PASSWORD,
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
  
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN
  },
  
  frontendUrl: env.FRONTEND_URL,
  logLevel: env.LOG_LEVEL,
  
  security: {
    bcryptRounds: env.BCRYPT_ROUNDS,
    rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
    rateLimitMaxRequests: env.RATE_LIMIT_MAX_REQUESTS
  },

  cors: {
    origin: env.CORS_ORIGIN
  }
};

// Helper functions
export const isProduction = () => environment.nodeEnv === 'production';
export const isDevelopment = () => environment.nodeEnv === 'development';
export const isTest = () => environment.nodeEnv === 'test';