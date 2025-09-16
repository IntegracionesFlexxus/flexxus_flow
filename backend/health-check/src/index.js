const express = require('express');
const HealthMonitor = require('./monitors/HealthMonitor');
const { setupHealthRoutes } = require('./routes/healthRoutes');
const { setupHealthMiddleware } = require('./middleware/healthMiddleware');

// Sistema principal de Health Check
class HealthCheckSystem {
  constructor(options = {}) {
    this.options = {
      port: options.port || 3001,
      basePath: options.basePath || '/health',
      standalone: options.standalone !== false,
      ...options
    };
    
    this.monitor = new HealthMonitor(options.monitor);
    this.app = null;
    this.server = null;
    this.initialized = false;
  }

  // Inicializar el sistema
  async initialize() {
    if (this.initialized) {
      console.log('✓ Sistema de Health Check ya inicializado');
      return;
    }

    console.log('=== Inicializando Sistema de Health Check ===');
    
    // Ejecutar primer check
    const initialCheck = await this.monitor.checkReadiness();
    console.log(`Estado inicial: ${initialCheck.status}`);
    
    // Si es standalone, crear servidor Express
    if (this.options.standalone) {
      this.app = express();
      this.setupStandaloneServer();
    }
    
    this.initialized = true;
    console.log('✓ Sistema de Health Check inicializado\n');
  }

  // Configurar servidor standalone
  setupStandaloneServer() {
    // Middleware básico
    this.app.use(express.json());
    
    // Configurar rutas de health check
    const healthRouter = express.Router();
    setupHealthMiddleware(healthRouter, this.options.middleware);
    setupHealthRoutes(healthRouter, this.monitor);
    
    this.app.use(this.options.basePath, healthRouter);
    
    // Ruta raíz
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Health Check System',
        version: '1.0.0',
        endpoints: {
          health: `${this.options.basePath}`,
          liveness: `${this.options.basePath}/live`,
          readiness: `${this.options.basePath}/ready`,
          metrics: `${this.options.basePath}/metrics`,
          dashboard: `${this.options.basePath}/dashboard`
        }
      });
    });
    
    // Iniciar servidor
    this.server = this.app.listen(this.options.port, () => {
      console.log(`✓ Health Check server corriendo en puerto ${this.options.port}`);
      console.log(`  Dashboard: http://localhost:${this.options.port}${this.options.basePath}/dashboard`);
    });
  }

  // Integrar con Express app existente
  integrate(app, options = {}) {
    const basePath = options.basePath || this.options.basePath;
    
    // Crear router para health checks
    const healthRouter = express.Router();
    setupHealthMiddleware(healthRouter, options.middleware || this.options.middleware);
    setupHealthRoutes(healthRouter, this.monitor);
    
    // Montar router en la app
    app.use(basePath, healthRouter);
    
    console.log(`✓ Health Check integrado en ${basePath}`);
    
    return healthRouter;
  }

  // Obtener monitor
  getMonitor() {
    return this.monitor;
  }

  // Check methods directos
  async checkLiveness() {
    return await this.monitor.checkLiveness();
  }

  async checkReadiness() {
    return await this.monitor.checkReadiness();
  }

  async checkComponent(component, subComponent) {
    return await this.monitor.checkComponent(component, subComponent);
  }

  // Obtener métricas
  getMetrics() {
    return this.monitor.getMetrics();
  }

  // Obtener último check
  getLastCheck() {
    return this.monitor.getLastCheck();
  }

  // Programar checks automáticos
  scheduleChecks(interval = 60000) {
    console.log(`Programando health checks cada ${interval / 1000} segundos`);
    
    this.checkInterval = setInterval(async () => {
      try {
        const result = await this.monitor.checkReadiness();
        
        if (result.status !== 'healthy') {
          console.warn(`⚠ Sistema no saludable: ${result.status}`);
          
          // Emitir evento si hay listeners
          if (this.onUnhealthy) {
            this.onUnhealthy(result);
          }
        }
      } catch (error) {
        console.error('Error en health check programado:', error.message);
      }
    }, interval);
    
    return this.checkInterval;
  }

  // Detener checks automáticos
  stopScheduledChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('✓ Health checks programados detenidos');
    }
  }

  // Configurar webhook para notificaciones
  setWebhook(url, options = {}) {
    const { 
      events = ['unhealthy', 'degraded'],
      headers = {},
      method = 'POST'
    } = options;
    
    this.onUnhealthy = async (result) => {
      if (events.includes(result.status)) {
        try {
          const axios = require('axios');
          await axios({
            method,
            url,
            headers,
            data: {
              status: result.status,
              timestamp: result.timestamp,
              summary: result.summary,
              service: 'flexxus-health-check'
            }
          });
          console.log(`✓ Webhook notificado: ${url}`);
        } catch (error) {
          console.error('Error enviando webhook:', error.message);
        }
      }
    };
  }

  // Cerrar sistema
  async shutdown() {
    console.log('Cerrando sistema de Health Check...');
    
    // Detener checks programados
    this.stopScheduledChecks();
    
    // Limpiar recursos del monitor
    await this.monitor.cleanup();
    
    // Cerrar servidor si existe
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
      console.log('✓ Servidor cerrado');
    }
    
    console.log('✓ Sistema de Health Check cerrado');
  }
}

// Factory function para crear sistema
function createHealthCheckSystem(options) {
  const system = new HealthCheckSystem(options);
  return system;
}

// Si se ejecuta directamente, iniciar servidor standalone
if (require.main === module) {
  const system = createHealthCheckSystem({
    port: process.env.HEALTH_PORT || 3001,
    standalone: true,
    monitor: {
      includeDetails: true,
      parallel: true
    },
    middleware: {
      cors: true,
      auth: false,
      rateLimit: true,
      logging: true
    }
  });
  
  system.initialize().then(() => {
    // Programar checks automáticos cada minuto
    system.scheduleChecks(60000);
    
    // Manejar señales de cierre
    process.on('SIGINT', async () => {
      console.log('\n✓ SIGINT recibido');
      await system.shutdown();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n✓ SIGTERM recibido');
      await system.shutdown();
      process.exit(0);
    });
  });
}

module.exports = {
  HealthCheckSystem,
  createHealthCheckSystem,
  HealthMonitor,
  setupHealthRoutes,
  setupHealthMiddleware
};