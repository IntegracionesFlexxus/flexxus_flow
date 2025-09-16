/**
 * Authentication Service
 * Servicio especializado para autenticación (login/logout/refresh)
 * Refactorización para cumplir con Single Responsibility Principle
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { IUserRepository } from '@/shared/interfaces/repositories/IUserRepository';
import { ISessionService } from '@/modules/auth/interfaces/ISessionService';
import { IJwtService } from '@/modules/auth/interfaces/IJwtService';
import { PasswordService } from './PasswordService';
import { AuditService } from '@/shared/services/audit/AuditService';
import { AppError } from '@/shared/errors/AppError';
import { LoginCredentials, AuthResponse } from '@/modules/auth/types/auth.types';

@injectable()
export class AuthenticationService {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.SessionService) private sessionService: ISessionService,
    @inject(TYPES.JwtService) private jwtService: IJwtService,
    @inject(TYPES.PasswordService) private passwordService: PasswordService,
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Authenticate user with credentials
   */
  async login(credentials: LoginCredentials, deviceInfo?: any): Promise<AuthResponse> {
    const { email, password, companyId } = credentials;

    try {
      // Validate user credentials
      const user = await this.validateCredentials(email, password);
      
      // Verify user belongs to company if companyId provided
      if (companyId) {
        const userCompany = await this.userRepository.findUserCompanyRole(user.id, companyId);
        if (!userCompany || !userCompany.isActive) {
          throw new AppError('User not authorized for this company', 403);
        }
      }

      // Get user's company and role
      const userCompanyData = companyId 
        ? await this.userRepository.findUserCompanyRole(user.id, companyId)
        : await this.getUserPrimaryCompany(user.id);

      if (!userCompanyData) {
        throw new AppError('User has no associated company', 403);
      }

      // Create session
      const { session, tokens } = await this.sessionService.createSession({
        userId: user.id,
        companyId: userCompanyData.companyId,
        email: user.email,
        role: userCompanyData.role,
        permissions: userCompanyData.permissions || [],
        deviceInfo: deviceInfo || {},
        location: await this.getLocationFromIP(deviceInfo?.ip)
      });

      // Audit login
      await this.auditService.log({
        action: 'auth.login',
        userId: user.id,
        companyId: userCompanyData.companyId,
        metadata: {
          sessionId: session.id,
          ip: deviceInfo?.ip,
          userAgent: deviceInfo?.userAgent
        }
      });

      this.logger.info('User logged in successfully', {
        userId: user.id,
        companyId: userCompanyData.companyId,
        sessionId: session.id
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: userCompanyData.role,
          permissions: userCompanyData.permissions || []
        },
        company: userCompanyData.company,
        tokens,
        sessionId: session.id
      };

    } catch (error) {
      // Audit failed login
      await this.auditService.log({
        action: 'auth.login.failed',
        metadata: {
          email,
          reason: error.message,
          ip: deviceInfo?.ip
        }
      });

      this.logger.error('Login failed', {
        email,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Logout user session
   */
  async logout(sessionId: string, userId?: string): Promise<void> {
    try {
      await this.sessionService.invalidateSession(sessionId);

      // Audit logout
      await this.auditService.log({
        action: 'auth.logout',
        userId,
        metadata: { sessionId }
      });

      this.logger.info('User logged out', {
        sessionId,
        userId
      });

    } catch (error) {
      this.logger.error('Logout failed', {
        sessionId,
        error: error.message
      });
      throw new AppError('Logout failed', 500);
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshTokens(refreshToken: string): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyRefreshToken(refreshToken);
      
      // Refresh session
      const refreshTokenHash = this.jwtService.hashToken(refreshToken);
      const result = await this.sessionService.refreshSession(refreshTokenHash);

      if (!result.success) {
        throw new AppError(result.reason || 'Token refresh failed', 401);
      }

      // Get updated user data
      const user = await this.userRepository.findById(payload.userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const userCompany = await this.userRepository.findUserCompanyRole(
        payload.userId, 
        payload.companyId
      );

      // Audit token refresh
      await this.auditService.log({
        action: 'auth.token.refresh',
        userId: payload.userId,
        companyId: payload.companyId,
        metadata: { sessionId: payload.sessionId }
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: userCompany?.role || '',
          permissions: userCompany?.permissions || []
        },
        company: userCompany?.company,
        tokens: result.tokens!,
        sessionId: payload.sessionId
      };

    } catch (error) {
      this.logger.error('Token refresh failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Logout all user sessions except current
   */
  async logoutAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
    try {
      const count = await this.sessionService.invalidateUserSessions(userId, exceptSessionId);

      await this.auditService.log({
        action: 'auth.logout.all',
        userId,
        metadata: { 
          sessionsInvalidated: count,
          exceptSessionId 
        }
      });

      this.logger.info('All user sessions invalidated', {
        userId,
        count,
        exceptSessionId
      });

      return count;

    } catch (error) {
      this.logger.error('Failed to logout all sessions', {
        userId,
        error: error.message
      });
      throw new AppError('Failed to logout all sessions', 500);
    }
  }

  /**
   * Validate user credentials
   */
  private async validateCredentials(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findByEmail(email);
    
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is inactive', 403);
    }

    const isValidPassword = await this.passwordService.verify(password, user.passwordHash);
    
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    return user;
  }

  /**
   * Get user's primary company
   */
  private async getUserPrimaryCompany(userId: string): Promise<any> {
    const userCompanies = await this.userRepository.findUserCompanies(userId);
    
    if (!userCompanies || userCompanies.length === 0) {
      return null;
    }

    // Return first active company or just first
    return userCompanies.find(uc => uc.isActive) || userCompanies[0];
  }

  /**
   * Get location from IP (stub - would use geo service)
   */
  private async getLocationFromIP(ip?: string): Promise<any> {
    // TODO: Implement actual geo-location service
    return {
      country: 'Unknown',
      city: 'Unknown',
      timezone: 'UTC'
    };
  }
}