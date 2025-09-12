/**
 * useOptimisticMutation Hook
 * Loading States - Hook para mutations con updates optimistas
 */

import { useState, useCallback, useRef } from 'react';
import { useOptimisticStore, createOptimisticOperation } from '@/loading-states/stores/optimisticStore';

interface UseOptimisticMutationOptions<TData, TVariables, TContext = unknown> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onMutate?: (variables: TVariables) => TContext | Promise<TContext>;
  onSuccess?: (data: TData, variables: TVariables, context?: TContext) => void | Promise<void>;
  onError?: (error: Error, variables: TVariables, context?: TContext) => void | Promise<void>;
  onSettled?: (data?: TData, error?: Error, variables?: TVariables, context?: TContext) => void | Promise<void>;
  resource?: string;
  type?: 'create' | 'update' | 'delete';
  retry?: number;
  retryDelay?: (attempt: number) => number;
}

interface UseOptimisticMutationReturn<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData | undefined>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | null;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}

export function useOptimisticMutation<TData = unknown, TVariables = unknown, TContext = unknown>({
  mutationFn,
  onMutate,
  onSuccess,
  onError,
  onSettled,
  resource = 'unknown',
  type = 'update',
  retry = 3,
  retryDelay = (attempt) => Math.min(1000 * 2 ** attempt, 30000)
}: UseOptimisticMutationOptions<TData, TVariables, TContext>): UseOptimisticMutationReturn<TData, TVariables> {
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);

  const contextRef = useRef<TContext>();
  const operationIdRef = useRef<string>();

  const {
    addOperation,
    updateOperationStatus,
    rollbackOperation,
    removeOperation
  } = useOptimisticStore();

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
    setIsSuccess(false);
    setIsError(false);
    contextRef.current = undefined;
    
    if (operationIdRef.current) {
      removeOperation(operationIdRef.current);
      operationIdRef.current = undefined;
    }
  }, [removeOperation]);

  const executeWithRetry = async (
    fn: () => Promise<TData>,
    attemptsLeft: number,
    currentAttempt: number = 0
  ): Promise<TData> => {
    try {
      return await fn();
    } catch (error) {
      if (attemptsLeft <= 1) {
        throw error;
      }

      const delay = retryDelay(currentAttempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return executeWithRetry(fn, attemptsLeft - 1, currentAttempt + 1);
    }
  };

  const mutateAsync = useCallback(async (variables: TVariables): Promise<TData> => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    let context: TContext | undefined;

    try {
      // Ejecutar onMutate para obtener contexto y aplicar cambios optimistas
      if (onMutate) {
        context = await onMutate(variables);
        contextRef.current = context;
      }

      // Agregar operación al store
      const operation = createOptimisticOperation(
        type,
        resource,
        variables,
        context
      );
      operationIdRef.current = addOperation(operation);

      // Ejecutar mutación con retry
      const result = await executeWithRetry(
        () => mutationFn(variables),
        retry
      );

      // Actualizar estado de operación
      if (operationIdRef.current) {
        updateOperationStatus(operationIdRef.current, 'success');
      }

      setData(result);
      setIsSuccess(true);

      // Ejecutar callback de éxito
      if (onSuccess) {
        await onSuccess(result, variables, context);
      }

      // Ejecutar callback settled
      if (onSettled) {
        await onSettled(result, undefined, variables, context);
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Mutation failed');
      
      setError(error);
      setIsError(true);

      // Rollback de cambios optimistas
      if (operationIdRef.current) {
        rollbackOperation(operationIdRef.current);
        updateOperationStatus(operationIdRef.current, 'error', error.message);
      }

      // Ejecutar callback de error
      if (onError) {
        await onError(error, variables, context);
      }

      // Ejecutar callback settled
      if (onSettled) {
        await onSettled(undefined, error, variables, context);
      }

      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [
    mutationFn,
    onMutate,
    onSuccess,
    onError,
    onSettled,
    type,
    resource,
    retry,
    retryDelay,
    addOperation,
    updateOperationStatus,
    rollbackOperation
  ]);

  const mutate = useCallback(async (variables: TVariables): Promise<TData | undefined> => {
    try {
      return await mutateAsync(variables);
    } catch {
      // Silently handle error, it's already in state
      return undefined;
    }
  }, [mutateAsync]);

  return {
    mutate,
    mutateAsync,
    data,
    error,
    isLoading,
    isSuccess,
    isError,
    reset
  };
}

/**
 * Hook para batch de operaciones optimistas
 */
export function useOptimisticBatch() {
  const [operations, setOperations] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const {
    addOperation,
    updateOperationStatus,
    rollbackOperation
  } = useOptimisticStore();

  const addToBatch = useCallback(<T>(
    type: 'create' | 'update' | 'delete',
    resource: string,
    data: T
  ) => {
    const operation = createOptimisticOperation(type, resource, data);
    const id = addOperation(operation);
    setOperations(prev => [...prev, id]);
    return id;
  }, [addOperation]);

  const processBatch = useCallback(async (
    processor: (operations: string[]) => Promise<void>
  ) => {
    if (operations.length === 0) return;

    setIsProcessing(true);

    try {
      await processor(operations);
      
      // Marcar todas como exitosas
      operations.forEach(id => {
        updateOperationStatus(id, 'success');
      });
      
      setOperations([]);
    } catch (error) {
      // Rollback todas las operaciones
      operations.forEach(id => {
        rollbackOperation(id);
      });
      
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [operations, updateOperationStatus, rollbackOperation]);

  const clearBatch = useCallback(() => {
    operations.forEach(id => {
      rollbackOperation(id);
    });
    setOperations([]);
  }, [operations, rollbackOperation]);

  return {
    operations,
    isProcessing,
    addToBatch,
    processBatch,
    clearBatch,
    size: operations.length
  };
}

export default useOptimisticMutation;