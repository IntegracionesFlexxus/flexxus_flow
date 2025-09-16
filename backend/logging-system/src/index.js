// Entry point del sistema de logging
const { Logger, loggerFactory, defaultLogger } = require('./loggers/Logger');
const middleware = require('./middleware/expressMiddleware');
const { getLogFiles, cleanOldLogs } = require('./transports/fileTransports');
const { cleanLogs, getLogStats, archiveLogs } = require('./utils/cleanLogs');

// Clase principal del sistema de logging
class LoggingSystem {
  constructor() {
    this.initialized = false;
    this.loggers = new Map();
    this.defaultLogger = defaultLogger;
  }

  // Inicializar el sistema de logging
  initialize(options = {}) {
    if (this.initialized) {
      console.log('✓ Sistema de logging ya inicializado');
      return;
    }

    const environment = options.environment || process.env.NODE_ENV || 'development';
    
    console.log('=== Inicializando Sistema de Logging ===');
    console.log(`Ambiente: ${environment}`);
    
    // Configurar logger por defecto
    this.defaultLogger = loggerFactory.getLogger('app');
    
    // Log inicial
    this.defaultLogger.info('Sistema de logging inicializado', {
      environment,
      pid: process.pid,
      nodeVersion: process.version
    });

    this.initialized = true;
    console.log('✓ Sistema de logging listo\n');
  }

  // Obtener logger para una categoría
  getLogger(category = 'app') {
    return loggerFactory.getLogger(category);
  }

  // Crear logger con metadata específica
  createLogger(category, metadata) {
    return loggerFactory.createLogger(category, metadata);
  }

  // Configurar logging para Express app
  setupExpress(app, options = {}) {
    middleware.setupLogging(app, options);
    this.defaultLogger.info('Middleware de logging configurado para Express');
  }

  // Métodos de logging directo
  error(message, error, metadata) {
    this.defaultLogger.error(message, error, metadata);
  }

  warn(message, metadata) {
    this.defaultLogger.warn(message, metadata);
  }

  info(message, metadata) {
    this.defaultLogger.info(message, metadata);
  }

  debug(message, metadata) {
    this.defaultLogger.debug(message, metadata);
  }

  // Log de performance
  performance(operation, duration, metadata) {
    this.defaultLogger.performance(operation, duration, metadata);
  }

  // Log de auditoría
  audit(action, resource, result, metadata) {
    this.defaultLogger.audit(action, resource, result, metadata);
  }

  // Log de base de datos
  database(operation, query, duration, metadata) {
    const dbLogger = this.getLogger('database');
    dbLogger.database(operation, query, duration, metadata);
  }

  // Log de seguridad
  security(event, metadata) {
    const secLogger = this.getLogger('security');
    secLogger.security(event, metadata);
  }

  // Iniciar timer para medir performance
  startTimer(label) {
    return this.defaultLogger.startTimer(label);
  }

  // Obtener estadísticas de logs
  getStats(directory = './logs') {
    return getLogStats(directory);
  }

  // Limpiar logs antiguos
  cleanLogs(daysToKeep = 30) {
    return cleanLogs({ daysToKeep });
  }

  // Archivar logs
  archiveLogs() {
    return archiveLogs();
  }

  // Obtener archivos de log
  getLogFiles(directory = './logs') {
    return getLogFiles(directory);
  }

  // Manejo de errores no capturados
  handleUncaughtErrors() {
    process.on('uncaughtException', (error) => {
      this.error('Uncaught Exception', error, {
        type: 'uncaughtException',
        fatal: true
      });
      
      // Dar tiempo para que se escriba el log
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.error('Unhandled Rejection', reason, {
        type: 'unhandledRejection',
        promise: promise.toString()
      });
    });

    this.defaultLogger.info('Manejadores de errores no capturados configurados');
  }

  // Cerrar todos los loggers
  async shutdown() {
    console.log('Cerrando sistema de logging...');
    
    // Winston maneja el cierre automáticamente
    // pero podemos forzar el flush de logs pendientes
    return new Promise((resolve) => {
      this.defaultLogger.info('Sistema de logging cerrándose', {
        pid: process.pid,
        uptime: process.uptime()
      });

      // Dar tiempo para escribir logs finales
      setTimeout(() => {
        loggerFactory.clear();
        console.log('✓ Sistema de logging cerrado');
        resolve();
      }, 500);
    });
  }
}

// Singleton instance
const loggingSystem = new LoggingSystem();

// Inicializar automáticamente
loggingSystem.initialize();

// Manejar señales de cierre
process.on('SIGINT', async () => {
  console.log('\n✓ SIGINT recibido');
  await loggingSystem.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n✓ SIGTERM recibido');
  await loggingSystem.shutdown();
  process.exit(0);
});

// Exportar todo lo necesario
module.exports = {
  // Sistema principal
  loggingSystem,
  
  // Clases
  Logger,
  
  // Factory
  loggerFactory,
  
  // Logger por defecto
  logger: defaultLogger,
  
  // Middleware
  middleware,
  
  // Funciones helper
  getLogger: (category) => loggingSystem.getLogger(category),
  createLogger: (category, metadata) => loggingSystem.createLogger(category, metadata),
  setupExpress: (app, options) => loggingSystem.setupExpress(app, options),
  
  // Métodos de logging
  error: (message, error, metadata) => loggingSystem.error(message, error, metadata),
  warn: (message, metadata) => loggingSystem.warn(message, metadata),
  info: (message, metadata) => loggingSystem.info(message, metadata),
  debug: (message, metadata) => loggingSystem.debug(message, metadata),
  
  // Métodos especializados
  performance: (operation, duration, metadata) => loggingSystem.performance(operation, duration, metadata),
  audit: (action, resource, result, metadata) => loggingSystem.audit(action, resource, result, metadata),
  database: (operation, query, duration, metadata) => loggingSystem.database(operation, query, duration, metadata),
  security: (event, metadata) => loggingSystem.security(event, metadata),
  
  // Utilidades
  startTimer: (label) => loggingSystem.startTimer(label),
  getStats: () => loggingSystem.getStats(),
  cleanLogs: (days) => loggingSystem.cleanLogs(days),
  archiveLogs: () => loggingSystem.archiveLogs()
};