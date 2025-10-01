/**
 * Pricing Repository
 * Sprint 20 Implementation
 */

import { injectable } from 'inversify';
import { Pool } from 'pg';
import { IPricingRepository } from '../interfaces/IPricingRepository';

@injectable()
export class PricingRepository implements IPricingRepository {
  constructor(private pool: Pool) {}

  async getPromotionByCode(code: string): Promise<any> {
    const query = `
      SELECT *
      FROM promotion_rules
      WHERE promotion_code = $1
    `;

    const result = await this.pool.query(query, [code]);
    return result.rows[0] || null;
  }
}
