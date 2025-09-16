/**
 * Rate Limit Headers Service - Sprint 2
 * Siguiendo lineamientos nivel 2: headers estándar y informativos
 */

import { injectable, inject } from 'inversify';
import { Request, Response } from 'express';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { RateLimitInfo } from '@/shared/services/security/RateLimitingService';
import { environment } from '@/config/environment';

export interface RateLimitHeaders {
  // Standard headers (RFC 6585)
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'X-RateLimit-Used': string;

  // Additional informational headers
  'X-RateLimit-Policy'?: string;
  'X-RateLimit-Scope'?: string;
  'X-RateLimit-Reset-Time'?: string;
  'Retry-After'?: string;

  // Custom headers for enhanced debugging (non-production only)
  'X-RateLimit-Window'?: string;
  'X-RateLimit-Type'?: string;
  'X-RateLimit-Key'?: string;
}

export interface HeadersConfig {
  includePolicy?: boolean;
  includeScope?: boolean;
  includeResetTime?: boolean;
  includeDebugHeaders?: boolean;
  includeRetryAfter?: boolean;
  customHeaders?: Record<string, string>;
}

@injectable()
export class RateLimitHeadersService {
  private readonly defaultConfig: HeadersConfig = {
    includePolicy: true,
    includeScope: true,
    includeResetTime: true,
    includeDebugHeaders: environment.nodeEnv !== 'production',
    includeRetryAfter: true
  };

  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.logger.debug('Rate limit headers service initialized');
  }

  /**
   * Establece headers de rate limiting en la respuesta
   */
  setHeaders(
    res: Response,
    info: RateLimitInfo,
    config: HeadersConfig = {},
    context?: {
      policyName?: string;
      scope?: string;
      windowMs?: number;
      rateLimitType?: string;
      key?: string;
    }
  ): void {
    const finalConfig = { ...this.defaultConfig, ...config };
    const headers = this.buildHeaders(info, finalConfig, context);

    // Establecer headers estándar
    Object.entries(headers).forEach(([key, value]) => {
      if (value !== undefined) {
        res.set(key, value);
      }
    });

    // Log headers establecidos (solo en debug)
    if (this.logger.isDebugEnabled && this.logger.isDebugEnabled()) {
      this.logger.debug('Rate limit headers set', {
        headers,
        remaining: info.remaining,
        limit: info.limit,
        reset: info.reset
      });
    }
  }

  /**
   * Establece headers cuando se alcanza el límite
   */
  setLimitExceededHeaders(
    res: Response,
    info: RateLimitInfo,
    config: HeadersConfig = {},
    context?: {
      policyName?: string;
      scope?: string;
      windowMs?: number;
      rateLimitType?: string;
      violationType?: 'limit' | 'burst' | 'suspicious';
    }
  ): void {
    const finalConfig = { 
      ...this.defaultConfig, 
      ...config,
      includeRetryAfter: true // Siempre incluir Retry-After cuando se excede el límite
    };

    const headers = this.buildHeaders(info, finalConfig, context);

    // Headers adicionales para límite excedido
    const retryAfterSeconds = Math.ceil((info.resetTime.getTime() - Date.now()) / 1000);
    headers['Retry-After'] = Math.max(retryAfterSeconds, 1).toString();

    // Header personalizado para tipo de violación
    if (context?.violationType && finalConfig.includeDebugHeaders) {
      headers['X-RateLimit-Violation'] = context.violationType;
    }

    // Establecer headers
    Object.entries(headers).forEach(([key, value]) => {
      if (value !== undefined) {
        res.set(key, value);
      }
    });

    this.logger.warn('Rate limit exceeded headers set', {
      remaining: info.remaining,
      limit: info.limit,
      retryAfter: retryAfterSeconds,
      violationType: context?.violationType,
      scope: context?.scope
    });
  }

  /**
   * Obtiene headers como objeto sin establecerlos en la respuesta
   */
  getHeaders(
    info: RateLimitInfo,
    config: HeadersConfig = {},
    context?: any
  ): RateLimitHeaders {
    const finalConfig = { ...this.defaultConfig, ...config };
    return this.buildHeaders(info, finalConfig, context);
  }

  /**
   * Establece headers de warning para límites cercanos
   */
  setWarningHeaders(
    res: Response,
    info: RateLimitInfo,
    warningThreshold: number = 0.8,
    config: HeadersConfig = {}
  ): void {
    const usagePercentage = (info.limit - info.remaining) / info.limit;

    if (usagePercentage >= warningThreshold) {
      const finalConfig = { ...this.defaultConfig, ...config };
      const headers = this.buildHeaders(info, finalConfig);

      // Header de warning
      headers['X-RateLimit-Warning'] = `Approaching rate limit (${Math.round(usagePercentage * 100)}% used)`;

      // Establecer headers
      Object.entries(headers).forEach(([key, value]) => {
        if (value !== undefined) {
          res.set(key, value);
        }
      });

      this.logger.info('Rate limit warning headers set', {
        usagePercentage,
        remaining: info.remaining,
        limit: info.limit,
        threshold: warningThreshold
      });
    }
  }

  /**
   * Headers para bypass de rate limiting
   */
  setBypassHeaders(
    res: Response,
    reason: string,
    info?: RateLimitInfo,
    config: HeadersConfig = {}
  ): void {
    const finalConfig = { ...this.defaultConfig, ...config };

    if (info) {
      const headers = this.buildHeaders(info, finalConfig);
      Object.entries(headers).forEach(([key, value]) => {
        if (value !== undefined) {
          res.set(key, value);
        }
      });
    }

    // Header específico para bypass
    res.set('X-RateLimit-Bypass', reason);

    if (finalConfig.includeDebugHeaders) {
      res.set('X-RateLimit-Status', 'bypassed');
    }

    this.logger.debug('Rate limit bypass headers set', {
      reason,
      hasInfo: !!info
    });
  }

  /**
   * Headers para quota de empresa
   */
  setQuotaHeaders(
    res: Response,
    quotaInfo: {
      limit: number;
      used: number;
      remaining: number;
      resetPeriod: string;
      nextReset: Date;
    },
    config: HeadersConfig = {}
  ): void {
    const finalConfig = { ...this.defaultConfig, ...config };

    const quotaHeaders = {
      'X-Quota-Limit': quotaInfo.limit.toString(),
      'X-Quota-Used': quotaInfo.used.toString(),
      'X-Quota-Remaining': quotaInfo.remaining.toString(),
      'X-Quota-Reset': Math.floor(quotaInfo.nextReset.getTime() / 1000).toString()
    };

    if (finalConfig.includeDebugHeaders) {
      quotaHeaders['X-Quota-Period'] = quotaInfo.resetPeriod;
      quotaHeaders['X-Quota-Reset-Time'] = quotaInfo.nextReset.toISOString();
    }

    Object.entries(quotaHeaders).forEach(([key, value]) => {
      res.set(key, value);
    });

    this.logger.debug('Quota headers set', quotaInfo);
  }

  /**
   * Construye el objeto de headers basado en la información y configuración
   */
  private buildHeaders(
    info: RateLimitInfo,
    config: HeadersConfig,
    context?: any
  ): RateLimitHeaders {
    const headers: RateLimitHeaders = {
      'X-RateLimit-Limit': info.limit.toString(),
      'X-RateLimit-Remaining': info.remaining.toString(),
      'X-RateLimit-Reset': info.reset.toString(),
      'X-RateLimit-Used': (info.total || (info.limit - info.remaining)).toString()
    };

    // Headers opcionales
    if (config.includePolicy && context?.policyName) {
      headers['X-RateLimit-Policy'] = context.policyName;
    }

    if (config.includeScope && context?.scope) {
      headers['X-RateLimit-Scope'] = context.scope;
    }

    if (config.includeResetTime) {
      headers['X-RateLimit-Reset-Time'] = info.resetTime.toISOString();
    }

    // Headers de debug (solo en desarrollo)
    if (config.includeDebugHeaders) {
      if (context?.windowMs) {
        headers['X-RateLimit-Window'] = `${context.windowMs}ms`;
      }

      if (context?.rateLimitType) {
        headers['X-RateLimit-Type'] = context.rateLimitType;
      }

      if (context?.key) {
        // Solo mostrar una versión ofuscada de la key por seguridad
        headers['X-RateLimit-Key'] = this.obfuscateKey(context.key);
      }
    }

    // Retry-After cuando quedan pocas requests
    if (config.includeRetryAfter && info.remaining <= 0) {
      const retryAfterSeconds = Math.ceil((info.resetTime.getTime() - Date.now()) / 1000);
      headers['Retry-After'] = Math.max(retryAfterSeconds, 1).toString();
    }

    // Headers personalizados
    if (config.customHeaders) {
      Object.assign(headers, config.customHeaders);
    }

    return headers;
  }

  /**
   * Ofusca una key para logs/headers de debug
   */
  private obfuscateKey(key: string): string {
    if (key.length <= 8) {
      return key.substring(0, 2) + '*'.repeat(key.length - 4) + key.substring(key.length - 2);
    }
    return key.substring(0, 4) + '*'.repeat(8) + key.substring(key.length - 4);
  }

  /**
   * Valida que los headers cumplan con estándares
   */
  validateHeaders(headers: Record<string, string>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validaciones obligatorias
    if (!headers['X-RateLimit-Limit']) {
      errors.push('Missing required header: X-RateLimit-Limit');
    }

    if (!headers['X-RateLimit-Remaining']) {
      errors.push('Missing required header: X-RateLimit-Remaining');
    }

    if (!headers['X-RateLimit-Reset']) {
      errors.push('Missing required header: X-RateLimit-Reset');
    }

    // Validaciones de formato
    if (headers['X-RateLimit-Limit'] && isNaN(parseInt(headers['X-RateLimit-Limit']))) {
      errors.push('X-RateLimit-Limit must be a number');
    }

    if (headers['X-RateLimit-Remaining'] && isNaN(parseInt(headers['X-RateLimit-Remaining']))) {
      errors.push('X-RateLimit-Remaining must be a number');
    }

    if (headers['X-RateLimit-Reset'] && isNaN(parseInt(headers['X-RateLimit-Reset']))) {
      errors.push('X-RateLimit-Reset must be a Unix timestamp');
    }

    // Validaciones de consistencia
    if (headers['X-RateLimit-Limit'] && headers['X-RateLimit-Remaining']) {
      const limit = parseInt(headers['X-RateLimit-Limit']);
      const remaining = parseInt(headers['X-RateLimit-Remaining']);

      if (remaining > limit) {
        warnings.push('X-RateLimit-Remaining is greater than X-RateLimit-Limit');
      }
    }

    // Validaciones de Retry-After
    if (headers['Retry-After'] && headers['X-RateLimit-Remaining']) {
      const remaining = parseInt(headers['X-RateLimit-Remaining']);
      if (remaining > 0 && headers['Retry-After']) {
        warnings.push('Retry-After should only be present when limit is exceeded');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Middleware para establecer headers automáticamente
   */
  createMiddleware(config: HeadersConfig = {}) {
    return (req: Request, res: Response, next: any) => {
      // Interceptar el establecimiento de headers de rate limit
      const originalSetHeader = res.set.bind(res);

      res.set = function(field: any, val?: any) {
        // Si es un header de rate limit, aplicar configuración adicional
        if (typeof field === 'string' && field.startsWith('X-RateLimit-')) {
          // Aplicar configuración personalizada si es necesario
        }

        return originalSetHeader(field, val);
      };

      next();
    };
  }

  /**
   * Crea un resumen de headers para logging
   */
  createHeadersSummary(headers: Record<string, string>): string {
    const relevantHeaders = Object.entries(headers)
      .filter(([key]) => key.startsWith('X-RateLimit-') || key === 'Retry-After')
      .map(([key, value]) => `${key}=${value}`)
      .join(', ');

    return relevantHeaders || 'No rate limit headers';
  }
}
