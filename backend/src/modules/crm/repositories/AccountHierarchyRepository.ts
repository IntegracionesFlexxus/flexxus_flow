/**
 * Account Hierarchy Repository
 * Data access layer for account hierarchy management
 */

import { injectable } from 'inversify';
import { CRMBaseRepository } from './CRMBaseRepository';
import { AccountHierarchy } from '../types/hierarchy.types';

@injectable()
export class AccountHierarchyRepository extends CRMBaseRepository<AccountHierarchy> {
  constructor() {
    super('account_hierarchies');
    this.schema = 'public'; // Sprint 17 uses public schema

    this.allowedFields = new Set([
      'id', 'company_id', 'parent_account_id', 'child_account_id',
      'hierarchy_type_id', 'relationship_strength', 'ownership_percentage',
      'is_primary', 'valid_from', 'valid_to', 'hierarchy_level',
      'hierarchy_path', 'notes', 'metadata', 'created_at', 'updated_at',
      'created_by', 'updated_by'
    ]);
  }

  /**
   * Get account hierarchy by parent and child
   */
  async getHierarchyByAccounts(
    companyId: number,
    parentAccountId: number,
    childAccountId: number
  ): Promise<AccountHierarchy | null> {
    const query = `
      SELECT * FROM ${this.schema}.${this.tableName}
      WHERE company_id = $1
        AND parent_account_id = $2
        AND child_account_id = $3
        AND (valid_to IS NULL OR valid_to > CURRENT_TIMESTAMP)
    `;

    const result = await this.db.query(query, [companyId, parentAccountId, childAccountId]);
    return result.rows[0] || null;
  }

  /**
   * Get all children for an account
   */
  async getAccountChildren(
    companyId: number,
    parentAccountId: number,
    hierarchyTypeId?: number
  ): Promise<AccountHierarchy[]> {
    let query = `
      SELECT ah.*, a.name as child_account_name, a.type as child_account_type
      FROM ${this.schema}.${this.tableName} ah
      JOIN ${this.schema}.accounts a ON ah.child_account_id = a.id
      WHERE ah.company_id = $1
        AND ah.parent_account_id = $2
        AND (ah.valid_to IS NULL OR ah.valid_to > CURRENT_TIMESTAMP)
    `;

    const params = [companyId, parentAccountId];

    if (hierarchyTypeId) {
      query += ' AND ah.hierarchy_type_id = $3';
      params.push(hierarchyTypeId);
    }

    query += ' ORDER BY ah.hierarchy_level, a.name';

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Get all parents for an account
   */
  async getAccountParents(
    companyId: number,
    childAccountId: number,
    hierarchyTypeId?: number
  ): Promise<AccountHierarchy[]> {
    let query = `
      SELECT ah.*, a.name as parent_account_name, a.type as parent_account_type
      FROM ${this.schema}.${this.tableName} ah
      JOIN ${this.schema}.accounts a ON ah.parent_account_id = a.id
      WHERE ah.company_id = $1
        AND ah.child_account_id = $2
        AND (ah.valid_to IS NULL OR ah.valid_to > CURRENT_TIMESTAMP)
    `;

    const params = [companyId, childAccountId];

    if (hierarchyTypeId) {
      query += ' AND ah.hierarchy_type_id = $3';
      params.push(hierarchyTypeId);
    }

    query += ' ORDER BY ah.hierarchy_level DESC';

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Get complete hierarchy tree using recursive CTE
   */
  async getHierarchyTree(
    companyId: number,
    rootAccountId: number,
    maxDepth: number = 5
  ): Promise<any> {
    const query = `
      WITH RECURSIVE hierarchy_tree AS (
        -- Base case: root account
        SELECT
          a.id,
          a.name,
          a.type,
          0 as level,
          ARRAY[a.id] as path,
          a.id as root_id
        FROM ${this.schema}.accounts a
        WHERE a.company_id = $1 AND a.id = $2

        UNION ALL

        -- Recursive case: children
        SELECT
          a.id,
          a.name,
          a.type,
          ht.level + 1,
          ht.path || a.id,
          ht.root_id
        FROM hierarchy_tree ht
        JOIN ${this.schema}.account_hierarchies ah ON ht.id = ah.parent_account_id
        JOIN ${this.schema}.accounts a ON ah.child_account_id = a.id
        WHERE a.company_id = $1
          AND ht.level < $3
          AND (ah.valid_to IS NULL OR ah.valid_to > CURRENT_TIMESTAMP)
          AND NOT a.id = ANY(ht.path) -- Prevent cycles
      )
      SELECT * FROM hierarchy_tree
      ORDER BY path
    `;

    const result = await this.db.query(query, [companyId, rootAccountId, maxDepth]);
    return this.buildTreeStructure(result.rows);
  }

  /**
   * Check for circular reference
   */
  async hasCircularReference(
    companyId: number,
    parentAccountId: number,
    childAccountId: number
  ): Promise<boolean> {
    const query = `
      WITH RECURSIVE hierarchy_check AS (
        SELECT $2::integer as account_id, 0 as depth

        UNION ALL

        SELECT ah.parent_account_id, hc.depth + 1
        FROM hierarchy_check hc
        JOIN ${this.schema}.account_hierarchies ah ON hc.account_id = ah.child_account_id
        WHERE ah.company_id = $1
          AND (ah.valid_to IS NULL OR ah.valid_to > CURRENT_TIMESTAMP)
          AND hc.depth < 100
      )
      SELECT EXISTS(
        SELECT 1 FROM hierarchy_check WHERE account_id = $3
      ) as has_cycle
    `;

    const result = await this.db.query(query, [companyId, childAccountId, parentAccountId]);
    return result.rows[0]?.has_cycle || false;
  }

  /**
   * Calculate rollup metrics for hierarchy
   */
  async calculateRollupMetrics(
    companyId: number,
    accountId: number
  ): Promise<any> {
    const query = `
      WITH RECURSIVE account_tree AS (
        SELECT id, 0 as level FROM ${this.schema}.accounts
        WHERE company_id = $1 AND id = $2

        UNION ALL

        SELECT a.id, at.level + 1
        FROM account_tree at
        JOIN ${this.schema}.account_hierarchies ah ON at.id = ah.parent_account_id
        JOIN ${this.schema}.accounts a ON ah.child_account_id = a.id
        WHERE a.company_id = $1
          AND (ah.valid_to IS NULL OR ah.valid_to > CURRENT_TIMESTAMP)
      )
      SELECT
        COUNT(DISTINCT at.id) as total_accounts,
        COUNT(DISTINCT o.id) as total_opportunities,
        COALESCE(SUM(o.expected_revenue), 0) as total_pipeline,
        COALESCE(SUM(CASE WHEN o.stage = 'closed_won' THEN o.expected_revenue ELSE 0 END), 0) as total_revenue,
        COUNT(DISTINCT c.id) as total_contacts,
        COUNT(DISTINCT CASE WHEN at.level > 0 THEN at.id END) as child_accounts
      FROM account_tree at
      LEFT JOIN ${this.schema}.accounts a ON at.id = a.id
      LEFT JOIN ${this.schema}.opportunities o ON a.id = o.account_id
      LEFT JOIN ${this.schema}.contacts c ON a.id = c.account_id
    `;

    const result = await this.db.query(query, [companyId, accountId]);
    return result.rows[0];
  }

  /**
   * Build tree structure from flat hierarchy data
   */
  private buildTreeStructure(flatData: any[]): any {
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
      if (node.level > 0) {
        const parentPath = node.path.slice(0, -1);
        const parentId = parentPath[parentPath.length - 1];
        const parent = nodeMap.get(parentId);
        if (parent) {
          parent.children.push(nodeMap.get(node.id));
        }
      }
    });

    return nodeMap.get(rootNode.id);
  }
}