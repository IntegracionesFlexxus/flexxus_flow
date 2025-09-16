import { useState, useCallback, useRef, useEffect } from 'react';

// Hook genérico para manejar operaciones asíncronas - MVP simple
// TODO: En Nivel 2 agregar cache, retry logic, y optimistic updates

interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  status: 'idle' | 'pending' | 'success' | 'error';
}

interface UseAsyncOptions {
  immediate?: boolean; // Ejecutar inmediatamente al montar
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useAsync<T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions = {}
) {
  const { immediate = false, onSuccess, onError } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: false,
    status: 'idle'
  });

  // Ref para controlar si el componente está montado
  const isMounted = useRef(true);
  const abortController = useRef<AbortController>();

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      isMounted.current = false;
      abortController.current?.abort();
    };
  }, []);

  // Función execute para llamar la operación asíncrona
  const execute = useCallback(async (...args: Parameters<typeof asyncFunction>) => {
    // Cancelar operación anterior si existe
    abortController.current?.abort();
    abortController.current = new AbortController();

    setState({
      data: null,
      error: null,
      loading: true,
      status: 'pending'
    });

    try {
      const result = await asyncFunction(...args);

      // Solo actualizar si el componente sigue montado
      if (isMounted.current) {
        setState({
          data: result,
          error: null,
          loading: false,
          status: 'success'
        });

        onSuccess?.(result);
      }

      return result;
    } catch (error) {
      // Ignorar errores de abort
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      const errorObj = error instanceof Error ? error : new Error(String(error));

      // Solo actualizar si el componente sigue montado
      if (isMounted.current) {
        setState({
          data: null,
          error: errorObj,
          loading: false,
          status: 'error'
        });

        onError?.(errorObj);
      }

      throw error;
    }
  }, [asyncFunction, onSuccess, onError]);

  // Reset del estado
  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      loading: false,
      status: 'idle'
    });
  }, []);

  // Ejecutar inmediatamente si se especifica
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate]); // Solo ejecutar en mount si immediate es true

  return {
    ...state,
    execute,
    reset,
    isIdle: state.status === 'idle',
    isPending: state.status === 'pending',
    isSuccess: state.status === 'success',
    isError: state.status === 'error'
  };
}

// Hook para manejar múltiples llamadas async en paralelo
export function useAsyncParallel<T extends Record<string, () => Promise<any>>>(
  asyncFunctions: T
) {
  const [results, setResults] = useState<{
    [K in keyof T]: AsyncState<Awaited<ReturnType<T[K]>>>
  }>(() => {
    const initial: any = {};
    for (const key in asyncFunctions) {
      initial[key] = {
        data: null,
        error: null,
        loading: false,
        status: 'idle'
      };
    }
    return initial;
  });

  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async () => {
    setIsLoading(true);

    const promises = Object.entries(asyncFunctions).map(async ([key, fn]) => {
      try {
        setResults(prev => ({
          ...prev,
          [key]: { ...prev[key], loading: true, status: 'pending' }
        }));

        const data = await fn();

        setResults(prev => ({
          ...prev,
          [key]: { data, error: null, loading: false, status: 'success' }
        }));

        return { key, data };
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        setResults(prev => ({
          ...prev,
          [key]: { data: null, error: errorObj, loading: false, status: 'error' }
        }));

        return { key, error: errorObj };
      }
    });

    await Promise.allSettled(promises);
    setIsLoading(false);
  }, [asyncFunctions]);

  return {
    results,
    isLoading,
    execute,
    hasErrors: Object.values(results).some(r => r.status === 'error'),
    allSuccess: Object.values(results).every(r => r.status === 'success')
  };
}

// Hook para polling de datos
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  interval: number = 5000,
  options: {
    enabled?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const { enabled = true, onSuccess, onError } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  const poll = useCallback(async () => {
    try {
      const result = await fetchFn();
      setData(result);
      setError(null);
      onSuccess?.(result);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      onError?.(errorObj);
    }
  }, [fetchFn, onSuccess, onError]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        setIsPolling(false);
      }
      return;
    }

    // Primera ejecución
    poll();
    setIsPolling(true);

    // Configurar polling
    intervalRef.current = setInterval(poll, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        setIsPolling(false);
      }
    };
  }, [enabled, interval, poll]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      setIsPolling(false);
    }
  }, []);

  const restart = useCallback(() => {
    stop();
    if (enabled) {
      poll();
      setIsPolling(true);
      intervalRef.current = setInterval(poll, interval);
    }
  }, [enabled, interval, poll, stop]);

  return {
    data,
    error,
    isPolling,
    stop,
    restart,
    refetch: poll
  };
}

export default useAsync;