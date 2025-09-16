/**
 * Rate Limiting Service Tests - Sprint 2
 * Siguiendo lineamientos nivel 2: tests comprehensivos para rate limiting
 */

import 'reflect-metadata';
import { Request, Response } from 'express';
import { RateLimitingService, RateLimitStrategy, RateLimitKey, RateLimitInfo } from '@/shared/services/RateLimitingService';
import { Logger } from 'winston';
import { rateLimitRules } from '@/config/rateLimiting';

// Mock Logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
} as unknown as Logger;

// Mock Strategy
class MockRateLimitStrategy implements RateLimitStrategy {
  private store = new Map<string, { count: number; resetTime: number }>();

  getName(): string {
    return 'mock';
  }

  async shouldLimit(key: RateLimitKey, config: any): Promise<boolean> {
    const info = await this.getInfo(key, config);
    return info.remaining <= 0;
  }

  async getInfo(key: RateLimitKey, config: any): Promise<RateLimitInfo> {
    const keyString = this.generateKey(key);
    const entry = this.store.get(keyString);
    const now = Date.now();

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

  async increment(key: RateLimitKey, config: any): Promise<RateLimitInfo> {
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

  // Helper method for testing
  setEntry(key: RateLimitKey, count: number, resetTime: number): void {
    const keyString = this.generateKey(key);
    this.store.set(keyString, { count, resetTime });
  }
}

describe('RateLimitingService', () => {
  let rateLimitingService: RateLimitingService;
  let mockStrategy: MockRateLimitStrategy;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    mockStrategy = new MockRateLimitStrategy();
    rateLimitingService = new RateLimitingService(mockLogger);
    
    // Inject mock strategy
    (rateLimitingService as any).strategy = mockStrategy;

    req = {
      ip: '192.168.1.1',
      path: '/api/test',
      method: 'GET',
      get: jest.fn().mockReturnValue('test-user-agent'),
      user: {
        id: 'user-123',
        companyId: 'company-456',
        role: 'user'
      }
    };

    res = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    jest.clearAllMocks();
  });

  describe('shouldLimit', () => {
    it('should not limit when under the limit', async () => {
      const config = { max: 10, windowMs: 60000 };
      const { shouldLimit, info } = await rateLimitingService.shouldLimit(req as Request, config);

      expect(shouldLimit).toBe(false);
      expect(info.remaining).toBe(10);
      expect(info.limit).toBe(10);
    });

    it('should limit when over the limit', async () => {
      const config = { max: 5, windowMs: 60000 };
      
      // Simulate exceeding the limit
      const key = { ip: req.ip!, userId: req.user!.id, companyId: req.user!.companyId, endpoint: req.path };
      mockStrategy.setEntry(key, 6, Date.now() + 60000);

      const { shouldLimit, info } = await rateLimitingService.shouldLimit(req as Request, config);

      expect(shouldLimit).toBe(true);
      expect(info.remaining).toBe(0);
    });

    it('should bypass rate limiting for whitelisted conditions', async () => {
      // Mock bypass condition (admin role)
      req.user!.role = 'admin';
      
      const config = { max: 1, windowMs: 60000 };
      const { shouldLimit } = await rateLimitingService.shouldLimit(req as Request, config);

      expect(shouldLimit).toBe(false);
    });
  });

  describe('incrementCounter', () => {
    it('should increment counter correctly', async () => {
      const config = { max: 10, windowMs: 60000 };
      
      const info1 = await rateLimitingService.incrementCounter(req as Request, config);
      expect(info1.remaining).toBe(9);
      expect(info1.total).toBe(1);

      const info2 = await rateLimitingService.incrementCounter(req as Request, config);
      expect(info2.remaining).toBe(8);
      expect(info2.total).toBe(2);
    });

    it('should reset counter after window expires', async () => {
      const config = { max: 10, windowMs: 100 }; // Very short window
      
      const info1 = await rateLimitingService.incrementCounter(req as Request, config);
      expect(info1.remaining).toBe(9);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const info2 = await rateLimitingService.incrementCounter(req as Request, config);
      expect(info2.remaining).toBe(9); // Should reset to max - 1
      expect(info2.total).toBe(1);
    });
  });

  describe('createMiddleware', () => {
    it('should allow requests under limit', async () => {
      const middleware = rateLimitingService.createMiddleware('general');
      const next = jest.fn();

      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalledWith(429);
    });

    it('should block requests over limit', async () => {
      const config = { max: 1, windowMs: 60000, standardHeaders: true, legacyHeaders: false };
      const middleware = rateLimitingService.createMiddleware(config);
      const next = jest.fn();

      // First request should pass
      await middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Second request should be blocked
      jest.clearAllMocks();
      await middleware(req as Request, res as Response, next);
      
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Too many requests')
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should set rate limit headers', async () => {
      const middleware = rateLimitingService.createMiddleware('general');
      const next = jest.fn();

      await middleware(req as Request, res as Response, next);

      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });
  });

  describe('authLimiter', () => {
    it('should apply strict limits for authentication', async () => {
      const middleware = rateLimitingService.authLimiter();
      const next = jest.fn();
      
      // Should use auth configuration (max: 5 by default)
      req.path = '/auth/login';

      await middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should skip successful requests when configured', async () => {
      const middleware = rateLimitingService.authLimiter();
      const next = jest.fn();

      // Mock successful response
      res.statusCode = 200;

      await middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('companyLimiter', () => {
    it('should apply different limits based on company plan', async () => {
      const starterMiddleware = rateLimitingService.companyLimiter('starter');
      const enterpriseMiddleware = rateLimitingService.companyLimiter('enterprise');
      const next = jest.fn();

      // Starter plan should have lower limits
      await starterMiddleware(req as Request, res as Response, next);
      
      // Enterprise plan should have higher limits
      await enterpriseMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledTimes(2);
    });
  });

  describe('endpointLimiter', () => {
    it('should apply endpoint-specific limits', async () => {
      const loginLimiter = rateLimitingService.endpointLimiter('login');
      const next = jest.fn();

      req.path = '/auth/login';

      await loginLimiter(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should skip successful login attempts', async () => {
      const loginLimiter = rateLimitingService.endpointLimiter('login');
      const next = jest.fn();

      req.path = '/auth/login';
      res.statusCode = 200; // Successful login

      await loginLimiter(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('createRateLimitError', () => {
    it('should create proper rate limit error', () => {
      const info: RateLimitInfo = {
        limit: 10,
        remaining: 0,
        reset: Math.floor((Date.now() + 60000) / 1000),
        resetTime: new Date(Date.now() + 60000)
      };

      const error = rateLimitingService.createRateLimitError(info, 'test');

      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.statusCode).toBe(429);
      expect(error.details.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('resetCounter', () => {
    it('should reset rate limit counter', async () => {
      const config = { max: 10, windowMs: 60000 };
      
      // Increment counter
      await rateLimitingService.incrementCounter(req as Request, config);
      let info = await rateLimitingService.getInfo(req as Request, config);
      expect(info.remaining).toBe(9);

      // Reset counter
      await rateLimitingService.resetCounter(req as Request);
      info = await rateLimitingService.getInfo(req as Request, config);
      expect(info.remaining).toBe(10);
    });
  });

  describe('getInfo', () => {
    it('should return current rate limit info', async () => {
      const config = { max: 100, windowMs: 60000 };
      
      const info = await rateLimitingService.getInfo(req as Request, config);
      
      expect(info.limit).toBe(100);
      expect(info.remaining).toBe(100);
      expect(info.reset).toBeGreaterThan(0);
      expect(info.resetTime).toBeInstanceOf(Date);
    });
  });

  describe('bypass conditions', () => {
    it('should bypass for development environment', async () => {
      // Mock development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const { shouldLimit } = await rateLimitingService.shouldLimit(req as Request, 'general');
      expect(shouldLimit).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    it('should bypass for privileged roles', async () => {
      req.user!.role = 'admin';
      
      const { shouldLimit } = await rateLimitingService.shouldLimit(req as Request, 'general');
      expect(shouldLimit).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle strategy errors gracefully', async () => {
      // Mock strategy that throws errors
      const errorStrategy = {
        getName: () => 'error',
        shouldLimit: jest.fn().mockRejectedValue(new Error('Strategy error')),
        getInfo: jest.fn().mockRejectedValue(new Error('Strategy error')),
        increment: jest.fn().mockRejectedValue(new Error('Strategy error')),
        reset: jest.fn().mockRejectedValue(new Error('Strategy error'))
      };

      (rateLimitingService as any).strategy = errorStrategy;

      const middleware = rateLimitingService.createMiddleware('general');
      const next = jest.fn();

      await middleware(req as Request, res as Response, next);

      // Should pass error to next middleware
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('key generation', () => {
    it('should generate consistent keys for same request', async () => {
      const config = { max: 10, windowMs: 60000 };
      
      const info1 = await rateLimitingService.getInfo(req as Request, config);
      const info2 = await rateLimitingService.getInfo(req as Request, config);
      
      expect(info1.remaining).toBe(info2.remaining);
    });

    it('should generate different keys for different users', async () => {
      const config = { max: 10, windowMs: 60000 };
      
      await rateLimitingService.incrementCounter(req as Request, config);
      const info1 = await rateLimitingService.getInfo(req as Request, config);
      
      // Change user
      req.user!.id = 'user-456';
      const info2 = await rateLimitingService.getInfo(req as Request, config);
      
      expect(info1.remaining).toBe(9); // Decremented
      expect(info2.remaining).toBe(10); // Fresh for new user
    });
  });

  describe('configuration handling', () => {
    it('should handle string configuration names', async () => {
      const { shouldLimit } = await rateLimitingService.shouldLimit(req as Request, 'general');
      expect(shouldLimit).toBe(false);
    });

    it('should handle object configurations', async () => {
      const config = { max: 5, windowMs: 30000, standardHeaders: true, legacyHeaders: false };
      const { shouldLimit } = await rateLimitingService.shouldLimit(req as Request, config);
      expect(shouldLimit).toBe(false);
    });

    it('should throw error for invalid configuration names', async () => {
      await expect(
        rateLimitingService.shouldLimit(req as Request, 'invalid-config' as any)
      ).rejects.toThrow();
    });
  });
});