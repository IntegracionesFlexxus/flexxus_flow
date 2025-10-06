/**
 * Configuration Manager Service - Sprint 3
 * Servicio centralizado para gestión unificada de configuraciones
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import { TYPES } from '@/container/types';
import { ICacheService } from '@/shared/interfaces/ICacheService';
import { AppError, ErrorCode } from '@/shared/errors/AppError';
import { CompanySettingsService, CompanySettingsResponse } from '@/modules/auth/services/CompanySettingsService';
import { UserPreferencesService, UserPreferencesResponse } from '@/modules/auth/services/UserPreferencesService';
import { AdvancedCompanySettingsService, AdvancedCompanySettingsResponse } from '@/modules/auth/services/AdvancedCompanySettingsService';
import { AdvancedUserPreferencesService, AdvancedUserPreferencesResponse } from '@/modules/auth/services/AdvancedUserPreferencesService';
export interface ConfigurationSnapshot {
  companyId: string;
  userId?: string;
  timestamp: Date;
  configurations: {
    companyBasic: CompanySettingsResponse;
    companyAdvanced: AdvancedCompanySettingsResponse;
    userBasic?: UserPreferencesResponse;
    userAdvanced?: AdvancedUserPreferencesResponse;
  };
  metadata: {
    version: string;
    compatibilityLevel: number;
    checksum: string;
  };
}
export interface ConfigurationValidationResult {
  valid: boolean;
  errors: Array<{
    type: 'error' | 'warning';
    section: string;
    field: string;
    message: string;
    code: string;
  }>;
  recommendations: Array<{
    section: string;
    action: string;
    reason: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}
export interface ConfigurationSyncOptions {
  includeUserPreferences: boolean;
  includeAdvancedSettings: boolean;
  validateBeforeSync: boolean;
  createBackup: boolean;
  notifyUsers: boolean;
}
export interface ConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'industry' | 'company_size' | 'security_level' | 'custom';
  applicableTo: 'company' | 'user' | 'both';
  configuration: any;
  version: string;
  createdBy: string;
  isDefault: boolean;
}
export interface ConfigurationDiff {
  section: string;
  changes: Array<{
    path: string;
    oldValue: any;
    newValue: any;
    changeType: 'added' | 'modified' | 'removed';
  }>;
}
export interface ConfigurationAuditEntry {
  id: string;
  timestamp: Date;
  action: string;
  section: string;
  userId: string;
  companyId: string;
  changes: ConfigurationDiff[];
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
  };
}
/**
 * ConfigurationManagerService - Gestor centralizado de configuraciones
 * Principios SOLID aplicados:
 * - S: Responsabilidad única para gestión centralizada de configs
 * - O: Extensible para nuevos tipos de configuración
 * - L: Sustituible por otras implementaciones
 * - I: Interfaces segregadas por tipo de operación
 * - D: Inversión de dependencias con inyección
 */
@injectable()
export class ConfigurationManagerService extends EventEmitter {
  private readonly CACHE_TTL = 20 * 60 * 1000; // 20 minutes
  private readonly SNAPSHOT_CACHE_PREFIX = 'config_snapshot:';
  private readonly TEMPLATE_CACHE_PREFIX = 'config_template:';
  private readonly VALIDATION_CACHE_PREFIX = 'config_validation:';
  constructor(
    @inject(TYPES.CompanySettingsService) private companySettingsService: CompanySettingsService,
    @inject(TYPES.UserPreferencesService) private userPreferencesService: UserPreferencesService,
    @inject(TYPES.AdvancedCompanySettingsService) private advancedCompanySettingsService: AdvancedCompanySettingsService,
    @inject(TYPES.AdvancedUserPreferencesService) private advancedUserPreferencesService: AdvancedUserPreferencesService,
    @inject(TYPES.CacheService) private cacheService: ICacheService,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    super();
    this.setupEventListeners();
  }
  /**
   * Obtener snapshot completo de configuraciones
   */
  async getConfigurationSnapshot(
    companyId: string, 
    userId?: string, 
    useCache: boolean = true
  ): Promise<ConfigurationSnapshot> {
    try {
      const cacheKey = `${this.SNAPSHOT_CACHE_PREFIX}${companyId}:${userId || 'company_only'}`;
      if (useCache) {
        const cachedSnapshot = await this.cacheService.get<ConfigurationSnapshot>(cacheKey);
        if (cachedSnapshot) {
          this.logger.debug('Configuration snapshot retrieved from cache', { companyId, userId });
          return cachedSnapshot;
        }
      }
      // Obtener configuraciones básicas
      const companyBasic = await this.companySettingsService.getCompanySettings(companyId);
      const companyAdvanced = await this.advancedCompanySettingsService.getAdvancedSettings(companyId);
      let userBasic: UserPreferencesResponse | undefined;
      let userAdvanced: AdvancedUserPreferencesResponse | undefined;
      if (userId) {
        userBasic = await this.userPreferencesService.getUserPreferences(userId);
        userAdvanced = await this.advancedUserPreferencesService.getAdvancedPreferences(userId);
      }
      const snapshot: ConfigurationSnapshot = {
        companyId,
        userId,
        timestamp: new Date(),
        configurations: {
          companyBasic,
          companyAdvanced,
          userBasic,
          userAdvanced
        },
        metadata: {
          version: '1.0.0',
          compatibilityLevel: 1,
          checksum: this.calculateChecksum({ companyBasic, companyAdvanced, userBasic, userAdvanced })
        }
      };
      // Cachear snapshot
      if (useCache) {
        await this.cacheService.set(cacheKey, snapshot, this.CACHE_TTL);
      }
      this.logger.info('Configuration snapshot created', { 
        companyId, 
        userId, 
        checksum: snapshot.metadata.checksum 
      });
      this.emit('snapshotCreated', { snapshot });
      return snapshot;
    } catch (error) {
      this.logger.error('Error creating configuration snapshot', {
        error: error.message,
        companyId,
        userId
      });
      throw error;
    }
  }
  /**
   * Validar configuraciones completas
   */
  async validateConfiguration(
    companyId: string, 
    userId?: string
  ): Promise<ConfigurationValidationResult> {
    try {
      const cacheKey = `${this.VALIDATION_CACHE_PREFIX}${companyId}:${userId || 'company_only'}`;
      const cachedResult = await this.cacheService.get<ConfigurationValidationResult>(cacheKey);
      if (cachedResult) {
        this.logger.debug('Validation result retrieved from cache', { companyId, userId });
        return cachedResult;
      }
      const snapshot = await this.getConfigurationSnapshot(companyId, userId);
      const result = await this.performComprehensiveValidation(snapshot);
      // Cachear resultado por 5 minutos
      await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);
      this.logger.info('Configuration validation completed', {
        companyId,
        userId,
        valid: result.valid,
        errorCount: result.errors.length,
        recommendationCount: result.recommendations.length
      });
      this.emit('configurationValidated', { companyId, userId, result });
      return result;
    } catch (error) {
      this.logger.error('Error validating configuration', {
        error: error.message,
        companyId,
        userId
      });
      throw error;
    }
  }
  /**
   * Sincronizar configuraciones entre usuarios/empresas
   */
  async synchronizeConfiguration(
    sourceCompanyId: string,
    targetCompanyId: string,
    options: ConfigurationSyncOptions
  ): Promise<{
    success: boolean;
    synchronizedSections: string[];
    errors: string[];
    backupId?: string;
  }> {
    try {
      this.logger.info('Starting configuration synchronization', {
        sourceCompanyId,
        targetCompanyId,
        options
      });
      const synchronizedSections: string[] = [];
      const errors: string[] = [];
      let backupId: string | undefined;
      // Crear backup si se solicita
      if (options.createBackup) {
        backupId = await this.createConfigurationBackup(targetCompanyId);
      }
      // Obtener configuración fuente
      const sourceSnapshot = await this.getConfigurationSnapshot(sourceCompanyId);
      // Validar antes de sincronizar si se solicita
      if (options.validateBeforeSync) {
        const validation = await this.validateConfigurationData(sourceSnapshot.configurations);
        if (!validation.valid) {
          throw new AppError(ErrorCode.VALIDATION_ERROR, 'Source configuration validation failed', 400, true, {
            errors: validation.errors
          });
        }
      }
      // Sincronizar configuraciones básicas de empresa
      try {
        await this.companySettingsService.updateGeneralSettings(
          targetCompanyId,
          this.extractCompanyBasicSettings(sourceSnapshot.configurations.companyBasic),
          'system_sync'
        );
        synchronizedSections.push('companyBasic');
      } catch (error) {
        errors.push(`Company basic settings: ${error.message}`);
      }
      // Sincronizar configuraciones avanzadas si se solicita
      if (options.includeAdvancedSettings) {
        try {
          // Sync advanced company settings (multiple calls for different sections)
          const advancedConfig = sourceSnapshot.configurations.companyAdvanced;
          await this.advancedCompanySettingsService.updateBusinessProcessSettings(
            targetCompanyId,
            advancedConfig.businessProcess,
            'system_sync'
          );
          await this.advancedCompanySettingsService.updateSecurityGovernanceSettings(
            targetCompanyId,
            advancedConfig.securityGovernance,
            'system_sync'
          );
          synchronizedSections.push('companyAdvanced');
        } catch (error) {
          errors.push(`Advanced company settings: ${error.message}`);
        }
      }
      // Notificar usuarios si se solicita
      if (options.notifyUsers) {
        this.emit('configurationSynchronized', {
          sourceCompanyId,
          targetCompanyId,
          synchronizedSections,
          timestamp: new Date()
        });
      }
      const result = {
        success: errors.length === 0,
        synchronizedSections,
        errors,
        backupId
      };
      this.logger.info('Configuration synchronization completed', result);
      return result;
    } catch (error) {
      this.logger.error('Error synchronizing configuration', {
        error: error.message,
        sourceCompanyId,
        targetCompanyId
      });
      throw error;
    }
  }
  /**
   * Aplicar template de configuración
   */
  async applyConfigurationTemplate(
    companyId: string,
    templateId: string,
    userId: string,
    overrideExisting: boolean = false
  ): Promise<{
    applied: boolean;
    sections: string[];
    conflicts?: string[];
    backupId?: string;
  }> {
    try {
      const template = await this.getConfigurationTemplate(templateId);
      if (!template) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Configuration template not found', 404);
      }
      this.logger.info('Applying configuration template', {
        companyId,
        templateId,
        userId,
        overrideExisting
      });
      const sections: string[] = [];
      const conflicts: string[] = [];
      let backupId: string | undefined;
      // Crear backup antes de aplicar
      backupId = await this.createConfigurationBackup(companyId, userId);
      // Verificar conflictos si no se permite override
      if (!overrideExisting) {
        const currentSnapshot = await this.getConfigurationSnapshot(companyId, userId);
        const detectedConflicts = this.detectTemplateConflicts(template, currentSnapshot);
        if (detectedConflicts.length > 0) {
          return {
            applied: false,
            sections: [],
            conflicts: detectedConflicts,
            backupId
          };
        }
      }
      // Aplicar configuraciones del template
      if (template.configuration.company) {
        await this.applyCompanyTemplate(companyId, template.configuration.company, userId);
        sections.push('company');
      }
      if (template.configuration.user && userId) {
        await this.applyUserTemplate(userId, template.configuration.user);
        sections.push('user');
      }
      // Invalidar caches
      await this.invalidateConfigurationCaches(companyId, userId);
      this.emit('templateApplied', {
        companyId,
        userId,
        templateId,
        sections,
        timestamp: new Date()
      });
      this.logger.info('Configuration template applied successfully', {
        companyId,
        userId,
        templateId,
        sections
      });
      return {
        applied: true,
        sections,
        backupId
      };
    } catch (error) {
      this.logger.error('Error applying configuration template', {
        error: error.message,
        companyId,
        templateId,
        userId
      });
      throw error;
    }
  }
  /**
   * Crear backup de configuración
   */
  async createConfigurationBackup(
    companyId: string, 
    userId?: string, 
    reason: string = 'manual_backup'
  ): Promise<string> {
    try {
      const snapshot = await this.getConfigurationSnapshot(companyId, userId, false);
      const backupId = this.generateBackupId(companyId, userId);
      const backupData = {
        id: backupId,
        createdAt: new Date(),
        reason,
        snapshot
      };
      // Guardar backup en cache con TTL largo (7 días)
      const backupKey = `config_backup:${backupId}`;
      await this.cacheService.set(backupKey, backupData, 7 * 24 * 60 * 60 * 1000);
      this.logger.info('Configuration backup created', {
        backupId,
        companyId,
        userId,
        reason
      });
      return backupId;
    } catch (error) {
      this.logger.error('Error creating configuration backup', {
        error: error.message,
        companyId,
        userId
      });
      throw error;
    }
  }
  /**
   * Restaurar desde backup
   */
  async restoreFromBackup(
    backupId: string, 
    requestingUserId: string
  ): Promise<{
    restored: boolean;
    restoredSections: string[];
  }> {
    try {
      const backupKey = `config_backup:${backupId}`;
      const backupData = await this.cacheService.get(backupKey);
      if (!backupData) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Backup not found or expired', 404);
      }
      this.logger.info('Starting configuration restoration', {
        backupId,
        requestingUserId
      });
      const restoredSections: string[] = [];
      const snapshot = backupData.snapshot as ConfigurationSnapshot;
      // Restaurar configuraciones de empresa
      if (snapshot.configurations.companyBasic) {
        await this.restoreCompanyConfiguration(
          snapshot.companyId, 
          snapshot.configurations.companyBasic,
          snapshot.configurations.companyAdvanced,
          requestingUserId
        );
        restoredSections.push('company');
      }
      // Restaurar preferencias de usuario
      if (snapshot.userId && snapshot.configurations.userBasic) {
        await this.restoreUserConfiguration(
          snapshot.userId,
          snapshot.configurations.userBasic,
          snapshot.configurations.userAdvanced
        );
        restoredSections.push('user');
      }
      // Invalidar caches
      await this.invalidateConfigurationCaches(snapshot.companyId, snapshot.userId);
      this.emit('configurationRestored', {
        backupId,
        companyId: snapshot.companyId,
        userId: snapshot.userId,
        restoredSections,
        requestingUserId,
        timestamp: new Date()
      });
      this.logger.info('Configuration restoration completed', {
        backupId,
        restoredSections,
        requestingUserId
      });
      return {
        restored: true,
        restoredSections
      };
    } catch (error) {
      this.logger.error('Error restoring configuration from backup', {
        error: error.message,
        backupId,
        requestingUserId
      });
      throw error;
    }
  }
  /**
   * Obtener diferencias entre configuraciones
   */
  async compareConfigurations(
    snapshot1: ConfigurationSnapshot,
    snapshot2: ConfigurationSnapshot
  ): Promise<ConfigurationDiff[]> {
    try {
      const diffs: ConfigurationDiff[] = [];
      // Comparar configuraciones básicas de empresa
      const companyBasicDiffs = this.deepCompare(
        'companyBasic',
        snapshot1.configurations.companyBasic,
        snapshot2.configurations.companyBasic
      );
      if (companyBasicDiffs.changes.length > 0) {
        diffs.push(companyBasicDiffs);
      }
      // Comparar configuraciones avanzadas de empresa
      const companyAdvancedDiffs = this.deepCompare(
        'companyAdvanced',
        snapshot1.configurations.companyAdvanced,
        snapshot2.configurations.companyAdvanced
      );
      if (companyAdvancedDiffs.changes.length > 0) {
        diffs.push(companyAdvancedDiffs);
      }
      // Comparar preferencias básicas de usuario
      if (snapshot1.configurations.userBasic && snapshot2.configurations.userBasic) {
        const userBasicDiffs = this.deepCompare(
          'userBasic',
          snapshot1.configurations.userBasic,
          snapshot2.configurations.userBasic
        );
        if (userBasicDiffs.changes.length > 0) {
          diffs.push(userBasicDiffs);
        }
      }
      // Comparar preferencias avanzadas de usuario
      if (snapshot1.configurations.userAdvanced && snapshot2.configurations.userAdvanced) {
        const userAdvancedDiffs = this.deepCompare(
          'userAdvanced',
          snapshot1.configurations.userAdvanced,
          snapshot2.configurations.userAdvanced
        );
        if (userAdvancedDiffs.changes.length > 0) {
          diffs.push(userAdvancedDiffs);
        }
      }
      return diffs;
    } catch (error) {
      this.logger.error('Error comparing configurations', { error: error.message });
      throw error;
    }
  }
  // Private Methods
  private setupEventListeners(): void {
    // Escuchar cambios en servicios individuales para invalidar caches
    this.companySettingsService?.on?.('settingsUpdated', ({ companyId }) => {
      this.invalidateConfigurationCaches(companyId);
    });
    this.advancedCompanySettingsService?.on?.('settingsUpdated', ({ companyId }) => {
      this.invalidateConfigurationCaches(companyId);
    });
  }
  private async performComprehensiveValidation(
    snapshot: ConfigurationSnapshot
  ): Promise<ConfigurationValidationResult> {
    const errors: any[] = [];
    const recommendations: any[] = [];
    // Validar configuraciones de empresa
    this.validateCompanySettings(snapshot.configurations.companyBasic, errors, recommendations);
    this.validateAdvancedCompanySettings(snapshot.configurations.companyAdvanced, errors, recommendations);
    // Validar preferencias de usuario si existen
    if (snapshot.configurations.userBasic) {
      this.validateUserPreferences(snapshot.configurations.userBasic, errors, recommendations);
    }
    // Validar consistencia entre configuraciones
    this.validateConfigurationConsistency(snapshot.configurations, errors, recommendations);
    return {
      valid: errors.length === 0,
      errors,
      recommendations
    };
  }
  private validateCompanySettings(settings: any, errors: any[], recommendations: any[]): void {
    // Validación básica de configuraciones de empresa
    if (settings.security?.sessionTimeout < 5) {
      errors.push({
        type: 'error',
        section: 'company.security',
        field: 'sessionTimeout',
        message: 'Session timeout too short (minimum 5 minutes)',
        code: 'SESSION_TIMEOUT_TOO_SHORT'
      });
    }
    if (!settings.security?.passwordPolicy?.requireUppercase && 
        !settings.security?.passwordPolicy?.requireNumbers) {
      recommendations.push({
        section: 'company.security',
        action: 'Enable uppercase and number requirements for passwords',
        reason: 'Improves password security',
        priority: 'medium'
      });
    }
  }
  private validateAdvancedCompanySettings(settings: any, errors: any[], recommendations: any[]): void {
    // Validación de configuraciones avanzadas
    if (settings.securityGovernance?.monitoring?.enableAuditLogging === false) {
      recommendations.push({
        section: 'company.advanced.security',
        action: 'Enable audit logging',
        reason: 'Required for compliance and security monitoring',
        priority: 'high'
      });
    }
  }
  private validateUserPreferences(preferences: any, errors: any[], recommendations: any[]): void {
    // Validación de preferencias de usuario
    if (preferences.preferences?.dashboard?.refreshInterval < 30) {
      errors.push({
        type: 'warning',
        section: 'user.preferences',
        field: 'refreshInterval',
        message: 'Refresh interval too short, may impact performance',
        code: 'REFRESH_TOO_FREQUENT'
      });
    }
  }
  private validateConfigurationConsistency(configurations: any, errors: any[], recommendations: any[]): void {
    // Validar consistencia entre configuraciones de empresa y usuario
    const companyTimezone = configurations.companyBasic?.timezone;
    const userTimezone = configurations.userBasic?.preferences?.timezone;
    if (companyTimezone && userTimezone && companyTimezone !== userTimezone) {
      recommendations.push({
        section: 'consistency',
        action: 'Consider aligning user timezone with company timezone',
        reason: 'Reduces confusion in scheduling and reporting',
        priority: 'low'
      });
    }
  }
  private calculateChecksum(data: any): string {
    // Implementación simple de checksum
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
  private generateBackupId(companyId: string, userId?: string): string {
    const timestamp = Date.now();
    const suffix = userId ? `_user_${userId}` : '_company_only';
    return `backup_${companyId}${suffix}_${timestamp}`;
  }
  private deepCompare(section: string, obj1: any, obj2: any): ConfigurationDiff {
    const changes: any[] = [];
    const compareObjects = (o1: any, o2: any, path: string = '') => {
      if (typeof o1 !== typeof o2) {
        changes.push({
          path,
          oldValue: o1,
          newValue: o2,
          changeType: 'modified'
        });
        return;
      }
      if (typeof o1 === 'object' && o1 !== null && o2 !== null) {
        const allKeys = new Set([...Object.keys(o1), ...Object.keys(o2)]);
        for (const key of allKeys) {
          const currentPath = path ? `${path}.${key}` : key;
          if (!(key in o1)) {
            changes.push({
              path: currentPath,
              oldValue: undefined,
              newValue: o2[key],
              changeType: 'added'
            });
          } else if (!(key in o2)) {
            changes.push({
              path: currentPath,
              oldValue: o1[key],
              newValue: undefined,
              changeType: 'removed'
            });
          } else {
            compareObjects(o1[key], o2[key], currentPath);
          }
        }
      } else if (o1 !== o2) {
        changes.push({
          path,
          oldValue: o1,
          newValue: o2,
          changeType: 'modified'
        });
      }
    };
    compareObjects(obj1, obj2);
    return {
      section,
      changes
    };
  }
  private async invalidateConfigurationCaches(companyId: string, userId?: string): Promise<void> {
    const patterns = [
      `${this.SNAPSHOT_CACHE_PREFIX}${companyId}:*`,
      `${this.VALIDATION_CACHE_PREFIX}${companyId}:*`
    ];
    for (const pattern of patterns) {
      try {
        const keys = await this.cacheService.getKeysByPattern?.(pattern) || [];
        if (keys.length > 0) {
          await this.cacheService.deleteMany(keys);
        }
      } catch (error) {
        this.logger.warn('Failed to invalidate cache pattern', { pattern, error: error.message });
      }
    }
  }
  // Placeholder methods for template and restore operations
  private async getConfigurationTemplate(templateId: string): Promise<ConfigurationTemplate | null> {
    // Implementation would retrieve template from database or cache
    return null;
  }
  private extractCompanyBasicSettings(settings: any): any {
    // Extract settings that can be updated via CompanySettingsService
    return {
      name: settings.name,
      description: settings.description,
      timezone: settings.timezone,
      language: settings.language
      // Add other safe-to-update fields
    };
  }
  private detectTemplateConflicts(template: ConfigurationTemplate, snapshot: ConfigurationSnapshot): string[] {
    // Implementation would detect conflicts between template and current config
    return [];
  }
  private async applyCompanyTemplate(companyId: string, template: any, userId: string): Promise<void> {
    // Implementation would apply company template settings
  }
  private async applyUserTemplate(userId: string, template: any): Promise<void> {
    // Implementation would apply user template settings
  }
  private async restoreCompanyConfiguration(companyId: string, basic: any, advanced: any, userId: string): Promise<void> {
    // Implementation would restore company configuration from backup
  }
  private async restoreUserConfiguration(userId: string, basic: any, advanced: any): Promise<void> {
    // Implementation would restore user configuration from backup
  }
  private async validateConfigurationData(configurations: any): Promise<ConfigurationValidationResult> {
    // Implementation would validate configuration data
    return { valid: true, errors: [], recommendations: [] };
  }
}
