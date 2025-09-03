// Configuration interfaces following Interface Segregation Principle (ISP)

export interface IServerConfig {
  port: number;
  host: string;
  env: 'development' | 'production' | 'test';
  apiVersion: string;
  corsOrigins: string[];
}

export interface IDatabaseConfig {
  shared: IDatabaseConnection;
  omni: IDatabaseConnection;
  personas: IDatabaseConnection;
  notificaciones: IDatabaseConnection;
  organizaciones: IDatabaseConnection;
  maxRetries: number;
  retryDelay: number;
  poolSize: number;
}

export interface IDatabaseConnection {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
}

export interface ISecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenSecret: string;
  refreshTokenExpiresIn: string;
  bcryptRounds: number;
  apiKeys: Map<string, string>;
  rateLimitWindow: number;
  rateLimitMax: number;
}

export interface ILoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'simple';
  dirname: string;
  filename: string;
  maxSize: string;
  maxFiles: string;
  handleExceptions: boolean;
  handleRejections: boolean;
}

export interface ICacheConfig {
  defaultTTL: number;
  checkPeriod: number;
  maxKeys: number;
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
}

export interface IConfig {
  server: IServerConfig;
  database: IDatabaseConfig;
  security: ISecurityConfig;
  logging: ILoggingConfig;
  cache: ICacheConfig;
}