/**
 * useErrorHandler Hook - Sprint 3
 * Hook mejorado para manejo de errores con integración completa
 */

import { useCallback } from 'react';
import { useErrorStore } from '@/error-handling/stores/errorStore';
import { notify } from '@/shared/store/uiStore';
import { 
  formatErrorMessage, 
  isRecoverableError,
  parseAxiosError,
  AppError 
} from '@/shared/utils/errorHandler';
import { AxiosError } from 'axios';
import { observabilityService } from '@/shared/services/observabilityService';

interface ErrorHandlerOptions {
  silent?: boolean; // No mostrar notificación
  context?: string; // Contexto del error
  retry?: () => Promise<any>; // Función de retry
  fallback?: any; // Valor de fallback
  autoRetry?: boolean; // Auto-retry si es recuperable
  maxRetries?: number; // Máximo de reintentos
}

interface ErrorResult {
  message: string;
  isRecoverable: boolean;
  code?: string;
  statusCode?: number;
  details?: any;
}

export function useErrorHandler() {
  const { addError, addToRetryQueue } = useErrorStore();

  /**
   * Maneja un error de forma centralizada
   */
  const handleError = useCallback((
    error: unknown,
    options: ErrorHandlerOptions = {}
  ): ErrorResult => {
    const {
      silent = false,
      context,
      retry,
      autoRetry = false,
      maxRetries = 3
    } = options;

    // Parsear el error
    let appError: AppError;
    
    if (error instanceof AppError) {
      appError = error;
    } else if (error instanceof AxiosError) {
      appError = parseAxiosError(error);
    } else if (error instanceof Error) {
      appError = new AppError(
        error.message,
        'UNKNOWN_ERROR',
        500,
        isRecoverableError(error)
      );
    } else {
      appError = new AppError(
        formatErrorMessage(error),
        'UNKNOWN_ERROR',
        500,
        false
      );
    }

    // Log en observability
    observabilityService.captureError(appError, { context });

    // Agregar al store
    addError(appError, context);

    // Mostrar notificación si no es silent
    if (!silent) {
      const notifyMethod = appError.isOperational ? notify.warning : notify.error;
      notifyMethod(appError.message, context || 'Error');
    }

    // Auto-retry si es recuperable y hay función de retry
    if (autoRetry && retry && appError.isOperational) {
      addToRetryQueue({
        fn: retry,
        maxRetries,
        backoffMs: 1000,
        context,
        onError: (retryError) => {
          notify.error(
            `No se pudo completar la operación: ${formatErrorMessage(retryError)}`,
            context
          );
        }
      });
    }

    return {
      message: appError.message,
      isRecoverable: appError.isOperational,
      code: appError.code,
      statusCode: appError.statusCode,
      details: appError.details
    };
  }, [addError, addToRetryQueue]);

  /**
   * Wrapper para funciones async con manejo de errores
   */
  const handleAsync = useCallback(async <T,>(
    fn: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (error) {
      const result = handleError(error, options);
      
      if (options.fallback !== undefined) {
        return options.fallback;
      }
      
      if (!result.isRecoverable) {
        throw error;
      }
      
      return undefined;
    }
  }, [handleError]);

  /**
   * Manejo específico para errores de formulario
   */
  const handleFormError = useCallback((
    error: unknown,
    fieldName?: string
  ): Record<string, string> => {
    const result = handleError(error, {
      silent: true,
      context: `Form${fieldName ? `: ${fieldName}` : ''}`
    });

    // Si hay detalles de validación, devolverlos
    if (result.details?.validationErrors) {
      const errors: Record<string, string> = {};
      for (const err of result.details.validationErrors) {
        errors[err.field] = err.message;
      }
      return errors;
    }

    // Error genérico
    if (fieldName) {
      return { [fieldName]: result.message };
    }

    return { general: result.message };
  }, [handleError]);

  /**
   * Manejo de errores de red con retry automático
   */
  const handleNetworkError = useCallback((
    error: unknown,
    retryFn?: () => Promise<any>
  ) => {
    return handleError(error, {
      context: 'Network',
      retry: retryFn,
      autoRetry: true,
      maxRetries: 5
    });
  }, [handleError]);

  /**
   * Limpia todos los errores
   */
  const clearErrors = useCallback(() => {
    useErrorStore.getState().clearAllErrors();
  }, []);

  return {
    handleError,
    handleAsync,
    handleFormError,
    handleNetworkError,
    clearErrors
  };
}