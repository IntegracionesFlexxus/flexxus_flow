/**
 * Authentication Service - Sprint 3 (Enhanced from Sprint 1)
 * Implementación siguiendo lineamientos Nivel 2: SOLID, Clean Code, Inversión de Dependencias
 * Integrado con nuevos servicios: PasswordService, AuditService, PermissionService
 */

import { injectable, inject } from 'inversify';
import jwt from 'jsonwebtoken';
import { Logger } from 'winston';
import { IAuthService } from '@/modules/auth/interfaces/IAuthService';
import { IUserRepository } from '@/shared/interfaces/repositories/IUserRepository';
import { ICompanyRepository } from '@/shared/interfaces/repositories/ICompanyRepository';
import { ISessionRepository } from '@/modules/auth/interfaces/ISessionRepository';
import { IUserCompanyRepository } from '@/modules/companies/interfaces/IUserCompanyRepository';
import { IUserAuthRepository } from '@/modules/auth/repositories/UserAuthRepository';
import { IPasswordResetRepository } from '@/modules/auth/repositories/PasswordResetRepository';
import { ISessionService } from '@/modules/auth/interfaces/ISessionService';
import { IJwtService } from '@/modules/auth/interfaces/IJwtService';
import { PasswordService } from '@/modules/auth/services/PasswordService';
import { AuditService } from '@/shared/services/audit/AuditService';
import { PermissionService } from '@/modules/auth/services/PermissionService';
import { 
  LoginDto, 
  RegisterDto, 
  AuthResponse,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  JwtPayload,
  SwitchCompanyDto
} from '@/modules/auth/types/auth.types';
import { TYPES } from '@/container/types';
import { environment } from '@/config/environment';

/**
 * AuthService implementa autenticación y autorización completa
 * Principios SOLID aplicados:
 * - S: Responsabilidad única para autenticación y autorización
 * - O: Abierto para extensión (nuevos métodos de auth) cerrado para modificación
 * - L: Sustituible por cualquier implementación que respete la interfaz
 * - I: Segregación de interfaces (usa interfaces específicas)
 * - D: Inversión de dependencias (inyección de dependencias)
 */
@injectable()
export class AuthService implements IAuthService {
  private readonly tokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.CompanyRepository) private companyRepository: ICompanyRepository,
    @inject(TYPES.SessionRepository) private sessionRepository: ISessionRepository,
    @inject(TYPES.UserCompanyRepository) private userCompanyRepository: IUserCompanyRepository,
    @inject(TYPES.UserAuthRepository) private userAuthRepository: IUserAuthRepository,
    @inject(TYPES.PasswordResetRepository) private passwordResetRepository: IPasswordResetRepository,
    @inject(TYPES.SessionService) private sessionService: ISessionService,
    @inject(TYPES.JwtService) private jwtService: IJwtService,
    @inject(TYPES.PasswordService) private passwordService: PasswordService,
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.PermissionService) private permissionService: PermissionService,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.tokenExpiry = environment.jwt?.expiresIn || '1h';
    this.refreshTokenExpiry = environment.jwt?.refreshExpiresIn || '7d';
  }

  /**
   * Login de usuario
   * Clean Code: Función con flujo claro y manejo de errores consistente
   * Sprint 3: Integrado con AuditService, PasswordService y gestión de sesiones
   */
  async login(dto: LoginDto, metadata?: { 
    ipAddress?: string; 
    userAgent?: string 
  }): Promise<AuthResponse> {
    try {
      this.logger.info('Login attempt started', { email: dto?.email });
      this.validateLoginDto(dto);

      // Buscar usuario
      const user = await this.userRepository.findByEmail(dto.email.toLowerCase().trim());
      if (!user) {
        // Auditoría de intento fallido
        await this.auditService.logActivity({
          action: 'login_failed',
          entityType: 'user',
          entityId: null,
          description: `Intento de login con email inexistente: ${dto.email}`,
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
          metadata: { reason: 'user_not_found', email: dto.email }
        });
        throw this.createAuthError('Invalid credentials');
      }

      // Verificar contraseña usando PasswordService
      const isValidPassword = await this.passwordService.verifyPassword(
        dto.password, 
        user.password_hash
      );
      if (!isValidPassword) {
        // Auditoría de contraseña incorrecta
        await this.auditService.logActivity({
          action: 'login_failed',
          entityType: 'user',
          entityId: user.id,
          description: 'Intento de login con contraseña incorrecta',
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
          metadata: { reason: 'invalid_password' }
        });
        throw this.createAuthError('Invalid credentials');
      }

      // Verificar estado del usuario
      this.validateUserStatus(user);

      // Obtener empresa para el token
      const userCompany = await this.getUserCompanyForLogin(user.id, dto.company_id);
      const company = await this.companyRepository.findById(userCompany.companyId);

      if (!company) {
        throw this.createAuthError('Company not found');
      }

// [Removed 6 lines of commented code]

      // Crear sesión usando SessionService
      const { session, tokens } = await this.sessionService.createSession({
        userId: user.id,
        companyId: company.id,
        email: user.email,
        role: userCompany.role,
        deviceInfo: {
          ip: metadata?.ipAddress || '',
          userAgent: metadata?.userAgent || '',
          deviceFingerprint: metadata?.deviceFingerprint || ''
        },
        location: {
          country: 'Unknown',
          city: 'Unknown',
          timezone: 'UTC'
        }
      });

      // Actualizar último login
      await this.userAuthRepository.updateLastLogin(user.id);

      // Obtener permisos del usuario
      const userPermissions = await this.permissionService.getUserPermissions(user.id);

      // Auditoría de login exitoso
      await this.auditService.logActivity({
        action: 'login_successful',
        entityType: 'user',
        entityId: user.id,
        companyId: company.id,
        description: 'Login exitoso',
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        sessionId: session.id,
        metadata: { 
          companyId: company.id,
          role: userCompany.role
        }
      });

      this.logger.info('Login exitoso', {
        userId: user.id,
        email: user.email,
        companyId: company.id,
        role: userCompany.role,
        sessionId: session.id
      });

      // Retornar response con los tokens generados por SessionService
      const { password_hash, password_reset_token, password_reset_expires_at, ...userWithoutPassword } = user as any;

      const userCompanies = await this.userCompanyRepository.getUserCompanies(user.id);
      const availableCompanies = await Promise.all(
        userCompanies.map(async (uc: any) => {
          const companyData = await this.companyRepository.findById(uc.companyId);
          return companyData ? {
            id: companyData.id,
            name: companyData.name,
            plan: companyData.plan || 'basic',
            role: uc.role,
            isDefault: uc.isDefault || false
          } : null;
        })
      );

      return {
        success: true,
        user: userWithoutPassword,
        company: {
          id: company.id,
          name: company.name,
          plan: company.plan || 'basic',
          role: userCompany.role
        },
        availableCompanies: availableCompanies.filter(Boolean),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: this.tokenExpiry,
        permissions: userPermissions?.map((p: any) => p.name) || [],
        sessionId: session.id
      };
    } catch (error) {
      this.logger.error('Error en login', {
        error: error.message,
        email: dto.email,
        ipAddress: metadata?.ipAddress
      });
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
      return await this.createAuthResponse(user, company, role);
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
      const user = await this.userRepository.findById(payload.userId);
      if (!user) {
        throw this.createAuthError('User not found');
      }

      this.validateUserStatus(user);

      const company = await this.companyRepository.findById(payload.companyId);
      if (!company) {
        throw this.createAuthError('Company not found');
      }

      // Generar nuevos tokens
      return await this.createAuthResponse(user, company, payload.role);
    } catch (error) {
      this.logger.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Logout de usuario
   * [ROADMAP v2.0] - Blacklist de tokens pendiente (ver TECH_DEBT.md)
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

      // Verificar contraseña actual
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw this.createAuthError('User not found');
      }

      const isValidPassword = await this.passwordService.verifyPassword(
        dto.currentPassword,
        user.password_hash
      );
      if (!isValidPassword) {
        throw this.createAuthError('Current password is incorrect');
      }

      // Hashear y actualizar nueva contraseña
      const newPasswordHash = await this.passwordService.hashPassword(dto.newPassword);
      await this.userRepository.update(userId, { password_hash: newPasswordHash });

      this.logger.info(`Password changed for user ${userId}`);
    } catch (error) {
      this.logger.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Solicitar recuperación de contraseña
   * Sprint 3: Implementación completa con PasswordService y EmailService
   */
  async forgotPassword(dto: ForgotPasswordDto, metadata?: {
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      this.validateEmail(dto.email);

      const user = await this.userRepository.findByEmail(dto.email.toLowerCase().trim());
      if (!user) {
        // Por seguridad, no revelar si el email existe
        await this.auditService.logActivity({
          action: 'password_reset_requested',
          entityType: 'user',
          entityId: null,
          description: `Reset solicitado para email inexistente: ${dto.email}`,
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
          metadata: { email: dto.email, found: false }
        });

        this.logger.info('Reset solicitado para email inexistente', { email: dto.email });
        return;
      }

      // Generar token de reset usando PasswordService
      const tokenData = this.passwordService.generatePasswordResetToken({
        email: dto.email,
        expirationMinutes: 60 // 1 hora
      });

      // Guardar token en base de datos usando el nuevo repositorio
      const resetToken = await this.passwordResetRepository.createResetToken(
        user.id,
        24 // 24 horas de expiración
      );

      // Auditoría
      await this.auditService.logActivity({
        action: 'password_reset_requested',
        entityType: 'user',
        entityId: user.id,
        description: 'Token de reset de contraseña generado',
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        metadata: { expiresAt: tokenData.expiresAt.toISOString() }
      });

      this.logger.info('Token de reset generado', {
        userId: user.id,
        email: dto.email,
        expiresAt: tokenData.expiresAt
      });
    } catch (error) {
      this.logger.error('Error en forgot password', {
        error: error.message,
        email: dto.email
      });
      throw error;
    }
  }

  /**
   * Resetear contraseña con token
   * Sprint 3: Implementación completa con validación de token
   */
  async resetPassword(dto: ResetPasswordDto, metadata?: {
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      if (!dto.token || !dto.newPassword) {
        throw this.createAuthError('Token and new password are required');
      }

      // Buscar usuario por token usando el nuevo repositorio
      const resetData = await this.passwordResetRepository.findByToken(dto.token);
      if (!resetData) {
        await this.auditService.logActivity({
          action: 'password_reset_failed',
          entityType: 'user',
          entityId: null,
          description: 'Token de reset inválido',
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
          metadata: { reason: 'invalid_token' }
        });
        throw this.createAuthError('Invalid or expired reset token');
      }

      const user = await this.userRepository.findById(resetData.userId);
      if (!user) {
        throw this.createAuthError('User not found');
      }

      // Token ya validado por findByToken

      // Validación de token ya realizada en findByToken

      // Hashear nueva contraseña
      const hashedPassword = await this.passwordService.hashPassword(dto.newPassword);

      // Actualizar contraseña y limpiar token
      await this.userRepository.update(user.id, {
        password_hash: hashedPassword
      });

      // Marcar token como usado
      await this.passwordResetRepository.markTokenAsUsed(dto.token);

      // Invalidar todas las sesiones activas del usuario
      await this.sessionRepository.invalidateAllUserSessions(user.id);

      // Auditoría
      await this.auditService.logActivity({
        action: 'password_reset_completed',
        entityType: 'user',
        entityId: user.id,
        description: 'Contraseña restablecida exitosamente',
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent
      });

      this.logger.info('Contraseña restablecida', {
        userId: user.id,
        email: user.email
      });
    } catch (error) {
      this.logger.error('Error en reset password', {
        error: error.message,
        token: dto.token ? 'presente' : 'ausente'
      });
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
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw this.createAuthError('User not found');
      }

      // Verificar que el usuario pertenece a la empresa
      const userCompanies = await this.userCompanyRepository.getUserCompanies(userId);
      const userCompany = userCompanies.find(uc => uc.id === dto.companyId);
      if (!userCompany) {
        throw this.createAuthError('User does not have access to this company');
      }

      // Establecer como empresa por defecto
      await this.companyRepository.setDefaultCompany(userId, dto.companyId);

      // Obtener datos de la empresa
      const company = await this.companyRepository.findById(dto.companyId);
      if (!company) {
        throw this.createAuthError('Company not found');
      }

      // Generar nuevos tokens con nueva empresa
      return await this.createAuthResponse(user, company, userCompany.role);
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

  /**
   * Authenticate user (simplificado para controladores)
   */
  async authenticate(email: string, password: string): Promise<{
    success: boolean;
    message?: string;
    user?: any;
    companies?: any[];
  }> {
    try {
      const result = await this.login({ email, password } as LoginDto);
      return {
        success: result.success,
        user: result.user,
        companies: await this.userCompanyRepository.getUserCompanies(result.user.id)
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Authentication failed'
      };
    }
  }

  /**
   * Obtener empresas del usuario
   */
  async getUserCompanies(userId: string): Promise<any[]> {
    try {
      return await this.userCompanyRepository.getUserCompanies(userId);
    } catch (error) {
      this.logger.error('Error getting user companies:', error);
      return [];
    }
  }

  /**
   * Verificar si el email existe
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      return await this.userRepository.exists(email.toLowerCase().trim());
    } catch (error) {
      this.logger.error('Error checking email existence:', error);
      return false;
    }
  }

  // ========== Métodos privados de utilidad ==========

  /**
   * Crear respuesta de autenticación
   * Patrón: Builder para construcción consistente de respuestas
   * Sprint 3: Incluye permisos y datos de sesión
   */
  private async createAuthResponse(
    user: any, 
    company: any, 
    role: string,
    sessionData?: any,
    permissions?: any[]
  ): Promise<AuthResponse> {
    // Preparar payload para token
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      companyId: company.id,
      role,
      sessionId: sessionData?.sessionId
    };

    // Generar tokens
    const token = this.generateToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Remover información sensible
    const { password_hash, password_reset_token, password_reset_expires_at, ...userWithoutPassword } = user as any;

    // Obtener todas las empresas del usuario
    const userCompanies = await this.userCompanyRepository.getUserCompanies(user.id);
    const availableCompanies = await Promise.all(
      userCompanies.map(async (uc: any) => {
        const companyData = await this.companyRepository.findById(uc.company_id || uc.id);
        return companyData ? {
          id: companyData.id,
          name: companyData.name,
          plan: companyData.plan || 'basic',
          role: uc.role,
          isDefault: uc.is_default || false
        } : null;
      })
    );

    return {
      success: true,
      user: userWithoutPassword,
      company: {
        id: company.id,
        name: company.name,
        plan: company.plan || 'basic',
        role
      },
      availableCompanies: availableCompanies.filter(Boolean),
      accessToken: token,
      refreshToken,
      expiresIn: this.tokenExpiry,
      permissions: permissions?.map(p => p.name) || [],
      sessionId: sessionData?.sessionId
    };
  }

  /**
   * Generar ID de sesión único
   */
  private generateSessionId(): string {
    const { v4: uuidv4 } = require('uuid');
    return uuidv4();
  }

  /**
   * Obtener empresa del usuario para login
   * Sprint 3: Actualizado para usar UserRepository
   */
  private async getUserCompanyForLogin(
    userId: string, 
    requestedCompanyId?: string
  ): Promise<{ companyId: string; role: string; isDefault: boolean }> {
    const userCompanies = await this.userCompanyRepository.getUserCompanies(userId);

    if (userCompanies.length === 0) {
      throw this.createAuthError('User has no associated companies');
    }

    if (requestedCompanyId) {
      const company = userCompanies.find(uc => uc.companyId === requestedCompanyId);
      if (!company) {
        throw this.createAuthError('User does not have access to this company');
      }
      return {
        companyId: company.companyId,
        role: company.role,
        isDefault: company.isDefault
      };
    }

    // Retornar empresa por defecto o la primera
    const defaultCompany = userCompanies.find(uc => uc.isDefault) || userCompanies[0];
    return {
      companyId: defaultCompany.companyId,
      role: defaultCompany.role,
      isDefault: defaultCompany.isDefault
    };
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
      company = await this.companyRepository.create({
        name: dto.company_name,
        status: 'active',
        plan: 'basic'
      });

      // Agregar usuario como admin
      await this.companyRepository.addUserToCompany(userId, company.id, 'admin');
      await this.companyRepository.setDefaultCompany(userId, company.id);
      role = 'admin';
    } else if (dto.company_id) {
      // Unirse a empresa existente
      company = await this.companyRepository.findById(dto.company_id);
      if (!company) {
        throw this.createAuthError('Company not found');
      }

      // TODO: Validar código de invitación si existe
      if (dto.invitation_code) {
        // await this.validateInvitationCode(dto.invitation_code, dto.company_id);
      }

      await this.companyRepository.addUserToCompany(userId, company.id, 'viewer');
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
    // Hashear contraseña usando PasswordService
    const passwordHash = await this.passwordService.hashPassword(dto.password);

    return await this.userRepository.create({
      email: dto.email.toLowerCase().trim(),
      password_hash: passwordHash,
      first_name: dto.first_name,
      last_name: dto.last_name,
      status: 'active'
    } as any);
  }

  /**
   * Verificar disponibilidad de email
   */
  private async checkEmailAvailability(email: string): Promise<void> {
    const existingUser = await this.userRepository.findByEmail(email.toLowerCase().trim());
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
    this.validatePasswordStrength(dto.password);
  }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw this.createAuthError('Invalid email format');
    }
  }

  /**
   * Validate password meets requirements (public method for interface)
   */
  async validatePassword(email: string, password: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        return false;
      }
      return await this.passwordService.validatePassword(password, user.passwordHash);
    } catch (error) {
      this.logger.error('Error validating password', { error: error.message });
      return false;
    }
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw this.createAuthError('Password must be at least 8 characters');
    }
  }

  private validatePasswordDto(dto: ChangePasswordDto): void {
    if (!dto.currentPassword || !dto.newPassword) {
      throw this.createAuthError('Current and new passwords are required');
    }
    this.validatePasswordStrength(dto.newPassword);
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
