const { Pool } = require('pg');

// Clase para manejar conexiones a base de datos con pool
class DatabaseConnection {
  constructor(config, name) {
    this.name = name;
    this.config = config;
    this.pool = null;
    this.isConnected = false;
  }

  // Inicializar pool de conexiones
  async connect() {
    if (this.isConnected) {
      console.log(`✓ Ya conectado a ${this.name}`);
      return;
    }

    try {
      this.pool = new Pool(this.config);
      
      // Verificar conexión inicial
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      this.isConnected = true;
      console.log(`✓ Conectado a base de datos ${this.name}`);
      
      // Configurar event handlers
      this.setupEventHandlers();
      
    } catch (error) {
      console.error(`✗ Error conectando a ${this.name}:`, error.message);
      throw error;
    }
  }

  // Configurar manejadores de eventos del pool
  setupEventHandlers() {
    this.pool.on('connect', () => {
      console.log(`→ Nueva conexión establecida en ${this.name}`);
    });

    this.pool.on('error', (err) => {
      console.error(`✗ Error en pool ${this.name}:`, err.message);
    });

    this.pool.on('remove', () => {
      console.log(`← Conexión removida del pool ${this.name}`);
    });
  }

  // Ejecutar query simple
  async query(text, params = []) {
    if (!this.isConnected) {
      await this.connect();
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      // Log de queries en desarrollo
      console.log(`Query ejecutado en ${this.name} (${duration}ms)`);
      
      return result;
    } catch (error) {
      console.error(`Error en query ${this.name}:`, error.message);
      throw error;
    }
  }

  // Obtener cliente para transacciones
  async getClient() {
    if (!this.isConnected) {
      await this.connect();
    }
    return await this.pool.connect();
  }

  // Ejecutar transacción
  async transaction(callback) {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Transacción rollback en ${this.name}:`, error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  // Health check de la conexión
  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as health');
      return {
        database: this.name,
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        database: this.name,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Obtener estadísticas del pool
  getPoolStats() {
    if (!this.pool) {
      return null;
    }

    return {
      database: this.name,
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount
    };
  }

  // Cerrar todas las conexiones
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log(`✓ Pool cerrado para ${this.name}`);
    }
  }
}

module.exports = DatabaseConnection;