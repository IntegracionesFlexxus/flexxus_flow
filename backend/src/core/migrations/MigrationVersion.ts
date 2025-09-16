/**
 * Migration Version Manager
 * Tracks and manages migration versions
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';

@injectable()
export class MigrationVersion {
  constructor(
    @inject(TYPES.SharedConnection) private db: IDatabaseConnection,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Get all applied migration versions
   */
  async getAppliedVersions(): Promise<string[]> {
    try {
      const query = 'SELECT version FROM migrations ORDER BY version ASC';
      const results = await this.db.query<{ version: string }>(query);
      return results.map(r => r.version);
    } catch (error) {
      // Table might not exist yet
      if (error instanceof Error && error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get the last applied version
   */
  async getLastVersion(): Promise<string | null> {
    try {
      const query = 'SELECT version FROM migrations ORDER BY applied_at DESC LIMIT 1';
      const results = await this.db.query<{ version: string }>(query);
      return results[0]?.version || null;
    } catch (error) {
      if (error instanceof Error && error.message?.includes('does not exist')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Record a new migration version
   */
  async recordVersion(version: string, name: string, executionTimeMs: number): Promise<void> {
    const query = `
      INSERT INTO migrations (version, name, execution_time_ms)
      VALUES ($1, $2, $3)
    `;
    
    await this.db.query(query, [version, name, executionTimeMs]);
    this.logger.info(`Recorded migration version: ${version}`);
  }

  /**
   * Remove a migration version (for rollback)
   */
  async removeVersion(version: string): Promise<void> {
    const query = 'DELETE FROM migrations WHERE version = $1';
    await this.db.query(query, [version]);
    this.logger.info(`Removed migration version: ${version}`);
  }

  /**
   * Check if a version has been applied
   */
  async isVersionApplied(version: string): Promise<boolean> {
    try {
      const query = 'SELECT 1 FROM migrations WHERE version = $1';
      const results = await this.db.query(query, [version]);
      return results.length > 0;
    } catch (error) {
      if (error instanceof Error && error.message?.includes('does not exist')) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get migration history
   */
  async getHistory(): Promise<Array<{
    version: string;
    name: string;
    appliedAt: Date;
    executionTimeMs: number;
  }>> {
    try {
      const query = `
        SELECT version, name, applied_at, execution_time_ms
        FROM migrations
        ORDER BY applied_at DESC
      `;
      
      const results = await this.db.query<{
        version: string;
        name: string;
        applied_at: Date;
        execution_time_ms: number;
      }>(query);
      
      return results.map(r => ({
        version: r.version,
        name: r.name,
        appliedAt: r.applied_at,
        executionTimeMs: r.execution_time_ms
      }));
    } catch (error) {
      if (error instanceof Error && error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Clear all migration versions (use with caution!)
   */
  async clearAll(): Promise<void> {
    const query = 'TRUNCATE TABLE migrations';
    await this.db.query(query);
    this.logger.warn('Cleared all migration versions');
  }
}