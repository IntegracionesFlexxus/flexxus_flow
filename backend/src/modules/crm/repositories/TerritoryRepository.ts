/**
 * Territory Repository
 * Data access layer for territory management
 */

import { injectable } from 'inversify';
import { CRMBaseRepository } from './CRMBaseRepository';
import { Territory } from '../types/territory.types';

@injectable()
export class TerritoryRepository extends CRMBaseRepository<Territory> {
  constructor() {
    super('territories');
    this.schema = 'public'; // Sprint 17 uses public schema

    this.allowedFields = new Set([
      'id', 'company_id', 'name', 'code', 'type', 'parent_territory_id',
      'owner_id', 'status', 'rules', 'coverage_area', 'performance_targets',
      'metadata', 'created_at', 'updated_at', 'created_by', 'updated_by'
    ]);
  }

  /**
   * Get territories by type
   */
  async getTerritoriesByType(
    companyId: number,
    type: string
  ): Promise<Territory[]> {
    const query = `
      SELECT t.*, u.name as owner_name
      FROM ${this.schema}.${this.tableName} t
      LEFT JOIN ${this.schema}.users u ON t.owner_id = u.id
      WHERE t.company_id = $1 AND t.type = $2 AND t.status = 'active'
      ORDER BY t.name
    `;

    const result = await this.db.query(query, [companyId, type]);
    return result.rows;
  }

  /**
   * Get territory with hierarchy
   */
  async getTerritoryWithHierarchy(
    companyId: number,
    territoryId: number
  ): Promise<any> {
    const query = `
      WITH RECURSIVE territory_tree AS (
        SELECT
          t.*,
          0 as level,
          ARRAY[t.id] as path
        FROM ${this.schema}.${this.tableName} t
        WHERE t.company_id = $1 AND t.id = $2

        UNION ALL

        SELECT
          t.*,
          tt.level + 1,
          tt.path || t.id
        FROM territory_tree tt
        JOIN ${this.schema}.${this.tableName} t ON t.parent_territory_id = tt.id
        WHERE t.company_id = $1
      )
      SELECT * FROM territory_tree
      ORDER BY path
    `;

    const result = await this.db.query(query, [companyId, territoryId]);
    return this.buildTerritoryTree(result.rows);
  }

  /**
   * Get territory assignments
   */
  async getTerritoryAssignments(
    companyId: number,
    territoryId: number
  ): Promise<any[]> {
    const query = `
      SELECT
        ta.*,
        a.name as account_name,
        a.type as account_type,
        a.annual_revenue
      FROM ${this.schema}.territory_assignments ta
      JOIN ${this.schema}.accounts a ON ta.account_id = a.id
      WHERE ta.company_id = $1
        AND ta.territory_id = $2
        AND ta.status = 'active'
      ORDER BY ta.assigned_at DESC
    `;

    const result = await this.db.query(query, [companyId, territoryId]);
    return result.rows;
  }

  /**
   * Get territory performance metrics
   */
  async getTerritoryPerformance(
    companyId: number,
    territoryId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const query = `
      SELECT
        t.id,
        t.name,
        t.performance_targets,
        COUNT(DISTINCT ta.account_id) as total_accounts,
        COUNT(DISTINCT o.id) as total_opportunities,
        COALESCE(SUM(o.expected_revenue), 0) as pipeline_value,
        COALESCE(SUM(CASE WHEN o.stage = 'closed_won' THEN o.expected_revenue ELSE 0 END), 0) as closed_revenue,
        COALESCE(AVG(o.probability), 0) as avg_probability,
        COUNT(DISTINCT CASE WHEN o.stage = 'closed_won' THEN o.id END) as won_deals,
        COUNT(DISTINCT CASE WHEN o.stage = 'closed_lost' THEN o.id END) as lost_deals
      FROM ${this.schema}.${this.tableName} t
      LEFT JOIN ${this.schema}.territory_assignments ta ON t.id = ta.territory_id
      LEFT JOIN ${this.schema}.accounts a ON ta.account_id = a.id
      LEFT JOIN ${this.schema}.opportunities o ON a.id = o.account_id
        AND ($3::timestamp IS NULL OR o.created_at >= $3)
        AND ($4::timestamp IS NULL OR o.created_at <= $4)
      WHERE t.company_id = $1 AND t.id = $2
      GROUP BY t.id, t.name, t.performance_targets
    `;

    const result = await this.db.query(query, [
      companyId,
      territoryId,
      startDate || null,
      endDate || null
    ]);

    return result.rows[0];
  }

  /**
   * Get territories by owner
   */
  async getTerritoriesByOwner(
    companyId: number,
    ownerId: number
  ): Promise<Territory[]> {
    const query = `
      SELECT
        t.*,
        COUNT(DISTINCT ta.account_id) as account_count,
        COUNT(DISTINCT tp.id) as child_territory_count
      FROM ${this.schema}.${this.tableName} t
      LEFT JOIN ${this.schema}.territory_assignments ta ON t.id = ta.territory_id AND ta.status = 'active'
      LEFT JOIN ${this.schema}.${this.tableName} tp ON t.id = tp.parent_territory_id
      WHERE t.company_id = $1 AND t.owner_id = $2 AND t.status = 'active'
      GROUP BY t.id
      ORDER BY t.name
    `;

    const result = await this.db.query(query, [companyId, ownerId]);
    return result.rows;
  }

  /**
   * Check territory overlap
   */
  async checkTerritoryOverlap(
    companyId: number,
    rules: any,
    excludeTerritoryId?: number
  ): Promise<boolean> {
    let query = `
      SELECT EXISTS(
        SELECT 1
        FROM ${this.schema}.${this.tableName}
        WHERE company_id = $1
          AND status = 'active'
          AND rules @> $2::jsonb
    `;

    const params = [companyId, JSON.stringify(rules)];

    if (excludeTerritoryId) {
      query += ' AND id != $3';
      params.push(excludeTerritoryId);
    }

    query += ') as has_overlap';

    const result = await this.db.query(query, params);
    return result.rows[0]?.has_overlap || false;
  }

  /**
   * Get unassigned accounts
   */
  async getUnassignedAccounts(
    companyId: number,
    filters?: any
  ): Promise<any[]> {
    let query = `
      SELECT a.*
      FROM ${this.schema}.accounts a
      LEFT JOIN ${this.schema}.territory_assignments ta
        ON a.id = ta.account_id AND ta.status = 'active'
      WHERE a.company_id = $1
        AND ta.id IS NULL
        AND a.is_active = true
    `;

    const params = [companyId];

    if (filters?.type) {
      query += ' AND a.type = $2';
      params.push(filters.type);
    }

    if (filters?.industry) {
      query += ` AND a.industry = $${params.length + 1}`;
      params.push(filters.industry);
    }

    query += ' ORDER BY a.annual_revenue DESC NULLS LAST, a.name';

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Bulk assign accounts to territory
   */
  async bulkAssignAccounts(
    companyId: number,
    territoryId: number,
    accountIds: number[],
    assignedBy: number
  ): Promise<any[]> {
    const query = `
      INSERT INTO ${this.schema}.territory_assignments (
        company_id, territory_id, account_id, assigned_by, assigned_at, status
      )
      SELECT $1, $2, unnest($3::integer[]), $4, CURRENT_TIMESTAMP, 'active'
      ON CONFLICT (company_id, account_id, territory_id)
      DO UPDATE SET
        status = 'active',
        assigned_by = EXCLUDED.assigned_by,
        assigned_at = EXCLUDED.assigned_at
      RETURNING *
    `;

    const result = await this.db.query(query, [
      companyId,
      territoryId,
      accountIds,
      assignedBy
    ]);

    return result.rows;
  }

  /**
   * Build territory tree structure
   */
  private buildTerritoryTree(flatData: any[]): any {
    if (flatData.length === 0) return null;

    const nodeMap = new Map();
    const rootNode = flatData[0];

    flatData.forEach(node => {
      nodeMap.set(node.id, {
        ...node,
        children: []
      });
    });

    flatData.forEach(node => {
      if (node.parent_territory_id) {
        const parent = nodeMap.get(node.parent_territory_id);
        if (parent) {
          parent.children.push(nodeMap.get(node.id));
        }
      }
    });

    return nodeMap.get(rootNode.id);
  }
}