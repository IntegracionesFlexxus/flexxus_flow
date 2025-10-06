/**
 * Session Repository Implementation - Sprint 2
 * Siguiendo lineamientos nivel 2: persistencia separada de lógica de negocio
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { 
  ISessionRepository, 
  SessionData, 
  CreateSessionData 
} from '@/modules/auth/interfaces/ISessionRepository';

@injectable()
export class SessionRepository implements ISessionRepository {
  constructor(
    @inject(TYPES.SharedConnection) private db: IDatabaseConnection,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async create(sessionData: CreateSessionData): Promise<SessionData> {
    const query = `
      INSERT INTO user_sessions (
        id, user_id, company_id, token_hash, refresh_token_hash,
        device_info, ip_address, user_agent, device_fingerprint,
        country, city, timezone, active, last_activity_at,
        expires_at, refresh_expires_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW()
      ) RETURNING *
    `;

    const values = [
      sessionData.id,
      sessionData.userId,
      sessionData.companyId,
      sessionData.tokenHash,
      sessionData.refreshTokenHash,
      JSON.stringify(sessionData.deviceInfo),
      sessionData.ipAddress,
      sessionData.userAgent,
      sessionData.deviceFingerprint,
      sessionData.country,
      sessionData.city,
      sessionData.timezone,
      sessionData.active,
      sessionData.lastActivityAt,
      sessionData.expiresAt,
      sessionData.refreshExpiresAt
    ];

    try {
      const result = await this.db.query(query, values);

      if (!result || result.rows.length === 0) {
        throw new Error('Failed to create session - no rows returned');
      }

      const row = result.rows[0];
      return this.mapRowToSessionData(row);

    } catch (error) {
      this.logger.error('Session creation failed', {
        error: error.message,
        sessionId: sessionData.id,
        userId: sessionData.userId
      });
      throw new Error('Database error during session creation');
    }
  }

  async findByTokenHash(tokenHash: string): Promise<SessionData | null> {
    const query = `
      SELECT * FROM user_sessions 
      WHERE token_hash = $1 AND deleted_at IS NULL
      LIMIT 1
    `;

    try {
      const result = await this.db.query(query, [tokenHash]);

      if (!result || result.rows.length === 0) {
        return null;
      }

      return this.mapRowToSessionData(result.rows[0]);

    } catch (error) {
      this.logger.error('Find by token hash failed', {
        error: error.message,
        tokenHashLength: tokenHash.length
      });
      throw new Error('Database error during session lookup');
    }
  }

  async findByRefreshTokenHash(refreshTokenHash: string): Promise<SessionData | null> {
    const query = `
      SELECT * FROM user_sessions 
      WHERE refresh_token_hash = $1 AND deleted_at IS NULL
      LIMIT 1
    `;

    try {
      const result = await this.db.query(query, [refreshTokenHash]);

      if (!result || result.rows.length === 0) {
        return null;
      }

      return this.mapRowToSessionData(result.rows[0]);

    } catch (error) {
      this.logger.error('Find by refresh token hash failed', {
        error: error.message,
        refreshTokenHashLength: refreshTokenHash.length
      });
      throw new Error('Database error during refresh token lookup');
    }
  }

  async findById(sessionId: string): Promise<SessionData | null> {
    const query = `
      SELECT * FROM user_sessions 
      WHERE id = $1 AND deleted_at IS NULL
      LIMIT 1
    `;

    try {
      const result = await this.db.query(query, [sessionId]);

      if (!result || result.rows.length === 0) {
        return null;
      }

      return this.mapRowToSessionData(result.rows[0]);

    } catch (error) {
      this.logger.error('Find session by ID failed', {
        error: error.message,
        sessionId
      });
      throw new Error('Database error during session lookup');
    }
  }

  async updateLastActivity(sessionId: string): Promise<void> {
    const query = `
      UPDATE user_sessions 
      SET last_activity_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND active = true AND deleted_at IS NULL
    `;

    try {
      const result = await this.db.query(query, [sessionId]);
      const affectedRows = result?.rowCount || (result as any)?.affectedRows || 0;

      if (affectedRows === 0) {
        this.logger.warn('No session found for last activity update', {
          sessionId
        });
      }

    } catch (error) {
      this.logger.error('Update last activity failed', {
        error: error.message,
        sessionId
      });
      throw new Error('Database error during activity update');
    }
  }

  async updateTokens(sessionId: string, tokenHash: string, refreshTokenHash: string): Promise<void> {
    const query = `
      UPDATE user_sessions 
      SET token_hash = $2, refresh_token_hash = $3, updated_at = NOW()
      WHERE id = $1 AND active = true AND deleted_at IS NULL
    `;

    try {
      const result = await this.db.query(query, [sessionId, tokenHash, refreshTokenHash]);
      const affectedRows = result?.rowCount || (result as any)?.affectedRows || 0;

      if (affectedRows === 0) {
        throw new Error('Session not found or inactive');
      }

    } catch (error) {
      this.logger.error('Token update failed', {
        error: error.message,
        sessionId
      });
      throw new Error('Database error during token update');
    }
  }

  async invalidate(sessionId: string): Promise<void> {
    const query = `
      UPDATE user_sessions 
      SET active = false, updated_at = NOW()
      WHERE id = $1
    `;

    try {
      const result = await this.db.query(query, [sessionId]);
      const affectedRows = result?.rowCount || (result as any)?.affectedRows || 0;

      if (affectedRows === 0) {
        this.logger.warn('No session found for invalidation', {
          sessionId
        });
      }

    } catch (error) {
      this.logger.error('Session invalidation failed', {
        error: error.message,
        sessionId
      });
      throw new Error('Database error during session invalidation');
    }
  }

  async invalidateUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
    this.logger.info('[SessionRepository.invalidateUserSessions] START', {
      userId,
      exceptSessionId,
      timestamp: new Date().toISOString()
    });

    let query = `
      UPDATE user_sessions
      SET active = false, force_logout = true, updated_at = NOW()
      WHERE user_id = $1 AND active = true
    `;

    const params = [userId];

    if (exceptSessionId) {
      query += ' AND id != $2';
      params.push(exceptSessionId);
    }

    try {
      const result = await this.db.query(query, params);

      // Log the actual result structure for debugging
      this.logger.debug('[SessionRepository.invalidateUserSessions] Query result', {
        resultType: typeof result,
        resultIsArray: Array.isArray(result),
        resultKeys: result ? Object.keys(result) : null,
        rowCount: (result as any)?.rowCount,
        affectedRows: (result as any)?.affectedRows,
        userId
      });

      // Handle different result formats
      let affectedRows = 0;
      if (result && typeof result === 'object') {
        if ('rowCount' in result) {
          affectedRows = (result as any).rowCount || 0;
        } else if ('affectedRows' in result) {
          affectedRows = (result as any).affectedRows || 0;
        } else if (Array.isArray(result)) {
          // Some drivers return array for UPDATE with RETURNING clause
          affectedRows = result.rows.length;
        }
      }

      this.logger.info('[SessionRepository.invalidateUserSessions] Sessions invalidated', {
        userId,
        exceptSessionId,
        affectedRows,
        timestamp: new Date().toISOString()
      });

      return affectedRows;

    } catch (error) {
      this.logger.error('[SessionRepository.invalidateUserSessions] User sessions invalidation failed', {
        error: error.message,
        errorName: error.name,
        errorCode: (error as any).code,
        errorDetail: (error as any).detail,
        errorHint: (error as any).hint,
        query: query,
        params: params,
        stack: error.stack,
        userId,
        exceptSessionId,
        timestamp: new Date().toISOString()
      });

      // Re-throw the original error with more context
      throw error;
    }
  }

  async markSuspicious(sessionId: string, reason?: string): Promise<void> {
    const query = `
      UPDATE user_sessions 
      SET is_suspicious = true, updated_at = NOW()
      WHERE id = $1
    `;

    try {
      const result = await this.db.query(query, [sessionId]);
      const affectedRows = result?.rowCount || (result as any)?.affectedRows || 0;

      if (affectedRows === 0) {
        this.logger.warn('No session found for suspicious marking', {
          sessionId
        });
      }

      // Log the suspicious activity
      if (reason) {
        this.logger.warn('Session marked suspicious', {
          sessionId,
          reason
        });
      }

    } catch (error) {
      this.logger.error('Mark suspicious failed', {
        error: error.message,
        sessionId,
        reason
      });
      throw new Error('Database error during suspicious marking');
    }
  }

  async forceLogout(sessionId: string, reason?: string): Promise<void> {
    const query = `
      UPDATE user_sessions 
      SET force_logout = true, active = false, updated_at = NOW()
      WHERE id = $1
    `;

    try {
      const result = await this.db.query(query, [sessionId]);
      const affectedRows = result?.rowCount || (result as any)?.affectedRows || 0;

      if (affectedRows === 0) {
        this.logger.warn('No session found for force logout', {
          sessionId
        });
      }

      // Log the forced logout
      if (reason) {
        this.logger.warn('Session force logged out', {
          sessionId,
          reason
        });
      }

    } catch (error) {
      this.logger.error('Force logout failed', {
        error: error.message,
        sessionId,
        reason
      });
      throw new Error('Database error during force logout');
    }
  }

  async cleanupExpired(): Promise<number> {
    const query = `
      UPDATE user_sessions 
      SET active = false, updated_at = NOW()
      WHERE active = true 
      AND (expires_at < NOW() OR refresh_expires_at < NOW())
    `;

    try {
      const result = await this.db.query(query);
      const cleanedCount = result?.rowCount || (result as any)?.affectedRows || 0;

      if (cleanedCount > 0) {
        this.logger.info('Cleaned up expired sessions', {
          count: cleanedCount
        });
      }

      return cleanedCount;

    } catch (error) {
      this.logger.error('Session cleanup failed', {
        error: error.message
      });
      throw new Error('Database error during session cleanup');
    }
  }

  async getActiveUserSessions(userId: string): Promise<SessionData[]> {
    const query = `
      SELECT * FROM user_sessions 
      WHERE user_id = $1 
      AND active = true 
      AND expires_at > NOW()
      AND deleted_at IS NULL
      ORDER BY last_activity_at DESC
    `;

    try {
      const result = await this.db.query(query, [userId]);

      return result ? result.rows.map(row => this.mapRowToSessionData(row)) : [];

    } catch (error) {
      this.logger.error('Get active user sessions failed', {
        error: error.message,
        userId
      });
      throw new Error('Database error during active sessions lookup');
    }
  }

  async getSessionStats(companyId?: string): Promise<{
    total: number;
    active: number;
    expired: number;
    suspicious: number;
  }> {
    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE active = true AND expires_at > NOW()) as active,
        COUNT(*) FILTER (WHERE active = true AND expires_at <= NOW()) as expired,
        COUNT(*) FILTER (WHERE is_suspicious = true) as suspicious
      FROM user_sessions 
      WHERE deleted_at IS NULL
    `;

    const params: any[] = [];

    if (companyId) {
      query += ' AND company_id = $1';
      params.push(companyId);
    }

    try {
      const result = await this.db.query(query, params);

      if (!result || result.rows.length === 0) {
        return { total: 0, active: 0, expired: 0, suspicious: 0 };
      }

      const row = result.rows[0];
      return {
        total: parseInt(row.total, 10) || 0,
        active: parseInt(row.active, 10) || 0,
        expired: parseInt(row.expired, 10) || 0,
        suspicious: parseInt(row.suspicious, 10) || 0
      };

    } catch (error) {
      this.logger.error('Get session stats failed', {
        error: error.message,
        companyId
      });
      throw new Error('Database error during stats lookup');
    }
  }

  /**
   * Maps database row to SessionData object
   */
  private mapRowToSessionData(row: any): SessionData {
    return {
      id: row.id,
      userId: row.user_id,
      companyId: row.company_id,
      tokenHash: row.token_hash,
      refreshTokenHash: row.refresh_token_hash,
      deviceInfo: typeof row.device_info === 'string' ? this.parseJson(row.device_info, {}) : row.device_info || {},
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      deviceFingerprint: row.device_fingerprint,
      country: row.country,
      city: row.city,
      timezone: row.timezone,
      active: row.active,
      lastActivityAt: new Date(row.last_activity_at),
      expiresAt: new Date(row.expires_at),
      refreshExpiresAt: new Date(row.refresh_expires_at),
      isSuspicious: row.is_suspicious,
      forceLogout: row.force_logout,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Safely parse JSON string
   */
  private parseJson(jsonString: string, defaultValue: any = null): any {
    if (!jsonString) {
      return defaultValue;
    }

    try {
      return JSON.parse(jsonString);
    } catch (error) {
      this.logger.warn('Failed to parse JSON field', {
        error: error.message,
        jsonString: jsonString.substring(0, 100)
      });
      return defaultValue;
    }
  }
}
