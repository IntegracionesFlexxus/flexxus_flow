/**
 * Auth Service - Sprint 2
 * Siguiendo lineamientos nivel 2: Servicio de autenticación con arquitectura SOLID
 * Implementa patrón Adapter para comunicación con backend y manejo de errores
 */

import { api } from '@/shared/services/api';
import { tokenService } from '@/shared/services/tokenService';

// Types - Principio de Segregación de Interfaces
interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    companies: Company[];
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  };
  message?: string;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyName?: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  timezone?: string;
  language?: string;
  companies?: UserCompany[];
  createdAt: string;
  lastLoginAt?: string;
}

interface UserCompany {
  id: string;
  name: string;
  plan: string;
  role: string;
  permissions: string[];
}

interface Company {
  id: string;
  name: string;
  plan: string;
  features: Record<string, boolean>;
  settings?: Record<string, any>;
}

interface ValidationResponse {
  success: boolean;
  data: {
    user: User;
    companies: Company[];
    isValid: boolean;
  };
}

interface RefreshTokenResponse {
  success: boolean;
  data: {
    accessToken: string;
    expiresIn: number;
  };
}

interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Servicio principal para autenticación
 * Siguiendo principios SOLID - Responsabilidad Única para auth operations
 */
class AuthService {
  private readonly baseEndpoint = '/auth';

  /**
   * Autentica usuario con credenciales
   * @param {LoginCredentials} credentials - Credenciales de login
   * @returns {Promise<LoginResponse>} Respuesta de autenticación
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // Validar entrada
      this.validateLoginCredentials(credentials);

      const response = await api.post(`${this.baseEndpoint}/login`, {
        email: credentials.email.toLowerCase().trim(),
        password: credentials.password,
        rememberMe: credentials.rememberMe || false,
        clientInfo: this.getClientInfo()
      });

      const loginData = response.data as LoginResponse;

      // Validar respuesta del servidor
      if (!loginData.success || !loginData.data) {
        throw new Error(loginData.message || 'Invalid login response');
      }

      // Almacenar tokens de forma segura
      tokenService.storeTokens(
        loginData.data.accessToken,
        loginData.data.refreshToken,
        loginData.data.expiresIn
      );

      // Almacenar información adicional para el apiClient
      localStorage.setItem('user_id', loginData.data.user.id);
      if (loginData.data.companies[0]) {
        localStorage.setItem('company_id', loginData.data.companies[0].id);
      }

      return loginData;
    } catch (error: any) {
      console.error('[AuthService] Login error:', error);
      throw this.handleError(error, 'login');
    }
  }

  /**
   * Registra un nuevo usuario
   * @param {RegisterData} registerData - Datos de registro
   * @returns {Promise<LoginResponse>} Respuesta de registro (auto-login)
   */
  async register(registerData: RegisterData): Promise<LoginResponse> {
    try {
      // Validar entrada
      this.validateRegisterData(registerData);

      const response = await api.post(`${this.baseEndpoint}/register`, {
        ...registerData,
        email: registerData.email.toLowerCase().trim(),
        clientInfo: this.getClientInfo()
      });

      const registrationData = response.data as LoginResponse;

      // Si el registro incluye auto-login, almacenar tokens
      if (registrationData.success && registrationData.data.accessToken) {
        tokenService.storeTokens(
          registrationData.data.accessToken,
          registrationData.data.refreshToken,
          registrationData.data.expiresIn
        );

        localStorage.setItem('user_id', registrationData.data.user.id);
        if (registrationData.data.companies[0]) {
          localStorage.setItem('company_id', registrationData.data.companies[0].id);
        }
      }

      return registrationData;
    } catch (error: any) {
      console.error('[AuthService] Registration error:', error);
      throw this.handleError(error, 'registration');
    }
  }

  /**
   * Valida token almacenado con el servidor
   * @param {string} token - Token a validar
   * @returns {Promise<ValidationResponse>} Respuesta de validación
   */
  async validateToken(token?: string): Promise<ValidationResponse> {
    try {
      const tokenToValidate = token || tokenService.getAccessToken();
      
      if (!tokenToValidate) {
        throw new Error('No token available for validation');
      }

      const response = await api.post(
        `${this.baseEndpoint}/validate`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${tokenToValidate}`,
            'X-Validation-Request': 'true'
          }
        }
      );

      return response.data as ValidationResponse;
    } catch (error: any) {
      console.error('[AuthService] Token validation error:', error);
      throw this.handleError(error, 'token validation');
    }
  }

  /**
   * Refresca el token de acceso usando refresh token
   * @returns {Promise<RefreshTokenResponse>} Nuevo token de acceso
   */
  async refreshAccessToken(): Promise<RefreshTokenResponse> {
    try {
      const refreshToken = tokenService.getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post(`${this.baseEndpoint}/refresh`, {
        refreshToken
      });

      const refreshData = response.data as RefreshTokenResponse;

      // Almacenar nuevo access token
      if (refreshData.success && refreshData.data.accessToken) {
        tokenService.storeTokens(
          refreshData.data.accessToken,
          refreshToken, // Mantener el mismo refresh token
          refreshData.data.expiresIn
        );
      }

      return refreshData;
    } catch (error: any) {
      console.error('[AuthService] Token refresh error:', error);
      // Si falla el refresh, limpiar tokens
      tokenService.clearTokens();
      throw this.handleError(error, 'token refresh');
    }
  }

  /**
   * Cierra sesión del usuario
   * @returns {Promise<void>}
   */
  async logout(): Promise<void> {
    try {
      const token = tokenService.getAccessToken();
      
      // Intentar logout en servidor (fire and forget)
      if (token) {
        try {
          await api.post(
            `${this.baseEndpoint}/logout`,
            {},
            {
              timeout: 5000, // Timeout corto para no bloquear logout
              headers: tokenService.getAuthHeaders()
            }
          );
        } catch (error) {
          // Ignorar errores de logout en servidor para no bloquear logout local
          console.warn('[AuthService] Server logout failed (ignored):', error);
        }
      }

      // Limpiar tokens y datos locales
      tokenService.clearTokens();
      localStorage.removeItem('user_id');
      localStorage.removeItem('company_id');
      localStorage.removeItem('auth-store');

      console.log('[AuthService] Logout completed');
    } catch (error: any) {
      console.error('[AuthService] Logout error:', error);
      // Forzar limpieza local aunque falle el servidor
      tokenService.clearTokens();
      throw this.handleError(error, 'logout');
    }
  }

  /**
   * Solicita reseteo de contraseña
   * @param {ForgotPasswordRequest} request - Email para reset
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async forgotPassword(request: ForgotPasswordRequest): Promise<{success: boolean, message: string}> {
    try {
      const response = await api.post(`${this.baseEndpoint}/forgot-password`, {
        email: request.email.toLowerCase().trim()
      });

      return response.data;
    } catch (error: any) {
      console.error('[AuthService] Forgot password error:', error);
      throw this.handleError(error, 'forgot password');
    }
  }

  /**
   * Resetea contraseña con token
   * @param {ResetPasswordRequest} request - Datos de reset
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async resetPassword(request: ResetPasswordRequest): Promise<{success: boolean, message: string}> {
    try {
      // Validar contraseñas coinciden
      if (request.newPassword !== request.confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      const response = await api.post(`${this.baseEndpoint}/reset-password`, {
        token: request.token,
        newPassword: request.newPassword
      });

      return response.data;
    } catch (error: any) {
      console.error('[AuthService] Reset password error:', error);
      throw this.handleError(error, 'reset password');
    }
  }

  /**
   * Cambia contraseña del usuario autenticado
   * @param {ChangePasswordRequest} request - Datos de cambio de contraseña
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async changePassword(request: ChangePasswordRequest): Promise<{success: boolean, message: string}> {
    try {
      // Validar contraseñas coinciden
      if (request.newPassword !== request.confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      const response = await api.post(
        `${this.baseEndpoint}/change-password`,
        {
          currentPassword: request.currentPassword,
          newPassword: request.newPassword
        },
        {
          headers: tokenService.getAuthHeaders()
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('[AuthService] Change password error:', error);
      throw this.handleError(error, 'change password');
    }
  }

  /**
   * Actualiza perfil del usuario
   * @param {Partial<User>} userData - Datos a actualizar
   * @returns {Promise<{success: boolean, user: User}>}
   */
  async updateProfile(userData: Partial<User>): Promise<{success: boolean, user: User}> {
    try {
      const response = await api.put(
        `${this.baseEndpoint}/profile`,
        userData,
        {
          headers: tokenService.getAuthHeaders()
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('[AuthService] Update profile error:', error);
      throw this.handleError(error, 'update profile');
    }
  }

  /**
   * Obtiene perfil actual del usuario
   * @returns {Promise<{success: boolean, user: User}>}
   */
  async getProfile(): Promise<{success: boolean, user: User}> {
    try {
      const response = await api.get(
        `${this.baseEndpoint}/profile`,
        {
          headers: tokenService.getAuthHeaders()
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('[AuthService] Get profile error:', error);
      throw this.handleError(error, 'get profile');
    }
  }

  /**
   * Verifica si existe auto-refresh activo
   * @returns {boolean} True si hay token válido para refresh
   */
  canAutoRefresh(): boolean {
    return tokenService.hasRefreshToken() && tokenService.isTokenExpiringSoon();
  }

  /**
   * Valida credenciales de login
   * @private
   */
  private validateLoginCredentials(credentials: LoginCredentials): void {
    if (!credentials.email || !credentials.password) {
      throw new Error('Email y contraseña son requeridos');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credentials.email)) {
      throw new Error('Email inválido');
    }

    if (credentials.password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }
  }

  /**
   * Valida datos de registro
   * @private
   */
  private validateRegisterData(data: RegisterData): void {
    if (!data.firstName || !data.lastName || !data.email || !data.password) {
      throw new Error('Todos los campos son requeridos');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('Email inválido');
    }

    if (data.password.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres');
    }
  }

  /**
   * Obtiene información del cliente para requests
   * @private
   */
  private getClientInfo(): Record<string, any> {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  /**
   * Maneja errores de forma consistente
   * @private
   */
  private handleError(error: any, operation: string): Error {
    let errorMessage = `Error en ${operation}`;
    
    if (error.response) {
      // Error de respuesta HTTP
      const data = error.response.data;
      errorMessage = data?.message || `HTTP ${error.response.status} error en ${operation}`;
    } else if (error.request) {
      // Error de red
      errorMessage = `Error de conexión en ${operation}`;
    } else if (error.message) {
      // Error personalizado
      errorMessage = error.message;
    }

    return new Error(errorMessage);
  }
}

// Instancia singleton del servicio
export const authService = new AuthService();

// Exports adicionales para typing
export type {
  LoginCredentials,
  LoginResponse,
  RegisterData,
  User,
  UserCompany,
  Company,
  ValidationResponse,
  RefreshTokenResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest
};

export default authService;