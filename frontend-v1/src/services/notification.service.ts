// Servicio de notificaciones push - MVP Nivel 1
// TODO: En Nivel 2 agregar service workers, PWA, notificaciones nativas

import { eventBus, SystemEvents } from './eventBus.service';
import { useRealtimeStore } from '@/shared/store/realtimeStore';
import { websocketService } from './websocket.service';

export interface NotificationOptions {
  id?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number; // ms, 0 = persistente
  actions?: NotificationAction[];
  icon?: string;
  image?: string;
  data?: any;
  sound?: boolean;
  vibrate?: boolean | number[];
  requireInteraction?: boolean;
  tag?: string; // Para agrupar notificaciones
  silent?: boolean;
}

export interface NotificationAction {
  label: string;
  action: string | (() => void);
  icon?: string;
  primary?: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';
  private isSupported: boolean;
  private soundEnabled = true;
  private vibrationEnabled = true;
  private defaultDuration = 5000;
  private audioContext: AudioContext | null = null;
  private notificationSound: HTMLAudioElement | null = null;

  private constructor() {
    this.isSupported = 'Notification' in window;
    this.init();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async init() {
    // Verificar soporte
    if (!this.isSupported) {
      console.warn('[NotificationService] Notifications not supported');
      return;
    }

    // Obtener permisos actuales
    this.permission = Notification.permission;

    // Preparar sonido de notificación
    this.setupNotificationSound();

    // Escuchar notificaciones del WebSocket
    this.setupWebSocketListener();

    // Escuchar eventos del sistema
    this.setupEventListeners();
  }

  // Solicitar permisos
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      return 'denied';
    }

    if (this.permission !== 'default') {
      return this.permission;
    }

    try {
      this.permission = await Notification.requestPermission();
      return this.permission;
    } catch (error) {
      console.error('[NotificationService] Error requesting permission:', error);
      return 'denied';
    }
  }

  // Mostrar notificación en la aplicación
  show(options: NotificationOptions): string {
    const notificationId = options.id || this.generateId();
    
    // Agregar al store
    useRealtimeStore.getState().addNotification({
      type: options.type || 'info',
      title: options.title,
      message: options.message,
      data: options.data,
      actions: options.actions?.map(action => ({
        label: action.label,
        action: typeof action.action === 'function' 
          ? action.action 
          : () => this.handleAction(action.action as string)
      }))
    });

    // Reproducir sonido si está habilitado
    if (options.sound !== false && this.soundEnabled) {
      this.playSound();
    }

    // Vibrar si está habilitado
    if (options.vibrate !== false && this.vibrationEnabled) {
      this.vibrate(options.vibrate);
    }

    // Auto-dismiss si tiene duración
    if (options.duration !== 0) {
      setTimeout(() => {
        this.dismiss(notificationId);
      }, options.duration || this.defaultDuration);
    }

    // Emitir evento
    eventBus.emit(SystemEvents.NOTIFICATION_SHOW, {
      id: notificationId,
      ...options
    });

    // Intentar mostrar notificación nativa si tiene permisos
    if (this.permission === 'granted' && options.requireInteraction) {
      this.showNative(options);
    }

    return notificationId;
  }

  // Mostrar notificación nativa del navegador
  private async showNative(options: NotificationOptions) {
    if (!this.isSupported || this.permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.message,
        icon: options.icon || '/icon-192x192.png', // TODO: Agregar icono real
        image: options.image,
        tag: options.tag,
        silent: options.silent,
        requireInteraction: options.requireInteraction,
        data: options.data,
        vibrate: options.vibrate === true ? [200, 100, 200] : 
                options.vibrate || undefined,
        actions: options.actions?.map(a => ({
          action: typeof a.action === 'string' ? a.action : 'custom',
          title: a.label,
          icon: a.icon
        }))
      });

      // Manejar clicks
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Ejecutar acción por defecto si existe
        const primaryAction = options.actions?.find(a => a.primary);
        if (primaryAction && typeof primaryAction.action === 'function') {
          primaryAction.action();
        }
      };

      // Auto-cerrar
      if (options.duration && options.duration > 0) {
        setTimeout(() => notification.close(), options.duration);
      }

    } catch (error) {
      console.error('[NotificationService] Error showing native notification:', error);
    }
  }

  // Descartar notificación
  dismiss(id: string) {
    useRealtimeStore.getState().removeNotification(id);
    eventBus.emit(SystemEvents.NOTIFICATION_DISMISS, { id });
  }

  // Descartar todas las notificaciones
  dismissAll() {
    useRealtimeStore.getState().clearNotifications();
  }

  // Marcar como leída
  markAsRead(id: string) {
    useRealtimeStore.getState().markNotificationAsRead(id);
  }

  // Marcar todas como leídas
  markAllAsRead() {
    useRealtimeStore.getState().markAllNotificationsAsRead();
  }

  // Configuración
  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  setVibrationEnabled(enabled: boolean) {
    this.vibrationEnabled = enabled;
  }

  setDefaultDuration(duration: number) {
    this.defaultDuration = duration;
  }

  // Utilidades privadas
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupNotificationSound() {
    // Crear elemento de audio para el sonido
    this.notificationSound = new Audio();
    this.notificationSound.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhCi+Gy/DWhzAHFWzA7OOcSw8LUqzn77VjHAc3kNbzyn0vBil1yO7ilEILFV+y6OypWBELSaPj8LZiHAg2ktXzzHksBSl3x+/jlEAKFV+06+uoVRcKRqPg8rxsIAkuhMrvzYwwBxdoyO3fnEwNCkys5+u7Wx8HM5LT77p1KwUldMbvz4U2CRFds+rrlEAKFWHC7OGaTA8KTKvn77tiHgc2k9XzzXksBiV3yO3jlEILFVyx5+upWRULQprh8LplHgg4j9f01HwvByZ1yO7klEMJFV+05+mrWRQLRKXi77tiHAc3lNbwy3ouBil0ye/glEIKFWC36OylWRUKRKXh8LdlGwc3lNXvy3ouBSh0x+7glEILFV+y6+mnVRUKQ5/n9LVeGAo3ltL317RWNgtYsOnqpFUQDEeP3/S7Xh0GM5LU8cV+MAktemXH/+eVQggTbbnsstmPRBEPXrPq6KpUGQ1CltPxyHYxBSh2yO7gjEYNGGLA7eSXRxAMTKzn77RgGwc3lNb1y3ksBih1yO7gjEIKFV+x6+moVRQKRJ7j8LVeGwk3ltT1y3wuBSh1ye/klEIHFV+y5+mqVRQLRKPg8LVlHgg4ktXwy3ouBCh3yu/mjEIJFVC06OmqUBgFRKPh8rVeHAg3j9b0y3wuBSh1ye/mjEIKFVux6+upWRYLRJ7j8LVlGwc3ldT0y3wuBSh0yO3kjEILFV+x5+mrVRQLRKPg8LVeGwg3lNXvy3wuBSh1ye/glEIKFV+x5+mqVRQLRKPg8LRlGwg3lNT0y3wuBSh1x+/mjEILFV+x5+mrVRULRKPg8LVlGwo3lNT0y3wuBSh1ye/mjEILFV+x5+uqVRcLRKPg8bRlGwg3lNT0y3wuBih1ye/mjEIKFV+x6+mnVRQKRKPg8LVlGwg3lNT0y3wuBSh1ye/mjEIKFV6x6+mpVRQKRKPg8LVlGwg3lNT0y3wuBSh1ye/mjEIKFV+y6OupVRULRKPg8LVlGwg3lNT0y3wuBSh1ye/mjEILFV+x5+qpVRQKRKPg8bRlGwg3lNT0y3wuBSh1ye/mjEIKFV+x6+mnVRQKRKPg8LVlGwg3lNT0y3wuBSh1ye/mjEIKGF+x5+qpVRQKRKPg8LVlGwg3lNT0y34uBSh1ye/mjEIKFV+x5+upVRQKRKPg8LVlGwg3lNT0y3wuBSh1ye/mjEIKFV+x5+upVRQKRJ/g8LVlGwg3lNT0y3wuBSh1ye/mjEIKFF+x5+upVRQKRKPg8LVlGwg3lNT0y3wuBSh1ye/mjEIKFV+x5+upVRQKRKPg8LVlGwg3lNT0y3wuBSh1ye/mjEIKFV+x5+upVRQKRKPg8LVlHAc3lNT0y3wuBSh1ye/mjEIKFV+x5+upVRQKRKPg8LVlHAc3lNT0y3wuBSh1ye/mjEIKFV+x5+upVRQKRKPg8LVlHAc3lNT0y3wuBSh1ye/mjEIKFV+x5+upVRQKRKPg8LVlHAc3lNT0y3wuBSh1ye/mjEIKFV+x5+upVRQKRKPg8LVlGwc3lNT0y3wuBSh1ye/mjEIKFV+x5+upVRQKRKPg8LVlGwg3lNT0y3wuBSh1ye/mjEIKFV+x5+upVRQKRKPg8LVlGwc3lNT0y3wuBSh1ye/mjEIKFV+y5+upVRQKRKPg8LVlGwc3lNT0y3wuBSh1ye/mjEIKFV+x5+upVQ==';
    this.notificationSound.volume = 0.5;
  }

  private playSound() {
    if (!this.notificationSound || !this.soundEnabled) return;
    
    try {
      // Clonar el audio para permitir múltiples reproducciones simultáneas
      const audio = this.notificationSound.cloneNode() as HTMLAudioElement;
      audio.play().catch(e => {
        console.warn('[NotificationService] Could not play sound:', e);
      });
    } catch (error) {
      console.error('[NotificationService] Error playing sound:', error);
    }
  }

  private vibrate(pattern?: boolean | number[]) {
    if (!this.vibrationEnabled || !('vibrate' in navigator)) return;
    
    try {
      if (pattern === true) {
        navigator.vibrate(200);
      } else if (Array.isArray(pattern)) {
        navigator.vibrate(pattern);
      }
    } catch (error) {
      console.error('[NotificationService] Error vibrating:', error);
    }
  }

  private handleAction(action: string) {
    // Emitir evento para que otros componentes puedan manejar la acción
    eventBus.emit('notification:action', { action });
  }

  private setupWebSocketListener() {
    // Escuchar notificaciones del WebSocket
    websocketService.on('message:notification', (message) => {
      this.show({
        type: message.data?.type || 'info',
        title: message.data?.title || 'Nueva notificación',
        message: message.data?.message,
        data: message.data,
        duration: message.data?.duration
      });
    });
  }

  private setupEventListeners() {
    // Escuchar eventos del sistema
    eventBus.on(SystemEvents.USER_LOGIN, () => {
      this.show({
        type: 'success',
        title: 'Bienvenido',
        message: 'Has iniciado sesión correctamente',
        duration: 3000
      });
    });

    eventBus.on(SystemEvents.USER_LOGOUT, () => {
      this.show({
        type: 'info',
        title: 'Sesión cerrada',
        message: 'Has cerrado sesión correctamente',
        duration: 3000
      });
    });

    eventBus.on(SystemEvents.WS_CONNECTED, () => {
      // Solo mostrar si había estado desconectado previamente
      const store = useRealtimeStore.getState();
      if (store.stats.reconnections > 0) {
        this.show({
          type: 'success',
          title: 'Conexión restaurada',
          message: 'Se ha restablecido la conexión',
          duration: 3000
        });
      }
    });

    eventBus.on(SystemEvents.WS_ERROR, () => {
      this.show({
        type: 'error',
        title: 'Error de conexión',
        message: 'Ha ocurrido un error en la conexión',
        duration: 5000
      });
    });

    eventBus.on(SystemEvents.APP_OFFLINE, () => {
      this.show({
        type: 'warning',
        title: 'Sin conexión',
        message: 'No hay conexión a internet',
        duration: 0, // Persistente
        requireInteraction: true
      });
    });

    eventBus.on(SystemEvents.APP_ONLINE, () => {
      this.show({
        type: 'success',
        title: 'Conexión restaurada',
        message: 'La conexión a internet se ha restablecido',
        duration: 3000
      });
    });
  }

  // Getters
  getPermission(): NotificationPermission {
    return this.permission;
  }

  isPermissionGranted(): boolean {
    return this.permission === 'granted';
  }

  isNotificationSupported(): boolean {
    return this.isSupported;
  }

  isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  isVibrationEnabled(): boolean {
    return this.vibrationEnabled;
  }
}

// Crear y exportar instancia singleton
export const notificationService = NotificationService.getInstance();

// Hook para usar en componentes React
import { useEffect, useState } from 'react';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    notificationService.getPermission()
  );

  const requestPermission = async () => {
    const perm = await notificationService.requestPermission();
    setPermission(perm);
    return perm;
  };

  const show = (options: NotificationOptions) => {
    return notificationService.show(options);
  };

  const dismiss = (id: string) => {
    notificationService.dismiss(id);
  };

  const dismissAll = () => {
    notificationService.dismissAll();
  };

  useEffect(() => {
    // Actualizar permiso si cambia
    const checkPermission = () => {
      setPermission(notificationService.getPermission());
    };

    // Verificar periódicamente (por si el usuario cambia permisos externamente)
    const interval = setInterval(checkPermission, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    permission,
    requestPermission,
    show,
    dismiss,
    dismissAll,
    isSupported: notificationService.isNotificationSupported(),
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    isDefault: permission === 'default'
  };
}

export default notificationService;