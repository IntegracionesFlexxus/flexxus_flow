/**
 * Rate Limiting Service - Sprint 2
 * Siguiendo lineamientos nivel 2: servicio centralizado con diferentes estrategias
 */

import { injectable, inject } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { rateLimitRules, RateLimitConfig, rateLimitBypass, rateLimitMessages } from '@/config/rateLimiting';
import { AppError, ErrorCode, RateLimitError } from '@/shared/services/errors/AppError';
import { environment } from '@/config/environment';

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  resetTime: Date;
  total?: number;
}

export interface RateLimitKey {
  ip: string;
  userId?: string;
  companyId?: string;
  endpoint?: string;
  userAgent?: string;
}

export interface RateLimitStrategy {
  getName(): string;
  shouldLimit(key: RateLimitKey, config: RateLimitConfig): Promise<boolean>;
  getInfo(key: RateLimitKey, config: RateLimitConfig): Promise<RateLimitInfo>;
  increment(key: RateLimitKey, config: RateLimitConfig): Promise<RateLimitInfo>;
  reset(key: RateLimitKey): Promise<void>;
}

/**
 * In-Memory Rate Limit Strategy
 */
class MemoryRateLimitStrategy implements RateLimitStrategy {
  private store = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private logger: Logger) {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  getName(): string {
    return 'memory';
  }

  async shouldLimit(key: RateLimitKey, config: RateLimitConfig): Promise<boolean> {
    const info = await this.getInfo(key, config);
    return info.remaining <= 0;
  }

  async getInfo(key: RateLimitKey, config: RateLimitConfig): Promise<RateLimitInfo> {
    const keyString = this.generateKey(key);
    const now = Date.now();
    const entry = this.store.get(keyString);

    if (!entry || now > entry.resetTime) {
      return {
        limit: config.max,
        remaining: config.max,
        reset: Math.floor((now + config.windowMs) / 1000),
        resetTime: new Date(now + config.windowMs),
        total: 0
      };
    }

    return {
      limit: config.max,
      remaining: Math.max(0, config.max - entry.count),
      reset: Math.floor(entry.resetTime / 1000),
      resetTime: new Date(entry.resetTime),
      total: entry.count
    };
  }

  async increment(key: RateLimitKey, config: RateLimitConfig): Promise<RateLimitInfo> {
    const keyString = this.generateKey(key);
    const now = Date.now();
    const resetTime = now + config.windowMs;

    let entry = this.store.get(keyString);

    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime };
      this.store.set(keyString, entry);
    }

    entry.count++;

    return {
      limit: config.max,
      remaining: Math.max(0, config.max - entry.count),
      reset: Math.floor(entry.resetTime / 1000),
      resetTime: new Date(entry.resetTime),
      total: entry.count
    };
  }

  async reset(key: RateLimitKey): Promise<void> {
    const keyString = this.generateKey(key);
    this.store.delete(keyString);
  }

  private generateKey(key: RateLimitKey): string {
    const parts = [key.ip];
    if (key.userId) parts.push(`user:${key.userId}`);
    if (key.companyId) parts.push(`company:${key.companyId}`);
    if (key.endpoint) parts.push(`endpoint:${key.endpoint}`);
    return parts.join(':');
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

/**
 * Redis Rate Limit Strategy (implementación futura)
 */
class RedisRateLimitStrategy implements RateLimitStrategy {
  constructor(private logger: Logger) {}

  getName(): string {
    return 'redis';
  }

  async shouldLimit(key: RateLimitKey, config: RateLimitConfig): Promise<boolean> {
    // TODO: Implementar con Redis
    throw new Error('Redis strategy not implemented yet');
  }

  async getInfo(key: RateLimitKey, config: RateLimitConfig): Promise<RateLimitInfo> {
    // TODO: Implementar con Redis
    throw new Error('Redis strategy not implemented yet');
  }

  async increment(key: RateLimitKey, config: RateLimitConfig): Promise<RateLimitInfo> {
    // TODO: Implementar con Redis
    throw new Error('Redis strategy not implemented yet');
  }

  async reset(key: RateLimitKey): Promise<void> {
    // TODO: Implementar con Redis
    throw new Error('Redis strategy not implemented yet');
  }
}

@injectable()
export class RateLimitingService {
  private strategy: RateLimitStrategy;

  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {
    // Por ahora usamos la estrategia en memoria, en el futuro se puede cambiar a Redis
    this.strategy = new MemoryRateLimitStrategy(this.logger);

    this.logger.info(`Rate limiting service initialized with ${this.strategy.getName()} strategy`);
  }

  /**
   * Verifica si una request debe ser limitada
   */
  async shouldLimit(
    req: Request,
    configName: keyof typeof rateLimitRules | RateLimitConfig
  ): Promise<{ shouldLimit: boolean; info: RateLimitInfo }> {
    const config = this.getConfig(configName);
    const key = this.generateRateLimitKey(req);

    // Verificar bypasses
    if (this.shouldBypass(req)) {
      return {
        shouldLimit: false,
        info: {
          limit: config.max,
          remaining: config.max,
          reset: Math.floor((Date.now() + config.windowMs) / 1000),
          resetTime: new Date(Date.now() + config.windowMs)
        }
      };
    }

    const shouldLimit = await this.strategy.shouldLimit(key, config);
    const info = await this.strategy.getInfo(key, config);

    return { shouldLimit, info };
  }

  /**
   * Incrementa el contador de rate limiting
   */
  async incrementCounter(
    req: Request,
    configName: keyof typeof rateLimitRules | RateLimitConfig
  ): Promise<RateLimitInfo> {
    const config = this.getConfig(configName);
    const key = this.generateRateLimitKey(req);

    const info = await this.strategy.increment(key, config);

    // Log cuando se alcanza el límite
    if (info.remaining <= 0) {
      this.logger.warn('Rate limit exceeded', {
        key: this.generateKeyString(key),
        limit: info.limit,
        total: info.total,
        resetTime: info.resetTime,
        userAgent: req.get('User-Agent'),
        endpoint: req.path
      });
    }

    return info;
  }

  /**
   * Reset del contador para una key específica
   */
  async resetCounter(req: Request): Promise<void> {
    const key = this.generateRateLimitKey(req);
    await this.strategy.reset(key);
  }

  /**
   * Obtiene información actual del rate limiting sin incrementar
   */
  async getInfo(
    req: Request,
    configName: keyof typeof rateLimitRules | RateLimitConfig
  ): Promise<RateLimitInfo> {
    const config = this.getConfig(configName);
    const key = this.generateRateLimitKey(req);

    return await this.strategy.getInfo(key, config);
  }

  /**
   * Crea un error de rate limiting
   */
  createRateLimitError(
    info: RateLimitInfo,
    configName: string,
    customMessage?: string
  ): RateLimitError {
    const retryAfter = Math.ceil((info.resetTime.getTime() - Date.now()) / 1000);

    const message = customMessage || 
      rateLimitMessages[configName as keyof typeof rateLimitMessages]?.message ||
      rateLimitMessages.default.message;

    return new RateLimitError(
      info.limit,
      info.resetTime.getTime() - Date.now(),
      retryAfter,
      message
    );
  }

  /**
   * Middleware para aplicar rate limiting
   */
  createMiddleware(
    configName: keyof typeof rateLimitRules | RateLimitConfig,
    options: {
      message?: string;
      skipSuccessfulRequests?: boolean;
      skipFailedRequests?: boolean;
      onLimitReached?: (req: Request, res: Response, info: RateLimitInfo) => void;
    } = {}
  ) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { shouldLimit, info } = await this.shouldLimit(req, configName);

        // Añadir headers de rate limit
        this.setRateLimitHeaders(res, info);

        if (shouldLimit) {
          // Incrementar contador solo si no está en el bypass
          if (!this.shouldBypass(req)) {
            await this.incrementCounter(req, configName);
          }

          // Callback personalizado cuando se alcanza el límite
          if (options.onLimitReached) {
            options.onLimitReached(req, res, info);
          }

          const error = this.createRateLimitError(
            info,
            typeof configName === 'string' ? configName : 'default',
            options.message
          );

          // Log del rate limit alcanzado
          this.logger.warn('Rate limit reached', {
            ip: req.ip,
            userId: req.user?.id,
            companyId: req.user?.companyId,
            endpoint: req.path,
            method: req.method,
            limit: info.limit,
            remaining: info.remaining,
            resetTime: info.resetTime
          });

          res.status(429).json({
            success: false,
            message: error.message,
            code: error.code,
            retryAfter: error.details.retryAfter,
            limit: info.limit,
            remaining: info.remaining,
            reset: info.reset
          });
          return;
        }

        // Incrementar contador solo si la request será procesada
        const shouldSkip = (options.skipSuccessfulRequests && res.statusCode < 400) ||
                          (options.skipFailedRequests && res.statusCode >= 400);

        if (!shouldSkip && !this.shouldBypass(req)) {
          const updatedInfo = await this.incrementCounter(req, configName);
          this.setRateLimitHeaders(res, updatedInfo);
        }

        next();
      } catch (error) {
        this.logger.error('Rate limiting middleware error', {
          error: error.message,
          stack: error.stack,
          ip: req.ip,
          path: req.path
        });
        next(error);
      }
    };
  }

  /**
   * Middleware específico para diferentes tipos de operaciones
   */
  authLimiter() {
    return this.createMiddleware('auth', {
      message: rateLimitMessages.auth.message,
      skipSuccessfulRequests: true,
      onLimitReached: (req, res, info) => {
        this.logger.warn('Authentication rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.path,
          attempts: info.total
        });
      }
    });
  }

  apiLimiter() {
    return this.createMiddleware('api', {
      message: rateLimitMessages.api.message
    });
  }

  companyLimiter(plan: 'starter' | 'professional' | 'enterprise' = 'starter') {
    return this.createMiddleware(rateLimitRules.company[plan], {
      message: rateLimitMessages.company.message
    });
  }

  endpointLimiter(endpoint: keyof typeof rateLimitRules.endpoint) {
    return this.createMiddleware(rateLimitRules.endpoint[endpoint], {
      message: rateLimitMessages[endpoint === 'login' ? 'auth' : 'default'].message,
      skipSuccessfulRequests: endpoint === 'login'
    });
  }

  /**
   * Genera la key para rate limiting basada en la request
   */
  private generateRateLimitKey(req: Request): RateLimitKey {
    return {
      ip: req.ip,
      userId: req.user?.id,
      companyId: req.user?.companyId,
      endpoint: req.path,
      userAgent: req.get('User-Agent')
    };
  }

  /**
   * Verifica si la request debe bypass el rate limiting
   */
  private shouldBypass(req: Request): boolean {
    // Bypass en desarrollo/testing si está configurado
    if ((rateLimitBypass.disableForDevelopment && environment.nodeEnv === 'development') ||
        (rateLimitBypass.disableForTesting && environment.nodeEnv === 'testing')) {
      return true;
    }

    // Bypass para IPs en whitelist
    if (rateLimitBypass.whitelistedIPs.includes(req.ip)) {
      return true;
    }

    // Bypass para user agents específicos
    const userAgent = req.get('User-Agent') || '';
    if (rateLimitBypass.whitelistedUserAgents.some(ua => userAgent.includes(ua))) {
      return true;
    }

    // Bypass para roles privilegiados
    if (req.user?.role && rateLimitBypass.privilegedRoles.includes(req.user.role)) {
      return true;
    }

    return false;
  }

  /**
   * Obtiene la configuración según el nombre o devuelve la configuración directamente
   */
  private getConfig(configName: keyof typeof rateLimitRules | RateLimitConfig): RateLimitConfig {
    if (typeof configName === 'object') {
      return configName;
    }

    // Manejo de configuraciones anidadas
    const configPath = configName.split('.');
    let config: any = rateLimitRules;

    for (const path of configPath) {
      config = config[path];
      if (!config) {
        throw new Error(`Rate limit configuration not found: ${configName}`);
      }
    }

    return config as RateLimitConfig;
  }

  /**
   * Genera string para logging
   */
  private generateKeyString(key: RateLimitKey): string {
    const parts = [key.ip];
    if (key.userId) parts.push(`user:${key.userId}`);
    if (key.companyId) parts.push(`company:${key.companyId}`);
    if (key.endpoint) parts.push(`endpoint:${key.endpoint}`);
    return parts.join(':');
  }

  /**
   * Establece headers de rate limit en la response
   */
  private setRateLimitHeaders(res: Response, info: RateLimitInfo): void {
    res.set('X-RateLimit-Limit', info.limit.toString());
    res.set('X-RateLimit-Remaining', info.remaining.toString());
    res.set('X-RateLimit-Reset', info.reset.toString());

    if (info.remaining <= 0) {
      const retryAfter = Math.ceil((info.resetTime.getTime() - Date.now()) / 1000);
      res.set('Retry-After', retryAfter.toString());
    }
  }
}
