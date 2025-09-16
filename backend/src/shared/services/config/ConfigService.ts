/**
 * Configuration Service - Sprint 2
 * Siguiendo lineamientos nivel 2: servicio centralizado de configuración
 * Gestión de configuración con hot-reload y validación
 */
import { injectable } from 'inversify';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import Joi from 'joi';
import { environment, Environment } from '@/shared/services/environment';
import { developmentConfig } from '@/shared/services/environments/development';
import { productionConfig } from '@/shared/services/environments/production';
import { testConfig } from '@/shared/services/environments/test';
import { ILoggerService } from '@/shared/services/logger/LoggerService';

export interface ConfigChangeEvent {
  key: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
}
export interface ConfigOptions {
  enableHotReload?: boolean;
  watchFiles?: string[];
  reloadDebounce?: number;
  validateOnChange?: boolean;
}
@injectable()
export class ConfigService extends EventEmitter {
  private config: Environment;
  private watchers: chokidar.FSWatcher[] = [];
  private reloadDebounceTimer?: NodeJS.Timeout;
  private readonly options: ConfigOptions;
  private configOverrides: Map<string, any> = new Map();
  private configCache: Map<string, any> = new Map();
  constructor(options: ConfigOptions = {},
    @inject(TYPES.LoggerService) private logger: ILoggerService) {
    super();
    this.options = {
      enableHotReload: environment.isDevelopment,
      watchFiles: ['.env', '.env.local', `.env.${environment.nodeEnv}`],
      reloadDebounce: 1000,
      validateOnChange: true,
      ...options,
    };
    this.config = this.loadConfiguration();
    if (this.options.enableHotReload) {
      this.setupHotReload();
    }
  }
  /**
   * Load configuration based on environment
   */
  private loadConfiguration(): Environment {
    const baseConfig = { ...environment };
    // Apply environment-specific overrides
    let envConfig: Partial<Environment> = {};
    switch (environment.nodeEnv) {
      case 'development':
        envConfig = developmentConfig;
        break;
      case 'production':
        envConfig = productionConfig;
        break;
      case 'test':
        envConfig = testConfig;
        break;
    }
    // Merge configurations
    const mergedConfig = this.deepMerge(baseConfig, envConfig);
    // Apply manual overrides
    for (const [key, value] of this.configOverrides) {
      this.setNestedProperty(mergedConfig, key, value);
    }
    return mergedConfig as Environment;
  }
  /**
   * Get configuration value by key
   */
  get<T = any>(key: string, defaultValue?: T): T {
    // Check cache first
    if (this.configCache.has(key)) {
      return this.configCache.get(key);
    }
    const value = this.getNestedProperty(this.config, key) ?? defaultValue;
    // Cache the result
    this.configCache.set(key, value);
    return value;
  }
  /**
   * Set configuration value
   */
  set(key: string, value: any): void {
    const oldValue = this.get(key);
    // Store override
    this.configOverrides.set(key, value);
    // Update configuration
    this.setNestedProperty(this.config, key, value);
    // Clear cache for this key
    this.configCache.delete(key);
    // Emit change event
    this.emit('configChanged', {
      key,
      oldValue,
      newValue: value,
      timestamp: new Date(),
    } as ConfigChangeEvent);
  }
  /**
   * Get all configuration
   */
  getAll(): Environment {
    return { ...this.config };
  }
  /**
   * Validate configuration value
   */
  validate(key: string, schema: Joi.Schema): boolean {
    const value = this.get(key);
    const { error } = schema.validate(value);
    return !error;
  }
  /**
   * Check if configuration key exists
   */
  has(key: string): boolean {
    return this.getNestedProperty(this.config, key) !== undefined;
  }
  /**
   * Get configuration by namespace
   */
  getNamespace(namespace: string): any {
    return this.get(namespace) || {};
  }
  /**
   * Setup hot reload for configuration files
   */
  private setupHotReload(): void {
    if (!this.options.watchFiles || this.options.watchFiles.length === 0) {
      return;
    }
    const filePaths = this.options.watchFiles.map(file => 
      path.resolve(process.cwd(), file)
    );
    filePaths.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        const watcher = chokidar.watch(filePath, {
          persistent: true,
          ignoreInitial: true,
        });
        watcher.on('change', () => this.handleFileChange(filePath));
        this.watchers.push(watcher);
        this.logger.info(`🔄 Watching configuration file: ${filePath}`);
      }
    });
  }
  /**
   * Handle configuration file change
   */
  private handleFileChange(filePath: string): void {
    this.logger.info(`📝 Configuration file changed: ${filePath}`);
    // Debounce reload
    if (this.reloadDebounceTimer) {
      clearTimeout(this.reloadDebounceTimer);
    }
    this.reloadDebounceTimer = setTimeout(() => {
      this.reload();
    }, this.options.reloadDebounce);
  }
  /**
   * Reload configuration
   */
  reload(): void {
    this.logger.info('🔄 Reloading configuration...');
    try {
      // Clear require cache for environment files
      Object.keys(require.cache).forEach(key => {
        if (key.includes('config') || key.includes('.env')) {
          delete require.cache[key];
        }
      });
      // Clear config cache
      this.configCache.clear();
      // Reload configuration
      const oldConfig = { ...this.config };
      this.config = this.loadConfiguration();
      // Find changes
      const changes = this.findChanges(oldConfig, this.config);
      // Emit reload event
      this.emit('configReloaded', {
        changes,
        timestamp: new Date(),
      });
      // Emit individual change events
      changes.forEach(change => {
        this.emit('configChanged', change);
      });
      this.logger.info(`✅ Configuration reloaded with ${changes.length} changes`);
    } catch (error) {
      this.logger.error('❌ Failed to reload configuration:', error);
      this.emit('configReloadError', error);
    }
  }
  /**
   * Find configuration changes
   */
  private findChanges(oldConfig: any, newConfig: any, prefix = ''): ConfigChangeEvent[] {
    const changes: ConfigChangeEvent[] = [];
    const allKeys = new Set([
      ...Object.keys(oldConfig || {}),
      ...Object.keys(newConfig || {}),
    ]);
    for (const key of allKeys) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const oldValue = oldConfig?.[key];
      const newValue = newConfig?.[key];
      if (typeof oldValue === 'object' && typeof newValue === 'object') {
        // Recursively check nested objects
        changes.push(...this.findChanges(oldValue, newValue, fullKey));
      } else if (oldValue !== newValue) {
        changes.push({
          key: fullKey,
          oldValue,
          newValue,
          timestamp: new Date(),
        });
      }
    }
    return changes;
  }
  /**
   * Get nested property from object
   */
  private getNestedProperty(obj: any, key: string): any {
    return key.split('.').reduce((current, part) => current?.[part], obj);
  }
  /**
   * Set nested property in object
   */
  private setNestedProperty(obj: any, key: string, value: any): void {
    const parts = key.split('.');
    const last = parts.pop()!;
    const target = parts.reduce((current, part) => {
      if (!current[part]) {
        current[part] = {};
      }
      return current[part];
    }, obj);
    target[last] = value;
  }
  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    return result;
  }
  /**
   * Export configuration for debugging
   */
  export(): string {
    return JSON.stringify(this.config, this.jsonReplacer, 2);
  }
  /**
   * JSON replacer to handle sensitive data
   */
  private jsonReplacer(key: string, value: any): any {
    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'apiKey'];
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      return '***REDACTED***';
    }
    return value;
  }
  /**
   * Cleanup resources
   */
  dispose(): void {
    // Close file watchers
    this.watchers.forEach(watcher => watcher.close());
    this.watchers = [];
    // Clear timers
    if (this.reloadDebounceTimer) {
      clearTimeout(this.reloadDebounceTimer);
    }
    // Clear caches
    this.configCache.clear();
    this.configOverrides.clear();
    // Remove all listeners
    this.removeAllListeners();
    this.logger.info('🔚 ConfigService disposed');
  }
}
/**
 * Singleton instance
 */
let configServiceInstance: ConfigService | null = null;
/**
 * Get or create ConfigService instance
 */
export function getConfigService(options?: ConfigOptions): ConfigService {
  if (!configServiceInstance) {
    configServiceInstance = new ConfigService(options);
  }
  return configServiceInstance;
}
/**
 * Configuration validation schemas
 */
export const ConfigSchemas = {
  database: Joi.object({
    host: Joi.string().required(),
    port: Joi.number().port().required(),
    database: Joi.string().required(),
    user: Joi.string().required(),
    password: Joi.string().required(),
  }),
  jwt: Joi.object({
    secret: Joi.string().min(32).required(),
    expiresIn: Joi.string().required(),
  }),
  email: Joi.object({
    enabled: Joi.boolean().required(),
    from: Joi.string().email().when('enabled', {
      is: true,
      then: Joi.required(),
    }),
  }),
  redis: Joi.object({
    host: Joi.string().required(),
    port: Joi.number().port().required(),
  }),
};
