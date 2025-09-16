import { apiService, ApiResponse } from './api'

// Servicio API de autenticación - MVP con endpoints básicos
// TODO: En Nivel 2 agregar OAuth, 2FA, biometría

// Interfaces para requests y responses
export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  companyName?: string
  phone?: string
  acceptTerms: boolean
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  role?: string
  emailVerified?: boolean
  phoneVerified?: boolean
}

export interface Company {
  id: string
  name: string
  plan: string
  features: Record<string, boolean>
  logo?: string
  usersCount?: number
  usersLimit?: number
}

export interface AuthResponse {
  user: User
  token: string
  refreshToken?: string
  companies: Company[]
  expiresIn?: number
}

export interface ResetPasswordRequest {
  token: string
  password: string
  passwordConfirmation: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  newPasswordConfirmation: string
}

export interface VerifyEmailRequest {
  token: string
  email?: string
}

// Servicio de autenticación
class AuthApiService {
  private baseUrl = '/auth'
  
  // Login de usuario
  async login(data: LoginRequest): Promise<AuthResponse> {
    // TODO: En producción, conectar con API real
    // Por ahora simulamos con mock data
    if (import.meta.env.DEV) {
      // Mock para desarrollo
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (data.email === 'admin@test.com' && data.password === 'admin123') {
        const mockResponse: AuthResponse = {
          user: {
            id: '1',
            email: data.email,
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            emailVerified: true
          },
          token: 'mock-jwt-token-' + Date.now(),
          companies: [
            {
              id: '1',
              name: 'Empresa Demo SA',
              plan: 'premium',
              features: {
                omni: true,
                crm: true,
                workflow: true,
                analytics: true
              },
              usersCount: 5,
              usersLimit: 10
            }
          ],
          expiresIn: 3600
        }
        return mockResponse
      } else {
        throw new Error('Credenciales inválidas')
      }
    }
    
    const response = await apiService.post<ApiResponse<AuthResponse>>(
      `${this.baseUrl}/login`,
      data
    )
    return response.data
  }
  
  // Registro de nuevo usuario
  async register(data: RegisterRequest): Promise<AuthResponse> {
    // TODO: Conectar con API real
    if (import.meta.env.DEV) {
      // Mock para desarrollo
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const mockResponse: AuthResponse = {
        user: {
          id: Date.now().toString(),
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'user',
          emailVerified: false
        },
        token: 'mock-jwt-token-' + Date.now(),
        companies: [
          {
            id: Date.now().toString(),
            name: data.companyName || 'Mi Empresa',
            plan: 'trial',
            features: {
              omni: true,
              crm: true,
              workflow: false,
              analytics: false
            },
            usersCount: 1,
            usersLimit: 3
          }
        ],
        expiresIn: 3600
      }
      return mockResponse
    }
    
    const response = await apiService.post<ApiResponse<AuthResponse>>(
      `${this.baseUrl}/register`,
      data
    )
    return response.data
  }
  
  // Cerrar sesión
  async logout(): Promise<void> {
    try {
      await apiService.post(`${this.baseUrl}/logout`)
    } catch (error) {
      // Ignorar errores de logout
      console.error('Logout error:', error)
    }
  }
  
  // Refrescar token
  async refreshToken(refreshToken?: string): Promise<{ token: string; expiresIn: number }> {
    const response = await apiService.post<ApiResponse<{ token: string; expiresIn: number }>>(
      `${this.baseUrl}/refresh`,
      { refreshToken }
    )
    return response.data
  }
  
  // Solicitar restablecimiento de contraseña
  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await apiService.post<ApiResponse<{ message: string }>>(
      `${this.baseUrl}/forgot-password`,
      { email }
    )
    return response.data
  }
  
  // Restablecer contraseña con token
  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    const response = await apiService.post<ApiResponse<{ message: string }>>(
      `${this.baseUrl}/reset-password`,
      data
    )
    return response.data
  }
  
  // Cambiar contraseña (usuario autenticado)
  async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    const response = await apiService.post<ApiResponse<{ message: string }>>(
      `${this.baseUrl}/change-password`,
      data
    )
    return response.data
  }
  
  // Verificar email
  async verifyEmail(data: VerifyEmailRequest): Promise<{ message: string }> {
    const response = await apiService.post<ApiResponse<{ message: string }>>(
      `${this.baseUrl}/verify-email`,
      data
    )
    return response.data
  }
  
  // Reenviar email de verificación
  async resendVerificationEmail(email?: string): Promise<{ message: string }> {
    const response = await apiService.post<ApiResponse<{ message: string }>>(
      `${this.baseUrl}/resend-verification`,
      { email }
    )
    return response.data
  }
  
  // Obtener perfil del usuario actual
  async getProfile(): Promise<User> {
    const response = await apiService.get<ApiResponse<User>>(`${this.baseUrl}/profile`)
    return response.data
  }
  
  // Actualizar perfil del usuario
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await apiService.patch<ApiResponse<User>>(
      `${this.baseUrl}/profile`,
      data
    )
    return response.data
  }
  
  // Subir avatar
  async uploadAvatar(file: File, onProgress?: (progress: number) => void): Promise<{ avatarUrl: string }> {
    const formData = new FormData()
    formData.append('avatar', file)
    
    const response = await apiService.upload<ApiResponse<{ avatarUrl: string }>>(
      `${this.baseUrl}/avatar`,
      formData,
      onProgress
    )
    return response.data
  }
  
  // Eliminar cuenta
  async deleteAccount(password: string): Promise<{ message: string }> {
    const response = await apiService.delete<ApiResponse<{ message: string }>>(
      `${this.baseUrl}/account`,
      {
        data: { password }
      }
    )
    return response.data
  }
  
  // Validar token (para rutas protegidas)
  async validateToken(): Promise<boolean> {
    try {
      await apiService.get(`${this.baseUrl}/validate`)
      return true
    } catch {
      return false
    }
  }
}

// Exportar instancia única
export const authApi = new AuthApiService()

// TODO: En Nivel 2 agregar:
// - Login con OAuth (Google, Facebook, etc)
// - Autenticación de dos factores (2FA)
// - Biometría (huella, Face ID)
// - Single Sign-On (SSO)
// - Magic links
// - Session management
// - Device management