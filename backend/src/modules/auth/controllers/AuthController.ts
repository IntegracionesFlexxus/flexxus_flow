/**
 * Authentication Controller - Sprint 2 & 3 Enhanced
 * Implementación completa de autenticación multi-empresa con refresh tokens
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */
import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { IAuthService } from '@/modules/auth/interfaces/IAuthService';
import { ISessionService } from '@/modules/auth/interfaces/ISessionService';
import { AppError } from '@shared/errors/AppError';
import { environment } from '@/config/environment';
import { 
  LoginSchema,
  RefreshTokenSchema,
  SwitchCompanySchema,
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  RegisterSchema
} from '@/modules/auth/validators/authSchemas';
// Extend Request for authenticated requests
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    companyId: string;
    role: string;
    permissions: string[];
    sessionId: string;
  };
}
@injectable()
export class AuthController {
  constructor(
    @inject(TYPES.AuthService) private authService: IAuthService,
    @inject(TYPES.SessionService) private sessionService: ISessionService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}
  /**
   * Login endpoint - Autenticación con soporte multi-empresa
   * POST /api/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const validatedData = LoginSchema.parse(req.body);
      // Extract metadata
      const metadata = {
        ipAddress: this.getClientIp(req),
        userAgent: req.headers['user-agent'] || '',
        deviceFingerprint: req.headers['x-device-fingerprint'] as string
      };
      // Perform login
      const result = await this.authService.login(validatedData, metadata);
      // Set refresh token as httpOnly cookie
      if (result.refreshToken) {
        this.setRefreshTokenCookie(res, result.refreshToken);
      }
      // Send response
      res.json({
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.first_name || '',
            lastName: result.user.last_name || '',
            avatar: result.user.avatar || null,
            role: result.user.role,
            companyId: result.user.companyId
          },
          companies: result.availableCompanies || (result.company ? [{
            id: result.company.id,
            name: result.company.name,
            plan: result.company.plan,
            role: result.company.role,
            permissions: result.company.permissions
          }] : []),
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
          sessionId: result.sessionId
        }
      });
    } catch (error) {
      this.handleAuthError(res, error);
    }
  }
  /**
   * Register endpoint - Registro de nuevo usuario
   * POST /api/auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = RegisterSchema.parse(req.body);
      const metadata = {
        ipAddress: this.getClientIp(req),
        userAgent: req.headers['user-agent'] || ''
      };
      const result = await this.authService.register(validatedData, metadata);
      if (result.refreshToken) {
        this.setRefreshTokenCookie(res, result.refreshToken);
      }
      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          company: result.company,
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
          sessionId: result.sessionId
        }
      });
    } catch (error) {
      this.handleAuthError(res, error);
    }
  }
  /**
   * Refresh token endpoint - Renovación de token de acceso
   * POST /api/auth/refresh
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken(req);
      if (!refreshToken) {
        throw new AppError('Refresh token not provided', 401);
      }
      // Optional: Allow company switching during refresh
      const companyId = req.body.companyId;
      const result = await this.authService.refreshToken({
        refreshToken,
        companyId
      });
      // Rotate refresh token for security
      this.setRefreshTokenCookie(res, result.refreshToken);
      res.json({
        success: true,
        data: {
          user: result.user,
          company: result.company,
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
          permissions: result.company?.permissions || [],
          sessionId: result.sessionId
        }
      });
    } catch (error) {
      this.handleAuthError(res, error);
    }
  }
  /**
   * Switch company endpoint - Cambio de empresa activa
   * POST /api/auth/switch-company
   */
  async switchCompany(req: AuthRequest, res: Response): Promise<void> {
    try {
      const validatedData = SwitchCompanySchema.parse(req.body);
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }
      const result = await this.authService.switchCompany(
        req.user.id,
        validatedData
      );
      // Update refresh token with new company context
      this.setRefreshTokenCookie(res, result.refreshToken);
      res.json({
        success: true,
        data: {
          user: result.user,
          company: result.company,
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
          permissions: result.company.permissions,
          sessionId: result.sessionId
        }
      });
    } catch (error) {
      this.handleAuthError(res, error);
    }
  }
  /**
   * Logout endpoint - Cerrar sesión actual
   * POST /api/auth/logout
   */
  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken(req);
      if (req.user) {
        await this.authService.logout(req.user.id, refreshToken);
      }
      // Clear cookies
      this.clearAuthCookies(res);
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  /**
   * Logout all devices endpoint - Cerrar todas las sesiones
   * POST /api/auth/logout-all
   */
  async logoutAllDevices(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }
      await this.authService.logoutAllDevices(req.user.id);
      // Clear cookies
      this.clearAuthCookies(res);
      res.json({
        success: true,
        message: 'Logged out from all devices successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  /**
   * Get user companies endpoint - Obtener empresas del usuario
   * GET /api/auth/companies
   */
  async getUserCompanies(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      console.log('🏢 [AuthController] getUserCompanies called for user:', {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role
      });

      const companies = await this.authService.getUserCompanies(req.user.id);

      console.log('🏢 [AuthController] Companies retrieved:', {
        userId: req.user.id,
        companiesCount: companies.length,
        companies: companies
      });

      res.json({
        success: true,
        data: companies
      });
    } catch (error) {
      console.error('❌ [AuthController] Error in getUserCompanies:', error);
      this.handleAuthError(res, error);
    }
  }
  /**
   * Get active sessions endpoint - Obtener sesiones activas
   * GET /api/auth/sessions
   */
  async getActiveSessions(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }
      const sessions = await this.sessionService.getUserActiveSessions(req.user.id);
      res.json({
        success: true,
        data: sessions.map(session => ({
          id: session.id,
          deviceInfo: session.deviceInfo,
          lastActivityAt: session.lastActivityAt,
          createdAt: session.createdAt,
          isActive: session.isActive,
          isCurrent: session.id === req.user.sessionId
        }))
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  /**
   * Invalidate session endpoint - Invalidar sesión específica
   * DELETE /api/auth/sessions/:sessionId
   */
  async invalidateSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }
      const { sessionId } = req.params;
      // Verify user owns the session
      const sessions = await this.sessionService.getUserActiveSessions(req.user.id);
      const session = sessions.find(s => s.id === sessionId);
      if (!session) {
        throw new AppError('Session not found', 404);
      }
      await this.sessionService.invalidateSession(sessionId);
      res.json({
        success: true,
        message: 'Session invalidated successfully'
      });
    } catch (error) {
      this.handleAuthError(res, error);
    }
  }
  /**
   * Change password endpoint - Cambiar contraseña
   * POST /api/auth/change-password
   */
  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }
      const validatedData = ChangePasswordSchema.parse(req.body);
      await this.authService.changePassword(req.user.id, validatedData);
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      this.handleAuthError(res, error);
    }
  }
  /**
   * Forgot password endpoint - Solicitar recuperación de contraseña
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = ForgotPasswordSchema.parse(req.body);
      const metadata = {
        ipAddress: this.getClientIp(req),
        userAgent: req.headers['user-agent'] || ''
      };
      await this.authService.forgotPassword(validatedData, metadata);
      // Always return success for security
      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
    } catch (error) {
      // Log error but don't expose details
      this.logger.error('Forgot password error', { error: error.message });
      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
    }
  }
  /**
   * Reset password endpoint - Resetear contraseña con token
   * POST /api/auth/reset-password
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = ResetPasswordSchema.parse(req.body);
      const metadata = {
        ipAddress: this.getClientIp(req),
        userAgent: req.headers['user-agent'] || ''
      };
      await this.authService.resetPassword(validatedData, metadata);
      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      this.handleAuthError(res, error);
    }
  }
  /**
   * Verify email endpoint - Verificar email
   * GET /api/auth/verify-email/:token
   */
  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      await this.authService.verifyEmail(token);
      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error) {
      this.handleAuthError(res, error);
    }
  }
  /**
   * Get current user endpoint - Obtener usuario actual
   * GET /api/auth/me
   */
  async getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }
      const userData = await this.authService.getCurrentUser(req.user.id);
      res.json({
        success: true,
        data: userData
      });
    } catch (error) {
      this.handleAuthError(res, error);
    }
  }
  // ========== Helper methods ==========
  /**
   * Set refresh token cookie with secure options
   */
  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: environment.isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });
  }
  /**
   * Get refresh token from cookie or header
   */
  private getRefreshToken(req: Request): string | undefined {
    return req.cookies?.refreshToken || 
           req.headers['x-refresh-token'] as string ||
           req.body?.refreshToken;
  }
  /**
   * Clear authentication cookies
   */
  private clearAuthCookies(res: Response): void {
    res.clearCookie('refreshToken', { path: '/' });
    res.clearCookie('accessToken', { path: '/' });
  }
  /**
   * Get client IP address
   */
  private getClientIp(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
           (req.headers['x-real-ip'] as string) ||
           req.socket?.remoteAddress || 
           '';
  }
  /**
   * Handle authentication errors consistently
   */
  private handleAuthError(res: Response, error: any): void {
    // Log the error
    this.logger.error('Authentication error', {
      error: error.message,
      stack: error.stack
    });
    // Determine status code
    const statusCode = error.statusCode || 
                      (error.name === 'ValidationError' ? 400 : 401);
    // Send response
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Authentication error',
      code: error.code
    });
  }
}
