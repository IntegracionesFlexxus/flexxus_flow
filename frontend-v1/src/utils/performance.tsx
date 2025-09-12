import React, { memo, ComponentType, ReactElement } from 'react';

// Utilidades de performance - MVP Nivel 1
// TODO: En Nivel 2 agregar profiling y monitoring avanzado

/**
 * HOC para memoizar componentes y evitar re-renders innecesarios
 * Incluye comparación personalizada opcional
 */
export function withMemo<P extends object>(
  Component: ComponentType<P>,
  propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
) {
  const displayName = Component.displayName || Component.name || 'Component';
  
  const MemoizedComponent = memo(Component, propsAreEqual);
  MemoizedComponent.displayName = `withMemo(${displayName})`;
  
  return MemoizedComponent;
}

/**
 * Comparador shallow para props de componentes
 * Útil para evitar re-renders cuando las props no han cambiado realmente
 */
export function shallowEqual(prevProps: any, nextProps: any): boolean {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);
  
  if (prevKeys.length !== nextKeys.length) {
    return false;
  }
  
  for (const key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Comparador deep para objetos anidados (usar con cuidado por performance)
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return false;
  
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
}

/**
 * Hook para debounce de valores
 * Evita actualizaciones frecuentes y mejora performance
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

/**
 * Hook para throttle de funciones
 * Limita la frecuencia de ejecución
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): T {
  const lastRun = React.useRef(Date.now());
  const timeout = React.useRef<NodeJS.Timeout>();
  
  return React.useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRun.current;
    
    if (timeSinceLastRun >= delay) {
      callback(...args);
      lastRun.current = now;
    } else {
      clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        callback(...args);
        lastRun.current = Date.now();
      }, delay - timeSinceLastRun);
    }
  }, [callback, delay]) as T;
}

/**
 * Hook para lazy loading de imágenes
 */
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = React.useState(placeholder || '');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  
  React.useEffect(() => {
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setLoading(false);
    };
    
    img.onerror = () => {
      setError(true);
      setLoading(false);
    };
    
    img.src = src;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);
  
  return { imageSrc, loading, error };
}

/**
 * Hook para intersection observer (lazy loading de componentes)
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  
  React.useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);
    
    const element = ref.current;
    if (element) {
      observer.observe(element);
    }
    
    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [ref, options]);
  
  return isIntersecting;
}

/**
 * Medidor de performance básico
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();
  
  start(label: string) {
    this.marks.set(label, performance.now());
  }
  
  end(label: string): number | null {
    const startTime = this.marks.get(label);
    if (!startTime) return null;
    
    const duration = performance.now() - startTime;
    this.marks.delete(label);
    
    // Log en desarrollo
    if (import.meta.env.DEV) {
      console.log(`⏱ ${label}: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }
  
  measure(label: string, fn: () => void): number {
    this.start(label);
    fn();
    return this.end(label) || 0;
  }
  
  async measureAsync(label: string, fn: () => Promise<void>): Promise<number> {
    this.start(label);
    await fn();
    return this.end(label) || 0;
  }
}

// Instancia global del monitor
export const perfMonitor = new PerformanceMonitor();

/**
 * HOC para medir el tiempo de render de un componente
 */
export function withPerformanceMonitoring<P extends object>(
  Component: ComponentType<P>,
  componentName?: string
) {
  const name = componentName || Component.displayName || Component.name || 'Component';
  
  return React.forwardRef<any, P>((props, ref) => {
    React.useEffect(() => {
      perfMonitor.start(`${name}-mount`);
      return () => {
        perfMonitor.end(`${name}-mount`);
      };
    }, []);
    
    return React.createElement(Component, { ...props, ref } as any);
  });
}

/**
 * Batch updates para evitar múltiples re-renders
 */
export function batchUpdates(updates: Array<() => void>) {
  // React 18 automáticamente hace batching, pero esto es útil para React 17
  if ('unstable_batchedUpdates' in React) {
    (React as any).unstable_batchedUpdates(() => {
      updates.forEach(update => update());
    });
  } else {
    updates.forEach(update => update());
  }
}

// Exportar utilidades
export default {
  withMemo,
  shallowEqual,
  deepEqual,
  useDebounce,
  useThrottle,
  useLazyImage,
  useIntersectionObserver,
  PerformanceMonitor,
  perfMonitor,
  withPerformanceMonitoring,
  batchUpdates
};