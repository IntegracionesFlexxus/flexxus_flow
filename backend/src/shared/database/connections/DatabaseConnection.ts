// TODO: SECURITY REVIEW - Este archivo contiene información sensible
// Verificar que todos los logs estén correctamente sanitizados

// Database Connection Implementation - Sprint 1
// Implementación básica para MVP con pool de conexiones
import { Pool, PoolClient, PoolConfig } from 'pg';
import { injectable } from 'inversify';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import winston from 'winston';
import { environment } from '@/config/environment';

@injectable()
export class DatabaseConnection implements IDatabaseConnection {
  private pool: Pool;
  private logger: winston.Logger;
  private dbName: string;
  constructor(config: PoolConfig & { dbName: string }, logger?: winston.Logger) {
    this.logger = logger || winston.createLogger({
      level: 'info',
      format: winston.format.simple(),
      transports: [new winston.transports.Console()]
    });
    this.logger.info('DatabaseConnection constructor called with config:', config);
    if (!config) {
      throw new Error('DatabaseConnection: config is null or undefined');
    }
    if (!config.host) {
      throw new Error('DatabaseConnection: config.host is null or undefined');
    }
    if (!config.database) {
      throw new Error('DatabaseConnection: config.database is null or undefined');
    }
    if (!config.user) {
      throw new Error('DatabaseConnection: config.user is null or undefined');
    }
    // Password can be empty string but not null/undefined
    if (config.password === null || config.password === undefined) {
      throw new Error('DatabaseConnection: config.password is null or undefined');
    }
    this.dbName = config.dbName;
    // Create pool configuration with explicit null checks
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port || 5432,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.max || 20,
      min: config.min || 5,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000
    };
    // Only add ssl if it's explicitly set
    if (config.ssl !== undefined) {
      poolConfig.ssl = config.ssl;
    }
    this.logger.info('Creating Pool with config:', poolConfig);
    try {
      this.pool = new Pool(poolConfig);
    } catch (error) {
      this.logger.error('Failed to create Pool:', error);
      throw error;
    }
    // Logger básico para Sprint 1
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.simple(),
      defaultMeta: { service: `db-${this.dbName}` },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: `logs/db-${this.dbName}.log` })
      ]
    });
    this.setupEventHandlers();
  }
  async query<T = any>(text: string, params?: any[]): Promise<import('pg').QueryResult<T>> {
    const client = await this.pool.connect();
    try {
      const start = Date.now();
      const result = await client.query<T>(text, params);
      const duration = Date.now() - start;
      // Log queries en desarrollo
      if (environment.isDevelopment) {
        this.logger.debug(`Query executed in ${duration}ms: ${text.substring(0, 100)}`);
      }
      return result;
    } catch (error) {
      this.logger.error('Database query error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Transaction error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error(`Database ${this.dbName} health check failed:`, error);
      return false;
    }
  }
  private setupEventHandlers(): void {
    this.pool.on('connect', () => {
      this.logger.info(`New connection established to ${this.dbName}`);
    });
    this.pool.on('error', (err) => {
      this.logger.error(`Database pool error for ${this.dbName}:`, err);
    });
    this.pool.on('remove', () => {
      this.logger.debug(`Client removed from pool ${this.dbName}`);
    });
  }
  getPoolStatus() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount
    };
  }
  async close(): Promise<void> {
    await this.pool.end();
    this.logger.info(`Database connection pool closed for ${this.dbName}`);
  }
}
