/**
 * AuthController Tests - Sprint 2
 * Siguiendo lineamientos nivel 2: tests críticos para controllers API
 */

import 'reflect-metadata';
import { Request, Response } from 'express';
import { AuthController } from '@/modules/auth/controllers/AuthController';
import { IAuthService } from '@/modules/auth/interfaces/IAuthService';
import { ISessionService } from '@/modules/auth/interfaces/ISessionService';
import { IJwtService } from '@/modules/auth/interfaces/IJwtService';
import { Logger } from 'winston';

// Mock dependencies
const mockAuthService = {
  authenticate: jest.fn(),
  register: jest.fn(),
  emailExists: jest.fn(),
  getUserCompanies: jest.fn(),
  changePassword: jest.fn(),
  switchCompany: jest.fn()
} as jest.Mocked<IAuthService>;

const mockSessionService = {
  createSession: jest.fn(),
  refreshSession: jest.fn(),
  invalidateSession: jest.fn()
} as jest.Mocked<ISessionService>;

const mockJwtService = {
  hashToken: jest.fn()
} as jest.Mocked<IJwtService>;

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
} as unknown as Logger;

describe('AuthController', () => {
  let authController: AuthController;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;

  beforeEach(() => {
    authController = new AuthController(
      mockAuthService,
      mockSessionService,
      mockJwtService,
      mockLogger
    );

    jsonSpy = jest.fn().mockReturnThis();
    statusSpy = jest.fn().mockReturnThis();

    req = {
      body: {},
      params: {},
      query: {},
      get: jest.fn(),
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' }
    };

    res = {
      status: statusSpy,
      json: jsonSpy
    };

    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with single company', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const authResult = {
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          avatar: null
        },
        companies: [{
          id: 'company-456',
          name: 'Test Company',
          plan: 'professional',
          role: 'admin',
          features: ['feature1', 'feature2']
        }]
      };

      const sessionResult = {
        session: {
          id: 'session-789',
          expiresAt: new Date()
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 900
        }
      };

      req.body = loginData;
      mockAuthService.authenticate.mockResolvedValue(authResult);
      mockSessionService.createSession.mockResolvedValue(sessionResult);

      await authController.login(req as Request, res as Response);

      expect(mockAuthService.authenticate).toHaveBeenCalledWith(
        loginData.email,
        loginData.password
      );
      expect(mockSessionService.createSession).toHaveBeenCalledWith(
        authResult.user.id,
        authResult.companies![0].id,
        authResult.user.email,
        authResult.companies![0].role,
        expect.objectContaining({
          userAgent: expect.any(String),
          ip: expect.any(String)
        })
      );
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: {
          user: authResult.user,
          company: authResult.companies![0],
          tokens: sessionResult.tokens,
          session: {
            id: sessionResult.session.id,
            expiresAt: sessionResult.session.expiresAt
          }
        }
      });
    });

    it('should require company selection with multiple companies', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const authResult = {
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User'
        },
        companies: [
          {
            id: 'company-1',
            name: 'Company 1',
            plan: 'starter',
            role: 'admin',
            features: []
          },
          {
            id: 'company-2',
            name: 'Company 2',
            plan: 'professional',
            role: 'user',
            features: []
          }
        ]
      };

      req.body = loginData;
      mockAuthService.authenticate.mockResolvedValue(authResult);

      await authController.login(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        requiresCompanySelection: true,
        user: {
          id: authResult.user.id,
          email: authResult.user.email,
          firstName: authResult.user.firstName,
          lastName: authResult.user.lastName
        },
        companies: [
          {
            id: 'company-1',
            name: 'Company 1',
            plan: 'starter'
          },
          {
            id: 'company-2',
            name: 'Company 2',
            plan: 'professional'
          }
        ]
      });
    });

    it('should handle invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const authResult = {
        success: false,
        message: 'Invalid credentials'
      };

      req.body = loginData;
      mockAuthService.authenticate.mockResolvedValue(authResult);

      await authController.login(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials'
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Login attempt failed',
        expect.objectContaining({
          email: loginData.email,
          reason: 'Invalid credentials'
        })
      );
    });

    it('should handle validation errors', async () => {
      req.body = {
        email: 'invalid-email',
        password: '123' // Too short
      };

      // Mock class-validator to return validation errors
      const mockValidate = jest.fn().mockResolvedValue([
        {
          property: 'email',
          constraints: { isEmail: 'Invalid email format' }
        },
        {
          property: 'password',
          constraints: { minLength: 'Password must be between 6 and 128 characters' }
        }
      ]);

      // Replace the validate function in the controller
      jest.doMock('class-validator', () => ({
        validate: mockValidate,
        plainToInstance: jest.fn().mockReturnValue(req.body)
      }));

      await authController.login(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.stringContaining('Invalid email format'),
          expect.stringContaining('Password must be between 6 and 128 characters')
        ])
      });
    });

    it('should handle authentication service errors', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockAuthService.authenticate.mockRejectedValue(new Error('Database connection failed'));

      await authController.login(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Login error',
        expect.objectContaining({
          error: 'Database connection failed'
        })
      );
    });
  });

  describe('register', () => {
    it('should register user successfully', async () => {
      const registerData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        companyName: 'New Company'
      };

      const registerResult = {
        success: true,
        user: {
          id: 'user-456',
          email: registerData.email,
          firstName: registerData.firstName,
          lastName: registerData.lastName
        },
        company: {
          id: 'company-789',
          name: registerData.companyName,
          plan: 'starter'
        }
      };

      req.body = registerData;
      mockAuthService.emailExists.mockResolvedValue(false);
      mockAuthService.register.mockResolvedValue(registerResult);

      await authController.register(req as Request, res as Response);

      expect(mockAuthService.emailExists).toHaveBeenCalledWith(registerData.email);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerData);
      expect(statusSpy).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Registration successful',
        data: {
          user: registerResult.user,
          company: registerResult.company
        }
      });
    });

    it('should reject registration with existing email', async () => {
      const registerData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        companyName: 'Test Company'
      };

      req.body = registerData;
      mockAuthService.emailExists.mockResolvedValue(true);

      await authController.register(req as Request, res as Response);

      expect(mockAuthService.emailExists).toHaveBeenCalledWith(registerData.email);
      expect(mockAuthService.register).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Email already exists'
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshTokenData = {
        refreshToken: 'valid-refresh-token'
      };

      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900
      };

      req.body = refreshTokenData;
      mockJwtService.hashToken.mockReturnValue('hashed-token');
      mockSessionService.refreshSession.mockResolvedValue(newTokens);

      await authController.refreshToken(req as Request, res as Response);

      expect(mockJwtService.hashToken).toHaveBeenCalledWith(refreshTokenData.refreshToken);
      expect(mockSessionService.refreshSession).toHaveBeenCalledWith('hashed-token');
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Token refreshed successfully',
        data: newTokens
      });
    });

    it('should reject invalid refresh token', async () => {
      const refreshTokenData = {
        refreshToken: 'invalid-refresh-token'
      };

      req.body = refreshTokenData;
      mockJwtService.hashToken.mockReturnValue('hashed-invalid-token');
      mockSessionService.refreshSession.mockResolvedValue(null);

      await authController.refreshToken(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      req.user = {
        id: 'user-123',
        email: 'test@example.com',
        companyId: 'company-456',
        role: 'user',
        sessionId: 'session-789'
      };

      mockSessionService.invalidateSession.mockResolvedValue(undefined);

      await authController.logout(req as Request, res as Response);

      expect(mockSessionService.invalidateSession).toHaveBeenCalledWith('session-789');
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful'
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'User logged out successfully',
        expect.objectContaining({
          userId: 'user-123',
          sessionId: 'session-789'
        })
      );
    });

    it('should require authentication for logout', async () => {
      // req.user is undefined (not authenticated)

      await authController.logout(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
      expect(mockSessionService.invalidateSession).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      req.user = {
        id: 'user-123',
        email: 'test@example.com',
        companyId: 'company-456',
        role: 'user',
        sessionId: 'session-789'
      };

      const companies = [
        {
          id: 'company-456',
          name: 'Current Company',
          plan: 'professional',
          role: 'admin',
          features: ['feature1', 'feature2']
        },
        {
          id: 'company-789',
          name: 'Other Company',
          plan: 'starter',
          role: 'user',
          features: ['feature1']
        }
      ];

      mockAuthService.getUserCompanies.mockResolvedValue(companies);

      await authController.getProfile(req as Request, res as Response);

      expect(mockAuthService.getUserCompanies).toHaveBeenCalledWith('user-123');
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'user'
          },
          currentCompany: {
            id: 'company-456'
          },
          companies: companies.map(c => ({
            id: c.id,
            name: c.name,
            plan: c.plan,
            role: c.role,
            features: c.features
          }))
        }
      });
    });

    it('should require authentication for profile', async () => {
      await authController.getProfile(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
    });
  });

  describe('switchCompany', () => {
    it('should switch company successfully', async () => {
      req.user = {
        id: 'user-123',
        email: 'test@example.com',
        companyId: 'company-456',
        role: 'admin',
        sessionId: 'session-789'
      };

      req.body = {
        companyId: 'company-789'
      };

      const switchResult = {
        user: req.user,
        company: {
          id: 'company-789',
          name: 'New Company'
        },
        tokens: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        }
      };

      mockAuthService.switchCompany.mockResolvedValue(switchResult);

      await authController.switchCompany(req as Request, res as Response);

      expect(mockAuthService.switchCompany).toHaveBeenCalledWith(
        'user-123',
        { companyId: 'company-789' }
      );
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Company switched successfully',
        data: switchResult
      });
    });

    it('should handle access denied to company', async () => {
      req.user = {
        id: 'user-123',
        email: 'test@example.com',
        companyId: 'company-456',
        role: 'user',
        sessionId: 'session-789'
      };

      req.body = {
        companyId: 'company-999'
      };

      mockAuthService.switchCompany.mockRejectedValue(new Error('Company not found'));

      await authController.switchCompany(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied to company'
      });
    });
  });
});