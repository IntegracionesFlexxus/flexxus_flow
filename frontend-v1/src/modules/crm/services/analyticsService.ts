/**
 * Analytics Service
 * API integration for win/loss analysis and patterns
 */

import axios, { AxiosInstance } from 'axios';
import {
  WinLossAnalysis,
  WinLossPattern,
  WinLossOutcome,
  ExportOptions
} from '../types/pipeline.types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1/crm';

class AnalyticsService {
  private api: AxiosInstance;
  private companyId: number = 1;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Win/Loss Analysis
  async getWinLossAnalysis(filters?: {
    outcome?: WinLossOutcome;
    date_from?: string;
    date_to?: string;
    owner_id?: string;
    competitor?: string;
  }): Promise<WinLossAnalysis[]> {
    const response = await this.api.get('/analytics/win-loss', {
      params: {
        ...filters,
        company_id: this.companyId
      }
    });
    return response.data;
  }

  async createWinLossAnalysis(analysis: Partial<WinLossAnalysis>): Promise<WinLossAnalysis> {
    const response = await this.api.post('/analytics/win-loss', {
      ...analysis,
      company_id: this.companyId,
      analysis_date: new Date().toISOString()
    });
    return response.data;
  }

  async updateWinLossAnalysis(analysisId: number, updates: Partial<WinLossAnalysis>): Promise<WinLossAnalysis> {
    const response = await this.api.put(`/analytics/win-loss/${analysisId}`, updates);
    return response.data;
  }

  async getWinLossSummary(period?: { from: string; to: string }): Promise<{
    total_analyzed: number;
    wins: number;
    losses: number;
    no_decisions: number;
    win_rate: number;
    top_win_reasons: { reason: string; count: number; percentage: number }[];
    top_loss_reasons: { reason: string; count: number; percentage: number }[];
    competitor_analysis: { competitor: string; wins: number; losses: number }[];
  }> {
    const response = await this.api.get('/analytics/win-loss/summary', {
      params: {
        ...period,
        company_id: this.companyId
      }
    });
    return response.data;
  }

  // Win/Loss Patterns
  async getWinLossPatterns(filters?: {
    pattern_type?: string;
    min_occurrence?: number;
    min_impact?: number;
  }): Promise<WinLossPattern[]> {
    const response = await this.api.get('/analytics/patterns', {
      params: {
        ...filters,
        company_id: this.companyId
      }
    });
    return response.data;
  }

  async detectPatterns(period?: { from: string; to: string }): Promise<WinLossPattern[]> {
    const response = await this.api.post('/analytics/patterns/detect', {
      ...period,
      company_id: this.companyId
    });
    return response.data;
  }

  async getPatternDetails(patternId: number): Promise<{
    pattern: WinLossPattern;
    opportunities: {
      id: string;
      name: string;
      outcome: WinLossOutcome;
      amount: number;
      close_date: string;
    }[];
    trend: {
      month: string;
      occurrence: number;
    }[];
  }> {
    const response = await this.api.get(`/analytics/patterns/${patternId}`);
    return response.data;
  }

  // Competitor Analysis
  async getCompetitorAnalysis(period?: { from: string; to: string }): Promise<{
    competitor: string;
    total_deals: number;
    wins_against: number;
    losses_to: number;
    win_rate: number;
    avg_deal_size_won: number;
    avg_deal_size_lost: number;
    common_win_reasons: string[];
    common_loss_reasons: string[];
  }[]> {
    const response = await this.api.get('/analytics/competitors', {
      params: {
        ...period,
        company_id: this.companyId
      }
    });
    return response.data;
  }

  async getCompetitorTrends(competitor: string, months: number = 12): Promise<{
    month: string;
    wins: number;
    losses: number;
    win_rate: number;
    total_value_won: number;
    total_value_lost: number;
  }[]> {
    const response = await this.api.get(`/analytics/competitors/${encodeURIComponent(competitor)}/trends`, {
      params: {
        months,
        company_id: this.companyId
      }
    });
    return response.data;
  }

  // Reason Analysis
  async getReasonAnalysis(outcome: 'won' | 'lost'): Promise<{
    reason: string;
    count: number;
    percentage: number;
    avg_deal_size: number;
    total_value: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    related_reasons: string[];
  }[]> {
    const response = await this.api.get('/analytics/reasons', {
      params: {
        outcome,
        company_id: this.companyId
      }
    });
    return response.data;
  }

  async getReasonTrends(reason: string, months: number = 12): Promise<{
    month: string;
    occurrence: number;
    percentage: number;
    total_value: number;
  }[]> {
    const response = await this.api.get(`/analytics/reasons/${encodeURIComponent(reason)}/trends`, {
      params: {
        months,
        company_id: this.companyId
      }
    });
    return response.data;
  }

  // Lessons Learned
  async getLessonsLearned(filters?: {
    outcome?: WinLossOutcome;
    date_from?: string;
    date_to?: string;
    search?: string;
  }): Promise<{
    lesson_id: number;
    lesson: string;
    category: string;
    impact_level: 'high' | 'medium' | 'low';
    related_opportunities: number;
    created_date: string;
    tags: string[];
  }[]> {
    const response = await this.api.get('/analytics/lessons', {
      params: {
        ...filters,
        company_id: this.companyId
      }
    });
    return response.data;
  }

  async createLesson(lesson: {
    lesson: string;
    category: string;
    impact_level: 'high' | 'medium' | 'low';
    opportunity_ids?: string[];
    tags?: string[];
  }): Promise<void> {
    await this.api.post('/analytics/lessons', {
      ...lesson,
      company_id: this.companyId
    });
  }

  // Improvement Areas
  async getImprovementAreas(): Promise<{
    area: string;
    category: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    impact_score: number;
    opportunities_affected: number;
    potential_value: number;
    recommendations: string[];
  }[]> {
    const response = await this.api.get('/analytics/improvements', {
      params: {
        company_id: this.companyId
      }
    });
    return response.data;
  }

  // Export
  async exportWinLossAnalysis(options: ExportOptions): Promise<Blob> {
    const response = await this.api.get('/analytics/win-loss/export', {
      params: {
        ...options,
        company_id: this.companyId
      },
      responseType: 'blob'
    });
    return response.data;
  }

  async exportCompetitorAnalysis(format: 'excel' | 'pdf', period?: { from: string; to: string }): Promise<Blob> {
    const response = await this.api.get('/analytics/competitors/export', {
      params: {
        format,
        ...period,
        company_id: this.companyId
      },
      responseType: 'blob'
    });
    return response.data;
  }

  // Sprint 22 - Analytics & Integration Methods
  async getMetrics(): Promise<any> {
    const response = await this.api.get('/analytics/metrics', {
      params: { company_id: this.companyId }
    });
    return response.data.data;
  }

  async getRevenueTrend(
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' = 'monthly',
    startDate?: string,
    endDate?: string
  ): Promise<any[]> {
    const response = await this.api.get('/analytics/revenue-trend', {
      params: {
        period,
        startDate,
        endDate,
        company_id: this.companyId
      }
    });
    return response.data.data;
  }

  async getConversionFunnel(): Promise<any[]> {
    const response = await this.api.get('/analytics/conversion-funnel', {
      params: { company_id: this.companyId }
    });
    return response.data.data;
  }

  async getTopPerformers(
    metric: 'revenue' | 'deals' | 'activities' = 'revenue',
    limit: number = 10
  ): Promise<any[]> {
    const response = await this.api.get('/analytics/top-performers', {
      params: {
        metric,
        limit,
        company_id: this.companyId
      }
    });
    return response.data.data;
  }

  async getSalesForecast(months: number = 3): Promise<any> {
    const response = await this.api.get('/analytics/sales-forecast', {
      params: {
        months,
        company_id: this.companyId
      }
    });
    return response.data.data;
  }

  async getCampaignROI(campaignId?: number): Promise<any> {
    const response = await this.api.get('/analytics/campaign-roi', {
      params: {
        campaignId,
        company_id: this.companyId
      }
    });
    return response.data.data;
  }

  async getPerformanceComparison(
    currentPeriod: { start: string; end: string },
    previousPeriod: { start: string; end: string }
  ): Promise<any> {
    const response = await this.api.get('/analytics/performance-comparison', {
      params: {
        currentStart: currentPeriod.start,
        currentEnd: currentPeriod.end,
        previousStart: previousPeriod.start,
        previousEnd: previousPeriod.end,
        company_id: this.companyId
      }
    });
    return response.data.data;
  }
}

export default new AnalyticsService();