import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1/crm';

export interface DashboardConfiguration {
  id?: number;
  name: string;
  description?: string;
  layout_type?: string;
  widgets?: DashboardWidget[];
  filters?: any;
  is_default?: boolean;
  is_public?: boolean;
  is_active?: boolean;
}

export interface DashboardWidget {
  id?: number;
  widget_type: string;
  title?: string;
  data_source?: string;
  query_config?: any;
  visualization_config?: any;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
}

class DashboardService {
  private api: AxiosInstance;
  private baseUrl = '/analytics/dashboards';

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

  async getDashboards(): Promise<DashboardConfiguration[]> {
    const response = await this.api.get(this.baseUrl);
    return response.data.data;
  }

  async getDashboard(id: number): Promise<DashboardConfiguration> {
    const response = await this.api.get(`${this.baseUrl}/${id}`);
    return response.data.data;
  }

  async createDashboard(dashboard: DashboardConfiguration): Promise<DashboardConfiguration> {
    const response = await this.api.post(this.baseUrl, dashboard);
    return response.data.data;
  }

  async updateDashboard(id: number, dashboard: Partial<DashboardConfiguration>): Promise<DashboardConfiguration> {
    const response = await this.api.put(`${this.baseUrl}/${id}`, dashboard);
    return response.data.data;
  }

  async deleteDashboard(id: number): Promise<void> {
    await this.api.delete(`${this.baseUrl}/${id}`);
  }

  async cloneDashboard(id: number, name: string): Promise<DashboardConfiguration> {
    const response = await this.api.post(`${this.baseUrl}/${id}/clone`, { name });
    return response.data.data;
  }

  async addWidget(dashboardId: number, widget: DashboardWidget): Promise<DashboardWidget> {
    const response = await this.api.post(`${this.baseUrl}/${dashboardId}/widgets`, widget);
    return response.data.data;
  }

  async updateWidget(widgetId: number, widget: Partial<DashboardWidget>): Promise<DashboardWidget> {
    const response = await this.api.put(`/analytics/widgets/${widgetId}`, widget);
    return response.data.data;
  }

  async deleteWidget(widgetId: number): Promise<void> {
    await this.api.delete(`/analytics/widgets/${widgetId}`);
  }

  async updateWidgetPositions(widgets: Array<{ id: number; position_x: number; position_y: number }>): Promise<void> {
    await this.api.put(`/analytics/widgets/positions`, { widgets });
  }

  async getWidgetData(widgetId: number, filters?: any): Promise<any> {
    const response = await this.api.get(`/analytics/widgets/${widgetId}/data`, { params: filters });
    return response.data.data;
  }

  async setDefaultDashboard(dashboardId: number): Promise<DashboardConfiguration> {
    const response = await this.api.post(`${this.baseUrl}/${dashboardId}/set-default`);
    return response.data.data;
  }
}

export default new DashboardService();