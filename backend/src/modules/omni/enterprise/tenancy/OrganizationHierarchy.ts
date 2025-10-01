/**
 * Organization Hierarchy Service - Sprint 11
 * Manages organizational structure and configuration inheritance
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { EventEmitter } from 'events';
import { TenantManager, ITenant, ITenantConfiguration } from './TenantManager';

export interface IOrganizationNode {
  tenant_id: string;
  tenant: ITenant;
  parent_id?: string;
  level: number;
  path: string[];
  children: IOrganizationNode[];
  inherited_configs: Record<string, any>;
  effective_configs: Record<string, any>;
}

export interface IConfigurationInheritance {
  category: string;
  key: string;
  value: any;
  source_tenant_id: string;
  inheritance_level: number;
  is_overridden: boolean;
}

export interface IOrganizationStats {
  total_tenants: number;
  max_depth: number;
  tenants_by_level: Record<number, number>;
  tenants_by_tier: Record<string, number>;
  active_tenants: number;
  suspended_tenants: number;
}

@injectable()
export class OrganizationHierarchy extends EventEmitter {
  private logger: any;
  private hierarchyCache: Map<string, IOrganizationNode> = new Map();
  private configCache: Map<string, Record<string, any>> = new Map();
  private cacheTimeout = 600000; // 10 minutes

  constructor(
    @inject(TYPES.OmniConnection) private pool: Pool,
    @inject('TenantManager') private tenantManager: TenantManager
  ) {
    super();
    this.logger = LoggerFactory.create({ file: __filename });
  }

  /**
   * Get complete organization hierarchy from root
   */
  async getOrganizationTree(rootTenantId?: string): Promise<IOrganizationNode[]> {
    try {
      // If no root specified, get all root tenants
      let rootTenants: ITenant[];

      if (rootTenantId) {
        const tenant = await this.tenantManager.getTenant(rootTenantId);
        if (!tenant) {
          throw new Error('Root tenant not found');
        }
        rootTenants = [tenant];
      } else {
        rootTenants = await this.getRootTenants();
      }

      const organizationTree: IOrganizationNode[] = [];

      for (const rootTenant of rootTenants) {
        const tree = await this.buildOrganizationNode(rootTenant, 0, [rootTenant.id]);
        organizationTree.push(tree);
      }

      return organizationTree;
    } catch (error: any) {
      this.logger.error('Failed to get organization tree', error);
      throw error;
    }
  }

  /**
   * Get organization path from tenant to root
   */
  async getOrganizationPath(tenantId: string): Promise<ITenant[]> {
    try {
      const path: ITenant[] = [];
      let currentTenantId: string | null = tenantId;

      while (currentTenantId) {
        const tenant = await this.tenantManager.getTenant(currentTenantId);
        if (!tenant) {
          break;
        }

        path.unshift(tenant); // Add to beginning to get root-to-leaf order
        currentTenantId = tenant.parent_tenant_id || null;
      }

      return path;
    } catch (error: any) {
      this.logger.error('Failed to get organization path', error);
      throw error;
    }
  }

  /**
   * Get effective configuration for tenant (with inheritance)
   */
  async getEffectiveConfiguration(
    tenantId: string,
    category?: string
  ): Promise<Record<string, any>> {
    try {
      const cacheKey = `${tenantId}:${category || 'all'}`;

      // Check cache
      if (this.configCache.has(cacheKey)) {
        return this.configCache.get(cacheKey)!;
      }

      // Get organization path
      const orgPath = await this.getOrganizationPath(tenantId);

      // Build effective configuration with inheritance
      const effectiveConfig: Record<string, any> = {};

      // Start from root and apply configs down the hierarchy
      for (const tenant of orgPath) {
        const tenantConfigs = await this.tenantManager.getTenantConfiguration(
          tenant.id,
          category
        );

        for (const config of tenantConfigs) {
          const configKey = `${config.category}.${config.key}`;

          // Apply configuration if:
          // 1. It's not set yet (from parent)
          // 2. Current tenant's config doesn't inherit from parent
          // 3. Current tenant explicitly overrides
          if (!effectiveConfig[configKey] || !config.inherit_from_parent) {
            effectiveConfig[configKey] = {
              value: JSON.parse(config.value),
              source_tenant_id: tenant.id,
              category: config.category,
              key: config.key,
              inherit_from_parent: config.inherit_from_parent
            };
          }
        }
      }

      // Cache result
      this.configCache.set(cacheKey, effectiveConfig);
      setTimeout(() => {
        this.configCache.delete(cacheKey);
      }, this.cacheTimeout);

      return effectiveConfig;
    } catch (error: any) {
      this.logger.error('Failed to get effective configuration', error);
      throw error;
    }
  }

  /**
   * Get configuration inheritance chain
   */
  async getConfigurationInheritance(
    tenantId: string,
    category: string,
    key: string
  ): Promise<IConfigurationInheritance[]> {
    try {
      const orgPath = await this.getOrganizationPath(tenantId);
      const inheritanceChain: IConfigurationInheritance[] = [];

      for (let i = 0; i < orgPath.length; i++) {
        const tenant = orgPath[i];
        const configs = await this.tenantManager.getTenantConfiguration(
          tenant.id,
          category,
          key
        );

        if (configs.length > 0) {
          const config = configs[0];
          inheritanceChain.push({
            category: config.category,
            key: config.key,
            value: JSON.parse(config.value),
            source_tenant_id: tenant.id,
            inheritance_level: i,
            is_overridden: i < orgPath.length - 1 && !config.inherit_from_parent
          });
        }
      }

      return inheritanceChain;
    } catch (error: any) {
      this.logger.error('Failed to get configuration inheritance', error);
      throw error;
    }
  }

  /**
   * Move tenant to new parent
   */
  async moveTenant(tenantId: string, newParentId?: string): Promise<void> {
    try {
      // Validate move is allowed
      await this.validateTenantMove(tenantId, newParentId);

      // Update tenant parent
      await this.tenantManager.updateTenant(tenantId, {
        parent_tenant_id: newParentId
      });

      // Clear caches
      this.clearCaches();

      // Emit hierarchy changed event
      this.emit('hierarchy:changed', {
        tenant_id: tenantId,
        old_parent_id: null, // TODO: Get old parent
        new_parent_id: newParentId
      });

      this.logger.info('Tenant moved successfully', {
        tenant_id: tenantId,
        new_parent_id: newParentId
      });
    } catch (error: any) {
      this.logger.error('Failed to move tenant', error);
      throw error;
    }
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(rootTenantId?: string): Promise<IOrganizationStats> {
    try {
      let whereClause = "status != 'archived'";
      const values: any[] = [];

      if (rootTenantId) {
        // Get all tenants in the hierarchy
        const hierarchy = await this.tenantManager.getTenantHierarchy(rootTenantId);
        const tenantIds = this.extractTenantIds(hierarchy);

        whereClause += ` AND id = ANY($1)`;
        values.push(tenantIds);
      }

      const query = `
        WITH tenant_levels AS (
          WITH RECURSIVE hierarchy AS (
            SELECT id, parent_tenant_id, 0 as level, tier, status
            FROM tenants
            WHERE parent_tenant_id IS NULL AND ${whereClause}

            UNION ALL

            SELECT t.id, t.parent_tenant_id, h.level + 1, t.tier, t.status
            FROM tenants t
            JOIN hierarchy h ON t.parent_tenant_id = h.id
            WHERE t.status != 'archived'
          )
          SELECT * FROM hierarchy
        )
        SELECT
          COUNT(*) as total_tenants,
          MAX(level) as max_depth,
          json_object_agg(level, level_count) as tenants_by_level,
          json_object_agg(tier, tier_count) as tenants_by_tier,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_tenants,
          COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_tenants
        FROM (
          SELECT
            level,
            tier,
            status,
            COUNT(*) OVER (PARTITION BY level) as level_count,
            COUNT(*) OVER (PARTITION BY tier) as tier_count
          FROM tenant_levels
        ) stats;
      `;

      const result = await this.pool.query(query, values);
      const stats = result.rows[0];

      return {
        total_tenants: parseInt(stats.total_tenants),
        max_depth: parseInt(stats.max_depth || '0'),
        tenants_by_level: stats.tenants_by_level || {},
        tenants_by_tier: stats.tenants_by_tier || {},
        active_tenants: parseInt(stats.active_tenants),
        suspended_tenants: parseInt(stats.suspended_tenants)
      };
    } catch (error: any) {
      this.logger.error('Failed to get organization stats', error);
      throw error;
    }
  }

  /**
   * Propagate configuration change down hierarchy
   */
  async propagateConfigurationChange(
    tenantId: string,
    category: string,
    key: string,
    value: any
  ): Promise<void> {
    try {
      // Get all descendant tenants
      const descendants = await this.getDescendantTenants(tenantId);

      for (const descendant of descendants) {
        // Check if descendant inherits this configuration
        const configs = await this.tenantManager.getTenantConfiguration(
          descendant.id,
          category,
          key
        );

        if (configs.length === 0 || configs[0].inherit_from_parent) {
          // Clear cache for this tenant's effective config
          this.clearConfigCache(descendant.id);

          // Emit configuration propagated event
          this.emit('config:propagated', {
            source_tenant_id: tenantId,
            target_tenant_id: descendant.id,
            category,
            key,
            value
          });
        }
      }

      this.logger.info('Configuration change propagated', {
        source_tenant_id: tenantId,
        category,
        key,
        affected_tenants: descendants.length
      });
    } catch (error: any) {
      this.logger.error('Failed to propagate configuration change', error);
      throw error;
    }
  }

  /**
   * Validate tenant hierarchical permissions
   */
  async validateHierarchicalPermission(
    requestingTenantId: string,
    targetTenantId: string,
    action: string
  ): Promise<boolean> {
    try {
      // System tenant can access all
      if (requestingTenantId === '00000000-0000-0000-0000-000000000000') {
        return true;
      }

      // Get organization paths
      const requestingPath = await this.getOrganizationPath(requestingTenantId);
      const targetPath = await this.getOrganizationPath(targetTenantId);

      // Check if requesting tenant is ancestor of target
      const isAncestor = targetPath.some(tenant => tenant.id === requestingTenantId);

      // Check if requesting tenant is same as target
      const isSame = requestingTenantId === targetTenantId;

      // Permission rules based on action
      switch (action) {
        case 'view':
          return isAncestor || isSame;
        case 'edit':
          return isAncestor || isSame;
        case 'delete':
          return isAncestor && !isSame;
        case 'create_child':
          return isSame;
        default:
          return false;
      }
    } catch (error: any) {
      this.logger.error('Failed to validate hierarchical permission', error);
      return false;
    }
  }

  /**
   * Private helper methods
   */
  private async getRootTenants(): Promise<ITenant[]> {
    const query = `
      SELECT * FROM tenants
      WHERE parent_tenant_id IS NULL AND status != 'archived'
      ORDER BY created_at;
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  private async buildOrganizationNode(
    tenant: ITenant,
    level: number,
    path: string[]
  ): Promise<IOrganizationNode> {
    // Check cache first
    const cacheKey = `${tenant.id}:${level}`;
    if (this.hierarchyCache.has(cacheKey)) {
      return this.hierarchyCache.get(cacheKey)!;
    }

    // Get effective configurations
    const effectiveConfigs = await this.getEffectiveConfiguration(tenant.id);

    // Get child tenants
    const childTenants = await this.tenantManager.getChildTenants(tenant.id);

    // Build child nodes
    const children: IOrganizationNode[] = [];
    for (const childTenant of childTenants) {
      const childNode = await this.buildOrganizationNode(
        childTenant,
        level + 1,
        [...path, childTenant.id]
      );
      children.push(childNode);
    }

    // Create organization node
    const node: IOrganizationNode = {
      tenant_id: tenant.id,
      tenant,
      parent_id: tenant.parent_tenant_id,
      level,
      path,
      children,
      inherited_configs: this.extractInheritedConfigs(effectiveConfigs),
      effective_configs: this.extractEffectiveValues(effectiveConfigs)
    };

    // Cache node
    this.hierarchyCache.set(cacheKey, node);
    setTimeout(() => {
      this.hierarchyCache.delete(cacheKey);
    }, this.cacheTimeout);

    return node;
  }

  private extractInheritedConfigs(effectiveConfigs: Record<string, any>): Record<string, any> {
    const inherited: Record<string, any> = {};

    Object.entries(effectiveConfigs).forEach(([key, config]) => {
      if (config.inherit_from_parent) {
        inherited[key] = config;
      }
    });

    return inherited;
  }

  private extractEffectiveValues(effectiveConfigs: Record<string, any>): Record<string, any> {
    const effective: Record<string, any> = {};

    Object.entries(effectiveConfigs).forEach(([key, config]) => {
      effective[key] = config.value;
    });

    return effective;
  }

  private async validateTenantMove(tenantId: string, newParentId?: string): Promise<void> {
    // Cannot move to self
    if (tenantId === newParentId) {
      throw new Error('Cannot move tenant to itself');
    }

    // If moving to a parent, ensure it exists
    if (newParentId) {
      const newParent = await this.tenantManager.getTenant(newParentId);
      if (!newParent) {
        throw new Error('New parent tenant not found');
      }

      // Ensure new parent is not a descendant of current tenant
      const descendants = await this.getDescendantTenants(tenantId);
      if (descendants.some(d => d.id === newParentId)) {
        throw new Error('Cannot move tenant to its own descendant');
      }
    }
  }

  private async getDescendantTenants(tenantId: string): Promise<ITenant[]> {
    const query = `
      WITH RECURSIVE descendants AS (
        SELECT id, parent_tenant_id FROM tenants WHERE parent_tenant_id = $1

        UNION ALL

        SELECT t.id, t.parent_tenant_id
        FROM tenants t
        JOIN descendants d ON t.parent_tenant_id = d.id
      )
      SELECT t.* FROM tenants t
      JOIN descendants d ON t.id = d.id
      WHERE t.status != 'archived';
    `;

    const result = await this.pool.query(query, [tenantId]);
    return result.rows;
  }

  private extractTenantIds(hierarchy: any): string[] {
    const ids = [hierarchy.tenant_id];

    if (hierarchy.children) {
      hierarchy.children.forEach((child: any) => {
        ids.push(...this.extractTenantIds(child));
      });
    }

    return ids;
  }

  private clearCaches(): void {
    this.hierarchyCache.clear();
    this.configCache.clear();
  }

  private clearConfigCache(tenantId: string): void {
    const keysToDelete: string[] = [];

    this.configCache.forEach((_, key) => {
      if (key.startsWith(`${tenantId}:`)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.configCache.delete(key);
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.clearCaches();
    this.removeAllListeners();
    this.logger.info('OrganizationHierarchy cleaned up');
  }
}