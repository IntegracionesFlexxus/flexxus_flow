/**
 * Company Service - Sprint 3
 * Servicio para gestión de configuración de empresa
 * Implementación con patrón Singleton y principios SOLID
 */

import { api } from '@/shared/services/api';
import type {
  Company,
  CompanySettingsResponse,
  UpdateCompanyRequest,
  UpdateSecuritySettingsRequest,
  UpdateBrandingRequest,
  UpdateNotificationSettingsRequest,
  SecuritySettings,
  NotificationSettings,
  BrandingSettings,
  FeatureSettings,
  CompanyPreferences
} from '@modules/company/types';

/**
 * CompanyService
 * Patrón Singleton para gestión de configuración empresarial
 * Principio DIP: Depende de la abstracción apiClient
 */
class CompanyService {
  private static instance: CompanyService;
  private readonly baseUrl = '/companies';
  
  private constructor() {}
  
  /**
   * Obtener instancia única del servicio
   */
  public static getInstance(): CompanyService {
    if (!CompanyService.instance) {
      CompanyService.instance = new CompanyService();
    }
    return CompanyService.instance;
  }
  
  // ==================== COMPANY INFORMATION ====================
  
  /**
   * Obtener información completa de la empresa
   */
  async getCompany(companyId: string): Promise<Company> {
    const response = await api.get<{ company: Company }>(
      `${this.baseUrl}/${companyId}`
    );
    return response.data.company;
  }
  
  /**
   * Actualizar información de la empresa
   */
  async updateCompany(
    companyId: string,
    updates: UpdateCompanyRequest
  ): Promise<Company> {
    const response = await api.put<{ company: Company }>(
      `${this.baseUrl}/${companyId}`,
      updates
    );
    return response.data.company;
  }
  
  /**
   * Subir logo de la empresa
   */
  async uploadLogo(
    companyId: string,
    file: File
  ): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('logo', file);
    
    const response = await api.post<{ url: string }>(
      `${this.baseUrl}/${companyId}/logo`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    return response.data;
  }
  
  /**
   * Eliminar logo de la empresa
   */
  async deleteLogo(companyId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${companyId}/logo`);
  }
  
  // ==================== SETTINGS MANAGEMENT ====================
  
  /**
   * Obtener todas las configuraciones de la empresa
   * Clean Code: función pura sin efectos secundarios
   */
  async getCompanySettings(companyId: string): Promise<CompanySettingsResponse> {
    const response = await api.get<CompanySettingsResponse>(
      `${this.baseUrl}/${companyId}/settings`
    );
    return response.data;
  }
  
  /**
   * Actualizar configuraciones de la empresa
   * Patrón Strategy: diferentes tipos de actualización
   */
  async updateCompanySettings(
    companyId: string,
    updates: Partial<CompanySettingsResponse>
  ): Promise<CompanySettingsResponse> {
    const response = await api.put<CompanySettingsResponse>(
      `${this.baseUrl}/${companyId}/settings`,
      updates
    );
    return response.data;
  }
  
  // ==================== SECURITY SETTINGS ====================
  
  /**
   * Obtener configuración de seguridad
   */
  async getSecuritySettings(companyId: string): Promise<SecuritySettings> {
    const response = await api.get<{ security: SecuritySettings }>(
      `${this.baseUrl}/${companyId}/settings/security`
    );
    return response.data.security;
  }
  
  /**
   * Actualizar configuración de seguridad
   */
  async updateSecuritySettings(
    companyId: string,
    updates: UpdateSecuritySettingsRequest
  ): Promise<SecuritySettings> {
    const response = await api.put<{ security: SecuritySettings }>(
      `${this.baseUrl}/${companyId}/settings/security`,
      updates
    );
    return response.data.security;
  }
  
  /**
   * Validar política de contraseña
   */
  async validatePasswordPolicy(
    companyId: string,
    password: string
  ): Promise<{
    valid: boolean;
    errors?: string[];
  }> {
    const response = await api.post(
      `${this.baseUrl}/${companyId}/settings/security/validate-password`,
      { password }
    );
    return response.data;
  }
  
  // ==================== NOTIFICATION SETTINGS ====================
  
  /**
   * Obtener configuración de notificaciones
   */
  async getNotificationSettings(companyId: string): Promise<NotificationSettings> {
    const response = await api.get<{ notifications: NotificationSettings }>(
      `${this.baseUrl}/${companyId}/settings/notifications`
    );
    return response.data.notifications;
  }
  
  /**
   * Actualizar configuración de notificaciones
   */
  async updateNotificationSettings(
    companyId: string,
    updates: UpdateNotificationSettingsRequest
  ): Promise<NotificationSettings> {
    const response = await api.put<{ notifications: NotificationSettings }>(
      `${this.baseUrl}/${companyId}/settings/notifications`,
      updates
    );
    return response.data.notifications;
  }
  
  /**
   * Probar webhook de notificación
   */
  async testWebhook(
    companyId: string,
    webhookId: string
  ): Promise<{
    success: boolean;
    message: string;
    statusCode?: number;
  }> {
    const response = await api.post(
      `${this.baseUrl}/${companyId}/settings/notifications/webhooks/${webhookId}/test`
    );
    return response.data;
  }
  
  // ==================== BRANDING SETTINGS ====================
  
  /**
   * Obtener configuración de branding
   */
  async getBrandingSettings(companyId: string): Promise<BrandingSettings> {
    const response = await api.get<{ branding: BrandingSettings }>(
      `${this.baseUrl}/${companyId}/settings/branding`
    );
    return response.data.branding;
  }
  
  /**
   * Actualizar configuración de branding
   */
  async updateBrandingSettings(
    companyId: string,
    updates: UpdateBrandingRequest
  ): Promise<BrandingSettings> {
    const response = await api.put<{ branding: BrandingSettings }>(
      `${this.baseUrl}/${companyId}/settings/branding`,
      updates
    );
    return response.data.branding;
  }
  
  /**
   * Previsualizar tema de branding
   */
  async previewBranding(
    companyId: string,
    settings: Partial<BrandingSettings>
  ): Promise<{
    previewUrl: string;
    expiresAt: Date;
  }> {
    const response = await api.post(
      `${this.baseUrl}/${companyId}/settings/branding/preview`,
      settings
    );
    return response.data;
  }
  
  /**
   * Resetear branding a valores por defecto
   */
  async resetBranding(companyId: string): Promise<BrandingSettings> {
    const response = await api.post<{ branding: BrandingSettings }>(
      `${this.baseUrl}/${companyId}/settings/branding/reset`
    );
    return response.data.branding;
  }
  
  // ==================== FEATURE SETTINGS ====================
  
  /**
   * Obtener configuración de features
   */
  async getFeatureSettings(companyId: string): Promise<FeatureSettings> {
    const response = await api.get<{ features: FeatureSettings }>(
      `${this.baseUrl}/${companyId}/settings/features`
    );
    return response.data.features;
  }
  
  /**
   * Habilitar/Deshabilitar módulo
   */
  async toggleModule(
    companyId: string,
    moduleId: string,
    enabled: boolean
  ): Promise<void> {
    await api.post(
      `${this.baseUrl}/${companyId}/settings/features/modules/${moduleId}`,
      { enabled }
    );
  }
  
  /**
   * Obtener límites de uso actuales
   */
  async getUsageLimits(companyId: string): Promise<{
    limits: any;
    current: any;
    percentage: any;
  }> {
    const response = await api.get(
      `${this.baseUrl}/${companyId}/settings/features/usage`
    );
    return response.data;
  }
  
  // ==================== PREFERENCES ====================
  
  /**
   * Obtener preferencias de la empresa
   */
  async getPreferences(companyId: string): Promise<CompanyPreferences> {
    const response = await api.get<{ preferences: CompanyPreferences }>(
      `${this.baseUrl}/${companyId}/preferences`
    );
    return response.data.preferences;
  }
  
  /**
   * Actualizar preferencias de la empresa
   */
  async updatePreferences(
    companyId: string,
    preferences: Partial<CompanyPreferences>
  ): Promise<CompanyPreferences> {
    const response = await api.put<{ preferences: CompanyPreferences }>(
      `${this.baseUrl}/${companyId}/preferences`,
      preferences
    );
    return response.data.preferences;
  }
  
  // ==================== AUDIT & COMPLIANCE ====================
  
  /**
   * Obtener log de cambios de configuración
   */
  async getConfigurationAuditLog(
    companyId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      settingType?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    logs: Array<{
      id: string;
      timestamp: Date;
      userId: string;
      userName: string;
      settingType: string;
      changes: any;
      ipAddress?: string;
    }>;
    total: number;
  }> {
    const params = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(
      `${this.baseUrl}/${companyId}/settings/audit?${params.toString()}`
    );
    return response.data;
  }
  
  /**
   * Exportar configuración de la empresa
   */
  async exportSettings(
    companyId: string,
    format: 'json' | 'yaml' = 'json'
  ): Promise<Blob> {
    const response = await api.get(
      `${this.baseUrl}/${companyId}/settings/export?format=${format}`,
      { responseType: 'blob' }
    );
    return response.data;
  }
  
  /**
   * Importar configuración de la empresa
   */
  async importSettings(
    companyId: string,
    file: File,
    options?: {
      merge?: boolean;
      validate?: boolean;
    }
  ): Promise<{
    success: boolean;
    applied: string[];
    skipped: string[];
    errors?: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.merge) formData.append('merge', 'true');
    if (options?.validate) formData.append('validate', 'true');
    
    const response = await api.post(
      `${this.baseUrl}/${companyId}/settings/import`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    return response.data;
  }
  
  // ==================== VALIDATION & HELPERS ====================
  
  /**
   * Validar nombre de empresa único
   */
  async validateCompanyName(name: string): Promise<boolean> {
    const response = await api.get<{ available: boolean }>(
      `${this.baseUrl}/validate-name?name=${encodeURIComponent(name)}`
    );
    return response.data.available;
  }
  
  /**
   * Obtener plantillas de configuración por industria
   */
  async getIndustryTemplates(industry: string): Promise<{
    security?: Partial<SecuritySettings>;
    notifications?: Partial<NotificationSettings>;
    features?: Partial<FeatureSettings>;
  }> {
    const response = await api.get(
      `${this.baseUrl}/templates/industry/${encodeURIComponent(industry)}`
    );
    return response.data;
  }
  
  /**
   * Obtener recomendaciones de seguridad
   */
  async getSecurityRecommendations(companyId: string): Promise<{
    score: number;
    recommendations: Array<{
      priority: 'high' | 'medium' | 'low';
      category: string;
      issue: string;
      recommendation: string;
      impact: string;
    }>;
  }> {
    const response = await api.get(
      `${this.baseUrl}/${companyId}/security/recommendations`
    );
    return response.data;
  }
}

// Exportar instancia única (Patrón Singleton)
export const companyService = CompanyService.getInstance();