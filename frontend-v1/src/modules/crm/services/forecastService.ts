/**
 * Forecast Service
 * API integration for forecasting and predictions
 */

import axios, { AxiosInstance } from 'axios';
import {
  ForecastPeriod,
  ForecastSnapshot,
  ForecastAccuracy,
  SnapshotData,
  ForecastData,
  ForecastCategory,
  CommitStatus
} from '../types/pipeline.types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1/crm';

class ForecastService {
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

  // Forecast Periods
  async getForecastPeriods(active?: boolean): Promise<ForecastPeriod[]> {
    const response = await this.api.get('/forecast/periods', {
      params: {
        company_id: this.companyId,
        active
      }
    });
    return response.data;
  }

  async getForecastPeriod(periodId: number): Promise<ForecastPeriod> {
    const response = await this.api.get(`/forecast/periods/${periodId}`);
    return response.data;
  }

  async createForecastPeriod(period: Partial<ForecastPeriod>): Promise<ForecastPeriod> {
    const response = await this.api.post('/forecast/periods', {
      ...period,
      company_id: this.companyId
    });
    return response.data;
  }

  async updateForecastPeriod(periodId: number, updates: Partial<ForecastPeriod>): Promise<ForecastPeriod> {
    const response = await this.api.put(`/forecast/periods/${periodId}`, updates);
    return response.data;
  }

  async closeForecastPeriod(periodId: number): Promise<void> {
    await this.api.post(`/forecast/periods/${periodId}/close`);
  }

  // Forecast Snapshots
  async createSnapshot(data: SnapshotData): Promise<ForecastSnapshot> {
    const response = await this.api.post('/forecast/snapshots', {
      ...data,
      company_id: this.companyId,
      snapshot_date: new Date().toISOString()
    });
    return response.data;
  }

  async createBulkSnapshots(periodId: number, opportunityIds?: string[]): Promise<{ created: number }> {
    const response = await this.api.post('/forecast/snapshots/bulk', {
      period_id: periodId,
      opportunity_ids: opportunityIds,
      company_id: this.companyId
    });
    return response.data;
  }

  async getSnapshots(periodId: number, filters?: {
    category?: ForecastCategory;
    commit_status?: CommitStatus;
    owner_id?: string;
  }): Promise<ForecastSnapshot[]> {
    const response = await this.api.get(`/forecast/periods/${periodId}/snapshots`, {
      params: filters
    });
    return response.data;
  }

  async updateSnapshot(snapshotId: number, updates: Partial<ForecastSnapshot>): Promise<ForecastSnapshot> {
    const response = await this.api.put(`/forecast/snapshots/${snapshotId}`, updates);
    return response.data;
  }

  async deleteSnapshot(snapshotId: number): Promise<void> {
    await this.api.delete(`/forecast/snapshots/${snapshotId}`);
  }

  // Forecast Accuracy
  async getForecastAccuracy(periodId: number): Promise<ForecastAccuracy[]> {
    const response = await this.api.get(`/forecast/accuracy/${periodId}`);
    return response.data;
  }

  async calculateAccuracy(periodId: number): Promise<ForecastAccuracy> {
    const response = await this.api.post(`/forecast/accuracy/${periodId}/calculate`, {
      company_id: this.companyId
    });
    return response.data;
  }

  async getHistoricalAccuracy(periods: number = 4): Promise<ForecastAccuracy[]> {
    const response = await this.api.get('/forecast/accuracy/historical', {
      params: {
        company_id: this.companyId,
        periods
      }
    });
    return response.data;
  }

  // Opportunity Forecast
  async updateOpportunityForecast(opportunityId: string, data: ForecastData): Promise<void> {
    await this.api.put(`/forecast/opportunities/${opportunityId}`, data);
  }

  async getOpportunityForecastHistory(opportunityId: string): Promise<ForecastSnapshot[]> {
    const response = await this.api.get(`/forecast/opportunities/${opportunityId}/history`);
    return response.data;
  }

  // Forecast Analytics
  async getForecastSummary(periodId: number): Promise<{
    total_pipeline: number;
    committed: number;
    best_case: number;
    upside: number;
    closed_won: number;
    closed_lost: number;
    gap_to_target: number;
    confidence_level: number;
  }> {
    const response = await this.api.get(`/forecast/periods/${periodId}/summary`);
    return response.data;
  }

  async getForecastTrends(periodIds: number[]): Promise<{
    period_id: number;
    period_name: string;
    forecast_amount: number;
    actual_amount: number;
    accuracy: number;
  }[]> {
    const response = await this.api.get('/forecast/trends', {
      params: {
        period_ids: periodIds.join(','),
        company_id: this.companyId
      }
    });
    return response.data;
  }

  async getForecastByOwner(periodId: number): Promise<{
    owner_id: string;
    owner_name: string;
    pipeline_amount: number;
    committed_amount: number;
    best_case_amount: number;
    closed_amount: number;
    quota?: number;
    attainment?: number;
  }[]> {
    const response = await this.api.get(`/forecast/periods/${periodId}/by-owner`);
    return response.data;
  }

  async getForecastByCategory(periodId: number): Promise<{
    category: ForecastCategory;
    count: number;
    total_amount: number;
    weighted_amount: number;
    avg_probability: number;
  }[]> {
    const response = await this.api.get(`/forecast/periods/${periodId}/by-category`);
    return response.data;
  }

  // ML Predictions
  async getPredictions(periodId: number): Promise<{
    opportunity_id: string;
    predicted_close_date: string;
    predicted_amount: number;
    confidence_score: number;
    risk_factors: string[];
    recommendations: string[];
  }[]> {
    const response = await this.api.get(`/forecast/periods/${periodId}/predictions`);
    return response.data;
  }

  async getWinProbabilityPrediction(opportunityId: string): Promise<{
    probability: number;
    confidence: number;
    factors: {
      factor: string;
      impact: 'positive' | 'negative';
      weight: number;
    }[];
  }> {
    const response = await this.api.get(`/forecast/opportunities/${opportunityId}/win-probability`);
    return response.data;
  }

  // Export
  async exportForecast(periodId: number, format: 'excel' | 'pdf'): Promise<Blob> {
    const response = await this.api.get(`/forecast/periods/${periodId}/export`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }

  async exportForecastComparison(periodIds: number[], format: 'excel' | 'pdf'): Promise<Blob> {
    const response = await this.api.get('/forecast/export/comparison', {
      params: {
        period_ids: periodIds.join(','),
        format
      },
      responseType: 'blob'
    });
    return response.data;
  }
}

export default new ForecastService();