/**
 * Rate Limiting Configuration - Sprint 2
 * Siguiendo lineamientos nivel 2: configuración centralizada y flexible
 */
import { environment } from '@/config/environment';
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
  handler?: (req: any, res: any) => void;
  onLimitReached?: (req: any, res: any, options: any) => void;
}
export interface RateLimitRules {
  general: RateLimitConfig;
  auth: RateLimitConfig;
  api: RateLimitConfig;
  upload: RateLimitConfig;
  admin: RateLimitConfig;
  company: {
    starter: RateLimitConfig;
    professional: RateLimitConfig;
    enterprise: RateLimitConfig;
  };
  endpoint: {
    login: RateLimitConfig;
    register: RateLimitConfig;
    passwordReset: RateLimitConfig;
    tokenRefresh: RateLimitConfig;
  };
}
/**
 * Rate limiting rules configuration
 * Diferentes límites según el contexto y plan de empresa
 */
export const rateLimitRules: RateLimitRules = {
  // Límite general para todas las rutas
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: environment.nodeEnv === 'production' ? 1000 : 10000, // Más permisivo en desarrollo
    standardHeaders: true,
    legacyHeaders: false
  },
  // Límite específico para rutas de autenticación
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Máximo 5 intentos por IP en 15 minutos
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Solo contar intentos fallidos
  },
  // Límite para API general
  api: {
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: environment.nodeEnv === 'production' ? 60 : 1000,
    standardHeaders: true,
    legacyHeaders: false
  },
  // Límite para uploads
  upload: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // Máximo 10 uploads por 15 minutos
    standardHeaders: true,
    legacyHeaders: false
  },
  // Límite para operaciones administrativas
  admin: {
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 100, // Más permisivo para administradores
    standardHeaders: true,
    legacyHeaders: false
  },
  // Límites específicos por plan de empresa
  company: {
    starter: {
      windowMs: 1 * 60 * 1000, // 1 minuto
      max: 30, // 30 requests por minuto
      standardHeaders: true,
      legacyHeaders: false
    },
    professional: {
      windowMs: 1 * 60 * 1000, // 1 minuto
      max: 120, // 120 requests por minuto
      standardHeaders: true,
      legacyHeaders: false
    },
    enterprise: {
      windowMs: 1 * 60 * 1000, // 1 minuto
      max: 300, // 300 requests por minuto
      standardHeaders: true,
      legacyHeaders: false
    }
  },
  // Límites específicos por endpoint crítico
  endpoint: {
    login: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 5, // Máximo 5 intentos de login por IP
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true
    },
    register: {
      windowMs: 60 * 60 * 1000, // 1 hora
      max: 3, // Máximo 3 registros por IP por hora
      standardHeaders: true,
      legacyHeaders: false
    },
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hora
      max: 3, // Máximo 3 resets por email por hora
      standardHeaders: true,
      legacyHeaders: false
    },
    tokenRefresh: {
      windowMs: 5 * 60 * 1000, // 5 minutos
      max: 10, // Máximo 10 refresh por usuario en 5 minutos
      standardHeaders: true,
      legacyHeaders: false
    }
  }
};
/**
 * Rate limiting configuration for different environments
 */
export const getRateLimitConfig = (environment: string): Partial<RateLimitRules> => {
  switch (environment) {
    case 'development':
      return {
        general: { ...rateLimitRules.general, max: 10000 },
        api: { ...rateLimitRules.api, max: 1000 },
        auth: { ...rateLimitRules.auth, max: 50 }
      };
    case 'testing':
      return {
        general: { ...rateLimitRules.general, max: 100000 },
        api: { ...rateLimitRules.api, max: 10000 },
        auth: { ...rateLimitRules.auth, max: 100 }
      };
    case 'staging':
      return {
        general: { ...rateLimitRules.general, max: 2000 },
        api: { ...rateLimitRules.api, max: 100 },
        auth: { ...rateLimitRules.auth, max: 10 }
      };
    case 'production':
    default:
      return rateLimitRules;
  }
};
/**
 * Configuración específica para stores de rate limiting
 */
export const rateLimitStoreConfig = {
  // Configuración para Redis store (si está disponible)
  redis: {
    host: environment.redis?.host || 'localhost',
    port: environment.redis?.port || 6379,
    password: environment.redis?.password,
    db: environment.redis?.db || 0,
    keyPrefix: 'rl:',
    connectTimeout: 5000,
    commandTimeout: 1000
  },
  // Configuración para memory store (fallback)
  memory: {
    max: 10000, // Máximo número de IPs en memoria
    ttl: 15 * 60 * 1000 // TTL por defecto
  }
};
/**
 * Headers de Rate Limit estándar
 */
export const rateLimitHeaders = {
  limit: 'X-RateLimit-Limit',
  remaining: 'X-RateLimit-Remaining',
  reset: 'X-RateLimit-Reset',
  retryAfter: 'Retry-After'
};
/**
 * Mensajes de error personalizados
 */
export const rateLimitMessages = {
  default: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  auth: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  api: {
    success: false,
    message: 'API rate limit exceeded. Please slow down your requests.',
    code: 'API_RATE_LIMIT_EXCEEDED'
  },
  upload: {
    success: false,
    message: 'Upload rate limit exceeded. Please wait before uploading again.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
  },
  company: {
    success: false,
    message: 'Company API rate limit exceeded. Consider upgrading your plan.',
    code: 'COMPANY_RATE_LIMIT_EXCEEDED'
  }
};
/**
 * Configuración de bypass para ciertos casos
 */
export const rateLimitBypass = {
  // IPs que pueden bypasear rate limiting (ej: load balancers, monitoring)
  whitelistedIPs: [],
  // User agents que pueden ser bypasseados
  whitelistedUserAgents: [],
  // Roles que tienen límites más altos
  privilegedRoles: ['admin', 'system'],
  // Feature flags para deshabilitar rate limiting
  disableForDevelopment: environment.nodeEnv === 'development',
  disableForTesting: environment.nodeEnv === 'testing'
};
