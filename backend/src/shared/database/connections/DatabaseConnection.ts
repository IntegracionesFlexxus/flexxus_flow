// Database Connection Implementation - Sprint 1
// Implementación básica para MVP con pool de conexiones

import { Pool, PoolClient, PoolConfig } from 'pg';
import { injectable } from 'inversify';
import { IDatabaseConnection } from '../interfaces/IDatabaseConnection';
import winston from 'winston';

@injectable()
export class DatabaseConnection implements IDatabaseConnection {
  private pool: Pool;
  private logger: winston.Logger;
  private dbName: string;

  constructor(config: PoolConfig & { dbName: string }) {
    this.dbName = config.dbName;
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.max || 20,
      min: config.min || 5,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      ssl: config.ssl || false
    });

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

  async query<T>(text: string, params?: any[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const start = Date.now();
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      // Log queries en desarrollo
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(`Query executed in ${duration}ms: ${text.substring(0, 100)}`);
      }
      
      return result.rows;
    } catch (error) {
      this.logger.error('Database query error:', error);
      throw error;
    } finally {
      client.release();
    }
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