/**
 * CRM Database Configuration
 * Conexión específica para la base de datos flexxus_crm
 */

import { Pool } from 'pg';
import { injectable } from 'inversify';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';

@injectable()
export class CRMDatabaseConnection implements IDatabaseConnection {
  private pool: Pool;
  private isConnected: boolean = false;

  constructor() {
    // Configuración específica para CRM
    this.pool = new Pool({
      host: process.env.CRM_DB_HOST || '10.254.252.91',
      port: parseInt(process.env.CRM_DB_PORT || '5003'),
      database: process.env.CRM_DB_NAME || 'flexxus_crm',
      user: process.env.CRM_DB_USER || 'flexxus',
      password: process.env.CRM_DB_PASSWORD || 'Flexxus2023**',
      max: 20, // Máximo de conexiones en el pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Event listeners
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle CRM client', err);
    });

    this.pool.on('connect', () => {
      console.log('New client connected to CRM database');
    });
  }

  /**
   * Connect to CRM database
   */
  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.isConnected = true;
      console.log('✅ Connected to CRM database successfully');
    } catch (error) {
      console.error('❌ Failed to connect to CRM database:', error);
      throw error;
    }
  }

  /**
   * Execute a query
   */
  async query(text: string, params?: any[]): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      console.error('CRM Query error:', error);
      throw error;
    }
  }

  /**
   * Get a client for transactions
   */
  async getClient(): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }
    return this.pool.connect();
  }

  /**
   * Execute transaction
   */
  async transaction(callback: (client: any) => Promise<any>): Promise<any> {
    const client = await this.getClient();
    
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

  /**
   * Close all connections
   */
  async disconnect(): Promise<void> {
    await this.pool.end();
    this.isConnected = false;
    console.log('Disconnected from CRM database');
  }

  /**
   * Check connection status
   */
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the underlying pool for direct access
   */
  getPool(): Pool {
    return this.pool;
  }
}