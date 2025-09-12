/**
 * Configuration Service - Sprint 2 & 3
 * Siguiendo lineamientos nivel 2: Servicio para gestión de configuraciones
 * Conecta con los servicios backend de configuración avanzada
 */

import { BaseService } from '@/shared/services/BaseService';

// Interfaces para requests
export interface CompanySettingsRequest {
  general: {
    companyName: string;
    companyDescription?: string;
    website?: string;
    industry: string;
    size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
    timezone: string;
    language: string;
    currency: string;
  };
  security: {
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    };
    twoFactorAuth: {
      enabled: boolean;
      required: boolean;
    };
    sessionTimeout: number;
    auditLogging: boolean;
  };
  notifications: {
    emailNotifications: {
      enabled: boolean;
      types: string[];
    };
    pushNotifications: {
      enabled: boolean;
      types: string[];
    };
    webhooks: {
      enabled: boolean;
      urls: string[];
    };
  };
}

export interface AdvancedCompanySettingsRequest {
  businessProcess: {
    workflowConfig: {
      enableCustomWorkflows: boolean;
      maxConcurrentProcesses: number;
      defaultApprovalFlow: 'single' | 'multi' | 'conditional';
      escalationRules: {
        enabled: boolean;
        timeoutHours: number;
        escalationLevels: number;
      };
      automaticAssignment: {
        enabled: boolean;
        strategy: 'round_robin' | 'workload' | 'skill_based' | 'random';
      };
    };
    complianceConfig: {
      dataRetentionDays: number;
      auditLevel: 'basic' | 'detailed' | 'comprehensive';
      requireApprovalFor: string[];
      automaticBackup: boolean;
      complianceReports: boolean;
    };
    qualityAssurance: {
      enableReviews: boolean;
      mandatoryReviews: boolean;
      reviewerAssignment: 'automatic' | 'manual';
      qualityMetrics: boolean;
    };
  };
  integration: {
    apiManagement: {
      enableRateLimit: boolean;
      rateLimitPerHour: number;
      enableApiKeys: boolean;
      logApiCalls: boolean;
    };
    externalServices: {
      enableWebhooks: boolean;
      webhookRetries: number;
      enableSSOIntegration: boolean;
      allowedDomains: string[];
    };
    dataExchange: {
      enableExports: boolean;
      exportFormats: string[];
      enableImports: boolean;
      importValidation: boolean;
    };
  };
  security: {
    accessControl: {
      enableRBAC: boolean;
      sessionManagement: {
        maxConcurrentSessions: number;
        sessionTimeout: number;
        forceLogoutInactive: boolean;
      };
      ipRestrictions: {
        enabled: boolean;
        allowedIPs: string[];
        blockSuspiciousActivity: boolean;
      };
    };
    dataProtection: {
      encryptionLevel: 'standard' | 'high' | 'military';
      enableDataMasking: boolean;
      personalDataHandling: {
        anonymization: boolean;
        rightToBeForgotten: boolean;
        consentManagement: boolean;
      };
    };
  };
  performance: {
    systemLimits: {
      maxUsersPerSession: number;
      maxFileUploadSize: number;
      queryTimeoutSeconds: number;
      cacheRetentionHours: number;
    };
    monitoring: {
      enablePerformanceTracking: boolean;
      alertThresholds: {
        responseTime: number;
        errorRate: number;
        memoryUsage: number;
      };
    };
    optimization: {
      enableCaching: boolean;
      cacheStrategy: 'aggressive' | 'moderate' | 'conservative';
      enableCompression: boolean;
      enableCDN: boolean;
    };
  };
}

export interface AdvancedUserPreferencesRequest {
  personalization: {
    dashboard: {
      layout: 'grid' | 'list' | 'cards' | 'kanban';
      customColors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
      };
      shortcuts: Array<{
        key: string;
        action: string;
        description: string;
      }>;
    };
    workspaceCustomization: {
      favoriteViews: string[];
      quickActions: string[];
      sidebarPreferences: {
        collapsed: boolean;
        width: number;
        pinnedItems: string[];
      };
    };
  };
  integration: {
    externalConnections: {
      calendar: {
        enabled: boolean;
        provider: 'google' | 'outlook' | 'apple';
        syncFrequency: number;
      };
      cloudStorage: {
        enabled: boolean;
        provider: 'gdrive' | 'onedrive' | 'dropbox';
        defaultFolder: string;
      };
    };
    automations: {
      enableSmartSuggestions: boolean;
      autoTagging: boolean;
      smartPrioritization: boolean;
    };
  };
  collaboration: {
    teamSettings: {
      defaultVisibility: 'private' | 'team' | 'organization';
      shareByDefault: boolean;
      allowComments: boolean;
      enableRealTimeCollaboration: boolean;
    };
    communicationStyle: {
      preferredMeetingLength: number;
      availabilityStatus: 'always' | 'business_hours' | 'custom';
      responseTimeExpectation: 'immediate' | 'within_hour' | 'within_day';
    };
  };
  productivity: {
    taskManagement: {
      defaultPriority: 'low' | 'medium' | 'high' | 'urgent';
      autoDeadlineReminders: boolean;
      enableTimeTracking: boolean;
      pomodoroSettings: {
        enabled: boolean;
        workMinutes: number;
        breakMinutes: number;
        longBreakMinutes: number;
        sessionsUntilLongBreak: number;
      };
    };
    analytics: {
      enableProductivityTracking: boolean;
      weeklyReports: boolean;
      goalSetting: boolean;
      timeAnalysis: boolean;
    };
  };
  security: {
    privacy: {
      profileVisibility: 'public' | 'team' | 'private';
      shareActivityStatus: boolean;
      shareWorkingHours: boolean;
      allowDataCollection: boolean;
    };
    security: {
      requireBiometric: boolean;
      enableSecurityAlerts: boolean;
      logSecurityEvents: boolean;
    };
    dataHandling: {
      autoDeleteOldData: boolean;
      dataRetentionDays: number;
      exportFormat: 'json' | 'csv' | 'xml';
      enableDataPortability: boolean;
    };
  };
}

// Interfaces para responses
export interface ConfigurationResponse {
  success: boolean;
  message: string;
  data?: any;
  errors?: any;
}

export interface SystemHealthResponse {
  overall: 'healthy' | 'warning' | 'error';
  services: {
    database: 'healthy' | 'warning' | 'error';
    cache: 'healthy' | 'warning' | 'error';
    api: 'healthy' | 'warning' | 'error';
    storage: 'healthy' | 'warning' | 'error';
  };
  details?: {
    [key: string]: any;
  };
  lastCheck: string;
}

export interface ConfigurationStatsResponse {
  totalSettings: number;
  lastModified: string;
  modifiedBy: string;
  validationStatus: 'valid' | 'warnings' | 'errors';
  cacheStatus: 'active' | 'stale' | 'disabled';
  validationErrors?: string[];
}

export interface ConfigurationSnapshotResponse {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  createdBy: string;
  type: 'full' | 'company' | 'user';
  size: number;
  metadata: {
    version: string;
    compatibilityLevel: number;
    checksum: string;
  };
}

class ConfigurationService extends BaseService {
  private readonly baseUrl = '/configuration';

  // ==================== Configuraciones de Empresa ====================

  /**
   * Obtiene las configuraciones básicas de empresa
   */
  async getCompanySettings(): Promise<ConfigurationResponse> {
    try {
      const response = await this.get(`${this.baseUrl}/company/basic`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Actualiza las configuraciones básicas de empresa
   */
  async updateCompanySettings(settings: CompanySettingsRequest): Promise<ConfigurationResponse> {
    try {
      const response = await this.put(`${this.baseUrl}/company/basic`, settings);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Obtiene las configuraciones avanzadas de empresa
   */
  async getAdvancedCompanySettings(): Promise<ConfigurationResponse> {
    try {
      const response = await this.get(`${this.baseUrl}/company/advanced`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Actualiza las configuraciones avanzadas de empresa
   */
  async updateAdvancedCompanySettings(settings: AdvancedCompanySettingsRequest): Promise<ConfigurationResponse> {
    try {
      const response = await this.put(`${this.baseUrl}/company/advanced`, settings);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ==================== Preferencias de Usuario ====================

  /**
   * Obtiene las preferencias avanzadas del usuario
   */
  async getAdvancedUserPreferences(): Promise<ConfigurationResponse> {
    try {
      const response = await this.get(`${this.baseUrl}/user/advanced`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Actualiza las preferencias avanzadas del usuario
   */
  async updateAdvancedUserPreferences(preferences: AdvancedUserPreferencesRequest): Promise<ConfigurationResponse> {
    try {
      const response = await this.put(`${this.baseUrl}/user/advanced`, preferences);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ==================== Gestión del Sistema ====================

  /**
   * Obtiene el estado de salud del sistema
   */
  async getSystemHealth(): Promise<SystemHealthResponse> {
    try {
      const response = await this.get(`${this.baseUrl}/system/health`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Obtiene estadísticas de configuración
   */
  async getConfigurationStats(): Promise<ConfigurationStatsResponse> {
    try {
      const response = await this.get(`${this.baseUrl}/system/stats`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Valida toda la configuración del sistema
   */
  async validateConfiguration(): Promise<ConfigurationResponse> {
    try {
      const response = await this.post(`${this.baseUrl}/system/validate`, {});
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Limpia el caché de configuración
   */
  async clearCache(): Promise<ConfigurationResponse> {
    try {
      const response = await this.post(`${this.baseUrl}/system/cache/clear`, {});
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ==================== Snapshots y Backups ====================

  /**
   * Obtiene la lista de snapshots disponibles
   */
  async getSnapshots(): Promise<ConfigurationSnapshotResponse[]> {
    try {
      const response = await this.get(`${this.baseUrl}/snapshots`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Crea un nuevo snapshot de configuración
   */
  async createSnapshot(name: string, description: string, type: 'full' | 'company' | 'user' = 'full'): Promise<ConfigurationResponse> {
    try {
      const response = await this.post(`${this.baseUrl}/snapshots`, {
        name,
        description,
        type
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Restaura un snapshot de configuración
   */
  async restoreSnapshot(snapshotId: string): Promise<ConfigurationResponse> {
    try {
      const response = await this.post(`${this.baseUrl}/snapshots/${snapshotId}/restore`, {});
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Descarga un snapshot
   */
  async downloadSnapshot(snapshotId: string): Promise<Blob> {
    try {
      const response = await this.get(`${this.baseUrl}/snapshots/${snapshotId}/download`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Elimina un snapshot
   */
  async deleteSnapshot(snapshotId: string): Promise<ConfigurationResponse> {
    try {
      const response = await this.delete(`${this.baseUrl}/snapshots/${snapshotId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ==================== Sincronización y Templates ====================

  /**
   * Sincroniza configuraciones entre empresa y usuarios
   */
  async synchronizeConfigurations(): Promise<ConfigurationResponse> {
    try {
      const response = await this.post(`${this.baseUrl}/system/sync`, {});
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Obtiene templates de configuración disponibles
   */
  async getConfigurationTemplates(): Promise<ConfigurationResponse> {
    try {
      const response = await this.get(`${this.baseUrl}/templates`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Aplica un template de configuración
   */
  async applyTemplate(templateId: string, targetType: 'company' | 'user'): Promise<ConfigurationResponse> {
    try {
      const response = await this.post(`${this.baseUrl}/templates/${templateId}/apply`, {
        targetType
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

// Instancia singleton del servicio
export const configurationService = new ConfigurationService();

export default configurationService;