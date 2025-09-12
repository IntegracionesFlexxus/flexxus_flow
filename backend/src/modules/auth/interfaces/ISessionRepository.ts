/**
 * Session Repository Interface - Sprint 2
 * Siguiendo lineamientos nivel 2: segregación de interfaces y responsabilidad única
 */
export interface SessionData {
  id: string;
  userId: string;
  companyId: string;
  tokenHash: string;
  refreshTokenHash: string;
  deviceInfo: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  country?: string;
  city?: string;
  timezone?: string;
  active: boolean;
  lastActivityAt: Date;
  expiresAt: Date;
  refreshExpiresAt: Date;
  isSuspicious?: boolean;
  forceLogout?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
export interface CreateSessionData {
  id: string;
  userId: string;
  companyId: string;
  tokenHash: string;
  refreshTokenHash: string;
  deviceInfo: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  country?: string;
  city?: string;
  timezone?: string;
  active: boolean;
  lastActivityAt: Date;
  expiresAt: Date;
  refreshExpiresAt: Date;
}
export interface ISessionRepository {
  /**
   * Crea una nueva sesión en la base de datos
   */
  create(sessionData: CreateSessionData): Promise<SessionData>;
  /**
   * Busca una sesión por hash de token de acceso
   */
  findByTokenHash(tokenHash: string): Promise<SessionData | null>;
  /**
   * Busca una sesión por hash de refresh token
   */
  findByRefreshTokenHash(refreshTokenHash: string): Promise<SessionData | null>;
  /**
   * Busca una sesión por ID
   */
  findById(sessionId: string): Promise<SessionData | null>;
  /**
   * Actualiza la fecha de última actividad de una sesión
   */
  updateLastActivity(sessionId: string): Promise<void>;
  /**
   * Actualiza los hashes de tokens de una sesión (para refresh)
   */
  updateTokens(sessionId: string, tokenHash: string, refreshTokenHash: string): Promise<void>;
  /**
   * Invalida una sesión específica
   */
  invalidate(sessionId: string): Promise<void>;
  /**
   * Invalida todas las sesiones de un usuario excepto opcionalmente una
   */
  invalidateUserSessions(userId: string, exceptSessionId?: string): Promise<number>;
  /**
   * Marca una sesión como sospechosa
   */
  markSuspicious(sessionId: string, reason?: string): Promise<void>;
  /**
   * Fuerza el logout de una sesión
   */
  forceLogout(sessionId: string, reason?: string): Promise<void>;
  /**
   * Limpia sesiones expiradas automáticamente
   */
  cleanupExpired(): Promise<number>;
  /**
   * Obtiene sesiones activas de un usuario
   */
  getActiveUserSessions(userId: string): Promise<SessionData[]>;
  /**
   * Obtiene estadísticas de sesiones
   */
  getSessionStats(companyId?: string): Promise<{
    total: number;
    active: number;
    expired: number;
    suspicious: number;
  }>;
}
