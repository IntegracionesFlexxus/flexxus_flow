const axios = require('axios');
const net = require('net');
const redis = require('redis');

// Clase para checks de servicios externos
class ServiceCheck {
  constructor(options = {}) {
    this.name = 'services';
    this.services = options.services || this.getDefaultServices();
    this.timeout = options.timeout || 5000;
    this.redisClients = new Map();
  }

  // Configuración por defecto de servicios
  // TODO: Mover a .env en Nivel 2
  getDefaultServices() {
    return {
      redis: {
        type: 'redis',
        host: 'localhost',
        port: 6379,
        password: null
      },
      elasticsearch: {
        type: 'http',
        url: 'http://localhost:9200/_cluster/health',
        expectedStatus: 200
      },
      rabbitmq: {
        type: 'http',
        url: 'http://localhost:15672/api/health/checks/virtual-hosts',
        auth: {
          username: 'guest',
          password: 'guest'
        },
        expectedStatus: 200
      },
      smtp: {
        type: 'tcp',
        host: 'localhost',
        port: 587
      },
      apiGateway: {
        type: 'http',
        url: 'http://localhost:3000/health',
        expectedStatus: 200
      }
    };
  }

  // Check de servicio HTTP
  async checkHTTP(name, config) {
    const startTime = Date.now();
    
    try {
      const requestConfig = {
        url: config.url,
        method: config.method || 'GET',
        timeout: this.timeout,
        validateStatus: () => true // No lanzar error por status
      };
      
      // Agregar autenticación si existe
      if (config.auth) {
        requestConfig.auth = config.auth;
      }
      
      // Agregar headers si existen
      if (config.headers) {
        requestConfig.headers = config.headers;
      }
      
      const response = await axios(requestConfig);
      const responseTime = Date.now() - startTime;
      
      const expectedStatus = config.expectedStatus || 200;
      const status = response.status === expectedStatus ? 'healthy' : 'degraded';
      
      return {
        name: `service.${name}`,
        status,
        responseTime,
        details: {
          url: config.url,
          statusCode: response.status,
          expectedStatus,
          headers: response.headers
        }
      };
    } catch (error) {
      return {
        name: `service.${name}`,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
        details: {
          url: config.url,
          code: error.code
        }
      };
    }
  }

  // Check de servicio TCP
  async checkTCP(name, config) {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let connected = false;
      
      // Timeout
      const timeoutId = setTimeout(() => {
        if (!connected) {
          socket.destroy();
          resolve({
            name: `service.${name}`,
            status: 'unhealthy',
            responseTime: Date.now() - startTime,
            error: 'Connection timeout',
            details: {
              host: config.host,
              port: config.port
            }
          });
        }
      }, this.timeout);
      
      socket.on('connect', () => {
        connected = true;
        clearTimeout(timeoutId);
        socket.end();
        
        resolve({
          name: `service.${name}`,
          status: 'healthy',
          responseTime: Date.now() - startTime,
          details: {
            host: config.host,
            port: config.port
          }
        });
      });
      
      socket.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          name: `service.${name}`,
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: error.message,
          details: {
            host: config.host,
            port: config.port
          }
        });
      });
      
      socket.connect(config.port, config.host);
    });
  }

  // Check de Redis
  async checkRedis(name, config) {
    const startTime = Date.now();
    
    try {
      // Obtener o crear cliente
      if (!this.redisClients.has(name)) {
        const client = redis.createClient({
          socket: {
            host: config.host,
            port: config.port,
            connectTimeout: this.timeout
          },
          password: config.password
        });
        
        await client.connect();
        this.redisClients.set(name, client);
      }
      
      const client = this.redisClients.get(name);
      
      // Ping para verificar conexión
      const pong = await client.ping();
      
      // Obtener info del servidor
      const info = await client.info('server');
      
      // Parsear versión de Redis
      const versionMatch = info.match(/redis_version:(.+)/);
      const version = versionMatch ? versionMatch[1].trim() : 'unknown';
      
      // Obtener memoria usada
      const memoryInfo = await client.info('memory');
      const memoryMatch = memoryInfo.match(/used_memory_human:(.+)/);
      const memoryUsed = memoryMatch ? memoryMatch[1].trim() : 'unknown';
      
      return {
        name: `service.${name}`,
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          host: config.host,
          port: config.port,
          version,
          memoryUsed,
          ping: pong
        }
      };
    } catch (error) {
      return {
        name: `service.${name}`,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
        details: {
          host: config.host,
          port: config.port
        }
      };
    }
  }

  // Check de un servicio según su tipo
  async checkService(name, config) {
    switch (config.type) {
      case 'http':
        return await this.checkHTTP(name, config);
      case 'tcp':
        return await this.checkTCP(name, config);
      case 'redis':
        return await this.checkRedis(name, config);
      default:
        return {
          name: `service.${name}`,
          status: 'unknown',
          error: `Unknown service type: ${config.type}`
        };
    }
  }

  // Check de todos los servicios
  async checkAll() {
    const checks = [];
    
    for (const [name, config] of Object.entries(this.services)) {
      checks.push(this.checkService(name, config));
    }
    
    const results = await Promise.all(checks);
    const overall = this.aggregateStatus(results);
    
    return {
      name: this.name,
      status: overall,
      checks: results
    };
  }

  // Check específico de un servicio
  async check(serviceName) {
    if (!this.services[serviceName]) {
      return {
        name: `service.${serviceName}`,
        status: 'unknown',
        error: 'Service configuration not found'
      };
    }
    
    return await this.checkService(serviceName, this.services[serviceName]);
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
    // Cerrar clientes Redis
    for (const [name, client] of this.redisClients) {
      try {
        await client.quit();
        console.log(`Redis client cerrado: ${name}`);
      } catch (error) {
        console.error(`Error cerrando Redis client ${name}:`, error.message);
      }
    }
    this.redisClients.clear();
  }
}

module.exports = ServiceCheck;