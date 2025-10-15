/**
 * Notification Service - Sprint 2
 * Siguiendo lineamientos nivel 2: Servicio especializado para gestión de notificaciones
 * Implementa patrón Adapter y Strategy para diferentes tipos de notificaciones
 */

import { api } from '@/shared/services/api';
import { tokenService } from '@/shared/services/tokenService';

/**
 * Simple EventEmitter implementation for browser compatibility
 * Replaces Node.js 'events' module
 */
class EventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this.events.get(event);
    if (!listeners || listeners.length === 0) {
      return false;
    }
    listeners.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for '${event}':`, error);
      }
    });
    return true;
  }

  removeListener(event: string, listener: Function): this {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  // Alias for removeListener (for compatibility)
  off(event: string, listener: Function): this {
    return this.removeListener(event, listener);
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }
}

// Tipos de notificación
export interface NotificationData {
  id?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  timestamp?: Date;
  read?: boolean;
  autoClose?: boolean;
  duration?: number;
  actions?: NotificationAction[];
  icon?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  data?: any;
  persistent?: boolean;
  sound?: boolean;
  vibrate?: boolean;
  stackKey?: string;
  source?: 'system' | 'user' | 'server' | 'push';
  metadata?: Record<string, any>;
}

export interface NotificationAction {
  label: string;
  action: string;
  payload?: any;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  variant?: 'text' | 'outlined' | 'contained';
}

export interface NotificationFilter {
  types?: string[];
  categories?: string[];
  priorities?: string[];
  read?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
}

export interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  vibrate: boolean;
  desktop: boolean;
  categories: Record<string, boolean>;
  priorities: string[];
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

/**
 * Estrategia base para procesamiento de notificaciones
 */
abstract class NotificationStrategy {
  abstract canHandle(notification: NotificationData): boolean;
  abstract process(notification: NotificationData): Promise<void>;
  abstract getPriority(): number;
}

/**
 * Estrategia para notificaciones urgentes
 */
class UrgentNotificationStrategy extends NotificationStrategy {
  canHandle(notification: NotificationData): boolean {
    return notification.priority === 'urgent';
  }

  async process(notification: NotificationData): Promise<void> {
    // Reproducir sonido de alerta
    if (notification.sound !== false) {
      await this.playUrgentSound();
    }

    // Vibrar en dispositivos móviles
    if (notification.vibrate !== false && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // Mostrar notificación del sistema si está permitido
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title || 'Notificación Urgente', {
        body: notification.message,
        icon: '/icons/urgent.png',
        badge: '/icons/badge.png',
        tag: notification.id,
        requireInteraction: true
      });
    }
  }

  getPriority(): number {
    return 100;
  }

  private async playUrgentSound(): Promise<void> {
    const audio = new Audio('/sounds/urgent.mp3');
    audio.volume = 0.8;
    await audio.play().catch(console.error);
  }
}

/**
 * Estrategia para notificaciones de error
 */
class ErrorNotificationStrategy extends NotificationStrategy {
  canHandle(notification: NotificationData): boolean {
    return notification.type === 'error';
  }

  async process(notification: NotificationData): Promise<void> {
    // Log del error para debugging
    console.error('[Notification Error]', notification);

    // Guardar en almacenamiento local para persistencia
    this.saveToLocalStorage(notification);

    // Enviar telemetría si está configurado
    if (notification.metadata?.sendTelemetry) {
      await this.sendErrorTelemetry(notification);
    }
  }

  getPriority(): number {
    return 90;
  }

  private saveToLocalStorage(notification: NotificationData): void {
    const errors = JSON.parse(localStorage.getItem('notification-errors') || '[]');
    errors.push({
      ...notification,
      timestamp: new Date().toISOString()
    });
    
    // Mantener solo los últimos 50 errores
    if (errors.length > 50) {
      errors.splice(0, errors.length - 50);
    }
    
    localStorage.setItem('notification-errors', JSON.stringify(errors));
  }

  private async sendErrorTelemetry(notification: NotificationData): Promise<void> {
    try {
      await api.post('/telemetry/errors', {
        notification,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to send error telemetry:', error);
    }
  }
}

/**
 * Estrategia para notificaciones de progreso
 */
class ProgressNotificationStrategy extends NotificationStrategy {
  private progressTrackers = new Map<string, number>();

  canHandle(notification: NotificationData): boolean {
    return notification.data?.progress !== undefined;
  }

  async process(notification: NotificationData): Promise<void> {
    const progress = notification.data.progress;
    const taskId = notification.data.taskId || notification.id;

    if (taskId) {
      this.progressTrackers.set(taskId, progress);

      // Completar cuando llega al 100%
      if (progress >= 100) {
        this.completeProgress(taskId, notification);
      }
    }
  }

  getPriority(): number {
    return 50;
  }

  private completeProgress(taskId: string, notification: NotificationData): void {
    this.progressTrackers.delete(taskId);
    
    // Crear notificación de completado
    const completionNotification: NotificationData = {
      ...notification,
      type: 'success',
      title: 'Tarea Completada',
      message: `${notification.title || 'Tarea'} ha sido completada exitosamente`,
      autoClose: true,
      duration: 5000
    };

    // Emitir evento de completado
    notificationService.emit('progress-complete', completionNotification);
  }
}

/**
 * Servicio principal de notificaciones
 * Siguiendo principios SOLID - Responsabilidad única para gestión de notificaciones
 */
class NotificationService extends EventEmitter {
  private strategies: NotificationStrategy[] = [];
  private notificationQueue: NotificationData[] = [];
  private isProcessing = false;
  private preferences: NotificationPreferences | null = null;
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 3000;
  private readonly storageKey = 'notifications-history';
  private readonly maxStoredNotifications = 100;

  constructor() {
    super();
    this.initializeStrategies();
    this.loadPreferences();
    this.setupWebSocket();
    this.setupEventListeners();
    this.restoreFromStorage();
  }

  /**
   * Inicializa las estrategias de notificación
   */
  private initializeStrategies(): void {
    this.strategies = [
      new UrgentNotificationStrategy(),
      new ErrorNotificationStrategy(),
      new ProgressNotificationStrategy()
    ];

    // Ordenar por prioridad
    this.strategies.sort((a, b) => b.getPriority() - a.getPriority());
  }

  /**
   * Carga preferencias del usuario
   */
  private async loadPreferences(): Promise<void> {
    try {
      const stored = localStorage.getItem('notification-preferences');
      if (stored) {
        this.preferences = JSON.parse(stored);
      } else {
        // Preferencias por defecto
        this.preferences = {
          enabled: true,
          sound: true,
          vibrate: true,
          desktop: true,
          categories: {},
          priorities: ['urgent', 'high', 'medium', 'low']
        };
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  }

  /**
   * Configura WebSocket para notificaciones en tiempo real
   */
  private setupWebSocket(): void {
    const token = tokenService.getAccessToken();
    if (!token) return;

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    
    try {
      this.websocket = new WebSocket(`${wsUrl}/notifications?token=${token}`);

      this.websocket.onopen = () => {
        console.log('[NotificationService] WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('websocket-connected');
      };

      this.websocket.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data) as NotificationData;
          this.handleIncomingNotification(notification);
        } catch (error) {
          console.error('[NotificationService] Error parsing WebSocket message:', error);
        }
      };

      this.websocket.onerror = (error) => {
        console.error('[NotificationService] WebSocket error:', error);
        this.emit('websocket-error', error);
      };

      this.websocket.onclose = () => {
        console.log('[NotificationService] WebSocket disconnected');
        this.emit('websocket-disconnected');
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('[NotificationService] Failed to setup WebSocket:', error);
    }
  }

  /**
   * Intenta reconectar WebSocket
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[NotificationService] Max reconnection attempts reached');
      this.emit('websocket-failed');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[NotificationService] Reconnecting... Attempt ${this.reconnectAttempts}`);
    
    setTimeout(() => {
      this.setupWebSocket();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Configura listeners de eventos del sistema
   */
  private setupEventListeners(): void {
    // Escuchar cambios de visibilidad para pausar/reanudar
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });

    // Escuchar eventos de red
    window.addEventListener('online', () => {
      console.log('[NotificationService] Network online');
      this.sync();
    });

    window.addEventListener('offline', () => {
      console.log('[NotificationService] Network offline');
    });

    // Limpiar al cerrar
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  /**
   * Restaura notificaciones del almacenamiento local
   */
  private restoreFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const notifications = JSON.parse(stored) as NotificationData[];
        // Restaurar solo notificaciones persistentes no leídas
        const toRestore = notifications.filter(n => n.persistent && !n.read);
        toRestore.forEach(n => this.emit('notification-restored', n));
      }
    } catch (error) {
      console.error('[NotificationService] Error restoring notifications:', error);
    }
  }

  /**
   * Crea y procesa una nueva notificación
   */
  public async create(data: Partial<NotificationData>): Promise<NotificationData> {
    const notification: NotificationData = {
      id: this.generateId(),
      type: 'info',
      message: '',
      timestamp: new Date(),
      read: false,
      autoClose: true,
      duration: 5000,
      source: 'system',
      ...data
    };

    // Validar y aplicar preferencias
    if (!this.shouldShowNotification(notification)) {
      console.log('[NotificationService] Notification filtered by preferences');
      return notification;
    }

    // Agregar a la cola
    this.notificationQueue.push(notification);
    
    // Procesar la cola
    await this.processQueue();

    // Guardar en historial
    this.saveToHistory(notification);

    // Emitir evento
    this.emit('notification-created', notification);

    return notification;
  }

  /**
   * Procesa la cola de notificaciones
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift()!;
      
      // Aplicar estrategias
      for (const strategy of this.strategies) {
        if (strategy.canHandle(notification)) {
          await strategy.process(notification);
        }
      }

      // Emitir a la UI
      this.emit('notification-show', notification);

      // Pequeña pausa entre notificaciones
      if (this.notificationQueue.length > 0) {
        await this.delay(100);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Maneja notificaciones entrantes del servidor
   */
  private async handleIncomingNotification(notification: NotificationData): Promise<void> {
    console.log('[NotificationService] Incoming notification:', notification);
    
    // Marcar como del servidor
    notification.source = 'server';
    notification.timestamp = new Date(notification.timestamp || Date.now());
    
    // Crear la notificación
    await this.create(notification);
  }

  /**
   * Verifica si debe mostrar la notificación según preferencias
   */
  private shouldShowNotification(notification: NotificationData): boolean {
    if (!this.preferences?.enabled) {
      return false;
    }

    // Verificar horario silencioso
    if (this.preferences.quietHours?.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours()}:${now.getMinutes()}`;
      const { start, end } = this.preferences.quietHours;
      
      if (this.isInQuietHours(currentTime, start, end)) {
        // Permitir solo notificaciones urgentes en horario silencioso
        return notification.priority === 'urgent';
      }
    }

    // Verificar categoría
    if (notification.category && this.preferences.categories[notification.category] === false) {
      return false;
    }

    // Verificar prioridad
    if (notification.priority && !this.preferences.priorities.includes(notification.priority)) {
      return false;
    }

    return true;
  }

  /**
   * Verifica si estamos en horario silencioso
   */
  private isInQuietHours(current: string, start: string, end: string): boolean {
    const [currentHour, currentMin] = current.split(':').map(Number);
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    const currentMinutes = currentHour * 60 + currentMin;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Horario que cruza medianoche
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  /**
   * Guarda notificación en el historial
   */
  private saveToHistory(notification: NotificationData): void {
    try {
      const history = this.getHistory();
      history.unshift(notification);
      
      // Limitar el tamaño del historial
      if (history.length > this.maxStoredNotifications) {
        history.splice(this.maxStoredNotifications);
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(history));
    } catch (error) {
      console.error('[NotificationService] Error saving to history:', error);
    }
  }

  /**
   * Obtiene el historial de notificaciones
   */
  public getHistory(filter?: NotificationFilter): NotificationData[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];
      
      let history = JSON.parse(stored) as NotificationData[];
      
      // Aplicar filtros si existen
      if (filter) {
        history = this.applyFilters(history, filter);
      }
      
      return history;
    } catch (error) {
      console.error('[NotificationService] Error getting history:', error);
      return [];
    }
  }

  /**
   * Aplica filtros al historial
   */
  private applyFilters(notifications: NotificationData[], filter: NotificationFilter): NotificationData[] {
    let filtered = [...notifications];
    
    if (filter.types?.length) {
      filtered = filtered.filter(n => filter.types!.includes(n.type));
    }
    
    if (filter.categories?.length) {
      filtered = filtered.filter(n => n.category && filter.categories!.includes(n.category));
    }
    
    if (filter.priorities?.length) {
      filtered = filtered.filter(n => n.priority && filter.priorities!.includes(n.priority));
    }
    
    if (filter.read !== undefined) {
      filtered = filtered.filter(n => n.read === filter.read);
    }
    
    if (filter.dateFrom) {
      filtered = filtered.filter(n => new Date(n.timestamp!) >= filter.dateFrom!);
    }
    
    if (filter.dateTo) {
      filtered = filtered.filter(n => new Date(n.timestamp!) <= filter.dateTo!);
    }
    
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(n => 
        n.title?.toLowerCase().includes(searchLower) ||
        n.message.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }

  /**
   * Obtiene estadísticas de notificaciones
   */
  public getStats(): NotificationStats {
    const history = this.getHistory();
    
    const stats: NotificationStats = {
      total: history.length,
      unread: history.filter(n => !n.read).length,
      byType: {},
      byCategory: {},
      byPriority: {}
    };
    
    // Calcular estadísticas por tipo
    history.forEach(n => {
      // Por tipo
      stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
      
      // Por categoría
      if (n.category) {
        stats.byCategory[n.category] = (stats.byCategory[n.category] || 0) + 1;
      }
      
      // Por prioridad
      if (n.priority) {
        stats.byPriority[n.priority] = (stats.byPriority[n.priority] || 0) + 1;
      }
    });
    
    return stats;
  }

  /**
   * Marca una notificación como leída
   */
  public markAsRead(notificationId: string): void {
    const history = this.getHistory();
    const notification = history.find(n => n.id === notificationId);
    
    if (notification) {
      notification.read = true;
      localStorage.setItem(this.storageKey, JSON.stringify(history));
      this.emit('notification-read', notificationId);
    }
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  public markAllAsRead(): void {
    const history = this.getHistory();
    history.forEach(n => n.read = true);
    localStorage.setItem(this.storageKey, JSON.stringify(history));
    this.emit('all-notifications-read');
  }

  /**
   * Elimina una notificación
   */
  public remove(notificationId: string): void {
    const history = this.getHistory();
    const index = history.findIndex(n => n.id === notificationId);
    
    if (index !== -1) {
      history.splice(index, 1);
      localStorage.setItem(this.storageKey, JSON.stringify(history));
      this.emit('notification-removed', notificationId);
    }
  }

  /**
   * Limpia todas las notificaciones
   */
  public clearAll(): void {
    localStorage.removeItem(this.storageKey);
    this.emit('all-notifications-cleared');
  }

  /**
   * Actualiza las preferencias de notificación
   */
  public updatePreferences(preferences: Partial<NotificationPreferences>): void {
    this.preferences = {
      ...this.preferences!,
      ...preferences
    };
    
    localStorage.setItem('notification-preferences', JSON.stringify(this.preferences));
    this.emit('preferences-updated', this.preferences);
  }

  /**
   * Obtiene las preferencias actuales
   */
  public getPreferences(): NotificationPreferences | null {
    return this.preferences;
  }

  /**
   * Solicita permisos de notificación del navegador
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('[NotificationService] Browser does not support notifications');
      return 'denied';
    }
    
    const permission = await Notification.requestPermission();
    
    if (this.preferences) {
      this.preferences.desktop = permission === 'granted';
      this.updatePreferences(this.preferences);
    }
    
    return permission;
  }

  /**
   * Sincroniza con el servidor
   */
  public async sync(): Promise<void> {
    try {
      const response = await api.get('/notifications/sync', {
        headers: tokenService.getAuthHeaders(),
        params: {
          lastSync: localStorage.getItem('last-notification-sync') || undefined
        }
      });
      
      if (response.data.success && response.data.data.notifications) {
        for (const notification of response.data.data.notifications) {
          await this.create(notification);
        }
        
        localStorage.setItem('last-notification-sync', new Date().toISOString());
      }
    } catch (error) {
      console.error('[NotificationService] Sync failed:', error);
    }
  }

  /**
   * Pausa el procesamiento de notificaciones
   */
  public pause(): void {
    this.emit('notifications-paused');
  }

  /**
   * Reanuda el procesamiento de notificaciones
   */
  public resume(): void {
    this.emit('notifications-resumed');
    this.processQueue();
  }

  /**
   * Limpia recursos
   */
  public cleanup(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    this.removeAllListeners();
    this.notificationQueue = [];
  }

  /**
   * Genera un ID único para la notificación
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utilidad para delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instancia singleton del servicio
export const notificationService = new NotificationService();

// Exports adicionales
export default notificationService;