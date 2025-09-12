// UserAuthRepository - Authentication-specific operations
// Single Responsibility: Handle user authentication and verification
import { injectable, inject } from 'inversify';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
import { User } from '@/modules/auth/types/auth.types';
export interface IUserAuthRepository {
  updateLastLogin(userId: string): Promise<void>;
  verifyEmail(userId: string): Promise<void>;
  updatePassword(userId: string, hashedPassword: string): Promise<void>;
  getPasswordHash(userId: string): Promise<string | null>;
  enable2FA(userId: string, secret: string): Promise<void>;
  disable2FA(userId: string): Promise<void>;
  get2FASecret(userId: string): Promise<string | null>;
  updateFailedLoginAttempts(userId: string, attempts: number): Promise<void>;
  resetFailedLoginAttempts(userId: string): Promise<void>;
  lockAccount(userId: string, until: Date): Promise<void>;
  unlockAccount(userId: string): Promise<void>;
  isAccountLocked(userId: string): Promise<boolean>;
}
/**
 * Repository for authentication-related user operations
 * Follows Single Responsibility Principle
 */
@injectable()
export class UserAuthRepository implements IUserAuthRepository {
  private readonly tableName = 'users';
  private readonly allowedFields: Set<string>;
  constructor(
    @inject(TYPES.SharedConnection) private readonly db: IDatabaseConnection,
    @inject(TYPES.Logger) private readonly logger?: Logger
  ) {
    // Define allowed fields for authentication operations
    this.allowedFields = new Set([
      'id', 'email', 'password_hash', 'email_verified_at',
      'last_login_at', 'two_factor_secret', 'two_factor_enabled',
      'failed_login_attempts', 'locked_until', 'updated_at'
    ]);
  }
  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET last_login_at = NOW(), 
          updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
    `;
    await this.db.query(query, [userId]);
    this.logger?.info('Updated last login', { userId });
  }
  /**
   * Mark user's email as verified
   */
  async verifyEmail(userId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET email_verified_at = NOW(), 
          updated_at = NOW()
      WHERE id = $1 
        AND deleted_at IS NULL
        AND email_verified_at IS NULL
    `;
    const result = await this.db.query(query, [userId]);
    if (result.rowCount === 0) {
      this.logger?.warn('Email verification failed - user not found or already verified', { userId });
    } else {
      this.logger?.info('Email verified successfully', { userId });
    }
  }
  /**
   * Update user's password hash
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET password_hash = $2,
          password_changed_at = NOW(),
          updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
    `;
    await this.db.query(query, [userId, hashedPassword]);
    this.logger?.info('Password updated', { userId });
  }
  /**
   * Get user's password hash for verification
   */
  async getPasswordHash(userId: string): Promise<string | null> {
    const query = `
      SELECT password_hash
      FROM ${this.tableName}
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const result = await this.db.query<{ password_hash: string }>(query, [userId]);
    return result.length > 0 ? result[0].password_hash : null;
  }
  /**
   * Enable two-factor authentication
   */
  async enable2FA(userId: string, secret: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET two_factor_secret = $2,
          two_factor_enabled = true,
          updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
    `;
    await this.db.query(query, [userId, secret]);
    this.logger?.info('2FA enabled', { userId });
  }
  /**
   * Disable two-factor authentication
   */
  async disable2FA(userId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET two_factor_secret = NULL,
          two_factor_enabled = false,
          updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
    `;
    await this.db.query(query, [userId]);
    this.logger?.info('2FA disabled', { userId });
  }
  /**
   * Get user's 2FA secret
   */
  async get2FASecret(userId: string): Promise<string | null> {
    const query = `
      SELECT two_factor_secret
      FROM ${this.tableName}
      WHERE id = $1 
        AND deleted_at IS NULL
        AND two_factor_enabled = true
    `;
    const result = await this.db.query<{ two_factor_secret: string }>(query, [userId]);
    return result.length > 0 ? result[0].two_factor_secret : null;
  }
  /**
   * Update failed login attempts counter
   */
  async updateFailedLoginAttempts(userId: string, attempts: number): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET failed_login_attempts = $2,
          last_failed_login_at = NOW(),
          updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
    `;
    await this.db.query(query, [userId, attempts]);
    if (attempts >= 5) {
      this.logger?.warn('Multiple failed login attempts', { userId, attempts });
    }
  }
  /**
   * Reset failed login attempts
   */
  async resetFailedLoginAttempts(userId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET failed_login_attempts = 0,
          last_failed_login_at = NULL,
          updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
    `;
    await this.db.query(query, [userId]);
  }
  /**
   * Lock user account until specified date
   */
  async lockAccount(userId: string, until: Date): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET locked_until = $2,
          status = 'locked',
          updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
    `;
    await this.db.query(query, [userId, until]);
    this.logger?.warn('Account locked', { userId, until });
  }
  /**
   * Unlock user account
   */
  async unlockAccount(userId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET locked_until = NULL,
          status = 'active',
          failed_login_attempts = 0,
          updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
    `;
    await this.db.query(query, [userId]);
    this.logger?.info('Account unlocked', { userId });
  }
  /**
   * Check if account is currently locked
   */
  async isAccountLocked(userId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM ${this.tableName}
        WHERE id = $1 
          AND deleted_at IS NULL
          AND (
            locked_until > NOW() OR
            status = 'locked'
          )
      ) as is_locked
    `;
    const result = await this.db.query<{ is_locked: boolean }>(query, [userId]);
    return result[0].is_locked;
  }
  /**
   * Get authentication details for a user
   */
  async getAuthDetails(userId: string): Promise<{
    email: string;
    passwordHash: string;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
    isLocked: boolean;
    failedAttempts: number;
  } | null> {
    const query = `
      SELECT 
        email,
        password_hash,
        email_verified_at IS NOT NULL as email_verified,
        two_factor_enabled,
        (locked_until > NOW() OR status = 'locked') as is_locked,
        COALESCE(failed_login_attempts, 0) as failed_attempts
      FROM ${this.tableName}
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const result = await this.db.query<any>(query, [userId]);
    if (result.length === 0) {
      return null;
    }
    const row = result[0];
    return {
      email: row.email,
      passwordHash: row.password_hash,
      emailVerified: row.email_verified,
      twoFactorEnabled: row.two_factor_enabled,
      isLocked: row.is_locked,
      failedAttempts: row.failed_attempts
    };
  }
}
