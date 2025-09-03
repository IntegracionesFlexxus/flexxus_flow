const DatabaseConnection = require('./DatabaseConnection');
const { DB_CONFIG } = require('../config/databases');

// Manager para manejar múltiples conexiones a bases de datos
class ConnectionManager {
  constructor() {
    this.connections = new Map();
    this.initialized = false;
  }

  // Inicializar todas las conexiones
  async initialize() {
    if (this.initialized) {
      console.log('✓ ConnectionManager ya inicializado');
      return;
    }

    console.log('Inicializando conexiones a bases de datos...');
    
    // Crear conexiones para cada base de datos
    for (const [name, config] of Object.entries(DB_CONFIG)) {
      const connection = new DatabaseConnection(config, name);
      this.connections.set(name, connection);
      
      // Conectar inmediatamente las bases críticas
      if (['shared', 'omni'].includes(name)) {
        await connection.connect();
      }
    }

    this.initialized = true;
    console.log('✓ Todas las conexiones inicializadas');
  }

  // Obtener conexión específica
  getConnection(name) {
    if (!this.connections.has(name)) {
      throw new Error(`Conexión '${name}' no encontrada`);
    }
    return this.connections.get(name);
  }

  // Ejecutar query en una base de datos específica
  async query(database, text, params) {
    const connection = this.getConnection(database);
    return await connection.query(text, params);
  }

  // Ejecutar transacción en una base de datos específica
  async transaction(database, callback) {
    const connection = this.getConnection(database);
    return await connection.transaction(callback);
  }

  // Health check de todas las conexiones
  async healthCheckAll() {
    const results = [];
    
    for (const [name, connection] of this.connections) {
      const health = await connection.healthCheck();
      results.push(health);
    }
    
    return {
      timestamp: new Date().toISOString(),
      databases: results,
      overall: results.every(r => r.status === 'healthy') ? 'healthy' : 'degraded'
    };
  }

  // Obtener estadísticas de todos los pools
  getStats() {
    const stats = [];
    
    for (const [name, connection] of this.connections) {
      const poolStats = connection.getPoolStats();
      if (poolStats) {
        stats.push(poolStats);
      }
    }
    
    return {
      timestamp: new Date().toISOString(),
      pools: stats
    };
  }

  // Cerrar todas las conexiones
  async closeAll() {
    console.log('Cerrando todas las conexiones...');
    
    for (const [name, connection] of this.connections) {
      await connection.close();
    }
    
    this.connections.clear();
    this.initialized = false;
    console.log('✓ Todas las conexiones cerradas');
  }
}

// Singleton instance
const connectionManager = new ConnectionManager();

module.exports = connectionManager;