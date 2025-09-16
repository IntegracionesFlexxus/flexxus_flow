// Entry point del sistema de Error Handling
const errors = require('./errors/BaseError');
const middleware = require('./middleware/errorMiddleware');
const validators = require('./validators/validators');
const asyncHandlers = require('./handlers/asyncHandler');
const utils = require('./utils/errorUtils');

// Sistema principal de Error Handling
class ErrorHandlingSystem {
  constructor() {
    this.initialized = false;
    this.errorCount = 0;
    this.errorStats = new Map();
  }

  // Inicializar el sistema
  initialize(options = {}) {
    if (this.initialized) {
      console.log('✓ Sistema de Error Handling ya inicializado');
      return;
    }

    const {
      enableGlobalHandlers = true,
      exitOnUncaught = true,
      logger = console
    } = options;

    console.log('=== Inicializando Sistema de Error Handling ===');

    // Configurar manejadores globales
    if (enableGlobalHandlers) {
      utils.setupGlobalErrorHandlers({
        exitOnUncaught,
        logger,
        onUncaughtException: (error) => {
          this.trackError(error, 'uncaught');
        },
        onUnhandledRejection: (reason) => {
          this.trackError(reason, 'unhandled');
        }
      });
    }

    this.initialized = true;
    console.log('✓ Sistema de Error Handling inicializado\n');
  }

  // Rastrear errores para estadísticas
  trackError(error, source = 'application') {
    this.errorCount++;
    
    const errorType = error.name || 'UnknownError';
    const statusCode = error.statusCode || 500;
    const key = `${errorType}:${statusCode}`;
    
    if (!this.errorStats.has(key)) {
      this.errorStats.set(key, {
        type: errorType,
        statusCode,
        count: 0,
        firstSeen: new Date(),
        lastSeen: null,
        sources: new Set()
      });
    }
    
    const stat = this.errorStats.get(key);
    stat.count++;
    stat.lastSeen = new Date();
    stat.sources.add(source);
  }

  // Obtener estadísticas de errores
  getStats() {
    const stats = {
      totalErrors: this.errorCount,
      errors: []
    };
    
    for (const [key, data] of this.errorStats) {
      stats.errors.push({
        ...data,
        sources: Array.from(data.sources)
      });
    }
    
    // Ordenar por frecuencia
    stats.errors.sort((a, b) => b.count - a.count);
    
    return stats;
  }

  // Limpiar estadísticas
  clearStats() {
    this.errorCount = 0;
    this.errorStats.clear();
  }

  // Configurar Express app
  setupExpress(app, options = {}) {
    middleware.setupErrorHandling(app, options);
    console.log('✓ Error handling configurado para Express');
  }

  // Crear error personalizado
  createError(type, message, ...args) {
    const ErrorClass = errors[type] || errors.BaseError;
    const error = new ErrorClass(message, ...args);
    this.trackError(error, 'created');
    return error;
  }

  // Manejar error
  handleError(error, req = null, res = null) {
    // Normalizar error
    const normalizedError = utils.normalizeError(error);
    
    // Rastrear error
    this.trackError(normalizedError, 'handled');
    
    // Log del error
    utils.logError(normalizedError);
    
    // Si hay response, enviar error al cliente
    if (res && !res.headersSent) {
      res.status(normalizedError.statusCode).json(
        normalizedError.getClientResponse()
      );
    }
    
    return normalizedError;
  }

  // Verificar si es error crítico
  isCritical(error) {
    return utils.isCriticalError(error);
  }
}

// Singleton instance
const errorHandling = new ErrorHandlingSystem();

// Inicializar automáticamente
errorHandling.initialize();

// Exportar todo lo necesario
module.exports = {
  // Sistema principal
  errorHandling,
  
  // Clases de error
  ...errors,
  
  // Middleware
  ...middleware,
  errorMiddleware: middleware.errorHandler,
  
  // Validadores
  validators,
  validate: validators.validationMiddleware,
  sanitize: validators.sanitizationMiddleware,
  
  // Async handlers
  ...asyncHandlers,
  asyncHandler: asyncHandlers.asyncHandler,
  
  // Utilidades
  ...utils,
  
  // Funciones helper
  createError: (type, message, ...args) => errorHandling.createError(type, message, ...args),
  handleError: (error, req, res) => errorHandling.handleError(error, req, res),
  setupExpress: (app, options) => errorHandling.setupExpress(app, options),
  getErrorStats: () => errorHandling.getStats(),
  clearErrorStats: () => errorHandling.clearStats(),
  
  // Atajos para errores comunes
  badRequest: (message, details) => new errors.BadRequestError(message, details),
  unauthorized: (message) => new errors.AuthenticationError(message),
  forbidden: (message) => new errors.AuthorizationError(message),
  notFound: (resource, id) => new errors.NotFoundError(resource, id),
  conflict: (message, field) => new errors.ConflictError(message, field),
  serverError: (message, originalError) => new errors.InternalServerError(message, originalError),
  
  // Atajos para validación
  validateBody: (schema) => validators.validationMiddleware(schema, 'body'),
  validateQuery: (schema) => validators.validationMiddleware(schema, 'query'),
  validateParams: (schema) => validators.validationMiddleware(schema, 'params')
};