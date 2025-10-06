/**
 * JWT Service - Sprint 2 Enhanced
 * Implementación completa de JWT con refresh tokens
 * Siguiendo principios SOLID del Nivel 2
 */
import { injectable, inject, optional } from 'inversify';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'winston';
import { IJwtService } from '@/modules/auth/interfaces/IJwtService';
import { environment } from '@/config/environment';
import { AppError, ErrorCode } from '@shared/errors/AppError';
import { TYPES } from '@/container/types';
export interface JwtPayload {
  sessionId: string;
  userId: string;
  companyId: string;
  email: string;
  role: string;
  permissions: string[];
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
  jti?: string;
}
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}
/**
 * JwtService - Gestión de tokens JWT
 * Implementa principio de responsabilidad única (S de SOLID)
 */
@injectable()
export class JwtService implements IJwtService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly issuer: string;
  private readonly audience: string;
  private logger?: Logger;
  constructor(@inject(TYPES.Logger) @optional() logger?: Logger) {
    this.logger = logger;
    // Configuración desde environment
    this.accessTokenSecret = environment.jwt?.secret || 'default-secret-change-me';
    this.refreshTokenSecret = environment.jwt?.refreshSecret || this.accessTokenSecret;
    this.accessTokenExpiry = environment.jwt?.expiresIn || '15m';
    this.refreshTokenExpiry = environment.jwt?.refreshExpiresIn || '7d';
    this.issuer = environment.jwt?.issuer || 'flexxus-auth';
    this.audience = environment.jwt?.audience || 'flexxus-api';
    // Validar configuración en producción
    if (environment.isProduction && this.accessTokenSecret === 'default-secret-change-me') {
      throw new Error('JWT secret must be configured in production');
    }
  }
  /**
   * Generate access token
   * Clean Code: Función específica con responsabilidad única
   */
  async generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp' | 'iss' | 'aud' | 'jti'>): Promise<string> {
    try {
      const tokenPayload: JwtPayload = {
        ...payload,
        jti: this.generateTokenId() // JWT ID único para tracking
      };
      const token = jwt.sign(tokenPayload, this.accessTokenSecret, {
        expiresIn: this.accessTokenExpiry,
        issuer: this.issuer,
        audience: this.audience,
        algorithm: 'HS256'
      });
      this.logger?.debug('Access token generated', { 
        userId: payload.userId, 
        sessionId: payload.sessionId 
      });
      return token;
    } catch (error) {
      this.logger?.error('Failed to generate access token', { error: error.message });
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to generate access token', 500);
    }
  }
  /**
   * Generate refresh token
   * Seguridad: Token separado con mayor duración
   */
  async generateRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp' | 'iss' | 'aud' | 'jti'>): Promise<string> {
    try {
      const tokenPayload: JwtPayload = {
        ...payload,
        jti: this.generateTokenId()
      };
      const token = jwt.sign(tokenPayload, this.refreshTokenSecret, {
        expiresIn: this.refreshTokenExpiry,
        issuer: this.issuer,
        audience: `${this.audience}-refresh`,
        algorithm: 'HS256'
      });
      return token;
    } catch (error) {
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to generate refresh token', 500);
    }
  }
  /**
   * Generate token pair
   * Patrón: Factory Method para creación consistente de tokens
   */
  async generateTokenPair(payload: Omit<JwtPayload, 'iat' | 'exp' | 'iss' | 'aud' | 'jti'>): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload)
    ]);
    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiry(this.accessTokenExpiry),
      refreshExpiresIn: this.parseExpiry(this.refreshTokenExpiry)
    };
  }
  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256']
      }) as JwtPayload;
      this.logger?.debug('Access token verified', { 
        userId: decoded.userId,
        sessionId: decoded.sessionId 
      });
      return decoded;
    } catch (error) {
      this.logger?.warn('Access token verification failed', { error: error.message });
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError(ErrorCode.TOKEN_EXPIRED, 'Access token expired', 401);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError(ErrorCode.TOKEN_INVALID, 'Invalid access token', 401);
      }
      throw new AppError(ErrorCode.TOKEN_INVALID, 'Token verification failed', 401);
    }
  }
  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: this.issuer,
        audience: `${this.audience}-refresh`,
        algorithms: ['HS256']
      }) as JwtPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError(ErrorCode.TOKEN_EXPIRED, 'Refresh token expired', 401);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError(ErrorCode.TOKEN_INVALID, 'Invalid refresh token', 401);
      }
      throw new AppError(ErrorCode.TOKEN_INVALID, 'Token verification failed', 401);
    }
  }
  /**
   * Decode token without verification
   * Útil para obtener información del token expirado
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      return decoded;
    } catch {
      return null;
    }
  }
  /**
   * Hash token for secure storage
   * Seguridad: No almacenar tokens en texto plano
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
  /**
   * Generate unique session ID
   */
  generateSessionId(): string {
    return uuidv4();
  }
  /**
   * Generate unique token ID (JTI)
   */
  private generateTokenId(): string {
    return uuidv4();
  }
  /**
   * Parse expiry string to seconds
   * Utilidad para convertir formato de tiempo
   */
  private parseExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      case 'w': return value * 604800;
      default: return 900; // 15 minutos por defecto
    }
  }
  /**
   * Validate token structure
   * Validación adicional de seguridad
   */
  isValidTokenStructure(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }
    const parts = token.split('.');
    return parts.length === 3;
  }
  /**
   * Extract token from Authorization header
   * Utilidad para extraer token de headers
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    return parts[1];
  }
  /**
   * Check if token is expired
   * Verificación rápida sin throw
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return true;
      }
      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  }
  /**
   * Get token remaining time in seconds
   */
  getTokenRemainingTime(token: string): number {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return 0;
      }
      const remaining = decoded.exp * 1000 - Date.now();
      return Math.max(0, Math.floor(remaining / 1000));
    } catch {
      return 0;
    }
  }
  /**
   * Check if token is close to expiration (within 5 minutes)
   * Útil para refresh proactivo de tokens
   */
  isTokenCloseToExpiration(token: string, thresholdMinutes: number = 5): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return true; // Consider expired if we can't determine
      }
      const expirationTime = decoded.exp * 1000;
      const currentTime = Date.now();
      const thresholdMs = thresholdMinutes * 60 * 1000;
      return (expirationTime - currentTime) <= thresholdMs;
    } catch (error) {
      this.logger?.warn('Failed to check token expiration proximity', { error: error.message });
      return true; // Consider expired if we can't check
    }
  }

  /**
   * Get access token expiration time in seconds
   */
  getAccessTokenExpirationTime(): number {
    return this.parseExpiry(this.accessTokenExpiry);
  }

  /**
   * Get refresh token expiration time in seconds
   */
  getRefreshTokenExpirationTime(): number {
    return this.parseExpiry(this.refreshTokenExpiry);
  }
  /**
   * Create token for specific purpose (email verification, password reset, etc.)
   * Patrón: Factory Method para diferentes tipos de tokens
   */
  async createPurposeToken(purpose: string, data: any, expiresIn: string = '1h'): Promise<string> {
    const payload = {
      purpose,
      data,
      jti: this.generateTokenId()
    };
    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn,
      issuer: this.issuer,
      audience: `${this.audience}-${purpose}`,
      algorithm: 'HS256'
    });
  }
  /**
   * Verify purpose token
   */
  async verifyPurposeToken(token: string, purpose: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: this.issuer,
        audience: `${this.audience}-${purpose}`,
        algorithms: ['HS256']
      }) as any;
      if (decoded.purpose !== purpose) {
        throw new AppError(ErrorCode.TOKEN_INVALID, 'Invalid token purpose', 401);
      }
      return decoded.data;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError(ErrorCode.TOKEN_EXPIRED, `${purpose} token expired`, 401);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError(ErrorCode.TOKEN_INVALID, `Invalid ${purpose} token`, 401);
      }
      throw error;
    }
  }
}
