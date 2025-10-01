/**
 * Quality Management Service - Sprint 10
 * Monitors and evaluates conversation quality metrics
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { EventEmitter } from 'events';

export interface IQualityMetrics {
  conversation_id: string;
  agent_id: string;
  customer_satisfaction?: number;
  response_time_avg: number;
  resolution_time: number;
  escalation_count: number;
  message_count: number;
  sentiment_score: number;
  quality_score: number;
  areas_for_improvement: string[];
  strengths: string[];
}

export interface IQualityAlert {
  id: string;
  conversation_id: string;
  agent_id: string;
  alert_type: 'poor_satisfaction' | 'slow_response' | 'escalation' | 'negative_sentiment' | 'quality_decline';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold_value: number;
  actual_value: number;
  created_at: Date;
}

export interface IQualityReport {
  agent_id: string;
  period: string;
  conversations_handled: number;
  avg_quality_score: number;
  avg_satisfaction: number;
  avg_response_time: number;
  resolution_rate: number;
  escalation_rate: number;
  improvement_areas: string[];
  top_strengths: string[];
  recommendations: string[];
}

@injectable()
export class QualityManagementService extends EventEmitter {
  private logger: any;
  private qualityThresholds = {
    satisfaction: {
      excellent: 4.5,
      good: 3.5,
      poor: 2.5
    },
    responseTime: {
      excellent: 30, // seconds
      good: 60,
      poor: 180
    },
    sentimentScore: {
      positive: 0.3,
      negative: -0.3
    },
    qualityScore: {
      excellent: 0.8,
      good: 0.6,
      poor: 0.4
    }
  };

  constructor(
    @inject(TYPES.OmniConnection) private pool: Pool
  ) {
    super();
    this.logger = LoggerFactory.create({ file: __filename });
  }

  /**
   * Evaluate conversation quality
   */
  async evaluateConversationQuality(conversationId: string): Promise<IQualityMetrics> {
    const startTime = Date.now();

    try {
      // Get conversation details
      const conversation = await this.getConversationDetails(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Calculate quality metrics
      const metrics = await this.calculateQualityMetrics(conversation);

      // Store quality evaluation
      await this.storeQualityEvaluation(metrics);

      // Check for quality alerts
      await this.checkQualityAlerts(metrics);

      // Emit quality evaluation event
      this.emit('quality:evaluated', {
        conversation_id: conversationId,
        quality_score: metrics.quality_score,
        processing_time: Date.now() - startTime
      });

      this.logger.info('Quality evaluation completed', {
        conversation_id: conversationId,
        quality_score: metrics.quality_score,
        processing_time: Date.now() - startTime
      });

      return metrics;
    } catch (error: any) {
      this.logger.error('Quality evaluation failed', error);
      throw error;
    }
  }

  /**
   * Generate quality report for agent
   */
  async generateAgentQualityReport(
    agentId: string,
    companyId: string,
    period: 'day' | 'week' | 'month'
  ): Promise<IQualityReport> {
    try {
      const timeRange = this.getTimeRange(period);

      // Get agent conversations in period
      const conversations = await this.getAgentConversations(agentId, companyId, timeRange);

      // Calculate aggregate metrics
      const aggregateMetrics = this.calculateAggregateMetrics(conversations);

      // Identify improvement areas
      const improvementAreas = this.identifyImprovementAreas(aggregateMetrics);

      // Identify strengths
      const strengths = this.identifyStrengths(aggregateMetrics);

      // Generate recommendations
      const recommendations = this.generateRecommendations(aggregateMetrics, improvementAreas);

      const report: IQualityReport = {
        agent_id: agentId,
        period,
        conversations_handled: conversations.length,
        avg_quality_score: aggregateMetrics.avgQualityScore,
        avg_satisfaction: aggregateMetrics.avgSatisfaction,
        avg_response_time: aggregateMetrics.avgResponseTime,
        resolution_rate: aggregateMetrics.resolutionRate,
        escalation_rate: aggregateMetrics.escalationRate,
        improvement_areas: improvementAreas,
        top_strengths: strengths,
        recommendations
      };

      // Store report
      await this.storeQualityReport(report);

      return report;
    } catch (error: any) {
      this.logger.error('Failed to generate quality report', error);
      throw error;
    }
  }

  /**
   * Monitor real-time quality metrics
   */
  async monitorRealTimeQuality(companyId: string): Promise<void> {
    try {
      // Get active conversations
      const activeConversations = await this.getActiveConversations(companyId);

      for (const conversation of activeConversations) {
        // Check if evaluation is needed
        if (this.shouldEvaluateConversation(conversation)) {
          await this.evaluateConversationQuality(conversation.id);
        }
      }

      // Check for system-wide quality trends
      await this.checkQualityTrends(companyId);

    } catch (error: any) {
      this.logger.error('Real-time quality monitoring failed', error);
    }
  }

  /**
   * Calculate quality metrics for conversation
   */
  private async calculateQualityMetrics(conversation: any): Promise<IQualityMetrics> {
    // Get conversation messages
    const messages = await this.getConversationMessages(conversation.id);

    // Get response times
    const responseTimes = this.calculateResponseTimes(messages);

    // Get sentiment analysis
    const sentimentData = await this.getSentimentAnalysis(conversation.id);

    // Calculate individual metric scores
    const responseTimeScore = this.scoreResponseTime(responseTimes.average);
    const resolutionTimeScore = this.scoreResolutionTime(conversation.resolution_time);
    const escalationScore = this.scoreEscalation(conversation.escalation_count);
    const sentimentScore = this.scoreSentiment(sentimentData?.score || 0);
    const satisfactionScore = this.scoreSatisfaction(conversation.customer_satisfaction);

    // Calculate overall quality score
    const qualityScore = this.calculateOverallQualityScore({
      responseTime: responseTimeScore,
      resolutionTime: resolutionTimeScore,
      escalation: escalationScore,
      sentiment: sentimentScore,
      satisfaction: satisfactionScore
    });

    // Identify strengths and improvement areas
    const analysis = this.analyzePerformance({
      responseTime: responseTimeScore,
      resolutionTime: resolutionTimeScore,
      escalation: escalationScore,
      sentiment: sentimentScore,
      satisfaction: satisfactionScore
    }, responseTimes.average, conversation);

    return {
      conversation_id: conversation.id,
      agent_id: conversation.agent_id,
      customer_satisfaction: conversation.customer_satisfaction,
      response_time_avg: responseTimes.average,
      resolution_time: conversation.resolution_time || 0,
      escalation_count: conversation.escalation_count || 0,
      message_count: messages.length,
      sentiment_score: sentimentData?.score || 0,
      quality_score: qualityScore,
      areas_for_improvement: analysis.improvementAreas,
      strengths: analysis.strengths
    };
  }

  /**
   * Score response time performance
   */
  private scoreResponseTime(avgResponseTime: number): number {
    if (avgResponseTime <= this.qualityThresholds.responseTime.excellent) return 1.0;
    if (avgResponseTime <= this.qualityThresholds.responseTime.good) return 0.8;
    if (avgResponseTime <= this.qualityThresholds.responseTime.poor) return 0.6;
    return 0.3;
  }

  /**
   * Score resolution time performance
   */
  private scoreResolutionTime(resolutionTime: number): number {
    if (!resolutionTime) return 0.5; // Neutral for ongoing conversations

    // Resolution time scoring based on typical SLA expectations
    const hours = resolutionTime / 3600; // Convert to hours

    if (hours <= 1) return 1.0;
    if (hours <= 4) return 0.9;
    if (hours <= 24) return 0.7;
    if (hours <= 72) return 0.5;
    return 0.3;
  }

  /**
   * Score escalation handling
   */
  private scoreEscalation(escalationCount: number): number {
    if (escalationCount === 0) return 1.0;
    if (escalationCount === 1) return 0.8;
    if (escalationCount === 2) return 0.6;
    return 0.3;
  }

  /**
   * Score sentiment performance
   */
  private scoreSentiment(sentimentScore: number): number {
    if (sentimentScore >= this.qualityThresholds.sentimentScore.positive) return 1.0;
    if (sentimentScore >= 0) return 0.8;
    if (sentimentScore >= this.qualityThresholds.sentimentScore.negative) return 0.6;
    return 0.3;
  }

  /**
   * Score customer satisfaction
   */
  private scoreSatisfaction(satisfaction?: number): number {
    if (!satisfaction) return 0.5; // Neutral when no feedback

    if (satisfaction >= this.qualityThresholds.satisfaction.excellent) return 1.0;
    if (satisfaction >= this.qualityThresholds.satisfaction.good) return 0.8;
    if (satisfaction >= this.qualityThresholds.satisfaction.poor) return 0.6;
    return 0.3;
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallQualityScore(scores: Record<string, number>): number {
    const weights = {
      satisfaction: 0.3,
      sentiment: 0.25,
      responseTime: 0.2,
      resolutionTime: 0.15,
      escalation: 0.1
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([metric, weight]) => {
      if (scores[metric] !== undefined) {
        totalScore += scores[metric] * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? totalScore / totalWeight : 0.5;
  }

  /**
   * Analyze performance to identify strengths and areas for improvement
   */
  private analyzePerformance(
    scores: Record<string, number>,
    avgResponseTime: number,
    conversation: any
  ): { strengths: string[], improvementAreas: string[] } {
    const strengths: string[] = [];
    const improvementAreas: string[] = [];

    // Response time analysis
    if (scores.responseTime >= 0.9) {
      strengths.push('Excellent response time');
    } else if (scores.responseTime <= 0.6) {
      improvementAreas.push('Response time needs improvement');
    }

    // Sentiment analysis
    if (scores.sentiment >= 0.9) {
      strengths.push('Positive customer sentiment maintained');
    } else if (scores.sentiment <= 0.6) {
      improvementAreas.push('Focus on maintaining positive customer sentiment');
    }

    // Escalation analysis
    if (scores.escalation >= 0.9) {
      strengths.push('Effective first-contact resolution');
    } else if (scores.escalation <= 0.6) {
      improvementAreas.push('Reduce escalations through better problem-solving');
    }

    // Satisfaction analysis
    if (scores.satisfaction >= 0.9) {
      strengths.push('High customer satisfaction');
    } else if (scores.satisfaction <= 0.6) {
      improvementAreas.push('Focus on improving customer satisfaction');
    }

    return { strengths, improvementAreas };
  }

  /**
   * Check for quality alerts
   */
  private async checkQualityAlerts(metrics: IQualityMetrics): Promise<void> {
    const alerts: Partial<IQualityAlert>[] = [];

    // Quality score alert
    if (metrics.quality_score < this.qualityThresholds.qualityScore.poor) {
      alerts.push({
        conversation_id: metrics.conversation_id,
        agent_id: metrics.agent_id,
        alert_type: 'quality_decline',
        severity: 'high',
        message: 'Overall quality score below acceptable threshold',
        threshold_value: this.qualityThresholds.qualityScore.poor,
        actual_value: metrics.quality_score
      });
    }

    // Response time alert
    if (metrics.response_time_avg > this.qualityThresholds.responseTime.poor) {
      alerts.push({
        conversation_id: metrics.conversation_id,
        agent_id: metrics.agent_id,
        alert_type: 'slow_response',
        severity: 'medium',
        message: 'Average response time exceeds threshold',
        threshold_value: this.qualityThresholds.responseTime.poor,
        actual_value: metrics.response_time_avg
      });
    }

    // Sentiment alert
    if (metrics.sentiment_score < this.qualityThresholds.sentimentScore.negative) {
      alerts.push({
        conversation_id: metrics.conversation_id,
        agent_id: metrics.agent_id,
        alert_type: 'negative_sentiment',
        severity: 'high',
        message: 'Negative customer sentiment detected',
        threshold_value: this.qualityThresholds.sentimentScore.negative,
        actual_value: metrics.sentiment_score
      });
    }

    // Satisfaction alert
    if (metrics.customer_satisfaction && metrics.customer_satisfaction < this.qualityThresholds.satisfaction.poor) {
      alerts.push({
        conversation_id: metrics.conversation_id,
        agent_id: metrics.agent_id,
        alert_type: 'poor_satisfaction',
        severity: 'high',
        message: 'Low customer satisfaction rating',
        threshold_value: this.qualityThresholds.satisfaction.poor,
        actual_value: metrics.customer_satisfaction
      });
    }

    // Store and emit alerts
    for (const alert of alerts) {
      await this.storeQualityAlert(alert as IQualityAlert);
      this.emit('quality:alert', alert);
    }
  }

  /**
   * Calculate response times from messages
   */
  private calculateResponseTimes(messages: any[]): { average: number, median: number } {
    const responseTimes: number[] = [];

    for (let i = 1; i < messages.length; i++) {
      const currentMsg = messages[i];
      const prevMsg = messages[i - 1];

      // Calculate response time for agent messages following customer messages
      if (currentMsg.direction === 'outbound' && prevMsg.direction === 'inbound') {
        const responseTime = new Date(currentMsg.created_at).getTime() - new Date(prevMsg.created_at).getTime();
        responseTimes.push(responseTime / 1000); // Convert to seconds
      }
    }

    if (responseTimes.length === 0) {
      return { average: 0, median: 0 };
    }

    const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const sorted = responseTimes.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    return { average, median };
  }

  /**
   * Get conversation details
   */
  private async getConversationDetails(conversationId: string): Promise<any> {
    const query = `
      SELECT
        c.*,
        COUNT(CASE WHEN m.direction = 'inbound' THEN 1 END) as customer_messages,
        COUNT(CASE WHEN m.direction = 'outbound' THEN 1 END) as agent_messages,
        EXTRACT(EPOCH FROM (c.resolved_at - c.created_at)) as resolution_time
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE c.id = $1
      GROUP BY c.id;
    `;

    const result = await this.pool.query(query, [conversationId]);
    return result.rows[0];
  }

  /**
   * Get conversation messages
   */
  private async getConversationMessages(conversationId: string): Promise<any[]> {
    const query = `
      SELECT direction, created_at, content
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC;
    `;

    const result = await this.pool.query(query, [conversationId]);
    return result.rows;
  }

  /**
   * Get sentiment analysis for conversation
   */
  private async getSentimentAnalysis(conversationId: string): Promise<any> {
    const query = `
      SELECT sentiment_score, sentiment_label, sentiment_confidence
      FROM conversation_ai_analysis
      WHERE conversation_id = $1 AND analysis_type = 'sentiment'
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    const result = await this.pool.query(query, [conversationId]);
    return result.rows[0];
  }

  /**
   * Store quality evaluation
   */
  private async storeQualityEvaluation(metrics: IQualityMetrics): Promise<void> {
    try {
      const query = `
        INSERT INTO conversation_quality_metrics (
          conversation_id,
          agent_id,
          customer_satisfaction,
          response_time_avg,
          resolution_time,
          escalation_count,
          message_count,
          sentiment_score,
          quality_score,
          areas_for_improvement,
          strengths
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (conversation_id)
        DO UPDATE SET
          customer_satisfaction = EXCLUDED.customer_satisfaction,
          response_time_avg = EXCLUDED.response_time_avg,
          resolution_time = EXCLUDED.resolution_time,
          escalation_count = EXCLUDED.escalation_count,
          message_count = EXCLUDED.message_count,
          sentiment_score = EXCLUDED.sentiment_score,
          quality_score = EXCLUDED.quality_score,
          areas_for_improvement = EXCLUDED.areas_for_improvement,
          strengths = EXCLUDED.strengths,
          updated_at = CURRENT_TIMESTAMP;
      `;

      await this.pool.query(query, [
        metrics.conversation_id,
        metrics.agent_id,
        metrics.customer_satisfaction,
        metrics.response_time_avg,
        metrics.resolution_time,
        metrics.escalation_count,
        metrics.message_count,
        metrics.sentiment_score,
        metrics.quality_score,
        JSON.stringify(metrics.areas_for_improvement),
        JSON.stringify(metrics.strengths)
      ]);
    } catch (error: any) {
      this.logger.error('Failed to store quality evaluation', error);
    }
  }

  /**
   * Store quality alert
   */
  private async storeQualityAlert(alert: IQualityAlert): Promise<void> {
    try {
      const query = `
        INSERT INTO quality_alerts (
          conversation_id,
          agent_id,
          alert_type,
          severity,
          message,
          threshold_value,
          actual_value
        ) VALUES ($1, $2, $3, $4, $5, $6, $7);
      `;

      await this.pool.query(query, [
        alert.conversation_id,
        alert.agent_id,
        alert.alert_type,
        alert.severity,
        alert.message,
        alert.threshold_value,
        alert.actual_value
      ]);
    } catch (error: any) {
      this.logger.error('Failed to store quality alert', error);
    }
  }

  /**
   * Additional helper methods for reporting and monitoring...
   */
  private getTimeRange(period: 'day' | 'week' | 'month'): { start: Date, end: Date } {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'day':
        start.setDate(start.getDate() - 1);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
    }

    return { start, end };
  }

  private async getAgentConversations(agentId: string, companyId: string, timeRange: { start: Date, end: Date }): Promise<any[]> {
    const query = `
      SELECT * FROM conversation_quality_metrics
      WHERE agent_id = $1
        AND created_at BETWEEN $2 AND $3;
    `;

    const result = await this.pool.query(query, [agentId, timeRange.start, timeRange.end]);
    return result.rows;
  }

  private calculateAggregateMetrics(conversations: any[]): any {
    if (conversations.length === 0) {
      return {
        avgQualityScore: 0,
        avgSatisfaction: 0,
        avgResponseTime: 0,
        resolutionRate: 0,
        escalationRate: 0
      };
    }

    const totals = conversations.reduce((acc, conv) => {
      acc.qualityScore += conv.quality_score || 0;
      acc.satisfaction += conv.customer_satisfaction || 0;
      acc.responseTime += conv.response_time_avg || 0;
      acc.escalations += conv.escalation_count || 0;
      return acc;
    }, { qualityScore: 0, satisfaction: 0, responseTime: 0, escalations: 0 });

    return {
      avgQualityScore: totals.qualityScore / conversations.length,
      avgSatisfaction: totals.satisfaction / conversations.length,
      avgResponseTime: totals.responseTime / conversations.length,
      resolutionRate: conversations.filter(c => c.resolution_time).length / conversations.length,
      escalationRate: totals.escalations / conversations.length
    };
  }

  private identifyImprovementAreas(metrics: any): string[] {
    const areas: string[] = [];

    if (metrics.avgResponseTime > this.qualityThresholds.responseTime.good) {
      areas.push('Response time');
    }
    if (metrics.avgSatisfaction < this.qualityThresholds.satisfaction.good) {
      areas.push('Customer satisfaction');
    }
    if (metrics.escalationRate > 0.2) {
      areas.push('First-contact resolution');
    }
    if (metrics.avgQualityScore < this.qualityThresholds.qualityScore.good) {
      areas.push('Overall quality');
    }

    return areas;
  }

  private identifyStrengths(metrics: any): string[] {
    const strengths: string[] = [];

    if (metrics.avgResponseTime <= this.qualityThresholds.responseTime.excellent) {
      strengths.push('Excellent response time');
    }
    if (metrics.avgSatisfaction >= this.qualityThresholds.satisfaction.excellent) {
      strengths.push('High customer satisfaction');
    }
    if (metrics.escalationRate < 0.1) {
      strengths.push('Strong first-contact resolution');
    }
    if (metrics.avgQualityScore >= this.qualityThresholds.qualityScore.excellent) {
      strengths.push('Consistent high quality');
    }

    return strengths;
  }

  private generateRecommendations(metrics: any, improvementAreas: string[]): string[] {
    const recommendations: string[] = [];

    if (improvementAreas.includes('Response time')) {
      recommendations.push('Consider using quick replies and templates to reduce response time');
    }
    if (improvementAreas.includes('Customer satisfaction')) {
      recommendations.push('Focus on empathy and active listening in customer interactions');
    }
    if (improvementAreas.includes('First-contact resolution')) {
      recommendations.push('Review product knowledge and escalation procedures');
    }

    return recommendations;
  }

  private async getActiveConversations(companyId: string): Promise<any[]> {
    const query = `
      SELECT id, agent_id, created_at, updated_at
      FROM conversations
      WHERE company_id = $1 AND status = 'active'
      ORDER BY updated_at DESC;
    `;

    const result = await this.pool.query(query, [companyId]);
    return result.rows;
  }

  private shouldEvaluateConversation(conversation: any): boolean {
    const lastUpdate = new Date(conversation.updated_at);
    const timeSinceUpdate = Date.now() - lastUpdate.getTime();

    // Evaluate if conversation has been updated in last 5 minutes
    return timeSinceUpdate < 5 * 60 * 1000;
  }

  private async checkQualityTrends(companyId: string): Promise<void> {
    // Implementation for checking system-wide quality trends
    // This could include alerts for declining quality across multiple agents
  }

  private async storeQualityReport(report: IQualityReport): Promise<void> {
    // Implementation for storing quality reports
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.removeAllListeners();
    this.logger.info('QualityManagementService cleaned up');
  }
}