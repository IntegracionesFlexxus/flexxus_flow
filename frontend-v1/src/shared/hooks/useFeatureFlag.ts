/**
 * useFeatureFlag Hook - Sprint 2
 * Siguiendo lineamientos nivel 2: Sistema de feature flags con caching y evaluación dinámica
 * Hook principal para evaluación individual de feature flags con gestión de cache TTL
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { useUIStore } from '@/shared/store/uiStore';
import { featureFlagService } from '@/shared/services/featureFlagService';

// Types - Siguiendo principio de Responsabilidad Única
interface FeatureFlagConfig {
  enabled: boolean;
  rolloutPercentage?: number;
  targetRoles?: string[];
  targetCompanies?: string[];
  metadata?: Record<string, any>;
  conditions?: FeatureFlagCondition[];
}

interface FeatureFlagCondition {
  type: 'user_attribute' | 'company_plan' | 'date_range' | 'custom';
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
  attribute?: string;
}

interface UseFeatureFlagResult {
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  config: FeatureFlagConfig | null;
  refresh: () => Promise<void>;
  metadata: Record<string, any>;
}

interface CacheEntry {
  value: boolean;
  config: FeatureFlagConfig | null;
  timestamp: number;
  evaluationContext: string;
}

// Cache global - patrón Singleton para gestión de cache
class FeatureFlagCache {
  private static instance: FeatureFlagCache;
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos

  static getInstance(): FeatureFlagCache {
    if (!FeatureFlagCache.instance) {
      FeatureFlagCache.instance = new FeatureFlagCache();
    }
    return FeatureFlagCache.instance;
  }

  /**
   * Genera clave de cache con contexto de usuario/empresa
   * @param {string} flagName - Nombre del feature flag
   * @param {string} userId - ID del usuario
   * @param {string} companyId - ID de la empresa
   * @returns {string} Clave única para el cache
   */
  private generateCacheKey(flagName: string, userId?: string, companyId?: string): string {
    return `${flagName}:${userId || 'anonymous'}:${companyId || 'no-company'}`;
  }

  /**
   * Genera contexto de evaluación para invalidación de cache
   * @param {string} userId - ID del usuario
   * @param {string} companyId - ID de la empresa
   * @param {string} role - Rol del usuario
   * @returns {string} Hash del contexto
   */
  private generateEvaluationContext(userId?: string, companyId?: string, role?: string): string {
    return btoa(`${userId}-${companyId}-${role}`);
  }

  /**
   * Obtiene valor del cache si es válido
   * @param {string} flagName - Nombre del feature flag
   * @param {string} userId - ID del usuario
   * @param {string} companyId - ID de la empresa
   * @param {string} role - Rol del usuario
   * @returns {CacheEntry | null} Entrada de cache válida o null
   */
  get(flagName: string, userId?: string, companyId?: string, role?: string): CacheEntry | null {
    const key = this.generateCacheKey(flagName, userId, companyId);
    const entry = this.cache.get(key);
    
    if (!entry) return null;

    // Verificar TTL
    if (Date.now() - entry.timestamp > this.DEFAULT_TTL) {
      this.cache.delete(key);
      return null;
    }

    // Verificar si el contexto ha cambiado (cambio de rol/empresa)
    const currentContext = this.generateEvaluationContext(userId, companyId, role);
    if (entry.evaluationContext !== currentContext) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * Establece valor en el cache
   * @param {string} flagName - Nombre del feature flag
   * @param {boolean} value - Valor del flag
   * @param {FeatureFlagConfig | null} config - Configuración del flag
   * @param {string} userId - ID del usuario
   * @param {string} companyId - ID de la empresa
   * @param {string} role - Rol del usuario
   */
  set(
    flagName: string, 
    value: boolean, 
    config: FeatureFlagConfig | null,
    userId?: string, 
    companyId?: string, 
    role?: string
  ): void {
    const key = this.generateCacheKey(flagName, userId, companyId);
    const evaluationContext = this.generateEvaluationContext(userId, companyId, role);
    
    this.cache.set(key, {
      value,
      config,
      timestamp: Date.now(),
      evaluationContext
    });
  }

  /**
   * Invalida cache para un flag específico o todo el cache
   * @param {string} flagName - Nombre del flag (opcional)
   */
  invalidate(flagName?: string): void {
    if (flagName) {
      // Invalidar solo entradas que coincidan con el flag
      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${flagName}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      // Limpiar todo el cache
      this.cache.clear();
    }
  }

  /**
   * Obtiene estadísticas del cache
   * @returns {Object} Estadísticas del cache
   */
  getStats(): { size: number; entries: Array<{ key: string; age: number }> } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp
    }));

    return {
      size: this.cache.size,
      entries
    };
  }
}

/**
 * Hook principal para evaluación de feature flags
 * Implementa patrón Strategy para diferentes tipos de evaluación
 * @param {string} featureName - Nombre del feature flag
 * @param {Object} options - Opciones de configuración
 * @returns {UseFeatureFlagResult} Estado y funciones del feature flag
 */
export const useFeatureFlag = (
  featureName: string,
  options: {
    defaultValue?: boolean;
    fallbackOnError?: boolean;
    enableDebug?: boolean;
  } = {}
): UseFeatureFlagResult => {
  const { 
    defaultValue = false, 
    fallbackOnError = false,
    enableDebug = false 
  } = options;

  const { user, currentCompany } = useAuthStore();
  const { addNotification } = useUIStore();
  
  const [isEnabled, setIsEnabled] = useState<boolean>(defaultValue);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<FeatureFlagConfig | null>(null);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  
  const cache = useRef(FeatureFlagCache.getInstance());
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Evalúa el feature flag con lógica de negocio
   * Principio de Responsabilidad Única - solo evaluación
   * @returns {Promise<void>}
   */
  const evaluateFeatureFlag = useCallback(async (): Promise<void> => {
    if (!featureName || !featureName.trim()) {
      setError('Nombre de feature flag inválido');
      setIsEnabled(defaultValue);
      setIsLoading(false);
      return;
    }

    // Verificar cache primero
    const cachedResult = cache.current.get(
      featureName,
      user?.id,
      currentCompany?.id,
      currentCompany?.role
    );

    if (cachedResult) {
      setIsEnabled(cachedResult.value);
      setConfig(cachedResult.config);
      setMetadata(cachedResult.config?.metadata || {});
      setError(null);
      setIsLoading(false);
      
      if (enableDebug) {
        console.log(`[FeatureFlag] ${featureName} from cache:`, cachedResult.value);
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    // Cancelar solicitudes anteriores solo si han pasado más de 100ms
    // Esto evita cancelaciones en re-renders rápidos
    const previousController = abortControllerRef.current;
    const newController = new AbortController();
    abortControllerRef.current = newController;
    
    // Cancelar el anterior después de un pequeño delay para evitar cancelaciones prematuras
    if (previousController) {
      setTimeout(() => {
        previousController.abort();
      }, 100);
    }

    try {
      const evaluationContext = {
        userId: user?.id,
        companyId: currentCompany?.id,
        userRole: currentCompany?.role,
        companyPlan: currentCompany?.plan,
        userAttributes: {
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          preferences: user?.preferences
        }
      };

      const response = await featureFlagService.evaluateFlag(
        featureName,
        evaluationContext,
        { signal: newController.signal }
      );

      if (response.success) {
        const flagEnabled = response.data.enabled;
        const flagConfig = response.data.config;

        // Aplicar lógica de rollout si está configurada
        const finalValue = applyRolloutLogic(flagEnabled, flagConfig, user?.id);

        // Guardar en cache
        cache.current.set(
          featureName,
          finalValue,
          flagConfig,
          user?.id,
          currentCompany?.id,
          currentCompany?.role
        );

        setIsEnabled(finalValue);
        setConfig(flagConfig);
        setMetadata(flagConfig?.metadata || {});

        if (enableDebug) {
          console.log(`[FeatureFlag] ${featureName} evaluated:`, {
            enabled: finalValue,
            config: flagConfig,
            context: evaluationContext
          });
        }
      } else {
        throw new Error(response.message || 'Error evaluando feature flag');
      }
    } catch (error: any) {
      // No hacer nada si fue abortado o cancelado
      if (error.name === 'AbortError' || error.message === 'canceled' || error.code === 'ERR_CANCELED') {
        // Usar valor por defecto silenciosamente
        setIsEnabled(defaultValue);
        setIsLoading(false);
        return;
      }

      const errorMessage = error.response?.data?.message || error.message || 'Error evaluando feature flag';
      
      if (enableDebug) {
        console.error(`[FeatureFlag] Error evaluating ${featureName}:`, error);
      }

      setError(errorMessage);
      
      // Usar valor de fallback en caso de error
      const fallbackValue = fallbackOnError ? defaultValue : false;
      setIsEnabled(fallbackValue);
      setConfig(null);
      setMetadata({});

      // Mostrar notificación solo en desarrollo o si está habilitado debug
      // No mostrar notificaciones para errores de red comunes o cancelaciones
      if ((enableDebug || import.meta.env.DEV) && 
          !error.message?.includes('Network') && 
          !error.message?.includes('canceled') &&
          error.code !== 'ERR_CANCELED') {
        addNotification({
          type: 'warning',
          title: 'Feature Flag Error',
          message: `Error evaluando ${featureName}: ${errorMessage}`
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [featureName, user, currentCompany, defaultValue, fallbackOnError, enableDebug, addNotification]);

  /**
   * Aplica lógica de rollout basada en porcentaje
   * Patrón Strategy para diferentes tipos de rollout
   * @param {boolean} baseEnabled - Estado base del flag
   * @param {FeatureFlagConfig} config - Configuración del flag
   * @param {string} userId - ID del usuario para hashing consistente
   * @returns {boolean} Valor final después del rollout
   */
  const applyRolloutLogic = (
    baseEnabled: boolean, 
    config: FeatureFlagConfig | null, 
    userId?: string
  ): boolean => {
    if (!baseEnabled || !config) return baseEnabled;

    // Rollout por porcentaje
    if (config.rolloutPercentage !== undefined && config.rolloutPercentage < 100) {
      if (!userId) return false;

      // Hash consistente basado en userId + featureName
      const hash = hashString(`${userId}:${featureName}`);
      const percentage = hash % 100;
      
      if (percentage >= config.rolloutPercentage) {
        return false;
      }
    }

    // Filtros por rol
    if (config.targetRoles && config.targetRoles.length > 0) {
      const userRole = currentCompany?.role;
      if (!userRole || !config.targetRoles.includes(userRole)) {
        return false;
      }
    }

    // Filtros por empresa
    if (config.targetCompanies && config.targetCompanies.length > 0) {
      const companyId = currentCompany?.id;
      if (!companyId || !config.targetCompanies.includes(companyId)) {
        return false;
      }
    }

    // Evaluación de condiciones personalizadas
    if (config.conditions && config.conditions.length > 0) {
      return evaluateConditions(config.conditions, user, currentCompany);
    }

    return baseEnabled;
  };

  /**
   * Función para refrescar el feature flag manualmente
   * @returns {Promise<void>}
   */
  const refresh = useCallback(async (): Promise<void> => {
    // Invalidar cache para este flag
    cache.current.invalidate(featureName);
    await evaluateFeatureFlag();
  }, [featureName, evaluateFeatureFlag]);

  // Effect para evaluar al montar y cuando cambie el contexto
  useEffect(() => {
    evaluateFeatureFlag();

    // Cleanup al desmontar
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [evaluateFeatureFlag]);

  return {
    isEnabled,
    isLoading,
    error,
    config,
    refresh,
    metadata
  };
};

/**
 * Función auxiliar para generar hash consistente
 * @param {string} str - String a hashear
 * @returns {number} Hash numérico
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Evalúa condiciones personalizadas del feature flag
 * Patrón Strategy para diferentes tipos de condiciones
 * @param {FeatureFlagCondition[]} conditions - Lista de condiciones
 * @param {Object} user - Datos del usuario
 * @param {Object} company - Datos de la empresa
 * @returns {boolean} Resultado de la evaluación
 */
function evaluateConditions(
  conditions: FeatureFlagCondition[], 
  user: any, 
  company: any
): boolean {
  return conditions.every(condition => {
    switch (condition.type) {
      case 'user_attribute':
        return evaluateUserAttribute(condition, user);
      case 'company_plan':
        return evaluateCompanyPlan(condition, company);
      case 'date_range':
        return evaluateDateRange(condition);
      default:
        return true; // Condiciones desconocidas se evalúan como true
    }
  });
}

/**
 * Evalúa condición de atributo de usuario
 * @param {FeatureFlagCondition} condition - Condición a evaluar
 * @param {Object} user - Datos del usuario
 * @returns {boolean} Resultado de la evaluación
 */
function evaluateUserAttribute(condition: FeatureFlagCondition, user: any): boolean {
  if (!condition.attribute || !user) return false;

  const userValue = user[condition.attribute];
  
  switch (condition.operator) {
    case 'equals':
      return userValue === condition.value;
    case 'not_equals':
      return userValue !== condition.value;
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(userValue);
    case 'not_in':
      return Array.isArray(condition.value) && !condition.value.includes(userValue);
    default:
      return false;
  }
}

/**
 * Evalúa condición de plan de empresa
 * @param {FeatureFlagCondition} condition - Condición a evaluar
 * @param {Object} company - Datos de la empresa
 * @returns {boolean} Resultado de la evaluación
 */
function evaluateCompanyPlan(condition: FeatureFlagCondition, company: any): boolean {
  if (!company?.plan) return false;
  
  switch (condition.operator) {
    case 'equals':
      return company.plan === condition.value;
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(company.plan);
    default:
      return false;
  }
}

/**
 * Evalúa condición de rango de fechas
 * @param {FeatureFlagCondition} condition - Condición a evaluar
 * @returns {boolean} Resultado de la evaluación
 */
function evaluateDateRange(condition: FeatureFlagCondition): boolean {
  const now = new Date();
  const conditionDate = new Date(condition.value);
  
  switch (condition.operator) {
    case 'greater_than':
      return now > conditionDate;
    case 'less_than':
      return now < conditionDate;
    default:
      return false;
  }
}

export default useFeatureFlag;