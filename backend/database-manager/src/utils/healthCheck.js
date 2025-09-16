const connectionManager = require('../connections/ConnectionManager');

// Servicio de health check para todas las bases de datos
class HealthCheckService {
  constructor() {
    this.checkInterval = null;
  }

  // Health check simple
  async check() {
    const results = await connectionManager.healthCheckAll();
    const stats = connectionManager.getStats();

    return {
      ...results,
      poolStats: stats.pools,
      summary: this.generateSummary(results)
    };
  }

  // Generar resumen del estado
  generateSummary(results) {
    const total = results.databases.length;
    const healthy = results.databases.filter(db => db.status === 'healthy').length;
    const unhealthy = total - healthy;

    return {
      total,
      healthy,
      unhealthy,
      healthPercentage: total > 0 ? Math.round((healthy / total) * 100) : 0
    };
  }

  // Iniciar monitoreo periódico
  startMonitoring(intervalMs = 30000) {
    if (this.checkInterval) {
      console.log('✓ Monitoreo ya iniciado');
      return;
    }

    console.log(`Iniciando monitoreo de BD cada ${intervalMs / 1000} segundos...`);
    
    this.checkInterval = setInterval(async () => {
      const health = await this.check();
      
      if (health.overall !== 'healthy') {
        console.warn('⚠ Bases de datos con problemas:', 
          health.databases
            .filter(db => db.status !== 'healthy')
            .map(db => db.database)
        );
      }
    }, intervalMs);
  }

  // Detener monitoreo
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('✓ Monitoreo detenido');
    }
  }

  // Health check endpoint para Express
  async expressHandler(req, res) {
    try {
      const health = await this.check();
      const statusCode = health.overall === 'healthy' ? 200 : 503;
      
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Singleton instance
const healthCheckService = new HealthCheckService();

module.exports = healthCheckService;