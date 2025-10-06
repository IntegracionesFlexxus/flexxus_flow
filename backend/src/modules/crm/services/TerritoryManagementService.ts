/**
 * Territory Management Service
 * Sprint 17: Territory Management System
 *
 * Manages territory assignments, coverage rules, and automatic account distribution
 * with support for geographic, industry, and hybrid territory models.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import winston from 'winston';
import {
  Territory,
  TerritoryType,
  TerritoryAssignment,
  TerritoryMetrics,
  TerritoryBalance,
  CreateTerritoryDto,
  UpdateTerritoryDto,
  AssignUserToTerritoryDto,
  TerritoryRebalanceRequest,
  TerritoryRebalanceResult,
  TerritoryRules
} from '../types/territory.types';

@injectable()
export class TerritoryManagementService {
  private readonly MAX_ASSIGNMENT_PERCENTAGE = 100;
  private readonly DEFAULT_MAX_ACCOUNTS = 150;
  private readonly DEFAULT_MIN_ACCOUNTS = 20;

  constructor(
    @inject(TYPES.CrmConnection) private db: Pool,
    @inject(TYPES.Logger) private logger: winston.Logger
  ) {}

  /**
   * Creates a new territory
   * @param companyId - Company ID
   * @param data - Territory creation data
   * @returns Created territory
   */
  async createTerritory(
    companyId: number,
    data: CreateTerritoryDto
  ): Promise<Territory> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Validate territory code uniqueness
      const existing = await client.query(
        'SELECT id FROM territories WHERE company_id = $1 AND territory_code = $2',
        [companyId, data.territory_code]
      );

      if (existing.rows.length > 0) {
        throw new Error(`Territory with code ${data.territory_code} already exists`);
      }

      // Create territory
      const result = await client.query(
        `INSERT INTO territories
         (company_id, territory_code, territory_name, territory_type,
          parent_territory_id, coverage_rules, performance_targets, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          companyId,
          data.territory_code,
          data.territory_name,
          data.territory_type,
          data.parent_territory_id || null,
          JSON.stringify(data.coverage_rules || {}),
          JSON.stringify(data.performance_targets || {}),
          JSON.stringify(data.metadata || {})
        ]
      );

      const territory = result.rows[0];

      // Create coverage records
      await this.saveTerritoryCoverage(territory.id, data.coverage_rules, client);

      // Auto-assign accounts based on rules
      await this.assignAccountsToTerritory(companyId, territory.id, client);

      await client.query('COMMIT');

      this.logger.info('Territory created', {
        companyId,
        territoryId: territory.id,
        territoryCode: data.territory_code
      });

      return territory;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating territory', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Updates an existing territory
   * @param companyId - Company ID
   * @param territoryId - Territory ID
   * @param data - Update data
   * @returns Updated territory
   */
  async updateTerritory(
    companyId: number,
    territoryId: number,
    data: UpdateTerritoryDto
  ): Promise<Territory> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Update territory
      const updates: string[] = [];
      const values: any[] = [territoryId, companyId];
      let paramCounter = 3;

      if (data.territory_name !== undefined) {
        updates.push(`territory_name = $${paramCounter++}`);
        values.push(data.territory_name);
      }
      if (data.parent_territory_id !== undefined) {
        updates.push(`parent_territory_id = $${paramCounter++}`);
        values.push(Number(data.parent_territory_id));
      }
      if (data.coverage_rules !== undefined) {
        updates.push(`coverage_rules = $${paramCounter++}`);
        values.push(JSON.stringify(data.coverage_rules));
      }
      if (data.performance_targets !== undefined) {
        updates.push(`performance_targets = $${paramCounter++}`);
        values.push(JSON.stringify(data.performance_targets));
      }
      if (data.metadata !== undefined) {
        updates.push(`metadata = $${paramCounter++}`);
        values.push(JSON.stringify(data.metadata));
      }
      if (data.is_active !== undefined) {
        updates.push(`is_active = $${paramCounter++}`);
        values.push(data.is_active ? 1 : 0);
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');

      const result = await client.query(
        `UPDATE territories
         SET ${updates.join(', ')}
         WHERE id = $1 AND company_id = $2
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Territory not found');
      }

      const territory = result.rows[0];

      // Update coverage if rules changed
      if (data.coverage_rules) {
        await this.saveTerritoryCoverage(territoryId, data.coverage_rules, client);
        await this.reassignAccountsBasedOnRules(companyId, territoryId, client);
      }

      await client.query('COMMIT');

      this.logger.info('Territory updated', {
        companyId,
        territoryId
      });

      return territory;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating territory', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Assigns a user to a territory
   * @param companyId - Company ID
   * @param territoryId - Territory ID
   * @param data - Assignment data
   * @returns Territory assignment
   */
  async assignUserToTerritory(
    companyId: number,
    territoryId: number,
    data: AssignUserToTerritoryDto
  ): Promise<TerritoryAssignment> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Check if assignment percentage is available
      const existingAssignments = await client.query(
        `SELECT SUM(assignment_percentage) as total
         FROM territory_assignments
         WHERE company_id = $1 AND territory_id = $2
           AND user_id != $3 AND end_date IS NULL`,
        [companyId, territoryId, data.user_id]
      );

      const currentTotal = parseFloat(existingAssignments.rows[0].total || 0);
      const requestedPercentage = data.assignment_percentage || 100;

      if (currentTotal + requestedPercentage > this.MAX_ASSIGNMENT_PERCENTAGE) {
        throw new Error(
          `Assignment would exceed 100% capacity. Available: ${this.MAX_ASSIGNMENT_PERCENTAGE - currentTotal}%`
        );
      }

      // End any existing assignment for this user in this territory
      await client.query(
        `UPDATE territory_assignments
         SET end_date = CURRENT_DATE
         WHERE company_id = $1 AND territory_id = $2 AND user_id = $3 AND end_date IS NULL`,
        [companyId, territoryId, data.user_id]
      );

      // Create new assignment
      const result = await client.query(
        `INSERT INTO territory_assignments
         (company_id, territory_id, user_id, role, assignment_percentage,
          start_date, is_primary)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          companyId,
          territoryId,
          data.user_id,
          data.role,
          requestedPercentage,
          data.start_date || new Date(),
          data.is_primary || false
        ]
      );

      await client.query('COMMIT');

      this.logger.info('User assigned to territory', {
        companyId,
        territoryId,
        userId: data.user_id,
        role: data.role
      });

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error assigning user to territory', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Gets territory metrics
   * @param companyId - Company ID
   * @param territoryId - Territory ID
   * @returns Territory metrics
   */
  async getTerritoryMetrics(
    companyId: number,
    territoryId: number
  ): Promise<TerritoryMetrics> {
    try {
      // Get basic metrics
      const metricsResult = await this.db.query(
        `SELECT
          COUNT(DISTINCT a.id) as total_accounts,
          SUM(a.annual_revenue) as total_revenue,
          AVG(a.health_score) as average_health,
          COUNT(DISTINCT ta.user_id) as assigned_users,
          COUNT(DISTINCT o.id) as opportunities_count,
          SUM(o.value) as pipeline_value
         FROM accounts a
         LEFT JOIN territory_assignments ta ON ta.territory_id = $2
           AND ta.company_id = $1 AND ta.end_date IS NULL
         LEFT JOIN opportunities o ON o.account_id = a.id
           AND o.company_id = $1
           AND o.stage NOT IN ('closed_won', 'closed_lost')
         WHERE a.company_id = $1 AND a.territory_id = $2
           AND a.is_active = true`,
        [companyId, territoryId]
      );

      const metrics = metricsResult.rows[0];

      // Calculate conversion rate
      const conversionResult = await this.db.query(
        `SELECT
          COUNT(CASE WHEN stage = 'closed_won' THEN 1 END)::FLOAT /
          NULLIF(COUNT(*), 0) * 100 as conversion_rate,
          AVG(CASE WHEN stage = 'closed_won' THEN value END) as avg_deal_size
         FROM opportunities
         WHERE company_id = $1
           AND account_id IN (
             SELECT id FROM accounts
             WHERE company_id = $1 AND territory_id = $2
           )
           AND closed_date >= CURRENT_DATE - INTERVAL '90 days'`,
        [companyId, territoryId]
      );

      const conversionData = conversionResult.rows[0];

      // Calculate coverage
      const coverageResult = await this.db.query(
        `SELECT
          COUNT(DISTINCT a.id)::FLOAT /
          NULLIF((
            SELECT COUNT(*) FROM accounts
            WHERE company_id = $1 AND is_active = true
          ), 0) * 100 as coverage_percentage
         FROM accounts a
         WHERE a.company_id = $1 AND a.territory_id = $2`,
        [companyId, territoryId]
      );

      return {
        territory_id: territoryId,
        total_accounts: parseInt(metrics.total_accounts) || 0,
        total_revenue: parseFloat(metrics.total_revenue) || 0,
        average_account_health: parseFloat(metrics.average_health) || 0,
        assigned_users: parseInt(metrics.assigned_users) || 0,
        coverage_percentage: parseFloat(coverageResult.rows[0].coverage_percentage) || 0,
        performance_score: this.calculatePerformanceScore(metrics),
        opportunities_in_pipeline: parseInt(metrics.opportunities_count) || 0,
        conversion_rate: parseFloat(conversionData.conversion_rate) || 0,
        average_deal_size: parseFloat(conversionData.avg_deal_size) || 0
      };
    } catch (error) {
      this.logger.error('Error getting territory metrics', error);
      throw error;
    }
  }

  /**
   * Finds the optimal territory for an account
   * @param companyId - Company ID
   * @param accountId - Account ID
   * @returns Optimal territory or null
   */
  async getOptimalTerritoryForAccount(
    companyId: number,
    accountId: number
  ): Promise<Territory | null> {
    try {
      // Get account details
      const accountResult = await this.db.query(
        `SELECT * FROM accounts WHERE id = $1 AND company_id = $2`,
        [accountId, companyId]
      );

      if (accountResult.rows.length === 0) {
        return null;
      }

      const account = accountResult.rows[0];

      // Get all active territories
      const territoriesResult = await this.db.query(
        `SELECT * FROM territories
         WHERE company_id = $1 AND is_active = true`,
        [companyId]
      );

      let bestTerritory: Territory | null = null;
      let bestScore = 0;

      for (const territory of territoriesResult.rows) {
        const score = await this.calculateTerritoryMatchScore(account, territory);

        if (score > bestScore) {
          bestScore = score;
          bestTerritory = territory;
        }
      }

      return bestTerritory;
    } catch (error) {
      this.logger.error('Error finding optimal territory', error);
      throw error;
    }
  }

  /**
   * Rebalances territories to optimize workload distribution
   * @param companyId - Company ID
   * @param request - Rebalance request
   * @returns Rebalance result
   */
  async rebalanceTerritories(
    companyId: number,
    request: TerritoryRebalanceRequest
  ): Promise<TerritoryRebalanceResult> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const territoryIds = request.territory_ids || await this.getAllTerritoryIds(companyId);
      const reassignments: any[] = [];

      // Analyze current balance
      const balanceAnalysis = await Promise.all(
        territoryIds.map(id => this.analyzeTerritoryBalance(companyId, id))
      );

      // Identify overloaded and underutilized territories
      const overloaded = balanceAnalysis.filter(b => b.is_overloaded);
      const underutilized = balanceAnalysis.filter(b => b.is_underutilized);

      // Perform rebalancing
      for (const territory of overloaded) {
        const accountsToMove = await this.selectAccountsToMove(
          companyId,
          territory.territory_id,
          request
        );

        for (const accountId of accountsToMove) {
          // Find best target territory
          const targetTerritory = underutilized.sort(
            (a, b) => a.workload_score - b.workload_score
          )[0];

          if (targetTerritory) {
            // Move account
            await client.query(
              `UPDATE accounts
               SET territory_id = $1, updated_at = CURRENT_TIMESTAMP
               WHERE id = $2 AND company_id = $3`,
              [targetTerritory.territory_id, accountId, companyId]
            );

            reassignments.push({
              account_id: accountId,
              from_territory_id: territory.territory_id,
              to_territory_id: targetTerritory.territory_id,
              reason: 'Workload rebalancing'
            });

            // Update workload scores
            targetTerritory.workload_score += 1;
          }
        }
      }

      await client.query('COMMIT');

      this.logger.info('Territories rebalanced', {
        companyId,
        territoriesAffected: balanceAnalysis.length,
        accountsReassigned: reassignments.length
      });

      return {
        territories_affected: balanceAnalysis.length,
        accounts_reassigned: reassignments.length,
        users_affected: await this.countAffectedUsers(companyId, territoryIds),
        new_assignments: reassignments,
        estimated_improvement: this.estimateImprovementScore(balanceAnalysis)
      };
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error rebalancing territories', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Gets all territories for a company
   * @param companyId - Company ID
   * @returns List of territories
   */
  async getTerritories(companyId: number): Promise<Territory[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM territories
         WHERE company_id = $1
         ORDER BY territory_name`,
        [companyId]
      );

      return result.rows;
    } catch (error) {
      this.logger.error('Error getting territories', error);
      throw error;
    }
  }

  /**
   * Deletes a territory
   * @param companyId - Company ID
   * @param territoryId - Territory ID
   */
  async deleteTerritory(companyId: number, territoryId: number): Promise<void> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Check if territory has accounts
      const accountsResult = await client.query(
        `SELECT COUNT(*) as count FROM accounts
         WHERE company_id = $1 AND territory_id = $2`,
        [companyId, territoryId]
      );

      if (parseInt(accountsResult.rows[0].count) > 0) {
        throw new Error('Cannot delete territory with assigned accounts');
      }

      // End all assignments
      await client.query(
        `UPDATE territory_assignments
         SET end_date = CURRENT_DATE
         WHERE company_id = $1 AND territory_id = $2 AND end_date IS NULL`,
        [companyId, territoryId]
      );

      // Soft delete territory
      await client.query(
        `UPDATE territories
         SET is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND company_id = $2`,
        [territoryId, companyId]
      );

      await client.query('COMMIT');

      this.logger.info('Territory deleted', {
        companyId,
        territoryId
      });
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error deleting territory', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Saves territory coverage details
   * @private
   */
  private async saveTerritoryCoverage(
    territoryId: number,
    rules: TerritoryRules | undefined,
    client: any
  ): Promise<void> {
    if (!rules) return;

    // Clear existing coverage
    await client.query(
      'DELETE FROM territory_geographic_coverage WHERE territory_id = $1',
      [territoryId]
    );
    await client.query(
      'DELETE FROM territory_industry_coverage WHERE territory_id = $1',
      [territoryId]
    );

    // Save geographic coverage
    if (rules.countries || rules.states || rules.cities) {
      const geoInserts = [];

      if (rules.countries) {
        for (const country of rules.countries) {
          geoInserts.push([territoryId, country, null, null, null]);
        }
      }

      if (rules.states) {
        for (const state of rules.states) {
          geoInserts.push([territoryId, null, state, null, null]);
        }
      }

      if (rules.cities) {
        for (const city of rules.cities) {
          geoInserts.push([territoryId, null, null, city, null]);
        }
      }

      if (geoInserts.length > 0) {
        const values = geoInserts.flat();
        const placeholders = geoInserts.map(
          (_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`
        ).join(',');

        await client.query(
          `INSERT INTO territory_geographic_coverage
           (territory_id, country_code, state_province, city, postal_code_pattern)
           VALUES ${placeholders}`,
          values
        );
      }
    }

    // Save industry coverage
    if (rules.industries || rules.sub_industries) {
      const indInserts = [];

      if (rules.industries) {
        for (const industry of rules.industries) {
          indInserts.push([territoryId, industry, null]);
        }
      }

      if (rules.sub_industries) {
        for (const subIndustry of rules.sub_industries) {
          indInserts.push([territoryId, null, subIndustry]);
        }
      }

      if (indInserts.length > 0) {
        const values = indInserts.flat();
        const placeholders = indInserts.map(
          (_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`
        ).join(',');

        await client.query(
          `INSERT INTO territory_industry_coverage
           (territory_id, industry_code, sub_industry_code)
           VALUES ${placeholders}`,
          values
        );
      }
    }
  }

  /**
   * Assigns accounts to territory based on rules
   * @private
   */
  private async assignAccountsToTerritory(
    companyId: number,
    territoryId: number,
    client: any
  ): Promise<void> {
    const territory = await client.query(
      'SELECT * FROM territories WHERE id = $1',
      [territoryId]
    );

    if (territory.rows.length === 0) return;

    const rules = territory.rows[0].coverage_rules as TerritoryRules;
    if (!rules) return;

    let whereConditions = ['company_id = $1', 'territory_id IS NULL'];
    const params = [companyId];
    let paramCounter = 2;

    // Build WHERE clause based on rules
    if (rules.countries && rules.countries.length > 0) {
      whereConditions.push(`country IN (${rules.countries.map(() => `$${paramCounter++}`).join(',')})`);
      params.push(...rules.countries.map(Number));
    }

    if (rules.industries && rules.industries.length > 0) {
      whereConditions.push(`industry IN (${rules.industries.map(() => `$${paramCounter++}`).join(',')})`);
      params.push(...rules.industries.map(Number));
    }

    if (rules.account_tiers && rules.account_tiers.length > 0) {
      whereConditions.push(`account_tier IN (${rules.account_tiers.map(() => `$${paramCounter++}`).join(',')})`);
      params.push(...rules.account_tiers.map(Number));
    }

    if (rules.revenue_range) {
      if (rules.revenue_range.min !== undefined) {
        whereConditions.push(`annual_revenue >= $${paramCounter++}`);
        params.push(rules.revenue_range.min);
      }
      if (rules.revenue_range.max !== undefined) {
        whereConditions.push(`annual_revenue <= $${paramCounter++}`);
        params.push(rules.revenue_range.max);
      }
    }

    // Update matching accounts
    params.push(territoryId);
    await client.query(
      `UPDATE accounts
       SET territory_id = $${paramCounter}, updated_at = CURRENT_TIMESTAMP
       WHERE ${whereConditions.join(' AND ')}`,
      params
    );
  }

  /**
   * Reassigns accounts based on updated rules
   * @private
   */
  private async reassignAccountsBasedOnRules(
    companyId: number,
    territoryId: number,
    client: any
  ): Promise<void> {
    // Remove accounts that no longer match
    await client.query(
      `UPDATE accounts
       SET territory_id = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE company_id = $1 AND territory_id = $2`,
      [companyId, territoryId]
    );

    // Reassign accounts that match new rules
    await this.assignAccountsToTerritory(companyId, territoryId, client);
  }

  /**
   * Calculates territory match score for an account
   * @private
   */
  private async calculateTerritoryMatchScore(
    account: any,
    territory: Territory
  ): Promise<number> {
    let score = 0;
    const rules = territory.coverage_rules as TerritoryRules;

    if (!rules) return 0;

    // Geographic match
    if (rules.countries?.includes(account.country)) score += 30;
    if (rules.states?.includes(account.state)) score += 20;
    if (rules.cities?.includes(account.city)) score += 10;

    // Industry match
    if (rules.industries?.includes(account.industry)) score += 25;

    // Account tier match
    if (rules.account_tiers?.includes(account.account_tier)) score += 15;

    // Revenue range match
    if (rules.revenue_range) {
      const revenue = account.annual_revenue || 0;
      if (revenue >= (rules.revenue_range.min || 0) &&
          revenue <= (rules.revenue_range.max || Infinity)) {
        score += 20;
      }
    }

    return score;
  }

  /**
   * Analyzes territory balance
   * @private
   */
  private async analyzeTerritoryBalance(
    companyId: number,
    territoryId: number
  ): Promise<TerritoryBalance> {
    const metrics = await this.getTerritoryMetrics(companyId, territoryId);

    const workloadScore = metrics.total_accounts / metrics.assigned_users;
    const isOverloaded = workloadScore > this.DEFAULT_MAX_ACCOUNTS;
    const isUnderutilized = workloadScore < this.DEFAULT_MIN_ACCOUNTS;

    const recommendations = [];
    if (isOverloaded) {
      recommendations.push('Reduce account load through reassignment');
      recommendations.push('Consider adding more resources');
    }
    if (isUnderutilized) {
      recommendations.push('Territory can handle more accounts');
      recommendations.push('Consider merging with adjacent territory');
    }

    return {
      territory_id: territoryId,
      territory_name: '', // Would need another query
      workload_score,
      is_overloaded: isOverloaded,
      is_underutilized: isUnderutilized,
      recommended_actions: recommendations
    };
  }

  /**
   * Selects accounts to move for rebalancing
   * @private
   */
  private async selectAccountsToMove(
    companyId: number,
    territoryId: number,
    request: TerritoryRebalanceRequest
  ): Promise<number[]> {
    const result = await this.db.query(
      `SELECT id FROM accounts
       WHERE company_id = $1 AND territory_id = $2
       ORDER BY health_score ASC, annual_revenue ASC
       LIMIT $3`,
      [companyId, territoryId, request.max_accounts_per_rep || 10]
    );

    return result.rows.map(r => r.id);
  }

  /**
   * Gets all territory IDs for a company
   * @private
   */
  private async getAllTerritoryIds(companyId: number): Promise<number[]> {
    const result = await this.db.query(
      'SELECT id FROM territories WHERE company_id = $1 AND is_active = true',
      [companyId]
    );

    return result.rows.map(r => r.id);
  }

  /**
   * Counts affected users in territories
   * @private
   */
  private async countAffectedUsers(
    companyId: number,
    territoryIds: number[]
  ): Promise<number> {
    const result = await this.db.query(
      `SELECT COUNT(DISTINCT user_id) as count
       FROM territory_assignments
       WHERE company_id = $1 AND territory_id = ANY($2) AND end_date IS NULL`,
      [companyId, territoryIds]
    );

    return parseInt(result.rows[0].count) || 0;
  }

  /**
   * Calculates performance score for metrics
   * @private
   */
  private calculatePerformanceScore(metrics: any): number {
    // Simple weighted average of key metrics
    const revenueScore = Math.min(100, (metrics.total_revenue / 1000000) * 10);
    const healthScore = metrics.average_health || 0;
    const opportunityScore = Math.min(100, (metrics.opportunities_count / 10) * 10);

    return Math.round((revenueScore * 0.4 + healthScore * 0.3 + opportunityScore * 0.3));
  }

  /**
   * Estimates improvement score from rebalancing
   * @private
   */
  private estimateImprovementScore(balanceAnalysis: TerritoryBalance[]): number {
    const overloadedCount = balanceAnalysis.filter(b => b.is_overloaded).length;
    const underutilizedCount = balanceAnalysis.filter(b => b.is_underutilized).length;
    const balancedCount = balanceAnalysis.length - overloadedCount - underutilizedCount;

    return Math.round((balancedCount / balanceAnalysis.length) * 100);
  }
}