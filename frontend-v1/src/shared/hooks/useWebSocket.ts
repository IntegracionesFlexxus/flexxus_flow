import { useState, useEffect, useRef, useCallback } from 'react';

// TODO: Mover estas constantes a .env en Nivel 2
const WS_URL = 'ws://localhost:3001'; // Mover a .env
const RECONNECT_DELAY = 5000; // Mover a configuración
const MAX_RECONNECT_ATTEMPTS = 5; // Mover a configuración

interface WebSocketOptions {
  url?: string;
  protocols?: string | string[];
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  onReconnect?: (attemptNumber: number) => void;
  shouldReconnect?: (event: CloseEvent) => boolean;
  heartbeat?: boolean;
  heartbeatInterval?: number;
}

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  lastMessage: any;
  lastError: Event | null;
}

export function useWebSocket(
  room?: string,
  options: WebSocketOptions = {}
) {
  const {
    url = WS_URL,
    protocols,
    reconnect = true,
    reconnectAttempts = MAX_RECONNECT_ATTEMPTS,
    reconnectInterval = RECONNECT_DELAY,
    onOpen,
    onClose,
    onError,
    onMessage,
    onReconnect,
    shouldReconnect = () => true,
    heartbeat = true,
    heartbeatInterval = 30000
  } = options;

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    lastMessage: null,
    lastError: null
  });

  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout>();
  const heartbeatTimer = useRef<NodeJS.Timeout>();
  const messageQueue = useRef<any[]>([]);

  // Construir URL completa con room si se proporciona
  const fullUrl = room ? `${url}/${room}` : url;

  // Función para iniciar heartbeat
  const startHeartbeat = useCallback(() => {
    if (!heartbeat) return;

    const sendPing = () => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'ping' }));
      }
    };

    // Enviar ping inicial
    sendPing();

    // Configurar interval
    heartbeatTimer.current = setInterval(sendPing, heartbeatInterval);
  }, [heartbeat, heartbeatInterval]);

  // Función para detener heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
    }
  }, []);

  // Función para conectar WebSocket
  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    setState(prev => ({ ...prev, isConnecting: true }));

    try {
      ws.current = new WebSocket(fullUrl, protocols);

      ws.current.onopen = (event) => {
        console.log('WebSocket connected:', fullUrl);
        
        setState({
          isConnected: true,
          isConnecting: false,
          lastMessage: null,
          lastError: null
        });

        reconnectCount.current = 0;

        // Enviar mensajes encolados
        while (messageQueue.current.length > 0) {
          const message = messageQueue.current.shift();
          ws.current?.send(message);
        }

        // Iniciar heartbeat
        startHeartbeat();

        // Callback personalizado
        onOpen?.(event);
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false
        }));

        stopHeartbeat();

        // Intentar reconectar si es necesario
        if (reconnect && 
            reconnectCount.current < reconnectAttempts && 
            shouldReconnect(event)) {
          
          reconnectCount.current++;
          onReconnect?.(reconnectCount.current);
          
          reconnectTimer.current = setTimeout(() => {
            console.log(`Reconnecting... (attempt ${reconnectCount.current})`);
            connect();
          }, reconnectInterval);
        }

        // Callback personalizado
        onClose?.(event);
      };

      ws.current.onerror = (event) => {
        console.error('WebSocket error:', event);
        
        setState(prev => ({
          ...prev,
          lastError: event,
          isConnecting: false
        }));

        // Callback personalizado
        onError?.(event);
      };

      ws.current.onmessage = (event) => {
        let data = event.data;

        // Intentar parsear JSON
        try {
          data = JSON.parse(event.data);
        } catch (e) {
          // No es JSON, mantener como string
        }

        // Ignorar pongs del heartbeat
        if (data?.type === 'pong') return;

        setState(prev => ({
          ...prev,
          lastMessage: data
        }));

        // Callback personalizado
        onMessage?.(event);
      };

    } catch (error) {
      console.error('Error creating WebSocket:', error);
      
      setState(prev => ({
        ...prev,
        isConnecting: false,
        lastError: error as Event
      }));
    }
  }, [
    fullUrl, 
    protocols, 
    reconnect, 
    reconnectAttempts, 
    reconnectInterval,
    shouldReconnect,
    startHeartbeat,
    stopHeartbeat,
    onOpen,
    onClose,
    onError,
    onMessage,
    onReconnect
  ]);

  // Función para desconectar WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }

    stopHeartbeat();

    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    setState({
      isConnected: false,
      isConnecting: false,
      lastMessage: null,
      lastError: null
    });

    messageQueue.current = [];
    reconnectCount.current = 0;
  }, [stopHeartbeat]);

  // Función para enviar mensajes
  const sendMessage = useCallback((message: any) => {
    const data = typeof message === 'string' 
      ? message 
      : JSON.stringify(message);

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(data);
    } else {
      // Encolar mensaje si no está conectado
      console.log('WebSocket not connected, queuing message');
      messageQueue.current.push(data);
    }
  }, []);

  // Función helper para enviar JSON
  const sendJsonMessage = useCallback((message: any) => {
    sendMessage(JSON.stringify(message));
  }, [sendMessage]);

  // Conectar al montar y desconectar al desmontar
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [fullUrl]); // Reconectar si cambia la URL/room

  return {
    ...state,
    sendMessage,
    sendJsonMessage,
    connect,
    disconnect,
    ws: ws.current
  };
}

// Hook específico para chat/mensajería
export function useChatWebSocket(roomId: string, userId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  const { isConnected, sendJsonMessage, lastMessage } = useWebSocket(`chat/${roomId}`, {
    onOpen: () => {
      // Unirse a la sala
      sendJsonMessage({
        type: 'join',
        userId,
        roomId
      });
    },
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'message':
            setMessages(prev => [...prev, data.payload]);
            break;
            
          case 'typing_start':
            setTypingUsers(prev => new Set([...prev, data.userId]));
            break;
            
          case 'typing_stop':
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.userId);
              return newSet;
            });
            break;
            
          case 'user_joined':
            console.log(`User ${data.userId} joined the room`);
            break;
            
          case 'user_left':
            console.log(`User ${data.userId} left the room`);
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    }
  });

  const sendMessage = useCallback((text: string) => {
    const message = {
      type: 'message',
      userId,
      roomId,
      text,
      timestamp: Date.now()
    };
    
    sendJsonMessage(message);
    
    // Agregar mensaje localmente (optimistic update)
    setMessages(prev => [...prev, { ...message, pending: true }]);
  }, [sendJsonMessage, userId, roomId]);

  const sendTyping = useCallback((isTyping: boolean) => {
    sendJsonMessage({
      type: isTyping ? 'typing_start' : 'typing_stop',
      userId,
      roomId
    });
  }, [sendJsonMessage, userId, roomId]);

  return {
    isConnected,
    messages,
    typingUsers: Array.from(typingUsers),
    sendMessage,
    sendTyping
  };
}

export default useWebSocket;