/**
 * Advanced User Preferences Service - Sprint 3
 * Servicio avanzado para preferencias de usuario extendidas
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import { TYPES } from '@/container/types';
import { IUserRepository } from '@/shared/interfaces/repositories/IUserRepository';
import { AuditService } from '@/modules/users/services/AuditService';
import { ICacheService } from '@/shared/interfaces/ICacheService';
import { AppError } from '@/shared/errors/AppError';
// Advanced User Preferences Interfaces
export interface PersonalizationPreferences {
  dashboard?: {
    layout: 'grid' | 'list' | 'cards' | 'kanban';
    widgetConfiguration: Array<{
      id: string;
      type: string;
      position: { x: number; y: number; width: number; height: number };
      settings: Record<string, any>;
      visible: boolean;
    }>;
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
  workspaceCustomization?: {
    favoriteViews: Array<{
      name: string;
      viewType: string;
      filters: Record<string, any>;
      sortOrder: Record<string, any>;
      isDefault: boolean;
    }>;
    quickActions: Array<{
      id: string;
      label: string;
      icon: string;
      action: string;
      parameters: Record<string, any>;
      order: number;
    }>;
    toolbarConfiguration: {
      hiddenItems: string[];
      customOrder: string[];
      grouping: Record<string, string[]>;
    };
    sidebarConfiguration: {
      collapsed: boolean;
      pinnedItems: string[];
      customSections: Array<{
        id: string;
        title: string;
        items: string[];
        collapsed: boolean;
      }>;
    };
  };
  contentPreferences?: {
    defaultFilters: Record<string, any>;
    itemsPerPage: number;
    sortPreference: {
      field: string;
      direction: 'asc' | 'desc';
    };
    viewMode: 'table' | 'grid' | 'list';
    showPreview: boolean;
    autoRefresh: {
      enabled: boolean;
      intervalSeconds: number;
    };
  };
}
export interface IntegrationPreferences {
  connectedAccounts?: Array<{
    platform: string;
    accountId: string;
    displayName: string;
    permissions: string[];
    syncEnabled: boolean;
    lastSync?: Date;
  }>;
  externalCalendars?: Array<{
    id: string;
    name: string;
    source: 'google' | 'outlook' | 'caldav';
    color: string;
    syncBidirectional: boolean;
    conflictResolution: 'local' | 'remote' | 'prompt';
  }>;
  apiIntegrations?: Array<{
    name: string;
    apiKey: string;
    baseUrl: string;
    rateLimitOverride?: number;
    customHeaders: Record<string, string>;
    enabled: boolean;
  }>;
  webhookSubscriptions?: Array<{
    id: string;
    url: string;
    events: string[];
    secret?: string;
    retryPolicy: {
      maxAttempts: number;
      backoffMultiplier: number;
    };
    active: boolean;
  }>;
}
export interface CollaborationPreferences {
  teamSettings?: {
    defaultVisibility: 'private' | 'team' | 'company';
    autoShareWithTeam: boolean;
    mentionNotifications: 'all' | 'direct' | 'none';
    statusSync: boolean;
    workingHoursVisibility: boolean;
  };
  communicationPreferences?: {
    preferredChannels: Array<{
      type: 'email' | 'slack' | 'teams' | 'sms';
      priority: number;
      timeRestrictions?: {
        startTime: string;
        endTime: string;
        timezone: string;
        workDaysOnly: boolean;
      };
    }>;
    responseTimeExpectation: {
      urgent: number; // minutes
      normal: number; // hours
      lowPriority: number; // days
    };
    automaticReplies: {
      enabled: boolean;
      templates: Array<{
        condition: string;
        message: string;
        active: boolean;
      }>;
    };
  };
  sharingDefaults?: {
    defaultPermission: 'view' | 'comment' | 'edit';
    inheritPermissions: boolean;
    expirationDefault?: number; // days
    allowExternalSharing: boolean;
    requirePasswordForExternal: boolean;
  };
}
export interface ProductivitySettings {
  focusMode?: {
    enabled: boolean;
    blockedUrls: string[];
    allowedUrls: string[];
    timeBlocks: Array<{
      start: string;
      end: string;
      daysOfWeek: number[];
      description: string;
    }>;
    breakReminders: {
      enabled: boolean;
      intervalMinutes: number;
      duration: number;
    };
  };
  taskManagement?: {
    defaultPriority: 'low' | 'medium' | 'high' | 'urgent';
    autoDeadlineReminder: {
      enabled: boolean;
      daysBefore: number[];
      reminderTimes: string[]; // HH:MM format
    };
    timeTracking: {
      autoStart: boolean;
      reminderToStart: boolean;
      reminderToStop: boolean;
      roundingMinutes: 1 | 5 | 15 | 30;
    };
    completionBehavior: {
      archiveCompleted: boolean;
      archiveAfterDays: number;
      showCompletedInLists: boolean;
    };
  };
  automations?: Array<{
    id: string;
    name: string;
    trigger: {
      type: string;
      conditions: Record<string, any>;
    };
    actions: Array<{
      type: string;
      parameters: Record<string, any>;
    }>;
    enabled: boolean;
    lastRun?: Date;
    runCount: number;
  }>;
  keyboardShortcuts?: Record<string, {
    key: string;
    modifiers: string[];
    action: string;
    context?: string;
  }>;
}
export interface SecurityPersonalSettings {
  deviceTrust?: Array<{
    deviceId: string;
    deviceName: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
    trusted: boolean;
    trustedUntil?: Date;
    lastUsed: Date;
    location?: string;
  }>;
  activeSessions?: Array<{
    sessionId: string;
    deviceInfo: string;
    ipAddress: string;
    location?: string;
    startTime: Date;
    lastActivity: Date;
    isCurrent: boolean;
  }>;
  securityAlerts?: {
    loginFromNewDevice: boolean;
    loginFromNewLocation: boolean;
    passwordChangeAttempts: boolean;
    apiKeyUsage: boolean;
    suspiciousActivity: boolean;
    dataExport: boolean;
  };
  privacySettings?: {
    activityTracking: boolean;
    usageAnalytics: boolean;
    errorReporting: boolean;
    marketingCommunications: boolean;
    profileVisibility: Array<{
      field: string;
      visibility: 'public' | 'company' | 'team' | 'private';
    }>;
  };
  dataManagement?: {
    autoBackup: {
      enabled: boolean;
      frequency: 'daily' | 'weekly' | 'monthly';
      retentionDays: number;
      includePreferences: boolean;
    };
    dataRetention: {
      personalFiles: number; // days
      chatHistory: number; // days
      activityLogs: number; // days
    };
  };
}
export interface AdvancedUserPreferencesResponse {
  userId: string;
  personalization: PersonalizationPreferences;
  integration: IntegrationPreferences;
  collaboration: CollaborationPreferences;
  productivity: ProductivitySettings;
  security: SecurityPersonalSettings;
  lastUpdated: Date;
  preferencesVersion: number;
}
/**
 * AdvancedUserPreferencesService - Gestión de preferencias avanzadas de usuario
 * Principios SOLID aplicados:
 * - S: Responsabilidad única para preferencias avanzadas
 * - O: Extensible para nuevos tipos de preferencias
 * - L: Sustituible siguiendo contratos de interfaz
 * - I: Interfaces segregadas por dominio de preferencias
 * - D: Inversión de dependencias con DI
 */
@injectable()
export class AdvancedUserPreferencesService extends EventEmitter {
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes
  private readonly CACHE_PREFIX = 'user_advanced_prefs:';
  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.CacheService) private cacheService: ICacheService,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    super();
  }
  /**
   * Obtener preferencias avanzadas del usuario
   */
  async getAdvancedPreferences(userId: string): Promise<AdvancedUserPreferencesResponse> {
    try {
      // Intentar obtener del cache primero
      const cacheKey = `${this.CACHE_PREFIX}${userId}`;
      const cachedPreferences = await this.cacheService.get<AdvancedUserPreferencesResponse>(cacheKey);
      if (cachedPreferences) {
        this.logger.debug('Advanced preferences retrieved from cache', { userId });
        return cachedPreferences;
      }
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }
      const preferences = this.mapToAdvancedPreferencesResponse(user);
      // Cachear resultado
      await this.cacheService.set(cacheKey, preferences, this.CACHE_TTL);
      this.logger.debug('Advanced user preferences retrieved', { userId });
      return preferences;
    } catch (error) {
      this.logger.error('Error retrieving advanced user preferences', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
  /**
   * Actualizar preferencias de personalización
   */
  async updatePersonalizationPreferences(
    userId: string,
    preferences: PersonalizationPreferences
  ): Promise<AdvancedUserPreferencesResponse> {
    try {
      await this.validatePersonalizationPreferences(preferences);
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }
      const currentAdvancedPrefs = user.advancedPreferences || {};
      const updatedPreferences = {
        ...currentAdvancedPrefs,
        personalization: {
          ...currentAdvancedPrefs.personalization,
          ...preferences
        },
        preferencesVersion: (currentAdvancedPrefs.preferencesVersion || 0) + 1,
        lastUpdated: new Date()
      };
      await this.userRepository.update(userId, {
        advancedPreferences: updatedPreferences
      });
      await this.invalidateCache(userId);
      await this.auditService.logActivity({
        action: 'personalization_preferences_updated',
        entityType: 'user',
        entityId: userId,
        userId,
        description: 'User personalization preferences updated',
        metadata: { changes: Object.keys(preferences) }
      });
      this.emit('preferencesUpdated', {
        userId,
        section: 'personalization',
        changes: preferences
      });
      this.logger.info('Personalization preferences updated', {
        userId,
        changes: Object.keys(preferences)
      });
      return await this.getAdvancedPreferences(userId);
    } catch (error) {
      this.logger.error('Error updating personalization preferences', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
  /**
   * Actualizar preferencias de integración
   */
  async updateIntegrationPreferences(
    userId: string,
    preferences: IntegrationPreferences
  ): Promise<AdvancedUserPreferencesResponse> {
    try {
      await this.validateIntegrationPreferences(preferences);
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }
      const currentAdvancedPrefs = user.advancedPreferences || {};
      const updatedPreferences = {
        ...currentAdvancedPrefs,
        integration: {
          ...currentAdvancedPrefs.integration,
          ...preferences
        },
        preferencesVersion: (currentAdvancedPrefs.preferencesVersion || 0) + 1,
        lastUpdated: new Date()
      };
      await this.userRepository.update(userId, {
        advancedPreferences: updatedPreferences
      });
      await this.invalidateCache(userId);
      await this.auditService.logActivity({
        action: 'integration_preferences_updated',
        entityType: 'user',
        entityId: userId,
        userId,
        description: 'User integration preferences updated',
        metadata: { 
          changes: Object.keys(preferences),
          sensitiveFields: ['apiKey', 'secret']
        }
      });
      this.emit('preferencesUpdated', {
        userId,
        section: 'integration',
        changes: preferences
      });
      this.logger.info('Integration preferences updated', {
        userId,
        changes: Object.keys(preferences)
      });
      return await this.getAdvancedPreferences(userId);
    } catch (error) {
      this.logger.error('Error updating integration preferences', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
  /**
   * Actualizar preferencias de colaboración
   */
  async updateCollaborationPreferences(
    userId: string,
    preferences: CollaborationPreferences
  ): Promise<AdvancedUserPreferencesResponse> {
    try {
      await this.validateCollaborationPreferences(preferences);
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }
      const currentAdvancedPrefs = user.advancedPreferences || {};
      const updatedPreferences = {
        ...currentAdvancedPrefs,
        collaboration: {
          ...currentAdvancedPrefs.collaboration,
          ...preferences
        },
        preferencesVersion: (currentAdvancedPrefs.preferencesVersion || 0) + 1,
        lastUpdated: new Date()
      };
      await this.userRepository.update(userId, {
        advancedPreferences: updatedPreferences
      });
      await this.invalidateCache(userId);
      await this.auditService.logActivity({
        action: 'collaboration_preferences_updated',
        entityType: 'user',
        entityId: userId,
        userId,
        description: 'User collaboration preferences updated',
        metadata: { changes: Object.keys(preferences) }
      });
      this.emit('preferencesUpdated', {
        userId,
        section: 'collaboration',
        changes: preferences
      });
      this.logger.info('Collaboration preferences updated', {
        userId,
        changes: Object.keys(preferences)
      });
      return await this.getAdvancedPreferences(userId);
    } catch (error) {
      this.logger.error('Error updating collaboration preferences', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
  /**
   * Actualizar configuraciones de productividad
   */
  async updateProductivitySettings(
    userId: string,
    settings: ProductivitySettings
  ): Promise<AdvancedUserPreferencesResponse> {
    try {
      await this.validateProductivitySettings(settings);
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }
      const currentAdvancedPrefs = user.advancedPreferences || {};
      const updatedPreferences = {
        ...currentAdvancedPrefs,
        productivity: {
          ...currentAdvancedPrefs.productivity,
          ...settings
        },
        preferencesVersion: (currentAdvancedPrefs.preferencesVersion || 0) + 1,
        lastUpdated: new Date()
      };
      await this.userRepository.update(userId, {
        advancedPreferences: updatedPreferences
      });
      await this.invalidateCache(userId);
      await this.auditService.logActivity({
        action: 'productivity_settings_updated',
        entityType: 'user',
        entityId: userId,
        userId,
        description: 'User productivity settings updated',
        metadata: { changes: Object.keys(settings) }
      });
      this.emit('preferencesUpdated', {
        userId,
        section: 'productivity',
        changes: settings
      });
      this.logger.info('Productivity settings updated', {
        userId,
        changes: Object.keys(settings)
      });
      return await this.getAdvancedPreferences(userId);
    } catch (error) {
      this.logger.error('Error updating productivity settings', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
  /**
   * Actualizar configuraciones de seguridad personal
   */
  async updateSecurityPersonalSettings(
    userId: string,
    settings: SecurityPersonalSettings
  ): Promise<AdvancedUserPreferencesResponse> {
    try {
      await this.validateSecurityPersonalSettings(settings);
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }
      const currentAdvancedPrefs = user.advancedPreferences || {};
      const updatedPreferences = {
        ...currentAdvancedPrefs,
        security: {
          ...currentAdvancedPrefs.security,
          ...settings
        },
        preferencesVersion: (currentAdvancedPrefs.preferencesVersion || 0) + 1,
        lastUpdated: new Date()
      };
      await this.userRepository.update(userId, {
        advancedPreferences: updatedPreferences
      });
      await this.invalidateCache(userId);
      await this.auditService.logActivity({
        action: 'security_personal_settings_updated',
        entityType: 'user',
        entityId: userId,
        userId,
        description: 'User security personal settings updated',
        metadata: { 
          changes: Object.keys(settings),
          criticality: 'medium'
        }
      });
      this.emit('securityPreferencesUpdated', {
        userId,
        settings,
        timestamp: new Date()
      });
      this.logger.info('Security personal settings updated', {
        userId,
        changes: Object.keys(settings)
      });
      return await this.getAdvancedPreferences(userId);
    } catch (error) {
      this.logger.error('Error updating security personal settings', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
  /**
   * Exportar todas las preferencias avanzadas
   */
  async exportAdvancedPreferences(userId: string): Promise<{
    user: { id: string; email: string; name: string };
    preferences: AdvancedUserPreferencesResponse;
    exportedAt: Date;
  }> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }
      const preferences = await this.getAdvancedPreferences(userId);
      const exportData = {
        user: {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`
        },
        preferences,
        exportedAt: new Date()
      };
      await this.auditService.logActivity({
        action: 'advanced_preferences_exported',
        entityType: 'user',
        entityId: userId,
        userId,
        description: 'Advanced user preferences exported'
      });
      this.logger.info('Advanced preferences exported', { userId });
      return exportData;
    } catch (error) {
      this.logger.error('Error exporting advanced preferences', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
  /**
   * Resetear preferencias avanzadas
   */
  async resetAdvancedPreferences(
    userId: string,
    section?: 'all' | 'personalization' | 'integration' | 'collaboration' | 'productivity' | 'security'
  ): Promise<AdvancedUserPreferencesResponse> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }
      const defaultPreferences = this.getDefaultAdvancedPreferences();
      const currentPrefs = user.advancedPreferences || {};
      let updatedPreferences: any;
      if (!section || section === 'all') {
        updatedPreferences = {
          ...defaultPreferences,
          preferencesVersion: (currentPrefs.preferencesVersion || 0) + 1,
          lastUpdated: new Date()
        };
      } else {
        updatedPreferences = {
          ...currentPrefs,
          [section]: defaultPreferences[section],
          preferencesVersion: (currentPrefs.preferencesVersion || 0) + 1,
          lastUpdated: new Date()
        };
      }
      await this.userRepository.update(userId, {
        advancedPreferences: updatedPreferences
      });
      await this.invalidateCache(userId);
      await this.auditService.logActivity({
        action: 'advanced_preferences_reset',
        entityType: 'user',
        entityId: userId,
        userId,
        description: `Advanced preferences reset: ${section || 'all'}`,
        metadata: { section: section || 'all' }
      });
      this.emit('preferencesReset', {
        userId,
        section: section || 'all'
      });
      this.logger.info('Advanced preferences reset', {
        userId,
        section: section || 'all'
      });
      return await this.getAdvancedPreferences(userId);
    } catch (error) {
      this.logger.error('Error resetting advanced preferences', {
        error: error.message,
        userId,
        section
      });
      throw error;
    }
  }
  // Private Methods
  private async invalidateCache(userId: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${userId}`;
    await this.cacheService.delete(cacheKey);
  }
  private mapToAdvancedPreferencesResponse(user: any): AdvancedUserPreferencesResponse {
    const defaultPrefs = this.getDefaultAdvancedPreferences();
    const advancedPrefs = user.advancedPreferences || {};
    return {
      userId: user.id,
      personalization: {
        ...defaultPrefs.personalization,
        ...advancedPrefs.personalization
      },
      integration: {
        ...defaultPrefs.integration,
        ...advancedPrefs.integration
      },
      collaboration: {
        ...defaultPrefs.collaboration,
        ...advancedPrefs.collaboration
      },
      productivity: {
        ...defaultPrefs.productivity,
        ...advancedPrefs.productivity
      },
      security: {
        ...defaultPrefs.security,
        ...advancedPrefs.security
      },
      lastUpdated: advancedPrefs.lastUpdated || user.updatedAt,
      preferencesVersion: advancedPrefs.preferencesVersion || 1
    };
  }
  private getDefaultAdvancedPreferences() {
    return {
      personalization: {
        dashboard: {
          layout: 'grid' as const,
          widgetConfiguration: [],
          customColors: {
            primary: '#3b82f6',
            secondary: '#64748b',
            accent: '#f59e0b',
            background: '#ffffff'
          },
          shortcuts: []
        },
        workspaceCustomization: {
          favoriteViews: [],
          quickActions: [],
          toolbarConfiguration: {
            hiddenItems: [],
            customOrder: [],
            grouping: {}
          },
          sidebarConfiguration: {
            collapsed: false,
            pinnedItems: [],
            customSections: []
          }
        },
        contentPreferences: {
          defaultFilters: {},
          itemsPerPage: 25,
          sortPreference: {
            field: 'createdAt',
            direction: 'desc' as const
          },
          viewMode: 'table' as const,
          showPreview: true,
          autoRefresh: {
            enabled: false,
            intervalSeconds: 300
          }
        }
      },
      integration: {
        connectedAccounts: [],
        externalCalendars: [],
        apiIntegrations: [],
        webhookSubscriptions: []
      },
      collaboration: {
        teamSettings: {
          defaultVisibility: 'company' as const,
          autoShareWithTeam: false,
          mentionNotifications: 'direct' as const,
          statusSync: false,
          workingHoursVisibility: true
        },
        communicationPreferences: {
          preferredChannels: [
            { type: 'email' as const, priority: 1 }
          ],
          responseTimeExpectation: {
            urgent: 15,
            normal: 4,
            lowPriority: 2
          },
          automaticReplies: {
            enabled: false,
            templates: []
          }
        },
        sharingDefaults: {
          defaultPermission: 'view' as const,
          inheritPermissions: true,
          allowExternalSharing: false,
          requirePasswordForExternal: true
        }
      },
      productivity: {
        focusMode: {
          enabled: false,
          blockedUrls: [],
          allowedUrls: [],
          timeBlocks: [],
          breakReminders: {
            enabled: false,
            intervalMinutes: 90,
            duration: 15
          }
        },
        taskManagement: {
          defaultPriority: 'medium' as const,
          autoDeadlineReminder: {
            enabled: true,
            daysBefore: [1, 3, 7],
            reminderTimes: ['09:00']
          },
          timeTracking: {
            autoStart: false,
            reminderToStart: false,
            reminderToStop: false,
            roundingMinutes: 15 as const
          },
          completionBehavior: {
            archiveCompleted: false,
            archiveAfterDays: 30,
            showCompletedInLists: true
          }
        },
        automations: [],
        keyboardShortcuts: {}
      },
      security: {
        deviceTrust: [],
        activeSessions: [],
        securityAlerts: {
          loginFromNewDevice: true,
          loginFromNewLocation: true,
          passwordChangeAttempts: true,
          apiKeyUsage: false,
          suspiciousActivity: true,
          dataExport: true
        },
        privacySettings: {
          activityTracking: true,
          usageAnalytics: true,
          errorReporting: true,
          marketingCommunications: false,
          profileVisibility: [
            { field: 'email', visibility: 'company' as const },
            { field: 'phone', visibility: 'private' as const },
            { field: 'location', visibility: 'company' as const }
          ]
        },
        dataManagement: {
          autoBackup: {
            enabled: false,
            frequency: 'weekly' as const,
            retentionDays: 90,
            includePreferences: true
          },
          dataRetention: {
            personalFiles: 365,
            chatHistory: 90,
            activityLogs: 30
          }
        }
      }
    };
  }
  // Validation methods
  private async validatePersonalizationPreferences(preferences: PersonalizationPreferences): Promise<void> {
    if (preferences.contentPreferences?.itemsPerPage && 
        (preferences.contentPreferences.itemsPerPage < 5 || preferences.contentPreferences.itemsPerPage > 100)) {
      throw new AppError('Items per page must be between 5 and 100', 400, 'INVALID_PREFERENCE');
    }
  }
  private async validateIntegrationPreferences(preferences: IntegrationPreferences): Promise<void> {
    if (preferences.webhookSubscriptions) {
      for (const webhook of preferences.webhookSubscriptions) {
        if (!webhook.url.startsWith('https://')) {
          throw new AppError('Webhook URLs must use HTTPS', 400, 'INVALID_WEBHOOK_URL');
        }
      }
    }
  }
  private async validateCollaborationPreferences(preferences: CollaborationPreferences): Promise<void> {
    if (preferences.sharingDefaults?.expirationDefault && 
        (preferences.sharingDefaults.expirationDefault < 1 || preferences.sharingDefaults.expirationDefault > 365)) {
      throw new AppError('Expiration default must be between 1 and 365 days', 400, 'INVALID_EXPIRATION');
    }
  }
  private async validateProductivitySettings(settings: ProductivitySettings): Promise<void> {
    if (settings.taskManagement?.timeTracking?.roundingMinutes && 
        ![1, 5, 15, 30].includes(settings.taskManagement.timeTracking.roundingMinutes)) {
      throw new AppError('Rounding minutes must be 1, 5, 15, or 30', 400, 'INVALID_ROUNDING');
    }
  }
  private async validateSecurityPersonalSettings(settings: SecurityPersonalSettings): Promise<void> {
    if (settings.dataManagement?.dataRetention?.activityLogs && 
        (settings.dataManagement.dataRetention.activityLogs < 1 || settings.dataManagement.dataRetention.activityLogs > 2555)) {
      throw new AppError('Activity logs retention must be between 1 and 2555 days', 400, 'INVALID_RETENTION');
    }
  }
}
