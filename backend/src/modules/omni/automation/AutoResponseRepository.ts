/**
 * Auto Response Repository - Sprint 07
 * Handles persistence of auto-response configurations
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { BaseOmniRepository } from '../repositories/base/BaseOmniRepository';
import { IAutoResponse } from './AutoResponseService';

@injectable()
export class AutoResponseRepository extends BaseOmniRepository<IAutoResponse> {
  constructor(@inject(TYPES.OmniConnection) pool: Pool) {
    super(pool, 'auto_responses');
  }

  /**
   * Find active auto-responses by company
   */
  async findActiveByCompany(companyId: string): Promise<IAutoResponse[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE company_id = $1 AND is_active = true
      ORDER BY created_at ASC
    `;

    const result = await this.executeQuery(query, [companyId], companyId);
    return result.rows;
  }

  /**
   * Find auto-responses by channel
   */
  async findByChannel(channelType: string, companyId: string): Promise<IAutoResponse[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE company_id = $1
        AND (channel_type = $2 OR channel_type IS NULL)
        AND is_active = true
      ORDER BY channel_type NULLS LAST, created_at ASC
    `;

    const result = await this.executeQuery(query, [companyId, channelType], companyId);
    return result.rows;
  }

  /**
   * Find by trigger type
   */
  async findByTriggerType(triggerType: string, companyId: string): Promise<IAutoResponse[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE company_id = $1 AND trigger_type = $2 AND is_active = true
      ORDER BY created_at ASC
    `;

    const result = await this.executeQuery(query, [companyId, triggerType], companyId);
    return result.rows;
  }

  /**
   * Increment use count
   */
  async incrementUseCount(id: string, companyId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET use_count = COALESCE(use_count, 0) + 1,
          last_used_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND company_id = $2
    `;

    await this.executeQuery(query, [id, companyId], companyId);
  }

  /**
   * Get statistics
   */
  async getStatistics(companyId: string): Promise<any> {
    const query = `
      SELECT
        trigger_type,
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        SUM(COALESCE(use_count, 0)) as total_uses,
        AVG(COALESCE(use_count, 0)) as avg_uses,
        MAX(last_used_at) as last_used
      FROM ${this.tableName}
      WHERE company_id = $1
      GROUP BY trigger_type
    `;

    const result = await this.executeQuery(query, [companyId], companyId);
    return result.rows;
  }
}