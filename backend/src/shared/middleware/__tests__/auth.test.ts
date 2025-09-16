/**
 * Authentication Middleware Tests - Sprint 2
 * Siguiendo lineamientos nivel 2: tests críticos para middleware de seguridad
 */

import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import {
  authenticateToken,
  optionalAuthentication,
  requireRole,
  requireCompanyAccess,
  requireFeatureFlag,
  requirePermission,
  addRequestContext,
  requireApiVersion,
  createAuthChain
} from '@/shared/middleware/auth';
import { IJwtService } from '@/modules/auth/interfaces/IJwtService';
import { ISessionService } from '@/modules/auth/interfaces/ISessionService';
import { IFeatureFlagService } from '@/modules/feature-flags/interfaces/IFeatureFlagService';
import { Logger } from 'winston';

// Mock container
jest.mock('@/container/container', () => ({
  container: {
    get: jest.fn()
  }
}));

// Mock dependencies
const mockJwtService = {
  verifyAccessToken: jest.fn(),
  hashToken: jest.fn()
} as jest.Mocked<IJwtService>;

const mockSessionService = {
  validateSession: jest.fn()
} as jest.Mocked<ISessionService>;

const mockFeatureFlagService = {
  isEnabled: jest.fn()
} as jest.Mocked<IFeatureFlagService>;

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
    case 'JwtService':
      return mockJwtService;
    case 'SessionService':
      return mockSessionService;
    case 'FeatureFlagService':
      return mockFeatureFlagService;
    case 'Logger':
      return mockLogger;
    case 'SharedConnection':
      return { query: jest.fn() };
    default:
      return {};
  }
});

describe('Authentication Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;

  beforeEach(() => {
    jsonSpy = jest.fn().mockReturnThis();
    statusSpy = jest.fn().mockReturnThis();
    
    req = {
      headers: {},
      path: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn()
    };
    
    res = {
      status: statusSpy,
      json: jsonSpy,
      set: jest.fn()
    };
    
    next = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token and session', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        companyId: 'company-456',
        role: 'user',
        sessionId: 'session-789'
      };

      req.headers!.authorization = 'Bearer valid-token';
      mockJwtService.verifyAccessToken.mockResolvedValue(mockPayload);
      mockJwtService.hashToken.mockReturnValue('hashed-token');
      mockSessionService.validateSession.mockResolvedValue({
        isValid: true,
        session: { id: 'session-789', userId: 'user-123' }
      });

      await authenticateToken(req as Request, res as Response, next);

      expect(req.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        companyId: 'company-456',
        role: 'user',
        sessionId: 'session-789'
      });
      expect(next).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should reject request without token', async () => {
      await authenticateToken(req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Access token required',
        code: 'TOKEN_REQUIRED'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid session', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        companyId: 'company-456',
        role: 'user',
        sessionId: 'session-789'
      };

      req.headers!.authorization = 'Bearer invalid-token';
      mockJwtService.verifyAccessToken.mockResolvedValue(mockPayload);
      mockJwtService.hashToken.mockReturnValue('hashed-token');
      mockSessionService.validateSession.mockResolvedValue({
        isValid: false,
        reason: 'Session expired'
      });

      await authenticateToken(req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired session',
        code: 'SESSION_INVALID'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle JWT verification errors', async () => {
      req.headers!.authorization = 'Bearer expired-token';
      mockJwtService.verifyAccessToken.mockRejectedValue(new Error('Token expired'));

      await authenticateToken(req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle malformed tokens', async () => {
      req.headers!.authorization = 'Bearer malformed-token';
      mockJwtService.verifyAccessToken.mockRejectedValue(new Error('Token malformed'));

      await authenticateToken(req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Malformed token',
        code: 'TOKEN_MALFORMED'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuthentication', () => {
    it('should continue without authentication when no token provided', async () => {
      await optionalAuthentication(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('should authenticate when valid token provided', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        companyId: 'company-456',
        role: 'user',
        sessionId: 'session-789'
      };

      req.headers!.authorization = 'Bearer valid-token';
      mockJwtService.verifyAccessToken.mockResolvedValue(mockPayload);
      mockJwtService.hashToken.mockReturnValue('hashed-token');
      mockSessionService.validateSession.mockResolvedValue({
        isValid: true,
        session: { id: 'session-789', userId: 'user-123' }
      });

      await optionalAuthentication(req as Request, res as Response, next);

      expect(req.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        companyId: 'company-456',
        role: 'user',
        sessionId: 'session-789'
      });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow access for correct role', () => {
      req.user = {
        id: 'user-123',
        email: 'admin@example.com',
        companyId: 'company-456',
        role: 'admin',
        sessionId: 'session-789'
      };

      const middleware = requireRole('admin');
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should allow access for multiple allowed roles', () => {
      req.user = {
        id: 'user-123',
        email: 'user@example.com',
        companyId: 'company-456',
        role: 'user',
        sessionId: 'session-789'
      };

      const middleware = requireRole(['admin', 'user']);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should deny access for incorrect role', () => {
      req.user = {
        id: 'user-123',
        email: 'user@example.com',
        companyId: 'company-456',
        role: 'user',
        sessionId: 'session-789'
      };

      const middleware = requireRole('admin');
      middleware(req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: ['admin']
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should require authentication', () => {
      const middleware = requireRole('admin');
      middleware(req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireCompanyAccess', () => {
    it('should allow access to own company resources', () => {
      req.user = {
        id: 'user-123',
        email: 'user@example.com',
        companyId: 'company-456',
        role: 'user',
        sessionId: 'session-789'
      };
      req.params = { companyId: 'company-456' };

      const middleware = requireCompanyAccess();
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should deny access to other company resources', () => {
      req.user = {
        id: 'user-123',
        email: 'user@example.com',
        companyId: 'company-456',
        role: 'user',
        sessionId: 'session-789'
      };
      req.params = { companyId: 'company-789' };

      const middleware = requireCompanyAccess();
      middleware(req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied to this company resource',
        code: 'COMPANY_ACCESS_DENIED'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle custom company ID extractor', () => {
      req.user = {
        id: 'user-123',
        email: 'user@example.com',
        companyId: 'company-456',
        role: 'user',
        sessionId: 'session-789'
      };
      req.body = { targetCompanyId: 'company-456' };

      const middleware = requireCompanyAccess((req) => req.body.targetCompanyId);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });
  });

  describe('requireFeatureFlag', () => {
    it('should allow access when feature flag is enabled', async () => {
      req.user = {
        id: 'user-123',
        email: 'user@example.com',
        companyId: 'company-456',
        role: 'user',
        sessionId: 'session-789'
      };

      mockFeatureFlagService.isEnabled.mockResolvedValue({
        enabled: true,
        evaluationTime: 5,
        reason: 'Feature enabled'
      });

      const middleware = requireFeatureFlag('test_feature');
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should deny access when feature flag is disabled', async () => {
      req.user = {
        id: 'user-123',
        email: 'user@example.com',
        companyId: 'company-456',
        role: 'user',
        sessionId: 'session-789'
      };

      mockFeatureFlagService.isEnabled.mockResolvedValue({
        enabled: false,
        evaluationTime: 3,
        reason: 'Feature disabled'
      });

      const middleware = requireFeatureFlag('test_feature');
      await middleware(req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: "Feature 'test_feature' is not available",
        code: 'FEATURE_NOT_AVAILABLE',
        feature: 'test_feature'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should skip check for privileged roles', async () => {
      req.user = {
        id: 'user-123',
        email: 'admin@example.com',
        companyId: 'company-456',
        role: 'admin',
        sessionId: 'session-789'
      };

      const middleware = requireFeatureFlag('test_feature', {
        skipForRoles: ['admin']
      });
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(mockFeatureFlagService.isEnabled).not.toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should handle feature flag service errors gracefully', async () => {
      req.user = {
        id: 'user-123',
        email: 'user@example.com',
        companyId: 'company-456',
        role: 'user',
        sessionId: 'session-789'
      };

      mockFeatureFlagService.isEnabled.mockRejectedValue(new Error('Service error'));

      const middleware = requireFeatureFlag('test_feature');
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled(); // Fail-safe: allow on error
      expect(statusSpy).not.toHaveBeenCalled();
    });
  });

  describe('addRequestContext', () => {
    it('should add request ID and timing', () => {
      (req.get as jest.Mock).mockReturnValue('existing-request-id');

      addRequestContext(req as Request, res as Response, next);

      expect(req.requestId).toBe('existing-request-id');
      expect(req.startTime).toBeDefined();
      expect(res.set).toHaveBeenCalledWith('x-request-id', 'existing-request-id');
      expect(next).toHaveBeenCalled();
    });

    it('should generate request ID if not provided', () => {
      (req.get as jest.Mock).mockReturnValue(undefined);

      addRequestContext(req as Request, res as Response, next);

      expect(req.requestId).toMatch(/^req_\d+_[a-z0-9]{6}$/);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireApiVersion', () => {
    it('should allow supported API version', () => {
      (req.get as jest.Mock).mockReturnValue('v1');

      const middleware = requireApiVersion(['v1', 'v2']);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).apiVersion).toBe('v1');
      expect(res.set).toHaveBeenCalledWith('api-version', 'v1');
    });

    it('should use default version when none provided', () => {
      (req.get as jest.Mock).mockReturnValue(undefined);

      const middleware = requireApiVersion(['v1', 'v2'], { defaultVersion: 'v1' });
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).apiVersion).toBe('v1');
    });

    it('should reject unsupported API version', () => {
      (req.get as jest.Mock).mockReturnValue('v3');

      const middleware = requireApiVersion(['v1', 'v2']);
      middleware(req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Unsupported API version: v3',
        code: 'API_VERSION_UNSUPPORTED',
        supportedVersions: ['v1', 'v2']
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should require API version when none provided and no default', () => {
      (req.get as jest.Mock).mockReturnValue(undefined);

      const middleware = requireApiVersion(['v1', 'v2']);
      middleware(req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'API version required in api-version header',
        code: 'API_VERSION_REQUIRED',
        supportedVersions: ['v1', 'v2']
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('createAuthChain', () => {
    it('should execute middleware chain in sequence', () => {
      const middleware1 = jest.fn((req, res, next) => next());
      const middleware2 = jest.fn((req, res, next) => next());
      const middleware3 = jest.fn((req, res, next) => next());

      const chain = createAuthChain(middleware1, middleware2, middleware3);
      chain(req as Request, res as Response, next);

      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).toHaveBeenCalled();
      expect(middleware3).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should stop execution on middleware error', () => {
      const middleware1 = jest.fn((req, res, next) => next());
      const middleware2 = jest.fn((req, res, next) => next(new Error('Test error')));
      const middleware3 = jest.fn((req, res, next) => next());

      const chain = createAuthChain(middleware1, middleware2, middleware3);
      chain(req as Request, res as Response, next);

      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).toHaveBeenCalled();
      expect(middleware3).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(new Error('Test error'));
    });
  });
});