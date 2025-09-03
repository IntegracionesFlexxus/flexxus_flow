// Wrapper para manejar errores en funciones async
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Wrapper con retry logic
const asyncHandlerWithRetry = (fn, options = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryOn = [500, 502, 503, 504],
    exponentialBackoff = true
  } = options;

  return async (req, res, next) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn(req, res, next);
        return result;
      } catch (error) {
        lastError = error;
        
        // Verificar si debemos reintentar
        const shouldRetry = 
          attempt < maxRetries &&
          (retryOn.includes(error.statusCode) || 
           retryOn.includes(error.status) ||
           error.code === 'ECONNREFUSED' ||
           error.code === 'ETIMEDOUT');
        
        if (!shouldRetry) {
          return next(error);
        }
        
        // Calcular delay
        const delay = exponentialBackoff 
          ? retryDelay * Math.pow(2, attempt - 1)
          : retryDelay;
        
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
        
        // Esperar antes de reintentar
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Si llegamos aquí, todos los reintentos fallaron
    next(lastError);
  };
};

// Wrapper para manejar múltiples operaciones async en paralelo
const asyncParallelHandler = (handlers) => {
  return asyncHandler(async (req, res, next) => {
    try {
      const results = await Promise.all(
        handlers.map(handler => handler(req, res))
      );
      
      // Combinar resultados
      req.parallelResults = results;
      next();
    } catch (error) {
      // Si alguna operación falla, todas fallan
      next(error);
    }
  });
};

// Wrapper para manejar operaciones con timeout
const asyncTimeoutHandler = (fn, timeout = 30000) => {
  return asyncHandler(async (req, res, next) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error(`Operation timed out after ${timeout}ms`);
        error.statusCode = 408;
        error.code = 'TIMEOUT';
        reject(error);
      }, timeout);
    });
    
    const operationPromise = fn(req, res, next);
    
    try {
      const result = await Promise.race([operationPromise, timeoutPromise]);
      return result;
    } catch (error) {
      next(error);
    }
  });
};

// Wrapper para operaciones con circuit breaker
class CircuitBreaker {
  constructor(options = {}) {
    this.threshold = options.threshold || 5; // Fallos antes de abrir
    this.timeout = options.timeout || 60000; // Tiempo en estado abierto
    this.resetTimeout = options.resetTimeout || 30000; // Tiempo para half-open
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.nextAttempt = Date.now();
    this.successCount = 0;
    this.requestCount = 0;
  }

  async execute(fn) {
    this.requestCount++;
    
    // Si el circuito está abierto
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        const error = new Error('Circuit breaker is OPEN');
        error.statusCode = 503;
        error.code = 'CIRCUIT_OPEN';
        error.retryAfter = Math.ceil((this.nextAttempt - Date.now()) / 1000);
        throw error;
      }
      
      // Intentar half-open
      this.state = 'HALF_OPEN';
      console.log('Circuit breaker: HALF_OPEN');
    }
    
    try {
      const result = await fn();
      
      // Éxito
      if (this.state === 'HALF_OPEN') {
        this.successCount++;
        if (this.successCount >= 2) {
          this.state = 'CLOSED';
          this.failures = 0;
          this.successCount = 0;
          console.log('Circuit breaker: CLOSED');
        }
      } else {
        this.failures = Math.max(0, this.failures - 1);
      }
      
      return result;
    } catch (error) {
      // Fallo
      this.failures++;
      
      if (this.state === 'HALF_OPEN' || this.failures >= this.threshold) {
        this.state = 'OPEN';
        this.nextAttempt = Date.now() + this.timeout;
        this.successCount = 0;
        console.log(`Circuit breaker: OPEN (failures: ${this.failures})`);
      }
      
      throw error;
    }
  }

  getStatus() {
    return {
      state: this.state,
      failures: this.failures,
      requestCount: this.requestCount,
      nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt) : null
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successCount = 0;
    this.requestCount = 0;
    console.log('Circuit breaker: RESET');
  }
}

// Factory para circuit breakers
class CircuitBreakerFactory {
  constructor() {
    this.breakers = new Map();
  }

  getBreaker(name, options) {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(options));
    }
    return this.breakers.get(name);
  }

  getStatus() {
    const status = {};
    for (const [name, breaker] of this.breakers) {
      status[name] = breaker.getStatus();
    }
    return status;
  }

  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

// Wrapper con circuit breaker
const asyncCircuitBreakerHandler = (fn, breakerName = 'default', options = {}) => {
  const factory = new CircuitBreakerFactory();
  const breaker = factory.getBreaker(breakerName, options);
  
  return asyncHandler(async (req, res, next) => {
    try {
      const result = await breaker.execute(() => fn(req, res, next));
      return result;
    } catch (error) {
      next(error);
    }
  });
};

// Wrapper para batch processing
const asyncBatchHandler = (fn, options = {}) => {
  const {
    batchSize = 10,
    concurrency = 5,
    onProgress = null
  } = options;

  return asyncHandler(async (req, res, next) => {
    const items = req.body.items || req.items || [];
    
    if (!Array.isArray(items)) {
      const error = new Error('Items must be an array');
      error.statusCode = 400;
      return next(error);
    }

    const results = [];
    const errors = [];
    
    // Procesar en lotes
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Procesar lote con concurrencia limitada
      const batchPromises = batch.map((item, index) => {
        return fn(item, i + index)
          .then(result => ({ success: true, result, index: i + index }))
          .catch(error => ({ success: false, error, index: i + index }));
      });
      
      // Limitar concurrencia
      const chunks = [];
      for (let j = 0; j < batchPromises.length; j += concurrency) {
        chunks.push(batchPromises.slice(j, j + concurrency));
      }
      
      for (const chunk of chunks) {
        const chunkResults = await Promise.all(chunk);
        
        chunkResults.forEach(({ success, result, error, index }) => {
          if (success) {
            results[index] = result;
          } else {
            errors[index] = error;
          }
        });
        
        // Callback de progreso
        if (onProgress) {
          onProgress({
            processed: results.length + errors.length,
            total: items.length,
            percentage: Math.round(((results.length + errors.length) / items.length) * 100)
          });
        }
      }
    }
    
    req.batchResults = {
      results,
      errors,
      summary: {
        total: items.length,
        success: results.filter(Boolean).length,
        failed: errors.filter(Boolean).length
      }
    };
    
    next();
  });
};

// Wrapper para operaciones con caché
const asyncCacheHandler = (fn, options = {}) => {
  const {
    ttl = 300000, // 5 minutos
    keyGenerator = (req) => `${req.method}:${req.originalUrl}`,
    cache = new Map()
  } = options;

  return asyncHandler(async (req, res, next) => {
    const key = keyGenerator(req);
    const cached = cache.get(key);
    
    // Si hay cache válido, usarlo
    if (cached && Date.now() - cached.timestamp < ttl) {
      console.log(`Cache hit: ${key}`);
      req.cached = true;
      req.result = cached.data;
      return next();
    }
    
    // Ejecutar función y cachear resultado
    try {
      const result = await fn(req, res, next);
      
      cache.set(key, {
        data: result,
        timestamp: Date.now()
      });
      
      // Limpiar cache antiguo
      for (const [k, v] of cache.entries()) {
        if (Date.now() - v.timestamp > ttl * 2) {
          cache.delete(k);
        }
      }
      
      req.cached = false;
      req.result = result;
      return result;
    } catch (error) {
      // No cachear errores
      throw error;
    }
  });
};

// Singleton factory para circuit breakers
const circuitBreakerFactory = new CircuitBreakerFactory();

module.exports = {
  asyncHandler,
  asyncHandlerWithRetry,
  asyncParallelHandler,
  asyncTimeoutHandler,
  asyncCircuitBreakerHandler,
  asyncBatchHandler,
  asyncCacheHandler,
  CircuitBreaker,
  CircuitBreakerFactory,
  circuitBreakerFactory
};