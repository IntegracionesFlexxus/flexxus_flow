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
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
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
    try {
      const result = await this.pool.query<T>(text, params);
      this.connected = true;
      return result;
    } catch (error) {
      console.error('CRM query error:', error);
      throw error;
    }
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
