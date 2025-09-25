import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '../../../container/types';

export interface DashboardConfiguration {
  id?: number;
  company_id: number;
  user_id?: number;
  name: string;
  description?: string;
  layout_type?: string;
  widgets?: any[];
  filters?: any;
  refresh_interval?: number;
  is_default?: boolean;
  is_public?: boolean;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface DashboardWidget {
  id?: number;
  dashboard_id: number;
  widget_type: string;
  title?: string;
  data_source?: string;
  query_config?: any;
  visualization_config?: any;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  refresh_interval?: number;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

@injectable()
export class DashboardRepository {
  constructor(
    @inject(TYPES.DatabasePool) private pool: Pool
  ) {}

  async createDashboard(dashboard: DashboardConfiguration): Promise<DashboardConfiguration> {
    const query = `
      INSERT INTO dashboard_configurations (
        company_id, user_id, name, description, layout_type,
        widgets, filters, refresh_interval, is_default, 
        is_public, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      dashboard.company_id,
      dashboard.user_id,
      dashboard.name,
      dashboard.description,
      dashboard.layout_type || 'grid',
      JSON.stringify(dashboard.widgets || []),
      JSON.stringify(dashboard.filters || {}),
      dashboard.refresh_interval || 300,
      dashboard.is_default || false,
      dashboard.is_public || false,
      dashboard.is_active !== false
    ];

    const result = await this.pool.query(query, values);
    return this.mapToDashboard(result.rows[0]);
  }

  async findDashboardById(id: number): Promise<DashboardConfiguration | null> {
    const query = 'SELECT * FROM dashboard_configurations WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapToDashboard(result.rows[0]) : null;
  }

  async findDashboardsByCompany(companyId: number): Promise<DashboardConfiguration[]> {
    const query = `
      SELECT * FROM dashboard_configurations 
      WHERE company_id = $1 AND is_active = true
      ORDER BY is_default DESC, name
    `;
    const result = await this.pool.query(query, [companyId]);
    return result.rows.map(row => this.mapToDashboard(row));
  }

  async findDashboardsByUser(
    companyId: number, 
    userId: number
  ): Promise<DashboardConfiguration[]> {
    const query = `
      SELECT * FROM dashboard_configurations 
      WHERE company_id = $1 
      AND (user_id = $2 OR is_public = true)
      AND is_active = true
      ORDER BY user_id = $2 DESC, is_default DESC, name
    `;
    const result = await this.pool.query(query, [companyId, userId]);
    return result.rows.map(row => this.mapToDashboard(row));
  }

  async getDefaultDashboard(companyId: number): Promise<DashboardConfiguration | null> {
    const query = `
      SELECT * FROM dashboard_configurations 
      WHERE company_id = $1 AND is_default = true AND is_active = true
      LIMIT 1
    `;
    const result = await this.pool.query(query, [companyId]);
    return result.rows.length > 0 ? this.mapToDashboard(result.rows[0]) : null;
  }

  async updateDashboard(
    id: number, 
    updates: Partial<DashboardConfiguration>
  ): Promise<DashboardConfiguration | null> {
    const allowedFields = [
      'name', 'description', 'layout_type', 'widgets', 'filters',
      'refresh_interval', 'is_default', 'is_public', 'is_active'
    ];

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const field of allowedFields) {
      if (field in updates) {
        let value = (updates as any)[field];
        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }
        updateFields.push(`${field} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      return this.findDashboardById(id);
    }

    values.push(id);
    const query = `
      UPDATE dashboard_configurations 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.mapToDashboard(result.rows[0]) : null;
  }

  async deleteDashboard(id: number): Promise<boolean> {
    const query = 'DELETE FROM dashboard_configurations WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async createWidget(widget: DashboardWidget): Promise<DashboardWidget> {
    const query = `
      INSERT INTO dashboard_widgets (
        dashboard_id, widget_type, title, data_source,
        query_config, visualization_config, position_x, position_y,
        width, height, refresh_interval, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      widget.dashboard_id,
      widget.widget_type,
      widget.title,
      widget.data_source,
      JSON.stringify(widget.query_config || {}),
      JSON.stringify(widget.visualization_config || {}),
      widget.position_x || 0,
      widget.position_y || 0,
      widget.width || 4,
      widget.height || 2,
      widget.refresh_interval,
      widget.is_active !== false
    ];

    const result = await this.pool.query(query, values);
    return this.mapToWidget(result.rows[0]);
  }

  async findWidgetById(id: number): Promise<DashboardWidget | null> {
    const query = 'SELECT * FROM dashboard_widgets WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapToWidget(result.rows[0]) : null;
  }

  async findWidgetsByDashboard(dashboardId: number): Promise<DashboardWidget[]> {
    const query = `
      SELECT * FROM dashboard_widgets 
      WHERE dashboard_id = $1 AND is_active = true
      ORDER BY position_y, position_x
    `;
    const result = await this.pool.query(query, [dashboardId]);
    return result.rows.map(row => this.mapToWidget(row));
  }

  async updateWidget(
    id: number, 
    updates: Partial<DashboardWidget>
  ): Promise<DashboardWidget | null> {
    const allowedFields = [
      'widget_type', 'title', 'data_source', 'query_config',
      'visualization_config', 'position_x', 'position_y',
      'width', 'height', 'refresh_interval', 'is_active'
    ];

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const field of allowedFields) {
      if (field in updates) {
        let value = (updates as any)[field];
        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }
        updateFields.push(`${field} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      return this.findWidgetById(id);
    }

    values.push(id);
    const query = `
      UPDATE dashboard_widgets 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.mapToWidget(result.rows[0]) : null;
  }

  async deleteWidget(id: number): Promise<boolean> {
    const query = 'DELETE FROM dashboard_widgets WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async updateWidgetPositions(
    widgets: Array<{ id: number; position_x: number; position_y: number }>
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const widget of widgets) {
        await client.query(
          'UPDATE dashboard_widgets SET position_x = $1, position_y = $2 WHERE id = $3',
          [widget.position_x, widget.position_y, widget.id]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cloneDashboard(
    dashboardId: number,
    newName: string,
    userId?: number
  ): Promise<DashboardConfiguration> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Clone dashboard configuration
      const dashboardQuery = `
        INSERT INTO dashboard_configurations (
          company_id, user_id, name, description, layout_type,
          widgets, filters, refresh_interval, is_default,
          is_public, is_active
        )
        SELECT 
          company_id, $2, $3, description, layout_type,
          widgets, filters, refresh_interval, false,
          false, true
        FROM dashboard_configurations
        WHERE id = $1
        RETURNING *
      `;

      const dashboardResult = await client.query(
        dashboardQuery, 
        [dashboardId, userId, newName]
      );
      const newDashboard = this.mapToDashboard(dashboardResult.rows[0]);

      // Clone widgets
      const widgetsQuery = `
        INSERT INTO dashboard_widgets (
          dashboard_id, widget_type, title, data_source,
          query_config, visualization_config, position_x, position_y,
          width, height, refresh_interval, is_active
        )
        SELECT 
          $2, widget_type, title, data_source,
          query_config, visualization_config, position_x, position_y,
          width, height, refresh_interval, is_active
        FROM dashboard_widgets
        WHERE dashboard_id = $1 AND is_active = true
      `;

      await client.query(widgetsQuery, [dashboardId, newDashboard.id]);

      await client.query('COMMIT');
      return newDashboard;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getDashboardWithWidgets(id: number): Promise<any> {
    const dashboard = await this.findDashboardById(id);
    if (!dashboard) {
      return null;
    }

    const widgets = await this.findWidgetsByDashboard(id);
    return {
      ...dashboard,
      widgets
    };
  }

  private mapToDashboard(row: any): DashboardConfiguration {
    return {
      id: row.id,
      company_id: row.company_id,
      user_id: row.user_id,
      name: row.name,
      description: row.description,
      layout_type: row.layout_type,
      widgets: typeof row.widgets === 'string' ? JSON.parse(row.widgets) : row.widgets,
      filters: typeof row.filters === 'string' ? JSON.parse(row.filters) : row.filters,
      refresh_interval: row.refresh_interval,
      is_default: row.is_default,
      is_public: row.is_public,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private mapToWidget(row: any): DashboardWidget {
    return {
      id: row.id,
      dashboard_id: row.dashboard_id,
      widget_type: row.widget_type,
      title: row.title,
      data_source: row.data_source,
      query_config: typeof row.query_config === 'string' ? 
        JSON.parse(row.query_config) : row.query_config,
      visualization_config: typeof row.visualization_config === 'string' ? 
        JSON.parse(row.visualization_config) : row.visualization_config,
      position_x: row.position_x,
      position_y: row.position_y,
      width: row.width,
      height: row.height,
      refresh_interval: row.refresh_interval,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}