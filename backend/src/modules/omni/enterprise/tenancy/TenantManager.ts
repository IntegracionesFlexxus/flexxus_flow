/**
 * Tenant Manager - Sprint 11
 * Advanced multi-tenancy management with hierarchy and resource isolation
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { EventEmitter } from 'events';

export interface ITenant {
  id: string;
  parent_tenant_id?: string;
  name: string;
  display_name: string;
  domain: string;
  subdomain?: string;
  status: 'active' | 'suspended' | 'trial' | 'archived';
  tier: 'free' | 'standard' | 'premium' | 'enterprise';
  metadata: Record<string, any>;
  settings: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface ITenantHierarchy {
  tenant_id: string;
  level: number;
  path: string[];
  children?: ITenantHierarchy[];
}

export interface ITenantQuota {
  id: string;
  tenant_id: string;
  resource_type: string;
  quota_limit: number;
  current_usage: number;
  reset_period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  last_reset: Date;
}

export interface ITenantConfiguration {
  id: string;
  tenant_id: string;
  category: string;
  key: string;
  value: any;
  inherit_from_parent: boolean;
  is_encrypted: boolean;
}

@injectable()
export class TenantManager extends EventEmitter {
  private logger: any;
  private tenantCache: Map<string, ITenant> = new Map();
  private hierarchyCache: Map<string, ITenantHierarchy> = new Map();
  private cacheTimeout = 300000; // 5 minutes

  constructor(
    @inject(TYPES.OmniConnection) private pool: Pool
  ) {
    super();
    this.logger = LoggerFactory.create({ file: __filename });
  }

  /**
   * Create a new tenant
   */
  async createTenant(tenantData: Partial<ITenant>): Promise<ITenant> {
    const startTime = Date.now();

    try {
      // Validate tenant data
      this.validateTenantData(tenantData);

      // Check domain uniqueness
      await this.validateDomainUniqueness(tenantData.domain!);

      // Create tenant
      const query = `
        INSERT INTO tenants (
          parent_tenant_id,
          name,
          display_name,
          domain,
          subdomain,
          status,
          tier,
          metadata,
          settings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
      `;

      const values = [
        tenantData.parent_tenant_id || null,
        tenantData.name,
        tenantData.display_name,
        tenantData.domain,
        tenantData.subdomain || null,
        tenantData.status || 'active',
        tenantData.tier || 'standard',
        JSON.stringify(tenantData.metadata || {}),
        JSON.stringify(tenantData.settings || {})
      ];

      const result = await this.pool.query(query, values);
      const tenant = result.rows[0];

      // Initialize default configurations
      await this.initializeDefaultConfigurations(tenant.id);

      // Initialize default quotas
      await this.initializeDefaultQuotas(tenant.id, tenant.tier);

      // Clear hierarchy cache
      this.hierarchyCache.clear();

      // Emit tenant created event
      this.emit('tenant:created', {
        tenant_id: tenant.id,
        parent_tenant_id: tenant.parent_tenant_id,
        processing_time: Date.now() - startTime
      });

      this.logger.info('Tenant created successfully', {
        tenant_id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        processing_time: Date.now() - startTime
      });

      return tenant;
    } catch (error: any) {
      this.logger.error('Failed to create tenant', error);
      throw error;
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenant(tenantId: string): Promise<ITenant | null> {
    try {
      // Check cache first
      if (this.tenantCache.has(tenantId)) {
        return this.tenantCache.get(tenantId)!;
      }

      const query = `
        SELECT * FROM tenants WHERE id = $1;
      `;

      const result = await this.pool.query(query, [tenantId]);

      if (result.rows.length === 0) {
        return null;
      }

      const tenant = result.rows[0];

      // Cache tenant
      this.tenantCache.set(tenantId, tenant);
      setTimeout(() => {
        this.tenantCache.delete(tenantId);
      }, this.cacheTimeout);

      return tenant;
    } catch (error: any) {
      this.logger.error('Failed to get tenant', error);
      throw error;
    }
  }

  /**
   * Get tenant by domain
   */
  async getTenantByDomain(domain: string): Promise<ITenant | null> {
    try {
      const query = `
        SELECT * FROM tenants WHERE domain = $1 AND status = 'active';
      `;

      const result = await this.pool.query(query, [domain]);

      if (result.rows.length === 0) {
        return null;
      }

      const tenant = result.rows[0];

      // Cache tenant
      this.tenantCache.set(tenant.id, tenant);

      return tenant;
    } catch (error: any) {
      this.logger.error('Failed to get tenant by domain', error);
      throw error;
    }
  }

  /**
   * Update tenant
   */
  async updateTenant(tenantId: string, updates: Partial<ITenant>): Promise<ITenant> {
    try {
      // Validate updates
      if (updates.domain) {
        await this.validateDomainUniqueness(updates.domain, tenantId);
      }

      const setClause = [];
      const values = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'created_at') {
          if (key === 'metadata' || key === 'settings') {
            setClause.push(`${key} = $${paramIndex}`);
            values.push(JSON.stringify(value));
          } else {
            setClause.push(`${key} = $${paramIndex}`);
            values.push(value);
          }
          paramIndex++;
        }
      });

      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }

      const query = `
        UPDATE tenants
        SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
        RETURNING *;
      `;

      values.push(tenantId);

      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Tenant not found');
      }

      const updatedTenant = result.rows[0];

      // Clear cache
      this.tenantCache.delete(tenantId);

      // Emit tenant updated event
      this.emit('tenant:updated', {
        tenant_id: tenantId,
        updates
      });

      this.logger.info('Tenant updated successfully', {
        tenant_id: tenantId,
        updates: Object.keys(updates)
      });

      return updatedTenant;
    } catch (error: any) {
      this.logger.error('Failed to update tenant', error);
      throw error;
    }
  }

  /**
   * Delete tenant (soft delete by setting status to archived)
   */
  async deleteTenant(tenantId: string): Promise<void> {
    try {
      // Check for child tenants
      const childCount = await this.getChildTenantCount(tenantId);
      if (childCount > 0) {
        throw new Error('Cannot delete tenant with child tenants');
      }

      // Soft delete by updating status
      await this.updateTenant(tenantId, { status: 'archived' });

      // Clear cache
      this.tenantCache.delete(tenantId);
      this.hierarchyCache.clear();

      // Emit tenant deleted event
      this.emit('tenant:deleted', { tenant_id: tenantId });

      this.logger.info('Tenant deleted successfully', { tenant_id: tenantId });
    } catch (error: any) {
      this.logger.error('Failed to delete tenant', error);
      throw error;
    }
  }

  /**
   * Get tenant hierarchy
   */
  async getTenantHierarchy(tenantId: string): Promise<ITenantHierarchy> {
    try {
      // Check cache first
      if (this.hierarchyCache.has(tenantId)) {
        return this.hierarchyCache.get(tenantId)!;
      }

      const query = `
        SELECT * FROM get_tenant_hierarchy($1);
      `;

      const result = await this.pool.query(query, [tenantId]);

      if (result.rows.length === 0) {
        throw new Error('Tenant not found');
      }

      // Build hierarchy structure
      const hierarchy = this.buildHierarchyTree(result.rows);

      // Cache hierarchy
      this.hierarchyCache.set(tenantId, hierarchy);
      setTimeout(() => {
        this.hierarchyCache.delete(tenantId);
      }, this.cacheTimeout);

      return hierarchy;
    } catch (error: any) {
      this.logger.error('Failed to get tenant hierarchy', error);
      throw error;
    }
  }

  /**
   * Get all child tenants
   */
  async getChildTenants(parentTenantId: string): Promise<ITenant[]> {
    try {
      const query = `
        SELECT * FROM tenants
        WHERE parent_tenant_id = $1 AND status != 'archived'
        ORDER BY created_at DESC;
      `;

      const result = await this.pool.query(query, [parentTenantId]);
      return result.rows;
    } catch (error: any) {
      this.logger.error('Failed to get child tenants', error);
      throw error;
    }
  }

  /**
   * Get tenant configuration
   */
  async getTenantConfiguration(
    tenantId: string,
    category?: string,
    key?: string
  ): Promise<ITenantConfiguration[]> {
    try {
      let query = `
        SELECT * FROM tenant_configurations
        WHERE tenant_id = $1
      `;
      const values = [tenantId];
      let paramIndex = 2;

      if (category) {
        query += ` AND category = $${paramIndex}`;
        values.push(category);
        paramIndex++;
      }

      if (key) {
        query += ` AND key = $${paramIndex}`;
        values.push(key);
      }

      query += ` ORDER BY category, key`;

      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error: any) {
      this.logger.error('Failed to get tenant configuration', error);
      throw error;
    }
  }

  /**
   * Set tenant configuration
   */
  async setTenantConfiguration(
    tenantId: string,
    category: string,
    key: string,
    value: any,
    inheritFromParent = false,
    isEncrypted = false
  ): Promise<ITenantConfiguration> {
    try {
      const query = `
        INSERT INTO tenant_configurations (
          tenant_id,
          category,
          key,
          value,
          inherit_from_parent,
          is_encrypted
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (tenant_id, category, key)
        DO UPDATE SET
          value = EXCLUDED.value,
          inherit_from_parent = EXCLUDED.inherit_from_parent,
          is_encrypted = EXCLUDED.is_encrypted,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;

      const result = await this.pool.query(query, [
        tenantId,
        category,
        key,
        JSON.stringify(value),
        inheritFromParent,
        isEncrypted
      ]);

      const config = result.rows[0];

      // Emit configuration updated event
      this.emit('tenant:config:updated', {
        tenant_id: tenantId,
        category,
        key,
        value
      });

      return config;
    } catch (error: any) {
      this.logger.error('Failed to set tenant configuration', error);
      throw error;
    }
  }

  /**
   * Get tenant quotas
   */
  async getTenantQuotas(tenantId: string): Promise<ITenantQuota[]> {
    try {
      const query = `
        SELECT * FROM tenant_quotas
        WHERE tenant_id = $1
        ORDER BY resource_type;
      `;

      const result = await this.pool.query(query, [tenantId]);
      return result.rows;
    } catch (error: any) {
      this.logger.error('Failed to get tenant quotas', error);
      throw error;
    }
  }

  /**
   * Update resource usage
   */
  async updateResourceUsage(
    tenantId: string,
    resourceType: string,
    usageAmount: number,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Record usage
      const usageQuery = `
        INSERT INTO tenant_resource_usage (
          tenant_id,
          resource_type,
          usage_amount,
          metadata
        ) VALUES ($1, $2, $3, $4);
      `;

      await this.pool.query(usageQuery, [
        tenantId,
        resourceType,
        usageAmount,
        JSON.stringify(metadata)
      ]);

      // Update current usage in quotas
      const updateQuery = `
        UPDATE tenant_quotas
        SET current_usage = current_usage + $3
        WHERE tenant_id = $1 AND resource_type = $2;
      `;

      await this.pool.query(updateQuery, [tenantId, resourceType, usageAmount]);

      // Check quota limits
      await this.checkQuotaLimits(tenantId, resourceType);

    } catch (error: any) {
      this.logger.error('Failed to update resource usage', error);
      throw error;
    }
  }

  /**
   * Check if tenant can use resource
   */
  async canUseResource(
    tenantId: string,
    resourceType: string,
    requestedAmount: number = 1
  ): Promise<boolean> {
    try {
      const query = `
        SELECT quota_limit, current_usage
        FROM tenant_quotas
        WHERE tenant_id = $1 AND resource_type = $2;
      `;

      const result = await this.pool.query(query, [tenantId, resourceType]);

      if (result.rows.length === 0) {
        // No quota defined, allow usage
        return true;
      }

      const { quota_limit, current_usage } = result.rows[0];
      return current_usage + requestedAmount <= quota_limit;
    } catch (error: any) {
      this.logger.error('Failed to check resource usage', error);
      return false;
    }
  }

  /**
   * Private helper methods
   */
  private validateTenantData(tenantData: Partial<ITenant>): void {
    if (!tenantData.name || !tenantData.display_name || !tenantData.domain) {
      throw new Error('Name, display_name, and domain are required');
    }

    if (!/^[a-z0-9-]+$/.test(tenantData.name)) {
      throw new Error('Name must contain only lowercase letters, numbers, and hyphens');
    }

    if (tenantData.subdomain && !/^[a-z0-9-]+$/.test(tenantData.subdomain)) {
      throw new Error('Subdomain must contain only lowercase letters, numbers, and hyphens');
    }
  }

  private async validateDomainUniqueness(domain: string, excludeTenantId?: string): Promise<void> {
    let query = `SELECT id FROM tenants WHERE domain = $1`;
    const values = [domain];

    if (excludeTenantId) {
      query += ` AND id != $2`;
      values.push(excludeTenantId);
    }

    const result = await this.pool.query(query, values);

    if (result.rows.length > 0) {
      throw new Error('Domain already exists');
    }
  }

  private async getChildTenantCount(tenantId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM tenants
      WHERE parent_tenant_id = $1 AND status != 'archived';
    `;

    const result = await this.pool.query(query, [tenantId]);
    return parseInt(result.rows[0].count);
  }

  private buildHierarchyTree(rows: any[]): ITenantHierarchy {
    // Sort by level to process from root to leaves
    rows.sort((a, b) => a.level - b.level);

    const root = rows[0];
    const hierarchy: ITenantHierarchy = {
      tenant_id: root.tenant_id,
      level: root.level,
      path: root.path
    };

    // Build children recursively
    const childRows = rows.filter(row => row.level > root.level);
    if (childRows.length > 0) {
      hierarchy.children = this.buildChildrenTree(childRows, root.level + 1);
    }

    return hierarchy;
  }

  private buildChildrenTree(rows: any[], targetLevel: number): ITenantHierarchy[] {
    const children = rows.filter(row => row.level === targetLevel);

    return children.map(child => {
      const childHierarchy: ITenantHierarchy = {
        tenant_id: child.tenant_id,
        level: child.level,
        path: child.path
      };

      const grandChildren = rows.filter(row =>
        row.level > targetLevel && row.path.includes(child.tenant_id)
      );

      if (grandChildren.length > 0) {
        childHierarchy.children = this.buildChildrenTree(grandChildren, targetLevel + 1);
      }

      return childHierarchy;
    });
  }

  private async initializeDefaultConfigurations(tenantId: string): Promise<void> {
    const defaultConfigs = [
      { category: 'general', key: 'timezone', value: 'UTC' },
      { category: 'general', key: 'language', value: 'en' },
      { category: 'security', key: 'session_timeout', value: 3600 },
      { category: 'security', key: 'max_login_attempts', value: 5 },
      { category: 'features', key: 'ai_enabled', value: true },
      { category: 'features', key: 'analytics_enabled', value: true }
    ];

    for (const config of defaultConfigs) {
      await this.setTenantConfiguration(
        tenantId,
        config.category,
        config.key,
        config.value
      );
    }
  }

  private async initializeDefaultQuotas(tenantId: string, tier: string): Promise<void> {
    const quotasByTier = {
      free: {
        conversations_per_month: 100,
        messages_per_month: 1000,
        storage_gb: 1,
        api_calls_per_hour: 100
      },
      standard: {
        conversations_per_month: 1000,
        messages_per_month: 10000,
        storage_gb: 5,
        api_calls_per_hour: 500
      },
      premium: {
        conversations_per_month: 5000,
        messages_per_month: 50000,
        storage_gb: 20,
        api_calls_per_hour: 2000
      },
      enterprise: {
        conversations_per_month: 50000,
        messages_per_month: 500000,
        storage_gb: 100,
        api_calls_per_hour: 10000
      }
    };

    const quotas = quotasByTier[tier as keyof typeof quotasByTier] || quotasByTier.standard;

    for (const [resourceType, limit] of Object.entries(quotas)) {
      const query = `
        INSERT INTO tenant_quotas (
          tenant_id,
          resource_type,
          quota_limit
        ) VALUES ($1, $2, $3)
        ON CONFLICT (tenant_id, resource_type) DO NOTHING;
      `;

      await this.pool.query(query, [tenantId, resourceType, limit]);
    }
  }

  private async checkQuotaLimits(tenantId: string, resourceType: string): Promise<void> {
    const query = `
      SELECT quota_limit, current_usage
      FROM tenant_quotas
      WHERE tenant_id = $1 AND resource_type = $2;
    `;

    const result = await this.pool.query(query, [tenantId, resourceType]);

    if (result.rows.length > 0) {
      const { quota_limit, current_usage } = result.rows[0];
      const usagePercentage = (current_usage / quota_limit) * 100;

      if (usagePercentage >= 90) {
        this.emit('quota:warning', {
          tenant_id: tenantId,
          resource_type: resourceType,
          usage_percentage: usagePercentage,
          current_usage,
          quota_limit
        });
      }

      if (current_usage >= quota_limit) {
        this.emit('quota:exceeded', {
          tenant_id: tenantId,
          resource_type: resourceType,
          current_usage,
          quota_limit
        });
      }
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.tenantCache.clear();
    this.hierarchyCache.clear();
    this.removeAllListeners();
    this.logger.info('TenantManager cleaned up');
  }
}