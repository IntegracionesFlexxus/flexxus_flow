// repositories/BaseOmniRepository.ts
import { Pool } from 'pg';
import { inject, injectable } from 'inversify';
import { OMNI_TYPES } from '../types/omni.types';

@injectable()
export class BaseOmniRepository<T = any> {
  constructor(@inject(OMNI_TYPES.OmniDbPool) private pool: Pool) {}

  protected async executeQuery<R = T>(
    tableName: string,
    query: string,
    params: any[] = []
  ): Promise<R[]> {
    const client = await this.pool.connect();
    try {
      // Setear company_id para RLS si es necesario
      const companyId = this.getCompanyId();
      if (companyId) {
        await client.query('SET app.current_company_id = $1', [companyId]);
      }

      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  protected getCompanyId(): string | null {
    // Obtener desde contexto (implementar según necesidad)
    return null;
  }

  async findById<R = T>(tableName: string, id: string): Promise<R | null> {
    const query = `SELECT * FROM ${tableName} WHERE id = $1`;
    const results = await this.executeQuery<R>(tableName, query, [id]);
    return results[0] || null;
  }

  async findAll<R = T>(tableName: string, companyId: string): Promise<R[]> {
    const query = `SELECT * FROM ${tableName} WHERE company_id = $1`;
    return this.executeQuery<R>(tableName, query, [companyId]);
  }

  async create<R = T>(tableName: string, data: Partial<R>): Promise<R> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${tableName} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const results = await this.executeQuery<R>(tableName, query, values);
    return results[0];
  }

  async update<R = T>(tableName: string, id: string, data: Partial<R>): Promise<R | null> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');

    const query = `
      UPDATE ${tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const results = await this.executeQuery<R>(tableName, query, [id, ...values]);
    return results[0] || null;
  }

  async delete(tableName: string, id: string): Promise<boolean> {
    const query = `DELETE FROM ${tableName} WHERE id = $1`;
    await this.executeQuery(tableName, query, [id]);
    return true;
  }
}