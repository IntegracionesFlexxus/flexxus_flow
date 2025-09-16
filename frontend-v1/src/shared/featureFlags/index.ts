/**
 * Feature Flags System - Sprint 2
 * Siguiendo lineamientos nivel 2: Sistema completo de feature flags con exports centralizados
 * Punto de entrada principal para todo el sistema de feature flags
 */

// Hooks principales
export { useFeatureFlag } from '@/shared/hooks/useFeatureFlag';
export { useFeatureFlags } from '@/shared/hooks/useFeatureFlags';

// Componentes
export {
  FeatureFlag,
  FeatureFlagGroup,
  ConditionalFeature,
  FeatureFlagDebugger,
  withFeatureFlag,
  useFeatureFlagRender
} from '@/components/ui/FeatureFlag';

// Servicios
export {
  featureFlagService,
  type EvaluationContext,
  type FeatureFlagConfig,
  type FeatureFlagCondition,
  type SingleEvaluationResponse,
  type BatchEvaluationResponse,
  type FeatureFlagManagementResponse,
  type FeatureFlagDefinition,
  type RequestOptions
} from '@/shared/services/featureFlagService';

// Configuración
export {
  featureFlagConfig,
  FEATURE_FLAG_DEFAULTS,
  FEATURE_FLAG_CATEGORIES,
  SECURITY_CONFIG,
  FeatureFlagUtils
} from '@/config/featureFlags';

// Re-exports de tipos útiles
export type {
  UseFeatureFlagResult,
  FeatureFlagsResult
} from '@/shared/hooks/useFeatureFlag';

/**
 * Utilidades de conveniencia para uso común
 */
export const FeatureFlags = {
  // Hooks
  use: useFeatureFlag,
  useMultiple: useFeatureFlags,
  
  // Componentes
  Component: FeatureFlag,
  Group: FeatureFlagGroup,
  Conditional: ConditionalFeature,
  Debugger: FeatureFlagDebugger,
  
  // Servicios
  service: featureFlagService,
  
  // Configuración
  config: featureFlagConfig,
  defaults: FEATURE_FLAG_DEFAULTS,
  utils: FeatureFlagUtils
};

export default FeatureFlags;