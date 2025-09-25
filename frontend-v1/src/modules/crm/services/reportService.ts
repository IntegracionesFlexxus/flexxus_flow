import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1/crm';

export interface ReportDefinition {
  id?: number;
  name: string;
  description?: string;
  report_type: 'lead_analysis' | 'sales_performance' | 'activity_summary' |
               'pipeline_forecast' | 'conversion_funnel' | 'custom';
  query_config: any;
  filters?: any;
  columns?: any[];
  visualization_type?: string;
  is_active?: boolean;
}

export interface ReportExecution {
  reportId: number;
  filters?: any;
  format?: 'json' | 'csv' | 'excel' | 'pdf';
}

class ReportService {
  private api: AxiosInstance;
  private baseUrl = '/analytics/reports';

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

  async getReports(): Promise<ReportDefinition[]> {
    const response = await this.api.get(this.baseUrl);
    return response.data.data;
  }

  async getReport(id: number): Promise<ReportDefinition> {
    const response = await this.api.get(`${this.baseUrl}/${id}`);
    return response.data.data;
  }

  async createReport(report: ReportDefinition): Promise<ReportDefinition> {
    const response = await this.api.post(this.baseUrl, report);
    return response.data.data;
  }

  async updateReport(id: number, report: Partial<ReportDefinition>): Promise<ReportDefinition> {
    const response = await this.api.put(`${this.baseUrl}/${id}`, report);
    return response.data.data;
  }

  async deleteReport(id: number): Promise<void> {
    await this.api.delete(`${this.baseUrl}/${id}`);
  }

  async executeReport(execution: ReportExecution): Promise<any> {
    const response = await this.api.post(
      `${this.baseUrl}/${execution.reportId}/execute`,
      execution
    );
    return response.data.data;
  }

  async exportReport(reportId: number, format: string): Promise<any> {
    const response = await this.api.post(
      `${this.baseUrl}/${reportId}/export?format=${format}`
    );
    return response.data.data;
  }

  async scheduleReport(reportId: number, schedule: any): Promise<ReportDefinition> {
    const response = await this.api.post(
      `${this.baseUrl}/${reportId}/schedule`,
      schedule
    );
    return response.data.data;
  }

  async cloneReport(reportId: number, name: string): Promise<ReportDefinition> {
    const response = await this.api.post(
      `${this.baseUrl}/${reportId}/clone`,
      { name }
    );
    return response.data.data;
  }

  async getReportMetrics(reportId: number): Promise<any> {
    const response = await this.api.get(`${this.baseUrl}/${reportId}/metrics`);
    return response.data.data;
  }
}

export default new ReportService();