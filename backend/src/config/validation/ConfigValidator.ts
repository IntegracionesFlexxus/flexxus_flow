/**
 * Configuration Validator - Sprint 2
 * Siguiendo lineamientos nivel 2: validación de configuración
 * Sistema de validación con schemas para todas las configuraciones
 */
import Joi, { ValidationResult, Schema } from 'joi';
import { Environment } from '@/config/environment';
export interface ValidationError {
  path: string;
  message: string;
  value?: any;
  type: string;
}
export interface ValidationReport {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  timestamp: Date;
  environment: string;
}
export class ConfigValidator {
  private schemas: Map<string, Schema> = new Map();
  private validationCache: Map<string, ValidationReport> = new Map();
  constructor() {
    this.registerDefaultSchemas();
  }
  /**
   * Register default validation schemas
   */
  private registerDefaultSchemas(): void {
    // Application schema
    this.registerSchema('app', Joi.object({
      name: Joi.string().required(),
      version: Joi.string().pattern(/^\d+\.\d+\.\d+/).required(),
      port: Joi.number().port().required(),
      host: Joi.string().hostname().required(),
      baseUrl: Joi.string().uri().optional(),
      apiPrefix: Joi.string().pattern(/^\/[a-z0-9-\/]+$/i).required(),
    }));
    // Database schema
    this.registerSchema('database', Joi.object({
      host: Joi.string().required(),
      port: Joi.number().port().required(),
      database: Joi.string().required(),
      user: Joi.string().required(),
      password: Joi.string().min(8).required(),
      ssl: Joi.boolean().optional(),
      poolMin: Joi.number().min(0).optional(),
      poolMax: Joi.number().min(1).optional(),
    }));
    // JWT schema
    this.registerSchema('jwt', Joi.object({
      secret: Joi.string().min(32).required(),
      refreshSecret: Joi.string().min(32).required(),
      expiresIn: Joi.string().pattern(/^\d+[smhd]$/).required(),
      refreshExpiresIn: Joi.string().pattern(/^\d+[smhd]$/).required(),
      issuer: Joi.string().required(),
      audience: Joi.string().required(),
      algorithm: Joi.string().valid('HS256', 'HS384', 'HS512', 'RS256').required(),
    }));
    // Redis schema
    this.registerSchema('redis', Joi.object({
      host: Joi.string().required(),
      port: Joi.number().port().required(),
      password: Joi.string().allow('').optional(),
      db: Joi.number().min(0).max(15).required(),
      keyPrefix: Joi.string().optional(),
      ttl: Joi.number().min(0).optional(),
    }));
    // Session schema
    this.registerSchema('session', Joi.object({
      secret: Joi.string().min(32).required(),
      name: Joi.string().required(),
      cookie: Joi.object({
        maxAge: Joi.number().min(0).required(),
        secure: Joi.boolean().required(),
        httpOnly: Joi.boolean().required(),
        sameSite: Joi.string().valid('strict', 'lax', 'none').required(),
      }).required(),
    }));
    // Security schema
    this.registerSchema('security', Joi.object({
      bcryptRounds: Joi.number().min(10).max(20).required(),
      rateLimiting: Joi.object({
        windowMs: Joi.number().min(0).required(),
        maxRequests: Joi.number().min(1).required(),
        skipSuccessful: Joi.boolean().optional(),
        skipFailed: Joi.boolean().optional(),
      }).required(),
    }));
    // Email schema
    this.registerSchema('email', Joi.object({
      enabled: Joi.boolean().required(),
      provider: Joi.string().valid('smtp', 'sendgrid', 'aws-ses', 'mailgun').required(),
      from: Joi.string().email().when('enabled', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      replyTo: Joi.string().email().optional(),
      smtp: Joi.object({
        host: Joi.string().when('...provider', {
          is: 'smtp',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        port: Joi.number().port().optional(),
        secure: Joi.boolean().optional(),
        user: Joi.string().allow('').optional(),
        password: Joi.string().allow('').optional(),
      }).optional(),
    }));
    // Storage schema
    this.registerSchema('storage', Joi.object({
      provider: Joi.string().valid('local', 's3', 'gcs', 'azure').required(),
      local: Joi.object({
        uploadDir: Joi.string().required(),
        tempDir: Joi.string().required(),
        maxFileSize: Joi.number().min(1).required(),
      }).when('provider', {
        is: 'local',
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }));
    // Cache schema
    this.registerSchema('cache', Joi.object({
      enabled: Joi.boolean().required(),
      ttl: Joi.number().min(0).required(),
      maxKeys: Joi.number().min(0).required(),
      checkPeriod: Joi.number().min(0).required(),
    }));
    // Monitoring schema
    this.registerSchema('monitoring', Joi.object({
      enabled: Joi.boolean().required(),
      metricsPort: Joi.number().port().optional(),
      healthCheckPath: Joi.string().pattern(/^\/[a-z0-9-\/]+$/i).optional(),
    }));
  }
  /**
   * Register a custom schema
   */
  registerSchema(name: string, schema: Schema): void {
    this.schemas.set(name, schema);
  }
  /**
   * Validate configuration section
   */
  validate(name: string, config: any): ValidationResult {
    const schema = this.schemas.get(name);
    if (!schema) {
      throw new Error(`No schema registered for '${name}'`);
    }
    return schema.validate(config, {
      abortEarly: false,
      allowUnknown: false,
    });
  }
  /**
   * Validate entire configuration
   */
  validateAll(config: Partial<Environment>): ValidationReport {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    // Validate each section
    for (const [name, schema] of this.schemas.entries()) {
      const sectionConfig = this.getConfigSection(config, name);
      if (sectionConfig) {
        const result = schema.validate(sectionConfig, {
          abortEarly: false,
          allowUnknown: false,
        });
        if (result.error) {
          result.error.details.forEach(detail => {
            errors.push({
              path: `${name}.${detail.path.join('.')}`,
              message: detail.message,
              value: detail.context?.value,
              type: detail.type,
            });
          });
        }
        if (result.warning) {
          result.warning.details.forEach(detail => {
            warnings.push({
              path: `${name}.${detail.path.join('.')}`,
              message: detail.message,
              value: detail.context?.value,
              type: detail.type,
            });
          });
        }
      }
    }
    const report: ValidationReport = {
      isValid: errors.length === 0,
      errors,
      warnings,
      timestamp: new Date(),
      environment: config.nodeEnv || 'unknown',
    };
    // Cache the report
    const cacheKey = JSON.stringify(config);
    this.validationCache.set(cacheKey, report);
    return report;
  }
  /**
   * Validate with custom rules
   */
  validateWithRules(config: any, rules: Record<string, any>): ValidationResult {
    const schema = Joi.object(rules);
    return schema.validate(config, {
      abortEarly: false,
      allowUnknown: true,
    });
  }
  /**
   * Check if configuration is production-ready
   */
  isProductionReady(config: Partial<Environment>): boolean {
    const productionRequirements = [
      // Security requirements
      () => config.security?.bcryptRounds && config.security.bcryptRounds >= 12,
      () => config.jwt?.secret && config.jwt.secret.length >= 32,
      () => config.jwt?.refreshSecret && config.jwt.refreshSecret.length >= 32,
      () => config.session?.secret && config.session.secret.length >= 32,
      () => config.session?.cookie?.secure === true,
      () => config.session?.cookie?.httpOnly === true,
      // Database requirements
      () => config.database?.shared?.ssl === true,
      () => config.database?.shared?.password && config.database.shared.password.length >= 12,
      // Monitoring requirements
      () => config.monitoring?.enabled === true,
      () => config.logging?.auditEnabled === true,
      // Email requirements
      () => config.email?.enabled === true,
      () => config.email?.from && config.email.from.includes('@'),
    ];
    return productionRequirements.every(requirement => {
      try {
        return requirement();
      } catch {
        return false;
      }
    });
  }
  /**
   * Get configuration recommendations
   */
  getRecommendations(config: Partial<Environment>): string[] {
    const recommendations: string[] = [];
    // Security recommendations
    if (config.security?.bcryptRounds && config.security.bcryptRounds < 12) {
      recommendations.push('Consider increasing bcrypt rounds to at least 12 for better security');
    }
    if (config.jwt?.expiresIn && this.parseTime(config.jwt.expiresIn) > 3600) {
      recommendations.push('Consider reducing JWT expiration time for better security');
    }
    // Performance recommendations
    if (config.cache?.enabled === false) {
      recommendations.push('Enable caching for better performance');
    }
    if (config.database?.shared?.poolMax && config.database.shared.poolMax < 10) {
      recommendations.push('Consider increasing database connection pool size for better performance');
    }
    // Monitoring recommendations
    if (!config.monitoring?.enabled) {
      recommendations.push('Enable monitoring for better observability');
    }
    if (!config.logging?.auditEnabled) {
      recommendations.push('Enable audit logging for compliance and security');
    }
    return recommendations;
  }
  /**
   * Get config section by name
   */
  private getConfigSection(config: any, name: string): any {
    return config[name];
  }
  /**
   * Parse time string to seconds
   */
  private parseTime(time: string): number {
    const match = time.match(/^(\d+)([smhd])$/);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 0;
    }
  }
  /**
   * Export validation report as JSON
   */
  exportReport(report: ValidationReport): string {
    return JSON.stringify(report, null, 2);
  }
  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
  }
}
/**
 * Singleton instance
 */
let validatorInstance: ConfigValidator | null = null;
/**
 * Get or create ConfigValidator instance
 */
export function getConfigValidator(): ConfigValidator {
  if (!validatorInstance) {
    validatorInstance = new ConfigValidator();
  }
  return validatorInstance;
}
/**
 * Pre-defined validation rules
 */
export const ValidationRules = {
  // URL validation
  url: Joi.string().uri({
    scheme: ['http', 'https'],
  }),
  // Email validation
  email: Joi.string().email({
    minDomainSegments: 2,
  }),
  // Strong password validation
  strongPassword: Joi.string()
    .min(12)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  // API key validation
  apiKey: Joi.string()
    .alphanum()
    .min(32)
    .max(64),
  // Semantic version validation
  semver: Joi.string()
    .pattern(/^\d+\.\d+\.\d+(-[a-z]+\.\d+)?$/),
  // Duration validation
  duration: Joi.string()
    .pattern(/^\d+[smhd]$/),
  // File path validation
  filePath: Joi.string()
    .pattern(/^[a-zA-Z0-9._\-\/\\]+$/),
  // Host validation
  host: Joi.alternatives().try(
    Joi.string().hostname(),
    Joi.string().ip()
  ),
  // Port validation
  port: Joi.number()
    .port(),
  // Percentage validation
  percentage: Joi.number()
    .min(0)
    .max(100),
};
