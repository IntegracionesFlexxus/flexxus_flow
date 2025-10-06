/**
 * Account Health Repository
 * Data access layer for account health scoring
 */

import { injectable, inject, optional } from 'inversify';
import { CRMBaseRepository } from './CRMBaseRepository';
import { AccountHealthScore, HealthAlert } from '../types/health.types';
import { TYPES } from '@/container/types';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { Logger } from 'winston';

@injectable()
export class AccountHealthRepository extends CRMBaseRepository<AccountHealthScore> {
  constructor(
    @inject(TYPES.SharedConnection) db: IDatabaseConnection,
    @inject(TYPES.Logger) @optional() logger?: Logger
  ) {
    super('account_health_scores', db, logger);
    this.schema = 'public'; // Sprint 17 uses public schema

    this.allowedFields = new Set([
      'id', 'company_id', 'account_id', 'score', 'grade', 'trend',
      'engagement_score', 'revenue_score', 'relationship_score', 'activity_score',
      'risk_score', 'scoring_weights', 'factors', 'recommendations',
      'calculated_at', 'next_review_date', 'created_at', 'updated_at',
      'created_by', 'updated_by'
    ]);
  }

  /**
   * Get latest health score for account
   */
  async getLatestHealthScore(
    companyId: number,
    accountId: number
  ): Promise<AccountHealthScore | null> {
    const query = `
      SELECT *
      FROM ${this.schema}.${this.tableName}
      WHERE company_id = $1 AND account_id = $2
      ORDER BY calculated_at DESC
      LIMIT 1
    `;

    const result = await this.db.query(query, [companyId, accountId]);
    return result.rows[0] || null;
  }

  /**
   * Get health score history
   */
  async getHealthHistory(
    companyId: number,
    accountId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<AccountHealthScore[]> {
    let query = `
      SELECT *
      FROM ${this.schema}.${this.tableName}
      WHERE company_id = $1 AND account_id = $2
    `;

    const params: any[] = [companyId, accountId];

    if (startDate) {
      query += ` AND calculated_at >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND calculated_at <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ' ORDER BY calculated_at DESC';

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Calculate health metrics for account
   */
  async calculateHealthMetrics(
    companyId: number,
    accountId: number
  ): Promise<any> {
    const query = `
      WITH account_metrics AS (
        SELECT
          a.id,
          a.name,
          a.annual_revenue,
          a.employee_count,
          a.last_activity_date,
          a.account_tier,
          a.nps_score,
          a.lifetime_value,
          a.churn_risk_score,
          -- Engagement metrics
          COUNT(DISTINCT act.id) as activity_count_30d,
          COUNT(DISTINCT CASE WHEN act.type = 'meeting' THEN act.id END) as meeting_count_30d,
          COUNT(DISTINCT c.id) as contact_count,
          COUNT(DISTINCT cr.contact_id) as engaged_contacts,
          -- Revenue metrics
          COUNT(DISTINCT o.id) as opportunity_count,
          SUM(CASE WHEN o.stage = 'closed_won' THEN o.expected_revenue ELSE 0 END) as total_revenue,
          SUM(CASE WHEN o.stage NOT IN ('closed_won', 'closed_lost') THEN o.expected_revenue ELSE 0 END) as pipeline_value,
          AVG(o.probability) as avg_deal_probability,
          -- Relationship metrics
          MAX(cr.influence_level) as max_influence_level,
          AVG(cr.engagement_level) as avg_engagement_level,
          COUNT(DISTINCT CASE WHEN cr.decision_authority >= 7 THEN cr.contact_id END) as decision_maker_count,
          -- Activity recency
          EXTRACT(DAY FROM CURRENT_DATE - MAX(act.activity_date)) as days_since_last_activity,
          EXTRACT(DAY FROM CURRENT_DATE - MAX(CASE WHEN act.type = 'meeting' THEN act.activity_date END)) as days_since_last_meeting
        FROM ${this.schema}.accounts a
        LEFT JOIN ${this.schema}.activities act ON a.id = act.account_id
          AND act.activity_date >= CURRENT_DATE - INTERVAL '30 days'
        LEFT JOIN ${this.schema}.contacts c ON a.id = c.account_id
        LEFT JOIN ${this.schema}.contact_roles cr ON c.id = cr.contact_id
        LEFT JOIN ${this.schema}.opportunities o ON a.id = o.account_id
        WHERE a.company_id = $1 AND a.id = $2
        GROUP BY a.id
      )
      SELECT * FROM account_metrics
    `;

    const result = await this.db.query(query, [companyId, accountId]);
    return result.rows[0];
  }

  /**
   * Create or update health score
   */
  async upsertHealthScore(
    companyId: number,
    accountId: number,
    data: Partial<AccountHealthScore>
  ): Promise<AccountHealthScore> {
    const query = `
      INSERT INTO ${this.schema}.${this.tableName} (
        company_id, account_id, score, grade, trend,
        engagement_score, revenue_score, relationship_score, activity_score, risk_score,
        scoring_weights, factors, recommendations,
        calculated_at, next_review_date, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (company_id, account_id, calculated_at::date)
      DO UPDATE SET
        score = EXCLUDED.score,
        grade = EXCLUDED.grade,
        trend = EXCLUDED.trend,
        engagement_score = EXCLUDED.engagement_score,
        revenue_score = EXCLUDED.revenue_score,
        relationship_score = EXCLUDED.relationship_score,
        activity_score = EXCLUDED.activity_score,
        risk_score = EXCLUDED.risk_score,
        scoring_weights = EXCLUDED.scoring_weights,
        factors = EXCLUDED.factors,
        recommendations = EXCLUDED.recommendations,
        next_review_date = EXCLUDED.next_review_date,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await this.db.query(query, [
      companyId,
      accountId,
      data.score,
      data.grade,
      data.trend,
      data.engagement_score,
      data.revenue_score,
      data.relationship_score,
      data.activity_score,
      data.risk_score,
      JSON.stringify(data.scoring_weights || {}),
      JSON.stringify(data.factors || {}),
      JSON.stringify(data.recommendations || []),
      data.calculated_at || new Date(),
      data.next_review_date,
      data.created_by
    ]);

    return result.rows[0];
  }

  /**
   * Get health alerts
   */
  async getHealthAlerts(
    companyId: number,
    filters?: { severity?: string; status?: string; accountId?: number }
  ): Promise<HealthAlert[]> {
    let query = `
      SELECT
        ha.*,
        a.name as account_name,
        a.type as account_type,
        ahs.score as current_score,
        ahs.grade as current_grade
      FROM ${this.schema}.health_alerts ha
      JOIN ${this.schema}.accounts a ON ha.account_id = a.id
      LEFT JOIN ${this.schema}.account_health_scores ahs ON ha.account_id = ahs.account_id
        AND ahs.calculated_at = (
          SELECT MAX(calculated_at)
          FROM ${this.schema}.account_health_scores
          WHERE account_id = ha.account_id
        )
      WHERE ha.company_id = $1
    `;

    const params: any[] = [companyId];

    if (filters?.severity) {
      query += ` AND ha.severity = $${params.length + 1}`;
      params.push(filters.severity);
    }

    if (filters?.status) {
      query += ` AND ha.status = $${params.length + 1}`;
      params.push(filters.status);
    }

    if (filters?.accountId) {
      query += ` AND ha.account_id = $${params.length + 1}`;
      params.push(filters.accountId);
    }

    query += ' ORDER BY ha.created_at DESC';

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Create health alert
   */
  async createHealthAlert(
    companyId: number,
    alert: Partial<HealthAlert>
  ): Promise<HealthAlert> {
    const query = `
      INSERT INTO ${this.schema}.health_alerts (
        company_id, account_id, alert_type, severity, status,
        message, threshold_violated, metric_value, recommended_action,
        metadata, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      companyId,
      alert.account_id,
      alert.alert_type,
      alert.severity,
      alert.status || 'new',
      alert.message,
      alert.threshold_value,
      alert.metric_value,
      alert.recommended_action,
      JSON.stringify(alert.metadata || {}),
      alert.created_at
    ]);

    return result.rows[0];
  }

  /**
   * Update health alert status
   */
  async updateAlertStatus(
    companyId: number,
    alertId: number,
    status: string,
    resolvedBy?: number,
    resolutionNotes?: string
  ): Promise<HealthAlert> {
    const query = `
      UPDATE ${this.schema}.health_alerts
      SET
        status = $3,
        resolved_by = $4,
        resolved_at = CASE WHEN $3 = 'resolved' THEN CURRENT_TIMESTAMP ELSE NULL END,
        resolution_notes = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE company_id = $1 AND id = $2
      RETURNING *
    `;

    const result = await this.db.query(query, [
      companyId,
      alertId,
      status,
      resolvedBy || null,
      resolutionNotes || null
    ]);

    return result.rows[0];
  }

  /**
   * Get accounts by health grade
   */
  async getAccountsByHealthGrade(
    companyId: number,
    grade: string
  ): Promise<any[]> {
    const query = `
      SELECT
        a.*,
        ahs.score,
        ahs.grade,
        ahs.trend,
        ahs.calculated_at
      FROM ${this.schema}.accounts a
      JOIN ${this.schema}.account_health_scores ahs ON a.id = ahs.account_id
        AND ahs.calculated_at = (
          SELECT MAX(calculated_at)
          FROM ${this.schema}.account_health_scores
          WHERE account_id = a.id
        )
      WHERE a.company_id = $1 AND ahs.grade = $2
      ORDER BY ahs.score DESC, a.name
    `;

    const result = await this.db.query(query, [companyId, grade]);
    return result.rows;
  }

  /**
   * Get health score distribution
   */
  async getHealthScoreDistribution(companyId: number): Promise<any> {
    const query = `
      WITH latest_scores AS (
        SELECT DISTINCT ON (account_id)
          account_id,
          score,
          grade,
          trend
        FROM ${this.schema}.account_health_scores
        WHERE company_id = $1
        ORDER BY account_id, calculated_at DESC
      )
      SELECT
        grade,
        COUNT(*) as count,
        AVG(score) as avg_score,
        MIN(score) as min_score,
        MAX(score) as max_score,
        COUNT(CASE WHEN trend = 'improving' THEN 1 END) as improving,
        COUNT(CASE WHEN trend = 'declining' THEN 1 END) as declining,
        COUNT(CASE WHEN trend = 'stable' THEN 1 END) as stable
      FROM latest_scores
      GROUP BY grade
      ORDER BY
        CASE grade
          WHEN 'A' THEN 1
          WHEN 'B' THEN 2
          WHEN 'C' THEN 3
          WHEN 'D' THEN 4
          WHEN 'F' THEN 5
        END
    `;

    const result = await this.db.query(query, [companyId]);
    return result.rows;
  }

  /**
   * Get health trends
   */
  async getHealthTrends(
    companyId: number,
    period: string = '30d'
  ): Promise<any> {
    const interval = period === '7d' ? '7 days'
      : period === '30d' ? '30 days'
      : period === '90d' ? '90 days'
      : '30 days';

    const query = `
      SELECT
        DATE(calculated_at) as date,
        AVG(score) as avg_score,
        COUNT(DISTINCT account_id) as accounts_scored,
        COUNT(CASE WHEN grade = 'A' THEN 1 END) as grade_a,
        COUNT(CASE WHEN grade = 'B' THEN 1 END) as grade_b,
        COUNT(CASE WHEN grade = 'C' THEN 1 END) as grade_c,
        COUNT(CASE WHEN grade = 'D' THEN 1 END) as grade_d,
        COUNT(CASE WHEN grade = 'F' THEN 1 END) as grade_f
      FROM ${this.schema}.account_health_scores
      WHERE company_id = $1
        AND calculated_at >= CURRENT_DATE - INTERVAL '${interval}'
      GROUP BY DATE(calculated_at)
      ORDER BY date
    `;

    const result = await this.db.query(query, [companyId]);
    return result.rows;
  }
}