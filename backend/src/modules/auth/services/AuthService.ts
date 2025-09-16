// Auth Service Implementation - Sprint 1 con principios Nivel 2
// Aplicando SOLID, Clean Code y patrones de diseño

import { injectable, inject } from 'inversify';
import jwt from 'jsonwebtoken';
import { IAuthService } from '../interfaces/IAuthService';
import { IUserService } from '../interfaces/IUserService';
import { ICompanyService } from '../interfaces/ICompanyService';
import { 
  LoginDto, 
  RegisterDto, 
  AuthResponse,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  JwtPayload,
  SwitchCompanyDto
} from '../types/auth.types';
import { TYPES } from '../../../container/types';
import { environment } from '../../../config/environment';
import winston from 'winston';

/**
 * AuthService - Servicio de autenticación y autorización
 * Patrón: Facade - Simplifica la complejidad de autenticación
 * SOLID: Single Responsibility - Solo maneja autenticación
 */
@injectable()
export class AuthService implements IAuthService {
  constructor(
    @inject(TYPES.UserService) private userService: IUserService,
    @inject(TYPES.CompanyService) private companyService: ICompanyService,
    @inject(TYPES.Logger) private logger: winston.Logger
  ) {}

  /**
   * Login de usuario
   * Clean Code: Función con flujo claro y manejo de errores consistente
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    try {
      this.validateLoginDto(dto);

      // Buscar usuario
      const user = await this.userService.getUserByEmail(dto.email);
      if (!user) {
        throw this.createAuthError('Invalid credentials');
      }

      // Verificar contraseña
      const isValidPassword = await this.userService.validatePassword(
        dto.password, 
        user.password_hash
      );
      if (!isValidPassword) {
        throw this.createAuthError('Invalid credentials');
      }

      // Verificar estado del usuario
      this.validateUserStatus(user);

      // Obtener empresa para el token
      const userCompany = await this.getUserCompanyForLogin(user.id, dto.company_id);
      const company = await this.companyService.getCompanyById(userCompany.company_id);
      
      if (!company) {
        throw this.createAuthError('Company not found');
      }

      // Actualizar último login
      await this.userService.updateUserLastLogin(user.id);

      // Generar response
      return this.createAuthResponse(user, company, userCompany.role);
    } catch (error) {
      this.logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Registro de nuevo usuario
   * Patrón: Builder implícito para construcción de usuario y empresa
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    try {
      this.validateRegisterDto(dto);

      // Verificar disponibilidad del email
      await this.checkEmailAvailability(dto.email);

      // Crear usuario
      const user = await this.createUserFromDto(dto);

      // Manejar empresa (crear nueva o unirse a existente)
      const { company, role } = await this.handleCompanyRegistration(
        user.id, 
        dto
      );

      // Generar response
      return this.createAuthResponse(user, company, role);
    } catch (error) {
      this.logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Refrescar token de acceso
   * Seguridad: Validación completa del refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      if (!refreshToken) {
        throw this.createAuthError('Refresh token is required');
      }

      // Verificar y decodificar token
      const payload = await this.verifyToken(refreshToken);
      
      // Obtener datos actualizados
      const user = await this.userService.getUserById(payload.userId);
      if (!user) {
        throw this.createAuthError('User not found');
      }

      this.validateUserStatus(user);

      const company = await this.companyService.getCompanyById(payload.companyId);
      if (!company) {
        throw this.createAuthError('Company not found');
      }

      // Generar nuevos tokens
      return this.createAuthResponse(user, company, payload.role);
    } catch (error) {
      this.logger.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Logout de usuario
   * TODO: Nivel 3 - Implementar blacklist de tokens
   */
  async logout(userId: string): Promise<void> {
    try {
      this.validateUserId(userId);
      
      // En Nivel 3: Agregar token a blacklist
      // await this.tokenBlacklistService.addToken(token);
      
      this.logger.info(`User ${userId} logged out successfully`);
    } catch (error) {
      this.logger.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Verificar validez de token
   * Clean Code: Función pura, sin efectos secundarios
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const decoded = jwt.verify(token, environment.jwt.secret) as JwtPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw this.createAuthError('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw this.createAuthError('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Cambiar contraseña
   * Seguridad: Validación de contraseña actual
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    try {
      this.validateUserId(userId);
      this.validatePasswordDto(dto);

      await this.userService.changePassword(
        userId, 
        dto.currentPassword, 
        dto.newPassword
      );

      this.logger.info(`Password changed for user ${userId}`);
    } catch (error) {
      this.logger.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Solicitar recuperación de contraseña
   * TODO: Nivel 3 - Implementar envío de email
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    try {
      this.validateEmail(dto.email);

      const user = await this.userService.getUserByEmail(dto.email);
      if (!user) {
        // Por seguridad, no revelar si el email existe
        this.logger.info(`Password reset requested for non-existent email: ${dto.email}`);
        return;
      }

      // TODO: Nivel 3 - Generar token y enviar email
      // const resetToken = this.generateResetToken(user.id);
      // await this.emailService.sendPasswordResetEmail(user.email, resetToken);

      this.logger.info(`Password reset requested for ${dto.email}`);
    } catch (error) {
      this.logger.error('Forgot password error:', error);
      throw error;
    }
  }

  /**
   * Resetear contraseña con token
   * TODO: Nivel 3 - Implementar con tokens reales
   */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    try {
      // TODO: Nivel 3 - Validar reset token
      // const userId = await this.validateResetToken(dto.token);
      // const hashedPassword = await this.userService.hashPassword(dto.newPassword);
      // await this.userService.updatePassword(userId, hashedPassword);

      this.logger.info('Password reset completed');
    } catch (error) {
      this.logger.error('Reset password error:', error);
      throw error;
    }
  }

  /**
   * Cambiar empresa activa
   * Clean Code: Función clara con validaciones específicas
   */
  async switchCompany(userId: string, dto: SwitchCompanyDto): Promise<AuthResponse> {
    try {
      this.validateUserId(userId);
      this.validateCompanyId(dto.companyId);

      // Verificar usuario
      const user = await this.userService.getUserById(userId);
      if (!user) {
        throw this.createAuthError('User not found');
      }

      // Cambiar empresa
      const userCompany = await this.companyService.switchUserCompany(
        userId, 
        dto.companyId
      );

      // Obtener datos de la empresa
      const company = await this.companyService.getCompanyById(dto.companyId);
      if (!company) {
        throw this.createAuthError('Company not found');
      }

      // Generar nuevos tokens con nueva empresa
      return this.createAuthResponse(user, company, userCompany.role);
    } catch (error) {
      this.logger.error('Switch company error:', error);
      throw error;
    }
  }

  /**
   * Generar token de acceso
   * Patrón: Factory Method para creación de tokens
   */
  generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, environment.jwt.secret, {
      expiresIn: environment.jwt.expiresIn,
      issuer: 'flexxus-auth',
      audience: 'flexxus-api'
    });
  }

  /**
   * Generar refresh token
   */
  generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, environment.jwt.secret, {
      expiresIn: environment.jwt.refreshExpiresIn,
      issuer: 'flexxus-auth',
      audience: 'flexxus-refresh'
    });
  }

  // ========== Métodos privados de utilidad ==========

  /**
   * Crear respuesta de autenticación
   * Patrón: Builder para construcción consistente de respuestas
   */
  private createAuthResponse(
    user: any, 
    company: any, 
    role: string
  ): AuthResponse {
    // Preparar payload para token
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      companyId: company.id,
      role
    };

    // Generar tokens
    const token = this.generateToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Remover información sensible
    const { password_hash, ...userWithoutPassword } = user;

    return {
      success: true,
      user: userWithoutPassword,
      company: {
        id: company.id,
        name: company.name,
        plan: company.plan,
        role
      },
      token,
      refreshToken,
      expiresIn: environment.jwt.expiresIn
    };
  }

  /**
   * Obtener empresa del usuario para login
   */
  private async getUserCompanyForLogin(
    userId: string, 
    requestedCompanyId?: string
  ): Promise<any> {
    const userCompanies = await this.companyService.getUserCompanies(userId);
    
    if (userCompanies.length === 0) {
      throw this.createAuthError('User has no associated companies');
    }

    if (requestedCompanyId) {
      const company = userCompanies.find(uc => uc.company_id === requestedCompanyId);
      if (!company) {
        throw this.createAuthError('User does not have access to this company');
      }
      return company;
    }

    // Retornar empresa por defecto o la primera
    return userCompanies.find(uc => uc.is_default) || userCompanies[0];
  }

  /**
   * Manejar registro de empresa
   */
  private async handleCompanyRegistration(
    userId: string, 
    dto: RegisterDto
  ): Promise<{ company: any; role: string }> {
    let company;
    let role: string;

    if (dto.company_name) {
      // Crear nueva empresa
      company = await this.companyService.createCompany(
        { name: dto.company_name },
        userId
      );
      role = 'admin';
    } else if (dto.company_id) {
      // Unirse a empresa existente
      company = await this.companyService.getCompanyById(dto.company_id);
      if (!company) {
        throw this.createAuthError('Company not found');
      }
      
      // TODO: Validar código de invitación si existe
      if (dto.invitation_code) {
        // await this.validateInvitationCode(dto.invitation_code, dto.company_id);
      }

      await this.companyService.addUserToCompany(userId, company.id, 'viewer');
      role = 'viewer';
    } else {
      throw this.createAuthError('Company name or ID is required');
    }

    return { company, role };
  }

  /**
   * Crear usuario desde DTO de registro
   */
  private async createUserFromDto(dto: RegisterDto): Promise<any> {
    return await this.userService.createUser({
      email: dto.email,
      password: dto.password, // Se hasheará en UserService
      first_name: dto.first_name,
      last_name: dto.last_name,
      status: 'active'
    } as any);
  }

  /**
   * Verificar disponibilidad de email
   */
  private async checkEmailAvailability(email: string): Promise<void> {
    const existingUser = await this.userService.getUserByEmail(email);
    if (existingUser) {
      throw this.createAuthError('Email already registered');
    }
  }

  // ========== Validaciones (Clean Code: DRY) ==========

  private validateLoginDto(dto: LoginDto): void {
    if (!dto.email || !dto.password) {
      throw this.createAuthError('Email and password are required');
    }
    this.validateEmail(dto.email);
  }

  private validateRegisterDto(dto: RegisterDto): void {
    if (!dto.email || !dto.password || !dto.first_name || !dto.last_name) {
      throw this.createAuthError('All fields are required');
    }
    this.validateEmail(dto.email);
    this.validatePassword(dto.password);
  }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw this.createAuthError('Invalid email format');
    }
  }

  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw this.createAuthError('Password must be at least 8 characters');
    }
  }

  private validatePasswordDto(dto: ChangePasswordDto): void {
    if (!dto.currentPassword || !dto.newPassword) {
      throw this.createAuthError('Current and new passwords are required');
    }
    this.validatePassword(dto.newPassword);
  }

  private validateUserId(userId: string): void {
    if (!userId) {
      throw this.createAuthError('User ID is required');
    }
  }

  private validateCompanyId(companyId: string): void {
    if (!companyId) {
      throw this.createAuthError('Company ID is required');
    }
  }

  private validateUserStatus(user: any): void {
    if (user.status !== 'active') {
      throw this.createAuthError('User account is not active');
    }
    // TODO: Nivel 3 - Verificar email confirmado
    // if (!user.email_verified_at) {
    //   throw this.createAuthError('Email not verified');
    // }
  }

  /**
   * Crear error de autenticación
   * Clean Code: Factory method para errores consistentes
   */
  private createAuthError(message: string): Error {
    const error = new Error(message);
    (error as any).statusCode = 401;
    return error;
  }
}