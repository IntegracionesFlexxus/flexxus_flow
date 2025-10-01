/**
 * DataMartRepository - Sprint 13
 * Repository for querying data marts (aggregated analytics tables)
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import type { Pool } from 'pg';
import {
  ConversationMetrics,
  CampaignAnalytics,
  CustomerAnalytics,
  ChannelMetrics,
  MetricsQueryParams,
  DateRange,
  FunnelStage,
  Touchpoint
} from '../types/analytics.types';

@injectable()
export class DataMartRepository {
  constructor(
    @inject(TYPES.DatabaseConnection) private db: Pool,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Get conversation metrics from dm_conversation_metrics
   */
  async getConversationMetrics(params: MetricsQueryParams): Promise<ConversationMetrics> {
    try {
      const { companyId, startDate, endDate, channels, agentIds, groupBy } = params;

      let query = `
        SELECT
          SUM(conversation_count) as conversation_count,
          SUM(message_count) as message_count,
          AVG(avg_response_time_seconds)::INTEGER as avg_response_time_seconds,
          AVG(avg_resolution_time_minutes)::INTEGER as avg_resolution_time_minutes,
          AVG(first_response_time_seconds)::INTEGER as first_response_time_seconds,
          AVG(customer_satisfaction_score) as csat,
          SUM(messages_sent) as messages_sent,
          SUM(messages_received) as messages_received,
          SUM(media_messages) as media_messages,
          SUM(escalation_count) as escalation_count
        FROM dm_conversation_metrics
        WHERE company_id = $1
          AND date_hour >= $2
          AND date_hour <= $3
      `;

      const queryParams: any[] = [companyId, startDate, endDate];
      let paramIndex = 4;

      if (channels && channels.length > 0) {
        query += ` AND channel = ANY($${paramIndex})`;
        queryParams.push(channels);
        paramIndex++;
      }

      if (agentIds && agentIds.length > 0) {
        query += ` AND agent_id = ANY($${paramIndex})`;
        queryParams.push(agentIds);
        paramIndex++;
      }

      const result = await this.db.query(query, queryParams);
      const row = result.rows[0];

      // Get channel breakdown
      const byChannel = await this.getMetricsByChannel(companyId, startDate, endDate, channels);

      return {
        conversationCount: parseInt(row.conversation_count) || 0,
        messageCount: parseInt(row.message_count) || 0,
        avgResponseTimeSeconds: parseInt(row.avg_response_time_seconds) || 0,
        avgResolutionTimeMinutes: parseInt(row.avg_resolution_time_minutes) || 0,
        firstResponseTimeSeconds: parseInt(row.first_response_time_seconds) || 0,
        csat: parseFloat(row.csat) || 0,
        messagesSent: parseInt(row.messages_sent) || 0,
        messagesReceived: parseInt(row.messages_received) || 0,
        mediaMessages: parseInt(row.media_messages) || 0,
        escalationCount: parseInt(row.escalation_count) || 0,
        byChannel,
        trend: { direction: 'stable', changePercentage: 0, changeAbsolute: 0, previousValue: 0, currentValue: 0 }
      };
    } catch (error) {
      this.logger.error('Error getting conversation metrics', { error, params });
      throw new Error(`Failed to get conversation metrics: ${error.message}`);
    }
  }

  /**
   * Get campaign performance from dm_campaign_performance
   */
  async getCampaignPerformance(campaignId: number, companyId: number): Promise<CampaignAnalytics> {
    try {
      const query = `
        SELECT
          campaign_id,
          campaign_type,
          channel,
          SUM(sent_count) as sent_count,
          SUM(delivered_count) as delivered_count,
          SUM(bounced_count) as bounced_count,
          SUM(opened_count) as opened_count,
          SUM(clicked_count) as clicked_count,
          SUM(replied_count) as replied_count,
          SUM(converted_count) as converted_count,
          SUM(unsubscribed_count) as unsubscribed_count,
          AVG(open_rate) as open_rate,
          AVG(click_rate) as click_rate,
          AVG(conversion_rate) as conversion_rate,
          AVG(bounce_rate) as bounce_rate,
          SUM(cost) as cost,
          SUM(revenue) as revenue,
          AVG(roi) as roi
        FROM dm_campaign_performance
        WHERE company_id = $1 AND campaign_id = $2
        GROUP BY campaign_id, campaign_type, channel
      `;

      const result = await this.db.query(query, [companyId, campaignId]);

      if (result.rows.length === 0) {
        throw new Error(`Campaign ${campaignId} not found for company ${companyId}`);
      }

      const row = result.rows[0];

      return {
        campaignId: row.campaign_id,
        campaignName: `Campaign ${row.campaign_id}`, // TODO: Get from campaigns table
        campaignType: row.campaign_type,
        channel: row.channel,
        sentCount: parseInt(row.sent_count) || 0,
        deliveredCount: parseInt(row.delivered_count) || 0,
        bouncedCount: parseInt(row.bounced_count) || 0,
        openedCount: parseInt(row.opened_count) || 0,
        clickedCount: parseInt(row.clicked_count) || 0,
        repliedCount: parseInt(row.replied_count) || 0,
        convertedCount: parseInt(row.converted_count) || 0,
        unsubscribedCount: parseInt(row.unsubscribed_count) || 0,
        openRate: parseFloat(row.open_rate) || 0,
        clickRate: parseFloat(row.click_rate) || 0,
        conversionRate: parseFloat(row.conversion_rate) || 0,
        bounceRate: parseFloat(row.bounce_rate) || 0,
        cost: parseFloat(row.cost) || 0,
        revenue: parseFloat(row.revenue) || 0,
        roi: parseFloat(row.roi) || 0,
        roas: row.cost > 0 ? (parseFloat(row.revenue) / parseFloat(row.cost)) : 0,
        conversionFunnel: { stages: [], totalEntered: 0, totalConverted: 0, overallConversionRate: 0 },
        attribution: { model: 'last_touch', touchpoints: [], attributedRevenue: {} },
        trend: { direction: 'stable', changePercentage: 0, changeAbsolute: 0, previousValue: 0, currentValue: 0 }
      };
    } catch (error) {
      this.logger.error('Error getting campaign performance', { error, campaignId, companyId });
      throw new Error(`Failed to get campaign performance: ${error.message}`);
    }
  }

  /**
   * Get customer analytics from dm_customer_analytics
   */
  async getCustomerAnalytics(customerId: number, companyId: number): Promise<CustomerAnalytics> {
    try {
      const query = `
        SELECT
          customer_id,
          total_interactions,
          channel_interactions,
          last_interaction_date,
          days_since_last_interaction,
          lifetime_value,
          total_purchases,
          average_order_value,
          total_spent,
          engagement_score,
          satisfaction_score,
          churn_risk_score,
          lead_score,
          segment_ids,
          tags,
          preferred_channel,
          preferred_contact_time
        FROM dm_customer_analytics
        WHERE company_id = $1 AND customer_id = $2
        ORDER BY analysis_date DESC
        LIMIT 1
      `;

      const result = await this.db.query(query, [companyId, customerId]);

      if (result.rows.length === 0) {
        throw new Error(`Customer ${customerId} not found for company ${companyId}`);
      }

      const row = result.rows[0];

      return {
        customerId: row.customer_id,
        totalInteractions: parseInt(row.total_interactions) || 0,
        channelInteractions: row.channel_interactions || {},
        lastInteractionDate: row.last_interaction_date,
        daysSinceLastInteraction: parseInt(row.days_since_last_interaction) || 0,
        lifetimeValue: parseFloat(row.lifetime_value) || 0,
        totalPurchases: parseInt(row.total_purchases) || 0,
        averageOrderValue: parseFloat(row.average_order_value) || 0,
        totalSpent: parseFloat(row.total_spent) || 0,
        engagementScore: parseInt(row.engagement_score) || 0,
        satisfactionScore: parseFloat(row.satisfaction_score) || 0,
        churnRiskScore: parseInt(row.churn_risk_score) || 0,
        leadScore: parseInt(row.lead_score) || 0,
        segmentIds: row.segment_ids || [],
        tags: row.tags || [],
        preferredChannel: row.preferred_channel || '',
        preferredContactTime: row.preferred_contact_time || ''
      };
    } catch (error) {
      this.logger.error('Error getting customer analytics', { error, customerId, companyId });
      throw new Error(`Failed to get customer analytics: ${error.message}`);
    }
  }

  /**
   * Get channel metrics breakdown
   */
  async getChannelMetrics(channel: string, companyId: number, dateRange: DateRange): Promise<ChannelMetrics> {
    try {
      const query = `
        SELECT
          channel,
          SUM(conversation_count) as conversation_count,
          SUM(message_count) as message_count,
          AVG(avg_response_time_seconds)::INTEGER as avg_response_time_seconds,
          AVG(customer_satisfaction_score) as csat
        FROM dm_conversation_metrics
        WHERE company_id = $1
          AND channel = $2
          AND date_hour >= $3
          AND date_hour <= $4
        GROUP BY channel
      `;

      const result = await this.db.query(query, [companyId, channel, dateRange.startDate, dateRange.endDate]);

      if (result.rows.length === 0) {
        return {
          channel,
          conversationCount: 0,
          messageCount: 0,
          avgResponseTimeSeconds: 0,
          csat: 0,
          percentage: 0
        };
      }

      const row = result.rows[0];

      return {
        channel: row.channel,
        conversationCount: parseInt(row.conversation_count) || 0,
        messageCount: parseInt(row.message_count) || 0,
        avgResponseTimeSeconds: parseInt(row.avg_response_time_seconds) || 0,
        csat: parseFloat(row.csat) || 0,
        percentage: 0 // Will be calculated in service layer
      };
    } catch (error) {
      this.logger.error('Error getting channel metrics', { error, channel, companyId });
      throw new Error(`Failed to get channel metrics: ${error.message}`);
    }
  }

  /**
   * Aggregate metrics by period
   */
  async aggregateMetricsByPeriod(
    metric: string,
    period: 'hour' | 'day' | 'week' | 'month',
    companyId: number,
    dateRange: DateRange
  ): Promise<any[]> {
    try {
      const dateGrouping = this.getDateGrouping(period);

      const query = `
        SELECT
          ${dateGrouping} as period,
          SUM(${metric}) as value
        FROM dm_conversation_metrics
        WHERE company_id = $1
          AND date_hour >= $2
          AND date_hour <= $3
        GROUP BY period
        ORDER BY period ASC
      `;

      const result = await this.db.query(query, [companyId, dateRange.startDate, dateRange.endDate]);

      return result.rows.map(row => ({
        period: row.period,
        value: parseFloat(row.value) || 0
      }));
    } catch (error) {
      this.logger.error('Error aggregating metrics by period', { error, metric, period, companyId });
      throw new Error(`Failed to aggregate metrics: ${error.message}`);
    }
  }

  /**
   * Get funnel stages for campaign
   */
  async getFunnelStages(campaignId: number): Promise<FunnelStage[]> {
    try {
      // This is a simplified version - real implementation would query campaign tracking data
      const stages: FunnelStage[] = [
        { name: 'Sent', count: 1000, percentage: 100, dropoff: 0, dropoffRate: 0 },
        { name: 'Delivered', count: 950, percentage: 95, dropoff: 50, dropoffRate: 5 },
        { name: 'Opened', count: 600, percentage: 60, dropoff: 350, dropoffRate: 36.8 },
        { name: 'Clicked', count: 200, percentage: 20, dropoff: 400, dropoffRate: 66.7 },
        { name: 'Converted', count: 50, percentage: 5, dropoff: 150, dropoffRate: 75 }
      ];

      return stages;
    } catch (error) {
      this.logger.error('Error getting funnel stages', { error, campaignId });
      throw new Error(`Failed to get funnel stages: ${error.message}`);
    }
  }

  /**
   * Get touchpoints for attribution
   */
  async getTouchpoints(campaignId: number): Promise<Touchpoint[]> {
    try {
      // This is a placeholder - real implementation would query touchpoint tracking
      return [];
    } catch (error) {
      this.logger.error('Error getting touchpoints', { error, campaignId });
      throw new Error(`Failed to get touchpoints: ${error.message}`);
    }
  }

  /**
   * Private: Get metrics by channel
   */
  private async getMetricsByChannel(
    companyId: number,
    startDate: Date | string,
    endDate: Date | string,
    channels?: string[]
  ): Promise<ChannelMetrics[]> {
    try {
      let query = `
        SELECT
          channel,
          SUM(conversation_count) as conversation_count,
          SUM(message_count) as message_count,
          AVG(avg_response_time_seconds)::INTEGER as avg_response_time_seconds,
          AVG(customer_satisfaction_score) as csat
        FROM dm_conversation_metrics
        WHERE company_id = $1
          AND date_hour >= $2
          AND date_hour <= $3
      `;

      const queryParams: any[] = [companyId, startDate, endDate];

      if (channels && channels.length > 0) {
        query += ` AND channel = ANY($4)`;
        queryParams.push(channels);
      }

      query += ` GROUP BY channel ORDER BY conversation_count DESC`;

      const result = await this.db.query(query, queryParams);

      const total = result.rows.reduce((sum, row) => sum + parseInt(row.conversation_count), 0);

      return result.rows.map(row => ({
        channel: row.channel,
        conversationCount: parseInt(row.conversation_count) || 0,
        messageCount: parseInt(row.message_count) || 0,
        avgResponseTimeSeconds: parseInt(row.avg_response_time_seconds) || 0,
        csat: parseFloat(row.csat) || 0,
        percentage: total > 0 ? (parseInt(row.conversation_count) / total) * 100 : 0
      }));
    } catch (error) {
      this.logger.error('Error getting metrics by channel', { error, companyId });
      return [];
    }
  }

  /**
   * Private: Get date grouping SQL based on period
   */
  private getDateGrouping(period: 'hour' | 'day' | 'week' | 'month'): string {
    switch (period) {
      case 'hour':
        return "date_trunc('hour', date_hour)";
      case 'day':
        return "date_trunc('day', date_hour)";
      case 'week':
        return "date_trunc('week', date_hour)";
      case 'month':
        return "date_trunc('month', date_hour)";
      default:
        return "date_trunc('day', date_hour)";
    }
  }
}

// Logger interface
interface Logger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
}
