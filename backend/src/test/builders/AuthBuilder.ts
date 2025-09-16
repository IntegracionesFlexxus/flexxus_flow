/**
 * Authentication Test Data Builder
 * Sprint 4 - Builder pattern para datos de autenticación en tests
 */
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
export interface TestToken {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  userId: string;
  companyId: string;
  role: string;
  permissions: string[];
}
export interface TestSession {
  id: string;
  user_id: string;
  company_id: string;
  token: string;
  refresh_token: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
}
export class AuthBuilder {
  private static readonly TEST_SECRET = process.env.JWT_SECRET || 'test-secret-key';
  /**
   * Create a valid JWT access token
   */
  static createAccessToken(payload: {
    userId?: string;
    companyId?: string;
    email?: string;
    role?: string;
    permissions?: string[];
  } = {}): string {
    const tokenPayload = {
      sub: payload.userId || uuidv4(),
      company_id: payload.companyId || uuidv4(),
      email: payload.email || 'test@test.com',
      role: payload.role || 'user',
      permissions: payload.permissions || [],
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    };
    return jwt.sign(tokenPayload, this.TEST_SECRET);
  }
  /**
   * Create a valid JWT refresh token
   */
  static createRefreshToken(userId: string = uuidv4()): string {
    const tokenPayload = {
      sub: userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 604800 // 7 days
    };
    return jwt.sign(tokenPayload, this.TEST_SECRET);
  }
  /**
   * Create an expired token
   */
  static createExpiredToken(userId: string = uuidv4()): string {
    const tokenPayload = {
      sub: userId,
      type: 'access',
      iat: Math.floor(Date.now() / 1000) - 7200,
      exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
    };
    return jwt.sign(tokenPayload, this.TEST_SECRET);
  }
  /**
   * Create an invalid token
   */
  static createInvalidToken(): string {
    return 'invalid.token.signature';
  }
  /**
   * Create a complete token response
   */
  static createTokenResponse(options: {
    userId?: string;
    companyId?: string;
    role?: string;
    permissions?: string[];
  } = {}): TestToken {
    const userId = options.userId || uuidv4();
    const companyId = options.companyId || uuidv4();
    return {
      accessToken: this.createAccessToken({ ...options, userId, companyId }),
      refreshToken: this.createRefreshToken(userId),
      tokenType: 'Bearer',
      expiresIn: 3600,
      userId,
      companyId,
      role: options.role || 'user',
      permissions: options.permissions || []
    };
  }
  /**
   * Create a test session
   */
  static createSession(options: {
    userId?: string;
    companyId?: string;
    isActive?: boolean;
  } = {}): TestSession {
    const now = new Date();
    const userId = options.userId || uuidv4();
    return {
      id: uuidv4(),
      user_id: userId,
      company_id: options.companyId || uuidv4(),
      token: this.createAccessToken({ userId }),
      refresh_token: this.createRefreshToken(userId),
      expires_at: new Date(now.getTime() + 3600000), // 1 hour
      created_at: now,
      updated_at: now,
      ip_address: '127.0.0.1',
      user_agent: 'jest-test-agent',
      is_active: options.isActive !== undefined ? options.isActive : true
    };
  }
  /**
   * Create authorization header
   */
  static createAuthHeader(token?: string): { Authorization: string } {
    return {
      Authorization: `Bearer ${token || this.createAccessToken()}`
    };
  }
  /**
   * Create basic auth header
   */
  static createBasicAuthHeader(username: string, password: string): { Authorization: string } {
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    return {
      Authorization: `Basic ${credentials}`
    };
  }
  /**
   * Decode token without verification (for testing)
   */
  static decodeToken(token: string): any {
    return jwt.decode(token);
  }
  /**
   * Verify token with test secret
   */
  static verifyToken(token: string): any {
    return jwt.verify(token, this.TEST_SECRET);
  }
}
