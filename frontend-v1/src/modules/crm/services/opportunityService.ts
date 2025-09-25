/**
 * Opportunity Service - Sprint 15
 * API integration for opportunity and pipeline management
 */

import { api } from '@/shared/services/api';
import type {
  Opportunity,
  OpportunityFilters,
  OpportunityFormData,
  PipelineData,
  PipelineMetrics,
  ForecastData,
  WinLossAnalysis
} from '../types';

class OpportunityService {
  private readonly basePath = '/api/v1/crm/opportunities';

  // Debug flag - can be enabled via localStorage
  private readonly DEBUG = true; // Forzamos debug para diagnóstico

  /**
   * Helper method for consistent logging
   */
  private log(level: 'log' | 'warn' | 'error', message: string, data?: any) {
    if (!this.DEBUG) return;

    const timestamp = new Date().toISOString();
    const prefix = `[OpportunityService ${timestamp}]`;

    console[level](prefix, message, data || '');
  }

  /**
   * Get opportunities with filters and pagination
   */
  async getOpportunities(filters?: OpportunityFilters): Promise<{ data: Opportunity[]; total: number; page: number; totalPages: number }> {
    this.log('log', '📋 getOpportunities called', { filters });

    try {
      const { data } = await api.get(this.basePath, { params: filters });
      this.log('log', '✅ getOpportunities response:', {
        count: data?.data?.length,
        total: data?.total,
        data
      });
      return data;
    } catch (error: any) {
      this.log('error', '❌ getOpportunities failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }

  /**
   * Get single opportunity by ID
   */
  async getOpportunityById(id: number): Promise<Opportunity> {
    const { data } = await api.get(`${this.basePath}/${id}`);
    return data.data;
  }

  /**
   * Create new opportunity
   */
  async createOpportunity(opportunity: OpportunityFormData): Promise<Opportunity> {
    const { data } = await api.post(this.basePath, opportunity);
    return data.data;
  }

  /**
   * Update existing opportunity
   */
  async updateOpportunity(id: number, updates: Partial<Opportunity>): Promise<Opportunity> {
    const { data } = await api.put(`${this.basePath}/${id}`, updates);
    return data.data;
  }

  /**
   * Delete opportunity
   */
  async deleteOpportunity(id: number): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }

  /**
   * Update opportunity stage
   */
  async updateStage(opportunityId: number, stageId: number): Promise<Opportunity> {
    const { data } = await api.put(`${this.basePath}/${opportunityId}/stage`, { stage_id: stageId });
    return data.data;
  }

  /**
   * Mark opportunity as won
   */
  async markAsWon(id: number, reason?: string): Promise<Opportunity> {
    const { data } = await api.post(`${this.basePath}/${id}/won`, { reason });
    return data.data;
  }

  /**
   * Mark opportunity as lost
   */
  async markAsLost(id: number, reason?: string): Promise<Opportunity> {
    const { data } = await api.post(`${this.basePath}/${id}/lost`, { reason });
    return data.data;
  }

  /**
   * Clone opportunity
   */
  async cloneOpportunity(id: number): Promise<Opportunity> {
    const { data } = await api.post(`${this.basePath}/${id}/clone`);
    return data.data;
  }

  /**
   * Get pipeline data with stages and opportunities
   */
  async getPipeline(filters?: OpportunityFilters): Promise<PipelineData> {
    console.log('🔴 [opportunityService.getPipeline] SERVICIO LLAMADO - Service called!');
    this.log('log', '📊 getPipeline called', { filters });

    try {
      const url = `${this.basePath}/pipeline`;
      this.log('log', '🔗 Request URL:', url);
      this.log('log', '📤 Request params:', filters);

      const { data } = await api.get(url, { params: filters });

      this.log('log', '✅ getPipeline raw response:', data);
      this.log('log', '📈 getPipeline processed data:', {
        hasData: !!data.data,
        hasStages: !!data.data?.stages,
        stagesCount: data.data?.stages?.length,
        hasOpportunities: !!data.data?.opportunities,
        opportunitiesCount: data.data?.opportunities?.length,
        hasMetrics: !!data.data?.metrics,
        structure: {
          stages: data.data?.stages?.slice(0, 2), // Show first 2 stages as sample
          opportunities: data.data?.opportunities?.slice(0, 2), // Show first 2 opportunities
          metrics: data.data?.metrics
        }
      });

      return data.data;
    } catch (error: any) {
      console.error('🚨 [opportunityService.getPipeline] ERROR EN LA PETICIÓN:', error);
      this.log('error', '❌ getPipeline failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method,
        fullError: error
      });

      // Log more details for debugging
      if (error.response) {
        this.log('error', '🔴 Server responded with error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data
        });
      } else if (error.request) {
        this.log('error', '🔴 No response received:', {
          request: error.request
        });
      } else {
        this.log('error', '🔴 Error setting up request:', {
          message: error.message
        });
      }

      throw error;
    }
  }

  /**
   * Get pipeline metrics
   */
  async getPipelineMetrics(dateRange?: { start: string; end: string }): Promise<PipelineMetrics> {
    const { data } = await api.get(`${this.basePath}/pipeline`, {
      params: dateRange ? { startDate: dateRange.start, endDate: dateRange.end } : undefined
    });
    return data.data;
  }

  /**
   * Get forecast data
   */
  async getForecastData(period: string): Promise<ForecastData> {
    const { data } = await api.get(`${this.basePath}/forecast`, {
      params: { period }
    });
    return data.data;
  }

  /**
   * Get win/loss analysis
   */
  async getWinLossAnalysis(dateRange?: { start: string; end: string }): Promise<WinLossAnalysis> {
    const { data } = await api.get(`${this.basePath}/analysis/win-loss`, {
      params: dateRange ? { startDate: dateRange.start, endDate: dateRange.end } : undefined
    });
    return data.data;
  }

  /**
   * Calculate weighted value
   */
  async calculateWeightedValue(id: number): Promise<{ weighted_value: number }> {
    const { data } = await api.get(`${this.basePath}/${id}/weighted-value`);
    return data.data;
  }

  /**
   * Get opportunities by account
   */
  async getOpportunitiesByAccount(accountId: number): Promise<Opportunity[]> {
    const { data } = await api.get(this.basePath, {
      params: { account_id: accountId }
    });
    return data.data;
  }

  /**
   * Bulk update opportunities
   */
  async bulkUpdate(ids: number[], updates: Partial<Opportunity>): Promise<{ updated: number }> {
    const { data } = await api.put(`${this.basePath}/bulk`, {
      ids,
      updates
    });
    return data.data;
  }

  /**
   * Export opportunities to CSV
   */
  async exportOpportunities(filters?: OpportunityFilters): Promise<Blob> {
    const response = await api.get(`${this.basePath}/export`, {
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  }
}

export const opportunityService = new OpportunityService();