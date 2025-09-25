import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1/crm';

export interface KpiDefinition {
  id?: number;
  name: string;
  category?: 'sales' | 'marketing' | 'service' | 'operational' | 'financial';
  calculation_type?: 'count' | 'sum' | 'average' | 'percentage' | 'ratio' | 'custom';
  target_value?: number;
  threshold_warning?: number;
  threshold_critical?: number;
  unit?: string;
  is_active?: boolean;
}

export interface KpiSnapshot {
  id?: number;
  kpi_id: number;
  value: number;
  target_value?: number;
  previous_value?: number;
  change_percentage?: number;
  status?: 'excellent' | 'good' | 'warning' | 'critical';
  snapshot_date: Date;
}

class KpiService {
  private api: AxiosInstance;
  private baseUrl = '/analytics';

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

  async getKpis(): Promise<KpiDefinition[]> {
    const response = await this.api.get(`${this.baseUrl}/kpis`);
    return response.data.data;
  }

  async getKpiDashboard(): Promise<any> {
    const response = await this.api.get(`${this.baseUrl}/kpis/dashboard`);
    return response.data.data;
  }

  async calculateKpi(kpiId: number): Promise<KpiSnapshot> {
    const response = await this.api.post(`${this.baseUrl}/kpis/${kpiId}/calculate`);
    return response.data.data;
  }

  async getKpiTrends(kpiId: number, period: string = 'daily', days: number = 30): Promise<any[]> {
    const response = await this.api.get(
      `${this.baseUrl}/kpis/${kpiId}/trends?period=${period}&days=${days}`
    );
    return response.data.data;
  }

  async createKpiAlert(kpiId: number, alertConfig: any): Promise<any> {
    const response = await this.api.post(`${this.baseUrl}/kpis/${kpiId}/alerts`, alertConfig);
    return response.data.data;
  }

  async getKpiSnapshots(kpiId: number, startDate?: string, endDate?: string): Promise<KpiSnapshot[]> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await this.api.get(`${this.baseUrl}/kpis/${kpiId}/snapshots`, { params });
    return response.data.data;
  }

  async compareKpis(kpiIds: number[], startDate?: string, endDate?: string): Promise<any> {
    const response = await this.api.post(`${this.baseUrl}/kpis/compare`, {
      kpiIds,
      startDate,
      endDate
    });
    return response.data.data;
  }
}

export default new KpiService();