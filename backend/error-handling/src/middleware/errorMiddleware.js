const { BaseError } = require('../errors/BaseError');

// Middleware principal de manejo de errores
function errorHandler(err, req, res, next) {
  // Si la respuesta ya fue enviada, delegar a Express
  if (res.headersSent) {
    return next(err);
  }

  // Log del error (TODO: integrar con sistema de logging en Nivel 2)
  console.error('Error Handler:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    }
  });

  // Determinar si es un error operacional
  const isOperational = BaseError.isOperationalError(err);
  
  // Si es un error personalizado, usar su información
  if (err instanceof BaseError) {
    return res.status(err.statusCode).json(err.getClientResponse());
  }

  // Manejar errores de validación de express-validator
  if (err.name === 'ValidationError' && err.errors) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: err.errors,
      timestamp: new Date().toISOString()
    });
  }

  // Manejar errores de Joi
  if (err.isJoi) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: err.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      })),
      timestamp: new Date().toISOString()
    });
  }

  // Manejar errores de sintaxis JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: true,
      message: 'Invalid JSON payload',
      code: 'INVALID_JSON',
      timestamp: new Date().toISOString()
    });
  }

  // Manejar errores de MongoDB/Mongoose
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    // Error de duplicado
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      return res.status(409).json({
        error: true,
        message: `Duplicate value for field: ${field}`,
        code: 'DUPLICATE_ERROR',
        field,
        timestamp: new Date().toISOString()
      });
    }
    
    // Otros errores de MongoDB
    return res.status(500).json({
      error: true,
      message: 'Database error occurred',
      code: 'DATABASE_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  // Manejar errores de PostgreSQL
  if (err.code && err.code.startsWith('23')) {
    // 23505: unique_violation
    if (err.code === '23505') {
      return res.status(409).json({
        error: true,
        message: 'Duplicate value violation',
        code: 'DUPLICATE_ERROR',
        timestamp: new Date().toISOString()
      });
    }
    
    // 23503: foreign_key_violation
    if (err.code === '23503') {
      return res.status(400).json({
        error: true,
        message: 'Foreign key constraint violation',
        code: 'CONSTRAINT_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Manejar errores de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: true,
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: true,
      message: 'Token expired',
      code: 'TOKEN_EXPIRED',
      timestamp: new Date().toISOString()
    });
  }

  // Error por defecto (500)
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 
    ? 'An internal error occurred' 
    : err.message || 'An error occurred';

  res.status(statusCode).json({
    error: true,
    message,
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    // Stack trace solo en desarrollo - TODO: usar NODE_ENV en Nivel 2
    ...(statusCode === 500 && { stack: err.stack })
  });
}

// Middleware para capturar errores 404
function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: true,
    message: `Route ${req.originalUrl} not found`,
    code: 'ROUTE_NOT_FOUND',
    method: req.method,
    url: req.originalUrl,
    timestamp: new Date().toISOString()
  });
}

// Middleware para validar Content-Type
function validateContentType(expectedType = 'application/json') {
  return (req, res, next) => {
    // Skip para GET, DELETE, OPTIONS
    if (['GET', 'DELETE', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const contentType = req.get('Content-Type');
    
    if (!contentType || !contentType.includes(expectedType)) {
      return res.status(415).json({
        error: true,
        message: `Unsupported Media Type. Expected: ${expectedType}`,
        code: 'UNSUPPORTED_MEDIA_TYPE',
        received: contentType,
        expected: expectedType,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}

// Middleware para manejar timeouts
function timeoutHandler(timeout = 30000) {
  return (req, res, next) => {
    const timeoutId = setTimeout(() => {
      const err = new Error(`Request timeout after ${timeout}ms`);
      err.statusCode = 408;
      err.code = 'REQUEST_TIMEOUT';
      next(err);
    }, timeout);

    // Limpiar timeout cuando la respuesta termine
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });

    next();
  };
}

// Middleware para sanitizar errores antes de enviar al cliente
function sanitizeError(err, req, res, next) {
  // Remover información sensible
  const sensitiveFields = [
    'password',
    'token',
    'apiKey',
    'secret',
    'creditCard',
    'ssn'
  ];

  // Limpiar el objeto de error
  const cleanError = { ...err };
  
  // Remover campos sensibles del mensaje
  sensitiveFields.forEach(field => {
    if (cleanError.message) {
      const regex = new RegExp(`${field}[\\s]*[=:][\\s]*[^\\s,}]+`, 'gi');
      cleanError.message = cleanError.message.replace(regex, `${field}=***`);
    }
  });

  // Remover campos sensibles del stack trace en producción
  // TODO: usar NODE_ENV en Nivel 2
  const isProduction = false;
  if (isProduction && cleanError.stack) {
    delete cleanError.stack;
  }

  next(cleanError);
}

// Middleware para logging de errores
function errorLogger(err, req, res, next) {
  // Crear objeto de log
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: err.statusCode >= 500 ? 'error' : 'warn',
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params,
      ip: req.ip,
      userAgent: req.get('user-agent')
    },
    error: {
      name: err.name,
      message: err.message,
      statusCode: err.statusCode || 500,
      stack: err.stack
    },
    user: req.user || null,
    requestId: req.id || null
  };

  // Log según severidad
  if (err.statusCode >= 500 || !err.statusCode) {
    console.error('ERROR:', JSON.stringify(logEntry, null, 2));
  } else {
    console.warn('WARNING:', JSON.stringify(logEntry, null, 2));
  }

  next(err);
}

// Configuración completa de error handling para Express
function setupErrorHandling(app, options = {}) {
  const {
    timeout = 30000,
    contentType = 'application/json',
    enableLogging = true,
    enableSanitization = true
  } = options;

  // Timeout handler
  if (timeout) {
    app.use(timeoutHandler(timeout));
  }

  // Content-Type validation
  if (contentType) {
    app.use(validateContentType(contentType));
  }

  // Rutas de la aplicación van aquí...

  // 404 handler (debe ir después de todas las rutas)
  app.use(notFoundHandler);

  // Error handling pipeline
  if (enableLogging) {
    app.use(errorLogger);
  }

  if (enableSanitization) {
    app.use(sanitizeError);
  }

  // Main error handler (debe ser el último)
  app.use(errorHandler);

  console.log('✓ Error handling configurado');
}

module.exports = {
  errorHandler,
  notFoundHandler,
  validateContentType,
  timeoutHandler,
  sanitizeError,
  errorLogger,
  setupErrorHandling
};