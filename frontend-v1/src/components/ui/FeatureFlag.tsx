/**
 * FeatureFlag Component - Sprint 2
 * Siguiendo lineamientos nivel 2: Componente wrapper para renderizado condicional de features
 * Implementa patrón Adapter para diferentes estrategias de renderizado y fallback
 */

import React, { Suspense, memo, useMemo } from 'react';
import { Box, Skeleton, Alert, CircularProgress } from '@mui/material';
import { useFeatureFlag } from '@/shared/hooks/useFeatureFlag';

// Types - Principio de Responsabilidad Única
interface FeatureFlagProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  enableDebug?: boolean;
  fallbackOnError?: boolean;
  skeleton?: {
    variant?: 'text' | 'rectangular' | 'circular';
    width?: number | string;
    height?: number | string;
    lines?: number;
  };
}

interface FeatureFlagGroupProps {
  features: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  requireAll?: boolean;
  requireAny?: boolean;
}

interface ConditionalFeatureProps {
  when: (config: any) => boolean;
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Componente principal para renderizado condicional basado en feature flags
 * Siguiendo principio de Abierto/Cerrado - extensible para nuevos tipos de renderizado
 * @param {FeatureFlagProps} props - Propiedades del componente
 * @returns {React.FC} Componente de feature flag
 */
export const FeatureFlag: React.FC<FeatureFlagProps> = memo(({
  feature,
  children,
  fallback = null,
  loadingComponent,
  errorComponent,
  enableDebug = false,
  fallbackOnError = true,
  skeleton
}) => {
  const { 
    isEnabled, 
    isLoading, 
    error, 
    config, 
    metadata 
  } = useFeatureFlag(feature, {
    enableDebug,
    fallbackOnError
  });

  /**
   * Genera componente de loading personalizado o por defecto
   * Principio de Inversión de Dependencias - depende de abstracción
   */
  const LoadingComponent = useMemo(() => {
    if (loadingComponent) {
      return loadingComponent;
    }

    if (skeleton) {
      const { variant = 'rectangular', width, height, lines = 1 } = skeleton;
      
      if (lines > 1) {
        return (
          <Box>
            {Array.from({ length: lines }, (_, index) => (
              <Skeleton
                key={index}
                variant={variant}
                width={width}
                height={height || 20}
                sx={{ mb: index < lines - 1 ? 1 : 0 }}
              />
            ))}
          </Box>
        );
      }
      
      return (
        <Skeleton 
          variant={variant} 
          width={width} 
          height={height || 40} 
        />
      );
    }

    return (
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: 40
        }}
      >
        <CircularProgress size={20} />
      </Box>
    );
  }, [loadingComponent, skeleton]);

  /**
   * Genera componente de error personalizado o por defecto
   */
  const ErrorComponent = useMemo(() => {
    if (errorComponent) {
      return errorComponent;
    }

    // Solo mostrar error en desarrollo o si debug está habilitado
    if (enableDebug || import.meta.env.DEV) {
      return (
        <Alert 
          severity="warning" 
          sx={{ my: 1 }}
          action={enableDebug ? (
            <pre style={{ fontSize: '0.75rem', margin: 0 }}>
              {JSON.stringify({ feature, error, config, metadata }, null, 2)}
            </pre>
          ) : undefined}
        >
          Feature flag error: {feature}
        </Alert>
      );
    }

    return fallback;
  }, [errorComponent, enableDebug, feature, error, config, metadata, fallback]);

  // Estados de renderizado con patrón Strategy
  if (isLoading) {
    return <>{LoadingComponent}</>;
  }

  if (error) {
    return <>{ErrorComponent}</>;
  }

  // Renderizado condicional principal
  if (isEnabled) {
    // Envolver en Suspense si children puede ser lazy
    return (
      <Suspense fallback={LoadingComponent}>
        {children}
      </Suspense>
    );
  }

  return <>{fallback}</>;
});

FeatureFlag.displayName = 'FeatureFlag';

/**
 * Componente para agrupar múltiples feature flags con lógica AND/OR
 * Implementa patrón Composite para manejar múltiples condiciones
 * @param {FeatureFlagGroupProps} props - Propiedades del grupo
 * @returns {React.FC} Componente de grupo de feature flags
 */
export const FeatureFlagGroup: React.FC<FeatureFlagGroupProps> = memo(({
  features,
  children,
  fallback = null,
  loadingComponent,
  requireAll = true,
  requireAny = false
}) => {
  const flagResults = features.map(feature => 
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useFeatureFlag(feature)
  );

  // Verificar estados de carga
  const isLoading = flagResults.some(result => result.isLoading);
  const hasError = flagResults.some(result => result.error);

  if (isLoading) {
    return <>{loadingComponent || <CircularProgress size={20} />}</>;
  }

  if (hasError) {
    // En caso de error, mostrar fallback
    return <>{fallback}</>;
  }

  // Aplicar lógica de grupo
  let shouldRender = false;
  
  if (requireAll) {
    shouldRender = flagResults.every(result => result.isEnabled);
  } else if (requireAny) {
    shouldRender = flagResults.some(result => result.isEnabled);
  }

  return shouldRender ? <>{children}</> : <>{fallback}</>;
});

FeatureFlagGroup.displayName = 'FeatureFlagGroup';

/**
 * Componente para renderizado condicional avanzado basado en configuración
 * Permite evaluaciones personalizadas de la configuración del feature flag
 * @param {ConditionalFeatureProps} props - Propiedades del componente condicional
 * @returns {React.FC} Componente condicional
 */
export const ConditionalFeature: React.FC<ConditionalFeatureProps> = memo(({
  when,
  feature,
  children,
  fallback = null
}) => {
  const { isEnabled, config, isLoading } = useFeatureFlag(feature);

  if (isLoading) {
    return <CircularProgress size={20} />;
  }

  if (!isEnabled) {
    return <>{fallback}</>;
  }

  // Aplicar condición personalizada
  try {
    const shouldRender = when(config);
    return shouldRender ? <>{children}</> : <>{fallback}</>;
  } catch (error) {
    console.error('Error evaluating conditional feature:', error);
    return <>{fallback}</>;
  }
});

ConditionalFeature.displayName = 'ConditionalFeature';

/**
 * HOC para envolver componentes con feature flags
 * Siguiendo principio de Decorador - añade funcionalidad sin modificar la clase base
 * @param {string} featureName - Nombre del feature flag
 * @param {React.ComponentType} fallbackComponent - Componente de fallback
 * @param {Object} options - Opciones del HOC
 * @returns {Function} HOC function
 */
export const withFeatureFlag = <T extends Record<string, any>>(
  featureName: string,
  fallbackComponent?: React.ComponentType<T>,
  options: {
    enableDebug?: boolean;
    loadingComponent?: React.ComponentType;
    errorComponent?: React.ComponentType<{ error: string }>;
  } = {}
) => {
  const { enableDebug = false, loadingComponent, errorComponent } = options;

  return function FeatureFlaggedComponent<P extends T>(
    Component: React.ComponentType<P>
  ): React.ComponentType<P> {
    const WrappedComponent: React.FC<P> = memo((props) => {
      const { isEnabled, isLoading, error } = useFeatureFlag(featureName, {
        enableDebug
      });

      if (isLoading) {
        if (loadingComponent) {
          const LoadingComponent = loadingComponent;
          return <LoadingComponent />;
        }
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        );
      }

      if (error) {
        if (errorComponent) {
          const ErrorComponent = errorComponent;
          return <ErrorComponent error={error} />;
        }
        
        if (fallbackComponent) {
          const FallbackComponent = fallbackComponent;
          return <FallbackComponent {...props} />;
        }
        
        return null;
      }

      if (!isEnabled) {
        if (fallbackComponent) {
          const FallbackComponent = fallbackComponent;
          return <FallbackComponent {...props} />;
        }
        return null;
      }

      return <Component {...props} />;
    });

    WrappedComponent.displayName = `withFeatureFlag(${Component.displayName || Component.name})`;
    
    return WrappedComponent;
  };
};

/**
 * Hook auxiliar para crear un render prop basado en feature flag
 * Patrón Render Props para máxima flexibilidad
 * @param {string} feature - Nombre del feature flag
 * @returns {Function} Render function
 */
export const useFeatureFlagRender = (feature: string) => {
  const { isEnabled, isLoading, error, config } = useFeatureFlag(feature);

  return ({
    enabled,
    disabled,
    loading,
    error: errorRender
  }: {
    enabled?: (config?: any) => React.ReactNode;
    disabled?: () => React.ReactNode;
    loading?: () => React.ReactNode;
    error?: (error: string) => React.ReactNode;
  }) => {
    if (isLoading) {
      return loading ? loading() : <CircularProgress size={20} />;
    }

    if (error) {
      return errorRender ? errorRender(error) : null;
    }

    if (isEnabled) {
      return enabled ? enabled(config) : null;
    }

    return disabled ? disabled() : null;
  };
};

/**
 * Componente de debug para feature flags
 * Solo se renderiza en modo desarrollo
 * @param {Object} props - Props del componente
 * @returns {React.FC} Componente de debug
 */
export const FeatureFlagDebugger: React.FC<{
  features?: string[];
  showCache?: boolean;
}> = memo(({ features = [], showCache = false }) => {
  // Solo mostrar en desarrollo
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        p: 2,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        boxShadow: 2,
        zIndex: 9999,
        maxWidth: 300,
        fontSize: '0.75rem'
      }}
    >
      <strong>Feature Flags Debugger</strong>
      {features.map(feature => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { isEnabled, config, isLoading } = useFeatureFlag(feature);
        
        return (
          <Box key={feature} sx={{ mt: 1 }}>
            <code>
              {feature}: {isLoading ? '...' : isEnabled ? '✅' : '❌'}
            </code>
            {config && (
              <pre style={{ fontSize: '0.6rem', marginTop: 4 }}>
                {JSON.stringify(config, null, 2)}
              </pre>
            )}
          </Box>
        );
      })}
    </Box>
  );
});

FeatureFlagDebugger.displayName = 'FeatureFlagDebugger';

// Re-exports para facilidad de uso
export { useFeatureFlag, useFeatureFlags } from '@/shared/hooks/useFeatureFlag';
export { useFeatureFlags as useMultipleFeatureFlags } from '@/shared/hooks/useFeatureFlags';

export default FeatureFlag;