/**
 * Feature Flag Repository Implementation - Sprint 2
 * Siguiendo lineamientos nivel 2: persistencia optimizada y separación de responsabilidades
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { 
  IFeatureFlagRepository, 
  FeatureFlag, 
  CreateFeatureFlagData, 
  UpdateFeatureFlagData,
  FeatureFlagFilter
} from '@/modules/feature-flags/interfaces/IFeatureFlagRepository';

@injectable()
export class FeatureFlagRepository implements IFeatureFlagRepository {
  constructor(
    @inject(TYPES.SharedConnection) private db: IDatabaseConnection,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async create(flagData: CreateFeatureFlagData): Promise<FeatureFlag> {
    const query = `
      INSERT INTO feature_flags (
        company_id, feature_name, enabled, config, rollout_percentage,
        rollout_rules, environment, description, category,
        starts_at, expires_at, created_by_user_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      ) 
      RETURNING *
    `;

    const values = [
      flagData.companyId,
      flagData.featureName,
      flagData.enabled,
      JSON.stringify(flagData.config || {}),
      flagData.rolloutPercentage || 100,
      JSON.stringify(flagData.rolloutRules || {}),
      flagData.environment,
      flagData.description,
      flagData.category,
      flagData.startsAt,
      flagData.expiresAt,
      flagData.createdByUserId
    ];

    try {
      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Failed to create feature flag - no rows returned');
      }

      const flag = this.mapRowToFeatureFlag(result.rows[0]);

      this.logger.info('Feature flag created', {
        flagId: flag.id,
        companyId: flagData.companyId,
        featureName: flagData.featureName,
        environment: flagData.environment
      });

      return flag;

    } catch (error) {
      this.logger.error('Feature flag creation failed', {
        error: error.message,
        companyId: flagData.companyId,
        featureName: flagData.featureName
      });

      if (error.code === '23505') { // Unique violation
        throw new Error(`Feature flag '${flagData.featureName}' already exists for company in ${flagData.environment} environment`);
      }

      throw new Error('Database error during feature flag creation');
    }
  }

  async findByCompany(companyId: string, environment = 'production'): Promise<FeatureFlag[]> {
    const query = `
      SELECT * FROM feature_flags 
      WHERE company_id = $1 
      AND environment = $2 
      AND deleted_at IS NULL
      ORDER BY feature_name ASC
    `;

    try {
      const result = await this.db.query(query, [companyId, environment]);
      return result.rows.map(row => this.mapRowToFeatureFlag(row));

    } catch (error) {
      this.logger.error('Find by company failed', {
        error: error.message,
        companyId,
        environment
      });
      throw new Error('Database error during feature flags lookup');
    }
  }

  async findByName(companyId: string, featureName: string, environment = 'production'): Promise<FeatureFlag | null> {
    const query = `
      SELECT * FROM feature_flags 
      WHERE company_id = $1 
      AND feature_name = $2 
      AND environment = $3 
      AND deleted_at IS NULL
      LIMIT 1
    `;

    try {
      const result = await this.db.query(query, [companyId, featureName, environment]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToFeatureFlag(result.rows[0]);

    } catch (error) {
      this.logger.error('Find by name failed', {
        error: error.message,
        companyId,
        featureName,
        environment
      });
      throw new Error('Database error during feature flag lookup');
    }
  }

  async findById(flagId: string): Promise<FeatureFlag | null> {
    const query = `
      SELECT * FROM feature_flags 
      WHERE id = $1 AND deleted_at IS NULL
      LIMIT 1
    `;

    try {
      const result = await this.db.query(query, [flagId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToFeatureFlag(result.rows[0]);

    } catch (error) {
      this.logger.error('Find by ID failed', {
        error: error.message,
        flagId
      });
      throw new Error('Database error during feature flag lookup');
    }
  }

  async update(companyId: string, featureName: string, updates: UpdateFeatureFlagData, environment = 'production'): Promise<FeatureFlag> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query
    if (updates.enabled !== undefined) {
      setClauses.push(`enabled = $${paramIndex++}`);
      values.push(updates.enabled);
    }
    if (updates.config !== undefined) {
      setClauses.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(updates.config));
    }
    if (updates.rolloutPercentage !== undefined) {
      setClauses.push(`rollout_percentage = $${paramIndex++}`);
      values.push(updates.rolloutPercentage);
    }
    if (updates.rolloutRules !== undefined) {
      setClauses.push(`rollout_rules = $${paramIndex++}`);
      values.push(JSON.stringify(updates.rolloutRules));
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.category !== undefined) {
      setClauses.push(`category = $${paramIndex++}`);
      values.push(updates.category);
    }
    if (updates.startsAt !== undefined) {
      setClauses.push(`starts_at = $${paramIndex++}`);
      values.push(updates.startsAt);
    }
    if (updates.expiresAt !== undefined) {
      setClauses.push(`expires_at = $${paramIndex++}`);
      values.push(updates.expiresAt);
    }
    if (updates.updatedByUserId !== undefined) {
      setClauses.push(`updated_by_user_id = $${paramIndex++}`);
      values.push(updates.updatedByUserId);
    }

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }

    setClauses.push(`updated_at = NOW()`);

    // Add WHERE clause parameters
    values.push(companyId, featureName, environment);

    const query = `
      UPDATE feature_flags 
      SET ${setClauses.join(', ')}
      WHERE company_id = $${paramIndex++} 
      AND feature_name = $${paramIndex++} 
      AND environment = $${paramIndex++}
      AND deleted_at IS NULL
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Feature flag not found or already deleted');
      }

      const flag = this.mapRowToFeatureFlag(result.rows[0]);

      this.logger.info('Feature flag updated', {
        flagId: flag.id,
        companyId,
        featureName,
        environment,
        updatedFields: Object.keys(updates)
      });

      return flag;

    } catch (error) {
      this.logger.error('Feature flag update failed', {
        error: error.message,
        companyId,
        featureName,
        environment
      });
      throw new Error('Database error during feature flag update');
    }
  }

  async updateById(flagId: string, updates: UpdateFeatureFlagData): Promise<FeatureFlag> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query (same logic as update method)
    if (updates.enabled !== undefined) {
      setClauses.push(`enabled = $${paramIndex++}`);
      values.push(updates.enabled);
    }
    if (updates.config !== undefined) {
      setClauses.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(updates.config));
    }
    if (updates.rolloutPercentage !== undefined) {
      setClauses.push(`rollout_percentage = $${paramIndex++}`);
      values.push(updates.rolloutPercentage);
    }
    if (updates.rolloutRules !== undefined) {
      setClauses.push(`rollout_rules = $${paramIndex++}`);
      values.push(JSON.stringify(updates.rolloutRules));
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.category !== undefined) {
      setClauses.push(`category = $${paramIndex++}`);
      values.push(updates.category);
    }
    if (updates.startsAt !== undefined) {
      setClauses.push(`starts_at = $${paramIndex++}`);
      values.push(updates.startsAt);
    }
    if (updates.expiresAt !== undefined) {
      setClauses.push(`expires_at = $${paramIndex++}`);
      values.push(updates.expiresAt);
    }
    if (updates.updatedByUserId !== undefined) {
      setClauses.push(`updated_by_user_id = $${paramIndex++}`);
      values.push(updates.updatedByUserId);
    }

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(flagId);

    const query = `
      UPDATE feature_flags 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex++} AND deleted_at IS NULL
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Feature flag not found');
      }

      return this.mapRowToFeatureFlag(result.rows[0]);

    } catch (error) {
      this.logger.error('Feature flag update by ID failed', {
        error: error.message,
        flagId
      });
      throw new Error('Database error during feature flag update');
    }
  }

  async delete(companyId: string, featureName: string, environment = 'production'): Promise<void> {
    const query = `
      UPDATE feature_flags 
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE company_id = $1 
      AND feature_name = $2 
      AND environment = $3
      AND deleted_at IS NULL
    `;

    try {
      const result = await this.db.query(query, [companyId, featureName, environment]);

      if (result.rowCount === 0) {
        this.logger.warn('No feature flag found for deletion', {
          companyId,
          featureName,
          environment
        });
      }

    } catch (error) {
      this.logger.error('Feature flag deletion failed', {
        error: error.message,
        companyId,
        featureName,
        environment
      });
      throw new Error('Database error during feature flag deletion');
    }
  }

  async deleteById(flagId: string): Promise<void> {
    const query = `
      UPDATE feature_flags 
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
    `;

    try {
      const result = await this.db.query(query, [flagId]);

      if (result.rowCount === 0) {
        this.logger.warn('No feature flag found for deletion by ID', {
          flagId
        });
      }

    } catch (error) {
      this.logger.error('Feature flag deletion by ID failed', {
        error: error.message,
        flagId
      });
      throw new Error('Database error during feature flag deletion');
    }
  }

  async findWithFilters(filter: FeatureFlagFilter): Promise<FeatureFlag[]> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const values: any[] = [];
    let paramIndex = 1;

    if (filter.companyId) {
      conditions.push(`company_id = $${paramIndex++}`);
      values.push(filter.companyId);
    }
    if (filter.environment) {
      conditions.push(`environment = $${paramIndex++}`);
      values.push(filter.environment);
    }
    if (filter.category) {
      conditions.push(`category = $${paramIndex++}`);
      values.push(filter.category);
    }
    if (filter.enabled !== undefined) {
      conditions.push(`enabled = $${paramIndex++}`);
      values.push(filter.enabled);
    }
    if (filter.featureNames && filter.featureNames.length > 0) {
      conditions.push(`feature_name = ANY($${paramIndex++})`);
      values.push(filter.featureNames);
    }
    if (!filter.includeExpired) {
      conditions.push(`(expires_at IS NULL OR expires_at > NOW())`);
    }

    const query = `
      SELECT * FROM feature_flags 
      WHERE ${conditions.join(' AND ')}
      ORDER BY feature_name ASC
    `;

    try {
      const result = await this.db.query(query, values);
      return result.rows.map(row => this.mapRowToFeatureFlag(row));

    } catch (error) {
      this.logger.error('Find with filters failed', {
        error: error.message,
        filter
      });
      throw new Error('Database error during filtered feature flags lookup');
    }
  }

  async getCompanyStats(companyId: string): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    byEnvironment: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE enabled = true) as enabled,
        COUNT(*) FILTER (WHERE enabled = false) as disabled,
        environment,
        category
      FROM feature_flags 
      WHERE company_id = $1 AND deleted_at IS NULL
      GROUP BY ROLLUP(environment, category)
      ORDER BY environment, category
    `;

    try {
      const result = await this.db.query(query, [companyId]);

      const stats = {
        total: 0,
        enabled: 0,
        disabled: 0,
        byEnvironment: {} as Record<string, number>,
        byCategory: {} as Record<string, number>
      };

      result.rows.forEach(row => {
        if (!row.environment && !row.category) {
          // Total row
          stats.total = parseInt(row.total) || 0;
          stats.enabled = parseInt(row.enabled) || 0;
          stats.disabled = parseInt(row.disabled) || 0;
        } else if (row.environment && !row.category) {
          // Environment totals
          stats.byEnvironment[row.environment] = parseInt(row.total) || 0;
        } else if (row.category && !row.environment) {
          // Category totals
          stats.byCategory[row.category] = parseInt(row.total) || 0;
        }
      });

      return stats;

    } catch (error) {
      this.logger.error('Get company stats failed', {
        error: error.message,
        companyId
      });
      throw new Error('Database error during stats lookup');
    }
  }

  async findExpiringFlags(daysFromNow: number): Promise<FeatureFlag[]> {
    const query = `
      SELECT * FROM feature_flags 
      WHERE deleted_at IS NULL
      AND expires_at IS NOT NULL
      AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '${daysFromNow} days'
      ORDER BY expires_at ASC
    `;

    try {
      const result = await this.db.query(query);
      return result.rows.map(row => this.mapRowToFeatureFlag(row));

    } catch (error) {
      this.logger.error('Find expiring flags failed', {
        error: error.message,
        daysFromNow
      });
      throw new Error('Database error during expiring flags lookup');
    }
  }

  async cloneToEnvironment(companyId: string, sourceEnv: string, targetEnv: string, featureNames?: string[]): Promise<FeatureFlag[]> {
    let whereClause = 'company_id = $1 AND environment = $2 AND deleted_at IS NULL';
    const values = [companyId, sourceEnv];

    if (featureNames && featureNames.length > 0) {
      whereClause += ' AND feature_name = ANY($3)';
      values.push(featureNames as any); // PostgreSQL array parameter
    }

    const query = `
      INSERT INTO feature_flags (
        company_id, feature_name, enabled, config, rollout_percentage,
        rollout_rules, environment, description, category,
        starts_at, expires_at, created_at, updated_at
      )
      SELECT 
        company_id, feature_name, enabled, config, rollout_percentage,
        rollout_rules, $${values.length + 1} as environment, description, category,
        starts_at, expires_at, NOW(), NOW()
      FROM feature_flags
      WHERE ${whereClause}
      ON CONFLICT (company_id, feature_name, environment) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        config = EXCLUDED.config,
        rollout_percentage = EXCLUDED.rollout_percentage,
        rollout_rules = EXCLUDED.rollout_rules,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        starts_at = EXCLUDED.starts_at,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
      RETURNING *
    `;

    values.push(targetEnv);

    try {
      const result = await this.db.query(query, values);
      return result.rows.map(row => this.mapRowToFeatureFlag(row));

    } catch (error) {
      this.logger.error('Clone to environment failed', {
        error: error.message,
        companyId,
        sourceEnv,
        targetEnv,
        featureNames
      });
      throw new Error('Database error during feature flags cloning');
    }
  }

  async getChangeHistory(companyId: string, featureName: string, limit = 50): Promise<any[]> {
    // This would require an audit/history table
    // For now, return empty array as placeholder
    this.logger.info('Change history requested but not yet implemented', {
      companyId,
      featureName,
      limit
    });
    return [];
  }

  /**
   * Store analytics data for feature flag evaluations
   */
  async storeAnalytics(analyticsData: {
    flagName: string;
    companyId: string;
    userId?: string;
    variation?: string;
    enabled: boolean;
    evaluationTime: number;
    cacheHit: boolean;
    timestamp: Date;
    context?: any;
  }): Promise<void> {
    const query = `
      INSERT INTO feature_flag_analytics (
        flag_name, company_id, user_id, variation, enabled,
        evaluation_time, cache_hit, timestamp, context
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
    `;

    const values = [
      analyticsData.flagName,
      analyticsData.companyId,
      analyticsData.userId,
      analyticsData.variation,
      analyticsData.enabled,
      analyticsData.evaluationTime,
      analyticsData.cacheHit,
      analyticsData.timestamp,
      JSON.stringify(analyticsData.context || {})
    ];

    try {
      await this.db.query(query, values);
    } catch (error) {
      // Don't throw error for analytics, just log it
      this.logger.error('Failed to store feature flag analytics', {
        error: error.message,
        analyticsData
      });
    }
  }

  /**
   * Get aggregated analytics for feature flags
   */
  async getAggregatedAnalytics(
    companyId: string,
    flagName?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalEvaluations: number;
    uniqueUsers: number;
    enabledCount: number;
    disabledCount: number;
    averageEvaluationTime: number;
    cacheHitRate: number;
    variationBreakdown: Record<string, number>;
  }> {
    let whereConditions = ['company_id = $1'];
    const values: any[] = [companyId];
    let paramIndex = 2;

    if (flagName) {
      whereConditions.push(`flag_name = $${paramIndex++}`);
      values.push(flagName);
    }
    if (startDate) {
      whereConditions.push(`timestamp >= $${paramIndex++}`);
      values.push(startDate);
    }
    if (endDate) {
      whereConditions.push(`timestamp <= $${paramIndex++}`);
      values.push(endDate);
    }

    const query = `
      SELECT 
        COUNT(*) as total_evaluations,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) FILTER (WHERE enabled = true) as enabled_count,
        COUNT(*) FILTER (WHERE enabled = false) as disabled_count,
        AVG(evaluation_time) as avg_evaluation_time,
        AVG(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hit_rate,
        variation,
        COUNT(*) as variation_count
      FROM feature_flag_analytics
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY variation
    `;

    try {
      const result = await this.db.query(query, values);

      const analytics = {
        totalEvaluations: 0,
        uniqueUsers: 0,
        enabledCount: 0,
        disabledCount: 0,
        averageEvaluationTime: 0,
        cacheHitRate: 0,
        variationBreakdown: {} as Record<string, number>
      };

      if (result.rows.length > 0) {
        // Aggregate from first row (overall stats)
        const firstRow = result.rows[0];
        analytics.totalEvaluations = parseInt(firstRow.total_evaluations) || 0;
        analytics.uniqueUsers = parseInt(firstRow.unique_users) || 0;
        analytics.enabledCount = parseInt(firstRow.enabled_count) || 0;
        analytics.disabledCount = parseInt(firstRow.disabled_count) || 0;
        analytics.averageEvaluationTime = parseFloat(firstRow.avg_evaluation_time) || 0;
        analytics.cacheHitRate = parseFloat(firstRow.cache_hit_rate) || 0;

        // Build variation breakdown
        result.rows.forEach(row => {
          if (row.variation) {
            analytics.variationBreakdown[row.variation] = parseInt(row.variation_count) || 0;
          }
        });
      }

      return analytics;

    } catch (error) {
      this.logger.error('Failed to get aggregated analytics', {
        error: error.message,
        companyId,
        flagName
      });
      // Return empty analytics rather than throwing
      return {
        totalEvaluations: 0,
        uniqueUsers: 0,
        enabledCount: 0,
        disabledCount: 0,
        averageEvaluationTime: 0,
        cacheHitRate: 0,
        variationBreakdown: {}
      };
    }
  }

  /**
   * Bulk update multiple feature flags
   */
  async bulkUpdate(
    companyId: string,
    updates: Array<{
      featureName: string;
      enabled?: boolean;
      rolloutPercentage?: number;
      config?: any;
    }>,
    environment = 'production'
  ): Promise<FeatureFlag[]> {
    const updatedFlags: FeatureFlag[] = [];

    // Use transaction for bulk update
    await this.db.query('BEGIN');

    try {
      for (const update of updates) {
        const query = `
          UPDATE feature_flags 
          SET 
            enabled = COALESCE($1, enabled),
            rollout_percentage = COALESCE($2, rollout_percentage),
            config = COALESCE($3, config),
            updated_at = NOW()
          WHERE company_id = $4 
          AND feature_name = $5 
          AND environment = $6
          AND deleted_at IS NULL
          RETURNING *
        `;

        const values = [
          update.enabled,
          update.rolloutPercentage,
          update.config ? JSON.stringify(update.config) : null,
          companyId,
          update.featureName,
          environment
        ];

        const result = await this.db.query(query, values);

        if (result.rows.length > 0) {
          updatedFlags.push(this.mapRowToFeatureFlag(result.rows[0]));
        }
      }

      await this.db.query('COMMIT');

      this.logger.info('Bulk update completed', {
        companyId,
        environment,
        updatedCount: updatedFlags.length
      });

      return updatedFlags;

    } catch (error) {
      await this.db.query('ROLLBACK');
      this.logger.error('Bulk update failed', {
        error: error.message,
        companyId,
        environment
      });
      throw new Error('Database error during bulk update');
    }
  }

  async bulkToggle(companyId: string, featureNames: string[], enabled: boolean, environment = 'production'): Promise<number> {
    const query = `
      UPDATE feature_flags 
      SET enabled = $1, updated_at = NOW()
      WHERE company_id = $2 
      AND environment = $3
      AND feature_name = ANY($4)
      AND deleted_at IS NULL
    `;

    try {
      const result = await this.db.query(query, [enabled, companyId, environment, featureNames]);

      this.logger.info('Feature flags bulk toggled', {
        companyId,
        environment,
        featureNames,
        enabled,
        affectedCount: result.rowCount
      });

      return result.rowCount || 0;

    } catch (error) {
      this.logger.error('Bulk toggle failed', {
        error: error.message,
        companyId,
        featureNames,
        enabled,
        environment
      });
      throw new Error('Database error during bulk toggle');
    }
  }

  async cleanupExpired(): Promise<number> {
    const query = `
      UPDATE feature_flags 
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE expires_at < NOW() 
      AND deleted_at IS NULL
    `;

    try {
      const result = await this.db.query(query);
      const cleanedCount = result.rowCount || 0;

      if (cleanedCount > 0) {
        this.logger.info('Cleaned up expired feature flags', {
          count: cleanedCount
        });
      }

      return cleanedCount;

    } catch (error) {
      this.logger.error('Feature flags cleanup failed', {
        error: error.message
      });
      throw new Error('Database error during feature flags cleanup');
    }
  }

  /**
   * Maps database row to FeatureFlag object
   */
  private mapRowToFeatureFlag(row: any): FeatureFlag {
    return {
      id: row.id,
      companyId: row.company_id,
      featureName: row.feature_name,
      enabled: row.enabled,
      config: this.parseJson(row.config, {}),
      rolloutPercentage: row.rollout_percentage,
      rolloutRules: this.parseJson(row.rollout_rules, {}),
      environment: row.environment,
      description: row.description,
      category: row.category,
      startsAt: row.starts_at ? new Date(row.starts_at) : undefined,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      createdByUserId: row.created_by_user_id,
      updatedByUserId: row.updated_by_user_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined
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
      this.logger.warn('Failed to parse JSON field in feature flag', {
        error: error.message,
        jsonString: jsonString.substring(0, 100)
      });
      return defaultValue;
    }
  }
}
