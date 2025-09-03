const { Pool } = require('pg');

// Clase para checks de bases de datos
class DatabaseCheck {
  constructor(options = {}) {
    this.name = 'database';
    this.databases = options.databases || this.getDefaultDatabases();
    this.pools = new Map();
    this.timeout = options.timeout || 5000;
  }

  // Configuración por defecto de bases de datos
  // TODO: Mover a .env en Nivel 2
  getDefaultDatabases() {
    return {
      shared: {
        host: 'localhost',
        port: 5432,
        database: 'flexxus_shared',
        user: 'flexxus_user',
        password: 'flexxus_pass_123',
        max: 2, // Pool pequeño para health checks
        connectionTimeoutMillis: 5000
      },
      omni: {
        host: 'localhost',
        port: 5432,
        database: 'flexxus_omni',
        user: 'flexxus_user',
        password: 'flexxus_pass_123',
        max: 2,
        connectionTimeoutMillis: 5000
      },
      crm: {
        host: 'localhost',
        port: 5432,
        database: 'flexxus_crm',
        user: 'flexxus_user',
        password: 'flexxus_pass_123',
        max: 2,
        connectionTimeoutMillis: 5000
      },
      workflow: {
        host: 'localhost',
        port: 5432,
        database: 'flexxus_workflow',
        user: 'flexxus_user',
        password: 'flexxus_pass_123',
        max: 2,
        connectionTimeoutMillis: 5000
      },
      analytics: {
        host: 'localhost',
        port: 5432,
        database: 'flexxus_analytics',
        user: 'flexxus_user',
        password: 'flexxus_pass_123',
        max: 2,
        connectionTimeoutMillis: 5000
      }
    };
  }

  // Obtener o crear pool de conexión
  getPool(name, config) {
    if (!this.pools.has(name)) {
      this.pools.set(name, new Pool(config));
    }
    return this.pools.get(name);
  }

  // Check individual de base de datos
  async checkDatabase(name, config) {
    const startTime = Date.now();
    const pool = this.getPool(name, config);
    
    try {
      // Timeout para la query
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), this.timeout);
      });
      
      // Query de prueba
      const queryPromise = pool.query('SELECT 1 as health, NOW() as timestamp');
      
      const result = await Promise.race([queryPromise, timeoutPromise]);
      const responseTime = Date.now() - startTime;
      
      // Obtener métricas adicionales
      const poolStats = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      };
      
      return {
        name: `database.${name}`,
        status: 'healthy',
        responseTime,
        details: {
          database: config.database,
          host: config.host,
          port: config.port,
          timestamp: result.rows[0].timestamp,
          pool: poolStats
        }
      };
    } catch (error) {
      return {
        name: `database.${name}`,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
        details: {
          database: config.database,
          host: config.host,
          port: config.port
        }
      };
    }
  }

  // Check de todas las bases de datos
  async checkAll() {
    const checks = [];
    
    for (const [name, config] of Object.entries(this.databases)) {
      checks.push(this.checkDatabase(name, config));
    }
    
    const results = await Promise.all(checks);
    const overall = this.aggregateStatus(results);
    
    return {
      name: this.name,
      status: overall,
      checks: results
    };
  }

  // Check específico de una base de datos
  async check(databaseName) {
    if (!this.databases[databaseName]) {
      return {
        name: `database.${databaseName}`,
        status: 'unknown',
        error: 'Database configuration not found'
      };
    }
    
    return await this.checkDatabase(databaseName, this.databases[databaseName]);
  }

  // Verificar replicación (si aplica)
  async checkReplication(primaryName, replicaName) {
    const startTime = Date.now();
    
    try {
      const primary = this.databases[primaryName];
      const replica = this.databases[replicaName];
      
      if (!primary || !replica) {
        throw new Error('Database configuration not found');
      }
      
      const primaryPool = this.getPool(primaryName, primary);
      const replicaPool = this.getPool(replicaName, replica);
      
      // Obtener LSN del primary
      const primaryResult = await primaryPool.query(
        "SELECT pg_current_wal_lsn() as lsn, NOW() as timestamp"
      );
      
      // Obtener LSN del replica
      const replicaResult = await replicaPool.query(
        "SELECT pg_last_wal_receive_lsn() as receive_lsn, pg_last_wal_replay_lsn() as replay_lsn, NOW() as timestamp"
      );
      
      // Calcular lag
      const lagResult = await replicaPool.query(`
        SELECT 
          EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) as lag_seconds
      `);
      
      const lagSeconds = lagResult.rows[0].lag_seconds || 0;
      const status = lagSeconds < 10 ? 'healthy' : lagSeconds < 60 ? 'degraded' : 'unhealthy';
      
      return {
        name: 'database.replication',
        status,
        responseTime: Date.now() - startTime,
        details: {
          primary: {
            name: primaryName,
            lsn: primaryResult.rows[0].lsn
          },
          replica: {
            name: replicaName,
            receive_lsn: replicaResult.rows[0].receive_lsn,
            replay_lsn: replicaResult.rows[0].replay_lsn
          },
          lag: {
            seconds: lagSeconds,
            human: `${Math.round(lagSeconds * 100) / 100}s`
          }
        }
      };
    } catch (error) {
      return {
        name: 'database.replication',
        status: 'unknown',
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  // Agregar estados
  aggregateStatus(results) {
    const hasUnhealthy = results.some(r => r.status === 'unhealthy');
    const hasDegraded = results.some(r => r.status === 'degraded');
    
    if (hasUnhealthy) return 'unhealthy';
    if (hasDegraded) return 'degraded';
    return 'healthy';
  }

  // Limpiar conexiones
  async cleanup() {
    for (const [name, pool] of this.pools) {
      try {
        await pool.end();
        console.log(`Pool cerrado: ${name}`);
      } catch (error) {
        console.error(`Error cerrando pool ${name}:`, error.message);
      }
    }
    this.pools.clear();
  }
}

module.exports = DatabaseCheck;