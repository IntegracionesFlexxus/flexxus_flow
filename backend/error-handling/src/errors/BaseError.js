// Clase base para todos los errores personalizados
class BaseError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    // Capturar stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  // Serializar error para respuesta JSON
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      // Stack solo en desarrollo - TODO: usar NODE_ENV en Nivel 2
      stack: this.stack
    };
  }

  // Obtener respuesta formateada para cliente
  getClientResponse() {
    return {
      error: true,
      message: this.message,
      code: this.name,
      timestamp: this.timestamp
    };
  }

  // Verificar si es error operacional
  static isOperationalError(error) {
    if (error instanceof BaseError) {
      return error.isOperational;
    }
    return false;
  }
}

// Error de validación
class ValidationError extends BaseError {
  constructor(message, errors = []) {
    super(message, 400, true);
    this.errors = errors;
  }

  getClientResponse() {
    return {
      ...super.getClientResponse(),
      errors: this.errors
    };
  }
}

// Error de autenticación
class AuthenticationError extends BaseError {
  constructor(message = 'Authentication failed') {
    super(message, 401, true);
  }
}

// Error de autorización
class AuthorizationError extends BaseError {
  constructor(message = 'Access denied') {
    super(message, 403, true);
  }
}

// Error de recurso no encontrado
class NotFoundError extends BaseError {
  constructor(resource = 'Resource', identifier = '') {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, true);
    this.resource = resource;
    this.identifier = identifier;
  }
}

// Error de conflicto (ej: duplicado)
class ConflictError extends BaseError {
  constructor(message = 'Resource conflict', field = null) {
    super(message, 409, true);
    this.field = field;
  }

  getClientResponse() {
    return {
      ...super.getClientResponse(),
      field: this.field
    };
  }
}

// Error de rate limiting
class RateLimitError extends BaseError {
  constructor(retryAfter = 60) {
    super('Too many requests', 429, true);
    this.retryAfter = retryAfter;
  }

  getClientResponse() {
    return {
      ...super.getClientResponse(),
      retryAfter: this.retryAfter
    };
  }
}

// Error de servidor interno
class InternalServerError extends BaseError {
  constructor(message = 'Internal server error', originalError = null) {
    super(message, 500, false);
    this.originalError = originalError;
  }

  getClientResponse() {
    // No exponer detalles internos al cliente
    return {
      error: true,
      message: 'An internal error occurred',
      code: 'INTERNAL_ERROR',
      timestamp: this.timestamp
    };
  }
}

// Error de servicio no disponible
class ServiceUnavailableError extends BaseError {
  constructor(service = 'Service', retryAfter = null) {
    super(`${service} is temporarily unavailable`, 503, true);
    this.service = service;
    this.retryAfter = retryAfter;
  }

  getClientResponse() {
    const response = super.getClientResponse();
    if (this.retryAfter) {
      response.retryAfter = this.retryAfter;
    }
    return response;
  }
}

// Error de bad request genérico
class BadRequestError extends BaseError {
  constructor(message = 'Bad request', details = null) {
    super(message, 400, true);
    this.details = details;
  }

  getClientResponse() {
    const response = super.getClientResponse();
    if (this.details) {
      response.details = this.details;
    }
    return response;
  }
}

// Error de timeout
class TimeoutError extends BaseError {
  constructor(operation = 'Operation', timeout = null) {
    const message = timeout 
      ? `${operation} timed out after ${timeout}ms`
      : `${operation} timed out`;
    super(message, 408, true);
    this.operation = operation;
    this.timeout = timeout;
  }
}

// Error de base de datos
class DatabaseError extends BaseError {
  constructor(message = 'Database error', query = null) {
    super(message, 500, false);
    this.query = query;
  }

  getClientResponse() {
    // No exponer detalles de queries al cliente
    return {
      error: true,
      message: 'A database error occurred',
      code: 'DATABASE_ERROR',
      timestamp: this.timestamp
    };
  }
}

// Error de integración externa
class ExternalServiceError extends BaseError {
  constructor(service, message = 'External service error', statusCode = 502) {
    super(`${service}: ${message}`, statusCode, true);
    this.service = service;
  }

  getClientResponse() {
    return {
      ...super.getClientResponse(),
      service: this.service
    };
  }
}

// Error de payload muy grande
class PayloadTooLargeError extends BaseError {
  constructor(maxSize = null) {
    const message = maxSize 
      ? `Payload too large. Maximum size: ${maxSize} bytes`
      : 'Payload too large';
    super(message, 413, true);
    this.maxSize = maxSize;
  }
}

// Error de método no permitido
class MethodNotAllowedError extends BaseError {
  constructor(method, allowedMethods = []) {
    super(`Method ${method} not allowed`, 405, true);
    this.method = method;
    this.allowedMethods = allowedMethods;
  }

  getClientResponse() {
    return {
      ...super.getClientResponse(),
      allowedMethods: this.allowedMethods
    };
  }
}

// Error de contenido no aceptable
class NotAcceptableError extends BaseError {
  constructor(acceptableTypes = []) {
    super('Not acceptable', 406, true);
    this.acceptableTypes = acceptableTypes;
  }

  getClientResponse() {
    return {
      ...super.getClientResponse(),
      acceptableTypes: this.acceptableTypes
    };
  }
}

module.exports = {
  BaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
  BadRequestError,
  TimeoutError,
  DatabaseError,
  ExternalServiceError,
  PayloadTooLargeError,
  MethodNotAllowedError,
  NotAcceptableError
};