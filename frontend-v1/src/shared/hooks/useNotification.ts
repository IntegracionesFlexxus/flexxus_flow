import { useState, useCallback, useRef, useEffect } from 'react';

// Hook para manejo de notificaciones - MVP simple sin librerías externas
// TODO: En Nivel 2 integrar con react-toastify o notistack

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  autoClose?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
  timestamp: number;
}

interface NotificationOptions {
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  defaultDuration?: number;
  maxNotifications?: number;
}

export function useNotification(options: NotificationOptions = {}) {
  const {
    position = 'top-right',
    defaultDuration = 5000,
    maxNotifications = 5
  } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Limpiar timeouts al desmontar
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  // Función para generar ID único
  const generateId = () => `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Agregar notificación
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = generateId();
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
      autoClose: notification.autoClose ?? true,
      duration: notification.duration ?? defaultDuration
    };

    setNotifications(prev => {
      // Limitar número de notificaciones
      const updated = [...prev, newNotification];
      if (updated.length > maxNotifications) {
        // Remover las más antiguas
        const toRemove = updated.slice(0, updated.length - maxNotifications);
        toRemove.forEach(n => {
          const timeout = timeoutsRef.current.get(n.id);
          if (timeout) {
            clearTimeout(timeout);
            timeoutsRef.current.delete(n.id);
          }
        });
        return updated.slice(-maxNotifications);
      }
      return updated;
    });

    // Auto cerrar si está habilitado
    if (newNotification.autoClose && newNotification.duration) {
      const timeout = setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
      
      timeoutsRef.current.set(id, timeout);
    }

    return id;
  }, [defaultDuration, maxNotifications]);

  // Remover notificación
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    
    // Limpiar timeout si existe
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  // Limpiar todas las notificaciones
  const clearAll = useCallback(() => {
    setNotifications([]);
    
    // Limpiar todos los timeouts
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current.clear();
  }, []);

  // Métodos helper para cada tipo
  const success = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    return addNotification({
      type: 'success',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const error = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    return addNotification({
      type: 'error',
      title,
      message,
      autoClose: false, // Errores no se cierran automáticamente por defecto
      ...options
    });
  }, [addNotification]);

  const warning = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const info = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    return addNotification({
      type: 'info',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  // Notificación con confirmación
  const confirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      autoClose: false,
      action: {
        label: 'Confirmar',
        onClick: () => {
          onConfirm();
          // Auto cerrar después de confirmar
          const id = notifications[notifications.length - 1]?.id;
          if (id) removeNotification(id);
        }
      },
      onClose: onCancel
    });
  }, [addNotification, notifications, removeNotification]);

  // Notificación de promesa (loading -> success/error)
  const promise = useCallback(async <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error?: string | ((error: any) => string);
    }
  ) => {
    // Mostrar loading
    const loadingId = addNotification({
      type: 'info',
      title: messages.loading,
      autoClose: false
    });

    try {
      const result = await promise;
      
      // Remover loading y mostrar success
      removeNotification(loadingId);
      
      const successMessage = typeof messages.success === 'function' 
        ? messages.success(result) 
        : messages.success;
      
      success(successMessage);
      
      return result;
    } catch (error) {
      // Remover loading y mostrar error
      removeNotification(loadingId);
      
      const errorMessage = messages.error
        ? typeof messages.error === 'function'
          ? messages.error(error)
          : messages.error
        : 'Ocurrió un error';
      
      this.error(errorMessage);
      
      throw error;
    }
  }, [addNotification, removeNotification, success]);

  return {
    // Estado
    notifications,
    position,
    
    // Métodos principales
    add: addNotification,
    remove: removeNotification,
    clear: clearAll,
    
    // Métodos helper
    success,
    error,
    warning,
    info,
    confirm,
    promise,
    
    // Utilidad para contar notificaciones por tipo
    count: {
      total: notifications.length,
      success: notifications.filter(n => n.type === 'success').length,
      error: notifications.filter(n => n.type === 'error').length,
      warning: notifications.filter(n => n.type === 'warning').length,
      info: notifications.filter(n => n.type === 'info').length,
    }
  };
}

// Hook para notificaciones globales (singleton)
let globalNotifications: ReturnType<typeof useNotification> | null = null;

export function useGlobalNotification() {
  if (!globalNotifications) {
    console.warn('Global notifications not initialized. Using local instance.');
    return useNotification();
  }
  return globalNotifications;
}

// Inicializar notificaciones globales (llamar en App.tsx)
export function initializeGlobalNotifications(options?: NotificationOptions) {
  globalNotifications = useNotification(options);
  return globalNotifications;
}

// Hook para toast simplificado
export function useToast() {
  const notification = useNotification({
    position: 'bottom-center',
    defaultDuration: 3000
  });

  return {
    toast: (message: string, type: Notification['type'] = 'info') => {
      notification.add({
        type,
        title: message
      });
    },
    ...notification
  };
}

export default useNotification;