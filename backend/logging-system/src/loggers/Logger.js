const winston = require('winston');
const { getConfig } = require('../config/loggingConfig');
const { getFormat } = require('../formatters/logFormatters');
const { createAllTransports } = require('../transports/fileTransports');

// Clase principal del Logger
class Logger {
  constructor(category = 'app', environment = process.env.NODE_ENV || 'development') {
    this.category = category;
    this.environment = environment;
    this.config = getConfig(environment);
    this.logger = this.createLogger();
    this.requestId = null;
    this.userId = null;
  }

  // Crear instancia de Winston logger
  createLogger() {
    const formats = {
      console: getFormat('default', this.environment),
      file: getFormat('file', this.environment),
      http: getFormat('http', this.environment),
      error: getFormat('error', this.environment),
      performance: getFormat('performance', this.environment)
    };

    const logger = winston.createLogger({
      level: this.config.level,
      levels: this.config.customLevels.levels,
      defaultMeta: {
        ...this.config.defaultMeta,
        category: this.category,
        environment: this.environment
      },
      transports: createAllTransports(this.config, formats),
      exitOnError: false
    });

    // Agregar colores personalizados
    winston.addColors(this.config.customLevels.colors);

    return logger;
  }

  // Establecer contexto de request
  setRequestContext(requestId, userId = null) {
    this.requestId = requestId;
    this.userId = userId;
    return this;
  }

  // Limpiar contexto
  clearContext() {
    this.requestId = null;
    this.userId = null;
    return this;
  }

  // Agregar metadata al log
  addMetadata(data) {
    const metadata = {
      ...data,
      timestamp: new Date().toISOString(),
      category: this.category
    };

    if (this.requestId) {
      metadata.requestId = this.requestId;
    }

    if (this.userId) {
      metadata.userId = this.userId;
    }

    return metadata;
  }

  // Métodos de logging principales
  error(message, error = null, metadata = {}) {
    const logData = {
      message,
      ...this.addMetadata(metadata)
    };

    if (error) {
      if (error instanceof Error) {
        logData.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: error.code
        };
      } else {
        logData.error = error;
      }
    }

    this.logger.error(logData);
  }

  warn(message, metadata = {}) {
    this.logger.warn({
      message,
      ...this.addMetadata(metadata)
    });
  }

  info(message, metadata = {}) {
    this.logger.info({
      message,
      ...this.addMetadata(metadata)
    });
  }

  http(message, metadata = {}) {
    this.logger.http({
      message,
      ...this.addMetadata(metadata)
    });
  }

  verbose(message, metadata = {}) {
    this.logger.verbose({
      message,
      ...this.addMetadata(metadata)
    });
  }

  debug(message, metadata = {}) {
    this.logger.debug({
      message,
      ...this.addMetadata(metadata)
    });
  }

  silly(message, metadata = {}) {
    this.logger.silly({
      message,
      ...this.addMetadata(metadata)
    });
  }

  // Log de performance
  performance(operation, duration, metadata = {}) {
    this.logger.info({
      message: `Performance: ${operation}`,
      operation,
      duration,
      ...this.addMetadata(metadata)
    });
  }

  // Log de auditoría
  audit(action, resource, result = 'success', metadata = {}) {
    this.logger.info({
      message: `Audit: ${action} on ${resource}`,
      action,
      resource,
      result,
      ...this.addMetadata(metadata)
    });
  }

  // Log de base de datos
  database(operation, query, duration = null, metadata = {}) {
    const level = duration && duration > 1000 ? 'warn' : 'debug';
    
    this.logger.log(level, {
      message: `Database: ${operation}`,
      operation,
      query: query.substring(0, 500), // Limitar longitud de query
      duration,
      slow: duration && duration > 1000,
      ...this.addMetadata(metadata)
    });
  }

  // Log de seguridad
  security(event, metadata = {}) {
    this.logger.warn({
      message: `Security: ${event}`,
      event,
      ...this.addMetadata(metadata)
    });
  }

  // Medidor de tiempo para operaciones
  startTimer(label) {
    const startTime = Date.now();
    
    return {
      end: (metadata = {}) => {
        const duration = Date.now() - startTime;
        this.performance(label, duration, metadata);
        return duration;
      }
    };
  }

  // Log estructurado para errores HTTP
  logHttpError(req, res, error) {
    this.error('HTTP Error', error, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: res.statusCode,
      body: req.body,
      query: req.query,
      params: req.params
    });
  }

  // Log estructurado para requests HTTP
  logHttpRequest(req, res, responseTime) {
    this.http('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: res.statusCode,
      responseTime,
      body: req.body,
      query: req.query,
      params: req.params
    });
  }

  // Crear child logger con contexto adicional
  child(metadata) {
    const childLogger = new Logger(this.category, this.environment);
    childLogger.logger = this.logger.child(metadata);
    return childLogger;
  }

  // Obtener el logger de Winston directamente
  getWinstonLogger() {
    return this.logger;
  }
}

// Factory para crear loggers por categoría
class LoggerFactory {
  constructor() {
    this.loggers = new Map();
    this.environment = process.env.NODE_ENV || 'development';
  }

  // Obtener o crear logger para una categoría
  getLogger(category = 'app') {
    if (!this.loggers.has(category)) {
      this.loggers.set(category, new Logger(category, this.environment));
    }
    return this.loggers.get(category);
  }

  // Crear logger con contexto específico
  createLogger(category, metadata = {}) {
    const logger = new Logger(category, this.environment);
    if (metadata) {
      return logger.child(metadata);
    }
    return logger;
  }

  // Limpiar todos los loggers
  clear() {
    this.loggers.clear();
  }
}

// Singleton factory
const loggerFactory = new LoggerFactory();

// Logger por defecto
const defaultLogger = loggerFactory.getLogger('app');

module.exports = {
  Logger,
  LoggerFactory,
  loggerFactory,
  defaultLogger
};