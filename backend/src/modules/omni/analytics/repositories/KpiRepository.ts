/**
 * KpiRepository - Sprint 13
 * Repository for KPI definitions and values
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import type { Pool } from 'pg';
import {
  KpiDefinition,
  KpiValue,
  DefineKpiDto,
  UpdateKpiDto,
  DateRange
} from '../types/analytics.types';

@injectable()
export class KpiRepository {
  constructor(
    @inject(TYPES.DatabaseConnection) private db: Pool,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Create KPI definition
   */
  async createDefinition(data: DefineKpiDto, companyId: number): Promise<KpiDefinition> {
    try {
      const query = `
        INSERT INTO kpi_definitions (
          company_id, name, description, category, formula, data_source,
          aggregation_type, unit, target_value, min_threshold, max_threshold,
          alert_enabled, display_format, decimal_places, trend_direction
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const values = [
        companyId,
        data.name,
        data.description || null,
        data.category,
        data.formula,
        data.dataSource,
        data.aggregationType,
        data.unit || null,
        data.targetValue || null,
        data.minThreshold || null,
        data.maxThreshold || null,
        data.alertEnabled || false,
        data.displayFormat || 'number',
        data.decimalPlaces || 2,
        data.trendDirection || 'neutral'
      ];

      const result = await this.db.query(query, values);

      this.logger.info('KPI definition created', { kpiId: result.rows[0].id, companyId });

      return this.mapRowToKpiDefinition(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating KPI definition', { error, data, companyId });
      throw new Error(`Failed to create KPI definition: ${error.message}`);
    }
  }

  /**
   * Get KPI definitions for a company
   */
  async getDefinitions(companyId: number, category?: string): Promise<KpiDefinition[]> {
    try {
      let query = `
        SELECT * FROM kpi_definitions
        WHERE (company_id = $1 OR is_system = true)
          AND is_active = true
      `;

      const params: any[] = [companyId];

      if (category) {
        query += ` AND category = $2`;
        params.push(category);
      }

      query += ` ORDER BY category, name`;

      const result = await this.db.query(query, params);

      return result.rows.map(row => this.mapRowToKpiDefinition(row));
    } catch (error) {
      this.logger.error('Error getting KPI definitions', { error, companyId, category });
      throw new Error(`Failed to get KPI definitions: ${error.message}`);
    }
  }

  /**
   * Get KPI definition by ID
   */
  async getDefinitionById(id: number, companyId: number): Promise<KpiDefinition | null> {
    try {
      const query = `
        SELECT * FROM kpi_definitions
        WHERE id = $1 AND (company_id = $2 OR is_system = true)
      `;

      const result = await this.db.query(query, [id, companyId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToKpiDefinition(result.rows[0]);
    } catch (error) {
      this.logger.error('Error getting KPI definition by ID', { error, id, companyId });
      throw new Error(`Failed to get KPI definition: ${error.message}`);
    }
  }

  /**
   * Update KPI definition
   */
  async updateDefinition(id: number, data: UpdateKpiDto, companyId: number): Promise<KpiDefinition> {
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
      if (data.category !== undefined) {
        updateFields.push(`category = $${paramIndex++}`);
        values.push(data.category);
      }
      if (data.formula !== undefined) {
        updateFields.push(`formula = $${paramIndex++}`);
        values.push(data.formula);
      }
      if (data.targetValue !== undefined) {
        updateFields.push(`target_value = $${paramIndex++}`);
        values.push(data.targetValue);
      }
      if (data.minThreshold !== undefined) {
        updateFields.push(`min_threshold = $${paramIndex++}`);
        values.push(data.minThreshold);
      }
      if (data.maxThreshold !== undefined) {
        updateFields.push(`max_threshold = $${paramIndex++}`);
        values.push(data.maxThreshold);
      }
      if (data.alertEnabled !== undefined) {
        updateFields.push(`alert_enabled = $${paramIndex++}`);
        values.push(data.alertEnabled);
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
        UPDATE kpi_definitions
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex++} AND company_id = $${paramIndex++} AND is_system = false
        RETURNING *
      `;

      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`KPI definition ${id} not found or cannot be modified`);
      }

      this.logger.info('KPI definition updated', { kpiId: id, companyId });

      return this.mapRowToKpiDefinition(result.rows[0]);
    } catch (error) {
      this.logger.error('Error updating KPI definition', { error, id, data, companyId });
      throw new Error(`Failed to update KPI definition: ${error.message}`);
    }
  }

  /**
   * Insert KPI value
   */
  async insertValue(kpiId: number, companyId: number, value: number, dimensions?: Record<string, any>): Promise<KpiValue> {
    try {
      // Get previous value for comparison
      const previousValue = await this.getLatestValue(kpiId, companyId);

      const changePercentage = previousValue && previousValue.value !== 0
        ? ((value - previousValue.value) / previousValue.value) * 100
        : null;

      const query = `
        INSERT INTO kpi_values (
          kpi_id, company_id, timestamp, value, previous_value,
          change_percentage, dimensions
        )
        VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [
        kpiId,
        companyId,
        value,
        previousValue?.value || null,
        changePercentage,
        JSON.stringify(dimensions || {})
      ];

      const result = await this.db.query(query, values);

      return this.mapRowToKpiValue(result.rows[0]);
    } catch (error) {
      this.logger.error('Error inserting KPI value', { error, kpiId, value });
      throw new Error(`Failed to insert KPI value: ${error.message}`);
    }
  }

  /**
   * Get KPI values for a date range
   */
  async getValues(kpiId: number, companyId: number, dateRange: DateRange): Promise<KpiValue[]> {
    try {
      const query = `
        SELECT * FROM kpi_values
        WHERE kpi_id = $1
          AND company_id = $2
          AND timestamp >= $3
          AND timestamp <= $4
        ORDER BY timestamp ASC
      `;

      const result = await this.db.query(query, [
        kpiId,
        companyId,
        dateRange.startDate,
        dateRange.endDate
      ]);

      return result.rows.map(row => this.mapRowToKpiValue(row));
    } catch (error) {
      this.logger.error('Error getting KPI values', { error, kpiId, dateRange });
      throw new Error(`Failed to get KPI values: ${error.message}`);
    }
  }

  /**
   * Get latest KPI value
   */
  async getLatestValue(kpiId: number, companyId: number): Promise<KpiValue | null> {
    try {
      const query = `
        SELECT * FROM kpi_values
        WHERE kpi_id = $1 AND company_id = $2
        ORDER BY timestamp DESC
        LIMIT 1
      `;

      const result = await this.db.query(query, [kpiId, companyId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToKpiValue(result.rows[0]);
    } catch (error) {
      this.logger.error('Error getting latest KPI value', { error, kpiId, companyId });
      throw new Error(`Failed to get latest KPI value: ${error.message}`);
    }
  }

  /**
   * Map database row to KpiDefinition object
   */
  private mapRowToKpiDefinition(row: any): KpiDefinition {
    return {
      id: row.id,
      companyId: row.company_id,
      name: row.name,
      description: row.description,
      category: row.category,
      formula: row.formula,
      dataSource: row.data_source,
      aggregationType: row.aggregation_type,
      unit: row.unit,
      targetValue: row.target_value,
      minThreshold: row.min_threshold,
      maxThreshold: row.max_threshold,
      alertEnabled: row.alert_enabled,
      displayFormat: row.display_format,
      decimalPlaces: row.decimal_places,
      trendDirection: row.trend_direction,
      isActive: row.is_active,
      isSystem: row.is_system,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Map database row to KpiValue object
   */
  private mapRowToKpiValue(row: any): KpiValue {
    return {
      id: row.id,
      kpiId: row.kpi_id,
      companyId: row.company_id,
      timestamp: row.timestamp,
      value: parseFloat(row.value),
      previousValue: row.previous_value ? parseFloat(row.previous_value) : undefined,
      changePercentage: row.change_percentage ? parseFloat(row.change_percentage) : undefined,
      dimensions: typeof row.dimensions === 'string' ? JSON.parse(row.dimensions) : row.dimensions,
      filtersApplied: typeof row.filters_applied === 'string' ? JSON.parse(row.filters_applied) : row.filters_applied,
      calculatedAt: row.calculated_at
    };
  }
}

interface Logger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
}
