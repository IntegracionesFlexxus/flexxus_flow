// Rate Limiter Middleware - Sprint 1
// Middleware para limitar requests por IP

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { environment } from '../../config/environment';

/**
 * Rate Limiter genérico
 * Seguridad: Prevenir abuso y DDoS
 */
export const rateLimiter = rateLimit({
  windowMs: environment.security.rateLimitWindowMs, // 15 minutos por defecto
  max: environment.security.rateLimitMaxRequests, // 100 requests por ventana
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later',
      statusCode: 429
    }
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/ready' || req.path === '/live';
  }
});

/**
 * Rate limiter estricto para auth endpoints
 * Seguridad: Mayor protección para endpoints sensibles
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Solo 5 intentos de login por ventana
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again later',
      statusCode: 429
    }
  },
  skipSuccessfulRequests: true // No contar requests exitosos
});

/**
 * Rate limiter para creación de recursos
 * Evitar spam de creación
 */
export const createRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 creaciones por minuto
  message: {
    success: false,
    error: {
      message: 'Too many creation requests, please slow down',
      statusCode: 429
    }
  }
});