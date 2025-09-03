const Joi = require('joi');

// Esquemas de validación para diferentes secciones
const schemas = {
  // Configuración del servidor
  server: Joi.object({
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test', 'staging')
      .default('development'),
    PORT: Joi.number()
      .min(1)
      .max(65535)
      .default(3000),
    APP_NAME: Joi.string()
      .default('Flexxus Flow')
  }),

  // Configuración de base de datos
  database: Joi.object({
    host: Joi.string().required(),
    port: Joi.number().min(1).max(65535).required(),
    database: Joi.string().required(),
    user: Joi.string().required(),
    password: Joi.string().required(),
    ssl: Joi.boolean().default(false),
    max: Joi.number().min(1).default(20),
    min: Joi.number().min(0).default(5),
    idleTimeoutMillis: Joi.number().min(0).default(30000),
    connectionTimeoutMillis: Joi.number().min(0).default(5000)
  }),

  // Configuración de seguridad
  security: Joi.object({
    JWT_SECRET: Joi.string().min(32).required(),
    JWT_EXPIRES_IN: Joi.string().default('24h'),
    JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
    BCRYPT_ROUNDS: Joi.number().min(4).max(20).default(10),
    API_KEY_PREFIX: Joi.string().default('flx_')
  }),

  // Configuración de CORS
  cors: Joi.object({
    CORS_ORIGIN: Joi.string().required(),
    CORS_CREDENTIALS: Joi.boolean().default(true)
  }),

  // Configuración de rate limiting
  rateLimit: Joi.object({
    RATE_LIMIT_WINDOW_MS: Joi.number().min(1000).default(60000),
    RATE_LIMIT_MAX_REQUESTS: Joi.number().min(1).default(100),
    RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: Joi.boolean().default(false)
  }),

  // Configuración de logging
  logging: Joi.object({
    LOG_LEVEL: Joi.string()
      .valid('error', 'warn', 'info', 'debug', 'verbose')
      .default('info'),
    LOG_FORMAT: Joi.string()
      .valid('json', 'simple', 'combined')
      .default('json'),
    LOG_DIR: Joi.string().default('logs'),
    LOG_MAX_FILES: Joi.string().default('14d'),
    LOG_MAX_SIZE: Joi.string().default('20m')
  }),

  // Configuración de email
  email: Joi.object({
    SMTP_HOST: Joi.string().required(),
    SMTP_PORT: Joi.number().required(),
    SMTP_SECURE: Joi.boolean().default(false),
    SMTP_USER: Joi.string().required(),
    SMTP_PASSWORD: Joi.string().required(),
    EMAIL_FROM: Joi.string().email().required()
  }).allow(null),

  // Configuración de cache
  cache: Joi.object({
    CACHE_ENABLED: Joi.boolean().default(true),
    CACHE_TTL: Joi.number().min(0).default(300),
    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_PASSWORD: Joi.string().allow('').default(''),
    REDIS_DB: Joi.number().min(0).max(15).default(0)
  })
};

// Clase validadora de configuración
class ConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  // Validar una sección de configuración
  validateSection(sectionName, data, schema) {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      allowUnknown: false
    });

    if (error) {
      this.errors.push({
        section: sectionName,
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
      return null;
    }

    return value;
  }

  // Validar configuración del servidor
  validateServer(env) {
    return this.validateSection('server', {
      NODE_ENV: env.NODE_ENV,
      PORT: env.PORT ? parseInt(env.PORT) : undefined,
      APP_NAME: env.APP_NAME
    }, schemas.server);
  }

  // Validar configuración de base de datos
  validateDatabase(prefix, env) {
    const dbConfig = {
      host: env[`${prefix}_HOST`],
      port: env[`${prefix}_PORT`] ? parseInt(env[`${prefix}_PORT`]) : undefined,
      database: env[`${prefix}_NAME`],
      user: env[`${prefix}_USER`],
      password: env[`${prefix}_PASSWORD`],
      ssl: env[`${prefix}_SSL`] === 'true'
    };

    return this.validateSection(`database.${prefix.toLowerCase()}`, dbConfig, schemas.database);
  }

  // Validar configuración de seguridad
  validateSecurity(env) {
    return this.validateSection('security', {
      JWT_SECRET: env.JWT_SECRET,
      JWT_EXPIRES_IN: env.JWT_EXPIRES_IN,
      JWT_REFRESH_EXPIRES_IN: env.JWT_REFRESH_EXPIRES_IN,
      BCRYPT_ROUNDS: env.BCRYPT_ROUNDS ? parseInt(env.BCRYPT_ROUNDS) : undefined,
      API_KEY_PREFIX: env.API_KEY_PREFIX
    }, schemas.security);
  }

  // Validar toda la configuración
  validateAll(env) {
    this.errors = [];
    this.warnings = [];

    const config = {
      server: this.validateServer(env),
      databases: {},
      security: this.validateSecurity(env),
      cors: this.validateSection('cors', {
        CORS_ORIGIN: env.CORS_ORIGIN,
        CORS_CREDENTIALS: env.CORS_CREDENTIALS === 'true'
      }, schemas.cors),
      rateLimit: this.validateSection('rateLimit', {
        RATE_LIMIT_WINDOW_MS: env.RATE_LIMIT_WINDOW_MS ? parseInt(env.RATE_LIMIT_WINDOW_MS) : undefined,
        RATE_LIMIT_MAX_REQUESTS: env.RATE_LIMIT_MAX_REQUESTS ? parseInt(env.RATE_LIMIT_MAX_REQUESTS) : undefined,
        RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true'
      }, schemas.rateLimit),
      logging: this.validateSection('logging', {
        LOG_LEVEL: env.LOG_LEVEL,
        LOG_FORMAT: env.LOG_FORMAT,
        LOG_DIR: env.LOG_DIR,
        LOG_MAX_FILES: env.LOG_MAX_FILES,
        LOG_MAX_SIZE: env.LOG_MAX_SIZE
      }, schemas.logging)
    };

    // Validar bases de datos
    const dbPrefixes = ['SHARED_DB', 'OMNI_DB', 'CRM_DB', 'WORKFLOW_DB', 'ANALYTICS_DB'];
    for (const prefix of dbPrefixes) {
      const dbName = prefix.replace('_DB', '').toLowerCase();
      config.databases[dbName] = this.validateDatabase(prefix, env);
    }

    // Agregar warnings para configuraciones opcionales faltantes
    if (!env.SMTP_HOST) {
      this.warnings.push({
        section: 'email',
        message: 'Configuración de email no encontrada, notificaciones por email deshabilitadas'
      });
    }

    if (!env.SENTRY_DSN) {
      this.warnings.push({
        section: 'monitoring',
        message: 'Sentry DSN no configurado, monitoreo de errores deshabilitado'
      });
    }

    return {
      valid: this.errors.length === 0,
      config: this.errors.length === 0 ? config : null,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  // Validar configuración mínima requerida
  validateMinimum(env) {
    const required = [
      'NODE_ENV',
      'PORT',
      'JWT_SECRET',
      'SHARED_DB_HOST',
      'SHARED_DB_USER',
      'SHARED_DB_PASSWORD'
    ];

    const missing = required.filter(key => !env[key]);

    if (missing.length > 0) {
      return {
        valid: false,
        missing
      };
    }

    return {
      valid: true,
      missing: []
    };
  }

  // Generar reporte de validación
  generateReport() {
    const report = [];
    
    report.push('=== Reporte de Validación de Configuración ===\n');
    
    if (this.errors.length === 0) {
      report.push('✓ Configuración válida\n');
    } else {
      report.push(`✗ Se encontraron ${this.errors.length} errores:\n`);
      
      for (const error of this.errors) {
        report.push(`\n  ${error.section}:`);
        for (const detail of error.details) {
          report.push(`    - ${detail.field}: ${detail.message}`);
        }
      }
    }
    
    if (this.warnings.length > 0) {
      report.push(`\n⚠ ${this.warnings.length} advertencias:`);
      for (const warning of this.warnings) {
        report.push(`  - ${warning.section}: ${warning.message}`);
      }
    }
    
    return report.join('\n');
  }
}

// Singleton instance
const configValidator = new ConfigValidator();

module.exports = configValidator;