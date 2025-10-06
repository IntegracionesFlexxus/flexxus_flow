import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '../../../container/types';

export interface IntegrationLog {
  id?: number;
  company_id: number;
  integration_type: string;
  module_source?: string;
  module_target?: string;
  operation?: 'sync' | 'import' | 'export' | 'webhook' | 'api_call';
  entity_type?: string;
  entity_id?: number;
  records_affected?: number;
  request_data?: any;
  response_data?: any;
  status?: string;
  error_code?: string;
  error_message?: string;
  retry_count?: number;
  duration_ms?: number;
  initiated_by?: number;
  created_at?: Date;
}

@injectable()
export class IntegrationLogRepository {
  constructor(
    @inject(TYPES.CrmConnection) private pool: Pool
  ) {}

  async create(log: IntegrationLog): Promise<IntegrationLog> {
    const query = `
      INSERT INTO integration_logs (
        company_id, integration_type, module_source, module_target,
        operation, entity_type, entity_id, records_affected,
        request_data, response_data, status, error_code,
        error_message, retry_count, duration_ms, initiated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      log.company_id,
      log.integration_type,
      log.module_source,
      log.module_target,
      log.operation,
      log.entity_type,
      log.entity_id,
      log.records_affected,
      JSON.stringify(log.request_data || {}),
      JSON.stringify(log.response_data || {}),
      log.status || 'pending',
      log.error_code,
      log.error_message,
      log.retry_count || 0,
      log.duration_ms,
      log.initiated_by
    ];

    const result = await this.pool.query(query, values);
    return this.mapToIntegrationLog(result.rows[0]);
  }

  async findById(id: number): Promise<IntegrationLog | null> {
    const query = 'SELECT * FROM integration_logs WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapToIntegrationLog(result.rows[0]) : null;
  }

  async findByCompany(
    companyId: number,
    filters?: {
      integration_type?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<IntegrationLog[]> {
    let query = 'SELECT * FROM integration_logs WHERE company_id = $1';
    const values: any[] = [companyId];
    let paramCount = 2;

    if (filters?.integration_type) {
      query += ` AND integration_type = $${paramCount}`;
      values.push(filters.integration_type);
      paramCount++;
    }

    if (filters?.status) {
      query += ` AND status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }

    if (filters?.startDate) {
      query += ` AND created_at >= $${paramCount}`;
      values.push(filters.startDate);
      paramCount++;
    }

    if (filters?.endDate) {
      query += ` AND created_at <= $${paramCount}`;
      values.push(filters.endDate);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC LIMIT 1000';

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.mapToIntegrationLog(row));
  }

  async findByIntegrationType(
    companyId: number,
    integrationType: string,
    limit: number = 100
  ): Promise<IntegrationLog[]> {
    const query = `
      SELECT * FROM integration_logs 
      WHERE company_id = $1 AND integration_type = $2
      ORDER BY created_at DESC
      LIMIT $3
    `;
    const result = await this.pool.query(query, [companyId, integrationType, limit]);
    return result.rows.map(row => this.mapToIntegrationLog(row));
  }

  async findFailedLogs(
    companyId: number,
    limit: number = 50
  ): Promise<IntegrationLog[]> {
    const query = `
      SELECT * FROM integration_logs 
      WHERE company_id = $1 
      AND status IN ('failed', 'error')
      AND created_at >= NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await this.pool.query(query, [companyId, limit]);
    return result.rows.map(row => this.mapToIntegrationLog(row));
  }

  async updateStatus(
    id: number,
    status: string,
    additionalData?: {
      response_data?: any;
      error_code?: string;
      error_message?: string;
      records_affected?: number;
      duration_ms?: number;
    }
  ): Promise<IntegrationLog | null> {
    const fields = ['status = $1'];
    const values: any[] = [status];
    let paramCount = 2;

    if (additionalData) {
      if (additionalData.response_data !== undefined) {
        fields.push(`response_data = $${paramCount}`);
        values.push(JSON.stringify(additionalData.response_data));
        paramCount++;
      }

      if (additionalData.error_code !== undefined) {
        fields.push(`error_code = $${paramCount}`);
        values.push(additionalData.error_code);
        paramCount++;
      }

      if (additionalData.error_message !== undefined) {
        fields.push(`error_message = $${paramCount}`);
        values.push(additionalData.error_message);
        paramCount++;
      }

      if (additionalData.records_affected !== undefined) {
        fields.push(`records_affected = $${paramCount}`);
        values.push(additionalData.records_affected);
        paramCount++;
      }

      if (additionalData.duration_ms !== undefined) {
        fields.push(`duration_ms = $${paramCount}`);
        values.push(additionalData.duration_ms);
        paramCount++;
      }
    }

    values.push(id);
    const query = `
      UPDATE integration_logs 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.mapToIntegrationLog(result.rows[0]) : null;
  }

  async incrementRetryCount(id: number): Promise<IntegrationLog | null> {
    const query = `
      UPDATE integration_logs 
      SET retry_count = retry_count + 1
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapToIntegrationLog(result.rows[0]) : null;
  }

  async getIntegrationStatistics(
    companyId: number,
    days: number = 30
  ): Promise<any> {
    const query = `
      SELECT 
        integration_type,
        operation,
        status,
        COUNT(*) as count,
        SUM(records_affected) as total_records,
        AVG(duration_ms) as avg_duration_ms,
        MAX(created_at) as last_execution
      FROM integration_logs
      WHERE company_id = $1
      AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY integration_type, operation, status
      ORDER BY integration_type, operation, status
    `;

    const result = await this.pool.query(query, [companyId]);
    return result.rows;
  }

  async getErrorSummary(
    companyId: number,
    days: number = 7
  ): Promise<any[]> {
    const query = `
      SELECT 
        integration_type,
        error_code,
        COUNT(*) as error_count,
        MAX(error_message) as sample_message,
        MAX(created_at) as last_occurrence
      FROM integration_logs
      WHERE company_id = $1
      AND status IN ('failed', 'error')
      AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY integration_type, error_code
      ORDER BY error_count DESC
    `;

    const result = await this.pool.query(query, [companyId]);
    return result.rows;
  }

  async cleanupOldLogs(days: number = 90): Promise<number> {
    const query = `
      DELETE FROM integration_logs 
      WHERE created_at < NOW() - INTERVAL '${days} days'
    `;
    const result = await this.pool.query(query);
    return result.rowCount;
  }

  private mapToIntegrationLog(row: any): IntegrationLog {
    return {
      id: row.id,
      company_id: row.company_id,
      integration_type: row.integration_type,
      module_source: row.module_source,
      module_target: row.module_target,
      operation: row.operation,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      records_affected: row.records_affected,
      request_data: typeof row.request_data === 'string' ? 
        JSON.parse(row.request_data) : row.request_data,
      response_data: typeof row.response_data === 'string' ? 
        JSON.parse(row.response_data) : row.response_data,
      status: row.status,
      error_code: row.error_code,
      error_message: row.error_message,
      retry_count: row.retry_count,
      duration_ms: row.duration_ms,
      initiated_by: row.initiated_by,
      created_at: row.created_at
    };
  }
}