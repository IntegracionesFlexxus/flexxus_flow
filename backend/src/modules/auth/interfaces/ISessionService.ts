/**
 * Session Service Interface - Sprint 2
 * Siguiendo lineamientos nivel 2: lógica de negocio separada de persistencia
 */
import { TokenPair } from '@/modules/auth/interfaces/IJwtService';
import { SessionData } from '@/modules/auth/interfaces/ISessionRepository';
export interface SessionCreationData {
  userId: string;
  companyId: string;
  email: string;
  role: string;
  deviceInfo: {
    userAgent?: string;
    ip?: string;
    deviceFingerprint?: string;
  };
  location?: {
    country?: string;
    city?: string;
    timezone?: string;
  };
}
export interface SessionValidationResult {
  isValid: boolean;
  session?: SessionData;
  reason?: string;
}
export interface SessionRefreshResult {
  success: boolean;
  tokens?: TokenPair;
  reason?: string;
}
export interface ISessionService {
  /**
   * Crea una nueva sesión y retorna los tokens JWT
   */
  createSession(sessionData: SessionCreationData): Promise<{
    session: SessionData;
    tokens: TokenPair;
  }>;
  /**
   * Valida una sesión por hash de token y actualiza actividad
   */
  validateSession(tokenHash: string): Promise<SessionValidationResult>;
  /**
   * Refresca los tokens de una sesión usando refresh token
   */
  refreshSession(refreshTokenHash: string): Promise<SessionRefreshResult>;
  /**
   * Invalida una sesión específica (logout)
   */
  invalidateSession(sessionId: string): Promise<void>;
  /**
   * Invalida todas las sesiones de un usuario excepto opcionalmente una
   */
  invalidateUserSessions(userId: string, exceptSessionId?: string): Promise<number>;
  /**
   * Marca una sesión como sospechosa por actividad anómala
   */
  markSessionSuspicious(sessionId: string, reason: string): Promise<void>;
  /**
   * Fuerza el logout de una sesión
   */
  forceLogoutSession(sessionId: string, reason: string): Promise<void>;
  /**
   * Obtiene sesiones activas de un usuario para administración
   */
  getActiveUserSessions(userId: string): Promise<SessionData[]>;
  /**
   * Limpia sesiones expiradas (para uso en cron jobs)
   */
  cleanupExpiredSessions(): Promise<number>;
  /**
   * Verifica si una sesión está activa y no expirada
   */
  isSessionActive(sessionId: string): Promise<boolean>;
  /**
   * Obtiene información detallada de una sesión
   */
  getSessionInfo(sessionId: string): Promise<SessionData | null>;
  /**
   * Actualiza información de dispositivo/ubicación de una sesión
   */
  updateSessionMetadata(sessionId: string, metadata: {
    deviceInfo?: Record<string, any>;
    location?: { country?: string; city?: string; timezone?: string };
  }): Promise<void>;
}
