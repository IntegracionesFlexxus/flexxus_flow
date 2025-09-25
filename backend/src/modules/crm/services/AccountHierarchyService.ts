/**
 * Account Hierarchy Service
 * Sprint 17: Account Hierarchy Management
 *
 * Manages account hierarchical relationships with circular reference prevention,
 * rollup calculations, and bidirectional navigation.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import winston from 'winston';
import {
  AccountHierarchy,
  HierarchyNode,
  HierarchyMetrics,
  CreateHierarchyDto,
  HierarchyDirection,
  HierarchyValidationResult,
  HierarchyQueryOptions
} from '../types/hierarchy.types';

@injectable()
export class AccountHierarchyService {
  constructor(
    @inject(TYPES.CrmConnection) private db: Pool,
    @inject(TYPES.Logger) private logger: winston.Logger
  ) {}

  /**
   * Creates a new hierarchy relationship between accounts
   * @param companyId - Company ID for multi-tenancy
   * @param data - Hierarchy creation data
   * @returns Created hierarchy relationship
   */
  async createHierarchy(
    companyId: number,
    data: CreateHierarchyDto
  ): Promise<AccountHierarchy> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Validate no circular reference
      const validation = await this.validateHierarchy(
        companyId,
        data.parent_account_id,
        data.child_account_id,
        client
      );

      if (!validation.is_valid) {
        throw new Error(`Hierarchy validation failed: ${validation.errors.join(', ')}`);
      }

      // Create hierarchy relationship
      const result = await client.query(
        `INSERT INTO account_hierarchies
         (company_id, parent_account_id, child_account_id, hierarchy_type_id,
          ownership_percentage, relationship_strength)
         VALUES ($1, $2, $3,
          (SELECT id FROM hierarchy_types WHERE company_id = $1 AND type_code = $4),
          $5, $6)
         RETURNING *`,
        [
          companyId,
          data.parent_account_id,
          data.child_account_id,
          data.hierarchy_type || 'subsidiary',
          data.ownership_percentage || null,
          data.relationship_strength || 'moderate'
        ]
      );

      const hierarchy = result.rows[0];

      // Update hierarchy metadata
      await this.updateHierarchyMetadata(companyId, data.child_account_id, client);
      await this.updateHierarchyMetadata(companyId, data.parent_account_id, client);

      // Recalculate rollup metrics
      await this.recalculateRollupMetrics(companyId, data.parent_account_id, client);

      await client.query('COMMIT');

      this.logger.info('Account hierarchy created', {
        companyId,
        hierarchyId: hierarchy.id,
        parentAccountId: data.parent_account_id,
        childAccountId: data.child_account_id
      });

      return hierarchy;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating account hierarchy', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves account hierarchy tree
   * @param companyId - Company ID
   * @param accountId - Root account ID
   * @param options - Query options
   * @returns Hierarchy tree
   */
  async getAccountHierarchy(
    companyId: number,
    accountId: number,
    options: HierarchyQueryOptions = {}
  ): Promise<HierarchyNode[]> {
    const {
      direction = 'down',
      max_depth = 10,
      include_inactive = false,
      include_metrics = false
    } = options;

    try {
      const result = await this.db.query(
        `SELECT * FROM get_account_hierarchy($1, $2, $3)`,
        [companyId, accountId, direction]
      );

      const nodes = await Promise.all(
        result.rows.map(async (row) => {
          const node: HierarchyNode = {
            account_id: row.account_id,
            parent_account_id: row.parent_account_id,
            level: row.level,
            path: row.path
          };

          // Fetch account details
          const accountResult = await this.db.query(
            `SELECT name, annual_revenue, employees, health_score
             FROM accounts
             WHERE id = $1 AND company_id = $2`,
            [row.account_id, companyId]
          );

          if (accountResult.rows.length > 0) {
            node.account_name = accountResult.rows[0].name;
            if (include_metrics) {
              node.metadata = {
                total_revenue: accountResult.rows[0].annual_revenue,
                ...accountResult.rows[0]
              };
            }
          }

          return node;
        })
      );

      return this.buildHierarchyTree(nodes);
    } catch (error) {
      this.logger.error('Error retrieving account hierarchy', error);
      throw error;
    }
  }

  /**
   * Retrieves hierarchy metrics for an account
   * @param companyId - Company ID
   * @param accountId - Account ID
   * @returns Hierarchy metrics
   */
  async getHierarchyMetrics(
    companyId: number,
    accountId: number
  ): Promise<HierarchyMetrics> {
    try {
      // Get subsidiaries count
      const subsidariesResult = await this.db.query(
        `WITH RECURSIVE hierarchy AS (
          SELECT child_account_id, 1 as level
          FROM account_hierarchies
          WHERE company_id = $1 AND parent_account_id = $2 AND is_active = true

          UNION ALL

          SELECT ah.child_account_id, h.level + 1
          FROM account_hierarchies ah
          JOIN hierarchy h ON h.child_account_id = ah.parent_account_id
          WHERE ah.company_id = $1 AND ah.is_active = true
        )
        SELECT COUNT(*) as total,
               COUNT(CASE WHEN level = 1 THEN 1 END) as direct,
               MAX(level) as max_depth
        FROM hierarchy`,
        [companyId, accountId]
      );

      const subsidiariesData = subsidariesResult.rows[0];

      // Get rollup metrics
      const metricsResult = await this.db.query(
        `SELECT
          SUM(a.annual_revenue) as total_revenue,
          SUM(a.employees) as total_employees
         FROM accounts a
         WHERE a.id IN (
           WITH RECURSIVE hierarchy AS (
             SELECT $2 as account_id
             UNION ALL
             SELECT ah.child_account_id
             FROM account_hierarchies ah
             JOIN hierarchy h ON h.account_id = ah.parent_account_id
             WHERE ah.company_id = $1 AND ah.is_active = true
           )
           SELECT account_id FROM hierarchy
         ) AND a.company_id = $1`,
        [companyId, accountId]
      );

      const metricsData = metricsResult.rows[0];

      return {
        totalSubsidiaries: parseInt(subsidiariesData.total) || 0,
        directChildren: parseInt(subsidiariesData.direct) || 0,
        indirectChildren: parseInt(subsidiariesData.total) - parseInt(subsidiariesData.direct) || 0,
        hierarchyDepth: parseInt(subsidiariesData.max_depth) || 0,
        totalRevenue: parseFloat(metricsData.total_revenue) || 0,
        totalEmployees: parseInt(metricsData.total_employees) || 0
      };
    } catch (error) {
      this.logger.error('Error retrieving hierarchy metrics', error);
      throw error;
    }
  }

  /**
   * Moves an account to a new parent in the hierarchy
   * @param companyId - Company ID
   * @param accountId - Account to move
   * @param newParentId - New parent account
   */
  async moveAccountInHierarchy(
    companyId: number,
    accountId: number,
    newParentId: number
  ): Promise<void> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Validate the move
      const validation = await this.validateHierarchy(
        companyId,
        newParentId,
        accountId,
        client
      );

      if (!validation.is_valid) {
        throw new Error(`Cannot move account: ${validation.errors.join(', ')}`);
      }

      // Deactivate current parent relationship
      await client.query(
        `UPDATE account_hierarchies
         SET is_active = false, valid_to = CURRENT_DATE
         WHERE company_id = $1 AND child_account_id = $2 AND is_active = true`,
        [companyId, accountId]
      );

      // Create new parent relationship
      await client.query(
        `INSERT INTO account_hierarchies
         (company_id, parent_account_id, child_account_id)
         VALUES ($1, $2, $3)`,
        [companyId, newParentId, accountId]
      );

      // Update hierarchy metadata for affected accounts
      await this.updateHierarchyMetadata(companyId, accountId, client);
      await this.updateHierarchyMetadata(companyId, newParentId, client);

      // Recalculate rollup metrics
      await this.recalculateRollupMetrics(companyId, newParentId, client);

      await client.query('COMMIT');

      this.logger.info('Account moved in hierarchy', {
        companyId,
        accountId,
        newParentId
      });
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error moving account in hierarchy', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Removes a hierarchy relationship
   * @param companyId - Company ID
   * @param parentAccountId - Parent account
   * @param childAccountId - Child account
   */
  async removeHierarchyRelationship(
    companyId: number,
    parentAccountId: number,
    childAccountId: number
  ): Promise<void> {
    try {
      await this.db.query(
        `UPDATE account_hierarchies
         SET is_active = false, valid_to = CURRENT_DATE
         WHERE company_id = $1
           AND parent_account_id = $2
           AND child_account_id = $3
           AND is_active = true`,
        [companyId, parentAccountId, childAccountId]
      );

      // Update metadata
      await this.updateHierarchyMetadata(companyId, childAccountId);
      await this.recalculateRollupMetrics(companyId, parentAccountId);

      this.logger.info('Hierarchy relationship removed', {
        companyId,
        parentAccountId,
        childAccountId
      });
    } catch (error) {
      this.logger.error('Error removing hierarchy relationship', error);
      throw error;
    }
  }

  /**
   * Validates hierarchy to prevent circular references
   * @private
   */
  private async validateHierarchy(
    companyId: number,
    parentId: number,
    childId: number,
    client?: any
  ): Promise<HierarchyValidationResult> {
    const db = client || this.db;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if parent and child are the same
    if (parentId === childId) {
      errors.push('Parent and child cannot be the same account');
    }

    // Check for circular reference
    const circularCheck = await db.query(
      `WITH RECURSIVE ancestors AS (
        SELECT parent_account_id
        FROM account_hierarchies
        WHERE company_id = $1 AND child_account_id = $2 AND is_active = true

        UNION ALL

        SELECT ah.parent_account_id
        FROM account_hierarchies ah
        JOIN ancestors a ON a.parent_account_id = ah.child_account_id
        WHERE ah.company_id = $1 AND ah.is_active = true
      )
      SELECT COUNT(*) as count FROM ancestors WHERE parent_account_id = $3`,
      [companyId, parentId, childId]
    );

    const circularReferenceDetected = parseInt(circularCheck.rows[0].count) > 0;
    if (circularReferenceDetected) {
      errors.push('Circular reference detected');
    }

    // Check max depth
    const depthCheck = await db.query(
      `WITH RECURSIVE hierarchy AS (
        SELECT 1 as level
        FROM account_hierarchies
        WHERE company_id = $1 AND child_account_id = $2 AND is_active = true

        UNION ALL

        SELECT h.level + 1
        FROM account_hierarchies ah
        JOIN hierarchy h ON h.level < 10
        WHERE ah.company_id = $1 AND ah.child_account_id = $2 AND ah.is_active = true
      )
      SELECT MAX(level) as max_level FROM hierarchy`,
      [companyId, parentId]
    );

    const maxDepthExceeded = parseInt(depthCheck.rows[0].max_level || 0) >= 10;
    if (maxDepthExceeded) {
      warnings.push('Maximum hierarchy depth (10 levels) would be exceeded');
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      circular_reference_detected: circularReferenceDetected,
      max_depth_exceeded: maxDepthExceeded,
      affected_accounts: []
    };
  }

  /**
   * Updates hierarchy metadata for an account
   * @private
   */
  private async updateHierarchyMetadata(
    companyId: number,
    accountId: number,
    client?: any
  ): Promise<void> {
    const db = client || this.db;

    // Update hierarchy level
    const levelResult = await db.query(
      `WITH RECURSIVE hierarchy AS (
        SELECT 0 as level
        WHERE NOT EXISTS (
          SELECT 1 FROM account_hierarchies
          WHERE company_id = $1 AND child_account_id = $2 AND is_active = true
        )

        UNION ALL

        SELECT h.level + 1
        FROM account_hierarchies ah
        JOIN hierarchy h ON h.level < 10
        JOIN accounts a ON a.id = ah.parent_account_id
        WHERE ah.company_id = $1 AND ah.child_account_id = $2 AND ah.is_active = true
      )
      SELECT MAX(level) as hierarchy_level FROM hierarchy`,
      [companyId, accountId]
    );

    // Update hierarchy path
    const pathResult = await db.query(
      `WITH RECURSIVE hierarchy AS (
        SELECT $2::TEXT as path
        WHERE NOT EXISTS (
          SELECT 1 FROM account_hierarchies
          WHERE company_id = $1 AND child_account_id = $2 AND is_active = true
        )

        UNION ALL

        SELECT ah.parent_account_id::TEXT || '->' || h.path
        FROM account_hierarchies ah
        JOIN hierarchy h ON h.path NOT LIKE '%' || ah.parent_account_id || '%'
        WHERE ah.company_id = $1 AND ah.child_account_id = $2::INTEGER AND ah.is_active = true
      )
      SELECT path FROM hierarchy ORDER BY LENGTH(path) DESC LIMIT 1`,
      [companyId, accountId]
    );

    // Update ultimate parent
    const ultimateParentResult = await db.query(
      `WITH RECURSIVE hierarchy AS (
        SELECT parent_account_id as ultimate_parent
        FROM account_hierarchies
        WHERE company_id = $1 AND child_account_id = $2 AND is_active = true

        UNION ALL

        SELECT ah.parent_account_id
        FROM account_hierarchies ah
        JOIN hierarchy h ON h.ultimate_parent = ah.child_account_id
        WHERE ah.company_id = $1 AND ah.is_active = true
      )
      SELECT ultimate_parent FROM hierarchy
      WHERE ultimate_parent NOT IN (
        SELECT child_account_id FROM account_hierarchies
        WHERE company_id = $1 AND is_active = true
      )
      LIMIT 1`,
      [companyId, accountId]
    );

    // Count total subsidiaries
    const subsidiariesResult = await db.query(
      `WITH RECURSIVE hierarchy AS (
        SELECT child_account_id
        FROM account_hierarchies
        WHERE company_id = $1 AND parent_account_id = $2 AND is_active = true

        UNION ALL

        SELECT ah.child_account_id
        FROM account_hierarchies ah
        JOIN hierarchy h ON h.child_account_id = ah.parent_account_id
        WHERE ah.company_id = $1 AND ah.is_active = true
      )
      SELECT COUNT(*) as total FROM hierarchy`,
      [companyId, accountId]
    );

    // Update account metadata
    await db.query(
      `UPDATE accounts
       SET hierarchy_level = $2,
           hierarchy_path = $3,
           ultimate_parent_id = $4,
           total_subsidiaries = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        accountId,
        levelResult.rows[0].hierarchy_level || 0,
        pathResult.rows[0]?.path || accountId.toString(),
        ultimateParentResult.rows[0]?.ultimate_parent || null,
        parseInt(subsidiariesResult.rows[0].total) || 0
      ]
    );
  }

  /**
   * Recalculates rollup metrics for an account
   * @private
   */
  private async recalculateRollupMetrics(
    companyId: number,
    accountId: number,
    client?: any
  ): Promise<void> {
    const db = client || this.db;

    const metrics = ['total_revenue', 'total_employees', 'total_opportunities'];

    for (const metric of metrics) {
      let query = '';

      switch (metric) {
        case 'total_revenue':
          query = `
            WITH RECURSIVE hierarchy AS (
              SELECT $2 as account_id
              UNION ALL
              SELECT ah.child_account_id
              FROM account_hierarchies ah
              JOIN hierarchy h ON h.account_id = ah.parent_account_id
              WHERE ah.company_id = $1 AND ah.is_active = true
            )
            SELECT SUM(a.annual_revenue) as value
            FROM accounts a
            JOIN hierarchy h ON h.account_id = a.id
            WHERE a.company_id = $1`;
          break;

        case 'total_employees':
          query = `
            WITH RECURSIVE hierarchy AS (
              SELECT $2 as account_id
              UNION ALL
              SELECT ah.child_account_id
              FROM account_hierarchies ah
              JOIN hierarchy h ON h.account_id = ah.parent_account_id
              WHERE ah.company_id = $1 AND ah.is_active = true
            )
            SELECT SUM(a.employees) as value
            FROM accounts a
            JOIN hierarchy h ON h.account_id = a.id
            WHERE a.company_id = $1`;
          break;

        case 'total_opportunities':
          query = `
            WITH RECURSIVE hierarchy AS (
              SELECT $2 as account_id
              UNION ALL
              SELECT ah.child_account_id
              FROM account_hierarchies ah
              JOIN hierarchy h ON h.account_id = ah.parent_account_id
              WHERE ah.company_id = $1 AND ah.is_active = true
            )
            SELECT COUNT(o.id) as value
            FROM opportunities o
            JOIN hierarchy h ON h.account_id = o.account_id
            WHERE o.company_id = $1 AND o.stage NOT IN ('closed_won', 'closed_lost')`;
          break;
      }

      const result = await db.query(query, [companyId, accountId]);
      const value = result.rows[0]?.value || 0;

      // Update cache
      await db.query(
        `INSERT INTO account_rollup_cache
         (company_id, account_id, metric_type, metric_value, calculation_date)
         VALUES ($1, $2, $3, $4, CURRENT_DATE)
         ON CONFLICT (company_id, account_id, metric_type, calculation_date)
         DO UPDATE SET metric_value = $4, created_at = CURRENT_TIMESTAMP`,
        [companyId, accountId, metric, value]
      );
    }
  }

  /**
   * Builds a hierarchical tree from flat nodes
   * @private
   */
  private buildHierarchyTree(nodes: HierarchyNode[]): HierarchyNode[] {
    const nodeMap = new Map<number, HierarchyNode>();
    const rootNodes: HierarchyNode[] = [];

    // First pass: create node map
    nodes.forEach(node => {
      node.children = [];
      nodeMap.set(node.account_id, node);
    });

    // Second pass: build tree structure
    nodes.forEach(node => {
      if (node.parent_account_id) {
        const parent = nodeMap.get(node.parent_account_id);
        if (parent) {
          parent.children!.push(node);
        } else {
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }
}