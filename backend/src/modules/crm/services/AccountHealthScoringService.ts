/**
 * Account Health Scoring Service
 * Sprint 17: Account Health Management
 *
 * Calculates multi-dimensional health scores for accounts,
 * manages alerts, and provides health trend analysis.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import winston from 'winston';
import {
  AccountHealth,
  AccountHealthHistory,
  HealthAlert,
  HealthMetrics,
  HealthGrade,
  AlertType,
  AlertSeverity,
  HealthScoreRequest,
  HealthScoreResponse,
  HealthRecommendation,
  HealthDashboard,
  ScoringWeights
} from '../types/health.types';

@injectable()
export class AccountHealthScoringService {
  private readonly DEFAULT_WEIGHTS: ScoringWeights = {
    revenue: 0.30,
    engagement: 0.25,
    relationship: 0.20,
    product_adoption: 0.15,
    support: 0.10
  };

  private readonly GRADE_THRESHOLDS = {
    A: 90,
    B: 80,
    C: 70,
    D: 60,
    F: 0
  };

  constructor(
    @inject(TYPES.CrmConnection) private db: Pool,
    @inject(TYPES.Logger) private logger: winston.Logger
  ) {}

  /**
   * Calculates account health score
   * @param companyId - Company ID
   * @param accountId - Account ID
   * @param forceRecalculation - Force recalculation even if recent score exists
   * @returns Account health score and details
   */
  async calculateAccountHealth(
    companyId: number,
    accountId: number,
    forceRecalculation: boolean = false
  ): Promise<AccountHealth> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Check if recent calculation exists (within last hour)
      if (!forceRecalculation) {
        const recentScore = await client.query(
          `SELECT * FROM account_health_history
           WHERE company_id = $1 AND account_id = $2
             AND calculated_at > NOW() - INTERVAL '1 hour'
           ORDER BY calculated_at DESC
           LIMIT 1`,
          [companyId, accountId]
        );

        if (recentScore.rows.length > 0) {
          const score = recentScore.rows[0];
          return this.mapHistoryToHealth(score);
        }
      }

      // Get account details
      const account = await client.query(
        'SELECT * FROM accounts WHERE id = $1 AND company_id = $2',
        [accountId, companyId]
      );

      if (account.rows.length === 0) {
        throw new Error('Account not found');
      }

      // Get scoring weights from config
      const weights = await this.getScoringWeights(companyId, client);

      // Calculate component scores
      const revenueScore = await this.calculateRevenueHealth(companyId, accountId, client);
      const engagementScore = await this.calculateEngagementHealth(companyId, accountId, client);
      const relationshipScore = await this.calculateRelationshipHealth(companyId, accountId, client);
      const productAdoptionScore = await this.calculateProductAdoptionHealth(companyId, accountId, client);
      const supportScore = await this.calculateSupportHealth(companyId, accountId, client);

      // Calculate weighted overall score
      const overallScore = Math.round(
        revenueScore * weights.revenue +
        engagementScore * weights.engagement +
        relationshipScore * weights.relationship +
        productAdoptionScore * weights.product_adoption +
        supportScore * weights.support
      );

      const overallGrade = this.calculateGrade(overallScore);

      // Identify risk factors and opportunities
      const riskFactors = this.identifyRiskFactors({
        revenueScore,
        engagementScore,
        relationshipScore,
        productAdoptionScore,
        supportScore
      });

      const opportunities = this.identifyOpportunities({
        revenueScore,
        engagementScore,
        relationshipScore,
        productAdoptionScore,
        supportScore
      });

      // Calculate trend
      const trend = await this.calculateTrend(companyId, accountId, overallScore, client);

      // Save to history
      await client.query(
        `INSERT INTO account_health_history
         (company_id, account_id, overall_score, overall_grade,
          revenue_score, engagement_score, relationship_score,
          product_adoption_score, support_score, risk_factors, opportunities)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          companyId,
          accountId,
          overallScore,
          overallGrade,
          revenueScore,
          engagementScore,
          relationshipScore,
          productAdoptionScore,
          supportScore,
          JSON.stringify(riskFactors),
          JSON.stringify(opportunities)
        ]
      );

      // Update account record
      await client.query(
        `UPDATE accounts
         SET health_score = $1,
             health_grade = $2,
             last_health_calculation = CURRENT_TIMESTAMP
         WHERE id = $3 AND company_id = $4`,
        [overallScore, overallGrade, accountId, companyId]
      );

      // Check and create alerts if needed
      await this.checkAndCreateAlerts(
        companyId,
        accountId,
        overallScore,
        overallGrade,
        riskFactors,
        client
      );

      await client.query('COMMIT');

      const health: AccountHealth = {
        account_id: accountId,
        overall_score: overallScore,
        overall_grade: overallGrade,
        revenue_score: revenueScore,
        engagement_score: engagementScore,
        relationship_score: relationshipScore,
        product_adoption_score: productAdoptionScore,
        support_score: supportScore,
        risk_factors: riskFactors,
        opportunities,
        trend,
        last_calculated: new Date()
      };

      this.logger.info('Account health calculated', {
        companyId,
        accountId,
        overallScore,
        overallGrade
      });

      return health;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error calculating account health', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Gets health trend for an account
   * @param companyId - Company ID
   * @param accountId - Account ID
   * @param days - Number of days to look back
   * @returns Health trend data
   */
  async getHealthTrend(
    companyId: number,
    accountId: number,
    days: number = 90
  ): Promise<AccountHealthHistory[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM account_health_history
         WHERE company_id = $1 AND account_id = $2
           AND calculated_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'
         ORDER BY calculated_at DESC`,
        [companyId, accountId]
      );

      return result.rows;
    } catch (error) {
      this.logger.error('Error getting health trend', error);
      throw error;
    }
  }

  /**
   * Gets health alerts for an account or all accounts
   * @param companyId - Company ID
   * @param accountId - Optional account ID
   * @param severity - Optional severity filter
   * @returns List of health alerts
   */
  async getHealthAlerts(
    companyId: number,
    accountId?: number,
    severity?: AlertSeverity
  ): Promise<HealthAlert[]> {
    try {
      let query = 'SELECT * FROM account_health_alerts WHERE company_id = $1';
      const params: any[] = [companyId];
      let paramCounter = 2;

      if (accountId) {
        query += ` AND account_id = $${paramCounter++}`;
        params.push(accountId);
      }

      if (severity) {
        query += ` AND alert_severity = $${paramCounter++}`;
        params.push(severity);
      }

      query += ' AND is_acknowledged = false ORDER BY created_at DESC';

      const result = await this.db.query(query, params);

      return result.rows;
    } catch (error) {
      this.logger.error('Error getting health alerts', error);
      throw error;
    }
  }

  /**
   * Acknowledges a health alert
   * @param companyId - Company ID
   * @param alertId - Alert ID
   * @param userId - User acknowledging the alert
   */
  async acknowledgeAlert(
    companyId: number,
    alertId: number,
    userId: number
  ): Promise<void> {
    try {
      await this.db.query(
        `UPDATE account_health_alerts
         SET is_acknowledged = true,
             acknowledged_by = $3,
             acknowledged_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND company_id = $2`,
        [alertId, companyId, userId]
      );

      this.logger.info('Alert acknowledged', {
        companyId,
        alertId,
        userId
      });
    } catch (error) {
      this.logger.error('Error acknowledging alert', error);
      throw error;
    }
  }

  /**
   * Gets health recommendations for an account
   * @param companyId - Company ID
   * @param accountId - Account ID
   * @returns List of recommendations
   */
  async getHealthRecommendations(
    companyId: number,
    accountId: number
  ): Promise<HealthRecommendation[]> {
    try {
      const health = await this.calculateAccountHealth(companyId, accountId);
      const recommendations: HealthRecommendation[] = [];

      // Revenue recommendations
      if (health.revenue_score < 60) {
        recommendations.push({
          type: 'action',
          priority: 'high',
          title: 'Revenue at Risk',
          description: 'Account revenue metrics are below threshold',
          suggested_action: 'Schedule business review to discuss expansion opportunities',
          expected_impact: 'Improve revenue score by 20-30 points'
        });
      }

      // Engagement recommendations
      if (health.engagement_score < 50) {
        recommendations.push({
          type: 'action',
          priority: 'high',
          title: 'Low Engagement',
          description: 'Account engagement has declined significantly',
          suggested_action: 'Reach out to key stakeholders and schedule check-in',
          expected_impact: 'Re-engage account and prevent churn'
        });
      }

      // Relationship recommendations
      if (health.relationship_score < 40) {
        recommendations.push({
          type: 'warning',
          priority: 'high',
          title: 'Weak Relationships',
          description: 'Limited contact coverage and influence',
          suggested_action: 'Map decision makers and build relationships',
          expected_impact: 'Strengthen account relationships'
        });
      }

      // Opportunity recommendations
      if (health.overall_score > 85 && health.engagement_score > 80) {
        recommendations.push({
          type: 'opportunity',
          priority: 'medium',
          title: 'Expansion Opportunity',
          description: 'Account is healthy and engaged',
          suggested_action: 'Present upsell/cross-sell opportunities',
          expected_impact: 'Potential revenue increase of 20-30%'
        });
      }

      return recommendations;
    } catch (error) {
      this.logger.error('Error getting health recommendations', error);
      throw error;
    }
  }

  /**
   * Gets health dashboard for all accounts
   * @param companyId - Company ID
   * @returns Dashboard metrics
   */
  async getHealthDashboard(companyId: number): Promise<HealthDashboard> {
    try {
      // Get account counts by grade
      const gradeDistribution = await this.db.query(
        `SELECT
          health_grade,
          COUNT(*) as count
         FROM accounts
         WHERE company_id = $1 AND is_active = true
         GROUP BY health_grade`,
        [companyId]
      );

      const distribution = {
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        F: 0
      };

      gradeDistribution.rows.forEach(row => {
        if (row.health_grade in distribution) {
          distribution[row.health_grade as HealthGrade] = parseInt(row.count);
        }
      });

      // Get summary metrics
      const metrics = await this.db.query(
        `SELECT
          COUNT(*) as total_accounts,
          AVG(health_score) as average_health,
          COUNT(CASE WHEN health_score < 60 THEN 1 END) as at_risk,
          COUNT(CASE WHEN health_score > prev_health_score THEN 1 END) as improving,
          COUNT(CASE WHEN health_score < prev_health_score THEN 1 END) as declining
         FROM (
           SELECT
             a.id,
             a.health_score,
             LAG(ahh.overall_score) OVER (PARTITION BY a.id ORDER BY ahh.calculated_at DESC) as prev_health_score
           FROM accounts a
           LEFT JOIN account_health_history ahh ON a.id = ahh.account_id
             AND ahh.company_id = $1
           WHERE a.company_id = $1 AND a.is_active = true
         ) health_data`,
        [companyId]
      );

      const metricsData = metrics.rows[0];

      // Get pending alerts count
      const alertsResult = await this.db.query(
        `SELECT COUNT(*) as count
         FROM account_health_alerts
         WHERE company_id = $1 AND is_acknowledged = false`,
        [companyId]
      );

      return {
        company_id: companyId,
        total_accounts: parseInt(metricsData.total_accounts) || 0,
        average_health_score: Math.round(parseFloat(metricsData.average_health) || 0),
        health_distribution: distribution,
        at_risk_accounts: parseInt(metricsData.at_risk) || 0,
        improving_accounts: parseInt(metricsData.improving) || 0,
        declining_accounts: parseInt(metricsData.declining) || 0,
        alerts_pending: parseInt(alertsResult.rows[0].count) || 0,
        last_updated: new Date()
      };
    } catch (error) {
      this.logger.error('Error getting health dashboard', error);
      throw error;
    }
  }

  /**
   * Batch calculates health for multiple accounts
   * @param companyId - Company ID
   * @param accountIds - Array of account IDs
   */
  async batchCalculateHealth(
    companyId: number,
    accountIds: number[]
  ): Promise<void> {
    const batchSize = 10;
    let processed = 0;

    for (let i = 0; i < accountIds.length; i += batchSize) {
      const batch = accountIds.slice(i, i + batchSize);

      const promises = batch.map(accountId =>
        this.calculateAccountHealth(companyId, accountId)
          .catch(error => {
            this.logger.error(`Error calculating health for account ${accountId}`, error);
            return null;
          })
      );

      await Promise.all(promises);
      processed += batch.length;

      this.logger.info(`Batch health calculation progress: ${processed}/${accountIds.length}`);

      // Small delay between batches
      if (i + batchSize < accountIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.logger.info('Batch health calculation completed', {
      companyId,
      totalAccounts: accountIds.length
    });
  }

  /**
   * Calculates revenue health score
   * @private
   */
  private async calculateRevenueHealth(
    companyId: number,
    accountId: number,
    client: any
  ): Promise<number> {
    let score = 0;

    // Get account revenue data
    const account = await client.query(
      'SELECT annual_revenue FROM accounts WHERE id = $1 AND company_id = $2',
      [accountId, companyId]
    );

    if (account.rows.length === 0) return 0;

    const revenue = account.rows[0].annual_revenue || 0;

    // Revenue size score (40% weight)
    if (revenue > 10000000) score += 36;
    else if (revenue > 5000000) score += 32;
    else if (revenue > 1000000) score += 28;
    else if (revenue > 500000) score += 24;
    else score += 16;

    // Revenue growth trend (30% weight)
    // In production, this would compare with historical data
    score += 21; // Placeholder for neutral growth

    // Payment history (30% weight)
    // In production, this would check actual payment records
    score += 25; // Placeholder for good payment history

    return Math.min(100, score);
  }

  /**
   * Calculates engagement health score
   * @private
   */
  private async calculateEngagementHealth(
    companyId: number,
    accountId: number,
    client: any
  ): Promise<number> {
    // Get recent activities
    const activitiesResult = await client.query(
      `SELECT COUNT(*) as count
       FROM activities
       WHERE company_id = $1 AND account_id = $2
         AND activity_date > CURRENT_DATE - INTERVAL '30 days'`,
      [companyId, accountId]
    );

    const activityCount = parseInt(activitiesResult.rows[0].count) || 0;

    // Activity frequency score
    let score = 0;
    if (activityCount >= 20) score = 90;
    else if (activityCount >= 15) score = 75;
    else if (activityCount >= 10) score = 60;
    else if (activityCount >= 5) score = 45;
    else if (activityCount >= 1) score = 30;
    else score = 10;

    return score;
  }

  /**
   * Calculates relationship health score
   * @private
   */
  private async calculateRelationshipHealth(
    companyId: number,
    accountId: number,
    client: any
  ): Promise<number> {
    // Get contact count
    const contactsResult = await client.query(
      `SELECT COUNT(*) as count
       FROM contacts
       WHERE company_id = $1 AND account_id = $2 AND is_active = true`,
      [companyId, accountId]
    );

    const contactCount = parseInt(contactsResult.rows[0].count) || 0;

    // Get decision maker coverage
    const decisionMakersResult = await client.query(
      `SELECT COUNT(DISTINCT c.id) as count
       FROM contacts c
       JOIN account_contact_roles acr ON c.id = acr.contact_id
       JOIN contact_roles cr ON acr.contact_role_id = cr.id
       WHERE acr.company_id = $1 AND acr.account_id = $2
         AND cr.role_category IN ('decision_maker', 'financial')
         AND c.is_active = true`,
      [companyId, accountId]
    );

    const decisionMakerCount = parseInt(decisionMakersResult.rows[0].count) || 0;

    // Calculate score
    let score = 0;

    // Contact coverage (50% weight)
    if (contactCount >= 10) score += 45;
    else if (contactCount >= 5) score += 35;
    else if (contactCount >= 3) score += 25;
    else if (contactCount >= 1) score += 15;
    else score += 5;

    // Decision maker coverage (50% weight)
    if (decisionMakerCount >= 3) score += 45;
    else if (decisionMakerCount >= 2) score += 35;
    else if (decisionMakerCount >= 1) score += 25;
    else score += 10;

    return Math.min(100, score);
  }

  /**
   * Calculates product adoption health score
   * @private
   */
  private async calculateProductAdoptionHealth(
    companyId: number,
    accountId: number,
    client: any
  ): Promise<number> {
    // Placeholder implementation
    // In production, this would integrate with product usage metrics
    return 75;
  }

  /**
   * Calculates support health score
   * @private
   */
  private async calculateSupportHealth(
    companyId: number,
    accountId: number,
    client: any
  ): Promise<number> {
    // Placeholder implementation
    // In production, this would integrate with support ticket system
    return 80;
  }

  /**
   * Gets scoring weights from configuration
   * @private
   */
  private async getScoringWeights(
    companyId: number,
    client: any
  ): Promise<ScoringWeights> {
    const result = await client.query(
      `SELECT scoring_weights
       FROM account_health_config
       WHERE company_id = $1 AND is_active = true
       LIMIT 1`,
      [companyId]
    );

    if (result.rows.length > 0 && result.rows[0].scoring_weights) {
      return result.rows[0].scoring_weights;
    }

    return this.DEFAULT_WEIGHTS;
  }

  /**
   * Calculates grade based on score
   * @private
   */
  private calculateGrade(score: number): HealthGrade {
    if (score >= this.GRADE_THRESHOLDS.A) return 'A';
    if (score >= this.GRADE_THRESHOLDS.B) return 'B';
    if (score >= this.GRADE_THRESHOLDS.C) return 'C';
    if (score >= this.GRADE_THRESHOLDS.D) return 'D';
    return 'F';
  }

  /**
   * Identifies risk factors
   * @private
   */
  private identifyRiskFactors(scores: any): string[] {
    const risks = [];

    if (scores.revenueScore < 60) risks.push('Low revenue performance');
    if (scores.engagementScore < 50) risks.push('Declining engagement');
    if (scores.relationshipScore < 40) risks.push('Weak relationship coverage');
    if (scores.productAdoptionScore < 50) risks.push('Low product adoption');
    if (scores.supportScore < 50) risks.push('High support burden');

    return risks;
  }

  /**
   * Identifies opportunities
   * @private
   */
  private identifyOpportunities(scores: any): string[] {
    const opportunities = [];

    if (scores.revenueScore > 80 && scores.engagementScore > 70) {
      opportunities.push('Strong candidate for expansion');
    }
    if (scores.relationshipScore > 80) {
      opportunities.push('Potential for advocacy program');
    }
    if (scores.productAdoptionScore > 85) {
      opportunities.push('Ready for advanced features');
    }

    return opportunities;
  }

  /**
   * Calculates trend
   * @private
   */
  private async calculateTrend(
    companyId: number,
    accountId: number,
    currentScore: number,
    client: any
  ): Promise<any> {
    const previousScore = await client.query(
      `SELECT overall_score
       FROM account_health_history
       WHERE company_id = $1 AND account_id = $2
         AND calculated_at < CURRENT_TIMESTAMP - INTERVAL '1 hour'
       ORDER BY calculated_at DESC
       LIMIT 1`,
      [companyId, accountId]
    );

    if (previousScore.rows.length === 0) {
      return {
        direction: 'stable',
        change_percentage: 0,
        change_points: 0,
        period: 'new'
      };
    }

    const prevScore = previousScore.rows[0].overall_score;
    const changePoints = currentScore - prevScore;
    const changePercentage = (changePoints / prevScore) * 100;

    let direction = 'stable';
    if (changePoints > 5) direction = 'improving';
    else if (changePoints < -5) direction = 'declining';

    return {
      direction,
      change_percentage: Math.round(changePercentage),
      change_points: changePoints,
      period: '30d'
    };
  }

  /**
   * Checks and creates alerts
   * @private
   */
  private async checkAndCreateAlerts(
    companyId: number,
    accountId: number,
    score: number,
    grade: HealthGrade,
    riskFactors: string[],
    client: any
  ): Promise<void> {
    // Check for score drop
    const previousScore = await client.query(
      `SELECT overall_score
       FROM account_health_history
       WHERE company_id = $1 AND account_id = $2
         AND calculated_at < CURRENT_TIMESTAMP - INTERVAL '1 hour'
       ORDER BY calculated_at DESC
       LIMIT 1`,
      [companyId, accountId]
    );

    if (previousScore.rows.length > 0) {
      const prevScore = previousScore.rows[0].overall_score;
      const scoreDrop = prevScore - score;

      if (scoreDrop >= 20) {
        await this.createAlert(
          companyId,
          accountId,
          'score_drop',
          'high',
          `Health score dropped by ${scoreDrop} points`,
          score,
          prevScore,
          client
        );
      }
    }

    // Check for at-risk threshold
    if (score < 50) {
      await this.createAlert(
        companyId,
        accountId,
        'at_risk',
        'critical',
        'Account health score is critically low',
        score,
        null,
        client
      );
    }

    // Check for risk factors
    if (riskFactors.length >= 3) {
      await this.createAlert(
        companyId,
        accountId,
        'at_risk',
        'high',
        `Multiple risk factors detected: ${riskFactors.slice(0, 3).join(', ')}`,
        score,
        null,
        client
      );
    }
  }

  /**
   * Creates a health alert
   * @private
   */
  private async createAlert(
    companyId: number,
    accountId: number,
    alertType: AlertType,
    alertSeverity: AlertSeverity,
    message: string,
    currentScore: number,
    previousScore: number | null,
    client: any
  ): Promise<void> {
    await client.query(
      `INSERT INTO account_health_alerts
       (company_id, account_id, alert_type, alert_severity,
        alert_message, current_score, previous_score, auto_created)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [
        companyId,
        accountId,
        alertType,
        alertSeverity,
        message,
        currentScore,
        previousScore
      ]
    );
  }

  /**
   * Maps history record to health object
   * @private
   */
  private mapHistoryToHealth(history: any): AccountHealth {
    return {
      account_id: history.account_id,
      overall_score: history.overall_score,
      overall_grade: history.overall_grade,
      revenue_score: history.revenue_score,
      engagement_score: history.engagement_score,
      relationship_score: history.relationship_score,
      product_adoption_score: history.product_adoption_score,
      support_score: history.support_score,
      risk_factors: history.risk_factors || [],
      opportunities: history.opportunities || [],
      trend: {
        direction: 'stable',
        change_percentage: 0,
        change_points: 0,
        period: 'cached'
      },
      last_calculated: history.calculated_at
    };
  }
}