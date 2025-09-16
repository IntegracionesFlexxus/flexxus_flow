/**
 * useNotifications Hook - Sprint 2
 * Siguiendo lineamientos nivel 2: Hook personalizado para gestión de notificaciones
 * Implementa principios SOLID con responsabilidad única para lógica de notificaciones
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  notificationService,
  NotificationData,
  NotificationFilter,
  NotificationStats,
  NotificationPreferences
} from '@/shared/services/notificationService';
import { useUIStore } from '@/shared/store/uiStore';
import { useAuth } from './useAuth';

// Tipos del hook
interface UseNotificationsReturn {
  // Datos
  notifications: NotificationData[];
  unreadCount: number;
  stats: NotificationStats | null;
  preferences: NotificationPreferences | null;
  
  // Estados
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  
  // Acciones
  createNotification: (data: Partial<NotificationData>) => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  refresh: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  
  // Filtrado
  setFilter: (filter: NotificationFilter) => void;
  clearFilter: () => void;
  
  // Utilidades
  requestPermission: () => Promise<NotificationPermission>;
  exportNotifications: () => void;
  importNotifications: (file: File) => Promise<void>;
}

/**
 * Hook principal para gestión de notificaciones
 * Siguiendo principios de Clean Code - funciones pequeñas y enfocadas
 */
export const useNotifications = (): UseNotificationsReturn => {
  // Estados
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>({});
  
  // Referencias
  const isMountedRef = useRef(true);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Hooks externos
  const { user } = useAuth();
  const { addNotification: addUINotification } = useUIStore();

  /**
   * Cargar notificaciones iniciales
   */
  const loadNotifications = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Cargar del historial local
      const history = notificationService.getHistory(filter);
      setNotifications(history);
      
      // Cargar estadísticas
      const statsData = notificationService.getStats();
      setStats(statsData);
      
      // Cargar preferencias
      const prefs = notificationService.getPreferences();
      setPreferences(prefs);
      
    } catch (err: any) {
      console.error('[useNotifications] Error loading notifications:', err);
      setError(err.message || 'Error al cargar notificaciones');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  /**
   * Configurar listeners del servicio
   */
  const setupServiceListeners = useCallback(() => {
    // Listener para nuevas notificaciones
    const handleNotificationCreated = (notification: NotificationData) => {
      if (!isMountedRef.current) return;
      
      setNotifications(prev => [notification, ...prev]);
      
      // Agregar a UI Store para mostrar snackbar
      addUINotification({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        autoClose: notification.autoClose,
        duration: notification.duration
      });
    };

    // Listener para notificaciones restauradas
    const handleNotificationRestored = (notification: NotificationData) => {
      if (!isMountedRef.current) return;
      setNotifications(prev => {
        const exists = prev.some(n => n.id === notification.id);
        if (!exists) {
          return [notification, ...prev];
        }
        return prev;
      });
    };

    // Listener para notificación leída
    const handleNotificationRead = (id: string) => {
      if (!isMountedRef.current) return;
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    };

    // Listener para todas las notificaciones leídas
    const handleAllRead = () => {
      if (!isMountedRef.current) return;
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    // Listener para notificación eliminada
    const handleNotificationRemoved = (id: string) => {
      if (!isMountedRef.current) return;
      setNotifications(prev => prev.filter(n => n.id !== id));
    };

    // Listener para todas las notificaciones limpiadas
    const handleAllCleared = () => {
      if (!isMountedRef.current) return;
      setNotifications([]);
    };

    // Listener para preferencias actualizadas
    const handlePreferencesUpdated = (prefs: NotificationPreferences) => {
      if (!isMountedRef.current) return;
      setPreferences(prefs);
    };

    // Listener para conexión WebSocket
    const handleWebSocketConnected = () => {
      if (!isMountedRef.current) return;
      setIsConnected(true);
      console.log('[useNotifications] WebSocket connected');
    };

    const handleWebSocketDisconnected = () => {
      if (!isMountedRef.current) return;
      setIsConnected(false);
      console.log('[useNotifications] WebSocket disconnected');
    };

    const handleWebSocketError = (error: any) => {
      if (!isMountedRef.current) return;
      console.error('[useNotifications] WebSocket error:', error);
      setError('Error de conexión con el servidor');
    };

    // Registrar listeners
    notificationService.on('notification-created', handleNotificationCreated);
    notificationService.on('notification-restored', handleNotificationRestored);
    notificationService.on('notification-read', handleNotificationRead);
    notificationService.on('all-notifications-read', handleAllRead);
    notificationService.on('notification-removed', handleNotificationRemoved);
    notificationService.on('all-notifications-cleared', handleAllCleared);
    notificationService.on('preferences-updated', handlePreferencesUpdated);
    notificationService.on('websocket-connected', handleWebSocketConnected);
    notificationService.on('websocket-disconnected', handleWebSocketDisconnected);
    notificationService.on('websocket-error', handleWebSocketError);

    // Cleanup
    return () => {
      notificationService.off('notification-created', handleNotificationCreated);
      notificationService.off('notification-restored', handleNotificationRestored);
      notificationService.off('notification-read', handleNotificationRead);
      notificationService.off('all-notifications-read', handleAllRead);
      notificationService.off('notification-removed', handleNotificationRemoved);
      notificationService.off('all-notifications-cleared', handleAllCleared);
      notificationService.off('preferences-updated', handlePreferencesUpdated);
      notificationService.off('websocket-connected', handleWebSocketConnected);
      notificationService.off('websocket-disconnected', handleWebSocketDisconnected);
      notificationService.off('websocket-error', handleWebSocketError);
    };
  }, [addUINotification]);

  /**
   * Configurar sincronización periódica
   */
  const setupPeriodicSync = useCallback(() => {
    // Sincronizar cada 5 minutos
    const syncInterval = setInterval(async () => {
      if (user && isConnected) {
        try {
          await notificationService.sync();
          await loadNotifications();
        } catch (error) {
          console.error('[useNotifications] Sync error:', error);
        }
      }
    }, 5 * 60 * 1000);

    syncIntervalRef.current = syncInterval;

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [user, isConnected, loadNotifications]);

  /**
   * Crear nueva notificación
   */
  const createNotification = useCallback(async (data: Partial<NotificationData>) => {
    try {
      await notificationService.create(data);
      // La notificación se agregará automáticamente via el listener
    } catch (err: any) {
      console.error('[useNotifications] Error creating notification:', err);
      throw err;
    }
  }, []);

  /**
   * Marcar como leída
   */
  const markAsRead = useCallback((id: string) => {
    notificationService.markAsRead(id);
  }, []);

  /**
   * Marcar todas como leídas
   */
  const markAllAsRead = useCallback(() => {
    notificationService.markAllAsRead();
  }, []);

  /**
   * Eliminar notificación
   */
  const deleteNotification = useCallback((id: string) => {
    notificationService.remove(id);
  }, []);

  /**
   * Limpiar todas las notificaciones
   */
  const clearAll = useCallback(() => {
    notificationService.clearAll();
  }, []);

  /**
   * Refrescar notificaciones
   */
  const refresh = useCallback(async () => {
    await loadNotifications();
    if (user) {
      await notificationService.sync();
    }
  }, [loadNotifications, user]);

  /**
   * Actualizar preferencias
   */
  const updatePreferences = useCallback((prefs: Partial<NotificationPreferences>) => {
    notificationService.updatePreferences(prefs);
  }, []);

  /**
   * Limpiar filtro
   */
  const clearFilter = useCallback(() => {
    setFilter({});
  }, []);

  /**
   * Solicitar permisos
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    return await notificationService.requestPermission();
  }, []);

  /**
   * Exportar notificaciones
   */
  const exportNotifications = useCallback(() => {
    const data = JSON.stringify(notifications, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notifications-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [notifications]);

  /**
   * Importar notificaciones
   */
  const importNotifications = useCallback(async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const imported = JSON.parse(content) as NotificationData[];
          
          // Validar estructura
          if (!Array.isArray(imported)) {
            throw new Error('Formato de archivo inválido');
          }
          
          // Crear notificaciones importadas
          for (const notification of imported) {
            await notificationService.create({
              ...notification,
              id: undefined, // Generar nuevo ID
              source: 'user',
              timestamp: new Date()
            });
          }
          
          await loadNotifications();
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };
      
      reader.readAsText(file);
    });
  }, [loadNotifications]);

  // Calcular contador de no leídas
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Efectos
  useEffect(() => {
    isMountedRef.current = true;
    
    // Cargar notificaciones iniciales
    loadNotifications();
    
    // Configurar listeners
    const cleanupListeners = setupServiceListeners();
    
    // Configurar sincronización periódica
    const cleanupSync = setupPeriodicSync();
    
    // Cleanup
    return () => {
      isMountedRef.current = false;
      cleanupListeners();
      cleanupSync();
    };
  }, [loadNotifications, setupServiceListeners, setupPeriodicSync]);

  // Recargar cuando cambia el filtro
  useEffect(() => {
    loadNotifications();
  }, [filter, loadNotifications]);

  // Sincronizar cuando el usuario se conecta
  useEffect(() => {
    if (user && isConnected) {
      notificationService.sync();
    }
  }, [user, isConnected]);

  return {
    // Datos
    notifications,
    unreadCount,
    stats,
    preferences,
    
    // Estados
    isLoading,
    error,
    isConnected,
    
    // Acciones
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refresh,
    updatePreferences,
    
    // Filtrado
    setFilter,
    clearFilter,
    
    // Utilidades
    requestPermission,
    exportNotifications,
    importNotifications
  };
};

// Hook simplificado para crear notificaciones rápidas
export const useNotify = () => {
  const { createNotification } = useNotifications();
  
  return {
    success: (message: string, title?: string) => createNotification({
      type: 'success',
      title,
      message,
      autoClose: true,
      duration: 5000
    }),
    
    error: (message: string, title?: string) => createNotification({
      type: 'error',
      title,
      message,
      autoClose: false,
      priority: 'high'
    }),
    
    warning: (message: string, title?: string) => createNotification({
      type: 'warning',
      title,
      message,
      autoClose: true,
      duration: 7000
    }),
    
    info: (message: string, title?: string) => createNotification({
      type: 'info',
      title,
      message,
      autoClose: true,
      duration: 5000
    }),
    
    urgent: (message: string, title?: string) => createNotification({
      type: 'error',
      title,
      message,
      priority: 'urgent',
      autoClose: false,
      sound: true,
      vibrate: true,
      persistent: true
    })
  };
};

export default useNotifications;