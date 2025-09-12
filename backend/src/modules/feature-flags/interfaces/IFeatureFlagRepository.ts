/**
 * Feature Flag Repository Interface - Sprint 2
 * Siguiendo lineamientos nivel 2: segregación de interfaces y responsabilidad única
 */
export interface FeatureFlag {
  id: string;
  companyId: string;
  featureName: string;
  enabled: boolean;
  config: Record<string, any>;
  rolloutPercentage: number;
  rolloutRules: Record<string, any>;
  environment: string;
  description?: string;
  category?: string;
  startsAt?: Date;
  expiresAt?: Date;
  createdByUserId?: string;
  updatedByUserId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
export interface CreateFeatureFlagData {
  companyId: string;
  featureName: string;
  enabled: boolean;
  config?: Record<string, any>;
  rolloutPercentage?: number;
  rolloutRules?: Record<string, any>;
  environment: string;
  description?: string;
  category?: string;
  startsAt?: Date;
  expiresAt?: Date;
  createdByUserId?: string;
}
export interface UpdateFeatureFlagData {
  enabled?: boolean;
  config?: Record<string, any>;
  rolloutPercentage?: number;
  rolloutRules?: Record<string, any>;
  description?: string;
  category?: string;
  startsAt?: Date;
  expiresAt?: Date;
  updatedByUserId?: string;
}
export interface FeatureFlagFilter {
  companyId?: string;
  environment?: string;
  category?: string;
  enabled?: boolean;
  featureNames?: string[];
  includeExpired?: boolean;
}
export interface IFeatureFlagRepository {
  /**
   * Crea un nuevo feature flag
   */
  create(flagData: CreateFeatureFlagData): Promise<FeatureFlag>;
  /**
   * Busca feature flags por empresa y entorno
   */
  findByCompany(companyId: string, environment?: string): Promise<FeatureFlag[]>;
  /**
   * Busca un feature flag específico por nombre, empresa y entorno
   */
  findByName(companyId: string, featureName: string, environment?: string): Promise<FeatureFlag | null>;
  /**
   * Busca un feature flag por ID
   */
  findById(flagId: string): Promise<FeatureFlag | null>;
  /**
   * Actualiza un feature flag
   */
  update(companyId: string, featureName: string, updates: UpdateFeatureFlagData, environment?: string): Promise<FeatureFlag>;
  /**
   * Actualiza un feature flag por ID
   */
  updateById(flagId: string, updates: UpdateFeatureFlagData): Promise<FeatureFlag>;
  /**
   * Elimina un feature flag (soft delete)
   */
  delete(companyId: string, featureName: string, environment?: string): Promise<void>;
  /**
   * Elimina un feature flag por ID (soft delete)
   */
  deleteById(flagId: string): Promise<void>;
  /**
   * Busca feature flags con filtros avanzados
   */
  findWithFilters(filter: FeatureFlagFilter): Promise<FeatureFlag[]>;
  /**
   * Obtiene estadísticas de feature flags por empresa
   */
  getCompanyStats(companyId: string): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    byEnvironment: Record<string, number>;
    byCategory: Record<string, number>;
  }>;
  /**
   * Obtiene feature flags que están próximos a expirar
   */
  findExpiringFlags(daysFromNow: number): Promise<FeatureFlag[]>;
  /**
   * Clona feature flags entre entornos
   */
  cloneToEnvironment(companyId: string, sourceEnv: string, targetEnv: string, featureNames?: string[]): Promise<FeatureFlag[]>;
  /**
   * Obtiene el historial de cambios de un feature flag
   */
  getChangeHistory(companyId: string, featureName: string, limit?: number): Promise<any[]>;
  /**
   * Habilita o deshabilita múltiples feature flags en lote
   */
  bulkToggle(companyId: string, featureNames: string[], enabled: boolean, environment?: string): Promise<number>;
  /**
   * Limpia feature flags expirados y eliminados
   */
  cleanupExpired(): Promise<number>;
}
