/**
 * Rate Limiting Middleware - Sprint 2
 * Siguiendo lineamientos nivel 2: rate limiting avanzado con múltiples estrategias
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '@/container/container';
import { TYPES } from '../../../container/types';
import { ICacheService } from '@/interfaces/IServices';
import { Logger } from 'winston';
import { environment } from '@/config/environment';

// Rate limit configuration interface
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipIf?: (req: Request) => boolean;
  message?: string;
  statusCode?: number;
  headers?: boolean;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  onLimitReached?: (req: Request, res: Response) => void;
}

// Rate limit data structure
interface RateLimitData {
  count: number;
  resetTime: number;
  firstHit: number;
}

// Sliding window data structure
interface SlidingWindowData {
  requests: number[];
  totalCount: number;
}

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      rateLimitData?: {
        remaining: number;
        resetTime: number;
        totalRequests: number;
      };
    }
  }
}

/**
 * Basic rate limiting middleware with fixed window
 */
export const rateLimit = (config: RateLimitConfig) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const logger = container.get<Logger>(TYPES.Logger);
    const cache = container.get<ICacheService>(TYPES.CacheService);

    try {
      // Skip rate limiting if condition is met
      if (config.skipIf && config.skipIf(req)) {
        next();
        return;
      }

      // Generate cache key
      const key = config.keyGenerator ? config.keyGenerator(req) : getDefaultKey(req);
      const cacheKey = `rate_limit:${key}`;

      // Get current rate limit data
      let rateLimitData: RateLimitData | null = await cache.get(cacheKey);
      const now = Date.now();
      const windowStart = now - config.windowMs;

      if (!rateLimitData || rateLimitData.resetTime <= now) {
        // Start new window
        rateLimitData = {
          count: 1,
          resetTime: now + config.windowMs,
          firstHit: now
        };
      } else {
        // Increment counter in current window
        rateLimitData.count++;
      }

      // Check if limit exceeded
      if (rateLimitData.count > config.maxRequests) {
        const retryAfter = Math.ceil((rateLimitData.resetTime - now) / 1000);

        // Set rate limit headers
        if (config.headers !== false) {
          setRateLimitHeaders(res, config.maxRequests, 0, rateLimitData.resetTime, config);
          res.set('Retry-After', retryAfter.toString());
        }

        // Call callback if provided
        if (config.onLimitReached) {
          config.onLimitReached(req, res);
        }

        // Log rate limit exceeded
        logger.warn('Rate limit exceeded', {
          key,
          count: rateLimitData.count,
          maxRequests: config.maxRequests,
          windowMs: config.windowMs,
          resetTime: new Date(rateLimitData.resetTime),
          ipAddress: getClientIP(req),
          userId: req.user?.id,
          path: req.path,
          method: req.method,
          userAgent: req.get('User-Agent')?.substring(0, 100)
        });

        const message = config.message || 'Too many requests, please try again later';
        const statusCode = config.statusCode || 429;

        res.status(statusCode).json({
          success: false,
          message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter,
          limit: config.maxRequests,
          remaining: 0,
          resetTime: rateLimitData.resetTime
        });
        return;
      }

      // Save updated rate limit data
      const ttl = Math.ceil((rateLimitData.resetTime - now) / 1000);
      await cache.set(cacheKey, rateLimitData, ttl);

      // Set rate limit headers
      const remaining = Math.max(0, config.maxRequests - rateLimitData.count);
      if (config.headers !== false) {
        setRateLimitHeaders(res, config.maxRequests, remaining, rateLimitData.resetTime, config);
      }

      // Add rate limit data to request
      req.rateLimitData = {
        remaining,
        resetTime: rateLimitData.resetTime,
        totalRequests: rateLimitData.count
      };

      next();

    } catch (error) {
      logger.error('Rate limit middleware error', {
        error: error.message,
        path: req.path,
        method: req.method,
        ipAddress: getClientIP(req)
      });

      // Continue without rate limiting on error (fail-safe)
      next();
    }
  };
};

/**
 * Sliding window rate limiting middleware
 */
export const slidingWindowRateLimit = (config: RateLimitConfig) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const logger = container.get<Logger>(TYPES.Logger);
    const cache = container.get<ICacheService>(TYPES.CacheService);

    try {
      if (config.skipIf && config.skipIf(req)) {
        next();
        return;
      }

      const key = config.keyGenerator ? config.keyGenerator(req) : getDefaultKey(req);
      const cacheKey = `sliding_rate_limit:${key}`;
      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Get current sliding window data
      let windowData: SlidingWindowData | null = await cache.get(cacheKey);

      if (!windowData) {
        windowData = {
          requests: [now],
          totalCount: 1
        };
      } else {
        // Remove requests outside the sliding window
        windowData.requests = windowData.requests.filter(timestamp => timestamp > windowStart);
        windowData.requests.push(now);
        windowData.totalCount = windowData.requests.length;
      }

      // Check if limit exceeded
      if (windowData.totalCount > config.maxRequests) {
        const oldestRequest = Math.min(...windowData.requests);
        const retryAfter = Math.ceil((oldestRequest + config.windowMs - now) / 1000);

        if (config.headers !== false) {
          setRateLimitHeaders(res, config.maxRequests, 0, oldestRequest + config.windowMs, config);
          res.set('Retry-After', retryAfter.toString());
        }

        if (config.onLimitReached) {
          config.onLimitReached(req, res);
        }

        logger.warn('Sliding window rate limit exceeded', {
          key,
          count: windowData.totalCount,
          maxRequests: config.maxRequests,
          windowMs: config.windowMs,
          ipAddress: getClientIP(req),
          userId: req.user?.id,
          path: req.path,
          method: req.method
        });

        const message = config.message || 'Too many requests in sliding window';
        const statusCode = config.statusCode || 429;

        res.status(statusCode).json({
          success: false,
          message,
          code: 'SLIDING_RATE_LIMIT_EXCEEDED',
          retryAfter,
          limit: config.maxRequests,
          remaining: 0
        });
        return;
      }

      // Save updated window data
      await cache.set(cacheKey, windowData, Math.ceil(config.windowMs / 1000));

      // Set headers
      const remaining = Math.max(0, config.maxRequests - windowData.totalCount);
      if (config.headers !== false) {
        setRateLimitHeaders(res, config.maxRequests, remaining, now + config.windowMs, config);
      }

      req.rateLimitData = {
        remaining,
        resetTime: now + config.windowMs,
        totalRequests: windowData.totalCount
      };

      next();

    } catch (error) {
      logger.error('Sliding window rate limit middleware error', {
        error: error.message,
        path: req.path,
        method: req.method
      });
      next();
    }
  };
};

/**
 * Adaptive rate limiting based on response times
 */
export const adaptiveRateLimit = (baseConfig: RateLimitConfig, options?: {
  slowResponseThreshold?: number;
  errorResponseThreshold?: number;
  adaptationFactor?: number;
  minLimit?: number;
}) => {
  const slowThreshold = options?.slowResponseThreshold || 1000; // 1 second
  const errorThreshold = options?.errorResponseThreshold || 500; // 500ms
  const adaptationFactor = options?.adaptationFactor || 0.5;
  const minLimit = options?.minLimit || 1;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const logger = container.get<Logger>(TYPES.Logger);
    const cache = container.get<ICacheService>(TYPES.CacheService);

    try {
      const key = baseConfig.keyGenerator ? baseConfig.keyGenerator(req) : getDefaultKey(req);
      const metricsKey = `adaptive_metrics:${key}`;

      // Get performance metrics
      const metrics = await cache.get(metricsKey) || {
        avgResponseTime: 0,
        errorRate: 0,
        requestCount: 0
      };

      // Calculate adaptive limit
      let adaptiveLimit = baseConfig.maxRequests;

      if (metrics.avgResponseTime > slowThreshold) {
        const slownessFactor = Math.min(metrics.avgResponseTime / slowThreshold, 3);
        adaptiveLimit = Math.max(minLimit, Math.floor(baseConfig.maxRequests / slownessFactor));
      }

      if (metrics.errorRate > 0.1) { // 10% error rate
        const errorFactor = 1 + metrics.errorRate;
        adaptiveLimit = Math.max(minLimit, Math.floor(adaptiveLimit / errorFactor));
      }

      // Create adaptive config
      const adaptiveConfig: RateLimitConfig = {
        ...baseConfig,
        maxRequests: adaptiveLimit
      };

      // Apply rate limiting with adaptive limit
      const startTime = Date.now();

      // Continue with rate limiting
      const rateLimitMiddleware = rateLimit(adaptiveConfig);
      rateLimitMiddleware(req, res, (error) => {
        if (error) {
          next(error);
          return;
        }

        // Track response time and errors after response
        res.on('finish', async () => {
          const responseTime = Date.now() - startTime;
          const isError = res.statusCode >= 400;

          try {
            // Update metrics
            const updatedMetrics = {
              avgResponseTime: (metrics.avgResponseTime * metrics.requestCount + responseTime) / (metrics.requestCount + 1),
              errorRate: (metrics.errorRate * metrics.requestCount + (isError ? 1 : 0)) / (metrics.requestCount + 1),
              requestCount: metrics.requestCount + 1
            };

            await cache.set(metricsKey, updatedMetrics, 300); // 5 minutes

            // Log adaptive adjustment
            if (adaptiveLimit !== baseConfig.maxRequests) {
              logger.info('Adaptive rate limit adjustment', {
                key,
                originalLimit: baseConfig.maxRequests,
                adaptiveLimit,
                avgResponseTime: updatedMetrics.avgResponseTime,
                errorRate: updatedMetrics.errorRate,
                currentResponseTime: responseTime,
                statusCode: res.statusCode
              });
            }
          } catch (metricsError) {
            logger.warn('Failed to update adaptive rate limit metrics', {
              error: metricsError.message,
              key
            });
          }
        });

        next();
      });

    } catch (error) {
      logger.error('Adaptive rate limit middleware error', {
        error: error.message,
        path: req.path,
        method: req.method
      });
      next();
    }
  };
};

/**
 * Hierarchical rate limiting (Global -> User -> IP)
 */
export const hierarchicalRateLimit = (configs: {
  global?: RateLimitConfig;
  user?: RateLimitConfig;
  ip?: RateLimitConfig;
}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const logger = container.get<Logger>(TYPES.Logger);

    try {
      let currentConfig: RateLimitConfig;
      let keyPrefix: string;

      // Check global limit first
      if (configs.global) {
        currentConfig = { ...configs.global, keyGenerator: () => 'global' };
        const globalMiddleware = rateLimit(currentConfig);

        await new Promise<void>((resolve, reject) => {
          globalMiddleware(req, res, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      }

      // Check user-specific limit
      if (configs.user && req.user) {
        currentConfig = { ...configs.user, keyGenerator: (req) => `user:${req.user!.id}` };
        const userMiddleware = rateLimit(currentConfig);

        await new Promise<void>((resolve, reject) => {
          userMiddleware(req, res, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      }

      // Check IP-specific limit
      if (configs.ip) {
        currentConfig = { ...configs.ip, keyGenerator: (req) => `ip:${getClientIP(req)}` };
        const ipMiddleware = rateLimit(currentConfig);

        await new Promise<void>((resolve, reject) => {
          ipMiddleware(req, res, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      }

      next();

    } catch (error) {
      if (error instanceof Error && error.message === 'RATE_LIMIT_EXCEEDED') {
        // Rate limit already handled by one of the sub-middlewares
        return;
      }

      logger.error('Hierarchical rate limit middleware error', {
        error: error.message,
        path: req.path,
        method: req.method
      });
      next();
    }
  };
};

/**
 * Predefined rate limiting configurations
 */
export const createStandardRateLimits = () => {
  return {
    // Strict rate limiting for authentication endpoints
    auth: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      message: 'Too many authentication attempts',
      keyGenerator: (req) => `auth:${getClientIP(req)}`,
      skipIf: (req) => req.user?.role === 'admin'
    }),

    // General API rate limiting
    api: rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      maxRequests: 100,
      keyGenerator: (req) => req.user?.id || `ip:${getClientIP(req)}`
    }),

    // Strict rate limiting for admin endpoints
    admin: rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 20,
      keyGenerator: (req) => `admin:${req.user?.id}`,
      skipIf: (req) => !req.user || req.user.role !== 'admin'
    }),

    // File upload rate limiting
    upload: rateLimit({
      windowMs: 10 * 60 * 1000, // 10 minutes
      maxRequests: 10,
      message: 'Too many upload attempts'
    }),

    // Password reset rate limiting
    passwordReset: rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
      keyGenerator: (req) => `pwd_reset:${getClientIP(req)}`
    }),

    // Adaptive rate limiting for general endpoints
    adaptive: adaptiveRateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      maxRequests: 60,
      keyGenerator: (req) => req.user?.id || `ip:${getClientIP(req)}`
    }, {
      slowResponseThreshold: 2000,
      errorResponseThreshold: 1000,
      adaptationFactor: 0.7,
      minLimit: 5
    }),

    // Hierarchical rate limiting
    hierarchical: hierarchicalRateLimit({
      global: {
        windowMs: 1 * 60 * 1000,
        maxRequests: 10000 // Global system limit
      },
      user: {
        windowMs: 1 * 60 * 1000,
        maxRequests: 200 // Per user limit
      },
      ip: {
        windowMs: 1 * 60 * 1000,
        maxRequests: 300 // Per IP limit
      }
    })
  };
};

/**
 * Helper functions
 */
function getDefaultKey(req: Request): string {
  if (req.user) {
    return `user:${req.user.id}`;
  }
  return `ip:${getClientIP(req)}`;
}

function getClientIP(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] as string ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         'unknown';
}

function setRateLimitHeaders(
  res: Response,
  limit: number,
  remaining: number,
  resetTime: number,
  config: RateLimitConfig
): void {
  if (config.standardHeaders !== false) {
    res.set({
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(resetTime).toISOString()
    });
  }

  if (config.legacyHeaders === true) {
    res.set({
      'X-Rate-Limit-Limit': limit.toString(),
      'X-Rate-Limit-Remaining': remaining.toString(),
      'X-Rate-Limit-Reset': Math.ceil(resetTime / 1000).toString()
    });
  }
}

/**
 * Rate limit bypass for specific conditions
 */
export const bypassRateLimit = (condition: (req: Request) => boolean) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (condition(req)) {
      // Skip rate limiting by modifying the request
      const originalSkip = req.query.skipRateLimit;
      req.query.skipRateLimit = 'true';

      // Restore original after middleware chain
      res.on('finish', () => {
        if (originalSkip !== undefined) {
          req.query.skipRateLimit = originalSkip;
        } else {
          delete req.query.skipRateLimit;
        }
      });
    }
    next();
  };
};
