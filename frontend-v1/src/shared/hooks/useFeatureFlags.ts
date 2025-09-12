/**
 * useFeatureFlags Hook - Sprint 2
 * Siguiendo lineamientos nivel 2: Hook para evaluación batch de múltiples feature flags
 * Optimizado para reducir llamadas de red y mejorar performance con evaluación masiva
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { featureFlagService } from '@/shared/services/featureFlagService';
import { useNotification } from './useNotification';

// Types - Principio de Responsabilidad Única
interface FeatureFlagsResult {
  flags: Record<string, boolean>;
  configs: Record<string, FeatureFlagConfig>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshFlag: (flagName: string) => Promise<void>;
  isEnabled: (flagName: string) => boolean;
  getConfig: (flagName: string) => FeatureFlagConfig | null;
  getMetadata: (flagName: string) => Record<string, any>;
}

interface FeatureFlagConfig {
  enabled: boolean;
  rolloutPercentage?: number;
  targetRoles?: string[];
  targetCompanies?: string[];
  metadata?: Record<string, any>;
  conditions?: Array<{
    type: string;
    operator: string;
    value: any;
    attribute?: string;
  }>;
}

interface BatchEvaluationResponse {
  success: boolean;
  data: {
    flags: Record<string, {
      enabled: boolean;
      config: FeatureFlagConfig;
    }>;
    evaluationContext: Record<string, any>;
  };
  message?: string;
}

interface FlagCacheEntry {
  value: boolean;
  config: FeatureFlagConfig;
  timestamp: number;
  contextHash: string;
}

/**
 * Clase para gestión de cache batch de feature flags
 * Patrón Singleton para mantener consistencia global
 */
class BatchFeatureFlagCache {
  private static instance: BatchFeatureFlagCache;
  private batchCache = new Map<string, Map<string, FlagCacheEntry>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos

  static getInstance(): BatchFeatureFlagCache {
    if (!BatchFeatureFlagCache.instance) {
      BatchFeatureFlagCache.instance = new BatchFeatureFlagCache();
    }
    return BatchFeatureFlagCache.instance;
  }

  /**
   * Genera hash del contexto de evaluación
   * @param {string} userId - ID del usuario
   * @param {string} companyId - ID de la empresa
   * @param {string} role - Rol del usuario
   * @returns {string} Hash del contexto
   */
  private generateContextHash(userId?: string, companyId?: string, role?: string): string {
    return btoa(`${userId || 'anon'}:${companyId || 'no-company'}:${role || 'no-role'}`);
  }

  /**
   * Genera clave única para el batch cache
   * @param {string[]} flagNames - Lista de nombres de flags
   * @param {string} contextHash - Hash del contexto
   * @returns {string} Clave del batch
   */
  private generateBatchKey(flagNames: string[], contextHash: string): string {
    const sortedFlags = [...flagNames].sort();
    return `batch:${sortedFlags.join(',')}:${contextHash}`;
  }

  /**
   * Obtiene flags del cache si están vigentes
   * @param {string[]} flagNames - Nombres de los flags
   * @param {string} userId - ID del usuario
   * @param {string} companyId - ID de la empresa
   * @param {string} role - Rol del usuario
   * @returns {Record<string, FlagCacheEntry> | null} Flags del cache o null
   */
  getBatch(
    flagNames: string[], 
    userId?: string, 
    companyId?: string, 
    role?: string
  ): Record<string, FlagCacheEntry> | null {
    const contextHash = this.generateContextHash(userId, companyId, role);
    const batchKey = this.generateBatchKey(flagNames, contextHash);
    
    const batch = this.batchCache.get(batchKey);
    if (!batch) return null;

    // Verificar TTL de todos los flags
    const now = Date.now();
    for (const [flagName, entry] of batch.entries()) {
      if (now - entry.timestamp > this.DEFAULT_TTL) {
        this.batchCache.delete(batchKey);
        return null;
      }
    }

    // Verificar que tenemos todos los flags solicitados
    const hasAllFlags = flagNames.every(flag => batch.has(flag));
    if (!hasAllFlags) return null;

    const result: Record<string, FlagCacheEntry> = {};
    for (const flagName of flagNames) {
      const entry = batch.get(flagName);
      if (entry) {
        result[flagName] = entry;
      }
    }

    return result;
  }

  /**
   * Establece batch de flags en el cache
   * @param {string[]} flagNames - Nombres de los flags
   * @param {Record<string, any>} flagsData - Datos de los flags
   * @param {string} userId - ID del usuario
   * @param {string} companyId - ID de la empresa
   * @param {string} role - Rol del usuario
   */
  setBatch(
    flagNames: string[],
    flagsData: Record<string, { enabled: boolean; config: FeatureFlagConfig }>,
    userId?: string,
    companyId?: string,
    role?: string
  ): void {
    const contextHash = this.generateContextHash(userId, companyId, role);
    const batchKey = this.generateBatchKey(flagNames, contextHash);
    
    const batch = new Map<string, FlagCacheEntry>();
    const now = Date.now();
    
    for (const [flagName, data] of Object.entries(flagsData)) {
      batch.set(flagName, {
        value: data.enabled,
        config: data.config,
        timestamp: now,
        contextHash
      });
    }
    
    this.batchCache.set(batchKey, batch);
  }

  /**
   * Invalida cache para flags específicos
   * @param {string[]} flagNames - Nombres de los flags (opcional)
   */
  invalidate(flagNames?: string[]): void {
    if (!flagNames || flagNames.length === 0) {
      this.batchCache.clear();
      return;
    }

    const keysToDelete: string[] = [];
    for (const batchKey of this.batchCache.keys()) {
      const keyFlags = batchKey.split(':')[1];
      const hasAnyFlag = flagNames.some(flag => keyFlags.includes(flag));
      if (hasAnyFlag) {
        keysToDelete.push(batchKey);
      }
    }
    
    keysToDelete.forEach(key => this.batchCache.delete(key));
  }

  /**
   * Obtiene estadísticas del cache
   * @returns {Object} Estadísticas del cache
   */
  getStats(): {
    batchCount: number;
    totalFlags: number;
    avgFlagsPerBatch: number;
    oldestEntry: number;
  } {
    let totalFlags = 0;
    let oldestTimestamp = Date.now();
    
    for (const batch of this.batchCache.values()) {
      totalFlags += batch.size;
      for (const entry of batch.values()) {
        if (entry.timestamp < oldestTimestamp) {
          oldestTimestamp = entry.timestamp;
        }
      }
    }
    
    return {
      batchCount: this.batchCache.size,
      totalFlags,
      avgFlagsPerBatch: this.batchCache.size > 0 ? totalFlags / this.batchCache.size : 0,
      oldestEntry: Date.now() - oldestTimestamp
    };
  }
}

/**
 * Hook para evaluación masiva de feature flags
 * Siguiendo principio de Abierto/Cerrado - extensible para nuevos tipos de evaluación
 * @param {string[]} featureNames - Lista de nombres de feature flags
 * @param {Object} options - Opciones de configuración
 * @returns {FeatureFlagsResult} Estado y funciones de los feature flags
 */
export const useFeatureFlags = (
  featureNames: string[],
  options: {
    enableDebug?: boolean;
    fallbackOnError?: boolean;
    staleWhileRevalidate?: boolean;
  } = {}
): FeatureFlagsResult => {
  const {
    enableDebug = false,
    fallbackOnError = false,
    staleWhileRevalidate = true
  } = options;

  const { user, currentCompany } = useAuthStore();
  const { showNotification } = useNotification();
  
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [configs, setConfigs] = useState<Record<string, FeatureFlagConfig>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const cache = useRef(BatchFeatureFlagCache.getInstance());
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Evalúa múltiples feature flags en una sola llamada
   * Principio de Responsabilidad Única - solo evaluación batch
   * @returns {Promise<void>}
   */
  const evaluateFeatureFlags = useCallback(async (): Promise<void> => {
    if (!featureNames || featureNames.length === 0) {
      setFlags({});
      setConfigs({});
      setError(null);
      setIsLoading(false);
      return;
    }

    // Validar nombres de flags
    const validFlags = featureNames.filter(name => name && name.trim());
    if (validFlags.length !== featureNames.length) {
      const invalidFlags = featureNames.filter(name => !name || !name.trim());
      setError(`Feature flags inválidos: ${invalidFlags.join(', ')}`);
      setIsLoading(false);
      return;
    }

    // Verificar cache primero
    const cachedResults = cache.current.getBatch(
      validFlags,
      user?.id,
      currentCompany?.id,
      currentCompany?.role
    );

    if (cachedResults && Object.keys(cachedResults).length === validFlags.length) {
      const cachedFlags: Record<string, boolean> = {};
      const cachedConfigs: Record<string, FeatureFlagConfig> = {};
      
      for (const [flagName, entry] of Object.entries(cachedResults)) {
        cachedFlags[flagName] = entry.value;
        cachedConfigs[flagName] = entry.config;
      }
      
      setFlags(cachedFlags);
      setConfigs(cachedConfigs);
      setError(null);
      setIsLoading(false);
      
      if (enableDebug) {
        console.log('[FeatureFlags] Loaded from cache:', cachedFlags);
      }
      return;
    }

    // Si tenemos datos en cache pero no completos, usar stale-while-revalidate
    if (staleWhileRevalidate && cachedResults && Object.keys(cachedResults).length > 0) {
      const staleFlags: Record<string, boolean> = {};
      const staleConfigs: Record<string, FeatureFlagConfig> = {};
      
      for (const [flagName, entry] of Object.entries(cachedResults)) {
        staleFlags[flagName] = entry.value;
        staleConfigs[flagName] = entry.config;
      }
      
      setFlags(staleFlags);
      setConfigs(staleConfigs);
      setIsLoading(false);
      
      if (enableDebug) {
        console.log('[FeatureFlags] Using stale data while revalidating');
      }
    } else {
      setIsLoading(true);
    }

    setError(null);

    // Cancelar solicitudes anteriores
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

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

      const response: BatchEvaluationResponse = await featureFlagService.evaluateMultipleFlags(
        validFlags,
        evaluationContext,
        { signal: abortControllerRef.current.signal }
      );

      if (response.success && response.data?.flags) {
        const evaluatedFlags: Record<string, boolean> = {};
        const evaluatedConfigs: Record<string, FeatureFlagConfig> = {};
        
        // Procesar cada flag con lógica de rollout
        for (const [flagName, flagData] of Object.entries(response.data.flags)) {
          const finalValue = applyBatchRolloutLogic(
            flagData.enabled,
            flagData.config,
            flagName,
            user?.id
          );
          
          evaluatedFlags[flagName] = finalValue;
          evaluatedConfigs[flagName] = flagData.config;
        }

        // Guardar en cache
        cache.current.setBatch(
          validFlags,
          response.data.flags,
          user?.id,
          currentCompany?.id,
          currentCompany?.role
        );

        setFlags(evaluatedFlags);
        setConfigs(evaluatedConfigs);

        if (enableDebug) {
          console.log('[FeatureFlags] Batch evaluation completed:', {
            flags: evaluatedFlags,
            context: evaluationContext
          });
        }
      } else {
        throw new Error(response.message || 'Error evaluando feature flags');
      }
    } catch (error: any) {
      // No procesar si fue cancelado
      if (error.name === 'AbortError') {
        return;
      }

      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error evaluando feature flags';
      
      if (enableDebug) {
        console.error('[FeatureFlags] Batch evaluation error:', error);
      }

      setError(errorMessage);
      
      // Usar valores de fallback si está habilitado
      if (fallbackOnError) {
        const fallbackFlags: Record<string, boolean> = {};
        const fallbackConfigs: Record<string, FeatureFlagConfig> = {};
        
        validFlags.forEach(flag => {
          fallbackFlags[flag] = false;
          fallbackConfigs[flag] = { enabled: false };
        });
        
        setFlags(fallbackFlags);
        setConfigs(fallbackConfigs);
      }

      // Mostrar notificación solo en desarrollo o debug
      if (enableDebug || import.meta.env.DEV) {
        showNotification({
          type: 'warning',
          title: 'Feature Flags Error',
          message: `Error evaluando flags: ${errorMessage}`,
          autoClose: true,
          duration: 3000
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [featureNames, user, currentCompany, enableDebug, fallbackOnError, staleWhileRevalidate, showNotification]);

  /**
   * Aplica lógica de rollout para evaluación batch
   * @param {boolean} baseEnabled - Estado base del flag
   * @param {FeatureFlagConfig} config - Configuración del flag
   * @param {string} flagName - Nombre del flag
   * @param {string} userId - ID del usuario
   * @returns {boolean} Valor final después del rollout
   */
  const applyBatchRolloutLogic = (
    baseEnabled: boolean,
    config: FeatureFlagConfig,
    flagName: string,
    userId?: string
  ): boolean => {
    if (!baseEnabled) return false;

    // Rollout por porcentaje con hash consistente
    if (config.rolloutPercentage !== undefined && config.rolloutPercentage < 100) {
      if (!userId) return false;
      
      const hash = hashString(`${userId}:${flagName}`);
      const percentage = hash % 100;
      
      if (percentage >= config.rolloutPercentage) {
        return false;
      }
    }

    return baseEnabled;
  };

  /**
   * Refresca todos los feature flags
   * @returns {Promise<void>}
   */
  const refresh = useCallback(async (): Promise<void> => {
    cache.current.invalidate(featureNames);
    await evaluateFeatureFlags();
  }, [featureNames, evaluateFeatureFlags]);

  /**
   * Refresca un feature flag específico
   * @param {string} flagName - Nombre del flag a refrescar
   * @returns {Promise<void>}
   */
  const refreshFlag = useCallback(async (flagName: string): Promise<void> => {
    cache.current.invalidate([flagName]);
    await evaluateFeatureFlags();
  }, [evaluateFeatureFlags]);

  /**
   * Verifica si un feature flag está habilitado
   * @param {string} flagName - Nombre del flag
   * @returns {boolean} Estado del flag
   */
  const isEnabled = useCallback((flagName: string): boolean => {
    return flags[flagName] || false;
  }, [flags]);

  /**
   * Obtiene la configuración de un feature flag
   * @param {string} flagName - Nombre del flag
   * @returns {FeatureFlagConfig | null} Configuración del flag
   */
  const getConfig = useCallback((flagName: string): FeatureFlagConfig | null => {
    return configs[flagName] || null;
  }, [configs]);

  /**
   * Obtiene los metadatos de un feature flag
   * @param {string} flagName - Nombre del flag
   * @returns {Record<string, any>} Metadatos del flag
   */
  const getMetadata = useCallback((flagName: string): Record<string, any> => {
    const config = configs[flagName];
    return config?.metadata || {};
  }, [configs]);

  // Effect para evaluar al montar y cuando cambie el contexto
  useEffect(() => {
    evaluateFeatureFlags();

    // Cleanup al desmontar
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [evaluateFeatureFlags]);

  return {
    flags,
    configs,
    isLoading,
    error,
    refresh,
    refreshFlag,
    isEnabled,
    getConfig,
    getMetadata
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

export default useFeatureFlags;