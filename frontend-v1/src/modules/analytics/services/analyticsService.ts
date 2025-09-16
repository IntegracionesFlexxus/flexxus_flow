/**
 * Analytics Service
 * Conecta con los endpoints mock del backend
 * 
 * NOTA: Actualmente consume endpoints mock.
 * La estructura no cambiará cuando se implemente el backend real.
 */

import { api } from '@/shared/services/api';

export interface MetricsData {
  period: {
    start: string;
    end: string;
  };
  messages: {
    total: number;
    byChannel: {
      whatsapp: number;
      email: number;
      webchat: number;
    };
    avgResponseTime: number;
    firstResponseTime: number;
  };
  contacts: {
    total: number;
    active: number;
    new: number;
  };
  workflows: {
    active: number;
    completed: number;
    failed: number;
  };
  satisfaction: {
    score: number;
    responses: number;
  };
}

export interface ReportData {
  reportType: string;
  period: {
    startDate?: string;
    endDate?: string;
  };
  summary: {
    totalInteractions: number;
    resolvedCases: number;
    resolutionRate: string;
  };
}

export interface DashboardWidget {
  id: string;
  type: 'counter' | 'chart' | 'gauge' | 'table';
  title: string;
  value?: number;
  data?: any[];
}

class AnalyticsService {
  private baseUrl = '/analytics';

  /**
   * Obtener métricas generales
   * @returns Métricas mock del sistema
   */
  async getMetrics(): Promise<{ 
    success: boolean; 
    data: MetricsData;
    metadata: { isDemo: boolean; generatedAt: string };
  }> {
    try {
      const response = await api.get(`${this.baseUrl}/metrics`);
      return response.data;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      throw error;
    }
  }

  /**
   * Obtener reporte por tipo
   * @param type - Tipo de reporte
   * @param startDate - Fecha inicio (opcional)
   * @param endDate - Fecha fin (opcional)
   * @returns Datos del reporte mock
   */
  async getReport(
    type: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ success: boolean; data: ReportData }> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get(
        `${this.baseUrl}/reports/${type}?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching report:', error);
      throw error;
    }
  }

  /**
   * Obtener widgets del dashboard
   * @returns Configuración de widgets mock
   */
  async getDashboardWidgets(): Promise<{ 
    success: boolean; 
    data: { widgets: DashboardWidget[] };
  }> {
    try {
      const response = await api.get(`${this.baseUrl}/dashboard`);
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard widgets:', error);
      throw error;
    }
  }

  /**
   * Verificar estado del módulo
   * @returns Estado del módulo
   */
  async getModuleStatus(): Promise<{ module: string; status: string; message: string }> {
    try {
      const response = await api.get(`${this.baseUrl}/status`);
      return response.data;
    } catch (error) {
      console.error('Error fetching module status:', error);
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();