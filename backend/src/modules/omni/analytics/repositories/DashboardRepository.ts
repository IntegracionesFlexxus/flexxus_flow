/**
 * DashboardRepository - Sprint 13
 * Repository for CRUD operations on dashboards and widgets
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import type { Pool } from 'pg';
import {
  Dashboard,
  Widget,
  CreateDashboardDto,
  UpdateDashboardDto,
  CreateWidgetDto,
  UpdateWidgetDto,
  LayoutConfig
} from '../types/analytics.types';

@injectable()
export class DashboardRepository {
  constructor(
    @inject(TYPES.DatabaseConnection) private db: Pool,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Create a new dashboard
   */
  async create(data: CreateDashboardDto, companyId: number, userId: number): Promise<Dashboard> {
    try {
      const query = `
        INSERT INTO dashboards (
          company_id, name, description, type, layout_config, filters,
          refresh_interval_seconds, is_public, owner_id, shared_with_users,
          shared_with_roles, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [
        companyId,
        data.name,
        data.description || null,
        data.type,
        JSON.stringify(data.layoutConfig || {}),
        JSON.stringify(data.filters || {}),
        data.refreshIntervalSeconds || 300,
        data.isPublic || false,
        userId,
        data.sharedWithUsers || [],
        data.sharedWithRoles || [],
        userId
      ];

      const result = await this.db.query(query, values);
      const dashboard = this.mapRowToDashboard(result.rows[0]);

      this.logger.info('Dashboard created', { dashboardId: dashboard.id, companyId });

      return dashboard;
    } catch (error) {
      this.logger.error('Error creating dashboard', { error, data, companyId });
      throw new Error(`Failed to create dashboard: ${error.message}`);
    }
  }

  /**
   * Find dashboard by ID
   */
  async findById(id: number, companyId: number): Promise<Dashboard | null> {
    try {
      const query = `
        SELECT * FROM dashboards
        WHERE id = $1 AND company_id = $2
      `;

      const result = await this.db.query(query, [id, companyId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToDashboard(result.rows[0]);
    } catch (error) {
      this.logger.error('Error finding dashboard by ID', { error, id, companyId });
      throw new Error(`Failed to find dashboard: ${error.message}`);
    }
  }

  /**
   * Find all dashboards for a company
   */
  async findByCompany(companyId: number, userId?: number): Promise<Dashboard[]> {
    try {
      let query = `
        SELECT * FROM dashboards
        WHERE company_id = $1
          AND is_active = true
      `;

      const params: any[] = [companyId];

      // Filter by user access if userId provided
      if (userId) {
        query += ` AND (
          owner_id = $2
          OR is_public = true
          OR $2 = ANY(shared_with_users)
        )`;
        params.push(userId);
      }

      query += ` ORDER BY is_default DESC, view_count DESC, created_at DESC`;

      const result = await this.db.query(query, params);

      return result.rows.map(row => this.mapRowToDashboard(row));
    } catch (error) {
      this.logger.error('Error finding dashboards by company', { error, companyId });
      throw new Error(`Failed to find dashboards: ${error.message}`);
    }
  }

  /**
   * Update dashboard
   */
  async update(id: number, data: UpdateDashboardDto, companyId: number): Promise<Dashboard> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }
      if (data.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }
      if (data.type !== undefined) {
        updateFields.push(`type = $${paramIndex++}`);
        values.push(data.type);
      }
      if (data.layoutConfig !== undefined) {
        updateFields.push(`layout_config = $${paramIndex++}`);
        values.push(JSON.stringify(data.layoutConfig));
      }
      if (data.filters !== undefined) {
        updateFields.push(`filters = $${paramIndex++}`);
        values.push(JSON.stringify(data.filters));
      }
      if (data.refreshIntervalSeconds !== undefined) {
        updateFields.push(`refresh_interval_seconds = $${paramIndex++}`);
        values.push(data.refreshIntervalSeconds);
      }
      if (data.isPublic !== undefined) {
        updateFields.push(`is_public = $${paramIndex++}`);
        values.push(data.isPublic);
      }
      if (data.sharedWithUsers !== undefined) {
        updateFields.push(`shared_with_users = $${paramIndex++}`);
        values.push(data.sharedWithUsers);
      }
      if (data.sharedWithRoles !== undefined) {
        updateFields.push(`shared_with_roles = $${paramIndex++}`);
        values.push(data.sharedWithRoles);
      }
      if (data.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        values.push(data.isActive);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      values.push(id, companyId);

      const query = `
        UPDATE dashboards
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex++} AND company_id = $${paramIndex++}
        RETURNING *
      `;

      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`Dashboard ${id} not found`);
      }

      this.logger.info('Dashboard updated', { dashboardId: id, companyId });

      return this.mapRowToDashboard(result.rows[0]);
    } catch (error) {
      this.logger.error('Error updating dashboard', { error, id, data, companyId });
      throw new Error(`Failed to update dashboard: ${error.message}`);
    }
  }

  /**
   * Delete dashboard (soft delete)
   */
  async delete(id: number, companyId: number): Promise<boolean> {
    try {
      const query = `
        UPDATE dashboards
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND company_id = $2
        RETURNING id
      `;

      const result = await this.db.query(query, [id, companyId]);

      if (result.rows.length === 0) {
        return false;
      }

      this.logger.info('Dashboard deleted', { dashboardId: id, companyId });

      return true;
    } catch (error) {
      this.logger.error('Error deleting dashboard', { error, id, companyId });
      throw new Error(`Failed to delete dashboard: ${error.message}`);
    }
  }

  /**
   * Get widgets for a dashboard
   */
  async getWidgets(dashboardId: number, companyId: number): Promise<Widget[]> {
    try {
      const query = `
        SELECT w.* FROM dashboard_widgets w
        INNER JOIN dashboards d ON w.dashboard_id = d.id
        WHERE w.dashboard_id = $1 AND d.company_id = $2
        ORDER BY w.position_y, w.position_x
      `;

      const result = await this.db.query(query, [dashboardId, companyId]);

      return result.rows.map(row => this.mapRowToWidget(row));
    } catch (error) {
      this.logger.error('Error getting widgets', { error, dashboardId, companyId });
      throw new Error(`Failed to get widgets: ${error.message}`);
    }
  }

  /**
   * Update dashboard layout
   */
  async updateLayout(dashboardId: number, layout: LayoutConfig, companyId: number): Promise<void> {
    try {
      const query = `
        UPDATE dashboards
        SET layout_config = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND company_id = $3
      `;

      const result = await this.db.query(query, [JSON.stringify(layout), dashboardId, companyId]);

      if (result.rowCount === 0) {
        throw new Error(`Dashboard ${dashboardId} not found`);
      }

      this.logger.info('Dashboard layout updated', { dashboardId, companyId });
    } catch (error) {
      this.logger.error('Error updating dashboard layout', { error, dashboardId, companyId });
      throw new Error(`Failed to update layout: ${error.message}`);
    }
  }

  /**
   * Increment view count
   */
  async incrementViewCount(dashboardId: number): Promise<void> {
    try {
      const query = `
        UPDATE dashboards
        SET view_count = view_count + 1, last_viewed_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      await this.db.query(query, [dashboardId]);
    } catch (error) {
      this.logger.error('Error incrementing view count', { error, dashboardId });
      // Don't throw - this is not critical
    }
  }

  /**
   * Create widget
   */
  async createWidget(dashboardId: number, data: CreateWidgetDto, companyId: number): Promise<Widget> {
    try {
      // Verify dashboard belongs to company
      const dashboardCheck = await this.db.query(
        'SELECT id FROM dashboards WHERE id = $1 AND company_id = $2',
        [dashboardId, companyId]
      );

      if (dashboardCheck.rows.length === 0) {
        throw new Error(`Dashboard ${dashboardId} not found`);
      }

      const query = `
        INSERT INTO dashboard_widgets (
          dashboard_id, widget_type, title, position_x, position_y, width, height,
          data_source, query, metrics, dimensions, filters, chart_type, chart_config,
          color_scheme, cache_enabled, cache_ttl_seconds
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `;

      const values = [
        dashboardId,
        data.widgetType,
        data.title,
        data.positionX,
        data.positionY,
        data.width,
        data.height,
        data.dataSource,
        data.query || null,
        JSON.stringify(data.metrics || {}),
        JSON.stringify(data.dimensions || {}),
        JSON.stringify(data.filters || {}),
        data.chartType || null,
        JSON.stringify(data.chartConfig || {}),
        data.colorScheme || 'default',
        data.cacheEnabled !== false,
        data.cacheTtlSeconds || 300
      ];

      const result = await this.db.query(query, values);

      this.logger.info('Widget created', { widgetId: result.rows[0].id, dashboardId });

      return this.mapRowToWidget(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating widget', { error, dashboardId, data });
      throw new Error(`Failed to create widget: ${error.message}`);
    }
  }

  /**
   * Update widget
   */
  async updateWidget(id: number, data: UpdateWidgetDto, companyId: number): Promise<Widget> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        values.push(data.title);
      }
      if (data.positionX !== undefined) {
        updateFields.push(`position_x = $${paramIndex++}`);
        values.push(data.positionX);
      }
      if (data.positionY !== undefined) {
        updateFields.push(`position_y = $${paramIndex++}`);
        values.push(data.positionY);
      }
      if (data.width !== undefined) {
        updateFields.push(`width = $${paramIndex++}`);
        values.push(data.width);
      }
      if (data.height !== undefined) {
        updateFields.push(`height = $${paramIndex++}`);
        values.push(data.height);
      }
      if (data.dataSource !== undefined) {
        updateFields.push(`data_source = $${paramIndex++}`);
        values.push(data.dataSource);
      }
      if (data.query !== undefined) {
        updateFields.push(`query = $${paramIndex++}`);
        values.push(data.query);
      }
      if (data.chartType !== undefined) {
        updateFields.push(`chart_type = $${paramIndex++}`);
        values.push(data.chartType);
      }
      if (data.chartConfig !== undefined) {
        updateFields.push(`chart_config = $${paramIndex++}`);
        values.push(JSON.stringify(data.chartConfig));
      }
      if (data.cacheEnabled !== undefined) {
        updateFields.push(`cache_enabled = $${paramIndex++}`);
        values.push(data.cacheEnabled);
      }
      if (data.cacheTtlSeconds !== undefined) {
        updateFields.push(`cache_ttl_seconds = $${paramIndex++}`);
        values.push(data.cacheTtlSeconds);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE dashboard_widgets w
        SET ${updateFields.join(', ')}
        FROM dashboards d
        WHERE w.id = $${paramIndex++}
          AND w.dashboard_id = d.id
          AND d.company_id = $${paramIndex++}
        RETURNING w.*
      `;

      values.push(companyId);

      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`Widget ${id} not found`);
      }

      this.logger.info('Widget updated', { widgetId: id, companyId });

      return this.mapRowToWidget(result.rows[0]);
    } catch (error) {
      this.logger.error('Error updating widget', { error, id, data });
      throw new Error(`Failed to update widget: ${error.message}`);
    }
  }

  /**
   * Delete widget
   */
  async deleteWidget(id: number, companyId: number): Promise<boolean> {
    try {
      const query = `
        DELETE FROM dashboard_widgets w
        USING dashboards d
        WHERE w.id = $1
          AND w.dashboard_id = d.id
          AND d.company_id = $2
        RETURNING w.id
      `;

      const result = await this.db.query(query, [id, companyId]);

      if (result.rows.length === 0) {
        return false;
      }

      this.logger.info('Widget deleted', { widgetId: id, companyId });

      return true;
    } catch (error) {
      this.logger.error('Error deleting widget', { error, id, companyId });
      throw new Error(`Failed to delete widget: ${error.message}`);
    }
  }

  /**
   * Update widget cache
   */
  async updateCache(widgetId: number, cachedData: any, ttl: number): Promise<void> {
    try {
      const query = `
        UPDATE dashboard_widgets
        SET last_cached_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      await this.db.query(query, [widgetId]);
    } catch (error) {
      this.logger.error('Error updating widget cache', { error, widgetId });
      // Don't throw - caching is not critical
    }
  }

  /**
   * Map database row to Dashboard object
   */
  private mapRowToDashboard(row: any): Dashboard {
    return {
      id: row.id,
      companyId: row.company_id,
      name: row.name,
      description: row.description,
      type: row.type,
      layoutConfig: typeof row.layout_config === 'string' ? JSON.parse(row.layout_config) : row.layout_config,
      widgets: [],
      filters: typeof row.filters === 'string' ? JSON.parse(row.filters) : row.filters,
      refreshIntervalSeconds: row.refresh_interval_seconds,
      isPublic: row.is_public,
      ownerId: row.owner_id,
      sharedWithUsers: row.shared_with_users,
      sharedWithRoles: row.shared_with_roles,
      isActive: row.is_active,
      isDefault: row.is_default,
      viewCount: row.view_count,
      lastViewedAt: row.last_viewed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    };
  }

  /**
   * Map database row to Widget object
   */
  private mapRowToWidget(row: any): Widget {
    return {
      id: row.id,
      dashboardId: row.dashboard_id,
      widgetType: row.widget_type,
      title: row.title,
      positionX: row.position_x,
      positionY: row.position_y,
      width: row.width,
      height: row.height,
      dataSource: row.data_source,
      query: row.query,
      metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics,
      dimensions: typeof row.dimensions === 'string' ? JSON.parse(row.dimensions) : row.dimensions,
      filters: typeof row.filters === 'string' ? JSON.parse(row.filters) : row.filters,
      chartType: row.chart_type,
      chartConfig: typeof row.chart_config === 'string' ? JSON.parse(row.chart_config) : row.chart_config,
      colorScheme: row.color_scheme,
      cacheEnabled: row.cache_enabled,
      cacheTtlSeconds: row.cache_ttl_seconds,
      lastCachedAt: row.last_cached_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

interface Logger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
}
