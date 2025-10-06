/**
 * Advanced Company Settings Service - Sprint 3
 * Servicio avanzado para configuraciones empresariales específicas
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import { TYPES } from '@/container/types';
import { ICompanyRepository } from '@/shared/interfaces/repositories/ICompanyRepository';
import { AuditService } from '@/modules/companies/services/AuditService';
import { ICacheService } from '@/shared/interfaces/ICacheService';
import { AppError, ErrorCode } from '@/shared/errors/AppError';
// Advanced Settings Interfaces siguiendo principio de responsabilidad única
export interface BusinessProcessSettings {
  workflowConfig?: {
    enableCustomWorkflows: boolean;
    maxConcurrentProcesses: number;
    defaultApprovalFlow: 'single' | 'multi' | 'conditional';
    escalationRules: {
      enabled: boolean;
      timeoutHours: number;
      escalationLevels: Array<{
        level: number;
        roleRequired: string;
        notificationMethod: 'email' | 'sms' | 'both';
      }>;
    };
    automaticAssignment: {
      enabled: boolean;
      strategy: 'round_robin' | 'workload' | 'skill_based' | 'random';
      excludeWeekends: boolean;
    };
  };
  complianceConfig?: {
    dataRetentionDays: number;
    auditLevel: 'basic' | 'detailed' | 'comprehensive';
    requireDocumentation: boolean;
    regulations: string[]; // GDPR, CCPA, SOX, etc.
    exportSettings: {
      allowBulkExport: boolean;
      requireApproval: boolean;
      maxRecordsPerExport: number;
      allowedFormats: string[];
    };
  };
  qualityAssurance?: {
    enableReviews: boolean;
    mandatoryReviews: boolean;
    reviewerPoolSize: number;
    qualityMetrics: {
      trackAccuracy: boolean;
      trackTiming: boolean;
      trackSatisfaction: boolean;
      thresholds: {
        accuracy: number;
        timing: number; // in hours
        satisfaction: number; // 1-5 scale
      };
    };
  };
}
export interface IntegrationManagementSettings {
  apiManagement?: {
    enableApiKeys: boolean;
    keyRotationDays: number;
    rateLimitTier: 'basic' | 'professional' | 'enterprise';
    customRateLimits: {
      requestsPerMinute: number;
      burstLimit: number;
      cooldownPeriod: number;
    };
    allowedOrigins: string[];
    enableCors: boolean;
    requireHttps: boolean;
  };
  thirdPartyConnections?: {
    crm: {
      enabled: boolean;
      provider: 'salesforce' | 'hubspot' | 'pipedrive' | 'custom';
      syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
      dataMapping: Record<string, string>;
      bidirectionalSync: boolean;
    };
    accounting: {
      enabled: boolean;
      provider: 'quickbooks' | 'xero' | 'sage' | 'custom';
      autoInvoicing: boolean;
      taxCalculation: boolean;
      currencyHandling: 'single' | 'multi';
    };
    communication: {
      slack: {
        enabled: boolean;
        botToken?: string;
        defaultChannel: string;
        notificationTypes: string[];
        commandsEnabled: boolean;
      };
      teams: {
        enabled: boolean;
        tenantId?: string;
        appId?: string;
        channels: string[];
        meetingIntegration: boolean;
      };
      email: {
        provider: 'sendgrid' | 'mailgun' | 'ses' | 'smtp';
        customTemplates: boolean;
        trackingEnabled: boolean;
        unsubscribeHandling: boolean;
      };
    };
  };
  dataSync?: {
    enableRealTimeSync: boolean;
    conflictResolution: 'manual' | 'auto_latest' | 'auto_priority';
    syncRetries: number;
    batchSize: number;
    syncSchedule: {
      enabled: boolean;
      frequency: 'hourly' | 'daily' | 'weekly';
      time?: string; // HH:MM format
      timezone: string;
    };
  };
}
export interface SecurityGovernanceSettings {
  accessControl?: {
    enableRbac: boolean;
    sessionManagement: {
      maxSessions: number;
      idleTimeout: number;
      forceLogoutAfterHours: number;
      rememberDevices: boolean;
      deviceTrustDays: number;
    };
    passwordPolicies: {
      complexity: {
        minLength: number;
        requireMixedCase: boolean;
        requireNumbers: boolean;
        requireSymbols: boolean;
        forbidCommonPasswords: boolean;
        forbidPersonalInfo: boolean;
      };
      rotation: {
        enabled: boolean;
        frequencyDays: number;
        historyCount: number;
        gracePeriodDays: number;
      };
      recovery: {
        method: 'email' | 'sms' | 'security_questions' | 'admin_reset';
        tokenExpirationMinutes: number;
        maxAttempts: number;
      };
    };
    multiFactorAuth: {
      required: boolean;
      methods: Array<'totp' | 'sms' | 'email' | 'hardware_key'>;
      backupCodes: {
        enabled: boolean;
        count: number;
        singleUse: boolean;
      };
      trustedDevices: {
        enabled: boolean;
        trustDurationDays: number;
        maxTrustedDevices: number;
      };
    };
  };
  monitoring?: {
    enableAuditLogging: boolean;
    logLevel: 'basic' | 'detailed' | 'verbose';
    realTimeAlerts: {
      enabled: boolean;
      channels: string[];
      conditions: Array<{
        event: string;
        threshold: number;
        window: number; // minutes
        severity: 'low' | 'medium' | 'high' | 'critical';
      }>;
    };
    anomalyDetection: {
      enabled: boolean;
      sensitivityLevel: 'low' | 'medium' | 'high';
      monitoredActivities: string[];
      aiBasedDetection: boolean;
      falsePositiveReduction: boolean;
    };
    reporting: {
      automaticReports: boolean;
      reportTypes: string[];
      frequency: 'daily' | 'weekly' | 'monthly';
      recipients: string[];
      includeRecommendations: boolean;
    };
  };
  dataProtection?: {
    encryptionAtRest: {
      enabled: boolean;
      algorithm: 'AES256' | 'ChaCha20';
      keyRotationDays: number;
      keyEscrow: boolean;
    };
    encryptionInTransit: {
      tlsVersion: 'v1.2' | 'v1.3';
      cipherSuites: string[];
      hsts: boolean;
      certificateValidation: 'strict' | 'normal';
    };
    dataClassification: {
      enabled: boolean;
      autoClassification: boolean;
      classificationLevels: Array<{
        level: string;
        description: string;
        handling: string;
        retentionDays: number;
      }>;
    };
    privacyControls: {
      rightToErasure: boolean;
      dataPortability: boolean;
      consentManagement: boolean;
      cookieConsent: boolean;
      anonymization: {
        enabled: boolean;
        techniques: string[];
        scheduleAfterDays: number;
      };
    };
  };
}
export interface PerformanceOptimizationSettings {
  caching?: {
    strategy: 'memory' | 'redis' | 'hybrid';
    defaultTtl: number;
    maxMemoryMb: number;
    compressionEnabled: boolean;
    clusterMode: boolean;
    policies: Array<{
      pattern: string;
      ttl: number;
      priority: 'low' | 'medium' | 'high';
      compression: boolean;
    }>;
    invalidation: {
      strategy: 'time_based' | 'event_based' | 'hybrid';
      patterns: string[];
      cascadeInvalidation: boolean;
    };
  };
  resourceManagement?: {
    cpuLimits: {
      maxUsagePercent: number;
      throttlingEnabled: boolean;
      priorityQueuing: boolean;
    };
    memoryLimits: {
      maxUsageMb: number;
      garbageCollection: 'aggressive' | 'normal' | 'conservative';
      memoryLeakDetection: boolean;
    };
    databaseOptimization: {
      connectionPoolSize: number;
      queryTimeout: number;
      indexOptimization: boolean;
      slowQueryLogging: boolean;
      readReplicas: {
        enabled: boolean;
        count: number;
        loadBalancing: 'round_robin' | 'weighted' | 'least_connections';
      };
    };
  };
  scalingConfig?: {
    autoScaling: {
      enabled: boolean;
      scaleUpThreshold: number;
      scaleDownThreshold: number;
      minInstances: number;
      maxInstances: number;
      cooldownMinutes: number;
    };
    loadBalancing: {
      algorithm: 'round_robin' | 'least_connections' | 'ip_hash' | 'weighted';
      healthCheckInterval: number;
      failoverTimeout: number;
      stickySessions: boolean;
    };
  };
}
export interface AdvancedCompanySettingsResponse {
  companyId: string;
  businessProcess: BusinessProcessSettings;
  integrationManagement: IntegrationManagementSettings;
  securityGovernance: SecurityGovernanceSettings;
  performanceOptimization: PerformanceOptimizationSettings;
  lastUpdated: Date;
  updatedBy: string;
  configVersion: number;
}
/**
 * AdvancedCompanySettingsService - Gestión de configuraciones empresariales avanzadas
 * Principios SOLID aplicados:
 * - S: Responsabilidad única para settings avanzados
 * - O: Extensible para nuevos tipos de configuración
 * - L: Sustituible siguiendo contratos de interfaz
 * - I: Interfaces segregadas por dominio
 * - D: Inversión de dependencias con DI
 */
@injectable()
export class AdvancedCompanySettingsService extends EventEmitter {
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly CACHE_PREFIX = 'company_advanced_settings:';
  constructor(
    @inject(TYPES.CompanyRepository) private companyRepository: ICompanyRepository,
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.CacheService) private cacheService: ICacheService,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    super();
  }
  /**
   * Obtener configuraciones avanzadas de empresa
   */
  async getAdvancedSettings(companyId: string): Promise<AdvancedCompanySettingsResponse> {
    try {
      // Intentar obtener del cache primero
      const cacheKey = `${this.CACHE_PREFIX}${companyId}`;
      const cachedSettings = await this.cacheService.get<AdvancedCompanySettingsResponse>(cacheKey);
      if (cachedSettings) {
        this.logger.debug('Advanced settings retrieved from cache', { companyId });
        return cachedSettings;
      }
      const company = await this.companyRepository.findById(companyId);
      if (!company) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Company not found', 404);
      }
      const settings = this.mapToAdvancedSettingsResponse(company);
      // Cachear resultado
      await this.cacheService.set(cacheKey, settings, this.CACHE_TTL);
      this.logger.debug('Advanced company settings retrieved', { companyId });
      return settings;
    } catch (error) {
      this.logger.error('Error retrieving advanced company settings', {
        error: error.message,
        companyId
      });
      throw error;
    }
  }
  /**
   * Actualizar configuraciones de procesos de negocio
   */
  async updateBusinessProcessSettings(
    companyId: string,
    settings: BusinessProcessSettings,
    updatedBy: string
  ): Promise<AdvancedCompanySettingsResponse> {
    try {
      await this.validateBusinessProcessSettings(settings);
      const company = await this.companyRepository.findById(companyId);
      if (!company) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Company not found', 404);
      }
      const currentAdvancedSettings = company.advancedSettings || {};
      const updatedSettings = {
        ...currentAdvancedSettings,
        businessProcess: {
          ...currentAdvancedSettings.businessProcess,
          ...settings
        },
        configVersion: (currentAdvancedSettings.configVersion || 0) + 1,
        lastUpdated: new Date(),
        updatedBy
      };
      await this.companyRepository.update(companyId, {
        advancedSettings: updatedSettings
      });
      // Invalidar cache
      await this.invalidateCache(companyId);
      // Auditoría
      await this.auditService.logActivity({
        action: 'business_process_settings_updated',
        entityType: 'company',
        entityId: companyId,
        userId: updatedBy,
        companyId,
        description: 'Business process settings updated',
        metadata: { changes: Object.keys(settings) }
      });
      // Emitir evento para sincronización
      this.emit('settingsUpdated', {
        companyId,
        section: 'businessProcess',
        changes: settings,
        updatedBy
      });
      this.logger.info('Business process settings updated', {
        companyId,
        updatedBy,
        changes: Object.keys(settings)
      });
      return await this.getAdvancedSettings(companyId);
    } catch (error) {
      this.logger.error('Error updating business process settings', {
        error: error.message,
        companyId,
        updatedBy
      });
      throw error;
    }
  }
  /**
   * Actualizar configuraciones de gestión de integraciones
   */
  async updateIntegrationManagementSettings(
    companyId: string,
    settings: IntegrationManagementSettings,
    updatedBy: string
  ): Promise<AdvancedCompanySettingsResponse> {
    try {
      await this.validateIntegrationManagementSettings(settings);
      const company = await this.companyRepository.findById(companyId);
      if (!company) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Company not found', 404);
      }
      const currentAdvancedSettings = company.advancedSettings || {};
      const updatedSettings = {
        ...currentAdvancedSettings,
        integrationManagement: {
          ...currentAdvancedSettings.integrationManagement,
          ...settings
        },
        configVersion: (currentAdvancedSettings.configVersion || 0) + 1,
        lastUpdated: new Date(),
        updatedBy
      };
      await this.companyRepository.update(companyId, {
        advancedSettings: updatedSettings
      });
      await this.invalidateCache(companyId);
      // Auditoría con campos sensibles
      await this.auditService.logActivity({
        action: 'integration_management_updated',
        entityType: 'company',
        entityId: companyId,
        userId: updatedBy,
        companyId,
        description: 'Integration management settings updated',
        metadata: { 
          changes: Object.keys(settings),
          sensitiveFields: ['botToken', 'appId', 'apiKeys']
        }
      });
      this.emit('settingsUpdated', {
        companyId,
        section: 'integrationManagement',
        changes: settings,
        updatedBy
      });
      this.logger.info('Integration management settings updated', {
        companyId,
        updatedBy,
        changes: Object.keys(settings)
      });
      return await this.getAdvancedSettings(companyId);
    } catch (error) {
      this.logger.error('Error updating integration management settings', {
        error: error.message,
        companyId,
        updatedBy
      });
      throw error;
    }
  }
  /**
   * Actualizar configuraciones de seguridad y gobernanza
   */
  async updateSecurityGovernanceSettings(
    companyId: string,
    settings: SecurityGovernanceSettings,
    updatedBy: string
  ): Promise<AdvancedCompanySettingsResponse> {
    try {
      await this.validateSecurityGovernanceSettings(settings);
      const company = await this.companyRepository.findById(companyId);
      if (!company) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Company not found', 404);
      }
      const currentAdvancedSettings = company.advancedSettings || {};
      const updatedSettings = {
        ...currentAdvancedSettings,
        securityGovernance: {
          ...currentAdvancedSettings.securityGovernance,
          ...settings
        },
        configVersion: (currentAdvancedSettings.configVersion || 0) + 1,
        lastUpdated: new Date(),
        updatedBy
      };
      await this.companyRepository.update(companyId, {
        advancedSettings: updatedSettings
      });
      await this.invalidateCache(companyId);
      // Auditoría de seguridad crítica
      await this.auditService.logActivity({
        action: 'security_governance_updated',
        entityType: 'company',
        entityId: companyId,
        userId: updatedBy,
        companyId,
        description: 'Security governance settings updated',
        metadata: { 
          changes: Object.keys(settings),
          criticality: 'high',
          requiresReview: true
        }
      });
      this.emit('securitySettingsUpdated', {
        companyId,
        settings,
        updatedBy,
        timestamp: new Date()
      });
      this.logger.warn('Security governance settings updated', {
        companyId,
        updatedBy,
        changes: Object.keys(settings),
        auditRequired: true
      });
      return await this.getAdvancedSettings(companyId);
    } catch (error) {
      this.logger.error('Error updating security governance settings', {
        error: error.message,
        companyId,
        updatedBy
      });
      throw error;
    }
  }
  /**
   * Actualizar configuraciones de optimización de rendimiento
   */
  async updatePerformanceOptimizationSettings(
    companyId: string,
    settings: PerformanceOptimizationSettings,
    updatedBy: string
  ): Promise<AdvancedCompanySettingsResponse> {
    try {
      await this.validatePerformanceOptimizationSettings(settings);
      const company = await this.companyRepository.findById(companyId);
      if (!company) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Company not found', 404);
      }
      const currentAdvancedSettings = company.advancedSettings || {};
      const updatedSettings = {
        ...currentAdvancedSettings,
        performanceOptimization: {
          ...currentAdvancedSettings.performanceOptimization,
          ...settings
        },
        configVersion: (currentAdvancedSettings.configVersion || 0) + 1,
        lastUpdated: new Date(),
        updatedBy
      };
      await this.companyRepository.update(companyId, {
        advancedSettings: updatedSettings
      });
      await this.invalidateCache(companyId);
      await this.auditService.logActivity({
        action: 'performance_optimization_updated',
        entityType: 'company',
        entityId: companyId,
        userId: updatedBy,
        companyId,
        description: 'Performance optimization settings updated',
        metadata: { changes: Object.keys(settings) }
      });
      this.emit('performanceSettingsUpdated', {
        companyId,
        settings,
        updatedBy
      });
      this.logger.info('Performance optimization settings updated', {
        companyId,
        updatedBy,
        changes: Object.keys(settings)
      });
      return await this.getAdvancedSettings(companyId);
    } catch (error) {
      this.logger.error('Error updating performance optimization settings', {
        error: error.message,
        companyId,
        updatedBy
      });
      throw error;
    }
  }
  /**
   * Resetear configuraciones avanzadas
   */
  async resetAdvancedSettings(
    companyId: string,
    section: 'all' | 'businessProcess' | 'integrationManagement' | 'securityGovernance' | 'performanceOptimization',
    resetBy: string
  ): Promise<AdvancedCompanySettingsResponse> {
    try {
      const company = await this.companyRepository.findById(companyId);
      if (!company) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Company not found', 404);
      }
      const defaultSettings = this.getDefaultAdvancedSettings();
      const currentSettings = company.advancedSettings || {};
      let updatedSettings: any;
      if (section === 'all') {
        updatedSettings = {
          ...defaultSettings,
          configVersion: (currentSettings.configVersion || 0) + 1,
          lastUpdated: new Date(),
          updatedBy: resetBy
        };
      } else {
        updatedSettings = {
          ...currentSettings,
          [section]: defaultSettings[section],
          configVersion: (currentSettings.configVersion || 0) + 1,
          lastUpdated: new Date(),
          updatedBy: resetBy
        };
      }
      await this.companyRepository.update(companyId, {
        advancedSettings: updatedSettings
      });
      await this.invalidateCache(companyId);
      await this.auditService.logActivity({
        action: 'advanced_settings_reset',
        entityType: 'company',
        entityId: companyId,
        userId: resetBy,
        companyId,
        description: `Advanced settings reset: ${section}`,
        metadata: { section, resetBy }
      });
      this.emit('settingsReset', {
        companyId,
        section,
        resetBy
      });
      this.logger.info('Advanced settings reset', {
        companyId,
        section,
        resetBy
      });
      return await this.getAdvancedSettings(companyId);
    } catch (error) {
      this.logger.error('Error resetting advanced settings', {
        error: error.message,
        companyId,
        section,
        resetBy
      });
      throw error;
    }
  }
  // Private Methods
  private async invalidateCache(companyId: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${companyId}`;
    await this.cacheService.delete(cacheKey);
  }
  private mapToAdvancedSettingsResponse(company: any): AdvancedCompanySettingsResponse {
    const defaultSettings = this.getDefaultAdvancedSettings();
    const advancedSettings = company.advancedSettings || {};
    return {
      companyId: company.id,
      businessProcess: {
        ...defaultSettings.businessProcess,
        ...advancedSettings.businessProcess
      },
      integrationManagement: {
        ...defaultSettings.integrationManagement,
        ...advancedSettings.integrationManagement
      },
      securityGovernance: {
        ...defaultSettings.securityGovernance,
        ...advancedSettings.securityGovernance
      },
      performanceOptimization: {
        ...defaultSettings.performanceOptimization,
        ...advancedSettings.performanceOptimization
      },
      lastUpdated: advancedSettings.lastUpdated || company.updatedAt,
      updatedBy: advancedSettings.updatedBy || 'system',
      configVersion: advancedSettings.configVersion || 1
    };
  }
  private getDefaultAdvancedSettings() {
    return {
      businessProcess: {
        workflowConfig: {
          enableCustomWorkflows: false,
          maxConcurrentProcesses: 10,
          defaultApprovalFlow: 'single' as const,
          escalationRules: {
            enabled: false,
            timeoutHours: 24,
            escalationLevels: []
          },
          automaticAssignment: {
            enabled: false,
            strategy: 'round_robin' as const,
            excludeWeekends: true
          }
        },
        complianceConfig: {
          dataRetentionDays: 2555, // 7 years
          auditLevel: 'basic' as const,
          requireDocumentation: false,
          regulations: [],
          exportSettings: {
            allowBulkExport: false,
            requireApproval: true,
            maxRecordsPerExport: 1000,
            allowedFormats: ['csv', 'json']
          }
        },
        qualityAssurance: {
          enableReviews: false,
          mandatoryReviews: false,
          reviewerPoolSize: 3,
          qualityMetrics: {
            trackAccuracy: false,
            trackTiming: false,
            trackSatisfaction: false,
            thresholds: {
              accuracy: 0.95,
              timing: 24,
              satisfaction: 4
            }
          }
        }
      },
      integrationManagement: {
        apiManagement: {
          enableApiKeys: false,
          keyRotationDays: 90,
          rateLimitTier: 'basic' as const,
          customRateLimits: {
            requestsPerMinute: 60,
            burstLimit: 100,
            cooldownPeriod: 60
          },
          allowedOrigins: [],
          enableCors: true,
          requireHttps: true
        },
        thirdPartyConnections: {
          communication: {
            slack: {
              enabled: false,
              defaultChannel: '#general',
              notificationTypes: [],
              commandsEnabled: false
            },
            teams: {
              enabled: false,
              channels: [],
              meetingIntegration: false
            },
            email: {
              provider: 'sendgrid' as const,
              customTemplates: false,
              trackingEnabled: false,
              unsubscribeHandling: true
            }
          }
        },
        dataSync: {
          enableRealTimeSync: false,
          conflictResolution: 'manual' as const,
          syncRetries: 3,
          batchSize: 100,
          syncSchedule: {
            enabled: false,
            frequency: 'daily' as const,
            timezone: 'America/Argentina/Buenos_Aires'
          }
        }
      },
      securityGovernance: {
        accessControl: {
          enableRbac: true,
          sessionManagement: {
            maxSessions: 5,
            idleTimeout: 60,
            forceLogoutAfterHours: 24,
            rememberDevices: false,
            deviceTrustDays: 30
          },
          multiFactorAuth: {
            required: false,
            methods: ['totp'],
            backupCodes: {
              enabled: false,
              count: 10,
              singleUse: true
            },
            trustedDevices: {
              enabled: false,
              trustDurationDays: 30,
              maxTrustedDevices: 5
            }
          }
        },
        monitoring: {
          enableAuditLogging: true,
          logLevel: 'basic' as const,
          realTimeAlerts: {
            enabled: false,
            channels: [],
            conditions: []
          },
          anomalyDetection: {
            enabled: false,
            sensitivityLevel: 'medium' as const,
            monitoredActivities: [],
            aiBasedDetection: false,
            falsePositiveReduction: true
          }
        }
      },
      performanceOptimization: {
        caching: {
          strategy: 'memory' as const,
          defaultTtl: 300,
          maxMemoryMb: 128,
          compressionEnabled: false,
          clusterMode: false,
          policies: [],
          invalidation: {
            strategy: 'time_based' as const,
            patterns: [],
            cascadeInvalidation: false
          }
        },
        resourceManagement: {
          cpuLimits: {
            maxUsagePercent: 80,
            throttlingEnabled: false,
            priorityQueuing: false
          },
          memoryLimits: {
            maxUsageMb: 512,
            garbageCollection: 'normal' as const,
            memoryLeakDetection: false
          },
          databaseOptimization: {
            connectionPoolSize: 10,
            queryTimeout: 30,
            indexOptimization: false,
            slowQueryLogging: false,
            readReplicas: {
              enabled: false,
              count: 0,
              loadBalancing: 'round_robin' as const
            }
          }
        }
      }
    };
  }
  // Validation methods
  private async validateBusinessProcessSettings(settings: BusinessProcessSettings): Promise<void> {
    if (settings.workflowConfig?.maxConcurrentProcesses &&
        (settings.workflowConfig.maxConcurrentProcesses < 1 || settings.workflowConfig.maxConcurrentProcesses > 100)) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Max concurrent processes must be between 1 and 100', 400);
    }
    if (settings.complianceConfig?.dataRetentionDays &&
        (settings.complianceConfig.dataRetentionDays < 30 || settings.complianceConfig.dataRetentionDays > 3650)) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Data retention days must be between 30 and 3650', 400);
    }
  }
  private async validateIntegrationManagementSettings(settings: IntegrationManagementSettings): Promise<void> {
    if (settings.apiManagement?.customRateLimits?.requestsPerMinute &&
        (settings.apiManagement.customRateLimits.requestsPerMinute < 1 ||
         settings.apiManagement.customRateLimits.requestsPerMinute > 10000)) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Requests per minute must be between 1 and 10000', 400);
    }
  }
  private async validateSecurityGovernanceSettings(settings: SecurityGovernanceSettings): Promise<void> {
    if (settings.accessControl?.passwordPolicies?.complexity?.minLength &&
        (settings.accessControl.passwordPolicies.complexity.minLength < 8 ||
         settings.accessControl.passwordPolicies.complexity.minLength > 128)) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Password min length must be between 8 and 128', 400);
    }
  }
  private async validatePerformanceOptimizationSettings(settings: PerformanceOptimizationSettings): Promise<void> {
    if (settings.caching?.maxMemoryMb &&
        (settings.caching.maxMemoryMb < 64 || settings.caching.maxMemoryMb > 8192)) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Cache memory must be between 64MB and 8GB', 400);
    }
  }
}
