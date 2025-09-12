/**
 * Profile Service - Sprint 2
 * Siguiendo lineamientos nivel 2: Servicio especializado para gestión de perfil de usuario
 * Implementa patrón Adapter para comunicación con backend y manejo de uploads
 */

import { api } from '@/shared/services/api';
import { tokenService } from '@/shared/services/tokenService';

// Types - Principio de Segregación de Interfaces
interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  timezone: string;
  language: string;
  bio?: string;
  department?: string;
  position?: string;
}

interface AvatarUploadResponse {
  success: boolean;
  data: {
    avatarUrl: string;
    thumbnailUrl?: string;
  };
  message?: string;
}

interface ProfileUpdateResponse {
  success: boolean;
  data: {
    user: UserProfile;
    updatedAt: string;
  };
  message?: string;
}

interface UserProfile extends ProfileData {
  id: string;
  avatar?: string;
  avatarThumbnail?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  emailVerified: boolean;
  phoneVerified?: boolean;
  twoFactorEnabled?: boolean;
}

interface NotificationPreferences {
  email: {
    marketing: boolean;
    updates: boolean;
    security: boolean;
    reports: boolean;
  };
  push: {
    enabled: boolean;
    sound: boolean;
    vibrate: boolean;
  };
  sms?: {
    enabled: boolean;
    security: boolean;
  };
}

interface PreferencesUpdateResponse {
  success: boolean;
  data: {
    preferences: UserPreferences;
    updatedAt: string;
  };
  message?: string;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  notifications: NotificationPreferences;
  accessibility?: {
    highContrast: boolean;
    fontSize: 'small' | 'medium' | 'large';
    reducedMotion: boolean;
  };
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod?: 'app' | 'sms' | 'email';
  passwordLastChanged: string;
  activeSessions: number;
  trustedDevices: TrustedDevice[];
}

interface TrustedDevice {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  lastUsed: string;
  location?: string;
}

interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  logoutOtherDevices?: boolean;
}

interface DeleteAccountRequest {
  password: string;
  reason?: string;
  feedback?: string;
}

/**
 * Servicio principal para gestión de perfil de usuario
 * Siguiendo principios SOLID - Responsabilidad Única para operaciones de perfil
 */
class ProfileService {
  private readonly baseEndpoint = '/profile';
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  /**
   * Obtiene el perfil completo del usuario
   * @returns {Promise<UserProfile>} Perfil del usuario
   */
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await api.get(
        `${this.baseEndpoint}`,
        {
          headers: tokenService.getAuthHeaders()
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get profile');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('[ProfileService] Get profile error:', error);
      throw this.handleError(error, 'getting profile');
    }
  }

  /**
   * Actualiza el perfil del usuario
   * @param {ProfileData} profileData - Datos del perfil a actualizar
   * @returns {Promise<ProfileUpdateResponse>} Respuesta de actualización
   */
  async updateProfile(profileData: Partial<ProfileData>): Promise<ProfileUpdateResponse> {
    try {
      // Validar datos
      this.validateProfileData(profileData);

      const response = await api.put(
        `${this.baseEndpoint}`,
        profileData,
        {
          headers: tokenService.getAuthHeaders()
        }
      );

      return response.data as ProfileUpdateResponse;
    } catch (error: any) {
      console.error('[ProfileService] Update profile error:', error);
      throw this.handleError(error, 'updating profile');
    }
  }

  /**
   * Sube un nuevo avatar del usuario
   * @param {File} file - Archivo de imagen
   * @returns {Promise<AvatarUploadResponse>} URL del avatar subido
   */
  async uploadAvatar(file: File): Promise<AvatarUploadResponse> {
    try {
      // Validar archivo
      this.validateImageFile(file);

      // Crear FormData
      const formData = new FormData();
      formData.append('avatar', file);

      // Optimizar imagen si es necesario
      const optimizedFile = await this.optimizeImage(file);
      if (optimizedFile) {
        formData.set('avatar', optimizedFile, file.name);
      }

      const response = await api.post(
        `${this.baseEndpoint}/avatar`,
        formData,
        {
          headers: {
            ...tokenService.getAuthHeaders(),
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data as AvatarUploadResponse;
    } catch (error: any) {
      console.error('[ProfileService] Upload avatar error:', error);
      throw this.handleError(error, 'uploading avatar');
    }
  }

  /**
   * Elimina el avatar del usuario
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async deleteAvatar(): Promise<{success: boolean, message?: string}> {
    try {
      const response = await api.delete(
        `${this.baseEndpoint}/avatar`,
        {
          headers: tokenService.getAuthHeaders()
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('[ProfileService] Delete avatar error:', error);
      throw this.handleError(error, 'deleting avatar');
    }
  }

  /**
   * Obtiene las preferencias del usuario
   * @returns {Promise<UserPreferences>} Preferencias del usuario
   */
  async getPreferences(): Promise<UserPreferences> {
    try {
      const response = await api.get(
        `${this.baseEndpoint}/preferences`,
        {
          headers: tokenService.getAuthHeaders()
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get preferences');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('[ProfileService] Get preferences error:', error);
      throw this.handleError(error, 'getting preferences');
    }
  }

  /**
   * Actualiza las preferencias del usuario
   * @param {Partial<UserPreferences>} preferences - Preferencias a actualizar
   * @returns {Promise<PreferencesUpdateResponse>} Respuesta de actualización
   */
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<PreferencesUpdateResponse> {
    try {
      const response = await api.put(
        `${this.baseEndpoint}/preferences`,
        preferences,
        {
          headers: tokenService.getAuthHeaders()
        }
      );

      return response.data as PreferencesUpdateResponse;
    } catch (error: any) {
      console.error('[ProfileService] Update preferences error:', error);
      throw this.handleError(error, 'updating preferences');
    }
  }

  /**
   * Obtiene la configuración de seguridad
   * @returns {Promise<SecuritySettings>} Configuración de seguridad
   */
  async getSecuritySettings(): Promise<SecuritySettings> {
    try {
      const response = await api.get(
        `${this.baseEndpoint}/security`,
        {
          headers: tokenService.getAuthHeaders()
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get security settings');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('[ProfileService] Get security settings error:', error);
      throw this.handleError(error, 'getting security settings');
    }
  }

  /**
   * Habilita/deshabilita autenticación de dos factores
   * @param {boolean} enabled - Habilitar o deshabilitar
   * @param {string} method - Método de 2FA
   * @returns {Promise<{success: boolean, qrCode?: string, backupCodes?: string[]}>}
   */
  async toggleTwoFactorAuth(
    enabled: boolean, 
    method: 'app' | 'sms' | 'email' = 'app'
  ): Promise<{success: boolean, qrCode?: string, backupCodes?: string[]}> {
    try {
      const response = await api.post(
        `${this.baseEndpoint}/security/2fa`,
        { enabled, method },
        {
          headers: tokenService.getAuthHeaders()
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('[ProfileService] Toggle 2FA error:', error);
      throw this.handleError(error, 'toggling two-factor authentication');
    }
  }

  /**
   * Cambia la contraseña del usuario
   * @param {PasswordChangeRequest} request - Datos de cambio de contraseña
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async changePassword(request: PasswordChangeRequest): Promise<{success: boolean, message?: string}> {
    try {
      // Validar contraseñas
      if (request.newPassword !== request.confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      if (request.newPassword.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres');
      }

      const response = await api.post(
        `${this.baseEndpoint}/security/change-password`,
        {
          currentPassword: request.currentPassword,
          newPassword: request.newPassword,
          logoutOtherDevices: request.logoutOtherDevices || false
        },
        {
          headers: tokenService.getAuthHeaders()
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('[ProfileService] Change password error:', error);
      throw this.handleError(error, 'changing password');
    }
  }

  /**
   * Revoca acceso de un dispositivo confiable
   * @param {string} deviceId - ID del dispositivo
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async revokeDevice(deviceId: string): Promise<{success: boolean, message?: string}> {
    try {
      const response = await api.delete(
        `${this.baseEndpoint}/security/devices/${deviceId}`,
        {
          headers: tokenService.getAuthHeaders()
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('[ProfileService] Revoke device error:', error);
      throw this.handleError(error, 'revoking device access');
    }
  }

  /**
   * Cierra todas las sesiones excepto la actual
   * @returns {Promise<{success: boolean, sessionsTerminated: number}>}
   */
  async terminateAllSessions(): Promise<{success: boolean, sessionsTerminated: number}> {
    try {
      const response = await api.post(
        `${this.baseEndpoint}/security/terminate-sessions`,
        {},
        {
          headers: tokenService.getAuthHeaders()
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('[ProfileService] Terminate sessions error:', error);
      throw this.handleError(error, 'terminating sessions');
    }
  }

  /**
   * Exporta los datos del usuario (GDPR compliance)
   * @returns {Promise<Blob>} Archivo con datos del usuario
   */
  async exportUserData(): Promise<Blob> {
    try {
      const response = await api.get(
        `${this.baseEndpoint}/export`,
        {
          headers: tokenService.getAuthHeaders(),
          responseType: 'blob'
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('[ProfileService] Export data error:', error);
      throw this.handleError(error, 'exporting user data');
    }
  }

  /**
   * Elimina la cuenta del usuario
   * @param {DeleteAccountRequest} request - Datos de eliminación
   * @returns {Promise<{success: boolean, scheduledDeletion: string}>}
   */
  async deleteAccount(request: DeleteAccountRequest): Promise<{success: boolean, scheduledDeletion: string}> {
    try {
      const response = await api.delete(
        `${this.baseEndpoint}/account`,
        {
          headers: tokenService.getAuthHeaders(),
          data: request
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('[ProfileService] Delete account error:', error);
      throw this.handleError(error, 'deleting account');
    }
  }

  /**
   * Valida los datos del perfil
   * @private
   */
  private validateProfileData(data: Partial<ProfileData>): void {
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new Error('Email inválido');
      }
    }

    if (data.firstName && data.firstName.length < 2) {
      throw new Error('El nombre debe tener al menos 2 caracteres');
    }

    if (data.lastName && data.lastName.length < 2) {
      throw new Error('El apellido debe tener al menos 2 caracteres');
    }

    if (data.phone) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(data.phone.replace(/\s/g, ''))) {
        throw new Error('Número de teléfono inválido');
      }
    }
  }

  /**
   * Valida archivo de imagen
   * @private
   */
  private validateImageFile(file: File): void {
    if (!file) {
      throw new Error('No se seleccionó ningún archivo');
    }

    if (file.size > this.maxFileSize) {
      throw new Error(`La imagen debe ser menor a ${this.maxFileSize / 1024 / 1024}MB`);
    }

    if (!this.allowedImageTypes.includes(file.type)) {
      throw new Error('Formato de imagen no permitido. Usa JPG, PNG, WebP o GIF');
    }
  }

  /**
   * Optimiza imagen antes de subir
   * @private
   */
  private async optimizeImage(file: File): Promise<File | null> {
    // Si la imagen ya es pequeña, no optimizar
    if (file.size < 100 * 1024) {
      return null;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }

          // Calcular nuevo tamaño manteniendo aspect ratio
          const maxWidth = 800;
          const maxHeight = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Convertir a blob
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              resolve(null);
            }
          }, 'image/jpeg', 0.9);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Maneja errores de forma consistente
   * @private
   */
  private handleError(error: any, operation: string): Error {
    let errorMessage = `Error ${operation}`;
    
    if (error.response) {
      const data = error.response.data;
      errorMessage = data?.message || `HTTP ${error.response.status} error ${operation}`;
    } else if (error.request) {
      errorMessage = `Network error ${operation}`;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return new Error(errorMessage);
  }
}

// Instancia singleton del servicio
export const profileService = new ProfileService();

// Exports adicionales para typing
export type {
  ProfileData,
  UserProfile,
  UserPreferences,
  NotificationPreferences,
  SecuritySettings,
  TrustedDevice,
  PasswordChangeRequest,
  DeleteAccountRequest,
  AvatarUploadResponse,
  ProfileUpdateResponse,
  PreferencesUpdateResponse
};

export default profileService;