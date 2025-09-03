import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { config } from '@config/environment';

const router = Router();

// Función auxiliar para verificar conexión a BD
async function checkDatabase(dbConfig: any): Promise<{ status: string; responseTime: number }> {
  const startTime = Date.now();
  const pool = new Pool({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    connectionTimeoutMillis: 3000
  });
  
  try {
    await pool.query('SELECT 1');
    await pool.end();
    return {
      status: 'healthy',
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    await pool.end();
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime
    };
  }
}

// Health check básico
router.get('/', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      server: 'healthy'
    } as any
  };
  
  // TODO: Descomentar cuando las BDs estén configuradas en Nivel 2
  // Solo verificar si las credenciales no son placeholders
  /*
  if (config.database.shared.password !== 'postgres123') {
    const databases = [
      { name: 'shared_db', config: config.database.shared },
      { name: 'omni_db', config: config.database.omni },
      { name: 'crm_db', config: config.database.crm },
      { name: 'workflow_db', config: config.database.workflow },
      { name: 'analytics_db', config: config.database.analytics }
    ];
    
    for (const db of databases) {
      const result = await checkDatabase(db.config);
      health.services[db.name] = result.status;
      if (result.status === 'unhealthy') {
        health.status = 'degraded';
      }
    }
  }
  */
  
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Readiness check
router.get('/ready', (req: Request, res: Response) => {
  // Verificación simple de que el servidor está listo
  res.json({
    ready: true,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Liveness check
router.get('/live', (req: Request, res: Response) => {
  // Verificación de que el proceso está vivo
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
});

export { router as healthRouter };