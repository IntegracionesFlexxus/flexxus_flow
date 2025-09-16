// Middleware para health checks

// Middleware para agregar headers de health check
function healthHeaders(req, res, next) {
  res.setHeader('X-Health-Check', 'true');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}

// Middleware para timeout de health checks
function healthTimeout(timeout = 10000) {
  return (req, res, next) => {
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        res.status(503).json({
          status: 'timeout',
          error: `Health check timeout after ${timeout}ms`,
          timestamp: new Date().toISOString()
        });
      }
    }, timeout);

    // Limpiar timeout cuando la respuesta termine
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });

    next();
  };
}

// Middleware para autenticación opcional de health checks
function healthAuth(options = {}) {
  const { 
    enabled = false,
    token = 'secret-health-token',
    header = 'x-health-token'
  } = options;

  return (req, res, next) => {
    // Si no está habilitada la autenticación, continuar
    if (!enabled) {
      return next();
    }

    // Permitir liveness sin autenticación
    if (req.path === '/live' || req.path === '/liveness') {
      return next();
    }

    // Verificar token
    const providedToken = req.headers[header] || req.query.token;
    
    if (providedToken !== token) {
      return res.status(401).json({
        status: 'unauthorized',
        error: 'Invalid health check token',
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}

// Middleware para rate limiting de health checks
function healthRateLimit(options = {}) {
  const {
    windowMs = 60000, // 1 minuto
    maxRequests = 100,
    message = 'Too many health check requests'
  } = options;

  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    
    // Limpiar requests antiguos
    for (const [ip, data] of requests.entries()) {
      if (now - data.windowStart > windowMs) {
        requests.delete(ip);
      }
    }

    // Obtener o crear contador para esta IP
    if (!requests.has(key)) {
      requests.set(key, {
        count: 0,
        windowStart: now
      });
    }

    const requestData = requests.get(key);

    // Resetear ventana si ha expirado
    if (now - requestData.windowStart > windowMs) {
      requestData.count = 0;
      requestData.windowStart = now;
    }

    requestData.count++;

    // Verificar límite
    if (requestData.count > maxRequests) {
      return res.status(429).json({
        status: 'rate_limited',
        error: message,
        retryAfter: Math.ceil((requestData.windowStart + windowMs - now) / 1000),
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}

// Middleware para logging de health checks
function healthLogger(logger = console) {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Interceptar respuesta
    const originalSend = res.send;
    res.send = function(data) {
      const responseTime = Date.now() - startTime;
      
      // Parsear respuesta si es JSON
      let status = 'unknown';
      try {
        const parsed = JSON.parse(data);
        status = parsed.status || status;
      } catch {
        // No es JSON, ignorar
      }
      
      // Log según nivel
      const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
        statusCode: res.statusCode,
        healthStatus: status,
        responseTime
      };
      
      if (res.statusCode >= 500 || status === 'unhealthy') {
        logger.error('Health check failed:', logData);
      } else if (status === 'degraded') {
        logger.warn('Health check degraded:', logData);
      } else {
        logger.info('Health check:', logData);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
}

// Middleware para CORS en health checks
function healthCORS(options = {}) {
  const {
    origin = '*',
    methods = 'GET',
    headers = 'Content-Type, X-Health-Token'
  } = options;

  return (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', headers);
    
    // Manejar preflight
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    
    next();
  };
}

// Configurar todos los middleware de health check
function setupHealthMiddleware(router, options = {}) {
  const {
    cors = true,
    auth = false,
    rateLimit = true,
    timeout = 10000,
    logging = true,
    authToken = process.env.HEALTH_CHECK_TOKEN || 'secret-token'
  } = options;

  // Aplicar middleware en orden
  router.use(healthHeaders);
  
  if (cors) {
    router.use(healthCORS(options.cors));
  }
  
  if (auth) {
    router.use(healthAuth({
      enabled: true,
      token: authToken,
      ...options.auth
    }));
  }
  
  if (rateLimit) {
    router.use(healthRateLimit(options.rateLimit));
  }
  
  if (timeout) {
    router.use(healthTimeout(timeout));
  }
  
  if (logging) {
    router.use(healthLogger(options.logger));
  }
  
  return router;
}

module.exports = {
  healthHeaders,
  healthTimeout,
  healthAuth,
  healthRateLimit,
  healthLogger,
  healthCORS,
  setupHealthMiddleware
};