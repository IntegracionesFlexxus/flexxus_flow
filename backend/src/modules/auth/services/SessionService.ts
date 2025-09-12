/**
 * Session Service Implementation - Sprint 2
 * Siguiendo lineamientos nivel 2: lógica de negocio clara y separación de responsabilidades
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { 
  ISessionService, 
  SessionCreationData, 
  SessionValidationResult, 
  SessionRefreshResult 
} from '@/modules/auth/interfaces/ISessionService';
import { ISessionRepository, SessionData } from '@/modules/auth/interfaces/ISessionRepository';
import { IJwtService, TokenPair } from '@/modules/auth/interfaces/IJwtService';
import { IUserRepository } from '@/shared/interfaces/repositories/IUserRepository';

@injectable()
export class SessionService implements ISessionService {
  constructor(
    @inject(TYPES.SessionRepository) private sessionRepository: ISessionRepository,
    @inject(TYPES.JwtService) private jwtService: IJwtService,
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async createSession(sessionData: SessionCreationData): Promise<{
    session: SessionData;
    tokens: TokenPair;
  }> {
    try {
      // Generate unique session ID
      const sessionId = this.jwtService.generateSessionId();

      // Generate JWT token pair
      const tokens = await this.jwtService.generateTokenPair({
        userId: sessionData.userId,
        companyId: sessionData.companyId,
        email: sessionData.email,
        role: sessionData.role,
        sessionId
      });

      // Hash tokens for secure storage
      const tokenHash = this.jwtService.hashToken(tokens.accessToken);
      const refreshTokenHash = this.jwtService.hashToken(tokens.refreshToken);

      // Calculate expiration times
      const now = new Date();
      const expiresAt = new Date(now.getTime() + tokens.expiresIn * 1000);
      const refreshExpiresAt = new Date(now.getTime() + tokens.refreshExpiresIn * 1000);

      // Create session record
      const session = await this.sessionRepository.create({
        id: sessionId,
        userId: sessionData.userId,
        companyId: sessionData.companyId,
        tokenHash,
        refreshTokenHash,
        deviceInfo: this.sanitizeDeviceInfo(sessionData.deviceInfo),
        ipAddress: sessionData.deviceInfo.ip,
        userAgent: sessionData.deviceInfo.userAgent,
        deviceFingerprint: sessionData.deviceInfo.deviceFingerprint,
        country: sessionData.location?.country,
        city: sessionData.location?.city,
        timezone: sessionData.location?.timezone,
        active: true,
        lastActivityAt: now,
        expiresAt,
        refreshExpiresAt
      });

      this.logger.info('Session created successfully', {
        userId: sessionData.userId,
        companyId: sessionData.companyId,
        sessionId,
        ip: sessionData.deviceInfo.ip,
        userAgent: sessionData.deviceInfo.userAgent?.substring(0, 100)
      });

      return { session, tokens };

    } catch (error) {
      this.logger.error('Session creation failed', {
        error: error.message,
        userId: sessionData.userId,
        companyId: sessionData.companyId,
        ip: sessionData.deviceInfo.ip
      });
      throw new Error('Failed to create session');
    }
  }

  async validateSession(tokenHash: string): Promise<SessionValidationResult> {
    try {
      const session = await this.sessionRepository.findByTokenHash(tokenHash);

      if (!session) {
        return {
          isValid: false,
          reason: 'Session not found'
        };
      }

      // Check if session is active
      if (!session.active) {
        return {
          isValid: false,
          reason: 'Session is inactive'
        };
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        await this.sessionRepository.invalidate(session.id);
        return {
          isValid: false,
          reason: 'Session has expired'
        };
      }

      // Check for forced logout
      if (session.forceLogout) {
        await this.sessionRepository.invalidate(session.id);
        return {
          isValid: false,
          reason: 'Session was force logged out'
        };
      }

      // Update last activity
      await this.sessionRepository.updateLastActivity(session.id);

      this.logger.debug('Session validated successfully', {
        sessionId: session.id,
        userId: session.userId,
        lastActivity: session.lastActivityAt
      });

      return {
        isValid: true,
        session
      };

    } catch (error) {
      this.logger.error('Session validation failed', {
        error: error.message,
        tokenHashLength: tokenHash.length
      });

      return {
        isValid: false,
        reason: 'Session validation error'
      };
    }
  }

  async refreshSession(refreshTokenHash: string): Promise<SessionRefreshResult> {
    try {
      const session = await this.sessionRepository.findByRefreshTokenHash(refreshTokenHash);

      if (!session) {
        return {
          success: false,
          reason: 'Refresh session not found'
        };
      }

      // Check if session is active and not expired
      if (!session.active || session.refreshExpiresAt < new Date()) {
        await this.sessionRepository.invalidate(session.id);
        return {
          success: false,
          reason: 'Refresh token expired or session inactive'
        };
      }

      // Get fresh user data for new tokens
      const user = await this.getUserWithRole(session.userId, session.companyId);
      if (!user) {
        return {
          success: false,
          reason: 'User or company not found'
        };
      }

      // Generate new token pair
      const tokens = await this.jwtService.generateTokenPair({
        userId: session.userId,
        companyId: session.companyId,
        email: user.email,
        role: user.role,
        sessionId: session.id
      });

      // Update session with new token hashes
      const newTokenHash = this.jwtService.hashToken(tokens.accessToken);
      const newRefreshTokenHash = this.jwtService.hashToken(tokens.refreshToken);

      await this.sessionRepository.updateTokens(session.id, newTokenHash, newRefreshTokenHash);

      this.logger.info('Session refreshed successfully', {
        sessionId: session.id,
        userId: session.userId,
        companyId: session.companyId
      });

      return {
        success: true,
        tokens
      };

    } catch (error) {
      this.logger.error('Session refresh failed', {
        error: error.message,
        refreshTokenHashLength: refreshTokenHash.length
      });

      return {
        success: false,
        reason: 'Session refresh error'
      };
    }
  }

  async invalidateSession(sessionId: string): Promise<void> {
    try {
      await this.sessionRepository.invalidate(sessionId);

      this.logger.info('Session invalidated', {
        sessionId
      });

    } catch (error) {
      this.logger.error('Session invalidation failed', {
        error: error.message,
        sessionId
      });
      throw new Error('Failed to invalidate session');
    }
  }

  async invalidateUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
    try {
      const count = await this.sessionRepository.invalidateUserSessions(userId, exceptSessionId);

      this.logger.info('User sessions invalidated', {
        userId,
        count,
        exceptSessionId
      });

      return count;

    } catch (error) {
      this.logger.error('User sessions invalidation failed', {
        error: error.message,
        userId,
        exceptSessionId
      });
      throw new Error('Failed to invalidate user sessions');
    }
  }

  async markSessionSuspicious(sessionId: string, reason: string): Promise<void> {
    try {
      await this.sessionRepository.markSuspicious(sessionId, reason);

      this.logger.warn('Session marked as suspicious', {
        sessionId,
        reason
      });

    } catch (error) {
      this.logger.error('Failed to mark session suspicious', {
        error: error.message,
        sessionId,
        reason
      });
      throw new Error('Failed to mark session suspicious');
    }
  }

  async forceLogoutSession(sessionId: string, reason: string): Promise<void> {
    try {
      await this.sessionRepository.forceLogout(sessionId, reason);

      this.logger.warn('Session force logged out', {
        sessionId,
        reason
      });

    } catch (error) {
      this.logger.error('Failed to force logout session', {
        error: error.message,
        sessionId,
        reason
      });
      throw new Error('Failed to force logout session');
    }
  }

  async getActiveUserSessions(userId: string): Promise<SessionData[]> {
    try {
      const sessions = await this.sessionRepository.getActiveUserSessions(userId);

      // Remove sensitive data before returning
      return sessions.map(session => ({
        ...session,
        tokenHash: '[HIDDEN]',
        refreshTokenHash: '[HIDDEN]'
      }));

    } catch (error) {
      this.logger.error('Failed to get user sessions', {
        error: error.message,
        userId
      });
      throw new Error('Failed to get user sessions');
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    try {
      const count = await this.sessionRepository.cleanupExpired();

      this.logger.info('Expired sessions cleaned up', {
        count
      });

      return count;

    } catch (error) {
      this.logger.error('Session cleanup failed', {
        error: error.message
      });
      return 0;
    }
  }

  async isSessionActive(sessionId: string): Promise<boolean> {
    try {
      const session = await this.sessionRepository.findById(sessionId);

      return !!(
        session &&
        session.active &&
        session.expiresAt > new Date() &&
        !session.forceLogout
      );

    } catch (error) {
      this.logger.error('Session activity check failed', {
        error: error.message,
        sessionId
      });
      return false;
    }
  }

  async getSessionInfo(sessionId: string): Promise<SessionData | null> {
    try {
      const session = await this.sessionRepository.findById(sessionId);

      if (session) {
        // Remove sensitive information
        return {
          ...session,
          tokenHash: '[HIDDEN]',
          refreshTokenHash: '[HIDDEN]'
        };
      }

      return null;

    } catch (error) {
      this.logger.error('Failed to get session info', {
        error: error.message,
        sessionId
      });
      return null;
    }
  }

  async updateSessionMetadata(sessionId: string, metadata: {
    deviceInfo?: Record<string, any>;
    location?: { country?: string; city?: string; timezone?: string };
  }): Promise<void> {
    try {
      // This would require additional repository method
      // For now, we'll log the update request
      this.logger.info('Session metadata update requested', {
        sessionId,
        hasDeviceInfo: !!metadata.deviceInfo,
        hasLocation: !!metadata.location
      });

      // TODO: Implement repository method for metadata updates
      throw new Error('Session metadata update not yet implemented');

    } catch (error) {
      this.logger.error('Session metadata update failed', {
        error: error.message,
        sessionId
      });
      throw new Error('Failed to update session metadata');
    }
  }

  /**
   * Private helper to get user with role information
   */
  private async getUserWithRole(userId: string, companyId: string): Promise<{
    email: string;
    role: string;
  } | null> {
    try {
      // This would typically fetch from user repository with company context
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return null;
      }

      // Get user role in the specific company
      const userCompany = await this.userRepository.findUserCompanyRole(userId, companyId);
      if (!userCompany) {
        return null;
      }

      return {
        email: user.email,
        role: userCompany.role
      };

    } catch (error) {
      this.logger.error('Failed to get user with role', {
        error: error.message,
        userId,
        companyId
      });
      return null;
    }
  }

  /**
   * Private helper to sanitize device info for security
   */
  private sanitizeDeviceInfo(deviceInfo: any): Record<string, any> {
    const sanitized = { ...deviceInfo };

    // Remove potentially sensitive fields
    delete sanitized.ip; // IP is stored separately
    delete sanitized.internalNetworkInfo;
    delete sanitized.systemInfo;

    // Limit user agent length
    if (sanitized.userAgent && sanitized.userAgent.length > 500) {
      sanitized.userAgent = sanitized.userAgent.substring(0, 500) + '...';
    }

    return sanitized;
  }
}
