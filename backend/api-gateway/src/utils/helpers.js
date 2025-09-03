// Funciones helper para el API Gateway

// Validar formato de API key
// TODO: Implementar validación real en Nivel 2
function isValidApiKey(apiKey) {
  if (!apiKey) return false;
  
  // Formato básico: debe tener al menos 32 caracteres
  return apiKey.length >= 32;
}

// Sanitizar headers para evitar injection
function sanitizeHeaders(headers) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(headers)) {
    // Remover caracteres peligrosos
    const cleanKey = key.replace(/[^\w-]/g, '');
    const cleanValue = String(value).replace(/[\r\n]/g, '');
    
    if (cleanKey && cleanValue) {
      sanitized[cleanKey] = cleanValue;
    }
  }
  
  return sanitized;
}

// Formatear respuesta de error consistente
function formatError(message, statusCode = 500, details = null) {
  return {
    error: true,
    statusCode,
    message,
    timestamp: new Date().toISOString(),
    ...(details && { details })
  };
}

// Retry logic para llamadas a microservicios
// TODO: Mejorar con exponential backoff en Nivel 2
async function retryRequest(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      
      console.log(`Intento ${i + 1} falló, reintentando en ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

module.exports = {
  isValidApiKey,
  sanitizeHeaders,
  formatError,
  retryRequest
};