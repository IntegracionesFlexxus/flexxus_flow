import { useState, useEffect, useRef, useCallback } from 'react';

// Hook para debounce de valores - útil para búsquedas y optimización
// TODO: En Nivel 2 agregar cancelación selectiva y prioridades

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Crear timer para actualizar valor después del delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpiar timer si value o delay cambian
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook para debounce de callbacks/funciones
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500,
  options?: {
    leading?: boolean;  // Ejecutar al inicio
    trailing?: boolean; // Ejecutar al final (default: true)
    maxWait?: number;   // Máximo tiempo de espera
  }
) {
  const { leading = false, trailing = true, maxWait } = options || {};
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const maxTimeoutRef = useRef<NodeJS.Timeout>();
  const lastCallTime = useRef<number>();
  const lastInvokeTime = useRef<number>(0);
  const lastArgs = useRef<any[]>();
  
  // Limpiar timers al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);
    };
  }, []);

  const invoke = useCallback(() => {
    if (!lastArgs.current) return;
    
    const args = lastArgs.current;
    lastArgs.current = undefined;
    lastInvokeTime.current = Date.now();
    callback(...args);
  }, [callback]);

  const startTimer = useCallback((wait: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = undefined;
      
      if (trailing && lastArgs.current) {
        invoke();
      }
    }, wait);
  }, [invoke, trailing]);

  const debouncedFn = useCallback((...args: Parameters<T>) => {
    const time = Date.now();
    const isInvoking = leading && !lastCallTime.current;
    
    lastArgs.current = args;
    lastCallTime.current = time;

    // Calcular tiempo restante
    const timeSinceLastInvoke = time - lastInvokeTime.current;
    const remainingWait = delay - (time - (lastCallTime.current || 0));
    const remainingMax = maxWait ? maxWait - timeSinceLastInvoke : Infinity;
    const shouldInvokeMax = maxWait && remainingMax <= 0;

    if (shouldInvokeMax) {
      // Excedió maxWait, invocar inmediatamente
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = undefined;
      invoke();
    } else {
      // Programar próxima invocación
      startTimer(Math.min(remainingWait, remainingMax));
      
      // Configurar maxWait timer si es necesario
      if (maxWait && !maxTimeoutRef.current) {
        maxTimeoutRef.current = setTimeout(() => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          invoke();
        }, maxWait);
      }
    }

    // Invocar inmediatamente si leading está activo
    if (isInvoking) {
      invoke();
    }
  }, [delay, leading, maxWait, invoke, startTimer]);

  // Función para cancelar debounce pendiente
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = undefined;
    }
    lastArgs.current = undefined;
    lastCallTime.current = undefined;
  }, []);

  // Función para ejecutar inmediatamente
  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      invoke();
    }
  }, [invoke]);

  return { 
    debouncedFn, 
    cancel, 
    flush,
    pending: !!timeoutRef.current 
  };
}

// Hook específico para búsquedas con debounce
export function useDebouncedSearch(
  searchFn: (query: string) => void | Promise<void>,
  delay: number = 300
) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebounce(query, delay);

  useEffect(() => {
    if (debouncedQuery) {
      setIsSearching(true);
      Promise.resolve(searchFn(debouncedQuery)).finally(() => {
        setIsSearching(false);
      });
    }
  }, [debouncedQuery, searchFn]);

  return {
    query,
    setQuery,
    isSearching,
    debouncedQuery
  };
}

// Hook para throttle (limitar frecuencia de ejecución)
export function useThrottle<T>(value: T, interval: number = 500): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated.current;

    if (timeSinceLastUpdate >= interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - timeSinceLastUpdate);

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}

export default useDebounce;