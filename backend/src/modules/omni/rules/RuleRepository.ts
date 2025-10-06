/**
 * Rule Repository - Sprint 07
 * Handles persistence and retrieval of automation rules
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { BaseOmniRepository } from '../repositories/base/BaseOmniRepository';
import { IRule } from './interfaces/IRule';

@injectable()
export class RuleRepository extends BaseOmniRepository<IRule> {
  protected tableName = 'automation_rules';

  constructor() {
    super();
  }

  /**
   * Find active rules by company
   */
  async findActiveByCompany(companyId: string): Promise<IRule[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE company_id = $1 AND is_active = true
      ORDER BY priority DESC, created_at ASC
    `;

    const result = await this.executeQuery(query, [companyId], companyId);
    return result.rows;
  }

  /**
   * Find rules by type
   */
  async findByType(type: string, companyId: string): Promise<IRule[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE company_id = $1 AND type = $2 AND is_active = true
      ORDER BY priority DESC
    `;

    const result = await this.executeQuery(query, [companyId, type], companyId);
    return result.rows;
  }

  /**
   * Increment execution count
   */
  async incrementExecutionCount(ruleId: string, companyId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET execution_count = COALESCE(execution_count, 0) + 1,
          last_executed_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND company_id = $2
    `;

    await this.executeQuery(query, [ruleId, companyId], companyId);
  }

  /**
   * Create automation log
   */
  async createLog(log: any): Promise<void> {
    const query = `
      INSERT INTO automation_logs (
        company_id, log_type, rule_id, conversation_id, customer_id,
        action_type, action_details, input_data, output_data,
        result, execution_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const params = [
      log.company_id,
      log.log_type,
      log.rule_id,
      log.conversation_id,
      log.customer_id,
      log.action_type,
      JSON.stringify(log.action_details),
      JSON.stringify(log.input_data),
      JSON.stringify(log.output_data),
      log.result,
      log.execution_time_ms
    ];

    await this.executeQuery(query, params, log.company_id);
  }

  /**
   * Get execution statistics
   */
  async getExecutionStatistics(
    companyId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<any> {
    let query = `
      SELECT
        r.id,
        r.name,
        r.type,
        r.priority,
        r.execution_count,
        r.last_executed_at,
        COUNT(CASE WHEN al.result = 'success' THEN 1 END) as success_count,
        COUNT(CASE WHEN al.result = 'failure' THEN 1 END) as failure_count,
        AVG(al.execution_time_ms) as avg_execution_time
      FROM ${this.tableName} r
      LEFT JOIN automation_logs al ON al.rule_id = r.id
      WHERE r.company_id = $1
    `;

    const params: any[] = [companyId];

    if (dateRange) {
      query += ` AND al.created_at BETWEEN $2 AND $3`;
      params.push(dateRange.start, dateRange.end);
    }

    query += `
      GROUP BY r.id, r.name, r.type, r.priority, r.execution_count, r.last_executed_at
      ORDER BY r.execution_count DESC
    `;

    const result = await this.executeQuery(query, params, companyId);
    return result.rows;
  }

  /**
   * Find rules with conditions matching specific fields
   */
  async findByConditionField(field: string, companyId: string): Promise<IRule[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE company_id = $1
        AND is_active = true
        AND conditions @> $2
      ORDER BY priority DESC
    `;

    const conditionFilter = JSON.stringify([{ field }]);
    const result = await this.executeQuery(query, [companyId, conditionFilter], companyId);
    return result.rows;
  }

  /**
   * Get rule performance metrics
   */
  async getRulePerformance(ruleId: string, companyId: string): Promise<any> {
    const query = `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as executions,
        COUNT(CASE WHEN result = 'success' THEN 1 END) as successes,
        COUNT(CASE WHEN result = 'failure' THEN 1 END) as failures,
        AVG(execution_time_ms) as avg_time,
        MIN(execution_time_ms) as min_time,
        MAX(execution_time_ms) as max_time
      FROM automation_logs
      WHERE rule_id = $1 AND company_id = $2
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const result = await this.executeQuery(query, [ruleId, companyId], companyId);
    return result.rows;
  }
}