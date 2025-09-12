/**
 * LazyComponent
 * Loading States - Wrapper genérico para lazy loading con fallback
 */

import React, { Suspense, ComponentType, ReactNode } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { CenteredLoading } from '@/components/ui/Loading';

interface LazyComponentProps {
  component: React.LazyExoticComponent<ComponentType<any>>;
  fallback?: ReactNode;
  minHeight?: string | number;
  props?: Record<string, any>;
}

export const LazyComponent: React.FC<LazyComponentProps> = ({
  component: Component,
  fallback,
  minHeight = 200,
  props = {}
}) => {
  const defaultFallback = (
    <CenteredLoading minHeight={minHeight} message="Loading component..." />
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      <Component {...props} />
    </Suspense>
  );
};

/**
 * HOC para hacer cualquier componente lazy
 */
export function withLazyLoading<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: ReactNode
) {
  const LazyLoadedComponent = React.lazy(importFn);
  
  return (props: P) => (
    <LazyComponent 
      component={LazyLoadedComponent} 
      fallback={fallback}
      props={props}
    />
  );
}

export default LazyComponent;