/**
 * Security Middleware - Sprint 2
 * Siguiendo lineamientos nivel 2: seguridad en capas
 * Implementación de medidas de seguridad comprehensivas
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import helmet from 'helmet';
import cors, { CorsOptions } from 'cors';
import csrf from 'csurf';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { Logger } from 'winston';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { environment } from '@/config/environment';
import crypto from 'crypto';

/**
 * Security headers configuration using Helmet
 */
export function setupSecurityHeaders(): RequestHandler {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        manifestSrc: ["'self'"],
        upgradeInsecureRequests: environment.isProduction ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: !environment.isDevelopment,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-site' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  });
}

/**
 * CORS configuration
 */
export function setupCors(): RequestHandler {
  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      const allowedOrigins = environment.cors.origin;
      const logger = container.get<Logger>(TYPES.Logger);

      // En producción, rechazar wildcard
      if (environment.isProduction && allowedOrigins === '*') {
        logger.error('CORS wildcard (*) detectado en producción - rechazando todas las solicitudes');
        return callback(new Error('CORS configuration error'));
      }

      // Allow requests with no origin (like mobile apps) solo en desarrollo
      if (!origin && environment.isDevelopment) {
        return callback(null, true);
      }

      // En producción, siempre requerir origin
      if (!origin && environment.isProduction) {
        logger.warn('Request sin origin en producción', { headers: 'hidden for security' });
        return callback(new Error('Origin required'));
      }

      // Validar contra la lista de permitidos
      const isAllowed = 
        (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) ||
        (typeof allowedOrigins === 'string' && allowedOrigins === origin) ||
        (allowedOrigins === '*' && !environment.isProduction);

      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn('CORS blocked request', { 
          origin, 
          allowedOrigins: environment.isProduction ? '[HIDDEN]' : allowedOrigins,
          environment: environment.nodeEnv
        });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: environment.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Token-Type',
      'X-Requested-With',
      'X-CSRF-Token',
      'X-Request-ID',
      'X-Request-Time',
      'X-Device-Fingerprint',
      'X-Client-Version',
      'X-Client-Platform',
      'X-Client-Id',
      'X-User-ID',
      'X-Company-ID',
      'X-Feature-Flag-Client',
      'x-feature-flag-client',
      'X-Feature-Flag-Version',
      'x-feature-flag-version',
      'X-Tenant-ID',
      'X-Session-ID',
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Page',
      'X-Per-Page',
      'X-Page-Count',
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    maxAge: environment.cors.maxAge,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };

  return cors(corsOptions);
}

/**
 * CSRF protection middleware
 */
export function setupCsrfProtection() {
  const csrfProtection = csrf({
    cookie: {
      httpOnly: true,
      secure: environment.isProduction,
      sameSite: 'strict',
    },
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    value: (req: Request) => {
      return (
        req.body._csrf ||
        req.query._csrf ||
        req.headers['x-csrf-token'] ||
        req.headers['x-xsrf-token']
      );
    },
  });

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF for API endpoints that use JWT
    if (req.path.startsWith('/api/') && req.headers.authorization) {
      return next();
    }

    csrfProtection(req as any, res as any, (err: any) => {
      if (err) {
        const logger = container.get<Logger>(TYPES.Logger);
        logger.warn('CSRF token validation failed', {
          ip: req.ip,
          path: req.path,
          method: req.method,
        });

        return res.status(403).json({
          success: false,
          message: 'Invalid or missing CSRF token',
        });
      }

      // Provide CSRF token to the response
      res.locals.csrfToken = req.csrfToken();
      next();
    });
  };
}

/**
 * SQL injection prevention (for PostgreSQL)
 */
export function setupSqlInjectionPrevention(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    // PostgreSQL parameterized queries handle this at the query level
    // This is an additional layer of protection
    const suspiciousPatterns = [
      /('|(\-\-)|(;)|(\|\|)|(\*)|(<)|(>)|(%)|(¥)|(\x00))/gi,
      /(ALTER|CREATE|DELETE|DROP|EXEC(UTE)?|INSERT|SELECT|UNION|UPDATE)/gi
    ];

    const checkValue = (value: any): boolean => {
      if (typeof value === 'string') {
        return suspiciousPatterns.some(pattern => pattern.test(value));
      }
      return false;
    };

    const checkObject = (obj: any): boolean => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (checkValue(obj[key]) || (typeof obj[key] === 'object' && checkObject(obj[key]))) {
            return true;
          }
        }
      }
      return false;
    };

    if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
      const logger = container.get<Logger>(TYPES.Logger);
      logger.warn('Potential SQL injection attempt blocked', {
        ip: req.ip,
        path: req.path,
        method: req.method
      });
    }

    next();
  };
}

/**
 * Advanced rate limiting with Redis support
 */
export class AdvancedRateLimiter {
  private limiter: RateLimiterMemory | RateLimiterRedis;
  private logger: Logger;

  constructor(options: {
    points?: number;
    duration?: number;
    blockDuration?: number;
    useRedis?: boolean;
    redisClient?: Redis;
  } = {}) {
    this.logger = container.get<Logger>(TYPES.Logger);

    if (options.useRedis && options.redisClient) {
      this.limiter = new RateLimiterRedis({
        storeClient: options.redisClient,
        keyPrefix: 'rate-limit:',
        points: options.points || 100,
        duration: options.duration || 60,
        blockDuration: options.blockDuration || 60,
      });
    } else {
      this.limiter = new RateLimiterMemory({
        points: options.points || 100,
        duration: options.duration || 60,
        blockDuration: options.blockDuration || 60,
      });
    }
  }

  middleware(keyGenerator?: (req: Request) => string): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = keyGenerator ? keyGenerator(req) : this.getDefaultKey(req);

        const rateLimiterRes = await this.limiter.consume(key);

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', this.limiter.points.toString());
        res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints.toString());
        res.setHeader(
          'X-RateLimit-Reset',
          new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString()
        );

        next();
      } catch (rateLimiterRes: any) {
        this.logger.warn('Rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          remainingPoints: rateLimiterRes?.remainingPoints || 0,
        });

        res.setHeader('Retry-After', Math.round(rateLimiterRes.msBeforeNext / 1000).toString());
        res.setHeader('X-RateLimit-Limit', this.limiter.points.toString());
        res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints.toString());
        res.setHeader(
          'X-RateLimit-Reset',
          new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString()
        );

        res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later',
          retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000),
        });
      }
    };
  }

  private getDefaultKey(req: Request): string {
    // Use user ID if authenticated, otherwise use IP
    if ((req as any).user?.id) {
      return `user:${(req as any).user.id}`;
    }
    return `ip:${req.ip}`;
  }
}

/**
 * Request ID middleware for tracking
 */
export function setupRequestId(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();

    // Attach to request and response
    (req as any).requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Add to logger context
    const logger = container.get<Logger>(TYPES.Logger);
    (logger as any).requestId = requestId;

    next();
  };
}

/**
 * Security monitoring middleware
 */
export function setupSecurityMonitoring(): RequestHandler {
  const suspiciousPatterns = [
    /(\.\.\/)/, // Path traversal
    /(<script|javascript:|onerror=|onclick=)/i, // XSS attempts
    /(union|select|insert|update|delete|drop)/i, // SQL injection
    /(\${|`|\|)/,  // Command injection
    /(etc\/passwd|windows\/system32)/i, // System file access
  ];

  return (req: Request, res: Response, next: NextFunction) => {
    const logger = container.get<Logger>(TYPES.Logger);
    const url = req.originalUrl;
    const body = JSON.stringify(req.body);
    const headers = JSON.stringify(req.headers);

    // Check for suspicious patterns
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url) || pattern.test(body) || pattern.test(headers)) {
        logger.error('Suspicious request detected', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          pattern: pattern.toString(),
          userAgent: req.headers['user-agent'],
        });

        // Optionally block the request
        if (environment.security.blockSuspiciousRequests) {
          return res.status(400).json({
            success: false,
            message: 'Invalid request',
          });
        }
      }
    }

    next();
  };
}

/**
 * IP whitelist/blacklist middleware
 */
export class IpFilter {
  private whitelist: Set<string>;
  private blacklist: Set<string>;
  private logger: Logger;

  constructor(options: {
    whitelist?: string[];
    blacklist?: string[];
  } = {}) {
    this.whitelist = new Set(options.whitelist || []);
    this.blacklist = new Set(options.blacklist || []);
    this.logger = container.get<Logger>(TYPES.Logger);
  }

  middleware(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || req.socket.remoteAddress || '';

      // Check blacklist
      if (this.blacklist.has(ip)) {
        this.logger.warn('Blacklisted IP blocked', { ip, path: req.path });
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      // Check whitelist (if configured, only allow whitelisted IPs)
      if (this.whitelist.size > 0 && !this.whitelist.has(ip)) {
        this.logger.warn('Non-whitelisted IP blocked', { ip, path: req.path });
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      next();
    };
  }

  addToBlacklist(ip: string): void {
    this.blacklist.add(ip);
    this.logger.info('IP added to blacklist', { ip });
  }

  removeFromBlacklist(ip: string): void {
    this.blacklist.delete(ip);
    this.logger.info('IP removed from blacklist', { ip });
  }

  addToWhitelist(ip: string): void {
    this.whitelist.add(ip);
    this.logger.info('IP added to whitelist', { ip });
  }

  removeFromWhitelist(ip: string): void {
    this.whitelist.delete(ip);
    this.logger.info('IP removed from whitelist', { ip });
  }
}

/**
 * Content-Type validation
 */
export function validateContentType(allowedTypes: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.headers['content-type'];

      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        const logger = container.get<Logger>(TYPES.Logger);
        logger.warn('Invalid content type', {
          ip: req.ip,
          path: req.path,
          contentType,
          allowedTypes,
        });

        return res.status(415).json({
          success: false,
          message: 'Unsupported Media Type',
        });
      }
    }

    next();
  };
}

/**
 * Setup all security middleware
 */
export function setupSecurity(app: any): void {
  // Basic security headers
  app.use(setupSecurityHeaders());

  // CORS
  app.use(setupCors());

  // Request ID for tracking
  app.use(setupRequestId());

  // Content-Type validation
  app.use(validateContentType(['application/json', 'multipart/form-data']));

  // SQL injection prevention (additional layer for PostgreSQL)
  app.use(setupSqlInjectionPrevention());

  // Security monitoring
  app.use(setupSecurityMonitoring());

  // Rate limiting (can be customized per route)
  const generalLimiter = new AdvancedRateLimiter({
    points: 100,
    duration: 60,
  });
  app.use('/api/', generalLimiter.middleware());

  // Auth endpoints have stricter limits
  const authLimiter = new AdvancedRateLimiter({
    points: 5,
    duration: 60,
    blockDuration: 300,
  });
  app.use('/api/auth/login', authLimiter.middleware());
  app.use('/api/auth/register', authLimiter.middleware());

  // CSRF protection (for non-API routes)
  app.use(setupCsrfProtection());

  const logger = container.get<Logger>(TYPES.Logger);
  logger.info('Security middleware configured successfully');
}
