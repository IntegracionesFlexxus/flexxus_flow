import axios, { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse,
  InternalAxiosRequestConfig 
} from 'axios'
import { getAuthState, getUIState } from '@/shared/store'

// Configuración principal de Axios - MVP con interceptors básicos

// Obtener URL base de variables de entorno o usar default
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api/v1'

// Crear instancia de axios
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos - TODO: Configurar por endpoint en Nivel 2
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Para cookies si es necesario
})

// Request interceptor - Agregar auth y headers
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Obtener token del store
    const token = getAuthState().token
    const currentCompany = getAuthState().currentCompany

    // Agregar token si existe
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Agregar company ID si existe (multi-tenant)
    if (currentCompany && config.headers) {
      config.headers['X-Company-ID'] = currentCompany.id
    }

    // Agregar timestamp para debugging en desarrollo
    if (import.meta.env.DEV) {
      config.headers['X-Request-Time'] = new Date().toISOString()
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Manejo de errores y notificaciones
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error) => {
    const { addNotification } = getUIState()
    const { clearAuth } = getAuthState()

    console.log('🔴 [API Interceptor] Error capturado:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    })

    // Ignorar errores de solicitudes canceladas
    if (error.code === 'ERR_CANCELED' || error.message === 'canceled') {
      return Promise.reject(error)
    }

    // Manejar diferentes códigos de error
    if (error.response) {
      const { status, data } = error.response

      switch (status) {
        case 401: // Unauthorized
          console.log('🔴 [API Interceptor] Error 401 detectado:', {
            url: error.config?.url,
            isLoginRoute: error.config?.url?.includes('/auth/login')
          })

          // Solo hacer logout si no es la ruta de login
          if (!error.config?.url?.includes('/auth/login')) {
            // Try to refresh token before logging out
            const refreshToken = localStorage.getItem('refreshToken')
            if (refreshToken && !error.config._retry) {
              error.config._retry = true
              console.log('🔄 [API Interceptor] Intentando refrescar token...')

              try {
                // Import authService to refresh token
                const { authService } = await import('@/modules/auth/services/authService')
                const refreshResult = await authService.refreshToken()

                if (refreshResult.success) {
                  console.log('✅ [API Interceptor] Token refrescado exitosamente')
                  // Update the authorization header with new token
                  const newToken = localStorage.getItem('accessToken')
                  if (newToken) {
                    error.config.headers = error.config.headers || {}
                    error.config.headers['Authorization'] = `Bearer ${newToken}`
                    // Retry the original request
                    return api(error.config)
                  }
                }
              } catch (refreshError) {
                console.error('❌ [API Interceptor] Token refresh failed:', refreshError)
              }
            }

            // If refresh fails, clear auth
            console.error('🚪 [API Interceptor] Limpiando autenticación y redirigiendo al login')
            clearAuth()
            window.location.href = '/auth/login'
            addNotification({
              type: 'warning',
              title: 'Sesión expirada',
              message: 'Por favor, inicia sesión nuevamente',
              autoClose: true,
            })
          }
          break
          
        case 403: // Forbidden - Try refresh for permission issues
          // For 403, also try to refresh token in case permissions are outdated
          if (!error.config._retry403) {
            error.config._retry403 = true
            const refreshToken = localStorage.getItem('refreshToken')
            
            if (refreshToken) {
              try {
                const { authService } = await import('@/modules/auth/services/authService')
                const refreshResult = await authService.refreshToken()
                
                if (refreshResult.success) {
                  const newToken = localStorage.getItem('accessToken')
                  if (newToken) {
                    error.config.headers = error.config.headers || {}
                    error.config.headers['Authorization'] = `Bearer ${newToken}`
                    return api(error.config)
                  }
                }
              } catch (refreshError) {
                console.error('Permission refresh failed:', refreshError)
              }
            }
          }
          
          addNotification({
            type: 'error',
            title: 'Acceso denegado',
            message: data?.message || 'No tienes permisos para realizar esta acción',
            autoClose: true,
          })
          break
          
        case 404: // Not Found
          addNotification({
            type: 'error',
            title: 'No encontrado',
            message: data?.message || 'El recurso solicitado no existe',
            autoClose: true,
          })
          break
          
        case 422: // Validation Error
          addNotification({
            type: 'error',
            title: 'Error de validación',
            message: data?.message || 'Por favor, verifica los datos ingresados',
            autoClose: true,
          })
          break
          
        case 429: // Too Many Requests
          addNotification({
            type: 'warning',
            title: 'Demasiadas solicitudes',
            message: 'Por favor, espera un momento antes de intentar nuevamente',
            autoClose: true,
          })
          break
          
        case 500: // Server Error
        case 502: // Bad Gateway
        case 503: // Service Unavailable
          addNotification({
            type: 'error',
            title: 'Error del servidor',
            message: 'Ha ocurrido un error en el servidor. Por favor, intenta más tarde',
            autoClose: true,
          })
          break
          
        default:
          // Error genérico
          addNotification({
            type: 'error',
            title: `Error ${status}`,
            message: data?.message || 'Ha ocurrido un error inesperado',
            autoClose: true,
          })
      }
    } else if (error.request) {
      // La petición se hizo pero no se recibió respuesta
      addNotification({
        type: 'error',
        title: 'Error de conexión',
        message: 'No se pudo conectar con el servidor. Verifica tu conexión a internet',
        autoClose: false,
      })
    } else {
      // Algo pasó al configurar la petición
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'Ha ocurrido un error inesperado',
        autoClose: true,
      })
    }
    
    return Promise.reject(error)
  }
)

// Tipos de respuesta API estándar
export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  errors?: Record<string, string[]>
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Tipo para parámetros de paginación
export interface PaginationParams {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

// Tipo para parámetros de filtros
export interface FilterParams {
  search?: string
  [key: string]: any
}

// Helper para construir query strings
export const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, v))
      } else {
        searchParams.append(key, String(value))
      }
    }
  })
  
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

// Exportar instancia configurada
export { api }

// Métodos helper para peticiones comunes
export const apiService = {
  // GET
  get: async <T = any>(url: string, params?: Record<string, any>): Promise<T> => {
    const queryString = params ? buildQueryString(params) : ''
    const response = await api.get<T>(`${url}${queryString}`)
    return response.data
  },
  
  // POST
  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.post<T>(url, data, config)
    return response.data
  },
  
  // PUT
  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.put<T>(url, data, config)
    return response.data
  },
  
  // PATCH
  patch: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.patch<T>(url, data, config)
    return response.data
  },
  
  // DELETE
  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.delete<T>(url, config)
    return response.data
  },
  
  // Upload files
  upload: async <T = any>(url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<T> => {
    const response = await api.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })
    return response.data
  },
}

export default api