// Database Connection Interface - Sprint 1
// TODO: En Nivel 2 expandir con más métodos avanzados
import { PoolClient, QueryResult } from 'pg';

export interface IDatabaseConnection {
  query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
  transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
  healthCheck(): Promise<boolean>;
  close(): Promise<void>;
  connect(): Promise<PoolClient>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getClient(): Promise<PoolClient>;
  getPoolStatus(): {
    total: number;
    idle: number;
    waiting: number;
  };
}
