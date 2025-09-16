import { AxiosError } from 'axios'

// Utilidad para manejo de errores - MVP con manejo básico
// TODO: En Nivel 2 agregar telemetry, error boundaries avanzados, recovery strategies

// Tipos de errores personalizados
export class AppError extends Error {
  public readonly code: string
  public readonly statusCode?: number
  public readonly isOperational: boolean
  public readonly details?: any
  
  constructor(
    message: string,
    code: string,
    statusCode?: number,
    isOperational = true,
    details?: any
  ) {
    super(message)
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.details = details
    
    // Mantener el stack trace correcto (solo en V8/Chrome)
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, this.constructor)
    }
  }
}

// Errores específicos del dominio
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, true, details)
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'No autenticado') {
    super(message, 'AUTHENTICATION_ERROR', 401, true)
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 'AUTHORIZATION_ERROR', 403, true)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} no encontrado`, 'NOT_FOUND', 404, true)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409, true)
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(
      'Demasiadas solicitudes. Por favor, intenta más tarde',
      'RATE_LIMIT',
      429,
      true,
      { retryAfter }
    )
  }
}

export class NetworkError extends AppError {
  constructor(message = 'Error de conexión') {
    super(message, 'NETWORK_ERROR', 0, true)
  }
}

// Utilidad para parsear errores de Axios
export function parseAxiosError(error: AxiosError): AppError {
  // Error de red
  if (!error.response) {
    return new NetworkError()
  }
  
  const { status, data } = error.response as any
  const message = data?.message || data?.error || error.message
  
  // Mapear códigos de estado a errores específicos
  switch (status) {
    case 400:
      return new ValidationError(message, data?.errors)
    case 401:
      return new AuthenticationError(message)
    case 403:
      return new AuthorizationError(message)
    case 404:
      return new NotFoundError(message || 'Recurso')
    case 409:
      return new ConflictError(message)
    case 429:
      return new RateLimitError(data?.retryAfter)
    default:
      if (status >= 500) {
        return new AppError(
          'Error del servidor. Por favor, intenta más tarde',
          'SERVER_ERROR',
          status,
          false
        )
      }
      return new AppError(message, 'UNKNOWN_ERROR', status)
  }
}

// Utilidad para formatear mensajes de error para el usuario
export function formatErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }
  
  if (error instanceof AxiosError) {
    const appError = parseAxiosError(error)
    return appError.message
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  return 'Ha ocurrido un error inesperado'
}

// Utilidad para obtener detalles del error
export function getErrorDetails(error: unknown): any {
  if (error instanceof AppError) {
    return error.details
  }
  
  if (error instanceof AxiosError) {
    return error.response?.data
  }
  
  return null
}

// Utilidad para determinar si un error es recuperable
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational
  }
  
  if (error instanceof AxiosError) {
    const status = error.response?.status
    return !status || status < 500
  }
  
  return false
}

// Utilidad para retry con backoff exponencial
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: unknown
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // No reintentar si el error no es recuperable
      if (!isRecoverableError(error)) {
        throw error
      }
      
      // No reintentar si es el último intento
      if (attempt === maxAttempts) {
        throw error
      }
      
      // Calcular delay con backoff exponencial
      const delay = initialDelay * Math.pow(2, attempt - 1)
      
      // Agregar jitter para evitar thundering herd
      const jitter = Math.random() * delay * 0.1
      
      await new Promise(resolve => setTimeout(resolve, delay + jitter))
    }
  }
  
  throw lastError
}

// Logger de errores (básico en MVP)
class ErrorLogger {
  private isDevelopment = import.meta.env.DEV
  
  log(error: unknown, context?: Record<string, any>): void {
    if (this.isDevelopment) {
      console.error('Error:', error)
      if (context) {
        console.error('Context:', context)
      }
    }
    
    // TODO: En producción enviar a servicio de telemetry
  }
  
  logWarning(message: string, context?: Record<string, any>): void {
    if (this.isDevelopment) {
      console.warn('Warning:', message, context)
    }
  }
  
  logInfo(message: string, context?: Record<string, any>): void {
    if (this.isDevelopment) {
      console.info('Info:', message, context)
    }
  }
}

export const errorLogger = new ErrorLogger()

// Hook para manejo de errores en componentes React
export function useErrorHandler() {
  const handleError = (error: unknown, context?: string) => {
    errorLogger.log(error, { context })
    
    // Obtener mensaje formateado
    const message = formatErrorMessage(error)
    
    // TODO: Mostrar notificación al usuario
    // En MVP solo logueamos
    if (import.meta.env.DEV) {
      console.error(`Error in ${context}:`, message)
    }
    
    return {
      message,
      details: getErrorDetails(error),
      isRecoverable: isRecoverableError(error)
    }
  }
  
  return { handleError }
}

// Wrapper para funciones asíncronas
export async function handleAsync<T>(
  fn: () => Promise<T>,
  fallback?: T,
  context?: string
): Promise<T | undefined> {
  try {
    return await fn()
  } catch (error) {
    errorLogger.log(error, { context })
    
    if (fallback !== undefined) {
      return fallback
    }
    
    throw error
  }
}

// Validador de respuestas API
export function validateApiResponse<T>(
  response: any,
  schema?: Record<string, any>
): T {
  // TODO: En Nivel 2 agregar validación con Zod
  // Por ahora solo verificación básica
  
  if (!response) {
    throw new ValidationError('Respuesta vacía del servidor')
  }
  
  if (response.error) {
    throw new AppError(
      response.error.message || 'Error del servidor',
      response.error.code || 'API_ERROR'
    )
  }
  
  return response as T
}

// Utilidad para crear mensajes de error user-friendly
export const ErrorMessages = {
  network: {
    offline: 'Sin conexión a internet. Verifica tu conexión e intenta nuevamente.',
    timeout: 'La solicitud tardó demasiado. Por favor, intenta nuevamente.',
    serverDown: 'No se puede conectar con el servidor. Por favor, intenta más tarde.'
  },
  
  validation: {
    required: (field: string) => `${field} es requerido`,
    invalid: (field: string) => `${field} es inválido`,
    minLength: (field: string, min: number) => `${field} debe tener al menos ${min} caracteres`,
    maxLength: (field: string, max: number) => `${field} no puede tener más de ${max} caracteres`,
    email: 'Ingresa un email válido',
    phone: 'Ingresa un número de teléfono válido'
  },
  
  auth: {
    invalidCredentials: 'Email o contraseña incorrectos',
    sessionExpired: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
    unauthorized: 'No tienes permisos para realizar esta acción',
    accountLocked: 'Tu cuenta ha sido bloqueada. Contacta al soporte.'
  },
  
  generic: {
    unexpected: 'Ha ocurrido un error inesperado. Por favor, intenta nuevamente.',
    notFound: 'No se encontró lo que buscabas',
    conflict: 'Hay un conflicto con la operación solicitada',
    maintenance: 'El sistema está en mantenimiento. Por favor, intenta más tarde.'
  }
}

// Exportar todo
export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  NetworkError,
  parseAxiosError,
  formatErrorMessage,
  getErrorDetails,
  isRecoverableError,
  retryWithBackoff,
  errorLogger,
  useErrorHandler,
  handleAsync,
  validateApiResponse,
  ErrorMessages
}

// TODO: En Nivel 2 agregar:
// - Integración con Sentry o similar
// - Error boundaries más sofisticados
// - Recovery strategies automáticas
// - Offline queue para reintentos
// - Validación de esquemas con Zod
// - Telemetry y analytics de errores
// - User feedback collection en errores