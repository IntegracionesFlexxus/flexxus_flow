/**
 * Rate Limiting Middleware - Sprint 2
 * Siguiendo lineamientos nivel 2: middleware modular y configurable
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
import { RateLimitingService } from '@/shared/services/RateLimitingService';
import { rateLimitRules } from '@/config/rateLimiting';
import { environment } from '@/config/environment';

/**
 * Obtener instancia del servicio de rate limiting
 */
const getRateLimitingService = (): RateLimitingService => {
  return container.get<RateLimitingService>(TYPES.RateLimiterService);
};

/**
 * Middleware general de rate limiting
 * Aplica límites básicos a todas las rutas
 */
export const generalLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const rateLimitingService = getRateLimitingService();
  const middleware = rateLimitingService.createMiddleware('general');
  middleware(req, res, next);
};

/**
 * Middleware de rate limiting para autenticación
 * Límites estrictos para prevenir ataques de fuerza bruta
 */
export const authLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const rateLimitingService = getRateLimitingService();
  const middleware = rateLimitingService.authLimiter();
  middleware(req, res, next);
};

/**
 * Middleware de rate limiting para API general
 * Límites moderados para uso normal de API
 */
export const apiLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const rateLimitingService = getRateLimitingService();
  const middleware = rateLimitingService.apiLimiter();
  middleware(req, res, next);
};

/**
 * Middleware de rate limiting para uploads
 * Límites específicos para operaciones de carga de archivos
 */
export const uploadLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const rateLimitingService = getRateLimitingService();
  const middleware = rateLimitingService.createMiddleware('upload', {
    message: 'Upload rate limit exceeded. Please wait before uploading again.',
    onLimitReached: (req, res, info) => {
      const logger = container.get<Logger>(TYPES.Logger);
      logger.warn('Upload rate limit exceeded', {
        ip: req.ip,
        userId: req.user?.id,
        companyId: req.user?.companyId,
        fileSize: req.get('Content-Length'),
        resetTime: info.resetTime
      });
    }
  });
  middleware(req, res, next);
};

/**
 * Middleware de rate limiting para operaciones administrativas
 * Límites más permisivos para administradores
 */
export const adminLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const rateLimitingService = getRateLimitingService();
  const middleware = rateLimitingService.createMiddleware('admin');
  middleware(req, res, next);
};

/**
 * Factory para crear middleware de rate limiting por empresa
 * Diferentes límites según el plan de la empresa
 */
export const createCompanyLimiter = (
  options: {
    getPlan?: (req: Request) => 'starter' | 'professional' | 'enterprise';
    fallbackPlan?: 'starter' | 'professional' | 'enterprise';
  } = {}
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rateLimitingService = getRateLimitingService();

    // Determinar el plan de la empresa
    let plan: 'starter' | 'professional' | 'enterprise' = 'starter';

    if (options.getPlan && req.user?.companyId) {
      try {
        plan = options.getPlan(req);
      } catch (error) {
        const logger = container.get<Logger>(TYPES.Logger);
        logger.warn('Error determining company plan for rate limiting', {
          error: error.message,
          companyId: req.user.companyId,
          fallback: options.fallbackPlan || 'starter'
        });
        plan = options.fallbackPlan || 'starter';
      }
    } else if (options.fallbackPlan) {
      plan = options.fallbackPlan;
    }

    const middleware = rateLimitingService.companyLimiter(plan);
    middleware(req, res, next);
  };
};

/**
 * Factory para crear middleware de rate limiting por endpoint específico
 * Límites personalizados para endpoints críticos
 */
export const createEndpointLimiter = (
  endpoint: 'login' | 'register' | 'passwordReset' | 'tokenRefresh'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rateLimitingService = getRateLimitingService();
    const middleware = rateLimitingService.endpointLimiter(endpoint);
    middleware(req, res, next);
  };
};

/**
 * Middleware específico para login
 * Previene ataques de fuerza bruta con límites estrictos
 */
export const loginLimiter = createEndpointLimiter('login');

/**
 * Middleware específico para registro
 * Previene spam de registros
 */
export const registerLimiter = createEndpointLimiter('register');

/**
 * Middleware específico para reset de contraseña
 * Previene abuso del sistema de recuperación
 */
export const passwordResetLimiter = createEndpointLimiter('passwordReset');

/**
 * Middleware específico para refresh de tokens
 * Controla la frecuencia de renovación de tokens
 */
export const tokenRefreshLimiter = createEndpointLimiter('tokenRefresh');

/**
 * Middleware condicional de rate limiting
 * Aplica rate limiting basado en condiciones específicas
 */
export const conditionalRateLimiter = (
  condition: (req: Request) => boolean,
  limiterType: 'general' | 'auth' | 'api' | 'upload' | 'admin' = 'general'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!condition(req)) {
      return next();
    }

    const rateLimitingService = getRateLimitingService();
    const middleware = rateLimitingService.createMiddleware(limiterType);
    middleware(req, res, next);
  };
};

/**
 * Middleware para rate limiting por usuario específico
 * Límites basados en el usuario autenticado
 */
export const userSpecificLimiter = (
  options: {
    windowMs: number;
    maxRequestsPerUser: number;
    message?: string;
  }
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(); // No aplicar límites a usuarios no autenticados
    }

    const rateLimitingService = getRateLimitingService();
    const config = {
      windowMs: options.windowMs,
      max: options.maxRequestsPerUser,
      standardHeaders: true,
      legacyHeaders: false
    };

    const middleware = rateLimitingService.createMiddleware(config, {
      message: options.message || 'User-specific rate limit exceeded'
    });
    middleware(req, res, next);
  };
};

/**
 * Middleware para bypass de rate limiting
 * Permite saltarse las restricciones bajo ciertas condiciones
 */
export const bypassRateLimit = (
  condition: (req: Request) => boolean
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (condition(req)) {
      // Marcar la request para bypass
      (req as any).rateLimitBypass = true;
    }
    next();
  };
};

/**
 * Middleware para logging de rate limiting
 * Registra información detallada sobre el uso de rate limiting
 */
export const rateLimitLogger = (
  options: {
    logLevel?: 'debug' | 'info' | 'warn';
    includeHeaders?: boolean;
    includeUserInfo?: boolean;
  } = {}
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const logger = container.get<Logger>(TYPES.Logger);

    // Log antes de la evaluación
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      const logLevel = options.logLevel || 'debug';
      const rateLimitHeaders = {
        limit: res.get('X-RateLimit-Limit'),
        remaining: res.get('X-RateLimit-Remaining'),
        reset: res.get('X-RateLimit-Reset'),
        retryAfter: res.get('Retry-After')
      };

      const logData: any = {
        method: req.method,
        path: req.path,
        ip: req.ip,
        statusCode: res.statusCode,
        rateLimitHeaders: options.includeHeaders ? rateLimitHeaders : undefined,
        userInfo: options.includeUserInfo ? {
          userId: req.user?.id,
          companyId: req.user?.companyId,
          role: req.user?.role
        } : undefined
      };

      // Solo log si hay headers de rate limit
      if (rateLimitHeaders.limit) {
        logger[logLevel]('Rate limit check completed', logData);
      }

      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};

/**
 * Middleware para reset manual de rate limiting
 * Permite resetear contadores bajo ciertas condiciones
 */
export const resetRateLimit = (
  condition: (req: Request) => boolean
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (condition(req)) {
      try {
        const rateLimitingService = getRateLimitingService();
        await rateLimitingService.resetCounter(req);

        const logger = container.get<Logger>(TYPES.Logger);
        logger.info('Rate limit counter reset', {
          ip: req.ip,
          userId: req.user?.id,
          companyId: req.user?.companyId,
          path: req.path
        });
      } catch (error) {
        const logger = container.get<Logger>(TYPES.Logger);
        logger.warn('Failed to reset rate limit counter', {
          error: error.message,
          ip: req.ip,
          userId: req.user?.id
        });
      }
    }
    next();
  };
};

/**
 * Configuración de middleware stack para diferentes rutas
 */
export const rateLimitMiddlewareStack = {
  // Stack básico para rutas generales
  general: [generalLimiter, rateLimitLogger()],

  // Stack para rutas de autenticación
  auth: [authLimiter, rateLimitLogger({ logLevel: 'warn' })],

  // Stack para API con logging detallado
  api: [apiLimiter, rateLimitLogger({ includeHeaders: true, includeUserInfo: true })],

  // Stack para operaciones administrativas
  admin: [
    conditionalRateLimiter(req => req.user?.role === 'admin', 'admin'),
    rateLimitLogger({ logLevel: 'info' })
  ],

  // Stack para uploads con límites estrictos
  upload: [uploadLimiter, rateLimitLogger({ logLevel: 'warn', includeHeaders: true })]
};

/**
 * Middleware helper para aplicar múltiples limiters en secuencia
 */
export const applyRateLimitStack = (
  stack: ((req: Request, res: Response, next: NextFunction) => void)[]
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    let index = 0;

    const runMiddleware = (): void => {
      if (index >= stack.length) {
        return next();
      }

      const middleware = stack[index++];
      middleware(req, res, (err?: any) => {
        if (err) {
          return next(err);
        }
        runMiddleware();
      });
    };

    runMiddleware();
  };
};

/**
 * Export de configuraciones predefinidas para fácil uso
 */
export const RateLimitPresets = {
  // Preset para rutas públicas (más permisivo)
  public: applyRateLimitStack([generalLimiter]),

  // Preset para rutas de autenticación (estricto)
  auth: applyRateLimitStack(rateLimitMiddlewareStack.auth),

  // Preset para API autenticada (moderado)
  authenticatedAPI: applyRateLimitStack(rateLimitMiddlewareStack.api),

  // Preset para operaciones de administración
  admin: applyRateLimitStack(rateLimitMiddlewareStack.admin),

  // Preset para uploads
  fileUpload: applyRateLimitStack(rateLimitMiddlewareStack.upload)
};
