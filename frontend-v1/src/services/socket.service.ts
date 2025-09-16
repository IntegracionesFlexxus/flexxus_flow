/**
 * Socket.io Service
 * Reemplaza WebSocketService con Socket.io Client
 * Compatible con el backend Socket.io existente
 */

import { io, Socket } from 'socket.io-client';
import { getAuthState, getUIState } from '@/shared/store';

// Tipos de eventos sincronizados con backend
export enum SocketEvents {
  // Eventos de conexión
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  RECONNECT = 'reconnect',
  
  // Eventos de autenticación (del backend)
  AUTHENTICATE = 'authenticate',
  AUTHENTICATED = 'authenticated',
  AUTHENTICATION_ERROR = 'authentication:error',
  
  // Eventos de notificaciones
  NOTIFICATION_NEW = 'notification:new',
  NOTIFICATION_UPDATED = 'notification:updated',
  NOTIFICATION_DELETED = 'notification:deleted',
  NOTIFICATIONS_BULK = 'notifications:bulk',
  NOTIFICATIONS_UNREAD_COUNT = 'notifications:unread-count',
  
  // Eventos de presencia
  PRESENCE_UPDATE = 'presence:update',
  PRESENCE_UPDATED = 'presence:updated',
  USER_CONNECTED = 'user:connected',
  USER_DISCONNECTED = 'user:disconnected',
  
  // Eventos de mensajes
  MESSAGE_SEND = 'message:send',
  MESSAGE_RECEIVED = 'message:received',
  
  // Eventos de rooms
  JOIN_ROOM = 'join:room',
  LEAVE_ROOM = 'leave:room',
  ROOM_JOINED = 'room:joined',
  ROOM_LEFT = 'room:left',
  
  // Eventos de typing
  TYPING_START = 'typing:start',
  TYPING_STOP = 'typing:stop',
  TYPING_INDICATOR = 'typing:indicator',
  
  // Heartbeat
  HEARTBEAT = 'heartbeat',
  HEARTBEAT_ACK = 'heartbeat:ack'
}

export interface SocketMessage {
  id?: string;
  type: string;
  data?: any;
  timestamp?: number;
  metadata?: Record<string, any>;
}

export interface SocketOptions {
  url?: string;
  auth?: {
    token?: string;
    userId?: string;
    companyId?: string;
  };
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

type EventCallback = (data: any) => void;
type UnsubscribeFunction = () => void;

class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private isConnected: boolean = false;
  private reconnectAttempts = 0;
  private options: SocketOptions = {};

  private constructor() {
    // Singleton pattern
  }

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  /**
   * Conectar al servidor Socket.io
   */
  connect(options: SocketOptions = {}): Promise<void> {
    this.options = { ...this.options, ...options };
    
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      const url = options.url || import.meta.env.VITE_WS_URL || 'http://localhost:3001';
      
      // Obtener token del store
      const token = options.auth?.token || getAuthState().token;
      const currentCompany = getAuthState().currentCompany;
      const user = getAuthState().user;
      
      // Configurar Socket.io
      this.socket = io(url, {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        reconnection: options.reconnection !== false,
        reconnectionAttempts: options.reconnectionAttempts || 5,
        reconnectionDelay: options.reconnectionDelay || 5000,
        auth: {
          token,
          userId: options.auth?.userId || user?.id,
          companyId: options.auth?.companyId || currentCompany?.id
        }
      });

      // Configurar listeners básicos
      this.setupCoreListeners();

      // Resolver cuando se conecte
      this.socket.once(SocketEvents.CONNECT, () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log('✅ Socket.io connected');
        
        // Autenticar después de conectar
        if (token) {
          this.authenticate(token);
        }
        
        resolve();
      });

      // Rechazar si hay error
      this.socket.once(SocketEvents.ERROR, (error) => {
        console.error('❌ Socket.io connection error:', error);
        reject(error);
      });

      // Timeout de conexión
      setTimeout(() => {
        if (!this.isConnected) {
          this.socket?.disconnect();
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Configurar listeners principales
   */
  private setupCoreListeners(): void {
    if (!this.socket) return;

    // Evento de desconexión
    this.socket.on(SocketEvents.DISCONNECT, (reason) => {
      this.isConnected = false;
      console.log('🔌 Socket.io disconnected:', reason);
      this.emit('disconnected', { reason });
      
      // Notificar al usuario
      const { addNotification } = getUIState();
      if (reason === 'io server disconnect') {
        addNotification({
          type: 'warning',
          title: 'Conexión perdida',
          message: 'Se perdió la conexión con el servidor',
          autoClose: true
        });
      }
    });

    // Evento de reconexión
    this.socket.on(SocketEvents.RECONNECT, (attemptNumber) => {
      this.isConnected = true;
      console.log('🔄 Socket.io reconnected after', attemptNumber, 'attempts');
      this.emit('reconnected', { attempts: attemptNumber });
      
      // Re-autenticar
      const token = getAuthState().token;
      if (token) {
        this.authenticate(token);
      }
    });

    // Evento de error
    this.socket.on(SocketEvents.ERROR, (error) => {
      console.error('❌ Socket.io error:', error);
      this.emit('error', error);
    });

    // Evento de autenticación exitosa
    this.socket.on(SocketEvents.AUTHENTICATED, (data) => {
      console.log('🔐 Socket.io authenticated:', data);
      this.emit('authenticated', data);
    });

    // Error de autenticación
    this.socket.on(SocketEvents.AUTHENTICATION_ERROR, (error) => {
      console.error('🔐 Authentication error:', error);
      this.emit('authentication:error', error);
      
      // Notificar al usuario
      const { addNotification } = getUIState();
      addNotification({
        type: 'error',
        title: 'Error de autenticación',
        message: error.message || 'No se pudo autenticar con el servidor',
        autoClose: false
      });
    });

    // Heartbeat del servidor
    this.socket.on(SocketEvents.HEARTBEAT, () => {
      this.socket?.emit(SocketEvents.HEARTBEAT_ACK);
    });
  }

  /**
   * Autenticar con el servidor
   */
  private authenticate(token: string): void {
    if (!this.socket) return;
    
    const user = getAuthState().user;
    const currentCompany = getAuthState().currentCompany;
    
    this.socket.emit(SocketEvents.AUTHENTICATE, {
      token,
      userId: user?.id,
      companyId: currentCompany?.id
    });
  }

  /**
   * Desconectar del servidor
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.eventListeners.clear();
    }
  }

  /**
   * Enviar evento al servidor
   */
  emit(event: string, data?: any): void {
    if (!this.socket) {
      console.warn('Socket not connected, cannot emit:', event);
      return;
    }
    
    this.socket.emit(event, data);
  }

  /**
   * Escuchar evento del servidor
   */
  on(event: string, callback: EventCallback): UnsubscribeFunction {
    // Agregar a listeners locales
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
    
    // Registrar en socket
    if (this.socket) {
      this.socket.on(event, callback);
    }
    
    // Retornar función para desuscribirse
    return () => {
      this.off(event, callback);
    };
  }

  /**
   * Dejar de escuchar evento
   */
  off(event: string, callback?: EventCallback): void {
    if (callback) {
      this.eventListeners.get(event)?.delete(callback);
      this.socket?.off(event, callback);
    } else {
      this.eventListeners.delete(event);
      this.socket?.off(event);
    }
  }

  /**
   * Escuchar evento una sola vez
   */
  once(event: string, callback: EventCallback): UnsubscribeFunction {
    const onceCallback = (data: any) => {
      callback(data);
      this.off(event, onceCallback);
    };
    
    return this.on(event, onceCallback);
  }

  /**
   * Unirse a una room
   */
  joinRoom(room: string): void {
    this.emit(SocketEvents.JOIN_ROOM, { room });
  }

  /**
   * Salir de una room
   */
  leaveRoom(room: string): void {
    this.emit(SocketEvents.LEAVE_ROOM, { room });
  }

  /**
   * Enviar mensaje
   */
  sendMessage(message: SocketMessage): void {
    this.emit(SocketEvents.MESSAGE_SEND, message);
  }

  /**
   * Actualizar presencia
   */
  updatePresence(status: 'online' | 'away' | 'busy' | 'offline'): void {
    this.emit(SocketEvents.PRESENCE_UPDATE, { status });
  }

  /**
   * Verificar si está conectado
   */
  getIsConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Obtener ID del socket
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// Exportar instancia singleton
export const socketService = SocketService.getInstance();