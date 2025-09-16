import { useState, useEffect, useCallback, useRef } from 'react';
import { websocketService } from '@/services/websocket.service';
import { ConnectionStatus, WebSocketEvent } from '@/config/websocket.config';
import { useAuthStore } from '@/shared/store/authStore';

// Hook para manejar conexión real-time - MVP Nivel 1
// TODO: En Nivel 2 agregar métricas, analytics, offline support

interface RealtimeConnectionOptions {
  autoConnect?: boolean;
  reconnect?: boolean;
  channels?: string[];
  onConnect?: () => void;
  onDisconnect?: (event: CloseEvent) => void;
  onError?: (error: any) => void;
  onReconnecting?: (attempt: number) => void;
}

export function useRealtimeConnection(options: RealtimeConnectionOptions = {}) {
  const {
    autoConnect = true,
    reconnect = true,
    channels = [],
    onConnect,
    onDisconnect,
    onError,
    onReconnecting
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [lastError, setLastError] = useState<any>(null);
  const [queueSize, setQueueSize] = useState(0);

  const { token, user } = useAuthStore();
  const unsubscribers = useRef<(() => void)[]>([]);

  // Conectar al servicio WebSocket
  const connect = useCallback(async () => {
    try {
      await websocketService.connect({
        reconnect,
        auth: {
          token: token || undefined,
          userId: user?.id
        }
      });
      
      // Suscribirse a canales
      channels.forEach(channel => {
        websocketService.subscribe(channel);
      });
      
      setLastError(null);
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setLastError(error);
    }
  }, [reconnect, token, user, channels]);

  // Desconectar del servicio
  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  // Reconectar manualmente
  const reconnectManually = useCallback(async () => {
    disconnect();
    await connect();
  }, [connect, disconnect]);

  // Suscribirse a un canal
  const subscribe = useCallback((channel: string) => {
    websocketService.subscribe(channel);
  }, []);

  // Desuscribirse de un canal
  const unsubscribe = useCallback((channel: string) => {
    websocketService.unsubscribe(channel);
  }, []);

  // Enviar mensaje
  const send = useCallback((message: any) => {
    websocketService.send(message);
    setQueueSize(websocketService.getQueueSize());
  }, []);

  // Efectos
  useEffect(() => {
    // Listeners de eventos
    const handleStatusChange = ({ current }: any) => {
      setStatus(current);
      setIsConnected(current === ConnectionStatus.CONNECTED);
    };

    const handleConnected = () => {
      setReconnectAttempt(0);
      setQueueSize(0);
      onConnect?.();
    };

    const handleDisconnected = (event: CloseEvent) => {
      onDisconnect?.(event);
    };

    const handleError = (error: any) => {
      setLastError(error);
      onError?.(error);
    };

    const handleReconnecting = ({ attempt }: any) => {
      setReconnectAttempt(attempt);
      onReconnecting?.(attempt);
    };

    const handleMessageQueued = () => {
      setQueueSize(websocketService.getQueueSize());
    };

    const handleMessageSent = () => {
      setQueueSize(websocketService.getQueueSize());
    };

    // Registrar listeners
    unsubscribers.current = [
      websocketService.on(WebSocketEvent.STATUS_CHANGE, handleStatusChange),
      websocketService.on(WebSocketEvent.CONNECTED, handleConnected),
      websocketService.on(WebSocketEvent.DISCONNECTED, handleDisconnected),
      websocketService.on(WebSocketEvent.ERROR, handleError),
      websocketService.on(WebSocketEvent.RECONNECTING, handleReconnecting),
      websocketService.on(WebSocketEvent.MESSAGE_QUEUED, handleMessageQueued),
      websocketService.on(WebSocketEvent.MESSAGE_SENT, handleMessageSent)
    ];

    // Auto-conectar si está habilitado
    if (autoConnect && token) {
      connect();
    }

    // Cleanup
    return () => {
      unsubscribers.current.forEach(unsub => unsub());
      if (autoConnect) {
        disconnect();
      }
    };
  }, [autoConnect, token]);

  return {
    // Estado
    status,
    isConnected,
    reconnectAttempt,
    lastError,
    queueSize,
    
    // Acciones
    connect,
    disconnect,
    reconnect: reconnectManually,
    subscribe,
    unsubscribe,
    send,
    
    // Info adicional
    channels: websocketService.getChannels(),
    lastActivity: websocketService.getLastActivity()
  };
}

// Hook para escuchar mensajes real-time
interface UseRealtimeMessagesOptions {
  channel?: string;
  type?: string;
  filter?: (message: any) => boolean;
}

export function useRealtimeMessages(options: UseRealtimeMessagesOptions = {}) {
  const { channel, type, filter } = options;
  const [messages, setMessages] = useState<any[]>([]);
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    const handleMessage = (message: any) => {
      // Aplicar filtros
      if (channel && message.channel !== channel) return;
      if (type && message.type !== type) return;
      if (filter && !filter(message)) return;
      
      setLastMessage(message);
      setMessages(prev => [...prev, message]);
    };

    // Determinar evento a escuchar
    let event = WebSocketEvent.MESSAGE;
    if (channel) {
      event = `channel:${channel}` as any;
    } else if (type) {
      event = `message:${type}` as any;
    }

    const unsubscribe = websocketService.on(event, handleMessage);

    return () => {
      unsubscribe();
    };
  }, [channel, type, filter]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastMessage(null);
  }, []);

  return {
    messages,
    lastMessage,
    clearMessages
  };
}

// Hook para presencia de usuarios
export function useRealtimePresence(channelId?: string) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [userActivity, setUserActivity] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const channel = channelId ? `presence-${channelId}` : 'presence-global';
    
    // Suscribirse al canal de presencia
    websocketService.subscribe(channel);

    const handlePresenceUpdate = (data: any) => {
      switch (data.type) {
        case 'user_online':
          setOnlineUsers(prev => new Set([...prev, data.userId]));
          setUserActivity(prev => new Map(prev).set(data.userId, Date.now()));
          break;
          
        case 'user_offline':
          setOnlineUsers(prev => {
            const next = new Set(prev);
            next.delete(data.userId);
            return next;
          });
          setTypingUsers(prev => {
            const next = new Set(prev);
            next.delete(data.userId);
            return next;
          });
          break;
          
        case 'user_typing_start':
          setTypingUsers(prev => new Set([...prev, data.userId]));
          break;
          
        case 'user_typing_stop':
          setTypingUsers(prev => {
            const next = new Set(prev);
            next.delete(data.userId);
            return next;
          });
          break;
          
        case 'user_activity':
          setUserActivity(prev => new Map(prev).set(data.userId, data.timestamp));
          break;
      }
    };

    const unsubscribe = websocketService.on(`channel:${channel}`, handlePresenceUpdate);

    return () => {
      unsubscribe();
      websocketService.unsubscribe(channel);
    };
  }, [channelId]);

  const updateMyPresence = useCallback((type: string, data?: any) => {
    const channel = channelId ? `presence-${channelId}` : 'presence-global';
    
    websocketService.send({
      type,
      channel,
      data: {
        userId: useAuthStore.getState().user?.id,
        timestamp: Date.now(),
        ...data
      }
    });
  }, [channelId]);

  const setTyping = useCallback((isTyping: boolean) => {
    updateMyPresence(isTyping ? 'user_typing_start' : 'user_typing_stop');
  }, [updateMyPresence]);

  return {
    onlineUsers: Array.from(onlineUsers),
    typingUsers: Array.from(typingUsers),
    userActivity: Object.fromEntries(userActivity),
    updateMyPresence,
    setTyping,
    isUserOnline: (userId: string) => onlineUsers.has(userId),
    isUserTyping: (userId: string) => typingUsers.has(userId)
  };
}

// Hook para sincronización de datos real-time
export function useRealtimeSync<T = any>(
  entityType: string,
  entityId?: string
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number>(0);
  const [syncError, setSyncError] = useState<any>(null);

  const channel = entityId 
    ? `sync-${entityType}-${entityId}`
    : `sync-${entityType}`;

  useEffect(() => {
    // Suscribirse al canal de sincronización
    websocketService.subscribe(channel);

    const handleDataUpdate = (message: any) => {
      if (message.data?.entityType !== entityType) return;
      if (entityId && message.data?.entityId !== entityId) return;
      
      switch (message.type) {
        case 'data_update':
          setData(message.data.entity);
          setLastSync(Date.now());
          setIsSyncing(false);
          break;
          
        case 'data_delete':
          if (message.data.entityId === entityId) {
            setData(null);
          }
          break;
          
        case 'sync_start':
          setIsSyncing(true);
          setSyncError(null);
          break;
          
        case 'sync_error':
          setIsSyncing(false);
          setSyncError(message.data.error);
          break;
      }
    };

    const unsubscribe = websocketService.on(`channel:${channel}`, handleDataUpdate);

    // Solicitar sincronización inicial
    websocketService.send({
      type: 'sync_request',
      channel,
      data: {
        entityType,
        entityId
      }
    });

    return () => {
      unsubscribe();
      websocketService.unsubscribe(channel);
    };
  }, [entityType, entityId, channel]);

  const requestSync = useCallback(() => {
    setIsSyncing(true);
    setSyncError(null);
    
    websocketService.send({
      type: 'sync_request',
      channel,
      data: {
        entityType,
        entityId,
        force: true
      }
    });
  }, [channel, entityType, entityId]);

  const updateData = useCallback((updates: Partial<T>) => {
    const updatedData = { ...data, ...updates };
    setData(updatedData as T);
    
    // Enviar actualización al servidor
    websocketService.send({
      type: 'data_update',
      channel,
      data: {
        entityType,
        entityId,
        updates
      }
    });
  }, [channel, data, entityType, entityId]);

  return {
    data,
    isLoading,
    isSyncing,
    lastSync,
    syncError,
    requestSync,
    updateData
  };
}

export default useRealtimeConnection;