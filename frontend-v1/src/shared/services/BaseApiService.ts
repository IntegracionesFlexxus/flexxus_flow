import { AxiosRequestConfig } from 'axios'
import { api, apiService, ApiResponse, PaginatedResponse, PaginationParams, FilterParams } from './api'

// Clase base para servicios API - MVP con operaciones CRUD estándar
// TODO: En Nivel 2 agregar cache, optimistic updates y validación

export abstract class BaseApiService<T = any, CreateDTO = any, UpdateDTO = any> {
  protected baseUrl: string
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }
  
  // Obtener todos los registros con paginación y filtros
  async getAll(params?: PaginationParams & FilterParams): Promise<PaginatedResponse<T>> {
    const response = await apiService.get<PaginatedResponse<T>>(this.baseUrl, params)
    return response
  }
  
  // Obtener un registro por ID
  async getById(id: string | number): Promise<T> {
    const response = await apiService.get<ApiResponse<T>>(`${this.baseUrl}/${id}`)
    return response.data
  }
  
  // Crear un nuevo registro
  async create(data: CreateDTO): Promise<T> {
    const response = await apiService.post<ApiResponse<T>>(this.baseUrl, data)
    return response.data
  }
  
  // Actualizar un registro completo
  async update(id: string | number, data: UpdateDTO): Promise<T> {
    const response = await apiService.put<ApiResponse<T>>(`${this.baseUrl}/${id}`, data)
    return response.data
  }
  
  // Actualizar parcialmente un registro
  async patch(id: string | number, data: Partial<UpdateDTO>): Promise<T> {
    const response = await apiService.patch<ApiResponse<T>>(`${this.baseUrl}/${id}`, data)
    return response.data
  }
  
  // Eliminar un registro
  async delete(id: string | number): Promise<void> {
    await apiService.delete(`${this.baseUrl}/${id}`)
  }
  
  // Eliminar múltiples registros
  async deleteMany(ids: (string | number)[]): Promise<void> {
    await apiService.post(`${this.baseUrl}/delete-many`, { ids })
  }
  
  // Búsqueda con texto
  async search(query: string, params?: PaginationParams): Promise<PaginatedResponse<T>> {
    const response = await apiService.get<PaginatedResponse<T>>(
      `${this.baseUrl}/search`,
      { q: query, ...params }
    )
    return response
  }
  
  // Exportar datos (CSV, Excel, PDF)
  async export(format: 'csv' | 'excel' | 'pdf', params?: FilterParams): Promise<Blob> {
    const response = await api.get(
      `${this.baseUrl}/export`,
      {
        params: { format, ...params },
        responseType: 'blob'
      } as AxiosRequestConfig
    )
    return response.data
  }
  
  // Importar datos desde archivo
  async import(file: File, onProgress?: (progress: number) => void): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await apiService.upload(
      `${this.baseUrl}/import`,
      formData,
      onProgress
    )
    return response
  }
  
  // Verificar si existe un registro con cierto campo
  async exists(field: string, value: any): Promise<boolean> {
    const response = await apiService.get<ApiResponse<boolean>>(
      `${this.baseUrl}/exists`,
      { [field]: value }
    )
    return response.data
  }
  
  // Obtener opciones para selects/dropdowns
  async getOptions(field?: string): Promise<any[]> {
    const url = field ? `${this.baseUrl}/options/${field}` : `${this.baseUrl}/options`
    const response = await apiService.get<ApiResponse<any[]>>(url)
    return response.data
  }
  
  // Realizar acción personalizada en un registro
  async performAction(id: string | number, action: string, data?: any): Promise<T> {
    const response = await apiService.post<ApiResponse<T>>(
      `${this.baseUrl}/${id}/${action}`,
      data
    )
    return response.data
  }
  
  // Obtener estadísticas/métricas
  async getStats(params?: FilterParams): Promise<any> {
    const response = await apiService.get<ApiResponse<any>>(
      `${this.baseUrl}/stats`,
      params
    )
    return response.data
  }
}

// Helper para crear servicios rápidamente
export function createApiService<T = any, CreateDTO = any, UpdateDTO = any>(
  baseUrl: string
): BaseApiService<T, CreateDTO, UpdateDTO> {
  return new class extends BaseApiService<T, CreateDTO, UpdateDTO> {
    constructor() {
      super(baseUrl)
    }
  }()
}

// Tipos comunes para DTOs
export interface BaseEntity {
  id: string | number
  createdAt?: Date | string
  updatedAt?: Date | string
}

export interface TimestampedEntity extends BaseEntity {
  createdBy?: string
  updatedBy?: string
  deletedAt?: Date | string | null
}

// TODO: En Nivel 2 agregar:
// - Cache con invalidación inteligente
// - Optimistic updates
// - Retry con backoff exponencial
// - Validación de esquemas con Zod
// - Transformación de datos
// - Hooks para eventos (beforeRequest, afterResponse, onError)