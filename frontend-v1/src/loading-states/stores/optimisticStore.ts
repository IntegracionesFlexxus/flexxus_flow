/**
 * OptimisticStore
 * Loading States - Store para manejar updates optimistas
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface OptimisticOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: string;
  data: any;
  previousData?: any;
  timestamp: number;
  status: 'pending' | 'success' | 'error';
  error?: string;
  retryCount?: number;
  maxRetries?: number;
}

interface OptimisticState {
  operations: Map<string, OptimisticOperation>;
  rollbackQueue: string[];
  
  // Actions
  addOperation: (operation: Omit<OptimisticOperation, 'id' | 'timestamp' | 'status'>) => string;
  updateOperationStatus: (id: string, status: OptimisticOperation['status'], error?: string) => void;
  rollbackOperation: (id: string) => void;
  removeOperation: (id: string) => void;
  clearOperations: () => void;
  
  // Queries
  getPendingOperations: () => OptimisticOperation[];
  getOperationsByResource: (resource: string) => OptimisticOperation[];
  hasConflicts: (resource: string, id?: string) => boolean;
}

export const useOptimisticStore = create<OptimisticState>()(
  immer((set, get) => ({
    operations: new Map(),
    rollbackQueue: [],

    addOperation: (operation) => {
      const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newOperation: OptimisticOperation = {
        ...operation,
        id,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        maxRetries: operation.maxRetries || 3
      };

      set((state) => {
        state.operations.set(id, newOperation);
      });

      return id;
    },

    updateOperationStatus: (id, status, error) => {
      set((state) => {
        const operation = state.operations.get(id);
        if (operation) {
          operation.status = status;
          if (error) {
            operation.error = error;
          }
          
          if (status === 'success') {
            // Eliminar después de un tiempo si fue exitoso
            setTimeout(() => {
              get().removeOperation(id);
            }, 5000);
          }
        }
      });
    },

    rollbackOperation: (id) => {
      const operation = get().operations.get(id);
      if (!operation) return;

      set((state) => {
        // Agregar a cola de rollback
        state.rollbackQueue.push(id);
        
        // Marcar como error
        const op = state.operations.get(id);
        if (op) {
          op.status = 'error';
        }
      });

      // Ejecutar rollback según tipo
      if (operation.type === 'create') {
        // Si fue create, simplemente eliminar de UI
        console.log('Rolling back create operation', operation);
      } else if (operation.type === 'update' && operation.previousData) {
        // Si fue update, restaurar datos previos
        console.log('Rolling back update operation', operation);
      } else if (operation.type === 'delete' && operation.previousData) {
        // Si fue delete, restaurar item
        console.log('Rolling back delete operation', operation);
      }
    },

    removeOperation: (id) => {
      set((state) => {
        state.operations.delete(id);
        state.rollbackQueue = state.rollbackQueue.filter(opId => opId !== id);
      });
    },

    clearOperations: () => {
      set((state) => {
        state.operations.clear();
        state.rollbackQueue = [];
      });
    },

    getPendingOperations: () => {
      return Array.from(get().operations.values())
        .filter(op => op.status === 'pending');
    },

    getOperationsByResource: (resource) => {
      return Array.from(get().operations.values())
        .filter(op => op.resource === resource);
    },

    hasConflicts: (resource, id) => {
      const operations = get().getOperationsByResource(resource);
      return operations.some(op => 
        op.status === 'pending' && 
        (!id || op.data?.id === id)
      );
    }
  }))
);

/**
 * Helper para crear operación optimista
 */
export function createOptimisticOperation<T>(
  type: OptimisticOperation['type'],
  resource: string,
  data: T,
  previousData?: T
): Omit<OptimisticOperation, 'id' | 'timestamp' | 'status'> {
  return {
    type,
    resource,
    data,
    previousData,
    maxRetries: 3
  };
}

/**
 * Resolver de conflictos
 */
export class ConflictResolver {
  private strategies: Map<string, (local: any, remote: any) => any> = new Map();

  registerStrategy(resource: string, strategy: (local: any, remote: any) => any) {
    this.strategies.set(resource, strategy);
  }

  resolve(resource: string, localData: any, remoteData: any): any {
    const strategy = this.strategies.get(resource);
    
    if (strategy) {
      return strategy(localData, remoteData);
    }

    // Estrategia por defecto: último gana
    return remoteData;
  }

  // Estrategias predefinidas
  static lastWriteWins(local: any, remote: any) {
    return remote;
  }

  static firstWriteWins(local: any, remote: any) {
    return local;
  }

  static merge(local: any, remote: any) {
    return { ...remote, ...local };
  }

  static mergeArrays(local: any[], remote: any[]) {
    const merged = [...remote];
    local.forEach(item => {
      if (!merged.find(r => r.id === item.id)) {
        merged.push(item);
      }
    });
    return merged;
  }
}

export const conflictResolver = new ConflictResolver();

export default useOptimisticStore;