import { api, apiService, ApiResponse } from './api'

// Servicio API de Analytics - MVP con métricas básicas
// TODO: En Nivel 2 agregar dashboards personalizables, ML, predicciones

// Tipos de métricas y períodos
export type MetricType = 'messages' | 'contacts' | 'workflows' | 'conversions' | 'revenue'
export type PeriodType = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'
export type ChartType = 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'heatmap'
export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max'

// Interfaces para métricas
export interface Metric {
  id: string
  name: string
  type: MetricType
  value: number
  change: number // Porcentaje de cambio
  changeType: 'increase' | 'decrease' | 'stable'
  period: PeriodType
  unit?: string
  icon?: string
  color?: string
}

export interface MetricSeries {
  metric: string
  data: {
    timestamp: Date | string
    value: number
    label?: string
  }[]
  aggregation?: AggregationType
}

// Interface para dashboard
export interface Dashboard {
  id: string
  name: string
  description?: string
  widgets: DashboardWidget[]
  filters?: DashboardFilter[]
  refreshInterval?: number // seconds
  isDefault?: boolean
  isPublic?: boolean
  createdBy: string
  createdAt: Date | string
}

export interface DashboardWidget {
  id: string
  type: 'metric' | 'chart' | 'table' | 'list' | 'map'
  title: string
  metric?: string
  chartType?: ChartType
  data?: any
  config?: Record<string, any>
  position: { x: number; y: number; w: number; h: number }
}

export interface DashboardFilter {
  field: string
  label: string
  type: 'select' | 'daterange' | 'search'
  value?: any
  options?: { label: string; value: any }[]
}

// Interface para reportes
export interface Report {
  id: string
  name: string
  description?: string
  type: 'scheduled' | 'on-demand'
  format: 'pdf' | 'excel' | 'csv'
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    time?: string
    dayOfWeek?: number
    dayOfMonth?: number
  }
  recipients?: string[]
  filters?: Record<string, any>
  lastGeneratedAt?: Date | string
  nextRunAt?: Date | string
}

// Interface para análisis de funnel
export interface FunnelStage {
  name: string
  value: number
  percentage: number
  dropoff?: number
  averageTime?: number // minutes
}

export interface FunnelAnalysis {
  id: string
  name: string
  stages: FunnelStage[]
  totalConversion: number
  period: { from: Date | string; to: Date | string }
}

// Interface para análisis de cohorte
export interface CohortAnalysis {
  cohortDate: Date | string
  size: number
  retention: {
    period: number
    retained: number
    percentage: number
  }[]
}

// Servicio de Analytics
class AnalyticsApiService {
  private baseUrl = '/analytics'
  
  // Obtener métricas principales
  async getMetrics(params?: {
    type?: MetricType
    period?: PeriodType
    dateFrom?: Date | string
    dateTo?: Date | string
  }): Promise<Metric[]> {
    const response = await apiService.get<ApiResponse<Metric[]>>(
      `${this.baseUrl}/metrics`,
      params
    )
    return response.data || []
  }
  
  // Obtener serie temporal de métricas
  async getMetricSeries(
    metric: string,
    params: {
      period: PeriodType
      dateFrom: Date | string
      dateTo: Date | string
      aggregation?: AggregationType
      groupBy?: string
    }
  ): Promise<MetricSeries> {
    const response = await apiService.get<ApiResponse<MetricSeries>>(
      `${this.baseUrl}/metrics/${metric}/series`,
      params
    )
    return response.data
  }
  
  // Obtener dashboards
  async getDashboards(): Promise<Dashboard[]> {
    const response = await apiService.get<ApiResponse<Dashboard[]>>(
      `${this.baseUrl}/dashboards`
    )
    return response.data || []
  }
  
  // Obtener dashboard por ID
  async getDashboard(dashboardId: string): Promise<Dashboard> {
    const response = await apiService.get<ApiResponse<Dashboard>>(
      `${this.baseUrl}/dashboards/${dashboardId}`
    )
    return response.data
  }
  
  // Crear dashboard
  async createDashboard(data: Partial<Dashboard>): Promise<Dashboard> {
    const response = await apiService.post<ApiResponse<Dashboard>>(
      `${this.baseUrl}/dashboards`,
      data
    )
    return response.data
  }
  
  // Actualizar dashboard
  async updateDashboard(
    dashboardId: string,
    data: Partial<Dashboard>
  ): Promise<Dashboard> {
    const response = await apiService.patch<ApiResponse<Dashboard>>(
      `${this.baseUrl}/dashboards/${dashboardId}`,
      data
    )
    return response.data
  }
  
  // Eliminar dashboard
  async deleteDashboard(dashboardId: string): Promise<void> {
    await apiService.delete(`${this.baseUrl}/dashboards/${dashboardId}`)
  }
  
  // Obtener reportes
  async getReports(): Promise<Report[]> {
    const response = await apiService.get<ApiResponse<Report[]>>(
      `${this.baseUrl}/reports`
    )
    return response.data || []
  }
  
  // Generar reporte
  async generateReport(
    reportId: string,
    params?: Record<string, any>
  ): Promise<{ url: string; expiresAt: Date | string }> {
    const response = await apiService.post<ApiResponse<any>>(
      `${this.baseUrl}/reports/${reportId}/generate`,
      params
    )
    return response.data
  }
  
  // Programar reporte
  async scheduleReport(data: Partial<Report>): Promise<Report> {
    const response = await apiService.post<ApiResponse<Report>>(
      `${this.baseUrl}/reports/schedule`,
      data
    )
    return response.data
  }
  
  // Análisis de funnel
  async getFunnelAnalysis(
    funnelId: string,
    params?: {
      dateFrom?: Date | string
      dateTo?: Date | string
      segment?: string
    }
  ): Promise<FunnelAnalysis> {
    const response = await apiService.get<ApiResponse<FunnelAnalysis>>(
      `${this.baseUrl}/funnels/${funnelId}`,
      params
    )
    return response.data
  }
  
  // Análisis de cohorte
  async getCohortAnalysis(params: {
    metric: string
    dateFrom: Date | string
    dateTo: Date | string
    cohortSize: 'day' | 'week' | 'month'
  }): Promise<CohortAnalysis[]> {
    const response = await apiService.get<ApiResponse<CohortAnalysis[]>>(
      `${this.baseUrl}/cohorts`,
      params
    )
    return response.data || []
  }
  
  // Análisis de segmentación
  async getSegmentAnalysis(params: {
    metric: string
    segmentBy: string
    dateFrom?: Date | string
    dateTo?: Date | string
  }): Promise<{
    segments: {
      name: string
      value: number
      percentage: number
      trend?: number
    }[]
  }> {
    const response = await apiService.get<ApiResponse<any>>(
      `${this.baseUrl}/segments`,
      params
    )
    return response.data
  }
  
  // Obtener estadísticas en tiempo real
  async getRealtimeStats(): Promise<{
    activeUsers: number
    activeConversations: number
    messagesPerMinute: number
    responseTime: number // seconds
    queueSize: number
  }> {
    const response = await apiService.get<ApiResponse<any>>(
      `${this.baseUrl}/realtime`
    )
    return response.data
  }
  
  // Obtener mapa de calor
  async getHeatmap(params: {
    metric: string
    dimension: 'hour' | 'dayOfWeek'
    dateFrom?: Date | string
    dateTo?: Date | string
  }): Promise<{
    data: number[][]
    labels: { x: string[]; y: string[] }
  }> {
    const response = await apiService.get<ApiResponse<any>>(
      `${this.baseUrl}/heatmap`,
      params
    )
    return response.data
  }
  
  // Exportar datos
  async exportData(params: {
    type: 'metrics' | 'raw'
    format: 'csv' | 'excel' | 'json'
    dateFrom: Date | string
    dateTo: Date | string
    filters?: Record<string, any>
  }): Promise<Blob> {
    const response = await api.get(
      `${this.baseUrl}/export`,
      { 
        params,
        responseType: 'blob' 
      }
    )
    return response.data
  }
  
  // Obtener KPIs principales
  async getKPIs(): Promise<{
    conversionRate: number
    averageResponseTime: number // minutes
    customerSatisfaction: number // 0-100
    churnRate: number
    lifetimeValue: number
    activeUsersGrowth: number
  }> {
    const response = await apiService.get<ApiResponse<any>>(
      `${this.baseUrl}/kpis`
    )
    return response.data
  }
  
  // Obtener predicciones (básicas en MVP)
  async getPredictions(params: {
    metric: string
    periods: number
  }): Promise<{
    predictions: {
      date: Date | string
      value: number
      confidence: number
    }[]
  }> {
    const response = await apiService.get<ApiResponse<any>>(
      `${this.baseUrl}/predictions`,
      params
    )
    return response.data
  }
  
  // Mock data para desarrollo
  async getMockMetrics(): Promise<Metric[]> {
    if (import.meta.env.DEV) {
      return [
        {
          id: '1',
          name: 'Total de Contactos',
          type: 'contacts',
          value: 1234,
          change: 12.5,
          changeType: 'increase',
          period: 'month',
          icon: 'people',
          color: '#1976d2'
        },
        {
          id: '2',
          name: 'Mensajes Enviados',
          type: 'messages',
          value: 5678,
          change: -3.2,
          changeType: 'decrease',
          period: 'week',
          icon: 'message',
          color: '#388e3c'
        },
        {
          id: '3',
          name: 'Workflows Activos',
          type: 'workflows',
          value: 15,
          change: 0,
          changeType: 'stable',
          period: 'day',
          icon: 'workflow',
          color: '#f57c00'
        },
        {
          id: '4',
          name: 'Tasa de Conversión',
          type: 'conversions',
          value: 24.5,
          change: 8.3,
          changeType: 'increase',
          period: 'month',
          unit: '%',
          icon: 'trending_up',
          color: '#7b1fa2'
        }
      ]
    }
    return []
  }
  
  async getMockDashboard(): Promise<Dashboard> {
    if (import.meta.env.DEV) {
      return {
        id: '1',
        name: 'Dashboard Principal',
        description: 'Métricas principales del sistema',
        widgets: [
          {
            id: 'w1',
            type: 'metric',
            title: 'Total Contactos',
            metric: 'contacts',
            position: { x: 0, y: 0, w: 3, h: 2 }
          },
          {
            id: 'w2',
            type: 'chart',
            title: 'Mensajes por Día',
            chartType: 'line',
            metric: 'messages',
            position: { x: 3, y: 0, w: 6, h: 4 }
          },
          {
            id: 'w3',
            type: 'chart',
            title: 'Distribución por Canal',
            chartType: 'pie',
            position: { x: 9, y: 0, w: 3, h: 4 }
          }
        ],
        isDefault: true,
        createdBy: 'user-1',
        createdAt: new Date().toISOString()
      }
    }
    return {} as Dashboard
  }
}

// Exportar instancia única
export const analyticsApi = new AnalyticsApiService()

// TODO: En Nivel 2 agregar:
// - Dashboards drag & drop personalizables
// - Machine Learning para predicciones
// - Análisis de sentimiento
// - Detección de anomalías
// - Benchmarking industria
// - Exportación automatizada
// - Alertas inteligentes
// - Integración con BI tools