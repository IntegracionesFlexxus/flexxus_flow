// Servicio WebSocket - MVP Nivel 1
// TODO: En Nivel 2 agregar métricas, compresión, batching

import { 
  WEBSOCKET_CONFIG, 
  WebSocketEvent, 
  ConnectionStatus,
  MessageType,
  MessagePriority,
  getWebSocketUrl 
} from '@/config/websocket.config';

export interface WebSocketMessage {
  id?: string;
  type: MessageType | string;
  channel?: string;
  data?: any;
  timestamp?: number;
  priority?: MessagePriority;
  metadata?: Record<string, any>;
}

export interface WebSocketOptions {
  url?: string;
  protocols?: string | string[];
  reconnect?: boolean;
  auth?: {
    token?: string;
    userId?: string;
  };
}

type EventCallback = (data: any) => void;
type UnsubscribeFunction = () => void;

class WebSocketService {
  private static instance: WebSocketService;
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private messageQueue: WebSocketMessage[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private channels: Set<string> = new Set();
  private options: WebSocketOptions = {};
  private lastActivity: number = Date.now();

  private constructor() {
    // Singleton pattern
  }

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  // Conectar al servidor WebSocket
  connect(options: WebSocketOptions = {}): Promise<void> {
    this.options = { ...this.options, ...options };
    
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.setStatus(ConnectionStatus.CONNECTING);
      
      const url = this.buildConnectionUrl(options);
      
      try {
        this.ws = new WebSocket(url, options.protocols);
        
        // Timeout de conexión
        const connectTimeout = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, WEBSOCKET_CONFIG.timeouts.connect);

        this.ws.onopen = (event) => {
          clearTimeout(connectTimeout);
          this.handleOpen(event);
          resolve();
        };

        this.ws.onclose = (event) => {
          this.handleClose(event);
        };

        this.ws.onerror = (event) => {
          clearTimeout(connectTimeout);
          this.handleError(event);
          if (this.status === ConnectionStatus.CONNECTING) {
            reject(event);
          }
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

      } catch (error) {
        this.setStatus(ConnectionStatus.ERROR);
        reject(error);
      }
    });
  }

  // Desconectar del servidor
  disconnect(): void {
    this.clearTimers();
    this.reconnectAttempts = 0;
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.setStatus(ConnectionStatus.DISCONNECTED);
    this.channels.clear();
    this.messageQueue = [];
  }

  // Enviar mensaje
  send(message: WebSocketMessage): void {
    const msg = this.prepareMessage(message);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(msg));
        this.emit(WebSocketEvent.MESSAGE_SENT, msg);
        this.updateActivity();
      } catch (error) {
        console.error('Error sending message:', error);
        this.queueMessage(msg);
      }
    } else {
      this.queueMessage(msg);
    }
  }

  // Suscribirse a un canal
  subscribe(channel: string): void {
    if (this.channels.has(channel)) return;
    
    this.channels.add(channel);
    
    if (this.isConnected()) {
      this.send({
        type: MessageType.SUBSCRIBE,
        channel,
        timestamp: Date.now()
      });
    }
  }

  // Desuscribirse de un canal
  unsubscribe(channel: string): void {
    if (!this.channels.has(channel)) return;
    
    this.channels.delete(channel);
    
    if (this.isConnected()) {
      this.send({
        type: MessageType.UNSUBSCRIBE,
        channel,
        timestamp: Date.now()
      });
    }
  }

  // Escuchar eventos
  on(event: string, callback: EventCallback): UnsubscribeFunction {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    this.eventListeners.get(event)!.add(callback);
    
    // Retornar función para desuscribirse
    return () => {
      this.off(event, callback);
    };
  }

  // Dejar de escuchar eventos
  off(event: string, callback?: EventCallback): void {
    if (!callback) {
      this.eventListeners.delete(event);
    } else {
      this.eventListeners.get(event)?.delete(callback);
    }
  }

  // Escuchar evento una sola vez
  once(event: string, callback: EventCallback): UnsubscribeFunction {
    const onceCallback = (data: any) => {
      callback(data);
      this.off(event, onceCallback);
    };
    
    return this.on(event, onceCallback);
  }

  // Emitir evento
  private emit(event: string, data?: any): void {
    if (WEBSOCKET_CONFIG.debug) {
      console.log(`[WebSocket] Event: ${event}`, data);
    }
    
    this.eventListeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  // Getters
  getStatus(): ConnectionStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED;
  }

  isConnecting(): boolean {
    return this.status === ConnectionStatus.CONNECTING || 
           this.status === ConnectionStatus.RECONNECTING;
  }

  getChannels(): string[] {
    return Array.from(this.channels);
  }

  getQueueSize(): number {
    return this.messageQueue.length;
  }

  getLastActivity(): number {
    return this.lastActivity;
  }

  // Manejadores privados
  private handleOpen(event: Event): void {
    console.log('[WebSocket] Connected');
    
    this.setStatus(ConnectionStatus.CONNECTED);
    this.reconnectAttempts = 0;
    
    // Re-suscribir a canales
    this.channels.forEach(channel => {
      this.send({
        type: MessageType.SUBSCRIBE,
        channel,
        timestamp: Date.now()
      });
    });
    
    // Procesar cola de mensajes
    this.processMessageQueue();
    
    // Iniciar heartbeat
    this.startHeartbeat();
    
    this.emit(WebSocketEvent.CONNECTED, event);
  }

  private handleClose(event: CloseEvent): void {
    console.log('[WebSocket] Disconnected:', event.code, event.reason);
    
    this.clearTimers();
    this.setStatus(ConnectionStatus.DISCONNECTED);
    
    // Intentar reconectar si está configurado
    if (this.shouldReconnect(event)) {
      this.scheduleReconnect();
    }
    
    this.emit(WebSocketEvent.DISCONNECTED, event);
  }

  private handleError(event: Event): void {
    console.error('[WebSocket] Error:', event);
    
    this.setStatus(ConnectionStatus.ERROR);
    this.emit(WebSocketEvent.ERROR, event);
  }

  private handleMessage(event: MessageEvent): void {
    this.updateActivity();
    
    let message: WebSocketMessage;
    
    try {
      message = JSON.parse(event.data);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      return;
    }
    
    // Manejar mensajes del sistema
    if (this.isSystemMessage(message)) {
      this.handleSystemMessage(message);
      return;
    }
    
    // Emitir evento de mensaje
    this.emit(WebSocketEvent.MESSAGE, message);
    
    // Emitir evento específico del tipo
    if (message.type) {
      this.emit(`message:${message.type}`, message);
    }
    
    // Emitir evento específico del canal
    if (message.channel) {
      this.emit(`channel:${message.channel}`, message);
    }
  }

  private handleSystemMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case MessageType.PONG:
        // Respuesta al ping del heartbeat
        break;
        
      case MessageType.USER_ONLINE:
      case MessageType.USER_OFFLINE:
        this.emit(WebSocketEvent.PRESENCE_UPDATE, message.data);
        break;
        
      default:
        // Otros mensajes del sistema
        break;
    }
  }

  // Reconexión
  private shouldReconnect(event: CloseEvent): boolean {
    // No reconectar si fue cerrado intencionalmente
    if (event.code === 1000) return false;
    
    // No reconectar si está deshabilitado
    if (!WEBSOCKET_CONFIG.reconnect.enabled) return false;
    
    // No reconectar si se excedió el máximo de intentos
    if (this.reconnectAttempts >= WEBSOCKET_CONFIG.reconnect.maxAttempts) return false;
    
    return this.options.reconnect !== false;
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    
    const delay = Math.min(
      WEBSOCKET_CONFIG.reconnect.delay * Math.pow(
        WEBSOCKET_CONFIG.reconnect.backoffMultiplier,
        this.reconnectAttempts - 1
      ),
      WEBSOCKET_CONFIG.reconnect.maxDelay
    );
    
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.setStatus(ConnectionStatus.RECONNECTING);
    this.emit(WebSocketEvent.RECONNECTING, { attempt: this.reconnectAttempts });
    
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.options);
    }, delay);
  }

  // Heartbeat
  private startHeartbeat(): void {
    if (!WEBSOCKET_CONFIG.heartbeat.enabled) return;
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        // Verificar timeout
        const timeSinceLastActivity = Date.now() - this.lastActivity;
        if (timeSinceLastActivity > WEBSOCKET_CONFIG.heartbeat.timeout) {
          console.log('[WebSocket] Heartbeat timeout, reconnecting...');
          this.ws?.close();
          return;
        }
        
        // Enviar ping
        this.send({
          type: MessageType.PING,
          timestamp: Date.now()
        });
        
        this.emit(WebSocketEvent.HEARTBEAT);
      }
    }, WEBSOCKET_CONFIG.heartbeat.interval);
  }

  // Cola de mensajes
  private queueMessage(message: WebSocketMessage): void {
    if (!WEBSOCKET_CONFIG.messageQueue.enabled) return;
    
    // Limitar tamaño de cola
    if (this.messageQueue.length >= WEBSOCKET_CONFIG.messageQueue.maxSize) {
      // Remover mensajes con menor prioridad
      this.messageQueue.sort((a, b) => 
        (b.priority || MessagePriority.NORMAL) - (a.priority || MessagePriority.NORMAL)
      );
      this.messageQueue = this.messageQueue.slice(0, WEBSOCKET_CONFIG.messageQueue.maxSize - 1);
    }
    
    this.messageQueue.push(message);
    this.emit(WebSocketEvent.MESSAGE_QUEUED, message);
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  // Utilidades
  private buildConnectionUrl(options: WebSocketOptions): string {
    let url = options.url || getWebSocketUrl();
    
    // Agregar parámetros de autenticación
    if (options.auth) {
      const params = new URLSearchParams();
      
      if (options.auth.token) {
        params.append('token', options.auth.token);
      }
      
      if (options.auth.userId) {
        params.append('userId', options.auth.userId);
      }
      
      url += `?${params.toString()}`;
    }
    
    return url;
  }

  private prepareMessage(message: WebSocketMessage): WebSocketMessage {
    return {
      id: message.id || this.generateMessageId(),
      timestamp: message.timestamp || Date.now(),
      priority: message.priority || MessagePriority.NORMAL,
      ...message
    };
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private isSystemMessage(message: WebSocketMessage): boolean {
    return [
      MessageType.PING,
      MessageType.PONG,
      MessageType.USER_ONLINE,
      MessageType.USER_OFFLINE
    ].includes(message.type as MessageType);
  }

  private setStatus(status: ConnectionStatus): void {
    const previousStatus = this.status;
    this.status = status;
    
    if (previousStatus !== status) {
      this.emit(WebSocketEvent.STATUS_CHANGE, { 
        previous: previousStatus, 
        current: status 
      });
    }
  }

  private updateActivity(): void {
    this.lastActivity = Date.now();
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

// Exportar instancia singleton
export const websocketService = WebSocketService.getInstance();

export default websocketService;