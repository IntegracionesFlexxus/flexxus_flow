/**
 * AnalyticsService - Sprint 13
 * Main service for analytics operations and metrics calculation
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import {
  ConversationMetrics,
  CampaignAnalytics,
  CustomerAnalytics,
  MetricsQueryParams,
  EnhancedMetrics,
  EnhanceOptions,
  TrendData
} from '../types/analytics.types';

@injectable()
export class AnalyticsService {
  constructor(
    @inject(TYPES.DataMartRepository) private dataMartRepo: DataMartRepository,
    @inject(TYPES.CalculationEngine) private calculator: CalculationEngine,
    @inject(TYPES.AggregationEngine) private aggregator: AggregationEngine,
    @inject(TYPES.StreamProcessor) private streamProcessor: StreamProcessor,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Get conversation metrics with optional enhancements
   */
  async getConversationMetrics(
    params: MetricsQueryParams,
    enhance: boolean = false
  ): Promise<ConversationMetrics | EnhancedMetrics> {
    try {
      this.logger.info('Getting conversation metrics', { params, enhance });

      const metrics = await this.dataMartRepo.getConversationMetrics(params);

      if (!enhance) {
        return metrics;
      }

      // Enhance metrics with trends and comparisons
      const enhanceOptions: EnhanceOptions = {
        calculateTrends: true,
        calculateComparisons: true,
        comparisonPeriod: 'previous',
        calculateProjections: false
      };

      return this.calculator.enhanceMetrics(metrics, enhanceOptions);
    } catch (error) {
      this.logger.error('Error getting conversation metrics', { error, params });
      throw new Error(`Failed to get conversation metrics: ${error.message}`);
    }
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(
    campaignId: number,
    companyId: number
  ): Promise<CampaignAnalytics> {
    try {
      this.logger.info('Getting campaign analytics', { campaignId, companyId });

      const analytics = await this.dataMartRepo.getCampaignPerformance(campaignId, companyId);

      // Calculate ROI and ROAS
      if (analytics.totalSpent && analytics.totalRevenue) {
        analytics.roi = this.calculator.calculateROI(
          analytics.totalSpent,
          analytics.totalRevenue
        );
        analytics.roas = this.calculator.calculateROAS(
          analytics.totalSpent,
          analytics.totalRevenue
        );
      }

      return analytics;
    } catch (error) {
      this.logger.error('Error getting campaign analytics', { error, campaignId });
      throw new Error(`Failed to get campaign analytics: ${error.message}`);
    }
  }

  /**
   * Get customer analytics
   */
  async getCustomerAnalytics(
    customerId: number,
    companyId: number
  ): Promise<CustomerAnalytics> {
    try {
      this.logger.info('Getting customer analytics', { customerId, companyId });

      const analytics = await this.dataMartRepo.getCustomerAnalytics(customerId, companyId);

      // Calculate additional metrics
      analytics.lifetimeValue = await this.calculator.calculateLifetimeValue(customerId);
      analytics.engagementScore = await this.calculator.calculateEngagementScore(customerId);

      return analytics;
    } catch (error) {
      this.logger.error('Error getting customer analytics', { error, customerId });
      throw new Error(`Failed to get customer analytics: ${error.message}`);
    }
  }

  /**
   * Get aggregated metrics by time period
   */
  async getMetricsByPeriod(
    metric: string,
    period: 'hour' | 'day' | 'week' | 'month' | 'quarter',
    params: MetricsQueryParams
  ): Promise<any[]> {
    try {
      this.logger.info('Getting metrics by period', { metric, period, params });

      const data = await this.dataMartRepo.aggregateMetricsByPeriod(
        metric,
        period,
        params.companyId,
        { startDate: params.startDate, endDate: params.endDate }
      );

      // Apply aggregation based on period
      switch (period) {
        case 'hour':
          return this.aggregator.aggregateByHour(data, metric);
        case 'day':
          return this.aggregator.aggregateByDay(data, metric);
        case 'week':
          return this.aggregator.aggregateByWeek(data, metric);
        case 'month':
          return this.aggregator.aggregateByMonth(data, metric);
        case 'quarter':
          return this.aggregator.aggregateByQuarter(data, metric);
        default:
          return data;
      }
    } catch (error) {
      this.logger.error('Error getting metrics by period', { error, metric, period });
      throw new Error(`Failed to get metrics by period: ${error.message}`);
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(companyId: number): Promise<any> {
    try {
      this.logger.info('Getting real-time metrics', { companyId });

      // Get buffer statistics from stream processor
      const bufferStats = this.streamProcessor.getBufferStats();
      const companyBuffer = bufferStats[`company:${companyId}`];

      if (!companyBuffer) {
        return {
          activeConversations: 0,
          avgResponseTime: 0,
          conversationsPerHour: 0,
          agentsOnline: 0,
          queueSize: 0,
          lastUpdate: new Date()
        };
      }

      return companyBuffer;
    } catch (error) {
      this.logger.error('Error getting real-time metrics', { error, companyId });
      throw new Error(`Failed to get real-time metrics: ${error.message}`);
    }
  }

  /**
   * Calculate trend for a metric
   */
  async calculateTrend(
    metric: string,
    values: number[],
    period: string
  ): Promise<TrendData> {
    try {
      return this.calculator.calculateTrend(values, period);
    } catch (error) {
      this.logger.error('Error calculating trend', { error, metric });
      throw new Error(`Failed to calculate trend: ${error.message}`);
    }
  }

  /**
   * Get channel performance comparison
   */
  async getChannelComparison(
    companyId: number,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    try {
      this.logger.info('Getting channel comparison', { companyId });

      const channels = ['whatsapp', 'email', 'sms', 'chat', 'voice'];
      const results: any[] = [];

      for (const channel of channels) {
        const metrics = await this.dataMartRepo.getChannelMetrics(
          channel,
          companyId,
          { startDate, endDate }
        );
        results.push({
          channel,
          ...metrics
        });
      }

      return results;
    } catch (error) {
      this.logger.error('Error getting channel comparison', { error });
      throw new Error(`Failed to get channel comparison: ${error.message}`);
    }
  }

  /**
   * Get agent performance leaderboard
   */
  async getAgentLeaderboard(
    companyId: number,
    startDate: Date,
    endDate: Date,
    metric: 'conversations' | 'satisfaction' | 'response_time' = 'conversations',
    limit: number = 10
  ): Promise<any[]> {
    try {
      this.logger.info('Getting agent leaderboard', { companyId, metric, limit });

      // This would query agent-specific metrics from data marts
      // For now, return a placeholder structure
      return [];
    } catch (error) {
      this.logger.error('Error getting agent leaderboard', { error });
      throw new Error(`Failed to get agent leaderboard: ${error.message}`);
    }
  }

  /**
   * Get funnel analysis
   */
  async getFunnelAnalysis(
    campaignId: number,
    companyId: number
  ): Promise<any> {
    try {
      this.logger.info('Getting funnel analysis', { campaignId, companyId });

      const stages = await this.dataMartRepo.getFunnelStages(campaignId);

      // Calculate conversion rates between stages
      const analysis = stages.map((stage, index) => {
        const nextStage = stages[index + 1];
        const conversionRate = nextStage
          ? (nextStage.count / stage.count) * 100
          : 0;

        return {
          ...stage,
          conversionRate: Math.round(conversionRate * 100) / 100,
          dropOffRate: Math.round((100 - conversionRate) * 100) / 100
        };
      });

      return {
        stages: analysis,
        overallConversionRate: stages.length > 1
          ? (stages[stages.length - 1].count / stages[0].count) * 100
          : 0
      };
    } catch (error) {
      this.logger.error('Error getting funnel analysis', { error, campaignId });
      throw new Error(`Failed to get funnel analysis: ${error.message}`);
    }
  }

  /**
   * Export metrics data
   */
  async exportMetrics(
    params: MetricsQueryParams,
    format: 'csv' | 'excel' | 'json' = 'csv'
  ): Promise<string> {
    try {
      this.logger.info('Exporting metrics', { params, format });

      const metrics = await this.getConversationMetrics(params);

      // This would be handled by ExportService
      // For now, return a placeholder
      return 'Export functionality to be implemented by ExportService';
    } catch (error) {
      this.logger.error('Error exporting metrics', { error });
      throw new Error(`Failed to export metrics: ${error.message}`);
    }
  }
}

interface DataMartRepository {
  getConversationMetrics(params: MetricsQueryParams): Promise<ConversationMetrics>;
  getCampaignPerformance(campaignId: number, companyId: number): Promise<CampaignAnalytics>;
  getCustomerAnalytics(customerId: number, companyId: number): Promise<CustomerAnalytics>;
  getChannelMetrics(channel: string, companyId: number, dateRange: any): Promise<any>;
  aggregateMetricsByPeriod(metric: string, period: string, companyId: number, dateRange: any): Promise<any[]>;
  getFunnelStages(campaignId: number): Promise<any[]>;
}

interface CalculationEngine {
  enhanceMetrics(metrics: any, options: EnhanceOptions): EnhancedMetrics;
  calculateROI(cost: number, revenue: number): number;
  calculateROAS(cost: number, revenue: number): number;
  calculateLifetimeValue(customerId: number): Promise<number>;
  calculateEngagementScore(customerId: number): Promise<number>;
  calculateTrend(values: number[], period: string): TrendData;
}

interface AggregationEngine {
  aggregateByHour(data: any[], metric: string): any[];
  aggregateByDay(data: any[], metric: string): any[];
  aggregateByWeek(data: any[], metric: string): any[];
  aggregateByMonth(data: any[], metric: string): any[];
  aggregateByQuarter(data: any[], metric: string): any[];
}

interface StreamProcessor {
  getBufferStats(): Record<string, any>;
}

interface Logger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}
