/**
 * WidgetRepository - Sprint 13
 * Repository for dashboard widgets (wrapper for DashboardRepository widget methods)
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import type { Pool } from 'pg';
import {
  Widget,
  CreateWidgetDto,
  UpdateWidgetDto
} from '../types/analytics.types';

@injectable()
export class WidgetRepository {
  constructor(
    @inject(TYPES.DatabaseConnection) private db: Pool,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Create widget
   */
  async create(dashboardId: number, data: CreateWidgetDto): Promise<Widget> {
    try {
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
   * Find widget by ID
   */
  async findById(id: number): Promise<Widget | null> {
    try {
      const query = `SELECT * FROM dashboard_widgets WHERE id = $1`;
      const result = await this.db.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToWidget(result.rows[0]);
    } catch (error) {
      this.logger.error('Error finding widget by ID', { error, id });
      throw new Error(`Failed to find widget: ${error.message}`);
    }
  }

  /**
   * Find widgets by dashboard
   */
  async findByDashboard(dashboardId: number): Promise<Widget[]> {
    try {
      const query = `
        SELECT * FROM dashboard_widgets
        WHERE dashboard_id = $1
        ORDER BY position_y, position_x
      `;

      const result = await this.db.query(query, [dashboardId]);

      return result.rows.map(row => this.mapRowToWidget(row));
    } catch (error) {
      this.logger.error('Error finding widgets by dashboard', { error, dashboardId });
      throw new Error(`Failed to find widgets: ${error.message}`);
    }
  }

  /**
   * Update widget
   */
  async update(id: number, data: UpdateWidgetDto): Promise<Widget> {
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
      if (data.metrics !== undefined) {
        updateFields.push(`metrics = $${paramIndex++}`);
        values.push(JSON.stringify(data.metrics));
      }
      if (data.dimensions !== undefined) {
        updateFields.push(`dimensions = $${paramIndex++}`);
        values.push(JSON.stringify(data.dimensions));
      }
      if (data.filters !== undefined) {
        updateFields.push(`filters = $${paramIndex++}`);
        values.push(JSON.stringify(data.filters));
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
        UPDATE dashboard_widgets
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex++}
        RETURNING *
      `;

      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`Widget ${id} not found`);
      }

      this.logger.info('Widget updated', { widgetId: id });

      return this.mapRowToWidget(result.rows[0]);
    } catch (error) {
      this.logger.error('Error updating widget', { error, id, data });
      throw new Error(`Failed to update widget: ${error.message}`);
    }
  }

  /**
   * Delete widget
   */
  async delete(id: number): Promise<boolean> {
    try {
      const query = `DELETE FROM dashboard_widgets WHERE id = $1 RETURNING id`;
      const result = await this.db.query(query, [id]);

      if (result.rows.length === 0) {
        return false;
      }

      this.logger.info('Widget deleted', { widgetId: id });

      return true;
    } catch (error) {
      this.logger.error('Error deleting widget', { error, id });
      throw new Error(`Failed to delete widget: ${error.message}`);
    }
  }

  /**
   * Update widget cache metadata
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
