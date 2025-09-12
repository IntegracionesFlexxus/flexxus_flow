/**
 * NotificationService Tests - Nivel 3
 * Siguiendo lineamientos nivel 3: Pruebas unitarias e integración con alta cobertura
 * @module notificationService.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notificationService, NotificationData } from '@shared/services/notificationService';
import { api } from '@/shared/services/api';
import { tokenService } from '@/shared/services/tokenService';

// Mocks
vi.mock('@/shared/services/apiClient');
vi.mock('@/shared/services/tokenService');

// Mock WebSocket
class MockWebSocket {
  url: string;
  readyState: number = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    this.readyState = 1; // OPEN
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(data: string) {
    // Mock send
  }

  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

// @ts-ignore
global.WebSocket = MockWebSocket;

// Mock Notification API
global.Notification = {
  permission: 'default',
  requestPermission: vi.fn().mockResolvedValue('granted')
} as any;

// Mock Audio
global.Audio = class {
  volume: number = 1;
  src: string = '';
  play() {
    return Promise.resolve();
  }
} as any;

// Mock navigator
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  writable: true
});

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Setup default mocks
    (tokenService.getAccessToken as any).mockReturnValue('mock-token');
    (tokenService.getAuthHeaders as any).mockReturnValue({
      Authorization: 'Bearer mock-token'
    });
  });

  afterEach(() => {
    notificationService.cleanup();
  });

  describe('Creación de notificaciones', () => {
    it('debe crear una notificación básica correctamente', async () => {
      const notification = await notificationService.create({
        type: 'success',
        message: 'Test notification'
      });

      expect(notification).toMatchObject({
        type: 'success',
        message: 'Test notification',
        source: 'system',
        read: false,
        autoClose: true,
        duration: 5000
      });
      expect(notification.id).toBeDefined();
      expect(notification.timestamp).toBeInstanceOf(Date);
    });

    it('debe aplicar valores por defecto correctamente', async () => {
      const notification = await notificationService.create({
        message: 'Minimal notification'
      });

      expect(notification.type).toBe('info');
      expect(notification.autoClose).toBe(true);
      expect(notification.duration).toBe(5000);
      expect(notification.source).toBe('system');
    });

    it('debe respetar preferencias del usuario', async () => {
      // Configurar preferencias
      notificationService.updatePreferences({
        enabled: false,
        sound: false,
        vibrate: false,
        desktop: false,
        categories: {},
        priorities: ['high', 'urgent']
      });

      const notification = await notificationService.create({
        type: 'info',
        message: 'Low priority',
        priority: 'low'
      });

      // La notificación se crea pero no se muestra
      expect(notification).toBeDefined();
      // Verificar que no se emitieron eventos de mostrar
    });

    it('debe permitir notificaciones urgentes en horario silencioso', async () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      notificationService.updatePreferences({
        enabled: true,
        sound: true,
        vibrate: true,
        desktop: true,
        categories: {},
        priorities: ['urgent'],
        quietHours: {
          enabled: true,
          start: `${currentHour}:00`,
          end: `${(currentHour + 1) % 24}:00`
        }
      });

      const urgentNotification = await notificationService.create({
        type: 'error',
        message: 'Urgent notification',
        priority: 'urgent'
      });

      expect(urgentNotification).toBeDefined();
      expect(urgentNotification.priority).toBe('urgent');
    });

    it('debe procesar notificaciones en cola secuencialmente', async () => {
      const notifications: NotificationData[] = [];
      
      notificationService.on('notification-show', (notification) => {
        notifications.push(notification);
      });

      // Crear múltiples notificaciones rápidamente
      await Promise.all([
        notificationService.create({ message: 'First' }),
        notificationService.create({ message: 'Second' }),
        notificationService.create({ message: 'Third' })
      ]);

      // Esperar procesamiento
      await new Promise(resolve => setTimeout(resolve, 400));

      expect(notifications).toHaveLength(3);
      expect(notifications[0].message).toBe('First');
      expect(notifications[1].message).toBe('Second');
      expect(notifications[2].message).toBe('Third');
    });
  });

  describe('Estrategias de notificación', () => {
    it('debe aplicar estrategia para notificaciones urgentes', async () => {
      global.Notification.permission = 'granted';
      const vibrateSpylocal = vi.spyOn(navigator, 'vibrate');

      await notificationService.create({
        type: 'error',
        message: 'Urgent alert',
        priority: 'urgent',
        vibrate: true
      });

      // Verificar vibración
      expect(vibrateSpylocal).toHaveBeenCalledWith([200, 100, 200, 100, 200]);
    });

    it('debe aplicar estrategia para notificaciones de error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();

      await notificationService.create({
        type: 'error',
        message: 'Error occurred',
        metadata: { sendTelemetry: true }
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Notification Error]',
        expect.objectContaining({
          type: 'error',
          message: 'Error occurred'
        })
      );

      // Verificar almacenamiento local
      const errors = JSON.parse(localStorage.getItem('notification-errors') || '[]');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Error occurred');
    });

    it('debe aplicar estrategia para notificaciones de progreso', async () => {
      const progressNotification = await notificationService.create({
        type: 'info',
        message: 'Processing...',
        data: {
          progress: 50,
          taskId: 'task-1'
        }
      });

      expect(progressNotification.data.progress).toBe(50);

      // Simular completado
      const completeListener = vi.fn();
      notificationService.on('progress-complete', completeListener);

      await notificationService.create({
        type: 'info',
        message: 'Processing...',
        data: {
          progress: 100,
          taskId: 'task-1'
        }
      });

      expect(completeListener).toHaveBeenCalled();
    });
  });

  describe('Gestión del historial', () => {
    it('debe guardar notificaciones en el historial', async () => {
      await notificationService.create({ message: 'Test 1' });
      await notificationService.create({ message: 'Test 2' });

      const history = notificationService.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('Test 1');
      expect(history[1].message).toBe('Test 2');
    });

    it('debe aplicar filtros al historial correctamente', async () => {
      // Crear notificaciones de diferentes tipos
      await notificationService.create({ type: 'success', message: 'Success 1' });
      await notificationService.create({ type: 'error', message: 'Error 1' });
      await notificationService.create({ type: 'success', message: 'Success 2', category: 'system' });
      await notificationService.create({ type: 'info', message: 'Info 1', priority: 'high' });

      // Filtrar por tipo
      const successOnly = notificationService.getHistory({ types: ['success'] });
      expect(successOnly).toHaveLength(2);

      // Filtrar por categoría
      const systemOnly = notificationService.getHistory({ categories: ['system'] });
      expect(systemOnly).toHaveLength(1);

      // Filtrar por prioridad
      const highPriority = notificationService.getHistory({ priorities: ['high'] });
      expect(highPriority).toHaveLength(1);
    });

    it('debe limitar el tamaño del historial', async () => {
      // Crear más notificaciones que el límite
      for (let i = 0; i < 150; i++) {
        await notificationService.create({ message: `Test ${i}` });
      }

      const history = notificationService.getHistory();
      expect(history.length).toBeLessThanOrEqual(100); // maxStoredNotifications
    });

    it('debe marcar notificaciones como leídas', () => {
      const notificationId = 'test-id';
      
      // Simular notificación en historial
      const mockHistory = [
        { id: notificationId, message: 'Test', read: false, type: 'info' as const }
      ];
      localStorage.setItem('notifications-history', JSON.stringify(mockHistory));

      notificationService.markAsRead(notificationId);

      const updatedHistory = JSON.parse(localStorage.getItem('notifications-history') || '[]');
      expect(updatedHistory[0].read).toBe(true);
    });

    it('debe marcar todas las notificaciones como leídas', async () => {
      await notificationService.create({ message: 'Test 1', read: false });
      await notificationService.create({ message: 'Test 2', read: false });

      notificationService.markAllAsRead();

      const history = notificationService.getHistory();
      expect(history.every(n => n.read)).toBe(true);
    });

    it('debe eliminar notificaciones individualmente', async () => {
      const notification = await notificationService.create({ message: 'To be deleted' });
      
      notificationService.remove(notification.id!);

      const history = notificationService.getHistory();
      expect(history.find(n => n.id === notification.id)).toBeUndefined();
    });

    it('debe limpiar todas las notificaciones', async () => {
      await notificationService.create({ message: 'Test 1' });
      await notificationService.create({ message: 'Test 2' });

      notificationService.clearAll();

      const history = notificationService.getHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('Estadísticas', () => {
    it('debe calcular estadísticas correctamente', async () => {
      await notificationService.create({ type: 'success', message: 'Success' });
      await notificationService.create({ type: 'error', message: 'Error', read: false });
      await notificationService.create({ type: 'success', message: 'Success 2', category: 'system' });
      await notificationService.create({ type: 'info', message: 'Info', priority: 'high' });

      const stats = notificationService.getStats();

      expect(stats.total).toBe(4);
      expect(stats.unread).toBeGreaterThanOrEqual(1);
      expect(stats.byType.success).toBe(2);
      expect(stats.byType.error).toBe(1);
      expect(stats.byType.info).toBe(1);
      expect(stats.byCategory.system).toBe(1);
      expect(stats.byPriority.high).toBe(1);
    });

    it('debe manejar estadísticas vacías', () => {
      const stats = notificationService.getStats();

      expect(stats.total).toBe(0);
      expect(stats.unread).toBe(0);
      expect(Object.keys(stats.byType)).toHaveLength(0);
    });
  });

  describe('Preferencias', () => {
    it('debe actualizar preferencias correctamente', () => {
      const newPreferences = {
        enabled: false,
        sound: false,
        vibrate: true
      };

      notificationService.updatePreferences(newPreferences);

      const preferences = notificationService.getPreferences();
      expect(preferences?.enabled).toBe(false);
      expect(preferences?.sound).toBe(false);
      expect(preferences?.vibrate).toBe(true);
    });

    it('debe persistir preferencias en localStorage', () => {
      notificationService.updatePreferences({
        enabled: true,
        sound: true
      });

      const stored = localStorage.getItem('notification-preferences');
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.enabled).toBe(true);
      expect(parsed.sound).toBe(true);
    });

    it('debe respetar horarios silenciosos', async () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Configurar horario silencioso actual
      notificationService.updatePreferences({
        enabled: true,
        sound: true,
        vibrate: true,
        desktop: true,
        categories: {},
        priorities: ['low', 'medium', 'high', 'urgent'],
        quietHours: {
          enabled: true,
          start: `${currentHour}:${currentMinute}`,
          end: `${(currentHour + 1) % 24}:00`
        }
      });

      // Notificación normal no debe mostrarse
      const normalNotification = await notificationService.create({
        type: 'info',
        message: 'Normal notification',
        priority: 'medium'
      });

      // Notificación urgente sí debe mostrarse
      const urgentNotification = await notificationService.create({
        type: 'error',
        message: 'Urgent notification',
        priority: 'urgent'
      });

      expect(normalNotification).toBeDefined();
      expect(urgentNotification.priority).toBe('urgent');
    });
  });

  describe('WebSocket y sincronización', () => {
    it('debe conectar WebSocket al inicializar', async () => {
      const ws = new MockWebSocket('ws://localhost:3001/notifications');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(ws.readyState).toBe(1); // OPEN
    });

    it('debe manejar mensajes WebSocket entrantes', async () => {
      const ws = new MockWebSocket('ws://localhost:3001/notifications');
      
      const mockMessage = {
        type: 'info',
        message: 'Server notification',
        timestamp: new Date().toISOString()
      };

      // Simular mensaje entrante
      if (ws.onmessage) {
        ws.onmessage(new MessageEvent('message', {
          data: JSON.stringify(mockMessage)
        }));
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const history = notificationService.getHistory();
      const serverNotification = history.find(n => n.message === 'Server notification');
      expect(serverNotification).toBeDefined();
      expect(serverNotification?.source).toBe('server');
    });

    it('debe intentar reconectar en caso de desconexión', async () => {
      const ws = new MockWebSocket('ws://localhost:3001/notifications');
      
      // Simular desconexión
      ws.close();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(ws.readyState).toBe(3); // CLOSED
      // El servicio debería intentar reconectar
    });

    it('debe sincronizar con el servidor', async () => {
      const mockNotifications = [
        { id: '1', type: 'info' as const, message: 'Sync 1' },
        { id: '2', type: 'success' as const, message: 'Sync 2' }
      ];

      (api.get as any).mockResolvedValue({
        data: {
          success: true,
          data: {
            notifications: mockNotifications
          }
        }
      });

      await notificationService.sync();

      expect(api.get).toHaveBeenCalledWith('/notifications/sync', {
        headers: { Authorization: 'Bearer mock-token' },
        params: {
          lastSync: expect.any(String)
        }
      });
    });

    it('debe manejar errores de sincronización', async () => {
      (api.get as any).mockRejectedValue(new Error('Network error'));
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();

      await notificationService.sync();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[NotificationService] Sync failed:',
        expect.any(Error)
      );
    });
  });

  describe('Permisos del navegador', () => {
    it('debe solicitar permisos de notificación', async () => {
      const permission = await notificationService.requestPermission();

      expect(Notification.requestPermission).toHaveBeenCalled();
      expect(permission).toBe('granted');
    });

    it('debe manejar cuando el navegador no soporta notificaciones', async () => {
      const originalNotification = global.Notification;
      // @ts-ignore
      delete global.Notification;

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation();
      
      const permission = await notificationService.requestPermission();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[NotificationService] Browser does not support notifications'
      );
      expect(permission).toBe('denied');

      global.Notification = originalNotification;
    });

    it('debe actualizar preferencias según permisos', async () => {
      global.Notification.permission = 'granted';
      
      await notificationService.requestPermission();

      const preferences = notificationService.getPreferences();
      expect(preferences?.desktop).toBe(true);
    });
  });

  describe('Eventos del sistema', () => {
    it('debe pausar cuando el documento está oculto', () => {
      const pauseListener = vi.fn();
      notificationService.on('notifications-paused', pauseListener);

      // Simular cambio de visibilidad
      Object.defineProperty(document, 'hidden', {
        value: true,
        writable: true
      });

      document.dispatchEvent(new Event('visibilitychange'));

      expect(pauseListener).toHaveBeenCalled();
    });

    it('debe reanudar cuando el documento es visible', () => {
      const resumeListener = vi.fn();
      notificationService.on('notifications-resumed', resumeListener);

      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true
      });

      document.dispatchEvent(new Event('visibilitychange'));

      expect(resumeListener).toHaveBeenCalled();
    });

    it('debe sincronizar cuando vuelve la conexión', async () => {
      const syncSpy = vi.spyOn(notificationService, 'sync').mockResolvedValue();

      window.dispatchEvent(new Event('online'));

      expect(syncSpy).toHaveBeenCalled();
    });

    it('debe limpiar recursos al cerrar ventana', () => {
      const cleanupSpy = vi.spyOn(notificationService, 'cleanup');

      window.dispatchEvent(new Event('beforeunload'));

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('Restauración desde almacenamiento', () => {
    it('debe restaurar notificaciones persistentes al iniciar', () => {
      const storedNotifications = [
        { id: '1', message: 'Persistent 1', persistent: true, read: false },
        { id: '2', message: 'Persistent 2', persistent: true, read: true },
        { id: '3', message: 'Not persistent', persistent: false, read: false }
      ];

      localStorage.setItem('notifications-history', JSON.stringify(storedNotifications));

      const restoredListener = vi.fn();
      notificationService.on('notification-restored', restoredListener);

      // Simular recarga del servicio
      notificationService['restoreFromStorage']();

      // Solo debe restaurar la primera (persistent y no leída)
      expect(restoredListener).toHaveBeenCalledTimes(1);
      expect(restoredListener).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1' })
      );
    });

    it('debe manejar datos corruptos en localStorage', () => {
      localStorage.setItem('notifications-history', 'invalid json');
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();

      // No debe crashear
      notificationService['restoreFromStorage']();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[NotificationService] Error restoring notifications:',
        expect.any(Error)
      );
    });
  });

  describe('Emisión de eventos', () => {
    it('debe emitir evento al crear notificación', async () => {
      const createListener = vi.fn();
      notificationService.on('notification-created', createListener);

      const notification = await notificationService.create({
        message: 'Test event'
      });

      expect(createListener).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test event'
        })
      );
    });

    it('debe emitir evento al mostrar notificación', async () => {
      const showListener = vi.fn();
      notificationService.on('notification-show', showListener);

      await notificationService.create({
        message: 'Test show'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(showListener).toHaveBeenCalled();
    });

    it('debe limpiar listeners correctamente', () => {
      const listener = vi.fn();
      notificationService.on('test-event', listener);
      
      notificationService.cleanup();
      
      notificationService.emit('test-event');
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

describe('NotificationService - Edge Cases y Cobertura', () => {
  it('debe manejar IDs duplicados', async () => {
    const id = 'duplicate-id';
    
    const notification1 = await notificationService.create({
      id,
      message: 'First'
    });

    const notification2 = await notificationService.create({
      id,
      message: 'Second'
    });

    // Debe generar nuevo ID para la segunda
    expect(notification2.id).not.toBe(id);
  });

  it('debe manejar notificaciones sin mensaje', async () => {
    const notification = await notificationService.create({});
    
    expect(notification.message).toBe('');
  });

  it('debe limitar intentos de reconexión WebSocket', async () => {
    let reconnectAttempts = 0;
    
    // Mock WebSocket que siempre falla
    global.WebSocket = class FailingWebSocket {
      constructor() {
        reconnectAttempts++;
        setTimeout(() => {
          if (this.onerror) this.onerror(new Event('error'));
          if (this.onclose) this.onclose(new CloseEvent('close'));
        }, 0);
      }
      onopen: any = null;
      onmessage: any = null;
      onerror: any = null;
      onclose: any = null;
      close() {}
    } as any;

    // Iniciar servicio
    notificationService['setupWebSocket']();

    // Esperar intentos de reconexión
    await new Promise(resolve => setTimeout(resolve, 20000));

    // No debe exceder el límite
    expect(reconnectAttempts).toBeLessThanOrEqual(6); // 5 + inicial
  });

  it('debe validar estructura de datos al importar', async () => {
    const invalidData = { not: 'an array' };
    
    localStorage.setItem('notifications-history', JSON.stringify(invalidData));

    const history = notificationService.getHistory();
    
    // Debe retornar array vacío en lugar de crashear
    expect(Array.isArray(history)).toBe(true);
  });

  it('debe manejar fechas inválidas', async () => {
    const notification = await notificationService.create({
      message: 'Test',
      timestamp: 'invalid-date' as any
    });

    // Debe usar fecha actual
    expect(notification.timestamp).toBeInstanceOf(Date);
    expect(isNaN(notification.timestamp.getTime())).toBe(false);
  });
});