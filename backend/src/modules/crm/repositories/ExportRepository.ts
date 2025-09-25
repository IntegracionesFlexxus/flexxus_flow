import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '../../../container/types';

export interface DataExport {
  id?: number;
  company_id: number;
  export_name: string;
  export_type: 'csv' | 'excel' | 'json' | 'pdf' | 'api';
  entity_type: string;
  filters?: any;
  columns?: string[];
  row_count?: number;
  file_path?: string;
  file_size?: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  error_message?: string;
  started_at?: Date;
  completed_at?: Date;
  expires_at?: Date;
  download_count?: number;
  created_by?: number;
  created_at?: Date;
}

@injectable()
export class ExportRepository {
  constructor(
    @inject(TYPES.DatabasePool) private pool: Pool
  ) {}

  async create(exportData: DataExport): Promise<DataExport> {
    const query = `
      INSERT INTO data_exports (
        company_id, export_name, export_type, entity_type,
        filters, columns, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      exportData.company_id,
      exportData.export_name,
      exportData.export_type,
      exportData.entity_type,
      JSON.stringify(exportData.filters || {}),
      exportData.columns,
      exportData.status || 'pending',
      exportData.created_by
    ];

    const result = await this.pool.query(query, values);
    return this.mapToExport(result.rows[0]);
  }

  async findById(id: number): Promise<DataExport | null> {
    const query = 'SELECT * FROM data_exports WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapToExport(result.rows[0]) : null;
  }

  async findByCompany(
    companyId: number,
    status?: string
  ): Promise<DataExport[]> {
    let query = 'SELECT * FROM data_exports WHERE company_id = $1';
    const values: any[] = [companyId];

    if (status) {
      query += ' AND status = $2';
      values.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.mapToExport(row));
  }

  async findByUser(
    companyId: number,
    userId: number
  ): Promise<DataExport[]> {
    const query = `
      SELECT * FROM data_exports 
      WHERE company_id = $1 AND created_by = $2
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [companyId, userId]);
    return result.rows.map(row => this.mapToExport(row));
  }

  async updateStatus(
    id: number,
    status: string,
    additionalFields?: Partial<DataExport>
  ): Promise<DataExport | null> {
    const fields = ['status = $1'];
    const values: any[] = [status];
    let paramCount = 2;

    if (status === 'processing' && !additionalFields?.started_at) {
      fields.push(`started_at = NOW()`);
    }

    if (status === 'completed' && !additionalFields?.completed_at) {
      fields.push(`completed_at = NOW()`);
      if (!additionalFields?.expires_at) {
        fields.push(`expires_at = NOW() + INTERVAL '7 days'`);
      }
    }

    if (additionalFields) {
      const allowedFields = [
        'row_count', 'file_path', 'file_size', 'error_message',
        'started_at', 'completed_at', 'expires_at'
      ];

      for (const field of allowedFields) {
        if (field in additionalFields) {
          fields.push(`${field} = $${paramCount}`);
          values.push((additionalFields as any)[field]);
          paramCount++;
        }
      }
    }

    values.push(id);
    const query = `
      UPDATE data_exports 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.mapToExport(result.rows[0]) : null;
  }

  async incrementDownloadCount(id: number): Promise<void> {
    const query = `
      UPDATE data_exports 
      SET download_count = download_count + 1
      WHERE id = $1
    `;
    await this.pool.query(query, [id]);
  }

  async cleanupExpired(): Promise<number> {
    const query = `
      UPDATE data_exports 
      SET status = 'expired'
      WHERE status = 'completed' 
      AND expires_at < NOW()
      AND status != 'expired'
    `;
    const result = await this.pool.query(query);
    return result.rowCount;
  }

  async getExportStatistics(companyId: number): Promise<any> {
    const query = `
      SELECT 
        export_type,
        entity_type,
        status,
        COUNT(*) as count,
        SUM(row_count) as total_rows,
        SUM(file_size) as total_size,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
      FROM data_exports
      WHERE company_id = $1
      GROUP BY export_type, entity_type, status
    `;

    const result = await this.pool.query(query, [companyId]);
    return result.rows;
  }

  async delete(id: number): Promise<boolean> {
    const query = 'DELETE FROM data_exports WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  private mapToExport(row: any): DataExport {
    return {
      id: row.id,
      company_id: row.company_id,
      export_name: row.export_name,
      export_type: row.export_type,
      entity_type: row.entity_type,
      filters: typeof row.filters === 'string' ? JSON.parse(row.filters) : row.filters,
      columns: row.columns,
      row_count: row.row_count,
      file_path: row.file_path,
      file_size: row.file_size ? parseInt(row.file_size) : undefined,
      status: row.status,
      error_message: row.error_message,
      started_at: row.started_at,
      completed_at: row.completed_at,
      expires_at: row.expires_at,
      download_count: row.download_count,
      created_by: row.created_by,
      created_at: row.created_at
    };
  }
}