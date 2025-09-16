// Event Bus para comunicación real-time entre componentes - MVP Nivel 1
// TODO: En Nivel 2 agregar event sourcing, replay, persistencia

type EventCallback<T = any> = (data: T) => void;
type UnsubscribeFunction = () => void;

interface EventSubscription {
  id: string;
  event: string;
  callback: EventCallback;
  once: boolean;
  priority: number;
}

interface EventOptions {
  once?: boolean;
  priority?: number; // Mayor prioridad = ejecuta primero
}

class EventBus {
  private static instance: EventBus;
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private eventHistory: Map<string, any[]> = new Map();
  private maxHistorySize = 100;
  private debug = process.env.NODE_ENV === 'development';
  private subscriptionIdCounter = 0;

  private constructor() {
    // Singleton pattern
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  // Suscribirse a un evento
  on<T = any>(
    event: string, 
    callback: EventCallback<T>, 
    options: EventOptions = {}
  ): UnsubscribeFunction {
    const { once = false, priority = 0 } = options;
    
    const subscription: EventSubscription = {
      id: this.generateSubscriptionId(),
      event,
      callback,
      once,
      priority
    };

    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, []);
    }

    const eventSubscriptions = this.subscriptions.get(event)!;
    eventSubscriptions.push(subscription);
    
    // Ordenar por prioridad (descendente)
    eventSubscriptions.sort((a, b) => b.priority - a.priority);

    if (this.debug) {
      console.log(`[EventBus] Subscribed to ${event} (${subscription.id})`);
    }

    // Retornar función para desuscribirse
    return () => this.off(event, subscription.id);
  }

  // Suscribirse una sola vez
  once<T = any>(
    event: string, 
    callback: EventCallback<T>,
    priority = 0
  ): UnsubscribeFunction {
    return this.on(event, callback, { once: true, priority });
  }

  // Desuscribirse de un evento
  off(event: string, subscriptionId?: string): void {
    if (!subscriptionId) {
      // Remover todas las suscripciones del evento
      this.subscriptions.delete(event);
      
      if (this.debug) {
        console.log(`[EventBus] Removed all subscriptions for ${event}`);
      }
    } else {
      // Remover suscripción específica
      const eventSubscriptions = this.subscriptions.get(event);
      
      if (eventSubscriptions) {
        const index = eventSubscriptions.findIndex(sub => sub.id === subscriptionId);
        
        if (index !== -1) {
          eventSubscriptions.splice(index, 1);
          
          if (this.debug) {
            console.log(`[EventBus] Unsubscribed from ${event} (${subscriptionId})`);
          }
          
          // Limpiar array si está vacío
          if (eventSubscriptions.length === 0) {
            this.subscriptions.delete(event);
          }
        }
      }
    }
  }

  // Emitir un evento
  emit<T = any>(event: string, data?: T): void {
    // Agregar a historial
    this.addToHistory(event, data);

    const eventSubscriptions = this.subscriptions.get(event);
    
    if (!eventSubscriptions || eventSubscriptions.length === 0) {
      if (this.debug) {
        console.log(`[EventBus] No subscribers for ${event}`);
      }
      return;
    }

    if (this.debug) {
      console.log(`[EventBus] Emitting ${event}`, data);
    }

    // Copiar array para evitar problemas si se modifica durante iteración
    const subscriptionsToExecute = [...eventSubscriptions];
    const subscriptionsToRemove: string[] = [];

    subscriptionsToExecute.forEach(subscription => {
      try {
        subscription.callback(data);
        
        // Marcar para remover si es "once"
        if (subscription.once) {
          subscriptionsToRemove.push(subscription.id);
        }
      } catch (error) {
        console.error(`[EventBus] Error in ${event} handler:`, error);
      }
    });

    // Remover suscripciones "once"
    subscriptionsToRemove.forEach(id => {
      this.off(event, id);
    });
  }

  // Emitir evento de forma asíncrona
  async emitAsync<T = any>(event: string, data?: T): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        this.emit(event, data);
        resolve();
      }, 0);
    });
  }

  // Esperar por un evento
  waitFor<T = any>(
    event: string, 
    timeout?: number,
    filter?: (data: T) => boolean
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;
      
      const handleEvent = (data: T) => {
        if (filter && !filter(data)) {
          return; // No cumple el filtro, seguir esperando
        }
        
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolve(data);
      };

      const unsubscribe = this.once(event, handleEvent);

      if (timeout) {
        timeoutId = setTimeout(() => {
          unsubscribe();
          reject(new Error(`Timeout waiting for event: ${event}`));
        }, timeout);
      }
    });
  }

  // Obtener historial de eventos
  getHistory(event: string, limit?: number): any[] {
    const history = this.eventHistory.get(event) || [];
    
    if (limit && limit > 0) {
      return history.slice(-limit);
    }
    
    return [...history];
  }

  // Limpiar historial de eventos
  clearHistory(event?: string): void {
    if (event) {
      this.eventHistory.delete(event);
    } else {
      this.eventHistory.clear();
    }
  }

  // Verificar si hay suscriptores
  hasSubscribers(event: string): boolean {
    const subscriptions = this.subscriptions.get(event);
    return subscriptions ? subscriptions.length > 0 : false;
  }

  // Obtener número de suscriptores
  getSubscriberCount(event?: string): number {
    if (event) {
      const subscriptions = this.subscriptions.get(event);
      return subscriptions ? subscriptions.length : 0;
    }
    
    // Total de todos los eventos
    let count = 0;
    this.subscriptions.forEach(subs => {
      count += subs.length;
    });
    return count;
  }

  // Obtener lista de eventos
  getEvents(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  // Limpiar todo
  clear(): void {
    this.subscriptions.clear();
    this.eventHistory.clear();
    
    if (this.debug) {
      console.log('[EventBus] Cleared all subscriptions and history');
    }
  }

  // Métodos privados
  private generateSubscriptionId(): string {
    return `sub_${++this.subscriptionIdCounter}_${Date.now()}`;
  }

  private addToHistory(event: string, data: any): void {
    if (!this.eventHistory.has(event)) {
      this.eventHistory.set(event, []);
    }
    
    const history = this.eventHistory.get(event)!;
    history.push({
      data,
      timestamp: Date.now()
    });
    
    // Limitar tamaño del historial
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }
}

// Eventos predefinidos del sistema
export enum SystemEvents {
  // Autenticación
  USER_LOGIN = 'user:login',
  USER_LOGOUT = 'user:logout',
  TOKEN_EXPIRED = 'auth:token_expired',
  SESSION_EXPIRED = 'auth:session_expired',
  
  // Navegación
  ROUTE_CHANGE = 'route:change',
  ROUTE_BEFORE_LEAVE = 'route:before_leave',
  
  // Datos
  DATA_LOADED = 'data:loaded',
  DATA_UPDATED = 'data:updated',
  DATA_DELETED = 'data:deleted',
  DATA_ERROR = 'data:error',
  
  // UI
  MODAL_OPEN = 'ui:modal_open',
  MODAL_CLOSE = 'ui:modal_close',
  DRAWER_TOGGLE = 'ui:drawer_toggle',
  THEME_CHANGE = 'ui:theme_change',
  
  // Notificaciones
  NOTIFICATION_SHOW = 'notification:show',
  NOTIFICATION_DISMISS = 'notification:dismiss',
  
  // WebSocket
  WS_CONNECTED = 'ws:connected',
  WS_DISCONNECTED = 'ws:disconnected',
  WS_MESSAGE = 'ws:message',
  WS_ERROR = 'ws:error',
  
  // Aplicación
  APP_READY = 'app:ready',
  APP_ERROR = 'app:error',
  APP_OFFLINE = 'app:offline',
  APP_ONLINE = 'app:online'
}

// Crear y exportar instancia singleton
export const eventBus = EventBus.getInstance();

// Hook para usar en componentes React
import { useEffect, useRef, useCallback, useState } from 'react';

export function useEventBus() {
  const unsubscribers = useRef<UnsubscribeFunction[]>([]);

  const on = useCallback(<T = any>(
    event: string,
    callback: EventCallback<T>,
    options?: EventOptions
  ) => {
    const unsubscribe = eventBus.on(event, callback, options);
    unsubscribers.current.push(unsubscribe);
    return unsubscribe;
  }, []);

  const once = useCallback(<T = any>(
    event: string,
    callback: EventCallback<T>,
    priority?: number
  ) => {
    const unsubscribe = eventBus.once(event, callback, priority);
    unsubscribers.current.push(unsubscribe);
    return unsubscribe;
  }, []);

  const emit = useCallback(<T = any>(event: string, data?: T) => {
    eventBus.emit(event, data);
  }, []);

  const emitAsync = useCallback(async <T = any>(event: string, data?: T) => {
    await eventBus.emitAsync(event, data);
  }, []);

  const waitFor = useCallback(<T = any>(
    event: string,
    timeout?: number,
    filter?: (data: T) => boolean
  ) => {
    return eventBus.waitFor(event, timeout, filter);
  }, []);

  // Limpiar suscripciones al desmontar
  useEffect(() => {
    return () => {
      unsubscribers.current.forEach(unsubscribe => unsubscribe());
      unsubscribers.current = [];
    };
  }, []);

  return {
    on,
    once,
    emit,
    emitAsync,
    waitFor,
    off: eventBus.off.bind(eventBus),
    hasSubscribers: eventBus.hasSubscribers.bind(eventBus),
    getHistory: eventBus.getHistory.bind(eventBus)
  };
}

// Hook para escuchar eventos específicos
export function useEvent<T = any>(
  event: string,
  handler: EventCallback<T>,
  deps: any[] = []
) {
  useEffect(() => {
    const unsubscribe = eventBus.on(event, handler);
    return unsubscribe;
  }, [event, ...deps]);
}

// Hook para obtener el último valor de un evento
export function useEventValue<T = any>(event: string, initialValue?: T) {
  const [value, setValue] = useState<T | undefined>(initialValue);

  useEffect(() => {
    const unsubscribe = eventBus.on<T>(event, setValue);
    
    // Obtener último valor del historial si existe
    const history = eventBus.getHistory(event, 1);
    if (history.length > 0) {
      setValue(history[0].data);
    }
    
    return unsubscribe;
  }, [event]);

  return value;
}

export default eventBus;