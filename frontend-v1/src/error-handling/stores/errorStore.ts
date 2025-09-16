/**
 * Error Store - Sprint 3
 * Gestión centralizada de errores y reintentos
 * Integra con errorHandler existente y observabilityService
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { retryWithBackoff, isRecoverableError, formatErrorMessage } from '@/shared/utils/errorHandler';
import { observabilityService } from '@/shared/services/observabilityService';
import { notify } from '@/shared/store/uiStore';

export interface ErrorRecord {
  id: string;
  error: Error;
  message: string;
  timestamp: Date;
  context?: string;
  isRecoverable: boolean;
  retryCount: number;
  maxRetries: number;
}

export interface RetryableRequest {
  id: string;
  fn: () => Promise<any>;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
  retryCount: number;
  maxRetries: number;
  backoffMs: number;
  context?: string;
}

interface ErrorState {
  // Estado
  errors: ErrorRecord[];
  retryQueue: RetryableRequest[];
  isProcessingRetries: boolean;
  globalErrorCount: number;
  
  // Acciones - Errores
  addError: (error: Error, context?: string) => void;
  clearError: (id: string) => void;
  clearAllErrors: () => void;
  
  // Acciones - Retry Queue
  addToRetryQueue: (request: Omit<RetryableRequest, 'id' | 'retryCount'>) => void;
  removeFromRetryQueue: (id: string) => void;
  processRetryQueue: () => Promise<void>;
  retryRequest: (requestId: string) => Promise<void>;
  
  // Utilidades
  getErrorById: (id: string) => ErrorRecord | undefined;
  hasErrors: () => boolean;
  getRecoverableErrors: () => ErrorRecord[];
}

export const useErrorStore = create<ErrorState>()(
  devtools(
    immer((set, get) => ({
      // Estado inicial
      errors: [],
      retryQueue: [],
      isProcessingRetries: false,
      globalErrorCount: 0,
      
      // Acciones - Errores
      addError: (error, context) => {
        const id = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const message = formatErrorMessage(error);
        const isRecoverable = isRecoverableError(error);
        
        // Log en observability service
        observabilityService.captureError(error, { context });
        
        // Crear registro de error
        const errorRecord: ErrorRecord = {
          id,
          error,
          message,
          timestamp: new Date(),
          context,
          isRecoverable,
          retryCount: 0,
          maxRetries: 3
        };
        
        set((state) => {
          state.errors.push(errorRecord);
          state.globalErrorCount++;
        });
        
        // Mostrar notificación si es error crítico
        if (!isRecoverable || error.name === 'NetworkError') {
          notify.error(message, context || 'Error');
        }
      },
      
      clearError: (id) => {
        set((state) => {
          state.errors = state.errors.filter(e => e.id !== id);
        });
      },
      
      clearAllErrors: () => {
        set((state) => {
          state.errors = [];
        });
      },
      
      // Acciones - Retry Queue
      addToRetryQueue: (request) => {
        const id = `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        set((state) => {
          state.retryQueue.push({
            ...request,
            id,
            retryCount: 0,
            maxRetries: request.maxRetries || 3,
            backoffMs: request.backoffMs || 1000
          });
        });
        
        // Procesar queue automáticamente si no está procesando
        if (!get().isProcessingRetries) {
          get().processRetryQueue();
        }
      },
      
      removeFromRetryQueue: (id) => {
        set((state) => {
          state.retryQueue = state.retryQueue.filter(r => r.id !== id);
        });
      },
      
      processRetryQueue: async () => {
        const state = get();
        if (state.isProcessingRetries || state.retryQueue.length === 0) {
          return;
        }
        
        set((draft) => {
          draft.isProcessingRetries = true;
        });
        
        const queue = [...state.retryQueue];
        
        for (const request of queue) {
          if (request.retryCount >= request.maxRetries) {
            // Max retries alcanzado, remover de la cola
            get().removeFromRetryQueue(request.id);
            
            if (request.onError) {
              request.onError(new Error(`Max retries (${request.maxRetries}) exceeded`));
            }
            
            notify.error(
              `Operación fallida después de ${request.maxRetries} intentos`,
              request.context
            );
            continue;
          }
          
          try {
            // Incrementar contador de reintentos
            set((draft) => {
              const req = draft.retryQueue.find(r => r.id === request.id);
              if (req) req.retryCount++;
            });
            
            // Ejecutar con backoff
            const result = await retryWithBackoff(
              request.fn,
              1, // Solo 1 intento aquí, manejamos reintentos en la cola
              request.backoffMs * Math.pow(2, request.retryCount)
            );
            
            // Éxito - remover de la cola
            get().removeFromRetryQueue(request.id);
            
            if (request.onSuccess) {
              request.onSuccess(result);
            }
            
            notify.success('Operación completada exitosamente', request.context);
            
          } catch (error) {
            // Error - mantener en la cola para próximo intento
            observabilityService.log('warn', 'Retry failed', {
              requestId: request.id,
              retryCount: request.retryCount,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            // Si no es recuperable, remover de la cola
            if (!isRecoverableError(error)) {
              get().removeFromRetryQueue(request.id);
              
              if (request.onError) {
                request.onError(error as Error);
              }
              
              notify.error(
                formatErrorMessage(error),
                request.context
              );
            }
          }
          
          // Pequeña pausa entre requests
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        set((draft) => {
          draft.isProcessingRetries = false;
        });
        
        // Si quedan items en la cola, programar próximo procesamiento
        if (get().retryQueue.length > 0) {
          setTimeout(() => {
            get().processRetryQueue();
          }, 5000); // Reintentar cada 5 segundos
        }
      },
      
      retryRequest: async (requestId) => {
        const request = get().retryQueue.find(r => r.id === requestId);
        if (!request) return;
        
        // Resetear contador de reintentos
        set((draft) => {
          const req = draft.retryQueue.find(r => r.id === requestId);
          if (req) req.retryCount = 0;
        });
        
        // Procesar inmediatamente
        await get().processRetryQueue();
      },
      
      // Utilidades
      getErrorById: (id) => {
        return get().errors.find(e => e.id === id);
      },
      
      hasErrors: () => {
        return get().errors.length > 0;
      },
      
      getRecoverableErrors: () => {
        return get().errors.filter(e => e.isRecoverable);
      }
    })),
    {
      name: 'error-store'
    }
  )
);

// Helpers para uso fuera de componentes
export const getErrorState = () => useErrorStore.getState();

// Auto-procesar retry queue cada 30 segundos
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = getErrorState();
    if (state.retryQueue.length > 0 && !state.isProcessingRetries) {
      state.processRetryQueue();
    }
  }, 30000);
}