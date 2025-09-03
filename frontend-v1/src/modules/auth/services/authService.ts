import axios from 'axios'
import config from '@/utils/config'

// Servicio de autenticación del módulo Auth
// TODO: En Nivel 2 mover lógica común a shared/services

interface LoginData {
  email: string
  password: string
}

interface User {
  id: string
  email: string
  name: string
  token: string
  role?: string // Agregado para sistema de routing
  // TODO: Nivel 2 - Agregar más campos como permisos, avatar, etc.
}

class AuthService {
  private apiUrl: string

  constructor() {
    this.apiUrl = config.apiUrl
  }

  async login(data: LoginData): Promise<User> {
    try {
      // TODO: En Nivel 2 conectar con API real
      // Por ahora simulamos login con datos hardcodeados
      const mockResponse = {
        id: '1',
        email: data.email,
        name: data.email.split('@')[0],
        token: 'mock-token-' + Date.now(),
        role: data.email.includes('admin') ? 'admin' : 'user'
      }
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Validación básica MVP
      if (!data.email || !data.password) {
        throw new Error('Email y contraseña son requeridos')
      }
      
      // Mock de credenciales válidas - REMOVER en Nivel 2
      const validUsers: Record<string, string> = {
        'admin@test.com': 'admin123',
        'user@test.com': 'user123'
      }
      
      if (validUsers[data.email] !== data.password) {
        throw new Error('Credenciales inválidas')
      }
      
      const user = mockResponse
      
      // Guardar en localStorage - temporal para MVP
      // TODO: En Nivel 2 usar httpOnly cookies o solución más segura
      if (user.token) {
        localStorage.setItem('token', user.token)
        localStorage.setItem('user', JSON.stringify(user))
      }
      
      // Manejar returnUrl si existe
      const returnUrl = localStorage.getItem('returnUrl')
      if (returnUrl) {
        localStorage.removeItem('returnUrl')
      }
      
      return user
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  logout(): void {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('returnUrl')
    // TODO: Nivel 2 - Llamar endpoint de logout
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token')
    // TODO: En Nivel 2 verificar expiración del token
    return !!token
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user')
    try {
      return userStr ? JSON.parse(userStr) : null
    } catch {
      // Si hay error al parsear, limpiar storage
      localStorage.removeItem('user')
      return null
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token')
  }
  
  // Método para verificar rol - Sistema de routing
  hasRole(role: string): boolean {
    const user = this.getCurrentUser()
    // TODO: Implementar verificación real de roles en Nivel 2
    return user?.role === role
  }
  
  // Método para obtener returnUrl después de login
  getReturnUrl(): string {
    return localStorage.getItem('returnUrl') || '/dashboard'
  }
}

export const authService = new AuthService()