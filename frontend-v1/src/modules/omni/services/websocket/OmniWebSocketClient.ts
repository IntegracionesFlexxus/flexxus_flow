/**
 * Omni WebSocket Client
 * Cliente Socket.io para comunicación en tiempo real del módulo Omni
 */

import { io, Socket } from 'socket.io-client';
import type { IMessage, IConversation } from '../../types';

// Tipos de eventos
export interface WebSocketEvents {
  // Eventos de conexión
  onConnect: () => void;
  onDisconnect: (reason: string) => void;
  onError: (error: Error) => void;

  // Eventos de mensajes
  onNewMessage: (message: IMessage) => void;

  // Eventos de conversaciones
  onConversationUpdate: (conversation: IConversation) => void;
  onNewConversation: (conversation: IConversation) => void;

  // Eventos de usuarios
  onUserJoined: (data: { userId: string; conversationId: string; timestamp: Date }) => void;
  onUserLeft: (data: { userId: string; conversationId: string; timestamp: Date }) => void;
  onUserDisconnected: (data: { userId: string; timestamp: Date }) => void;

  // Eventos de typing
  onTypingStart: (data: { userId: string; userName: string; conversationId: string; timestamp: Date }) => void;
  onTypingStop: (data: { userId: string; conversationId: string; timestamp: Date }) => void;

  // Eventos de agentes
  onAgentStatus: (data: { userId: string; status: string; timestamp: Date }) => void;
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

export interface OmniWebSocketConfig {
  url?: string;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export class OmniWebSocketClient {
  private socket: Socket | null = null;
  private url: string;
  private token: string | null = null;
  private autoConnect: boolean;
  private reconnectionAttempts: number;
  private reconnectionDelay: number;
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private listeners: Map<string, Set<Function>> = new Map();
  private joinedConversations: Set<string> = new Set();

  constructor(config: OmniWebSocketConfig = {}) {
    this.url = config.url || this.getDefaultUrl();
    this.autoConnect = config.autoConnect ?? true;
    this.reconnectionAttempts = config.reconnectionAttempts ?? 5;
    this.reconnectionDelay = config.reconnectionDelay ?? 1000;
  }

  /**
   * Get default WebSocket URL from environment
   */
  private getDefaultUrl(): string {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return `${apiUrl}/omni`;
  }

  /**
   * Connect to WebSocket server
   */
  connect(token: string): void {
    if (this.socket?.connected) {
      console.warn('[WebSocket] Already connected');
      return;
    }

    this.token = token;
    this.status = ConnectionStatus.CONNECTING;

    console.log('[WebSocket] Connecting to:', this.url);

    this.socket = io(this.url, {
      auth: {
        token: this.token
      },
      reconnection: true,
      reconnectionAttempts: this.reconnectionAttempts,
      reconnectionDelay: this.reconnectionDelay,
      transports: ['polling', 'websocket'],
      autoConnect: this.autoConnect
    });

    this.setupEventListeners();

    if (this.autoConnect) {
      this.socket.connect();
    }
  }

  /**
   * Setup internal event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected:', this.socket?.id);
      this.status = ConnectionStatus.CONNECTED;
      this.emit('connect');

      // Rejoin conversations
      this.rejoinConversations();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.status = ConnectionStatus.DISCONNECTED;
      this.emit('disconnect', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error.message);
      this.status = ConnectionStatus.ERROR;
      this.emit('error', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[WebSocket] Reconnected after', attemptNumber, 'attempts');
      this.status = ConnectionStatus.CONNECTED;
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[WebSocket] Reconnection attempt:', attemptNumber);
      this.status = ConnectionStatus.RECONNECTING;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('[WebSocket] Reconnection error:', error.message);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[WebSocket] Reconnection failed');
      this.status = ConnectionStatus.ERROR;
    });

    // Message events
    this.socket.on('message:new', (message: IMessage) => {
      console.log('[WebSocket] New message:', message);
      this.emit('newMessage', message);
    });

    // Conversation events
    this.socket.on('conversation:update', (conversation: IConversation) => {
      console.log('[WebSocket] Conversation update:', conversation);
      this.emit('conversationUpdate', conversation);
    });

    this.socket.on('conversation:new', (conversation: IConversation) => {
      console.log('[WebSocket] New conversation:', conversation);
      this.emit('newConversation', conversation);
    });

    // User events
    this.socket.on('user:joined', (data) => {
      console.log('[WebSocket] User joined:', data);
      this.emit('userJoined', data);
    });

    this.socket.on('user:left', (data) => {
      console.log('[WebSocket] User left:', data);
      this.emit('userLeft', data);
    });

    this.socket.on('user:disconnected', (data) => {
      console.log('[WebSocket] User disconnected:', data);
      this.emit('userDisconnected', data);
    });

    // Typing events
    this.socket.on('typing:start', (data) => {
      console.log('[WebSocket] Typing start:', data);
      this.emit('typingStart', data);
    });

    this.socket.on('typing:stop', (data) => {
      console.log('[WebSocket] Typing stop:', data);
      this.emit('typingStop', data);
    });

    // Agent events
    this.socket.on('agent:status', (data) => {
      console.log('[WebSocket] Agent status:', data);
      this.emit('agentStatus', data);
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('[WebSocket] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.status = ConnectionStatus.DISCONNECTED;
      this.joinedConversations.clear();
    }
  }

  /**
   * Join a conversation room
   */
  joinConversation(conversationId: string): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Not connected, cannot join conversation');
      return;
    }

    console.log('[WebSocket] Joining conversation:', conversationId);
    this.socket.emit('conversation:join', conversationId);
    this.joinedConversations.add(conversationId);
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string): void {
    if (!this.socket?.connected) {
      return;
    }

    console.log('[WebSocket] Leaving conversation:', conversationId);
    this.socket.emit('conversation:leave', conversationId);
    this.joinedConversations.delete(conversationId);
  }

  /**
   * Rejoin conversations after reconnection
   */
  private rejoinConversations(): void {
    if (this.joinedConversations.size === 0) return;

    console.log('[WebSocket] Rejoining conversations:', Array.from(this.joinedConversations));
    this.joinedConversations.forEach(conversationId => {
      this.socket?.emit('conversation:join', conversationId);
    });
  }

  /**
   * Send typing start event
   */
  startTyping(conversationId: string, userName: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('typing:start', {
      conversationId,
      userName
    });
  }

  /**
   * Send typing stop event
   */
  stopTyping(conversationId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('typing:stop', {
      conversationId
    });
  }

  /**
   * Update agent status
   */
  updateAgentStatus(status: 'online' | 'away' | 'busy' | 'offline'): void {
    if (!this.socket?.connected) return;

    this.socket.emit('agent:status', status);
  }

  /**
   * Subscribe to an event
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, callback?: Function): void {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }

    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit event to subscribers
   */
  private emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`[WebSocket] Error in ${event} callback:`, error);
        }
      });
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED && this.socket?.connected === true;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Get joined conversations
   */
  getJoinedConversations(): string[] {
    return Array.from(this.joinedConversations);
  }
}

// Singleton instance
let instance: OmniWebSocketClient | null = null;

export function getOmniWebSocketClient(config?: OmniWebSocketConfig): OmniWebSocketClient {
  if (!instance) {
    instance = new OmniWebSocketClient(config);
  }
  return instance;
}

export function resetOmniWebSocketClient(): void {
  if (instance) {
    instance.disconnect();
    instance = null;
  }
}
