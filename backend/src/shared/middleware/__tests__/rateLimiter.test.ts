/**
 * Rate Limiting Middleware Tests - Sprint 2
 * Siguiendo lineamientos nivel 2: tests de integración para middleware
 */

import 'reflect-metadata';
import { Request, Response } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { 
  generalLimiter, 
  authLimiter, 
  apiLimiter,
  loginLimiter,
  registerLimiter,
  createCompanyLimiter,
  createEndpointLimiter,
  conditionalRateLimiter,
  userSpecificLimiter,
  RateLimitPresets,
  applyRateLimitStack
} from '@/shared/middleware/rateLimiter';
import { RateLimitingService } from '@/shared/services/RateLimitingService';
import { Logger } from 'winston';

// Mock container
jest.mock('@/container/container');
const mockContainer = container as jest.Mocked<typeof container>;

// Mock RateLimitingService
const mockRateLimitingService = {
  createMiddleware: jest.fn(),
  authLimiter: jest.fn(),
  apiLimiter: jest.fn(),
  companyLimiter: jest.fn(),
  endpointLimiter: jest.fn()
} as jest.Mocked<RateLimitingService>;

// Mock Logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
} as unknown as Logger;

describe('Rate Limiting Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;
  let mockMiddleware: jest.Mock;

  beforeEach(() => {
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
      json: jest.fn(),
      end: jest.fn()
    };

    next = jest.fn();
    mockMiddleware = jest.fn().mockImplementation((req, res, next) => next());

    // Setup container mock
    mockContainer.get.mockImplementation((type) => {
      if (type === TYPES.RateLimitingService) {
        return mockRateLimitingService;
      }
      if (type === TYPES.Logger) {
        return mockLogger;
      }
      return null;
    });

    // Setup service mock
    mockRateLimitingService.createMiddleware.mockReturnValue(mockMiddleware);
    mockRateLimitingService.authLimiter.mockReturnValue(mockMiddleware);
    mockRateLimitingService.apiLimiter.mockReturnValue(mockMiddleware);
    mockRateLimitingService.companyLimiter.mockReturnValue(mockMiddleware);
    mockRateLimitingService.endpointLimiter.mockReturnValue(mockMiddleware);

    jest.clearAllMocks();
  });

  describe('generalLimiter', () => {
    it('should create middleware with general configuration', () => {
      generalLimiter(req as Request, res as Response, next);

      expect(mockRateLimitingService.createMiddleware).toHaveBeenCalledWith('general');
      expect(mockMiddleware).toHaveBeenCalledWith(req, res, next);
    });
  });

  describe('authLimiter', () => {
    it('should create middleware with auth configuration', () => {
      authLimiter(req as Request, res as Response, next);

      expect(mockRateLimitingService.authLimiter).toHaveBeenCalled();
      expect(mockMiddleware).toHaveBeenCalledWith(req, res, next);
    });
  });

  describe('apiLimiter', () => {
    it('should create middleware with API configuration', () => {
      apiLimiter(req as Request, res as Response, next);

      expect(mockRateLimitingService.apiLimiter).toHaveBeenCalled();
      expect(mockMiddleware).toHaveBeenCalledWith(req, res, next);
    });
  });

  describe('createCompanyLimiter', () => {
    it('should create middleware with default starter plan', () => {
      const limiter = createCompanyLimiter();
      limiter(req as Request, res as Response, next);

      expect(mockRateLimitingService.companyLimiter).toHaveBeenCalledWith('starter');
    });

    it('should use custom plan retrieval function', () => {
      const getPlan = jest.fn().mockReturnValue('professional');
      const limiter = createCompanyLimiter({ getPlan });
      
      limiter(req as Request, res as Response, next);

      expect(getPlan).toHaveBeenCalledWith(req);
      expect(mockRateLimitingService.companyLimiter).toHaveBeenCalledWith('professional');
    });

    it('should handle plan retrieval errors gracefully', () => {
      const getPlan = jest.fn().mockImplementation(() => {
        throw new Error('Plan retrieval failed');
      });
      const limiter = createCompanyLimiter({ getPlan, fallbackPlan: 'enterprise' });
      
      limiter(req as Request, res as Response, next);

      expect(mockRateLimitingService.companyLimiter).toHaveBeenCalledWith('enterprise');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Error determining company plan for rate limiting',
        expect.objectContaining({
          error: 'Plan retrieval failed',
          companyId: 'company-456',
          fallback: 'enterprise'
        })
      );
    });

    it('should use fallback plan when no getPlan function provided', () => {
      const limiter = createCompanyLimiter({ fallbackPlan: 'professional' });
      limiter(req as Request, res as Response, next);

      expect(mockRateLimitingService.companyLimiter).toHaveBeenCalledWith('professional');
    });
  });

  describe('createEndpointLimiter', () => {
    it('should create limiter for login endpoint', () => {
      const limiter = createEndpointLimiter('login');
      limiter(req as Request, res as Response, next);

      expect(mockRateLimitingService.endpointLimiter).toHaveBeenCalledWith('login');
    });

    it('should create limiter for register endpoint', () => {
      const limiter = createEndpointLimiter('register');
      limiter(req as Request, res as Response, next);

      expect(mockRateLimitingService.endpointLimiter).toHaveBeenCalledWith('register');
    });

    it('should create limiter for passwordReset endpoint', () => {
      const limiter = createEndpointLimiter('passwordReset');
      limiter(req as Request, res as Response, next);

      expect(mockRateLimitingService.endpointLimiter).toHaveBeenCalledWith('passwordReset');
    });

    it('should create limiter for tokenRefresh endpoint', () => {
      const limiter = createEndpointLimiter('tokenRefresh');
      limiter(req as Request, res as Response, next);

      expect(mockRateLimitingService.endpointLimiter).toHaveBeenCalledWith('tokenRefresh');
    });
  });

  describe('specific endpoint limiters', () => {
    it('loginLimiter should use login endpoint configuration', () => {
      loginLimiter(req as Request, res as Response, next);
      expect(mockRateLimitingService.endpointLimiter).toHaveBeenCalledWith('login');
    });

    it('registerLimiter should use register endpoint configuration', () => {
      registerLimiter(req as Request, res as Response, next);
      expect(mockRateLimitingService.endpointLimiter).toHaveBeenCalledWith('register');
    });
  });

  describe('conditionalRateLimiter', () => {
    it('should apply rate limiting when condition is true', () => {
      const condition = jest.fn().mockReturnValue(true);
      const limiter = conditionalRateLimiter(condition, 'api');
      
      limiter(req as Request, res as Response, next);

      expect(condition).toHaveBeenCalledWith(req);
      expect(mockRateLimitingService.createMiddleware).toHaveBeenCalledWith('api');
      expect(mockMiddleware).toHaveBeenCalledWith(req, res, next);
    });

    it('should skip rate limiting when condition is false', () => {
      const condition = jest.fn().mockReturnValue(false);
      const limiter = conditionalRateLimiter(condition, 'api');
      
      limiter(req as Request, res as Response, next);

      expect(condition).toHaveBeenCalledWith(req);
      expect(mockRateLimitingService.createMiddleware).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    it('should use default limiter type when not specified', () => {
      const condition = jest.fn().mockReturnValue(true);
      const limiter = conditionalRateLimiter(condition);
      
      limiter(req as Request, res as Response, next);

      expect(mockRateLimitingService.createMiddleware).toHaveBeenCalledWith('general');
    });
  });

  describe('userSpecificLimiter', () => {
    it('should apply rate limiting for authenticated users', () => {
      const options = {
        windowMs: 60000,
        maxRequestsPerUser: 100,
        message: 'User limit exceeded'
      };
      const limiter = userSpecificLimiter(options);
      
      limiter(req as Request, res as Response, next);

      expect(mockRateLimitingService.createMiddleware).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 60000,
          max: 100,
          standardHeaders: true,
          legacyHeaders: false
        }),
        expect.objectContaining({
          message: 'User limit exceeded'
        })
      );
    });

    it('should skip rate limiting for non-authenticated users', () => {
      delete req.user;
      
      const options = {
        windowMs: 60000,
        maxRequestsPerUser: 100
      };
      const limiter = userSpecificLimiter(options);
      
      limiter(req as Request, res as Response, next);

      expect(mockRateLimitingService.createMiddleware).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('applyRateLimitStack', () => {
    it('should apply multiple middlewares in sequence', () => {
      const middleware1 = jest.fn().mockImplementation((req, res, next) => next());
      const middleware2 = jest.fn().mockImplementation((req, res, next) => next());
      const middleware3 = jest.fn().mockImplementation((req, res, next) => next());
      
      const stackMiddleware = applyRateLimitStack([middleware1, middleware2, middleware3]);
      
      stackMiddleware(req as Request, res as Response, next);

      expect(middleware1).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(middleware2).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(middleware3).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(next).toHaveBeenCalledWith();
    });

    it('should stop execution when middleware returns error', () => {
      const error = new Error('Rate limit exceeded');
      const middleware1 = jest.fn().mockImplementation((req, res, next) => next());
      const middleware2 = jest.fn().mockImplementation((req, res, next) => next(error));
      const middleware3 = jest.fn().mockImplementation((req, res, next) => next());
      
      const stackMiddleware = applyRateLimitStack([middleware1, middleware2, middleware3]);
      
      stackMiddleware(req as Request, res as Response, next);

      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).toHaveBeenCalled();
      expect(middleware3).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle empty stack', () => {
      const stackMiddleware = applyRateLimitStack([]);
      
      stackMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('RateLimitPresets', () => {
    it('should have predefined presets', () => {
      expect(RateLimitPresets.public).toBeDefined();
      expect(RateLimitPresets.auth).toBeDefined();
      expect(RateLimitPresets.authenticatedAPI).toBeDefined();
      expect(RateLimitPresets.admin).toBeDefined();
      expect(RateLimitPresets.fileUpload).toBeDefined();
    });

    it('should execute public preset', () => {
      RateLimitPresets.public(req as Request, res as Response, next);
      
      // Should eventually call the service
      expect(mockRateLimitingService.createMiddleware).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle middleware errors gracefully', () => {
      const error = new Error('Middleware error');
      mockMiddleware.mockImplementation((req, res, next) => next(error));

      generalLimiter(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle container resolution errors', () => {
      mockContainer.get.mockImplementation(() => {
        throw new Error('Container error');
      });

      expect(() => {
        generalLimiter(req as Request, res as Response, next);
      }).toThrow('Container error');
    });
  });

  describe('integration scenarios', () => {
    it('should work with multiple limiters applied', async () => {
      const middleware1 = generalLimiter;
      const middleware2 = apiLimiter;
      
      // Apply first middleware
      middleware1(req as Request, res as Response, () => {
        // Apply second middleware
        middleware2(req as Request, res as Response, next);
      });

      expect(mockRateLimitingService.createMiddleware).toHaveBeenCalledWith('general');
      expect(mockRateLimitingService.apiLimiter).toHaveBeenCalled();
    });

    it('should handle requests without user context', () => {
      delete req.user;

      generalLimiter(req as Request, res as Response, next);

      expect(mockRateLimitingService.createMiddleware).toHaveBeenCalledWith('general');
      expect(mockMiddleware).toHaveBeenCalledWith(req, res, next);
    });

    it('should handle requests with different IP addresses', () => {
      req.ip = '10.0.0.1';

      generalLimiter(req as Request, res as Response, next);

      expect(mockMiddleware).toHaveBeenCalledWith(
        expect.objectContaining({ ip: '10.0.0.1' }),
        res,
        next
      );
    });
  });

  describe('configuration validation', () => {
    it('should handle missing configuration gracefully', () => {
      mockRateLimitingService.createMiddleware.mockImplementation(() => {
        throw new Error('Configuration not found');
      });

      expect(() => {
        generalLimiter(req as Request, res as Response, next);
      }).toThrow('Configuration not found');
    });
  });

  describe('performance considerations', () => {
    it('should not block event loop with synchronous operations', () => {
      const start = Date.now();
      
      generalLimiter(req as Request, res as Response, next);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10); // Should be very fast for sync operations
    });
  });
});