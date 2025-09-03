import axios from 'axios'
import config from '../utils/config'

// Servicio de autenticación básico para MVP
// TODO: En Nivel 2 agregar interceptors, refresh token, etc.

interface LoginData {
  email: string
  password: string
}

interface User {
  id: string
  email: string
  name: string
  token: string
}

class AuthService {
  private apiUrl: string

  constructor() {
    // Usar configuración centralizada
    this.apiUrl = config.apiUrl
  }

  // Login básico
  async login(data: LoginData): Promise<User> {
    try {
      const response = await axios.post(`${this.apiUrl}/auth/login`, data)
      const user = response.data
      
      // Guardar token en localStorage (temporal para MVP)
      // TODO: En Nivel 2 usar solución más segura
      if (user.token) {
        localStorage.setItem('token', user.token)
        localStorage.setItem('user', JSON.stringify(user))
      }
      
      return user
    } catch (error) {
      console.error('Error en login:', error)
      throw error
    }
  }

  // Logout básico
  logout(): void {
    // Limpiar localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    
    // TODO: En Nivel 2 llamar al endpoint de logout del backend
  }

  // Verificar si está autenticado
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token')
    // Validación súper básica
    // TODO: En Nivel 2 verificar expiración del token
    return !!token
  }

  // Obtener usuario actual
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        return JSON.parse(userStr)
      } catch {
        return null
      }
    }
    return null
  }

  // Obtener token
  getToken(): string | null {
    return localStorage.getItem('token')
  }
}

// Exportar instancia única
export const authService = new AuthService()