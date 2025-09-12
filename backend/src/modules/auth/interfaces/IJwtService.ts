/**
 * JWT Service Interface - Sprint 2
 * Siguiendo lineamientos nivel 2: interfaces claras y responsabilidad única
 */
export interface JwtPayload {
  userId: string;
  companyId: string;
  email: string;
  role: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}
export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  tokenType: 'refresh';
  iat?: number;
  exp?: number;
}
export interface IJwtService {
  /**
   * Genera un par de tokens (access y refresh) para un usuario
   */
  generateTokenPair(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<TokenPair>;
  /**
   * Verifica y decodifica un access token
   */
  verifyAccessToken(token: string): Promise<JwtPayload>;
  /**
   * Verifica y decodifica un refresh token
   */
  verifyRefreshToken(token: string): Promise<{ userId: string; sessionId: string }>;
  /**
   * Genera un hash SHA-256 de un token para almacenamiento seguro
   */
  hashToken(token: string): string;
  /**
   * Genera un UUID único para identificar sesiones
   */
  generateSessionId(): string;
  /**
   * Obtiene el tiempo de expiración en segundos para access tokens
   */
  getAccessTokenExpirationTime(): number;
  /**
   * Obtiene el tiempo de expiración en segundos para refresh tokens
   */
  getRefreshTokenExpirationTime(): number;
}
