import { Pool, PoolClient, QueryResult } from 'pg';
import { injectable } from 'inversify';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';

@injectable()
export class CRMDatabaseConnection implements IDatabaseConnection {
  private pool: Pool;
  private connected = false;

  constructor() {
    this.pool = new Pool({
      host: process.env.CRM_DB_HOST || '10.254.252.91',
      port: parseInt(process.env.CRM_DB_PORT || '5003', 10),
      database: process.env.CRM_DB_NAME || 'flexxus_crm',
      user: process.env.CRM_DB_USER || 'flexxus',
      password: process.env.CRM_DB_PASSWORD || 'Flexxus2023**',
      max: 20,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased from 2s to 10s
      statement_timeout: 30000, // 30s timeout for queries
      query_timeout: 30000 // 30s timeout for queries
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle CRM client', err);
    });

    this.pool.on('connect', () => {
      this.connected = true;
      console.log('New client connected to CRM database');
    });
  }

  async connect(): Promise<PoolClient> {
    const client = await this.pool.connect();
    this.connected = true;
    return client;
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
    this.connected = false;
    console.log('Disconnected from CRM database');
  }

  async close(): Promise<void> {
    await this.disconnect();
  }

  isConnected(): boolean {
    if (this.connected) {
      return true;
    }
    return this.pool.totalCount > 0;
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.pool.query<T>(text, params);
        this.connected = true;
        return result;
      } catch (error: any) {
        lastError = error;
        console.error(`CRM query error (attempt ${attempt}/${maxRetries}):`, error.message);

        // Don't retry on syntax errors or constraint violations
        if (error.code && ['42601', '42P01', '23505', '23503'].includes(error.code)) {
          throw error;
        }

        // Retry on connection/timeout errors
        if (attempt < maxRetries && this.isRetryableError(error)) {
          await this.delay(1000 * attempt); // Exponential backoff
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  private isRetryableError(error: any): boolean {
    const retryableCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET'];
    const retryableMessages = ['Connection terminated', 'connection timeout', 'Connection error'];

    return (
      retryableCodes.includes(error.code) ||
      retryableMessages.some(msg => error.message?.includes(msg))
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getClient(): Promise<PoolClient> {
    const client = await this.pool.connect();
    this.connected = true;
    return client;
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
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  getPoolStatus(): { total: number; idle: number; waiting: number } {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount
    };
  }

  getPool(): Pool {
    return this.pool;
  }
}
