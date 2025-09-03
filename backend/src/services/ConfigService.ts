import { injectable } from 'inversify';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as Joi from 'joi';
import {
  IConfig,
  IServerConfig,
  IDatabaseConfig,
  ISecurityConfig,
  ILoggingConfig,
  ICacheConfig,
  IDatabaseConnection
} from '@interfaces/IConfig';

@injectable()
export class ConfigService implements IConfig {
  public server: IServerConfig;
  public database: IDatabaseConfig;
  public security: ISecurityConfig;
  public logging: ILoggingConfig;
  public cache: ICacheConfig;

  constructor() {
    // Load environment variables
    this.loadEnvFile();
    
    // Validate and set configuration
    this.validateAndSetConfig();
  }

  private loadEnvFile(): void {
    const env = process.env.NODE_ENV || 'development';
    const envPath = path.resolve(process.cwd(), `.env.${env}`);
    const defaultEnvPath = path.resolve(process.cwd(), '.env');
    
    // Try environment-specific file first, then default
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      dotenv.config({ path: defaultEnvPath });
    }
  }

  private validateAndSetConfig(): void {
    // Define validation schema
    const schema = Joi.object({
      // Server config
      PORT: Joi.number().default(3000),
      HOST: Joi.string().default('localhost'),
      NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
      API_VERSION: Joi.string().default('v1'),
      CORS_ORIGINS: Joi.string().default('*'),
      
      // Database config
      DB_SHARED_HOST: Joi.string().required(),
      DB_SHARED_PORT: Joi.number().default(5432),
      DB_SHARED_NAME: Joi.string().required(),
      DB_SHARED_USER: Joi.string().required(),
      DB_SHARED_PASSWORD: Joi.string().required(),
      
      DB_OMNI_HOST: Joi.string().required(),
      DB_OMNI_PORT: Joi.number().default(5432),
      DB_OMNI_NAME: Joi.string().required(),
      DB_OMNI_USER: Joi.string().required(),
      DB_OMNI_PASSWORD: Joi.string().required(),
      
      DB_PERSONAS_HOST: Joi.string().required(),
      DB_PERSONAS_PORT: Joi.number().default(5432),
      DB_PERSONAS_NAME: Joi.string().required(),
      DB_PERSONAS_USER: Joi.string().required(),
      DB_PERSONAS_PASSWORD: Joi.string().required(),
      
      DB_NOTIFICACIONES_HOST: Joi.string().required(),
      DB_NOTIFICACIONES_PORT: Joi.number().default(5432),
      DB_NOTIFICACIONES_NAME: Joi.string().required(),
      DB_NOTIFICACIONES_USER: Joi.string().required(),
      DB_NOTIFICACIONES_PASSWORD: Joi.string().required(),
      
      DB_ORGANIZACIONES_HOST: Joi.string().required(),
      DB_ORGANIZACIONES_PORT: Joi.number().default(5432),
      DB_ORGANIZACIONES_NAME: Joi.string().required(),
      DB_ORGANIZACIONES_USER: Joi.string().required(),
      DB_ORGANIZACIONES_PASSWORD: Joi.string().required(),
      
      DB_MAX_RETRIES: Joi.number().default(3),
      DB_RETRY_DELAY: Joi.number().default(1000),
      DB_POOL_SIZE: Joi.number().default(10),
      
      // Security config
      JWT_SECRET: Joi.string().required(),
      JWT_EXPIRES_IN: Joi.string().default('1h'),
      REFRESH_TOKEN_SECRET: Joi.string().required(),
      REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),
      BCRYPT_ROUNDS: Joi.number().default(10),
      API_KEYS: Joi.string().default(''),
      RATE_LIMIT_WINDOW: Joi.number().default(900000),
      RATE_LIMIT_MAX: Joi.number().default(100),
      
      // Logging config
      LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
      LOG_FORMAT: Joi.string().valid('json', 'simple').default('json'),
      LOG_DIR: Joi.string().default('logs'),
      LOG_FILENAME: Joi.string().default('app-%DATE%.log'),
      LOG_MAX_SIZE: Joi.string().default('20m'),
      LOG_MAX_FILES: Joi.string().default('14d'),
      
      // Cache config
      CACHE_DEFAULT_TTL: Joi.number().default(300),
      CACHE_CHECK_PERIOD: Joi.number().default(600),
      CACHE_MAX_KEYS: Joi.number().default(1000),
      REDIS_HOST: Joi.string().default('localhost'),
      REDIS_PORT: Joi.number().default(6379),
      REDIS_PASSWORD: Joi.string().allow(''),
      REDIS_DB: Joi.number().default(0)
    });

    // Validate environment variables
    const { error, value } = schema.validate(process.env, {
      abortEarly: false,
      allowUnknown: true
    });

    if (error) {
      throw new Error(`Configuration validation error: ${error.message}`);
    }

    // Set server config
    this.server = {
      port: value.PORT,
      host: value.HOST,
      env: value.NODE_ENV as 'development' | 'production' | 'test',
      apiVersion: value.API_VERSION,
      corsOrigins: value.CORS_ORIGINS.split(',').map((origin: string) => origin.trim())
    };

    // Set database config
    this.database = {
      shared: this.createDatabaseConnection('SHARED', value),
      omni: this.createDatabaseConnection('OMNI', value),
      personas: this.createDatabaseConnection('PERSONAS', value),
      notificaciones: this.createDatabaseConnection('NOTIFICACIONES', value),
      organizaciones: this.createDatabaseConnection('ORGANIZACIONES', value),
      maxRetries: value.DB_MAX_RETRIES,
      retryDelay: value.DB_RETRY_DELAY,
      poolSize: value.DB_POOL_SIZE
    };

    // Set security config
    this.security = {
      jwtSecret: value.JWT_SECRET,
      jwtExpiresIn: value.JWT_EXPIRES_IN,
      refreshTokenSecret: value.REFRESH_TOKEN_SECRET,
      refreshTokenExpiresIn: value.REFRESH_TOKEN_EXPIRES_IN,
      bcryptRounds: value.BCRYPT_ROUNDS,
      apiKeys: this.parseApiKeys(value.API_KEYS),
      rateLimitWindow: value.RATE_LIMIT_WINDOW,
      rateLimitMax: value.RATE_LIMIT_MAX
    };

    // Set logging config
    this.logging = {
      level: value.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug',
      format: value.LOG_FORMAT as 'json' | 'simple',
      dirname: value.LOG_DIR,
      filename: value.LOG_FILENAME,
      maxSize: value.LOG_MAX_SIZE,
      maxFiles: value.LOG_MAX_FILES,
      handleExceptions: true,
      handleRejections: true
    };

    // Set cache config
    this.cache = {
      defaultTTL: value.CACHE_DEFAULT_TTL,
      checkPeriod: value.CACHE_CHECK_PERIOD,
      maxKeys: value.CACHE_MAX_KEYS,
      redis: value.REDIS_HOST ? {
        host: value.REDIS_HOST,
        port: value.REDIS_PORT,
        password: value.REDIS_PASSWORD || undefined,
        db: value.REDIS_DB
      } : undefined
    };
  }

  private createDatabaseConnection(prefix: string, env: any): IDatabaseConnection {
    return {
      host: env[`DB_${prefix}_HOST`],
      port: env[`DB_${prefix}_PORT`],
      database: env[`DB_${prefix}_NAME`],
      user: env[`DB_${prefix}_USER`],
      password: env[`DB_${prefix}_PASSWORD`],
      ssl: env.NODE_ENV === 'production',
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000
    };
  }

  private parseApiKeys(apiKeysString: string): Map<string, string> {
    const apiKeys = new Map<string, string>();
    
    if (!apiKeysString) return apiKeys;
    
    // Format: key1:service1,key2:service2
    const pairs = apiKeysString.split(',');
    for (const pair of pairs) {
      const [key, service] = pair.split(':');
      if (key && service) {
        apiKeys.set(key.trim(), service.trim());
      }
    }
    
    return apiKeys;
  }

  // Helper methods for accessing config
  public isDevelopment(): boolean {
    return this.server.env === 'development';
  }

  public isProduction(): boolean {
    return this.server.env === 'production';
  }

  public isTest(): boolean {
    return this.server.env === 'test';
  }

  public getDatabaseUrl(database: keyof IDatabaseConfig): string {
    const db = this.database[database] as IDatabaseConnection;
    if (!db) throw new Error(`Database ${database} not configured`);
    
    return `postgresql://${db.user}:${db.password}@${db.host}:${db.port}/${db.database}`;
  }

  public getRedisUrl(): string | null {
    if (!this.cache.redis) return null;
    
    const { host, port, password, db } = this.cache.redis;
    if (password) {
      return `redis://:${password}@${host}:${port}/${db}`;
    }
    return `redis://${host}:${port}/${db}`;
  }
}