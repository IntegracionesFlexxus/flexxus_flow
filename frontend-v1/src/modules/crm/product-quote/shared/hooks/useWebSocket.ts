// WebSocket Hook - Sprint 19 Frontend Implementation

import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
}

export interface WebSocketState {
  readyState: number;
  isConnected: boolean;
  isConnecting: boolean;
  isClosed: boolean;
  lastMessage: MessageEvent | null;
  error: Event | null;
}

export interface WebSocketControls {
  connect: () => void;
  disconnect: () => void;
  send: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => void;
  sendJSON: (data: any) => void;
  reconnect: () => void;
}

/**
 * Custom hook for managing WebSocket connections with auto-reconnection
 */
export function useWebSocket(config: WebSocketConfig): WebSocketState & WebSocketControls {
  const {
    url,
    protocols,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    heartbeatInterval = 30000,
    onOpen,
    onClose,
    onError,
    onMessage
  } = config;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const shouldReconnectRef = useRef(true);

  const [state, setState] = useState<WebSocketState>({
    readyState: WebSocket.CLOSED,
    isConnected: false,
    isConnecting: false,
    isClosed: true,
    lastMessage: null,
    error: null
  });

  const updateState = useCallback((ws: WebSocket | null) => {
    const readyState = ws?.readyState ?? WebSocket.CLOSED;
    setState({
      readyState,
      isConnected: readyState === WebSocket.OPEN,
      isConnecting: readyState === WebSocket.CONNECTING,
      isClosed: readyState === WebSocket.CLOSED,
      lastMessage: null,
      error: null
    });
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatInterval > 0) {
      heartbeatTimeoutRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
        }
      }, heartbeatInterval);
    }
  }, [heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const ws = new WebSocket(url, protocols);
      wsRef.current = ws;

      ws.onopen = (event) => {
        console.log('WebSocket connected:', url);
        reconnectCountRef.current = 0;
        updateState(ws);
        startHeartbeat();
        onOpen?.(event);
      };

      ws.onmessage = (event) => {
        setState(prev => ({ ...prev, lastMessage: event }));

        // Handle heartbeat pong
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') {
            return; // Don't forward heartbeat messages
          }
        } catch (e) {
          // Not JSON, continue with regular message handling
        }

        onMessage?.(event);
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', url, event.code, event.reason);
        stopHeartbeat();
        updateState(null);
        onClose?.(event);

        // Attempt reconnection if enabled and not a clean close
        if (shouldReconnectRef.current &&
            event.code !== 1000 && // Normal closure
            reconnectCountRef.current < reconnectAttempts) {

          const timeout = reconnectInterval * Math.pow(1.5, reconnectCountRef.current);
          console.log(`WebSocket reconnecting in ${timeout}ms... (attempt ${reconnectCountRef.current + 1}/${reconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectCountRef.current++;
            connect();
          }, timeout);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setState(prev => ({ ...prev, error: event }));
        onError?.(event);
      };

      updateState(ws);

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setState(prev => ({
        ...prev,
        error: error as Event,
        readyState: WebSocket.CLOSED,
        isConnected: false,
        isConnecting: false,
        isClosed: true
      }));
    }
  }, [url, protocols, onOpen, onMessage, onClose, onError, reconnectAttempts, reconnectInterval, updateState, startHeartbeat, stopHeartbeat]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();

    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close(1000, 'Manual disconnect');
    }

    wsRef.current = null;
    updateState(null);
  }, [stopHeartbeat, updateState]);

  const send = useCallback((data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    } else {
      console.warn('WebSocket is not connected. Message not sent:', data);
      throw new Error('WebSocket is not connected');
    }
  }, []);

  const sendJSON = useCallback((data: any) => {
    try {
      send(JSON.stringify(data));
    } catch (error) {
      console.error('Failed to send JSON message:', error);
      throw error;
    }
  }, [send]);

  const reconnect = useCallback(() => {
    disconnect();
    shouldReconnectRef.current = true;
    reconnectCountRef.current = 0;
    setTimeout(connect, 100); // Small delay to ensure cleanup
  }, [disconnect, connect]);

  // Auto-connect on mount if URL is provided
  useEffect(() => {
    if (url) {
      shouldReconnectRef.current = true;
      connect();
    }

    return () => {
      shouldReconnectRef.current = false;
      disconnect();
    };
  }, [url]); // Note: not including connect/disconnect to avoid recreating connection on every render

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatTimeoutRef.current) {
        clearInterval(heartbeatTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    send,
    sendJSON,
    reconnect
  };
}

/**
 * Simplified WebSocket hook for basic usage
 */
export function useSimpleWebSocket(
  url: string,
  onMessage?: (data: any) => void
) {
  return useWebSocket({
    url,
    onMessage: onMessage ? (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        onMessage(event.data);
      }
    } : undefined
  });
}

export default useWebSocket;