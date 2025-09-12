/**
 * BaseService - Sprint 3
 * Clase base para todos los servicios con funcionalidad común
 * Implementación con principios SOLID y Clean Code
 */

import { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { api } from './api';

/**
 * Response wrapper genérico
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

/**
 * Parámetros de paginación
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Parámetros de filtrado
 */
export interface FilterParams {
  search?: string;
  filters?: Record<string, any>;
  dateFrom?: Date | string;
  dateTo?: Date | string;
}

/**
 * Request options extendidas
 */
export interface RequestOptions extends AxiosRequestConfig {
  skipAuth?: boolean;
  cache?: boolean;
  cacheTime?: number;
  retry?: number;
  retryDelay?: number;
  silent?: boolean; // No mostrar errores
}

/**
 * Error personalizado
 */
export class ApiError extends Error {
  constructor(
    public message: string,
    public code?: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Cache simple en memoria
 */
class SimpleCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutos

  set(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + (ttl || this.defaultTTL)
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.timestamp) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }
}

/**
 * BaseService
 * Principios SOLID aplicados:
 * - S: Responsabilidad única de comunicación con API
 * - O: Abierto para extensión mediante herencia
 * - L: Las clases derivadas pueden sustituir a la base
 * - I: Interface segregada con métodos opcionales
 * - D: Depende de abstracciones (AxiosInstance)
 */
export abstract class BaseService {
  protected client: AxiosInstance;
  protected baseUrl: string;
  private cache: SimpleCache;
  
  constructor(baseUrl: string, client: AxiosInstance = api) {
    this.baseUrl = baseUrl;
    this.client = client;
    this.cache = new SimpleCache();
  }

  /**
   * Build query string from params
   * Clean Code: Función pura
   */
  protected buildQueryString(params: Record<string, any>): string {
    const query = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => query.append(key, v.toString()));
        } else if (value instanceof Date) {
          query.append(key, value.toISOString());
        } else {
          query.append(key, value.toString());
        }
      }
    });
    
    const queryString = query.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Handle API errors consistently
   */
  protected handleError(error: AxiosError): never {
    if (error.response) {
      // Server responded with error
      const data = error.response.data as any;
      throw new ApiError(
        data?.message || 'Error en el servidor',
        data?.code,
        error.response.status,
        data?.details
      );
    } else if (error.request) {
      // Request made but no response
      throw new ApiError(
        'No se pudo conectar con el servidor',
        'NETWORK_ERROR'
      );
    } else {
      // Request setup error
      throw new ApiError(
        error.message || 'Error al procesar la solicitud',
        'REQUEST_ERROR'
      );
    }
  }

  /**
   * Retry logic for failed requests
   */
  private async retryRequest<T>(
    fn: () => Promise<T>,
    retries: number,
    delay: number
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) throw error;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryRequest(fn, retries - 1, delay * 2);
    }
  }

  /**
   * GET request with caching
   */
  protected async get<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const cacheKey = `GET:${url}:${JSON.stringify(options.params)}`;
    
    // Check cache
    if (options.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;
    }
    
    const request = async () => {
      try {
        const response = await this.client.get<ApiResponse<T>>(url, options);
        const data = response.data.data;
        
        // Store in cache
        if (options.cache) {
          this.cache.set(cacheKey, data, options.cacheTime);
        }
        
        return data;
      } catch (error) {
        if (!options.silent) {
          this.handleError(error as AxiosError);
        }
        throw error;
      }
    };
    
    // Apply retry logic if specified
    if (options.retry && options.retry > 0) {
      return this.retryRequest(request, options.retry, options.retryDelay || 1000);
    }
    
    return request();
  }

  /**
   * POST request
   */
  protected async post<T>(
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Invalidate related cache
    this.cache.delete(this.baseUrl);
    
    try {
      const response = await this.client.post<ApiResponse<T>>(url, data, options);
      return response.data.data;
    } catch (error) {
      if (!options.silent) {
        this.handleError(error as AxiosError);
      }
      throw error;
    }
  }

  /**
   * PUT request
   */
  protected async put<T>(
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Invalidate related cache
    this.cache.delete(this.baseUrl);
    
    try {
      const response = await this.client.put<ApiResponse<T>>(url, data, options);
      return response.data.data;
    } catch (error) {
      if (!options.silent) {
        this.handleError(error as AxiosError);
      }
      throw error;
    }
  }

  /**
   * PATCH request
   */
  protected async patch<T>(
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Invalidate related cache
    this.cache.delete(this.baseUrl);
    
    try {
      const response = await this.client.patch<ApiResponse<T>>(url, data, options);
      return response.data.data;
    } catch (error) {
      if (!options.silent) {
        this.handleError(error as AxiosError);
      }
      throw error;
    }
  }

  /**
   * DELETE request
   */
  protected async delete<T = void>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Invalidate related cache
    this.cache.delete(this.baseUrl);
    
    try {
      const response = await this.client.delete<ApiResponse<T>>(url, options);
      return response.data.data;
    } catch (error) {
      if (!options.silent) {
        this.handleError(error as AxiosError);
      }
      throw error;
    }
  }

  /**
   * Get paginated data
   */
  protected async getPaginated<T>(
    endpoint: string,
    params: PaginationParams & FilterParams = {},
    options: RequestOptions = {}
  ): Promise<{
    items: T[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryString = this.buildQueryString(params);
    const url = `${endpoint}${queryString}`;
    
    const response = await this.get<any>(url, options);
    
    return {
      items: response.items || response.data || [],
      total: response.total || 0,
      page: response.page || params.page || 1,
      totalPages: response.totalPages || Math.ceil((response.total || 0) / (params.limit || 10))
    };
  }

  /**
   * Batch operations
   */
  protected async batch<T>(
    operations: Array<{
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      endpoint: string;
      data?: any;
    }>
  ): Promise<T[]> {
    return this.post<T[]>('/batch', { operations });
  }

  /**
   * Upload file
   */
  protected async uploadFile(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>,
    onProgress?: (progress: number) => void
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }
    
    return this.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      }
    });
  }

  /**
   * Download file
   */
  protected async downloadFile(
    endpoint: string,
    filename?: string
  ): Promise<void> {
    const response = await this.client.get(`${this.baseUrl}${endpoint}`, {
      responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || 'download');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Factory para crear servicios
 * Patrón Factory para creación de servicios
 */
export class ServiceFactory {
  private static services = new Map<string, BaseService>();
  
  static register(name: string, service: BaseService): void {
    this.services.set(name, service);
  }
  
  static get<T extends BaseService>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    return service as T;
  }
  
  static clear(): void {
    this.services.clear();
  }
}

export default BaseService;