/**
 * Rate Limit Configuration Service - Sprint 2
 * Siguiendo lineamientos nivel 2: configuración dinámica y flexible
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { RateLimitConfig, rateLimitRules } from '@/config/rateLimiting';
import { environment } from '@/config/environment';

export interface EndpointRateLimitConfig {
  path: string;
  method?: string;
  config: RateLimitConfig;
  conditions?: {
    userRole?: string[];
    companyPlan?: string[];
    authenticated?: boolean;
  };
}

export interface UserRateLimitRule {
  userId?: string;
  userRole?: string;
  companyId?: string;
  companyPlan?: string;
  config: RateLimitConfig;
  priority: number; // Mayor número = mayor prioridad
}

export interface DynamicRateLimitRule {
  name: string;
  condition: (req: any) => boolean;
  config: RateLimitConfig;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@injectable()
export class RateLimitConfigService {
  private endpointConfigs: Map<string, EndpointRateLimitConfig[]> = new Map();
  private userRules: UserRateLimitRule[] = [];
  private dynamicRules: DynamicRateLimitRule[] = [];
  private configCache: Map<string, { config: RateLimitConfig; timestamp: number }> = new Map();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutos

  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.initializeDefaultConfigs();
    this.logger.info('Rate limit configuration service initialized');
  }

  /**
   * Obtiene la configuración de rate limiting para una request específica
   */
  getConfigForRequest(req: any): RateLimitConfig {
    const cacheKey = this.generateCacheKey(req);
    const cached = this.configCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.config;
    }

    const config = this.calculateConfigForRequest(req);
    this.configCache.set(cacheKey, { config, timestamp: Date.now() });

    return config;
  }

  /**
   * Registra una configuración específica para un endpoint
   */
  registerEndpointConfig(endpointConfig: EndpointRateLimitConfig): void {
    const key = this.getEndpointKey(endpointConfig.path, endpointConfig.method);

    if (!this.endpointConfigs.has(key)) {
      this.endpointConfigs.set(key, []);
    }

    this.endpointConfigs.get(key)!.push(endpointConfig);
    this.clearCache();

    this.logger.info('Endpoint rate limit config registered', {
      path: endpointConfig.path,
      method: endpointConfig.method,
      maxRequests: endpointConfig.config.max,
      windowMs: endpointConfig.config.windowMs
    });
  }

  /**
   * Registra una regla de rate limiting para usuario específico
   */
  registerUserRule(userRule: UserRateLimitRule): void {
    // Remover reglas existentes con menor prioridad
    this.userRules = this.userRules.filter(rule => {
      const sameTarget = this.isSameUserTarget(rule, userRule);
      return !sameTarget || rule.priority >= userRule.priority;
    });

    this.userRules.push(userRule);
    this.userRules.sort((a, b) => b.priority - a.priority); // Ordenar por prioridad descendente
    this.clearCache();

    this.logger.info('User rate limit rule registered', {
      userId: userRule.userId,
      userRole: userRule.userRole,
      companyId: userRule.companyId,
      priority: userRule.priority,
      maxRequests: userRule.config.max
    });
  }

  /**
   * Registra una regla dinámica de rate limiting
   */
  registerDynamicRule(rule: DynamicRateLimitRule): void {
    const existingIndex = this.dynamicRules.findIndex(r => r.name === rule.name);

    if (existingIndex >= 0) {
      this.dynamicRules[existingIndex] = { ...rule, updatedAt: new Date() };
    } else {
      this.dynamicRules.push({ ...rule, createdAt: new Date(), updatedAt: new Date() });
    }

    this.clearCache();

    this.logger.info('Dynamic rate limit rule registered', {
      name: rule.name,
      enabled: rule.enabled,
      maxRequests: rule.config.max
    });
  }

  /**
   * Obtiene todas las configuraciones de endpoint registradas
   */
  getEndpointConfigs(): Map<string, EndpointRateLimitConfig[]> {
    return new Map(this.endpointConfigs);
  }

  /**
   * Obtiene todas las reglas de usuario
   */
  getUserRules(): UserRateLimitRule[] {
    return [...this.userRules];
  }

  /**
   * Obtiene todas las reglas dinámicas
   */
  getDynamicRules(): DynamicRateLimitRule[] {
    return [...this.dynamicRules];
  }

  /**
   * Elimina una regla dinámica
   */
  removeDynamicRule(name: string): boolean {
    const initialLength = this.dynamicRules.length;
    this.dynamicRules = this.dynamicRules.filter(rule => rule.name !== name);
    this.clearCache();

    const removed = initialLength > this.dynamicRules.length;
    if (removed) {
      this.logger.info('Dynamic rate limit rule removed', { name });
    }

    return removed;
  }

  /**
   * Habilita o deshabilita una regla dinámica
   */
  toggleDynamicRule(name: string, enabled: boolean): boolean {
    const rule = this.dynamicRules.find(r => r.name === name);

    if (rule) {
      rule.enabled = enabled;
      rule.updatedAt = new Date();
      this.clearCache();

      this.logger.info('Dynamic rate limit rule toggled', { name, enabled });
      return true;
    }

    return false;
  }

  /**
   * Limpia la caché de configuraciones
   */
  clearCache(): void {
    this.configCache.clear();
    this.logger.debug('Rate limit config cache cleared');
  }

  /**
   * Obtiene estadísticas de configuración
   */
  getStats() {
    return {
      endpointConfigs: this.endpointConfigs.size,
      userRules: this.userRules.length,
      dynamicRules: this.dynamicRules.length,
      activeRules: this.dynamicRules.filter(r => r.enabled).length,
      cacheSize: this.configCache.size,
      cacheHitRate: this.calculateCacheHitRate()
    };
  }

  /**
   * Calcula la configuración específica para una request
   */
  private calculateConfigForRequest(req: any): RateLimitConfig {
    // 1. Verificar reglas dinámicas (mayor prioridad)
    for (const rule of this.dynamicRules) {
      if (rule.enabled && rule.condition(req)) {
        this.logger.debug('Applied dynamic rate limit rule', {
          name: rule.name,
          path: req.path,
          maxRequests: rule.config.max
        });
        return rule.config;
      }
    }

    // 2. Verificar configuraciones específicas por endpoint
    const endpointKey = this.getEndpointKey(req.path, req.method);
    const endpointConfigs = this.endpointConfigs.get(endpointKey) || [];

    for (const endpointConfig of endpointConfigs) {
      if (this.matchesConditions(req, endpointConfig.conditions)) {
        this.logger.debug('Applied endpoint-specific rate limit', {
          path: req.path,
          method: req.method,
          maxRequests: endpointConfig.config.max
        });
        return endpointConfig.config;
      }
    }

    // 3. Verificar reglas específicas por usuario
    for (const userRule of this.userRules) {
      if (this.matchesUserRule(req, userRule)) {
        this.logger.debug('Applied user-specific rate limit rule', {
          userId: req.user?.id,
          userRole: req.user?.role,
          maxRequests: userRule.config.max
        });
        return userRule.config;
      }
    }

    // 4. Configuración por defecto basada en el contexto
    return this.getDefaultConfig(req);
  }

  /**
   * Verifica si una request coincide con las condiciones de un endpoint
   */
  private matchesConditions(req: any, conditions?: EndpointRateLimitConfig['conditions']): boolean {
    if (!conditions) return true;

    if (conditions.authenticated !== undefined) {
      const isAuthenticated = !!req.user;
      if (conditions.authenticated !== isAuthenticated) return false;
    }

    if (conditions.userRole && req.user?.role) {
      if (!conditions.userRole.includes(req.user.role)) return false;
    }

    if (conditions.companyPlan && req.user?.companyPlan) {
      if (!conditions.companyPlan.includes(req.user.companyPlan)) return false;
    }

    return true;
  }

  /**
   * Verifica si una request coincide con una regla de usuario
   */
  private matchesUserRule(req: any, rule: UserRateLimitRule): boolean {
    if (rule.userId && req.user?.id !== rule.userId) return false;
    if (rule.userRole && req.user?.role !== rule.userRole) return false;
    if (rule.companyId && req.user?.companyId !== rule.companyId) return false;
    if (rule.companyPlan && req.user?.companyPlan !== rule.companyPlan) return false;

    return true;
  }

  /**
   * Obtiene la configuración por defecto basada en el contexto de la request
   */
  private getDefaultConfig(req: any): RateLimitConfig {
    // Determinar el tipo de operación
    if (req.path.startsWith('/auth/')) {
      return rateLimitRules.auth;
    }

    if (req.path.startsWith('/api/admin/')) {
      return rateLimitRules.admin;
    }

    if (req.path.includes('/upload')) {
      return rateLimitRules.upload;
    }

    // Configuración basada en el plan de empresa
    if (req.user?.companyPlan) {
      const planConfig = rateLimitRules.company[req.user.companyPlan as keyof typeof rateLimitRules.company];
      if (planConfig) return planConfig;
    }

    // Usuario autenticado vs no autenticado
    if (req.user) {
      return rateLimitRules.api;
    }

    return rateLimitRules.general;
  }

  /**
   * Inicializa configuraciones por defecto
   */
  private initializeDefaultConfigs(): void {
    // Configuraciones específicas para endpoints críticos
    this.registerEndpointConfig({
      path: '/auth/login',
      method: 'POST',
      config: rateLimitRules.endpoint.login
    });

    this.registerEndpointConfig({
      path: '/auth/register',
      method: 'POST',
      config: rateLimitRules.endpoint.register
    });

    this.registerEndpointConfig({
      path: '/auth/password-reset',
      method: 'POST',
      config: rateLimitRules.endpoint.passwordReset
    });

    this.registerEndpointConfig({
      path: '/auth/refresh-token',
      method: 'POST',
      config: rateLimitRules.endpoint.tokenRefresh
    });

    // Regla dinámica para detección de ataques
    this.registerDynamicRule({
      name: 'suspicious-activity-detector',
      condition: (req) => {
        // Lógica para detectar patrones sospechosos
        const userAgent = req.get('User-Agent') || '';
        const suspiciousPatterns = ['bot', 'crawler', 'script', 'automation'];
        return suspiciousPatterns.some(pattern => userAgent.toLowerCase().includes(pattern));
      },
      config: {
        windowMs: 5 * 60 * 1000, // 5 minutos
        max: 10, // Muy restrictivo para actividad sospechosa
        standardHeaders: true,
        legacyHeaders: false
      },
      enabled: environment.nodeEnv === 'production'
    } as any);

    // Regla para usuarios premium con límites más altos
    this.registerDynamicRule({
      name: 'premium-user-allowance',
      condition: (req) => {
        return req.user?.companyPlan === 'enterprise' && req.user?.role === 'admin';
      },
      config: {
        windowMs: 1 * 60 * 1000, // 1 minuto
        max: 500, // Límite muy alto para usuarios premium
        standardHeaders: true,
        legacyHeaders: false
      },
      enabled: true
    } as any);
  }

  /**
   * Genera clave para caché basada en características de la request
   */
  private generateCacheKey(req: any): string {
    const parts = [
      req.path,
      req.method,
      req.user?.id || 'anonymous',
      req.user?.role || 'none',
      req.user?.companyId || 'none',
      req.user?.companyPlan || 'none'
    ];
    return parts.join('|');
  }

  /**
   * Genera clave para endpoint
   */
  private getEndpointKey(path: string, method?: string): string {
    return method ? `${method.toUpperCase()}:${path}` : path;
  }

  /**
   * Verifica si dos reglas de usuario tienen el mismo objetivo
   */
  private isSameUserTarget(rule1: UserRateLimitRule, rule2: UserRateLimitRule): boolean {
    return rule1.userId === rule2.userId &&
           rule1.userRole === rule2.userRole &&
           rule1.companyId === rule2.companyId &&
           rule1.companyPlan === rule2.companyPlan;
  }

  /**
   * Calcula la tasa de aciertos de caché (simulado)
   */
  private calculateCacheHitRate(): number {
    // En una implementación real, mantendríamos estadísticas de hits/misses
    return 0.75; // 75% como ejemplo
  }
}
