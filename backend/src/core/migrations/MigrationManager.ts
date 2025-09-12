/**
 * Migration Manager
 * Manages database migrations and schema updates
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { MigrationVersion } from './MigrationVersion';
import { DataTransformer } from './DataTransformer';

export interface Migration {
  version: string;
  name: string;
  up: (connection: any) => Promise<void>;
  down: (connection: any) => Promise<void>;
}

@injectable()
export class MigrationManager {
  private migrations: Map<string, Migration> = new Map();
  
  constructor(
    @inject(TYPES.SharedConnection) private db: IDatabaseConnection,
    @inject(TYPES.MigrationVersion) private versionManager: MigrationVersion,
    @inject(TYPES.DataTransformer) private transformer: DataTransformer,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Register a migration
   */
  registerMigration(migration: Migration): void {
    this.migrations.set(migration.version, migration);
    this.logger.info(`Migration registered: ${migration.name} (${migration.version})`);
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    try {
      await this.ensureMigrationTable();
      
      const appliedVersions = await this.versionManager.getAppliedVersions();
      const pendingMigrations = this.getPendingMigrations(appliedVersions);
      
      if (pendingMigrations.length === 0) {
        this.logger.info('No pending migrations');
        return;
      }
      
      for (const migration of pendingMigrations) {
        await this.runMigration(migration);
      }
      
      this.logger.info(`Successfully ran ${pendingMigrations.length} migrations`);
    } catch (error) {
      this.logger.error('Failed to run migrations:', error);
      throw error;
    }
  }

  /**
   * Rollback the last migration
   */
  async rollback(): Promise<void> {
    try {
      const lastVersion = await this.versionManager.getLastVersion();
      
      if (!lastVersion) {
        this.logger.info('No migrations to rollback');
        return;
      }
      
      const migration = this.migrations.get(lastVersion);
      
      if (!migration) {
        throw new Error(`Migration ${lastVersion} not found`);
      }
      
      await this.rollbackMigration(migration);
      this.logger.info(`Successfully rolled back migration: ${migration.name}`);
    } catch (error) {
      this.logger.error('Failed to rollback migration:', error);
      throw error;
    }
  }

  /**
   * Reset all migrations
   */
  async reset(): Promise<void> {
    try {
      const appliedVersions = await this.versionManager.getAppliedVersions();
      
      for (const version of appliedVersions.reverse()) {
        const migration = this.migrations.get(version);
        if (migration) {
          await this.rollbackMigration(migration);
        }
      }
      
      this.logger.info('Successfully reset all migrations');
    } catch (error) {
      this.logger.error('Failed to reset migrations:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    applied: string[];
    pending: string[];
    total: number;
  }> {
    const appliedVersions = await this.versionManager.getAppliedVersions();
    const pendingMigrations = this.getPendingMigrations(appliedVersions);
    
    return {
      applied: appliedVersions,
      pending: pendingMigrations.map(m => m.version),
      total: this.migrations.size
    };
  }

  private async ensureMigrationTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW(),
        execution_time_ms INTEGER
      )
    `;
    
    await this.db.query(query);
  }

  private async runMigration(migration: Migration): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.logger.info(`Running migration: ${migration.name} (${migration.version})`);
      
      await this.db.transaction(async (client) => {
        await migration.up(client);
        await this.versionManager.recordVersion(migration.version, migration.name, Date.now() - startTime);
      });
      
      this.logger.info(`Migration completed: ${migration.name}`);
    } catch (error) {
      this.logger.error(`Migration failed: ${migration.name}`, error);
      throw error;
    }
  }

  private async rollbackMigration(migration: Migration): Promise<void> {
    try {
      this.logger.info(`Rolling back migration: ${migration.name} (${migration.version})`);
      
      await this.db.transaction(async (client) => {
        await migration.down(client);
        await this.versionManager.removeVersion(migration.version);
      });
      
      this.logger.info(`Rollback completed: ${migration.name}`);
    } catch (error) {
      this.logger.error(`Rollback failed: ${migration.name}`, error);
      throw error;
    }
  }

  private getPendingMigrations(appliedVersions: string[]): Migration[] {
    const appliedSet = new Set(appliedVersions);
    const pending: Migration[] = [];
    
    for (const [version, migration] of this.migrations) {
      if (!appliedSet.has(version)) {
        pending.push(migration);
      }
    }
    
    // Sort by version
    return pending.sort((a, b) => a.version.localeCompare(b.version));
  }
}