const { BaseError } = require('../errors/BaseError');

// Utilidades para manejo de errores

// Determinar si un error es crítico
function isCriticalError(error) {
  // Errores no operacionales son críticos
  if (error instanceof BaseError && !error.isOperational) {
    return true;
  }
  
  // Errores de sistema son críticos
  const criticalCodes = [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNRESET',
    'EPIPE',
    'EADDRINUSE',
    'EACCES',
    'ENOMEM'
  ];
  
  return criticalCodes.includes(error.code);
}

// Formatear error para logging
function formatErrorForLogging(error, includeStack = true) {
  const formatted = {
    timestamp: new Date().toISOString(),
    name: error.name || 'Error',
    message: error.message,
    code: error.code,
    statusCode: error.statusCode || error.status || 500
  };
  
  if (error instanceof BaseError) {
    formatted.isOperational = error.isOperational;
  }
  
  if (includeStack && error.stack) {
    formatted.stack = error.stack;
  }
  
  // Agregar información adicional si existe
  if (error.details) formatted.details = error.details;
  if (error.errors) formatted.errors = error.errors;
  if (error.cause) formatted.cause = error.cause;
  
  return formatted;
}

// Normalizar error a BaseError
function normalizeError(error) {
  // Si ya es BaseError, retornarlo
  if (error instanceof BaseError) {
    return error;
  }
  
  // Mapear errores comunes
  const errorMap = {
    ValidationError: { statusCode: 400, isOperational: true },
    CastError: { statusCode: 400, isOperational: true },
    JsonWebTokenError: { statusCode: 401, isOperational: true },
    TokenExpiredError: { statusCode: 401, isOperational: true },
    UnauthorizedError: { statusCode: 401, isOperational: true },
    ForbiddenError: { statusCode: 403, isOperational: true },
    NotFoundError: { statusCode: 404, isOperational: true },
    ConflictError: { statusCode: 409, isOperational: true },
    TypeError: { statusCode: 500, isOperational: false },
    ReferenceError: { statusCode: 500, isOperational: false }
  };
  
  const errorConfig = errorMap[error.name] || {
    statusCode: error.statusCode || error.status || 500,
    isOperational: false
  };
  
  const normalizedError = new BaseError(
    error.message || 'An error occurred',
    errorConfig.statusCode,
    errorConfig.isOperational
  );
  
  // Preservar información original
  normalizedError.originalError = error;
  normalizedError.stack = error.stack;
  
  return normalizedError;
}

// Agregar contexto a un error
function enrichError(error, context = {}) {
  const enriched = error instanceof Error ? error : new Error(String(error));
  
  enriched.context = {
    ...enriched.context,
    ...context,
    timestamp: new Date().toISOString()
  };
  
  return enriched;
}

// Crear error con causa
function createErrorWithCause(message, cause, statusCode = 500) {
  const error = new BaseError(message, statusCode);
  error.cause = cause;
  
  // Agregar causa al stack trace
  if (cause && cause.stack) {
    error.stack += '\nCaused by: ' + cause.stack;
  }
  
  return error;
}

// Manejar errores no capturados
function setupGlobalErrorHandlers(options = {}) {
  const {
    onUncaughtException = null,
    onUnhandledRejection = null,
    exitOnUncaught = true,
    logger = console
  } = options;
  
  // Manejar excepciones no capturadas
  process.on('uncaughtException', (error) => {
    logger.error('UNCAUGHT EXCEPTION:', formatErrorForLogging(error));
    
    if (onUncaughtException) {
      onUncaughtException(error);
    }
    
    if (exitOnUncaught) {
      // Dar tiempo para logging
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    }
  });
  
  // Manejar promesas rechazadas
  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.error('UNHANDLED REJECTION:', formatErrorForLogging(error));
    
    if (onUnhandledRejection) {
      onUnhandledRejection(reason, promise);
    }
  });
  
  // Manejar señales de terminación
  const signals = ['SIGTERM', 'SIGINT'];
  signals.forEach(signal => {
    process.on(signal, () => {
      logger.info(`${signal} received, shutting down gracefully`);
      process.exit(0);
    });
  });
  
  logger.info('Global error handlers configured');
}

// Retry helper con exponential backoff
async function retryOperation(operation, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    onRetry = null
  } = options;
  
  let lastError;
  let delay = initialDelay;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      if (onRetry) {
        onRetry(error, attempt, delay);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Exponential backoff
      delay = Math.min(delay * factor, maxDelay);
    }
  }
  
  throw lastError;
}

// Timeout helper
async function withTimeout(promise, timeout, errorMessage = 'Operation timed out') {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      const error = new Error(errorMessage);
      error.code = 'TIMEOUT';
      error.timeout = timeout;
      reject(error);
    }, timeout);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

// Error aggregator para múltiples operaciones
class ErrorAggregator {
  constructor() {
    this.errors = [];
  }
  
  add(error, context = {}) {
    this.errors.push({
      error: formatErrorForLogging(error, false),
      context,
      timestamp: new Date().toISOString()
    });
  }
  
  hasErrors() {
    return this.errors.length > 0;
  }
  
  getErrors() {
    return this.errors;
  }
  
  getSummary() {
    const summary = {
      totalErrors: this.errors.length,
      byType: {},
      byStatusCode: {}
    };
    
    this.errors.forEach(({ error }) => {
      // Por tipo
      summary.byType[error.name] = (summary.byType[error.name] || 0) + 1;
      
      // Por código de estado
      const statusCode = error.statusCode || 500;
      summary.byStatusCode[statusCode] = (summary.byStatusCode[statusCode] || 0) + 1;
    });
    
    return summary;
  }
  
  toError() {
    if (!this.hasErrors()) {
      return null;
    }
    
    const message = `Multiple errors occurred (${this.errors.length})`;
    const error = new BaseError(message, 500, false);
    error.errors = this.errors;
    error.summary = this.getSummary();
    
    return error;
  }
  
  clear() {
    this.errors = [];
  }
}

// Helper para manejar errores en streams
function handleStreamError(stream, onError) {
  stream.on('error', (error) => {
    console.error('Stream error:', error);
    if (onError) {
      onError(error);
    }
  });
  
  return stream;
}

// Wrapper para funciones que pueden fallar
function tryOrDefault(fn, defaultValue = null) {
  try {
    const result = fn();
    return result instanceof Promise 
      ? result.catch(() => defaultValue)
      : result;
  } catch {
    return defaultValue;
  }
}

// Helper para logging condicional
function logError(error, level = 'error', condition = true) {
  if (!condition) return;
  
  const formatted = formatErrorForLogging(error);
  
  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'info':
      console.info(formatted);
      break;
    default:
      console.log(formatted);
  }
}

module.exports = {
  isCriticalError,
  formatErrorForLogging,
  normalizeError,
  enrichError,
  createErrorWithCause,
  setupGlobalErrorHandlers,
  retryOperation,
  withTimeout,
  ErrorAggregator,
  handleStreamError,
  tryOrDefault,
  logError
};