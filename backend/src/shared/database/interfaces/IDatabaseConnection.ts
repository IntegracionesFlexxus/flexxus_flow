// Database Connection Interface - Sprint 1
// TODO: En Nivel 2 expandir con más métodos avanzados

import { PoolClient } from 'pg';

export interface IDatabaseConnection {
  query<T>(text: string, params?: any[]): Promise<T[]>;
  transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
  healthCheck(): Promise<boolean>;
  close(): Promise<void>;
  getPoolStatus(): {
    total: number;
    idle: number;
    waiting: number;
  };
}