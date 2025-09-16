import { Pool } from 'pg';
import { config } from '@config/environment';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

// Conexión básica a base de datos - sin sobreingeniería
// TODO: Implementar pool management avanzado en Nivel 2
// Crear pools para cada base de datos
// Logger instance
const logger = LoggerFactory.create({ file: __filename });

export const dbPools = {
  shared: new Pool({
    host: config.database.shared.host,
    port: config.database.shared.port,
    database: config.database.shared.database,
    user: config.database.shared.user,
    password: config.database.shared.password,
    max: 10, // Máximo de conexiones
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  }),
  omni: new Pool({
    host: config.database.omni.host,
    port: config.database.omni.port,
    database: config.database.omni.database,
    user: config.database.omni.user,
    password: config.database.omni.password,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  }),
  crm: new Pool({
    host: config.database.crm.host,
    port: config.database.crm.port,
    database: config.database.crm.database,
    user: config.database.crm.user,
    password: config.database.crm.password,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  }),
  workflow: new Pool({
    host: config.database.workflow.host,
    port: config.database.workflow.port,
    database: config.database.workflow.database,
    user: config.database.workflow.user,
    password: config.database.workflow.password,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  }),
  analytics: new Pool({
    host: config.database.analytics.host,
    port: config.database.analytics.port,
    database: config.database.analytics.database,
    user: config.database.analytics.user,
    password: config.database.analytics.password,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  })
};
// Función helper para queries básicas
export async function query(pool: Pool, text: string, params?: any[]) {
  try {
    const result = await pool.query(text, params);
    return result.rows;
  } catch (error) {
    logger.error('Error en query:', error);
    throw error;
  }
}
// Cerrar todas las conexiones
export async function closeAllConnections() {
  await Promise.all([
    dbPools.shared.end(),
    dbPools.omni.end(),
    dbPools.crm.end(),
    dbPools.workflow.end(),
    dbPools.analytics.end()
  ]);
}
