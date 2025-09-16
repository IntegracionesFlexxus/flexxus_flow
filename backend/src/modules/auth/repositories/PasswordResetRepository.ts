// PasswordResetRepository - Password reset token management
// Single Responsibility: Handle password reset tokens and validation
import { injectable, inject } from 'inversify';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
import { randomBytes } from 'crypto';
export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}
export interface IPasswordResetRepository {
  createResetToken(userId: string, expirationHours?: number): Promise<string>;
  findByToken(token: string): Promise<{ userId: string; email: string } | null>;
  validateToken(token: string): Promise<boolean>;
  markTokenAsUsed(token: string): Promise<void>;
  invalidateToken(token: string): Promise<void>;
  invalidateAllUserTokens(userId: string): Promise<void>;
  cleanupExpiredTokens(): Promise<number>;
}
/**
 * Repository for password reset token management
 * Follows Single Responsibility Principle
 */
@injectable()
export class PasswordResetRepository implements IPasswordResetRepository {
  private readonly tableName = 'password_reset_tokens';
  private readonly defaultExpirationHours = 24;
  constructor(
    @inject(TYPES.SharedConnection) private readonly db: IDatabaseConnection,
    @inject(TYPES.Logger) private readonly logger?: Logger
  ) {}
  /**
   * Create a new password reset token for a user
   */
  async createResetToken(userId: string, expirationHours: number = this.defaultExpirationHours): Promise<string> {
    // Invalidate any existing tokens for this user
    await this.invalidateAllUserTokens(userId);
    // Generate a secure random token
    const token = randomBytes(32).toString('hex');
    const hashedToken = this.hashToken(token);
    const expiresAt = new Date(Date.now() + (expirationHours * 60 * 60 * 1000));
    const query = `
      INSERT INTO ${this.tableName} (
        id, user_id, token, expires_at, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, NOW()
      )
    `;
    await this.db.query(query, [userId, hashedToken, expiresAt]);
    this.logger?.info('Password reset token created', { 
      userId, 
      expiresAt,
      expirationHours 
    });
    // Return the unhashed token to send to the user
    return token;
  }
  /**
   * Find user by password reset token
   */
  async findByToken(token: string): Promise<{ userId: string; email: string } | null> {
    const hashedToken = this.hashToken(token);
    const query = `
      SELECT 
        prt.user_id,
        u.email
      FROM ${this.tableName} prt
      INNER JOIN users u ON prt.user_id = u.id
      WHERE prt.token = $1
        AND prt.expires_at > NOW()
        AND prt.used_at IS NULL
        AND u.deleted_at IS NULL
      ORDER BY prt.created_at DESC
      LIMIT 1
    `;
    const result = await this.db.query<{ user_id: string; email: string }>(query, [hashedToken]);
    if (result.length === 0) {
      this.logger?.warn('Invalid or expired password reset token');
      return null;
    }
    return {
      userId: result[0].user_id,
      email: result[0].email
    };
  }
  /**
   * Validate if a token is valid and not expired
   */
  async validateToken(token: string): Promise<boolean> {
    const hashedToken = this.hashToken(token);
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM ${this.tableName}
        WHERE token = $1
          AND expires_at > NOW()
          AND used_at IS NULL
      ) as is_valid
    `;
    const result = await this.db.query<{ is_valid: boolean }>(query, [hashedToken]);
    return result[0].is_valid;
  }
  /**
   * Mark a token as used after successful password reset
   */
  async markTokenAsUsed(token: string): Promise<void> {
    const hashedToken = this.hashToken(token);
    const query = `
      UPDATE ${this.tableName}
      SET used_at = NOW()
      WHERE token = $1
        AND used_at IS NULL
    `;
    const result = await this.db.query(query, [hashedToken]);
    if (result.rowCount === 0) {
      this.logger?.warn('Token not found or already used', { token: token.substring(0, 10) + '...' });
    } else {
      this.logger?.info('Password reset token marked as used');
    }
  }
  /**
   * Invalidate a specific token
   */
  async invalidateToken(token: string): Promise<void> {
    const hashedToken = this.hashToken(token);
    const query = `
      DELETE FROM ${this.tableName}
      WHERE token = $1
    `;
    await this.db.query(query, [hashedToken]);
    this.logger?.info('Password reset token invalidated');
  }
  /**
   * Invalidate all tokens for a specific user
   */
  async invalidateAllUserTokens(userId: string): Promise<void> {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE user_id = $1
        AND used_at IS NULL
    `;
    const result = await this.db.query(query, [userId]);
    if (result.rowCount > 0) {
      this.logger?.info('Invalidated user password reset tokens', { 
        userId, 
        count: result.rowCount 
      });
    }
  }
  /**
   * Clean up expired tokens (maintenance task)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE expires_at < NOW()
        OR used_at IS NOT NULL
    `;
    const result = await this.db.query(query);
    const deletedCount = result.rowCount || 0;
    if (deletedCount > 0) {
      this.logger?.info('Cleaned up expired password reset tokens', { count: deletedCount });
    }
    return deletedCount;
  }
  /**
   * Get token statistics for monitoring
   */
  async getTokenStats(): Promise<{
    totalActive: number;
    totalExpired: number;
    totalUsed: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE expires_at > NOW() AND used_at IS NULL) as active,
        COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired,
        COUNT(*) FILTER (WHERE used_at IS NOT NULL) as used
      FROM ${this.tableName}
    `;
    const result = await this.db.query<any>(query);
    return {
      totalActive: parseInt(result[0].active || '0', 10),
      totalExpired: parseInt(result[0].expired || '0', 10),
      totalUsed: parseInt(result[0].used || '0', 10)
    };
  }
  /**
   * Hash token for secure storage
   * In production, use a proper hashing algorithm
   */
  private hashToken(token: string): string {
    // Simple hash for demonstration - use bcrypt or argon2 in production
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
