/**
 * Token Service - Sprint 2
 * Siguiendo lineamientos nivel 2: Servicio especializado para gestión de JWT tokens
 * Implementa principio de Responsabilidad Única para manejo seguro de tokens
 */

// Types - Principio de Segregación de Interfaces
interface TokenPayload {
  sub: string;
  email: string;
  companyId: string;
  role: string;
  iat: number;
  exp: number;
  iss?: string;
  aud?: string;
}

interface TokenStorage {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: 'Bearer';
}

/**
 * Servicio para gestión de JWT tokens
 * Siguiendo principios SOLID - Responsabilidad Única para token management
 */
class TokenService {
  private readonly ACCESS_TOKEN_KEY = 'auth_access_token';
  private readonly REFRESH_TOKEN_KEY = 'auth_refresh_token';
  private readonly TOKEN_STORAGE_KEY = 'auth_token_storage';
  
  /**
   * Almacena tokens de forma segura
   * @param {string} accessToken - Token de acceso
   * @param {string} refreshToken - Token de refresco (opcional)
   * @param {number} expiresIn - Tiempo de vida en segundos
   */
  storeTokens(
    accessToken: string, 
    refreshToken?: string, 
    expiresIn: number = 3600
  ): void {
    try {
      const storage: TokenStorage = {
        accessToken,
        refreshToken,
        expiresAt: Date.now() + (expiresIn * 1000),
        tokenType: 'Bearer'
      };

      // Almacenar en localStorage de forma segura
      localStorage.setItem(this.TOKEN_STORAGE_KEY, JSON.stringify(storage));
      
      // Mantener compatibilidad con sistema actual
      localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      
      if (refreshToken) {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
      }

      // Verificar que realmente se guardó
      const savedToken = localStorage.getItem(this.ACCESS_TOKEN_KEY);
      console.log('[TokenService] Token guardado:', {
        key: this.ACCESS_TOKEN_KEY,
        tokenSaved: !!savedToken,
        tokenLength: savedToken?.length,
        firstChars: savedToken?.substring(0, 20)
      });

      if (import.meta.env.DEV) {
        console.log('[TokenService] Tokens almacenados exitosamente');
      }
    } catch (error) {
      console.error('[TokenService] Error almacenando tokens:', error);
      throw new Error('Failed to store tokens securely');
    }
  }

  /**
   * Obtiene el token de acceso actual
   * @returns {string | null} Token de acceso o null si no existe
   */
  getAccessToken(): string | null {
    try {
      const storage = this.getTokenStorage();
      return storage?.accessToken || localStorage.getItem(this.ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('[TokenService] Error obteniendo access token:', error);
      return null;
    }
  }

  /**
   * Obtiene el token de refresco
   * @returns {string | null} Token de refresco o null si no existe
   */
  getRefreshToken(): string | null {
    try {
      const storage = this.getTokenStorage();
      return storage?.refreshToken || localStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('[TokenService] Error obteniendo refresh token:', error);
      return null;
    }
  }

  /**
   * Verifica si el token es válido y no está expirado
   * @returns {boolean} True si el token es válido
   */
  isTokenValid(): boolean {
    try {
      const storage = this.getTokenStorage();
      if (!storage || !storage.accessToken) {
        return false;
      }

      // Verificar expiración con buffer de 30 segundos
      const bufferTime = 30 * 1000;
      const isExpired = Date.now() >= (storage.expiresAt - bufferTime);
      
      return !isExpired;
    } catch (error) {
      console.error('[TokenService] Error validando token:', error);
      return false;
    }
  }

  /**
   * Verifica si el token expirará pronto (en los próximos 5 minutos)
   * @returns {boolean} True si el token expira pronto
   */
  isTokenExpiringSoon(): boolean {
    try {
      const storage = this.getTokenStorage();
      if (!storage) return false;

      const fiveMinutes = 5 * 60 * 1000;
      return Date.now() >= (storage.expiresAt - fiveMinutes);
    } catch (error) {
      console.error('[TokenService] Error verificando expiración próxima:', error);
      return false;
    }
  }

  /**
   * Decodifica el payload del JWT sin validación (solo para lectura)
   * NOTA: Nunca confiar en datos del cliente sin validación del servidor
   * @param {string} token - Token a decodificar
   * @returns {TokenPayload | null} Payload decodificado o null si falla
   */
  decodeToken(token?: string): TokenPayload | null {
    try {
      const tokenToUse = token || this.getAccessToken();
      if (!tokenToUse) return null;

      // Separar el JWT (header.payload.signature)
      const parts = tokenToUse.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      // Decodificar payload (base64url)
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      
      return payload as TokenPayload;
    } catch (error) {
      console.error('[TokenService] Error decodificando token:', error);
      return null;
    }
  }

  /**
   * Obtiene información del usuario desde el token
   * @returns {Object | null} Información del usuario o null
   */
  getUserFromToken(): { id: string; email: string; role: string; companyId: string } | null {
    try {
      const payload = this.decodeToken();
      if (!payload) return null;

      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        companyId: payload.companyId
      };
    } catch (error) {
      console.error('[TokenService] Error obteniendo usuario del token:', error);
      return null;
    }
  }

  /**
   * Limpia todos los tokens almacenados
   */
  clearTokens(): void {
    try {
      localStorage.removeItem(this.TOKEN_STORAGE_KEY);
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      
      // Limpiar otros datos relacionados con auth
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('company_id');
      
      if (import.meta.env.DEV) {
        console.log('[TokenService] Tokens limpiados');
      }
    } catch (error) {
      console.error('[TokenService] Error limpiando tokens:', error);
    }
  }

  /**
   * Genera headers de autorización para requests
   * @returns {Record<string, string>} Headers de autorización
   */
  getAuthHeaders(): Record<string, string> {
    const token = this.getAccessToken();
    if (!token) return {};

    return {
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Verifica si hay un refresh token disponible
   * @returns {boolean} True si hay refresh token
   */
  hasRefreshToken(): boolean {
    return !!this.getRefreshToken();
  }

  /**
   * Obtiene el tiempo restante hasta la expiración en segundos
   * @returns {number} Segundos hasta expiración (0 si ya expiró)
   */
  getTimeToExpiry(): number {
    try {
      const storage = this.getTokenStorage();
      if (!storage) return 0;

      const timeRemaining = Math.max(0, Math.floor((storage.expiresAt - Date.now()) / 1000));
      return timeRemaining;
    } catch (error) {
      console.error('[TokenService] Error calculando tiempo de expiración:', error);
      return 0;
    }
  }

  /**
   * Método privado para obtener el storage completo de tokens
   * @returns {TokenStorage | null} Storage de tokens o null
   */
  private getTokenStorage(): TokenStorage | null {
    try {
      const storageData = localStorage.getItem(this.TOKEN_STORAGE_KEY);
      if (!storageData) return null;

      return JSON.parse(storageData) as TokenStorage;
    } catch (error) {
      console.error('[TokenService] Error parseando token storage:', error);
      return null;
    }
  }

  /**
   * Método para debug - solo desarrollo
   * @returns {Object} Estado actual del token service
   */
  getDebugInfo(): Record<string, any> {
    if (!import.meta.env.DEV) {
      return { error: 'Debug info only available in development' };
    }

    const storage = this.getTokenStorage();
    const payload = this.decodeToken();

    return {
      hasAccessToken: !!this.getAccessToken(),
      hasRefreshToken: !!this.getRefreshToken(),
      isValid: this.isTokenValid(),
      isExpiringSoon: this.isTokenExpiringSoon(),
      timeToExpiry: this.getTimeToExpiry(),
      tokenPayload: payload ? {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        exp: new Date(payload.exp * 1000).toISOString()
      } : null,
      storage: storage ? {
        tokenType: storage.tokenType,
        expiresAt: new Date(storage.expiresAt).toISOString()
      } : null
    };
  }
}

// Instancia singleton del servicio
export const tokenService = new TokenService();

// Exports adicionales para testing y typing
export type { TokenPayload, TokenStorage };
export default tokenService;