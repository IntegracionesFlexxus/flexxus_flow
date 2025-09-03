// Auth Controller - Sprint 1 con principios Nivel 2
// Aplicando SOLID: Single Responsibility, Dependency Inversion

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { IAuthService } from '../interfaces/IAuthService';
import { IUserService } from '../interfaces/IUserService';
import { ICompanyService } from '../interfaces/ICompanyService';
import { TYPES } from '../../../container/types';
import winston from 'winston';
import { 
  LoginDto, 
  RegisterDto, 
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SwitchCompanyDto
} from '../types/auth.types';

/**
 * AuthController - Controlador REST para autenticación
 * SOLID: Single Responsibility - Solo maneja requests/responses HTTP
 * Clean Code: Métodos pequeños y enfocados
 */
@injectable()
export class AuthController {
  constructor(
    @inject(TYPES.AuthService) private authService: IAuthService,
    @inject(TYPES.UserService) private userService: IUserService,
    @inject(TYPES.CompanyService) private companyService: ICompanyService,
    @inject(TYPES.Logger) private logger: winston.Logger
  ) {}

  /**
   * POST /auth/login
   * Clean Code: Manejo consistente de respuestas
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: LoginDto = req.body;
      const result = await this.authService.login(dto);
      
      this.sendAuthResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/register
   * Patrón: Command pattern implícito con DTOs
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: RegisterDto = req.body;
      const result = await this.authService.register(dto);
      
      this.sendAuthResponse(res, 201, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/refresh
   * Seguridad: Refresh token desde cookie o header
   */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = this.extractRefreshToken(req);
      
      if (!refreshToken) {
        return this.sendErrorResponse(res, 401, 'Refresh token is required');
      }
      
      const result = await this.authService.refreshToken(refreshToken);
      this.sendAuthResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/logout
   * Clean Code: Función simple y directa
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId; // Viene del middleware de auth
      await this.authService.logout(userId);
      
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /auth/me
   * Obtener información del usuario autenticado
   */
  async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const companyId = (req as any).companyId;
      
      const user = await this.userService.getUserById(userId);
      if (!user) {
        return this.sendErrorResponse(res, 404, 'User not found');
      }
      
      const company = await this.companyService.getCompanyById(companyId);
      const userCompanies = await this.companyService.getUserCompanies(userId);
      
      // Remover información sensible
      const { password_hash, ...userWithoutPassword } = user;
      
      res.status(200).json({
        success: true,
        data: {
          user: userWithoutPassword,
          currentCompany: company,
          companies: userCompanies
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /auth/change-password
   * Seguridad: Requiere autenticación
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const dto: ChangePasswordDto = req.body;
      
      await this.authService.changePassword(userId, dto);
      
      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/forgot-password
   * Seguridad: No revelar si el email existe
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: ForgotPasswordDto = req.body;
      await this.authService.forgotPassword(dto);
      
      // Siempre devolver éxito por seguridad
      res.status(200).json({
        success: true,
        message: 'If the email exists, a reset link has been sent'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/reset-password
   * Resetear contraseña con token
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: ResetPasswordDto = req.body;
      await this.authService.resetPassword(dto);
      
      res.status(200).json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/switch-company
   * Cambiar empresa activa del usuario
   */
  async switchCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const dto: SwitchCompanyDto = req.body;
      
      const result = await this.authService.switchCompany(userId, dto);
      this.sendAuthResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /auth/companies
   * Obtener empresas del usuario autenticado
   */
  async getUserCompanies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const companies = await this.companyService.getUserCompanies(userId);
      
      res.status(200).json({
        success: true,
        data: companies
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/verify-token
   * Verificar validez de un token
   */
  async verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        return this.sendErrorResponse(res, 401, 'Token is required');
      }
      
      const payload = await this.authService.verifyToken(token);
      
      res.status(200).json({
        success: true,
        valid: true,
        payload
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        valid: false,
        message: 'Invalid or expired token'
      });
    }
  }

  // ========== Métodos privados de utilidad ==========

  /**
   * Enviar respuesta de autenticación
   * Clean Code: DRY para respuestas consistentes
   */
  private sendAuthResponse(res: Response, statusCode: number, data: any): void {
    // Configurar cookies seguras en producción
    if (process.env.NODE_ENV === 'production') {
      res.cookie('refreshToken', data.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
      });
    }

    res.status(statusCode).json({
      success: true,
      data: {
        user: data.user,
        company: data.company,
        token: data.token,
        expiresIn: data.expiresIn
      }
    });
  }

  /**
   * Enviar respuesta de error
   */
  private sendErrorResponse(res: Response, statusCode: number, message: string): void {
    res.status(statusCode).json({
      success: false,
      error: {
        message,
        statusCode
      }
    });
  }

  /**
   * Extraer token del header Authorization
   */
  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    return null;
  }

  /**
   * Extraer refresh token de cookie o body
   */
  private extractRefreshToken(req: Request): string | null {
    // Primero intentar desde cookie
    if (req.cookies && req.cookies.refreshToken) {
      return req.cookies.refreshToken;
    }
    
    // Luego desde body
    if (req.body && req.body.refreshToken) {
      return req.body.refreshToken;
    }
    
    // Finalmente desde header
    const authHeader = req.headers['x-refresh-token'] as string;
    if (authHeader) {
      return authHeader;
    }
    
    return null;
  }
}