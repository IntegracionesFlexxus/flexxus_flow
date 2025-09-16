/**
 * Feature Flag Service Interface - Sprint 2
 * Siguiendo lineamientos nivel 2: lógica de negocio clara y separación de responsabilidades
 */
import { FeatureFlag } from '@/modules/feature-flags/interfaces/IFeatureFlagRepository';
export interface FeatureFlagEvaluationContext {
  userId: string;
  companyId: string;
  userRole: string;
  environment: string;
  userAttributes?: Record<string, any>;
  deviceInfo?: Record<string, any>;
  ipAddress?: string;
  timestamp?: Date;
}
export interface FeatureFlagEvaluationResult {
  enabled: boolean;
  flag?: FeatureFlag;
  reason?: string;
  evaluationTime?: number;
  cacheHit?: boolean;
}
export interface FeatureFlagBulkEvaluation {
  [featureName: string]: boolean;
}
export interface FeatureFlagConfig<T = any> {
  enabled: boolean;
  config: T;
  metadata: {
    evaluatedAt: Date;
    cacheUsed: boolean;
    rolloutPercentage: number;
  };
}
export interface FeatureFlagUsageStats {
  featureName: string;
  companyId: string;
  environment: string;
  evaluationCount: number;
  uniqueUsers: number;
  enabledCount: number;
  disabledCount: number;
  lastEvaluatedAt: Date;
}
export interface IFeatureFlagService {
  /**
   * Evalúa si un feature flag está habilitado para un contexto específico
   */
  isEnabled(featureName: string, context: FeatureFlagEvaluationContext): Promise<FeatureFlagEvaluationResult>;
  /**
   * Obtiene la configuración de un feature flag si está habilitado
   */
  getFeatureConfig<T = any>(featureName: string, context: FeatureFlagEvaluationContext): Promise<FeatureFlagConfig<T> | null>;
  /**
   * Evalúa múltiples feature flags en una sola operación
   */
  evaluateMultiple(featureNames: string[], context: FeatureFlagEvaluationContext): Promise<FeatureFlagBulkEvaluation>;
  /**
   * Obtiene todos los feature flags de una empresa con su estado actual
   */
  getAllFlags(companyId: string, environment?: string, context?: Partial<FeatureFlagEvaluationContext>): Promise<FeatureFlagBulkEvaluation>;
  /**
   * Crea un nuevo feature flag
   */
  createFeatureFlag(flagData: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlag>;
  /**
   * Actualiza un feature flag existente
   */
  updateFeatureFlag(companyId: string, featureName: string, updates: Partial<FeatureFlag>, environment?: string): Promise<FeatureFlag>;
  /**
   * Elimina un feature flag
   */
  deleteFeatureFlag(companyId: string, featureName: string, environment?: string): Promise<void>;
  /**
   * Invalida el cache para una empresa específica
   */
  invalidateCache(companyId: string, environment?: string): Promise<void>;
  /**
   * Invalida el cache completo
   */
  invalidateAllCache(): Promise<void>;
  /**
   * Obtiene estadísticas de uso de feature flags
   */
  getUsageStats(companyId: string, featureName?: string): Promise<FeatureFlagUsageStats[]>;
  /**
   * Verifica la salud del sistema de feature flags
   */
  healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    cacheSize: number;
    avgEvaluationTime: number;
    errorRate: number;
  }>;
  /**
   * Obtiene información detallada de un feature flag
   */
  getFeatureFlagDetails(companyId: string, featureName: string, environment?: string): Promise<FeatureFlag | null>;
  /**
   * Clona feature flags entre entornos
   */
  cloneToEnvironment(companyId: string, sourceEnv: string, targetEnv: string, featureNames?: string[]): Promise<FeatureFlag[]>;
  /**
   * Programa la activación/desactivación de un feature flag
   */
  scheduleToggle(companyId: string, featureName: string, enabled: boolean, scheduleAt: Date, environment?: string): Promise<void>;
  /**
   * Obtiene feature flags próximos a expirar
   */
  getExpiringFlags(companyId: string, daysFromNow?: number): Promise<FeatureFlag[]>;
  /**
   * Evalúa feature flags con métricas detalladas para análisis
   */
  evaluateWithMetrics(featureName: string, context: FeatureFlagEvaluationContext): Promise<FeatureFlagEvaluationResult & {
    metrics: {
      evaluationTimeMs: number;
      cacheHit: boolean;
      rolloutPosition: number;
      rulesMatched: string[];
    };
  }>;
}
