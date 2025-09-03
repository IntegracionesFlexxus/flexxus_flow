const SystemCheck = require('../checks/SystemCheck');
const DatabaseCheck = require('../checks/DatabaseCheck');
const ServiceCheck = require('../checks/ServiceCheck');

// Monitor principal de salud
class HealthMonitor {
  constructor(options = {}) {
    this.options = {
      includeDetails: options.includeDetails !== false,
      parallel: options.parallel !== false,
      timeout: options.timeout || 10000,
      ...options
    };
    
    // Inicializar checks
    this.systemCheck = new SystemCheck(options.system);
    this.databaseCheck = new DatabaseCheck(options.database);
    this.serviceCheck = new ServiceCheck(options.service);
    
    // Estado y métricas
    this.lastCheck = null;
    this.checkHistory = [];
    this.maxHistorySize = options.maxHistorySize || 100;
    this.startTime = Date.now();
    this.checkCount = 0;
  }

  // Health check básico (liveness)
  async checkLiveness() {
    const startTime = Date.now();
    
    try {
      // Check simple de que el proceso está vivo
      const memUsage = process.memoryUsage();
      
      return {
        status: 'alive',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        uptime: process.uptime(),
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / (1024 * 1024) * 100) / 100
        }
      };
    } catch (error) {
      return {
        status: 'dead',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  // Health check completo (readiness)
  async checkReadiness() {
    const startTime = Date.now();
    this.checkCount++;
    
    try {
      let checks = [];
      
      if (this.options.parallel) {
        // Ejecutar checks en paralelo
        checks = await Promise.all([
          this.systemCheck.checkAll(),
          this.databaseCheck.checkAll(),
          this.serviceCheck.checkAll()
        ]);
      } else {
        // Ejecutar checks secuencialmente
        checks = [
          await this.systemCheck.checkAll(),
          await this.databaseCheck.checkAll(),
          await this.serviceCheck.checkAll()
        ];
      }
      
      // Agregar estado general
      const overall = this.aggregateOverallStatus(checks);
      const responseTime = Date.now() - startTime;
      
      const result = {
        status: overall,
        timestamp: new Date().toISOString(),
        responseTime,
        checks: this.options.includeDetails ? checks : undefined,
        summary: this.generateSummary(checks),
        metrics: this.getMetrics()
      };
      
      // Guardar resultado
      this.lastCheck = result;
      this.addToHistory(result);
      
      return result;
    } catch (error) {
      const result = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error.message
      };
      
      this.lastCheck = result;
      this.addToHistory(result);
      
      return result;
    }
  }

  // Check específico
  async checkComponent(component, subComponent = null) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (component) {
        case 'system':
          result = subComponent 
            ? await this.systemCheck[`check${this.capitalize(subComponent)}`]()
            : await this.systemCheck.checkAll();
          break;
          
        case 'database':
          result = subComponent
            ? await this.databaseCheck.check(subComponent)
            : await this.databaseCheck.checkAll();
          break;
          
        case 'service':
          result = subComponent
            ? await this.serviceCheck.check(subComponent)
            : await this.serviceCheck.checkAll();
          break;
          
        default:
          throw new Error(`Unknown component: ${component}`);
      }
      
      return {
        status: result.status || 'unknown',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        component,
        subComponent,
        details: result
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        component,
        subComponent,
        error: error.message
      };
    }
  }

  // Obtener último check
  getLastCheck() {
    return this.lastCheck;
  }

  // Obtener historial
  getHistory(limit = 10) {
    return this.checkHistory.slice(-limit);
  }

  // Obtener métricas
  getMetrics() {
    const now = Date.now();
    const uptime = now - this.startTime;
    
    // Calcular disponibilidad
    const healthyChecks = this.checkHistory.filter(h => h.status === 'healthy').length;
    const availability = this.checkHistory.length > 0 
      ? (healthyChecks / this.checkHistory.length) * 100 
      : 100;
    
    // Calcular tiempo de respuesta promedio
    const responseTimes = this.checkHistory.map(h => h.responseTime);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
    
    return {
      uptime: {
        milliseconds: uptime,
        human: this.formatDuration(uptime)
      },
      checks: {
        total: this.checkCount,
        history: this.checkHistory.length
      },
      availability: {
        percentage: Math.round(availability * 100) / 100,
        healthy: healthyChecks,
        total: this.checkHistory.length
      },
      performance: {
        avgResponseTime: Math.round(avgResponseTime),
        lastResponseTime: this.lastCheck?.responseTime || 0
      }
    };
  }

  // Obtener estado detallado
  async getDetailedStatus() {
    const readiness = await this.checkReadiness();
    const metrics = this.getMetrics();
    const history = this.getHistory(5);
    
    return {
      current: readiness,
      metrics,
      history,
      components: {
        system: await this.systemCheck.checkAll(),
        database: await this.databaseCheck.checkAll(),
        services: await this.serviceCheck.checkAll()
      }
    };
  }

  // Agregar estado general
  aggregateOverallStatus(checks) {
    const statuses = checks.map(c => c.status);
    
    if (statuses.includes('unhealthy')) return 'unhealthy';
    if (statuses.includes('degraded')) return 'degraded';
    if (statuses.includes('unknown')) return 'degraded';
    return 'healthy';
  }

  // Generar resumen
  generateSummary(checks) {
    const summary = {
      total: 0,
      healthy: 0,
      degraded: 0,
      unhealthy: 0
    };
    
    for (const check of checks) {
      if (check.checks) {
        for (const subCheck of check.checks) {
          summary.total++;
          summary[subCheck.status] = (summary[subCheck.status] || 0) + 1;
        }
      } else {
        summary.total++;
        summary[check.status] = (summary[check.status] || 0) + 1;
      }
    }
    
    return summary;
  }

  // Agregar al historial
  addToHistory(result) {
    // Simplificar resultado para historial
    const simplified = {
      status: result.status,
      timestamp: result.timestamp,
      responseTime: result.responseTime,
      summary: result.summary
    };
    
    this.checkHistory.push(simplified);
    
    // Limitar tamaño del historial
    if (this.checkHistory.length > this.maxHistorySize) {
      this.checkHistory.shift();
    }
  }

  // Formatear duración
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // Capitalizar string
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Limpiar recursos
  async cleanup() {
    console.log('Limpiando recursos del monitor...');
    await this.databaseCheck.cleanup();
    await this.serviceCheck.cleanup();
  }
}

module.exports = HealthMonitor;