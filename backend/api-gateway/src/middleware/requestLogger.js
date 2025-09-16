// Middleware para logging de requests
function requestLogger(req, res, next) {
  const startTime = Date.now();
  
  // Log de entrada
  console.log(`→ ${req.method} ${req.path}`, {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Interceptar response para log de salida
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    
    console.log(`← ${req.method} ${req.path}`, {
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    });
    
    // Agregar header con tiempo de respuesta
    res.set('X-Response-Time', `${responseTime}ms`);
    
    originalSend.call(this, data);
  };

  next();
}

// Middleware para rate limiting básico
// TODO: Implementar rate limiting con Redis en Nivel 2
const requestCounts = new Map();
const RATE_LIMIT = 100; // requests por minuto
const WINDOW_MS = 60000; // 1 minuto

function basicRateLimiter(req, res, next) {
  const clientId = req.ip;
  const now = Date.now();
  
  if (!requestCounts.has(clientId)) {
    requestCounts.set(clientId, { count: 1, resetTime: now + WINDOW_MS });
    return next();
  }
  
  const clientData = requestCounts.get(clientId);
  
  if (now > clientData.resetTime) {
    clientData.count = 1;
    clientData.resetTime = now + WINDOW_MS;
    return next();
  }
  
  if (clientData.count >= RATE_LIMIT) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Límite de requests excedido. Intente más tarde.',
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
    });
  }
  
  clientData.count++;
  next();
}

module.exports = {
  requestLogger,
  basicRateLimiter
};