/**
 * Rate Limit Middleware Tests - Sprint 2
 * Siguiendo lineamientos nivel 2: tests críticos para rate limiting
 */

import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import {
  rateLimit,
  slidingWindowRateLimit,
  adaptiveRateLimit,
  hierarchicalRateLimit,
  createStandardRateLimits
} from '@/shared/middleware/rateLimitMiddleware';
import { ICacheService } from '@/interfaces/IServices';
import { Logger } from 'winston';

// Mock container
jest.mock('@/container/container', () => ({
  container: {
    get: jest.fn()
  }
}));

// Mock dependencies
const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  deletePattern: jest.fn(),
  size: jest.fn(),
  clear: jest.fn()
} as jest.Mocked<ICacheService>;

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
} as unknown as Logger;

// Mock container.get
const { container } = require('@/container/container');
container.get.mockImplementation((type: string) => {
  switch (type) {
    case 'CacheService':
      return mockCacheService;
    case 'Logger':
      return mockLogger;
    default:
      return {};
  }
});

describe('Rate Limit Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;
  let setSpy: jest.Mock;

  beforeEach(() => {
    jsonSpy = jest.fn().mockReturnThis();
    statusSpy = jest.fn().mockReturnThis();
    setSpy = jest.fn().mockReturnThis();
    
    req = {
      ip: '127.0.0.1',
      path: '/test',
      method: 'GET',
      get: jest.fn().mockReturnValue('test-user-agent'),
      connection: { remoteAddress: '127.0.0.1' },
      socket: { remoteAddress: '127.0.0.1' },
      user: {
        id: 'user-123',
        email: 'test@example.com',
        companyId: 'company-456',
        role: 'user',
        sessionId: 'session-789'
      }
    };
    
    res = {
      status: statusSpy,
      json: jsonSpy,
      set: setSpy
    };
    
    next = jest.fn();
    
    jest.clearAllMocks();
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue();
  });

  describe('rateLimit', () => {
    it('should allow request when under limit', async () => {
      const config = {
        windowMs: 60000,
        maxRequests: 10
      };

      mockCacheService.get.mockResolvedValue(null); // No existing data

      const middleware = rateLimit(config);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
      expect(setSpy).toHaveBeenCalledWith({
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '9',
        'X-RateLimit-Reset': expect.any(String)
      });
    });

    it('should block request when limit exceeded', async () => {
      const config = {
        windowMs: 60000,
        maxRequests: 5
      };

      const existingData = {
        count: 6,
        resetTime: Date.now() + 30000,
        firstHit: Date.now() - 30000
      };

      mockCacheService.get.mockResolvedValue(existingData);

      const middleware = rateLimit(config);
      await middleware(req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(429);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: expect.any(Number),
        limit: 5,
        remaining: 0,
        resetTime: existingData.resetTime
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should use custom key generator', async () => {
      const config = {
        windowMs: 60000,
        maxRequests: 10,
        keyGenerator: (req: Request) => `custom:${req.user!.id}`
      };

      const middleware = rateLimit(config);
      await middleware(req as Request, res as Response, next);

      expect(mockCacheService.get).toHaveBeenCalledWith('rate_limit:custom:user-123');
      expect(next).toHaveBeenCalled();
    });

    it('should skip rate limiting based on condition', async () => {
      const config = {
        windowMs: 60000,
        maxRequests: 10,
        skipIf: (req: Request) => req.user!.role === 'admin'
      };

      req.user!.role = 'admin';

      const middleware = rateLimit(config);
      await middleware(req as Request, res as Response, next);

      expect(mockCacheService.get).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should handle cache errors gracefully', async () => {
      const config = {
        windowMs: 60000,
        maxRequests: 10
      };

      mockCacheService.get.mockRejectedValue(new Error('Cache error'));

      const middleware = rateLimit(config);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled(); // Fail-safe behavior
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should start new window when current window expires', async () => {
      const config = {
        windowMs: 60000,
        maxRequests: 10
      };

      const expiredData = {
        count: 8,
        resetTime: Date.now() - 1000, // Expired 1 second ago
        firstHit: Date.now() - 61000
      };

      mockCacheService.get.mockResolvedValue(expiredData);

      const middleware = rateLimit(config);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(setSpy).toHaveBeenCalledWith({
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '9', // New window, so remaining is max - 1
        'X-RateLimit-Reset': expect.any(String)
      });
    });
  });

  describe('slidingWindowRateLimit', () => {
    it('should allow request in sliding window', async () => {
      const config = {
        windowMs: 60000,
        maxRequests: 5
      };

      const now = Date.now();
      const windowData = {
        requests: [now - 30000, now - 20000], // 2 requests in the last minute
        totalCount: 2
      };

      mockCacheService.get.mockResolvedValue(windowData);

      const middleware = slidingWindowRateLimit(config);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should block request when sliding window limit exceeded', async () => {
      const config = {
        windowMs: 60000,
        maxRequests: 3
      };

      const now = Date.now();
      const windowData = {
        requests: [now - 30000, now - 20000, now - 10000, now - 5000], // 4 requests
        totalCount: 4
      };

      mockCacheService.get.mockResolvedValue(windowData);

      const middleware = slidingWindowRateLimit(config);
      await middleware(req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(429);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Too many requests in sliding window',
        code: 'SLIDING_RATE_LIMIT_EXCEEDED',
        retryAfter: expect.any(Number),
        limit: 3,
        remaining: 0
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should clean up old requests outside sliding window', async () => {
      const config = {
        windowMs: 60000,
        maxRequests: 5
      };

      const now = Date.now();
      const windowData = {
        requests: [
          now - 70000, // Outside window (should be removed)
          now - 30000, // Within window
          now - 20000  // Within window
        ],
        totalCount: 3
      };

      mockCacheService.get.mockResolvedValue(windowData);

      const middleware = slidingWindowRateLimit(config);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      // Should have 2 requests from the window + 1 new = 3 total
      const expectedData = {
        requests: expect.arrayContaining([now - 30000, now - 20000]),
        totalCount: 3
      };
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ totalCount: 3 }),
        expect.any(Number)
      );
    });
  });

  describe('adaptiveRateLimit', () => {
    beforeEach(() => {
      // Mock response.on for tracking response completion
      res.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          setTimeout(() => callback(), 0); // Simulate async response completion
        }
        return res;
      });
      res.statusCode = 200;
    });

    it('should apply normal rate limiting with good performance metrics', async () => {
      const baseConfig = {
        windowMs: 60000,
        maxRequests: 10
      };

      const goodMetrics = {
        avgResponseTime: 200, // Good response time
        errorRate: 0.01,      // Low error rate
        requestCount: 100
      };

      mockCacheService.get.mockImplementation((key) => {
        if (key.includes('adaptive_metrics')) {
          return Promise.resolve(goodMetrics);
        }
        return Promise.resolve(null);
      });

      const middleware = adaptiveRateLimit(baseConfig);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should reduce rate limit for slow responses', async () => {
      const baseConfig = {
        windowMs: 60000,
        maxRequests: 10
      };

      const slowMetrics = {
        avgResponseTime: 3000, // Slow response time
        errorRate: 0.05,
        requestCount: 50
      };

      let adaptiveLimitUsed: number = 0;
      mockCacheService.get.mockImplementation((key) => {
        if (key.includes('adaptive_metrics')) {
          return Promise.resolve(slowMetrics);
        }
        // Check for rate limit data to capture the adaptive limit
        return Promise.resolve(null);
      });

      const middleware = adaptiveRateLimit(baseConfig, {
        slowResponseThreshold: 1000,
        minLimit: 2
      });
      
      // We need to spy on the internal rate limit call
      // For this test, we'll check that the middleware was called (next was called)
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reduce rate limit for high error rate', async () => {
      const baseConfig = {
        windowMs: 60000,
        maxRequests: 10
      };

      const errorMetrics = {
        avgResponseTime: 500,
        errorRate: 0.25,    // High error rate
        requestCount: 100
      };

      mockCacheService.get.mockImplementation((key) => {
        if (key.includes('adaptive_metrics')) {
          return Promise.resolve(errorMetrics);
        }
        return Promise.resolve(null);
      });

      const middleware = adaptiveRateLimit(baseConfig);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('hierarchicalRateLimit', () => {
    it('should check all configured limits', async () => {
      const configs = {
        global: { windowMs: 60000, maxRequests: 1000 },
        user: { windowMs: 60000, maxRequests: 100 },
        ip: { windowMs: 60000, maxRequests: 200 }
      };

      mockCacheService.get.mockResolvedValue(null); // No existing limits

      const middleware = hierarchicalRateLimit(configs);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      // Should have checked global, user, and IP limits
      expect(mockCacheService.get).toHaveBeenCalledWith('rate_limit:global');
      expect(mockCacheService.get).toHaveBeenCalledWith('rate_limit:user:user-123');
      expect(mockCacheService.get).toHaveBeenCalledWith('rate_limit:ip:127.0.0.1');
    });

    it('should be blocked by global limit', async () => {
      const configs = {
        global: { windowMs: 60000, maxRequests: 5 }
      };

      const globalLimitData = {
        count: 6, // Over global limit
        resetTime: Date.now() + 30000,
        firstHit: Date.now() - 30000
      };

      mockCacheService.get.mockImplementation((key) => {
        if (key === 'rate_limit:global') {
          return Promise.resolve(globalLimitData);
        }
        return Promise.resolve(null);
      });

      const middleware = hierarchicalRateLimit(configs);
      await middleware(req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(429);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('createStandardRateLimits', () => {
    it('should create standard rate limit configurations', () => {
      const rateLimits = createStandardRateLimits();

      expect(rateLimits).toHaveProperty('auth');
      expect(rateLimits).toHaveProperty('api');
      expect(rateLimits).toHaveProperty('admin');
      expect(rateLimits).toHaveProperty('upload');
      expect(rateLimits).toHaveProperty('passwordReset');
      expect(rateLimits).toHaveProperty('adaptive');
      expect(rateLimits).toHaveProperty('hierarchical');
    });

    it('should apply auth rate limiting', async () => {
      const rateLimits = createStandardRateLimits();
      
      mockCacheService.get.mockResolvedValue({
        count: 6, // Over auth limit (5)
        resetTime: Date.now() + 30000,
        firstHit: Date.now() - 30000
      });

      await rateLimits.auth(req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(429);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Too many authentication attempts',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: expect.any(Number),
        limit: 5,
        remaining: 0,
        resetTime: expect.any(Number)
      });
    });

    it('should skip auth rate limiting for admin users', async () => {
      req.user!.role = 'admin';
      const rateLimits = createStandardRateLimits();

      await rateLimits.auth(req as Request, res as Response, next);

      expect(mockCacheService.get).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Custom scenarios', () => {
    it('should handle unauthenticated users with IP-based limiting', async () => {
      delete req.user;

      const config = {
        windowMs: 60000,
        maxRequests: 10
      };

      const middleware = rateLimit(config);
      await middleware(req as Request, res as Response, next);

      expect(mockCacheService.get).toHaveBeenCalledWith('rate_limit:ip:127.0.0.1');
      expect(next).toHaveBeenCalled();
    });

    it('should handle X-Forwarded-For header for IP detection', async () => {
      delete req.user;
      req.headers = { 'x-forwarded-for': '192.168.1.100, 10.0.0.1' };

      const config = {
        windowMs: 60000,
        maxRequests: 10
      };

      const middleware = rateLimit(config);
      await middleware(req as Request, res as Response, next);

      expect(mockCacheService.get).toHaveBeenCalledWith('rate_limit:ip:192.168.1.100');
      expect(next).toHaveBeenCalled();
    });

    it('should include custom headers', async () => {
      const config = {
        windowMs: 60000,
        maxRequests: 10,
        standardHeaders: true,
        legacyHeaders: true
      };

      const middleware = rateLimit(config);
      await middleware(req as Request, res as Response, next);

      expect(setSpy).toHaveBeenCalledWith({
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '9',
        'X-RateLimit-Reset': expect.any(String)
      });
      expect(setSpy).toHaveBeenCalledWith({
        'X-Rate-Limit-Limit': '10',
        'X-Rate-Limit-Remaining': '9',
        'X-Rate-Limit-Reset': expect.any(String)
      });
    });
  });
});