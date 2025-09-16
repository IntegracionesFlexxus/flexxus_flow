const morgan = require('morgan');
const expressWinston = require('express-winston');
const { v4: uuidv4 } = require('crypto').randomUUID ? crypto : require('uuid');
const { loggerFactory } = require('../loggers/Logger');
const { getFormat } = require('../formatters/logFormatters');

// Middleware para agregar request ID
function requestIdMiddleware(req, res, next) {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
}

// Middleware para logging de requests con Morgan
function morganMiddleware(options = {}) {
  const logger = loggerFactory.getLogger('access');
  
  // Stream personalizado para Winston
  const stream = {
    write: (message) => {
      // Remover salto de línea al final
      const cleanMessage = message.trim();
      logger.http(cleanMessage);
    }
  };

  // Formato personalizado de Morgan
  morgan.token('request-id', (req) => req.id);
  morgan.token('user-id', (req) => req.user?.id || 'anonymous');
  morgan.token('response-time-ms', (req, res) => {
    const digits = 0;
    return parseFloat(morgan['response-time'](req, res)).toFixed(digits);
  });

  const format = options.format || ':request-id :remote-addr :user-id :method :url :status :response-time-ms ms - :res[content-length]';

  return morgan(format, {
    stream,
    skip: options.skip || ((req, res) => {
      // Skip health checks y assets estáticos
      return req.url === '/health' || req.url.startsWith('/static');
    })
  });
}

// Middleware de logging con express-winston
function winstonMiddleware(options = {}) {
  const environment = process.env.NODE_ENV || 'development';
  const logger = loggerFactory.getLogger('http');

  return expressWinston.logger({
    winstonInstance: logger.getWinstonLogger(),
    meta: true,
    msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
    expressFormat: false,
    colorize: environment === 'development',
    format: getFormat('http', environment),
    
    // Campos a incluir en los logs
    requestWhitelist: [
      'url',
      'headers',
      'method',
      'httpVersion',
      'originalUrl',
      'query',
      'body'
    ],
    responseWhitelist: [
      'statusCode',
      'responseTime'
    ],
    
    // Personalizar metadata
    dynamicMeta: (req, res) => {
      return {
        requestId: req.id,
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('user-agent')
      };
    },
    
    // Skip certain routes
    skip: options.skip || ((req, res) => {
      return req.url === '/health';
    }),
    
    // Log nivel basado en status code
    statusLevels: true,
    level: function (req, res) {
      if (res.statusCode >= 100 && res.statusCode < 400) {
        return 'info';
      } else if (res.statusCode >= 400 && res.statusCode < 500) {
        return 'warn';
      } else if (res.statusCode >= 500) {
        return 'error';
      }
      return 'info';
    }
  });
}

// Middleware para manejo de errores
function errorLoggerMiddleware(options = {}) {
  const environment = process.env.NODE_ENV || 'development';
  const logger = loggerFactory.getLogger('error');

  return expressWinston.errorLogger({
    winstonInstance: logger.getWinstonLogger(),
    format: getFormat('error', environment),
    
    // Personalizar metadata de error
    dynamicMeta: (req, res, err) => {
      return {
        requestId: req.id,
        userId: req.user?.id,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        error: {
          message: err.message,
          stack: err.stack,
          status: err.status || 500,
          code: err.code
        }
      };
    },
    
    // Incluir stack trace en desarrollo
    blacklistedMetaFields: environment === 'production' ? ['stack', 'trace'] : []
  });
}

// Middleware para logging de performance
function performanceMiddleware(req, res, next) {
  const logger = loggerFactory.getLogger('performance');
  const startTime = Date.now();
  
  // Interceptar end de response
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    
    // Log si la request toma más de X ms
    const threshold = process.env.PERFORMANCE_THRESHOLD || 1000;
    if (duration > threshold) {
      logger.performance(`Slow request: ${req.method} ${req.originalUrl}`, duration, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        threshold
      });
    }
    
    // Agregar header con tiempo de respuesta
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    originalEnd.apply(res, args);
  };
  
  next();
}

// Middleware para logging de auditoría
function auditMiddleware(actions = []) {
  return (req, res, next) => {
    // Solo auditar ciertas acciones
    const shouldAudit = actions.length === 0 || actions.some(action => {
      return req.originalUrl.includes(action) || req.method === action;
    });

    if (shouldAudit) {
      const logger = loggerFactory.getLogger('security');
      
      // Log después de que la request termine
      res.on('finish', () => {
        const action = `${req.method} ${req.originalUrl}`;
        const resource = req.params.id || req.originalUrl;
        const result = res.statusCode < 400 ? 'success' : 'failure';
        
        logger.audit(action, resource, result, {
          userId: req.user?.id,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          statusCode: res.statusCode,
          body: req.body,
          query: req.query
        });
      });
    }
    
    next();
  };
}

// Middleware para agregar logger al request
function attachLoggerMiddleware(req, res, next) {
  const logger = loggerFactory.getLogger('app');
  
  // Establecer contexto con request ID
  logger.setRequestContext(req.id, req.user?.id);
  
  // Adjuntar logger al request
  req.logger = logger;
  
  // Limpiar contexto cuando termine la request
  res.on('finish', () => {
    logger.clearContext();
  });
  
  next();
}

// Middleware combinado para configuración completa
function setupLogging(app, options = {}) {
  // 1. Request ID
  app.use(requestIdMiddleware);
  
  // 2. Attach logger a requests
  app.use(attachLoggerMiddleware);
  
  // 3. Morgan para logging básico
  if (options.useMorgan !== false) {
    app.use(morganMiddleware(options.morgan || {}));
  }
  
  // 4. Performance monitoring
  if (options.performance !== false) {
    app.use(performanceMiddleware);
  }
  
  // 5. Winston para logging detallado
  if (options.useWinston !== false) {
    app.use(winstonMiddleware(options.winston || {}));
  }
  
  // 6. Audit logging para acciones específicas
  if (options.audit) {
    app.use(auditMiddleware(options.audit.actions || []));
  }
  
  console.log('✓ Sistema de logging configurado');
}

module.exports = {
  requestIdMiddleware,
  morganMiddleware,
  winstonMiddleware,
  errorLoggerMiddleware,
  performanceMiddleware,
  auditMiddleware,
  attachLoggerMiddleware,
  setupLogging
};