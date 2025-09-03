import axios from 'axios'
import { authService } from './authService'

// Servicio API básico para llamadas HTTP
// TODO: En Nivel 2 agregar interceptors, manejo de errores centralizado, retry logic

// Base URL del API - hardcodeada por ahora
// TODO: Mover a .env en Nivel 2
const API_BASE_URL = 'http://localhost:3001/api/v1'

// Crear instancia de axios con configuración básica
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor básico para agregar token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = authService.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor básico para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si es 401, redirigir a login
    if (error.response?.status === 401) {
      authService.logout()
      window.location.href = '/login'
    }
    
    // TODO: En Nivel 2 agregar notificaciones de error
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export default api

// Funciones helper para peticiones comunes
export const apiService = {
  // GET genérico
  get: async (endpoint: string, params?: any) => {
    const response = await api.get(endpoint, { params })
    return response.data
  },

  // POST genérico
  post: async (endpoint: string, data?: any) => {
    const response = await api.post(endpoint, data)
    return response.data
  },

  // PUT genérico
  put: async (endpoint: string, data?: any) => {
    const response = await api.put(endpoint, data)
    return response.data
  },

  // DELETE genérico
  delete: async (endpoint: string) => {
    const response = await api.delete(endpoint)
    return response.data
  },
}