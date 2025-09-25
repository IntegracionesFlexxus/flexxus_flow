import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1/crm';

export interface DataExport {
  id?: number;
  export_name: string;
  export_type: 'csv' | 'excel' | 'json' | 'pdf';
  entity_type: string;
  filters?: any;
  columns?: string[];
  status?: string;
  file_path?: string;
  created_at?: Date;
  download_count?: number;
  file_size?: number;
  expires_at?: Date;
}

export interface ExportStatus {
  exportId: number;
  status: string;
  progress?: number;
  downloadUrl?: string;
  error?: string;
}

class ExportService {
  private api: AxiosInstance;
  private baseUrl = '/analytics/exports';

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

  async createExport(exportData: Partial<DataExport>): Promise<DataExport> {
    const response = await this.api.post(this.baseUrl, exportData);
    return response.data.data;
  }

  async getExports(): Promise<DataExport[]> {
    const response = await this.api.get(this.baseUrl);
    return response.data.data;
  }

  async getUserExports(): Promise<DataExport[]> {
    const response = await this.api.get(`${this.baseUrl}/my`);
    return response.data.data;
  }

  async getExport(id: number): Promise<DataExport> {
    const response = await this.api.get(`${this.baseUrl}/${id}`);
    return response.data.data;
  }

  async getExportStatus(id: number): Promise<ExportStatus> {
    const response = await this.api.get(`${this.baseUrl}/${id}/status`);
    return response.data.data;
  }

  async downloadExport(id: number): Promise<void> {
    const response = await this.api.get(`${this.baseUrl}/${id}/download`, {
      responseType: 'blob'
    });

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = `export_${id}`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  async cancelExport(id: number): Promise<void> {
    await this.api.post(`${this.baseUrl}/${id}/cancel`);
  }

  async retryExport(id: number): Promise<DataExport> {
    const response = await this.api.post(`${this.baseUrl}/${id}/retry`);
    return response.data.data;
  }

  async createBulkExport(entities: string[], format: string, filters?: any): Promise<any> {
    const response = await this.api.post(`${this.baseUrl}/bulk`, {
      entities,
      format,
      filters
    });
    return response.data.data;
  }

  async getExportStatistics(): Promise<any> {
    const response = await this.api.get(`${this.baseUrl}/statistics`);
    return response.data.data;
  }

  // Helper method to poll export status until completion
  async waitForExport(exportId: number, onProgress?: (status: ExportStatus) => void): Promise<ExportStatus> {
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const status = await this.getExportStatus(exportId);

          if (onProgress) {
            onProgress(status);
          }

          if (status.status === 'completed') {
            clearInterval(pollInterval);
            resolve(status);
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            reject(new Error(status.error || 'Export failed'));
          }
        } catch (error) {
          clearInterval(pollInterval);
          reject(error);
        }
      }, 2000); // Poll every 2 seconds
    });
  }
}

export default new ExportService();